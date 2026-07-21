import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { QRCodeSVG } from 'qrcode.react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Navbar } from '../components/Navbar'
import CreateProjectModal from '../components/CreateProjectModal'
import { Search, FolderOpen, X, Download, Rocket, QrCode, Pencil, Globe, ExternalLink, Link, Briefcase, ArrowRight, Star, MessageSquare, GraduationCap, Send, Lock } from 'lucide-react'
import ConvidarVagaModal from '../components/ConvidarVagaModal'

// ── Design tokens (aligned with the rest of the app) ──────────────────────────
const C = {
  bg:           'var(--c-bg)',
  bgAlt:        'var(--c-bg-alt)',
  card:         'var(--c-card)',
  cardHover:    'var(--c-card-hover)',
  border:       'var(--c-border)',
  borderBright: 'var(--c-border-bright)',
  blue:         '#1b78f7',
  blueHover:    '#1564d4',
  text:         'var(--c-text)',
  muted:        'var(--c-muted)',
  subtle:       'var(--c-subtle)',
  green:        '#22c55e',
  yellow:       '#fbbf24',
  orange:       '#f97316',
  red:          '#ef4444',
  glass: 'var(--c-glass)', glassHover: 'var(--c-glass-hover)',
  glassBorder: 'var(--c-glass-border)', glassBorderBright: 'var(--c-glass-border-bright)',
  glassStyle: { backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' },
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function areaGradient(area) {
  const a = (area || '').toLowerCase()
  if (a.includes('educa'))                                                     return ['#1e3a5f', '#2d6a4f']
  if (a.includes('comercial') || a.includes('marketing') || a.includes('vendas')) return ['#3d1a6e', '#1a3a6e']
  if (a.includes('tecnolog') || a.includes('informátic') || a.includes('programaç') || a.includes('software')) return ['#0d2137', '#1a4a6e']
  if (a.includes('saúde') || a.includes('saude') || a.includes('medical') || a.includes('bio')) return ['#1a4a2e', '#2d6a4f']
  return ['#1a1a3a', '#1a2d4a']
}

function scoreColor(score) {
  if (score == null) return C.muted
  if (score >= 90)   return C.green
  if (score >= 71)   return C.blue
  if (score >= 40)   return C.yellow
  return C.red
}

// ── ProjectCard ────────────────────────────────────────────────────────────────
function ProjectCard({ project, onClick }) {
  const [hovered, setHovered] = useState(false)
  const color = scoreColor(project.score)
  const [c1, c2] = areaGradient(project.area)

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...C.glassStyle,
        background: hovered ? C.glassHover : C.glass,
        border: `1px solid ${hovered ? C.glassBorderBright : C.glassBorder}`,
        borderRadius: 12,
        cursor: 'pointer',
        overflow: 'hidden',
        transition: 'background 0.15s, border-color 0.15s',
        boxShadow: 'none',
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
          background: `linear-gradient(135deg, ${c1}, ${c2})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: 40, fontWeight: 900, color: 'rgba(255,255,255,0.2)', userSelect: 'none', lineHeight: 1 }}>
            {project.name ? project.name[0].toUpperCase() : '?'}
          </span>
        </div>
      )}

      <div style={{ padding: '14px 16px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
          <span style={{ color: C.text, fontSize: 14, fontWeight: 700, lineHeight: 1.3, flex: 1 }}>
            {project.name}
          </span>
          {project.score != null && (
            <span style={{ color, fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
              {project.score}
            </span>
          )}
        </div>
        {project.ai_tagline && (
          <p style={{ margin: '0 0 10px', color: C.muted, fontSize: 12, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {project.ai_tagline}
          </p>
        )}
        {project.area && (
          <span style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>
            {project.area}
          </span>
        )}
      </div>
    </div>
  )
}

// ── QR Modal ───────────────────────────────────────────────────────────────────
function QRModal({ profileUrl, username, onClose }) {
  const qrRef = useRef(null)

  function downloadQR() {
    const svg = qrRef.current?.querySelector('svg')
    if (!svg) return
    const canvas = document.createElement('canvas')
    const size = 400
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

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 9800, background: 'rgba(5,9,18,0.88)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'inherit' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: C.card, border: `1px solid ${C.borderBright}`, borderRadius: 14, width: '100%', maxWidth: 340, boxShadow: 'none', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 14, right: 14, background: 'var(--c-card-hover)', border: `1px solid ${C.border}`, borderRadius: 8, width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.muted, cursor: 'pointer' }}>
          <X size={14} />
        </button>

        <div style={{ padding: '24px 24px 0' }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 400, color: C.text, fontFamily: 'var(--font-heading)', letterSpacing: '-0.3px' }}>QR Code do perfil</h2>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: C.muted }}>Aponta a câmara para abrir o teu portfólio</p>
        </div>

        <div style={{ padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
          <div ref={qrRef} style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: 'none' }}>
            <QRCodeSVG value={profileUrl} size={180} />
          </div>
          <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 14px', fontSize: 11, color: C.subtle, textAlign: 'center', wordBreak: 'break-all', width: '100%', boxSizing: 'border-box' }}>
            {profileUrl}
          </div>
          <div style={{ display: 'flex', gap: 10, width: '100%' }}>
            <button
              onClick={downloadQR}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, background: 'rgba(27,120,247,0.08)', border: `1px solid rgba(27,120,247,0.2)`, borderRadius: 10, padding: '10px 0', color: C.blue, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'background 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(27,120,247,0.14)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(27,120,247,0.08)'}
            >
              <Download size={14} /> Descarregar
            </button>
            <button
              onClick={() => window.print()}
              style={{ flex: 1, background: C.blue, border: 'none', borderRadius: 10, padding: '10px 0', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Imprimir
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function UserProfile() {
  const { username } = useParams()
  const navigate = useNavigate()
  const { user, profile: myProfile } = useAuth()
  const isRecruiter = myProfile?.role === 'recrutador' || myProfile?.role === 'empresa'
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [profile, setProfile] = useState(null)
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [showQR, setShowQR] = useState(false)
  const [saved, setSaved] = useState(false)
  const [savingCandidate, setSavingCandidate] = useState(false)
  const [recruiterVagas, setRecruiterVagas] = useState([])
  const [showInvite, setShowInvite] = useState(false)

  useEffect(() => {
    async function load() {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(username)

      const PROFILE_COLS = 'id, username, full_name, bio, is_admin, banned_at, role, avatar_url, available_for_work, company, company_role, company_website, linkedin_url, looking_for, company_description, company_location, company_industry, company_size, skills, school, total_xp, created_at, area'
      const { data: profileData, error: profileErr } = isUUID
        ? await supabase.from('profiles').select(PROFILE_COLS).eq('id', username).single()
        : await supabase.from('profiles').select(PROFILE_COLS).eq('username', username).single()

      if (profileErr || !profileData) { setNotFound(true); setLoading(false); return }
      setProfile(profileData)

      // Fire projects + saved-check in parallel — no longer sequential
      const projectsPromise = supabase
        .from('projects')
        .select('id, name, slug, score, area, ai_tagline, cover_url, created_at, views, ai_feedback, collaborator_count:project_collaborators(count)')
        .eq('user_id', profileData.id)
        .order('score', { ascending: false })

      const isRecruiterVisitor = user && (myProfile?.role === 'recrutador' || myProfile?.role === 'empresa') && profileData.id !== user.id
      const savedPromise = isRecruiterVisitor
        ? supabase.from('saved_candidates').select('id').eq('recruiter_id', user.id).eq('student_id', profileData.id).maybeSingle()
        : Promise.resolve({ data: null })

      const [{ data: projectsData, error: projErr }, { data: sc }] = await Promise.all([projectsPromise, savedPromise])

      let finalProjects = projectsData
      if (projErr || !projectsData) {
        const { data: fallback } = await supabase
          .from('projects')
          .select('id, name, slug, score, area, ai_tagline, cover_url, created_at, views, ai_feedback')
          .eq('user_id', profileData.id)
          .order('score', { ascending: false })
        finalProjects = fallback
      }

      setProjects((finalProjects ?? []).map(p => ({
        ...p,
        collaborator_count: Array.isArray(p.collaborator_count)
          ? (p.collaborator_count[0]?.count ?? 0)
          : (p.collaborator_count ?? 0),
      })))
      if (isRecruiterVisitor) setSaved(!!sc)

      setLoading(false)
    }
    load()
  }, [username])

  // Load recruiter's vagas for invite modal
  useEffect(() => {
    if (!user || !isRecruiter) return
    supabase
      .from('vagas')
      .select('id, title, location, type')
      .eq('recruiter_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .then(({ data }) => setRecruiterVagas(data || []))
  }, [user, isRecruiter])

  async function toggleSave() {
    if (!user || !profile || savingCandidate) return
    setSavingCandidate(true)
    if (saved) {
      await supabase.from('saved_candidates').delete().eq('recruiter_id', user.id).eq('student_id', profile.id)
      setSaved(false)
    } else {
      await supabase.from('saved_candidates').upsert({ recruiter_id: user.id, student_id: profile.id }, { onConflict: 'recruiter_id,student_id' })
      setSaved(true)
    }
    setSavingCandidate(false)
  }

  const isOwnProfile = user?.id === profile?.id
  const displayName  = profile?.full_name || profile?.username || 'Utilizador'
  const profileUrl   = window.location.href
  const scores       = projects.map(p => p.score).filter(Boolean)
  const bestScore    = scores.length ? Math.max(...scores) : null
  const [c1, c2]     = areaGradient(profile?.area || profile?.course || '')

  if (loading) return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 36, height: 36, border: `2px solid ${C.border}`, borderTop: `2px solid ${C.blue}`, borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (notFound) return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: 'inherit', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24, textAlign: 'center' }}>
        <Search size={44} color={C.muted} />
        <h2 style={{ color: C.text, fontSize: 22, fontWeight: 400, margin: 0, fontFamily: 'var(--font-heading)', letterSpacing: '-0.4px' }}>Perfil não encontrado</h2>
        <p style={{ color: C.muted, margin: 0, fontSize: 14 }}>O utilizador @{username} não existe.</p>
        <button onClick={() => navigate('/')} style={{ marginTop: 8, background: C.blue, border: 'none', borderRadius: 8, padding: '10px 24px', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 2px 8px rgba(27,120,247,0.2)' }}>
          Ir para o início
        </button>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: 'inherit' }}>
      <Helmet>
        <title>{displayName} — Showo</title>
        <meta name="description" content={profile.bio || `Projetos de ${displayName} no Showo`} />
        <meta property="og:title" content={`${displayName} — Showo`} />
        <meta property="og:description" content={profile.bio || `Projetos de ${displayName} no Showo`} />
        <meta property="og:url" content={profileUrl} />
      </Helmet>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }

        .up-header {
          background: ${C.glass};
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid ${C.glassBorder};
          border-radius: 14px;
          padding: 28px 28px 24px;
          margin-bottom: 28px;
          position: relative;
          overflow: hidden;
          box-shadow: none;
        }
        /* Subtle area gradient glow in top-right corner — dark mode only */
        .up-header::before {
          content: '';
          position: absolute;
          top: -60px; right: -60px;
          width: 280px; height: 280px;
          border-radius: 50%;
          background: radial-gradient(circle, ${c1}bb 0%, transparent 60%);
          pointer-events: none;
        }
        body.light .up-header::before {
          display: none;
        }

        .up-avatar {
          width: 112px; height: 112px;
          border-radius: 50%;
          object-fit: cover;
          flex-shrink: 0;
          border: 3px solid ${c1};
        }
        .up-avatar-placeholder {
          width: 112px; height: 112px;
          border-radius: 50%;
          flex-shrink: 0;
          background: linear-gradient(135deg, ${c1}, ${c2});
          display: flex; align-items: center; justify-content: center;
          font-size: 42px; font-weight: 400; font-family: var(--font-heading); color: rgba(255,255,255,0.85);
          border: 3px solid ${c1};
        }

        .up-stat-pill {
          display: inline-flex; align-items: center; gap: 5px;
          background: var(--c-bg-alt);
          border: 1px solid ${C.border};
          border-radius: 999px;
          padding: 4px 12px;
          font-size: 12px; color: ${C.muted};
        }
        .up-stat-pill strong {
          color: ${C.text}; font-weight: 700;
        }

        .up-social-link {
          display: inline-flex; align-items: center; gap: 5px;
          background: var(--c-bg-alt);
          border: 1px solid ${C.border};
          border-radius: 8px;
          padding: 5px 12px;
          font-size: 12px; color: ${C.muted};
          text-decoration: none;
          transition: border-color 0.15s, color 0.15s, background 0.15s;
          cursor: pointer;
        }
        .up-social-link:hover {
          border-color: ${C.borderBright};
          color: ${C.text};
          background: var(--c-card-hover);
        }

        .up-action-btn {
          background: transparent;
          border: 1px solid ${C.border};
          border-radius: 9px;
          padding: 8px 14px;
          color: ${C.muted};
          font-size: 13px; font-weight: 600;
          cursor: pointer; font-family: inherit;
          display: inline-flex; align-items: center; gap: 6px;
          transition: border-color 0.15s, color 0.15s, background 0.15s;
          white-space: nowrap;
        }
        .up-action-btn:hover {
          border-color: ${C.borderBright};
          color: ${C.text};
          background: var(--c-card-hover);
        }
        .up-action-btn.kit {
          background: rgba(234,179,8,0.07);
          border-color: rgba(234,179,8,0.22);
          color: ${C.yellow};
        }
        .up-action-btn.kit:hover {
          background: rgba(234,179,8,0.13);
          border-color: rgba(234,179,8,0.35);
          color: ${C.yellow};
        }
        .up-action-btn.primary {
          background: #1b78f7;
          border-color: transparent;
          color: #fff;
          box-shadow: 0 2px 8px rgba(27,120,247,0.2);
        }
        .up-action-btn.primary:hover {
          background: #1564d4;
          border-color: transparent;
          color: #fff;
          box-shadow: 0 2px 8px rgba(27,120,247,0.2);
        }

        .up-section-label {
          font-size: 12px; font-weight: 700; color: ${C.muted};
          text-transform: uppercase; letter-spacing: 0.07em;
          margin: 0 0 14px;
        }

        .up-projects-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 16px;
        }

        /* ── Responsive ── */
        @media (max-width: 860px) {
          .up-header { padding: 20px 18px 18px; border-radius: 14px; }
          .up-header-inner { flex-direction: column !important; gap: 16px !important; }
          .up-avatar, .up-avatar-placeholder { width: 80px !important; height: 80px !important; font-size: 32px !important; }
          .up-actions { flex-wrap: wrap !important; }
          .up-projects-grid { grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; }
        }
        /* QR + Edit always as icon buttons in card corner — hide text versions everywhere */
        .up-action-btn.up-hide-mobile { display: none !important; }

        @media (max-width: 600px) {
          .up-header { padding: 16px 14px 14px; border-radius: 12px; margin-bottom: 18px; }
          /* Projetos — coluna única */
          .up-projects-grid { grid-template-columns: 1fr !important; gap: 10px !important; }
          .up-stat-pills { flex-wrap: wrap; gap: 6px !important; }
          /* Skills section — reduce chip sizes */
          .up-skill-chip { padding: 5px 10px !important; font-size: 11px !important; }
          /* Profile stats row */
          .up-stats-row { flex-wrap: wrap !important; gap: 8px !important; }
          /* Bio section */
          .up-bio { font-size: 14px !important; }
        }
        @media (max-width: 420px) {
          .up-projects-grid { grid-template-columns: 1fr; }
          /* Profile header (avatar, name, etc.) */
          .up-header-meta { flex-direction: column !important; align-items: flex-start !important; gap: 8px !important; }
        }
      `}</style>

      <Navbar />

      <div className="page-content">

        {/* ── Profile header card ── */}
        <div className="up-header">
          {/* Mobile-only: Edit + QR icon buttons in top-right corner of card */}
          <div
            className="up-card-btns-mobile"
            style={{ display: 'flex', position: 'absolute', top: 14, right: 14, zIndex: 2, gap: 6 }}
          >
            <button
              onClick={() => setShowQR(true)}
              style={{ background: 'var(--c-card-hover)', border: `1px solid ${C.border}`, borderRadius: 8, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: C.muted }}
              title="QR Code"
            >
              <QrCode size={15} />
            </button>
            {isOwnProfile && (
              <button
                onClick={() => navigate('/settings')}
                style={{ background: 'var(--c-card-hover)', border: `1px solid ${C.border}`, borderRadius: 8, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: C.muted }}
                title="Editar perfil"
              >
                <Pencil size={15} />
              </button>
            )}
          </div>

          {/* Message button — shown for non-own profiles, positioned at bottom-right of header */}
          {!isOwnProfile && user && (
            <div style={{ position: 'absolute', bottom: 22, right: 22, zIndex: 3 }}>
              <button
                onClick={() => navigate(`/mensagens?to=${profile.id}`)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 7,
                  background: '#1b78f7', border: 'none',
                  borderRadius: 9, padding: '9px 18px',
                  color: '#fff', fontSize: 13, fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'inherit',
                  whiteSpace: 'nowrap',
                  boxShadow: '0 2px 8px rgba(27,120,247,0.2)',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#1564d4' }}
                onMouseLeave={e => { e.currentTarget.style.background = '#1b78f7' }}
              >
                <MessageSquare size={14} /> Mensagem
              </button>
            </div>
          )}

          <div className="up-header-inner up-header-meta" style={{ display: 'flex', alignItems: 'flex-start', gap: 22, position: 'relative', zIndex: 1 }}>

            {/* Avatar */}
            {profile.avatar_url
              ? <img src={profile.avatar_url} alt={displayName} className="up-avatar" />
              : <div className="up-avatar-placeholder">{displayName[0].toUpperCase()}</div>
            }

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
              {/* Name + username */}
              <div style={{ marginBottom: 6 }}>
                <h1 style={{ color: C.text, fontSize: 26, fontWeight: 400, margin: '0 0 3px', letterSpacing: '-0.6px', lineHeight: 1.15, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', fontFamily: 'var(--font-heading)' }}>
                  {displayName}
                  {projects.some(p => (p.score || 0) >= 100) && (
                    <span title="Tem um projeto com score perfeito" style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      width: 28, height: 28, borderRadius: 8,
                      background: '#1b78f7',
                      boxShadow: '0 0 8px rgba(27,120,247,0.5)',
                      flexShrink: 0,
                    }}>
                      <GraduationCap size={15} color="#fff" />
                    </span>
                  )}
                </h1>
                {profile.username && (
                  <span style={{ color: C.muted, fontSize: 13, fontWeight: 400 }}>@{profile.username}</span>
                )}
              </div>

              {/* Area / school */}
              {(profile.area || profile.course || profile.school) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 10, marginTop: 6 }}>
                  {(profile.area || profile.course) && (
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#1b78f7' }}>
                      {profile.area || profile.course}
                    </span>
                  )}
                  {profile.school && (
                    <>
                      {(profile.area || profile.course) && <span style={{ color: C.subtle, fontSize: 12 }}>·</span>}
                      <span style={{ fontSize: 12, color: C.muted }}>{profile.school}</span>
                    </>
                  )}
                </div>
              )}

              {/* Bio */}
              {profile.bio && (
                <p className="up-bio" style={{ color: C.muted, fontSize: 14, margin: '0 0 12px', lineHeight: 1.6, maxWidth: 480 }}>
                  {profile.bio}
                </p>
              )}

              {/* Available for work badge */}
              {profile.available_for_work && profile.role === 'aluno' && (
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  background: 'rgba(27,120,247,0.1)', border: '1px solid rgba(27,120,247,0.3)',
                  borderRadius: 7, padding: '5px 14px', marginBottom: 12,
                  color: '#1b78f7', fontSize: 13, fontWeight: 700,
                }}>
                  <Briefcase size={13} style={{ flexShrink: 0 }} /> Disponível para estágio
                </div>
              )}

              {/* Stats */}
              <div className="up-stat-pills up-stats-row" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <span className="up-stat-pill">
                  <strong>{projects.length}</strong> projeto{projects.length !== 1 ? 's' : ''}
                </span>
                {bestScore != null && (
                  <span className="up-stat-pill">
                    Melhor score: <strong style={{ color: scoreColor(bestScore) }}>{bestScore}</strong>
                  </span>
                )}
                {profile.role === 'professor' && (
                  <span className="up-stat-pill">
                    <strong style={{ color: C.blue }}>Professor</strong>
                  </span>
                )}
              </div>

              {/* Social links */}
              {(profile.linkedin || profile.github || profile.website) && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                  {profile.linkedin && (
                    <a href={profile.linkedin} target="_blank" rel="noopener noreferrer" className="up-social-link">
                      <ExternalLink size={12} /> LinkedIn
                    </a>
                  )}
                  {profile.github && (
                    <a href={profile.github} target="_blank" rel="noopener noreferrer" className="up-social-link">
                      <Link size={12} /> GitHub
                    </a>
                  )}
                  {profile.website && (
                    <a href={profile.website} target="_blank" rel="noopener noreferrer" className="up-social-link">
                      <Globe size={12} /> Website
                    </a>
                  )}
                </div>
              )}

              {/* Skills chips */}
              {profile.skills && profile.skills.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                  {profile.skills.map(skill => (
                    <span key={skill} className="up-skill-chip" style={{
                      display: 'inline-flex', alignItems: 'center',
                      background: 'rgba(27,120,247,0.08)', color: '#1b78f7',
                      border: '1px solid rgba(27,120,247,0.2)',
                      borderRadius: 6, padding: '3px 12px',
                      fontSize: 12, fontWeight: 600,
                    }}>
                      {skill}
                    </span>
                  ))}
                </div>
              )}


              {/* Action buttons */}
              <div className="up-actions" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button className="up-action-btn up-hide-mobile" onClick={() => setShowQR(true)}>
                  <QrCode size={13} /> QR Code
                </button>
                {isOwnProfile && (
                  <button className="up-action-btn up-hide-mobile" onClick={() => navigate('/settings')}>
                    <Pencil size={13} /> Editar perfil
                  </button>
                )}
                {/* Recruiter actions — only when viewing someone else's profile */}
                {!isOwnProfile && isRecruiter && (
                  <>
                    <button
                      onClick={toggleSave}
                      disabled={savingCandidate}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        background: saved ? 'rgba(245,158,11,0.12)' : 'transparent',
                        border: `1px solid ${saved ? 'rgba(245,158,11,0.4)' : C.border}`,
                        borderRadius: 9, padding: '8px 14px',
                        color: saved ? '#f59e0b' : C.muted,
                        fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                        transition: 'all 0.15s',
                      }}
                      title={saved ? 'Remover dos guardados' : 'Guardar candidato'}
                    >
                      <Star size={13} fill={saved ? '#f59e0b' : 'none'} />
                      {saved ? 'Guardado' : 'Guardar'}
                    </button>
                    <button
                      onClick={() => setShowInvite(true)}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        background: '#1b78f7',
                        border: 'none',
                        borderRadius: 9, padding: '8px 16px',
                        color: '#fff',
                        fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                        boxShadow: '0 2px 8px rgba(27,120,247,0.2)',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#1564d4' }}
                      onMouseLeave={e => { e.currentTarget.style.background = '#1b78f7' }}
                    >
                      <Send size={13} /> Convidar para vaga
                    </button>
                  </>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* ── Projects ── */}
        <div>
          <p className="up-section-label">
            Projetos
            {projects.length > 0 && <span style={{ color: C.subtle, marginLeft: 6, fontWeight: 500, textTransform: 'none', letterSpacing: 0 }}>({projects.length})</span>}
          </p>

          {projects.length === 0 ? (
            isOwnProfile ? (
              <div style={{ ...C.glassStyle, background: C.glass, border: `1px solid ${C.glassBorder}`, borderRadius: 12, padding: '48px 32px', textAlign: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16, color: C.blue }}><Rocket size={40} /></div>
                <p style={{ color: C.text, fontSize: 17, fontWeight: 700, margin: '0 0 8px' }}>
                  {myProfile?.role === 'professor' ? 'Ainda não tens projetos' : 'O teu portfólio começa aqui'}
                </p>
                {myProfile?.role !== 'professor' && (
                  <>
                    <p style={{ color: C.muted, fontSize: 14, margin: '0 0 24px', maxWidth: 360, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.65 }}>
                      Adiciona o teu primeiro projeto e transforma-o numa página profissional com a ajuda da IA.
                    </p>
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                      <button onClick={() => setShowCreateModal(true)} style={{ background: C.blue, border: 'none', borderRadius: 8, padding: '11px 24px', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 2px 8px rgba(27,120,247,0.2)' }}>
                        <span style={{display:'flex',alignItems:'center',gap:6}}>Criar projeto <ArrowRight size={14} /></span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div style={{ ...C.glassStyle, background: C.glass, border: `1px solid ${C.glassBorder}`, borderRadius: 12, padding: '48px 32px', textAlign: 'center' }}>
                <FolderOpen size={40} color={C.subtle} style={{ marginBottom: 14 }} />
                <p style={{ color: C.text, fontSize: 16, fontWeight: 700, margin: '0 0 8px' }}>Ainda sem projetos</p>
                <p style={{ color: C.muted, fontSize: 14, margin: 0, lineHeight: 1.6 }}>
                  {profile?.full_name?.split(' ')[0] || 'Este utilizador'} ainda não partilhou nenhum projeto.
                </p>
              </div>
            )
          ) : (
            <div className="up-projects-grid">
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
      </div>

      {showQR && (
        <QRModal profileUrl={profileUrl} username={profile?.username || profile?.id || ''} onClose={() => setShowQR(false)} />
      )}
      {showCreateModal && <CreateProjectModal onClose={() => setShowCreateModal(false)} />}
      {showInvite && profile && (
        <ConvidarVagaModal
          studentId={profile.id}
          studentName={profile.full_name || profile.username || 'Estudante'}
          vagas={recruiterVagas}
          onClose={() => setShowInvite(false)}
        />
      )}
    </div>
  )
}
