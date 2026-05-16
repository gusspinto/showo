import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Navbar } from '../components/Navbar'
import { prefillProject } from '../lib/prefillProject'
import Onboarding from '../components/Onboarding'

const colors = {
  bg: '#0d1424',
  card: '#152030',
  border: '#1e3050',
  borderBright: '#2a4275',
  blue: '#3b82f6',
  text: '#e8f2ff',
  muted: '#7d93b0',
  subtle: '#3d5270',
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
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3l1.2 3.6L18 9l-3.6 1.2L12 15l-1.2-3.6L6 9l3.6-1.2z"/>
        <path d="M5 3l.6 1.8L8 6l-1.8.6L5 9l-.6-1.8L2 6l1.8-.6z"/>
      </svg>
    ),
    iconBg: 'rgba(59,130,246,0.12)', iconColor: '#60a5fa',
    title: 'IA avançada',
    desc: 'O Claude analisa o teu projeto e gera um texto profissional automaticamente.',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
      </svg>
    ),
    iconBg: 'rgba(168,85,247,0.12)', iconColor: '#c084fc',
    title: 'Sistema de Missões',
    desc: 'Completa missões para melhorar o score e brilhar no ranking.',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
      </svg>
    ),
    iconBg: 'rgba(234,179,8,0.12)', iconColor: '#fbbf24',
    title: 'Ranking público',
    desc: 'Compara o teu projeto com outros estudantes e sobe na tabela.',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
        <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
      </svg>
    ),
    iconBg: 'rgba(34,197,94,0.12)', iconColor: '#4ade80',
    title: 'Partilha fácil',
    desc: 'Link único + QR code gerado automaticamente para partilhares.',
  },
]

// Map widget tag → formGoal used inside NewProject
const TAG_TO_GOAL = {
  pap:         'school',
  internship:  'internship',
  group:       'school',
  personal:    'show',
  competition: 'show',
}

export default function Home() {
  const navigate = useNavigate()
  const [selectedGoal, setSelectedGoal] = useState(null)
  const [inputText, setInputText] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem('showo_seen_onboarding'))

  async function handleStart(e) {
    e.preventDefault()

    // No text and no tag → go to normal /novo flow
    if (!inputText.trim() && !selectedGoal) {
      navigate('/novo')
      return
    }

    setAnalyzing(true)
    const prefill = await prefillProject(inputText.trim(), selectedGoal)
    setAnalyzing(false)

    navigate('/novo', {
      state: {
        prefill: {
          answers: {
            ...prefill,
            project_type: selectedGoal ?? null,
          },
          formGoal: TAG_TO_GOAL[selectedGoal] ?? 'show',
          fromWidget: true,
        },
      },
    })
  }

  const placeholder = selectedGoal
    ? `Nome do teu ${QUICK_GOALS.find(g => g.id === selectedGoal)?.label.toLowerCase()}...`
    : 'Descreve o teu projeto em poucas palavras...'

  return (
    <div style={{ minHeight: '100vh', backgroundColor: colors.bg, color: colors.text, fontFamily: 'Inter, system-ui, sans-serif' }}>
      {showOnboarding && <Onboarding onDone={() => setShowOnboarding(false)} />}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.3; }
          50%       { opacity: 0.6; }
        }

        .goal-pill { transition: all 0.15s !important; cursor: pointer; }
        .goal-pill:hover {
          border-color: #3b82f6 !important;
          color: #e8f2ff !important;
          background: rgba(59,130,246,0.08) !important;
        }
        .feature-card { transition: all 0.2s ease !important; }
        .feature-card:hover {
          border-color: #2a4275 !important;
          transform: translateY(-4px) !important;
          box-shadow: 0 16px 48px rgba(0,0,0,0.45) !important;
        }
        .submit-btn:hover { background: #2563eb !important; }
        .submit-btn { transition: background 0.15s !important; }
        .home-sec-btn { transition: all 0.15s !important; }
        .home-sec-btn:hover {
          border-color: #3b82f6 !important;
          color: #e8f2ff !important;
          background: rgba(59,130,246,0.06) !important;
        }

        @media (max-width: 600px) {
          .hero-section  { min-height: unset !important; justify-content: flex-start !important; padding: 48px 20px 40px !important; }
          .hero-badge    { display: none !important; }
          .hero-h1       { font-size: 36px !important; letter-spacing: -0.8px !important; margin-bottom: 14px !important; }
          .hero-sub      { font-size: 14px !important; white-space: normal !important; }
          .hero-widget   { margin-top: 52px !important; max-width: 100% !important; }
          .goals-row     { flex-wrap: nowrap !important; overflow-x: auto !important; justify-content: flex-start !important; padding-bottom: 4px !important; scrollbar-width: none !important; }
          .goals-row::-webkit-scrollbar { display: none !important; }
          .goal-pill     { font-size: 11px !important; padding: 5px 12px !important; flex-shrink: 0 !important; }
          .widget-box    { padding: 3px 3px 3px 16px !important; border-radius: 12px !important; }
          .widget-input  { padding: 7px 0 !important; font-size: 14px !important; }
          .submit-btn    { width: 38px !important; height: 38px !important; border-radius: 9px !important; }
          .feature-card  { padding: 18px 16px !important; }
          .feature-h3    { font-size: 14px !important; }
          .feature-p     { font-size: 12px !important; }
        }
      `}</style>

      <Navbar>
        <button
          onClick={() => navigate('/novo')}
          style={{
            background: 'linear-gradient(135deg, #3b82f6, #4f46e5)',
            color: '#fff', border: 'none', borderRadius: 8,
            padding: '9px 20px', fontSize: 14, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit',
            boxShadow: '0 4px 16px rgba(59,130,246,0.3)',
          }}
        >
          Criar projeto
        </button>
      </Navbar>

      {/* Hero — vertically centred in the viewport */}
      <div style={{ position: 'relative', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', top: -80, left: '50%', transform: 'translateX(-50%)',
          width: 800, height: 500, borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(59,130,246,0.08) 0%, transparent 68%)',
          pointerEvents: 'none', animation: 'pulse-glow 5s ease-in-out infinite',
        }} />

        <div style={{
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
            background: 'rgba(59,130,246,0.07)', border: '1px solid rgba(59,130,246,0.18)',
            color: '#60a5fa', borderRadius: 999,
            padding: '5px 16px', fontSize: 12, fontWeight: 600, marginBottom: 32,
          }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#3b82f6', display: 'inline-block', animation: 'pulse-glow 2s ease-in-out infinite' }} />
            Para estudantes do ensino profissional e universitário
          </div>

          {/* H1 */}
          <h1 className="hero-h1" style={{
            fontSize: 'clamp(36px, 5.5vw, 62px)', fontWeight: 900,
            lineHeight: 1.08, margin: '0 0 18px',
            letterSpacing: '-1.2px', maxWidth: 640,
          }}>
            O teu projeto merece<br />
            <span style={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #818cf8 60%, #60a5fa 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>
              uma página incrível
            </span>
          </h1>

          {/* Subtitle — one line, no maxWidth restriction */}
          <p className="hero-sub" style={{
            fontSize: 16, color: colors.muted, lineHeight: 1.6,
            margin: 0, fontWeight: 400, whiteSpace: 'nowrap',
          }}>
            Transforma qualquer projeto numa página profissional com IA, em minutos.
          </p>

          {/* Widget — wider than the title */}
          <form
            className="hero-widget"
            onSubmit={handleStart}
            style={{ width: '100%', maxWidth: 720, margin: '126px auto 0' }}
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
                    background: selectedGoal === g.id ? 'rgba(59,130,246,0.12)' : 'transparent',
                    border: `1px solid ${selectedGoal === g.id ? '#3b82f6' : colors.border}`,
                    color: selectedGoal === g.id ? '#60a5fa' : colors.muted,
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
              style={{
                display: 'flex', alignItems: 'center',
                background: '#111c32',
                border: `1.5px solid ${colors.borderBright}`,
                borderRadius: 16, padding: '6px 6px 6px 20px',
                boxShadow: '0 8px 40px rgba(0,0,0,0.45)',
              }}
              onFocusCapture={e => { e.currentTarget.style.borderColor = '#3b82f6' }}
              onBlurCapture={e => { if (!e.currentTarget.contains(e.relatedTarget)) e.currentTarget.style.borderColor = colors.borderBright }}
            >
              <input
                type="text"
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                placeholder={placeholder}
                style={{
                  flex: 1, background: 'transparent', border: 'none',
                  color: colors.text, fontSize: 16, fontFamily: 'inherit',
                  outline: 'none', minWidth: 0, padding: '10px 0',
                }}
              />
              <button
                type="submit"
                disabled={analyzing}
                className="submit-btn"
                style={{
                  background: analyzing ? '#1e3050' : '#3b82f6', border: 'none', borderRadius: 12,
                  color: '#fff', width: 48, height: 48,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: analyzing ? 'not-allowed' : 'pointer', flexShrink: 0,
                  transition: 'background 0.15s',
                }}
              >
                {analyzing ? (
                  <div style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid #fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12"/>
                    <polyline points="12 5 19 12 12 19"/>
                  </svg>
                )}
              </button>
            </div>

            <p style={{ color: colors.subtle, fontSize: 12, marginTop: 12, fontWeight: 500 }}>
              Sem registo · Sem cartão de crédito
            </p>
          </form>
        </div>
      </div>

      {/* Features — below the fold */}
      <div style={{
        maxWidth: 1000, margin: '0 auto',
        padding: '0 24px 80px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 14,
      }}>
        {FEATURES.map(f => (
          <div key={f.title} className="feature-card" style={{
            background: colors.card, border: `1px solid ${colors.border}`,
            borderRadius: 18, padding: '24px 22px',
            boxShadow: '0 2px 16px rgba(0,0,0,0.25)',
          }}>
            <div style={{
              width: 42, height: 42, borderRadius: 11,
              background: f.iconBg, color: f.iconColor,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 14, border: `1px solid ${f.iconBg.replace('0.12', '0.2')}`,
            }}>
              {f.icon}
            </div>
            <h3 className="feature-h3" style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 700, color: colors.text, letterSpacing: '-0.1px' }}>{f.title}</h3>
            <p className="feature-p" style={{ margin: 0, color: colors.muted, fontSize: 13, lineHeight: 1.65 }}>{f.desc}</p>
          </div>
        ))}
      </div>

      {/* Secondary CTAs */}
      <div style={{ padding: '0 24px 96px', display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
        <button onClick={() => navigate('/explorar')} className="home-sec-btn"
          style={{ background: 'transparent', color: colors.muted, border: `1px solid ${colors.border}`, borderRadius: 8, padding: '10px 22px', fontSize: 13, cursor: 'pointer', fontWeight: 500, fontFamily: 'inherit' }}>
          Ver projetos públicos
        </button>
        <button onClick={() => navigate('/ranking')} className="home-sec-btn"
          style={{ background: 'transparent', color: colors.muted, border: `1px solid ${colors.border}`, borderRadius: 8, padding: '10px 22px', fontSize: 13, cursor: 'pointer', fontWeight: 500, fontFamily: 'inherit' }}>
          Ver ranking
        </button>
      </div>
    </div>
  )
}
