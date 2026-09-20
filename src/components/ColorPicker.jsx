import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { hexToHsv, hsvToHex, isValidHex } from '../lib/color'
import { PipetteIcon as Eyedropper } from '@solar-icons/react/bold/pipette'
import { GalleryIcon as ImageIcon } from '@solar-icons/react/bold/gallery'
import { CloseIcon as X } from '@solar-icons/react/bold/close'
import './ColorPicker.css'

/* Seletor de cor próprio — substitui o <input type="color"> nativo do
   browser (feio, inconsistente entre browsers, difícil de conter numa
   bolinha). Quadrado de saturação/brilho + barra de matiz + hex, tudo
   desenhado com gradientes CSS, sem dependências.
   `imageUrl` (opcional): dá acesso a "escolher da capa" via canvas — a
   única forma de apanhar uma cor da própria imagem em Safari/Firefox,
   que não têm a EyeDropper API nativa (só Chrome/Edge têm). */
export default function ColorPicker({ value, onChange, onClose, onEyedropperStart, onEyedropperEnd, imageUrl, anchorRef }) {
  // No desktop, o picker sempre se posicionou por herança de
  // `position:relative` no botão que o abre (position:absolute; top:
  // calc(100% + 8px)). Agora que o picker vai por portal para
  // document.body (para nunca ficar cortado por um antepassado com
  // transform), essa herança deixou de existir — sem isto, o picker
  // aparecia ancorado ao canto do documento em vez de ao botão, ou seja,
  // "não abria" (aparecia fora do ecrã visível). No mobile a folha fica
  // sempre centrada no ecrã por CSS, não precisa disto.
  const [anchorPos, setAnchorPos] = useState(null)
  useEffect(() => {
    if (!anchorRef?.current || window.innerWidth <= 600) return
    const r = anchorRef.current.getBoundingClientRect()
    const CPK_WIDTH = 200
    const MARGIN = 12
    // Encostado à esquerda do botão (r.left) transbordava para fora do
    // ecrã sempre que o botão estava perto da margem direita — a maioria
    // dos casos aqui, já que os swatches vivem na sidebar do workspace.
    // Clampar ao próprio viewport garante que fica sempre visível.
    const left = Math.min(r.left, window.innerWidth - CPK_WIDTH - MARGIN)
    setAnchorPos({ top: r.bottom + 8, left: Math.max(MARGIN, left) })
  }, [anchorRef])
  const start = hexToHsv(value || '#2563eb')
  const [h, setH] = useState(start.h)
  const [s, setS] = useState(start.s)
  const [v, setV] = useState(start.v)
  const [hexInput, setHexInput] = useState((value || '#2563eb').replace('#', '').toUpperCase())

  const sqRef = useRef(null)
  const hueRef = useRef(null)
  const rootRef = useRef(null)
  const dragging = useRef(null)
  const canvasPickerOpenRef = useRef(false)

  useEffect(() => {
    setHexInput((value || hsvToHex(h, s, v)).replace('#', '').toUpperCase())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    function onDocDown(e) {
      // O popup do canvas (escolher da capa) é um irmão do picker
      // principal, não um filho — sem isto, qualquer toque nele (incluindo
      // a própria imagem, a apanhar a cor) contava como "clique fora" e
      // fechava tudo antes do clique chegar a ser processado. Enquanto
      // estiver aberto, ele já tem os seus próprios fechos (X, fundo).
      if (canvasPickerOpenRef.current) return
      if (rootRef.current && !rootRef.current.contains(e.target)) onClose?.()
    }
    document.addEventListener('pointerdown', onDocDown)
    return () => document.removeEventListener('pointerdown', onDocDown)
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
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
  }
  function onMove(e) {
    if (dragging.current === 'square') pickFromSquare(e.clientX, e.clientY)
    else if (dragging.current === 'hue') pickFromHue(e.clientX)
  }
  function onUp() {
    dragging.current = null
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onUp)
    window.removeEventListener('pointercancel', onUp)
  }

  // EyeDropper API (Chrome/Edge) — deixa escolher uma cor de qualquer
  // pixel do ecrã, incluindo a capa do próprio projeto por trás do
  // picker. onEyedropperStart/End dão ao chamador a hipótese de afastar
  // o resto da UI (ex: compactar o workspace) enquanto se apanta a cor.
  async function pickFromScreen() {
    if (!window.EyeDropper) return
    onEyedropperStart?.()
    // Dá tempo ao React para desmontar este picker e compactar o
    // workspace antes de tirar a "foto" do ecrã — sem isto, o
    // EyeDropper apanhava a cor do próprio picker, não da página.
    await new Promise(r => setTimeout(r, 120))
    try {
      const ed = new window.EyeDropper()
      const result = await ed.open()
      if (result?.sRGBHex) {
        const hex = result.sRGBHex.toUpperCase()
        const hsv = hexToHsv(hex)
        setH(hsv.h); setS(hsv.s); setV(hsv.v)
        setHexInput(hex.replace('#', ''))
        onChange(hex)
      }
    } catch {
      /* utilizador cancelou (Esc) — nada a fazer */
    } finally {
      onEyedropperEnd?.()
    }
  }

  // Fallback universal (funciona em qualquer browser, Safari incluído):
  // desenha a capa do projeto num canvas escondido e deixa tocar/clicar
  // em cima da imagem visível para ler a cor desse pixel exato.
  const [canvasPickerOpen, setCanvasPickerOpen] = useState(false)
  const [canvasError, setCanvasError] = useState(false)
  const canvasRef = useRef(null)
  const imgElRef = useRef(null)
  useEffect(() => { canvasPickerOpenRef.current = canvasPickerOpen }, [canvasPickerOpen])

  // Ao contrário do fluxo nativo (que precisa de esconder este picker
  // para a "foto" do ecrã não o apanhar a ele próprio), o popup do
  // canvas mostra a sua própria imagem — não precisa nem quer que o
  // pai desmonte este componente. onEyedropperStart/End ficam de fora
  // de propósito aqui.
  function openCanvasPicker() {
    setCanvasError(false)
    setCanvasPickerOpen(true)
  }
  function closeCanvasPicker() {
    setCanvasPickerOpen(false)
  }
  function handleImgLoad() {
    const img = imgElRef.current
    const canvas = canvasRef.current
    if (!img || !canvas) return
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    try {
      canvas.getContext('2d').drawImage(img, 0, 0)
    } catch {
      setCanvasError(true)
    }
  }
  function pickFromImage(e) {
    const canvas = canvasRef.current
    if (!canvas) return
    const r = canvas.getBoundingClientRect()
    const x = Math.round(((e.clientX - r.left) / r.width) * canvas.width)
    const y = Math.round(((e.clientY - r.top) / r.height) * canvas.height)
    try {
      const [red, green, blue] = canvas.getContext('2d').getImageData(x, y, 1, 1).data
      const hex = '#' + [red, green, blue].map(n => n.toString(16).padStart(2, '0')).join('').toUpperCase()
      const hsv = hexToHsv(hex)
      setH(hsv.h); setS(hsv.s); setV(hsv.v)
      setHexInput(hex.replace('#', ''))
      onChange(hex)
      closeCanvasPicker()
    } catch {
      // Imagem de outra origem sem CORS liberado — o canvas fica
      // "manchado" e não deixa ler pixels. Avisa em vez de rebentar.
      setCanvasError(true)
    }
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

  return createPortal(
    <>
    <div className="cpk-scrim" onPointerDown={onClose} aria-hidden="true" />
    <div
      className="cpk"
      ref={rootRef}
      role="dialog"
      aria-label="Escolher cor personalizada"
      style={anchorPos ? { position: 'fixed', top: anchorPos.top, left: anchorPos.left } : undefined}
    >
      <div
        className="cpk-square"
        ref={sqRef}
        style={{ backgroundImage: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, ${hueColor})` }}
        onPointerDown={e => startDrag('square', e)}
      >
        <div className="cpk-square-thumb" style={{ left: inset(s), top: inset(100 - v) }} />
      </div>

      <div className="cpk-hue" ref={hueRef} onPointerDown={e => startDrag('hue', e)}>
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
          autoCapitalize="characters"
          autoCorrect="off"
          inputMode="text"
          aria-label="Código hexadecimal"
        />
        {typeof window !== 'undefined' && window.EyeDropper && (
          <button
            type="button"
            className="cpk-eyedropper"
            onClick={pickFromScreen}
            title="Escolher cor do ecrã (ex: a capa do projeto)"
            aria-label="Escolher cor do ecrã"
          >
            <Eyedropper size={17} />
          </button>
        )}
        {/* Sem EyeDropper nativa (Safari, Firefox) mas há capa: oferece a
            mesma ideia via canvas — funciona em qualquer browser. */}
        {!(typeof window !== 'undefined' && window.EyeDropper) && imageUrl && (
          <button
            type="button"
            className="cpk-eyedropper"
            onClick={openCanvasPicker}
            title="Escolher cor da capa do projeto"
            aria-label="Escolher cor da capa do projeto"
          >
            <ImageIcon size={17} />
          </button>
        )}
      </div>
    </div>

    {canvasPickerOpen && (
      <div className="cpk-img-scrim" onPointerDown={e => { if (e.target === e.currentTarget) closeCanvasPicker() }}>
        <div className="cpk-img-panel">
          <div className="cpk-img-head">
            <span>Toca na imagem para escolher a cor</span>
            <button type="button" onClick={closeCanvasPicker} aria-label="Fechar"><X size={16} /></button>
          </div>
          {canvasError ? (
            <p className="cpk-img-error">Não foi possível ler esta imagem para escolher uma cor.</p>
          ) : (
            <canvas ref={canvasRef} className="cpk-img-canvas" onClick={pickFromImage} />
          )}
          {/* Imagem real invisível — só serve para carregar os pixels
              para o canvas; o que se vê e se toca é o canvas. */}
          <img
            ref={imgElRef}
            src={imageUrl}
            alt=""
            crossOrigin="anonymous"
            onLoad={handleImgLoad}
            onError={() => setCanvasError(true)}
            style={{ display: 'none' }}
          />
        </div>
      </div>
    )}
    </>,
    document.body
  )
}
