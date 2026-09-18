import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/* Cancelar campanhas de marketing (regresso às aulas, mais-valias, case
   studies...) — genérico para todas, não é por tema, é uma lista só. GET
   mostra confirmação, POST é o clique one-click do Gmail/Yahoo (RFC 8058). */

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

Deno.serve(async (req) => {
  const url = new URL(req.url)
  const userId = url.searchParams.get('u')
  const sig = url.searchParams.get('sig')
  const isOneClick = req.method === 'POST'

  if (!userId || !sig) return new Response('Pedido inválido.', { status: 400 })

  const cronSecret = Deno.env.get('CRON_SECRET')
  if (!cronSecret) return new Response('Erro interno.', { status: 500 })

  const valid = await verifySignature(userId, sig, cronSecret)
  if (!valid) return new Response('Link inválido.', { status: 400 })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )
  await supabase.from('profiles').update({ marketing_campaign_opted_out: true }).eq('id', userId)

  if (isOneClick) return new Response('OK', { status: 200 })

  return new Response(
    `<!DOCTYPE html><html lang="pt"><head><meta charset="utf-8"><title>Cancelado</title></head>
    <body style="font-family:-apple-system,Helvetica,Arial,sans-serif;background:#080808;color:#f0f0f0;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;">
      <div style="text-align:center;padding:24px;"><p style="font-size:18px;">Já não vais receber emails de campanhas do Showo.</p></div>
    </body></html>`,
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  )
})
