import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/* ══════════════════════════════════════════════════════════════════════════
   WEBHOOK DO RESEND — recebe email.opened / email.clicked e atualiza
   email_sends (opened_at / clicked_at) pelo resend_id guardado no envio.
   ──────────────────────────────────────────────────────────────────────────
   O Resend assina os pedidos com Svix (svix-id / svix-timestamp /
   svix-signature). Sem verificar a assinatura, qualquer um podia mandar um
   POST fingido a dizer "isto foi aberto" — por isso a verificação aqui não
   é opcional.

   Configuração necessária no lado do Resend (fora deste código):
     1. Dashboard do Resend → Webhooks → Add Endpoint → esta URL.
     2. Copiar o "Signing Secret" (começa por "whsec_") que o Resend gera.
     3. Guardar esse valor como RESEND_WEBHOOK_SECRET nos secrets desta
        função (supabase functions secrets set).
   Sem o secret configurado, todos os pedidos são recusados (401) —
   propositadamente, para nunca aceitar eventos não verificados.
   ══════════════════════════════════════════════════════════════════════════ */

async function verifySvixSignature(
  body: string,
  svixId: string,
  svixTimestamp: string,
  svixSignature: string,
  secret: string,
): Promise<boolean> {
  const secretBytes = Uint8Array.from(atob(secret.replace(/^whsec_/, '')), c => c.charCodeAt(0))
  const key = await crypto.subtle.importKey(
    'raw',
    secretBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signedContent = `${svixId}.${svixTimestamp}.${body}`
  const sigBytes = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signedContent))
  const expected = btoa(String.fromCharCode(...new Uint8Array(sigBytes)))

  // svix-signature pode trazer vários "v1,<base64>" separados por espaço
  // (rotação de segredo) — basta um bater certo.
  return svixSignature.split(' ').some(part => {
    const [, sig] = part.split(',')
    return sig === expected
  })
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method not allowed' }), { status: 405 })
  }

  try {
    const secret = Deno.env.get('RESEND_WEBHOOK_SECRET')
    if (!secret) {
      console.error('[resend-webhook] RESEND_WEBHOOK_SECRET não configurado')
      return new Response(JSON.stringify({ error: 'not configured' }), { status: 401 })
    }

    const svixId = req.headers.get('svix-id')
    const svixTimestamp = req.headers.get('svix-timestamp')
    const svixSignature = req.headers.get('svix-signature')
    if (!svixId || !svixTimestamp || !svixSignature) {
      return new Response(JSON.stringify({ error: 'missing svix headers' }), { status: 401 })
    }

    const body = await req.text()
    const valid = await verifySvixSignature(body, svixId, svixTimestamp, svixSignature, secret)
    if (!valid) {
      return new Response(JSON.stringify({ error: 'invalid signature' }), { status: 401 })
    }

    const event = JSON.parse(body)
    const emailId: string | undefined = event?.data?.email_id
    const createdAt: string = event?.created_at ?? new Date().toISOString()

    if (!emailId) {
      return new Response(JSON.stringify({ ok: true, skipped: 'no email_id' }))
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    if (event.type === 'email.opened') {
      await supabase.from('email_sends')
        .update({ opened_at: createdAt })
        .eq('resend_id', emailId)
        .is('opened_at', null)
    } else if (event.type === 'email.clicked') {
      await supabase.from('email_sends')
        .update({ clicked_at: createdAt })
        .eq('resend_id', emailId)
        .is('clicked_at', null)
    }

    return new Response(JSON.stringify({ ok: true }))
  } catch (e) {
    console.error('[resend-webhook]', e)
    return new Response(JSON.stringify({ error: 'internal' }), { status: 500 })
  }
})
