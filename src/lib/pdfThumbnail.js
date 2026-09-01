import pdfjsLib from './pdfjs'

/* Renderiza a primeira página de um PDF para um blob JPEG — a preview
   tipo Drive da Biblioteca. Tudo no browser, sem backend nenhum.
   Quem chama isto tem de tratar de falhas (PDF corrompido, protegido
   por password, etc.) — não é crítico, o cartão colorido por tipo de
   ficheiro já serve de reserva. */
export async function renderPdfThumbnail(file, { maxWidth = 480 } = {}) {
  const buf = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise
  const page = await pdf.getPage(1)
  const baseViewport = page.getViewport({ scale: 1 })
  const scale = maxWidth / baseViewport.width
  const viewport = page.getViewport({ scale })

  const canvas = document.createElement('canvas')
  canvas.width = Math.round(viewport.width)
  canvas.height = Math.round(viewport.height)
  const ctx = canvas.getContext('2d')
  await page.render({ canvasContext: ctx, viewport }).promise

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => (blob ? resolve(blob) : reject(new Error('canvas.toBlob devolveu vazio'))),
      'image/jpeg',
      0.82
    )
  })
}
