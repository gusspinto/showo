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

async function updatePlan(customerId: string, plan: string, period: string | null = null, expiresAt: string | null = null) {
  const sb = supabase()
  const { error } = await sb
    .from('profiles')
    .update({ plan, plan_period: plan === 'free' ? null : period, plan_expires_at: plan === 'free' ? null : expiresAt })
    .eq('stripe_customer_id', customerId)
  if (error) console.error('[stripe-webhook] updatePlan error:', error.message)
}

// Revenue history — profiles.plan only ever holds the *current* state, so a
// cancellation erases what plan someone was on with no trace. This is the
// only place MRR trend / new-subs / churn for the admin panel can come from.
async function logBillingEvent(customerId: string, event: string, plan: string | null, amountCents: number | null, planPeriod: string | null = null) {
  const sb = supabase()
  const { data: profile } = await sb.from('profiles').select('id').eq('stripe_customer_id', customerId).single()
  if (!profile) return
  const { error } = await sb.from('billing_events').insert({ user_id: profile.id, event, plan, amount_cents: amountCents, plan_period: planPeriod })
  if (error) console.error('[stripe-webhook] logBillingEvent error:', error.message)
}

// Segunda porta de entrada para a atribuição de embaixadora, a par do link
// ?ref= (claim_referral, chamado no registo). Esta cobre quem entrou direto
// no checkout e escreveu o código da embaixadora lá (ex: ouviu-o num vídeo,
// em vez de clicar num link) — sem isto, esses pagamentos nunca ficavam
// ligados a ninguém. Mesma regra de "primeiro toque vale": nunca sobrescreve
// um referred_by que já exista (ex: a pessoa já tinha entrado pelo link de
// outra embaixadora antes de pagar).
async function attributeAmbassadorFromCheckoutCode(session: Stripe.Checkout.Session) {
  try {
    const full = await stripe.checkout.sessions.retrieve(session.id, {
      expand: ['discounts.promotion_code'],
    })
    const promo = full.discounts?.[0]?.promotion_code
    const code = typeof promo === 'string' ? null : promo?.code
    if (!code) return

    const sb = supabase()
    const { data: ambassador } = await sb
      .from('ambassadors')
      .select('id, user_id')
      .eq('referral_code', code.toLowerCase())
      .eq('active', true)
      .single()
    if (!ambassador) return

    const { data: profile } = await sb
      .from('profiles')
      .select('id, referred_by')
      .eq('stripe_customer_id', session.customer as string)
      .single()
    if (!profile || profile.referred_by || profile.id === ambassador.user_id) return

    await sb.from('profiles').update({ referred_by: ambassador.id }).eq('id', profile.id)
    await sb.from('referrals').insert({ ambassador_id: ambassador.id, referred_user_id: profile.id })
      .select().single().then(({ error }) => {
        // ON CONFLICT (referred_user_id) não está disponível via insert simples do client;
        // um conflito aqui significa que já havia um registo (corrida com claim_referral) — ignora.
        if (error && error.code !== '23505') console.error('[stripe-webhook] referral insert error:', error.message)
      })
  } catch (err) {
    console.error('[stripe-webhook] attributeAmbassadorFromCheckoutCode error:', err)
  }
}

// create-annual-checkout: Multibanco/MB WAY não funcionam em mode:'subscription'
// (confirmado por teste direto na API), por isso o anual com esses métodos é
// pagamento único, sem subscrição do Stripe. Um ano a partir de agora, não a
// partir do checkout criado: Multibanco/MB WAY podem demorar dias a confirmar,
// por isso esta função corre tanto em checkout.session.completed (cartão, que
// confirma logo) como em checkout.session.async_payment_succeeded (Multibanco/
// MB WAY, que só confirmam depois).
async function activateAnnualOneTime(session: Stripe.Checkout.Session) {
  const plan = session.metadata?.plan || 'plus'
  const expiresAt = new Date()
  expiresAt.setFullYear(expiresAt.getFullYear() + 1)
  await updatePlan(session.customer as string, plan, 'annual', expiresAt.toISOString())
  await logBillingEvent(session.customer as string, 'subscription_started', plan, session.amount_total ?? null, 'annual')
  await attributeAmbassadorFromCheckoutCode(session)
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
        const plan = sub.metadata?.plan || 'plus'
        const period = sub.metadata?.period || 'monthly'
        await updatePlan(session.customer as string, plan, period)
        await logBillingEvent(session.customer as string, 'subscription_started', plan, session.amount_total ?? null, period)
        await attributeAmbassadorFromCheckoutCode(session)
      } else if (session.mode === 'payment' && session.metadata?.kind === 'annual_one_time' && session.payment_status === 'paid') {
        // Cartão: o pagamento já confirmou aqui mesmo.
        await activateAnnualOneTime(session)
      }
      break
    }

    case 'checkout.session.async_payment_succeeded': {
      // Multibanco/MB WAY: checkout.session.completed já chegou com
      // payment_status 'unpaid' (só a referência tinha sido gerada), e não
      // ativou nada. Este evento é o que confirma o pagamento, dias depois.
      const session = event.data.object as Stripe.Checkout.Session
      if (session.mode === 'payment' && session.metadata?.kind === 'annual_one_time') {
        await activateAnnualOneTime(session)
      }
      break
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription
      if (sub.status === 'active' || sub.status === 'trialing') {
        const plan = sub.metadata?.plan || 'plus'
        const period = sub.metadata?.period || 'monthly'
        // billing_events (fonte do MRR/subscritores reais no Admin) só era
        // escrito a partir de checkout.session.completed — descoberto que
        // a tabela estava 100% vazia porque, na prática, ativações reais
        // também chegam por aqui (subscription.updated), sem nunca passar
        // por aquele evento. Só regista quando é mesmo uma ativação nova
        // (vinha de free/sem plano), para não duplicar em cada renovação.
        const sb = supabase()
        const { data: existing } = await sb.from('profiles').select('plan').eq('stripe_customer_id', sub.customer as string).single()
        const wasFree = !existing?.plan || existing.plan === 'free'
        await updatePlan(sub.customer as string, plan, period)
        if (wasFree) {
          const amount = sub.items?.data?.[0]?.price?.unit_amount ?? null
          await logBillingEvent(sub.customer as string, 'subscription_started', plan, amount, period)
        }
      } else if (sub.status === 'past_due' || sub.status === 'unpaid') {
        // Keep plan active during grace period but log it
        console.warn('[stripe-webhook] Subscription past_due/unpaid:', sub.id)
      }
      break
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      const plan = sub.metadata?.plan || null
      await updatePlan(sub.customer as string, 'free')
      await logBillingEvent(sub.customer as string, 'subscription_churned', plan, null)
      break
    }

    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as Stripe.Invoice
      if (!invoice.customer || !invoice.subscription) break

      await logBillingEvent(invoice.customer as string, 'payment_succeeded', null, invoice.amount_paid ?? null)

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
        .select('commission_rate')
        .eq('id', referral.ambassador_id)
        .single()

      if (!ambassador) break

      const netRevenue = (invoice.amount_paid ?? 0) - (invoice.tax ?? 0)
      const commission = Math.round(netRevenue * Number(ambassador.commission_rate))

      if (commission <= 0) break

      await sb.from('referrals').update({
        total_commission_earned: referral.total_commission_earned + commission / 100,
      }).eq('id', referral.id)

      break
    }

    default:
      break
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
