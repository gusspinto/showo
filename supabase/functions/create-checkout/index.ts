import Stripe from 'npm:stripe@17.7.0'
import { getAuthUser, getCorsHeaders } from '../_shared/rateLimit.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const PRICE_IDS: Record<string, string> = {
  build: Deno.env.get('STRIPE_PRICE_BUILD')!,
  launch: Deno.env.get('STRIPE_PRICE_LAUNCH')!,
}

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
    const { plan } = await req.json()
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

    // Get or create Stripe customer
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
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: 'https://showo.pt/settings?tab=plano&stripe=success',
      cancel_url: 'https://showo.pt/pricing',
      subscription_data: {
        metadata: { supabase_uid: user.id, plan },
      },
    })

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: 'Erro ao criar sessão de pagamento.' }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
