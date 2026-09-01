import { useEffect, useRef, useState } from 'react'
import './PdfViewer.css'

const MIN_SCALE = 0.5
const MAX_SCALE = 3
const STEP = 0.25

/* Renderiza todas as páginas de um PDF em <canvas>, dentro da app — sem
   iframe (o CSP bloqueava) e sem terceiros. pdfjs entra por import
   dinâmico para não pesar no bundle das páginas. Zoom re-desenha as
   páginas (nítido em qualquer nível). */
export default function PdfViewer({ url }) {
  const containerRef = useRef(null)
  const [pdfDoc, setPdfDoc] = useState(null)
  const [status, setStatus] = useState('loading')
  const [scale, setScale] = useState(1)

  useEffect(() => {
    let cancelled = false
    let doc = null
    async function load() {
      setStatus('loading')
      setPdfDoc(null)
      try {
        const pdfjsLib = (await import('../lib/pdfjs')).default
        const res = await fetch(url)
        if (!res.ok) throw new Error(`fetch ${res.status}`)
        const buf = await res.arrayBuffer()
        if (cancelled) return
        doc = await pdfjsLib.getDocument({ data: buf }).promise
        if (cancelled) { doc.destroy?.(); return }
        setPdfDoc(doc)
      } catch (err) {
        if (!cancelled) { console.error('[PdfViewer]', err); setStatus('error') }
      }
    }
    load()
    return () => { cancelled = true; try { doc?.destroy?.() } catch { /* noop */ } }
  }, [url])

  useEffect(() => {
    if (!pdfDoc) return
    let cancelled = false
    let renderTask = null

    async function render() {
      const container = containerRef.current
      if (!container) return
      try {
        container.innerHTML = ''
        const dpr = window.devicePixelRatio || 1
        const baseWidth = Math.min(container.clientWidth || 760, 900)
        const cssWidth = Math.round(baseWidth * scale)

        for (let n = 1; n <= pdfDoc.numPages; n++) {
          if (cancelled) return
          const page = await pdfDoc.getPage(n)
          if (cancelled) return
          const base = page.getViewport({ scale: 1 })
          const viewport = page.getViewport({ scale: (cssWidth / base.width) * dpr })

          const canvas = document.createElement('canvas')
          canvas.className = 'pdfv-page'
          canvas.width = Math.round(viewport.width)
          canvas.height = Math.round(viewport.height)
          canvas.style.width = `${cssWidth}px`
          canvas.style.height = `${Math.round(viewport.height / dpr)}px`
          container.appendChild(canvas)

          renderTask = page.render({ canvasContext: canvas.getContext('2d'), viewport })
          try {
            await renderTask.promise
          } catch (err) {
            if (err?.name === 'RenderingCancelledException') return
            throw err
          }
          renderTask = null
          if (n === 1 && !cancelled) setStatus('ready')
        }
        if (!cancelled) setStatus('ready')
      } catch (err) {
        if (!cancelled) { console.error('[PdfViewer]', err); setStatus('error') }
      }
    }

    render()
    return () => { cancelled = true; try { renderTask?.cancel() } catch { /* noop */ } }
  }, [pdfDoc, scale])

  const zoom = dir => setScale(s => {
    const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, +(s + dir * STEP).toFixed(2)))
    return next
  })

  return (
    <div className="pdfv">
      <div className="pdfv-scroll">
        <div className="pdfv-pages" ref={containerRef} />
        {status === 'loading' && <div className="pdfv-msg">A carregar…</div>}
        {status === 'error' && <div className="pdfv-msg">Não foi possível abrir este PDF.</div>}
      </div>

      {pdfDoc && (
        <div className="pdfv-toolbar">
          <button type="button" onClick={() => zoom(-1)} disabled={scale <= MIN_SCALE} aria-label="Reduzir">−</button>
          <button type="button" className="pdfv-zoom" onClick={() => setScale(1)} title="Repor zoom">
            {Math.round(scale * 100)}%
          </button>
          <button type="button" onClick={() => zoom(1)} disabled={scale >= MAX_SCALE} aria-label="Ampliar">+</button>
        </div>
      )}
    </div>
  )
}
