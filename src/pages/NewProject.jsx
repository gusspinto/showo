import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { saveProject } from '../lib/saveProject'
import { StarsIcon as Sparkles } from '@solar-icons/react/bold/stars'
import { ArrowRightIcon as ArrowRight } from '@solar-icons/react/bold/arrow-right'
import { ArrowLeftIcon as ArrowLeft } from '@solar-icons/react/bold/arrow-left'
import { Pen2Icon as Pencil } from '@solar-icons/react/bold/pen-2'
import { CheckCircleIcon as Check } from '@solar-icons/react/bold/check-circle'
import { AltArrowRightIcon as ChevronRight } from '@solar-icons/react/bold/alt-arrow-right'
import { UploadIcon as Upload } from '@solar-icons/react/bold/upload'
import { DocumentTextIcon as FileText } from '@solar-icons/react/bold/document-text'
import { CloseIcon as X } from '@solar-icons/react/bold/close'
import { PenNewRoundIcon as PenLine } from '@solar-icons/react/bold/pen-new-round'
import { DangerTriangleIcon as AlertTriangle } from '@solar-icons/react/bold/danger-triangle'
import { Navbar } from '../components/Navbar'
import { useAuth } from '../context/AuthContext'
import { Toast, useToast } from '../components/Toast'
import { PlanGateModal, AiUsageBadge } from '../components/PlanGate'
import './NewProject.css'

const PROJECT_TYPES = [
  { id: 'school',   label: 'Projeto de escola' },
  { id: 'pap',      label: 'PAP' },
  { id: 'personal', label: 'Projeto pessoal' },
]

const REVIEW_FIELDS = [
  { key: 'name',            label: 'Nome do projeto',      multiline: false, required: true,  minLen: 3  },
  { key: 'area',            label: 'Área',                 multiline: false, required: true,  minLen: 3  },
  { key: 'goal',            label: 'Objetivo',             multiline: true,  required: true,  minLen: 30 },
  { key: 'problem',         label: 'Problema que resolve', multiline: true,  required: true,  minLen: 40 },
  { key: 'solution',        label: 'Como resolve',         multiline: true,  required: true,  minLen: 40 },
  { key: 'features',        label: 'Funcionalidades',      multiline: true,  required: false, minLen: 20 },
  { key: 'target_audience', label: 'Público-alvo',         multiline: true,  required: false, minLen: 20 },
  { key: 'technologies',    label: 'Tecnologias',          multiline: false, required: false, minLen: 5, skippable: true },
]

/* Aceitamos o que um aluno português tem mesmo na mão. O .doc/.ppt antigos
   ficam de fora de propósito: são formatos binários que não conseguimos ler
   de forma fiável, e é melhor dizê-lo à entrada do que falhar na análise. */
const ACCEPT = '.pdf,.docx,.pptx,.txt,.md,image/png,image/jpeg,image/webp'
const MAX_FILES = 5
const MAX_TOTAL_MB = 12

const ANALYSIS_BEATS = [
  'A abrir o teu trabalho…',
  'A identificar as secções…',
  'A recolher objetivos e resultados…',
  'A preparar a ficha do projeto…',
]

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '')
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function prettySize(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function NewProject() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { user, checkGate, consumeAI } = useAuth()
  const { toast, show: showToast } = useToast()

  /* Passos: choose → describe | import → loading → found → review → submitting */
  const [step, setStep] = useState(() => (searchParams.get('import') === '1' ? 'import' : 'choose'))

  /* As edge functions de IA exigem sessão. Sem conta, o fluxo dava erro
     genérico já dentro do passo de análise — depois de o aluno escrever a
     descrição ou escolher os ficheiros. Pedimos a conta à entrada e
     devolvemo-lo exatamente a este passo. */
  const authNext = path => `/register?next=${encodeURIComponent(path)}`
  const requireAccount = path => { if (!user) { navigate(authNext(path)); return true } return false }
  const [description, setDescription] = useState('')
  const [projectType, setProjectType] = useState('school')
  const [form, setForm] = useState({})
  const [editingField, setEditingField] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [skippedFields, setSkippedFields] = useState(new Set())
  const [error, setError] = useState(null)
  const [interviewData, setInterviewData] = useState(null)
  const [gateMsg, setGateMsg] = useState(null)

  /* Importação */
  const [files, setFiles] = useState([])
  const [importNotes, setImportNotes] = useState('')
  const [found, setFound] = useState(null)   // { summary, confidence, missing, read }
  const [beat, setBeat] = useState(0)

  function set(key, val) { setForm(p => ({ ...p, [key]: val })) }

  function toggleSkip(key) {
    setSkippedFields(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  useEffect(() => {
    const state = location.state?.prefill
    if (state?.fromWidget) {
      setForm(state.answers ?? {})
      setStep('review')
      window.history.replaceState({}, '')
    }
  }, []) // eslint-disable-line

  /* A análise demora — em vez de um spinner mudo, dizemos em que passo vamos.
     É a diferença entre "está pendurado" e "está a trabalhar comigo". */
  useEffect(() => {
    if (step !== 'loading') { setBeat(0); return }
    const id = setInterval(() => setBeat(b => Math.min(b + 1, ANALYSIS_BEATS.length - 1)), 2600)
    return () => clearInterval(id)
  }, [step])

  async function guardProjectCount() {
    if (!user?.id) return true
    const { count } = await supabase.from('projects').select('id', { count: 'exact', head: true }).eq('user_id', user.id)
    const maxGate = checkGate('maxProjects', count ?? 0)
    if (!maxGate.allowed) { setGateMsg(maxGate.message); return false }
    return true
  }

  /* ── Gerar a partir de uma descrição ── */
  async function handleGenerate() {
    if (!description.trim()) return
    if (requireAccount('/novo')) return
    if (!(await guardProjectCount())) return
    const aiGate = checkGate('createProject')
    if (!aiGate.allowed) { setGateMsg(aiGate.message); return }

    setStep('loading')
    setError(null)
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('prefill-project', {
        body: { text: description, projectType },
      })
      if (fnErr) throw new Error()
      consumeAI('createProject')
      setForm({ ...(data?.prefill ?? {}), project_type: projectType })
      setStep('review')
    } catch {
      setError('Não foi possível gerar. Tenta novamente.')
      setStep('describe')
    }
  }

  /* ── Entrevista guiada ── */
  async function handleInterview() {
    if (!description.trim()) return
    if (requireAccount('/novo')) return
    const gate = checkGate('interviewProject')
    if (!gate.allowed) { setGateMsg(gate.message); return }

    setStep('loading')
    setError(null)
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('interview-project', {
        body: { description, projectType },
      })
      if (fnErr || !data?.questions?.length) throw new Error()
      consumeAI('interviewProject')
      setInterviewData({ ...data, projectType })
      setStep('interview')
    } catch {
      setError('Não foi possível iniciar a entrevista. Tenta novamente.')
      setStep('describe')
    }
  }

  /* ── Importar de um trabalho existente ── */
  function addFiles(list) {
    setError(null)
    const incoming = Array.from(list || [])
    if (!incoming.length) return
    setFiles(prev => {
      const merged = [...prev]
      for (const f of incoming) {
        if (merged.length >= MAX_FILES) break
        if (merged.some(m => m.name === f.name && m.size === f.size)) continue
        merged.push(f)
      }
      const totalMb = merged.reduce((s, f) => s + f.size, 0) / (1024 * 1024)
      if (totalMb > MAX_TOTAL_MB) {
        setError(`No total, os ficheiros não podem passar de ${MAX_TOTAL_MB} MB.`)
        return prev
      }
      return merged
    })
  }

  async function handleImport() {
    if (!files.length) return
    // Também aqui: /novo?import=1 é um link partilhável e entra direto neste
    // passo, sem passar pelo ecrã de escolha.
    if (requireAccount('/novo?import=1')) return
    if (!(await guardProjectCount())) return
    const aiGate = checkGate('createProject')
    if (!aiGate.allowed) { setGateMsg(aiGate.message); return }

    setStep('loading')
    setError(null)
    try {
      const payload = await Promise.all(files.map(async f => ({
        name: f.name,
        type: f.type,
        data: await fileToBase64(f),
      })))
      const { data, error: fnErr } = await supabase.functions.invoke('import-project', {
        body: { files: payload, projectType, notes: importNotes },
      })
      if (fnErr || !data || data.error) throw new Error(data?.error || '')
      consumeAI('createProject')
      setForm({ ...(data.prefill ?? {}), project_type: projectType })
      setFound({
        summary: data.summary ?? '',
        confidence: data.confidence ?? {},
        missing: data.missing ?? [],
        read: data.read ?? [],
        skipped: data.skipped ?? [],
      })
      setStep('found')
    } catch (err) {
      setError(err?.message || 'Não conseguimos ler estes ficheiros. Exporta o trabalho como PDF e tenta outra vez.')
      setStep('import')
    }
  }

  /* ── Edição inline ── */
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

  /* ── Criar ── */
  async function handleSubmit() {
    setStep('submitting')
    setError(null)
    let aiResult = {}
    try {
      const { data } = await supabase.functions.invoke('generate-project', { body: { data: form } })
      if (data?.tagline) aiResult = data
    } catch { /* não é crítico */ }
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
    .every(f => (form[f.key] ?? '').trim().length >= (f.minLen ?? 1))

  const filledCount = REVIEW_FIELDS.filter(f => (form[f.key] ?? '').trim().length > 0).length

  /* ──────────────────────────────────────────────────────────────────────────
     PASSO: choose — a pergunta que faltava
     Antes, a única porta de entrada era "descreve o teu projeto". Quem já
     tinha o relatório feito lia isso como "escreve tudo outra vez" e fechava.
  ────────────────────────────────────────────────────────────────────────── */
  if (step === 'choose') {
    return (
      <NpShell>
        <Toast {...toast} />
        <Navbar showLinks={false} mobileLeft={<BackButton onClick={() => navigate(-1)} />} />
        <div className="np-center np-center--choose">
          <div className="np-wrap np-wrap--choose">
            <NpAnimatedTitle />

            <div className="np-tiles">
              <button className="np-tile is-blue" onClick={() => { if (!requireAccount('/novo?import=1')) setStep('import') }}>
                <span className="np-tile-icon"><Upload size={22} /></span>
                <span className="np-tile-time">~1 min</span>
                <span className="np-tile-title">Já tenho o trabalho feito</span>
                <span className="np-tile-desc">Envia o relatório ou as imagens — lemos e preenchemos por ti.</span>
                <span className="np-tile-meta">PDF · Word · PowerPoint · Imagens</span>
                <span className="np-tile-go"><ChevronRight size={16} /></span>
              </button>

              <button className="np-tile is-red" onClick={() => { if (!requireAccount('/novo')) setStep('describe') }}>
                <span className="np-tile-icon"><PenLine size={22} /></span>
                <span className="np-tile-time">~30 seg</span>
                <span className="np-tile-title">Descrever em duas frases</span>
                <span className="np-tile-desc">Conta o que fizeste — a IA trata do resto.</span>
                <span className="np-tile-go"><ChevronRight size={16} /></span>
              </button>
            </div>
          </div>
        </div>
      </NpShell>
    )
  }

  /* ──────────────────────────────────────────────────────────────────────────
     PASSO: import
  ────────────────────────────────────────────────────────────────────────── */
  if (step === 'import') {
    const totalBytes = files.reduce((s, f) => s + f.size, 0)
    return (
      <NpShell>
        {gateMsg && <PlanGateModal message={gateMsg} onClose={() => setGateMsg(null)} />}
        <Toast {...toast} />
        <Navbar showLinks={false} mobileLeft={<BackButton onClick={() => setStep('choose')} />} />
        <div className="np-center">
          <div className="np-wrap">
            <StepBar current={2} total={3} label="O teu trabalho" />
            <h1 className="np-headline">Envia o que já fizeste.</h1>
            <p className="np-sub">
              O relatório da PAP, a apresentação, fotos do protótipo. Lemos tudo e mostramos-te o que encontrámos antes de criar seja o que for.
            </p>

            <FilePicker files={files} onAdd={addFiles} onRemove={i => setFiles(f => f.filter((_, k) => k !== i))} />

            {files.length > 0 && (
              <>
                <div className="np-filemeta">
                  {files.length} {files.length === 1 ? 'ficheiro' : 'ficheiros'} · {prettySize(totalBytes)}
                </div>
                <label className="np-notes-label" htmlFor="np-notes">Queres acrescentar alguma coisa? (opcional)</label>
                <textarea
                  id="np-notes"
                  className="np-notes"
                  rows={2}
                  value={importNotes}
                  onChange={e => setImportNotes(e.target.value)}
                  placeholder="Ex: o relatório está incompleto, os resultados estão só nos slides."
                />
              </>
            )}

            <TypeRow value={projectType} onChange={setProjectType} />

            {error && <p className="np-err"><AlertTriangle size={13} /> {error}</p>}

            <button className="np-btn-primary" onClick={handleImport} disabled={!files.length}>
              <Sparkles size={15} /> Analisar o meu trabalho <ArrowRight size={15} />
            </button>
            <button className="np-btn-quiet" onClick={() => setStep('describe')}>
              Prefiro escrever de raiz
            </button>
            <AiUsageBadge feature="createProject" style={{ marginTop: 8 }} />
          </div>
        </div>
      </NpShell>
    )
  }

  /* ──────────────────────────────────────────────────────────────────────────
     PASSO: describe
  ────────────────────────────────────────────────────────────────────────── */
  if (step === 'describe') {
    return (
      <NpShell>
        {gateMsg && <PlanGateModal message={gateMsg} onClose={() => setGateMsg(null)} />}
        <Toast {...toast} />
        <Navbar showLinks={false} mobileLeft={<BackButton onClick={() => setStep('choose')} />} />
        <div className="np-center">
          <div className="np-wrap">
            <StepBar current={2} total={3} label="O teu projeto" />
            <h1 className="np-headline">Conta-nos sobre o teu projeto.</h1>
            <p className="np-sub">Descreve em 2–3 frases. A IA estrutura o conteúdo; tu revês e ajustas.</p>

            <DescribeTextarea value={description} onChange={setDescription} onSubmit={handleGenerate} />

            <TypeRow value={projectType} onChange={setProjectType} />

            {error && <p className="np-err"><AlertTriangle size={13} /> {error}</p>}

            <button className="np-btn-primary" onClick={handleGenerate} disabled={!description.trim()}>
              <Sparkles size={15} /> Criar com IA <ArrowRight size={15} />
            </button>
            <button className="np-btn-quiet" onClick={handleInterview} disabled={!description.trim()}>
              <ChevronRight size={14} /> Prefiro responder a perguntas
            </button>
            <AiUsageBadge feature="createProject" style={{ marginTop: 8 }} />
          </div>
        </div>
      </NpShell>
    )
  }

  /* ──────────────────────────────────────────────────────────────────────────
     PASSO: loading / submitting
  ────────────────────────────────────────────────────────────────────────── */
  if (step === 'loading' || step === 'submitting') {
    const title = step === 'submitting'
      ? 'A guardar o teu projeto…'
      : found === null && files.length ? ANALYSIS_BEATS[beat] : 'A estruturar o teu projeto…'
    return (
      <NpShell>
        <div className="np-loading">
          <style>{`@keyframes np-sh{0%{background-position:-400px 0}100%{background-position:400px 0}} @keyframes np-in{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}`}</style>
          <p className="np-loading-title">{title}</p>
          <p className="np-loading-sub">
            {step === 'submitting' ? 'Quase pronto.' : 'Não feches esta página.'}
          </p>
          <div className="np-loading-lines">
            {[['55%', 100], ['80%', 60], ['70%', 80], ['45%', 90]].map(([w, delay], i) => (
              <div key={i} className="np-loading-line" style={{ height: i === 0 ? 12 : 9, width: w, animation: `np-sh 1.5s ease-in-out infinite ${delay}ms, np-in 0.3s ease-out ${i * 80}ms both` }} />
            ))}
          </div>
        </div>
      </NpShell>
    )
  }

  /* ──────────────────────────────────────────────────────────────────────────
     PASSO: found — o que a IA encontrou, antes de tocar em nada
  ────────────────────────────────────────────────────────────────────────── */
  if (step === 'found' && found) {
    return (
      <NpShell>
        <Toast {...toast} />
        <Navbar showLinks={false} mobileLeft={<BackButton onClick={() => setStep('import')} />} />
        <div className="np-center">
          <div className="np-wrap">
            <StepBar current={3} total={3} label="O que encontrámos" />
            <h1 className="np-headline">Encontrámos isto no teu trabalho.</h1>
            {found.summary && <p className="np-sub">{found.summary}</p>}

            <div className="np-found-list">
              {REVIEW_FIELDS.map(f => {
                const value = (form[f.key] ?? '').trim()
                const conf = found.confidence?.[f.key]
                return (
                  <div key={f.key} className={`np-found-row${value ? '' : ' is-empty'}`}>
                    <span className="np-found-check">
                      {value ? <Check size={13} /> : <span className="np-found-dot" />}
                    </span>
                    <span className="np-found-body">
                      <span className="np-found-label">
                        {f.label}
                        {value && conf === 'media' && <span className="np-found-tag">a confirmar</span>}
                      </span>
                      <span className="np-found-value">
                        {value || 'Não estava no ficheiro. Preenches a seguir.'}
                      </span>
                    </span>
                  </div>
                )
              })}
            </div>

            {found.skipped?.length > 0 && (
              <p className="np-found-note">
                Não conseguimos ler: {found.skipped.map(s => s.name).join(', ')}.
              </p>
            )}

            <button className="np-btn-primary" onClick={() => setStep('review')}>
              Rever e ajustar <ArrowRight size={15} />
            </button>
            <button className="np-btn-quiet" onClick={() => { setFound(null); setStep('import') }}>
              Enviar outro ficheiro
            </button>
          </div>
        </div>
      </NpShell>
    )
  }

  /* ──────────────────────────────────────────────────────────────────────────
     PASSO: interview
  ────────────────────────────────────────────────────────────────────────── */
  if (step === 'interview' && interviewData) {
    return (
      <NpShell>
        <Toast {...toast} />
        <Navbar showLinks={false} mobileLeft={<BackButton onClick={() => setStep('describe')} />} />
        <div className="np-center">
          <div className="np-wrap">
            <StepBar current={2} total={3} label="Perguntas" />
            <h2 className="np-headline np-headline--sm">Vamos construir o teu projeto juntos.</h2>
            <p className="np-sub">Responde a cada pergunta. A IA usa as tuas respostas para criar o projeto.</p>
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
     PASSO: review
  ────────────────────────────────────────────────────────────────────────── */
  return (
    <NpShell>
      <Toast {...toast} />
      <Navbar showLinks={false} mobileLeft={<BackButton onClick={() => setStep(found ? 'found' : 'describe')} />} />
      <div className="np-center np-center--review">
        <div className="np-wrap np-wrap--review">
          <StepBar current={3} total={3} label="Rever" />
          <h2 className="np-headline np-headline--sm">Parece bem?</h2>
          <p className="np-sub">
            {filledCount} de {REVIEW_FIELDS.length} campos preenchidos. Toca em qualquer um para editar antes de criar.
          </p>

          <div className="np-fields">
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
                isSkipped={skippedFields.has(field.key)}
                onToggleSkip={() => toggleSkip(field.key)}
              />
            ))}
          </div>

          {error && <p className="np-err"><AlertTriangle size={13} /> {error}</p>}
        </div>
      </div>

      {/* Ação principal fixa ao fundo: numa lista longa de campos, o botão de
          criar não pode estar a 3 scrolls de distância no telemóvel. */}
      <div className="np-sticky-action">
        <button className="np-btn-primary" onClick={handleSubmit} disabled={!canSubmit}>
          Criar projeto <ArrowRight size={15} />
        </button>
        {!canSubmit && (
          <span className="np-sticky-hint">Faltam campos obrigatórios (marcados com *)</span>
        )}
      </div>
    </NpShell>
  )
}

/* ── Sub-componentes ─────────────────────────────────────────────────────── */

function NpShell({ children }) {
  return <div className="np-shell">{children}</div>
}

/* Título animado do ecrã "como queres começar" — igual em espírito às
   frases do login/register (letras a subir, staggered), mas aqui só
   duas palavras trocam, nunca ao mesmo tempo: "Cria" ⇄ "Adiciona"
   primeiro, volta a "Cria", só depois "projeto" ⇄ "trabalho". A
   palavra alternativa fica a gradiente (as três cores do ícone da
   Showo); "o teu" nunca muda. */
const NP_TITLE_FRAMES = [
  { word1: 'Cria',     alt1: false, word3: 'projeto',  alt3: false, hold: 2400 },
  { word1: 'Adiciona', alt1: true,  word3: 'projeto',  alt3: false, hold: 2600 },
  { word1: 'Cria',     alt1: false, word3: 'projeto',  alt3: false, hold: 1300 },
  { word1: 'Cria',     alt1: false, word3: 'trabalho', alt3: true,  hold: 2600 },
  { word1: 'Cria',     alt1: false, word3: 'projeto',  alt3: false, hold: 1300 },
]

// Gradiente aplicado LETRA A LETRA (não na palavra toda) — cada letra é o
// elemento que tem o texto diretamente lá dentro, por isso o
// background-clip:text recorta-o sem problemas. backgroundSize maior que
// a própria letra + backgroundPosition a andar com o índice faz cada
// letra mostrar uma fatia diferente do mesmo gradiente, como se corresse
// a fluir ao longo da palavra toda.
function gradientLetterStyle(i, n) {
  return {
    backgroundImage: 'linear-gradient(90deg, #2478f0, #db4a3d 50%, #cc9a1e)',
    backgroundSize: `${Math.max(n, 1) * 100}% 100%`,
    backgroundPosition: `${n > 1 ? (i / (n - 1)) * 100 : 0}% 50%`,
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    color: 'transparent',
  }
}

function NpTitleWord({ text, gradient, animate }) {
  const letters = text.split('')
  const n = letters.length

  // Na primeiríssima pintura da página não há "troca" nenhuma a assinalar
  // — texto simples, visível de imediato, sem subir. A partir da primeira
  // troca real (key={text} força o remount) é que entra com o mesmo efeito
  // de letras a subir, staggered, seja a palavra branca ou a gradiente.
  return (
    <span key={animate ? text : undefined} className="np-title-word">
      {letters.map((ch, i) => (
        <span
          key={i}
          className={`np-title-letter${animate ? ' is-rising' : ''}`}
          style={{
            animationDelay: animate ? `${i * 0.03}s` : undefined,
            ...(gradient ? gradientLetterStyle(i, n) : null),
          }}
        >{ch}</span>
      ))}
    </span>
  )
}

function NpAnimatedTitle() {
  const [frame, setFrame] = useState(0)
  const animate = useRef(false)
  const reducedMotion = useRef(typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)

  useEffect(() => {
    if (reducedMotion.current) return
    const t = setTimeout(() => {
      animate.current = true
      setFrame(f => (f + 1) % NP_TITLE_FRAMES.length)
    }, NP_TITLE_FRAMES[frame].hold)
    return () => clearTimeout(t)
  }, [frame])

  const f = NP_TITLE_FRAMES[reducedMotion.current ? 0 : frame]
  return (
    <h1 className="np-headline np-headline-anim">
      <NpTitleWord text={f.word1} gradient={f.alt1} animate={animate.current} />{' o teu '}<NpTitleWord text={f.word3} gradient={f.alt3} animate={animate.current} />
    </h1>
  )
}

function BackButton({ onClick }) {
  return (
    <button className="np-back" onClick={onClick} aria-label="Voltar">
      <ArrowLeft size={19} />
    </button>
  )
}

function StepBar({ current, total, label }) {
  return (
    <div className="np-stepbar">
      <div className="np-stepbar-dots">
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className={`np-stepdot${i < current ? ' is-done' : ''}`} />
        ))}
      </div>
      <span className="np-stepbar-label">{label}</span>
    </div>
  )
}

function TypeRow({ value, onChange }) {
  return (
    <div className="np-types">
      {PROJECT_TYPES.map(t => (
        <button
          key={t.id}
          type="button"
          className={`np-type${value === t.id ? ' is-active' : ''}`}
          onClick={() => onChange(t.id)}
        >{t.label}</button>
      ))}
    </div>
  )
}

function FilePicker({ files, onAdd, onRemove }) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)

  return (
    <div>
      <div
        className={`np-drop${dragging ? ' is-dragging' : ''}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); onAdd(e.dataTransfer.files) }}
        role="button"
        tabIndex={0}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click() }}
      >
        <span className="np-drop-icon"><Upload size={22} /></span>
        <span className="np-drop-title">Escolher ficheiros</span>
        <span className="np-drop-sub">PDF, Word, PowerPoint ou imagens · até {MAX_FILES} ficheiros</span>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT}
          hidden
          onChange={e => { onAdd(e.target.files); e.target.value = '' }}
        />
      </div>

      {files.length > 0 && (
        <ul className="np-files">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`} className="np-file">
              <FileText size={15} className="np-file-icon" />
              <span className="np-file-name">{f.name}</span>
              <span className="np-file-size">{prettySize(f.size)}</span>
              <button className="np-file-remove" onClick={() => onRemove(i)} aria-label={`Remover ${f.name}`}>
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function DescribeTextarea({ value, onChange, onSubmit }) {
  return (
    <textarea
      autoFocus
      className="np-describe"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder="Ex: Desenvolvi uma app mobile em Flutter para ajudar estudantes do secundário a gerir as suas tarefas e receber lembretes personalizados."
      rows={5}
      onKeyDown={e => { if (e.key === 'Enter' && e.metaKey && value.trim()) { e.preventDefault(); onSubmit() } }}
    />
  )
}

function ReviewField({ field, value, isEditing, editValue, onEdit, onEditValueChange, onCommit, isSkipped, onToggleSkip }) {
  const ref = useRef(null)

  useEffect(() => {
    if (isEditing && ref.current) {
      ref.current.focus()
      const len = ref.current.value?.length ?? 0
      if (ref.current.setSelectionRange) ref.current.setSelectionRange(len, len)
    }
  }, [isEditing])

  function handleContainerClick() {
    if (isEditing) return
    if (isSkipped) { onToggleSkip(); onEdit() }
    else onEdit()
  }

  return (
    <div className={`np-field${isEditing ? ' is-editing' : ''}`} onClick={handleContainerClick}>
      <div className="np-field-head">
        <span className="np-field-label">
          {field.label}
          {field.required && <span className="np-field-req">*</span>}
        </span>
        {!isEditing && !isSkipped && <Pencil size={12} className="np-field-pencil" />}
      </div>

      {isEditing ? (
        <>
          {field.multiline ? (
            <textarea
              ref={ref}
              className="np-field-input"
              value={editValue}
              onChange={e => onEditValueChange(e.target.value)}
              onKeyDown={e => { if (e.key === 'Escape') onCommit() }}
              onBlur={onCommit}
              rows={4}
            />
          ) : (
            <input
              ref={ref}
              type="text"
              className="np-field-input"
              value={editValue}
              onChange={e => onEditValueChange(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); onCommit() } }}
              onBlur={onCommit}
            />
          )}
          {field.minLen && editValue.trim().length < field.minLen && (
            <p className="np-field-hint">Mínimo {field.minLen} caracteres · {editValue.trim().length}/{field.minLen}</p>
          )}
          {field.skippable && (
            <button
              type="button"
              className="np-field-skip"
              onMouseDown={e => e.preventDefault()}
              onClick={e => { e.stopPropagation(); onCommit(); onToggleSkip() }}
            >
              Não se aplica
            </button>
          )}
        </>
      ) : isSkipped ? (
        <p className="np-field-value is-skipped">Não se aplica · <span>alterar</span></p>
      ) : (
        <p className={`np-field-value${value ? '' : ' is-placeholder'}`}>
          {value || 'Toca para adicionar…'}
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
    if (currentQ + 1 >= data.questions.length) onComplete(next)
    else setCurrentQ(i => i + 1)
  }

  const q = data.questions[currentQ]
  const total = data.questions.length
  const pct = Math.round(((currentQ + 1) / total) * 100)
  const isLast = currentQ + 1 >= total

  return (
    <div className="np-interview">
      {currentQ === 0 && data.understanding && (
        <div className="np-interview-intro">{data.understanding}</div>
      )}

      <div className="np-interview-progress">
        <span className="np-interview-count">{currentQ + 1}/{total}</span>
        <div className="np-interview-track">
          <div className="np-interview-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div>
        <p className="np-interview-q">{q.question}</p>
        {q.suggestions?.length > 0 && (
          <div className="np-interview-chips">
            {q.suggestions.map((s, i) => (
              <button key={i} type="button" className="np-interview-chip"
                onClick={() => setCurrentAnswer(a => a ? `${a}, ${s}` : s)}>{s}</button>
            ))}
          </div>
        )}
        <textarea
          autoFocus
          className="np-interview-input"
          value={currentAnswer}
          onChange={e => setCurrentAnswer(e.target.value)}
          placeholder={q.placeholder || ''}
          rows={3}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && currentAnswer.trim()) { e.preventDefault(); advance() } }}
        />
      </div>

      <div className="np-interview-actions">
        <button type="button" className="np-btn-primary" onClick={() => advance()} disabled={!currentAnswer.trim()}>
          {isLast ? <><Sparkles size={14} /> Concluir</> : <>Próxima <ChevronRight size={14} /></>}
        </button>
        <button type="button" className="np-interview-skip" onClick={() => advance('')}>Saltar</button>
      </div>

      <button type="button" className="np-btn-quiet" onClick={onBack}>← Voltar</button>
    </div>
  )
}
