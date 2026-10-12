import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders, getAuthUser } from '../_shared/rateLimit.ts'
import { getGithubToken } from '../_shared/githubAuth.ts'
import { parseRepo, ghHeaders } from '../_shared/githubSync.ts'

/* ══════════════════════════════════════════════════════════════════════════
   REGISTAR/REMOVER O WEBHOOK DE UM REPOSITÓRIO
   ──────────────────────────────────────────────────────────────────────────
   Chamada pelo frontend quando o dono liga, troca ou desliga o repositório
   de um projeto — nunca pelo GitHub. Usa o token OAuth do próprio utilizador
   (precisa de direitos de admin no repo para criar/remover hooks); sem
   conta ligada, não há como registar — a sincronização continua a
   funcionar, só que manualmente, como sempre foi.

   `action: 'register'` cria o hook e grava `github_repo_full_name` +
   `github_webhook_id` no projeto. `action: 'remove'` apaga o hook (se
   ainda houver token válido) e limpa essas colunas — chamado antes de
   trocar de repositório ou ao desligar a conta GitHub.
   ══════════════════════════════════════════════════════════════════════════ */

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const WEBHOOK_SECRET = Deno.env.get('GITHUB_WEBHOOK_SECRET')!
const WEBHOOK_URL = `${SUPABASE_URL}/functions/v1/github-webhook`

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  const user = await getAuthUser(req)
  if (!user) return json({ error: 'Precisas de sessão iniciada.' }, 401)

  try {
    const { projectId, action } = await req.json()
    if (typeof projectId !== 'string' || !projectId) return json({ error: 'Projeto em falta.' }, 400)
    if (action !== 'register' && action !== 'remove') return json({ error: 'Ação desconhecida.' }, 400)

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    const { data: project } = await supabase
      .from('projects')
      .select('id, user_id, github_url, github_repo_full_name, github_webhook_id')
      .eq('id', projectId)
      .single()

    if (!project) return json({ error: 'Projeto não encontrado.' }, 404)
    if (String(project.user_id) !== String(user.id)) return json({ error: 'Só o dono do projeto pode fazer isto.' }, 403)

    const token = await getGithubToken(supabase, user.id)

    if (action === 'remove') {
      if (project.github_webhook_id && project.github_repo_full_name && token) {
        try {
          await fetch(
            `https://api.github.com/repos/${project.github_repo_full_name}/hooks/${project.github_webhook_id}`,
            { method: 'DELETE', headers: ghHeaders(token) },
          )
        } catch (e) { console.error('[github-register-webhook] remove', e) }
        // Best-effort: mesmo que a chamada ao GitHub falhe (hook já não
        // existe, token sem direitos, repo apagado), limpa-se sempre o
        // registo local — não vale a pena bloquear o utilizador por isto.
      }
      await supabase.from('projects').update({ github_webhook_id: null, github_repo_full_name: null }).eq('id', project.id)
      return json({ ok: true })
    }

    // action === 'register'
    if (!token) return json({ error: 'Liga primeiro a tua conta do GitHub.' }, 400)
    const parsed = parseRepo(project.github_url)
    if (!parsed) return json({ error: 'Escolhe primeiro um repositório.' }, 400)
    const fullName = `${parsed.owner}/${parsed.repo}`

    const res = await fetch(`https://api.github.com/repos/${fullName}/hooks`, {
      method: 'POST',
      headers: ghHeaders(token, { 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        name: 'web',
        active: true,
        events: ['push'],
        config: { url: WEBHOOK_URL, content_type: 'json', secret: WEBHOOK_SECRET, insecure_ssl: '0' },
      }),
    })

    // Sem direitos de admin no repo (ex. repo de uma organização onde não és
    // admin), ou repo inexistente/privado sem acesso — não é um erro grave,
    // só significa que a sincronização automática não vai estar disponível;
    // a manual continua a funcionar. Por isso `ok:false` com mensagem, não
    // um erro HTTP que trave o fluxo de escolher o repositório.
    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      console.error('[github-register-webhook] criar hook falhou', res.status, detail)
      return json({ ok: false, reason: res.status === 404 || res.status === 403
        ? 'Não tens permissões de administrador neste repositório — a sincronização automática por push não vai ficar ativa, mas podes sincronizar manualmente.'
        : 'Não foi possível ativar a sincronização automática agora.' })
    }

    const hook = await res.json()
    const { error: updErr } = await supabase
      .from('projects')
      .update({ github_webhook_id: hook.id, github_repo_full_name: fullName })
      .eq('id', project.id)
    if (updErr) {
      console.error('[github-register-webhook] gravar projeto', updErr.message)
      return json({ ok: false, reason: 'O hook foi criado no GitHub, mas não foi possível gravá-lo. Tenta outra vez.' })
    }

    return json({ ok: true })
  } catch (e) {
    console.error('[github-register-webhook]', e)
    return json({ error: 'Não foi possível tratar o webhook agora.' }, 500)
  }
})
