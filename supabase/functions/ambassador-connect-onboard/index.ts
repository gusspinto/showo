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
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-12-18.acacia' })
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: ambassador } = await supabase
      .from('ambassadors')
      .select('id, stripe_connect_account_id')
      .eq('user_id', user.id)
      .single()

    if (!ambassador) {
      return new Response(JSON.stringify({ error: 'Não és embaixador.' }), {
        status: 403, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    let accountId = ambassador.stripe_connect_account_id

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'standard',
        email: user.email,
        metadata: { supabase_uid: user.id, ambassador_id: ambassador.id },
      })
      accountId = account.id
      await supabase
        .from('ambassadors')
        .update({ stripe_connect_account_id: accountId })
        .eq('id', ambassador.id)
    }

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: 'https://showo.pt/settings?tab=embaixador&connect=refresh',
      return_url: 'https://showo.pt/settings?tab=embaixador&connect=success',
      type: 'account_onboarding',
    })

    return new Response(JSON.stringify({ url: accountLink.url }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: 'Erro ao configurar pagamentos.' }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
