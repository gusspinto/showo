import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Globe, Bot, GraduationCap, Trophy, Sparkles, BadgeCheck, Users, ArrowRight, Search, Lightbulb, TrendingUp, Wrench, Zap, Target, Star } from 'lucide-react'
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
      fontSize: 'clamp(32px, 4.2vw, 56px)', fontWeight: 900,
      lineHeight: 1.08, margin: '0 0 20px',
      letterSpacing: '-1.5px',
      fontFamily: 'var(--font-heading)',
      textAlign: 'left',
    }}>
      O teu projeto vale mais do que um{' '}
      <span style={{ color: '#1b78f7' }}>CV vazio.</span>
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

function ProjectMockup({ theme }) {
  const isDark  = theme !== 'light'
  const pageBg  = isDark ? '#0b1120' : '#f0f4f8'
  const cardBg  = isDark ? '#111827' : '#ffffff'
  const border  = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)'
  const textPri = isDark ? '#f1f5f9' : '#0f172a'
  const textSec = isDark ? '#94a3b8' : '#64748b'

  const MOCK_W = 860

  return (
    <div style={{ position: 'relative', width: '100%', height: 600 }}>
      {/* Scaled page */}
      <div style={{
        position: 'absolute',
        top: 0, left: -60,
        width: MOCK_W,
        transformOrigin: 'top left',
        transform: 'scale(0.68)',
        borderRadius: 16,
        overflow: 'hidden',
        border: `1px solid ${border}`,
        boxShadow: '0 32px 80px rgba(0,0,0,0.55)',
        background: pageBg,
        fontFamily: 'var(--font-body)',
      }}>
        {/* Browser chrome */}
        <div style={{
          background: isDark ? '#0d1526' : '#dde3ea',
          padding: '10px 16px',
          display: 'flex', alignItems: 'center', gap: 7,
          borderBottom: `1px solid ${border}`,
        }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444', opacity: 0.8 }} />
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#fbbf24', opacity: 0.8 }} />
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#22c55e', opacity: 0.8 }} />
          <div style={{
            flex: 1, marginLeft: 10, background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.07)',
            borderRadius: 6, padding: '4px 14px', fontSize: 11, color: textSec, fontFamily: 'monospace',
          }}>showo.pt/p/stockflow-pro</div>
        </div>

        {/* Hero cover */}
        <div style={{ position: 'relative', height: 200, background: 'linear-gradient(135deg, #061a3a 0%, #0d3a7a 40%, #1b78f7 100%)', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -60, right: '10%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(27,120,247,0.35) 0%, transparent 65%)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: -20, left: '20%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(56,163,255,0.2) 0%, transparent 65%)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 30%, rgba(11,17,32,0.9) 100%)' }} />
        </div>

        {/* Title block */}
        <div style={{ padding: '0 32px', position: 'relative', marginTop: -80 }}>
          {/* Type chip */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <span style={{ background: 'linear-gradient(135deg, #1b78f7, #0d5abf)', color: '#fff', borderRadius: 6, padding: '4px 12px', fontSize: 11, fontWeight: 800, letterSpacing: '0.06em' }}>PAP</span>
            <span style={{ background: 'rgba(27,120,247,0.12)', color: '#38a3ff', border: '1px solid rgba(27,120,247,0.25)', borderRadius: 6, padding: '4px 12px', fontSize: 12, fontWeight: 600 }}>Tecnologias de Informação</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20 }}>
            <div style={{ flex: 1 }}>
              <h1 style={{ fontSize: 42, fontWeight: 900, letterSpacing: '-1.5px', lineHeight: 1.0, margin: '0 0 12px', fontFamily: 'var(--font-heading)', color: textPri }}>
                StockFlow Pro
              </h1>
              <p style={{ fontSize: 16, color: textSec, margin: '0 0 20px', lineHeight: 1.5 }}>
                Sistema inteligente de gestão de inventário com alertas em tempo real.
              </p>
              {/* Creator pill */}
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: cardBg, border: `1px solid ${border}`, borderRadius: 999, padding: '6px 16px 6px 6px' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0 }}>J</div>
                <span style={{ fontSize: 13, fontWeight: 600, color: textPri }}>João Silva</span>
                <span style={{ fontSize: 12, color: textSec }}>· CTIC</span>
              </div>
            </div>
            {/* Score ring */}
            <div style={{ flexShrink: 0, paddingTop: 8 }}>
              <MiniScoreRing score={88} size={84} />
              <div style={{ textAlign: 'center', marginTop: 6, fontSize: 10, color: textSec, fontWeight: 600 }}>Nível profissional</div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: border, margin: '28px 0 0' }} />

        {/* Cards grid */}
        <div style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Problema */}
          <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 14, padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
              <Search size={13} color={textSec} />
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: textSec }}>Problema</span>
            </div>
            <p style={{ margin: 0, fontSize: 14, color: textPri, lineHeight: 1.7 }}>
              Pequenas empresas perdem horas por semana a gerir stock manualmente em folhas de cálculo, sem alertas de rutura nem visibilidade em tempo real sobre o inventário.
            </p>
          </div>

          {/* Highlight cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            {[
              { Icon: Zap,        color: '#1b78f7', bg: 'rgba(27,120,247,0.1)',  text: 'Reduz erros de stock em 90%' },
              { Icon: TrendingUp, color: '#38a3ff', bg: 'rgba(56,163,255,0.1)',  text: 'Poupança de 3h/semana por loja' },
              { Icon: Target,     color: '#1b78f7', bg: 'rgba(27,120,247,0.08)', text: 'Testado em 2 empresas reais' },
            ].map(({ Icon, color, bg, text }) => (
              <div key={text} style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 12, padding: '14px 16px' }}>
                <div style={{ width: 32, height: 32, borderRadius: 9, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                  <Icon size={15} color={color} />
                </div>
                <span style={{ fontSize: 12, color: textPri, fontWeight: 600, lineHeight: 1.5 }}>{text}</span>
              </div>
            ))}
          </div>

          {/* Tecnologias */}
          <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 14, padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
              <Wrench size={13} color={textSec} />
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: textSec }}>Tecnologias</span>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {['React', 'Node.js', 'PostgreSQL', 'Tailwind CSS', 'Docker'].map(t => (
                <span key={t} style={{ fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 6, background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)', color: textSec, border: `1px solid ${border}` }}>{t}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Left fade — blends into left column */}
      <div style={{
        position: 'absolute', top: 0, left: 0,
        width: '28%', height: '100%',
        background: `linear-gradient(to right, var(--c-bg) 0%, transparent 100%)`,
        pointerEvents: 'none', zIndex: 2,
      }} />
      {/* Bottom fade */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: '30%',
        background: `linear-gradient(to bottom, transparent, var(--c-bg))`,
        pointerEvents: 'none', zIndex: 2,
      }} />
    </div>
  )
}

const QUICK_GOALS = [
  { id: 'pap',        label: 'PAP' },
  { id: 'internship', label: 'Estágio' },
  { id: 'group',      label: 'Trabalho de grupo' },
  { id: 'personal',   label: 'Projeto pessoal' },
]

const FEATURES = [
  {
    Icon: Globe,
    iconColor: '#5a9ff5',
    iconBg: 'rgba(27,120,247,0.1)',
    title: 'Página profissional',
    desc: 'Em 10 minutos tens um link para partilhar com qualquer empresa ou professor.',
  },
  {
    Icon: Bot,
    iconColor: '#818cf8',
    iconBg: 'rgba(129,140,248,0.1)',
    title: 'Análise por IA',
    desc: 'A IA avalia o teu projeto campo a campo e diz-te exatamente o que melhorar.',
  },
  {
    Icon: GraduationCap,
    iconColor: '#fbbf24',
    iconBg: 'rgba(251,191,36,0.1)',
    title: 'Prepara a defesa',
    desc: 'Perguntas prováveis do júri, guia do apresentador e gestão de grupo incluídos.',
  },
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
        .home-cta-btn { transition: all 0.15s !important; }
        .home-cta-btn:hover { opacity: 0.88 !important; }
        .home-sec-btn { transition: all 0.15s !important; }
        .home-sec-btn:hover {
          border-color: #1b78f7 !important;
          color: var(--c-text) !important;
          background: rgba(27,120,247,0.06) !important;
        }

        /* Hero two-column layout */
        .hero-inner {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0;
          align-items: center;
          width: 100%;
          max-width: 100%;
        }
        .hero-left-wrap {
          padding: 0 48px 0 64px;
          max-width: 640px;
        }
        .hero-mockup-col { display: block; position: relative; overflow: hidden; }

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
      <div style={{ position: 'relative', overflow: 'hidden' }}>
        {/* Background glow */}
        <div style={{
          position: 'absolute', top: -60, left: '20%',
          width: 600, height: 600, borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(27,120,247,0.07) 0%, transparent 68%)',
          pointerEvents: 'none', animation: 'pulse-glow 5s ease-in-out infinite',
        }} />

        <div className="hero-section" style={{
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '100px 0 100px 0',
          position: 'relative',
        }}>
          <div className="hero-inner">
            {/* Left col */}
            <div className="hero-left hero-left-wrap" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              {/* Badge */}
              <div className="hero-badge" style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: theme === 'light' ? 'rgba(27,120,247,0.08)' : 'rgba(27,120,247,0.07)',
                border: `1px solid ${theme === 'light' ? 'rgba(27,120,247,0.25)' : 'rgba(27,120,247,0.18)'}`,
                color: '#1b78f7', borderRadius: 999,
                padding: '5px 16px', fontSize: 12, fontWeight: 600, marginBottom: 28,
              }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#1b78f7', display: 'inline-block', animation: 'pulse-glow 2s ease-in-out infinite' }} />
                Para estudantes portugueses
              </div>

              {/* Headline */}
              <StaticHero />

              {/* Subheadline */}
              <p className="hero-sub" style={{
                fontSize: 17, color: colors.muted, maxWidth: 460,
                lineHeight: 1.7, margin: '0 0 44px', fontWeight: 400,
              }}>
                Cria uma página profissional do teu projeto em 10 minutos.
                Partilha o link com qualquer empresa. Consegue o estágio que mereces.
              </p>

              {/* Widget */}
              <form className="hero-widget" onSubmit={handleStart} style={{ width: '100%' }}>
                {/* Pills */}
                <div className="goals-row" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-start', marginBottom: 14 }}>
                  {QUICK_GOALS.map(g => (
                    <button
                      key={g.id}
                      type="button"
                      className="goal-pill"
                      onClick={() => setSelectedGoal(selectedGoal === g.id ? null : g.id)}
                      style={{
                        background: selectedGoal === g.id ? 'rgba(27,120,247,0.12)' : 'transparent',
                        border: `1px solid ${selectedGoal === g.id ? '#1b78f7' : colors.border}`,
                        color: selectedGoal === g.id ? '#1b78f7' : colors.muted,
                        borderRadius: 999, padding: '6px 15px',
                        fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
                      }}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>

                {/* Input */}
                <div
                  className="widget-box"
                  style={{
                    display: 'flex', alignItems: 'center',
                    background: 'var(--c-bg-alt)',
                    border: `1.5px solid ${colors.borderBright}`,
                    borderRadius: 16, padding: '6px 6px 6px 20px',
                    boxShadow: theme === 'light' ? '0 4px 24px rgba(0,0,0,0.09)' : '0 8px 40px rgba(0,0,0,0.45)',
                  }}
                  onFocusCapture={e => { e.currentTarget.style.borderColor = '#1b78f7' }}
                  onBlurCapture={e => { if (!e.currentTarget.contains(e.relatedTarget)) e.currentTarget.style.borderColor = colors.borderBright }}
                >
                  <input
                    type="text"
                    className="widget-input"
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    placeholder={placeholder}
                    style={{
                      flex: 1, background: 'transparent', border: 'none',
                      color: 'var(--c-text)', fontSize: 16, fontFamily: 'inherit',
                      outline: 'none', minWidth: 0, padding: '10px 0',
                    }}
                  />
                  <button
                    type="submit"
                    className="submit-btn"
                    disabled={!inputText.trim()}
                    style={{
                      background: inputText.trim() ? '#1b78f7' : 'var(--c-border)',
                      border: 'none', borderRadius: 12,
                      color: '#fff', width: 48, height: 48,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: inputText.trim() ? 'pointer' : 'not-allowed', flexShrink: 0,
                      transition: 'all 0.15s',
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12"/>
                      <polyline points="12 5 19 12 12 19"/>
                    </svg>
                  </button>
                </div>

                {spamError ? (
                  <p style={{ color: '#ef4444', fontSize: 12, marginTop: 10, fontWeight: 600 }}>
                    Texto inválido — escreve uma descrição real do teu projeto.
                  </p>
                ) : (
                  <p className="hero-note" style={{ color: colors.subtle, fontSize: 13, marginTop: 14, fontWeight: 500 }}>
                    Sem registo · Sem cartão de crédito
                  </p>
                )}
              </form>
            </div>

            {/* Right col — mockup */}
            <div className="hero-mockup-col" style={{ height: 600 }}>
              <ProjectMockup theme={theme} />
            </div>
          </div>
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

      {/* Features */}
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '64px 24px 48px' }}>
        <div className="features-grid home-features-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 20,
        }}>
          {FEATURES.map(f => (
            <div key={f.title} className="feature-card" style={{
              background: colors.card, border: `1px solid ${colors.border}`,
              borderRadius: 18, padding: '28px 24px',
              boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
            }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: f.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <f.Icon size={24} color={f.iconColor} />
              </div>
              <h3 style={{ margin: '0 0 10px', fontSize: 16, fontWeight: 800, color: colors.text, fontFamily: 'var(--font-heading)', letterSpacing: '-0.2px' }}>{f.title}</h3>
              <p style={{ margin: 0, color: colors.muted, fontSize: 14, lineHeight: 1.65 }}>{f.desc}</p>
            </div>
          ))}
        </div>
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
