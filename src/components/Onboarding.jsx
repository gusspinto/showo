import { useState, useEffect, useRef, useLayoutEffect } from 'react'
import { X, MousePointer, Plus, Check, TrendingUp, Clock, Eye } from 'lucide-react'

/* ── Step 1: create-project cursor-click demo ──
   Cursor target is measured live off the real button via getBoundingClientRect,
   so it always lands exactly on the button regardless of card size/padding. */
function CreateDemo({ play, onDone }) {
  const [phase, setPhase] = useState('idle') // idle -> moving -> clicked -> created
  const containerRef = useRef(null)
  const btnRef = useRef(null)
  const [target, setTarget] = useState({ x: 0, y: 0 })

  useLayoutEffect(() => {
    if (!play || !containerRef.current || !btnRef.current) return
    const c = containerRef.current.getBoundingClientRect()
    const b = btnRef.current.getBoundingClientRect()
    setTarget({ x: b.left - c.left + b.width / 2 - 4, y: b.top - c.top + b.height / 2 - 4 })
  }, [play])

  useEffect(() => {
    if (!play) return
    const timers = []
    setPhase('appear')
    timers.push(setTimeout(() => setPhase('moving'), 350))
    timers.push(setTimeout(() => setPhase('clicked'), 1050))
    timers.push(setTimeout(() => setPhase('created'), 1280))
    timers.push(setTimeout(onDone, 2400))
    return () => timers.forEach(clearTimeout)
  }, [play])

  return (
    <div ref={containerRef} className="onb-demo-create" style={{ marginTop: 22, position: 'relative', height: 118 }}>
      <div className="onb-demo-create-row" style={{
        background: 'var(--c-bg)', border: '1px solid var(--c-border)', borderRadius: 10,
        padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        animation: 'guide-fade-up 0.4s both',
      }}>
        <span style={{ fontSize: 13, color: 'var(--c-muted)', fontWeight: 600 }}>Os meus projetos</span>
        <div ref={btnRef} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          background: phase === 'clicked' ? '#1660d1' : '#1b78f7',
          borderRadius: 7, padding: '9px 16px',
          fontSize: 13, fontWeight: 700, color: '#fff',
          transform: phase === 'clicked' ? 'scale(0.92)' : 'scale(1)',
          boxShadow: phase === 'moving' ? '0 0 0 3px rgba(27,120,247,0.18)' : 'none',
          transition: 'transform 0.15s, background 0.15s, box-shadow 0.3s',
        }}>
          <Plus size={14} /> Criar projeto
        </div>
      </div>

      {phase === 'created' && (
        <div className="guide-pop" style={{
          position: 'absolute', left: 0, right: 0, top: 76,
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)',
          borderRadius: 8, padding: '10px 14px',
        }}>
          <Check size={14} color="#22c55e" />
          <span style={{ fontSize: 13, fontWeight: 600, color: '#22c55e' }}>Projeto criado</span>
        </div>
      )}

      <div style={{
        position: 'absolute',
        left: phase === 'idle' || phase === 'appear' ? '92%' : target.x,
        top: phase === 'idle' || phase === 'appear' ? -30 : target.y,
        transition: 'left 0.6s cubic-bezier(0.34,1.56,0.64,1), top 0.6s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s',
        opacity: play && phase !== 'idle' ? 1 : 0,
        transform: phase === 'clicked' ? 'scale(0.78)' : 'scale(1)',
        pointerEvents: 'none',
      }}>
        <MousePointer size={24} color="#fff" fill="#111" strokeWidth={1.5} style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }} />
        {phase === 'clicked' && <span className="guide-click-ring" />}
      </div>
    </div>
  )
}

/* ── Step 2: AI auto-fill demo ── */
function FillDemo({ play, onDone }) {
  const FIELDS = [
    { label: 'Objetivo', pct: 72 },
    { label: 'Problema', pct: 58 },
    { label: 'Solução', pct: 85 },
    { label: 'Tecnologias', pct: 64 },
  ]
  const STAGGER = 0.28
  useEffect(() => {
    if (!play) return
    const t = setTimeout(onDone, (FIELDS.length - 1) * STAGGER * 1000 + 1100)
    return () => clearTimeout(t)
  }, [play])

  if (!play) return <div style={{ marginTop: 22, height: 4 + FIELDS.length * 40 }} />

  return (
    <div className="onb-demo-fill" style={{ marginTop: 22, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {FIELDS.map((f, i) => (
        <div key={f.label} className="onb-demo-fill-row" style={{
          background: 'var(--c-bg)', border: '1px solid var(--c-border)',
          borderRadius: 8, padding: '10px 14px',
          display: 'flex', alignItems: 'center', gap: 12,
          animation: `guide-fade-up 0.45s ${i * STAGGER}s both`,
        }}>
          <span className="onb-demo-fill-label" style={{ fontSize: 12.5, color: '#1b78f7', fontWeight: 700, minWidth: 90, flexShrink: 0 }}>{f.label}</span>
          <div style={{ flex: 1, height: 6, background: 'var(--c-border)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{
              height: '100%', background: '#1b78f7',
              borderRadius: 3, width: `${f.pct}%`,
              animation: `guide-bar-grow 0.7s ${i * STAGGER + 0.2}s cubic-bezier(0.22,1,0.36,1) both`,
            }} />
          </div>
        </div>
      ))}
    </div>
  )
}

/* ── Step 3: final — page preview + community stats ── */
function StatsPreview() {
  const STATS = [
    { Icon: TrendingUp, value: '3×', label: 'mais visibilidade' },
    { Icon: Clock, value: '<2 min', label: 'para criar' },
    { Icon: Eye, value: '92', label: 'score médio' },
  ]
  const [score, setScore] = useState(0)

  useEffect(() => {
    const start = performance.now()
    const DURATION = 900
    const TARGET = 85
    let raf
    function tick(now) {
      const t = Math.min(1, (now - start) / DURATION)
      setScore(Math.round(TARGET * (1 - Math.pow(1 - t, 3)))) // ease-out cubic
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    const startTimer = setTimeout(() => { raf = requestAnimationFrame(tick) }, 250)
    return () => { clearTimeout(startTimer); cancelAnimationFrame(raf) }
  }, [])

  return (
    <div style={{ marginTop: 22 }}>
      <div style={{ background: 'var(--c-bg)', border: '1px solid var(--c-border)', borderRadius: 12, overflow: 'hidden', animation: 'guide-fade-up 0.45s both' }}>
        <div style={{ background: 'linear-gradient(135deg, rgba(27,120,247,0.14), rgba(79,70,229,0.08))', padding: '16px 18px' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--c-text)', marginBottom: 3 }}>Gestão de Horários</div>
          <div style={{ fontSize: 12, color: 'var(--c-muted)' }}>João Silva · Desenvolvimento de Aplicações</div>
        </div>
        <div style={{ padding: '13px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            background: `conic-gradient(#22c55e ${score / 100 * 360}deg, var(--c-border) 0deg)`,
            borderRadius: '50%', width: 34, height: 34, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.05s linear',
          }}>
            <div style={{ background: 'var(--c-bg)', borderRadius: '50%', width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9.5, fontWeight: 800, color: '#22c55e' }}>{score}</div>
          </div>
          <div style={{ flex: 1, fontSize: 12, color: 'var(--c-muted)' }}>
            showo.app/projeto/<span style={{ color: '#1b78f7' }}>gestao-horarios</span>
          </div>
        </div>
      </div>

      <div className="onb-demo-stats-row" style={{ display: 'flex', gap: 10, marginTop: 12 }}>
        {STATS.map((stat, i) => (
          <div key={stat.label} className="onb-demo-stat" style={{
            flex: 1, textAlign: 'center', background: 'var(--c-bg)', border: '1px solid var(--c-border)',
            borderRadius: 10, padding: '12px 6px',
            animation: `guide-fade-up 0.4s ${0.3 + i * 0.12}s both`,
          }}>
            <stat.Icon size={15} color="#1b78f7" style={{ marginBottom: 5 }} />
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--c-text)', fontFamily: 'var(--font-heading)' }}>{stat.value}</div>
            <div style={{ fontSize: 10.5, color: 'var(--c-muted)', marginTop: 1 }}>{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

const STEPS = [
  { key: 'create', title: 'Cria o teu primeiro projeto', desc: 'Começa o teu portfólio com um único clique.', Demo: CreateDemo, interactive: true },
  { key: 'fill',   title: 'A IA trata do resto', desc: 'Objetivo, problema, solução e tecnologias preenchidos automaticamente.', Demo: FillDemo, interactive: true },
  { key: 'page',   title: 'Uma página que abre portas', desc: 'Design profissional, score automático e link único para partilhares.', Demo: StatsPreview, interactive: false },
]

const STEP_DURATION = 5000

export default function Onboarding({ onDone }) {
  const [step, setStep] = useState(0)
  const [visible, setVisible] = useState(false)
  const advanceTimer = useRef(null)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100)
    return () => clearTimeout(t)
  }, [])

  // Auto-advance every step on a fixed cadence — plays the step's demo immediately
  // and moves to the next one after STEP_DURATION regardless of demo length, looping forever.
  useEffect(() => {
    advanceTimer.current = setTimeout(() => {
      setStep(s => (s + 1) % STEPS.length)
    }, STEP_DURATION)
    return () => clearTimeout(advanceTimer.current)
  }, [step])

  function handleDone() {
    localStorage.setItem('showo_seen_onboarding', '1')
    setVisible(false)
    setTimeout(onDone, 300)
  }

  function goToStep(i) {
    clearTimeout(advanceTimer.current)
    setStep(i)
  }

  const s = STEPS[step]
  const Demo = s.Demo

  return (
    <>
      <style>{`
        @keyframes guide-fade-up { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes guide-bar-grow { from { width: 0%; } }
        @keyframes guide-step-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes guide-click-ring { from { box-shadow: 0 0 0 0 rgba(0,0,0,0.35); } to { box-shadow: 0 0 0 12px rgba(0,0,0,0); } }
        @keyframes guide-pop-in { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes guide-progress { from { width: 0%; } to { width: 100%; } }
        .guide-click-ring { position: absolute; top: 0; left: 0; width: 20px; height: 20px; border-radius: 50%; animation: guide-click-ring 0.5s ease-out; pointer-events: none; }
        .guide-pop { animation: guide-pop-in 0.25s ease-out both; }
        .guide-step-content { animation: guide-step-in 0.3s cubic-bezier(0.16,1,0.3,1) both; }

        @media (max-width: 600px) {
          .onb-card { width: calc(100% - 20px) !important; max-height: 85vh !important; border-radius: 14px !important; }
          .onb-rail { width: 34px !important; padding: 20px 0 !important; }
          .onb-content { padding: 18px 14px 16px !important; }
          .onb-step-label { font-size: 10px !important; }
          .onb-title { font-size: 16px !important; }
          .onb-desc { font-size: 12px !important; }
          .onb-demo-create { height: auto !important; min-height: 100px !important; }
          .onb-demo-create-row { padding: 12px 14px !important; }
          .onb-demo-fill-row { padding: 8px 10px !important; gap: 8px !important; }
          .onb-demo-fill-label { min-width: 64px !important; font-size: 11px !important; }
          .onb-demo-stats-row { gap: 6px !important; }
          .onb-demo-stat { padding: 10px 4px !important; }
        }
        @media (max-width: 380px) {
          .onb-rail { display: none !important; }
        }
      `}</style>

      {/* Backdrop */}
      <div
        onClick={handleDone}
        style={{
          position: 'fixed', inset: 0, zIndex: 10000,
          background: 'rgba(0,0,0,0.45)',
          backdropFilter: 'blur(2px)',
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.3s',
        }}
      />

      {/* Card */}
      <div className="onb-card" style={{
        position: 'fixed', zIndex: 10001,
        top: '50%', left: '50%',
        transform: `translate(-50%, ${visible ? '-50%' : '-46%'})`,
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.3s, transform 0.3s',
        width: 'calc(100% - 40px)', maxWidth: 600,
        maxHeight: '90vh', overflowY: 'auto', overflowX: 'hidden',
        background: 'var(--c-card)',
        border: '1px solid var(--c-border)',
        borderRadius: 18,
        boxShadow: '0 12px 32px rgba(0,0,0,0.3)',
        fontFamily: 'inherit',
        display: 'flex',
      }}>

        {/* Left rail — minimal vertical step tracker, acts as progress + nav */}
        <div className="onb-rail" style={{
          width: 48, flexShrink: 0, background: 'var(--c-bg-alt)',
          borderRight: '1px solid var(--c-border)',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          padding: '34px 0', gap: 0,
        }}>
          {STEPS.map((st, i) => (
            <div key={st.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 'none' }}>
              <button
                onClick={() => goToStep(i)}
                aria-label={`Passo ${i + 1}`}
                style={{
                  width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                  border: `1px solid ${i <= step ? '#1b78f7' : 'var(--c-border)'}`,
                  background: i <= step ? '#1b78f7' : 'transparent',
                  boxShadow: i === step ? '0 0 0 3px rgba(27,120,247,0.18)' : 'none',
                  padding: 0, cursor: 'pointer',
                  transition: 'all 0.25s',
                }}
              />
              {i < STEPS.length - 1 && (
                <div style={{ width: 1, flex: 1, minHeight: 28, marginTop: 6, background: i < step ? '#1b78f7' : 'var(--c-border)', transition: 'background 0.3s' }} />
              )}
            </div>
          ))}
        </div>

        {/* Right — content */}
        <div className="onb-content" style={{ flex: 1, padding: '28px 30px 26px', minWidth: 0 }}>
          {/* Header row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <span className="onb-step-label" style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--c-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Guia rápido · {step + 1}/{STEPS.length}
            </span>
            <button
              onClick={handleDone}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                background: 'transparent', border: 'none',
                color: 'var(--c-muted)', cursor: 'pointer',
                fontSize: 13, fontFamily: 'inherit', padding: '4px 2px',
                transition: 'color 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--c-text)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--c-muted)' }}
            >
              <X size={15} />
              <span>Saltar</span>
            </button>
          </div>

          {/* Content — keyed by step so it animates in fresh each time */}
          <div key={step} className="guide-step-content">
            <h2 className="onb-title" style={{ margin: '0 0 5px', fontSize: 20, fontWeight: 400, fontFamily: 'var(--font-heading)', color: 'var(--c-text)', letterSpacing: '-0.3px' }}>
              {s.title}
            </h2>
            <p className="onb-desc" style={{ margin: 0, fontSize: 13.5, color: 'var(--c-muted)', lineHeight: 1.6 }}>
              {s.desc}
            </p>

            <Demo play={true} onDone={() => {}} />
          </div>

          {/* Auto-advance progress bar — fills over STEP_DURATION, resets each step. Kept subtle on purpose. */}
          <div key={`bar-${step}`} style={{ marginTop: 24, height: 2, background: 'transparent', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', background: 'var(--c-border)', borderRadius: 2, animation: `guide-progress ${STEP_DURATION}ms linear forwards` }} />
          </div>
        </div>
      </div>
    </>
  )
}
