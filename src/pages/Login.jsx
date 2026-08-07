import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { claimAnonymousProjects } from '../lib/claimAnonymousProjects'
import { Mail, Check } from 'lucide-react'
import AuthSidePanel from '../components/AuthSidePanel'
import GoogleButton from '../components/GoogleButton'
import { useTheme } from '../context/ThemeContext'

const C = {
  bg:          'var(--color-bg)',
  border:      'var(--color-border)',
  blue:        'var(--color-primary)',
  muted:       'var(--color-text-secondary)',
  text:        'var(--color-text)',
  error:       'var(--color-error)',
}

const LOGIN_PHRASES = [
  { lead: 'Mostra o que', highlight: 'fizeste.' },
  { lead: 'O teu trabalho,', highlight: 'não o teu CV.' },
  { lead: 'Continua a', highlight: 'construir.' },
]

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
    <div className="auth-field-wrap" style={{ borderBottomColor: focused ? C.blue : C.border }}>
      <input
        type={show ? 'text' : 'password'}
        value={value} onChange={onChange} required placeholder={placeholder}
        className="auth-input"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      <button
        type="button" onClick={() => setShow(s => !s)}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: show ? C.blue : C.muted, padding: 0, display: 'flex',
          transition: 'color 0.15s', flexShrink: 0,
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
  const location = useLocation()
  const { theme } = useTheme()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notConfirmed, setNotConfirmed] = useState(false)
  const [resendState, setResendState] = useState('idle') // 'idle' | 'sending' | 'sent'
  const [emailFocused, setEmailFocused] = useState(false)
  const startForgot = new URLSearchParams(location.search).get('forgot') === '1'
  const [mode, setMode] = useState(startForgot ? 'forgot' : 'login') // 'login' | 'forgot'
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotSent, setForgotSent] = useState(false)
  const [forgotLoading, setForgotLoading] = useState(false)

  async function handleForgotPassword(e) {
    e.preventDefault()
    if (!forgotEmail.trim()) return
    setForgotLoading(true)
    await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
      redirectTo: `${window.location.origin}/recuperar-password`,
    })
    setForgotLoading(false)
    // Always show success — don't reveal whether the email is registered
    setForgotSent(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setNotConfirmed(false)
    setLoading(true)

    // Fire both in parallel instead of gating sign-in behind the email-exists
    // check — the common case (correct credentials) then only waits on
    // signInWithPassword itself, instead of paying for both round trips back
    // to back on every login attempt.
    const emailExistsPromise = supabase.rpc('check_email_exists', { p_email: email.trim() })
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)

    if (!err) {
      const { data: { user: loggedUser } } = await supabase.auth.getUser()
      if (loggedUser) claimAnonymousProjects(loggedUser.id)
      navigate('/dashboard')
      return
    }

    if (err.message?.toLowerCase().includes('email not confirmed')) {
      setNotConfirmed(true)
      return
    }

    // Wrong password or unknown account — check which, using the result that's
    // already been in flight since the request started.
    const { data: emailExists, error: emailCheckError } = await emailExistsPromise
    if (emailCheckError) {
      setError('Demasiadas tentativas. Aguarda um pouco e tenta novamente.')
    } else if (!emailExists) {
      setError('Esta conta não existe. Verifica o email ou cria uma conta.')
    } else {
      setError('Palavra-passe incorreta.')
    }
  }

  async function resendConfirmation() {
    setResendState('sending')
    await supabase.auth.resend({ type: 'signup', email })
    setResendState('sent')
  }

  return (
    <div className="auth-shell">
      <style>{`
        @media (min-width: 601px) { body { padding-left: 0 !important; } .sidebar { display: none !important; } }
        .auth-shell { min-height: 100vh; display: flex; background: var(--color-bg); font-family: inherit; }
        .auth-side {
          position: relative; overflow: hidden;
          flex: 0 0 42%; display: flex; align-items: center; justify-content: flex-start;
          padding: 0 0 0 64px; background: linear-gradient(115deg, #000 0%, #050b1c 40%, #0e2249 85%, #143169 100%);
          border-right: 1px solid var(--color-border);
        }
        .auth-side-content {
          position: relative; z-index: 3;
          display: flex; flex-direction: column; align-items: flex-start; gap: 22px;
          text-align: left;
        }
        .auth-side-mark { width: 160px; height: auto; display: block; }
        .auth-side-phrase {
          font-family: var(--font-heading); font-weight: 400;
          font-size: clamp(22px, 2.6vw, 36px); line-height: 1.3;
          letter-spacing: -0.5px; color: #fff; margin: 0;
          white-space: nowrap; text-align: left;
          animation: auth-phrase-fade 0.6s ease;
        }
        @keyframes auth-phrase-fade {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .auth-side-highlight {
          background: var(--color-primary); color: #fff;
          padding: 2px 10px 9px; border-radius: 0 0 14px 14px;
          display: inline-block;
        }
        .auth-side-letter {
          display: inline-block;
          animation: auth-letter-rise 0.45s ease both;
        }
        @keyframes auth-letter-rise {
          from { opacity: 0; transform: translateY(60%); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .auth-side-progress {
          position: absolute; left: 64px; right: 56px; bottom: 48px;
          display: flex; align-items: center; gap: 6px; z-index: 3;
        }
        .auth-side-seg {
          flex: 1; height: 2px; border-radius: 2px;
          background: rgba(255,255,255,0.18);
          transition: background 0.3s;
        }
        .auth-side-seg.filled { background: #4a93f9; }
        .auth-main { flex: 1; display: flex; align-items: center; justify-content: center; padding: 24px 16px; }
        .auth-card { width: 100%; max-width: 380px; }
        .auth-input,
        body.light .auth-input {
          flex: 1; width: 100%; background: transparent !important; border: none;
          color: var(--color-text); font-size: 16px; outline: none; font-family: inherit;
          padding: 10px 0; box-sizing: border-box;
        }
        .auth-field-wrap {
          display: flex; align-items: center; gap: 10px;
          border-bottom: 1.5px solid var(--color-border); transition: border-color 0.15s;
        }
        .auth-submit { transition: opacity 0.15s; }
        .auth-submit:hover:not(:disabled) { opacity: 0.88; }
        .auth-input:-webkit-autofill,
        .auth-input:-webkit-autofill:hover,
        .auth-input:-webkit-autofill:focus {
          -webkit-text-fill-color: var(--color-text) !important;
          -webkit-box-shadow: 0 0 0 1000px var(--color-bg) inset !important;
          box-shadow: 0 0 0 1000px var(--color-bg) inset !important;
          caret-color: var(--color-text) !important;
          transition: background-color 9999s ease-in-out 0s;
        }
        .login-forgot-link { transition: opacity 0.15s; }
        .login-forgot-link:hover { opacity: 1 !important; }
        @media (max-width: 860px) {
          .auth-side { display: none; }
        }
      `}</style>

      <AuthSidePanel phrases={LOGIN_PHRASES} step={1} totalSteps={1} />

      <div className="auth-main">
        <div className="auth-card">
          <div className="auth-main-logo" style={{ marginBottom: 36 }}>
            <img
              src={theme === 'light' ? '/lightmode_icon_logo.png' : '/darkmode_icon_logo.png'}
              alt="Showo"
              style={{ height: 32, width: 'auto', cursor: 'pointer', objectFit: 'contain' }}
              onClick={() => navigate('/')}
            />
          </div>

          {mode === 'forgot' ? (
            <>
              <h1 style={{ color: C.text, fontSize: 26, fontWeight: 400, fontFamily: 'var(--font-heading)', margin: '0 0 8px', letterSpacing: '-0.5px' }}>Recuperar acesso</h1>
              <p style={{ color: C.muted, fontSize: 14, margin: '0 0 32px' }}>Enviamos-te um link para definires uma nova palavra-passe</p>

              {forgotSent ? (
                <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 10, padding: '16px 18px' }}>
                  <p style={{ margin: '0 0 6px', color: 'var(--color-success)', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Check size={14} /> Verifica o teu email
                  </p>
                  <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: 13, lineHeight: 1.5 }}>
                    Se existir uma conta com o email <strong style={{ color: C.text }}>{forgotEmail}</strong>, vais receber um link para repor a palavra-passe.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <label style={{ color: C.muted, fontSize: 13, fontWeight: 500 }}>Email</label>
                    <div className="auth-field-wrap" style={{ borderBottomColor: C.border }}>
                      <input
                        type="email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} required placeholder="tu@email.com"
                        className="auth-input"
                      />
                    </div>
                  </div>
                  <button
                    type="submit" disabled={forgotLoading}
                    className="auth-submit"
                    style={{
                      background: forgotLoading ? 'var(--color-border)' : 'var(--color-primary)',
                      color: '#fff', border: 'none',
                      borderRadius: 10, padding: '12px 0', fontSize: 15, fontWeight: 700,
                      cursor: forgotLoading ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    {forgotLoading ? 'A enviar…' : 'Enviar link de recuperação'}
                  </button>
                </form>
              )}

              <p style={{ textAlign: 'center', color: C.muted, fontSize: 14, marginTop: 24 }}>
                <button
                  type="button"
                  onClick={() => { setMode('login'); setForgotSent(false) }}
                  style={{ background: 'none', border: 'none', color: C.blue, fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}
                >
                  Voltar a entrar
                </button>
              </p>
            </>
          ) : (
          <>
          <h1 style={{ color: C.text, fontSize: 26, fontWeight: 400, fontFamily: 'var(--font-heading)', margin: '0 0 8px', letterSpacing: '-0.5px' }}>Entrar</h1>
          <p style={{ color: C.muted, fontSize: 14, margin: '0 0 28px' }}>Acede ao teu painel de projetos</p>

          <GoogleButton variant="subtle" />

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '18px 0' }}>
            <div style={{ flex: 1, height: 1, background: C.border }} />
            <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)', fontWeight: 600 }}>ou</span>
            <div style={{ flex: 1, height: 1, background: C.border }} />
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ color: C.muted, fontSize: 13, fontWeight: 500 }}>Email</label>
              <div className="auth-field-wrap" style={{ borderBottomColor: emailFocused ? C.blue : C.border }}>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="tu@email.com"
                  className="auth-input"
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                />
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label style={{ color: C.muted, fontSize: 13, fontWeight: 500 }}>Palavra-passe</label>
                <button
                  type="button"
                  className="login-forgot-link"
                  onClick={() => { setMode('forgot'); setForgotEmail(email) }}
                  style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', padding: 0, opacity: 1 }}
                >
                  Esqueceste-te da password?
                </button>
              </div>
              <PasswordInput value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
            </div>

            {error && (
              <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, padding: '10px 14px', color: C.error, fontSize: 14 }}>
                {error}
              </div>
            )}

            {notConfirmed && (
              <div style={{ background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.25)', borderRadius: 10, padding: '14px 16px' }}>
                <p style={{ margin: '0 0 10px', color: 'var(--color-warning)', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Mail size={14} style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }} /> Email ainda não confirmado
                </p>
                <p style={{ margin: '0 0 12px', color: 'var(--color-text-secondary)', fontSize: 13, lineHeight: 1.5 }}>
                  Confirma o teu email antes de entrar. Se o link expirou, envia um novo.
                </p>
                {resendState === 'sent' ? (
                  <p style={{ margin: 0, color: 'var(--color-success)', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
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
                      color: 'var(--color-warning)', fontSize: 13, fontWeight: 600,
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
              className="auth-submit"
              style={{
                background: loading ? 'var(--color-border)' : 'var(--color-primary)',
                color: '#fff', border: 'none',
                borderRadius: 10, padding: '12px 0', fontSize: 15, fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                marginTop: 4,
              }}
            >
              {loading ? 'A entrar…' : 'Entrar'}
            </button>
          </form>

          <p style={{ textAlign: 'center', color: C.muted, fontSize: 14, marginTop: 24 }}>
            Não tens conta?{' '}
            <Link to="/register" style={{ color: C.blue, textDecoration: 'none', fontWeight: 500 }}>Regista-te</Link>
          </p>
          </>
          )}
        </div>
      </div>
    </div>
  )
}
