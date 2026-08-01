import { useState, useRef, useEffect } from 'react'
import SkillsPicker from '../components/SkillsPicker'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { GraduationCap, Briefcase, Rocket, Users, Camera, ShieldAlert, ArrowRight } from 'lucide-react'
import { saveProject } from '../lib/saveProject'
import { calculateScore, looksLikeSpam, isTooShortForContent } from '../lib/score'
import { containsProfanity } from '../lib/profanity'
import { Toast, useToast } from '../components/Toast'
import { Navbar } from '../components/Navbar'
import { useAuth } from '../context/AuthContext'
import { CropModal } from '../components/CropModal'

const GOAL_OPTIONS = [
  { id: 'school',     Icon: GraduationCap, label: 'Projeto escolar' },
  { id: 'internship', Icon: Briefcase,     label: 'Para estágio' },
  { id: 'show',       Icon: Rocket,        label: 'Partilha pública' },
  { id: 'clients',    Icon: Users,         label: 'Prova profissional' },
]

const SCHOOL_YEARS = ['10º ano', '11º ano', '12º ano', 'Licenciatura', 'Mestrado', 'Outro']

const PROJECT_TYPES = [
  { id: 'pap', label: 'PAP' }, { id: 'personal', label: 'Pessoal' },
  { id: 'group', label: 'Grupo' }, { id: 'competition', label: 'Competição' },
  { id: 'internship', label: 'Estágio' }, { id: 'presentation', label: 'Apresentação' },
]

function timeAgo(iso) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 2) return 'agora mesmo'
  if (mins < 60) return `há ${mins} min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `há ${hrs}h`
  return `há ${Math.floor(hrs / 24)}d`
}

const TEXTAREA_KEYS = new Set(['goal', 'problem', 'solution', 'features', 'challenges', 'results', 'learnings'])

export default function NewProject() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, loading: authLoading } = useAuth()
  const { toast, show: showToast } = useToast()
  const fileInputRef = useRef(null)
  const syncTimerRef = useRef(null)
  const draftCheckedRef = useRef(false)

  const [form, setForm] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [cropFile, setCropFile] = useState(null)
  const [draftBanner, setDraftBanner] = useState(null)
  const [showAuthNudge, setShowAuthNudge] = useState(false)

  function set(key, val) { setForm(p => ({ ...p, [key]: val })) }

  // ── Draft ──────────────────────────────────────────────────────────────────

  async function clearDraft() {
    try { localStorage.removeItem('showo_new_project_draft') } catch {}
    if (user) await supabase.from('profiles').update({ project_draft: null }).eq('id', user.id)
  }

  useEffect(() => {
    const state = location.state?.prefill
    if (state?.fromWidget) {
      setForm(state.answers ?? {})
      window.history.replaceState({}, '')
      return
    }
    async function checkDraft() {
      let draft = null
      if (user) {
        const { data } = await supabase.from('profiles').select('project_draft').eq('id', user.id).single()
        draft = data?.project_draft || null
      }
      if (!draft) {
        try { const raw = localStorage.getItem('showo_new_project_draft'); if (raw) draft = JSON.parse(raw) } catch {}
      }
      if (draft?.answers && Object.keys(draft.answers).length > 0) setDraftBanner(draft)
    }
    if (!authLoading && !draftCheckedRef.current) { draftCheckedRef.current = true; checkDraft() }
  }, [authLoading, user]) // eslint-disable-line

  useEffect(() => {
    const { cover_url: _omit, ...withoutCover } = form
    if (Object.keys(withoutCover).length === 0) return
    const draft = { answers: withoutCover, savedAt: new Date().toISOString() }
    try { localStorage.setItem('showo_new_project_draft', JSON.stringify(draft)) } catch {}
    clearTimeout(syncTimerRef.current)
    if (user) syncTimerRef.current = setTimeout(() => {
      supabase.from('profiles').update({ project_draft: draft }).eq('id', user.id)
    }, 1500)
  }, [form, user]) // eslint-disable-line

  useEffect(() => {
    if (authLoading) return
    if (!user && !sessionStorage.getItem('showo_auth_nudge_dismissed')) setShowAuthNudge(true)
    if (user) setShowAuthNudge(false)
  }, [user, authLoading])

  // ── Image ──────────────────────────────────────────────────────────────────

  function handleImageFile(file) {
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { showToast('Imagem demasiado grande (máx. 10MB)', 'error'); return }
    if (!file.type.startsWith('image/')) { showToast('Ficheiro inválido. Usa PNG, JPG ou WEBP.', 'error'); return }
    setCropFile(file)
  }

  async function handleCropConfirm(blob) {
    setCropFile(null)
    set('cover_url', '__uploading__')
    try {
      const path = `draft-${Date.now()}.jpg`
      const { error: upErr } = await supabase.storage.from('covers').upload(path, blob, { upsert: true, contentType: 'image/jpeg' })
      if (upErr) throw upErr
      const { data: { publicUrl } } = supabase.storage.from('covers').getPublicUrl(path)
      set('cover_url', publicUrl)
      showToast('Imagem adicionada!')
    } catch { set('cover_url', ''); showToast('Erro ao carregar imagem.', 'error') }
  }

  // ── Validation ─────────────────────────────────────────────────────────────

  function fieldError(key) {
    const v = form[key] ?? ''
    if (!v.trim()) return null
    if (containsProfanity(v)) return 'profanity'
    if (looksLikeSpam(v)) return 'spam'
    if (TEXTAREA_KEYS.has(key) && isTooShortForContent(v)) return 'short'
    return null
  }

  const REQUIRED = ['name', 'area', 'goal', 'problem', 'solution']
  const hasRequired = REQUIRED.every(k => (form[k] ?? '').trim().length > 0)
  const hasErrors = [...REQUIRED, 'features', 'challenges', 'results', 'learnings'].some(k => fieldError(k))
  const canSubmit = hasRequired && !hasErrors

  const score = calculateScore(form).score

  // ── Submit ─────────────────────────────────────────────────────────────────

  async function handleSubmit(e) {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)
    try {
      const project = await saveProject(form, {}, user?.id ?? null)
      localStorage.setItem(`edit_token_${project.slug}`, project.edit_token)
      await clearDraft()
      navigate(`/projeto/${project.slug}`, {
        state: { newProject: true, message: 'Projeto criado! Começa a melhorar o teu score.' }
      })
    } catch (err) {
      console.error(err)
      setError('Ocorreu um erro. Tenta novamente.')
      showToast('Erro ao criar o projeto. Tenta novamente.', 'error')
      setSubmitting(false)
    }
  }

  // ── Generating state ───────────────────────────────────────────────────────

  if (submitting) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg)', color: 'var(--color-text)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
        <div style={{ width: 52, height: 52, border: '3px solid var(--color-border)', borderTop: '3px solid var(--color-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 18, fontWeight: 700, margin: '0 0 6px', letterSpacing: '-0.3px' }}>A criar o teu projeto...</p>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 14, margin: 0 }}>Só um momento</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}>
      <style>{`
        .np-form input[type="text"],
        .np-form input[type="url"],
        .np-form textarea,
        .np-form select {
          width: 100%; background: var(--color-input-bg);
          border: 1.5px solid var(--color-input-border); border-radius: var(--radius-md);
          color: var(--color-text); font-size: var(--text-base); padding: 11px 14px;
          outline: none; font-family: inherit; box-sizing: border-box;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .np-form input:focus, .np-form textarea:focus, .np-form select:focus {
          border-color: var(--color-primary);
          box-shadow: 0 0 0 3px var(--color-primary-subtle);
        }
        .np-form textarea { resize: vertical; line-height: 1.65; }
        .np-form select { cursor: pointer; }
        @media (max-width: 560px) { .np-grid-2 { grid-template-columns: 1fr !important; } }
      `}</style>
      <Toast {...toast} />
      <Navbar showLinks={false} />

      {/* Auth nudge */}
      {showAuthNudge && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(8,14,26,0.82)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 14, padding: '32px 28px', maxWidth: 400, width: '100%', textAlign: 'center' }}>
            <h2 style={{ fontSize: 20, fontWeight: 400, fontFamily: 'var(--font-heading)', margin: '0 0 10px', letterSpacing: '-0.3px' }}>Guarda o teu projeto</h2>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: 14, lineHeight: 1.65, margin: '0 0 24px' }}>
              Sem conta, o teu projeto fica guardado apenas com um link privado. Se o perderes, não há forma de recuperar.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button onClick={() => navigate('/register')} style={{ background: 'var(--color-primary)', border: 'none', borderRadius: 8, padding: '11px 0', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Criar conta</button>
              <button onClick={() => navigate('/login')} style={{ background: 'transparent', border: '1px solid var(--color-border)', borderRadius: 8, padding: '10px 0', color: 'var(--color-text)', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Iniciar sessão</button>
              <button onClick={() => { sessionStorage.setItem('showo_auth_nudge_dismissed', '1'); setShowAuthNudge(false) }} style={{ background: 'transparent', border: 'none', color: 'var(--color-text-tertiary)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', padding: '6px 0' }}>Continuar sem conta</button>
            </div>
          </div>
        </div>
      )}

      <div className="page-content np-form" style={{ maxWidth: 640 }}>
        <h1 style={{ fontSize: 'clamp(22px, 4vw, 28px)', fontWeight: 400, fontFamily: 'var(--font-heading)', margin: '0 0 6px', letterSpacing: '-0.5px' }}>Novo projeto</h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 14, margin: '0 0 28px' }}>Preenche os campos obrigatórios e cria a tua página.</p>

        {/* Draft recovery */}
        {draftBanner && (
          <div style={{ background: 'var(--color-glass)', backdropFilter: 'blur(16px)', border: '1px solid var(--color-glass-border)', borderLeft: '3px solid var(--color-primary)', borderRadius: 12, padding: '14px 16px', marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>Tens um rascunho guardado</div>
                {draftBanner.savedAt && <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 2 }}>{timeAgo(draftBanner.savedAt)}</div>}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => { setForm(draftBanner.answers || {}); setDraftBanner(null) }} style={{ background: 'var(--color-primary)', border: 'none', borderRadius: 7, padding: '7px 14px', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Continuar</button>
                <button onClick={async () => { await clearDraft(); setDraftBanner(null) }} style={{ background: 'transparent', border: '1px solid var(--color-border)', borderRadius: 7, padding: '7px 12px', color: 'var(--color-text-secondary)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>Apagar</button>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

          {/* ── Básico ── */}
          <FormSection label="Básico">
            <FormField label="Nome do projeto" required>
              <input type="text" placeholder="Ex: EcoTrack, StudyBuddy, FoodSaver..." value={form.name ?? ''} onChange={e => set('name', e.target.value)} />
            </FormField>
            <FormField label="Área" required>
              <input type="text" placeholder="Ex: Saúde, Educação, Sustentabilidade..." value={form.area ?? ''} onChange={e => set('area', e.target.value)} />
            </FormField>
            <FormField label="Objetivo do projeto">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }} className="np-grid-2">
                {GOAL_OPTIONS.map(opt => {
                  const sel = form.formGoal === opt.id
                  return (
                    <button type="button" key={opt.id} onClick={() => set('formGoal', sel ? null : opt.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 8, border: `1.5px solid ${sel ? 'var(--color-primary)' : 'var(--color-border)'}`, background: sel ? 'var(--color-primary-subtle)' : 'transparent', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: sel ? 700 : 500, color: sel ? 'var(--color-primary)' : 'var(--color-text-secondary)', transition: 'all 0.15s', textAlign: 'left' }}>
                      <opt.Icon size={14} strokeWidth={sel ? 2.2 : 1.8} />
                      {opt.label}
                    </button>
                  )
                })}
              </div>
            </FormField>
          </FormSection>

          {/* ── Descrição ── */}
          <FormSection label="Descrição">
            <TextareaField label="Qual é o objetivo principal?" fieldKey="goal" form={form} set={set} fieldError={fieldError}
              placeholder="Descreve o que este projeto pretende alcançar..." required />
            <TextareaField label="Que problema resolve?" fieldKey="problem" form={form} set={set} fieldError={fieldError}
              placeholder="Descreve o problema que identificaste e que motivou este projeto..." required />
            <TextareaField label="Como é que o resolve?" fieldKey="solution" form={form} set={set} fieldError={fieldError}
              placeholder="Explica a tua abordagem e solução de forma clara..." required />
          </FormSection>

          {/* ── Detalhes ── */}
          <FormSection label="Detalhes" hint="opcional">
            <FormField label="Tecnologias utilizadas">
              <input type="text" placeholder="Ex: React, Python, PostgreSQL, Firebase..." value={form.technologies ?? ''} onChange={e => set('technologies', e.target.value)} />
            </FormField>
            <FormField label="Público-alvo">
              <input type="text" placeholder="Ex: Estudantes universitários, pequenas empresas..." value={form.target_audience ?? ''} onChange={e => set('target_audience', e.target.value)} />
            </FormField>
            <TextareaField label="Principais funcionalidades" fieldKey="features" form={form} set={set} fieldError={fieldError}
              placeholder="Lista as 3-5 funcionalidades mais importantes..." rows={3} />
            <TextareaField label="Maiores desafios" fieldKey="challenges" form={form} set={set} fieldError={fieldError}
              placeholder="O que foi mais difícil de implementar ou resolver?" rows={3} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }} className="np-grid-2">
              <TextareaField label="Resultados" fieldKey="results" form={form} set={set} fieldError={fieldError}
                placeholder="Métricas, feedback, conquistas..." rows={3} />
              <TextareaField label="Aprendizagens" fieldKey="learnings" form={form} set={set} fieldError={fieldError}
                placeholder="Competências, lições importantes..." rows={3} />
            </div>
          </FormSection>

          {/* ── Sobre ti ── */}
          <FormSection label="Sobre ti" hint="opcional">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }} className="np-grid-2">
              <FormField label="Nome">
                <input type="text" placeholder="Ex: João" value={form.creator_name ?? ''} onChange={e => set('creator_name', e.target.value)} />
              </FormField>
              <FormField label="Curso">
                <input type="text" placeholder="Ex: Técnico de Informática" value={form.course ?? ''} onChange={e => set('course', e.target.value)} />
              </FormField>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }} className="np-grid-2">
              <FormField label="Ano escolar">
                <select value={form.school_year ?? ''} onChange={e => set('school_year', e.target.value)} style={{ color: form.school_year ? 'var(--color-text)' : 'var(--color-text-tertiary)' }}>
                  <option value="" disabled>Seleciona...</option>
                  {SCHOOL_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </FormField>
              <FormField label="Escola">
                <input type="text" placeholder="Nome da escola" value={form.school ?? ''} onChange={e => set('school', e.target.value)} />
              </FormField>
            </div>
            {form.formGoal === 'school' && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', padding: '12px 14px', background: 'var(--color-input-bg)', borderRadius: 8, border: `1.5px solid ${form.is_pap ? 'var(--color-primary)' : 'var(--color-border)'}`, transition: 'border-color 0.2s' }}>
                <input type="checkbox" checked={form.is_pap ?? false} onChange={e => set('is_pap', e.target.checked)} style={{ width: 16, height: 16, accentColor: 'var(--color-primary)', cursor: 'pointer', flexShrink: 0 }} />
                <span style={{ fontSize: 14 }}>Este projeto é a minha <strong>PAP</strong></span>
              </label>
            )}
            {form.is_pap && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }} className="np-grid-2">
                <FormField label="Orientador">
                  <input type="text" placeholder="Nome do orientador" value={form.pap_supervisor ?? ''} onChange={e => set('pap_supervisor', e.target.value)} />
                </FormField>
                <FormField label="Data de apresentação">
                  <input type="text" placeholder="Ex: 15 de Junho de 2025" value={form.pap_date ?? ''} onChange={e => set('pap_date', e.target.value)} />
                </FormField>
              </div>
            )}
          </FormSection>

          {/* ── Links ── */}
          <FormSection label="Links" hint="opcional">
            <FormField label="LinkedIn">
              <input type="url" placeholder="https://linkedin.com/in/..." value={form.linkedin_url ?? ''} onChange={e => set('linkedin_url', e.target.value)} />
            </FormField>
            <FormField label="GitHub">
              <input type="url" placeholder="https://github.com/..." value={form.github_url ?? ''} onChange={e => set('github_url', e.target.value)} />
            </FormField>
            <FormField label="Portfólio">
              <input type="url" placeholder="Site ou portfólio pessoal" value={form.portfolio_url ?? ''} onChange={e => set('portfolio_url', e.target.value)} />
            </FormField>
          </FormSection>

          {/* ── Extras ── */}
          <FormSection label="Extras" hint="opcional">
            <FormField label="Tipo de projeto">
              <select value={form.project_type ?? ''} onChange={e => set('project_type', e.target.value)} style={{ color: form.project_type ? 'var(--color-text)' : 'var(--color-text-tertiary)' }}>
                <option value="">Seleciona...</option>
                {PROJECT_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </FormField>
            <SkillsPicker label="Tags do projeto" value={form.tags ?? []} onChange={v => set('tags', v)} max={10} />
            <FormField label="Imagem de capa">
              {form.cover_url && form.cover_url !== '__uploading__' ? (
                <div>
                  <img src={form.cover_url} alt="" style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 10, border: '1px solid var(--color-border)', display: 'block' }} />
                  <button type="button" onClick={() => set('cover_url', null)} style={{ marginTop: 8, background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', borderRadius: 7, padding: '6px 12px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>Remover</button>
                </div>
              ) : form.cover_url === '__uploading__' ? (
                <div style={{ border: '2px dashed var(--color-border)', borderRadius: 10, padding: '28px 20px', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 13 }}>A carregar…</div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={e => { e.preventDefault(); setDragOver(false); handleImageFile(e.dataTransfer.files?.[0]) }}
                  style={{ border: `2px dashed ${dragOver ? 'var(--color-primary)' : 'var(--color-border)'}`, background: dragOver ? 'var(--color-primary-subtle)' : 'transparent', borderRadius: 10, padding: '28px 20px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
                    <Camera size={24} color={dragOver ? 'var(--color-primary)' : 'var(--color-text-tertiary)'} />
                  </div>
                  <p style={{ color: dragOver ? 'var(--color-primary)' : 'var(--color-text-secondary)', margin: 0, fontSize: 13, fontWeight: 500 }}>Clica ou arrasta uma imagem</p>
                  <p style={{ color: 'var(--color-text-tertiary)', margin: '4px 0 0', fontSize: 11 }}>PNG, JPG ou WEBP · máx. 10MB</p>
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" onChange={e => { handleImageFile(e.target.files?.[0]); if (e.target) e.target.value = '' }} style={{ display: 'none' }} />
              {cropFile && <CropModal file={cropFile} aspectRatio={16 / 9} onConfirm={handleCropConfirm} onCancel={() => setCropFile(null)} />}
            </FormField>
          </FormSection>

          {/* ── Score preview ── */}
          {score > 0 && (
            <div style={{ padding: '14px 16px', background: 'var(--color-glass)', backdropFilter: 'blur(16px)', borderRadius: 12, border: '1px solid var(--color-glass-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: 'var(--color-text-secondary)', fontWeight: 500 }}>Score estimado</span>
                <span style={{ fontSize: 16, fontWeight: 800, color: score > 80 ? 'var(--color-success)' : score >= 60 ? 'var(--color-warning)' : 'var(--color-primary)' }}>{score}</span>
              </div>
              <div style={{ height: 4, background: 'var(--color-border)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${score}%`, background: score > 80 ? 'var(--color-success)' : score >= 60 ? 'var(--color-warning)' : 'var(--color-primary)', borderRadius: 2, transition: 'width 0.4s ease' }} />
              </div>
            </div>
          )}

          {error && <p style={{ color: 'var(--color-error)', fontSize: 14, margin: 0, fontWeight: 500 }}>{error}</p>}

          <button type="submit" disabled={!canSubmit}
            style={{ background: canSubmit ? 'var(--color-primary)' : 'var(--color-border)', color: '#fff', border: 'none', borderRadius: 10, padding: '14px 0', fontSize: 16, fontWeight: 700, cursor: canSubmit ? 'pointer' : 'not-allowed', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, boxShadow: canSubmit ? '0 2px 8px rgba(27,120,247,0.2)' : 'none', transition: 'background 0.2s, box-shadow 0.2s', marginBottom: 40 }}>
            Criar página <ArrowRight size={15} />
          </button>
        </form>
      </div>
    </div>
  )
}

// ── Helper components ──────────────────────────────────────────────────────────

function FormSection({ label, hint, children }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 16, paddingBottom: 10, borderBottom: '1px solid var(--color-border)' }}>
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, color: 'var(--color-text-tertiary)' }}>{label}</span>
        {hint && <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>— {hint}</span>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {children}
      </div>
    </div>
  )
}

function FormField({ label, required, children }) {
  return (
    <div>
      {label && (
        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 6, letterSpacing: 0.2 }}>
          {label}{required && <span style={{ color: 'var(--color-error)', marginLeft: 3 }}>*</span>}
        </label>
      )}
      {children}
    </div>
  )
}

function TextareaField({ label, fieldKey, form, set, fieldError, placeholder, required, rows = 4 }) {
  const err = fieldError(fieldKey)
  return (
    <FormField label={label} required={required}>
      <textarea
        value={form[fieldKey] ?? ''}
        onChange={e => set(fieldKey, e.target.value)}
        placeholder={placeholder}
        rows={rows}
        style={err ? { borderColor: 'rgba(239,68,68,0.6)' } : undefined}
      />
      {err && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 8, padding: '10px 12px', background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8 }}>
          <ShieldAlert size={14} color="var(--color-error)" style={{ flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
            {err === 'short' ? 'Escreve pelo menos 20 caracteres.' : err === 'profanity' ? 'Linguagem inapropriada detetada.' : 'Texto inválido — escreve conteúdo real.'}
          </span>
        </div>
      )}
    </FormField>
  )
}
