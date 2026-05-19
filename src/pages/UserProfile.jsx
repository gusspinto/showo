import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { QRCodeSVG } from 'qrcode.react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Navbar } from '../components/Navbar'
import { Mail, Search, FolderOpen, X, Check, Download, Rocket } from 'lucide-react'

const C = {
  bg: '#0d1424',
  card: '#111827',
  cardHover: '#16213a',
  border: '#1e3050',
  blue: '#3b82f6',
  muted: '#7d93b0',
  text: '#e8f2ff',
  subtle: '#3d5270',
  green: '#34d399',
  yellow: '#fbbf24',
  red: '#f87171',
}

function getAreaGradient(area) {
  const a = (area || '').toLowerCase()
  if (a.includes('educa')) return 'linear-gradient(135deg, #1e3a5f, #2d6a4f)'
  if (a.includes('comercial') || a.includes('marketing') || a.includes('vendas')) return 'linear-gradient(135deg, #3d1a6e, #1a3a6e)'
  if (a.includes('tecnolog') || a.includes('informátic') || a.includes('programaç') || a.includes('software')) return 'linear-gradient(135deg, #0d2137, #1a4a6e)'
  if (a.includes('saúde') || a.includes('saude') || a.includes('medical') || a.includes('bio')) return 'linear-gradient(135deg, #1a4a2e, #2d6a4f)'
  return 'linear-gradient(135deg, #2d1a4a, #1a2d6e)'
}

function getScoreColor(score) {
  if (score == null) return C.muted
  if (score >= 90) return C.green
  if (score >= 71) return C.blue
  if (score >= 40) return C.yellow
  return C.red
}

function ProjectCard({ project, onClick }) {
  const [hovered, setHovered] = useState(false)
  const color = getScoreColor(project.score)

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? C.cardHover : C.card,
        border: `1px solid ${hovered ? '#2a4070' : C.border}`,
        borderRadius: 14,
        padding: 0,
        cursor: 'pointer',
        overflow: 'hidden',
        transition: 'background 0.15s, border-color 0.15s, transform 0.15s',
        transform: hovered ? 'translateY(-2px)' : 'none',
        boxShadow: hovered ? '0 8px 32px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.2)',
      }}
    >
      {/* Cover */}
      {project.cover_url ? (
        <div style={{ height: 140, overflow: 'hidden', background: C.border }}>
          <img src={project.cover_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        </div>
      ) : (
        <div style={{
          height: 100,
          background: getAreaGradient(project.area),
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: 40, fontWeight: 900, color: 'rgba(255,255,255,0.25)', userSelect: 'none', lineHeight: 1 }}>
            {project.name ? project.name[0].toUpperCase() : '?'}
          </span>
        </div>
      )}

      <div style={{ padding: '16px 18px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
          <span style={{ color: C.text, fontSize: 15, fontWeight: 700, lineHeight: 1.3, flex: 1 }}>
            {project.name}
          </span>
          {project.score != null && (
            <span style={{
              background: `${color}18`, border: `1px solid ${color}44`,
              borderRadius: 6, padding: '2px 8px', color, fontSize: 12, fontWeight: 700, flexShrink: 0,
            }}>
              {project.score}
            </span>
          )}
        </div>
        {project.ai_tagline && (
          <p style={{ margin: '0 0 10px', color: C.muted, fontSize: 13, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {project.ai_tagline}
          </p>
        )}
        {project.area && (
          <span style={{ fontSize: 12, color: C.muted, background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`, borderRadius: 5, padding: '2px 8px' }}>
            {project.area}
          </span>
        )}
      </div>
    </div>
  )
}

function KitDeEstagioModal({ profile, projects, onClose }) {
  const [copiedField, setCopiedField] = useState(null)
  const [emailText, setEmailText] = useState('')
  const qrRef = useRef(null)

  const displayName = profile?.full_name || profile?.username || 'O teu nome'
  const username = profile?.username || profile?.id || ''
  const profileUrl = `https://showo.app/u/${username}`

  useEffect(() => {
    setEmailText(
`Assunto: Candidatura a Estágio — ${displayName}

Olá,

Chamo-me ${displayName} e estou a candidatar-me a uma oportunidade de estágio na vossa empresa. Desenvolvi ${projects.length} projeto${projects.length !== 1 ? 's' : ''} que pode consultar no meu portfólio: ${profileUrl}

Fico disponível para qualquer questão.

Cumprimentos,
${displayName}`
    )
  }, [displayName, username, projects.length])

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
    canvas.width = size
    canvas.height = size
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

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9800,
        background: 'rgba(5,9,18,0.88)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px', fontFamily: 'Inter, sans-serif',
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: '#0d1829', border: '1px solid #1e3050',
        borderRadius: 20, width: '100%', maxWidth: 560,
        maxHeight: '90vh', overflow: 'auto',
        boxShadow: '0 32px 80px rgba(0,0,0,0.7)',
      }}>
        {/* Header */}
        <div style={{ padding: '24px 28px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 800, color: C.text }}>Kit de Estágio</h2>
            <p style={{ margin: 0, fontSize: 13, color: C.muted }}>Tudo o que precisas para conseguir um estágio com os teus projetos Showo.</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '20px 28px 28px', display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Section 1: Profile link */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
              O teu link de perfil
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{
                flex: 1, background: '#060c16', border: '1px solid #1e3050',
                borderRadius: 9, padding: '10px 14px',
                fontSize: 14, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                fontFamily: 'inherit',
              }}>
                {profileUrl}
              </div>
              <button
                onClick={() => copy(profileUrl, 'profile')}
                style={{
                  background: copiedField === 'profile' ? 'rgba(52,211,153,0.1)' : 'rgba(59,130,246,0.1)',
                  border: `1px solid ${copiedField === 'profile' ? 'rgba(52,211,153,0.3)' : 'rgba(59,130,246,0.2)'}`,
                  borderRadius: 8, padding: '8px 14px',
                  color: copiedField === 'profile' ? C.green : '#60a5fa',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s',
                }}
              >
                {copiedField === 'profile' ? <><Check size={13} style={{ verticalAlign: 'middle', marginRight: 3 }} />Copiado</> : 'Copiar'}
              </button>
            </div>
          </div>

          {/* Section 2: Email template */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
              Email de candidatura
            </div>
            <textarea
              value={emailText}
              onChange={e => setEmailText(e.target.value)}
              rows={10}
              style={{
                width: '100%', background: '#060c16',
                border: '1.5px solid #1e3050', borderRadius: 10,
                color: C.text, fontSize: 13, lineHeight: 1.7,
                padding: '12px 14px', resize: 'vertical',
                fontFamily: 'inherit', outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s',
              }}
              onFocus={e => e.target.style.borderColor = '#3b82f6'}
              onBlur={e => e.target.style.borderColor = '#1e3050'}
            />
            <button
              onClick={() => copy(emailText, 'email')}
              style={{
                marginTop: 8,
                background: copiedField === 'email' ? 'rgba(52,211,153,0.1)' : 'rgba(59,130,246,0.1)',
                border: `1px solid ${copiedField === 'email' ? 'rgba(52,211,153,0.3)' : 'rgba(59,130,246,0.2)'}`,
                borderRadius: 8, padding: '9px 18px',
                color: copiedField === 'email' ? C.green : '#60a5fa',
                fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                transition: 'all 0.15s',
              }}
            >
              {copiedField === 'email' ? <><Check size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />Copiado</> : 'Copiar email'}
            </button>
          </div>

          {/* Section 3: QR Code */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
              QR Code do teu perfil
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
              <div ref={qrRef} style={{ background: '#fff', borderRadius: 12, padding: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.3)', flexShrink: 0 }}>
                <QRCodeSVG value={profileUrl} size={110} />
              </div>
              <div>
                <button
                  onClick={downloadQR}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 7,
                    background: 'rgba(59,130,246,0.1)',
                    border: '1px solid rgba(59,130,246,0.2)',
                    borderRadius: 8, padding: '9px 16px',
                    color: '#60a5fa', fontSize: 13, fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'inherit',
                    marginBottom: 10,
                    transition: 'all 0.15s',
                  }}
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
      </div>
    </div>
  )
}

export default function UserProfile() {
  const { username } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [showKitModal, setShowKitModal] = useState(false)
  const [showQR, setShowQR] = useState(false)

  useEffect(() => {
    async function load() {
      // Try by username first, then by id (uuid fallback)
      let profileData = null
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(username)

      if (isUUID) {
        const { data } = await supabase.from('profiles').select('*').eq('id', username).single()
        profileData = data
      } else {
        const { data } = await supabase.from('profiles').select('*').eq('username', username).single()
        profileData = data
      }

      if (!profileData) {
        setNotFound(true)
        setLoading(false)
        return
      }

      setProfile(profileData)

      // Load public projects for this user
      const { data: projectsData } = await supabase
        .from('projects')
        .select('id, name, slug, score, area, ai_tagline, cover_url, created_at')
        .eq('user_id', profileData.id)
        .order('score', { ascending: false })

      setProjects(projectsData ?? [])
      setLoading(false)
    }
    load()
  }, [username])

  const isOwnProfile = user?.id === profile?.id
  const displayName = profile?.full_name || profile?.username || 'Utilizador'
  const profileUrl = window.location.href
  const scores = projects.map(p => p.score).filter(Boolean)
  const bestScore = scores.length ? Math.max(...scores) : null

  if (loading) return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 36, height: 36, border: `2px solid ${C.border}`, borderTop: `2px solid ${C.blue}`, borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (notFound) return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: 'Inter, sans-serif', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24, textAlign: 'center' }}>
        <div style={{ marginBottom: 8 }}><Search size={48} color={C.muted} /></div>
        <h2 style={{ color: C.text, fontSize: 22, fontWeight: 800, margin: 0 }}>Perfil não encontrado</h2>
        <p style={{ color: C.muted, margin: 0, fontSize: 14 }}>O utilizador @{username} não existe.</p>
        <button onClick={() => navigate('/')} style={{ marginTop: 8, background: C.blue, border: 'none', borderRadius: 8, padding: '10px 24px', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          Ir para o início
        </button>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: 'Inter, sans-serif' }}>
      <Helmet>
        <title>{displayName} — Showo</title>
        <meta name="description" content={profile.bio || `Projetos de ${displayName} no Showo`} />
        <meta property="og:title" content={`${displayName} — Showo`} />
        <meta property="og:description" content={profile.bio || `Projetos de ${displayName} no Showo`} />
        <meta property="og:url" content={profileUrl} />
      </Helmet>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <Navbar />

      <div style={{ maxWidth: 820, margin: '0 auto', padding: '52px 24px 80px' }}>

        {/* Profile header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24, marginBottom: 48, flexWrap: 'wrap' }}>
          {/* Avatar */}
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={displayName}
              style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, boxShadow: '0 8px 32px rgba(59,130,246,0.25)' }}
            />
          ) : (
            <div style={{
              width: 80, height: 80, borderRadius: '50%', flexShrink: 0,
              background: `linear-gradient(135deg, ${C.blue}, #4f46e5)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 32, fontWeight: 900, color: '#fff',
              boxShadow: '0 8px 32px rgba(59,130,246,0.25)',
            }}>
              {displayName[0].toUpperCase()}
            </div>
          )}

          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 4 }}>
              <h1 style={{ color: C.text, fontSize: 24, fontWeight: 800, margin: 0, letterSpacing: '-0.3px' }}>
                {displayName}
              </h1>
              {profile.username && (
                <span style={{ color: C.subtle, fontSize: 15, fontWeight: 400 }}>@{profile.username}</span>
              )}
            </div>
            {profile.bio && (
              <p style={{ color: C.muted, fontSize: 15, margin: '0 0 14px', lineHeight: 1.65, maxWidth: 520 }}>
                {profile.bio}
              </p>
            )}
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              <span style={{ color: C.muted, fontSize: 13 }}>
                <span style={{ color: C.text, fontWeight: 700 }}>{projects.length}</span> projeto{projects.length !== 1 ? 's' : ''}
              </span>
              {bestScore != null && (
                <span style={{ color: C.muted, fontSize: 13 }}>
                  Melhor score: <span style={{ color: getScoreColor(bestScore), fontWeight: 700 }}>{bestScore}</span>
                </span>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', flexShrink: 0 }}>
            {isOwnProfile && projects.length > 0 && (
              <button
                onClick={() => setShowKitModal(true)}
                style={{
                  background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)',
                  borderRadius: 8, padding: '9px 14px',
                  color: '#fbbf24', fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(251,191,36,0.14)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(251,191,36,0.08)'}
              >
                <Mail size={14} style={{ verticalAlign: 'middle', marginRight: 5 }} />Kit de estágio
              </button>
            )}
            <button
              onClick={() => setShowQR(s => !s)}
              style={{
                background: showQR ? 'rgba(59,130,246,0.12)' : 'transparent',
                border: `1px solid ${showQR ? 'rgba(59,130,246,0.4)' : C.border}`,
                borderRadius: 8, padding: '9px 14px',
                color: showQR ? '#60a5fa' : C.muted, fontSize: 13, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit',
                transition: 'all 0.15s',
              }}
            >
              QR
            </button>
            {isOwnProfile && (
              <button
                onClick={() => navigate('/settings')}
                style={{
                  background: 'transparent', border: `1px solid ${C.border}`,
                  borderRadius: 8, padding: '9px 14px',
                  color: C.muted, fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit',
                  transition: 'border-color 0.15s, color 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#2a4275'; e.currentTarget.style.color = C.text }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.muted }}
              >
                Editar perfil
              </button>
            )}
          </div>
        </div>

        {/* QR Panel */}
        {showQR && (
          <div style={{
            background: C.card, border: `1px solid ${C.border}`,
            borderRadius: 16, padding: '24px 28px', marginBottom: 32,
            display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap',
          }}>
            <div style={{ background: '#fff', borderRadius: 12, padding: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
              <QRCodeSVG value={profileUrl} size={120} />
            </div>
            <div>
              <h3 style={{ color: C.text, fontSize: 16, fontWeight: 700, margin: '0 0 6px' }}>QR do teu perfil</h3>
              <p style={{ color: C.muted, fontSize: 13, margin: '0 0 12px', lineHeight: 1.6 }}>
                Imprime e usa em apresentações, feiras de ciências ou cartões de visita.<br />
                Aponta para: <span style={{ color: '#60a5fa' }}>{profileUrl}</span>
              </p>
              <button
                onClick={() => window.print()}
                style={{
                  background: C.blue, border: 'none', borderRadius: 8,
                  padding: '8px 18px', color: '#fff', fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Imprimir / Guardar PDF
              </button>
            </div>
          </div>
        )}

        {/* Projects */}
        <h2 style={{ color: C.text, fontSize: 16, fontWeight: 700, margin: '0 0 18px', letterSpacing: '-0.2px' }}>
          Projetos
          {projects.length > 0 && (
            <span style={{ color: C.muted, fontWeight: 400, fontSize: 14, marginLeft: 8 }}>({projects.length})</span>
          )}
        </h2>

        {projects.length === 0 ? (
          isOwnProfile ? (
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: '48px 32px', textAlign: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16, color: '#3b82f6' }}><Rocket size={40} /></div>
              <p style={{ color: C.text, fontSize: 18, fontWeight: 700, margin: '0 0 8px' }}>O teu portfólio começa aqui</p>
              <p style={{ color: C.muted, fontSize: 14, margin: '0 0 24px', maxWidth: 360, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.6 }}>
                Adiciona o teu primeiro projeto escolar ou pessoal e transforma-o numa página profissional com a ajuda da IA.
              </p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  onClick={() => navigate('/interview')}
                  style={{ background: C.blue, border: 'none', borderRadius: 8, padding: '11px 24px', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  Criar com IA →
                </button>
                <button
                  onClick={() => navigate('/novo')}
                  style={{ background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 8, padding: '11px 24px', color: C.muted, fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  Preencher manualmente
                </button>
              </div>
            </div>
          ) : (
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: '48px 32px', textAlign: 'center' }}>
              <div style={{ marginBottom: 14 }}><FolderOpen size={40} color={C.subtle} /></div>
              <p style={{ color: C.text, fontSize: 16, fontWeight: 700, margin: '0 0 8px' }}>Ainda sem projetos</p>
              <p style={{ color: C.muted, fontSize: 14, margin: 0, lineHeight: 1.6 }}>
                {profile?.full_name?.split(' ')[0] || 'Este utilizador'} ainda não partilhou nenhum projeto.
              </p>
            </div>
          )
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
            {projects.map(project => (
              <ProjectCard
                key={project.id}
                project={project}
                onClick={() => navigate(`/projeto/${project.slug}`)}
              />
            ))}
          </div>
        )}
      </div>

      {showKitModal && (
        <KitDeEstagioModal
          profile={profile}
          projects={projects}
          onClose={() => setShowKitModal(false)}
        />
      )}
    </div>
  )
}
