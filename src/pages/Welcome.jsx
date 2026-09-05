import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { supabase } from '../lib/supabase'
import { SquareAcademicCapIcon as GraduationCap } from '@solar-icons/react/bold/square-academic-cap'
import { Book2Icon as BookOpen } from '@solar-icons/react/bold/book-2'
import { Buildings2Icon as Building2 } from '@solar-icons/react/bold/buildings-2'
import { MagnifierIcon as Search } from '@solar-icons/react/bold/magnifier'
import { LetterIcon as Mail } from '@solar-icons/react/bold/letter'
import { ArrowRightIcon as ArrowRight } from '@solar-icons/react/bold/arrow-right'
import { CheckCircleIcon as CheckCircle } from '@solar-icons/react/bold/check-circle'

const ROLES = [
  { id: 'aluno',      icon: <GraduationCap size={22} />, label: 'Aluno',      color: 'var(--color-primary)',  direct: true },
  { id: 'professor',  icon: <BookOpen size={22} />,      label: 'Professor',  color: 'var(--color-success)' },
  { id: 'recrutador', icon: <Search size={22} />,        label: 'Recrutador', color: 'var(--color-accent)' },
  { id: 'empresa',    icon: <Building2 size={22} />,     label: 'Empresa',    color: 'var(--color-warning)' },
]

function buildMailto(roleId, fullName) {
  const roleLabel = ROLES.find(r => r.id === roleId)?.label ?? roleId
  const name = fullName ?? ''
  const subject = encodeURIComponent(`Pedido de acesso como ${roleLabel} — Showo`)
  const body = encodeURIComponent(`Olá Showo,\n\nChamo-me ${name} e gostaria de aceder à plataforma como ${roleLabel}.\n\n[Apresenta-te brevemente aqui]\n\nObrigado!`)
  return `mailto:hello@showo.pt?subject=${subject}&body=${body}`
}

export default function Welcome() {
  const { user, profile, loading, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const { theme } = useTheme()
  // Consome o "intent" do Google (papel/categoria escolhidos no /register)
  // uma única vez, logo no primeiro render, para o passo inicial já ser o
  // certo e não haver um flash do seletor antes do useEffect correr.
  const googleIntent = useRef(undefined)
  if (googleIntent.current === undefined) {
    try {
      const raw = localStorage.getItem('showo_google_intent')
      googleIntent.current = raw ? JSON.parse(raw) : null
      if (raw) localStorage.removeItem('showo_google_intent')
    } catch { googleIntent.current = null }
  }
  const intentStep = (() => {
    const i = googleIntent.current
    if (!i) return 'role'
    if (i.role === 'professor') return 'code'
    if (i.role === 'aluno_institucional') return 'classcode'
    if (i.role === 'recrutador' || i.role === 'empresa') return 'pending'
    return 'role' // individual → o useEffect encaminha para a dashboard
  })()

  const [step, setStep] = useState(intentStep) // 'role' | 'pending' | 'code' | 'classcode'
  const [selectedRole, setSelectedRole] = useState(
    ['professor', 'aluno_institucional', 'recrutador', 'empresa'].includes(googleIntent.current?.role)
      ? googleIntent.current.role : null
  )
  const [emailSent, setEmailSent] = useState(false)
  const [school, setSchool] = useState(googleIntent.current?.school || '')
  const [inviteCode, setInviteCode] = useState(googleIntent.current?.inviteCode || '')
  const [classCode, setClassCode] = useState(googleIntent.current?.classCode || '')
  const [codeError, setCodeError] = useState('')
  const [redeeming, setRedeeming] = useState(false)
  const intentHandled = useRef(false)

  const flagKey = user ? `showo_needs_role_${user.id}` : null
  // O trigger no servidor cria já a linha de perfil, por isso o flag
  // showo_needs_role nem sempre chega a ser posto. Um intent do Google
  // (escola/professor) é razão suficiente para mostrar o passo seguinte —
  // exceto se a conta já estiver configurada como escola/professor.
  const hasFollowUpIntent = ['professor', 'aluno_institucional', 'recrutador', 'empresa'].includes(googleIntent.current?.role)
  const alreadyConfigured = profile?.role === 'professor' || profile?.account_type === 'school'
  const needsRoleSelect =
    (flagKey && localStorage.getItem(flagKey) === '1') ||
    (hasFollowUpIntent && !alreadyConfigured)

  useEffect(() => {
    if (loading) return
    if (!user) { navigate('/login', { replace: true }); return }
    if (!needsRoleSelect) { navigate('/dashboard', { replace: true }); return }

    // Seguimento do clique no botão do Google no /register (ver googleIntent
    // acima): o passo inicial já foi decidido no render. Aqui só falta o caso
    // "individual", que não tem ecrã nenhum — entra direto na dashboard.
    if (intentHandled.current) return
    intentHandled.current = true
    const r = googleIntent.current?.role
    if (r && r !== 'professor' && r !== 'aluno_institucional' && r !== 'recrutador' && r !== 'empresa') {
      finishAsAluno()
    }
  }, [user, loading, needsRoleSelect, navigate])

  function finishAsAluno() {
    if (flagKey) localStorage.removeItem(flagKey)
    navigate('/dashboard', { replace: true })
  }

  function handleRoleSelect(roleId) {
    if (roleId === 'aluno') { finishAsAluno(); return }
    setSelectedRole(roleId)
    setStep(roleId === 'professor' ? 'code' : 'pending')
  }

  async function handleRedeemCode(e) {
    e.preventDefault()
    if (!inviteCode.trim() || !school.trim()) return
    setRedeeming(true)
    setCodeError('')
    const { error } = await supabase.rpc('redeem_professor_invite_code', {
      p_code: inviteCode.trim(),
      p_full_name: profile?.full_name ?? '',
      p_school: school.trim(),
    })
    if (error) {
      setRedeeming(false)
      setCodeError('Código inválido ou já utilizado. Verifica o código e tenta novamente.')
      return
    }
    await refreshProfile()
    if (flagKey) localStorage.removeItem(flagKey)
    navigate('/dashboard', { replace: true })
  }

  async function handleJoinClass(e) {
    e.preventDefault()
    if (!classCode.trim()) return
    setRedeeming(true)
    setCodeError('')
    const { data: regResult } = await supabase.rpc('register_institutional_student', {
      p_class_code: classCode.trim(),
      p_email: user.email,
    })
    if (!regResult?.ok) {
      setRedeeming(false)
      if (regResult?.reason === 'domain_mismatch') {
        setCodeError(`O teu email tem de ser @${regResult.expected_domain} para entrar na turma de ${regResult.school_name}.`)
      } else {
        setCodeError('Código de turma inválido. Verifica com o teu professor.')
      }
      return
    }
    await refreshProfile()
    if (flagKey) localStorage.removeItem(flagKey)
    navigate('/dashboard', { replace: true })
  }

  if (loading || !user || !needsRoleSelect) return null

  const C = {
    blue:   'var(--color-text)',
    muted:  'var(--color-text-secondary)',
    text:   'var(--color-text)',
    border: 'var(--color-border)',
  }

  const firstName = profile?.full_name?.split(' ')[0] ?? null

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--color-bg)', padding: 24, fontFamily: 'inherit',
    }}>
      <style>{`
        .welcome-role-btn { transition: border-color 0.15s, background 0.15s; }
        .welcome-role-btn:hover { background: var(--color-bg-alt) !important; }
      `}</style>

      <div style={{ width: '100%', maxWidth: 420 }}>
        <img
          src={theme === 'light' ? '/lightmode_icon_logo.png' : '/darkmode_icon_logo.png'}
          alt="Showo"
          style={{ height: 32, width: 'auto', marginBottom: 40, cursor: 'pointer' }}
          onClick={() => navigate('/')}
        />

        {step === 'role' ? (
          <>
            <h1 style={{ color: C.text, fontSize: 26, fontWeight: 400, fontFamily: 'var(--font-heading)', margin: '0 0 8px', letterSpacing: '-0.5px' }}>
              {firstName ? `Bem-vindo, ${firstName}!` : 'Bem-vindo!'}
            </h1>
            <p style={{ color: C.muted, fontSize: 14, margin: '0 0 32px' }}>Como vais usar o Showo?</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 8 }}>
              {ROLES.map(r => (
                <button
                  key={r.id}
                  className="welcome-role-btn"
                  onClick={() => handleRoleSelect(r.id)}
                  style={{
                    border: `1px solid ${C.border}`, borderRadius: 8, padding: '16px 14px',
                    display: 'flex', alignItems: 'center', gap: 10,
                    background: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                  }}
                >
                  <span style={{ color: r.color, display: 'flex', flexShrink: 0 }}>{r.icon}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{r.label}</span>
                </button>
              ))}
            </div>
          </>
        ) : step === 'code' ? (
          <>
            <h1 style={{ color: C.text, fontSize: 22, fontWeight: 400, fontFamily: 'var(--font-heading)', margin: '0 0 12px', letterSpacing: '-0.5px' }}>
              Acesso de Professor
            </h1>
            <p style={{ color: C.muted, fontSize: 14, margin: '0 0 24px', lineHeight: 1.65 }}>
              Introduz o código de acesso que a equipa Showo te enviou.
            </p>

            <form onSubmit={handleRedeemCode}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 6 }}>Nome da escola</label>
              <input
                value={school}
                onChange={e => setSchool(e.target.value)}
                placeholder="Ex: Escola Secundária de..."
                required
                style={{
                  width: '100%', boxSizing: 'border-box', border: `1px solid ${C.border}`, borderRadius: 8,
                  padding: '11px 12px', fontSize: 14, fontFamily: 'inherit', color: C.text, background: 'var(--color-bg)',
                  marginBottom: 16,
                }}
              />

              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 6 }}>Código de acesso</label>
              <input
                value={inviteCode}
                onChange={e => setInviteCode(e.target.value)}
                placeholder="Código enviado pela Showo"
                required
                style={{
                  width: '100%', boxSizing: 'border-box', border: `1px solid ${C.border}`, borderRadius: 8,
                  padding: '11px 12px', fontSize: 14, fontFamily: 'inherit', color: C.text, background: 'var(--color-bg)',
                  marginBottom: codeError ? 8 : 20,
                }}
              />
              {codeError && (
                <p style={{ color: 'var(--color-error, #d33)', fontSize: 13, margin: '0 0 16px' }}>{codeError}</p>
              )}

              <button
                type="submit"
                disabled={redeeming}
                style={{
                  width: '100%', background: 'var(--color-text)', color: 'var(--color-bg)',
                  border: 'none', borderRadius: 10, padding: '13px 0', fontSize: 15, fontWeight: 700,
                  cursor: redeeming ? 'default' : 'pointer', fontFamily: 'inherit', opacity: redeeming ? 0.6 : 1,
                  marginBottom: 12,
                }}
              >
                {redeeming ? 'A confirmar...' : 'Confirmar acesso'}
              </button>
            </form>

            <button
              onClick={() => { setStep('pending') }}
              style={{
                width: '100%', background: 'none',
                border: `1px solid ${C.border}`, borderRadius: 10,
                padding: '12px 0', fontSize: 14, color: C.muted,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Ainda não tenho um código
            </button>
          </>
        ) : step === 'classcode' ? (
          <>
            <h1 style={{ color: C.text, fontSize: 22, fontWeight: 400, fontFamily: 'var(--font-heading)', margin: '0 0 12px', letterSpacing: '-0.5px' }}>
              Entrar na turma
            </h1>
            <p style={{ color: C.muted, fontSize: 14, margin: '0 0 24px', lineHeight: 1.65 }}>
              Introduz o código de turma que o teu professor te deu para ligares a conta à tua escola.
            </p>

            <form onSubmit={handleJoinClass}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 6 }}>Código da turma</label>
              <input
                value={classCode}
                onChange={e => setClassCode(e.target.value.toUpperCase())}
                placeholder="Ex: ABC123"
                required
                style={{
                  width: '100%', boxSizing: 'border-box', border: `1px solid ${C.border}`, borderRadius: 8,
                  padding: '11px 12px', fontSize: 14, fontFamily: 'inherit', color: C.text, background: 'var(--color-bg)',
                  marginBottom: codeError ? 8 : 20,
                }}
              />
              {codeError && (
                <p style={{ color: 'var(--color-error, #d33)', fontSize: 13, margin: '0 0 16px' }}>{codeError}</p>
              )}

              <button
                type="submit"
                disabled={redeeming}
                style={{
                  width: '100%', background: 'var(--color-text)', color: 'var(--color-bg)',
                  border: 'none', borderRadius: 10, padding: '13px 0', fontSize: 15, fontWeight: 700,
                  cursor: redeeming ? 'default' : 'pointer', fontFamily: 'inherit', opacity: redeeming ? 0.6 : 1,
                  marginBottom: 12,
                }}
              >
                {redeeming ? 'A confirmar...' : 'Entrar na turma'}
              </button>
            </form>

            <button
              onClick={finishAsAluno}
              style={{
                width: '100%', background: 'none',
                border: `1px solid ${C.border}`, borderRadius: 10,
                padding: '12px 0', fontSize: 14, color: C.muted,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Não tenho código — continuar como conta individual
            </button>
          </>
        ) : !emailSent ? (
          <>
            <h1 style={{ color: C.text, fontSize: 22, fontWeight: 400, fontFamily: 'var(--font-heading)', margin: '0 0 12px', letterSpacing: '-0.5px' }}>
              Quase lá!
            </h1>
            <p style={{ color: C.muted, fontSize: 14, margin: '0 0 28px', lineHeight: 1.65 }}>
              O acesso como <strong style={{ color: C.text }}>{ROLES.find(r => r.id === selectedRole)?.label}</strong> é verificado manualmente pela equipa Showo.
              Envia-nos um email a apresentar-te e confirmamos o acesso em breve.
            </p>

            <a
              href={buildMailto(selectedRole, profile?.full_name)}
              onClick={() => setEmailSent(true)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                width: '100%', boxSizing: 'border-box',
                background: 'var(--color-text)', color: 'var(--color-bg)',
                borderRadius: 10, padding: '13px 0',
                fontSize: 15, fontWeight: 700, textDecoration: 'none',
                marginBottom: 12,
              }}
            >
              <Mail size={16} /> Enviar email à equipa
            </a>

            <button
              onClick={finishAsAluno}
              style={{
                width: '100%', background: 'none',
                border: `1px solid ${C.border}`, borderRadius: 10,
                padding: '12px 0', fontSize: 14, color: C.muted,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Entrar como Aluno por agora
            </button>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <CheckCircle size={22} color="var(--color-success)" />
              <h1 style={{ color: C.text, fontSize: 20, fontWeight: 400, fontFamily: 'var(--font-heading)', margin: 0, letterSpacing: '-0.5px' }}>
                Obrigado!
              </h1>
            </div>
            <p style={{ color: C.muted, fontSize: 14, margin: '0 0 28px', lineHeight: 1.65 }}>
              Assim que confirmarmos, damos-te acesso como <strong style={{ color: C.text }}>{ROLES.find(r => r.id === selectedRole)?.label}</strong>.
              Enquanto isso, podes usar o Showo normalmente.
            </p>
            <button
              onClick={finishAsAluno}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                width: '100%', background: 'var(--color-text)',
                color: 'var(--color-bg)', border: 'none', borderRadius: 10,
                padding: '13px 0', fontSize: 15, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Ir para o Showo <ArrowRight size={16} />
            </button>
          </>
        )}
      </div>
    </div>
  )
}
