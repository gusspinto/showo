import { supabase } from './supabase'

/* ══════════════════════════════════════════════════════════════════════════
   BASE DE DADOS + API DO PROJETO
   ──────────────────────────────────────────────────────────────────────────
   Fina camada sobre a função project-db. Todas as chamadas de gestão
   (criar/apagar tabela, emitir chave) usam a sessão do próprio utilizador —
   é a mesma função que também aceita uma chave de API para chamadores
   externos, mas essa via não passa por aqui, vive só na documentação que
   mostramos ao aluno (curl/Postman com o cabeçalho x-api-key).
   ══════════════════════════════════════════════════════════════════════════ */

export const COLUMN_TYPES = [
  { value: 'text', label: 'Texto' },
  { value: 'number', label: 'Número' },
  { value: 'boolean', label: 'Sim/Não' },
  { value: 'date', label: 'Data' },
]

async function call(body) {
  const { data, error } = await supabase.functions.invoke('project-db', { body })
  if (error) {
    let msg = ''
    try { msg = (await error.context?.json?.())?.error } catch { /* corpo não era JSON */ }
    throw new Error(msg || data?.error || 'Não foi possível falar com a base de dados.')
  }
  if (data?.error) throw new Error(data.error)
  return data
}

export const listTables   = (projectId) => call({ action: 'list_tables', projectId })
export const createTable  = (projectId, name, label, columns) => call({ action: 'create_table', projectId, name, label, columns })
export const deleteTable  = (projectId, tableId) => call({ action: 'delete_table', projectId, tableId })
export const toggleTablePublic = (projectId, tableId, isPublic) => call({ action: 'toggle_public', projectId, tableId, isPublic })
export const getApiKey    = (projectId) => call({ action: 'get_api_key', projectId })
export const regenApiKey  = (projectId) => call({ action: 'regen_api_key', projectId })

export const listRows  = (projectId, tableId, limit = 50) => call({ action: 'list_rows', projectId, tableId, limit })
export const insertRow = (projectId, tableId, data) => call({ action: 'insert_row', projectId, tableId, data })
export const updateRow = (projectId, tableId, rowId, data) => call({ action: 'update_row', projectId, tableId, rowId, data })
export const deleteRow = (projectId, tableId, rowId) => call({ action: 'delete_row', projectId, tableId, rowId })

/** Slug válido para nome de tabela (minúsculas, "_", a começar por letra). */
export function slugifyTableName(label) {
  return String(label || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // remove acentos
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/^[0-9_]+/, '')
    .slice(0, 40) || 'tabela'
}

const FN_BASE = 'https://kctdlnqiomxypvesdify.supabase.co/functions/v1/project-db'

/** Exemplo de curl para a documentação mostrada ao aluno. */
export function curlExample(apiKey, tableName, method = 'GET') {
  if (method === 'GET') {
    return `curl -X POST '${FN_BASE}' \\\n  -H 'x-api-key: ${apiKey}' \\\n  -H 'Content-Type: application/json' \\\n  -d '{"action":"list_rows","table":"${tableName}"}'`
  }
  return `curl -X POST '${FN_BASE}' \\\n  -H 'x-api-key: ${apiKey}' \\\n  -H 'Content-Type: application/json' \\\n  -d '{"action":"insert_row","table":"${tableName}","data":{...}}'`
}
