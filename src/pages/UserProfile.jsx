import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { QRCodeSVG } from 'qrcode.react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Navbar } from '../components/Navbar'
import { Search, FolderOpen, X, Download, Rocket, QrCode, Pencil, Globe, ExternalLink, Link, Briefcase, ArrowRight, Star, MessageSquare, GraduationCap, Send, Lock } from 'lucide-react'
import ConvidarVagaModal from '../components/ConvidarVagaModal'
import './UserProfile.css'

function areaGradient(area) {
  const a = (area || '').toLowerCase()
  if (a.includes('educa'))                                                     return ['#1e3a5f', '#2d6a4f']
  if (a.includes('comercial') || a.includes('marketing') || a.includes('vendas')) return ['#3d1a6e', '#1a3a6e']
  if (a.includes('tecnolog') || a.includes('informátic') || a.includes('programaç') || a.includes('software')) return ['#0d2137', '#1a4a6e']
  if (a.includes('saúde') || a.includes('saude') || a.includes('medical') || a.includes('bio')) return ['#1a4a2e', '#2d6a4f']
  return ['#1a1a3a', '#1a2d4a']
}

function scoreColor(score) {
  if (score == null) return 'var(--color-text-secondary)'
  if (score >= 90)   return 'var(--color-success)'
  if (score >= 71)   return 'var(--color-primary)'
  if (score >= 40)   return 'var(--color-warning)'
  return 'var(--color-error)'
}

function ProjectCard({ project, onClick, featured }) {
  const color = scoreColor(project.score)
  const [c1, c2] = areaGradient(project.area)

  return (
    <div className={`up-project-card${featured ? ' up-project-card--featured' : ''}`} onClick={onClick}>
      {project.cover_url ? (
        <div className="up-card-cover-img">
          <img src={project.cover_url} alt="" />
        </div>
      ) : (
        <div className="up-card-cover-fallback" style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}>
          <span className="up-card-cover-letter">
            {project.name ? project.name[0].toUpperCase() : '?'}
          </span>
        </div>
      )}

      <div className="up-card-body">
        <div className="up-card-title-row">
          <span className="up-card-name">{project.name}</span>
          {project.score != null && (
            <span className="up-card-score" style={{ color }}>{project.score}</span>
          )}
        </div>
        {project.ai_tagline && <p className="up-card-tagline">{project.ai_tagline}</p>}
        {project.area && <span className="up-card-area">{project.area}</span>}
      </div>
    </div>
  )
}

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
    <div className="up-qr-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="up-qr-card">
        <button onClick={onClose} className="up-qr-close"><X size={14} /></button>

        <div className="up-qr-header">
          <h2 className="up-qr-title">QR Code do perfil</h2>
          <p className="up-qr-subtitle">Aponta a câmara para abrir o teu portfólio</p>
        </div>

        <div className="up-qr-body">
          <div ref={qrRef} className="up-qr-svg-wrap">
            <QRCodeSVG value={profileUrl} size={180} />
          </div>
          <div className="up-qr-url">{profileUrl}</div>
          <div className="up-qr-actions">
            <button onClick={downloadQR} className="up-qr-download">
              <Download size={14} /> Descarregar
            </button>
            <button onClick={() => window.print()} className="up-qr-print">Imprimir</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ProfileSkeleton() {
  return (
    <>
      <div className="skel up-skeleton-header">
        <div className="up-skel-row">
          <div className="skel-circle" style={{ width: 112, height: 112 }} />
          <div className="flex-col gap-3 flex-1">
            <div className="skel-line w-60 h-xl" />
            <div className="skel-line w-40" />
            <div className="skel-line w-80 h-lg" />
            <div className="flex gap-2 mt-2">
              <div className="skel-line h-lg" style={{ width: 90 }} />
              <div className="skel-line h-lg" style={{ width: 120 }} />
            </div>
          </div>
        </div>
      </div>
      <div className="skel-line w-40 h-sm mb-4" />
      <div className="skel up-skeleton-projects" style={{ animationDelay: '0.15s' }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="skel-card">
            <div className="skel-cover" />
            <div className="flex-col gap-2 p-4">
              <div className="skel-line w-80 h-lg" />
              <div className="skel-line w-full" />
              <div className="skel-line w-40" />
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

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

      const projectsPromise = supabase
        .from('projects')
        .select('id, name, slug, score, area, ai_tagline, cover_url, created_at, views, ai_feedback, featured, featured_order, collaborator_count:project_collaborators(count)')
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
          .select('id, name, slug, score, area, ai_tagline, cover_url, created_at, views, ai_feedback, featured, featured_order')
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
    <div className="min-h-screen bg-page">
      <Navbar />
      <div className="page-content"><ProfileSkeleton /></div>
    </div>
  )

  if (notFound) return (
    <div className="min-h-screen bg-page flex-col">
      <Navbar />
      <div className="up-not-found">
        <Search size={44} color="var(--color-text-secondary)" />
        <h2>Perfil não encontrado</h2>
        <p>O utilizador @{username} não existe.</p>
        <button onClick={() => navigate('/')} className="up-not-found-btn">Ir para o início</button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-page">
      <Helmet>
        <title>{displayName} — Showo</title>
        <meta name="description" content={profile.bio || `Projetos de ${displayName} no Showo`} />
        <meta property="og:title" content={`${displayName} — Showo`} />
        <meta property="og:description" content={profile.bio || `Projetos de ${displayName} no Showo`} />
        <meta property="og:url" content={profileUrl} />
      </Helmet>

      <style>{`
        .up-header::before {
          content: '';
          position: absolute;
          top: -60px; right: -60px;
          width: 280px; height: 280px;
          border-radius: 50%;
          background: radial-gradient(circle, ${c1}bb 0%, transparent 60%);
          pointer-events: none;
        }
        body.light .up-header::before { display: none; }
      `}</style>

      <Navbar />

      <div className="page-content">

        {/* ── Profile header card ── */}
        <div className="up-header">
          <div className="up-card-btns-mobile">
            <button onClick={() => setShowQR(true)} className="up-icon-btn" title="QR Code">
              <QrCode size={15} />
            </button>
            {isOwnProfile && (
              <button onClick={() => navigate('/settings')} className="up-icon-btn" title="Editar perfil">
                <Pencil size={15} />
              </button>
            )}
          </div>

          {!isOwnProfile && user && (
            <div className="up-msg-wrap">
              <button onClick={() => navigate(`/mensagens?to=${profile.id}`)} className="up-msg-btn">
                <MessageSquare size={14} /> Mensagem
              </button>
            </div>
          )}

          <div className="up-header-inner">
            {profile.avatar_url
              ? <img src={profile.avatar_url} alt={displayName} className="up-avatar" style={{ borderColor: c1 }} />
              : <div className="up-avatar-placeholder" style={{ background: `linear-gradient(135deg, ${c1}, ${c2})`, borderColor: c1 }}>{displayName[0].toUpperCase()}</div>
            }

            <div className="up-info">
              <div className="up-name-row">
                <h1 className="up-name">
                  {displayName}
                  {projects.some(p => (p.score || 0) >= 100) && (
                    <span className="up-perfect-badge" title="Tem um projeto com score perfeito">
                      <GraduationCap size={15} color="#fff" />
                    </span>
                  )}
                </h1>
                {profile.username && <span className="up-username">@{profile.username}</span>}
              </div>

              {(profile.area || profile.course || profile.school) && (
                <div className="up-area-row">
                  {(profile.area || profile.course) && (
                    <span className="up-area-label">{profile.area || profile.course}</span>
                  )}
                  {profile.school && (
                    <>
                      {(profile.area || profile.course) && <span className="up-area-sep">·</span>}
                      <span className="up-school">{profile.school}</span>
                    </>
                  )}
                </div>
              )}

              {profile.bio && <p className="up-bio">{profile.bio}</p>}

              {profile.available_for_work && profile.role === 'aluno' && (
                <div className="up-available-badge">
                  <Briefcase size={13} className="flex-shrink-0" /> Disponível para estágio
                </div>
              )}

              <div className="up-stat-pills">
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
                    <strong className="text-primary">Professor</strong>
                  </span>
                )}
              </div>

              {(profile.linkedin || profile.github || profile.website) && (
                <div className="up-social-row">
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

              {profile.skills && profile.skills.length > 0 && (
                <div className="up-skills-row">
                  {profile.skills.map(skill => (
                    <span key={skill} className="up-skill-chip">{skill}</span>
                  ))}
                </div>
              )}

              <div className="up-actions">
                <button className="up-action-btn up-hide-mobile" onClick={() => setShowQR(true)}>
                  <QrCode size={13} /> QR Code
                </button>
                {isOwnProfile && (
                  <button className="up-action-btn up-hide-mobile" onClick={() => navigate('/settings')}>
                    <Pencil size={13} /> Editar perfil
                  </button>
                )}
                {!isOwnProfile && isRecruiter && (
                  <>
                    <button onClick={toggleSave} disabled={savingCandidate}
                      className={`up-action-btn${saved ? ' saved' : ''}`}
                      title={saved ? 'Remover dos guardados' : 'Guardar candidato'}>
                      <Star size={13} fill={saved ? 'var(--color-warning)' : 'none'} />
                      {saved ? 'Guardado' : 'Guardar'}
                    </button>
                    <button onClick={() => setShowInvite(true)} className="up-action-btn primary">
                      <Send size={13} /> Convidar para vaga
                    </button>
                  </>
                )}
              </div>

              {isOwnProfile && profile.role === 'aluno' && (
                <p className="up-hint">Brevemente: partilha o teu portfólio com empresas</p>
              )}
            </div>
          </div>
        </div>

        {/* ── Projects ── */}
        <div>
          <p className="up-section-label">
            Projetos
            {projects.length > 0 && <span className="up-section-count">({projects.length})</span>}
          </p>

          {/* Featured projects */}
          {(() => {
            const featured = projects
              .filter(p => p.featured)
              .sort((a, b) => (a.featured_order ?? 99) - (b.featured_order ?? 99))
            if (!featured.length) return null
            return (
              <div className="up-featured-section">
                <p className="up-featured-label">
                  <Star size={12} fill="currentColor" /> Em destaque
                </p>
                <div className="up-featured-grid">
                  {featured.map(project => (
                    <ProjectCard key={project.id} project={project} onClick={() => navigate(`/projeto/${project.slug}`)} featured />
                  ))}
                </div>
              </div>
            )
          })()}

          {projects.length === 0 ? (
            isOwnProfile ? (
              <div className="up-empty">
                <div className="up-empty-icon"><Rocket size={40} color="var(--color-primary)" /></div>
                <p className="up-empty-title">
                  {myProfile?.role === 'professor' ? 'Ainda não tens projetos' : 'O teu portfólio começa aqui'}
                </p>
                {myProfile?.role !== 'professor' && (
                  <>
                    <p className="up-empty-desc">
                      Adiciona o teu primeiro projeto e constrói o teu portfólio profissional.
                    </p>
                    <button onClick={() => navigate('/novo')} className="up-empty-cta">
                      Criar projeto <ArrowRight size={14} />
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div className="up-empty">
                <FolderOpen size={40} color="var(--color-text-tertiary)" style={{ marginBottom: 14 }} />
                <p className="up-empty-title">Ainda sem projetos</p>
                <p className="text-base text-muted" style={{ margin: 0, lineHeight: 1.6 }}>
                  {profile?.full_name?.split(' ')[0] || 'Este utilizador'} ainda não partilhou nenhum projeto.
                </p>
              </div>
            )
          ) : (
            <div className="up-projects-grid">
              {projects.map(project => (
                <ProjectCard key={project.id} project={project} onClick={() => navigate(`/projeto/${project.slug}`)} />
              ))}
            </div>
          )}
        </div>
      </div>

      {showQR && <QRModal profileUrl={profileUrl} username={profile?.username || profile?.id || ''} onClose={() => setShowQR(false)} />}
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
