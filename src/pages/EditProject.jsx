import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { updateProject } from '../lib/updateProject'
import { Navbar } from '../components/Navbar'
import { useAuth } from '../context/AuthContext'
import { useSidebar } from '../context/SidebarContext'
import { LockKeyholeIcon as Lock } from '@solar-icons/react/bold/lock-keyhole'
import { MagnifierIcon as Search } from '@solar-icons/react/bold/magnifier'
import { GalleryWideIcon as Image } from '@solar-icons/react/bold/gallery-wide'
import { ArrowLeftIcon as ArrowLeft } from '@solar-icons/react/bold/arrow-left'
import { CheckCircleIcon as Check } from '@solar-icons/react/bold/check-circle'
import { UserIcon as User } from '@solar-icons/react/bold/user'
import { LayersIcon as Layers } from '@solar-icons/react/bold/layers'
import { LinkIcon as Link2 } from '@solar-icons/react/bold/link'
import { SettingsIcon as Settings } from '@solar-icons/react/bold/settings'
import { CopyIcon as Copy } from '@solar-icons/react/bold/copy'
import { SquareArrowRightUpIcon as ExternalLink } from '@solar-icons/react/bold/square-arrow-right-up'
import { DangerTriangleIcon as AlertTriangle } from '@solar-icons/react/bold/danger-triangle'
import { TrashBinMinimalisticIcon as Trash2 } from '@solar-icons/react/bold/trash-bin-minimalistic'
import { RefreshCircleIcon as RefreshCw } from '@solar-icons/react/bold/refresh-circle'
import { Code2Icon as Code } from '@solar-icons/react/bold/code-2'
import { PlaneIcon as Send } from '@solar-icons/react/bold/plane'
import { looksLikeSpam } from '../lib/score'
import { Select } from '../components/ui'
import { containsProfanity } from '../lib/profanity'
import { logFieldsFilled } from '../lib/autoJournal'
import { parseGithubRepo, syncGithub, removeGithubEntries, topLanguages, commitSpanMonths, repoAgeMonths, shareOnLinkedIn } from '../lib/social'
import { DatabaseIcon as Database } from '@solar-icons/react/bold/database'
import { AddCircleIcon as PlusCircle } from '@solar-icons/react/bold/add-circle'
import { GlobeIcon as Globe } from '@solar-icons/react/bold/globe'
import { EyeClosedIcon as EyeOff } from '@solar-icons/react/bold/eye-closed'
import { CloseIcon as X } from '@solar-icons/react/bold/close'
import * as ProjectDb from '../lib/projectDb'

const colors = {
  bg: 'var(--color-bg)',
  bgAlt: 'var(--color-bg-alt)',
  card: 'var(--color-surface)',
  border: 'var(--color-border)',
  borderBright: 'var(--color-border-hover)',
  blue: 'var(--color-primary)',
  blueHover: 'var(--color-primary-hover)',
  text: 'var(--color-text)',
  muted: 'var(--color-text-secondary)',
  subtle: 'var(--color-text-tertiary)',
  green: 'var(--color-success)',
  red: 'var(--color-error)',
  inputBg: 'var(--color-input-bg)',
  glass: 'var(--color-glass)', glassBorder: 'var(--color-glass-border)',
}

const PROJECT_TYPES = [
  { value: '', label: 'Selecionar tipo...' },
  { value: 'school', label: 'Projeto de escola' },
  { value: 'pap', label: 'PAP' },
  { value: 'personal', label: 'Projeto pessoal' },
]


const inputStyle = {
  width: '100%',
  background: colors.inputBg,
  border: `1.5px solid ${colors.border}`,
  borderRadius: 10,
  padding: '11px 14px',
  color: colors.text,
  fontSize: 15,
  fontFamily: 'var(--font-body)',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.2s, box-shadow 0.2s',
}

const inputHandlers = {
  onFocus: e => {
    e.target.style.borderColor = colors.blue
    e.target.style.boxShadow = '0 0 0 3px var(--color-primary-subtle)'
  },
  onBlur: e => {
    e.target.style.borderColor = colors.border
    e.target.style.boxShadow = 'none'
  },
}

/* Um link social só conta como "válido" se for mesmo um URL do sítio certo,
   com um caminho — não "y", nem "linkedin.com" sozinho. Vazio é válido
   (o campo é opcional). */
function socialUrlState(value, host) {
  const s = String(value || '').trim()
  if (!s) return { empty: true, valid: true, normalized: '' }
  let u
  try { u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`) } catch { return { empty: false, valid: false, normalized: s } }
  const hostOk = u.hostname.replace(/^www\./, '').endsWith(host)
  const pathOk = u.pathname.replace(/\/+$/, '').length > 1
  return { empty: false, valid: hostOk && pathOk, normalized: u.toString() }
}

function Field({ label, children, required, filled, error }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{
        display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700,
        color: colors.subtle, marginBottom: 7,
        textTransform: 'uppercase', letterSpacing: 0.6,
      }}>
        {label}{required && <span style={{ color: colors.red, marginLeft: 2 }}>*</span>}
        {filled && <Check size={12} color={colors.blue} strokeWidth={3} style={{ marginLeft: 'auto' }} />}
      </label>
      {children}
      {error && <p style={{ margin: '6px 0 0', fontSize: 12, color: colors.red }}>{error}</p>}
    </div>
  )
}

export default function EditProject() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const { setExtras } = useSidebar()
  const [project, setProject] = useState(null)
  const [form, setForm] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [accessDenied, setAccessDenied] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [isOwner, setIsOwner] = useState(false)
  const [activeSection, setActiveSection] = useState('criador')
  const coverInputRef = useRef(null)
  const originalRef = useRef({})

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('slug', slug)
        .single()

      if (error || !data) { setLoading(false); return }

      const tokenFromUrl = searchParams.get('token')
      const tokenFromStorage = localStorage.getItem(`edit_token_${slug}`)
      const token = tokenFromUrl || tokenFromStorage

      const isOwner = user && data.user_id && user.id === data.user_id
      const hasToken = data.edit_token && token === data.edit_token
      const isLegacy = !data.edit_token && !data.user_id

      let isCollaborator = false
      if (!isOwner && !hasToken && !isLegacy && user) {
        const { data: collab } = await supabase
          .from('project_collaborators')
          .select('id')
          .eq('project_id', data.id)
          .eq('user_id', user.id)
          .eq('status', 'accepted')
          .single()
        isCollaborator = !!collab
      }

      if (!isOwner && !hasToken && !isLegacy && !isCollaborator) {
        setAccessDenied(true)
        setLoading(false)
        return
      }

      if (tokenFromUrl) localStorage.setItem(`edit_token_${slug}`, tokenFromUrl)

      setIsOwner(isOwner)
      setProject(data)
      setForm({
        name: data.name || '',
        area: data.area || '',
        problem: data.problem || '',
        solution: data.solution || '',
        target_audience: data.target_audience || '',
        features: data.features || '',
        technologies: data.technologies || '',
        challenges: data.challenges || '',
        results: data.results || '',
        learnings: data.learnings || '',
        creator_name: data.creator_name || '',
        course: data.course || '',
        school: data.school || '',
        school_year: data.school_year || '',
        project_type: data.project_type || '',
        pap_supervisor: data.pap_supervisor || '',
        pap_date: data.pap_date || '',
        cover_url: data.cover_url || '',
        linkedin_url: data.linkedin_url || '',
        github_url: data.github_url || '',
        portfolio_url: data.portfolio_url || '',
        tags: data.tags || [],
        visibility: data.visibility || 'public',
      })
      originalRef.current = {
        name: data.name || '', area: data.area || '', problem: data.problem || '',
        solution: data.solution || '', target_audience: data.target_audience || '',
        features: data.features || '', technologies: data.technologies || '',
        challenges: data.challenges || '', results: data.results || '',
        learnings: data.learnings || '', goal: data.goal || '',
      }
      setLoading(false)
    }
    load()
  }, [slug])

  useEffect(() => {
    if (!project) return
    setExtras({ type: 'project', slug: project.slug, title: project.name, showBack: true })
    return () => setExtras(null)
  }, [project?.id])

  function set(key, value) {
    setForm(f => ({ ...f, [key]: value }))
    setDirty(true)
  }

  async function handleCoverImage(e) {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { setError('Imagem demasiado grande (máx. 10MB)'); return }
    setError(null)
    set('cover_url', '__uploading__')
    try {
      const ext = file.name.split('.').pop() || 'jpg'
      const path = `${project.slug}-${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('covers').upload(path, file, { upsert: true, contentType: file.type })
      if (upErr) throw upErr
      const { data: { publicUrl } } = supabase.storage.from('covers').getPublicUrl(path)
      set('cover_url', publicUrl)
    } catch {
      set('cover_url', '')
      setError('Erro ao carregar imagem. Tenta novamente.')
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name?.trim() || !form.area?.trim()) return

    const textFields = ['name', 'area', 'goal', 'problem', 'solution', 'target_audience', 'features', 'technologies', 'challenges', 'results', 'learnings']
    for (const key of textFields) {
      const v = String(form[key] || '')
      if (containsProfanity(v)) { setError('Linguagem inapropriada detetada. Remove o conteúdo impróprio antes de guardar.'); return }
      // Só valida "spam" nos campos que o utilizador mexeu — o conteúdo que
      // já estava lá (ex: gerado pela IA ao importar) não é re-julgado.
      if (v !== String(originalRef.current[key] ?? '') && looksLikeSpam(v)) {
        setError('Texto inválido detetado neste campo. Escreve conteúdo real.'); return
      }
    }

    const li = socialUrlState(form.linkedin_url, 'linkedin.com')
    const gh = socialUrlState(form.github_url, 'github.com')
    if (!li.valid) { setError('O LinkedIn tem de ser um link válido (linkedin.com/…) ou ficar vazio.'); return }
    if (!gh.valid) { setError('O GitHub tem de ser um link válido (github.com/…) ou ficar vazio.'); return }

    setSaving(true)
    setError(null)
    try {
      const editToken = !project.user_id ? localStorage.getItem(`edit_token_${project.slug}`) : null
      const saved = await updateProject(project.id, {
        ...form,
        linkedin_url: li.empty ? null : li.normalized,
        github_url: gh.empty ? null : gh.normalized,
        is_pap: form.project_type === 'pap',
      }, editToken)
      // Regista no diário as secções que passaram a estar preenchidas nesta
      // edição — `originalRef` tem os valores de quando a página abriu.
      if (user?.id) {
        await logFieldsFilled({
          projectId: project.id,
          userId: user.id,
          before: originalRef.current,
          after: form,
        })
      }
      navigate(`/projeto/${saved.slug}`)
    } catch (err) {
      setError('Erro ao guardar. Tenta novamente.')
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: colors.bg }}>
        <Navbar />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 'calc(100dvh - 62px)' }}>
          <style>{`@keyframes ep2-sh{0%{background-position:-300px 0}100%{background-position:300px 0}}`}</style>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            {[140, 90, 115].map((w, i) => (
              <div key={i} style={{ height: i === 0 ? 14 : 9, width: w, borderRadius: 6, background: 'linear-gradient(90deg,var(--color-bg-alt) 25%,var(--color-surface-hover) 50%,var(--color-bg-alt) 75%)', backgroundSize: '300px 100%', animation: `ep2-sh 1.5s ease-in-out infinite ${i*0.12}s` }} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (accessDenied) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: colors.bg }}>
        <Navbar />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24, textAlign: 'center', height: 'calc(100dvh - 62px)', color: colors.text }}>
          <Lock size={48} color="var(--color-warning)" />
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 400, fontFamily: 'var(--font-heading)' }}>Acesso restrito</h2>
          <p style={{ color: colors.muted, margin: 0, maxWidth: 380, lineHeight: 1.65 }}>Só o criador deste projeto pode editá-lo. Usa o link privado de edição que recebeste quando criaste o projeto.</p>
          <button onClick={() => navigate(`/projeto/${slug}`)} style={{ background: colors.blue, color: '#fff', border: 'none', borderRadius: 8, padding: '12px 28px', fontSize: 15, fontWeight: 700, cursor: 'pointer', marginTop: 8, boxShadow: '0 2px 8px rgba(27,120,247,0.2)', fontFamily: 'inherit' }}>Ver o projeto</button>
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: colors.bg }}>
        <Navbar />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, height: 'calc(100dvh - 62px)', color: colors.text }}>
          <Search size={48} color={colors.blue} />
          <h2 style={{ margin: 0, fontWeight: 400, fontFamily: 'var(--font-heading)' }}>Projeto não encontrado</h2>
          <button onClick={() => navigate('/')} style={{ background: colors.blue, color: '#fff', border: 'none', borderRadius: 8, padding: '12px 28px', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 2px 8px rgba(27,120,247,0.2)' }}>Ir para o início</button>
        </div>
      </div>
    )
  }

  const isPap = form.project_type === 'pap'

  const isFilled = k => String(form[k] ?? '').trim().length > 0
  const creatorKeys   = ['creator_name', 'course', 'school_year', 'school']
  const creatorFilled = creatorKeys.filter(isFilled).length
  const creatorTotal  = creatorKeys.length
  const nameFilled    = isFilled('name') ? 1 : 0
  const typeFilled    = (nameFilled + (form.project_type ? 1 : 0))
  const typeTotal     = 2
  const coverFilled   = (form.cover_url && form.cover_url !== '__uploading__') ? 1 : 0
  // LinkedIn/GitHub são opcionais e NÃO contam para a percentagem.
  const totalFilled   = creatorFilled + typeFilled + coverFilled
  const totalAll      = creatorTotal + typeTotal + 1
  const pct           = Math.round((totalFilled / totalAll) * 100)

  const linkedin = socialUrlState(form.linkedin_url, 'linkedin.com')
  const github   = socialUrlState(form.github_url, 'github.com')
  const canSave  = !saving && !!form.name?.trim() && !!form.area?.trim() && linkedin.valid && github.valid

  const sections = [
    { id: 'criador',  label: 'Criador',  Icon: User,     filled: creatorFilled, total: creatorTotal },
    { id: 'tipo',     label: 'Tipo',     Icon: Layers,   filled: typeFilled,    total: typeTotal },
    { id: 'imagem',   label: 'Imagem',   Icon: Image,    filled: coverFilled,   total: 1 },
    { id: 'database', label: 'Base de dados', Icon: Database, filled: 0,        total: 0 },
    { id: 'avancado', label: 'Avançado', Icon: Settings, filled: 0,             total: 0 },
  ]

  return (
    <div style={{ minHeight: '100dvh', backgroundColor: colors.bg, color: colors.text, fontFamily: 'var(--font-body)' }}>
      <Navbar
        showLinks={false}
        mobileLeft={
          <button
            onClick={() => navigate(`/projeto/${slug}`)}
            aria-label="Voltar ao projeto"
            style={{
              background: 'transparent', border: 'none',
              color: 'var(--color-text-secondary)', cursor: 'pointer', fontFamily: 'inherit',
              width: 38, height: 38, borderRadius: 9, padding: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <ArrowLeft size={20} />
          </button>
        }
      >
        <button
          onClick={() => navigate(`/projeto/${slug}`)}
          style={{
            background: 'transparent',
            border: `1px solid ${colors.border}`,
            color: colors.muted, borderRadius: 8,
            padding: '8px 16px', fontSize: 13, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit',
            transition: 'border-color 0.2s',
          }}
        >
          <ArrowLeft size={14} style={{ marginRight: 5, verticalAlign: 'middle' }} />Cancelar
        </button>
      </Navbar>

      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @media(max-width:600px){.ep-2col{grid-template-columns:1fr!important;}}
        .ep-progress { display: flex; align-items: center; gap: 12px; margin-top: 18px; }
        .ep-progress-track { flex: 1; height: 8px; border-radius: 99px; background: var(--color-bg-alt); overflow: hidden; }
        .ep-progress-fill { height: 100%; border-radius: 99px; background: var(--color-primary); transition: width 0.4s cubic-bezier(0.22,1,0.36,1); }
        .ep-progress-label { font-size: 12px; font-weight: 800; color: var(--color-text-secondary); flex-shrink: 0; font-variant-numeric: tabular-nums; }
        .ep-layout { display: flex; gap: 20px; align-items: flex-start; }
        .ep-tabs { width: 164px; flex-shrink: 0; display: flex; flex-direction: column; gap: 3px; position: sticky; top: 20px; }
        .ep-tab-btn { display: flex; align-items: center; gap: 10px; width: 100%; padding: 9px 10px; border-radius: 10px; border: none; background: transparent; cursor: pointer; font-family: inherit; text-align: left; -webkit-tap-highlight-color: transparent; color: var(--color-text-secondary); transition: background 0.15s, color 0.15s; }
        .ep-tab-btn:hover { background: var(--color-bg-alt); color: var(--color-text); }
        .ep-tab-btn.active { background: var(--color-primary-subtle); color: var(--color-primary); }
        .ep-tab-icon { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; background: var(--color-bg-alt); transition: background 0.15s; }
        .ep-tab-btn.active .ep-tab-icon { background: var(--color-primary-muted); }
        .ep-tab-label { flex: 1; font-size: 14px; font-weight: 600; }
        .ep-tab-badge { font-size: 11px; font-weight: 700; color: var(--color-text-secondary); background: var(--color-bg-alt); padding: 2px 6px; border-radius: 99px; font-variant-numeric: tabular-nums; flex-shrink: 0; }
        .ep-tab-badge.done { color: var(--color-primary); background: var(--color-primary-muted); }
        .ep-main { flex: 1; min-width: 0; }
        .ep-sec-card { background: var(--color-glass); border: 1px solid var(--color-glass-border); border-radius: 14px; padding: 20px 18px; }
        .ep-sec-heading { font-size: 17px; font-weight: 700; color: var(--color-text); margin: 0 0 20px; font-family: var(--font-heading); }
        .ep-save-bar { position: fixed; left: 0; right: 0; bottom: 0; z-index: 300; display: flex; align-items: center; gap: 12px; padding: 11px 16px calc(11px + env(safe-area-inset-bottom,0px)); background: var(--color-bg-overlay); backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px); border-top: 1px solid var(--color-border); }
        .ep-save-status { flex: 1; min-width: 0; font-size: 13px; font-weight: 600; color: var(--color-text-secondary); display: flex; align-items: center; gap: 8px; }
        .ep-save-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--color-warning); flex-shrink: 0; }
        .ep-save-btn { flex-shrink: 0; padding: 12px 30px; border-radius: 10px; border: none; font-size: 15px; font-weight: 700; font-family: inherit; letter-spacing: -0.1px; }
        @media (min-width: 601px) {
          .ep-save-bar { left: 248px; }
          body.sidebar-collapsed .ep-save-bar { left: 80px; }
        }
        @media (max-width: 600px) {
          .ep-layout { flex-direction: column; gap: 0; }
          .ep-tabs {
            width: 100%;
            flex-direction: row;
            overflow-x: auto;
            position: static;
            gap: 0;
            padding: 0 0 12px;
            scrollbar-width: none;
            border-bottom: 1px solid var(--color-border);
            margin-bottom: 16px;
          }
          .ep-tabs::-webkit-scrollbar { display: none; }
          .ep-tab-btn {
            flex-direction: column;
            gap: 4px;
            padding: 10px 14px;
            min-width: 72px;
            align-items: center;
            justify-content: center;
            border-radius: 0;
            border-bottom: 2px solid transparent;
            background: transparent !important;
            color: var(--color-text-secondary);
          }
          .ep-tab-btn.active {
            background: transparent !important;
            color: var(--color-primary) !important;
            border-bottom-color: var(--color-primary);
          }
          .ep-tab-label { font-size: 11px; font-weight: 700; }
          .ep-tab-badge { display: none; }
          .ep-tab-icon {
            width: 24px; height: 24px;
            border-radius: 0;
            background: transparent !important;
          }
          .ep-tab-btn.active .ep-tab-icon { background: transparent !important; }
          .ep-main { width: 100%; }
          .ep-sec-card { border-radius: 0; border-left: none; border-right: none; margin: 0 -16px; padding: 20px 16px; }
          .page-content { padding-bottom: calc(80px + env(safe-area-inset-bottom, 0px)) !important; }
        }
      `}</style>

      <div className="page-content">
        <div style={{ marginBottom: 22 }}>
          <h1 style={{ fontSize: 'clamp(24px, 4vw, 34px)', fontWeight: 400, fontFamily: 'var(--font-heading)', margin: '0 0 6px', letterSpacing: '-0.5px', color: colors.text }}>Editar projeto</h1>
          <p style={{ color: colors.muted, margin: 0, fontSize: 15 }}>{project.name}</p>
          <div className="ep-progress">
            <div className="ep-progress-track"><div className="ep-progress-fill" style={{ width: `${pct}%` }} /></div>
            <span className="ep-progress-label">{pct}% completo</span>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="ep-layout">
            {/* Section nav */}
            <nav className="ep-tabs">
              {sections.map(s => (
                <button key={s.id} type="button" onClick={() => setActiveSection(s.id)}
                  className={`ep-tab-btn${activeSection === s.id ? ' active' : ''}`}>
                  <span className="ep-tab-icon"><s.Icon size={16} /></span>
                  <span className="ep-tab-label">{s.label}</span>
                  {/* "Avançado" não é um passo de preenchimento — não tem
                      campos obrigatórios, por isso s.total é 0. Mostrar
                      "0/0" fazia parecer um contador partido, e como
                      0 === 0 ainda ganhava o estilo "done" (verde), o que
                      lia mal ao lado de contadores reais como 1/4. */}
                  {s.total > 0 && (
                    <span className={`ep-tab-badge${s.filled === s.total ? ' done' : ''}`}>{s.filled}/{s.total}</span>
                  )}
                </button>
              ))}
            </nav>

            <div className="ep-main">
              {/* Criador */}
              {activeSection === 'criador' && (
                <div className="ep-sec-card">
                  <h2 className="ep-sec-heading">Sobre o criador</h2>
                  <div className="ep-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <Field label="O teu nome" filled={isFilled('creator_name')}>
                      <input type="text" value={form.creator_name} onChange={e => set('creator_name', e.target.value)} style={inputStyle} placeholder="Ex: João Silva" {...inputHandlers} />
                    </Field>
                    <Field label="Curso" filled={isFilled('course')}>
                      <input type="text" value={form.course} onChange={e => set('course', e.target.value)} style={inputStyle} placeholder="Ex: Informática" {...inputHandlers} />
                    </Field>
                    <Field label="Ano letivo" filled={isFilled('school_year')}>
                      <input type="text" value={form.school_year} onChange={e => set('school_year', e.target.value)} style={inputStyle} placeholder="Ex: 2024/2025" {...inputHandlers} />
                    </Field>
                    <Field label="Escola" filled={isFilled('school')}>
                      <input type="text" value={form.school} onChange={e => set('school', e.target.value)} style={inputStyle} placeholder="Ex: ESMAD" {...inputHandlers} />
                    </Field>
                  </div>
                  <div style={{ marginTop: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: colors.subtle, marginBottom: 14, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                      <Link2 size={12} /> Links e redes
                      <span style={{ fontWeight: 600, textTransform: 'none', letterSpacing: 0, color: colors.subtle, opacity: 0.8 }}>(opcional)</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <Field
                        label="LinkedIn"
                        filled={!linkedin.empty && linkedin.valid}
                        error={!linkedin.valid ? 'Tem de ser um link do linkedin.com/…' : null}
                      >
                        <input type="url" value={form.linkedin_url} onChange={e => set('linkedin_url', e.target.value)} style={inputStyle} placeholder="https://linkedin.com/in/..." {...inputHandlers} />
                      </Field>
                      <Field
                        label="GitHub"
                        filled={!github.empty && github.valid}
                        error={!github.valid ? 'Tem de ser um link do github.com/…' : null}
                      >
                        <input type="url" value={form.github_url} onChange={e => set('github_url', e.target.value)} style={inputStyle} placeholder="https://github.com/..." {...inputHandlers} />
                      </Field>
                    </div>
                  </div>
                </div>
              )}

              {/* Tipo */}
              {activeSection === 'tipo' && (
                <div className="ep-sec-card">
                  <h2 className="ep-sec-heading">Tipo de projeto</h2>
                  <Field label="Nome do projeto" filled={isFilled('name')}>
                    <input type="text" value={form.name} onChange={e => set('name', e.target.value)} style={inputStyle} placeholder="Ex: TaskFlow, EduApp..." {...inputHandlers} />
                  </Field>
                  <Field label="Tipo" filled={!!form.project_type}>
                    <Select value={form.project_type} onChange={v => set('project_type', v)} options={PROJECT_TYPES} inputStyle={inputStyle} />
                  </Field>
                  <Field label="Visibilidade" filled={true}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {[
                        { value: 'public',   label: 'Público' },
                        { value: 'unlisted', label: 'Só com link' },
                        { value: 'private',  label: 'Privado' },
                      ].map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => set('visibility', opt.value)}
                          style={{
                            flex: 1, padding: '9px 4px', fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
                            border: `1.5px solid ${form.visibility === opt.value ? 'var(--color-primary)' : 'var(--color-border)'}`,
                            borderRadius: 8, cursor: 'pointer',
                            background: form.visibility === opt.value ? 'var(--color-primary-subtle)' : 'transparent',
                            color: form.visibility === opt.value ? 'var(--color-primary)' : 'var(--color-text-muted)',
                            transition: 'all 0.15s',
                          }}
                        >{opt.label}</button>
                      ))}
                    </div>
                  </Field>
                  {isPap && (
                    <div className="ep-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 4 }}>
                      <Field label="Orientador" filled={isFilled('pap_supervisor')}>
                        <input type="text" value={form.pap_supervisor} onChange={e => set('pap_supervisor', e.target.value)} style={inputStyle} placeholder="Nome do orientador" {...inputHandlers} />
                      </Field>
                      <Field label="Data de apresentação" filled={isFilled('pap_date')}>
                        <input type="text" value={form.pap_date} onChange={e => set('pap_date', e.target.value)} style={inputStyle} placeholder="Ex: Junho 2025" {...inputHandlers} />
                      </Field>
                    </div>
                  )}
                </div>
              )}

              {/* Imagem */}
              {activeSection === 'imagem' && (
                <div className="ep-sec-card">
                  <h2 className="ep-sec-heading">Imagem de capa</h2>
                  {form.cover_url === '__uploading__' ? (
                    <div style={{ height: 180, borderRadius: 10, overflow: 'hidden', marginBottom: 12, background: 'linear-gradient(90deg,var(--color-bg-alt) 25%,var(--color-surface-hover) 50%,var(--color-bg-alt) 75%)', backgroundSize: '400px 100%', animation: 'ep2-sh 1.5s ease-in-out infinite' }} />
                  ) : form.cover_url ? (
                    <div style={{ position: 'relative', marginBottom: 12 }}>
                      <img src={form.cover_url} alt="" style={{ width: '100%', height: 180, objectFit: 'cover', borderRadius: 10, display: 'block' }} />
                      <button
                        type="button"
                        onClick={() => set('cover_url', '')}
                        style={{
                          position: 'absolute', top: 10, right: 10,
                          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
                          color: '#fff', border: 'none', borderRadius: 8,
                          padding: '6px 12px', fontSize: 12, cursor: 'pointer',
                          fontWeight: 600, fontFamily: 'inherit',
                        }}
                      >Remover</button>
                    </div>
                  ) : (
                    <div
                      onClick={() => coverInputRef.current?.click()}
                      style={{
                        border: `2px dashed ${colors.border}`, borderRadius: 12,
                        padding: '36px 20px', textAlign: 'center', cursor: 'pointer',
                        color: colors.muted, transition: 'border-color 0.2s, background 0.2s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = colors.blue; e.currentTarget.style.background = 'rgba(27,120,247,0.03)' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = colors.border; e.currentTarget.style.background = 'transparent' }}
                    >
                      <div style={{ marginBottom: 10 }}><Image size={28} color={colors.muted} /></div>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 500 }}>Clica para carregar uma imagem</p>
                      <p style={{ margin: '4px 0 0', fontSize: 12, color: colors.subtle }}>PNG, JPG ou WEBP · máx. 10MB</p>
                    </div>
                  )}
                  <input ref={coverInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleCoverImage} style={{ display: 'none' }} />
                </div>
              )}

              {/* Base de dados */}
              {activeSection === 'database' && (
                <DatabaseSection project={project} />
              )}

              {/* Avançado */}
              {activeSection === 'avancado' && (
                <AdvancedSection project={project} isOwner={isOwner} navigate={navigate} />
              )}
            </div>
          </div>

          {error && (
            <div style={{
              background: 'rgba(244,63,94,0.08)',
              border: '1px solid rgba(244,63,94,0.25)',
              borderRadius: 10, padding: '12px 16px',
              color: colors.red, fontSize: 14, marginTop: 16, marginBottom: 0, fontWeight: 500,
            }}>
              {error}
            </div>
          )}

          <div style={{ height: 80 }} />
        </form>
      </div>

      {/* Save bar — rendered outside all scrollable containers so position:fixed is never trapped */}
      <div className="ep-save-bar">
        <div className="ep-save-status">
          {!canSave && !saving ? (
            <span style={{ color: colors.red }}>Falta o nome e a área</span>
          ) : dirty ? (
            <><span className="ep-save-dot" /> Alterações por guardar</>
          ) : (
            <><Check size={15} color={colors.blue} strokeWidth={3} /> Tudo guardado</>
          )}
        </div>
        <button
          onClick={handleSubmit}
          disabled={!canSave}
          className="ep-save-btn"
          style={{
            background: canSave ? colors.blue : colors.border,
            color: canSave ? '#fff' : 'var(--color-text-tertiary)',
            cursor: canSave ? 'pointer' : 'default',
            opacity: saving ? 0.7 : 1,
            boxShadow: canSave ? '0 4px 14px rgba(27,120,247,0.3)' : 'none',
          }}
        >
          {saving ? 'A guardar…' : 'Guardar'}
        </button>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   AVANÇADO — link da página, GitHub, LinkedIn, zona de perigo.
   Vivia numa página própria (/gerir), que na sidebar (o layout normal de
   quem tem sessão) não tinha nenhum botão a apontar para lá — ficou
   inacessível na prática. Em vez de arranjar essa entrada, o conteúdo que
   valia a pena veio para aqui, onde já se sabe chegar.
   ══════════════════════════════════════════════════════════════════════════ */
function AdvancedSection({ project, isOwner, navigate }) {
  const [copied, setCopied] = useState(false)
  const publicUrl = `${window.location.origin}/projeto/${project?.slug}`

  function copyLink() {
    navigator.clipboard.writeText(publicUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="ep-sec-card">
      <h2 className="ep-sec-heading">Avançado</h2>

      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: colors.subtle, marginBottom: 14, textTransform: 'uppercase', letterSpacing: 0.6 }}>
          <ExternalLink size={12} /> Página pública
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <div style={{ flex: 1, background: colors.bgAlt, border: `1px solid ${colors.border}`, borderRadius: 8, padding: '10px 12px', fontSize: 13, color: colors.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{publicUrl}</div>
          <button type="button" onClick={copyLink} style={{ padding: '10px 16px', background: copied ? colors.green : colors.blue, border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, whiteSpace: 'nowrap' }}>
            {copied ? <><Check size={13} /> Copiado</> : <><Copy size={13} /> Copiar</>}
          </button>
          <a href={publicUrl} target="_blank" rel="noopener noreferrer" style={{ padding: '10px 12px', background: colors.bgAlt, border: `1px solid ${colors.border}`, borderRadius: 8, color: colors.muted, display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            <ExternalLink size={14} />
          </a>
        </div>
        <button type="button" onClick={() => shareOnLinkedIn(publicUrl)} style={{ padding: '10px 16px', background: colors.bgAlt, border: `1px solid ${colors.border}`, borderRadius: 8, color: colors.muted, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 7 }}>
          <Send size={13} /> Publicar no LinkedIn
        </button>
      </div>

      <GithubAdvancedCard project={project} />

      {isOwner && <DangerZone project={project} navigate={navigate} />}
    </div>
  )
}

/* ── GitHub ────────────────────────────────────────────────────────────────
   O link do repositório já existia há muito e não fazia nada. Isto lê o
   repositório público e traz o histórico para dentro do projeto: cada dia
   com commits vira uma entrada de diário, e as linguagens e datas ficam
   guardadas para a página pública mostrar prova de trabalho a sério.
   Só repositórios públicos, sem OAuth. */
function GithubAdvancedCard({ project }) {
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)
  const [stats, setStats] = useState(project?.github_stats || null)
  const [syncedAt, setSyncedAt] = useState(project?.github_synced_at || null)
  const [confirmRemove, setConfirmRemove] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [removed, setRemoved] = useState(null)
  // Formato do painel na página pública — guardado em preview_style ao
  // lado das outras personalizações da página (cor, fonte...), não numa
  // coluna própria.
  const [compact, setCompact] = useState(!!project?.preview_style?.githubCompact)

  useEffect(() => {
    setStats(project?.github_stats || null)
    setSyncedAt(project?.github_synced_at || null)
    setCompact(!!project?.preview_style?.githubCompact)
    setResult(null); setError(null); setConfirmRemove(false); setRemoved(null)
  }, [project?.id])

  async function setFormat(nextCompact) {
    setCompact(nextCompact) // otimista — o painel na página pública reage já
    const { error } = await supabase
      .from('projects')
      .update({ preview_style: { ...(project?.preview_style || {}), githubCompact: nextCompact } })
      .eq('id', project.id)
    if (error) console.error('[github-format]', error.message)
  }

  const repo = parseGithubRepo(project?.github_url)

  async function handleSync() {
    setSyncing(true); setError(null); setResult(null)
    try {
      const data = await syncGithub(project.id)
      setStats(data.stats)
      setSyncedAt(new Date().toISOString())
      setResult(data.entries_added)
      setRemoved(null)
    } catch (e) { setError(e.message) }
    setSyncing(false)
  }

  async function handleRemove() {
    setRemoving(true); setError(null); setResult(null)
    try {
      const data = await removeGithubEntries(project.id)
      setStats(null); setSyncedAt(null); setRemoved(data.entries_removed)
    } catch (e) { setError(e.message) }
    setRemoving(false); setConfirmRemove(false)
  }

  const langs = topLanguages(stats?.languages)
  const months = commitSpanMonths(stats)

  return (
    <div style={{ marginBottom: 28, paddingTop: 24, borderTop: `1px solid ${colors.border}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: colors.subtle, marginBottom: 14, textTransform: 'uppercase', letterSpacing: 0.6 }}>
        <Code size={12} /> GitHub
      </div>

      {!repo ? (
        <p style={{ margin: 0, fontSize: 13.5, color: colors.muted, lineHeight: 1.6 }}>
          Adiciona o link do repositório em cima, em "Criador" (<code style={{ fontSize: 12.5 }}>github.com/utilizador/repositorio</code>).
          Depois a Showo consegue ler os commits e escrever no diário por ti.
        </p>
      ) : (
        <>
          <p style={{ margin: '0 0 16px', fontSize: 13.5, color: colors.muted, lineHeight: 1.6 }}>
            Vamos ler <strong style={{ color: colors.text }}>{repo.owner}/{repo.repo}</strong>. Cada dia
            com commits fica registado no diário, com a data em que trabalhaste. Só funciona com repositórios públicos.
          </p>

          {stats && (
            <>
              {/* Formato do painel na página pública — o painel fica sempre
                  no topo (não é arrastável); isto controla só se mostra
                  tudo ou só o essencial. */}
              <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
                {[[false, 'Completo'], [true, 'Compacto']].map(([val, label]) => (
                  <button key={label} type="button" onClick={() => setFormat(val)} style={{
                    fontSize: 12, fontWeight: 600, padding: '5px 12px', borderRadius: 7,
                    border: `1px solid ${compact === val ? colors.blue : colors.border}`,
                    background: compact === val ? 'var(--color-primary-subtle)' : 'transparent',
                    color: compact === val ? colors.blue : colors.muted,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}>{label}</button>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 10, marginBottom: 16 }}>
                <AdvStat label="Commits" value={stats.commits} />
                <AdvStat label={stats.active_days === 1 && !stats.partial ? 'Dia de trabalho' : 'Dias de trabalho'} value={stats.partial ? `${stats.active_days}+` : stats.active_days} />
                {months && <AdvStat label={months === 1 ? 'Mês de atividade' : 'Meses de atividade'} value={stats.partial ? `${months}+` : months} />}
                {langs[0] && <AdvStat label="Principal" value={langs[0].name} />}
              </div>
            </>
          )}

          {stats?.partial && (
            <p style={{ margin: '-6px 0 16px', fontSize: 12, color: colors.subtle, lineHeight: 1.55 }}>
              O repositório tem {stats.commits} commits; o diário recebe os {stats.commits_scanned} mais recentes.
              Os dias de trabalho contam só esses, por isso aparecem com "+".
            </p>
          )}

          {error && (
            <div style={{ background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.25)', borderRadius: 10, padding: '11px 14px', color: colors.red, fontSize: 13, marginBottom: 12, fontWeight: 500 }}>
              {error}
            </div>
          )}

          {result != null && !error && (
            <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 10, padding: '11px 14px', color: colors.green, fontSize: 13, marginBottom: 12, fontWeight: 600 }}>
              {result === 0 ? 'Já estava tudo sincronizado — nada de novo desde a última vez.' : `${result} ${result === 1 ? 'dia adicionado' : 'dias adicionados'} ao diário.`}
            </div>
          )}

          {removed != null && !error && (
            <div style={{ background: colors.bgAlt, border: `1px solid ${colors.border}`, borderRadius: 10, padding: '11px 14px', color: colors.muted, fontSize: 13, marginBottom: 12, fontWeight: 600 }}>
              {removed === 0 ? 'Não havia entradas do GitHub no diário.' : `${removed} ${removed === 1 ? 'entrada removida' : 'entradas removidas'} do diário. As que escreveste à mão ficaram.`}
            </div>
          )}

          <button type="button" onClick={handleSync} disabled={syncing} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: syncing ? colors.border : colors.blue, color: '#fff', border: 'none',
            borderRadius: 10, padding: '11px 20px', fontSize: 14, fontWeight: 700,
            cursor: syncing ? 'default' : 'pointer', fontFamily: 'inherit',
          }}>
            <RefreshCw size={15} style={syncing ? { animation: 'spin 1s linear infinite' } : undefined} />
            {syncing ? 'A ler o repositório…' : stats ? 'Sincronizar outra vez' : 'Sincronizar commits'}
          </button>

          {stats && syncedAt && (
            <p style={{ margin: '10px 0 0', fontSize: 11.5, color: colors.subtle }}>
              Última sincronização: {new Date(syncedAt).toLocaleDateString('pt-PT', { day: 'numeric', month: 'long' })}
            </p>
          )}

          {stats && (
            <div style={{ marginTop: 18, paddingTop: 16, borderTop: `1px solid ${colors.border}` }}>
              {!confirmRemove ? (
                <button type="button" onClick={() => setConfirmRemove(true)} style={{ background: 'none', border: 'none', padding: 0, color: colors.subtle, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline', textUnderlineOffset: 3 }}>
                  Remover as entradas do GitHub do diário
                </button>
              ) : (
                <div>
                  <p style={{ margin: '0 0 10px', fontSize: 13, color: colors.text, lineHeight: 1.55 }}>
                    Tira do diário todas as entradas que vieram do GitHub e os números da página pública.
                    O que escreveste à mão fica. Podes sincronizar outra vez a qualquer momento.
                  </p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" onClick={handleRemove} disabled={removing} style={{ background: colors.red, color: '#fff', border: 'none', borderRadius: 8, padding: '9px 16px', fontSize: 13, fontWeight: 700, cursor: removing ? 'default' : 'pointer', fontFamily: 'inherit', opacity: removing ? 0.7 : 1 }}>
                      {removing ? 'A remover…' : 'Remover entradas'}
                    </button>
                    <button type="button" onClick={() => setConfirmRemove(false)} disabled={removing} style={{ background: 'none', color: colors.muted, border: `1px solid ${colors.border}`, borderRadius: 8, padding: '9px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

function AdvStat({ label, value }) {
  return (
    <div style={{ background: colors.bgAlt, border: `1px solid ${colors.border}`, borderRadius: 10, padding: '11px 13px' }}>
      <div style={{ fontSize: 19, fontWeight: 700, color: colors.text, lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: 10.5, color: colors.subtle, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 3 }}>{label}</div>
    </div>
  )
}

function DangerZone({ project, navigate }) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (!project?.id) return
    setDeleting(true)
    await supabase.from('projects').delete().eq('id', project.id)
    localStorage.removeItem(`edit_token_${project.slug}`)
    navigate('/dashboard')
  }

  return (
    <div style={{ paddingTop: 24, borderTop: `1px solid ${colors.border}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: colors.red, marginBottom: 14, textTransform: 'uppercase', letterSpacing: 0.6 }}>
        <AlertTriangle size={12} /> Zona de perigo
      </div>
      <p style={{ margin: '0 0 16px', fontSize: 14, color: colors.muted, lineHeight: 1.65 }}>
        Eliminar o projeto é uma ação irreversível. Todos os dados, score e página pública serão apagados permanentemente.
      </p>
      {!confirmDelete ? (
        <button type="button" onClick={() => setConfirmDelete(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.25)', borderRadius: 10, color: colors.red, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          <Trash2 size={15} /> Eliminar projeto
        </button>
      ) : (
        <div style={{ background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.25)', borderRadius: 12, padding: '16px 18px' }}>
          <p style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700, color: colors.red }}>Tens a certeza? Esta ação não pode ser desfeita.</p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" onClick={handleDelete} disabled={deleting} style={{ flex: 1, padding: '10px', background: colors.red, border: 'none', borderRadius: 10, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              {deleting ? 'A eliminar…' : <><Trash2 size={14} /> Confirmar eliminação</>}
            </button>
            <button type="button" onClick={() => setConfirmDelete(false)} disabled={deleting} style={{ flex: 1, padding: '10px', background: 'none', border: `1px solid ${colors.border}`, borderRadius: 10, color: colors.muted, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   BASE DE DADOS + API — o hosting real: o aluno desenha tabelas, e o
   projeto passa a ter uma API que funciona de fora da Showo (curl, Postman,
   o próprio frontend dele), sem nunca correr código do aluno — só dados,
   validados contra o schema que ele desenhou. Ver project-db/index.ts para
   as decisões de segurança por trás disto.
   ══════════════════════════════════════════════════════════════════════════ */
function DatabaseSection({ project }) {
  const [loading, setLoading] = useState(true)
  const [tables, setTables] = useState([])
  const [apiKey, setApiKey] = useState(null)
  const [limits, setLimits] = useState(null)
  const [loadError, setLoadError] = useState(null)
  const [showNewTable, setShowNewTable] = useState(false)
  const [expandedId, setExpandedId] = useState(null)

  async function load() {
    setLoadError(null)
    try {
      const data = await ProjectDb.listTables(project.id)
      setTables(data.tables || [])
      setApiKey(data.api_key)
      setLimits(data.limits)
    } catch (e) {
      setLoadError(e.message)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [project?.id])

  if (loading) {
    return <div className="ep-sec-card"><h2 className="ep-sec-heading">Base de dados</h2><p style={{ color: colors.subtle, fontSize: 14 }}>A carregar…</p></div>
  }

  if (loadError) {
    return <div className="ep-sec-card"><h2 className="ep-sec-heading">Base de dados</h2><p style={{ color: colors.red, fontSize: 14 }}>{loadError}</p></div>
  }

  const noAccess = !limits || !limits.max_tables

  return (
    <div className="ep-sec-card">
      <h2 className="ep-sec-heading">Base de dados</h2>
      <p style={{ margin: '0 0 20px', fontSize: 13.5, color: colors.muted, lineHeight: 1.6 }}>
        Desenha tabelas de dados a sério para o teu projeto. Cada tabela ganha uma API própria —
        dá para chamar de fora da Showo, tal como uma aplicação real.
      </p>

      {noAccess ? (
        <div style={{ background: 'var(--color-primary-subtle)', border: '1px solid var(--color-primary-muted)', borderRadius: 12, padding: '18px 20px' }}>
          <p style={{ margin: '0 0 12px', fontSize: 14, color: colors.text, fontWeight: 600 }}>Funcionalidade Plus/Pro</p>
          <p style={{ margin: '0 0 14px', fontSize: 13.5, color: colors.muted, lineHeight: 1.6 }}>
            Com um plano pago, o teu projeto ganha uma base de dados própria com API — o que o transforma
            de um projeto teórico num produto que funciona a sério.
          </p>
          <a href="/pricing" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: colors.blue, color: '#fff', borderRadius: 8, padding: '9px 16px', fontSize: 13.5, fontWeight: 700, textDecoration: 'none' }}>
            Ver planos
          </a>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
            <DbStat label="Tabelas" value={`${tables.length}/${limits.max_tables}`} />
            <DbStat label="Linhas por tabela" value={`até ${limits.max_rows_per_table}`} />
            <DbStat label="Linhas no total" value={`até ${limits.max_rows_total}`} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
            {tables.map(t => (
              <DataTableCard
                key={t.id}
                project={project}
                table={t}
                expanded={expandedId === t.id}
                onToggleExpand={() => setExpandedId(id => id === t.id ? null : t.id)}
                onChanged={load}
              />
            ))}
          </div>

          {tables.length < limits.max_tables && (
            showNewTable ? (
              <NewTableForm project={project} onCreated={() => { setShowNewTable(false); load() }} onCancel={() => setShowNewTable(false)} />
            ) : (
              <button type="button" onClick={() => setShowNewTable(true)} style={{
                display: 'flex', alignItems: 'center', gap: 8, background: 'none',
                border: `1.5px dashed ${colors.border}`, borderRadius: 10, padding: '12px 16px',
                color: colors.muted, fontSize: 13.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', width: '100%', justifyContent: 'center',
              }}>
                <PlusCircle size={16} /> Nova tabela
              </button>
            )
          )}

          {tables.length > 0 && (
            <ApiKeyCard project={project} apiKey={apiKey} firstTable={tables[0]} onKeyChanged={setApiKey} />
          )}
        </>
      )}
    </div>
  )
}

function DbStat({ label, value }) {
  return (
    <div style={{ flex: 1, background: colors.bgAlt, border: `1px solid ${colors.border}`, borderRadius: 10, padding: '10px 12px' }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: colors.text, lineHeight: 1.2 }}>{value}</div>
      <div style={{ fontSize: 10.5, color: colors.subtle, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 3 }}>{label}</div>
    </div>
  )
}

function NewTableForm({ project, onCreated, onCancel }) {
  const [label, setLabel] = useState('')
  const [columns, setColumns] = useState([{ name: '', type: 'text', required: false }])
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)

  const name = ProjectDb.slugifyTableName(label)

  function setCol(idx, patch) {
    setColumns(cols => cols.map((c, i) => i === idx ? { ...c, ...patch } : c))
  }
  function addCol() { setColumns(cols => [...cols, { name: '', type: 'text', required: false }]) }
  function removeCol(idx) { setColumns(cols => cols.filter((_, i) => i !== idx)) }

  async function handleCreate() {
    setErr(null)
    if (!label.trim()) { setErr('Dá um nome à tabela.'); return }
    const cleanCols = columns
      .map(c => ({ ...c, name: ProjectDb.slugifyTableName(c.name) }))
      .filter(c => c.name)
    if (!cleanCols.length) { setErr('Adiciona pelo menos uma coluna.'); return }
    setSaving(true)
    try {
      await ProjectDb.createTable(project.id, name, label.trim(), cleanCols)
      onCreated()
    } catch (e) {
      setErr(e.message)
    }
    setSaving(false)
  }

  return (
    <div style={{ border: `1.5px solid ${colors.border}`, borderRadius: 12, padding: '16px 18px', marginBottom: 16 }}>
      <Field label="Nome da tabela">
        <input type="text" value={label} onChange={e => setLabel(e.target.value)} style={inputStyle} placeholder="Ex: Reservas" {...inputHandlers} />
        {label.trim() && <p style={{ margin: '6px 0 0', fontSize: 11.5, color: colors.subtle }}>Na API: <code>{name}</code></p>}
      </Field>

      <div style={{ marginTop: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: colors.subtle, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>Colunas</div>
        {columns.map((col, idx) => (
          <div key={idx} style={{ display: 'flex', gap: 6, marginBottom: 8, alignItems: 'center' }}>
            <input type="text" value={col.name} onChange={e => setCol(idx, { name: e.target.value })} placeholder="nome_da_coluna" style={{ ...inputStyle, flex: 2, padding: '8px 10px', fontSize: 13.5 }} {...inputHandlers} />
            <select value={col.type} onChange={e => setCol(idx, { type: e.target.value })} style={{ ...inputStyle, flex: 1, padding: '8px 10px', fontSize: 13.5 }}>
              {ProjectDb.COLUMN_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: colors.muted, flexShrink: 0, whiteSpace: 'nowrap' }}>
              <input type="checkbox" checked={!!col.required} onChange={e => setCol(idx, { required: e.target.checked })} /> obrigatório
            </label>
            {columns.length > 1 && (
              <button type="button" onClick={() => removeCol(idx)} style={{ background: 'none', border: 'none', color: colors.subtle, cursor: 'pointer', padding: 4, flexShrink: 0 }}><X size={15} /></button>
            )}
          </div>
        ))}
        <button type="button" onClick={addCol} style={{ background: 'none', border: 'none', color: colors.blue, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
          + Adicionar coluna
        </button>
      </div>

      {err && <p style={{ margin: '12px 0 0', fontSize: 12.5, color: colors.red }}>{err}</p>}

      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <button type="button" onClick={handleCreate} disabled={saving} style={{ background: colors.blue, color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: saving ? 0.7 : 1 }}>
          {saving ? 'A criar…' : 'Criar tabela'}
        </button>
        <button type="button" onClick={onCancel} style={{ background: 'none', border: `1px solid ${colors.border}`, color: colors.muted, borderRadius: 8, padding: '9px 18px', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          Cancelar
        </button>
      </div>
    </div>
  )
}

function DataTableCard({ project, table, expanded, onToggleExpand, onChanged }) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [busy, setBusy] = useState(false)

  async function handleTogglePublic() {
    setBusy(true)
    try { await ProjectDb.toggleTablePublic(project.id, table.id, !table.is_public); onChanged() } catch {}
    setBusy(false)
  }
  async function handleDelete() {
    setBusy(true)
    try { await ProjectDb.deleteTable(project.id, table.id); onChanged() } catch {}
    setBusy(false)
  }

  return (
    <div style={{ border: `1px solid ${colors.border}`, borderRadius: 10, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', cursor: 'pointer' }} onClick={onToggleExpand}>
        <Database size={15} color={colors.subtle} style={{ flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: colors.text }}>{table.label}</div>
          <div style={{ fontSize: 11.5, color: colors.subtle }}>{table.row_count} {table.row_count === 1 ? 'linha' : 'linhas'} · {table.columns.length} {table.columns.length === 1 ? 'coluna' : 'colunas'}</div>
        </div>
        <span style={{
          display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700,
          color: table.is_public ? colors.green : colors.subtle,
          background: table.is_public ? 'rgba(16,185,129,0.1)' : colors.bgAlt,
          border: `1px solid ${table.is_public ? 'rgba(16,185,129,0.25)' : colors.border}`,
          borderRadius: 99, padding: '3px 9px', flexShrink: 0,
        }}>
          {table.is_public ? <><Globe size={11} /> Pública</> : <><EyeOff size={11} /> Privada</>}
        </span>
      </div>

      {expanded && (
        <div style={{ borderTop: `1px solid ${colors.border}`, padding: '14px', background: colors.bgAlt }}>
          <button type="button" onClick={handleTogglePublic} disabled={busy} style={{
            display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: `1px solid ${colors.border}`,
            borderRadius: 7, padding: '6px 12px', fontSize: 12.5, fontWeight: 600, color: colors.muted, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 14,
          }}>
            {table.is_public ? <><EyeOff size={13} /> Tornar privada</> : <><Globe size={13} /> Tornar pública</>}
          </button>

          <RowsPanel project={project} table={table} onChanged={onChanged} />

          <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${colors.border}` }}>
            {!confirmDelete ? (
              <button type="button" onClick={() => setConfirmDelete(true)} style={{ background: 'none', border: 'none', color: colors.red, fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
                Eliminar tabela
              </button>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12.5, color: colors.text }}>Apaga a tabela e todas as linhas. Tens a certeza?</span>
                <button type="button" onClick={handleDelete} disabled={busy} style={{ background: colors.red, color: '#fff', border: 'none', borderRadius: 6, padding: '5px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Eliminar</button>
                <button type="button" onClick={() => setConfirmDelete(false)} style={{ background: 'none', border: `1px solid ${colors.border}`, borderRadius: 6, padding: '5px 10px', fontSize: 12, fontWeight: 600, color: colors.muted, cursor: 'pointer', fontFamily: 'inherit' }}>Cancelar</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function RowsPanel({ project, table, onChanged }) {
  const [rows, setRows] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)

  async function load() {
    try {
      const data = await ProjectDb.listRows(project.id, table.id, 20)
      setRows(data.rows || [])
    } catch { setRows([]) }
  }
  useEffect(() => { load() }, [table.id])

  async function handleAdd() {
    setErr(null); setSaving(true)
    try {
      await ProjectDb.insertRow(project.id, table.id, form)
      setForm({}); setShowForm(false)
      await load(); onChanged()
    } catch (e) { setErr(e.message) }
    setSaving(false)
  }

  async function handleDeleteRow(rowId) {
    try { await ProjectDb.deleteRow(project.id, table.id, rowId); await load(); onChanged() } catch {}
  }

  if (rows === null) return <p style={{ fontSize: 12.5, color: colors.subtle, margin: 0 }}>A carregar linhas…</p>

  return (
    <div>
      {rows.length === 0 ? (
        <p style={{ fontSize: 12.5, color: colors.subtle, margin: '0 0 12px' }}>Ainda sem dados nesta tabela.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
          {rows.map(r => (
            <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 8, padding: '8px 10px' }}>
              <div style={{ flex: 1, fontSize: 12.5, color: colors.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {table.columns.map(c => r.data[c.name]).filter(v => v !== undefined && v !== '').join(' · ') || <span style={{ color: colors.subtle }}>(vazio)</span>}
              </div>
              <button type="button" onClick={() => handleDeleteRow(r.id)} style={{ background: 'none', border: 'none', color: colors.subtle, cursor: 'pointer', padding: 2, flexShrink: 0 }}><Trash2 size={13} /></button>
            </div>
          ))}
        </div>
      )}

      {showForm ? (
        <div style={{ background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 8, padding: 12 }}>
          {table.columns.map(c => (
            <div key={c.name} style={{ marginBottom: 8 }}>
              <label style={{ fontSize: 10.5, fontWeight: 600, color: colors.subtle, textTransform: 'uppercase', letterSpacing: 0.4, display: 'block', marginBottom: 4 }}>
                {c.name}{c.required && ' *'}
              </label>
              {c.type === 'boolean' ? (
                <input type="checkbox" checked={!!form[c.name]} onChange={e => setForm(f => ({ ...f, [c.name]: e.target.checked }))} />
              ) : (
                <input
                  type={c.type === 'number' ? 'number' : c.type === 'date' ? 'date' : 'text'}
                  value={form[c.name] ?? ''}
                  onChange={e => setForm(f => ({ ...f, [c.name]: e.target.value }))}
                  style={{ ...inputStyle, padding: '7px 10px', fontSize: 13 }}
                  {...inputHandlers}
                />
              )}
            </div>
          ))}
          {err && <p style={{ margin: '0 0 8px', fontSize: 12, color: colors.red }}>{err}</p>}
          <div style={{ display: 'flex', gap: 6 }}>
            <button type="button" onClick={handleAdd} disabled={saving} style={{ background: colors.blue, color: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              {saving ? 'A guardar…' : 'Guardar linha'}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setErr(null) }} style={{ background: 'none', border: `1px solid ${colors.border}`, borderRadius: 6, padding: '6px 14px', fontSize: 12.5, fontWeight: 600, color: colors.muted, cursor: 'pointer', fontFamily: 'inherit' }}>
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setShowForm(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: `1px dashed ${colors.border}`, borderRadius: 7, padding: '7px 12px', fontSize: 12.5, fontWeight: 600, color: colors.muted, cursor: 'pointer', fontFamily: 'inherit' }}>
          <PlusCircle size={13} /> Adicionar linha
        </button>
      )}
    </div>
  )
}

function ApiKeyCard({ project, apiKey, firstTable, onKeyChanged }) {
  const [copied, setCopied] = useState('')
  const [regenerating, setRegenerating] = useState(false)
  const [confirmRegen, setConfirmRegen] = useState(false)

  function copy(text, id) {
    navigator.clipboard.writeText(text).then(() => { setCopied(id); setTimeout(() => setCopied(''), 2000) })
  }

  async function handleRegen() {
    setRegenerating(true)
    try {
      const data = await ProjectDb.regenApiKey(project.id)
      onKeyChanged(data.api_key)
    } catch {}
    setRegenerating(false)
    setConfirmRegen(false)
  }

  const example = apiKey ? ProjectDb.curlExample(apiKey, firstTable.name, 'GET') : ''

  return (
    <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${colors.border}` }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: colors.subtle, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 }}>
        Chave de API
      </div>
      <p style={{ margin: '0 0 12px', fontSize: 12.5, color: colors.muted, lineHeight: 1.6 }}>
        Usa esta chave para chamar a API do teu projeto de fora da Showo — de outro código, do Postman, ou de um site que construas.
      </p>
      {apiKey && (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <div style={{ flex: 1, background: colors.bgAlt, border: `1px solid ${colors.border}`, borderRadius: 8, padding: '9px 12px', fontSize: 12.5, color: colors.muted, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{apiKey}</div>
            <button type="button" onClick={() => copy(apiKey, 'key')} style={{ padding: '9px 14px', background: copied === 'key' ? colors.green : colors.blue, border: 'none', borderRadius: 8, color: '#fff', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
              {copied === 'key' ? 'Copiada' : 'Copiar'}
            </button>
          </div>

          <div style={{ position: 'relative', marginBottom: 10 }}>
            <pre style={{ margin: 0, background: '#0d0d10', color: '#d8d8de', borderRadius: 8, padding: '12px 14px', fontSize: 11.5, lineHeight: 1.6, overflowX: 'auto', fontFamily: 'monospace' }}>{example}</pre>
            <button type="button" onClick={() => copy(example, 'curl')} style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 6, color: '#fff', padding: '4px 8px', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              {copied === 'curl' ? 'Copiado' : <Copy size={12} />}
            </button>
          </div>

          {!confirmRegen ? (
            <button type="button" onClick={() => setConfirmRegen(true)} style={{ background: 'none', border: 'none', color: colors.subtle, fontSize: 11.5, fontWeight: 600, cursor: 'pointer', padding: 0, fontFamily: 'inherit', textDecoration: 'underline', textUnderlineOffset: 3 }}>
              Gerar nova chave
            </button>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: colors.text }}>A chave antiga deixa de funcionar. Confirmas?</span>
              <button type="button" onClick={handleRegen} disabled={regenerating} style={{ background: colors.red, color: '#fff', border: 'none', borderRadius: 6, padding: '5px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                {regenerating ? 'A gerar…' : 'Confirmar'}
              </button>
              <button type="button" onClick={() => setConfirmRegen(false)} style={{ background: 'none', border: `1px solid ${colors.border}`, borderRadius: 6, padding: '5px 10px', fontSize: 12, fontWeight: 600, color: colors.muted, cursor: 'pointer', fontFamily: 'inherit' }}>
                Cancelar
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
