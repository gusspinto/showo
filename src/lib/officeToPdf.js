import { supabase } from './supabase'

function bytesToBase64(bytes) {
  let bin = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(bin)
}

function base64ToBytes(b64) {
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

const EXT_FOR_TYPE = {
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
}

/* O Gotenberg (rota libreoffice) decide o conversor pela EXTENSÃO do nome
   do ficheiro. `item.name` é guardado SEM extensão (daí o "no form file
   found for extensions"); acentos/espaços/parênteses no nome também podem
   estragar o multipart. Reduz-se a um nome ASCII seguro + a extensão certa
   (pela mime type se o nome não a tiver). */
function safeFilename(name, type) {
  const raw = (name || '').trim()
  const ext = (raw.match(/\.([a-z0-9]{2,5})$/i)?.[1] || EXT_FOR_TYPE[type] || 'docx').toLowerCase()
  const stem = raw
    .replace(/\.[a-z0-9]{2,5}$/i, '')
    .normalize('NFKD')
    .replace(new RegExp('[\\u0300-\\u036f]', 'g'), '')
    .replace(/[^\w.-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 60) || 'ficheiro'
  return `${stem}.${ext}`
}

/* Converte um Word/PPT (via a edge function office-thumbnail -> Gotenberg)
   num Blob PDF. Precisa de sessão (a função exige auth) — visitantes
   anónimos não conseguem, por isso o resultado é guardado pelo dono na
   primeira vez que abre o ficheiro (persistLibraryPdf). Faz uma segunda
   tentativa: o Gotenberg no tier grátis adormece e a 1.ª chamada depois
   disso costuma falhar por cold start. */
export async function officeToPdfBlob(fileUrl, name, type, storagePath) {
  // Com o path do bucket, a edge function descarrega o ficheiro do lado do
  // servidor (sem o limite de tamanho do corpo base64 — era o que
  // rebentava os PowerPoint pesados).
  if (storagePath) {
    const { data, error } = await supabase.functions.invoke('office-thumbnail', {
      body: { name, type, path: storagePath },
    })
    if (!error && data?.pdf) return new Blob([base64ToBytes(data.pdf)], { type: 'application/pdf' })
    throw error || new Error(data?.error || 'conversão falhou')
  }
  const res = await fetch(fileUrl)
  if (!res.ok) throw new Error(`fetch original ${res.status}`)
  return officeBytesToPdfBlob(new Uint8Array(await res.arrayBuffer()), name, type)
}

/* Como officeToPdfBlob mas a partir de um File/Blob (não de um URL). Usado
   no "Analisar e criar página": converte-se o Word/PPT em PDF no cliente
   ANTES de mandar para a IA, para o import-project só lidar com PDFs. */
export async function officeFileToPdfBlob(file) {
  const bytes = new Uint8Array(await file.arrayBuffer())
  return officeBytesToPdfBlob(bytes, file.name, file.type)
}

async function officeBytesToPdfBlob(bytes, name, type) {
  // ~40MB de ficheiro já dá ~53MB de base64 no corpo do pedido — acima do
  // que a edge function aceita. Falha cedo com uma mensagem útil.
  if (bytes.length > 38 * 1024 * 1024) {
    throw new Error('Ficheiro demasiado grande para pré-visualizar. Transfere-o para ver.')
  }
  const body = { name: safeFilename(name, type), type, data: bytesToBase64(bytes) }
  // O Gotenberg no tier grátis adormece — o primeiro pedido depois disso
  // pode demorar 30-60s. 3 tentativas com esperas a crescer cobrem o
  // arranque a frio.
  const waits = [0, 12000, 25000]
  let lastErr
  for (let attempt = 0; attempt < waits.length; attempt++) {
    if (waits[attempt]) await new Promise(r => setTimeout(r, waits[attempt]))
    const { data, error } = await supabase.functions.invoke('office-thumbnail', { body })
    if (!error && data?.pdf) return new Blob([base64ToBytes(data.pdf)], { type: 'application/pdf' })
    lastErr = error || new Error(data?.error || 'conversão falhou')
  }
  throw lastErr
}

export const OFFICE_MIME = new Set([
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
])
export function isOfficeFile(f) {
  return OFFICE_MIME.has(f?.type) || /\.(docx|pptx)$/i.test(f?.name || '')
}

/* Guarda o PDF convertido para não voltar a converter (e para os visitantes
   do perfil o verem). Só o dono consegue — a RLS bloqueia os outros. */
export async function persistLibraryPdf(item, blob) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || (item.user_id && user.id !== item.user_id)) return
  const path = `${user.id}/pdf/${Date.now()}-${item.id}.pdf`
  const { error } = await supabase.storage
    .from('library-files')
    .upload(path, blob, { contentType: 'application/pdf', upsert: true })
  if (error) return
  await supabase.from('projects').update({ library_pdf_url: path }).eq('id', item.id)
}
