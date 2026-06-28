import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { GraduationCap, BookOpen, Search, Building2, ArrowLeft } from 'lucide-react'
import AuthSidePanel from '../components/AuthSidePanel'
import { useTheme } from '../context/ThemeContext'

const C = {
  bg:          'var(--c-bg)',
  border:      'var(--c-border)',
  blue:        '#1b78f7',
  muted:       'var(--c-muted)',
  text:        'var(--c-text)',
  error:       '#ef4444',
}

const REGISTER_PHRASES = [
  { lead: 'Cria o teu', highlight: 'portfólio.' },
  { lead: 'Começa a', highlight: 'mostrar-te.' },
  { lead: 'Junta-te a quem', highlight: 'já mostra.' },
]

const ROLES = [
  { id: 'aluno',      icon: <GraduationCap size={22} />, label: 'Aluno',      color: '#1b78f7' },
  { id: 'professor',  icon: <BookOpen size={22} />,      label: 'Professor',  color: '#10b981', disabled: true },
  { id: 'recrutador', icon: <Search size={22} />,        label: 'Recrutador', color: '#8b5cf6', disabled: true },
  { id: 'empresa',    icon: <Building2 size={22} />,     label: 'Empresa',    color: '#f59e0b', disabled: true },
]

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

function Field({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <label style={{ color: C.muted, fontSize: 13, fontWeight: 500 }}>{label}</label>
      {children}
    </div>
  )
}

function Input({ type = 'text', value, onChange, placeholder, required }) {
  const [focused, setFocused] = useState(false)
  const [show, setShow] = useState(false)
  const isPassword = type === 'password'
  return (
    <div className="auth-field-wrap" style={{ borderBottomColor: focused ? C.blue : C.border }}>
      <input
        type={isPassword ? (show ? 'text' : 'password') : type}
        value={value} onChange={onChange} placeholder={placeholder} required={required}
        className="auth-input"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      {isPassword && (
        <button
          type="button" onClick={() => setShow(s => !s)} tabIndex={-1}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: show ? C.blue : C.muted, padding: 0, display: 'flex',
            transition: 'color 0.15s', flexShrink: 0,
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
  const { theme } = useTheme()
  const [step, setStep] = useState('role') // 'role' | 'form'
  const [role, setRole] = useState('')
  const [name, setName] = useState('')
  const [company, setCompany] = useState('')
  const [school, setSchool] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const needsCompany = role === 'recrutador' || role === 'empresa'
  const needsSchool = role === 'professor'

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!name.trim()) { setError('Introduz o teu nome.'); return }
    if (needsCompany && !company.trim()) { setError('Introduz o nome da empresa.'); return }
    if (needsSchool && !school.trim()) { setError('Introduz o nome da escola.'); return }
    if (password.length < 6) { setError('A palavra-passe tem de ter pelo menos 6 caracteres.'); return }
    if (password !== confirmPassword) { setError('As palavras-passe não coincidem.'); return }

    setLoading(true)
    const { data, error: err } = await supabase.auth.signUp({
      email,
      password,
      options: { data: {
        full_name: name.trim(), role: role || 'aluno',
        company: needsCompany ? company.trim() : null,
        school: needsSchool ? school.trim() : null,
      } },
    })
    if (err) {
      setLoading(false)
      setError(err.message === 'User already registered'
        ? 'Este email já está registado. Tenta entrar.'
        : 'Algo correu mal. Tenta novamente.')
      return
    }
    // No email confirmation step — if signUp didn't already return a session
    // (confirmations enabled on the project), sign in straight away.
    if (!data?.session) {
      await supabase.auth.signInWithPassword({ email, password })
    }
    setLoading(false)
    navigate('/dashboard')
  }

  const selectedRole = ROLES.find(r => r.id === role)

  return (
    <div className="auth-shell">
      <style>{`
        .auth-shell { min-height: 100vh; display: flex; background: var(--c-bg); font-family: inherit; }
        .auth-side {
          position: relative; overflow: hidden;
          flex: 0 0 42%; display: flex; align-items: center; justify-content: flex-start;
          padding: 0 0 0 64px; background: linear-gradient(115deg, #000 0%, #050b1c 40%, #0e2249 85%, #143169 100%);
          border-right: 1px solid var(--c-border);
        }
        .auth-side-content {
          position: relative; z-index: 3;
          display: flex; flex-direction: column; align-items: flex-start; gap: 22px;
          text-align: left;
        }
        .auth-side-mark { width: 72px; height: auto; display: block; }
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
          background: #1b78f7; color: #fff;
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
        .auth-main { flex: 1; display: flex; align-items: center; justify-content: center; padding: 24px 16px; }
        .auth-card { width: 100%; max-width: 420px; }
        .auth-input,
        body.light .auth-input {
          flex: 1; width: 100%; background: transparent !important; border: none;
          color: var(--c-text); font-size: 16px; outline: none; font-family: inherit;
          padding: 10px 0; box-sizing: border-box;
        }
        .auth-field-wrap {
          display: flex; align-items: center; gap: 10px;
          border-bottom: 1.5px solid var(--c-border); transition: border-color 0.15s;
        }
        .auth-submit { transition: opacity 0.15s; }
        .auth-submit:hover:not(:disabled) { opacity: 0.88; }
        .auth-input:-webkit-autofill,
        .auth-input:-webkit-autofill:hover,
        .auth-input:-webkit-autofill:focus {
          -webkit-text-fill-color: var(--c-text) !important;
          -webkit-box-shadow: 0 0 0 1000px var(--c-bg) inset !important;
          box-shadow: 0 0 0 1000px var(--c-bg) inset !important;
          caret-color: var(--c-text) !important;
          transition: background-color 9999s ease-in-out 0s;
        }
        .role-card { transition: border-color 0.15s, color 0.15s; cursor: pointer; }
        @media (max-width: 860px) {
          .auth-side { display: none; }
        }
        @media (max-width: 350px) { .register-role-grid { grid-template-columns: 1fr !important; } }
      `}</style>

      <AuthSidePanel phrases={REGISTER_PHRASES} />

      <div className="auth-main">
        <div className="auth-card">
          <div className="auth-main-logo" style={{ marginBottom: 36 }}>
            <img
              src={theme === 'light' ? '/light_mode_LI.png' : '/icon_logo.png'} alt="Showo"
              style={{ height: 32, width: 'auto', cursor: 'pointer' }}
              onClick={() => navigate('/')}
            />
          </div>

          {step === 'role' ? (
            /* ── STEP 1: escolha de tipo de conta ── */
            <>
              <h1 style={{ color: C.text, fontSize: 26, fontWeight: 400, fontFamily: 'var(--font-heading)', margin: '0 0 6px', letterSpacing: '-0.5px' }}>Criar conta</h1>
              <p style={{ color: C.muted, fontSize: 14, margin: '0 0 28px' }}>Como vais usar o Showo?</p>

              <div className="register-role-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 28 }}>
                {ROLES.map(r => {
                  const selected = role === r.id
                  return (
                    <div
                      key={r.id}
                      className="role-card"
                      onClick={() => { if (!r.disabled) setRole(r.id) }}
                      style={{
                        border: `1px solid ${selected ? r.color : C.border}`,
                        borderRadius: 8, padding: '16px 14px',
                        display: 'flex', alignItems: 'center', gap: 10,
                        opacity: r.disabled ? 0.5 : 1,
                        cursor: r.disabled ? 'default' : 'pointer',
                        position: 'relative',
                      }}
                    >
                      <span style={{ color: r.color, display: 'flex', alignItems: 'center' }}>{r.icon}</span>
                      <div style={{ fontSize: 14, fontWeight: 700, color: selected ? r.color : C.text }}>
                        {r.label}
                      </div>
                      {r.disabled && (
                        <span style={{
                          position: 'absolute', top: 6, right: 6,
                          fontSize: 8.5, fontWeight: 700, color: C.muted,
                          background: 'var(--c-bg-alt)', border: `1px solid ${C.border}`,
                          borderRadius: 4, padding: '2px 5px',
                          textTransform: 'uppercase', letterSpacing: '0.04em',
                        }}>
                          Em fase de testes
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>

              <button
                onClick={() => { if (role) setStep('form') }}
                disabled={!role}
                className="auth-submit"
                style={{
                  width: '100%',
                  background: role ? (selectedRole?.color ?? C.blue) : 'var(--c-border)',
                  color: '#fff', border: 'none', borderRadius: 8, padding: '13px',
                  fontSize: 14, fontWeight: 700, cursor: role ? 'pointer' : 'not-allowed',
                  fontFamily: 'inherit',
                }}
              >
                {role ? `Continuar como ${selectedRole?.label}` : 'Escolhe um tipo de conta'}
              </button>
            </>

          ) : (
            /* ── STEP 2: formulário ── */
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: selectedRole?.color, display: 'flex', alignItems: 'center', transform: 'scale(0.85)' }}>{selectedRole?.icon}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: selectedRole?.color }}>
                    {selectedRole?.label}
                  </span>
                </div>
                <button
                  onClick={() => setStep('role')}
                  style={{ background: 'none', border: 'none', color: C.muted, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', padding: 0, display: 'flex', alignItems: 'center', gap: 5 }}
                >
                  <ArrowLeft size={14} />Alterar
                </button>
              </div>

              <h1 style={{ color: C.text, fontSize: 22, fontWeight: 400, fontFamily: 'var(--font-heading)', margin: '0 0 24px', letterSpacing: '-0.5px' }}>Os teus dados</h1>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
                <Field label={role === 'empresa' ? 'Nome do responsável' : 'O teu nome'}>
                  <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: João Silva" required />
                </Field>
                {needsCompany && (
                  <Field label="Nome da empresa">
                    <Input value={company} onChange={e => setCompany(e.target.value)} placeholder="Ex: Google, NOS, Altice..." required />
                  </Field>
                )}
                {needsSchool && (
                  <Field label="Nome da escola">
                    <Input value={school} onChange={e => setSchool(e.target.value)} placeholder="Ex: Escola Secundária de..." required />
                  </Field>
                )}
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
                  <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, padding: '10px 14px', color: C.error, fontSize: 14 }}>
                    {error}
                  </div>
                )}

                <button
                  type="submit" disabled={loading}
                  className="auth-submit"
                  style={{
                    background: loading ? 'var(--c-border)' : '#1b78f7',
                    color: '#fff', border: 'none',
                    borderRadius: 8, padding: '13px', fontSize: 14, fontWeight: 700,
                    cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', marginTop: 4,
                  }}
                >
                  {loading ? 'A criar conta…' : 'Criar conta'}
                </button>
              </form>
            </>
          )}

          <p style={{ textAlign: 'center', color: C.muted, fontSize: 14, marginTop: 24 }}>
            Já tens conta?{' '}
            <Link to="/login" style={{ color: C.blue, textDecoration: 'none', fontWeight: 500 }}>Entrar</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
