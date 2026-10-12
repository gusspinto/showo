import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/* Devolve um access_token do GitHub válido para este utilizador, ou null se
   nunca ligou a conta. Renova sozinho com o refresh_token quando expirado —
   quem chama nunca precisa de pensar em expiração. */
export async function getGithubToken(supabase: ReturnType<typeof createClient>, userId: string): Promise<string | null> {
  const { data: conn } = await supabase
    .from('github_connections')
    .select('access_token, refresh_token, expires_at')
    .eq('user_id', userId)
    .maybeSingle()

  if (!conn) return null
  if (!conn.expires_at || new Date(conn.expires_at) > new Date(Date.now() + 60_000)) {
    return conn.access_token
  }
  if (!conn.refresh_token) return conn.access_token // sem refresh_token, tenta o que há

  const clientId = Deno.env.get('GITHUB_OAUTH_CLIENT_ID')!
  const clientSecret = Deno.env.get('GITHUB_OAUTH_CLIENT_SECRET')!
  const res = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: conn.refresh_token,
    }),
  })
  const data = await res.json()
  if (!res.ok || data.error || !data.access_token) {
    console.error('[getGithubToken] refresh failed', data)
    return conn.access_token // falha a renovar — tenta o antigo, pode ainda servir
  }

  const expiresAt = data.expires_in ? new Date(Date.now() + data.expires_in * 1000).toISOString() : null
  await supabase.from('github_connections').update({
    access_token: data.access_token,
    refresh_token: data.refresh_token ?? conn.refresh_token,
    expires_at: expiresAt,
    updated_at: new Date().toISOString(),
  }).eq('user_id', userId)

  return data.access_token
}
