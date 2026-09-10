import { supabase } from './supabase'

/* ══════════════════════════════════════════════════════════════════════════
   GITHUB + LINKEDIN
   ──────────────────────────────────────────────────────────────────────────
   Duas integrações com ambições muito diferentes, de propósito.

   O GitHub é uma integração a sério: a API pública devolve commits e
   linguagens de um repositório público, e isso é prova de trabalho datada
   que a app passa a ter sem pedir nada ao aluno.

   O LinkedIn não pode ser. A API deles não permite a terceiros nem importar
   perfis nem publicar sem uma app aprovada, por isso a única coisa honesta
   que se consegue é abrir o compositor deles com o link já preenchido.
   ══════════════════════════════════════════════════════════════════════════ */

/** github.com/owner/repo → { owner, repo }. Um link de perfil devolve null. */
export function parseGithubRepo(url) {
  if (!url) return null
  const m = String(url).trim().replace(/\.git$/, '')
    .match(/github\.com[/:]([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)/i)
  if (!m) return null
  const [, owner, repo] = m
  if (!repo || repo === '.' || repo === '..') return null
  return { owner, repo }
}

/**
 * Sincroniza o repositório do projeto.
 * @returns {Promise<{ stats: object, entries_added: number }>}
 * @throws  {Error} com a mensagem já pronta a mostrar ao utilizador
 */
export function syncGithub(projectId) {
  return invokeGithub({ projectId, action: 'sync' }, 'Não foi possível sincronizar com o GitHub.')
}

/**
 * Tira do diário todas as entradas que vieram do GitHub e limpa os números
 * da página pública. As entradas escritas à mão ficam.
 * @returns {Promise<{ entries_removed: number }>}
 */
export function removeGithubEntries(projectId) {
  return invokeGithub({ projectId, action: 'remove' }, 'Não foi possível remover as entradas do GitHub.')
}

async function invokeGithub(body, fallback) {
  const { data, error } = await supabase.functions.invoke('github-sync', { body })
  // Uma resposta de erro da função traz o corpo em error.context — a
  // mensagem escrita para o aluno está lá, e é melhor do que "Edge Function
  // returned a non-2xx status code".
  if (error) {
    let msg = ''
    try { msg = (await error.context?.json?.())?.error } catch { /* corpo não era JSON */ }
    throw new Error(msg || data?.error || fallback)
  }
  if (data?.error) throw new Error(data.error)
  return data
}

/** As 3 linguagens com mais código, em percentagem dos bytes totais. */
export function topLanguages(languages, limit = 3) {
  const entries = Object.entries(languages || {})
  const total = entries.reduce((s, [, bytes]) => s + bytes, 0)
  if (!total) return []
  return entries
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, bytes]) => ({ name, pct: Math.round((bytes / total) * 100) }))
}

/** Quantos meses separam o primeiro do último commit (mínimo 1). */
export function commitSpanMonths(stats) {
  if (!stats?.first_commit || !stats?.last_commit) return null
  const a = new Date(stats.first_commit)
  const b = new Date(stats.last_commit)
  if (Number.isNaN(+a) || Number.isNaN(+b)) return null
  return Math.max(1, Math.round((b - a) / (1000 * 60 * 60 * 24 * 30.4)))
}

/* ── LinkedIn ─────────────────────────────────────────────────────────────
   `share-offsite` é o único ponto de entrada que funciona sem app aprovada.
   Aceita só o URL: qualquer texto que passássemos era ignorado, e o
   LinkedIn monta a pré-visualização a partir das meta tags da página. */
export function linkedInShareUrl(pageUrl) {
  return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(pageUrl)}`
}

/** Abre o compositor do LinkedIn numa janela. Chamar dentro do clique. */
export function shareOnLinkedIn(pageUrl) {
  window.open(linkedInShareUrl(pageUrl), '_blank', 'noopener,noreferrer,width=680,height=640')
}
