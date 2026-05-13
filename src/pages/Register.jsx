import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const C = {
  bg: '#0d1424',
  card: '#111827',
  border: '#1e3050',
  blue: '#3b82f6',
  blueHover: '#2563eb',
  muted: '#7d93b0',
  text: '#e8f2ff',
  error: '#f87171',
}

export default function Register() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (password.length < 6) { setError('A palavra-passe tem de ter pelo menos 6 caracteres.'); return }
    setLoading(true)
    const { error: err } = await supabase.auth.signUp({ email, password })
    setLoading(false)
    if (err) {
      setError(err.message === 'User already registered' ? 'Este email já está registado. Tenta entrar.' : 'Algo correu mal. Tenta novamente.')
    } else {
      setDone(true)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: C.bg,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
      fontFamily: 'Inter, sans-serif',
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>

        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <img src="/logo-3.png" alt="Showo" style={{ width: 'clamp(130px, 40vw, 180px)', height: 'auto', cursor: 'pointer' }} onClick={() => navigate('/')} />
        </div>

        {done ? (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: '40px 32px', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📬</div>
            <h2 style={{ color: C.text, fontSize: 20, fontWeight: 700, margin: '0 0 10px' }}>Confirma o teu email</h2>
            <p style={{ color: C.muted, fontSize: 15, lineHeight: 1.6, margin: '0 0 24px' }}>
              Enviámos um link de confirmação para <strong style={{ color: C.text }}>{email}</strong>. Abre-o para ativar a conta.
            </p>
            <button onClick={() => navigate('/login')} style={{ background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 24px', color: C.muted, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
              Ir para o login
            </button>
          </div>
        ) : (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: '36px 32px' }}>
            <h1 style={{ color: C.text, fontSize: 22, fontWeight: 700, margin: '0 0 8px' }}>Criar conta</h1>
            <p style={{ color: C.muted, fontSize: 14, margin: '0 0 28px' }}>Junta-te ao Showo e guarda os teus projetos</p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ color: C.muted, fontSize: 13, fontWeight: 500 }}>Email</label>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="tu@email.com"
                  style={{ background: '#0d1424', border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 14px', color: C.text, fontSize: 15, outline: 'none', fontFamily: 'inherit' }}
                  onFocus={e => e.target.style.borderColor = C.blue}
                  onBlur={e => e.target.style.borderColor = C.border}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ color: C.muted, fontSize: 13, fontWeight: 500 }}>Palavra-passe</label>
                <input
                  type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Mínimo 6 caracteres"
                  style={{ background: '#0d1424', border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 14px', color: C.text, fontSize: 15, outline: 'none', fontFamily: 'inherit' }}
                  onFocus={e => e.target.style.borderColor = C.blue}
                  onBlur={e => e.target.style.borderColor = C.border}
                />
              </div>

              {error && (
                <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 8, padding: '10px 14px', color: C.error, fontSize: 14 }}>
                  {error}
                </div>
              )}

              <button
                type="submit" disabled={loading}
                style={{ background: loading ? '#1e3050' : C.blue, color: '#fff', border: 'none', borderRadius: 8, padding: '12px', fontSize: 15, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', marginTop: 4 }}
                onMouseEnter={e => { if (!loading) e.target.style.background = C.blueHover }}
                onMouseLeave={e => { if (!loading) e.target.style.background = C.blue }}
              >
                {loading ? 'A criar conta…' : 'Criar conta'}
              </button>
            </form>
          </div>
        )}

        {!done && (
          <p style={{ textAlign: 'center', color: C.muted, fontSize: 14, marginTop: 20 }}>
            Já tens conta?{' '}
            <Link to="/login" style={{ color: C.blue, textDecoration: 'none', fontWeight: 500 }}>Entrar</Link>
          </p>
        )}
      </div>
    </div>
  )
}
