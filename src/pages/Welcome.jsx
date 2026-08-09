import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { GraduationCap, BookOpen, Building2, Search, Mail, ArrowRight, CheckCircle } from 'lucide-react'

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
  const { user, profile, loading } = useAuth()
  const navigate = useNavigate()
  const { theme } = useTheme()
  const [step, setStep] = useState('role') // 'role' | 'pending'
  const [selectedRole, setSelectedRole] = useState(null)
  const [emailSent, setEmailSent] = useState(false)

  const flagKey = user ? `showo_needs_role_${user.id}` : null
  const needsRoleSelect = flagKey && localStorage.getItem(flagKey) === '1'

  useEffect(() => {
    if (loading) return
    if (!user) { navigate('/login', { replace: true }); return }
    if (!needsRoleSelect) { navigate('/dashboard', { replace: true }); return }
  }, [user, loading, needsRoleSelect, navigate])

  function finishAsAluno() {
    if (flagKey) localStorage.removeItem(flagKey)
    navigate('/dashboard', { replace: true })
  }

  function handleRoleSelect(roleId) {
    if (roleId === 'aluno') { finishAsAluno(); return }
    setSelectedRole(roleId)
    setStep('pending')
  }

  if (loading || !user || !needsRoleSelect) return null

  const C = {
    blue:   'var(--color-primary)',
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
                background: 'var(--color-primary)', color: '#fff',
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
                width: '100%', background: 'var(--color-primary)',
                color: '#fff', border: 'none', borderRadius: 10,
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
