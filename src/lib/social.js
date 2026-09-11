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

/**
 * Quantos meses separam o primeiro do último commit LIDO (mínimo 1).
 * Usa sempre `scanned_first_commit`, nunca `first_commit` — este último é o
 * início real do repositório, que pode ser muito mais antigo do que os
 * commits que o diário realmente recebeu. Misturar os dois fazia o painel
 * dizer "4 meses de projeto" ao lado de "10 dias de trabalho" — os números
 * descreviam janelas diferentes e liam-se como uma contradição.
 */
export function commitSpanMonths(stats) {
  const first = stats?.scanned_first_commit ?? stats?.first_commit
  if (!first || !stats?.last_commit) return null
  const a = new Date(first)
  const b = new Date(stats.last_commit)
  if (Number.isNaN(+a) || Number.isNaN(+b)) return null
  return Math.max(1, Math.round((b - a) / (1000 * 60 * 60 * 24 * 30.4)))
}

/**
 * Meses desde o commit mais antigo REAL do repositório (não só o lido).
 * Serve só para uma frase informativa à parte — nunca ao lado de "dias de
 * trabalho", porque não é o que o diário documenta.
 */
export function repoAgeMonths(stats) {
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

/* ── Gerador de post ──────────────────────────────────────────────────────
   Pede à edge function o texto de um post em 1ª pessoa. `mode` decide a
   origem: 'weekly' (registos do diário da semana) ou 'project' (campos de um
   projeto acabado de publicar). Devolve a string do post, ou atira um Error
   com a mensagem já pronta a mostrar. */
export async function generateLinkedInPost(payload) {
  const { data, error } = await supabase.functions.invoke('linkedin-post', { body: payload })
  if (error) {
    let msg = ''
    try { msg = (await error.context?.json?.())?.error } catch { /* corpo não era JSON */ }
    throw new Error(msg || data?.error || 'Não foi possível gerar o post.')
  }
  if (data?.error) throw new Error(data.error)
  if (!data?.text) throw new Error('A resposta veio vazia. Tenta outra vez.')
  return data.text
}

/* O compositor do LinkedIn não aceita texto pré-preenchido a partir de um
   link — a app deles ignora-o. O melhor que se consegue sem OAuth: copiar o
   texto para a área de transferência e abrir o compositor, para a pessoa
   colar. Chamar dentro do gesto de clique (o open e o clipboard exigem-no). */
export async function copyAndOpenLinkedIn(text) {
  let copied = false
  try {
    await navigator.clipboard.writeText(text)
    copied = true
  } catch { /* browsers antigos / sem permissão — a pessoa copia à mão */ }
  window.open('https://www.linkedin.com/feed/?shareActive=true', '_blank', 'noopener,noreferrer')
  return copied
}
