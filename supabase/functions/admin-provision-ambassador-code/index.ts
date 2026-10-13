// Admin-only: cria o código promocional do Stripe para uma embaixadora já
// existente (ambassadors.referral_code), para ela poder usá-lo diretamente
// no checkout — em vez de depender só do link ?ref=, que exige um clique
// antes da pessoa sequer criar conta. Um creator a dizer "usa o código X"
// num vídeo funciona melhor com isto do que com um link na bio.
//
// O código Stripe reaproveita o mesmo texto do referral_code (maiúsculas),
// para não haver dois códigos diferentes para a mesma pessoa. O desconto é
// real para o cliente (duration: forever) — é assim que isto normalmente
// funciona (ex: Prozis): o código dá desconto a quem compra, não só
// comissão a quem trouxe. A atribuição da comissão em si é feita no
// stripe-webhook, a partir deste mesmo código.

import Stripe from 'npm:stripe@17.7.0'
import { getAuthUser, getCorsHeaders } from '../_shared/rateLimit.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

  const user = await getAuthUser(req)
  if (!user) return json({ error: 'Autenticação necessária.' }, 401)

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const { data: adminProfile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!adminProfile?.is_admin) return json({ error: 'Apenas administradores.' }, 403)

  try {
    const { ambassador_id, percent_off = 10 } = await req.json()
    if (!ambassador_id) return json({ error: 'ambassador_id em falta.' }, 400)
    if (typeof percent_off !== 'number' || percent_off <= 0 || percent_off > 100) {
      return json({ error: 'percent_off inválido.' }, 400)
    }

    const { data: ambassador } = await supabase
      .from('ambassadors')
      .select('id, referral_code, stripe_coupon_id')
      .eq('id', ambassador_id)
      .single()
    if (!ambassador) return json({ error: 'Embaixadora não encontrada.' }, 404)
    if (ambassador.stripe_coupon_id) return json({ error: 'Já tem código Stripe criado.' }, 409)

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-12-18.acacia' })

    const coupon = await stripe.coupons.create({
      percent_off,
      duration: 'forever',
      name: `Embaixadora: ${ambassador.referral_code}`,
    })

    const promotionCode = await stripe.promotionCodes.create({
      coupon: coupon.id,
      code: ambassador.referral_code.toUpperCase(),
      metadata: { ambassador_id: ambassador.id },
    })

    await supabase.from('ambassadors').update({ stripe_coupon_id: coupon.id }).eq('id', ambassador.id)

    return json({ ok: true, coupon_id: coupon.id, promotion_code: promotionCode.code })
  } catch (err) {
    console.error('admin-provision-ambassador-code error:', err)
    return json({ error: err?.message || 'Erro ao criar código Stripe.' }, 500)
  }
})
