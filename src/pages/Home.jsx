import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Globe, Bot, GraduationCap, Trophy, Sparkles, BadgeCheck, Users, ArrowRight } from 'lucide-react'
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
      <span style={{
        background: 'linear-gradient(135deg, #1b78f7 0%, #818cf8 60%, #a78bfa 100%)',
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
      }}>CV vazio.</span>
    </h1>
  )
}

function ProjectMockup({ theme }) {
  const isDark = theme !== 'light'
  const cardBg     = isDark ? '#0f1623' : '#ffffff'
  const cardBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'
  const textPri    = isDark ? '#f1f5f9' : '#0f172a'
  const textSec    = isDark ? '#94a3b8' : '#64748b'
  const tagBg      = isDark ? 'rgba(27,120,247,0.15)' : 'rgba(27,120,247,0.08)'

  return (
    <div style={{
      transform: 'rotate(3deg)',
      transformOrigin: 'center center',
      filter: 'drop-shadow(0 32px 64px rgba(0,0,0,0.45))',
      width: '100%', maxWidth: 380,
    }}>
      {/* Browser chrome */}
      <div style={{
        background: isDark ? '#1e293b' : '#e2e8f0',
        borderRadius: '14px 14px 0 0',
        padding: '10px 14px',
        display: 'flex', alignItems: 'center', gap: 6,
        border: `1px solid ${cardBorder}`,
        borderBottom: 'none',
      }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444', opacity: 0.8 }} />
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#fbbf24', opacity: 0.8 }} />
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#22c55e', opacity: 0.8 }} />
        <div style={{
          flex: 1, marginLeft: 8,
          background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)',
          borderRadius: 6, padding: '3px 10px',
          fontSize: 10, color: textSec, fontFamily: 'monospace',
        }}>
          showo.pt/p/stockflow-pro
        </div>
      </div>

      {/* Card content */}
      <div style={{
        background: cardBg,
        border: `1px solid ${cardBorder}`,
        borderRadius: '0 0 14px 14px',
        overflow: 'hidden',
      }}>
        {/* Cover image placeholder */}
        <div style={{
          height: 120,
          background: 'linear-gradient(135deg, #1b3a6b 0%, #1b78f7 50%, #818cf8 100%)',
          position: 'relative',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ fontSize: 32, opacity: 0.3 }}>📦</div>
          {/* Avatar */}
          <div style={{
            position: 'absolute', bottom: -20, left: 20,
            width: 44, height: 44, borderRadius: '50%',
            background: 'linear-gradient(135deg, #1b78f7, #818cf8)',
            border: `3px solid ${cardBg}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, fontWeight: 700, color: '#fff',
          }}>J</div>
        </div>

        <div style={{ padding: '28px 20px 20px' }}>
          {/* Tags */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
            <span style={{ background: tagBg, color: '#1b78f7', fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6 }}>PAP</span>
            <span style={{ background: isDark ? 'rgba(251,191,36,0.12)' : 'rgba(251,191,36,0.1)', color: '#fbbf24', fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6 }}>2024/25</span>
          </div>

          {/* Title */}
          <div style={{ fontSize: 15, fontWeight: 800, color: textPri, marginBottom: 4, letterSpacing: '-0.3px', fontFamily: 'var(--font-heading)' }}>
            StockFlow Pro
          </div>
          <div style={{ fontSize: 11, color: textSec, marginBottom: 14 }}>
            João Silva · CTIC, Escola Profissional do Porto
          </div>

          {/* Score bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <div style={{ flex: 1, height: 4, background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)', borderRadius: 99 }}>
              <div style={{ width: '88%', height: '100%', background: 'linear-gradient(90deg, #1b78f7, #818cf8)', borderRadius: 99 }} />
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#1b78f7', whiteSpace: 'nowrap' }}>88 pts</span>
          </div>

          {/* Description */}
          <div style={{ fontSize: 11, color: textSec, lineHeight: 1.6, marginBottom: 16 }}>
            Sistema de gestão de inventário com alertas automáticos e dashboard em tempo real para pequenas empresas.
          </div>

          {/* Tech stack pills */}
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {['React', 'Node.js', 'PostgreSQL'].map(t => (
              <span key={t} style={{
                fontSize: 9, fontWeight: 600, padding: '2px 7px', borderRadius: 5,
                background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                color: textSec, border: `1px solid ${cardBorder}`,
              }}>{t}</span>
            ))}
          </div>
        </div>
      </div>
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
          gap: 64px;
          align-items: center;
          max-width: 1160px;
          margin: 0 auto;
          width: 100%;
        }
        .hero-mockup-col { display: flex; justify-content: center; align-items: center; }

        /* Tablet */
        @media (max-width: 960px) {
          .hero-inner { grid-template-columns: 1fr !important; gap: 48px !important; }
          .hero-mockup-col { display: none !important; }
          .hero-left { text-align: center !important; align-items: center !important; }
          .hero-h1 { text-align: center !important; }
          .hero-sub { text-align: center !important; }
          .hero-badge { align-self: center !important; }
          .goals-row { justify-content: center !important; }
          .features-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }

        @media (max-width: 600px) {
          .hero-section  { min-height: calc(100dvh - 62px) !important; justify-content: center !important; padding: 32px 20px 48px !important; }
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
        <div style={{
          position: 'absolute', top: -80, left: '50%', transform: 'translateX(-50%)',
          width: 800, height: 500, borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(27,120,247,0.08) 0%, transparent 68%)',
          pointerEvents: 'none', animation: 'pulse-glow 5s ease-in-out infinite',
        }} />

        <div className="hero-section" style={{
          minHeight: 'calc(100vh - 62px)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '64px 32px',
          position: 'relative',
        }}>
          <div className="hero-inner">
            {/* Left col */}
            <div className="hero-left" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
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
                lineHeight: 1.65, margin: '0 0 36px', fontWeight: 400,
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
            <div className="hero-mockup-col">
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
