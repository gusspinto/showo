import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { checkRateLimit, getCorsHeaders, getAuthUser } from '../_shared/rateLimit.ts'

/* ══════════════════════════════════════════════════════════════════════════
   SINCRONIZAR COM O GITHUB
   ──────────────────────────────────────────────────────────────────────────
   Lê um repositório PÚBLICO pela API pública do GitHub e traz para dentro do
   projeto o que já lá está datado: commits, linguagens e as datas do
   primeiro e último trabalho.

   Três decisões que definem o que isto é (e o que não é):

   1. Sem OAuth. Não pedimos acesso à conta de ninguém, e por isso nunca
      vemos código privado. Tudo o que a app lê é o que qualquer pessoa vê
      ao abrir o repositório no browser. Um token nosso (GITHUB_TOKEN), se
      existir, serve só para subir o limite de pedidos de 60/h para 5000/h —
      nunca para aceder a mais coisas.

   2. Um dia = uma entrada, não um commit = uma entrada. Um dia de trabalho
      normal são 15 commits com mensagens como "fix" e "wip"; despejá-los no
      diário enterrava o que o aluno escreveu à mão debaixo de ruído.

   3. Entradas com kind='auto' e external_id. O kind impede que o
      generate-report as escreva na primeira pessoa como se fossem reflexões
      do aluno; o external_id impede que sincronizar duas vezes duplique o
      histórico.
   ══════════════════════════════════════════════════════════════════════════ */

const GITHUB_API = 'https://api.github.com'
const MAX_COMMIT_PAGES = 3   // 300 commits — chega para uma PAP inteira
const PER_PAGE = 100

/** Aceita github.com/owner/repo em qualquer das formas que uma pessoa cola. */
function parseRepo(url: string): { owner: string; repo: string } | null {
  if (!url) return null
  const m = String(url)
    .trim()
    .replace(/\.git$/, '')
    .match(/github\.com[/:]([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)/i)
  if (!m) return null
  const owner = m[1]
  const repo = m[2]
  // Um link para o perfil (github.com/joao) não é um repositório.
  if (!owner || !repo || repo === '.' || repo === '..') return null
  return { owner, repo }
}

function ghHeaders(): Record<string, string> {
  const h: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'showo-app',
  }
  const token = Deno.env.get('GITHUB_TOKEN')
  if (token) h.Authorization = `Bearer ${token}`
  return h
}

/** Mensagem de commit em uma linha, sem o corpo nem o rodapé. */
function commitTitle(message: string): string {
  return String(message || '').split('\n')[0].trim().slice(0, 120)
}

/**
 * A frase que melhor descreve o dia. A regra "a mais longa ganha" sozinha
 * escolhia sempre os merges automáticos do git ("Merge remote-tracking
 * branch 'origin/main' into ...") — são as mensagens mais compridas do
 * repositório e não dizem nada sobre o trabalho feito.
 */
function bestTitle(messages: string[]): string | null {
  const titles = messages.map(commitTitle).filter(Boolean)
  const real = titles.filter(t => !/^(merge|revert)\b/i.test(t))
  const pool = real.length ? real : titles
  return pool.sort((a, b) => b.length - a.length)[0] ?? null
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  const user = await getAuthUser(req)
  if (!user) return json({ error: 'Precisas de sessão iniciada.' }, 401)

  // O limite é por IP, e uma turma inteira sai pela mesma linha da escola —
  // com 10/h a quinta pessoa a sincronizar levava com um erro sem perceber
  // porquê. 40/h continua a travar um ciclo a bater na API do GitHub.
  if (!(await checkRateLimit(req, 'github-sync', 40))) {
    return json({ error: 'Demasiadas sincronizações seguidas. Tenta daqui a pouco.' }, 429)
  }

  try {
    const { projectId } = await req.json()
    if (typeof projectId !== 'string' || !projectId) {
      return json({ error: 'Projeto em falta.' }, 400)
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: project } = await supabase
      .from('projects')
      .select('id, user_id, github_url')
      .eq('id', projectId)
      .single()

    if (!project) return json({ error: 'Projeto não encontrado.' }, 404)
    // user_id em projects é TEXT, não uuid.
    if (String(project.user_id) !== String(user.id)) {
      return json({ error: 'Só o dono do projeto pode sincronizar.' }, 403)
    }

    const parsed = parseRepo(project.github_url ?? '')
    if (!parsed) {
      return json({ error: 'Adiciona primeiro o link do repositório (github.com/utilizador/repositorio).' }, 400)
    }
    const { owner, repo } = parsed
    const base = `${GITHUB_API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`

    // ── Repositório ──
    const repoRes = await fetch(base, { headers: ghHeaders() })
    if (repoRes.status === 404) {
      return json({ error: 'Repositório não encontrado. Tem de ser público e o link tem de estar certo.' }, 404)
    }
    if (repoRes.status === 403 || repoRes.status === 429) {
      return json({ error: 'O GitHub está a limitar os pedidos neste momento. Tenta daqui a uns minutos.' }, 429)
    }
    if (!repoRes.ok) return json({ error: 'O GitHub não respondeu como esperado.' }, 502)
    const repoData = await repoRes.json()

    if (repoData.private) {
      return json({ error: 'O repositório é privado. Só conseguimos ler repositórios públicos.' }, 400)
    }

    // ── Linguagens (bytes por linguagem) ──
    let languages: Record<string, number> = {}
    try {
      const langRes = await fetch(`${base}/languages`, { headers: ghHeaders() })
      if (langRes.ok) languages = await langRes.json()
    } catch { /* linguagens são um extra, não valem falhar a sincronização */ }

    // ── Commits ──
    type Commit = { sha: string; date: string; message: string }
    const commits: Commit[] = []
    for (let page = 1; page <= MAX_COMMIT_PAGES; page++) {
      const res = await fetch(`${base}/commits?per_page=${PER_PAGE}&page=${page}`, { headers: ghHeaders() })
      // 409 = repositório vazio, ainda sem commits.
      if (res.status === 409) break
      if (!res.ok) break
      const batch = await res.json()
      if (!Array.isArray(batch) || batch.length === 0) break
      for (const c of batch) {
        const date = c?.commit?.author?.date || c?.commit?.committer?.date
        if (!date) continue
        commits.push({ sha: c.sha, date, message: c?.commit?.message ?? '' })
      }
      if (batch.length < PER_PAGE) break
    }

    // ── Um dia de trabalho = uma entrada de diário ──
    const byDay = new Map<string, Commit[]>()
    for (const c of commits) {
      const day = c.date.slice(0, 10)
      const list = byDay.get(day)
      if (list) list.push(c)
      else byDay.set(day, [c])
    }

    const rows = [...byDay.entries()]
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([day, dayCommits]) => {
        // A mensagem mais longa do dia (ignorando merges) é quase sempre a
        // que descreve o trabalho a sério; as curtas são "fix", "wip".
        const best = bestTitle(dayCommits.map(c => c.message))
        const n = dayCommits.length
        const count = `${n} ${n === 1 ? 'commit' : 'commits'} em ${owner}/${repo}`
        return {
          project_id: project.id,
          // user_id no diário é uuid; em projects é TEXT (e em projetos
          // criados anonimamente pode nem ser um uuid). Usa-se o id da
          // sessão, que é sempre uuid — e a esta altura já se confirmou que
          // é a mesma pessoa.
          user_id: user.id,
          kind: 'auto',
          content: best ? `${count}: ${best}` : count,
          external_id: `gh:${owner}/${repo}:${day}`,
          // A entrada tem de ficar no dia em que o trabalho foi feito, não
          // no dia em que se carregou no botão — senão a timeline mente.
          created_at: `${day}T12:00:00Z`,
        }
      })

    let inserted = 0
    if (rows.length) {
      // ignoreDuplicates: sincronizar outra vez não reescreve nem duplica o
      // que já lá está (o índice único de 137 é a rede de segurança).
      const { data: ins, error: insErr } = await supabase
        .from('project_journal_entries')
        .upsert(rows, { onConflict: 'project_id,external_id', ignoreDuplicates: true })
        .select('id')
      if (insErr) console.error('[github-sync] insert', insErr.message)
      inserted = ins?.length ?? 0
    }

    const dates = commits.map(c => c.date).sort()
    const stats = {
      owner,
      repo,
      url: repoData.html_url ?? project.github_url,
      description: repoData.description ?? null,
      stars: repoData.stargazers_count ?? 0,
      forks: repoData.forks_count ?? 0,
      // `commits` está limitado a MAX_COMMIT_PAGES × PER_PAGE. O sinal
      // impede que o painel apresente um limite técnico como se fosse o
      // número real de commits do repositório.
      commits: commits.length,
      commits_truncated: commits.length >= MAX_COMMIT_PAGES * PER_PAGE,
      active_days: byDay.size,
      first_commit: dates[0] ?? null,
      last_commit: dates[dates.length - 1] ?? null,
      languages,
      default_branch: repoData.default_branch ?? null,
    }

    await supabase
      .from('projects')
      .update({ github_stats: stats, github_synced_at: new Date().toISOString() })
      .eq('id', project.id)

    return json({ ok: true, stats, entries_added: inserted })
  } catch (e) {
    console.error('[github-sync]', e)
    return json({ error: 'Não foi possível sincronizar agora.' }, 500)
  }
})
