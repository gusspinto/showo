import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { QRCodeSVG } from 'qrcode.react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Navbar } from '../components/Navbar'
import { MagnifierIcon as Search } from '@solar-icons/react/bold/magnifier'
import { Folder2Icon as FolderOpen } from '@solar-icons/react/bold/folder-2'
import { CloseIcon as X } from '@solar-icons/react/bold/close'
import { DownloadIcon as Download } from '@solar-icons/react/bold/download'
import { QrCodeIcon as QrCode } from '@solar-icons/react/bold/qr-code'
import { Pen2Icon as Pencil } from '@solar-icons/react/bold/pen-2'
import { SquareArrowRightUpIcon as ExternalLink } from '@solar-icons/react/bold/square-arrow-right-up'
import { ArrowRightIcon as ArrowRight } from '@solar-icons/react/bold/arrow-right'
import { StarIcon as Star } from '@solar-icons/react/bold/star'
import { ChatRoundLineIcon as MessageSquare } from '@solar-icons/react/bold/chat-round-line'
import { SquareAcademicCapIcon as GraduationCap } from '@solar-icons/react/bold/square-academic-cap'
import { PlaneIcon as Send } from '@solar-icons/react/bold/plane'
import ConvidarVagaModal from '../components/ConvidarVagaModal'
import ProfileCustomizer from '../components/ProfileCustomizer'
import LibFileViewer from '../components/LibFileViewer'
import { PlanBadge } from '../components/PlanGate'
import { DocumentTextIcon as FileText } from '@solar-icons/react/bold/document-text'
import { appearanceVars } from '../lib/profileAppearance'
import { containsProfanity } from '../lib/profanity'
import { fileTypeStyle, withSignedLibraryUrls } from '../lib/libraryFile'
import './UserProfile.css'

function scoreColor(score) {
  if (score == null) return 'var(--color-text-secondary)'
  if (score >= 90)   return 'var(--color-success)'
  if (score >= 71)   return 'var(--color-primary)'
  if (score >= 40)   return 'var(--color-warning)'
  return 'var(--color-error)'
}

/* Um item do perfil — projeto criado ou ficheiro da Biblioteca — no layout
   que o dono escolheu: 'tile' (capa grande) ou 'row' (linha compacta).
   Os ficheiros da Biblioteca mostram-se como na própria Biblioteca:
   thumbnail real quando existe, senão cartão colorido por tipo. */
function ProfileItem({ project, onOpen }) {
  const isLibrary = project.entry_kind === 'library'
  const cover =
    project.cover_url ||
    project._signedThumbUrl ||
    (project.library_file_type?.startsWith('image/') ? project._signedFileUrl : null)
  const subtitle = project.ai_tagline || project.library_description || null
  const ft = isLibrary ? fileTypeStyle(project.library_file_type) : null

  const filetypeCard = ft && (
    <span className="up-filetype" style={{ color: ft.color, background: `color-mix(in srgb, ${ft.color} 14%, var(--color-bg-alt))` }}>
      <FileText size={26} />
      <span className="up-filetype-label">{ft.label}</span>
    </span>
  )

  if (project.profile_layout === 'row') {
    return (
      <button type="button" className="up-pf-row" onClick={onOpen}>
        <span className={`up-pf-row-thumb${cover ? ' has-img' : ''}`}>
          {cover
            ? <img src={cover} alt="" loading="lazy" />
            : ft
              ? <span className="up-pf-row-ft" style={{ color: ft.color }}>{ft.label}</span>
              : <span className="up-pf-row-letter">{(project.name || '?')[0].toUpperCase()}</span>}
        </span>
        <span className="up-pf-row-text">
          <span className="up-pf-row-name">{project.name}</span>
          {(subtitle || project.area) && (
            <span className="up-pf-row-sub">{subtitle || project.area}</span>
          )}
        </span>
        {!isLibrary && project.score != null && (
          <span className="up-pf-row-score" style={{ color: scoreColor(project.score) }}>
            {project.score}
          </span>
        )}
        {isLibrary && <span className="up-pf-row-ext"><ExternalLink size={13} /></span>}
      </button>
    )
  }

  return (
    <div className="up-project-card" onClick={onOpen}>
      {cover ? (
        <div className="up-card-cover-img"><img src={cover} alt="" /></div>
      ) : isLibrary ? (
        <div className="up-card-cover-file">{filetypeCard}</div>
      ) : (
        <div className="up-card-cover-fallback">
          <span className="up-card-cover-letter">
            {project.name ? project.name[0].toUpperCase() : '?'}
          </span>
        </div>
      )}

      <div className="up-card-body">
        <div className="up-card-title-row">
          <span className="up-card-name">{project.name}</span>
          {!isLibrary && project.score != null && (
            <span className="up-card-score" style={{ color: scoreColor(project.score) }}>{project.score}</span>
          )}
        </div>
        {subtitle && <p className="up-card-tagline">{subtitle}</p>}
        {!isLibrary && project.area && <span className="up-card-area">{project.area}</span>}
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
  const [viewingFile, setViewingFile] = useState(null)
  const [customizing, setCustomizing] = useState(false)
  const [draftAppearance, setDraftAppearance] = useState({})
  const [draftHeadline, setDraftHeadline] = useState('')
  const [draftFullName, setDraftFullName] = useState('')
  const [draftBio, setDraftBio] = useState('')
  const [draftSkills, setDraftSkills] = useState([])
  const [savingAppearance, setSavingAppearance] = useState(false)
  const [customizeError, setCustomizeError] = useState('')

  useEffect(() => {
    async function load() {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(username)

      // Sem is_admin (o 065 tirou-o do grant anon de propósito e não é usado
      // aqui) — bastava estar na lista para o SELECT inteiro falhar para
      // visitantes sem conta, e o perfil dava "não encontrado".
      const PROFILE_COLS = 'id, username, full_name, bio, banned_at, role, avatar_url, available_for_work, company, company_role, company_website, linkedin_url, looking_for, company_description, company_location, company_industry, company_size, skills, school, total_xp, created_at, area, occupation, profile_appearance, profile_headline'
      const { data: profileData, error: profileErr } = isUUID
        ? await supabase.from('profiles').select(PROFILE_COLS).eq('id', username).single()
        : await supabase.from('profiles').select(PROFILE_COLS).eq('username', username).single()

      if (profileErr || !profileData) { setNotFound(true); setLoading(false); return }
      setProfile(profileData)

      // A secção "Projetos" mostra só o que o dono escolheu na Biblioteca
      // (profile_featured), pela ordem que definiu — projetos criados e
      // ficheiros adicionados juntos. Deixou de listar tudo por score.
      const PROJECT_COLS = 'id, user_id, name, slug, score, area, ai_tagline, cover_url, created_at, views, entry_kind, profile_featured, profile_featured_order, profile_layout, library_description, library_file_url, library_file_name, library_file_type, library_thumb_url, library_pdf_url'
      const projectsPromise = supabase
        .from('projects')
        .select(`${PROJECT_COLS}, collaborator_count:project_collaborators(count)`)
        .eq('user_id', profileData.id)
        .eq('profile_featured', true)
        .is('parent_project_id', null)
        .order('profile_featured_order', { ascending: true })

      const isRecruiterVisitor = user && (myProfile?.role === 'recrutador' || myProfile?.role === 'empresa') && profileData.id !== user.id
      const savedPromise = isRecruiterVisitor
        ? supabase.from('saved_candidates').select('id').eq('recruiter_id', user.id).eq('student_id', profileData.id).maybeSingle()
        : Promise.resolve({ data: null })

      const [{ data: projectsData, error: projErr }, { data: sc }] = await Promise.all([projectsPromise, savedPromise])

      let finalProjects = projectsData
      if (projErr || !projectsData) {
        const { data: fallback } = await supabase
          .from('projects')
          .select(PROJECT_COLS)
          .eq('user_id', profileData.id)
          .eq('profile_featured', true)
          .is('parent_project_id', null)
          .order('profile_featured_order', { ascending: true })
        finalProjects = fallback
      }

      const normalized = (finalProjects ?? []).map(p => ({
        ...p,
        collaborator_count: Array.isArray(p.collaborator_count)
          ? (p.collaborator_count[0]?.count ?? 0)
          : (p.collaborator_count ?? 0),
      }))

      // Ficheiros da Biblioteca são privados (097); os que estão no perfil
      // ficam legíveis via signed URL graças à policy do 104. Assina-os aqui
      // (aceita tanto path novo como URL público antigo).
      setProjects(await withSignedLibraryUrls(normalized))
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
  const profileUrl   = window.location.href

  // Preview ao vivo: o rascunho enquanto o painel está aberto, senão o guardado.
  const appearance = customizing ? draftAppearance : (profile?.profile_appearance || {})
  const headline   = customizing ? draftHeadline : (profile?.profile_headline || '')
  const displayName = (customizing ? draftFullName.trim() : profile?.full_name)
    || profile?.username || 'Utilizador'
  const previewBio    = customizing ? draftBio.trim() : profile?.bio
  const previewSkills  = customizing ? draftSkills : (profile?.skills || [])

  const canEditSkills = profile?.role === 'aluno' || profile?.role === 'professor'

  function openCustomizer() {
    setDraftAppearance(profile?.profile_appearance || {})
    setDraftHeadline(profile?.profile_headline || '')
    setDraftFullName(profile?.full_name || '')
    setDraftBio(profile?.bio || '')
    setDraftSkills(Array.isArray(profile?.skills) ? profile.skills : [])
    setCustomizeError('')
    setCustomizing(true)
  }

  async function saveAppearance() {
    if (containsProfanity(draftFullName) || containsProfanity(draftBio)) {
      setCustomizeError('Linguagem inapropriada detetada. Mantém o perfil respeitoso.')
      return
    }
    setCustomizeError('')
    setSavingAppearance(true)
    const cleanHeadline = draftHeadline.trim() || null
    const cleanName = draftFullName.trim()
    const cleanBio = draftBio.trim() || null
    const cleanSkills = canEditSkills ? draftSkills : (profile?.skills ?? [])
    const patch = {
      profile_appearance: draftAppearance,
      profile_headline: cleanHeadline,
      bio: cleanBio,
      skills: cleanSkills,
    }
    if (cleanName) patch.full_name = cleanName
    const { error } = await supabase.from('profiles').update(patch).eq('id', user.id)
    if (!error && cleanName && cleanName !== (profile?.full_name || '')) {
      supabase.auth.updateUser({ data: { full_name: cleanName } })
    }
    setSavingAppearance(false)
    if (!error) {
      setProfile(p => ({ ...p, ...patch }))
      setCustomizing(false)
    } else {
      setCustomizeError('Não foi possível guardar. Tenta de novo.')
    }
  }

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
    <div
      className="min-h-screen bg-page up-root"
      style={appearanceVars(appearance)}
    >
      <Helmet>
        <title>{displayName} — Showo</title>
        <meta name="description" content={profile.bio || `Projetos de ${displayName} no Showo`} />
        <meta property="og:title" content={`${displayName} — Showo`} />
        <meta property="og:description" content={profile.bio || `Projetos de ${displayName} no Showo`} />
        <meta property="og:url" content={profileUrl} />
      </Helmet>

      <Navbar />

      {appearance.bannerUrl && (
        <div className="up-banner">
          <img src={appearance.bannerUrl} alt="" style={{ objectPosition: `50% ${appearance.bannerPosition ?? 50}%` }} />
        </div>
      )}

      <div className={`page-content${appearance.bannerUrl ? ' has-banner' : ''}`}>

        {/* ── Cabeçalho: portefólio, alinhado à esquerda, sem cartão ── */}
        <header className="up-head">
          {profile.avatar_url
            ? <img src={profile.avatar_url} alt={displayName} className="up-avatar" />
            : <div className="up-avatar-placeholder">{displayName[0].toUpperCase()}</div>
          }

          <div className="up-head-main">
            <div className="up-head-top">
              <div className="up-head-identity">
                <div className="up-name-row">
                  <h1 className="up-name">{displayName}</h1>
                  {isOwnProfile && <PlanBadge />}
                  {projects.some(p => (p.score || 0) >= 100) && (
                    <span className="up-perfect-badge" title="Tem um projeto com score perfeito">
                      <GraduationCap size={13} />
                    </span>
                  )}
                </div>

                {headline && <p className="up-headline">{headline}</p>}

                <div className="up-meta-row">
                  {profile.username && <span>@{profile.username}</span>}
                  {profile.occupation && <><span className="up-meta-sep">·</span><span>{profile.occupation}</span></>}
                  {!profile.occupation && (profile.area || profile.course) && <><span className="up-meta-sep">·</span><span>{profile.area || profile.course}</span></>}
                  {profile.school && <><span className="up-meta-sep">·</span><span>{profile.school}</span></>}
                  {profile.role === 'professor' && <><span className="up-meta-sep">·</span><span>Professor</span></>}
                </div>
              </div>

              <div className="up-head-actions">
                {isOwnProfile && (
                  <button onClick={openCustomizer} className="up-icon-btn up-personalize" title="Editar perfil" aria-label="Editar perfil">
                    <Pencil size={15} />
                  </button>
                )}
                <button onClick={() => setShowQR(true)} className="up-icon-btn" title="QR Code" aria-label="QR Code">
                  <QrCode size={15} />
                </button>
                {!isOwnProfile && user && (
                  <button onClick={() => navigate(`/mensagens?to=${profile.id}`)} className="up-action-btn primary">
                    <MessageSquare size={13} /> Mensagem
                  </button>
                )}
                {!isOwnProfile && isRecruiter && (
                  <>
                    <button onClick={toggleSave} disabled={savingCandidate}
                      className={`up-action-btn${saved ? ' saved' : ''}`}
                      title={saved ? 'Remover dos guardados' : 'Guardar candidato'}>
                      <Star size={13} color={saved ? 'var(--color-warning)' : undefined} />
                      {saved ? 'Guardado' : 'Guardar'}
                    </button>
                    <button onClick={() => setShowInvite(true)} className="up-action-btn primary">
                      <Send size={13} /> Convidar
                    </button>
                  </>
                )}
              </div>
            </div>

            {previewBio && <p className="up-bio">{previewBio}</p>}

            {(previewSkills?.length > 0 || profile.linkedin_url) && (
              <div className="up-chips-row">
                {profile.linkedin_url && (
                  <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer" className="up-chip up-chip--link">
                    <ExternalLink size={11} /> LinkedIn
                  </a>
                )}
                {previewSkills?.map(skill => (
                  <span key={skill} className="up-chip">{skill}</span>
                ))}
              </div>
            )}
          </div>
        </header>

        {/* ── Trabalho ── */}
        <div className="up-work">
          <p className="up-section-label">
            Trabalho
            {projects.length > 0 && <span className="up-section-count">({projects.length})</span>}
          </p>

          {projects.length === 0 ? (
            isOwnProfile ? (
              <div className="up-empty up-empty--slim">
                <p className="up-empty-slim-text">
                  {myProfile?.role === 'professor'
                    ? 'Ainda não tens projetos.'
                    : 'Escolhe na Biblioteca o que aparece aqui.'}
                </p>
                {myProfile?.role !== 'professor' && (
                  <button onClick={() => navigate('/biblioteca')} className="up-empty-cta">
                    Ir para a Biblioteca <ArrowRight size={14} />
                  </button>
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
            <div className="up-profile-items">
              {projects.map(project => (
                <ProfileItem
                  key={project.id}
                  project={project}
                  onOpen={() => {
                    if (project.entry_kind === 'library') {
                      setViewingFile(project)
                    } else {
                      navigate(`/projeto/${project.slug}`)
                    }
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {viewingFile && <LibFileViewer item={viewingFile} onClose={() => setViewingFile(null)} />}

      {customizing && (
        <ProfileCustomizer
          appearance={draftAppearance}
          onChange={setDraftAppearance}
          headline={draftHeadline}
          onHeadlineChange={setDraftHeadline}
          fullName={draftFullName}
          onFullNameChange={setDraftFullName}
          bio={draftBio}
          onBioChange={setDraftBio}
          skills={draftSkills}
          onSkillsChange={setDraftSkills}
          canEditSkills={canEditSkills}
          error={customizeError}
          onSave={saveAppearance}
          onClose={() => setCustomizing(false)}
          saving={savingAppearance}
          userId={user.id}
        />
      )}

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
