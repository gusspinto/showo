import { supabase } from './supabase'

// Client ID de OAuth não é secreto — aparece sempre no URL de autorização,
// é assim que o GitHub identifica a app a quem vai autorizar.
const GITHUB_OAUTH_CLIENT_ID = 'Ov23liymHrpxqrxbaxal'
const REDIRECT_URI = `${window.location.origin}/auth/github/callback`
const STATE_KEY = 'showo_github_oauth_state'
const RETURN_KEY = 'showo_github_oauth_return'

export function startGithubConnect(returnPath) {
  const state = crypto.randomUUID()
  sessionStorage.setItem(STATE_KEY, state)
  sessionStorage.setItem(RETURN_KEY, returnPath || window.location.pathname)
  const url = new URL('https://github.com/login/oauth/authorize')
  url.searchParams.set('client_id', GITHUB_OAUTH_CLIENT_ID)
  url.searchParams.set('redirect_uri', REDIRECT_URI)
  url.searchParams.set('scope', 'repo')
  url.searchParams.set('state', state)
  window.location.assign(url.toString())
}

/** Chamado na página de callback. Confirma o state e troca o code pelo token. */
export async function finishGithubConnect(code, state) {
  const savedState = sessionStorage.getItem(STATE_KEY)
  sessionStorage.removeItem(STATE_KEY)
  if (!state || state !== savedState) throw new Error('Pedido de autorização inválido. Tenta ligar outra vez.')

  const { data, error } = await supabase.functions.invoke('github-oauth-callback', { body: { code } })
  if (error) {
    let msg = ''
    try { msg = (await error.context?.json?.())?.error } catch { /* corpo não era JSON */ }
    throw new Error(msg || data?.error || 'Não foi possível ligar ao GitHub.')
  }
  const returnPath = sessionStorage.getItem(RETURN_KEY) || '/dashboard'
  sessionStorage.removeItem(RETURN_KEY)
  return { githubLogin: data.github_login, returnPath }
}

export async function getGithubConnection(userId) {
  const { data } = await supabase
    .from('github_connections')
    .select('github_login, created_at')
    .eq('user_id', userId)
    .maybeSingle()
  return data
}

export async function disconnectGithub(userId) {
  const { error } = await supabase.from('github_connections').delete().eq('user_id', userId)
  if (error) throw error
}

export async function listGithubRepos() {
  const { data, error } = await supabase.functions.invoke('github-list-repos')
  if (error) {
    let msg = ''
    try { msg = (await error.context?.json?.())?.error } catch { /* corpo não era JSON */ }
    throw new Error(msg || data?.error || 'Não foi possível ir buscar os repositórios.')
  }
  return data.repos
}

/** Liga sincronização automática (webhook) ao repositório atual do projeto.
 *  Falha "suave" — devolve `{ ok:false, reason }` em vez de lançar erro,
 *  porque a sincronização manual continua a funcionar sem isto. */
export async function registerGithubWebhook(projectId) {
  const { data, error } = await supabase.functions.invoke('github-register-webhook', { body: { projectId, action: 'register' } })
  if (error) {
    let msg = ''
    try { msg = (await error.context?.json?.())?.error } catch { /* corpo não era JSON */ }
    return { ok: false, reason: msg || data?.error || 'Não foi possível ativar a sincronização automática.' }
  }
  return data
}

/** Remove o webhook registado (antes de trocar de repositório ou desligar o GitHub). */
export async function removeGithubWebhook(projectId) {
  try {
    await supabase.functions.invoke('github-register-webhook', { body: { projectId, action: 'remove' } })
  } catch (e) { console.error('[removeGithubWebhook]', e) }
}
