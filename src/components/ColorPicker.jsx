import { useEffect, useRef, useState } from 'react'
import { hexToHsv, hsvToHex, isValidHex } from '../lib/color'
import './ColorPicker.css'

/* Seletor de cor próprio — substitui o <input type="color"> nativo do
   browser (feio, inconsistente entre browsers, difícil de conter numa
   bolinha). Quadrado de saturação/brilho + barra de matiz + hex, tudo
   desenhado com gradientes CSS, sem dependências. */
export default function ColorPicker({ value, onChange, onClose }) {
  const start = hexToHsv(value || '#2563eb')
  const [h, setH] = useState(start.h)
  const [s, setS] = useState(start.s)
  const [v, setV] = useState(start.v)
  const [hexInput, setHexInput] = useState((value || '#2563eb').replace('#', '').toUpperCase())

  const sqRef = useRef(null)
  const hueRef = useRef(null)
  const rootRef = useRef(null)
  const dragging = useRef(null)

  useEffect(() => {
    setHexInput((value || hsvToHex(h, s, v)).replace('#', '').toUpperCase())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    function onDocClick(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) onClose?.()
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [onClose])

  function commit(nh, ns, nv) {
    const hex = hsvToHex(nh, ns, nv)
    setHexInput(hex.replace('#', '').toUpperCase())
    onChange(hex)
  }

  function pickFromSquare(clientX, clientY) {
    const r = sqRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(1, (clientX - r.left) / r.width))
    const y = Math.max(0, Math.min(1, (clientY - r.top) / r.height))
    const ns = x * 100
    const nv = 100 - y * 100
    setS(ns); setV(nv)
    commit(h, ns, nv)
  }

  function pickFromHue(clientX) {
    const r = hueRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(1, (clientX - r.left) / r.width))
    const nh = x * 360
    setH(nh)
    commit(nh, s, v)
  }

  function startDrag(kind, e) {
    e.preventDefault()
    dragging.current = kind
    if (kind === 'square') pickFromSquare(e.clientX, e.clientY)
    else pickFromHue(e.clientX)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }
  function onMove(e) {
    if (dragging.current === 'square') pickFromSquare(e.clientX, e.clientY)
    else if (dragging.current === 'hue') pickFromHue(e.clientX)
  }
  function onUp() {
    dragging.current = null
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mouseup', onUp)
  }

  function onHexChange(e) {
    const raw = e.target.value.replace(/[^0-9a-f]/gi, '').slice(0, 6).toUpperCase()
    setHexInput(raw)
    if (isValidHex(raw)) {
      const hex = `#${raw}`
      const hsv = hexToHsv(hex)
      setH(hsv.h); setS(hsv.s); setV(hsv.v)
      onChange(hex)
    }
  }

  const hueColor = hsvToHex(h, 100, 100)
  // Mantém o thumb sempre inteiro dentro da área — sem isto encosta ao canto
  // e fica meio cortado por cima do fundo do painel.
  const inset = (pct, px = 7) => `calc(${pct}% + ${((50 - pct) / 50) * px}px)`

  return (
    <div className="cpk" ref={rootRef} role="dialog" aria-label="Escolher cor personalizada">
      <div
        className="cpk-square"
        ref={sqRef}
        style={{ backgroundImage: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, ${hueColor})` }}
        onMouseDown={e => startDrag('square', e)}
      >
        <div className="cpk-square-thumb" style={{ left: inset(s), top: inset(100 - v) }} />
      </div>

      <div className="cpk-hue" ref={hueRef} onMouseDown={e => startDrag('hue', e)}>
        <div className="cpk-hue-thumb" style={{ left: inset((h / 360) * 100) }} />
      </div>

      <div className="cpk-row">
        <span className="cpk-swatch" style={{ background: hsvToHex(h, s, v) }} />
        <span className="cpk-hash">#</span>
        <input
          className="cpk-hex"
          value={hexInput}
          onChange={onHexChange}
          maxLength={6}
          spellCheck={false}
          aria-label="Código hexadecimal"
        />
      </div>
    </div>
  )
}
