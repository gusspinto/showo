import { checkRateLimit, getAuthUser, getCorsHeaders } from '../_shared/rateLimit.ts'

/* ══════════════════════════════════════════════════════════════════════════
   PREVIEW DE .docx/.pptx PARA A BIBLIOTECA
   ──────────────────────────────────────────────────────────────────────────
   O browser sozinho não sabe abrir Word/PowerPoint e desenhar a 1ª página
   (ao contrário do PDF, que já é feito no cliente via pdfjs). Aqui só
   convertemos o ficheiro para PDF através do Gotenberg (self-hosted, ver
   GOTENBERG_URL) — quem transforma esse PDF na miniatura JPEG continua a
   ser o mesmo código do cliente (renderPdfThumbnail), reaproveitado. O URL
   do Gotenberg nunca fica exposto no browser: só esta função o conhece.
   ══════════════════════════════════════════════════════════════════════════ */

const GOTENBERG_URL = Deno.env.get('GOTENBERG_URL')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

const EXT_FOR_TYPE: Record<string, string> = {
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
}

/* Descarrega o ficheiro do bucket (service role, sem limite de tamanho ao
   contrário do corpo base64 do pedido — era isto que rebentava nos
   PowerPoint pesados). */
async function downloadFromStorage(path: string): Promise<Uint8Array> {
  const clean = path.replace(/^\/+/, '').replace(/^library-files\//, '')
  const resp = await fetch(
    `${SUPABASE_URL}/storage/v1/object/library-files/${clean.split('/').map(encodeURIComponent).join('/')}`,
    { headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY ?? '' } },
  )
  if (!resp.ok) throw new Error(`storage ${resp.status}`)
  return new Uint8Array(await resp.arrayBuffer())
}

function bytesToB64(bytes: Uint8Array): string {
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req)
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

  const user = await getAuthUser(req)
  if (!user) return json({ error: 'not authenticated' }, 401)

  if (!(await checkRateLimit(req, 'office-thumbnail', 20))) {
    return json({ error: 'Demasiados pedidos. Tenta outra vez daqui a pouco.' }, 429)
  }

  if (!GOTENBERG_URL) {
    console.error('[office-thumbnail] GOTENBERG_URL não configurado')
    return json({ error: 'Conversor não configurado' }, 500)
  }

  try {
    const { name, type, data, path } = await req.json()
    if (!type || (!data && !path)) return json({ error: 'faltam dados do ficheiro' }, 400)

    let bytes: Uint8Array
    if (path) {
      if (!SUPABASE_URL || !SERVICE_KEY) return json({ error: 'storage não configurado' }, 500)
      bytes = await downloadFromStorage(path)
    } else {
      bytes = b64ToBytes(data)
    }

    // O Gotenberg escolhe o conversor pela extensão do nome do ficheiro.
    const ext = (name || '').match(/\.([a-z0-9]{2,5})$/i)?.[1]?.toLowerCase()
      || EXT_FOR_TYPE[type] || 'docx'
    const form = new FormData()
    form.append('files', new Blob([bytes], { type }), `ficheiro.${ext}`)

    // Nota: Render (tier grátis) "adormece" ao fim de inatividade — a
    // primeira conversão depois disso pode demorar 30-60s a arrancar.
    // Timeout de 45s: se o Gotenberg estiver em baixo (ex.: matado por
    // falta de memória, já aconteceu no tier grátis), falha depressa em
    // vez de segurar o pedido até ao limite da própria edge function.
    const resp = await fetch(`${GOTENBERG_URL}/forms/libreoffice/convert`, {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(110_000),
    })
    if (!resp.ok) {
      const detail = await resp.text().catch(() => '')
      throw new Error(`Gotenberg ${resp.status} ${detail.slice(0, 200)}`)
    }

    const pdfBytes = new Uint8Array(await resp.arrayBuffer())
    return json({ pdf: bytesToB64(pdfBytes) })
  } catch (err) {
    console.error('[office-thumbnail]', err)
    const msg = err instanceof Error ? err.message : String(err)
    return json({ error: `Não foi possível converter o ficheiro: ${msg}` }, 500)
  }
})
