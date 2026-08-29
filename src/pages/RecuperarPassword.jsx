import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { CheckCircleIcon as Check } from '@solar-icons/react/bold/check-circle'
import AuthSidePanel from '../components/AuthSidePanel'
import { useTheme } from '../context/ThemeContext'

const C = {
  bg:     'var(--color-bg)',
  border: 'var(--color-border)',
  blue:   'var(--color-primary)',
  muted:  'var(--color-text-secondary)',
  text:   'var(--color-text)',
  error:  'var(--color-error)',
}

const PHRASES = [{ lead: 'Quase lá,', highlight: 'nova palavra-passe.' }]

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

function PasswordField({ label, value, onChange, placeholder }) {
  const [show, setShow] = useState(false)
  const [focused, setFocused] = useState(false)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <label style={{ color: C.muted, fontSize: 13, fontWeight: 500 }}>{label}</label>
      <div className="auth-field-wrap" style={{ borderBottomColor: focused ? C.blue : C.border }}>
        <input
          type={show ? 'text' : 'password'}
          value={value} onChange={onChange} placeholder={placeholder} required
          className="auth-input"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        <button
          type="button" onClick={() => setShow(s => !s)} tabIndex={-1}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: show ? C.blue : C.muted, padding: 0, display: 'flex', transition: 'color 0.15s', flexShrink: 0 }}
        >
          <EyeIcon visible={show} />
        </button>
      </div>
    </div>
  )
}

export default function RecuperarPassword({ onDone }) {
  const navigate = useNavigate()
  const { theme } = useTheme()
  const [status, setStatus] = useState('checking') // 'checking' | 'ready' | 'invalid'
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  // The recovery link logs the user in with a temporary session and fires
  // a PASSWORD_RECOVERY auth event. If neither that event nor an existing
  // session shows up quickly, the link is missing/expired/already used.
  useEffect(() => {
    let resolved = false
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') { resolved = true; setStatus('ready') }
    })
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) { resolved = true; setStatus('ready') }
    })
    const timer = setTimeout(() => { if (!resolved) { setStatus('invalid'); onDone?.() } }, 3000)
    return () => { subscription.unsubscribe(); clearTimeout(timer) }
  }, [onDone])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (password.length < 6) { setError('A palavra-passe tem de ter pelo menos 6 caracteres.'); return }
    if (password !== confirmPassword) { setError('As palavras-passe não coincidem.'); return }

    setLoading(true)
    const { error: err } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (err) { setError('Não foi possível atualizar a palavra-passe. Tenta pedir um novo link.'); return }
    setDone(true)
    onDone?.()
    setTimeout(() => navigate('/dashboard'), 1800)
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
        .auth-side-content { position: relative; z-index: 3; display: flex; flex-direction: column; align-items: flex-start; gap: 22px; text-align: left; }
        .auth-side-mark { width: 72px; height: auto; display: block; }
        .auth-side-phrase {
          font-family: var(--font-heading); font-weight: 400;
          font-size: clamp(22px, 2.6vw, 36px); line-height: 1.3;
          letter-spacing: -0.5px; color: #fff; margin: 0; text-align: left;
        }
        .auth-side-highlight { background: var(--color-primary); color: #fff; padding: 2px 10px 9px; border-radius: 0 0 14px 14px; display: inline-block; }
        .auth-side-letter { display: inline-block; }
        .auth-main { flex: 1; display: flex; align-items: center; justify-content: center; padding: 24px 16px; }
        .auth-card { width: 100%; max-width: 380px; }
        .auth-input, body.light .auth-input {
          flex: 1; width: 100%; background: transparent !important; border: none;
          color: var(--color-text); font-size: 16px; outline: none; font-family: inherit;
          padding: 10px 0; box-sizing: border-box;
        }
        .auth-field-wrap { display: flex; align-items: center; gap: 10px; border-bottom: 1.5px solid var(--color-border); transition: border-color 0.15s; }
        .auth-submit { transition: opacity 0.15s; }
        .auth-submit:hover:not(:disabled) { opacity: 0.88; }
        @media (max-width: 860px) { .auth-side { display: none; } }
      `}</style>

      <AuthSidePanel phrases={PHRASES} />

      <div className="auth-main">
        <div className="auth-card">
          <div style={{ marginBottom: 36 }}>
            <img
              src="/icon.png" alt="Showo"
              style={{ height: 32, width: 32, cursor: 'pointer', objectFit: 'contain' }}
              onClick={() => navigate('/')}
            />
          </div>

          {status === 'checking' && (
            <p style={{ color: C.muted, fontSize: 14 }}>A verificar o link…</p>
          )}

          {status === 'invalid' && (
            <>
              <h1 style={{ color: C.text, fontSize: 22, fontWeight: 400, fontFamily: 'var(--font-heading)', margin: '0 0 8px', letterSpacing: '-0.5px' }}>Link inválido ou expirado</h1>
              <p style={{ color: C.muted, fontSize: 14, margin: '0 0 24px', lineHeight: 1.5 }}>
                Este link de recuperação já não é válido. Pede um novo na página de entrada.
              </p>
              <Link to="/login" style={{ display: 'inline-block', background: 'var(--color-primary)', color: '#fff', textDecoration: 'none', borderRadius: 8, padding: '11px 20px', fontSize: 14, fontWeight: 700 }}>
                Voltar a entrar
              </Link>
            </>
          )}

          {status === 'ready' && !done && (
            <>
              <h1 style={{ color: C.text, fontSize: 26, fontWeight: 400, fontFamily: 'var(--font-heading)', margin: '0 0 8px', letterSpacing: '-0.5px' }}>Nova palavra-passe</h1>
              <p style={{ color: C.muted, fontSize: 14, margin: '0 0 32px' }}>Escolhe uma palavra-passe nova para a tua conta</p>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
                <PasswordField label="Nova palavra-passe" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
                <PasswordField label="Confirmar palavra-passe" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Repete a palavra-passe" />

                {error && (
                  <div style={{ background: 'var(--color-error-subtle)', border: '1px solid var(--color-error-subtle)', borderRadius: 8, padding: '10px 14px', color: C.error, fontSize: 14 }}>
                    {error}
                  </div>
                )}

                <button
                  type="submit" disabled={loading}
                  className="auth-submit"
                  style={{
                    background: loading ? 'var(--color-border)' : 'var(--color-primary)',
                    color: '#fff', border: 'none',
                    borderRadius: 8, padding: '13px', fontSize: 14, fontWeight: 700,
                    cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                  }}
                >
                  {loading ? 'A guardar…' : 'Guardar nova palavra-passe'}
                </button>
              </form>
            </>
          )}

          {done && (
            <div style={{ background: 'var(--color-success-subtle)', border: '1px solid var(--color-success-subtle)', borderRadius: 10, padding: '16px 18px' }}>
              <p style={{ margin: 0, color: 'var(--color-success)', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Check size={14} /> Palavra-passe atualizada. A entrar…
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
