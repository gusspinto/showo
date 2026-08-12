import { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { claimAnonymousProjects } from '../lib/claimAnonymousProjects'
import { GraduationCap, BookOpen, Search, Building2, ArrowLeft } from 'lucide-react'
import AuthSidePanel from '../components/AuthSidePanel'
import GoogleButton from '../components/GoogleButton'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import { getGeoInfo } from '../lib/geolocation'

const C = {
  bg:          'var(--color-bg)',
  border:      'var(--color-border)',
  blue:        'var(--color-primary)',
  muted:       'var(--color-text-secondary)',
  text:        'var(--color-text)',
  error:       'var(--color-error)',
}

const REGISTER_PHRASES = [
  { lead: 'Cria o teu', highlight: 'portfólio.' },
  { lead: 'Começa a', highlight: 'mostrar-te.' },
  { lead: 'Junta-te a quem', highlight: 'já mostra.' },
]

const ROLES = [
  { id: 'aluno',      icon: <GraduationCap size={22} />, label: 'Aluno',      color: 'var(--color-primary)' },
  { id: 'professor',  icon: <BookOpen size={22} />,      label: 'Professor',  color: 'var(--color-success)' },
  { id: 'recrutador', icon: <Search size={22} />,        label: 'Recrutador', color: 'var(--color-accent)', disabled: true },
  { id: 'empresa',    icon: <Building2 size={22} />,     label: 'Empresa',    color: 'var(--color-warning)', disabled: true },
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
  const location = useLocation()
  const claimSlug = location.state?.claimSlug ?? null
  const { theme } = useTheme()
  const { refreshProfile } = useAuth()

  // Detect context to skip role selection
  const params = new URLSearchParams(location.search)
  const professorCodeParam = params.get('professor_code') ?? ''
  const autoRole = claimSlug ? 'aluno' : professorCodeParam ? 'professor' : ''

  const [step, setStep] = useState(autoRole ? 'form' : 'role')
  const [role, setRole] = useState(autoRole)
  const [name, setName] = useState('')
  const [company, setCompany] = useState('')
  const [school, setSchool] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [inviteCode, setInviteCode] = useState(professorCodeParam)
  const [accountCreated, setAccountCreated] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [acceptedTerms, setAcceptedTerms] = useState(false)

  // ── Partner-company invite (?empresa_convite=<token>) — a professor added
  // this company in Parceiros.jsx and emailed this link. It unlocks the
  // otherwise-disabled 'empresa' role for this one signup and, once claimed,
  // links the new account to the leads the professor already tracked. ──
  const partnerToken = new URLSearchParams(location.search).get('empresa_convite')
  const [partnerInvite, setPartnerInvite] = useState(null) // { name, sector, already_claimed } | 'invalid' | null (loading)
  const isPartnerFlow = partnerInvite && partnerInvite !== 'invalid' && !partnerInvite.already_claimed

  useEffect(() => {
    if (!partnerToken) return
    supabase.rpc('get_partner_company_invite_info', { p_token: partnerToken }).then(({ data, error: err }) => {
      const row = Array.isArray(data) ? data[0] : data
      if (err || !row) { setPartnerInvite('invalid'); return }
      setPartnerInvite(row)
      if (!row.already_claimed) {
        setRole('empresa')
        setCompany(row.name || '')
        setStep('form')
      }
    })
  }, [partnerToken])

  const needsCompany = role === 'recrutador' || role === 'empresa'
  const needsSchool = role === 'professor'
  const needsInviteCode = role === 'professor'

  async function redeemInviteCode() {
    const { error: codeErr } = await supabase.rpc('redeem_professor_invite_code', {
      p_code: inviteCode.trim(),
      p_full_name: name.trim(),
      p_school: school.trim(),
    })
    return !codeErr
  }

  async function claimPartnerInvite() {
    const { error: claimErr } = await supabase.rpc('claim_partner_company_invite', { p_token: partnerToken })
    return !claimErr
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    // Account already exists (signUp succeeded on a previous attempt) — this
    // submit is just retrying the invite code / partner claim, nothing else
    // to validate.
    if (accountCreated) {
      if (isPartnerFlow) {
        setLoading(true)
        const ok = await claimPartnerInvite()
        if (!ok) {
          setLoading(false)
          setError('Não foi possível ligar a tua conta a esta empresa. O convite pode já ter sido usado.')
          return
        }
        await refreshProfile()
        setLoading(false)
        navigate('/dashboard')
        return
      }
      if (!inviteCode.trim()) { setError('Introduz o código de acesso.'); return }
      setLoading(true)
      const ok = await redeemInviteCode()
      if (!ok) {
        setLoading(false)
        setError('Código inválido, expirado ou já utilizado.')
        return
      }
      await refreshProfile()
      setLoading(false)
      navigate('/dashboard')
      return
    }

    if (!acceptedTerms) { setError('Tens de aceitar os Termos e a Política de Privacidade.'); return }
    if (!name.trim()) { setError('Introduz o teu nome.'); return }
    if (needsCompany && !company.trim()) { setError('Introduz o nome da empresa.'); return }
    if (needsSchool && !school.trim()) { setError('Introduz o nome da escola.'); return }
    if (needsInviteCode && !inviteCode.trim()) { setError('Introduz o código de acesso enviado pela Showo.'); return }
    if (password.length < 6) { setError('A palavra-passe tem de ter pelo menos 6 caracteres.'); return }
    if (password !== confirmPassword) { setError('As palavras-passe não coincidem.'); return }

    setLoading(true)
    const { data, error: err } = await supabase.auth.signUp({
      email,
      password,
      options: { data: {
        full_name: name.trim(),
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

    // Professor role only takes effect once the invite code is redeemed —
    // the account itself was just created as a plain 'aluno'.
    if (needsInviteCode) {
      const ok = await redeemInviteCode()
      if (!ok) {
        setLoading(false)
        setAccountCreated(true)
        setError('A tua conta foi criada, mas o código de acesso é inválido ou já foi utilizado. Verifica o código e tenta novamente.')
        return
      }
      await refreshProfile()
    }

    // Same idea for the partner-company flow — 'empresa' only takes effect
    // once the invite token is claimed.
    if (isPartnerFlow) {
      const ok = await claimPartnerInvite()
      if (!ok) {
        setLoading(false)
        setAccountCreated(true)
        setError('A tua conta foi criada, mas não foi possível ligá-la a esta empresa. O convite pode já ter sido usado.')
        return
      }
      await refreshProfile()
    }

    // Store geolocation and referrer on the new profile
    const params = new URLSearchParams(window.location.search)
    const geo = await getGeoInfo()
    const { data: { user: newUser } } = await supabase.auth.getUser()
    if (newUser) {
      await supabase.from('profiles').update({
        signup_country: geo?.country || null,
        signup_city: geo?.city || null,
        signup_referrer: document.referrer || null,
        signup_utm_source: params.get('utm_source') || null,
      }).eq('id', newUser.id)
    }

    // Send welcome email (fire-and-forget)
    if (newUser) {
      supabase.functions.invoke('send-welcome-email').catch(() => {})
    }

    // Claim all anonymously-created projects from this browser (edit_token_* in localStorage)
    let claimedSlugs = []
    if (newUser) {
      claimedSlugs = await claimAnonymousProjects(newUser.id)
    }

    setLoading(false)
    const primaryClaimed = claimSlug || claimedSlugs[0]
    navigate('/dashboard', primaryClaimed ? { state: { claimedSlug: primaryClaimed } } : undefined)
  }

  const selectedRole = ROLES.find(r => r.id === role)

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
        .auth-main { flex: 1; display: flex; align-items: center; justify-content: center; padding: 24px 16px; }
        .auth-card { width: 100%; max-width: 420px; }
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
              src={theme === 'light' ? '/lightmode_icon_logo.png' : '/darkmode_icon_logo.png'}
              alt="Showo"
              style={{ height: 32, width: 'auto', cursor: 'pointer', objectFit: 'contain' }}
              onClick={() => navigate('/')}
            />
          </div>

          {step === 'role' ? (
            /* ── STEP 1: escolha de tipo de conta ── */
            <>
              <h1 style={{ color: C.text, fontSize: 26, fontWeight: 400, fontFamily: 'var(--font-heading)', margin: '0 0 6px', letterSpacing: '-0.5px' }}>Criar conta</h1>
              <p style={{ color: C.muted, fontSize: 14, margin: '0 0 28px' }}>Como vais usar o Showo?</p>

              {partnerToken && partnerInvite === 'invalid' && (
                <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, padding: '10px 14px', marginBottom: 20, color: C.error, fontSize: 13 }}>
                  Este link de convite não é válido. Pede ao professor um novo link.
                </div>
              )}
              {partnerToken && partnerInvite?.already_claimed && (
                <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 8, padding: '10px 14px', marginBottom: 20, color: C.text, fontSize: 13 }}>
                  Este convite já foi usado para criar uma conta. Se já tens conta, <Link to="/login" style={{ color: C.blue }}>entra aqui</Link>.
                </div>
              )}

              <div className="register-role-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 28 }}>
                {ROLES.filter(r => !r.disabled).map(r => {
                  const selected = role === r.id
                  return (
                    <div
                      key={r.id}
                      className="role-card"
                      onClick={() => setRole(r.id)}
                      style={{
                        border: `1px solid ${selected ? r.color : C.border}`,
                        borderRadius: 8, padding: '16px 14px',
                        display: 'flex', alignItems: 'center', gap: 10,
                        cursor: 'pointer',
                      }}
                    >
                      <span style={{ color: r.color, display: 'flex', alignItems: 'center' }}>{r.icon}</span>
                      <div style={{ fontSize: 14, fontWeight: 700, color: selected ? r.color : C.text }}>
                        {r.label}
                      </div>
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
                  background: role ? (selectedRole?.color ?? C.blue) : 'var(--color-border)',
                  color: '#fff', border: 'none', borderRadius: 10, padding: '12px 0',
                  fontSize: 15, fontWeight: 700, cursor: role ? 'pointer' : 'not-allowed',
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
                {!isPartnerFlow && !autoRole && (
                  <button
                    onClick={() => setStep('role')}
                    style={{ background: 'none', border: 'none', color: C.muted, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', padding: 0, display: 'flex', alignItems: 'center', gap: 5 }}
                  >
                    <ArrowLeft size={14} />Alterar
                  </button>
                )}
              </div>

              {isPartnerFlow && (
                <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 8, padding: '10px 14px', marginBottom: 20, color: C.text, fontSize: 13, lineHeight: 1.5 }}>
                  Foste convidado como parceiro de estágio de <strong>{partnerInvite.name}</strong>. Ao criar conta vais ver os alunos que o professor já assinalou como interessados.
                </div>
              )}

              <h1 style={{ color: C.text, fontSize: 22, fontWeight: 400, fontFamily: 'var(--font-heading)', margin: '0 0 24px', letterSpacing: '-0.5px' }}>
                {accountCreated ? (isPartnerFlow ? 'Só falta ligar à empresa' : 'Só falta o código') : 'Os teus dados'}
              </h1>

              {!accountCreated && (
                <>
                  <GoogleButton label="Continuar com Google" variant="subtle" />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '18px 0' }}>
                    <div style={{ flex: 1, height: 1, background: C.border }} />
                    <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)', fontWeight: 600 }}>ou</span>
                    <div style={{ flex: 1, height: 1, background: C.border }} />
                  </div>
                </>
              )}

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
                {accountCreated ? (
                  isPartnerFlow ? (
                    <p style={{ color: C.muted, fontSize: 14, margin: 0 }}>
                      A tua conta foi criada. Carrega no botão abaixo para tentar ligar-te a <strong style={{ color: C.text }}>{partnerInvite.name}</strong> novamente.
                    </p>
                  ) : (
                    <Field label="Código de acesso">
                      <Input value={inviteCode} onChange={e => setInviteCode(e.target.value)} placeholder="Código enviado pela Showo" required />
                    </Field>
                  )
                ) : (
                  <>
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
                    {needsInviteCode && (
                      <Field label="Código de acesso">
                        <Input value={inviteCode} onChange={e => setInviteCode(e.target.value)} placeholder="Código enviado pela Showo" required />
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
                  </>
                )}

                {!accountCreated && (
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', fontSize: 13, color: C.muted, lineHeight: 1.5 }}>
                    <input
                      type="checkbox" checked={acceptedTerms}
                      onChange={e => setAcceptedTerms(e.target.checked)}
                      style={{ marginTop: 2, accentColor: C.blue, width: 16, height: 16, flexShrink: 0 }}
                    />
                    <span>
                      Li e aceito os <Link to="/termos" style={{ color: C.blue }}>Termos de Utilização</Link> e a <Link to="/privacidade" style={{ color: C.blue }}>Política de Privacidade</Link>.
                      {' '}Se tens menos de 16 anos, confirma que tens o consentimento do teu encarregado de educação.
                    </span>
                  </label>
                )}

                {error && (
                  <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, padding: '10px 14px', color: C.error, fontSize: 14 }}>
                    {error}
                  </div>
                )}

                <button
                  type="submit" disabled={loading}
                  className="auth-submit"
                  style={{
                    background: loading ? 'var(--color-border)' : 'var(--color-primary)',
                    color: '#fff', border: 'none',
                    borderRadius: 10, padding: '12px 0', fontSize: 15, fontWeight: 700,
                    cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', marginTop: 4,
                  }}
                >
                  {loading ? 'A verificar…' : accountCreated ? (isPartnerFlow ? 'Tentar novamente' : 'Confirmar código') : 'Criar conta'}
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
