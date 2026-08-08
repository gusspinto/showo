import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, StickyNote, Lightbulb, Star, Trash2,
  ZoomIn, ZoomOut, RotateCcw, Plus,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import './DiaryCanvas.css'

const CARD_TYPES = {
  note:      { label: 'Nota',     w: 220, h: 160, color: '#0f1623' },
  idea:      { label: 'Ideia',    w: 220, h: 160, color: '#0d1733' },
  highlight: { label: 'Destaque', w: 260, h: 120, color: '#1a1200' },
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

  const containerRef = useRef(null)
  const worldRef     = useRef(null)
  const transform    = useRef({ x: 0, y: 0, scale: 1 })
  const itemsRef     = useRef([])
  const dragState    = useRef(null)
  const pinchRef     = useRef(null)
  const activePtr    = useRef(new Map())
  const saveTimers   = useRef({})
  const zoomLabelRef = useRef(null)

  useEffect(() => { itemsRef.current = items }, [items])

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

  // Load project title font
  useEffect(() => {
    const font = project?.preview_style?.titleFont
    if (!font || font === 'Inter') return
    const id = `gf-${font.replace(/\s+/g, '-').toLowerCase()}`
    if (document.getElementById(id)) return
    const link = document.createElement('link')
    link.id = id; link.rel = 'stylesheet'
    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(font)}:wght@400;700;900&display=swap`
    document.head.appendChild(link)
  }, [project])

  // ── Wheel zoom ───────────────────────────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onWheel = e => {
      e.preventDefault()
      zoomAt(e.clientX, e.clientY, e.deltaY < 0 ? 1 + ZOOM_F : 1 / (1 + ZOOM_F))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  // ── Unified pointer handler ───────────────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    function onDown(e) {
      if (e.button > 0 && e.pointerType === 'mouse') return
      activePtr.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

      // Pinch — 2 active touch pointers
      if (activePtr.current.size >= 2) {
        const pts = [...activePtr.current.values()]
        const d = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y)
        pinchRef.current = {
          startDist: d, startScale: transform.current.scale,
          startTx: transform.current.x, startTy: transform.current.y,
          midX: (pts[0].x + pts[1].x) / 2, midY: (pts[0].y + pts[1].y) / 2,
        }
        dragState.current = null
        return
      }

      if (pinchRef.current) return

      // Resize handle
      const resizeEl = e.target.closest('[data-resize-for]')
      if (resizeEl) {
        const id = resizeEl.dataset.resizeFor
        const item = itemsRef.current.find(it => it.id === id)
        if (item) {
          const pos = s2c(e.clientX, e.clientY)
          dragState.current = { type: 'resize', id, startX: pos.x, startY: pos.y, origW: item.w, origH: item.h }
        }
        return
      }

      // Card — but not textarea/button
      const cardEl = e.target.closest('[data-card-id]')
      if (cardEl && !e.target.closest('textarea') && !e.target.closest('button')) {
        const id = cardEl.dataset.cardId
        const item = itemsRef.current.find(it => it.id === id)
        if (item) {
          const pos = s2c(e.clientX, e.clientY)
          dragState.current = { type: 'card', id, offsetX: pos.x - item.x, offsetY: pos.y - item.y }
          setSelectedId(id)
        }
        return
      }

      // Background → pan
      if (!e.target.closest('[data-card-id]') && !e.target.closest('button')) {
        setSelectedId(null)
        dragState.current = {
          type: 'pan',
          startX: e.clientX, startY: e.clientY,
          origX: transform.current.x, origY: transform.current.y,
        }
      }
    }

    function onMove(e) {
      activePtr.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

      // Pinch zoom
      if (pinchRef.current && activePtr.current.size >= 2) {
        const pts = [...activePtr.current.values()]
        const d = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y)
        const ns = Math.min(MAX_SCALE, Math.max(MIN_SCALE, pinchRef.current.startScale * d / pinchRef.current.startDist))
        const rect = el.getBoundingClientRect()
        const px = pinchRef.current.midX - rect.left, py = pinchRef.current.midY - rect.top
        const wx = (px - pinchRef.current.startTx) / pinchRef.current.startScale
        const wy = (py - pinchRef.current.startTy) / pinchRef.current.startScale
        transform.current = { scale: ns, x: px - wx * ns, y: py - wy * ns }
        applyTransform()
        return
      }

      const ds = dragState.current
      if (!ds) return

      if (ds.type === 'pan') {
        transform.current = {
          ...transform.current,
          x: ds.origX + e.clientX - ds.startX,
          y: ds.origY + e.clientY - ds.startY,
        }
        applyTransform()
        return
      }

      if (ds.type === 'card') {
        const pos = s2c(e.clientX, e.clientY)
        const cardEl = document.querySelector(`[data-card-id="${ds.id}"]`)
        if (cardEl) {
          cardEl.style.left = `${pos.x - ds.offsetX}px`
          cardEl.style.top  = `${pos.y - ds.offsetY}px`
        }
        return
      }

      if (ds.type === 'resize') {
        const pos = s2c(e.clientX, e.clientY)
        const nw = Math.max(140, ds.origW + pos.x - ds.startX)
        const nh = Math.max(80,  ds.origH + pos.y - ds.startY)
        const cardEl = document.querySelector(`[data-card-id="${ds.id}"]`)
        if (cardEl) { cardEl.style.width = `${nw}px`; cardEl.style.height = `${nh}px` }
      }
    }

    function onUp(e) {
      const ds = dragState.current

      if (ds?.type === 'card') {
        const pos = s2c(e.clientX, e.clientY)
        const nx = pos.x - ds.offsetX, ny = pos.y - ds.offsetY
        setItems(prev => prev.map(it => it.id === ds.id ? { ...it, x: nx, y: ny } : it))
        scheduleSave(ds.id)
      }

      if (ds?.type === 'resize') {
        const pos = s2c(e.clientX, e.clientY)
        const nw = Math.max(140, ds.origW + pos.x - ds.startX)
        const nh = Math.max(80,  ds.origH + pos.y - ds.startY)
        setItems(prev => prev.map(it => it.id === ds.id ? { ...it, w: nw, h: nh } : it))
        scheduleSave(ds.id)
      }

      activePtr.current.delete(e.pointerId)
      if (activePtr.current.size < 2) pinchRef.current = null
      dragState.current = null
    }

    el.addEventListener('pointerdown', onDown)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      el.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [])

  // ── CRUD ─────────────────────────────────────────────────────────────────
  async function addItem(type) {
    if (!project || !user) return
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
  }

  function updateContent(id, content) {
    setItems(prev => prev.map(it => it.id === id ? { ...it, content } : it))
    scheduleSave(id)
  }

  function scheduleSave(id) {
    clearTimeout(saveTimers.current[id])
    saveTimers.current[id] = setTimeout(() => {
      const item = itemsRef.current.find(it => it.id === id)
      if (!item) return
      supabase.from('diary_canvas_items').update({
        x: item.x, y: item.y, w: item.w, h: item.h, content: item.content,
      }).eq('id', id)
    }, 800)
  }

  // ── Render ───────────────────────────────────────────────────────────────
  if (loading) return <div className="dc-loading"><div className="dc-loading-spin" /></div>
  if (!project) return null

  const titleFont = project.preview_style?.titleFont

  return (
    <div className="dc-root">
      {/* Toolbar */}
      <div className="dc-toolbar">
        <button className="dc-tb-back" onClick={() => navigate(`/projeto/${slug}`)} title="Voltar ao projeto">
          <ArrowLeft size={16} />
        </button>

        <div className="dc-tb-title" style={titleFont ? { fontFamily: `'${titleFont}', var(--font-heading)` } : undefined}>
          Diário · <span className="dc-tb-project-name">{project.name}</span>
        </div>

        <div className="dc-tb-divider" />

        <div className="dc-tb-add-group">
          <button className="dc-add dc-add--note"      onClick={() => addItem('note')}      title="Adicionar nota">
            <StickyNote size={13} /><span>Nota</span>
          </button>
          <button className="dc-add dc-add--idea"      onClick={() => addItem('idea')}      title="Adicionar ideia">
            <Lightbulb size={13} /><span>Ideia</span>
          </button>
          <button className="dc-add dc-add--highlight" onClick={() => addItem('highlight')} title="Adicionar destaque">
            <Star size={13} /><span>Destaque</span>
          </button>
        </div>

        <div className="dc-tb-divider" />

        <div className="dc-zoom-group">
          <button className="dc-zoom-btn" title="Reduzir"
            onClick={() => zoomAt(window.innerWidth / 2, window.innerHeight / 2, 1 / (1 + ZOOM_F))}>
            <ZoomOut size={14} />
          </button>
          <span ref={zoomLabelRef} className="dc-zoom-label">100%</span>
          <button className="dc-zoom-btn" title="Aumentar"
            onClick={() => zoomAt(window.innerWidth / 2, window.innerHeight / 2, 1 + ZOOM_F)}>
            <ZoomIn size={14} />
          </button>
          <button className="dc-zoom-btn" title="Repor"
            onClick={() => { transform.current = { x: 0, y: 0, scale: 1 }; applyTransform() }}>
            <RotateCcw size={13} />
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div ref={containerRef} className="dc-container" style={{ touchAction: 'none' }}>
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
              >
                <div className="dc-card-header">
                  <span className="dc-card-type-label">{def.label}</span>
                  <button
                    className="dc-card-del"
                    onPointerDown={e => e.stopPropagation()}
                    onClick={e => { e.stopPropagation(); deleteItem(item.id) }}
                    title="Eliminar card"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
                <textarea
                  className="dc-card-body"
                  value={item.content}
                  placeholder="Escreve aqui..."
                  onChange={e => updateContent(item.id, e.target.value)}
                  onPointerDown={e => e.stopPropagation()}
                  onClick={e => { e.stopPropagation(); setSelectedId(item.id) }}
                />
                <div
                  className="dc-resize"
                  data-resize-for={item.id}
                  onPointerDown={e => e.stopPropagation()}
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
    </div>
  )
}
