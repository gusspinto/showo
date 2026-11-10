import { getAuthUser, getCorsHeaders, checkRateLimit } from '../_shared/rateLimit.ts'

/* ══════════════════════════════════════════════════════════════════════════
   CRIA UMA SESSÃO DE CHECKOUT NO WHOP, substitui create-checkout /
   create-annual-checkout (Stripe). Chamada pelo frontend antes de abrir o
   WhopCheckoutEmbed, para podermos anexar metadata.user_id à sessão (o
   componente de embed só aceita planId OU sessionId, e só a sessionId
   carrega metadata, ver docs.whop.com/api-reference/v2/checkout-sessions).

   O whop-webhook (payment.succeeded) lê metadata.user_id de volta para
   saber a quem atualizar profiles.plan.
   ══════════════════════════════════════════════════════════════════════════ */

const PLAN_TO_WHOP_PLAN_ID: Record<string, Record<'monthly' | 'annual', string>> = {
  plus: {
    monthly: 'plan_NKq7gp0RahWnx',
    annual: 'plan_olyzpCXMgYlXI',
  },
  pro: {
    monthly: 'plan_uZg18icmbnVBp',
    annual: 'plan_fF025x79dcW50',
  },
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

  const allowed = await checkRateLimit(req, 'whop-create-checkout-session', 10)
  if (!allowed) {
    return new Response(JSON.stringify({ error: 'Demasiados pedidos. Tenta mais tarde.' }), {
      status: 429, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  try {
    const { plan, period } = await req.json()
    const whopPlanId = PLAN_TO_WHOP_PLAN_ID[plan]?.[period as 'monthly' | 'annual']
    if (!whopPlanId) {
      return new Response(JSON.stringify({ error: 'plano inválido' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const apiKey = Deno.env.get('WHOP_API_KEY')
    if (!apiKey) {
      console.error('[whop-create-checkout-session] WHOP_API_KEY não configurado')
      return new Response(JSON.stringify({ error: 'not configured' }), {
        status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const res = await fetch('https://api.whop.com/api/v2/checkout_sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        plan_id: whopPlanId,
        metadata: { user_id: user.id },
      }),
    })

    if (!res.ok) {
      const text = await res.text()
      console.error('[whop-create-checkout-session] erro do Whop:', res.status, text)
      return new Response(JSON.stringify({ error: 'erro ao criar sessão de checkout' }), {
        status: 502, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const session = await res.json()
    // O campo exato com o link partilhável da sessão (para o fluxo "pedir aos
    // pais") não está confirmado sem um teste real, a documentação dá nomes
    // diferentes consoante a versão (purchase_url, redirect_url, checkout_url).
    // Aceita os três, o que existir primeiro.
    const url = session.purchase_url ?? session.redirect_url ?? session.checkout_url ?? null
    return new Response(JSON.stringify({ sessionId: session.id, url }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('[whop-create-checkout-session]', e)
    return new Response(JSON.stringify({ error: 'internal' }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
