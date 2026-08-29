import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { claimAnonymousProjects } from '../lib/claimAnonymousProjects'
import { ArrowLeftIcon as ArrowLeft } from '@solar-icons/react/bold/arrow-left'
import { LetterIcon as Mail } from '@solar-icons/react/bold/letter'
import { CheckCircleIcon as Check } from '@solar-icons/react/bold/check-circle'
// Ícones dos cartões de papel do registo — escolhidos um a um, ao contrário
// do mapeamento automático aplicado ao resto da app.
import { DiplomaIcon } from '@solar-icons/react/bold/diploma'
import { UsersGroupRoundedIcon } from '@solar-icons/react/bold/users-group-rounded'
import { Book2Icon } from '@solar-icons/react/bold/book-2'
import { MagnifierIcon } from '@solar-icons/react/bold/magnifier'
import { Buildings2Icon } from '@solar-icons/react/bold/buildings-2'
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
  { id: 'aluno',               icon: <DiplomaIcon size={23} />,           label: 'Aluno',               sub: 'Conta pessoal',             color: 'var(--color-primary)' },
  { id: 'aluno_institucional', icon: <UsersGroupRoundedIcon size={23} />, label: 'Aluno Institucional',  sub: 'Tenho código de turma',     color: 'var(--color-info)' },
  { id: 'professor',           icon: <Book2Icon size={23} />,             label: 'Professor',            sub: 'Gerir turmas e alunos',     color: 'var(--color-success)' },
  { id: 'recrutador',          icon: <MagnifierIcon size={21} />,         label: 'Recrutador',           color: 'var(--color-accent)', disabled: true },
  { id: 'empresa',             icon: <Buildings2Icon size={23} />,        label: 'Empresa',              color: 'var(--color-warning)', disabled: true },
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
  const { user, refreshProfile } = useAuth()

  // Uma sessão já existente ao ENTRAR nesta página (ex: mudar o URL para
  // /register à mão enquanto autenticado) redireciona logo para a
  // dashboard — não faz sentido dar acesso ao ecrã de criar conta a quem
  // já tem uma. Mas a sessão criada PELO PRÓPRIO fluxo de registo (signUp
  // com autoconfirm, ou o auto-login depois de confirmar por outro
  // dispositivo) não deve disparar isto — por isso o `hasStartedSignup` fica
  // true assim que o registo começa, e o guard ignora o user a partir daí.
  const hasStartedSignup = useRef(false)
  useEffect(() => {
    if (user && !hasStartedSignup.current) navigate('/dashboard', { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  // Detect context to skip role selection
  const params = new URLSearchParams(location.search)
  const professorCodeParam = params.get('professor_code') ?? ''
  const autoRole = claimSlug ? 'aluno' : professorCodeParam ? 'professor' : ''

  const [step, setStep] = useState(autoRole ? 'form' : 'role')
  const [role, setRole] = useState(autoRole)
  const [name, setName] = useState('')
  const [company, setCompany] = useState('')
  const [school, setSchool] = useState('')
  // Pré-preenchido quando se vem do passo "Continuar com email" da home
  // mobile — a pessoa já escreveu o email lá, não devia ter de o repetir.
  const [email, setEmail] = useState(() => params.get('email') || '')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')

  const [inviteCode, setInviteCode] = useState(professorCodeParam)
  const [accountCreated, setAccountCreated] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [confirmationPending, setConfirmationPending] = useState(false)
  const [resendState, setResendState] = useState('idle')

  // ── Partner-company invite (?empresa_convite=<token>) — a professor added
  // this company in Parceiros.jsx and emailed this link. It unlocks the
  // otherwise-disabled 'empresa' role for this one signup and, once claimed,
  // links the new account to the leads the professor already tracked. ──
  const refCode = params.get('ref') || ''
  useEffect(() => {
    if (refCode) localStorage.setItem('showo_ref', refCode)
  }, [refCode])

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

  const [classCode, setClassCode] = useState('')
  const needsCompany = role === 'recrutador' || role === 'empresa'
  const needsSchool = role === 'professor'
  const needsInviteCode = role === 'professor'
  const needsClassCode = role === 'aluno_institucional'
  const effectiveRole = role === 'aluno_institucional' ? 'aluno' : role

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

  // Tudo o que falta depois de existir uma sessão válida — resgatar convite/
  // turma/parceiro, guardar geo/telefone, referral, welcome email, reclamar
  // projetos anónimos, e ir para a dashboard. Corre tanto logo a seguir ao
  // signUp (quando não precisa de confirmação de email) como mais tarde,
  // quando a confirmação chega por outro dispositivo (ver autoLoginAfterConfirm).
  async function finishAccountSetup() {
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

    if (needsClassCode) {
      const { data: regResult } = await supabase.rpc('register_institutional_student', { p_class_code: classCode.trim(), p_email: email.trim() })
      if (!regResult?.ok) {
        setLoading(false)
        setAccountCreated(true)
        if (regResult?.reason === 'class_not_found') {
          setError('A tua conta foi criada, mas o código de turma é inválido. Verifica com o teu professor.')
        } else if (regResult?.reason === 'domain_mismatch') {
          setError(`A tua conta foi criada, mas o teu email tem de ser @${regResult.expected_domain} para entrar na turma de ${regResult.school_name}.`)
        } else {
          setError('A tua conta foi criada, mas houve um erro ao entrar na turma. Tenta novamente.')
        }
        return
      }
      await refreshProfile()
    }

    // Store geolocation, referrer and phone on the new profile
    const params = new URLSearchParams(window.location.search)
    const geo = await getGeoInfo()
    const { data: { user: newUser } } = await supabase.auth.getUser()
    if (newUser) {
      await supabase.from('profiles').update({
        signup_country: geo?.country || null,
        signup_city: geo?.city || null,
        signup_referrer: document.referrer || null,
        signup_utm_source: params.get('utm_source') || null,
        phone: phone.trim() || null,
      }).eq('id', newUser.id)
    }

    // Claim referral code (ambassador system)
    if (newUser) {
      const storedRef = localStorage.getItem('showo_ref')
      if (storedRef) {
        await supabase.rpc('claim_referral', { code: storedRef }).catch(() => {})
        localStorage.removeItem('showo_ref')
      }
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

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    hasStartedSignup.current = true

    // Account already exists (signUp succeeded on a previous attempt) — this
    // submit is just retrying the invite code / partner claim / class join.
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
      if (needsClassCode) {
        if (!classCode.trim()) { setError('Introduz o código da turma.'); return }
        setLoading(true)
        const { data: regResult } = await supabase.rpc('register_institutional_student', { p_class_code: classCode.trim(), p_email: email.trim() })
        if (!regResult?.ok) {
          setLoading(false)
          if (regResult?.reason === 'domain_mismatch') {
            setError(`O teu email tem de ser @${regResult.expected_domain} para entrar na turma de ${regResult.school_name}.`)
          } else {
            setError('Código de turma inválido. Verifica com o teu professor.')
          }
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
    if (needsClassCode && !classCode.trim()) { setError('Introduz o código da turma fornecido pelo professor.'); return }
    if (password.length < 6) { setError('A palavra-passe tem de ter pelo menos 6 caracteres.'); return }
    if (!phone.trim()) { setError('Introduz o teu número de telemóvel.'); return }

    // Validate email domain against class's school before creating account
    if (needsClassCode) {
      setLoading(true)
      const { data: validation } = await supabase.rpc('validate_class_email', { p_code: classCode.trim(), p_email: email.trim() })
      if (!validation?.valid) {
        setLoading(false)
        if (validation?.reason === 'class_not_found') {
          setError('Código de turma inválido. Verifica com o teu professor.')
        } else if (validation?.reason === 'domain_mismatch') {
          setError(`O teu email tem de ser @${validation.expected_domain} para entrar na turma de ${validation.school_name}.`)
        } else {
          setError('Código de turma inválido.')
        }
        return
      }
    }

    setLoading(true)
    const { data, error: err } = await supabase.auth.signUp({
      email,
      password,
      options: { data: {
        full_name: name.trim(),
        company: needsCompany ? company.trim() : null,
        school: needsSchool ? school.trim() : null,
        account_type: needsClassCode ? 'school' : 'individual',
        pending_class_code: needsClassCode ? classCode.trim() : null,
        pending_invite_code: needsInviteCode ? inviteCode.trim() : null,
        pending_school: needsSchool ? school.trim() : null,
        pending_partner_token: isPartnerFlow ? partnerToken : null,
        pending_phone: phone.trim() || null,
      } },
    })
    if (err) {
      setLoading(false)
      setError(err.message === 'User already registered'
        ? 'Este email já está registado. Tenta entrar.'
        : 'Algo correu mal. Tenta novamente.')
      return
    }

    // Email confirmation required — show "check your email" screen
    if (!data?.session) {
      setLoading(false)
      setConfirmationPending(true)
      return
    }

    // Session exists (e.g. autoconfirm on or OAuth) — process immediately
    await finishAccountSetup()
  }

  // ── Auto-login quando a confirmação chega por outro dispositivo ──
  // O PC fica no ecrã "Verifica o teu email" sem sessão própria. Se a
  // pessoa confirma pelo telemóvel, esse dispositivo é que fica autenticado
  // — este separador não sabe, a não ser que pergunte. Enquanto o ecrã
  // estiver visível, pergunta de vez em quando (função pública com
  // rate-limit, só devolve um boolean) e, assim que vier confirmado, entra
  // sozinho com o email/password que já tem em memória desde o submit.
  useEffect(() => {
    if (!confirmationPending) return

    let cancelled = false
    let attempts = 0
    const MAX_ATTEMPTS = 75 // ~5 minutos a cada 4s

    const interval = setInterval(async () => {
      attempts++
      if (attempts > MAX_ATTEMPTS) { clearInterval(interval); return }

      const { data: confirmed } = await supabase.rpc('check_email_confirmed', { p_email: email })
      if (!confirmed || cancelled) return

      clearInterval(interval)
      const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({ email, password })
      if (signInErr || cancelled) return
      await finishAccountSetup()
    }, 4000)

    return () => { cancelled = true; clearInterval(interval) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirmationPending])

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
        /* Em pilar no telemóvel — duas colunas apertava demais os subtítulos
           ("Tenho código de turma", "Gerir turmas e alunos") em ecrãs
           normais, não só nos muito estreitos que o 350px cobria. */
        @media (max-width: 600px) { .register-role-grid { grid-template-columns: 1fr !important; } }
      `}</style>

      <AuthSidePanel phrases={REGISTER_PHRASES} />

      <div className="auth-main">
        <div className="auth-card">
          <div
            className="auth-main-logo"
            style={{ marginBottom: 36, display: 'flex', justifyContent: 'center' }}
          >
            <img
              src={theme === 'light' ? '/lightmode_icon_logo.png' : '/darkmode_icon_logo.png'}
              alt="Showo"
              style={{ height: 32, width: 'auto', cursor: 'pointer', objectFit: 'contain' }}
              onClick={() => navigate('/')}
            />
          </div>

          {confirmationPending ? (
            /* ── EMAIL CONFIRMATION PENDING ──
               Reduzido ao essencial: ícone, título, para onde foi o email,
               e a única ação que importa (reenviar). O resto (spam, texto
               a repetir o que o título já diz) só acrescentava ruído. */
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--color-bg-alt)', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
                <Mail size={20} style={{ color: C.muted }} />
              </div>
              <h1 style={{ color: C.text, fontSize: 21, fontWeight: 400, fontFamily: 'var(--font-heading)', margin: '0 0 8px', letterSpacing: '-0.4px' }}>
                Verifica o teu email
              </h1>
              <p style={{ color: C.muted, fontSize: 14, lineHeight: 1.6, margin: '0 0 22px' }}>
                Enviámos um link para <strong style={{ color: C.text }}>{email}</strong>
              </p>
              {resendState === 'sent' ? (
                <p style={{ color: 'var(--color-success)', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <Check size={14} /> Novo email enviado
                </p>
              ) : (
                <button
                  type="button"
                  onClick={async () => {
                    setResendState('sending')
                    await supabase.auth.resend({ type: 'signup', email })
                    setResendState('sent')
                  }}
                  disabled={resendState === 'sending'}
                  style={{
                    background: 'transparent', border: '1px solid var(--color-border)',
                    borderRadius: 9, padding: '10px 20px',
                    color: C.text, fontSize: 13, fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  {resendState === 'sending' ? 'A enviar...' : 'Reenviar email'}
                </button>
              )}
            </div>
          ) : step === 'role' ? (
            /* ── STEP 1: escolha de tipo de conta ── */
            <>
              {/* "Criar conta" saiu — dizia o óbvio (a pessoa já sabe que
                  está a criar conta) e duplicava o que a pergunta a seguir
                  já diz. Fica só a pergunta, centrada. */}
              <h1 style={{ color: C.text, fontSize: 22, fontWeight: 400, fontFamily: 'var(--font-heading)', margin: '0 0 28px', letterSpacing: '-0.4px', textAlign: 'center' }}>
                Como vais usar o Showo?
              </h1>

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

              {/* Cada papel tinha a sua cor (azul, verde, info) — bonito
                  isoladamente, mas ao lado do herói novo (Google/email a
                  branco, sem cor nenhuma a mais) lia-se como duas linguagens
                  visuais diferentes na mesma jornada. Um estado só —
                  selecionado ou não — como o resto do fluxo de auth agora
                  usa: neutro, com o branco (var(--color-text)) a marcar a
                  escolha, não uma cor por papel. */}
              <div className="register-role-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 28 }}>
                {ROLES.filter(r => !r.disabled).map(r => {
                  const selected = role === r.id
                  return (
                    <div
                      key={r.id}
                      className="role-card"
                      onClick={() => setRole(r.id)}
                      style={{
                        border: `1px solid ${selected ? C.text : C.border}`,
                        borderRadius: 8, padding: '14px',
                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                        gap: 3, textAlign: 'center', cursor: 'pointer',
                      }}
                    >
                      {/* Ícone ao lado do nome, não por cima — três linhas
                          por cartão (ícone sozinho, nome, subtítulo) fazia
                          cada cartão mais alto do que precisava. O bloco
                          continua centrado no cartão, só a organização
                          interna muda de vertical para uma linha + legenda. */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ color: selected ? C.text : C.muted, display: 'flex', alignItems: 'center' }}>{r.icon}</span>
                        <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{r.label}</span>
                      </div>
                      {r.sub && <div style={{ fontSize: 11, color: C.muted, fontWeight: 400 }}>{r.sub}</div>}
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
                  background: role ? C.text : 'var(--color-border)',
                  color: role ? C.bg : C.muted, border: 'none', borderRadius: 10, padding: '12px 0',
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
                  <span style={{ color: C.text, display: 'flex', alignItems: 'center', transform: 'scale(0.85)' }}>{selectedRole?.icon}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>
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
                  <GoogleButton label="Continuar com Google" />
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
                  ) : needsClassCode ? (
                    <Field label="Código da turma">
                      <Input value={classCode} onChange={e => setClassCode(e.target.value.toUpperCase())} placeholder="Ex: ABC123" required />
                    </Field>
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
                    {needsClassCode && (
                      <Field label="Código da turma">
                        <Input value={classCode} onChange={e => setClassCode(e.target.value.toUpperCase())} placeholder="Ex: ABC123" required />
                      </Field>
                    )}
                    <Field label="Email">
                      <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@email.com" required />
                    </Field>
                    <Field label="Palavra-passe">
                      <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" required />
                    </Field>
                    <Field label="Telemóvel">
                      <Input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="912 345 678" required />
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
                    background: loading ? 'var(--color-border)' : C.text,
                    color: loading ? C.muted : C.bg, border: 'none',
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
            <Link to="/login" style={{ color: C.text, textDecoration: 'underline', fontWeight: 700 }}>Entrar</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
