import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/* ══════════════════════════════════════════════════════════════════════════
   UNSUBSCRIBE DO CHECK-IN SEMANAL — link assinado (HMAC), sem precisar de
   login. Recebe ?u=<user_id>&sig=<hmac hex>, confirma que o sig bate com o
   user_id (usando o mesmo CRON_SECRET como chave — não expõe o segredo,
   só prova que quem gerou o link foi o backend), e desliga o opt-out.
   Sem isto, a única forma de alguém parar de receber é marcar como spam,
   o que estraga a reputação do domínio inteiro.
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
  if (req.method !== 'GET') {
    return new Response('method not allowed', { status: 405 })
  }

  const url = new URL(req.url)
  const userId = url.searchParams.get('u')
  const sig = url.searchParams.get('sig')

  const secret = Deno.env.get('CRON_SECRET')
  if (!secret || !userId || !sig) {
    return new Response(page('Link inválido', 'Este link não é válido.'), {
      status: 400,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }

  const valid = await verifySignature(userId, sig, secret)
  if (!valid) {
    return new Response(page('Link inválido', 'Este link não é válido.'), {
      status: 400,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )
  await supabase.from('profiles').update({ weekly_checkin_opted_out: true }).eq('id', userId)

  return new Response(
    page('Cancelado', 'Já não vais receber mais estes emails de check-in semanal. O resto da tua conta continua na mesma.'),
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  )
})
