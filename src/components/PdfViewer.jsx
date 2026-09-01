import { useEffect, useRef, useState } from 'react'
import './PdfViewer.css'

/* Renderiza todas as páginas de um PDF em <canvas>, dentro da app — sem
   iframe (o CSP bloqueava) e sem terceiros. pdfjs entra por import
   dinâmico para não pesar no bundle das páginas. */
export default function PdfViewer({ url }) {
  const containerRef = useRef(null)
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    let cancelled = false
    let doc = null
    let renderTask = null

    async function run() {
      setStatus('loading')
      try {
        const pdfjsLib = (await import('../lib/pdfjs')).default
        const res = await fetch(url)
        if (!res.ok) throw new Error(`fetch ${res.status}`)
        const buf = await res.arrayBuffer()
        if (cancelled) return

        doc = await pdfjsLib.getDocument({ data: buf }).promise
        const container = containerRef.current
        if (!container || cancelled) return
        container.innerHTML = ''

        const dpr = window.devicePixelRatio || 1
        const cssWidth = Math.min(container.clientWidth || 760, 900)

        for (let n = 1; n <= doc.numPages; n++) {
          if (cancelled) return
          const page = await doc.getPage(n)
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
        if (!cancelled) {
          console.error('[PdfViewer]', err)
          setStatus('error')
        }
      }
    }

    run()
    return () => {
      cancelled = true
      try { renderTask?.cancel() } catch { /* noop */ }
      try { doc?.destroy?.() } catch { /* noop */ }
    }
  }, [url])

  return (
    <div className="pdfv">
      {status === 'loading' && <div className="pdfv-msg">A carregar…</div>}
      {status === 'error' && <div className="pdfv-msg">Não foi possível abrir este PDF.</div>}
      <div ref={containerRef} className="pdfv-pages" />
    </div>
  )
}
