import { useNavigate } from 'react-router-dom'
import { Navbar } from '../components/Navbar'

const colors = {
  bg: '#1c2333',
  blue: '#3b82f6',
  blueHover: '#2563eb',
  text: '#ffffff',
  muted: '#94a3b8',
  card: '#232d42',
  border: '#2e3a54',
}

export default function Home() {
  const navigate = useNavigate()

  return (
    <div style={{ minHeight: '100vh', backgroundColor: colors.bg, color: colors.text, fontFamily: 'system-ui, sans-serif' }}>
      <Navbar>
        <button
          onClick={() => navigate('/novo')}
          style={{ background: colors.blue, color: '#fff', border: 'none', borderRadius: 8, padding: '9px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
        >
          Criar projeto
        </button>
      </Navbar>

      {/* Hero */}
      <div style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center', padding: '80px 24px 60px' }}>
        <div style={{ display: 'inline-block', background: '#1e3a5f', color: colors.blue, borderRadius: 999, padding: '6px 18px', fontSize: 13, fontWeight: 600, marginBottom: 24 }}>
          Para estudantes do ensino profissional e universitário
        </div>
        <h1 style={{ fontSize: 'clamp(34px, 6vw, 62px)', fontWeight: 800, lineHeight: 1.1, margin: '0 0 24px' }}>
          O teu projeto merece<br />
          <span style={{ color: colors.blue }}>uma página incrível</span>
        </h1>
        <p style={{ fontSize: 18, color: colors.muted, lineHeight: 1.7, marginBottom: 40, maxWidth: 520, margin: '0 auto 40px' }}>
          Transforma qualquer projeto — PAP, trabalho de grupo ou projeto pessoal — numa página profissional com IA. Partilha com recrutadores, professores e o mundo.
        </p>
        <button
          onClick={() => navigate('/novo')}
          style={{ background: colors.blue, color: '#fff', border: 'none', borderRadius: 12, padding: '15px 36px', fontSize: 18, fontWeight: 700, cursor: 'pointer', transition: 'background 0.2s' }}
          onMouseOver={e => (e.target.style.background = colors.blueHover)}
          onMouseOut={e => (e.target.style.background = colors.blue)}
        >
          Criar página gratuita →
        </button>
        <p style={{ color: colors.muted, fontSize: 13, marginTop: 14 }}>Sem registo. Sem cartão de crédito.</p>
      </div>

      {/* Features */}
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 24px 60px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
        {[
          { icon: '🤖', title: 'IA avançada', desc: 'O Claude analisa o teu projeto e gera um texto profissional e atraente.' },
          { icon: '🎮', title: 'Sistema de Missões', desc: 'Completa missões para melhorar o score e deixar o teu projeto brilhar.' },
          { icon: '🏆', title: 'Ranking público', desc: 'Compara o teu projeto com outros estudantes e sobe no ranking.' },
          { icon: '🔗', title: 'Partilha fácil', desc: 'Link único + QR code para partilhares em segundos.' },
        ].map(f => (
          <div key={f.title} style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 16, padding: 24 }}>
            <div style={{ fontSize: 30, marginBottom: 12 }}>{f.icon}</div>
            <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700 }}>{f.title}</h3>
            <p style={{ margin: 0, color: colors.muted, fontSize: 14, lineHeight: 1.6 }}>{f.desc}</p>
          </div>
        ))}
      </div>

      <div style={{ textAlign: 'center', padding: '0 24px 80px', display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        <button onClick={() => navigate('/explorar')} style={{ background: colors.card, color: colors.muted, border: `1px solid ${colors.border}`, borderRadius: 10, padding: '12px 22px', fontSize: 14, cursor: 'pointer', fontWeight: 600 }}>
          🔍 Ver projetos públicos
        </button>
        <button onClick={() => navigate('/ranking')} style={{ background: colors.card, color: colors.muted, border: `1px solid ${colors.border}`, borderRadius: 10, padding: '12px 22px', fontSize: 14, cursor: 'pointer', fontWeight: 600 }}>
          🏆 Ver ranking
        </button>
      </div>
    </div>
  )
}
