import Stripe from 'npm:stripe@17.7.0'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-12-18.acacia' })
const endpointSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!

function supabase() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )
}

async function updatePlan(customerId: string, plan: string) {
  const sb = supabase()
  const { error } = await sb
    .from('profiles')
    .update({ plan })
    .eq('stripe_customer_id', customerId)
  if (error) console.error('[stripe-webhook] updatePlan error:', error.message)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200 })
  }

  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, endpointSecret)
  } catch (err) {
    console.error('[stripe-webhook] Signature verification failed:', err.message)
    return new Response('Invalid signature', { status: 400 })
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      if (session.mode === 'subscription' && session.subscription) {
        const sub = await stripe.subscriptions.retrieve(session.subscription as string)
        const plan = sub.metadata?.plan || 'build'
        await updatePlan(session.customer as string, plan)
      }
      break
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription
      if (sub.status === 'active' || sub.status === 'trialing') {
        const plan = sub.metadata?.plan || 'build'
        await updatePlan(sub.customer as string, plan)
      } else if (sub.status === 'past_due' || sub.status === 'unpaid') {
        // Keep plan active during grace period but log it
        console.warn('[stripe-webhook] Subscription past_due/unpaid:', sub.id)
      }
      break
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      await updatePlan(sub.customer as string, 'free')
      break
    }

    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as Stripe.Invoice
      if (!invoice.customer || !invoice.subscription) break

      const sb = supabase()
      const { data: profile } = await sb
        .from('profiles')
        .select('id, referred_by')
        .eq('stripe_customer_id', invoice.customer as string)
        .single()

      if (!profile?.referred_by) break

      const { data: referral } = await sb
        .from('referrals')
        .select('id, commission_ends_at, ambassador_id')
        .eq('referred_user_id', profile.id)
        .single()

      if (!referral) break
      if (referral.commission_ends_at && new Date(referral.commission_ends_at) < new Date()) break

      // Set commission_ends_at on first payment
      if (!referral.commission_ends_at) {
        const endsAt = new Date()
        endsAt.setMonth(endsAt.getMonth() + 6)
        await sb.from('referrals').update({ commission_ends_at: endsAt.toISOString() }).eq('id', referral.id)
      }

      const { data: ambassador } = await sb
        .from('ambassadors')
        .select('commission_rate, stripe_connect_account_id, stripe_connect_onboarded')
        .eq('id', referral.ambassador_id)
        .single()

      if (!ambassador) break

      const netRevenue = (invoice.amount_paid ?? 0) - (invoice.tax ?? 0)
      const commission = Math.round(netRevenue * Number(ambassador.commission_rate))

      if (commission <= 0) break

      await sb.from('referrals').update({
        total_commission_earned: referral.total_commission_earned + commission / 100,
      }).eq('id', referral.id)

      // Auto-transfer if Stripe Connect is onboarded
      if (ambassador.stripe_connect_onboarded && ambassador.stripe_connect_account_id) {
        try {
          await stripe.transfers.create({
            amount: commission,
            currency: invoice.currency || 'eur',
            destination: ambassador.stripe_connect_account_id,
            transfer_group: `referral_${referral.id}`,
          })
        } catch (err) {
          console.error('[stripe-webhook] Transfer failed:', err.message)
        }
      }
      break
    }

    default:
      break
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
