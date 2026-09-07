/* Miniatura de um Word/PowerPoint SEM conversor. Um .pptx/.docx é um zip;
   tenta-se, por ordem:
     1. docProps/thumbnail.(jpeg|png) — o PowerPoint de secretária embute-o;
        Canva / Google Slides / Figma não.
     2. a 1.ª imagem do 1.º slide (ppt/media/…) — decks de campanha têm quase
        sempre uma imagem a toda a largura no slide de abertura.
   Só se nada disto resultar é que se cai no conversor (Gotenberg). */

import { supabase } from './supabase'

const LOCAL_SIG = 0x04034b50

async function inflateRaw(bytes) {
  if (typeof DecompressionStream === 'undefined') throw new Error('no DecompressionStream')
  const ds = new DecompressionStream('deflate-raw')
  const stream = new Blob([bytes]).stream().pipeThrough(ds)
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

/* Lê as entradas do zip cujo nome passa em `want(name)`. Devolve
   { name: Uint8Array }. Percorre os local file headers — chega para os
   ficheiros Office (têm os tamanhos no header, sem data descriptor). */
async function readZipEntries(buf, want) {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength)
  const dec = new TextDecoder()
  const out = {}
  for (let i = 0; i + 30 < buf.length; i++) {
    if (dv.getUint32(i, true) !== LOCAL_SIG) continue
    const method = dv.getUint16(i + 8, true)
    const compSize = dv.getUint32(i + 18, true)
    const nameLen = dv.getUint16(i + 26, true)
    const extraLen = dv.getUint16(i + 28, true)
    const nameStart = i + 30
    if (nameStart + nameLen > buf.length) break
    const name = dec.decode(buf.subarray(nameStart, nameStart + nameLen))
    const dataStart = nameStart + nameLen + extraLen
    if (compSize && want(name)) {
      const raw = buf.subarray(dataStart, dataStart + compSize)
      try {
        out[name] = method === 0 ? raw : method === 8 ? await inflateRaw(raw) : null
      } catch { /* ignora entrada corrompida */ }
    }
    if (!compSize) continue // tamanho desconhecido: deixa o scan byte-a-byte achar o próximo header
    i = dataStart + compSize - 1
  }
  return out
}

function imageBlob(bytes) {
  if (!bytes || bytes.length < 4) return null
  const isPng = bytes[0] === 0x89 && bytes[1] === 0x50
  const isJpg = bytes[0] === 0xff && bytes[1] === 0xd8
  if (!isPng && !isJpg) return null // emf/wmf/svg: o browser não desenha aqui
  return new Blob([bytes], { type: isPng ? 'image/png' : 'image/jpeg' })
}

export async function extractOfficeThumbnail(file) {
  let buf
  try {
    buf = new Uint8Array(await file.arrayBuffer())
  } catch { return null }

  const entries = await readZipEntries(buf, n =>
    /^docProps\/thumbnail\./i.test(n) ||
    n === 'ppt/slides/slide1.xml' ||
    n === 'ppt/slides/_rels/slide1.xml.rels' ||
    /^ppt\/media\//i.test(n),
  )

  // 1. thumbnail embutida
  for (const [name, bytes] of Object.entries(entries)) {
    if (/^docProps\/thumbnail\./i.test(name)) {
      const b = imageBlob(bytes)
      if (b) return b
    }
  }

  // 2. 1.ª imagem do 1.º slide
  const slide = entries['ppt/slides/slide1.xml']
  const rels = entries['ppt/slides/_rels/slide1.xml.rels']
  if (slide && rels) {
    const dec = new TextDecoder()
    const embedId = dec.decode(slide).match(/r:embed="([^"]+)"/)?.[1]
    if (embedId) {
      const relsText = dec.decode(rels)
      const target = new RegExp(`Id="${embedId}"[^>]*Target="([^"]+)"`).exec(relsText)?.[1]
      if (target) {
        const fname = target.split('/').pop().toLowerCase()
        const key = Object.keys(entries).find(k => k.toLowerCase().endsWith('/' + fname))
        const b = key && imageBlob(entries[key])
        if (b) return b
      }
    }
  }

  return null
}

/* Itens já na Biblioteca sem miniatura: ao abrir o ficheiro, o dono gera-a
   e grava-a (para ele e para os visitantes do perfil). */
export async function backfillOfficeThumbnail(item) {
  const L = (...a) => console.info('[thumb]', ...a)
  if (!item || item.library_thumb_url || !item._signedFileUrl) return null
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || (item.user_id && user.id !== item.user_id)) { L('não é o dono'); return null }
    const res = await fetch(item._signedFileUrl)
    if (!res.ok) { L('fetch ficheiro falhou', res.status); return null }
    let blob = await extractOfficeThumbnail(await res.blob())
    L(blob ? 'miniatura tirada do ficheiro' : 'ficheiro sem imagem usável, tenta conversor')

    if (!blob) {
      const { storagePath } = await import('./libraryFile')
      const p = storagePath(item.library_file_url)
      if (!p) { L('sem storage path'); return null }
      const { data, error } = await supabase.functions.invoke('office-thumbnail', {
        body: { name: item.library_file_name || item.name, type: item.library_file_type, path: p },
      })
      if (error || !data?.pdf) {
        let detail = data?.error || error?.message
        try { if (error?.context?.text) detail = await error.context.text() } catch { /* ignore */ }
        L('conversor falhou:', detail)
        return null
      }
      const bin = atob(data.pdf)
      const pdfBytes = new Uint8Array(bin.length)
      for (let i = 0; i < bin.length; i++) pdfBytes[i] = bin.charCodeAt(i)
      const { renderPdfThumbnail } = await import('./pdfThumbnail')
      blob = await renderPdfThumbnail(new Blob([pdfBytes], { type: 'application/pdf' }))
    }
    if (!blob) { L('sem blob final'); return null }
    const ext = blob.type === 'image/png' ? 'png' : 'jpg'
    const path = `${user.id}/thumbs/${Date.now()}-${item.id}.${ext}`
    const up = await supabase.storage.from('library-files').upload(path, blob, { contentType: blob.type, upsert: true })
    if (up.error) { L('upload miniatura falhou:', up.error.message); return null }
    await supabase.from('projects').update({ library_thumb_url: path }).eq('id', item.id)
    L('miniatura gravada', path)
    return path
  } catch (e) { L('erro:', e?.message); return null }
}
