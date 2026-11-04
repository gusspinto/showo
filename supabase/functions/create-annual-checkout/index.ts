import Stripe from 'npm:stripe@17.7.0'
import { getAuthUser, getCorsHeaders, checkRateLimit } from '../_shared/rateLimit.ts'
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

  const allowed = await checkRateLimit(req, 'create-annual-checkout', 10)
  if (!allowed) {
    return new Response(JSON.stringify({ error: 'Demasiados pedidos. Tenta mais tarde.' }), {
      status: 429, headers: { ...cors, 'Content-Type': 'application/json' },
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

    // Mesmo cupão de onboarding do create-checkout (SHOWO_ONBOARDING_2026,
    // -50%), aplicado sozinho em vez de depender da pessoa escrever o código
    // à mão. Confirmado no Stripe: 0 resgates até agora, apesar de estar
    // nos emails de onboarding, exatamente o problema que isto resolveu no
    // mensal. O "repeating 6 meses" do cupão não faz sentido num pagamento
    // único (mode:'payment'), mas o Stripe aplica o percent_off à mesma
    // nesse caso, não há conceito de "fatura seguinte" para repetir.
    const discountCode = Deno.env.get('ONBOARDING_DISCOUNT_CODE')
    let discounts: Array<{ promotion_code: string }> | undefined
    if (discountCode) {
      try {
        const promos = await stripe.promotionCodes.list({ code: discountCode, active: true, limit: 1 })
        if (promos.data[0]) discounts = [{ promotion_code: promos.data[0].id }]
      } catch (e) {
        console.error('[create-annual-checkout] falha ao procurar código promocional:', e)
      }
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'payment',
      // discounts e allow_promotion_codes não podem ir os dois ao mesmo
      // tempo (o Stripe recusa), mesma regra do create-checkout.
      ...(discounts ? { discounts } : { allow_promotion_codes: true }),
      // locale 'pt' = português europeu. Sem isto saía em português do
      // Brasil por deteção automática errada (confirmado no create-checkout
      // com uma screenshot real, mesmo problema aqui).
      locale: 'pt',
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
