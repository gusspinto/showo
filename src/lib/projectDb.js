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
/** Sem sessão nem chave — o que a página pública chama para saber que
 * tabelas existem, sem nunca expor tabelas privadas nem a chave real. */
export const listPublicTables = (projectId) => call({ action: 'list_public_tables', projectId })
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

/* ── CSV: importar/exportar linhas ──
   Tudo no browser, sem IA nem chamada nenhuma — zero custo além dos
   inserts normais que já existiam (um por linha, mesma API que o
   formulário "Adicionar linha" já usa). */

/** Um parser de CSV simples mas correto: aspas para campos com vírgula,
 * quebra de linha ou aspas a sério (`""` dentro de um campo citado). */
export function parseCsv(text) {
  const rows = []
  let row = [], field = '', inQuotes = false
  const pushField = () => { row.push(field); field = '' }
  const pushRow = () => { pushField(); rows.push(row); row = [] }
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ } else { inQuotes = false }
      } else field += c
    } else if (c === '"') inQuotes = true
    else if (c === ',') pushField()
    else if (c === '\r') { /* ignora, o \n a seguir fecha a linha */ }
    else if (c === '\n') pushRow()
    else field += c
  }
  if (field.length || row.length) pushRow()
  const clean = rows.filter(r => r.length > 1 || (r.length === 1 && r[0] !== ''))
  if (!clean.length) return { headers: [], rows: [] }
  const [headers, ...body] = clean
  return { headers: headers.map(h => h.trim()), rows: body }
}

function csvEscape(v) {
  const s = v === undefined || v === null ? '' : String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** Linhas (formato {id, data}) para texto CSV, colunas na ordem da tabela. */
export function rowsToCsv(columns, rows) {
  const header = columns.map(c => c.name).map(csvEscape).join(',')
  const body = rows.map(r => columns.map(c => csvEscape(r.data[c.name])).join(','))
  return [header, ...body].join('\n')
}

const FN_BASE = 'https://kctdlnqiomxypvesdify.supabase.co/functions/v1/project-db'

/** Exemplos de curl para a documentação mostrada ao dono do projeto (aba
 * Base de dados). action: 'list_rows'|'insert_row'|'update_row'|'delete_row'. */
export function curlExample(apiKey, tableName, action = 'list_rows', sampleData) {
  const base = `curl -X POST '${FN_BASE}' \\\n  -H 'x-api-key: ${apiKey}' \\\n  -H 'Content-Type: application/json' \\\n  -d `
  if (action === 'list_rows') return base + `'{"action":"list_rows","table":"${tableName}"}'`
  if (action === 'insert_row') return base + `'{"action":"insert_row","table":"${tableName}","data":${JSON.stringify(sampleData ?? {})}}'`
  if (action === 'update_row') return base + `'{"action":"update_row","table":"${tableName}","rowId":"ID_DA_LINHA","data":${JSON.stringify(sampleData ?? {})}}'`
  if (action === 'delete_row') return base + `'{"action":"delete_row","table":"${tableName}","rowId":"ID_DA_LINHA"}'`
  return ''
}

/** Exemplo de curl para leitura PÚBLICA — sem chave nenhuma, é o que uma
 * tabela marcada como pública permite a qualquer pessoa. Usa tableId
 * (não o nome) porque sem chave/sessão não há projectId para resolver o
 * nome — é o mesmo requisito que o backend exige. */
export function publicCurlExample(tableId) {
  return `curl -X POST '${FN_BASE}' \\\n  -H 'Content-Type: application/json' \\\n  -d '{"action":"list_rows","tableId":"${tableId}"}'`
}
