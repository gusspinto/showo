import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders, getAuthUser } from '../_shared/rateLimit.ts'
import { getGithubToken } from '../_shared/githubAuth.ts'

/* Lista os repositórios do utilizador (inclui privados, se ligado por OAuth)
   para o seletor em EditProject — em vez de colar o link à mão. Só os
   próprios (affiliation=owner), ordenados por atividade recente: são os que
   fazem sentido escolher primeiro para um projeto novo. */

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  const user = await getAuthUser(req)
  if (!user) return json({ error: 'Precisas de sessão iniciada.' }, 401)

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )
    const token = await getGithubToken(supabase, user.id)
    if (!token) return json({ error: 'Liga primeiro a tua conta do GitHub.' }, 400)

    const res = await fetch('https://api.github.com/user/repos?per_page=100&sort=updated&affiliation=owner', {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'User-Agent': 'showo-app' },
    })
    if (!res.ok) {
      console.error('[github-list-repos]', res.status, await res.text())
      return json({ error: 'Não foi possível ir buscar os teus repositórios.' }, 502)
    }
    const data = await res.json()
    const repos = (Array.isArray(data) ? data : [])
      .filter((r: any) => !r.fork) // fork traz o histórico de outra pessoa — github-sync já recusa, nem vale mostrar
      .map((r: any) => ({
        full_name: r.full_name,
        html_url: r.html_url,
        private: r.private,
        updated_at: r.updated_at,
      }))

    return json({ repos })
  } catch (e) {
    console.error('[github-list-repos]', e)
    return json({ error: 'Não foi possível ir buscar os teus repositórios agora.' }, 500)
  }
})
