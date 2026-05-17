import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Mail } from 'lucide-react'

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

function Field({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ color: C.muted, fontSize: 13, fontWeight: 500 }}>{label}</label>
      {children}
    </div>
  )
}

function EyeIcon({ visible }) {
  return visible ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  )
}

function Input({ type = 'text', value, onChange, placeholder, required }) {
  const [focused, setFocused] = useState(false)
  const [show, setShow] = useState(false)
  const isPassword = type === 'password'
  return (
    <div style={{ position: 'relative' }}>
      <input
        type={isPassword ? (show ? 'text' : 'password') : type}
        value={value} onChange={onChange} placeholder={placeholder} required={required}
        style={{
          width: '100%', background: '#0a1118',
          border: `1px solid ${focused ? C.blue : C.border}`,
          borderRadius: 8, padding: isPassword ? '11px 44px 11px 14px' : '11px 14px',
          color: C.text, fontSize: 15, outline: 'none', fontFamily: 'inherit',
          transition: 'border-color 0.15s', boxSizing: 'border-box',
          boxShadow: focused ? '0 0 0 3px rgba(59,130,246,0.1)' : 'none',
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      {isPassword && (
        <button
          type="button" onClick={() => setShow(s => !s)} tabIndex={-1}
          style={{
            position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', cursor: 'pointer',
            color: show ? C.blue : C.muted, padding: 0, display: 'flex',
            transition: 'color 0.15s',
          }}
        >
          <EyeIcon visible={show} />
        </button>
      )}
    </div>
  )
}

export default function Register() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!name.trim()) { setError('Introduz o teu nome.'); return }
    if (password.length < 6) { setError('A palavra-passe tem de ter pelo menos 6 caracteres.'); return }
    if (password !== confirmPassword) { setError('As palavras-passe não coincidem.'); return }

    setLoading(true)
    const { error: err } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name.trim() } },
    })
    setLoading(false)

    if (err) {
      setError(err.message === 'User already registered'
        ? 'Este email já está registado. Tenta entrar.'
        : 'Algo correu mal. Tenta novamente.')
    } else {
      setDone(true)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: C.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px 16px', fontFamily: 'Inter, sans-serif',
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>

        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <img
            src="/icon_logo.png" alt="Showo"
            style={{ height: 'clamp(44px, 10vw, 56px)', width: 'auto', cursor: 'pointer' }}
            onClick={() => navigate('/')}
          />
        </div>

        {done ? (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: '40px 32px', textAlign: 'center' }}>
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center' }}><Mail size={52} color="#3b82f6" /></div>
            <h2 style={{ color: C.text, fontSize: 20, fontWeight: 700, margin: '0 0 10px' }}>
              Confirma o teu email
            </h2>
            <p style={{ color: C.muted, fontSize: 15, lineHeight: 1.65, margin: '0 0 8px' }}>
              Enviámos um email para
            </p>
            <p style={{ color: C.text, fontSize: 15, fontWeight: 600, margin: '0 0 16px' }}>{email}</p>
            <p style={{ color: C.muted, fontSize: 14, lineHeight: 1.65, margin: '0 0 28px' }}>
              Abre o link no email para ativar a tua conta. Verifica também a pasta de spam.
            </p>
            <button
              onClick={() => navigate('/login')}
              style={{
                background: 'linear-gradient(135deg, #1b78f7, #4f46e5)',
                border: 'none', borderRadius: 10, padding: '12px 28px',
                color: '#fff', fontSize: 14, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit',
                boxShadow: '0 4px 20px rgba(27,120,247,0.35)',
              }}
            >
              Ir para o login
            </button>
          </div>
        ) : (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: '36px 32px' }}>
            <h1 style={{ color: C.text, fontSize: 22, fontWeight: 700, margin: '0 0 6px' }}>Criar conta</h1>
            <p style={{ color: C.muted, fontSize: 14, margin: '0 0 28px' }}>Junta-te ao Showo e apresenta os teus projetos</p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Field label="O teu nome">
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: João Silva" required />
              </Field>
              <Field label="Email">
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@email.com" required />
              </Field>
              <Field label="Palavra-passe">
                <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" required />
              </Field>
              <Field label="Confirmar palavra-passe">
                <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Repete a palavra-passe" required />
              </Field>

              {error && (
                <div style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: 8, padding: '10px 14px', color: C.error, fontSize: 14 }}>
                  {error}
                </div>
              )}

              <button
                type="submit" disabled={loading}
                style={{
                  background: loading ? '#1e3050' : 'linear-gradient(135deg, #1b78f7, #4f46e5)',
                  color: '#fff', border: 'none',
                  borderRadius: 10, padding: '13px', fontSize: 15, fontWeight: 700,
                  cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', marginTop: 4,
                  transition: 'opacity 0.15s',
                  boxShadow: loading ? 'none' : '0 4px 20px rgba(27,120,247,0.35)',
                }}
                onMouseEnter={e => { if (!loading) e.currentTarget.style.opacity = '0.88' }}
                onMouseLeave={e => { if (!loading) e.currentTarget.style.opacity = '1' }}
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
