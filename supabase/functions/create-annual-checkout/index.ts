import Stripe from 'npm:stripe@17.7.0'
import { getAuthUser, getCorsHeaders } from '../_shared/rateLimit.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Checkout de pagamento único para o plano anual, em vez da subscrição que
// o create-checkout cria. Confirmado por teste direto na API do Stripe:
// Multibanco e MB WAY não funcionam em mode:'subscription', só em
// mode:'payment'. Sem subscrição do Stripe, é o próprio Showo que marca
// quando o ano acaba (plan_expires_at) e um cron volta o plano a free
// nessa data.
Deno.serve(async (req) => {
  const cors = getCorsHeaders(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const user = await getAuthUser(req)
  if (!user) {
    return new Response(JSON.stringify({ error: 'Autenticação necessária.' }), {
      status: 401, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  try {
    const { plan, returnPath } = await req.json()

    const isSafeReturnPath = typeof returnPath === 'string'
      && returnPath.startsWith('/')
      && !returnPath.startsWith('//')
      && !/[\\\s]/.test(returnPath)
      && returnPath.length < 200

    const successUrl = isSafeReturnPath
      ? `https://showo.pt${returnPath}${returnPath.includes('?') ? '&' : '?'}stripe=success`
      : 'https://showo.pt/settings?tab=plano&stripe=success'
    const cancelUrl = isSafeReturnPath ? `https://showo.pt${returnPath}` : 'https://showo.pt/pricing'

    // Mesmos valores anuais do create-checkout (Stripe Price Plus/Pro
    // anual), em cêntimos, para não depender de criar Price objects novos
    // só para isto: price_data cria o line item na hora.
    const ANNUAL_AMOUNT_CENTS: Record<string, number | undefined> = {
      plus: Number(Deno.env.get('STRIPE_ANNUAL_PLUS_CENTS') ?? '8990'),
      pro: Number(Deno.env.get('STRIPE_ANNUAL_PRO_CENTS') ?? '17990'),
    }
    const PLAN_NAMES: Record<string, string> = { plus: 'Showo Plus anual', pro: 'Showo Pro anual' }

    const amountCents = ANNUAL_AMOUNT_CENTS[plan]
    if (!amountCents || !PLAN_NAMES[plan]) {
      return new Response(JSON.stringify({ error: 'Plano inválido.' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-12-18.acacia' })
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single()

    let customerId = profile?.stripe_customer_id

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_uid: user.id },
      })
      customerId = customer.id
      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id)
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'payment',
      allow_promotion_codes: true,
      payment_method_types: ['card', 'multibanco', 'mb_way'],
      line_items: [{
        price_data: {
          currency: 'eur',
          unit_amount: amountCents,
          product_data: { name: PLAN_NAMES[plan] },
        },
        quantity: 1,
      }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      // O stripe-webhook lê isto em checkout.session.completed (mode
      // 'payment') para saber que plano ativar e por quanto tempo. Não há
      // subscription_data em mode:'payment', por isso vai na própria
      // session, não numa subscrição que aqui não existe.
      metadata: { supabase_uid: user.id, plan, period: 'annual', kind: 'annual_one_time' },
    })

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('create-annual-checkout error:', err)
    return new Response(JSON.stringify({ error: 'Erro ao criar sessão de pagamento.' }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
