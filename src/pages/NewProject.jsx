import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { saveProject } from '../lib/saveProject'
import { Sparkles, ArrowRight, Pencil, Check, ChevronRight } from 'lucide-react'
import { Navbar } from '../components/Navbar'
import { useAuth } from '../context/AuthContext'
import { Toast, useToast } from '../components/Toast'

const PROJECT_TYPES = [
  { id: 'school',   label: 'Projeto de escola' },
  { id: 'pap',      label: 'PAP' },
  { id: 'personal', label: 'Projeto pessoal' },
]

const REVIEW_FIELDS = [
  { key: 'name',     label: 'Nome do projeto',      multiline: false, required: true },
  { key: 'area',     label: 'Área',                 multiline: false, required: true },
  { key: 'goal',     label: 'Objetivo',             multiline: true,  required: true },
  { key: 'problem',  label: 'Problema que resolve', multiline: true,  required: true },
  { key: 'solution', label: 'Como resolve',         multiline: true,  required: true },
  { key: 'features', label: 'Funcionalidades',      multiline: true,  required: false },
]

export default function NewProject() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const { toast, show: showToast } = useToast()

  const [step, setStep] = useState('describe')
  const [description, setDescription] = useState('')
  const [projectType, setProjectType] = useState('school')
  const [form, setForm] = useState({})
  const [editingField, setEditingField] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [error, setError] = useState(null)
  const [interviewData, setInterviewData] = useState(null)

  function set(key, val) { setForm(p => ({ ...p, [key]: val })) }

  useEffect(() => {
    const state = location.state?.prefill
    if (state?.fromWidget) {
      setForm(state.answers ?? {})
      setStep('review')
      window.history.replaceState({}, '')
    }
  }, []) // eslint-disable-line

  /* ── Generate (prefill) ── */
  async function handleGenerate() {
    if (!description.trim()) return
    setStep('loading')
    setError(null)
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('prefill-project', {
        body: { text: description, projectType },
      })
      if (fnErr) throw new Error()
      setForm({ ...(data?.prefill ?? {}), project_type: projectType })
      setStep('review')
    } catch {
      setError('Não foi possível gerar. Tenta novamente.')
      setStep('describe')
    }
  }

  /* ── Interview (guided questions) ── */
  async function handleInterview() {
    if (!description.trim()) return
    setStep('loading')
    setError(null)
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('interview-project', {
        body: { description, projectType },
      })
      if (fnErr || !data?.questions?.length) throw new Error()
      setInterviewData({ ...data, projectType })
      setStep('interview')
    } catch {
      setError('Não foi possível iniciar a entrevista. Tenta novamente.')
      setStep('describe')
    }
  }

  /* ── Inline editing ── */
  function startEdit(field) {
    setEditingField(field.key)
    setEditValue(form[field.key] ?? '')
  }

  function commitEdit() {
    if (editingField) {
      set(editingField, editValue)
      setEditingField(null)
    }
  }

  /* ── Submit ── */
  async function handleSubmit() {
    setStep('submitting')
    setError(null)
    let aiResult = {}
    try {
      const { data } = await supabase.functions.invoke('generate-project', { body: { data: form } })
      if (data?.tagline) aiResult = data
    } catch { /* non-critical */ }
    try {
      const project = await saveProject(form, aiResult, user?.id ?? null)
      if (user?.id) localStorage.setItem(`edit_token_${project.slug}`, project.edit_token)
      navigate(`/projeto/${project.slug}`, {
        state: { newProject: true, projectData: project, message: 'Projeto criado! Começa a melhorar o teu score.' }
      })
    } catch (err) {
      console.error(err)
      showToast('Erro ao criar o projeto. Tenta novamente.', 'error')
      setStep('review')
    }
  }

  const canSubmit = REVIEW_FIELDS.filter(f => f.required)
    .every(f => (form[f.key] ?? '').trim().length > 0)

  /* ──────────────────────────────────────────────────────────────────────────
     STEP: describe
  ────────────────────────────────────────────────────────────────────────── */
  if (step === 'describe') {
    return (
      <NpShell>
        <Toast {...toast} />
        <Navbar showLinks={false} />
        <div style={S.center}>
          <div style={S.describeWrap}>
            <div style={S.eyebrowRow}>
              <Sparkles size={15} color="var(--color-primary)" />
              <span style={S.eyebrow}>Novo projeto</span>
            </div>

            <h1 style={S.headline}>Conta-nos sobre o teu projeto.</h1>
            <p style={S.sub}>
              Descreve em 2–3 frases. A IA estrutura o conteúdo — tu revês e ajustas.
            </p>

            <DescribeTextarea
              value={description}
              onChange={setDescription}
              onSubmit={handleGenerate}
            />

            <div style={S.typeRow}>
              {PROJECT_TYPES.map(t => (
                <TypeChip
                  key={t.id}
                  label={t.label}
                  active={projectType === t.id}
                  onClick={() => setProjectType(t.id)}
                />
              ))}
            </div>

            {error && <p style={S.err}>{error}</p>}

            <button
              type="button"
              onClick={handleGenerate}
              disabled={!description.trim()}
              style={btnStyle(description.trim())}
            >
              <Sparkles size={15} />
              Criar com IA
              <ArrowRight size={15} />
            </button>

            <button
              type="button"
              onClick={handleInterview}
              disabled={!description.trim()}
              style={secondaryBtnStyle(description.trim())}
            >
              <ChevronRight size={14} />
              Prefiro responder a perguntas
            </button>
          </div>
        </div>
      </NpShell>
    )
  }

  /* ──────────────────────────────────────────────────────────────────────────
     STEP: loading / submitting
  ────────────────────────────────────────────────────────────────────────── */
  if (step === 'loading' || step === 'submitting') {
    return (
      <NpShell>
        <div style={S.loadingCenter}>
          <div style={S.spinner} />
          <p style={S.loadingTitle}>
            {step === 'submitting' ? 'A guardar o teu projeto…' : 'A estruturar o teu projeto…'}
          </p>
          <p style={S.loadingSub}>
            {step === 'submitting' ? 'Quase pronto.' : 'A IA está a organizar o que descreveste.'}
          </p>
          <style>{`@keyframes np-spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </NpShell>
    )
  }

  /* ──────────────────────────────────────────────────────────────────────────
     STEP: interview (guided questions)
  ────────────────────────────────────────────────────────────────────────── */
  if (step === 'interview' && interviewData) {
    return (
      <NpShell>
        <Toast {...toast} />
        <Navbar showLinks={false} />
        <div style={S.center}>
          <div style={S.reviewWrap}>
            <div style={{ marginBottom: 24 }}>
              <h2 style={S.reviewHead}>Vamos construir o teu projeto juntos.</h2>
              <p style={S.reviewSub}>Responde a cada pergunta — a IA usa as tuas respostas para criar o projeto.</p>
            </div>
            <InterviewPanel
              data={interviewData}
              onComplete={answers => {
                setForm({ ...Object.fromEntries(Object.entries(answers).filter(([, v]) => v)), project_type: interviewData.projectType })
                setStep('review')
              }}
              onBack={() => setStep('describe')}
            />
          </div>
        </div>
      </NpShell>
    )
  }

  /* ──────────────────────────────────────────────────────────────────────────
     STEP: review
  ────────────────────────────────────────────────────────────────────────── */
  return (
    <NpShell>
      <Toast {...toast} />
      <Navbar showLinks={false} />
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '40px 20px 80px' }}>

        <div style={{ marginBottom: 28 }}>
          <h2 style={S.reviewHead}>Parece bem?</h2>
          <p style={S.reviewSub}>
            A IA estruturou o teu projeto. Clica em qualquer campo para editar antes de criar.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {REVIEW_FIELDS.map(field => (
            <ReviewField
              key={field.key}
              field={field}
              value={form[field.key] ?? ''}
              isEditing={editingField === field.key}
              editValue={editValue}
              onEdit={() => startEdit(field)}
              onEditValueChange={setEditValue}
              onCommit={commitEdit}
            />
          ))}
        </div>

        {error && <p style={S.err}>{error}</p>}

        <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            style={btnStyle(canSubmit)}
          >
            Criar projeto <ArrowRight size={15} />
          </button>
          <button
            type="button"
            onClick={() => setStep('describe')}
            style={secondaryBtnStyle(true)}
          >
            ← Voltar e descrever novamente
          </button>
        </div>
      </div>
    </NpShell>
  )
}

/* ── Sub-components ──────────────────────────────────────────────────────── */

function NpShell({ children }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', color: 'var(--color-text)', display: 'flex', flexDirection: 'column' }}>
      {children}
    </div>
  )
}

function DescribeTextarea({ value, onChange, onSubmit }) {
  return (
    <textarea
      autoFocus
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder="Ex: Desenvolvi uma app mobile em Flutter para ajudar estudantes do secundário a gerir as suas tarefas e receber lembretes personalizados."
      rows={5}
      style={{
        width: '100%', boxSizing: 'border-box',
        background: 'var(--color-surface)',
        border: '1.5px solid var(--color-border)',
        borderRadius: 14, color: 'var(--color-text)',
        fontSize: 15, padding: '16px 18px',
        outline: 'none', fontFamily: 'inherit',
        resize: 'none', lineHeight: 1.65,
        transition: 'border-color 0.2s, box-shadow 0.2s',
      }}
      onFocus={e => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--color-primary-subtle)' }}
      onBlur={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.boxShadow = 'none' }}
      onKeyDown={e => { if (e.key === 'Enter' && e.metaKey && value.trim()) { e.preventDefault(); onSubmit() } }}
    />
  )
}

function TypeChip({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '6px 14px', borderRadius: 20,
        border: `1.5px solid ${active ? 'var(--color-primary)' : 'var(--color-border)'}`,
        background: active ? 'var(--color-primary-subtle)' : 'transparent',
        color: active ? 'var(--color-primary)' : 'var(--color-text-secondary)',
        fontSize: 13, fontWeight: active ? 700 : 500,
        cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
      }}
    >{label}</button>
  )
}

function ReviewField({ field, value, isEditing, editValue, onEdit, onEditValueChange, onCommit }) {
  const ref = useRef(null)

  useEffect(() => {
    if (isEditing && ref.current) {
      ref.current.focus()
      const len = ref.current.value?.length ?? 0
      if (ref.current.setSelectionRange) ref.current.setSelectionRange(len, len)
    }
  }, [isEditing])

  return (
    <div
      onClick={() => { if (!isEditing) onEdit() }}
      style={{
        padding: '16px 18px',
        background: 'var(--color-surface)',
        border: `1.5px solid ${isEditing ? 'var(--color-primary)' : 'var(--color-border)'}`,
        borderRadius: 12,
        cursor: isEditing ? 'default' : 'pointer',
        transition: 'border-color 0.15s',
        boxShadow: isEditing ? '0 0 0 3px var(--color-primary-subtle)' : 'none',
      }}
      onMouseEnter={e => { if (!isEditing) e.currentTarget.style.borderColor = 'var(--color-primary)' }}
      onMouseLeave={e => { if (!isEditing) e.currentTarget.style.borderColor = 'var(--color-border)' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, color: 'var(--color-text-tertiary)' }}>
          {field.label}
          {field.required && <span style={{ color: 'var(--color-error)', marginLeft: 3 }}>*</span>}
        </span>
        {isEditing ? (
          <button
            type="button"
            onClick={e => { e.stopPropagation(); onCommit() }}
            style={{ background: 'var(--color-primary)', border: 'none', borderRadius: 6, padding: '4px 10px', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <Check size={11} /> Guardar
          </button>
        ) : (
          <Pencil size={12} color="var(--color-text-tertiary)" style={{ flexShrink: 0 }} />
        )}
      </div>
      {isEditing ? (
        field.multiline ? (
          <textarea
            ref={ref}
            value={editValue}
            onChange={e => onEditValueChange(e.target.value)}
            onKeyDown={e => { if (e.key === 'Escape') onCommit() }}
            rows={4}
            style={{ width: '100%', boxSizing: 'border-box', background: 'transparent', border: 'none', outline: 'none', color: 'var(--color-text)', fontSize: 14, fontFamily: 'inherit', lineHeight: 1.65, resize: 'vertical', padding: 0 }}
          />
        ) : (
          <input
            ref={ref}
            type="text"
            value={editValue}
            onChange={e => onEditValueChange(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); onCommit() } }}
            style={{ width: '100%', boxSizing: 'border-box', background: 'transparent', border: 'none', outline: 'none', color: 'var(--color-text)', fontSize: 14, fontFamily: 'inherit', padding: 0 }}
          />
        )
      ) : (
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.65, color: value ? 'var(--color-text)' : 'var(--color-text-tertiary)', whiteSpace: 'pre-wrap' }}>
          {value || 'Clica para adicionar…'}
        </p>
      )}
    </div>
  )
}

function InterviewPanel({ data, onComplete, onBack }) {
  const [currentQ, setCurrentQ] = useState(0)
  const [currentAnswer, setCurrentAnswer] = useState('')
  const [answers, setAnswers] = useState({})

  function advance(val = currentAnswer.trim()) {
    const q = data.questions[currentQ]
    const next = { ...answers, [q.field]: val }
    setAnswers(next)
    setCurrentAnswer('')
    if (currentQ + 1 >= data.questions.length) {
      onComplete(next)
    } else {
      setCurrentQ(i => i + 1)
    }
  }

  const q = data.questions[currentQ]
  const total = data.questions.length
  const pct = Math.round(((currentQ + 1) / total) * 100)
  const isLast = currentQ + 1 >= total

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {currentQ === 0 && data.understanding && (
        <div style={{ padding: '12px 14px', background: 'var(--color-primary-subtle)', border: '1px solid rgba(27,120,247,0.18)', borderLeft: '3px solid var(--color-primary)', borderRadius: 10, fontSize: 13, lineHeight: 1.65, color: 'var(--color-text)' }}>
          {data.understanding}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-tertiary)', letterSpacing: 0.5, whiteSpace: 'nowrap' }}>
          {currentQ + 1}/{total}
        </span>
        <div style={{ flex: 1, height: 3, background: 'var(--color-border)', borderRadius: 2 }}>
          <div style={{ height: '100%', width: `${pct}%`, background: 'var(--color-primary)', borderRadius: 2, transition: 'width 0.35s cubic-bezier(0.4,0,0.2,1)' }} />
        </div>
      </div>

      <div>
        <p style={{ margin: '0 0 10px', fontSize: 15, fontWeight: 600, color: 'var(--color-text)', lineHeight: 1.5 }}>{q.question}</p>
        {q.suggestions?.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
            {q.suggestions.map((s, i) => (
              <button key={i} type="button"
                onClick={() => setCurrentAnswer(a => a ? `${a}, ${s}` : s)}
                style={{ padding: '4px 10px', borderRadius: 20, border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-secondary)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}
              >{s}</button>
            ))}
          </div>
        )}
        <textarea
          autoFocus
          value={currentAnswer}
          onChange={e => setCurrentAnswer(e.target.value)}
          placeholder={q.placeholder || ''}
          rows={3}
          style={{ width: '100%', boxSizing: 'border-box', background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', borderRadius: 10, color: 'var(--color-text)', fontSize: 14, padding: '12px 14px', outline: 'none', fontFamily: 'inherit', resize: 'vertical', lineHeight: 1.6, transition: 'border-color 0.15s' }}
          onFocus={e => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--color-primary-subtle)' }}
          onBlur={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.boxShadow = 'none' }}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && currentAnswer.trim()) { e.preventDefault(); advance() } }}
        />
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" onClick={() => advance()} disabled={!currentAnswer.trim()}
          style={btnStyle(!!currentAnswer.trim())}
        >
          {isLast ? <><Sparkles size={14} /> Concluir</> : <>Próxima <ChevronRight size={14} /></>}
        </button>
        <button type="button" onClick={() => advance('')}
          style={{ padding: '11px 16px', background: 'transparent', border: '1px solid var(--color-border)', borderRadius: 10, color: 'var(--color-text-tertiary)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}
        >Saltar</button>
      </div>

      <button type="button" onClick={onBack}
        style={{ background: 'none', border: 'none', color: 'var(--color-text-tertiary)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', padding: '4px 0', textAlign: 'left' }}
      >← Voltar</button>
    </div>
  )
}

/* ── Styles ──────────────────────────────────────────────────────────────── */

const S = {
  center: {
    flex: 1, display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    padding: '40px 20px',
  },
  describeWrap: { width: '100%', maxWidth: 560 },
  reviewWrap: { width: '100%', maxWidth: 560 },
  eyebrowRow: { display: 'flex', alignItems: 'center', gap: 7, marginBottom: 24 },
  eyebrow: { fontSize: 12, fontWeight: 700, color: 'var(--color-primary)', letterSpacing: 0.8, textTransform: 'uppercase' },
  headline: { fontSize: 'clamp(26px, 5vw, 36px)', fontWeight: 400, fontFamily: 'var(--font-heading)', margin: '0 0 10px', letterSpacing: '-0.5px', lineHeight: 1.25 },
  sub: { color: 'var(--color-text-secondary)', fontSize: 15, margin: '0 0 24px', lineHeight: 1.6 },
  typeRow: { display: 'flex', gap: 6, flexWrap: 'wrap', margin: '14px 0 28px' },
  err: { color: 'var(--color-error)', fontSize: 13, margin: '0 0 14px' },
  loadingCenter: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18 },
  spinner: { width: 44, height: 44, border: '3px solid var(--color-border)', borderTop: '3px solid var(--color-primary)', borderRadius: '50%', animation: 'np-spin 1s linear infinite' },
  loadingTitle: { fontSize: 17, fontWeight: 600, margin: 0, color: 'var(--color-text)' },
  loadingSub: { fontSize: 13, color: 'var(--color-text-secondary)', margin: 0 },
  reviewHead: { fontSize: 22, fontWeight: 400, fontFamily: 'var(--font-heading)', margin: '0 0 6px', letterSpacing: '-0.3px' },
  reviewSub: { color: 'var(--color-text-secondary)', fontSize: 14, margin: 0, lineHeight: 1.6 },
}

function btnStyle(active) {
  return {
    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    background: active ? 'var(--color-primary)' : 'var(--color-border)',
    color: '#fff', border: 'none', borderRadius: 12, padding: '14px 0',
    fontSize: 15, fontWeight: 700,
    cursor: active ? 'pointer' : 'not-allowed',
    fontFamily: 'inherit', transition: 'background 0.2s, box-shadow 0.2s',
    boxShadow: active ? '0 2px 12px rgba(27,120,247,0.25)' : 'none',
    marginBottom: 0,
  }
}

function secondaryBtnStyle(active) {
  return {
    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    background: 'transparent', border: 'none',
    color: active ? 'var(--color-text-secondary)' : 'var(--color-text-tertiary)',
    fontSize: 13, cursor: active ? 'pointer' : 'not-allowed',
    fontFamily: 'inherit', padding: '10px 0', marginTop: 4,
  }
}
