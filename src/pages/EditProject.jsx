import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { updateProject } from '../lib/updateProject'
import { Navbar } from '../components/Navbar'
import { useAuth } from '../context/AuthContext'
import { useSidebar } from '../context/SidebarContext'
import { Lock, Search, Image, ArrowLeft, Check, User, Layers, Link2 } from 'lucide-react'
import { looksLikeSpam } from '../lib/score'
import { Select } from '../components/ui'
import { containsProfanity } from '../lib/profanity'

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

function Field({ label, children, required, filled }) {
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
  const [activeSection, setActiveSection] = useState('criador')
  const coverInputRef = useRef(null)

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
      })
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
      if (looksLikeSpam(v))     { setError('Texto inválido detetado. Escreve conteúdo real nos campos do projeto.'); return }
    }

    setSaving(true)
    setError(null)
    try {
      const editToken = !project.user_id ? localStorage.getItem(`edit_token_${project.slug}`) : null
      const saved = await updateProject(project.id, { ...form, is_pap: form.project_type === 'pap' }, editToken)
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
  const linkKeys      = ['linkedin_url', 'github_url', 'portfolio_url']
  const linkFilled    = linkKeys.filter(isFilled).length
  const nameFilled    = isFilled('name') ? 1 : 0
  const typeFilled    = (nameFilled + (form.project_type ? 1 : 0))
  const typeTotal     = 2
  const coverFilled   = (form.cover_url && form.cover_url !== '__uploading__') ? 1 : 0
  const totalFilled   = creatorFilled + linkFilled + typeFilled + coverFilled
  const totalAll      = creatorTotal + linkKeys.length + typeTotal + 1
  const pct           = Math.round((totalFilled / totalAll) * 100)
  const canSave       = !saving && !!form.name?.trim() && !!form.area?.trim()

  const sections = [
    { id: 'criador',  label: 'Criador',  Icon: User,   filled: creatorFilled + linkFilled, total: creatorTotal + linkKeys.length },
    { id: 'tipo',     label: 'Tipo',     Icon: Layers, filled: typeFilled,    total: typeTotal },
    { id: 'imagem',   label: 'Imagem',   Icon: Image,  filled: coverFilled,   total: 1 },
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
        .ep-progress-fill { height: 100%; border-radius: 99px; background: linear-gradient(90deg, var(--color-primary), #4f46e5); transition: width 0.4s cubic-bezier(0.22,1,0.36,1); }
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
                  <span className={`ep-tab-badge${s.filled === s.total ? ' done' : ''}`}>{s.filled}/{s.total}</span>
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
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <Field label="LinkedIn" filled={isFilled('linkedin_url')}>
                        <input type="url" value={form.linkedin_url} onChange={e => set('linkedin_url', e.target.value)} style={inputStyle} placeholder="https://linkedin.com/in/..." {...inputHandlers} />
                      </Field>
                      <Field label="GitHub" filled={isFilled('github_url')}>
                        <input type="url" value={form.github_url} onChange={e => set('github_url', e.target.value)} style={inputStyle} placeholder="https://github.com/..." {...inputHandlers} />
                      </Field>
                      <Field label="Portfólio" filled={isFilled('portfolio_url')}>
                        <input type="url" value={form.portfolio_url} onChange={e => set('portfolio_url', e.target.value)} style={inputStyle} placeholder="Portfólio ou site pessoal" {...inputHandlers} />
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
