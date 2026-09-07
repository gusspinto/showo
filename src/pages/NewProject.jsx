import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { saveProject } from '../lib/saveProject'
import { officeFileToPdfBlob, isOfficeFile } from '../lib/officeToPdf'
import { StarsIcon as Sparkles } from '@solar-icons/react/bold/stars'
import { ArrowRightIcon as ArrowRight } from '@solar-icons/react/bold/arrow-right'
import { ArrowLeftIcon as ArrowLeft } from '@solar-icons/react/bold/arrow-left'
import { Pen2Icon as Pencil } from '@solar-icons/react/bold/pen-2'
import { UploadIcon as Upload } from '@solar-icons/react/bold/upload'
import { DocumentTextIcon as FileText } from '@solar-icons/react/bold/document-text'
import { CloseIcon as X } from '@solar-icons/react/bold/close'
import { DangerTriangleIcon as AlertTriangle } from '@solar-icons/react/bold/danger-triangle'
import { PlusIcon } from '../components/icons/PlusIcon'
import { Navbar } from '../components/Navbar'
import { useAuth } from '../context/AuthContext'
import { Toast, useToast } from '../components/Toast'
import { PlanGateModal, AiUsageBadge } from '../components/PlanGate'
import './NewProject.css'

/* "Pessoal" vem primeiro e sozinho — é o caminho de quem usa a conta
   individual, sem ligação nenhuma a escola. "De escola"/PAP continuam
   cá (há quem os use mesmo numa conta pessoal), mas agrupados à parte,
   como o conjunto secundário — ainda não temos escolas a usar a app
   para justificar um modo à parte a sério; isto é só o primeiro passo
   dessa separação. */
const PROJECT_TYPES = [
  { id: 'personal', label: 'Projeto pessoal' },
  { id: 'school',   label: 'Projeto de escola', group: 'school' },
  { id: 'pap',      label: 'PAP', group: 'school' },
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
/* Dá para adicionar vários de uma vez — cada ficheiro vira o seu próprio
   item na Biblioteca (não um só projeto com vários anexos). */
const MAX_FILES = 5
const MAX_TOTAL_MB = 12

/* Usado tanto por "Criar com IA" como por "Responder a perguntas guiadas"
   — nenhum dos dois lê um ficheiro (isso só acontece em "Adicionar", que
   nem passa por este ecrã), por isso a linguagem tem de servir só texto. */
const ANALYSIS_BEATS = [
  'A ler a tua ideia…',
  'A perceber o essencial…',
  'A preparar o próximo passo…',
]

function prettySize(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/* Nomes de ficheiro reais têm acentos, parênteses, espaços — tudo o que
   dá dor de cabeça num caminho de storage. O nome original fica sempre
   guardado (library_file_name), isto é só para o caminho em si. */
function safePathSegment(name) {
  const dot = name.lastIndexOf('.')
  const base = dot > 0 ? name.slice(0, dot) : name
  const ext = dot > 0 ? name.slice(dot) : ''
  const cleanBase = base
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // tira acentos
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/-+/g, '-').replace(/(^-|-$)/g, '')
  return `${cleanBase || 'ficheiro'}${ext.replace(/[^a-zA-Z0-9.]/g, '')}`
}

/* Preview real da 1ª página, tipo Drive — corre em segundo plano, depois
   do item já estar criado (por isso é função solta, não presa ao ciclo de
   vida do componente: continua mesmo depois de já se ter navegado para a
   Biblioteca). PDF renderiza-se direto no browser (pdfjs). Word/PowerPoint
   passam primeiro pelo conversor (Gotenberg, via edge function — o browser
   não sabe abrir esses formatos sozinho) que devolve um PDF; a partir daí
   é o mesmo caminho. Nunca é crítico: falha em silêncio, fica só o cartão
   colorido por tipo de ficheiro na Biblioteca. */
async function generateLibraryThumbnail(projectId, file) {
  const isOfficeDoc = file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    || file.type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  if (file.type !== 'application/pdf' && !isOfficeDoc) return

  try {
    const { renderPdfThumbnail } = await import('../lib/pdfThumbnail')
    const { data: { user } } = await supabase.auth.getUser()
    const baseName = safePathSegment(file.name).replace(/\.[^.]+$/, '')
    const patch = {}

    let pdfSource = file
    if (isOfficeDoc) {
      const b64 = await fileToBase64(file)
      const { data: convData, error: convErr } = await supabase.functions.invoke('office-thumbnail', {
        body: { name: file.name, type: file.type, data: b64 },
      })
      if (convErr || !convData?.pdf) throw convErr || new Error(convData?.error || 'conversão falhou')
      pdfSource = new Blob([b64ToBytes(convData.pdf)], { type: 'application/pdf' })

      // Guarda o PDF convertido — o visualizador (Biblioteca + perfil)
      // mostra sempre este, sem reconverter.
      const pdfPath = `${user.id}/pdf/${Date.now()}-${baseName}.pdf`
      const { error: pdfErr } = await supabase.storage.from('library-files').upload(pdfPath, pdfSource, { contentType: 'application/pdf' })
      if (!pdfErr) patch.library_pdf_url = pdfPath
    }

    const thumbBlob = await renderPdfThumbnail(pdfSource)
    const thumbPath = `${user.id}/thumbs/${Date.now()}-${baseName}.jpg`
    const { error: thumbErr } = await supabase.storage.from('library-files').upload(thumbPath, thumbBlob, { contentType: 'image/jpeg' })
    if (!thumbErr) patch.library_thumb_url = thumbPath

    if (Object.keys(patch).length) await supabase.from('projects').update(patch).eq('id', projectId)
  } catch (err) {
    console.error('Preview do ficheiro falhou (não crítico):', err)
  }
}

/* Só para mandar um .docx/.pptx à edge function office-thumbnail converter
   — não tem mais nenhum uso (o upload em si vai direto, sem passar por
   base64). */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '')
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
function b64ToBytes(b64) {
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

export default function NewProject() {
  const navigate = useNavigate()
  const { user, profile, checkGate, consumeAI } = useAuth()
  const { toast, show: showToast } = useToast()

  /* Passos: choose → describe | loading → review → submitting
     "choose" já traz a caixa de enviar ficheiros consigo — deixou de haver
     um ecrã "import" à parte, por isso ?import=1 (link partilhável antigo)
     também aterra aqui; é ignorado de propósito, não precisa de fazer nada. */
  const [step, setStep] = useState('choose')

  /* As edge functions de IA exigem sessão. Sem conta, o fluxo dava erro
     genérico já dentro do passo de análise — depois de o aluno escrever a
     descrição ou escolher os ficheiros. Pedimos a conta à entrada e
     devolvemo-lo exatamente a este passo. */
  const authNext = path => `/register?next=${encodeURIComponent(path)}`
  const requireAccount = path => { if (!user) { navigate(authNext(path)); return true } return false }
  const [description, setDescription] = useState('')
  const [projectType, setProjectType] = useState('personal')
  const [form, setForm] = useState({})
  const [editingField, setEditingField] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [skippedFields, setSkippedFields] = useState(new Set())
  const [error, setError] = useState(null)
  const [interviewData, setInterviewData] = useState(null)
  const [gateMsg, setGateMsg] = useState(null)

  /* Adicionar — enviar um trabalho já feito */
  const [files, setFiles] = useState([])
  const [importNotes, setImportNotes] = useState('')
  const [savingToLibrary, setSavingToLibrary] = useState(false)
  const [importSummary, setImportSummary] = useState(null)
  const [importMissing, setImportMissing] = useState([])
  const [beat, setBeat] = useState(0)

  /* Fase 2 — como aparece: página própria ou anexo de outro projeto */
  const [presentation, setPresentation] = useState('page')
  const [parentId, setParentId] = useState('')
  const [myProjects, setMyProjects] = useState([])

  useEffect(() => {
    if (!user?.id) return
    supabase.from('projects')
      .select('id, name')
      .eq('user_id', user.id)
      .eq('entry_kind', 'full')
      .is('parent_project_id', null)
      .order('created_at', { ascending: false })
      .then(({ data }) => setMyProjects(data ?? []))
  }, [user?.id])

  function set(key, val) { setForm(p => ({ ...p, [key]: val })) }

  function toggleSkip(key) {
    setSkippedFields(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  /* A análise demora — em vez de um spinner mudo, dizemos em que passo vamos.
     É a diferença entre "está pendurado" e "está a trabalhar comigo". */
  useEffect(() => {
    if (step !== 'loading') { setBeat(0); return }
    const id = setInterval(() => setBeat(b => Math.min(b + 1, ANALYSIS_BEATS.length - 1)), 2600)
    return () => clearInterval(id)
  }, [step])

  async function guardProjectCount() {
    if (!user?.id) return true
    // Só conta os 'full' (a ficha AI-estruturada) — é esse o recurso que
    // o limite do plano quer controlar. Itens da Biblioteca (upload sem
    // IA) não entram nesta conta.
    const { count } = await supabase.from('projects').select('id', { count: 'exact', head: true })
      .eq('user_id', user.id).eq('entry_kind', 'full')
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

  /* ── Analisar o trabalho e transformá-lo numa página ──
     O caminho principal do "Adicionar": o aluno não envia para guardar,
     envia para transformar. A IA (import-project) lê o ficheiro e devolve
     a ficha campo a campo; o aluno revê, completa o que falta e cria uma
     página de projeto a sério — não um item de "drive". */
  async function handleAnalyzeFiles() {
    if (!files.length) return
    if (requireAccount('/novo')) return
    if (!(await guardProjectCount())) return
    const aiGate = checkGate('createProject')
    if (!aiGate.allowed) { setGateMsg(aiGate.message); return }

    setStep('loading')
    setError(null)
    try {
      // Word/PPT → converte-se para PDF AQUI (via office-thumbnail, o mesmo
      // caminho que já funciona para as miniaturas) antes de mandar para a
      // IA. Assim o import-project só lida com PDFs e imagens — sem parsing
      // de ZIP frágil nem Gotenberg do lado do servidor.
      const payload = await Promise.all(files.map(async f => {
        if (isOfficeFile(f)) {
          try {
            const pdf = await officeFileToPdfBlob(f)
            return { name: f.name.replace(/\.[^.]+$/, '') + '.pdf', type: 'application/pdf', data: await fileToBase64(pdf) }
          } catch (e) {
            console.error('conversão office falhou, envia original', e)
          }
        }
        return { name: f.name, type: f.type, data: await fileToBase64(f) }
      }))
      const { data, error: fnErr } = await supabase.functions.invoke('import-project', {
        body: { files: payload, projectType, notes: importNotes.trim() || undefined },
      })
      if (fnErr) {
        // supabase-js devolve data:null num non-2xx — o erro real está no
        // corpo da resposta, dentro do FunctionsHttpError.
        let body = null
        try { body = await fnErr.context?.json?.() } catch { /* ignore */ }
        throw new Error(body?.error || 'analyze_failed')
      }
      if (data?.error) throw new Error(data.error)
      consumeAI('createProject')
      setForm({ ...(data?.prefill ?? {}), project_type: projectType })
      setImportSummary(data?.summary ?? null)
      setImportMissing(Array.isArray(data?.missing) ? data.missing : [])
      setSkippedFields(new Set())
      setStep('review')
    } catch (err) {
      setError(
        err.message === 'analyze_failed' || !err.message
          ? 'Não foi possível analisar o ficheiro. Se for Word/PowerPoint, tenta exportar como PDF.'
          : err.message
      )
      setStep('choose')
    }
  }

  /* Etiquetagem em segundo plano — o aluno só adicionou o ficheiro à
     Biblioteca, mas a IA lê-o à mesma (light mode, haiku, sem gastar quota)
     e tira competências + área + resumo. Silencioso: nada de bloquear a
     navegação, nada de erros na cara se falhar. */
  async function tagLibraryItem(itemId, file, hadNotes) {
    try {
      let f = { name: file.name, type: file.type, data: await fileToBase64(file) }
      if (isOfficeFile(file)) {
        try {
          const pdf = await officeFileToPdfBlob(file)
          f = { name: file.name.replace(/\.[^.]+$/, '') + '.pdf', type: 'application/pdf', data: await fileToBase64(pdf) }
        } catch { /* envia original */ }
      }
      const { data } = await supabase.functions.invoke('import-project', {
        body: { files: [f], projectType: 'personal', light: true },
      })
      if (!data) return
      const patch = {}
      if (Array.isArray(data.skills) && data.skills.length) patch.library_skills = data.skills.slice(0, 8)
      if (data.area) patch.area = data.area
      if (data.summary && !hadNotes) patch.library_description = data.summary
      if (Object.keys(patch).length) {
        await supabase.from('projects').update(patch).eq('id', itemId).eq('user_id', user.id)
      }
    } catch { /* background — silencioso */ }
  }

  /* "Adicionar à Biblioteca" — cria o item leve (ficheiro + nome + descrição)
     de imediato; a IA etiqueta-o por trás (tagLibraryItem). */
  async function handleAddToLibrary() {
    if (!files.length) return
    if (requireAccount('/novo')) return
    // Sem guardProjectCount aqui de propósito — esse limite é do plano
    // para projetos AI-estruturados (entry_kind='full'), não faz sentido
    // aplicá-lo a um upload leve sem IA nenhuma envolvida. Era isto que
    // estava a bloquear tudo em silêncio: quem já tinha 3 projetos
    // "full" nunca conseguia adicionar mais nada à Biblioteca.

    setSavingToLibrary(true)
    setError(null)
    try {
      // Cada ficheiro vira o seu próprio item — se vieram vários de uma
      // vez, sobem todos, um a um. A preview NÃO bloqueia nada disto: o
      // item é criado logo a seguir ao upload, e a thumbnail (que pode
      // demorar, sobretudo Word/PowerPoint a passar pelo Gotenberg) gera-se
      // depois, em segundo plano, sem o user à espera — só aparece um
      // pouco mais tarde na Biblioteca, com o cartão colorido entretanto.
      for (const file of files) {
        const path = `${user.id}/${Date.now()}-${safePathSegment(file.name)}`
        const { error: upErr } = await supabase.storage.from('library-files').upload(path, file, { contentType: file.type })
        if (upErr) throw upErr

        const { data: inserted, error: insErr } = await supabase.from('projects').insert({
          user_id: user.id,
          name: file.name.replace(/\.[^.]+$/, ''),
          slug: crypto.randomUUID(),
          entry_kind: 'library',
          visibility: 'private',
          library_description: importNotes.trim() || null,
          library_file_url: path,
          library_file_name: file.name,
          library_file_type: file.type,
        }).select('id').single()
        if (insErr) throw insErr

        generateLibraryThumbnail(inserted.id, file) // fire-and-forget, não espera
        tagLibraryItem(inserted.id, file, !!importNotes.trim()) // IA etiqueta por trás
      }

      showToast(files.length > 1 ? `${files.length} adicionados à biblioteca.` : 'Adicionado à biblioteca.', 'success')
      navigate('/biblioteca')
    } catch (err) {
      console.error(err)
      setError('Não foi possível guardar. Tenta novamente.')
    } finally {
      setSavingToLibrary(false)
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
    if (requireAccount('/novo')) return
    setStep('submitting')
    setError(null)
    let aiResult = {}
    try {
      const { data } = await supabase.functions.invoke('generate-project', { body: { data: form } })
      if (data?.tagline) aiResult = data
    } catch { /* não é crítico */ }
    const asAttachment = !!(user?.id && presentation === 'attachment' && parentId)
    // A app já sabe quem é o aluno — pré-preenche o "sobre o criador" a
    // partir do perfil, para ele não ter de reescrever o nome/escola.
    const withCreator = {
      ...form,
      creator_name: form.creator_name || profile?.full_name || '',
      school: form.school || profile?.school || '',
      course: form.course || profile?.area || '',
    }
    try {
      const project = await saveProject(withCreator, aiResult, user?.id ?? null, {
        parentProjectId: asAttachment ? parentId : null,
      })
      if (user?.id) localStorage.setItem(`edit_token_${project.slug}`, project.edit_token)

      // Veio de um ficheiro? Anexa o original ao projeto — fica transferível
      // e serve de fonte. Não bloqueia a navegação.
      if (user?.id && files[0]) {
        const f = files[0]
        supabase.storage.from('library-files')
          .upload(`${user.id}/${Date.now()}-${safePathSegment(f.name)}`, f, { contentType: f.type })
          .then(({ data: up, error: upErr }) => {
            if (upErr || !up?.path) return
            supabase.from('projects').update({
              library_file_url: up.path, library_file_name: f.name, library_file_type: f.type,
            }).eq('id', project.id).then(() => generateLibraryThumbnail(project.id, f))
          })
      }

      navigate(`/projeto/${project.slug}`, {
        state: {
          newProject: true,
          projectData: project,
          message: asAttachment ? 'Anexo adicionado.' : 'Projeto criado! Começa a melhorar o teu score.',
        },
      })
    } catch (err) {
      console.error(err)
      const raw = err?.message || ''
      if (raw.includes('max_projects_reached')) {
        setGateMsg('Atingiste o limite de projetos do teu plano. Faz upgrade para criar mais — ou adiciona este como anexo de um projeto que já tens.')
      } else {
        showToast(raw.includes('duplicate') || raw.includes('23505')
          ? 'Já tens um projeto com esse nome. Muda o nome e tenta outra vez.'
          : 'Erro ao criar o projeto. Tenta novamente.', 'error')
      }
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
    const totalBytes = files.reduce((s, f) => s + f.size, 0)
    return (
      <NpShell>
        {gateMsg && <PlanGateModal message={gateMsg} onClose={() => setGateMsg(null)} />}
        <Toast {...toast} />
        <Navbar showLinks={false} />
        <div className="np-center np-center--choose">
          <div className="np-wrap np-wrap--choose">
            <NpAnimatedTitle />

            {/* "Adicionar" é o go-to — a caixa de enviar ficheiros já vem
                aberta aqui, sem página seguinte nenhuma para lá chegar. */}
            <div className="np-add-card">
              <FilePicker files={files} onAdd={addFiles} onRemove={i => setFiles(f => f.filter((_, k) => k !== i))} />

              {files.length > 0 && (
                <div className="np-notes-block">
                  <div className="np-filemeta">
                    {files.length} {files.length === 1 ? 'ficheiro' : 'ficheiros'} · {prettySize(totalBytes)}
                  </div>
                  <TypeRow value={projectType} onChange={setProjectType} />
                  <label className="np-notes-label" htmlFor="np-notes">Algo a acrescentar antes de a IA ler? (opcional)</label>
                  <textarea
                    id="np-notes"
                    className="np-notes"
                    rows={2}
                    value={importNotes}
                    onChange={e => setImportNotes(e.target.value)}
                    placeholder="Ex: o meu papel foi o design e a investigação de utilizadores."
                  />
                </div>
              )}

              {error && <p className="np-err"><AlertTriangle size={13} /> {error}</p>}

              <button className="np-btn-primary np-btn-ai" onClick={handleAnalyzeFiles} disabled={!files.length}>
                <Sparkles size={15} /> Analisar e criar página
              </button>
              {files.length > 0 && (
                <button className="np-alt-path np-alt-path--quiet" onClick={handleAddToLibrary} disabled={savingToLibrary}>
                  {savingToLibrary ? 'A guardar…' : 'Adicionar à Biblioteca'}
                </button>
              )}
              <AiUsageBadge feature="createProject" style={{ marginTop: 8 }} />
            </div>

            <div className="np-or-divider">ou</div>

            <button className="np-alt-path" onClick={() => { if (!requireAccount('/novo')) setStep('describe') }}>
              Descrever o que estou a fazer
            </button>
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
            <p className="np-sub">Descreve a tua ideia, a IA ajuda-te a desenvolvê-la.</p>

            <DescribeTextarea value={description} onChange={setDescription} onSubmit={handleGenerate} />

            <TypeRow value={projectType} onChange={setProjectType} />

            {error && <p className="np-err"><AlertTriangle size={13} /> {error}</p>}

            <button className="np-btn-primary np-btn-ai" onClick={handleGenerate} disabled={!description.trim()}>
              <Sparkles size={15} /> Criar com IA
            </button>

            <div className="np-or-divider">ou</div>

            <button className="np-alt-path" onClick={handleInterview} disabled={!description.trim()}>
              Responder a perguntas guiadas
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
    const title = step === 'submitting' ? 'A guardar o teu projeto…' : ANALYSIS_BEATS[beat]
    return (
      <NpShell>
        <div className="np-loading">
          <div className="np-loading-spinner" aria-hidden="true" />
          <p className="np-loading-title">{title}</p>
          <p className="np-loading-sub">
            {step === 'submitting' ? 'Quase pronto.' : 'Não feches esta página.'}
          </p>
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
            <InterviewPanel
              data={interviewData}
              onComplete={answers => {
                setForm({ ...Object.fromEntries(Object.entries(answers).filter(([, v]) => v)), project_type: interviewData.projectType })
                setStep('review')
              }}
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
      {gateMsg && <PlanGateModal message={gateMsg} onClose={() => setGateMsg(null)} />}
      <Toast {...toast} />
      <Navbar showLinks={false} mobileLeft={<BackButton onClick={() => setStep(importSummary ? 'choose' : 'describe')} />} />
      <div className="np-center np-center--review">
        <div className="np-wrap np-wrap--review">
          <StepBar current={3} total={3} label="Rever" />
          <h2 className="np-headline np-headline--sm">{importSummary ? 'Isto foi o que a IA encontrou.' : 'Parece bem?'}</h2>

          {importSummary && (
            <div className="np-import-summary">
              <p className="np-import-summary-text">{importSummary}</p>
              {importMissing.length > 0 && (
                <p className="np-import-missing">
                  <AlertTriangle size={12} /> A IA não conseguiu tirar do ficheiro: {importMissing.join(', ')}. Preenche o que puderes.
                </p>
              )}
            </div>
          )}

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

          {/* Como aparece — página própria ou anexo de outro projeto. */}
          {user && myProjects.length > 0 && (
            <div className="np-present">
              <p className="np-present-label">Como aparece</p>
              <div className="np-present-opts">
                <button
                  type="button"
                  className={`np-present-opt${presentation === 'page' ? ' is-on' : ''}`}
                  onClick={() => setPresentation('page')}
                >
                  <strong>Página própria</strong>
                  <span>Um projeto Showo a sério, no perfil e no Explorar.</span>
                </button>
                <button
                  type="button"
                  className={`np-present-opt${presentation === 'attachment' ? ' is-on' : ''}`}
                  onClick={() => setPresentation('attachment')}
                >
                  <strong>Anexo de outro projeto</strong>
                  <span>Aparece dentro da página de um projeto maior.</span>
                </button>
              </div>
              {presentation === 'attachment' && (
                <select
                  className="np-present-select"
                  value={parentId}
                  onChange={e => setParentId(e.target.value)}
                >
                  <option value="">Escolhe o projeto…</option>
                  {myProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Ação principal fixa ao fundo: numa lista longa de campos, o botão de
          criar não pode estar a 3 scrolls de distância no telemóvel. */}
      <div className="np-sticky-action">
        <button
          className="np-btn-primary"
          onClick={handleSubmit}
          disabled={!canSubmit || (presentation === 'attachment' && !parentId)}
        >
          {presentation === 'attachment' ? 'Adicionar como anexo' : 'Criar projeto'} <ArrowRight size={15} />
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
  { word1: 'Cria',     alt1: false, word3: 'projeto',  alt3: false, hold: 3400 },
  { word1: 'Adiciona', alt1: true,  word3: 'projeto',  alt3: false, hold: 3000 },
  { word1: 'Cria',     alt1: false, word3: 'trabalho', alt3: true,  hold: 3000 },
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
  const [animate, setAnimate] = useState(false)

  // As palavras alternam sempre. O efeito de letras-a-subir é que respeita
  // prefers-reduced-motion — via CSS (@media reduce → animation: none), não
  // aqui, para o título não ficar congelado numa palavra só.
  useEffect(() => {
    const t = setTimeout(() => {
      setAnimate(true)
      setFrame(f => (f + 1) % NP_TITLE_FRAMES.length)
    }, NP_TITLE_FRAMES[frame].hold)
    return () => clearTimeout(t)
  }, [frame])

  const f = NP_TITLE_FRAMES[frame]
  return (
    <h1 className="np-headline np-headline-anim">
      <NpTitleWord text={f.word1} gradient={f.alt1} animate={animate} />{' o teu '}<NpTitleWord text={f.word3} gradient={f.alt3} animate={animate} />
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
  const personal = PROJECT_TYPES.filter(t => !t.group)
  const school = PROJECT_TYPES.filter(t => t.group === 'school')
  const renderType = t => (
    <button
      key={t.id}
      type="button"
      className={`np-type${value === t.id ? ' is-active' : ''}`}
      onClick={() => onChange(t.id)}
    >{t.label}</button>
  )

  return (
    <div className="np-types">
      {personal.map(renderType)}
      {/* "De escola"/PAP ao lado de "Pessoal", só que dentro da sua
          própria cápsula tracejada — dá para ver que são um grupo à
          parte sem parecer uma secção inteira separada. */}
      <div className="np-types-school-group">{school.map(renderType)}</div>
    </div>
  )
}

function FilePicker({ files, onAdd, onRemove }) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const canAddMore = files.length < MAX_FILES

  const input = (
    <input
      ref={inputRef}
      type="file"
      multiple
      accept={ACCEPT}
      hidden
      onChange={e => { onAdd(e.target.files); e.target.value = '' }}
    />
  )

  // Antes de haver ficheiro nenhum, a caixa grande de arrastar. Depois de
  // um estar escolhido, ela desaparece — ficava lá sempre visível como se
  // desse para largar mais coisas, mesmo quando só o primeiro contava.
  if (files.length === 0) {
    return (
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
        <span className="np-drop-sub">PDF, Word, PowerPoint ou imagens</span>
        {input}
      </div>
    )
  }

  return (
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
      {canAddMore && (
        <li className="np-file-add" onClick={() => inputRef.current?.click()} role="button" tabIndex={0}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click() }}>
          <PlusIcon size={13} /> Adicionar outro ficheiro
          {input}
        </li>
      )}
      {!canAddMore && input}
    </ul>
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

function InterviewPanel({ data, onComplete }) {
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
          {isLast ? <><Sparkles size={14} /> Concluir</> : 'Próxima'}
        </button>
        <button type="button" className="np-interview-skip" onClick={() => advance('')}>Saltar</button>
      </div>
    </div>
  )
}
