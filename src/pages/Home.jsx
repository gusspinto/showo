import { useState, useEffect, useRef, memo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Globe, Bot, GraduationCap, Trophy, Briefcase, Sparkles, BadgeCheck, Users, ArrowRight, TrendingUp, Wrench, Zap, Target } from 'lucide-react'
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
      fontSize: 'clamp(26px, 3vw, 42px)', fontWeight: 900,
      lineHeight: 1.1, margin: '0 0 24px',
      letterSpacing: '-1.5px',
      fontFamily: 'var(--font-heading)',
      textAlign: 'center',
    }}>
      O teu projeto vale mais do que um{' '}
      <span style={{ color: '#1b78f7', whiteSpace: 'nowrap' }}>CV vazio.</span>
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

const MockupPortfolio = memo(function MockupPortfolio() {
  const c = { bg: '#ffffff', bgAlt: '#f0f5ff', border: '#dde6f5', text: '#0f172a', muted: '#64748b', blue: '#1b78f7' }
  return (
    <div style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 18, overflow: 'hidden', boxShadow: '0 20px 60px rgba(27,120,247,0.12)' }}>
      <div style={{ height: 80, background: 'linear-gradient(135deg, #1b78f7, #60a5fa)', position: 'relative' }}>
        <div style={{ position: 'absolute', bottom: -16, left: 20, width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg, #1b78f7, #60a5fa)', border: `3px solid ${c.bg}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#fff' }}>J</div>
      </div>
      <div style={{ padding: '22px 20px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <span style={{ background: 'rgba(27,120,247,0.1)', color: c.blue, fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 5 }}>PAP</span>
            <span style={{ background: c.bgAlt, color: '#3b82f6', border: `1px solid ${c.border}`, fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 5 }}>Tecnologias de Informação</span>
          </div>
          <span style={{ fontSize: 11, fontWeight: 800, color: '#16a34a', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, padding: '3px 8px' }}>88 pts</span>
        </div>
        <div style={{ fontSize: 17, fontWeight: 900, color: c.text, letterSpacing: '-0.5px', fontFamily: 'var(--font-heading)', marginBottom: 4 }}>StockFlow Pro</div>
        <div style={{ fontSize: 12, color: c.muted, marginBottom: 14 }}>João Silva · Escola Profissional do Porto</div>
        <div style={{ background: c.bgAlt, border: `1px solid ${c.border}`, borderRadius: 10, padding: '9px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Globe size={12} color={c.blue} />
          <span style={{ fontSize: 11, color: c.blue, fontWeight: 600, fontFamily: 'monospace' }}>showo.pt/p/stockflow-pro</span>
        </div>
      </div>
    </div>
  )
})

const MockupMissoes = memo(function MockupMissoes() {
  const c = { bg: '#ffffff', bgAlt: '#f0f5ff', border: '#dde6f5', text: '#0f172a', muted: '#64748b' }
  const missions = [
    { label: 'Descreve o problema', pts: '+8 pts', done: true },
    { label: 'Adiciona tecnologias', pts: '+5 pts', done: true },
    { label: 'Define o público-alvo', pts: '+8 pts', done: false },
    { label: 'Apresenta resultados', pts: '+10 pts', done: false },
  ]
  return (
    <div style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 18, overflow: 'hidden', boxShadow: '0 20px 60px rgba(27,120,247,0.12)' }}>
      <div style={{ padding: '18px 20px 14px', borderBottom: `1px solid ${c.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: c.text, fontFamily: 'var(--font-heading)' }}>As tuas missões</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#16a34a', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, padding: '3px 8px' }}>88 pts</span>
        </div>
        <div style={{ height: 4, background: c.bgAlt, borderRadius: 99 }}>
          <div style={{ width: '55%', height: '100%', background: 'linear-gradient(90deg, #22c55e, #16a34a)', borderRadius: 99 }} />
        </div>
        <div style={{ fontSize: 10, color: c.muted, marginTop: 5 }}>2 de 4 missões completas</div>
      </div>
      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 7 }}>
        {missions.map(m => (
          <div key={m.label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 10, background: m.done ? '#f0fdf4' : c.bgAlt, border: `1px solid ${m.done ? '#bbf7d0' : c.border}` }}>
            <div style={{ width: 22, height: 22, borderRadius: 6, background: m.done ? '#dcfce7' : '#e0eaff', border: `1px solid ${m.done ? '#86efac' : '#bfcfff'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {m.done ? <Trophy size={11} color="#16a34a" /> : <Zap size={11} color="#1b78f7" />}
            </div>
            <span style={{ flex: 1, fontSize: 12, color: m.done ? c.muted : c.text, fontWeight: m.done ? 400 : 600, textDecoration: m.done ? 'line-through' : 'none' }}>{m.label}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: m.done ? '#16a34a' : '#1b78f7' }}>{m.pts}</span>
          </div>
        ))}
      </div>
    </div>
  )
})

const MockupVagas = memo(function MockupVagas() {
  const c = { bg: '#ffffff', bgAlt: '#f0f5ff', border: '#dde6f5', text: '#0f172a', muted: '#64748b', blue: '#1b78f7' }
  const vagas = [
    { empresa: 'Codilink', cargo: 'Estágio em Desenvolvimento Web', tipo: 'Presencial · Lisboa', nova: true },
    { empresa: 'DataVision', cargo: 'Junior Backend Developer', tipo: 'Remoto · Full-time', nova: false },
    { empresa: 'UXLab', cargo: 'Estágio em Design de Produto', tipo: 'Híbrido · Porto', nova: true },
  ]
  return (
    <div style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 18, overflow: 'hidden', boxShadow: '0 20px 60px rgba(27,120,247,0.12)' }}>
      <div style={{ padding: '16px 20px 13px', borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 13, fontWeight: 800, color: c.text, fontFamily: 'var(--font-heading)' }}>Vagas para ti</span>
        <span style={{ fontSize: 10, color: '#b45309', fontWeight: 700, background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 6, padding: '3px 8px' }}>3 novas</span>
      </div>
      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {vagas.map(v => (
          <div key={v.empresa} style={{ padding: '11px 14px', borderRadius: 12, background: c.bgAlt, border: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: '#e0eaff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Briefcase size={14} color={c.blue} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: c.text }}>{v.cargo}</span>
                {v.nova && <span style={{ fontSize: 9, fontWeight: 700, color: '#b45309', background: '#fef3c7', borderRadius: 4, padding: '1px 5px' }}>Nova</span>}
              </div>
              <span style={{ fontSize: 11, color: c.muted }}>{v.empresa} · {v.tipo}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
})

const MockupDefesa = memo(function MockupDefesa() {
  const c = { bg: '#ffffff', bgAlt: '#f0f5ff', border: '#dde6f5', text: '#0f172a', muted: '#64748b' }
  const perguntas = [
    'Qual foi o maior desafio técnico que enfrentaste?',
    'Como garantiste a qualidade do código produzido?',
    'Que tecnologias escolheste e porquê?',
  ]
  return (
    <div style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 18, overflow: 'hidden', boxShadow: '0 20px 60px rgba(27,120,247,0.12)' }}>
      <div style={{ padding: '16px 20px 13px', borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 30, height: 30, borderRadius: 9, background: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <GraduationCap size={15} color="#7c3aed" />
        </div>
        <span style={{ fontSize: 13, fontWeight: 800, color: c.text, fontFamily: 'var(--font-heading)' }}>Treino de defesa — PAP</span>
      </div>
      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 9 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: c.muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Perguntas prováveis do júri</div>
        {perguntas.map((p, i) => (
          <div key={i} style={{ padding: '11px 14px', borderRadius: 10, background: '#f5f3ff', border: '1px solid #ddd6fe', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: '#7c3aed', flexShrink: 0, marginTop: 1 }}>{i + 1}.</span>
            <span style={{ fontSize: 12, color: c.text, lineHeight: 1.5 }}>{p}</span>
          </div>
        ))}
        <div style={{ padding: '9px 14px', borderRadius: 10, background: c.bgAlt, border: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Bot size={13} color="#1b78f7" />
          <span style={{ fontSize: 11, color: '#1b78f7', fontWeight: 600 }}>IA a gerar respostas sugeridas...</span>
        </div>
      </div>
    </div>
  )
})

const QUICK_GOALS = [
  { id: 'pap',        label: 'PAP' },
  { id: 'internship', label: 'Estágio' },
  { id: 'group',      label: 'Trabalho de grupo' },
  { id: 'personal',   label: 'Projeto pessoal' },
]


export default function Home() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { theme } = useTheme()
  const [selectedGoal, setSelectedGoal] = useState(null)
  const [inputText, setInputText] = useState('')
  const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem('showo_seen_onboarding'))
  const [projectCount, setProjectCount] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [spamError, setSpamError] = useState(false)
  const [featuresReady, setFeaturesReady] = useState(false)
  const featuresRef = useRef(null)

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
    ? `Nome do teu ${QUICK_GOALS.find(g => g.id === selectedGoal)?.label.toLowerCase()}...`
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
        .goal-pill { transition: all 0.15s !important; cursor: pointer; }
        .goal-pill:hover {
          border-color: #1b78f7 !important;
          color: var(--c-text) !important;
          background: rgba(27,120,247,0.08) !important;
        }
        .feature-card { transition: all 0.2s ease !important; cursor: default; }
        .feature-card:hover {
          border-color: var(--c-border-bright) !important;
          transform: translateY(-3px) !important;
          box-shadow: 0 16px 48px rgba(0,0,0,0.25) !important;
          background: var(--c-card-hover) !important;
        }
        .submit-btn:hover { background: #1564d4 !important; }
        .submit-btn { transition: background 0.15s !important; }
        /* Override global light-mode input style inside the hero widget */
        body.light .widget-box { background: #ffffff !important; border-color: #dde6f5 !important; }
        body.light .widget-box:focus-within { border-color: #1b78f7 !important; }
        body.light .widget-input { background: transparent !important; }
        body.light .widget-box .submit-btn[disabled] { background: #f0f5ff !important; }
        body.light .goal-pill { border-color: #dde6f5 !important; color: #64748b !important; }
        body.light .goal-pill:hover { border-color: #1b78f7 !important; background: rgba(27,120,247,0.07) !important; color: #1b78f7 !important; }
        .home-cta-btn { transition: all 0.15s !important; }
        .home-cta-btn:hover { opacity: 0.88 !important; }
        .home-sec-btn { transition: all 0.15s !important; }
        .home-sec-btn:hover {
          border-color: #1b78f7 !important;
          color: var(--c-text) !important;
          background: rgba(27,120,247,0.06) !important;
        }

        .hero-mockup-col { display: block; }

        /* Tablet */
        @media (max-width: 960px) {
          .hero-inner { grid-template-columns: 1fr !important; }
          .hero-mockup-col { display: none !important; }
          .hero-left-wrap { padding: 0 32px !important; max-width: 100% !important; }
          .hero-left { text-align: center !important; align-items: center !important; }
          .hero-h1 { text-align: center !important; }
          .hero-sub { text-align: center !important; }
          .hero-badge { align-self: center !important; }
          .goals-row { justify-content: center !important; }
          .features-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }

        @media (max-width: 600px) {
          .hero-section  { padding: 60px 0 60px !important; }
          .hero-left-wrap { padding: 0 20px !important; }
          .hero-h1       { font-size: 30px !important; letter-spacing: -0.5px !important; margin-bottom: 12px !important; }
          .hero-sub      { font-size: 15px !important; }
          .hero-widget   { margin-top: 28px !important; max-width: 100% !important; }
          .goals-row     { flex-wrap: nowrap !important; overflow-x: auto !important; justify-content: flex-start !important; padding-bottom: 6px !important; scrollbar-width: none !important; -webkit-overflow-scrolling: touch !important; }
          .goals-row::-webkit-scrollbar { display: none !important; }
          .goal-pill     { font-size: 12px !important; padding: 6px 14px !important; flex-shrink: 0 !important; min-height: 36px !important; }
          .widget-box    { padding: 4px 4px 4px 16px !important; border-radius: 14px !important; }
          .widget-input  { padding: 8px 0 !important; font-size: 15px !important; }
          .submit-btn    { width: 42px !important; height: 42px !important; border-radius: 10px !important; }
          .social-strip  { gap: 10px !important; font-size: 12px !important; justify-content: center !important; }
          .features-grid { grid-template-columns: 1fr !important; gap: 12px !important; }
          .feature-card  { padding: 20px 18px !important; }
          .hero-badge    { font-size: 11px !important; padding: 5px 12px !important; gap: 6px !important; }
          .hero-note     { font-size: 11px !important; }
          .home-ctas     { flex-direction: column !important; gap: 10px !important; align-items: stretch !important; }
          .home-ctas button { width: 100% !important; justify-content: center !important; }
          .home-features-grid { grid-template-columns: 1fr !important; gap: 12px !important; }
          .home-hero-btns { flex-direction: column !important; width: 100%; }
          .home-hero-btns a, .home-hero-btns button { width: 100% !important; justify-content: center !important; text-align: center !important; }
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
            background: 'linear-gradient(135deg, #1b78f7, #4f46e5)',
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
      <div style={{ position: 'relative' }}>
        {/* Background glows */}
        <div style={{
          position: 'absolute', top: -120, left: '50%', transform: 'translateX(-50%)',
          width: 800, height: 600, borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(27,120,247,0.1) 0%, transparent 65%)',
          pointerEvents: 'none', animation: 'pulse-glow 5s ease-in-out infinite',
        }} />

        <div className="hero-section" style={{
          minHeight: 'calc(100vh - 60px)',
          padding: '60px 24px',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center', position: 'relative',
        }}>
          <div className="hero-badge" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: theme === 'light' ? 'rgba(27,120,247,0.08)' : 'rgba(27,120,247,0.07)',
            border: `1px solid ${theme === 'light' ? 'rgba(27,120,247,0.25)' : 'rgba(27,120,247,0.18)'}`,
            color: '#1b78f7', borderRadius: 999,
            padding: '6px 18px', fontSize: 13, fontWeight: 600, marginBottom: 40,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#1b78f7', display: 'inline-block', animation: 'pulse-glow 2s ease-in-out infinite' }} />
            Para estudantes portugueses
          </div>

          <StaticHero />

          <p className="hero-sub" style={{
            fontSize: 18, color: colors.muted, lineHeight: 1.75,
            margin: '0 0 56px', fontWeight: 400, maxWidth: 500,
          }}>
            Cria uma página profissional do teu projeto em 10 minutos.
            Partilha o link com qualquer empresa.
          </p>

          {/* Widget */}
          <form className="hero-widget" onSubmit={handleStart} style={{ width: '100%', maxWidth: 600 }}>
            <div className="goals-row" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 16 }}>
              {QUICK_GOALS.map(g => (
                <button
                  key={g.id} type="button" className="goal-pill"
                  onClick={() => setSelectedGoal(selectedGoal === g.id ? null : g.id)}
                  style={{
                    background: selectedGoal === g.id ? 'rgba(27,120,247,0.12)' : 'transparent',
                    border: `1px solid ${selectedGoal === g.id ? '#1b78f7' : colors.border}`,
                    color: selectedGoal === g.id ? '#1b78f7' : colors.muted,
                    borderRadius: 999, padding: '7px 18px', fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
                  }}
                >{g.label}</button>
              ))}
            </div>
            <div
              className="widget-box"
              style={{
                display: 'flex', alignItems: 'center',
                background: 'var(--c-card)',
                border: `1.5px solid var(--c-border)`,
                borderRadius: 18, padding: '8px 8px 8px 24px',
              }}
              onFocusCapture={e => { e.currentTarget.style.borderColor = '#1b78f7' }}
              onBlurCapture={e => { if (!e.currentTarget.contains(e.relatedTarget)) e.currentTarget.style.borderColor = 'var(--c-border)' }}
            >
              <input
                type="text" className="widget-input"
                value={inputText} onChange={e => setInputText(e.target.value)}
                placeholder={placeholder}
                style={{
                  flex: 1, background: 'transparent', border: 'none',
                  color: 'var(--c-text)', fontSize: 16, fontFamily: 'inherit',
                  outline: 'none', minWidth: 0, padding: '12px 0',
                }}
              />
              <button
                type="submit" className="submit-btn"
                disabled={!inputText.trim()}
                style={{
                  background: inputText.trim() ? '#1b78f7' : 'var(--c-bg-alt)',
                  border: 'none', borderRadius: 12, color: inputText.trim() ? '#fff' : 'var(--c-muted)', width: 48, height: 48,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: inputText.trim() ? 'pointer' : 'not-allowed', flexShrink: 0,
                  transition: 'all 0.15s',
                }}
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                </svg>
              </button>
            </div>
            {spamError ? (
              <p style={{ color: '#ef4444', fontSize: 13, marginTop: 12, fontWeight: 600 }}>
                Texto inválido — escreve uma descrição real do teu projeto.
              </p>
            ) : (
              <p className="hero-note" style={{ color: colors.subtle, fontSize: 13, marginTop: 14, fontWeight: 500 }}>
                Sem registo · Sem cartão de crédito
              </p>
            )}
          </form>
        </div>
      </div>

      {/* Social proof strip */}
      <div className="social-strip home-stats" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 28, padding: '16px 24px',
        borderTop: `1px solid ${colors.border}`,
        borderBottom: `1px solid ${colors.border}`,
        background: 'var(--c-bg-alt)',
        flexWrap: 'wrap',
      }}>
        {[
          { Icon: Users,      color: colors.blue,   text: projectCount != null ? `Já ${projectCount} projetos criados por estudantes portugueses` : 'Já centenas de projetos criados por estudantes portugueses' },
          { Icon: Trophy,     color: colors.yellow, text: 'Ranking público' },
          { Icon: Sparkles,   color: '#818cf8',     text: 'Análise por IA' },
          { Icon: BadgeCheck, color: colors.green,  text: 'Certificados verificados' },
        ].map(({ Icon, color, text }, i, arr) => (
          <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <Icon size={14} color={color} style={{ flexShrink: 0, opacity: 0.85 }} />
              <span style={{ fontSize: 13, color: colors.muted, fontWeight: 500, whiteSpace: 'nowrap' }}>{text}</span>
            </div>
            {i < arr.length - 1 && <span style={{ color: colors.subtle, userSelect: 'none' }}>·</span>}
          </div>
        ))}
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
            mockup={<MockupPortfolio />}
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
            mockup={<MockupMissoes />}
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
            mockup={<MockupVagas />}
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
            mockup={<MockupDefesa />}
          />
        </>}
      </div>

      {/* Bottom CTA */}
      <div style={{ padding: '0 24px 80px', textAlign: 'center' }}>
        <button
          onClick={() => setShowCreateModal(true)}
          className="home-cta-btn"
          style={{
            background: 'linear-gradient(135deg, #1b78f7, #4f46e5)',
            color: '#fff', border: 'none', borderRadius: 14,
            padding: '16px 40px', fontSize: 17, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'var(--font-body)',
            boxShadow: '0 4px 24px rgba(27,120,247,0.35)',
            letterSpacing: '-0.2px',
          }}
        >
          <span style={{display:"flex",alignItems:"center",gap:6}}>Criar o meu projeto <ArrowRight size={15} /></span>
        </button>
        <div className="home-ctas home-hero-btns" style={{ marginTop: 20, display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => navigate('/explorar')} className="home-sec-btn"
            style={{ background: 'transparent', color: colors.muted, border: `1px solid ${colors.border}`, borderRadius: 12, padding: '10px 22px', fontSize: 13, cursor: 'pointer', fontWeight: 600, fontFamily: 'var(--font-body)' }}>
            Ver projetos públicos
          </button>
          <button onClick={() => navigate('/ranking')} className="home-sec-btn"
            style={{ background: 'transparent', color: colors.muted, border: `1px solid ${colors.border}`, borderRadius: 12, padding: '10px 22px', fontSize: 13, cursor: 'pointer', fontWeight: 600, fontFamily: 'var(--font-body)' }}>
            Ver ranking
          </button>
        </div>
      </div>
      {showCreateModal && <CreateProjectModal onClose={() => setShowCreateModal(false)} />}
    </div>
  )
}
