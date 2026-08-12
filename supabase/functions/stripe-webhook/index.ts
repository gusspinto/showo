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

    default:
      break
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
