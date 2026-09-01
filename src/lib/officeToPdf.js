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

/* Converte um Word/PPT (via a edge function office-thumbnail → Gotenberg)
   num Blob PDF. Precisa de sessão (a função exige auth) — visitantes
   anónimos não conseguem, por isso o resultado é guardado pelo dono na
   primeira vez que abre o ficheiro (persistLibraryPdf). */
export async function officeToPdfBlob(fileUrl, name, type) {
  const res = await fetch(fileUrl)
  if (!res.ok) throw new Error(`fetch original ${res.status}`)
  const b64 = bytesToBase64(new Uint8Array(await res.arrayBuffer()))
  const { data, error } = await supabase.functions.invoke('office-thumbnail', {
    body: { name, type, data: b64 },
  })
  if (error || !data?.pdf) throw error || new Error(data?.error || 'conversão falhou')
  return new Blob([base64ToBytes(data.pdf)], { type: 'application/pdf' })
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
