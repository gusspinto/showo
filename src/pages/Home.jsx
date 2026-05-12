import { useNavigate } from 'react-router-dom'
import { Navbar } from '../components/Navbar'

const colors = {
  bg: '#0d1424',
  bgAlt: '#111c32',
  card: '#152030',
  cardHover: '#1c2d44',
  border: '#1e3050',
  borderBright: '#2a4275',
  blue: '#3b82f6',
  blueHover: '#2563eb',
  blueGlow: 'rgba(59,130,246,0.2)',
  blueSubtle: 'rgba(59,130,246,0.08)',
  text: '#e8f2ff',
  muted: '#7d93b0',
  subtle: '#3d5270',
}

const FEATURES = [
  {
    icon: '✨',
    iconBg: 'rgba(59,130,246,0.12)',
    iconColor: '#60a5fa',
    title: 'IA avançada',
    desc: 'O Claude analisa o teu projeto e gera um texto profissional e atraente automaticamente.',
  },
  {
    icon: '🎮',
    iconBg: 'rgba(168,85,247,0.12)',
    iconColor: '#c084fc',
    title: 'Sistema de Missões',
    desc: 'Completa missões para melhorar o score e deixar o teu projeto brilhar no ranking.',
  },
  {
    icon: '🏆',
    iconBg: 'rgba(234,179,8,0.12)',
    iconColor: '#fbbf24',
    title: 'Ranking público',
    desc: 'Compara o teu projeto com outros estudantes e sobe na classificação global.',
  },
  {
    icon: '🔗',
    iconBg: 'rgba(34,197,94,0.12)',
    iconColor: '#4ade80',
    title: 'Partilha fácil',
    desc: 'Link único + QR code gerado automaticamente para partilhares em segundos.',
  },
]

export default function Home() {
  const navigate = useNavigate()

  return (
    <div style={{ minHeight: '100vh', backgroundColor: colors.bg, color: colors.text, fontFamily: 'Inter, system-ui, sans-serif' }}>
      <style>{`
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 0.8; }
        }
        .home-cta-btn:hover {
          background: linear-gradient(135deg, #2563eb, #4f46e5) !important;
          box-shadow: 0 8px 32px rgba(59,130,246,0.5) !important;
          transform: translateY(-1px) !important;
        }
        .home-cta-btn { transition: all 0.2s ease !important; }
        .home-secondary-btn:hover {
          border-color: #3b82f6 !important;
          color: #e8f2ff !important;
          background: rgba(59,130,246,0.08) !important;
        }
        .home-secondary-btn { transition: all 0.2s ease !important; }
        .feature-card:hover {
          border-color: #2a4275 !important;
          transform: translateY(-3px) !important;
          box-shadow: 0 12px 40px rgba(0,0,0,0.4) !important;
        }
        .feature-card { transition: all 0.2s ease !important; }
      `}</style>

      <Navbar>
        <button
          onClick={() => navigate('/novo')}
          style={{
            background: 'linear-gradient(135deg, #3b82f6, #4f46e5)',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '9px 20px',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'inherit',
            boxShadow: '0 4px 16px rgba(59,130,246,0.3)',
          }}
        >
          Criar projeto
        </button>
      </Navbar>

      {/* Ambient glow behind hero */}
      <div style={{ position: 'relative', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', top: -120, left: '50%', transform: 'translateX(-50%)',
          width: 600, height: 400, borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(59,130,246,0.12) 0%, transparent 70%)',
          pointerEvents: 'none', animation: 'pulse-glow 4s ease-in-out infinite',
        }} />

        {/* Hero */}
        <div style={{ maxWidth: 760, margin: '0 auto', textAlign: 'center', padding: '88px 24px 72px', position: 'relative' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(59,130,246,0.08)',
            border: '1px solid rgba(59,130,246,0.2)',
            color: '#60a5fa',
            borderRadius: 999, padding: '6px 18px', fontSize: 13, fontWeight: 600, marginBottom: 28,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#3b82f6', display: 'inline-block', animation: 'pulse-glow 2s ease-in-out infinite' }} />
            Para estudantes do ensino profissional e universitário
          </div>

          <h1 style={{ fontSize: 'clamp(36px, 6vw, 66px)', fontWeight: 900, lineHeight: 1.08, margin: '0 0 28px', letterSpacing: '-1.5px' }}>
            O teu projeto merece<br />
            <span style={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #818cf8 60%, #60a5fa 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              uma página incrível
            </span>
          </h1>

          <p style={{ fontSize: 18, color: colors.muted, lineHeight: 1.75, marginBottom: 44, maxWidth: 540, margin: '0 auto 44px', fontWeight: 400 }}>
            Transforma qualquer projeto — PAP, trabalho de grupo ou pessoal — numa página profissional com IA. Partilha com recrutadores, professores e o mundo.
          </p>

          <button
            onClick={() => navigate('/novo')}
            className="home-cta-btn"
            style={{
              background: 'linear-gradient(135deg, #3b82f6, #4f46e5)',
              color: '#fff',
              border: 'none',
              borderRadius: 14,
              padding: '17px 44px',
              fontSize: 18,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'inherit',
              boxShadow: '0 6px 28px rgba(59,130,246,0.4)',
              letterSpacing: '-0.2px',
            }}
          >
            Criar página gratuita →
          </button>
          <p style={{ color: colors.subtle, fontSize: 13, marginTop: 16, fontWeight: 500 }}>
            Sem registo. Sem cartão de crédito.
          </p>
        </div>
      </div>

      {/* Features */}
      <div style={{ maxWidth: 980, margin: '0 auto', padding: '0 24px 64px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        {FEATURES.map(f => (
          <div
            key={f.title}
            className="feature-card"
            style={{
              background: colors.card,
              border: `1px solid ${colors.border}`,
              borderRadius: 18,
              padding: '26px 24px',
              boxShadow: '0 2px 16px rgba(0,0,0,0.3)',
            }}
          >
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: f.iconBg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, marginBottom: 16,
              border: `1px solid ${f.iconBg.replace('0.12', '0.2')}`,
            }}>
              {f.icon}
            </div>
            <h3 style={{ margin: '0 0 10px', fontSize: 16, fontWeight: 700, color: colors.text, letterSpacing: '-0.2px' }}>{f.title}</h3>
            <p style={{ margin: 0, color: colors.muted, fontSize: 14, lineHeight: 1.65 }}>{f.desc}</p>
          </div>
        ))}
      </div>

      {/* Secondary CTAs */}
      <div style={{ textAlign: 'center', padding: '0 24px 96px', display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
        <button
          onClick={() => navigate('/explorar')}
          className="home-secondary-btn"
          style={{
            background: colors.card,
            color: colors.muted,
            border: `1px solid ${colors.border}`,
            borderRadius: 10,
            padding: '12px 24px',
            fontSize: 14,
            cursor: 'pointer',
            fontWeight: 600,
            fontFamily: 'inherit',
          }}
        >
          Ver projetos públicos
        </button>
        <button
          onClick={() => navigate('/ranking')}
          className="home-secondary-btn"
          style={{
            background: colors.card,
            color: colors.muted,
            border: `1px solid ${colors.border}`,
            borderRadius: 10,
            padding: '12px 24px',
            fontSize: 14,
            cursor: 'pointer',
            fontWeight: 600,
            fontFamily: 'inherit',
          }}
        >
          Ver ranking
        </button>
      </div>
    </div>
  )
}
