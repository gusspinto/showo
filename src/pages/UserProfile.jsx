import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { QRCodeSVG } from 'qrcode.react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Navbar } from '../components/Navbar'
import CoverLetterModal from '../components/CoverLetterModal'

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
          background: `linear-gradient(135deg, ${color}18, ${color}06)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 36,
        }}>
          {project.area ? project.area[0] : '📁'}
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

export default function UserProfile() {
  const { username } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [showCoverLetter, setShowCoverLetter] = useState(false)
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
        <div style={{ fontSize: 48, marginBottom: 8 }}>🔍</div>
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
          <div style={{
            width: 80, height: 80, borderRadius: '50%', flexShrink: 0,
            background: `linear-gradient(135deg, ${C.blue}, #4f46e5)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 32, fontWeight: 900, color: '#fff',
            boxShadow: '0 8px 32px rgba(59,130,246,0.25)',
          }}>
            {displayName[0].toUpperCase()}
          </div>

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
                onClick={() => setShowCoverLetter(true)}
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
                ✉️ Kit de estágio
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
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: '44px 32px', textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📂</div>
            <p style={{ color: C.text, fontSize: 16, fontWeight: 700, margin: '0 0 6px' }}>Ainda sem projetos públicos</p>
            <p style={{ color: C.muted, fontSize: 14, margin: 0 }}>
              {isOwnProfile ? 'Cria o teu primeiro projeto e partilha-o aqui.' : 'Este utilizador ainda não tem projetos.'}
            </p>
            {isOwnProfile && (
              <button
                onClick={() => navigate('/novo')}
                style={{ marginTop: 20, background: C.blue, border: 'none', borderRadius: 8, padding: '10px 22px', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Criar projeto →
              </button>
            )}
          </div>
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

      {showCoverLetter && (
        <CoverLetterModal
          projects={projects}
          studentName={profile?.full_name || profile?.username || ''}
          onClose={() => setShowCoverLetter(false)}
        />
      )}
    </div>
  )
}
