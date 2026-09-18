import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/* ══════════════════════════════════════════════════════════════════════════
   UNSUBSCRIBE DA SEQUÊNCIA DE ONBOARDING — mesmo padrão do
   checkin-unsubscribe (link assinado por HMAC, GET para o link no corpo do
   email, POST para o one-click da RFC 8058), mas grava numa coluna
   diferente (onboarding_opted_out), para cancelar isto não cancelar
   também o check-in semanal, são duas listas distintas.
   ══════════════════════════════════════════════════════════════════════════ */

async function verifySignature(userId: string, sig: string, secret: string): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sigBuf = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(userId))
  const expected = Array.from(new Uint8Array(sigBuf)).map(b => b.toString(16).padStart(2, '0')).join('')
  return expected === sig
}

function page(title: string, body: string) {
  return `<!DOCTYPE html>
<html lang="pt"><head><meta charset="UTF-8"><title>${title}</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body style="margin:0;background:#080808;font-family:-apple-system,Helvetica,Arial,sans-serif;color:#f0f0f0;">
  <div style="max-width:420px;margin:80px auto;padding:0 24px;text-align:center;">
    <img src="https://showo.pt/icon.png" alt="Showo" width="32" height="32" style="display:block;margin:0 auto 24px;" />
    <p style="font-size:16px;line-height:1.5;color:#f0f0f0;">${body}</p>
  </div>
</body></html>`
}

Deno.serve(async (req) => {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return new Response('method not allowed', { status: 405 })
  }

  const url = new URL(req.url)
  const userId = url.searchParams.get('u')
  const sig = url.searchParams.get('sig')

  const secret = Deno.env.get('CRON_SECRET')
  if (!secret || !userId || !sig) {
    if (req.method === 'POST') return new Response(null, { status: 400 })
    return new Response(page('Link inválido', 'Este link não é válido.'), {
      status: 400,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }

  const valid = await verifySignature(userId, sig, secret)
  if (!valid) {
    if (req.method === 'POST') return new Response(null, { status: 400 })
    return new Response(page('Link inválido', 'Este link não é válido.'), {
      status: 400,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )
  await supabase.from('profiles').update({ onboarding_opted_out: true }).eq('id', userId)

  if (req.method === 'POST') return new Response(null, { status: 200 })

  return new Response(
    page('Cancelado', 'Já não vais receber mais emails da sequência de boas-vindas. O resto da tua conta continua na mesma.'),
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  )
})
