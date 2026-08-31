import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeftIcon as ArrowLeft } from '@solar-icons/react/bold/arrow-left'
import { NotebookMinimalisticIcon as StickyNote } from '@solar-icons/react/bold/notebook-minimalistic'
import { LightbulbIcon as Lightbulb } from '@solar-icons/react/bold/lightbulb'
import { StarIcon as Star } from '@solar-icons/react/bold/star'
import { TrashBinMinimalisticIcon as Trash2 } from '@solar-icons/react/bold/trash-bin-minimalistic'
import { MagnifierZoomInIcon as ZoomIn } from '@solar-icons/react/bold/magnifier-zoom-in'
import { MagnifierZoomOutIcon as ZoomOut } from '@solar-icons/react/bold/magnifier-zoom-out'
import { RestartIcon as RotateCcw } from '@solar-icons/react/bold/restart'
import { PlusIcon as Plus } from '../components/icons/PlusIcon'
import { UndoLeftIcon as Undo2 } from '@solar-icons/react/bold/undo-left'
import { RefreshIcon as Redo2 } from '@solar-icons/react/bold/refresh'
import { DisketteIcon as Save } from '@solar-icons/react/bold/diskette'
import { CheckCircleIcon as Check } from '@solar-icons/react/bold/check-circle'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import './DiaryCanvas.css'

const CARD_TYPES = {
  note:      { label: 'Nota',     w: 220, h: 160, color: '#0f1623' },
  idea:      { label: 'Ideia',    w: 220, h: 160, color: '#0d1733' },
  highlight: { label: 'Destaque', w: 260, h: 120, color: '#1a1200' },
}

const KIND_LABELS = {
  progresso: 'Progresso', dificuldade: 'Dificuldade', decisao: 'Decisão',
  pesquisa: 'Pesquisa', ideia: 'Ideia', resultado: 'Resultado',
  nota: 'Nota', aprendizagem: 'Aprendizagem', conquista: 'Conquista',
}

/* Map the key stored in previewStyle to the actual CSS font-family string */
const TITLE_FONT_MAP = {
  croogla:  { css: 'Croogla, sans-serif',            gfName: null },
  syne:     { css: 'Syne, sans-serif',               gfName: 'Syne' },
  playfair: { css: '"Playfair Display", serif',       gfName: 'Playfair+Display' },
  space:    { css: '"Space Grotesk", sans-serif',     gfName: 'Space+Grotesk' },
  fredoka:  { css: '"Fredoka One", cursive',          gfName: 'Fredoka+One' },
  inter:    { css: 'Inter, sans-serif',               gfName: null },
}

const MIN_SCALE = 0.12
const MAX_SCALE = 4
const ZOOM_F    = 0.12

export default function DiaryCanvas() {
  const { slug } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [project,    setProject]    = useState(null)
  const [items,      setItems]      = useState([])
  const [loading,    setLoading]    = useState(true)
  const [selectedId, setSelectedId] = useState(null)
  const [showAddMenu, setShowAddMenu] = useState(false)

  const containerRef = useRef(null)
  const worldRef     = useRef(null)
  const transform    = useRef({ x: 0, y: 0, scale: 1 })
  const itemsRef     = useRef([])
  const pinchRef     = useRef(null)
  const activePtrs   = useRef(new Map())
  const saveTimers   = useRef({})
  const zoomLabelRef = useRef(null)
  const dirtyRef     = useRef(new Set())
  const historyRef   = useRef([])   // [{id,x,y,w,h}[]]
  const histIdxRef   = useRef(-1)
  const [histIdx, setHistIdx] = useState(-1) // mirror for button enable/disable
  const [saveState, setSaveState] = useState('idle') // 'idle'|'saving'|'saved'

  // font size state: { [itemId]: 'sm'|'md'|'lg' }
  const [fontSizes, setFontSizes] = useState({})

  useEffect(() => { itemsRef.current = items }, [items])

  // Centre view on content after initial load
  useEffect(() => {
    if (loading || !containerRef.current) return
    const its = itemsRef.current
    if (its.length === 0) return
    const minX = Math.min(...its.map(r => r.x))
    const minY = Math.min(...its.map(r => r.y))
    const maxX = Math.max(...its.map(r => r.x + r.w))
    const maxY = Math.max(...its.map(r => r.y + r.h))
    const cW = maxX - minX, cH = maxY - minY
    const rect = containerRef.current.getBoundingClientRect()
    const scale = Math.min(1, Math.min((rect.width - 80) / cW, (rect.height - 80) / cH))
    transform.current = {
      scale,
      x: (rect.width  - cW * scale) / 2 - minX * scale,
      y: (rect.height - cH * scale) / 2 - minY * scale,
    }
    applyTransform()
  }, [loading])

  // ── Transform helpers ────────────────────────────────────────────────────
  function applyTransform() {
    const { x, y, scale } = transform.current
    if (worldRef.current)
      worldRef.current.style.transform = `translate(${x}px, ${y}px) scale(${scale})`
    if (zoomLabelRef.current)
      zoomLabelRef.current.textContent = `${Math.round(scale * 100)}%`
  }

  function s2c(sx, sy) {
    const rect = containerRef.current.getBoundingClientRect()
    const { x, y, scale } = transform.current
    return { x: (sx - rect.left - x) / scale, y: (sy - rect.top - y) / scale }
  }

  function zoomAt(cx, cy, factor) {
    const t = transform.current
    const ns = Math.min(MAX_SCALE, Math.max(MIN_SCALE, t.scale * factor))
    if (ns === t.scale) return
    const rect = containerRef.current.getBoundingClientRect()
    const px = cx - rect.left, py = cy - rect.top
    const wx = (px - t.x) / t.scale, wy = (py - t.y) / t.scale
    transform.current = { scale: ns, x: px - wx * ns, y: py - wy * ns }
    applyTransform()
  }

  function resetZoom() {
    transform.current = { x: 0, y: 0, scale: 1 }
    applyTransform()
  }

  // ── Load ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user || !slug) return
    let cancelled = false

    ;(async () => {
      const { data: proj } = await supabase
        .from('projects').select('id, name, preview_style, user_id')
        .eq('slug', slug).single()

      if (cancelled || !proj) { setLoading(false); return }
      if (proj.user_id !== user.id) {
        navigate(`/projeto/${slug}`, { replace: true }); return
      }

      setProject(proj)

      const { data: rows } = await supabase
        .from('diary_canvas_items').select('*')
        .eq('project_id', proj.id).eq('user_id', user.id)
        .order('created_at', { ascending: true })

      if (!cancelled) { setItems(rows || []); setLoading(false) }
    })()

    return () => { cancelled = true }
  }, [slug, user])

  // Load title font from Google Fonts
  useEffect(() => {
    const key = project?.preview_style?.titleFont
    if (!key) return
    const font = TITLE_FONT_MAP[key]
    if (!font?.gfName) return
    const id = `gf-${key}`
    if (document.getElementById(id)) return
    const link = document.createElement('link')
    link.id = id; link.rel = 'stylesheet'
    link.href = `https://fonts.googleapis.com/css2?family=${font.gfName}:wght@400;700;900&display=swap`
    document.head.appendChild(link)
  }, [project])

  // Auto-save all dirty items on unmount / page unload
  useEffect(() => {
    function flushAll() {
      Object.keys(saveTimers.current).forEach(id => clearTimeout(saveTimers.current[id]))
      dirtyRef.current.forEach(id => {
        const item = itemsRef.current.find(it => it.id === id)
        if (!item) return
        supabase.from('diary_canvas_items').update({
          x: item.x, y: item.y, w: item.w, h: item.h, content: item.content,
        }).eq('id', id)
      })
    }
    window.addEventListener('beforeunload', flushAll)
    return () => { flushAll(); window.removeEventListener('beforeunload', flushAll) }
  }, [])

  // ── History helpers ───────────────────────────────────────────────────────
  function pushHistory() {
    const snap = itemsRef.current.map(({ id, x, y, w, h }) => ({ id, x, y, w, h }))
    historyRef.current = historyRef.current.slice(0, histIdxRef.current + 1)
    historyRef.current.push(snap)
    if (historyRef.current.length > 60) historyRef.current.shift()
    histIdxRef.current = historyRef.current.length - 1
    setHistIdx(histIdxRef.current)
  }

  function applyHistorySnap(snap) {
    setItems(prev => prev.map(it => {
      const s = snap.find(s => s.id === it.id)
      return s ? { ...it, x: s.x, y: s.y, w: s.w, h: s.h } : it
    }))
    snap.forEach(s => scheduleSave(s.id))
    snap.forEach(s => {
      const el = worldRef.current?.querySelector(`[data-card-id="${s.id}"]`)
      if (el) { el.style.left = `${s.x}px`; el.style.top = `${s.y}px`; el.style.width = `${s.w}px`; el.style.height = `${s.h}px` }
    })
    setHistIdx(histIdxRef.current)
  }

  function doUndo() {
    if (histIdxRef.current <= 0) return
    histIdxRef.current--
    applyHistorySnap(historyRef.current[histIdxRef.current])
  }

  function doRedo() {
    if (histIdxRef.current >= historyRef.current.length - 1) return
    histIdxRef.current++
    applyHistorySnap(historyRef.current[histIdxRef.current])
  }

  // ── Manual save ───────────────────────────────────────────────────────────
  async function saveAll() {
    setSaveState('saving')
    Object.keys(saveTimers.current).forEach(id => clearTimeout(saveTimers.current[id]))
    await Promise.all(
      itemsRef.current.map(item =>
        supabase.from('diary_canvas_items').update({
          x: item.x, y: item.y, w: item.w, h: item.h, content: item.content,
        }).eq('id', item.id)
      )
    )
    dirtyRef.current.clear()
    setSaveState('saved')
    setTimeout(() => setSaveState('idle'), 2000)
  }

  // ── Keyboard: undo/redo + deselect ───────────────────────────────────────
  useEffect(() => {
    if (loading) return
    function onKey(e) {
      const z = e.key === 'z' || e.key === 'Z'
      const y = e.key === 'y' || e.key === 'Y'
      if ((e.ctrlKey || e.metaKey) && z && !e.shiftKey) {
        e.preventDefault(); doUndo()
      }
      if ((e.ctrlKey || e.metaKey) && (y || (z && e.shiftKey))) {
        e.preventDefault(); doRedo()
      }
      if (e.key === 'Escape') setSelectedId(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [loading])

  // ── Wheel: scroll = pan, Ctrl+scroll = zoom ───────────────────────────────
  useEffect(() => {
    if (loading) return
    const el = containerRef.current
    if (!el) return
    const onWheel = e => {
      e.preventDefault()
      if (e.ctrlKey || e.metaKey) {
        zoomAt(e.clientX, e.clientY, e.deltaY < 0 ? 1 + ZOOM_F : 1 / (1 + ZOOM_F))
      } else {
        transform.current = {
          ...transform.current,
          x: transform.current.x - (e.shiftKey ? e.deltaY : e.deltaX),
          y: transform.current.y - (e.shiftKey ? 0 : e.deltaY),
        }
        applyTransform()
      }
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    // Block Chrome browser zoom globally while diary is mounted
    const blockBrowserZoom = e => { if (e.ctrlKey || e.metaKey) e.preventDefault() }
    window.addEventListener('wheel', blockBrowserZoom, { passive: false })
    return () => {
      el.removeEventListener('wheel', onWheel)
      window.removeEventListener('wheel', blockBrowserZoom)
    }
  }, [loading])

  // ── Card drag ─────────────────────────────────────────────────────────────
  function startCardDrag(e, item) {
    if (e.button !== 0 && e.pointerType === 'mouse') return
    e.preventDefault()
    e.stopPropagation()
    setSelectedId(item.id)
    pushHistory()
    const pos = s2c(e.clientX, e.clientY)
    const ox = pos.x - item.x
    const oy = pos.y - item.y
    const id = item.id

    function onMove(mv) {
      const p = s2c(mv.clientX, mv.clientY)
      const el = worldRef.current?.querySelector(`[data-card-id="${id}"]`)
      if (el) { el.style.left = `${p.x - ox}px`; el.style.top = `${p.y - oy}px` }
    }
    function onUp(uv) {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      const p = s2c(uv.clientX, uv.clientY)
      const nx = p.x - ox, ny = p.y - oy
      setItems(prev => prev.map(it => it.id === id ? { ...it, x: nx, y: ny } : it))
      scheduleSave(id)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
  }

  // ── Resize ────────────────────────────────────────────────────────────────
  function startResize(e, item) {
    if (e.button !== 0 && e.pointerType === 'mouse') return
    e.preventDefault()
    e.stopPropagation()
    pushHistory()
    const pos = s2c(e.clientX, e.clientY)
    const startX = pos.x, startY = pos.y
    const origW = item.w, origH = item.h
    const id = item.id

    function onMove(mv) {
      const p = s2c(mv.clientX, mv.clientY)
      const nw = Math.max(140, origW + p.x - startX)
      const nh = Math.max(80,  origH + p.y - startY)
      const el = worldRef.current?.querySelector(`[data-card-id="${id}"]`)
      if (el) { el.style.width = `${nw}px`; el.style.height = `${nh}px` }
    }
    function onUp(uv) {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      const p = s2c(uv.clientX, uv.clientY)
      const nw = Math.max(140, origW + p.x - startX)
      const nh = Math.max(80,  origH + p.y - startY)
      setItems(prev => prev.map(it => it.id === id ? { ...it, w: nw, h: nh } : it))
      scheduleSave(id)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
  }

  // ── Font size ─────────────────────────────────────────────────────────────
  const FONT_SIZES = { sm: 11, md: 13, lg: 16 }
  const FONT_CYCLE = ['sm', 'md', 'lg']
  function cycleFontSize(id) {
    setFontSizes(prev => {
      const cur = prev[id] || 'md'
      const next = FONT_CYCLE[(FONT_CYCLE.indexOf(cur) + 1) % FONT_CYCLE.length]
      return { ...prev, [id]: next }
    })
  }

  // ── Canvas pan + pinch ───────────────────────────────────────────────────
  function onContainerPointerDown(e) {
    if (e.target.closest('[data-card-id]') || e.target.closest('button')) return
    if (e.button !== 0 && e.pointerType === 'mouse') return
    e.preventDefault()
    setSelectedId(null)
    setShowAddMenu(false)

    activePtrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    if (activePtrs.current.size >= 2) {
      const pts = [...activePtrs.current.values()]
      const d = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y)
      pinchRef.current = {
        startDist: d, startScale: transform.current.scale,
        startTx: transform.current.x, startTy: transform.current.y,
        midX: (pts[0].x + pts[1].x) / 2, midY: (pts[0].y + pts[1].y) / 2,
      }
      return
    }

    // Delta-based pan: track last position so pinch→single-finger doesn't jump
    let lastX = e.clientX, lastY = e.clientY

    function onMove(mv) {
      activePtrs.current.set(mv.pointerId, { x: mv.clientX, y: mv.clientY })

      if (pinchRef.current && activePtrs.current.size >= 2) {
        const pts = [...activePtrs.current.values()]
        const d = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y)
        const el = containerRef.current
        const ns = Math.min(MAX_SCALE, Math.max(MIN_SCALE,
          pinchRef.current.startScale * d / pinchRef.current.startDist))
        const px = pinchRef.current.midX - (el?.getBoundingClientRect().left ?? 0)
        const py = pinchRef.current.midY - (el?.getBoundingClientRect().top  ?? 0)
        const wx = (px - pinchRef.current.startTx) / pinchRef.current.startScale
        const wy = (py - pinchRef.current.startTy) / pinchRef.current.startScale
        transform.current = { scale: ns, x: px - wx * ns, y: py - wy * ns }
        applyTransform()
        lastX = mv.clientX; lastY = mv.clientY
        return
      }

      transform.current = {
        ...transform.current,
        x: transform.current.x + mv.clientX - lastX,
        y: transform.current.y + mv.clientY - lastY,
      }
      lastX = mv.clientX; lastY = mv.clientY
      applyTransform()
    }

    function onUp(uv) {
      activePtrs.current.delete(uv.pointerId)
      if (activePtrs.current.size < 2) pinchRef.current = null
      // When dropping from 2→1 finger, reset lastX/Y to remaining pointer
      // so next move doesn't compute a wrong delta
      if (activePtrs.current.size === 1) {
        const rem = [...activePtrs.current.values()][0]
        lastX = rem.x; lastY = rem.y
      }
      if (activePtrs.current.size === 0) {
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
        window.removeEventListener('pointercancel', onUp)
      }
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
  }

  // ── CRUD ─────────────────────────────────────────────────────────────────
  async function addItem(type) {
    if (!project || !user) return
    setShowAddMenu(false)
    const def = CARD_TYPES[type]
    const rect = containerRef.current.getBoundingClientRect()
    const pos = s2c(rect.left + rect.width / 2, rect.top + rect.height / 2)
    const x = pos.x - def.w / 2 + (Math.random() - 0.5) * 60
    const y = pos.y - def.h / 2 + (Math.random() - 0.5) * 60

    const { data } = await supabase
      .from('diary_canvas_items')
      .insert({ project_id: project.id, user_id: user.id, type, x, y, w: def.w, h: def.h, content: '', color: def.color, pinned: false })
      .select().single()

    if (data) { setItems(prev => [...prev, data]); setSelectedId(data.id) }
  }

  async function deleteItem(id) {
    await supabase.from('diary_canvas_items').delete().eq('id', id)
    setItems(prev => prev.filter(it => it.id !== id))
    if (selectedId === id) setSelectedId(null)
    dirtyRef.current.delete(id)
  }

  function updateContent(id, content) {
    setItems(prev => prev.map(it => it.id === id ? { ...it, content } : it))
    scheduleSave(id)
  }

  function scheduleSave(id) {
    dirtyRef.current.add(id)
    clearTimeout(saveTimers.current[id])
    saveTimers.current[id] = setTimeout(() => {
      const item = itemsRef.current.find(it => it.id === id)
      if (!item) return
      supabase.from('diary_canvas_items').update({
        x: item.x, y: item.y, w: item.w, h: item.h, content: item.content,
      }).eq('id', id).then(() => dirtyRef.current.delete(id))
    }, 800)
  }

  // ── Render ───────────────────────────────────────────────────────────────
  if (loading) return <div className="dc-loading"><div className="dc-loading-spin" /></div>
  if (!project) return null

  const fontKey = project.preview_style?.titleFont
  const titleFontCss = fontKey ? (TITLE_FONT_MAP[fontKey]?.css || 'var(--font-heading)') : 'var(--font-heading)'

  return (
    <div className="dc-root">
      {/* Toolbar */}
      <div className="dc-toolbar">
        {/* Left: back */}
        <button className="dc-tb-back" onClick={() => navigate(`/projeto/${slug}`)} title="Voltar ao projeto">
          <ArrowLeft size={15} />
          <span>Voltar</span>
        </button>

        {/* Center: logo + project name */}
        <div className="dc-tb-center">
          <img src="/icon.png" alt="Showo" className="dc-logo" />
          <div className="dc-tb-title" style={{ fontFamily: titleFontCss }}>
            <span className="dc-tb-project-name">{project.name}</span>
          </div>
        </div>

        {/* Right: undo/redo + save */}
        <div style={{ flex: 1 }} />
        <div className="dc-tb-actions">
          <button
            className="dc-tb-action-btn"
            onClick={doUndo}
            disabled={histIdx <= 0}
            title="Desfazer (Ctrl+Z)"
          >
            <Undo2 size={15} />
          </button>
          <button
            className="dc-tb-action-btn"
            onClick={doRedo}
            disabled={histIdx >= historyRef.current.length - 1}
            title="Refazer (Ctrl+Y)"
          >
            <Redo2 size={15} />
          </button>
          <div className="dc-tb-divider" />
          <button
            className={`dc-tb-save-btn${saveState === 'saved' ? ' is-saved' : ''}`}
            onClick={saveAll}
            disabled={saveState === 'saving'}
            title="Guardar"
          >
            {saveState === 'saved' ? <Check size={14} /> : <Save size={14} />}
            <span>{saveState === 'saving' ? 'A guardar…' : saveState === 'saved' ? 'Guardado' : 'Guardar'}</span>
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className="dc-container"
        style={{ touchAction: 'none' }}
        onPointerDown={onContainerPointerDown}
      >
        <div ref={worldRef} className="dc-world">
          {items.map(item => {
            const def = CARD_TYPES[item.type] || CARD_TYPES.note
            const sel = selectedId === item.id
            return (
              <div
                key={item.id}
                data-card-id={item.id}
                className={`dc-card dc-card--${item.type}${sel ? ' dc-card--sel' : ''}`}
                style={{ left: item.x, top: item.y, width: item.w, height: item.h }}
                onClick={() => setSelectedId(item.id)}
              >
                <div
                  className="dc-card-header"
                  onPointerDown={e => startCardDrag(e, item)}
                >
                  <span className="dc-card-type-label">{(item.source_kind && KIND_LABELS[item.source_kind]) || def.label}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <button
                      className="dc-card-del"
                      onPointerDown={e => e.stopPropagation()}
                      onClick={e => { e.stopPropagation(); cycleFontSize(item.id) }}
                      title="Tamanho do texto"
                      style={{ fontSize: 9, fontWeight: 700, width: 'auto', padding: '0 4px', letterSpacing: 0 }}
                    >
                      {(fontSizes[item.id] || 'md').toUpperCase()}
                    </button>
                    <button
                      className="dc-card-del"
                      onPointerDown={e => e.stopPropagation()}
                      onClick={e => { e.stopPropagation(); deleteItem(item.id) }}
                      title="Eliminar card"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
                <textarea
                  className="dc-card-body"
                  value={item.content}
                  placeholder="Escreve aqui..."
                  onChange={e => updateContent(item.id, e.target.value)}
                  onPointerDown={e => e.stopPropagation()}
                  style={{ fontSize: FONT_SIZES[fontSizes[item.id] || 'md'] }}
                />
                <div
                  className="dc-resize"
                  onPointerDown={e => startResize(e, item)}
                  title="Redimensionar"
                />
              </div>
            )
          })}
        </div>
      </div>

      {/* Empty state hint */}
      {items.length === 0 && !loading && (
        <div className="dc-empty">
          <Plus size={24} strokeWidth={1.5} />
          <p>Canvas em branco. Adiciona uma nota, ideia ou destaque.</p>
        </div>
      )}

      {/* Floating add buttons — bottom center */}
      <div className="dc-float-add">
        {showAddMenu && (
          <div className="dc-float-add-menu">
            <button className="dc-add dc-add--note" onClick={() => addItem('note')}>
              <StickyNote size={13} /><span>Nota</span>
            </button>
            <button className="dc-add dc-add--idea" onClick={() => addItem('idea')}>
              <Lightbulb size={13} /><span>Ideia</span>
            </button>
            <button className="dc-add dc-add--highlight" onClick={() => addItem('highlight')}>
              <Star size={13} /><span>Destaque</span>
            </button>
          </div>
        )}
        <button
          className={`dc-float-add-btn${showAddMenu ? ' is-open' : ''}`}
          onClick={() => setShowAddMenu(v => !v)}
          title="Adicionar"
        >
          <Plus size={20} />
        </button>
      </div>

      {/* Floating zoom — bottom right */}
      <div className="dc-float-zoom">
        <button className="dc-zoom-btn" title="Reduzir"
          onClick={() => zoomAt(window.innerWidth / 2, window.innerHeight / 2, 1 / (1 + ZOOM_F))}>
          <ZoomOut size={14} />
        </button>
        <span ref={zoomLabelRef} className="dc-zoom-label">100%</span>
        <button className="dc-zoom-btn" title="Aumentar"
          onClick={() => zoomAt(window.innerWidth / 2, window.innerHeight / 2, 1 + ZOOM_F)}>
          <ZoomIn size={14} />
        </button>
        <button className="dc-zoom-btn" title="Repor zoom" onClick={resetZoom}>
          <RotateCcw size={13} />
        </button>
      </div>
    </div>
  )
}
