import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { QRCodeSVG } from 'qrcode.react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Navbar } from '../components/Navbar'
import { Check, Download, Mail, Rocket } from 'lucide-react'

const C = {
  bg:           'var(--c-bg)',
  card:         'var(--c-card)',
  border:       'var(--c-border)',
  borderBright: 'var(--c-border-bright)',
  blue:         '#1b78f7',
  text:         'var(--c-text)',
  muted:        'var(--c-muted)',
  green:        '#22c55e',
}

function SectionLabel({ children }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
      {children}
    </div>
  )
}

export default function Estagio() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [copiedField, setCopiedField] = useState(null)
  const [emailText, setEmailText] = useState('')
  const qrRef = useRef(null)

  useEffect(() => {
    if (!user) return
    supabase.from('projects').select('id, score').eq('user_id', user.id)
      .then(({ data }) => { setProjects(data || []); setLoading(false) })
  }, [user])

  const displayName = profile?.full_name || profile?.username || 'O teu nome'
  const username = profile?.username || profile?.id || ''
  const profileUrl = username ? `https://showo.app/u/${username}` : ''

  useEffect(() => {
    setEmailText(
`Assunto: Candidatura a Estágio — ${displayName}

Olá,

Chamo-me ${displayName} e estou a candidatar-me a uma oportunidade de estágio na vossa empresa. Desenvolvi ${projects.length} projeto${projects.length !== 1 ? 's' : ''} que pode consultar no meu portfólio: ${profileUrl}

Fico disponível para qualquer questão.

Cumprimentos,
${displayName}`)
  }, [displayName, profileUrl, projects.length])

  function copy(text, key) {
    navigator.clipboard.writeText(text)
    setCopiedField(key)
    setTimeout(() => setCopiedField(null), 2200)
  }

  function downloadQR() {
    const svg = qrRef.current?.querySelector('svg')
    if (!svg) return
    const canvas = document.createElement('canvas')
    const size = 300
    canvas.width = size; canvas.height = size
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, size, size)
    const svgData = new XMLSerializer().serializeToString(svg)
    const img = new Image()
    img.onload = () => {
      ctx.drawImage(img, 0, 0, size, size)
      const link = document.createElement('a')
      link.download = `showo-qr-${username}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    }
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
  }

  if (!user) {
    navigate('/login')
    return null
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg }}>
      <Helmet><title>Kit de Estágio — Showo</title></Helmet>
      <Navbar />

      <div className="page-content" style={{ maxWidth: 700, margin: '0 auto', padding: '40px 24px 80px' }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ margin: '0 0 6px', fontSize: 24, fontWeight: 400, color: C.text, fontFamily: 'var(--font-heading)', letterSpacing: '-0.4px' }}>Kit de Estágio</h1>
          <p style={{ margin: 0, fontSize: 14, color: C.muted }}>Tudo o que precisas para conseguir um estágio com os teus projetos.</p>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
            <div style={{ width: 28, height: 28, border: `2px solid ${C.border}`, borderTop: `2px solid ${C.blue}`, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : projects.length === 0 ? (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: '48px 24px', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16, color: C.blue }}><Rocket size={32} /></div>
            <p style={{ color: C.text, fontSize: 15, fontWeight: 600, margin: '0 0 8px' }}>Cria o teu primeiro projeto</p>
            <p style={{ color: C.muted, fontSize: 13, margin: '0 0 20px', lineHeight: 1.6 }}>
              Precisas de pelo menos um projeto no teu portfólio para gerar o kit de candidatura.
            </p>
            <button
              onClick={() => navigate('/novo')}
              style={{ background: C.blue, border: 'none', borderRadius: 8, padding: '11px 22px', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Criar projeto
            </button>
          </div>
        ) : (
          <div style={{ background: C.card, border: `1px solid ${C.borderBright}`, borderRadius: 14, padding: '24px 26px 28px', display: 'flex', flexDirection: 'column', gap: 26 }}>

            {/* Profile link */}
            <div>
              <SectionLabel>O teu link de perfil</SectionLabel>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 9, padding: '9px 14px', fontSize: 13, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'inherit' }}>
                  {profileUrl}
                </div>
                <button
                  onClick={() => copy(profileUrl, 'profile')}
                  style={{ background: copiedField === 'profile' ? 'rgba(34,197,94,0.1)' : 'rgba(27,120,247,0.08)', border: `1px solid ${copiedField === 'profile' ? 'rgba(34,197,94,0.3)' : 'rgba(27,120,247,0.2)'}`, borderRadius: 8, padding: '8px 14px', color: copiedField === 'profile' ? C.green : C.blue, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', transition: 'all 0.15s' }}
                >
                  {copiedField === 'profile' ? <><Check size={13} style={{ verticalAlign: 'middle', marginRight: 3 }} />Copiado</> : 'Copiar'}
                </button>
              </div>
            </div>

            {/* Email template */}
            <div>
              <SectionLabel>Email de candidatura</SectionLabel>
              <textarea
                value={emailText}
                onChange={e => setEmailText(e.target.value)}
                rows={10}
                style={{ width: '100%', background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: 10, color: C.text, fontSize: 13, lineHeight: 1.7, padding: '12px 14px', resize: 'vertical', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s' }}
                onFocus={e => e.target.style.borderColor = C.blue}
                onBlur={e => e.target.style.borderColor = C.border}
              />
              <button
                onClick={() => copy(emailText, 'email')}
                style={{ marginTop: 8, background: copiedField === 'email' ? 'rgba(34,197,94,0.1)' : 'rgba(27,120,247,0.08)', border: `1px solid ${copiedField === 'email' ? 'rgba(34,197,94,0.3)' : 'rgba(27,120,247,0.2)'}`, borderRadius: 8, padding: '9px 18px', color: copiedField === 'email' ? C.green : C.blue, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}
              >
                {copiedField === 'email' ? <><Check size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />Copiado</> : <><Mail size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />Copiar email</>}
              </button>
            </div>

            {/* QR Code */}
            <div>
              <SectionLabel>QR Code do teu perfil</SectionLabel>
              <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
                <div ref={qrRef} style={{ background: '#fff', borderRadius: 10, padding: 12, flexShrink: 0 }}>
                  <QRCodeSVG value={profileUrl} size={110} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <button
                    onClick={downloadQR}
                    style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'rgba(27,120,247,0.08)', border: `1px solid rgba(27,120,247,0.2)`, borderRadius: 8, padding: '9px 16px', color: C.blue, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(27,120,247,0.14)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(27,120,247,0.08)'}
                  >
                    <Download size={14} /> Descarregar QR
                  </button>
                  <p style={{ margin: 0, fontSize: 12, color: C.muted, lineHeight: 1.55 }}>
                    Imprime e inclui no teu CV físico.
                  </p>
                </div>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  )
}
