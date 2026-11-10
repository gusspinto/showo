import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/* ══════════════════════════════════════════════════════════════════════════
   WEBHOOK DO WHOP, recebe payment.succeeded / membership.activated e
   atualiza profiles.plan pelo user_id que mandámos em metadata no checkout.
   ──────────────────────────────────────────────────────────────────────────
   O Whop assina os pedidos no esquema Standard Webhooks (mesma família do
   Resend), mas com nomes de cabeçalho diferentes: webhook-id,
   webhook-timestamp, webhook-signature (em vez de svix-id/svix-timestamp/
   svix-signature). A assinatura esperada vem prefixada com "v1,".

   Confirmado com um pagamento real (2026-11-10): o secret entra sem
   decode, tal e qual, e metadata.user_id chega mesmo no payload. O que
   estava errado: o Whop manda o plano no campo variant_id, não plan_id
   como eu tinha escrito à primeira (sem acesso à documentação, só
   pesquisa), e isso fazia o webhook ignorar silenciosamente todos os
   eventos ("plan_id desconhecido: undefined" nos logs).

   Configuração necessária no lado do Whop (fora deste código):
     1. Dashboard do Whop, Desenvolvedor, Webhooks, endpoint já criado a
        apontar para esta função.
     2. Secret do webhook guardado como WHOP_WEBHOOK_SECRET nos secrets
        desta função.
   Sem o secret configurado, todos os pedidos são recusados (401), de
   propósito, para nunca aceitar eventos não verificados.
   ══════════════════════════════════════════════════════════════════════════ */

// A coluna profiles.plan só aceita 'free' | 'build' | 'launch' (check
// constraint na BD), 'plus'/'pro' são só aliases resolvidos no código da
// app (PLAN_ALIASES em plans.js). Escrever 'plus'/'pro' aqui falha
// silenciosamente na BD (confirmado ao dar o Plus manualmente ao Gustavo
// depois de um pagamento de teste, 2026-11-10).
const PLAN_ID_TO_PLAN: Record<string, string> = {
  plan_NKq7gp0RahWnx: 'build', // Plus mensal, €8,99
  plan_olyzpCXMgYlXI: 'build', // Plus anual, €89,99 (ver nota no 229/plans.js: devia ser €89,90)
  plan_uZg18icmbnVBp: 'launch', // Pro mensal, €17,99
  plan_fF025x79dcW50: 'launch', // Pro anual, €179,90
}

async function verifyWhopSignature(
  body: string,
  webhookId: string,
  webhookTimestamp: string,
  webhookSignature: string,
  secret: string,
): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signedContent = `${webhookId}.${webhookTimestamp}.${body}`
  const sigBytes = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signedContent))
  const expected = `v1,${btoa(String.fromCharCode(...new Uint8Array(sigBytes)))}`

  return webhookSignature.split(' ').some(part => part === expected)
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method not allowed' }), { status: 405 })
  }

  try {
    const secret = Deno.env.get('WHOP_WEBHOOK_SECRET')
    if (!secret) {
      console.error('[whop-webhook] WHOP_WEBHOOK_SECRET não configurado')
      return new Response(JSON.stringify({ error: 'not configured' }), { status: 401 })
    }

    const webhookId = req.headers.get('webhook-id')
    const webhookTimestamp = req.headers.get('webhook-timestamp')
    const webhookSignature = req.headers.get('webhook-signature')
    if (!webhookId || !webhookTimestamp || !webhookSignature) {
      return new Response(JSON.stringify({ error: 'missing webhook headers' }), { status: 401 })
    }

    const body = await req.text()
    const valid = await verifyWhopSignature(body, webhookId, webhookTimestamp, webhookSignature, secret)
    if (!valid) {
      return new Response(JSON.stringify({ error: 'invalid signature' }), { status: 401 })
    }

    const event = JSON.parse(body)
    console.log('[whop-webhook] evento recebido:', JSON.stringify(event))

    if (event.type !== 'payment.succeeded' && event.type !== 'membership.activated') {
      return new Response(JSON.stringify({ ok: true, skipped: 'event type ignored' }))
    }

    const userId: string | undefined = event?.data?.metadata?.user_id
    const planId: string | undefined = event?.data?.variant_id

    if (!userId) {
      console.error('[whop-webhook] sem user_id em metadata, payload:', JSON.stringify(event?.data))
      return new Response(JSON.stringify({ ok: true, skipped: 'no user_id in metadata' }))
    }

    const plan = planId ? PLAN_ID_TO_PLAN[planId] : undefined
    if (!plan) {
      console.error('[whop-webhook] variant_id desconhecido:', planId)
      return new Response(JSON.stringify({ ok: true, skipped: 'unknown variant_id' }))
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    await supabase.from('profiles')
      .update({ plan })
      .eq('id', userId)

    return new Response(JSON.stringify({ ok: true }))
  } catch (e) {
    console.error('[whop-webhook]', e)
    return new Response(JSON.stringify({ error: 'internal' }), { status: 500 })
  }
})
