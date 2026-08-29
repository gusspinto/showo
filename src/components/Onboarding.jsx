import { useState, useEffect, useRef, useLayoutEffect } from 'react'
import { CloseIcon as X } from '@solar-icons/react/bold/close'
import { CursorIcon as MousePointer } from '@solar-icons/react/bold/cursor'
import { AddCircleIcon as Plus } from '@solar-icons/react/bold/add-circle'
import { CheckCircleIcon as Check } from '@solar-icons/react/bold/check-circle'
import './Onboarding.css'

const BEATS = [
  { key: 'click',      step: 'Criar projeto' },
  { key: 'fill',       step: 'IA preenche' },
  { key: 'visibility', step: 'Visibilidade' },
  { key: 'done',       step: 'Partilhar' },
]

const DWELL = [2200, 2000, 2200, 2400]

const FIELDS = [
  { label: 'Objetivo', pct: 78 },
  { label: 'Problema', pct: 55 },
  { label: 'Solução', pct: 88 },
]

function ClickBeat({ active }) {
  const wrapRef = useRef(null)
  const btnRef = useRef(null)
  const [target, setTarget] = useState({ x: 0, y: 0 })
  const [phase, setPhase] = useState('in')

  useLayoutEffect(() => {
    if (!wrapRef.current || !btnRef.current) return
    const c = wrapRef.current.getBoundingClientRect()
    const b = btnRef.current.getBoundingClientRect()
    setTarget({ x: b.left - c.left + b.width / 2 - 3, y: b.top - c.top + b.height / 2 - 3 })
  }, [active])

  useEffect(() => {
    if (!active) return
    setPhase('in')
    const t1 = setTimeout(() => setPhase('move'), 300)
    const t2 = setTimeout(() => setPhase('click'), 1000)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [active])

  const clicked = phase === 'click'

  return (
    <div ref={wrapRef} className="onb-click-wrap">
      <button ref={btnRef} className="onb-click-btn" style={{
        background: clicked ? '#1660d1' : 'var(--color-primary)',
        transform: clicked ? 'scale(0.94)' : 'scale(1)',
        boxShadow: phase === 'move' ? '0 0 0 4px var(--color-primary-subtle)' : '0 4px 14px var(--color-primary-subtle)',
      }}>
        <Plus size={16} strokeWidth={2.5} /> Criar projeto
      </button>

      <div className="onb-cursor" style={{
        left: phase === 'in' ? '88%' : target.x,
        top: phase === 'in' ? '-8%' : target.y,
        transform: clicked ? 'scale(0.8)' : 'scale(1)',
      }}>
        <MousePointer size={26} color="#fff" style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.5))' }} />
        {clicked && <span className="onb-ring" />}
      </div>
    </div>
  )
}

function FillBeat({ active }) {
  if (!active) return null
  return (
    <div className="onb-fill-wrap">
      <div className="onb-fill-header" style={{ animation: 'onb-fade 0.4s both' }}>
        <span className="onb-ai-badge">✦ IA</span>
        <div className="onb-fill-line" style={{ animation: 'onb-grow 0.6s 0.15s cubic-bezier(0.22,1,0.36,1) both' }} />
      </div>
      {FIELDS.map((f, i) => (
        <div key={f.label} className="onb-fill-row" style={{ animation: `onb-fade 0.4s ${0.35 + i * 0.28}s both` }}>
          <span className="onb-fill-label">{f.label}</span>
          <div className="onb-fill-track">
            <div className="onb-fill-bar" style={{ width: `${f.pct}%`, animation: `onb-grow 0.7s ${0.5 + i * 0.28}s cubic-bezier(0.22,1,0.36,1) both` }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function VisibilityBeat({ active }) {
  const [selected, setSelected] = useState('public')
  useEffect(() => {
    if (!active) { setSelected('public'); return }
    const t1 = setTimeout(() => setSelected('unlisted'), 700)
    const t2 = setTimeout(() => setSelected('public'), 1400)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [active])

  if (!active) return null
  const opts = [
    { value: 'public',   label: 'Público',     desc: 'Aparece no Explorar' },
    { value: 'unlisted', label: 'Só com link', desc: 'Apenas quem tiver o link' },
    { value: 'private',  label: 'Privado',     desc: 'Visível só para ti' },
  ]
  return (
    <div className="onb-fill-wrap" style={{ gap: 8 }}>
      {opts.map((o, i) => (
        <div key={o.value} className="onb-vis-row" style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 12px', borderRadius: 10,
          border: `1.5px solid ${selected === o.value ? 'var(--color-primary)' : 'var(--color-border)'}`,
          background: selected === o.value ? 'var(--color-primary-subtle)' : 'var(--color-bg-alt)',
          animation: `onb-fade 0.35s ${i * 0.12}s both`,
          transition: 'all 0.25s',
        }}>
          <div style={{
            width: 14, height: 14, borderRadius: '50%', flexShrink: 0,
            border: `2px solid ${selected === o.value ? 'var(--color-primary)' : 'var(--color-border)'}`,
            background: selected === o.value ? 'var(--color-primary)' : 'transparent',
            transition: 'all 0.25s',
          }} />
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text)' }}>{o.label}</div>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{o.desc}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

function DoneBeat({ active }) {
  const [score, setScore] = useState(0)
  useEffect(() => {
    if (!active) { setScore(0); return }
    const start = performance.now(), DUR = 850, TARGET = 88
    let raf
    const tick = now => {
      const t = Math.min(1, (now - start) / DUR)
      setScore(Math.round(TARGET * (1 - Math.pow(1 - t, 3))))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    const s = setTimeout(() => { raf = requestAnimationFrame(tick) }, 220)
    return () => { clearTimeout(s); cancelAnimationFrame(raf) }
  }, [active])

  if (!active) return null
  return (
    <div className="onb-done-wrap">
      <div className="onb-done-top" style={{ animation: 'onb-fade 0.4s both' }}>
        <div className="onb-done-ring" style={{ background: `conic-gradient(var(--color-success) ${score / 100 * 360}deg, var(--color-border) 0deg)` }}>
          <div className="onb-done-ring-inner">{score}</div>
        </div>
        <div style={{ minWidth: 0 }}>
          <div className="onb-done-title">Gestão de Horários</div>
          <div className="onb-done-sub">João Silva · DAM</div>
        </div>
      </div>
      <div className="onb-done-link" style={{ animation: 'onb-fade 0.4s 0.25s both' }}>
        <div className="onb-done-check">
          <Check size={12} color="var(--color-success)" strokeWidth={3} />
        </div>
        <span className="onb-done-url">
          showo.app/projeto/<span className="text-primary font-semibold">gestao-horarios</span>
        </span>
      </div>
    </div>
  )
}

export default function Onboarding({ onDone }) {
  const [beat, setBeat] = useState(0)
  const [visible, setVisible] = useState(false)
  const timer = useRef(null)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    timer.current = setTimeout(() => setBeat(b => (b + 1) % BEATS.length), DWELL[beat])
    return () => clearTimeout(timer.current)
  }, [beat])

  function close() {
    localStorage.setItem('showo_seen_onboarding', '1')
    setVisible(false)
    setTimeout(onDone, 280)
  }

  return (
    <>
      <div onClick={close} className="onb-overlay" style={{ opacity: visible ? 1 : 0 }} />

      <div className="onb-card" style={{
        transform: `translate(-50%, ${visible ? '-50%' : '-46%'})`,
        opacity: visible ? 1 : 0,
      }}>
        <div className="onb-titlebar">
          <div className="onb-dots">
            <span className="onb-dot red" />
            <span className="onb-dot yellow" />
            <span className="onb-dot green" />
          </div>
          <button onClick={close} aria-label="Saltar" className="icon-btn-ghost">
            <X size={16} />
          </button>
        </div>

        <div className="onb-stage">
          <div key={beat} className="onb-beat" style={{ height: '100%' }}>
            {beat === 0 && <ClickBeat active />}
            {beat === 1 && <FillBeat active />}
            {beat === 2 && <VisibilityBeat active />}
            {beat === 3 && <DoneBeat active />}
          </div>
        </div>

        <div className="onb-footer">
          <div className="onb-footer-dots">
            {BEATS.map((b, i) => (
              <button key={b.key} onClick={() => { clearTimeout(timer.current); setBeat(i) }}
                aria-label={b.step} className="onb-footer-dot"
                style={{ background: i === beat ? 'var(--color-primary)' : 'var(--color-border)' }} />
            ))}
          </div>
          <button onClick={close} className="onb-start-btn">Começar</button>
        </div>
      </div>
    </>
  )
}
