import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

/* ══════════════════════════════════════════════════════════════════════════
   NÚCLEO DA SINCRONIZAÇÃO COM O GITHUB — partilhado entre o sync manual
   (github-sync, disparado pelo utilizador) e o automático (github-webhook,
   disparado por um push). A lógica de leitura/escrita é sempre a mesma; o
   que muda entre os dois é só quem autoriza o pedido.
   ══════════════════════════════════════════════════════════════════════════ */

const GITHUB_API = 'https://api.github.com'
const MAX_COMMIT_PAGES = 3   // 300 commits — chega para uma PAP inteira
const PER_PAGE = 100

/** Aceita github.com/owner/repo em qualquer das formas que uma pessoa cola. */
export function parseRepo(url: string | null | undefined): { owner: string; repo: string } | null {
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

// Prioridade: token do próprio utilizador (OAuth, vê privados) > token
// genérico da app (GITHUB_TOKEN, só sobe o limite de pedidos de públicos).
export function ghHeaders(userToken: string | null, extra: Record<string, string> = {}): Record<string, string> {
  const h: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'showo-app',
    ...extra,
  }
  const token = userToken || Deno.env.get('GITHUB_TOKEN')
  if (token) h.Authorization = `Bearer ${token}`
  return h
}

/**
 * Número da última página no cabeçalho `Link` do GitHub. Com per_page=1, a
 * última página É o número total de commits, e o commit dessa página é o
 * mais antigo do repositório — dois pedidos em vez de paginar tudo.
 */
function lastPage(link: string | null): number | null {
  const m = link?.match(/[?&]page=(\d+)[^>]*>;\s*rel="last"/)
  return m ? Number(m[1]) : null
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

export type SyncResult =
  | { ok: true; stats: Record<string, unknown>; entries_added: number }
  | { ok: false; error: string; status: number }

/**
 * Lê o repositório pela API do GitHub e grava commits/linguagens no projeto.
 * `project.user_id` é usado para atribuir as entradas do diário — tem de ser
 * sempre o dono real do projeto (confirmado por quem chama esta função).
 */
export async function syncProjectCommits(
  supabase: SupabaseClient,
  project: { id: string; github_url: string | null },
  // uuid confirmado do dono — nunca `projects.user_id` em bruto, que é TEXT
  // e pode nem ser um uuid válido em projetos criados anonimamente.
  ownerUserId: string,
  userToken: string | null,
): Promise<SyncResult> {
  const parsed = parseRepo(project.github_url)
  if (!parsed) {
    return { ok: false, error: 'Adiciona primeiro o link do repositório (github.com/utilizador/repositorio).', status: 400 }
  }
  const { owner, repo } = parsed
  const base = `${GITHUB_API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`

  // ── Repositório ──
  const repoRes = await fetch(base, { headers: ghHeaders(userToken) })
  if (repoRes.status === 404) {
    return { ok: false, error: 'Repositório não encontrado. Tem de ser público e o link tem de estar certo.', status: 404 }
  }
  if (repoRes.status === 403 || repoRes.status === 429) {
    return { ok: false, error: 'O GitHub está a limitar os pedidos neste momento. Tenta daqui a uns minutos.', status: 429 }
  }
  if (!repoRes.ok) return { ok: false, error: 'O GitHub não respondeu como esperado.', status: 502 }
  const repoData = await repoRes.json()

  // Privado só é aceite com conta GitHub ligada — sem OAuth, o pedido acima
  // nem o teria encontrado (404), mas fica explícito por clareza.
  if (repoData.private && !userToken) {
    return { ok: false, error: 'O repositório é privado. Liga a tua conta do GitHub para o sincronizar.', status: 400 }
  }

  // Um fork devolve o histórico INTEIRO do original, com os commits de toda
  // a gente que trabalhou nele. Aceitá-lo punha milhares de commits de
  // estranhos no diário, apresentados como trabalho do aluno — o contrário
  // de prova de trabalho. Por isso recusa-se, e explica-se porquê.
  if (repoData.fork) {
    const parent = repoData.parent?.full_name
    return {
      ok: false,
      error: `Este repositório é uma cópia (fork)${parent ? ` de ${parent}` : ''}, e traz o histórico de quem fez o original. ` +
        'Para mostrar só o teu trabalho, usa um repositório criado por ti.',
      status: 400,
    }
  }

  // ── Linguagens (bytes por linguagem) ──
  let languages: Record<string, number> = {}
  try {
    const langRes = await fetch(`${base}/languages`, { headers: ghHeaders(userToken) })
    if (langRes.ok) languages = await langRes.json()
  } catch { /* linguagens são um extra, não valem falhar a sincronização */ }

  // ── Commits ──
  type Commit = { sha: string; date: string; message: string }
  const commits: Commit[] = []
  for (let page = 1; page <= MAX_COMMIT_PAGES; page++) {
    const res = await fetch(`${base}/commits?per_page=${PER_PAGE}&page=${page}`, { headers: ghHeaders(userToken) })
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
      const best = bestTitle(dayCommits.map(c => c.message))
      const n = dayCommits.length
      const count = `${n} ${n === 1 ? 'commit' : 'commits'} em ${owner}/${repo}`
      return {
        project_id: project.id,
        user_id: ownerUserId,
        kind: 'auto',
        content: best ? `${count}: ${best}` : count,
        external_id: `gh:${owner}/${repo}:${day}`,
        // A entrada tem de ficar no dia em que o trabalho foi feito, não no
        // dia em que se sincronizou — senão a timeline mente.
        created_at: `${day}T12:00:00Z`,
      }
    })

  let inserted = 0
  if (rows.length) {
    const { data: ins, error: insErr } = await supabase
      .from('project_journal_entries')
      .upsert(rows, { onConflict: 'project_id,external_id', ignoreDuplicates: true })
      .select('id')
    if (insErr) {
      console.error('[githubSync] insert', insErr.message)
      return { ok: false, error: 'Não foi possível escrever no diário. Tenta outra vez.', status: 500 }
    }
    inserted = ins?.length ?? 0
  }

  const dates = commits.map(c => c.date).sort()

  // ── Totais verdadeiros quando a leitura foi cortada ──
  let totalCommits = commits.length
  let firstCommit = dates[0] ?? null
  if (commits.length >= MAX_COMMIT_PAGES * PER_PAGE) {
    try {
      const head = await fetch(`${base}/commits?per_page=1`, { headers: ghHeaders(userToken) })
      const n = lastPage(head.headers.get('link'))
      if (n && n > commits.length) {
        totalCommits = n
        const oldest = await fetch(`${base}/commits?per_page=1&page=${n}`, { headers: ghHeaders(userToken) })
        if (oldest.ok) {
          const [c] = await oldest.json()
          const d = c?.commit?.author?.date || c?.commit?.committer?.date
          if (d) firstCommit = d
        }
      }
    } catch { /* fica com os números da leitura, marcados como parciais */ }
  }
  const partial = totalCommits > commits.length

  const stats = {
    owner,
    repo,
    url: repoData.html_url ?? project.github_url,
    description: repoData.description ?? null,
    stars: repoData.stargazers_count ?? 0,
    forks: repoData.forks_count ?? 0,
    commits: totalCommits,
    commits_scanned: commits.length,
    partial,
    active_days: byDay.size,
    first_commit: firstCommit,
    scanned_first_commit: dates[0] ?? null,
    last_commit: dates[dates.length - 1] ?? null,
    languages,
    default_branch: repoData.default_branch ?? null,
  }

  const { error: updErr } = await supabase
    .from('projects')
    .update({ github_stats: stats, github_synced_at: new Date().toISOString() })
    .eq('id', project.id)

  if (updErr) {
    console.error('[githubSync] update projects', updErr.message)
    return { ok: false, error: 'Os commits foram lidos, mas não foi possível guardar o resultado. Tenta outra vez.', status: 500 }
  }

  return { ok: true, stats, entries_added: inserted }
}
