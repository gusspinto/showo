import { useState, useEffect, useRef, useLayoutEffect } from 'react'
import { X, MousePointer, Plus, Check } from 'lucide-react'

/* One self-building mock. The browser frame stays constant while the inner
   content morphs through three beats on a loop — click → AI fills → shareable
   page — so the whole concept reads visually, almost without text. */

const BEATS = [
  { key: 'click', step: 'Criar projeto' },
  { key: 'fill',  step: 'IA preenche' },
  { key: 'done',  step: 'Partilhar' },
]

// Per-beat dwell time (ms). Click is a touch longer to let the cursor land.
const DWELL = [2200, 2000, 2400]

const FIELDS = [
  { label: 'Objetivo', pct: 78 },
  { label: 'Problema', pct: 55 },
  { label: 'Solução', pct: 88 },
]

/* Cursor that flies in and clicks the create button. Target is measured live
   off the real button so it always lands dead-on. */
function ClickBeat({ active }) {
  const wrapRef = useRef(null)
  const btnRef = useRef(null)
  const [target, setTarget] = useState({ x: 0, y: 0 })
  const [phase, setPhase] = useState('in') // in -> move -> click

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
    <div ref={wrapRef} style={{ position: 'relative', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <button ref={btnRef} style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: clicked ? '#1660d1' : '#1b78f7',
        border: 'none', borderRadius: 10, padding: '13px 22px',
        fontSize: 15, fontWeight: 700, color: '#fff', fontFamily: 'inherit',
        transform: clicked ? 'scale(0.94)' : 'scale(1)',
        boxShadow: phase === 'move' ? '0 0 0 4px rgba(27,120,247,0.2)' : '0 4px 14px rgba(27,120,247,0.35)',
        transition: 'transform 0.15s, background 0.15s, box-shadow 0.3s',
        pointerEvents: 'none',
      }}>
        <Plus size={16} strokeWidth={2.5} /> Criar projeto
      </button>

      <div style={{
        position: 'absolute',
        left: phase === 'in' ? '88%' : target.x,
        top: phase === 'in' ? '-8%' : target.y,
        transition: 'left 0.65s cubic-bezier(0.34,1.4,0.64,1), top 0.65s cubic-bezier(0.34,1.4,0.64,1), transform 0.15s',
        transform: clicked ? 'scale(0.8)' : 'scale(1)',
        pointerEvents: 'none',
      }}>
        <MousePointer size={26} color="#fff" fill="#111" strokeWidth={1.5} style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.5))' }} />
        {clicked && <span className="onb-ring" />}
      </div>
    </div>
  )
}

/* AI writing the project — a title line types in, fields fill with growing bars. */
function FillBeat({ active }) {
  if (!active) return null
  return (
    <div style={{ padding: '4px 4px', display: 'flex', flexDirection: 'column', gap: 13, height: '100%', justifyContent: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, animation: 'onb-fade 0.4s both' }}>
        <span className="onb-ai-badge">✦ IA</span>
        <div style={{ height: 9, borderRadius: 5, background: 'var(--c-border)', width: '52%',
          animation: 'onb-grow 0.6s 0.15s cubic-bezier(0.22,1,0.36,1) both' }} />
      </div>
      {FIELDS.map((f, i) => (
        <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: 11,
          animation: `onb-fade 0.4s ${0.35 + i * 0.28}s both` }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#1b78f7', minWidth: 78, flexShrink: 0 }}>{f.label}</span>
          <div style={{ flex: 1, height: 7, background: 'var(--c-border)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', background: '#1b78f7', borderRadius: 4, width: `${f.pct}%`,
              animation: `onb-grow 0.7s ${0.5 + i * 0.28}s cubic-bezier(0.22,1,0.36,1) both` }} />
          </div>
        </div>
      ))}
    </div>
  )
}

/* Finished page — score ring counts up, share link with a green check. */
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%', justifyContent: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 13, animation: 'onb-fade 0.4s both' }}>
        <div style={{
          background: `conic-gradient(#22c55e ${score / 100 * 360}deg, var(--c-border) 0deg)`,
          borderRadius: '50%', width: 48, height: 48, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ background: 'var(--c-card)', borderRadius: '50%', width: 37, height: 37, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: '#22c55e' }}>{score}</div>
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--c-text)' }}>Gestão de Horários</div>
          <div style={{ fontSize: 12, color: 'var(--c-muted)' }}>João Silva · DAM</div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, background: 'var(--c-bg)', border: '1px solid var(--c-border)',
        borderRadius: 9, padding: '10px 13px', animation: 'onb-fade 0.4s 0.25s both' }}>
        <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(34,197,94,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Check size={12} color="#22c55e" strokeWidth={3} />
        </div>
        <span style={{ fontSize: 12.5, color: 'var(--c-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          showo.app/projeto/<span style={{ color: '#1b78f7', fontWeight: 600 }}>gestao-horarios</span>
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
      <style>{`
        @keyframes onb-fade { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes onb-grow { from { width: 0 !important; } }
        @keyframes onb-beat-in { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
        @keyframes onb-ring { from { box-shadow: 0 0 0 0 rgba(27,120,247,0.4); } to { box-shadow: 0 0 0 14px rgba(27,120,247,0); } }
        .onb-ring { position: absolute; top: 3px; left: 3px; width: 18px; height: 18px; border-radius: 50%; animation: onb-ring 0.55s ease-out; pointer-events: none; }
        .onb-ai-badge { font-size: 10.5px; font-weight: 800; letter-spacing: 0.02em; color: #1b78f7; background: rgba(27,120,247,0.1); border-radius: 5px; padding: 3px 7px; flex-shrink: 0; }
        .onb-beat { animation: onb-beat-in 0.35s cubic-bezier(0.16,1,0.3,1) both; }
        @media (max-width: 560px) {
          .onb-card { width: calc(100% - 32px) !important; max-width: 360px !important; }
          .onb-stage { height: 200px !important; padding: 16px !important; }
        }
        @media (max-width: 390px) {
          .onb-card { width: calc(100% - 24px) !important; }
          .onb-stage { height: 180px !important; padding: 14px !important; }
        }
      `}</style>

      <div onClick={close} style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)',
        opacity: visible ? 1 : 0, transition: 'opacity 0.28s',
      }} />

      {/* The whole popup IS the browser window — no outer card chrome. */}
      <div className="onb-card" style={{
        position: 'fixed', zIndex: 10001, top: '50%', left: '50%',
        transform: `translate(-50%, ${visible ? '-50%' : '-46%'})`,
        opacity: visible ? 1 : 0, transition: 'opacity 0.28s, transform 0.28s',
        width: 'calc(100% - 40px)', maxWidth: 440,
        background: 'var(--c-card)', border: '1px solid var(--c-border)',
        borderRadius: 14, overflow: 'hidden',
        boxShadow: '0 24px 60px rgba(0,0,0,0.45)', fontFamily: 'inherit',
      }}>
        {/* Title bar — mac dots left, close right */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '9px 10px 9px 14px', borderBottom: '1px solid var(--c-border)', background: 'var(--c-bg-alt)',
        }}>
          <div style={{ display: 'flex', gap: 7 }}>
            <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#ff5f57' }} />
            <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#febc2e' }} />
            <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#28c840' }} />
          </div>
          <button onClick={close} aria-label="Saltar" className="icon-btn-ghost">
            <X size={16} />
          </button>
        </div>

        {/* Stage — the morphing animation */}
        <div className="onb-stage" style={{ height: 240, padding: '24px', background: 'var(--c-card)' }}>
          <div key={beat} className="onb-beat" style={{ height: '100%' }}>
            {beat === 0 && <ClickBeat active />}
            {beat === 1 && <FillBeat active />}
            {beat === 2 && <DoneBeat active />}
          </div>
        </div>

        {/* Footer bar inside the window — progress + start */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 16,
          padding: '12px 14px', borderTop: '1px solid var(--c-border)', background: 'var(--c-bg-alt)',
        }}>
          <div style={{ display: 'flex', gap: 6, flex: 1 }}>
            {BEATS.map((b, i) => (
              <button key={b.key} onClick={() => { clearTimeout(timer.current); setBeat(i) }} aria-label={b.step} style={{
                flex: 1, height: 3, borderRadius: 2, padding: 0, border: 'none', cursor: 'pointer',
                background: i <= beat ? '#1b78f7' : 'var(--c-border)', transition: 'background 0.3s',
              }} />
            ))}
          </div>
          <button onClick={close} style={{
            background: '#1b78f7', border: 'none', borderRadius: 9,
            padding: '9px 20px', fontSize: 13, fontWeight: 700, color: '#fff', fontFamily: 'inherit', cursor: 'pointer',
            flexShrink: 0, transition: 'background 0.15s',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = '#1660d1' }}
            onMouseLeave={e => { e.currentTarget.style.background = '#1b78f7' }}
          >
            Começar
          </button>
        </div>
      </div>
    </>
  )
}
