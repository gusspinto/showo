import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Mail, Check } from 'lucide-react'

const C = {
  bg:          '#0d1424',
  card:        '#152030',
  border:      '#1e3050',
  borderBright:'#2a4275',
  blue:        '#1b78f7',
  blueHover:   '#1564d4',
  muted:       '#7d93b0',
  subtle:      '#3d5270',
  text:        '#e8f2ff',
  error:       '#ef4444',
}

function EyeIcon({ visible }) {
  return visible ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  )
}

function PasswordInput({ value, onChange, placeholder }) {
  const [show, setShow] = useState(false)
  const [focused, setFocused] = useState(false)
  return (
    <div style={{ position: 'relative' }}>
      <input
        type={show ? 'text' : 'password'}
        value={value} onChange={onChange} required placeholder={placeholder}
        style={{
          width: '100%', background: C.bg,
          border: `1px solid ${focused ? C.blue : C.border}`,
          borderRadius: 10, padding: '10px 44px 10px 14px',
          color: C.text, fontSize: 15, outline: 'none', fontFamily: 'inherit',
          boxSizing: 'border-box', transition: 'border-color 0.15s',
          boxShadow: focused ? '0 0 0 3px rgba(27,120,247,0.1)' : 'none',
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      <button
        type="button" onClick={() => setShow(s => !s)}
        style={{
          position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
          background: 'none', border: 'none', cursor: 'pointer',
          color: show ? C.blue : C.muted, padding: 0, display: 'flex',
          transition: 'color 0.15s',
        }}
        tabIndex={-1}
      >
        <EyeIcon visible={show} />
      </button>
    </div>
  )
}

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notConfirmed, setNotConfirmed] = useState(false)
  const [resendState, setResendState] = useState('idle') // 'idle' | 'sending' | 'sent'
  const [emailFocused, setEmailFocused] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setNotConfirmed(false)
    setLoading(true)
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (err) {
      if (err.message?.toLowerCase().includes('email not confirmed')) {
        setNotConfirmed(true)
      } else {
        setError('Email ou palavra-passe incorretos.')
      }
    } else {
      navigate('/dashboard')
    }
  }

  async function resendConfirmation() {
    setResendState('sending')
    await supabase.auth.resend({ type: 'signup', email })
    setResendState('sent')
  }

  return (
    <div style={{
      minHeight: '100vh', background: C.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px 16px', fontFamily: 'Inter, sans-serif',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Subtle background glow */}
      <div style={{ position: 'absolute', top: '-10%', left: '50%', transform: 'translateX(-50%)', width: 600, height: 400, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(27,120,247,0.07) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ width: '100%', maxWidth: 400, position: 'relative' }}>

        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <img
            src="/icon_logo.png" alt="Showo"
            style={{ height: 'clamp(44px, 10vw, 56px)', width: 'auto', cursor: 'pointer' }}
            onClick={() => navigate('/')}
          />
        </div>

        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, padding: '36px 32px', boxShadow: '0 8px 40px rgba(0,0,0,0.35)' }}>
          <h1 style={{ color: C.text, fontSize: 22, fontWeight: 700, margin: '0 0 8px' }}>Entrar</h1>
          <p style={{ color: C.muted, fontSize: 14, margin: '0 0 28px' }}>Acede ao teu painel de projetos</p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ color: C.muted, fontSize: 13, fontWeight: 500 }}>Email</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="tu@email.com"
                style={{
                  background: C.bg, border: `1px solid ${emailFocused ? C.blue : C.border}`,
                  borderRadius: 10, padding: '10px 14px', color: C.text, fontSize: 15,
                  outline: 'none', fontFamily: 'inherit', transition: 'border-color 0.15s',
                  boxShadow: emailFocused ? '0 0 0 3px rgba(27,120,247,0.1)' : 'none',
                }}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ color: C.muted, fontSize: 13, fontWeight: 500 }}>Palavra-passe</label>
              <PasswordInput value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
            </div>

            {error && (
              <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, padding: '10px 14px', color: C.error, fontSize: 14 }}>
                {error}
              </div>
            )}

            {notConfirmed && (
              <div style={{ background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.25)', borderRadius: 10, padding: '14px 16px' }}>
                <p style={{ margin: '0 0 10px', color: '#fbbf24', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Mail size={14} style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }} /> Email ainda não confirmado
                </p>
                <p style={{ margin: '0 0 12px', color: '#7d93b0', fontSize: 13, lineHeight: 1.5 }}>
                  Confirma o teu email antes de entrar. Se o link expirou, envia um novo.
                </p>
                {resendState === 'sent' ? (
                  <p style={{ margin: 0, color: '#34d399', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Check size={14} style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }} /> Novo email enviado! Verifica a tua caixa de entrada.
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={resendConfirmation}
                    disabled={resendState === 'sending' || !email}
                    style={{
                      background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)',
                      borderRadius: 7, padding: '8px 16px',
                      color: '#fbbf24', fontSize: 13, fontWeight: 600,
                      cursor: email ? 'pointer' : 'default', fontFamily: 'inherit',
                    }}
                  >
                    {resendState === 'sending' ? 'A enviar...' : 'Reenviar email de confirmação'}
                  </button>
                )}
              </div>
            )}

            <button
              type="submit" disabled={loading}
              style={{
                background: loading ? '#1e3050' : 'linear-gradient(135deg, #1b78f7, #4f46e5)',
                color: '#fff', border: 'none',
                borderRadius: 10, padding: '13px', fontSize: 15, fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                marginTop: 4, transition: 'opacity 0.15s',
                boxShadow: loading ? 'none' : '0 4px 20px rgba(27,120,247,0.35)',
              }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.opacity = '0.88' }}
              onMouseLeave={e => { if (!loading) e.currentTarget.style.opacity = '1' }}
            >
              {loading ? 'A entrar…' : 'Entrar'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', color: C.muted, fontSize: 14, marginTop: 20 }}>
          Não tens conta?{' '}
          <Link to="/register" style={{ color: C.blue, textDecoration: 'none', fontWeight: 500 }}>Regista-te</Link>
        </p>
      </div>
    </div>
  )
}
