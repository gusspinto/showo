import { useRef, useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { CloseIcon as X } from '@solar-icons/react/bold/close'

const MIN_SIZE = 40

/**
 * CropModal — canvas-based image cropper
 *
 * Props:
 *   file        File object (takes priority)
 *   imageUrl    Fallback URL if no file
 *   aspectRatio Optional number (e.g. 16/9). Null = free crop
 *   circular    Boolean — show circular crop overlay (for avatars)
 *   onConfirm   Callback(blob) called with the cropped image Blob
 *   onCancel    Callback to close the modal without cropping
 */
export function CropModal({ file, imageUrl, aspectRatio, circular = false, onConfirm, onCancel }) {
  const containerRef = useRef(null)
  const imgRef       = useRef(null)
  const dragStart    = useRef(null)

  const [mounted,   setMounted]   = useState(false)
  const [imgSrc,    setImgSrc]    = useState(null)
  const [imgLoaded, setImgLoaded] = useState(false)
  const [crop,      setCrop]      = useState({ x: 0, y: 0, w: 0, h: 0 })
  const [dragging,  setDragging]  = useState(null) // 'move' | 'nw' | 'ne' | 'sw' | 'se'

  useEffect(() => { setMounted(true) }, [])

  // Lock scroll while modal is open (works for both mouse and touch)
  useEffect(() => {
    const prevent = (e) => { if (e.cancelable) e.preventDefault() }
    document.addEventListener('touchmove', prevent, { passive: false })
    const scrollY = window.scrollY
    document.body.style.position = 'fixed'
    document.body.style.top = `-${scrollY}px`
    document.body.style.width = '100%'
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('touchmove', prevent)
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.width = ''
      document.body.style.overflow = ''
      window.scrollTo(0, scrollY)
    }
  }, [])

  // Build object-URL from file, or use imageUrl
  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file)
      setImgSrc(url)
      return () => URL.revokeObjectURL(url)
    } else if (imageUrl) {
      setImgSrc(imageUrl)
    }
  }, [file, imageUrl])

  // Initialise crop box after image loads
  const handleImgLoad = useCallback(() => {
    setImgLoaded(true)
    const container = containerRef.current
    if (!container) return
    const cw = container.clientWidth
    const ch = container.clientHeight
    let w = cw * 0.8
    let h = aspectRatio ? w / aspectRatio : ch * 0.8
    if (h > ch * 0.88) { h = ch * 0.88; w = aspectRatio ? h * aspectRatio : cw * 0.8 }
    if (circular) { h = w } // force square for circle crops
    setCrop({ x: (cw - w) / 2, y: (ch - h) / 2, w, h })
  }, [aspectRatio, circular])

  // Global mouse-move / mouse-up while dragging
  useEffect(() => {
    if (!dragging) return

    const onMove = (e) => {
      if (e.cancelable) e.preventDefault()
      const clientX = e.touches ? e.touches[0].clientX : e.clientX
      const clientY = e.touches ? e.touches[0].clientY : e.clientY
      const dx = clientX - dragStart.current.mx
      const dy = clientY - dragStart.current.my
      const c  = dragStart.current.crop
      const container = containerRef.current
      if (!container) return
      const cw = container.clientWidth
      const ch = container.clientHeight

      setCrop(() => {
        let { x, y, w, h } = c

        if (dragging === 'move') {
          x = Math.max(0, Math.min(cw - w, x + dx))
          y = Math.max(0, Math.min(ch - h, y + dy))

        } else if (dragging === 'se') {
          w = Math.max(MIN_SIZE, Math.min(cw - x, c.w + dx))
          h = (circular || aspectRatio) ? w / (aspectRatio ?? 1) : Math.max(MIN_SIZE, Math.min(ch - y, c.h + dy))

        } else if (dragging === 'sw') {
          const newW = Math.max(MIN_SIZE, c.w - dx)
          x = Math.max(0, c.x + c.w - newW)
          w = c.x + c.w - x
          h = (circular || aspectRatio) ? w / (aspectRatio ?? 1) : Math.max(MIN_SIZE, Math.min(ch - y, c.h + dy))

        } else if (dragging === 'ne') {
          w = Math.max(MIN_SIZE, Math.min(cw - x, c.w + dx))
          h = (circular || aspectRatio) ? w / (aspectRatio ?? 1) : Math.max(MIN_SIZE, c.h - dy)
          if (!(circular || aspectRatio)) y = Math.max(0, c.y + c.h - h)
          else y = c.y + c.h - w / (aspectRatio ?? 1)

        } else if (dragging === 'nw') {
          const newW = Math.max(MIN_SIZE, c.w - dx)
          x = Math.max(0, c.x + c.w - newW)
          w = c.x + c.w - x
          h = (circular || aspectRatio) ? w / (aspectRatio ?? 1) : Math.max(MIN_SIZE, c.h - dy)
          if (!(circular || aspectRatio)) y = Math.max(0, c.y + c.h - h)
          else y = c.y + c.h - w / (aspectRatio ?? 1)
        }

        return { x, y, w, h }
      })
    }

    const onUp = () => setDragging(null)

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup',   onUp)
    window.addEventListener('touchmove', onMove, { passive: false })
    window.addEventListener('touchend',  onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup',   onUp)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend',  onUp)
    }
  }, [dragging, aspectRatio, circular])

  const startDrag = useCallback((e, type) => {
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    setDragging(type)
    dragStart.current = { mx: clientX, my: clientY, crop: { ...crop } }
  }, [crop])

  // Confirm: extract the crop region onto a canvas and return a Blob
  const handleConfirm = useCallback(async () => {
    const img       = imgRef.current
    const container = containerRef.current
    if (!img || !container) return

    const naturalW = img.naturalWidth
    const naturalH = img.naturalHeight
    const cw = container.clientWidth
    const ch = container.clientHeight

    // Find the object-fit:contain rendered rect inside the img element
    const imgAspect = naturalW / naturalH
    const conAspect = cw / ch
    let renderedW, renderedH, offX, offY
    if (imgAspect > conAspect) {
      renderedW = cw; renderedH = cw / imgAspect
      offX = 0;       offY = (ch - renderedH) / 2
    } else {
      renderedH = ch; renderedW = ch * imgAspect
      offY = 0;       offX = (cw - renderedW) / 2
    }

    const scaleX = naturalW / renderedW
    const scaleY = naturalH / renderedH

    const srcX = Math.max(0, (crop.x - offX) * scaleX)
    const srcY = Math.max(0, (crop.y - offY) * scaleY)
    const srcW = Math.min(naturalW - srcX, crop.w * scaleX)
    const srcH = Math.min(naturalH - srcY, crop.h * scaleY)

    const canvas = document.createElement('canvas')
    canvas.width  = Math.round(srcW)
    canvas.height = Math.round(srcH)
    const ctx = canvas.getContext('2d')

    if (circular) {
      // Clip to circle for avatar crops
      ctx.beginPath()
      ctx.arc(canvas.width / 2, canvas.height / 2, Math.min(canvas.width, canvas.height) / 2, 0, Math.PI * 2)
      ctx.clip()
    }

    ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, canvas.width, canvas.height)
    canvas.toBlob(blob => onConfirm(blob), 'image/jpeg', 0.92)
  }, [crop, circular, onConfirm])

  const C = {
    bg:    'var(--color-bg)',
    card:  'var(--color-surface)',
    border:'var(--color-border)',
    text:  'var(--color-text)',
    muted: 'var(--color-text-secondary)',
    blue:  'var(--color-text)',
  }

  const corners = [
    { dir: 'nw', top: -7, left: -7,  cursor: 'nwse-resize' },
    { dir: 'ne', top: -7, right: -7, cursor: 'nesw-resize' },
    { dir: 'sw', bottom: -7, left: -7,  cursor: 'nesw-resize' },
    { dir: 'se', bottom: -7, right: -7, cursor: 'nwse-resize' },
  ]

  if (!mounted) return null
  return createPortal(
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 9950, background: 'rgba(0,0,0,0.88)',
               display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
               padding: 20, touchAction: 'none', overflowY: 'hidden' }}
      onClick={onCancel}
    >
      <div
        style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 20,
                 width: '100%', maxWidth: 620, display: 'flex', flexDirection: 'column',
                 overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,0.7)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 700, color: C.text, fontSize: 15 }}>Recortar imagem</span>
          <button type="button" onClick={onCancel}
            style={{ background: 'var(--color-surface-hover)', border: `1px solid ${C.border}`,
                     borderRadius: 8, width: 30, height: 30, display: 'flex', alignItems: 'center',
                     justifyContent: 'center', color: C.muted, cursor: 'pointer' }}>
            <X size={16} />
          </button>
        </div>

        {/* Crop area */}
        <div
          ref={containerRef}
          style={{ position: 'relative', height: 360, background: '#000',
                   overflow: 'hidden', userSelect: 'none', touchAction: 'none' }}
        >
          {imgSrc && (
            <img
              ref={imgRef}
              src={imgSrc}
              alt="recortar"
              crossOrigin="anonymous"
              onLoad={handleImgLoad}
              draggable={false}
              style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
            />
          )}

          {imgLoaded && (
            <>
              {/* Semi-transparent overlay in 4 quadrants */}
              <div style={{ position:'absolute', top:0, left:0, right:0, height: crop.y,              background:'rgba(0,0,0,0.55)', pointerEvents:'none' }} />
              <div style={{ position:'absolute', top: crop.y + crop.h, left:0, right:0, bottom:0,     background:'rgba(0,0,0,0.55)', pointerEvents:'none' }} />
              <div style={{ position:'absolute', top: crop.y, left:0, width: crop.x, height: crop.h,  background:'rgba(0,0,0,0.55)', pointerEvents:'none' }} />
              <div style={{ position:'absolute', top: crop.y, left: crop.x + crop.w, right:0, height: crop.h, background:'rgba(0,0,0,0.55)', pointerEvents:'none' }} />

              {/* Crop box */}
              <div
                onMouseDown={e => startDrag(e, 'move')}
                onTouchStart={e => startDrag(e, 'move')}
                style={{
                  position: 'absolute', left: crop.x, top: crop.y, width: crop.w, height: crop.h,
                  border: '2px solid rgba(255,255,255,0.9)',
                  cursor: 'move', boxSizing: 'border-box',
                  borderRadius: circular ? '50%' : 4,
                }}
              >
                {/* Rule-of-thirds grid lines */}
                {!circular && <>
                  <div style={{ position:'absolute', top:'33.3%', left:0, right:0, height:1, background:'rgba(255,255,255,0.25)', pointerEvents:'none' }} />
                  <div style={{ position:'absolute', top:'66.6%', left:0, right:0, height:1, background:'rgba(255,255,255,0.25)', pointerEvents:'none' }} />
                  <div style={{ position:'absolute', left:'33.3%', top:0, bottom:0, width:1, background:'rgba(255,255,255,0.25)', pointerEvents:'none' }} />
                  <div style={{ position:'absolute', left:'66.6%', top:0, bottom:0, width:1, background:'rgba(255,255,255,0.25)', pointerEvents:'none' }} />
                </>}

                {/* Corner resize handles */}
                {corners.map(({ dir, cursor, ...pos }) => (
                  <div
                    key={dir}
                    onMouseDown={e => { e.stopPropagation(); startDrag(e, dir) }}
                    onTouchStart={e => { e.stopPropagation(); startDrag(e, dir) }}
                    style={{
                      position: 'absolute', width: 14, height: 14,
                      background: '#fff', borderRadius: 3, cursor,
                      ...pos,
                    }}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Hint */}
        <div style={{ padding: '8px 20px 0', fontSize: 12, color: C.muted, textAlign: 'center' }}>
          Arrasta o quadrado para mover · arrastar os cantos para redimensionar
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 20px', display: 'flex', gap: 10, justifyContent: 'flex-end',
                      borderTop: `1px solid ${C.border}` }}>
          <button type="button" onClick={onCancel}
            style={{ background: 'transparent', border: `1px solid rgba(255,255,255,0.12)`,
                     borderRadius: 8, padding: '9px 20px', color: C.muted,
                     fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            Cancelar
          </button>
          <button type="button" onClick={handleConfirm}
            style={{ background: 'var(--color-text)', border: 'none',
                     borderRadius: 8, padding: '9px 22px', color: 'var(--color-bg)',
                     fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                     boxShadow: '0 4px 16px var(--color-surface-hover)' }}>
            Recortar
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
