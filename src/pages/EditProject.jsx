import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { updateProject } from '../lib/updateProject'
import { Navbar } from '../components/Navbar'
import { useAuth } from '../context/AuthContext'
import { Sparkles, Lock, Search, Image } from 'lucide-react'

const colors = {
  bg: 'var(--c-bg)',
  bgAlt: 'var(--c-bg-alt)',
  card: 'var(--c-card)',
  border: 'var(--c-border)',
  borderBright: 'var(--c-border-bright)',
  blue: '#1b78f7',
  blueHover: '#1564d4',
  text: 'var(--c-text)',
  muted: 'var(--c-muted)',
  subtle: 'var(--c-subtle)',
  green: '#22c55e',
  red: '#f43f5e',
  inputBg: 'var(--c-bg)',
}

const PROJECT_TYPES = [
  { value: '', label: 'Selecionar tipo...' },
  { value: 'group', label: 'Trabalho de grupo' },
  { value: 'pap', label: 'PAP / Projeto final' },
  { value: 'presentation', label: 'Apresentação' },
  { value: 'personal', label: 'Projeto pessoal' },
  { value: 'competition', label: 'Projeto de competição' },
  { value: 'other', label: 'Outro' },
]

const FIELDS = [
  { key: 'name', label: 'Nome do projeto', type: 'text', required: true },
  { key: 'area', label: 'Área / Tecnologia principal', type: 'text', required: true },
  { key: 'problem', label: 'Problema que resolve', type: 'textarea' },
  { key: 'solution', label: 'Solução desenvolvida', type: 'textarea' },
  { key: 'target_audience', label: 'Público-alvo', type: 'textarea' },
  { key: 'features', label: 'Funcionalidades principais', type: 'textarea' },
  { key: 'technologies', label: 'Tecnologias utilizadas', type: 'textarea' },
  { key: 'challenges', label: 'Desafios encontrados', type: 'textarea' },
  { key: 'results', label: 'Resultados obtidos', type: 'textarea' },
  { key: 'learnings', label: 'O que aprendeste', type: 'textarea' },
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
    e.target.style.boxShadow = '0 0 0 3px rgba(27,120,247,0.1)'
  },
  onBlur: e => {
    e.target.style.borderColor = colors.border
    e.target.style.boxShadow = 'none'
  },
}

function Field({ label, children, required }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <label style={{
        display: 'block', fontSize: 11, fontWeight: 700,
        color: colors.subtle, marginBottom: 7,
        textTransform: 'uppercase', letterSpacing: 0.6,
      }}>
        {label}{required && <span style={{ color: colors.red, marginLeft: 4 }}>*</span>}
      </label>
      {children}
    </div>
  )
}

function SectionCard({ title, children }) {
  return (
    <div style={{
      background: colors.card,
      border: `1px solid ${colors.border}`,
      borderRadius: 16,
      padding: '24px 26px',
      marginBottom: 16,
      boxShadow: '0 2px 12px rgba(0,0,0,0.25)',
    }}>
      <h2 style={{
        margin: '0 0 20px', fontSize: 11, fontWeight: 700,
        color: colors.subtle, textTransform: 'uppercase', letterSpacing: 0.8,
      }}>
        {title}
      </h2>
      {children}
    </div>
  )
}

export default function EditProject() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const [project, setProject] = useState(null)
  const [form, setForm] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [accessDenied, setAccessDenied] = useState(false)
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

      // Dual ownership: logged-in owner OR valid edit token OR legacy project OR accepted collaborator
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
      })
      setLoading(false)
    }
    load()
  }, [slug])

  function set(key, value) {
    setForm(f => ({ ...f, [key]: value }))
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
    setSaving(true)
    setError(null)
    try {
      const saved = await updateProject(project.id, { ...form, is_pap: form.project_type === 'pap' })
      navigate(`/projeto/${saved.slug}`)
    } catch (err) {
      setError('Erro ao guardar. Tenta novamente.')
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 36, height: 36, border: `3px solid ${colors.border}`, borderTop: `3px solid ${colors.blue}`, borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (accessDenied) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: colors.bg, color: colors.text, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, fontFamily: 'var(--font-body)', padding: 24, textAlign: 'center' }}>
        <Lock size={48} color={colors.yellow ?? '#fbbf24'} />
        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Acesso restrito</h2>
        <p style={{ color: colors.muted, margin: 0, maxWidth: 380, lineHeight: 1.65 }}>Só o criador deste projeto pode editá-lo. Usa o link privado de edição que recebeste quando criaste o projeto.</p>
        <button onClick={() => navigate(`/projeto/${slug}`)} style={{ background: `linear-gradient(135deg, ${colors.blue}, #4f46e5)`, color: '#fff', border: 'none', borderRadius: 10, padding: '12px 28px', fontSize: 15, fontWeight: 700, cursor: 'pointer', marginTop: 8, boxShadow: '0 4px 20px rgba(27,120,247,0.3)', fontFamily: 'inherit' }}>Ver o projeto</button>
      </div>
    )
  }

  if (!project) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: colors.bg, color: colors.text, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, fontFamily: 'var(--font-body)' }}>
        <Search size={48} color={colors.blue} />
        <h2 style={{ margin: 0, fontWeight: 700 }}>Projeto não encontrado</h2>
        <button onClick={() => navigate('/')} style={{ background: `linear-gradient(135deg, ${colors.blue}, #4f46e5)`, color: '#fff', border: 'none', borderRadius: 10, padding: '12px 28px', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Ir para o início</button>
      </div>
    )
  }

  const isPap = form.project_type === 'pap'

  return (
    <div style={{ minHeight: '100vh', backgroundColor: colors.bg, color: colors.text, fontFamily: 'var(--font-body)' }}>
      <Navbar showLinks={false}>
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
          ← Cancelar
        </button>
      </Navbar>

      <div className="page-content">
        <div style={{ marginBottom: 36 }}>
          <h1 style={{ fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 900, margin: '0 0 6px', letterSpacing: '-0.5px' }}>Editar projeto</h1>
          <p style={{ color: colors.muted, margin: 0, fontSize: 15 }}>{project.name}</p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Content */}
          <SectionCard title="Conteúdo do projeto">
            {FIELDS.map(f => (
              <Field key={f.key} label={f.label} required={f.required}>
                {f.type === 'textarea' ? (
                  <textarea
                    value={form[f.key] || ''}
                    onChange={e => set(f.key, e.target.value)}
                    rows={4}
                    style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.65 }}
                    {...inputHandlers}
                  />
                ) : (
                  <input
                    type="text"
                    value={form[f.key] || ''}
                    onChange={e => set(f.key, e.target.value)}
                    style={inputStyle}
                    {...inputHandlers}
                  />
                )}
              </Field>
            ))}
          </SectionCard>

          {/* Creator */}
          <SectionCard title="Sobre o criador">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Field label="O teu nome">
                <input type="text" value={form.creator_name} onChange={e => set('creator_name', e.target.value)} style={inputStyle} placeholder="Ex: João Silva" {...inputHandlers} />
              </Field>
              <Field label="Curso">
                <input type="text" value={form.course} onChange={e => set('course', e.target.value)} style={inputStyle} placeholder="Ex: Informática" {...inputHandlers} />
              </Field>
              <Field label="Ano letivo">
                <input type="text" value={form.school_year} onChange={e => set('school_year', e.target.value)} style={inputStyle} placeholder="Ex: 2024/2025" {...inputHandlers} />
              </Field>
              <Field label="Escola">
                <input type="text" value={form.school} onChange={e => set('school', e.target.value)} style={inputStyle} placeholder="Ex: ESMAD" {...inputHandlers} />
              </Field>
            </div>
            <div style={{ marginTop: 4 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: colors.subtle, marginBottom: 12, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.6 }}>Links e redes</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <input type="url" value={form.linkedin_url} onChange={e => set('linkedin_url', e.target.value)} style={inputStyle} placeholder="LinkedIn (https://linkedin.com/in/...)" {...inputHandlers} />
                <input type="url" value={form.github_url} onChange={e => set('github_url', e.target.value)} style={inputStyle} placeholder="GitHub (https://github.com/...)" {...inputHandlers} />
                <input type="url" value={form.portfolio_url} onChange={e => set('portfolio_url', e.target.value)} style={inputStyle} placeholder="Portfólio ou site pessoal" {...inputHandlers} />
              </div>
            </div>
          </SectionCard>

          {/* Type */}
          <SectionCard title="Tipo de projeto">
            <Field label="Tipo">
              <select
                value={form.project_type}
                onChange={e => set('project_type', e.target.value)}
                style={{ ...inputStyle, cursor: 'pointer' }}
                {...inputHandlers}
              >
                {PROJECT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </Field>
            {isPap && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 4 }}>
                <Field label="Orientador">
                  <input type="text" value={form.pap_supervisor} onChange={e => set('pap_supervisor', e.target.value)} style={inputStyle} placeholder="Nome do orientador" {...inputHandlers} />
                </Field>
                <Field label="Data de apresentação">
                  <input type="text" value={form.pap_date} onChange={e => set('pap_date', e.target.value)} style={inputStyle} placeholder="Ex: Junho 2025" {...inputHandlers} />
                </Field>
              </div>
            )}
          </SectionCard>

          {/* Cover image */}
          <SectionCard title="Imagem de capa">
            {form.cover_url === '__uploading__' ? (
              <div style={{ height: 180, borderRadius: 10, background: colors.card, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, color: colors.muted, fontSize: 14, marginBottom: 12 }}>
                <div style={{ width: 20, height: 20, border: `2px solid ${colors.border}`, borderTop: `2px solid ${colors.blue}`, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                A carregar imagem…
              </div>
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
          </SectionCard>

          {error && (
            <div style={{
              background: 'rgba(244,63,94,0.08)',
              border: '1px solid rgba(244,63,94,0.25)',
              borderRadius: 10, padding: '12px 16px',
              color: colors.red, fontSize: 14, marginBottom: 16, fontWeight: 500,
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={saving || !form.name?.trim() || !form.area?.trim()}
            style={{
              width: '100%',
              background: saving || !form.name?.trim() || !form.area?.trim()
                ? colors.border
                : `linear-gradient(135deg, ${colors.blue}, #4f46e5)`,
              color: '#fff', border: 'none',
              borderRadius: 12, padding: '15px 0',
              fontSize: 17, fontWeight: 700,
              cursor: saving ? 'default' : 'pointer',
              opacity: saving ? 0.7 : 1,
              transition: 'opacity 0.2s, background 0.2s',
              fontFamily: 'inherit',
              boxShadow: saving || !form.name?.trim() || !form.area?.trim() ? 'none' : '0 4px 20px rgba(27,120,247,0.3)',
              letterSpacing: '-0.1px',
            }}
          >
            {saving ? 'A guardar...' : 'Guardar alterações'}
          </button>
        </form>
      </div>
    </div>
  )
}
