/* Miniatura de um Word/PowerPoint SEM conversor: o PowerPoint (e o Word com
   "guardar miniatura") embute uma pré-visualização da 1.ª página/slide em
   docProps/thumbnail.jpeg dentro do ficheiro (que é um zip). Lê-se essa
   imagem direto no browser. Se não existir, devolve null e o chamador cai
   no Gotenberg. */

import { supabase } from './supabase'

const LOCAL_SIG = 0x04034b50

async function inflateRaw(bytes) {
  if (typeof DecompressionStream === 'undefined') throw new Error('no DecompressionStream')
  const ds = new DecompressionStream('deflate-raw')
  const stream = new Blob([bytes]).stream().pipeThrough(ds)
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

export async function extractOfficeThumbnail(file) {
  let buf
  try {
    buf = new Uint8Array(await file.arrayBuffer())
  } catch { return null }
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength)
  const dec = new TextDecoder()

  for (let i = 0; i + 30 < buf.length; i++) {
    if (dv.getUint32(i, true) !== LOCAL_SIG) continue
    const method = dv.getUint16(i + 8, true)
    const compSize = dv.getUint32(i + 18, true)
    const nameLen = dv.getUint16(i + 26, true)
    const extraLen = dv.getUint16(i + 28, true)
    const nameStart = i + 30
    if (nameStart + nameLen > buf.length) break
    const name = dec.decode(buf.subarray(nameStart, nameStart + nameLen))

    if (/^docProps\/thumbnail\.(jpe?g|png|emf|wmf)$/i.test(name)) {
      if (!compSize) return null // data-descriptor zip, tamanho desconhecido
      const dataStart = nameStart + nameLen + extraLen
      const raw = buf.subarray(dataStart, dataStart + compSize)
      let imgBytes
      try {
        imgBytes = method === 0 ? raw : method === 8 ? await inflateRaw(raw) : null
      } catch { return null }
      if (!imgBytes) return null
      const isPng = imgBytes[0] === 0x89 && imgBytes[1] === 0x50
      const isJpg = imgBytes[0] === 0xff && imgBytes[1] === 0xd8
      if (!isPng && !isJpg) return null // emf/wmf: o browser não desenha
      return new Blob([imgBytes], { type: isPng ? 'image/png' : 'image/jpeg' })
    }

    i = nameStart + nameLen + extraLen + compSize - 1 // salta para o próximo header
  }
  return null
}

/* Itens já na Biblioteca sem miniatura (o Gotenberg falhou no upload):
   ao abrir o ficheiro, o dono gera a miniatura embutida e grava-a. */
export async function backfillOfficeThumbnail(item) {
  if (!item || item.library_thumb_url || !item._signedFileUrl) return null
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || (item.user_id && user.id !== item.user_id)) return null
    const res = await fetch(item._signedFileUrl)
    if (!res.ok) return null
    let blob = await extractOfficeThumbnail(await res.blob())

    // Sem miniatura embutida (ex.: thumbnail em EMF, ou Word sem ela):
    // converte para PDF pelo Gotenberg e desenha a 1.ª página.
    if (!blob) {
      const { storagePath } = await import('./libraryFile')
      const p = storagePath(item.library_file_url)
      if (!p) return null
      const { data, error } = await supabase.functions.invoke('office-thumbnail', {
        body: { name: item.library_file_name || item.name, type: item.library_file_type, path: p },
      })
      if (error || !data?.pdf) return null
      const bin = atob(data.pdf)
      const pdfBytes = new Uint8Array(bin.length)
      for (let i = 0; i < bin.length; i++) pdfBytes[i] = bin.charCodeAt(i)
      const { renderPdfThumbnail } = await import('./pdfThumbnail')
      blob = await renderPdfThumbnail(new Blob([pdfBytes], { type: 'application/pdf' }))
    }
    if (!blob) return null
    const ext = blob.type === 'image/png' ? 'png' : 'jpg'
    const path = `${user.id}/thumbs/${Date.now()}-${item.id}.${ext}`
    const up = await supabase.storage.from('library-files').upload(path, blob, { contentType: blob.type, upsert: true })
    if (up.error) return null
    await supabase.from('projects').update({ library_thumb_url: path }).eq('id', item.id)
    return path
  } catch { return null }
}
