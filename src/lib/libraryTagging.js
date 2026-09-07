/* Marca, no localStorage, os itens da Biblioteca que a IA está a analisar
   (tagLibraryItem em NewProject). A Biblioteca lê isto para mostrar o
   "Em análise" por baixo do cartão enquanto as competências não chegam.
   Não há coluna no servidor para isto — é um estado curto e local. */

const KEY = 'showo_lib_tagging'
const MAX_AGE = 5 * 60 * 1000 // 5 min: entradas mais velhas ignoram-se

function read() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}') } catch { return {} }
}
function write(m) {
  try { localStorage.setItem(KEY, JSON.stringify(m)) } catch { /* ignore */ }
}

export function markLibraryTagging(id, on) {
  const m = read()
  if (on) m[id] = Date.now()
  else delete m[id]
  write(m)
}

/* Ids ainda "a analisar" (e limpa os que expiraram). */
export function getTaggingIds() {
  const m = read()
  const now = Date.now()
  let changed = false
  for (const [id, ts] of Object.entries(m)) {
    if (now - ts > MAX_AGE) { delete m[id]; changed = true }
  }
  if (changed) write(m)
  return new Set(Object.keys(m))
}
