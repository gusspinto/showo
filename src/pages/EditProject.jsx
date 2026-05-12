import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { updateProject } from '../lib/updateProject'
import { Navbar } from '../components/Navbar'

const colors = {
  bg: '#1c2333',
  blue: '#3b82f6',
  blueHover: '#2563eb',
  text: '#ffffff',
  muted: '#94a3b8',
  card: '#232d42',
  border: '#2e3a54',
  green: '#22c55e',
  red: '#ef4444',
}

const PROJECT_TYPES = [
  { value: '', label: 'Selecionar tipo...' },
  { value: 'group', label: '📋 Trabalho de grupo' },
  { value: 'pap', label: '🎓 PAP / Projeto final' },
  { value: 'presentation', label: '📊 Apresentação' },
  { value: 'personal', label: '💻 Projeto pessoal' },
  { value: 'competition', label: '🏆 Projeto de competição' },
  { value: 'other', label: '✨ Outro' },
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
  background: colors.bg,
  border: `1.5px solid ${colors.border}`,
  borderRadius: 10,
  padding: '11px 14px',
  color: colors.text,
  fontSize: 15,
  fontFamily: 'system-ui, sans-serif',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.2s',
}

function Field({ label, children, required }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: colors.muted, marginBottom: 7, textTransform: 'uppercase', letterSpacing: 0.4 }}>
        {label}{required && <span style={{ color: colors.red, marginLeft: 4 }}>*</span>}
      </label>
      {children}
    </div>
  )
}

export default function EditProject() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
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

      if (data.edit_token && token !== data.edit_token) {
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

  function handleCoverImage(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const MAX = 1200
        const ratio = Math.min(MAX / img.width, MAX / img.height, 1)
        canvas.width = img.width * ratio
        canvas.height = img.height * ratio
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
        set('cover_url', canvas.toDataURL('image/jpeg', 0.82))
      }
      img.src = ev.target.result
    }
    reader.readAsDataURL(file)
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
        <div style={{ width: 36, height: 36, border: `4px solid ${colors.border}`, borderTop: `4px solid ${colors.blue}`, borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (accessDenied) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: colors.bg, color: colors.text, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, fontFamily: 'system-ui, sans-serif', padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 48 }}>🔐</div>
        <h2 style={{ margin: 0, fontSize: 24 }}>Acesso restrito</h2>
        <p style={{ color: colors.muted, margin: 0, maxWidth: 380, lineHeight: 1.6 }}>Só o criador deste projeto pode editá-lo. Usa o link privado de edição que recebeste quando criaste o projeto.</p>
        <button onClick={() => navigate(`/projeto/${slug}`)} style={{ background: colors.blue, color: '#fff', border: 'none', borderRadius: 10, padding: '12px 28px', fontSize: 15, fontWeight: 700, cursor: 'pointer', marginTop: 8 }}>Ver o projeto</button>
      </div>
    )
  }

  if (!project) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: colors.bg, color: colors.text, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ fontSize: 48 }}>🔍</div>
        <h2 style={{ margin: 0 }}>Projeto não encontrado</h2>
        <button onClick={() => navigate('/')} style={{ background: colors.blue, color: '#fff', border: 'none', borderRadius: 10, padding: '12px 28px', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>Ir para o início</button>
      </div>
    )
  }

  const isPap = form.project_type === 'pap'

  return (
    <div style={{ minHeight: '100vh', backgroundColor: colors.bg, color: colors.text, fontFamily: 'system-ui, sans-serif' }}>
      <Navbar showLinks={false}>
        <button
          onClick={() => navigate(`/projeto/${slug}`)}
          style={{ background: 'transparent', border: `1px solid ${colors.border}`, color: colors.muted, borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
        >
          ← Cancelar
        </button>
      </Navbar>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '40px 24px 80px' }}>
        <div style={{ marginBottom: 36 }}>
          <h1 style={{ fontSize: 30, fontWeight: 800, margin: '0 0 6px' }}>Editar projeto</h1>
          <p style={{ color: colors.muted, margin: 0 }}>{project.name}</p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Main content fields */}
          <div style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 16, padding: '24px 28px', marginBottom: 20 }}>
            <h2 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>Conteúdo do projeto</h2>
            {FIELDS.map(f => (
              <Field key={f.key} label={f.label} required={f.required}>
                {f.type === 'textarea' ? (
                  <textarea
                    value={form[f.key] || ''}
                    onChange={e => set(f.key, e.target.value)}
                    rows={4}
                    style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
                    onFocus={e => (e.target.style.borderColor = colors.blue)}
                    onBlur={e => (e.target.style.borderColor = colors.border)}
                  />
                ) : (
                  <input
                    type="text"
                    value={form[f.key] || ''}
                    onChange={e => set(f.key, e.target.value)}
                    style={inputStyle}
                    onFocus={e => (e.target.style.borderColor = colors.blue)}
                    onBlur={e => (e.target.style.borderColor = colors.border)}
                  />
                )}
              </Field>
            ))}
          </div>

          {/* About / creator */}
          <div style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 16, padding: '24px 28px', marginBottom: 20 }}>
            <h2 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>Sobre o criador</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Field label="O teu nome">
                <input type="text" value={form.creator_name} onChange={e => set('creator_name', e.target.value)} style={inputStyle} onFocus={e => (e.target.style.borderColor = colors.blue)} onBlur={e => (e.target.style.borderColor = colors.border)} placeholder="Ex: João Silva" />
              </Field>
              <Field label="Curso">
                <input type="text" value={form.course} onChange={e => set('course', e.target.value)} style={inputStyle} onFocus={e => (e.target.style.borderColor = colors.blue)} onBlur={e => (e.target.style.borderColor = colors.border)} placeholder="Ex: Informática" />
              </Field>
              <Field label="Ano letivo">
                <input type="text" value={form.school_year} onChange={e => set('school_year', e.target.value)} style={inputStyle} onFocus={e => (e.target.style.borderColor = colors.blue)} onBlur={e => (e.target.style.borderColor = colors.border)} placeholder="Ex: 2024/2025" />
              </Field>
              <Field label="Escola">
                <input type="text" value={form.school} onChange={e => set('school', e.target.value)} style={inputStyle} onFocus={e => (e.target.style.borderColor = colors.blue)} onBlur={e => (e.target.style.borderColor = colors.border)} placeholder="Ex: ESMAD" />
              </Field>
            </div>
            <div style={{ marginTop: 4 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: colors.muted, marginBottom: 12, marginTop: 8 }}>Links e redes</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <input type="url" value={form.linkedin_url} onChange={e => set('linkedin_url', e.target.value)} style={inputStyle} onFocus={e => (e.target.style.borderColor = colors.blue)} onBlur={e => (e.target.style.borderColor = colors.border)} placeholder="LinkedIn (https://linkedin.com/in/...)" />
                <input type="url" value={form.github_url} onChange={e => set('github_url', e.target.value)} style={inputStyle} onFocus={e => (e.target.style.borderColor = colors.blue)} onBlur={e => (e.target.style.borderColor = colors.border)} placeholder="GitHub (https://github.com/...)" />
                <input type="url" value={form.portfolio_url} onChange={e => set('portfolio_url', e.target.value)} style={inputStyle} onFocus={e => (e.target.style.borderColor = colors.blue)} onBlur={e => (e.target.style.borderColor = colors.border)} placeholder="Portfólio ou site pessoal" />
              </div>
            </div>
          </div>

          {/* Type */}
          <div style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 16, padding: '24px 28px', marginBottom: 20 }}>
            <h2 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>Tipo de projeto</h2>
            <Field label="Tipo">
              <select
                value={form.project_type}
                onChange={e => set('project_type', e.target.value)}
                style={{ ...inputStyle, cursor: 'pointer' }}
                onFocus={e => (e.target.style.borderColor = colors.blue)}
                onBlur={e => (e.target.style.borderColor = colors.border)}
              >
                {PROJECT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </Field>
            {isPap && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 4 }}>
                <Field label="Orientador">
                  <input type="text" value={form.pap_supervisor} onChange={e => set('pap_supervisor', e.target.value)} style={inputStyle} onFocus={e => (e.target.style.borderColor = colors.blue)} onBlur={e => (e.target.style.borderColor = colors.border)} placeholder="Nome do orientador" />
                </Field>
                <Field label="Data de apresentação">
                  <input type="text" value={form.pap_date} onChange={e => set('pap_date', e.target.value)} style={inputStyle} onFocus={e => (e.target.style.borderColor = colors.blue)} onBlur={e => (e.target.style.borderColor = colors.border)} placeholder="Ex: Junho 2025" />
                </Field>
              </div>
            )}
          </div>

          {/* Cover image */}
          <div style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 16, padding: '24px 28px', marginBottom: 28 }}>
            <h2 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>Imagem de capa</h2>
            {form.cover_url ? (
              <div style={{ position: 'relative', marginBottom: 12 }}>
                <img src={form.cover_url} alt="" style={{ width: '100%', height: 180, objectFit: 'cover', borderRadius: 10, display: 'block' }} />
                <button
                  type="button"
                  onClick={() => set('cover_url', '')}
                  style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: 6, padding: '5px 10px', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}
                >
                  Remover
                </button>
              </div>
            ) : (
              <div
                onClick={() => coverInputRef.current?.click()}
                style={{ border: `2px dashed ${colors.border}`, borderRadius: 10, padding: '32px 20px', textAlign: 'center', cursor: 'pointer', color: colors.muted, transition: 'border-color 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = colors.blue)}
                onMouseLeave={e => (e.currentTarget.style.borderColor = colors.border)}
              >
                <div style={{ fontSize: 28, marginBottom: 8 }}>🖼️</div>
                <p style={{ margin: 0, fontSize: 14 }}>Clica para carregar uma imagem</p>
                <p style={{ margin: '4px 0 0', fontSize: 12 }}>PNG, JPG ou WEBP</p>
              </div>
            )}
            <input ref={coverInputRef} type="file" accept="image/*" onChange={handleCoverImage} style={{ display: 'none' }} />
          </div>

          {error && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '12px 16px', color: colors.red, fontSize: 14, marginBottom: 16 }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={saving || !form.name?.trim() || !form.area?.trim()}
            style={{
              width: '100%', background: colors.blue, color: '#fff', border: 'none',
              borderRadius: 12, padding: '15px 0', fontSize: 17, fontWeight: 700,
              cursor: saving ? 'default' : 'pointer',
              opacity: saving || !form.name?.trim() || !form.area?.trim() ? 0.65 : 1,
              transition: 'opacity 0.2s',
            }}
          >
            {saving ? 'A guardar...' : 'Guardar alterações'}
          </button>
        </form>
      </div>
    </div>
  )
}
