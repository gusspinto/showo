import { useState, useEffect, useRef, memo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Globe, Bot, GraduationCap, Trophy, Briefcase, ArrowRight, Zap } from 'lucide-react'
import { Navbar } from '../components/Navbar'
import { supabase } from '../lib/supabase'
import Onboarding from '../components/Onboarding'
import CreateProjectModal from '../components/CreateProjectModal'
import { looksLikeSpam } from '../lib/score'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'

const colors = {
  bg:           'var(--c-bg)',
  card:         'var(--c-card)',
  border:       'var(--c-border)',
  borderBright: 'var(--c-border-bright)',
  blue:         '#1b78f7',
  yellow:       '#fbbf24',
  green:        '#22c55e',
  text:         'var(--c-text)',
  muted:        'var(--c-muted)',
  subtle:       'var(--c-subtle)',
}

function StaticHero() {
  return (
    <h1 className="hero-h1 home-hero-heading" style={{
      fontSize: 'clamp(40px, 6.2vw, 72px)', fontWeight: 400,
      lineHeight: 1.12, margin: '0 auto 28px',
      letterSpacing: '-1px', maxWidth: 1100,
      fontFamily: 'var(--font-heading)',
      textAlign: 'center',
    }}>
      A tua carreira merece mais{' '}
      do que um <em style={{ fontStyle: 'italic', color: '#1b78f7', whiteSpace: 'nowrap' }}>CV vazio.</em>
    </h1>
  )
}

function MiniScoreRing({ score, size = 72 }) {
  const stroke = 6
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const dash = (score / 100) * circ
  const color = score >= 86 ? '#22c55e' : score >= 51 ? '#1b78f7' : '#f97316'
  return (
    <div style={{ position: 'relative', width: size, height: size, filter: `drop-shadow(0 0 5px ${color}70)` }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', display: 'block' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round" />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 18, fontWeight: 900, color, lineHeight: 1, letterSpacing: '-1px' }}>{score}</span>
        <span style={{ fontSize: 7, color: 'rgba(255,255,255,0.4)', fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 1 }}>score</span>
      </div>
    </div>
  )
}

const FeatureRow = memo(function FeatureRow({ reverse, tag, tagColor, title, desc, bullets, bulletColor, mockup }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 80,
      alignItems: 'center',
      marginBottom: 120,
    }} className="feature-row">
      {/* Text side */}
      <div style={{ order: reverse ? 2 : 1 }}>
        <span style={{
          display: 'inline-block',
          background: `${tagColor}18`,
          color: tagColor,
          border: `1px solid ${tagColor}30`,
          borderRadius: 6, padding: '4px 12px',
          fontSize: 11, fontWeight: 800, letterSpacing: '0.06em',
          textTransform: 'uppercase', marginBottom: 20,
        }}>{tag}</span>
        <h3 style={{
          fontSize: 'clamp(22px, 2.5vw, 32px)', fontWeight: 900,
          letterSpacing: '-0.8px', lineHeight: 1.15,
          margin: '0 0 16px', fontFamily: 'var(--font-heading)',
          color: 'var(--c-text)',
        }}>{title}</h3>
        <p style={{ fontSize: 16, color: 'var(--c-muted)', lineHeight: 1.7, margin: '0 0 24px' }}>{desc}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {bullets.map(b => (
            <div key={b} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: bulletColor, flexShrink: 0 }} />
              <span style={{ fontSize: 14, color: 'var(--c-muted)', fontWeight: 500 }}>{b}</span>
            </div>
          ))}
        </div>
      </div>
      {/* Mockup side */}
      <div style={{ order: reverse ? 1 : 2 }}>
        {mockup}
      </div>
    </div>
  )
})

const MOCKUP_COLORS = {
  dark:  { bg: '#0c1422', bgAlt: 'rgba(255,255,255,0.03)', border: 'rgba(255,255,255,0.08)', text: '#f1f5f9', muted: '#94a3b8' },
  light: { bg: '#ffffff', bgAlt: '#f4f6fa', border: '#e1e6ef', text: '#0f172a', muted: '#64748b' },
}

const MockupPortfolio = memo(function MockupPortfolio({ theme }) {
  const c = MOCKUP_COLORS[theme] ?? MOCKUP_COLORS.dark
  return (
    <div style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ height: 64, background: '#1b78f7', position: 'relative' }}>
        <div style={{ position: 'absolute', bottom: -16, left: 20, width: 34, height: 34, borderRadius: '50%', background: '#1b78f7', border: `3px solid ${c.bg}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#fff' }}>J</div>
      </div>
      <div style={{ padding: '22px 20px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontSize: 11, color: c.muted, fontWeight: 600 }}>PAP · Tecnologias de Informação</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#22c55e' }}>88 pts</span>
        </div>
        <div style={{ fontSize: 17, fontWeight: 400, color: c.text, letterSpacing: '-0.3px', fontFamily: 'var(--font-heading)', marginBottom: 4 }}>StockFlow Pro</div>
        <div style={{ fontSize: 12, color: c.muted, marginBottom: 14 }}>João Silva · Escola Profissional do Porto</div>
        <div style={{ borderTop: `1px solid ${c.border}`, paddingTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Globe size={12} color="#1b78f7" />
          <span style={{ fontSize: 11, color: '#1b78f7', fontWeight: 600, fontFamily: 'monospace' }}>showo.pt/p/stockflow-pro</span>
        </div>
      </div>
    </div>
  )
})

const MockupMissoes = memo(function MockupMissoes({ theme }) {
  const c = MOCKUP_COLORS[theme] ?? MOCKUP_COLORS.dark
  const missions = [
    { label: 'Descreve o problema', pts: '+8 pts', done: true },
    { label: 'Adiciona tecnologias', pts: '+5 pts', done: true },
    { label: 'Define o público-alvo', pts: '+8 pts', done: false },
    { label: 'Apresenta resultados', pts: '+10 pts', done: false },
  ]
  return (
    <div style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ padding: '18px 20px 14px', borderBottom: `1px solid ${c.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 400, color: c.text, fontFamily: 'var(--font-heading)' }}>As tuas missões</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#22c55e' }}>88 pts</span>
        </div>
        <div style={{ height: 3, background: c.bgAlt, borderRadius: 99 }}>
          <div style={{ width: '55%', height: '100%', background: '#22c55e', borderRadius: 99 }} />
        </div>
        <div style={{ fontSize: 10, color: c.muted, marginTop: 5 }}>2 de 4 missões completas</div>
      </div>
      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {missions.map(m => (
          <div key={m.label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 4px' }}>
            {m.done ? <Trophy size={13} color="#22c55e" /> : <Zap size={13} color="#1b78f7" />}
            <span style={{ flex: 1, fontSize: 12, color: m.done ? c.muted : c.text, fontWeight: m.done ? 400 : 600, textDecoration: m.done ? 'line-through' : 'none' }}>{m.label}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: m.done ? '#22c55e' : '#1b78f7' }}>{m.pts}</span>
          </div>
        ))}
      </div>
    </div>
  )
})

const MockupVagas = memo(function MockupVagas({ theme }) {
  const c = MOCKUP_COLORS[theme] ?? MOCKUP_COLORS.dark
  const vagas = [
    { empresa: 'Codilink', cargo: 'Estágio em Desenvolvimento Web', tipo: 'Presencial · Lisboa', nova: true },
    { empresa: 'DataVision', cargo: 'Junior Backend Developer', tipo: 'Remoto · Full-time', nova: false },
    { empresa: 'UXLab', cargo: 'Estágio em Design de Produto', tipo: 'Híbrido · Porto', nova: true },
  ]
  return (
    <div style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px 13px', borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 13, fontWeight: 400, color: c.text, fontFamily: 'var(--font-heading)' }}>Vagas para ti</span>
        <span style={{ fontSize: 11, color: '#f59e0b', fontWeight: 700 }}>3 novas</span>
      </div>
      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column' }}>
        {vagas.map((v, i) => (
          <div key={v.empresa} style={{ padding: '11px 4px', borderTop: i > 0 ? `1px solid ${c.border}` : 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
            <Briefcase size={14} color="#1b78f7" style={{ flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: c.text }}>{v.cargo}</span>
                {v.nova && <span style={{ fontSize: 10, fontWeight: 700, color: '#f59e0b' }}>· Nova</span>}
              </div>
              <span style={{ fontSize: 11, color: c.muted }}>{v.empresa} · {v.tipo}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
})

const MockupDefesa = memo(function MockupDefesa({ theme }) {
  const c = MOCKUP_COLORS[theme] ?? MOCKUP_COLORS.dark
  const perguntas = [
    'Qual foi o maior desafio técnico que enfrentaste?',
    'Como garantiste a qualidade do código produzido?',
    'Que tecnologias escolheste e porquê?',
  ]
  return (
    <div style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px 13px', borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
        <GraduationCap size={16} color="#7c3aed" />
        <span style={{ fontSize: 13, fontWeight: 400, color: c.text, fontFamily: 'var(--font-heading)' }}>Treino de defesa — PAP</span>
      </div>
      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: c.muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Perguntas prováveis do júri</div>
        {perguntas.map((p, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: '#7c3aed', flexShrink: 0, marginTop: 1 }}>{i + 1}.</span>
            <span style={{ fontSize: 12, color: c.text, lineHeight: 1.5 }}>{p}</span>
          </div>
        ))}
        <div style={{ borderTop: `1px solid ${c.border}`, paddingTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Bot size={13} color="#1b78f7" />
          <span style={{ fontSize: 11, color: '#1b78f7', fontWeight: 600 }}>IA a gerar respostas sugeridas...</span>
        </div>
      </div>
    </div>
  )
})

const QUICK_GOALS = [
  { id: 'pap',        label: 'PAP',              placeholder: 'Nome da tua PAP...' },
  { id: 'internship', label: 'Estágio',          placeholder: 'Nome do teu estágio...' },
  { id: 'group',      label: 'Trabalho de grupo', placeholder: 'Nome do teu trabalho de grupo...' },
  { id: 'personal',   label: 'Projeto pessoal',  placeholder: 'Nome do teu projeto pessoal...' },
]


export default function Home() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { theme } = useTheme()
  const [selectedGoal, setSelectedGoal] = useState(null)
  const [inputText, setInputText] = useState('')
  const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem('showo_seen_onboarding'))
  const [projectCount, setProjectCount] = useState(null)
  const [animatedCount, setAnimatedCount] = useState(0)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [spamError, setSpamError] = useState(false)
  const [featuresReady, setFeaturesReady] = useState(false)
  const featuresRef = useRef(null)
  const goalsRowRef = useRef(null)
  const pillRefs = useRef({})
  const prevGoalRef = useRef(null)
  const [pillHighlight, setPillHighlight] = useState({ left: 0, width: 0, top: 0, height: 0, opacity: 0, moving: false })

  useEffect(() => {
    const container = goalsRowRef.current
    const btn = selectedGoal ? pillRefs.current[selectedGoal] : null
    if (!container || !btn) {
      setPillHighlight(h => ({ ...h, opacity: 0, moving: false }))
      prevGoalRef.current = selectedGoal
      return
    }
    const cr = container.getBoundingClientRect()
    const br = btn.getBoundingClientRect()
    const cameFromAnotherGoal = !!prevGoalRef.current && prevGoalRef.current !== selectedGoal
    setPillHighlight({
      left: br.left - cr.left, width: br.width,
      top: br.top - cr.top, height: br.height,
      opacity: 1, moving: cameFromAnotherGoal,
    })
    prevGoalRef.current = selectedGoal
  }, [selectedGoal])

  useEffect(() => {
    const el = featuresRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setFeaturesReady(true); obs.disconnect() } },
      { rootMargin: '300px' }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    async function fetchCount() {
      const { count } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
      if (count != null) setProjectCount(count)
    }
    fetchCount()
  }, [])

  // Count-up animation — runs every time the count loads (every page load).
  useEffect(() => {
    if (projectCount == null) return
    let raf
    const duration = 1100
    const start = performance.now()
    function tick(now) {
      const progress = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setAnimatedCount(Math.round(eased * projectCount))
      if (progress < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [projectCount])

  function handleStart(e) {
    e.preventDefault()
    const text = inputText.trim()
    if (!text) return
    if (looksLikeSpam(text)) {
      setSpamError(true)
      return
    }
    setSpamError(false)
    navigate('/interview', {
      state: {
        type:        selectedGoal ?? 'personal',
        description: text,
      },
    })
  }

  const placeholder = selectedGoal
    ? QUICK_GOALS.find(g => g.id === selectedGoal)?.placeholder
    : 'Descreve o teu projeto em poucas palavras...'

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--c-bg)', color: 'var(--c-text)', fontFamily: 'var(--font-body)' }}>
      {showOnboarding && <Onboarding onDone={() => setShowOnboarding(false)} />}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.3; }
          50%       { opacity: 0.6; }
        }
        .goal-pill { transition: color 0.15s !important; cursor: pointer; display: inline-block; }
        .goal-pill:hover { color: #1b78f7 !important; }
        .feature-card { transition: all 0.2s ease !important; cursor: default; }
        .feature-card:hover {
          border-color: var(--c-border-bright) !important;
          transform: translateY(-3px) !important;
          box-shadow: 0 16px 48px rgba(0,0,0,0.25) !important;
          background: var(--c-card-hover) !important;
        }
        .submit-btn:hover { opacity: 0.7 !important; }
        .submit-btn { transition: opacity 0.15s !important; }
        body.light .widget-input { background: transparent !important; }
        .home-cta-btn { transition: all 0.15s !important; }
        .home-cta-btn:hover { opacity: 0.88 !important; }
        .home-sec-link { transition: color 0.15s !important; }
        .home-sec-link:hover { color: #1b78f7 !important; }

        .hero-mockup-col { display: block; }

        /* Tablet */
        @media (max-width: 960px) {
          .hero-mockup-col { display: none !important; }
          .features-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }

        @media (max-width: 600px) {
          .hero-section  { padding: 60px 0 60px !important; min-height: auto !important; }
          .hero-inner    { padding: 0 20px !important; }
          .hero-h1       { font-size: 34px !important; letter-spacing: -0.5px !important; margin-bottom: 16px !important; }
          .hero-sub      { font-size: 16px !important; }
          .hero-widget   { margin-top: 28px !important; max-width: 100% !important; }
          .goals-row     { flex-wrap: nowrap !important; overflow-x: auto !important; padding-bottom: 6px !important; scrollbar-width: none !important; -webkit-overflow-scrolling: touch !important; }
          .goals-row::-webkit-scrollbar { display: none !important; }
          .goal-pill     { font-size: 12px !important; flex-shrink: 0 !important; }
          .social-strip  { gap: 10px !important; font-size: 12px !important; justify-content: center !important; }
          .features-grid { grid-template-columns: 1fr !important; gap: 12px !important; }
          .feature-card  { padding: 20px 18px !important; }
          .hero-note     { font-size: 11px !important; }
          .home-features-grid { grid-template-columns: 1fr !important; gap: 12px !important; }
          .home-stats { flex-wrap: wrap !important; gap: 12px !important; justify-content: center !important; }
        }
        @media (max-width: 380px) {
          .home-hero-heading { font-size: clamp(28px, 8vw, 42px) !important; }
        }
      `}</style>

      <Navbar>
        <button
          onClick={() => setShowCreateModal(true)}
          style={{
            background: '#1b78f7',
            color: '#fff', border: 'none', borderRadius: 12,
            padding: '9px 20px', fontSize: 14, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'var(--font-body)',
            boxShadow: '0 4px 16px rgba(27,120,247,0.3)',
          }}
        >
          Criar projeto
        </button>
      </Navbar>

      {/* Hero */}
      <div style={{ position: 'relative', borderBottom: `1px solid ${colors.border}` }}>
        <div className="hero-section hero-inner" style={{
          minHeight: 'calc(100vh - 60px)',
          maxWidth: 1140, margin: '0 auto',
          padding: '140px 32px 64px',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center', position: 'relative',
        }}>
          <div className="hero-badge" style={{
            display: 'flex', alignItems: 'center', gap: 8,
            color: colors.muted, fontSize: 12, fontWeight: 700,
            letterSpacing: '0.14em', textTransform: 'uppercase',
            marginBottom: 28,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#1b78f7' }} />
            Para estudantes
          </div>

          <StaticHero />

          <p className="hero-sub" style={{
            fontSize: 16, color: colors.muted, lineHeight: 1.6,
            margin: '0 auto 72px', fontWeight: 400, maxWidth: 580,
            textAlign: 'center',
          }}>
            Cria uma página profissional do teu projeto em 10 minutos.<br />
            Partilha o link com <span style={{ whiteSpace: 'nowrap' }}>qualquer empresa.</span>
          </p>

          {/* Widget */}
          <form className="hero-widget" onSubmit={handleStart} style={{ width: '100%', maxWidth: 560 }}>
            <div ref={goalsRowRef} className="goals-row" style={{ position: 'relative', display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 22 }}>
              <span style={{
                position: 'absolute', borderRadius: 999,
                background: 'rgba(27,120,247,0.12)',
                left: pillHighlight.left, width: pillHighlight.width,
                top: pillHighlight.top, height: pillHighlight.height,
                opacity: pillHighlight.opacity, pointerEvents: 'none',
                transition: pillHighlight.moving
                  ? 'left 0.32s cubic-bezier(0.4,0,0.2,1), width 0.32s cubic-bezier(0.4,0,0.2,1), opacity 0.15s'
                  : 'opacity 0.25s ease',
              }} />
              {QUICK_GOALS.map(g => (
                <button
                  key={g.id} type="button"
                  ref={el => { pillRefs.current[g.id] = el }}
                  className={`goal-pill${selectedGoal === g.id ? ' active' : ''}`}
                  onClick={() => setSelectedGoal(selectedGoal === g.id ? null : g.id)}
                  style={{
                    position: 'relative', background: 'transparent', border: 'none',
                    color: selectedGoal === g.id ? '#1b78f7' : colors.muted,
                    borderRadius: 999, padding: '7px 14px', fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
                  }}
                >{g.label}</button>
              ))}
            </div>
            <div
              className="widget-box"
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                background: 'var(--c-card)',
                border: `1.5px solid rgba(27,120,247,0.22)`,
                borderRadius: 14, padding: '8px 8px 8px 20px',
                boxShadow: 'none',
                transition: 'border-color 0.15s, box-shadow 0.15s',
              }}
              onFocusCapture={e => { e.currentTarget.style.borderColor = '#1b78f7'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(27,120,247,0.15)' }}
              onBlurCapture={e => { if (!e.currentTarget.contains(e.relatedTarget)) { e.currentTarget.style.borderColor = 'rgba(27,120,247,0.22)'; e.currentTarget.style.boxShadow = 'none' } }}
            >
              <input
                type="text" className="widget-input"
                value={inputText} onChange={e => setInputText(e.target.value)}
                placeholder={placeholder}
                style={{
                  flex: 1, background: 'transparent', border: 'none',
                  color: 'var(--c-text)', fontSize: 17, fontFamily: 'inherit',
                  outline: 'none', minWidth: 0, padding: '12px 0',
                }}
              />
              <button
                type="submit" className="submit-btn"
                disabled={!inputText.trim()}
                style={{
                  background: inputText.trim() ? '#1b78f7' : 'transparent',
                  border: inputText.trim() ? 'none' : '1px solid var(--c-border)',
                  color: inputText.trim() ? '#fff' : 'var(--c-subtle)',
                  display: 'flex', alignItems: 'center', gap: 6,
                  cursor: inputText.trim() ? 'pointer' : 'not-allowed', flexShrink: 0,
                  fontSize: 14, fontWeight: 700, fontFamily: 'inherit',
                  borderRadius: 9, padding: '11px 18px',
                  transition: 'opacity 0.15s, background 0.15s',
                }}
              >
                Começar
                <ArrowRight size={15} />
              </button>
            </div>
            {spamError ? (
              <p style={{ color: '#ef4444', fontSize: 13, marginTop: 12, fontWeight: 600, textAlign: 'center' }}>
                Texto inválido — escreve uma descrição real do teu projeto.
              </p>
            ) : (
              <p className="hero-note" style={{ color: colors.subtle, fontSize: 13, marginTop: 14, fontWeight: 500, textAlign: 'center' }}>
                Sem registo · Sem cartão de crédito
              </p>
            )}
          </form>
        </div>
      </div>

      {/* Social proof strip */}
      <div className="home-stats" style={{
        textAlign: 'center', padding: '40px 24px 28px',
        borderBottom: `1px solid ${colors.border}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 24 }}>
          <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 400, fontSize: 'clamp(34px, 4.4vw, 50px)', color: '#1b78f7', letterSpacing: '-1px', fontVariantNumeric: 'tabular-nums', minWidth: '1.4em', textAlign: 'right' }}>
            {projectCount == null ? '...' : animatedCount}
          </span>
          <span style={{ fontSize: 14, color: colors.muted, fontWeight: 500, maxWidth: 200, textAlign: 'left', lineHeight: 1.3 }}>
            projetos criados por estudantes portugueses
          </span>
        </div>
        <div className="social-strip" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 28, flexWrap: 'wrap',
        }}>
          {['Ranking público', 'Análise por IA', 'Certificados verificados'].map((text, i, arr) => (
            <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
              <span style={{ fontSize: 12, color: colors.subtle, fontWeight: 600, whiteSpace: 'nowrap', letterSpacing: '0.02em' }}>{text}</span>
              {i < arr.length - 1 && <span style={{ color: 'rgba(27,120,247,0.35)', userSelect: 'none' }}>/</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Features alternadas */}
      <div ref={featuresRef} style={{ maxWidth: 1100, margin: '0 auto', padding: '200px 40px 80px' }}>

        {/* Título da secção */}
        <div style={{ textAlign: 'center', marginBottom: 96 }}>
          <h2 style={{ fontSize: 'clamp(26px, 3vw, 42px)', fontWeight: 900, letterSpacing: '-1.5px', margin: '0 0 16px', fontFamily: 'var(--font-heading)', color: colors.text }}>
            Tudo o que precisas, num só sítio
          </h2>
          <p style={{ fontSize: 17, color: colors.muted, maxWidth: 480, margin: '0 auto', lineHeight: 1.65 }}>
            Cria, melhora, apresenta e candidata-te — sem sair da plataforma.
          </p>
        </div>

        {featuresReady && <>
          {/* Feature 1 — Portfólio público */}
          <FeatureRow
            reverse={false}
            tag="Portfólio"
            tagColor="#1b78f7"
            title="A tua página profissional em minutos"
            desc="Gera automaticamente uma página pública do teu projeto com score de IA, descrição, tecnologias e muito mais. Partilha o link com qualquer empresa ou professor — sem precisar de fazer CV."
            bullets={['Link único partilhável', 'Score calculado por IA', 'Página personalizada com o teu estilo']}
            bulletColor="#1b78f7"
            mockup={<MockupPortfolio theme={theme} />}
          />

          {/* Feature 2 — Missões + Ranking */}
          <FeatureRow
            reverse={true}
            tag="Missões"
            tagColor="#22c55e"
            title="Completa missões. Sobe no ranking."
            desc="Cada campo que preencheres, cada detalhe que adicionares ao teu projeto vale pontos. Competes com outros estudantes num ranking público e provoas que o teu projeto é a sério."
            bullets={['Missões com pontos por campo', 'Ranking público entre estudantes', 'Badges de nível conquistados']}
            bulletColor="#22c55e"
            mockup={<MockupMissoes theme={theme} />}
          />

          {/* Feature 3 — Vagas */}
          <FeatureRow
            reverse={false}
            tag="Vagas"
            tagColor="#f59e0b"
            title="Candidata-te com o teu projeto como portfólio"
            desc="Encontra estágios e vagas de emprego directamente na plataforma. Candidata-te com o link do teu projeto — em vez de um CV vazio, mostras trabalho real."
            bullets={['Vagas filtradas para estudantes', 'Candidatura com link do projeto', 'Visibilidade directa para empresas']}
            bulletColor="#f59e0b"
            mockup={<MockupVagas theme={theme} />}
          />

          {/* Feature 4 — Defesa */}
          <FeatureRow
            reverse={true}
            tag="Defesa PAP"
            tagColor="#8b5cf6"
            title="Treina a defesa. Prepara as respostas do júri."
            desc="A IA gera as perguntas mais prováveis do júri com base no teu projeto, treinas as respostas e chegas à defesa preparado. Nunca mais ficas sem resposta na hora certa."
            bullets={['Perguntas prováveis do júri', 'Treino de apresentação cronometrado', 'Guia do apresentador por secção']}
            bulletColor="#8b5cf6"
            mockup={<MockupDefesa theme={theme} />}
          />
        </>}
      </div>

      {/* Bottom CTA */}
      <div style={{ padding: '0 24px 80px', textAlign: 'center' }}>
        <button
          onClick={() => setShowCreateModal(true)}
          className="home-cta-btn"
          style={{
            background: '#1b78f7',
            color: '#fff', border: 'none', borderRadius: 14,
            padding: '16px 40px', fontSize: 17, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'var(--font-body)',
            boxShadow: '0 4px 24px rgba(27,120,247,0.35)',
            letterSpacing: '-0.2px',
          }}
        >
          <span style={{display:"flex",alignItems:"center",gap:6}}>Criar o meu projeto <ArrowRight size={15} /></span>
        </button>
        <div className="home-ctas home-hero-btns" style={{ marginTop: 20, textAlign: 'center' }}>
          <button onClick={() => navigate('/explorar')} className="home-sec-link"
            style={{ background: 'none', color: colors.muted, border: 'none', padding: 0, fontSize: 13, cursor: 'pointer', fontWeight: 600, fontFamily: 'var(--font-body)', textDecoration: 'underline', textDecorationColor: 'rgba(27,120,247,0.35)', textUnderlineOffset: 3 }}>
            Ver projetos públicos
          </button>
          <span style={{ color: 'rgba(27,120,247,0.35)', margin: '0 12px' }}>·</span>
          <button onClick={() => navigate('/ranking')} className="home-sec-link"
            style={{ background: 'none', color: colors.muted, border: 'none', padding: 0, fontSize: 13, cursor: 'pointer', fontWeight: 600, fontFamily: 'var(--font-body)', textDecoration: 'underline', textDecorationColor: 'rgba(27,120,247,0.35)', textUnderlineOffset: 3 }}>
            Ver ranking
          </button>
        </div>
      </div>
      {showCreateModal && <CreateProjectModal onClose={() => setShowCreateModal(false)} />}
    </div>
  )
}
