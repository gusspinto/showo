import Stripe from 'npm:stripe@17.7.0'
import { getAuthUser, getCorsHeaders } from '../_shared/rateLimit.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

    // O pop-up de upgrade (PlanGate) abre o checkout a partir de onde a pessoa estava
    // (um projeto, o Coach, etc.), não só a partir de /pricing — sem isto, pagar dentro
    // do pop-up mandava sempre para /settings e perdia o sítio onde se estava a trabalhar.
    // Só aceita um path interno relativo: nada de protocolo/host (bloqueia open redirect
    // via "//evil.com" ou "https://evil.com" vindos de um cliente adulterado).
    const isSafeReturnPath = typeof returnPath === 'string'
      && returnPath.startsWith('/')
      && !returnPath.startsWith('//')
      && !/[\\\s]/.test(returnPath)
      && returnPath.length < 200

    // Sem returnPath (fluxo antigo, a partir de /pricing): mantém o destino de sempre.
    // Com returnPath (pop-up de upgrade dentro da app): volta ao mesmo sítio tanto ao
    // completar como ao cancelar, para não perder o projeto/ecrã onde a pessoa estava.
    const successUrl = isSafeReturnPath
      ? `https://showo.pt${returnPath}${returnPath.includes('?') ? '&' : '?'}stripe=success`
      : 'https://showo.pt/settings?tab=plano&stripe=success'
    const cancelUrl = isSafeReturnPath ? `https://showo.pt${returnPath}` : 'https://showo.pt/pricing'

    const PRICE_IDS: Record<string, string> = {
      build: Deno.env.get('STRIPE_PRICE_BUILD')!,
      launch: Deno.env.get('STRIPE_PRICE_LAUNCH')!,
      plus: Deno.env.get('STRIPE_PRICE_BUILD')!,
      pro: Deno.env.get('STRIPE_PRICE_LAUNCH')!,
    }

    const priceId = PRICE_IDS[plan]
    if (!priceId) {
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
      mode: 'subscription',
      allow_promotion_codes: true,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      subscription_data: {
        metadata: { supabase_uid: user.id, plan },
      },
    })

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('create-checkout error:', err)
    return new Response(JSON.stringify({ error: 'Erro ao criar sessão de pagamento.' }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
