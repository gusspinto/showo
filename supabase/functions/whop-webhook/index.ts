import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/* ══════════════════════════════════════════════════════════════════════════
   WEBHOOK DO WHOP, recebe payment.succeeded / membership.activated e
   atualiza profiles.plan pelo user_id que mandámos em metadata no checkout.
   ──────────────────────────────────────────────────────────────────────────
   O Whop assina os pedidos no esquema Standard Webhooks (mesma família do
   Resend), mas com nomes de cabeçalho diferentes: webhook-id,
   webhook-timestamp, webhook-signature (em vez de svix-id/svix-timestamp/
   svix-signature). A assinatura esperada vem prefixada com "v1,".

   IMPORTANTE, ainda por confirmar com um evento real do Whop (não há acesso
   à documentação completa nesta sessão, isto foi montado por pesquisa):
     1. Se o secret (WHOP_WEBHOOK_SECRET, formato "ws_...") entra tal e
        qualquer na chave HMAC, sem decode base64 nem stripping do prefixo
        "ws_" (ao contrário do Resend, que faz atob() depois de tirar o
        "whsec_"). Fontes de terceiros concordam nisto, mas não é a
        documentação oficial do Whop.
     2. Se o campo metadata.user_id que mandamos no checkout (ver
        whop-create-checkout-session) chega mesmo dentro do payload de
        payment.succeeded. Há um relato (GitHub issue do SDK Python do
        Whop) a dizer que pode não chegar.
   Por isso: ao testar o primeiro pagamento real, confirmar no log
   (console.log abaixo deixa o payload completo nos logs da função) antes
   de confiar cegamente nisto em produção.

   Configuração necessária no lado do Whop (fora deste código):
     1. Dashboard do Whop, Desenvolvedor, Webhooks, endpoint já criado a
        apontar para esta função.
     2. Secret do webhook guardado como WHOP_WEBHOOK_SECRET nos secrets
        desta função.
   Sem o secret configurado, todos os pedidos são recusados (401), de
   propósito, para nunca aceitar eventos não verificados.
   ══════════════════════════════════════════════════════════════════════════ */

const PLAN_ID_TO_PLAN: Record<string, string> = {
  plan_NKq7gp0RahWnx: 'plus', // Plus mensal, €8,99
  plan_olyzpCXMgYlXI: 'plus', // Plus anual, €89,99 (ver nota no 229/plans.js: devia ser €89,90)
  plan_uZg18icmbnVBp: 'pro', // Pro mensal, €17,99
  plan_fF025x79dcW50: 'pro', // Pro anual, €179,90
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
    const planId: string | undefined = event?.data?.plan_id ?? event?.data?.plan?.id

    if (!userId) {
      console.error('[whop-webhook] sem user_id em metadata, payload:', JSON.stringify(event?.data))
      return new Response(JSON.stringify({ ok: true, skipped: 'no user_id in metadata' }))
    }

    const plan = planId ? PLAN_ID_TO_PLAN[planId] : undefined
    if (!plan) {
      console.error('[whop-webhook] plan_id desconhecido:', planId)
      return new Response(JSON.stringify({ ok: true, skipped: 'unknown plan_id' }))
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
