import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Globe, Bot, GraduationCap, Trophy, Sparkles, BadgeCheck, Users, ArrowRight } from 'lucide-react'
import { Navbar } from '../components/Navbar'
import { supabase } from '../lib/supabase'
import Onboarding from '../components/Onboarding'
import CreateProjectModal from '../components/CreateProjectModal'
import { looksLikeSpam } from '../lib/score'

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

const PHRASES = [
  { full: 'O teu projeto merece mais do que um PDF.', highlight: 'mais do que um PDF.' },
  { full: 'Organiza. Apresenta. Impressiona.', highlight: 'Organiza. Apresenta. Impressiona.' },
  { full: 'A IA prepara-te para a defesa.', highlight: 'prepara-te para a defesa.' },
]

function TypedHero() {
  const [idx,      setIdx]      = useState(0)
  const [text,     setText]     = useState('')
  const [deleting, setDeleting] = useState(false)
  const [cursor,   setCursor]   = useState(true)

  useEffect(() => {
    const t = setInterval(() => setCursor(c => !c), 530)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const phrase = PHRASES[idx].full
    let timer
    if (!deleting) {
      if (text.length < phrase.length) {
        timer = setTimeout(() => setText(phrase.slice(0, text.length + 1)), 55)
      } else {
        timer = setTimeout(() => setDeleting(true), 2200)
      }
    } else {
      if (text.length > 0) {
        timer = setTimeout(() => setText(text.slice(0, -1)), 30)
      } else {
        setDeleting(false)
        setIdx(i => (i + 1) % PHRASES.length)
      }
    }
    return () => clearTimeout(timer)
  }, [text, deleting, idx])

  const phrase = PHRASES[idx]
  let rendered
  if (phrase.highlight) {
    const hStart = phrase.full.indexOf(phrase.highlight)
    if (text.length > hStart) {
      const before = text.slice(0, hStart)
      const hl     = text.slice(hStart)
      rendered = (
        <>
          {before}
          <span style={{
            background: 'linear-gradient(135deg, #1b78f7 0%, #818cf8 60%, #60a5fa 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>{hl}</span>
        </>
      )
    } else {
      rendered = text
    }
  } else {
    rendered = text
  }

  return (
    <h1 className="hero-h1" style={{
      fontSize: 'clamp(36px, 5.5vw, 62px)', fontWeight: 900,
      lineHeight: 1.1, margin: '0 0 18px',
      letterSpacing: '-1.2px', maxWidth: 680,
      fontFamily: 'var(--font-heading)',
      minHeight: '2.2em',
    }}>
      {rendered}
      <span style={{ color: '#1b78f7', WebkitTextFillColor: '#1b78f7', opacity: cursor ? 1 : 0, marginLeft: 3, transition: 'opacity 0.1s' }}>|</span>
    </h1>
  )
}

const QUICK_GOALS = [
  { id: 'pap',         label: 'PAP' },
  { id: 'internship',  label: 'Estágio' },
  { id: 'group',       label: 'Trabalho de grupo' },
  { id: 'personal',    label: 'Projeto pessoal' },
  { id: 'competition', label: 'Competição' },
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
    if (text && looksLikeSpam(text)) {
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

        /* Tablet */
        @media (max-width: 860px) {
          .features-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }

        @media (max-width: 600px) {
          .hero-section  { min-height: calc(100dvh - 62px) !important; justify-content: center !important; padding: 32px 20px 48px !important; }
          .hero-h1       { font-size: 30px !important; letter-spacing: -0.5px !important; margin-bottom: 12px !important; min-height: auto !important; }
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
          textAlign: 'center',
          padding: '64px 24px',
          position: 'relative',
        }}>
          {/* Badge */}
          <div className="hero-badge" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(27,120,247,0.07)', border: '1px solid rgba(27,120,247,0.18)',
            color: '#5a9ff5', borderRadius: 999,
            padding: '5px 16px', fontSize: 12, fontWeight: 600, marginBottom: 28,
          }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#1b78f7', display: 'inline-block', animation: 'pulse-glow 2s ease-in-out infinite' }} />
            Para estudantes do ensino profissional e universitário
          </div>

          {/* Headline */}
          <TypedHero />

          {/* Subheadline */}
          <p className="hero-sub" style={{
            fontSize: 15, color: colors.subtle, maxWidth: 400,
            lineHeight: 1.5, margin: '0 auto 8px', fontWeight: 400,
          }}>
            Para estudantes que levam os projetos a sério.
          </p>

          {/* Widget */}
          <form
            className="hero-widget"
            onSubmit={handleStart}
            style={{ width: '100%', maxWidth: 720, margin: '40px auto 0' }}
          >
            {/* Pills */}
            <div className="goals-row" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 14 }}>
              {QUICK_GOALS.map(g => (
                <button
                  key={g.id}
                  type="button"
                  className="goal-pill"
                  onClick={() => setSelectedGoal(selectedGoal === g.id ? null : g.id)}
                  style={{
                    background: selectedGoal === g.id ? 'rgba(27,120,247,0.12)' : 'transparent',
                    border: `1px solid ${selectedGoal === g.id ? '#1b78f7' : colors.border}`,
                    color: selectedGoal === g.id ? '#5a9ff5' : colors.muted,
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
                boxShadow: '0 8px 40px rgba(0,0,0,0.45)',
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
                style={{
                  background: '#1b78f7', border: 'none', borderRadius: 12,
                  color: '#fff', width: 48, height: 48,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', flexShrink: 0,
                  transition: 'background 0.15s',
                }}
              >
                {(
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12"/>
                    <polyline points="12 5 19 12 12 19"/>
                  </svg>
                )}
              </button>
            </div>

            {spamError ? (
              <p style={{ color: '#ef4444', fontSize: 12, marginTop: 10, fontWeight: 600, textAlign: 'center' }}>
                Texto inválido — escreve uma descrição real do teu projeto.
              </p>
            ) : (
              <p className="hero-note" style={{ color: colors.subtle, fontSize: 12, marginTop: 14, fontWeight: 500 }}>
                Sem registo · Sem cartão de crédito
              </p>
            )}
          </form>
        </div>
      </div>

      {/* Social proof strip */}
      <div className="social-strip" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 28, padding: '16px 24px',
        borderTop: `1px solid ${colors.border}`,
        borderBottom: `1px solid ${colors.border}`,
        background: 'var(--c-bg-alt)',
        flexWrap: 'wrap',
      }}>
        {[
          { Icon: Users,      color: colors.blue,         text: projectCount != null ? `${projectCount} projetos criados` : 'Centenas de projetos' },
          { Icon: Trophy,     color: colors.yellow,       text: 'Ranking público' },
          { Icon: Sparkles,   color: '#818cf8',           text: 'Análise por IA' },
          { Icon: BadgeCheck, color: colors.green,        text: 'Certificados verificados' },
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
        <div className="features-grid" style={{
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
        <div className="home-ctas" style={{ marginTop: 20, display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
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
