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
      .select('id, stripe_connect_account_id, stripe_connect_onboarded')
      .eq('user_id', user.id)
      .single()

    if (!ambassador?.stripe_connect_account_id) {
      return new Response(JSON.stringify({ onboarded: false }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const account = await stripe.accounts.retrieve(ambassador.stripe_connect_account_id)
    const onboarded = !!account.charges_enabled

    if (onboarded && !ambassador.stripe_connect_onboarded) {
      await supabase
        .from('ambassadors')
        .update({ stripe_connect_onboarded: true })
        .eq('id', ambassador.id)
    }

    return new Response(JSON.stringify({ onboarded }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: 'Erro ao verificar estado.' }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
