import { supabase } from './supabase'

/* Pista visual por tipo de ficheiro, à Google Drive — substitui a preview
   real quando não há uma (só imagens e PDFs com thumbnail têm preview de
   verdade). Partilhado entre a Biblioteca e o perfil. */
export const FILE_TYPE_STYLE = {
  'application/pdf': { color: '#e05a4e', label: 'PDF' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { color: '#3b6fd6', label: 'DOC' },
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': { color: '#e08a2e', label: 'PPT' },
  'text/plain': { color: '#8a8f98', label: 'TXT' },
  'text/markdown': { color: '#8a8f98', label: 'MD' },
}

export function fileTypeStyle(type) {
  return FILE_TYPE_STYLE[type] || { color: '#8a8f98', label: 'FICHEIRO' }
}

/* library_file_url / library_thumb_url podem estar guardados como path
   (dados novos, bucket privado desde o 097) ou como URL público completo
   (dados antigos, de quando o bucket era público). Extrai sempre o path
   dentro do bucket 'library-files'. */
export function storagePath(v) {
  if (!v) return null
  if (!v.startsWith('http')) return v
  const m = v.match(/\/library-files\/(.+?)(?:\?|$)/)
  return m ? decodeURIComponent(m[1]) : null
}

/* Assina os ficheiros/thumbnails dos itens entry_kind='library' de uma
   lista e devolve-a com _signedFileUrl / _signedThumbUrl preenchidos
   (null quando não dá para assinar). Não toca nos outros itens. */
export async function withSignedLibraryUrls(items, expiresIn = 3600) {
  const paths = new Set()
  for (const it of items || []) {
    if (it.entry_kind !== 'library') continue
    const f = storagePath(it.library_file_url); if (f) paths.add(f)
    const t = storagePath(it.library_thumb_url); if (t) paths.add(t)
  }
  if (!paths.size) return items
  const { data: signed } = await supabase.storage
    .from('library-files')
    .createSignedUrls([...paths], expiresIn)
  const map = {}
  signed?.forEach(s => { if (s.signedUrl) map[s.path] = s.signedUrl })
  return (items || []).map(it => it.entry_kind !== 'library' ? it : {
    ...it,
    _signedFileUrl: map[storagePath(it.library_file_url)] || null,
    _signedThumbUrl: map[storagePath(it.library_thumb_url)] || null,
  })
}
