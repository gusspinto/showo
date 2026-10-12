import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders, getAuthUser } from '../_shared/rateLimit.ts'

/* ══════════════════════════════════════════════════════════════════════════
   LIGAR GITHUB — troca o "code" do OAuth por um access_token/refresh_token
   e guarda-os por utilizador (github_connections). A partir daqui, o sync
   pode ler repositórios privados, não só públicos.

   O "state" anti-CSRF é verificado no cliente (sessionStorage), não aqui —
   quem chama esta função já está autenticado com a sessão do Showo
   (getAuthUser), que é a fronteira real: mesmo que alguém falsifique o
   "code", só troca por um token preso à conta de quem autorizou no GitHub,
   nunca à conta Showo de outra pessoa.
   ══════════════════════════════════════════════════════════════════════════ */

const REDIRECT_URI = 'https://showo.pt/auth/github/callback'

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  const user = await getAuthUser(req)
  if (!user) return json({ error: 'Precisas de sessão iniciada.' }, 401)

  try {
    const { code } = await req.json()
    if (!code || typeof code !== 'string') return json({ error: 'Código em falta.' }, 400)

    const clientId = Deno.env.get('GITHUB_OAUTH_CLIENT_ID')!
    const clientSecret = Deno.env.get('GITHUB_OAUTH_CLIENT_SECRET')!

    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: REDIRECT_URI,
      }),
    })
    const tokenData = await tokenRes.json()
    if (!tokenRes.ok || tokenData.error || !tokenData.access_token) {
      console.error('[github-oauth-callback] token exchange', tokenData)
      return json({ error: 'O GitHub recusou o pedido de autorização. Tenta ligar outra vez.' }, 400)
    }

    const ghUserRes = await fetch('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${tokenData.access_token}`, Accept: 'application/vnd.github+json', 'User-Agent': 'showo-app' },
    })
    if (!ghUserRes.ok) return json({ error: 'Não foi possível confirmar a tua conta do GitHub.' }, 502)
    const ghUser = await ghUserRes.json()

    const expiresAt = tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
      : null

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { error: upErr } = await supabase.from('github_connections').upsert({
      user_id: user.id,
      github_login: ghUser.login,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token ?? null,
      expires_at: expiresAt,
      scopes: tokenData.scope ?? null,
      updated_at: new Date().toISOString(),
    })
    if (upErr) {
      console.error('[github-oauth-callback] upsert', upErr.message)
      return json({ error: 'Não foi possível guardar a ligação.' }, 500)
    }

    return json({ ok: true, github_login: ghUser.login })
  } catch (e) {
    console.error('[github-oauth-callback]', e)
    return json({ error: 'Não foi possível ligar ao GitHub agora.' }, 500)
  }
})
