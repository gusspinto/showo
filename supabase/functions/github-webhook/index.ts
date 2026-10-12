import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getGithubToken } from '../_shared/githubAuth.ts'
import { syncProjectCommits } from '../_shared/githubSync.ts'

/* ══════════════════════════════════════════════════════════════════════════
   WEBHOOK DO GITHUB — sincronização automática a cada push
   ──────────────────────────────────────────────────────────────────────────
   Endpoint público, sem sessão: quem fala não é um utilizador do Showo, é o
   próprio GitHub. A segurança vem da assinatura HMAC (um segredo partilhado
   entre a app e cada hook que criamos em `github-register-webhook`), não de
   getAuthUser. Identifica o projeto pelo `repository.full_name` do payload
   (gravado em `projects.github_repo_full_name` quando o hook é registado) —
   nunca pelo utilizador, que aqui não existe.
   ══════════════════════════════════════════════════════════════════════════ */

const WEBHOOK_SECRET = Deno.env.get('GITHUB_WEBHOOK_SECRET')!

async function validSignature(body: string, header: string | null): Promise<boolean> {
  if (!header) return false
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(WEBHOOK_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body))
  const digest = 'sha256=' + Array.from(new Uint8Array(mac)).map(b => b.toString(16).padStart(2, '0')).join('')
  // Comparação em tempo constante — comparar strings com `===` dava para um
  // atacante medir a assinatura certa byte a byte pelo tempo de resposta.
  if (digest.length !== header.length) return false
  let diff = 0
  for (let i = 0; i < digest.length; i++) diff |= digest.charCodeAt(i) ^ header.charCodeAt(i)
  return diff === 0
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { status: 200 })

  const body = await req.text()
  if (!(await validSignature(body, req.headers.get('x-hub-signature-256')))) {
    console.error('[github-webhook] assinatura inválida')
    return new Response('Invalid signature', { status: 401 })
  }

  const eventType = req.headers.get('x-github-event')
  // `ping` é o pedido de teste que o GitHub faz logo ao criar o hook.
  if (eventType === 'ping') return new Response('pong', { status: 200 })
  if (eventType !== 'push') return new Response('ignored', { status: 200 })

  let payload: any
  try { payload = JSON.parse(body) } catch { return new Response('bad json', { status: 400 }) }

  // Push a apagar um ref (branch/tag), não traz commits novos.
  if (payload?.deleted) return new Response('ok', { status: 200 })

  const fullName = payload?.repository?.full_name
  const defaultBranch = payload?.repository?.default_branch
  // Só a branch principal conta como "trabalho" para o diário — pushes em
  // branches de feature disparavam uma sincronização por cada um deles.
  if (defaultBranch && payload?.ref && payload.ref !== `refs/heads/${defaultBranch}`) {
    return new Response('ignored (non-default branch)', { status: 200 })
  }
  if (!fullName) return new Response('ok', { status: 200 })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // GitHub espera resposta em poucos segundos; ler commits pode demorar
  // mais do que isso. Responde-se já, e processa-se a sincronização a
  // seguir — tal como já se faz noutras edge functions deste projeto.
  const process = async () => {
    const { data: projects, error } = await supabase
      .from('projects')
      .select('id, user_id, github_url')
      .eq('github_repo_full_name', fullName)
    if (error) { console.error('[github-webhook] procurar projetos', error.message); return }

    for (const project of projects ?? []) {
      // user_id em projects é TEXT; só serve para o diário se for mesmo um
      // uuid válido — projetos criados anonimamente não têm hook registado,
      // mas fica a confirmação por segurança.
      if (!/^[0-9a-f-]{36}$/i.test(String(project.user_id))) continue
      try {
        const token = await getGithubToken(supabase, project.user_id)
        const result = await syncProjectCommits(supabase, project, project.user_id, token)
        if (!result.ok) console.error('[github-webhook] sync falhou', project.id, result.error)
      } catch (e) {
        console.error('[github-webhook] sync rebentou', project.id, e)
      }
    }
  }

  // @ts-ignore — disponível no runtime das Edge Functions do Supabase (Deno Deploy)
  if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
    // @ts-ignore
    EdgeRuntime.waitUntil(process())
  } else {
    await process()
  }

  return new Response('ok', { status: 200 })
})
