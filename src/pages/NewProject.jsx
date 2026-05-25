import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { GraduationCap, Briefcase, Rocket, Users, ClipboardList, BarChart2, Monitor, Trophy, Sparkles, Check, Lock, Camera, X, Save, ArrowRight, ArrowLeft, ChevronRight, ShieldAlert } from 'lucide-react'
import { generateProject } from '../lib/generateProject'
import { saveProject } from '../lib/saveProject'
import { calculateScore, looksLikeSpam, isTooShortForContent } from '../lib/score'
import { containsProfanity } from '../lib/profanity'
import { Toast, useToast } from '../components/Toast'
import { Navbar } from '../components/Navbar'
import { useAuth } from '../context/AuthContext'
import { CropModal } from '../components/CropModal'

const colors = {
  bg: 'var(--c-bg)',
  bgAlt: 'var(--c-bg-alt)',
  card: 'var(--c-card)',
  cardHover: 'var(--c-card-hover)',
  border: 'var(--c-border)',
  borderBright: 'var(--c-border-bright)',
  blue: '#1b78f7',
  blueHover: '#1564d4',
  blueGlow: 'rgba(27,120,247,0.15)',
  blueSubtle: 'rgba(27,120,247,0.08)',
  text: 'var(--c-text)',
  muted: 'var(--c-muted)',
  subtle: 'var(--c-subtle)',
  green: '#22c55e',
  greenGlow: 'rgba(34,197,94,0.12)',
  yellow: '#fbbf24',
  yellowGlow: 'rgba(234,179,8,0.1)',
  orange: '#f97316',
  red: '#ef4444',
  inputBg: 'var(--c-bg)',
}

const inputBase = {
  width: '100%',
  background: colors.inputBg,
  border: `1.5px solid ${colors.border}`,
  borderRadius: 10,
  color: colors.text,
  fontSize: 15,
  padding: '13px 16px',
  outline: 'none',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
  transition: 'border-color 0.2s, box-shadow 0.2s',
}

const GOAL_OPTIONS = [
  { id: 'school',     Icon: GraduationCap, title: 'Apresentar um projeto escolar', subtitle: 'PAP, trabalho de grupo ou apresentação' },
  { id: 'internship', Icon: Briefcase,     title: 'Conseguir um estágio',           subtitle: 'Mostra o teu trabalho a recrutadores' },
  { id: 'show',       Icon: Rocket,        title: 'Mostrar o meu projeto',          subtitle: 'Partilha o que construíste com o mundo' },
  { id: 'clients',    Icon: Users,         title: 'Conseguir clientes',             subtitle: 'Transforma projetos em prova profissional' },
]

const SCHOOL_YEARS = ['10º ano', '11º ano', '12º ano', 'Licenciatura', 'Mestrado', 'Outro']

const PROJECT_TYPES = [
  { id: 'group',        Icon: ClipboardList, label: 'Trabalho de grupo' },
  { id: 'pap',          Icon: GraduationCap, label: 'PAP / Projeto final' },
  { id: 'presentation', Icon: BarChart2,     label: 'Apresentação' },
  { id: 'personal',     Icon: Monitor,       label: 'Projeto pessoal' },
  { id: 'competition',  Icon: Trophy,        label: 'Projeto de competição' },
  { id: 'other',        Icon: Sparkles,      label: 'Outro' },
]

const STEPS = [
  {
    type: 'dual_text',
    label: 'Vamos começar pelo básico',
    keys: ['name', 'area'],
    labels: ['Nome do projeto', 'Área'],
    placeholders: ['Ex: EcoTrack, StudyBuddy, FoodSaver...', 'Ex: Saúde, Educação, Sustentabilidade...'],
  },
  { type: 'textarea', key: 'goal',            label: 'Qual é o objetivo principal?',           placeholder: 'Descreve o que este projeto pretende alcançar...' },
  { type: 'textarea', key: 'problem',         label: 'Que problema resolve?',                  placeholder: 'Descreve o problema que identificaste e que motivou este projeto...' },
  { type: 'textarea', key: 'solution',        label: 'Como é que o resolve?',                  placeholder: 'Explica a tua abordagem e solução de forma clara...' },
  { type: 'text',     key: 'target_audience', label: 'Quem é o público-alvo?',                 placeholder: 'Ex: Estudantes universitários, pequenas empresas...' },
  { type: 'textarea', key: 'features',        label: 'Quais são as principais funcionalidades?', placeholder: 'Lista as 3-5 funcionalidades mais importantes...' },
  { type: 'text',     key: 'technologies',    label: 'Que tecnologias utilizaste?',            placeholder: 'Ex: React, Python, PostgreSQL, Firebase...' },
  { type: 'textarea', key: 'challenges',      label: 'Quais foram os maiores desafios?',       placeholder: 'O que foi mais difícil de implementar ou resolver?' },
  {
    type: 'dual_textarea',
    label: 'Resultados e aprendizagens',
    keys: ['results', 'learnings'],
    labels: ['Resultados', 'Aprendizagens'],
    placeholders: ['Métricas, feedback de utilizadores, conquistas, prémios...', 'Competências técnicas, soft skills, lições importantes...'],
  },
  { type: 'finalize', label: 'Quase pronto!' },
]

const TOTAL_STEPS = STEPS.length

const GOAL_LABELS = {
  school: 'Projeto escolar', internship: 'Para recrutadores',
  show: 'Partilha pública', clients: 'Prova profissional',
}

function getScoreColor(s) {
  if (s > 80) return colors.green
  if (s >= 60) return colors.orange
  if (s >= 40) return colors.yellow
  return colors.blue
}

function getMotivation(s) {
  if (s > 80) return 'Excelente!'
  if (s >= 60) return 'Quase lá!'
  if (s >= 40) return 'Bom progresso!'
  return 'Continua! Estás a começar.'
}


export default function NewProject() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, loading: authLoading } = useAuth()
  const [phase, setPhase] = useState('goal')
  const [formGoal, setFormGoal] = useState(null)
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState({})
  const [error, setError] = useState(null)
  const [savedProject, setSavedProject] = useState(null)
  const [copiedLink, setCopiedLink] = useState(null)
  const [prefillBanner, setPrefillBanner] = useState(false)
  const [showAuthNudge, setShowAuthNudge] = useState(false)
  const { toast, show: showToast } = useToast()
  const fileInputRef = useRef(null)
  const [dragOver, setDragOver] = useState(false)
  const [cropFile, setCropFile] = useState(null) // File waiting to be cropped
  // Show auth nudge for anonymous users (once per session)
  useEffect(() => {
    if (authLoading) return
    if (!user && !sessionStorage.getItem('showo_auth_nudge_dismissed')) {
      setShowAuthNudge(true)
    }
    if (user) setShowAuthNudge(false)
  }, [user, authLoading])

  // On mount: restore draft from localStorage (if no widget prefill)
  useEffect(() => {
    const hasPrefill = !!location.state?.prefill?.fromWidget
    if (hasPrefill) return
    try {
      const raw = localStorage.getItem('showo_new_project_draft')
      if (!raw) return
      const draft = JSON.parse(raw)
      if (draft.answers && Object.keys(draft.answers).length > 0) {
        setAnswers(draft.answers)
        if (draft.formGoal) { setFormGoal(draft.formGoal); setPhase('form') }
        if (typeof draft.step === 'number') setStep(draft.step)
      }
    } catch {}
  }, [])

  // Persist draft to localStorage whenever answers/step/formGoal change
  useEffect(() => {
    if (phase !== 'form' && phase !== 'goal') return
    try {
      const { cover_url: _omit, ...answersWithoutCover } = answers
      localStorage.setItem('showo_new_project_draft', JSON.stringify({ answers: answersWithoutCover, formGoal, step }))
    } catch {}
  }, [answers, formGoal, step, phase])

  // On mount: check for widget prefill state
  useEffect(() => {
    const state = location.state?.prefill
    if (!state?.fromWidget) return
    setFormGoal(state.formGoal ?? 'show')
    setAnswers(state.answers ?? {})
    setPhase('form')
    // Find first step that isn't already filled — start there
    const firstEmpty = STEPS.findIndex(s => {
      if (s.type === 'finalize') return false
      if (s.type === 'dual_text')     return s.keys.some(k => !(state.answers?.[k] ?? '').trim())
      if (s.type === 'dual_textarea') return !(state.answers?.[s.keys[0]] ?? '').trim()
      return !(state.answers?.[s.key] ?? '').trim()
    })
    setStep(firstEmpty === -1 ? STEPS.length - 1 : firstEmpty)
    if (Object.values(state.answers ?? {}).some(v => v)) setPrefillBanner(true)
    // Clear state so refresh doesn't re-apply
    window.history.replaceState({}, '')
  }, [])

  const progress = phase === 'goal' ? 0 : ((step + 1) / TOTAL_STEPS) * 100
  const estimatedScore = calculateScore(answers).score
  const s = STEPS[step] ?? STEPS[0]

  function set(key, val) {
    setAnswers(p => ({ ...p, [key]: val }))
  }

  // Returns the text values that should be spam-checked for the current step
  function getCurrentFieldValues() {
    if (phase === 'goal') return []
    switch (s.type) {
      case 'dual_text':     return s.keys.map(k => answers[k] ?? '')
      case 'text':
      case 'textarea':      return [answers[s.key] ?? '']
      case 'dual_textarea': return s.keys.map(k => answers[k] ?? '')
      default:              return []
    }
  }

  // Steps where content must be >= 20 chars (real descriptions, not identifiers)
  const SHORT_CONTENT_TYPES = new Set(['textarea', 'dual_textarea'])

  function hasSpamInCurrent() {
    return getCurrentFieldValues().some(v => v.trim().length > 0 && looksLikeSpam(v))
  }

  function hasTooShortContent() {
    if (!SHORT_CONTENT_TYPES.has(s?.type)) return false
    return getCurrentFieldValues().some(v => isTooShortForContent(v))
  }

  function hasProfanityInCurrent() {
    return getCurrentFieldValues().some(v => containsProfanity(v))
  }

  function currentContentIssue() {
    if (hasProfanityInCurrent()) return 'profanity'
    if (hasSpamInCurrent()) return 'spam'
    if (hasTooShortContent()) return 'short'
    return null
  }

  function isFieldSpam(key) {
    const v = answers[key] ?? ''
    return v.trim().length > 0 && looksLikeSpam(v)
  }

  function isFieldTooShort(key) {
    if (!SHORT_CONTENT_TYPES.has(s?.type)) return false
    const v = answers[key] ?? ''
    return isTooShortForContent(v)
  }

  function spamBorder(key) {
    return (isFieldSpam(key) || isFieldTooShort(key))
      ? `1.5px solid rgba(239,68,68,0.6)`
      : `1.5px solid ${colors.border}`
  }

  function canProceed() {
    if (phase === 'goal') return !!formGoal
    if (hasProfanityInCurrent()) return false
    if (hasSpamInCurrent()) return false
    if (hasTooShortContent()) return false
    switch (s.type) {
      case 'dual_text':     return s.keys.every(k => (answers[k] ?? '').trim().length > 0)
      case 'text':
      case 'textarea':      return (answers[s.key] ?? '').trim().length > 0
      case 'dual_textarea': return (answers[s.keys[0]] ?? '').trim().length > 0
      case 'finalize':      return true
      default:              return false
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && s.type === 'text' && canProceed()) handleNext()
  }

  async function handleNext() {
    if (phase === 'goal') { setPhase('form'); return }

    // Content guard — blocks profanity, spam and too-short content
    if (hasProfanityInCurrent() || hasSpamInCurrent() || hasTooShortContent()) return

    if (step < TOTAL_STEPS - 1) { setStep(n => n + 1); return }

    setPhase('generating')
    setError(null)
    try {
      const aiResult = await generateProject(answers)
      const project = await saveProject(answers, aiResult, user?.id ?? null)
      localStorage.setItem(`edit_token_${project.slug}`, project.edit_token)
      localStorage.removeItem('showo_new_project_draft')
      navigate(`/projeto/${project.slug}`, {
        state: { newProject: true, message: 'Projeto criado! Começa a melhorar o teu score.' }
      })
    } catch (err) {
      console.error(err)
      setError('Ocorreu um erro. Tenta novamente.')
      setPhase('form')
      showToast('Erro ao gerar o projeto. Tenta novamente.', 'error')
    }
  }

  function handleImageUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { showToast('Imagem demasiado grande (máx. 10MB)', 'error'); return }
    setCropFile(file)
    // Reset input so same file can be re-selected after cancel
    if (e.target) e.target.value = ''
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (!file || !file.type.startsWith('image/')) { showToast('Ficheiro inválido. Usa PNG, JPG ou WEBP.', 'error'); return }
    if (file.size > 10 * 1024 * 1024) { showToast('Imagem demasiado grande (máx. 10MB)', 'error'); return }
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
    } catch { set('cover_url', ''); showToast('Erro ao carregar imagem. Tenta novamente.', 'error') }
  }

  const sharedInputHandlers = {
    onFocus: e => {
      e.target.style.borderColor = colors.blue
      e.target.style.boxShadow = '0 0 0 3px rgba(27,120,247,0.1)'
    },
    onBlur: e => {
      e.target.style.borderColor = colors.border
      e.target.style.boxShadow = 'none'
    },
  }

  // ── GOAL ─────────────────────────────────────────────────
  if (phase === 'goal') {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: colors.bg, color: colors.text, fontFamily: 'inherit', display: 'flex', flexDirection: 'column' }}>
        <Navbar showLinks={false} />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
          <div style={{ width: '100%', maxWidth: 560 }}>
            <h2 style={{ fontSize: 'clamp(22px, 4vw, 32px)', fontWeight: 800, marginBottom: 8, textAlign: 'center', marginTop: 0, letterSpacing: '-0.5px' }}>
              O que pretendes alcançar?
            </h2>
            <p style={{ color: colors.muted, textAlign: 'center', marginBottom: 32, fontSize: 15, marginTop: 8 }}>
              Escolhe o teu objetivo para personalizarmos a experiência
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 24 }}>
              {GOAL_OPTIONS.map(opt => {
                const sel = formGoal === opt.id
                return (
                  <button
                    key={opt.id}
                    onClick={() => setFormGoal(opt.id)}
                    style={{
                      background: sel ? 'rgba(27,120,247,0.1)' : colors.card,
                      border: `2px solid ${sel ? colors.blue : colors.border}`,
                      borderRadius: 16, padding: '20px 16px',
                      color: colors.text, cursor: 'pointer', textAlign: 'left',
                      transition: 'border-color 0.15s, background 0.15s',
                      boxShadow: sel ? '0 4px 20px rgba(27,120,247,0.15)' : '0 2px 10px rgba(0,0,0,0.25)',
                      fontFamily: 'inherit',
                    }}
                  >
                    <div style={{
                      width: 42, height: 42, borderRadius: 10, marginBottom: 12,
                      background: sel ? 'rgba(27,120,247,0.15)' : 'var(--c-bg-alt)',
                      border: `1px solid ${sel ? 'rgba(27,120,247,0.25)' : colors.border}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <opt.Icon size={22} color={sel ? colors.blue : colors.muted} />
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 5, letterSpacing: '-0.1px' }}>{opt.title}</div>
                    <div style={{ fontSize: 12, color: colors.muted, lineHeight: 1.45 }}>{opt.subtitle}</div>
                  </button>
                )
              })}
            </div>
            <button
              onClick={handleNext}
              disabled={!formGoal}
              style={{
                width: '100%',
                background: formGoal ? `linear-gradient(135deg, ${colors.blue}, #4f46e5)` : colors.border,
                color: '#fff', border: 'none', borderRadius: 12,
                padding: '15px 0', fontSize: 17, fontWeight: 700,
                cursor: formGoal ? 'pointer' : 'not-allowed',
                transition: 'background 0.2s, box-shadow 0.2s',
                fontFamily: 'inherit',
                boxShadow: formGoal ? '0 4px 20px rgba(27,120,247,0.3)' : 'none',
                letterSpacing: '-0.2px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <span style={{display:'flex',alignItems:'center',gap:6}}>Continuar <ArrowRight size={15} /></span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── SUCCESS ───────────────────────────────────────────────
  if (phase === 'success' && savedProject) {
    const projectUrl = `${window.location.origin}/projeto/${savedProject.slug}`
    const editUrl = `${window.location.origin}/editar/${savedProject.slug}?token=${savedProject.edit_token}`

    function copyLink(text, key) {
      navigator.clipboard.writeText(text).then(() => {
        setCopiedLink(key)
        setTimeout(() => setCopiedLink(null), 2500)
      })
    }

    return (
      <div style={{ minHeight: '100vh', backgroundColor: colors.bg, color: colors.text, fontFamily: 'inherit', display: 'flex', flexDirection: 'column' }}>
        <Navbar showLinks={false} />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
          <div style={{ width: '100%', maxWidth: 560 }}>
            <div style={{ textAlign: 'center', marginBottom: 36 }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}><Sparkles size={52} color={colors.blue} /></div>
              <h2 style={{ fontSize: 'clamp(22px, 4vw, 30px)', fontWeight: 800, margin: '0 0 8px', letterSpacing: '-0.5px' }}>O teu projeto está pronto!</h2>
              <p style={{ color: colors.muted, margin: 0, fontSize: 15 }}>Guarda o link de edição — só tu o tens.</p>
            </div>

            {/* Project link */}
            <div style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 14, padding: '20px 22px', marginBottom: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.25)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: colors.subtle, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>Link do projeto</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1, background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 8, padding: '10px 12px', fontSize: 13, color: colors.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {projectUrl}
                </div>
                <button
                  onClick={() => copyLink(projectUrl, 'project')}
                  style={{
                    background: copiedLink === 'project' ? `linear-gradient(135deg, ${colors.green}, #16a34a)` : `linear-gradient(135deg, ${colors.blue}, #4f46e5)`,
                    color: '#fff', border: 'none', borderRadius: 8,
                    padding: '10px 16px', fontSize: 13, fontWeight: 600,
                    cursor: 'pointer', whiteSpace: 'nowrap',
                    transition: 'background 0.2s',
                    fontFamily: 'inherit',
                  }}
                >
                  {copiedLink === 'project' ? <><Check size={13} style={{verticalAlign:'middle',marginRight:3}}/>Copiado</> : 'Copiar'}
                </button>
              </div>
            </div>

            {/* Edit link */}
            <div style={{ background: colors.yellowGlow, border: '1px solid rgba(234,179,8,0.2)', borderRadius: 14, padding: '20px 22px', marginBottom: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Lock size={16} color={colors.yellow} />
                <div style={{ fontSize: 11, fontWeight: 700, color: colors.yellow, textTransform: 'uppercase', letterSpacing: 0.8 }}>Teu link privado de edição</div>
              </div>
              <p style={{ margin: '0 0 12px', fontSize: 13, color: colors.muted, lineHeight: 1.55 }}>
                Guarda este link. É o único modo de editar o teu projeto — não o partilhes.
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1, background: colors.bg, border: '1px solid rgba(234,179,8,0.15)', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: colors.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {editUrl}
                </div>
                <button
                  onClick={() => copyLink(editUrl, 'edit')}
                  style={{
                    background: copiedLink === 'edit' ? `linear-gradient(135deg, ${colors.green}, #16a34a)` : colors.yellow,
                    color: 'var(--c-bg)', border: 'none', borderRadius: 8,
                    padding: '10px 16px', fontSize: 13, fontWeight: 700,
                    cursor: 'pointer', whiteSpace: 'nowrap',
                    transition: 'background 0.2s',
                    fontFamily: 'inherit',
                  }}
                >
                  {copiedLink === 'edit' ? <><Check size={13} style={{verticalAlign:'middle',marginRight:3}}/>Copiado</> : 'Copiar'}
                </button>
              </div>
            </div>

            <button
              onClick={() => navigate(`/projeto/${savedProject.slug}`)}
              style={{
                width: '100%',
                background: `linear-gradient(135deg, ${colors.blue}, #4f46e5)`,
                color: '#fff', border: 'none',
                borderRadius: 12, padding: '15px 0',
                fontSize: 17, fontWeight: 700, cursor: 'pointer',
                fontFamily: 'inherit',
                boxShadow: '0 4px 20px rgba(27,120,247,0.3)',
                letterSpacing: '-0.2px',
              }}
            >
              <span style={{display:'flex',alignItems:'center',gap:6}}>Ver o meu projeto <ArrowRight size={15} /></span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── GENERATING ────────────────────────────────────────────
  if (phase === 'generating') {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: colors.bg, color: colors.text, fontFamily: 'inherit', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
        <div style={{
          width: 64, height: 64,
          border: `3px solid ${colors.border}`,
          borderTop: `3px solid ${colors.blue}`,
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          boxShadow: `0 0 24px ${colors.blueGlow}`,
        }} />
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 20, fontWeight: 700, margin: '0 0 8px', letterSpacing: '-0.3px', display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}><Sparkles size={20} color={colors.blue} /> A IA está a analisar o teu projeto...</p>
          <p style={{ color: colors.muted, fontSize: 14, margin: 0 }}>Isto pode demorar alguns segundos</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  // ── FORM ─────────────────────────────────────────────────
  const isFinalize = s.type === 'finalize'

  function handleAuthNudgeDismiss() {
    sessionStorage.setItem('showo_auth_nudge_dismissed', '1')
    setShowAuthNudge(false)
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: colors.bg, color: colors.text, fontFamily: 'inherit', display: 'flex', flexDirection: 'column' }}>
      <Toast {...toast} />

      {/* Auth nudge modal */}
      {showAuthNudge && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(8,14,26,0.82)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '0 16px',
          backdropFilter: 'blur(4px)',
        }}>
          <div style={{
            background: colors.card,
            border: '1px solid #1e3050',
            borderRadius: 18,
            padding: '36px 32px 28px',
            maxWidth: 420, width: '100%',
            boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
            textAlign: 'center',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}><Save size={36} color={colors.blue} /></div>
            <h2 style={{ color: 'var(--c-text)', fontSize: 20, fontWeight: 800, margin: '0 0 10px', letterSpacing: '-0.3px' }}>
              Guarda o teu projeto
            </h2>
            <p style={{ color: 'var(--c-muted)', fontSize: 14, lineHeight: 1.65, margin: '0 0 28px' }}>
              Sem conta, o teu projeto fica guardado apenas com um link privado — se o perderes, não há forma de recuperar. Com conta, fica sempre acessível.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                onClick={() => navigate('/register')}
                style={{
                  background: 'linear-gradient(135deg, #1b78f7, #4f46e5)',
                  border: 'none', borderRadius: 10,
                  padding: '12px 0', color: '#fff',
                  fontSize: 15, fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'inherit',
                  boxShadow: '0 4px 16px rgba(27,120,247,0.3)',
                  transition: 'opacity 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              >
                Criar conta
              </button>
              <button
                onClick={() => navigate('/login')}
                style={{
                  background: 'transparent',
                  border: '1px solid #1e3050', borderRadius: 10,
                  padding: '11px 0', color: 'var(--c-text)',
                  fontSize: 15, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit',
                  transition: 'border-color 0.15s, background 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--c-border-bright)'; e.currentTarget.style.background = 'var(--c-bg-alt)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--c-border)'; e.currentTarget.style.background = 'transparent' }}
              >
                Iniciar sessão
              </button>
              <button
                onClick={handleAuthNudgeDismiss}
                style={{
                  background: 'transparent', border: 'none',
                  color: '#4a6080', fontSize: 13, fontWeight: 500,
                  cursor: 'pointer', fontFamily: 'inherit',
                  padding: '8px 0', marginTop: 2,
                  transition: 'color 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--c-muted)'}
                onMouseLeave={e => e.currentTarget.style.color = '#4a6080'}
              >
                Continuar sem conta
              </button>
            </div>
          </div>
        </div>
      )}

      <Navbar showLinks={false}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {formGoal && (
            <span style={{
              fontSize: 11, color: colors.blue,
              background: 'rgba(27,120,247,0.08)',
              border: '1px solid rgba(27,120,247,0.15)',
              borderRadius: 999, padding: '3px 10px', fontWeight: 600,
            }}>
              {GOAL_LABELS[formGoal]}
            </span>
          )}
          <span style={{ color: colors.subtle, fontSize: 13, fontWeight: 500 }}>{step + 1}/{TOTAL_STEPS}</span>
        </div>
      </Navbar>

      {/* Progress bar */}
      <div style={{ height: 3, background: colors.border }}>
        <div style={{
          height: '100%',
          width: `${progress}%`,
          background: `linear-gradient(90deg, ${colors.blue}, #818cf8)`,
          transition: 'width 0.4s ease',
          boxShadow: '0 0 8px rgba(27,120,247,0.4)',
        }} />
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: isFinalize ? 'flex-start' : 'center', justifyContent: 'center', padding: isFinalize ? '40px 24px 60px' : '32px 24px', overflowY: 'auto' }}>
        <div style={{ width: '100%', maxWidth: 580 }}>

          {/* Prefill banner */}
          {prefillBanner && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: 'rgba(27,120,247,0.08)', border: '1px solid rgba(27,120,247,0.2)',
              borderRadius: 10, padding: '10px 14px', marginBottom: 20, gap: 10,
            }}>
              <span style={{ color: colors.blue, fontSize: 13, fontWeight: 500 }}>
                A IA pré-preencheu alguns campos com base na tua descrição. Revê e corrige o que precisares.
              </span>
              <button
                onClick={() => setPrefillBanner(false)}
                style={{ background: 'none', border: 'none', color: 'var(--c-muted)', cursor: 'pointer', fontSize: 16, padding: 0, flexShrink: 0 }}
              ><X size={14} /></button>
            </div>
          )}

          <div style={{ fontSize: 11, color: '#818cf8', fontWeight: 700, marginBottom: 5, textTransform: 'uppercase', letterSpacing: 1.2 }}>
            {isFinalize ? 'Finalizar' : `Passo ${step + 1} de ${TOTAL_STEPS}`}
          </div>

          {/* ── dual_text ── */}
          {s.type === 'dual_text' && (
            <>
              <h2 style={{ fontSize: 'clamp(26px, 4.5vw, 36px)', fontWeight: 900, marginBottom: 28, marginTop: 6, lineHeight: 1.2, letterSpacing: '-0.5px' }}>{s.label}</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {s.keys.map((key, i) => (
                  <div key={key}>
                    <label style={{ display: 'block', fontSize: 12, color: colors.muted, fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>{s.labels[i]}</label>
                    <input
                      type="text"
                      value={answers[key] ?? ''}
                      onChange={e => set(key, e.target.value)}
                      onKeyDown={i === s.keys.length - 1 ? handleKeyDown : undefined}
                      placeholder={s.placeholders[i]}
                      autoFocus={i === 0}
                      style={{ ...inputBase, fontSize: 17, border: spamBorder(key) }}
                      {...sharedInputHandlers}
                    />
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── text ── */}
          {s.type === 'text' && (
            <>
              <h2 style={{ fontSize: 'clamp(26px, 4.5vw, 36px)', fontWeight: 900, marginBottom: 28, marginTop: 6, lineHeight: 1.2, letterSpacing: '-0.5px' }}>{s.label}</h2>
              <input
                key={s.key}
                type="text"
                value={answers[s.key] ?? ''}
                onChange={e => set(s.key, e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={s.placeholder}
                autoFocus
                style={{ ...inputBase, fontSize: 18, padding: '15px 16px', border: spamBorder(s.key) }}
                {...sharedInputHandlers}
              />
            </>
          )}

          {/* ── textarea ── */}
          {s.type === 'textarea' && (
            <>
              <h2 style={{ fontSize: 'clamp(26px, 4.5vw, 36px)', fontWeight: 900, marginBottom: 28, marginTop: 6, lineHeight: 1.2, letterSpacing: '-0.5px' }}>{s.label}</h2>
              <textarea
                key={s.key}
                value={answers[s.key] ?? ''}
                onChange={e => set(s.key, e.target.value)}
                placeholder={s.placeholder}
                rows={5}
                autoFocus
                style={{ ...inputBase, fontSize: 16, padding: '14px 16px', resize: 'vertical', lineHeight: 1.65, border: spamBorder(s.key) }}
                {...sharedInputHandlers}
              />
            </>
          )}

          {/* ── dual_textarea ── */}
          {s.type === 'dual_textarea' && (
            <>
              <h2 style={{ fontSize: 'clamp(26px, 4.5vw, 36px)', fontWeight: 900, marginBottom: 28, marginTop: 6, lineHeight: 1.2, letterSpacing: '-0.5px' }}>{s.label}</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {s.keys.map((key, i) => (
                  <div key={key}>
                    <label style={{ display: 'block', fontSize: 12, color: colors.muted, fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>{s.labels[i]}</label>
                    <textarea
                      value={answers[key] ?? ''}
                      onChange={e => set(key, e.target.value)}
                      placeholder={s.placeholders[i]}
                      rows={4}
                      autoFocus={i === 0}
                      style={{ ...inputBase, fontSize: 15, resize: 'vertical', lineHeight: 1.65, border: spamBorder(key) }}
                      {...sharedInputHandlers}
                    />
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── finalize ── */}
          {isFinalize && (
            <>
              <h2 style={{ fontSize: 'clamp(26px, 4.5vw, 36px)', fontWeight: 900, marginBottom: 6, marginTop: 6, lineHeight: 1.2, letterSpacing: '-0.5px' }}>Quase pronto!</h2>
              <p style={{ color: colors.muted, fontSize: 14, marginBottom: 28, marginTop: 0 }}>
                Todos os campos abaixo são opcionais — podes preencher agora ou depois.
              </p>

              {/* About */}
              <div style={{ marginBottom: 28 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: colors.subtle, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 }}>Sobre ti</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <input type="text" placeholder="O teu nome próprio (ex: João)" value={answers.creator_name ?? ''} onChange={e => set('creator_name', e.target.value)} style={inputBase} {...sharedInputHandlers} />
                  <input type="text" placeholder="Curso (ex: Técnico de Informática)" value={answers.course ?? ''} onChange={e => set('course', e.target.value)} style={inputBase} {...sharedInputHandlers} />
                  <select
                    value={answers.school_year ?? ''}
                    onChange={e => set('school_year', e.target.value)}
                    style={{ ...inputBase, cursor: 'pointer', color: answers.school_year ? colors.text : colors.muted }}
                    {...sharedInputHandlers}
                  >
                    <option value="" disabled style={{ color: colors.muted }}>Ano escolar</option>
                    {SCHOOL_YEARS.map(y => <option key={y} value={y} style={{ background: colors.inputBg, color: colors.text }}>{y}</option>)}
                  </select>
                  <input type="text" placeholder="Escola (opcional)" value={answers.school ?? ''} onChange={e => set('school', e.target.value)} style={inputBase} {...sharedInputHandlers} />
                  {formGoal === 'school' && (
                    <label style={{
                      display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
                      padding: '13px 16px', background: colors.inputBg, borderRadius: 10,
                      border: `1.5px solid ${answers.is_pap ? colors.blue : colors.border}`,
                      transition: 'border-color 0.2s',
                    }}>
                      <input type="checkbox" checked={answers.is_pap ?? false} onChange={e => set('is_pap', e.target.checked)} style={{ width: 18, height: 18, accentColor: colors.blue, cursor: 'pointer' }} />
                      <span style={{ fontSize: 15 }}>Este projeto é a minha <strong>PAP</strong></span>
                    </label>
                  )}
                  {answers.is_pap && (
                    <>
                      <input type="text" placeholder="Nome do orientador" value={answers.pap_supervisor ?? ''} onChange={e => set('pap_supervisor', e.target.value)} style={inputBase} {...sharedInputHandlers} />
                      <input type="text" placeholder="Data de apresentação (ex: 15 de Junho de 2025)" value={answers.pap_date ?? ''} onChange={e => set('pap_date', e.target.value)} style={inputBase} {...sharedInputHandlers} />
                    </>
                  )}
                </div>
              </div>

              {/* Social links */}
              <div style={{ marginBottom: 28 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: colors.subtle, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 }}>Links e redes (opcional)</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <input type="url" placeholder="LinkedIn (https://linkedin.com/in/...)" value={answers.linkedin_url ?? ''} onChange={e => set('linkedin_url', e.target.value)} style={inputBase} {...sharedInputHandlers} />
                  <input type="url" placeholder="GitHub (https://github.com/...)" value={answers.github_url ?? ''} onChange={e => set('github_url', e.target.value)} style={inputBase} {...sharedInputHandlers} />
                  <input type="url" placeholder="Portfólio ou site pessoal" value={answers.portfolio_url ?? ''} onChange={e => set('portfolio_url', e.target.value)} style={inputBase} {...sharedInputHandlers} />
                </div>
              </div>

              {/* Type */}
              <div style={{ marginBottom: 28 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: colors.subtle, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 }}>Tipo de projeto</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                  {PROJECT_TYPES.map(t => {
                    const sel = answers.project_type === t.id
                    return (
                      <button
                        key={t.id}
                        onClick={() => set('project_type', sel ? null : t.id)}
                        style={{
                          background: sel ? 'rgba(27,120,247,0.1)' : colors.card,
                          border: `2px solid ${sel ? colors.blue : colors.border}`,
                          borderRadius: 10, padding: '14px 10px',
                          color: colors.text, cursor: 'pointer', textAlign: 'center',
                          transition: 'border-color 0.15s, background 0.15s',
                          fontFamily: 'inherit',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 5 }}><t.Icon size={20} color={sel ? colors.blue : colors.muted} /></div>
                        <div style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.35, color: sel ? colors.text : colors.muted }}>{t.label}</div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Image */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: colors.subtle, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 }}>Imagem de capa</div>
                {answers.cover_url && answers.cover_url !== '__uploading__' ? (
                  <div>
                    <img src={answers.cover_url} alt="" style={{ width: '100%', height: 180, objectFit: 'cover', borderRadius: 12, border: `1px solid ${colors.border}`, display: 'block' }} />
                    <button type="button" onClick={() => set('cover_url', null)} style={{ marginTop: 8, background: 'transparent', border: `1px solid ${colors.border}`, color: colors.muted, borderRadius: 8, padding: '7px 14px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
                      Remover imagem
                    </button>
                  </div>
                ) : answers.cover_url === '__uploading__' ? (
                  <div style={{ border: `2px dashed ${colors.border}`, borderRadius: 12, padding: '36px 20px', textAlign: 'center', color: colors.muted, fontSize: 13 }}>
                    A carregar…
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    style={{
                      border: `2px dashed ${dragOver ? colors.blue : colors.border}`,
                      background: dragOver ? 'rgba(27,120,247,0.06)' : 'transparent',
                      borderRadius: 12, padding: '36px 20px',
                      textAlign: 'center', cursor: 'pointer',
                      transition: 'border-color 0.2s, background 0.2s',
                    }}
                    onMouseEnter={e => { if (!dragOver) { e.currentTarget.style.borderColor = colors.blue; e.currentTarget.style.background = 'rgba(27,120,247,0.03)' }}}
                    onMouseLeave={e => { if (!dragOver) { e.currentTarget.style.borderColor = colors.border; e.currentTarget.style.background = 'transparent' }}}
                  >
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}><Camera size={28} color={dragOver ? colors.blue : colors.muted} /></div>
                    <p style={{ color: dragOver ? colors.blue : colors.muted, margin: 0, fontSize: 14, fontWeight: 500 }}>Clica ou arrasta uma imagem (opcional)</p>
                    <p style={{ color: colors.subtle, margin: '4px 0 0', fontSize: 12 }}>PNG, JPG ou WEBP · máx. 10MB</p>
                  </div>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
                {cropFile && (
                  <CropModal
                    file={cropFile}
                    aspectRatio={16 / 9}
                    onConfirm={handleCropConfirm}
                    onCancel={() => setCropFile(null)}
                  />
                )}
              </div>
            </>
          )}

          {/* Score preview */}
          {!isFinalize && estimatedScore > 0 && (
            <div style={{ marginTop: 20, padding: '14px 16px', background: colors.card, borderRadius: 12, border: `1px solid ${colors.border}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: colors.muted, fontWeight: 500 }}>Score estimado</span>
                <span style={{ fontSize: 16, fontWeight: 800, color: getScoreColor(estimatedScore), letterSpacing: '-0.3px' }}>{estimatedScore}</span>
              </div>
              <div style={{ height: 4, background: colors.border, borderRadius: 2, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 2,
                  width: `${estimatedScore}%`,
                  background: getScoreColor(estimatedScore),
                  transition: 'width 0.4s ease, background 0.3s',
                }} />
              </div>
              <p style={{ margin: '8px 0 0', fontSize: 12, color: colors.muted }}>{getMotivation(estimatedScore)}</p>
            </div>
          )}

          {error && (
            <p style={{ color: colors.red, fontSize: 14, marginTop: 12, fontWeight: 500 }}>{error}</p>
          )}

          {currentContentIssue() && (
            <div style={{
              background: 'rgba(239,68,68,0.07)',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 12, padding: '14px 16px', marginTop: 14,
              display: 'flex', alignItems: 'flex-start', gap: 12,
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                background: 'rgba(239,68,68,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <ShieldAlert size={16} color="#ef4444" />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#ef4444', marginBottom: 3 }}>
                  {currentContentIssue() === 'short' ? 'Conteúdo demasiado curto' : currentContentIssue() === 'profanity' ? 'Linguagem imprópria detetada' : 'Texto inválido detetado'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--c-muted)', lineHeight: 1.5 }}>
                  {currentContentIssue() === 'short'
                    ? 'Escreve pelo menos 20 caracteres. Palavras como "oi", "sim", "ok" não são conteúdo válido — descreve o teu projeto com detalhe.'
                    : currentContentIssue() === 'profanity'
                    ? 'Este campo contém linguagem inapropriada. A Showo é uma plataforma para estudantes — mantém o conteúdo respeitoso.'
                    : 'O texto parece aleatório ou sem sentido. Escreve conteúdo real para continuar — campos com spam não contam para o score.'
                  }
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
            {step > 0 && (
              <button
                onClick={() => setStep(n => n - 1)}
                style={{
                  background: 'transparent',
                  border: `1.5px solid ${colors.border}`,
                  color: colors.muted, borderRadius: 10,
                  padding: '12px 20px', fontSize: 15, cursor: 'pointer',
                  fontWeight: 600, fontFamily: 'inherit',
                  transition: 'border-color 0.2s',
                }}
              >
                <span style={{display:'flex',alignItems:'center',gap:6}}><ArrowLeft size={15} />Anterior</span>
              </button>
            )}
            <button
              onClick={handleNext}
              disabled={!canProceed()}
              style={{
                flex: 1,
                background: canProceed() ? `linear-gradient(135deg, ${colors.blue}, #4f46e5)` : colors.border,
                color: '#fff', border: 'none', borderRadius: 10,
                padding: '14px 24px', fontSize: 16, fontWeight: 700,
                cursor: canProceed() ? 'pointer' : 'not-allowed',
                transition: 'background 0.2s, box-shadow 0.2s',
                fontFamily: 'inherit',
                boxShadow: canProceed() ? '0 4px 20px rgba(27,120,247,0.3)' : 'none',
                letterSpacing: '-0.1px',
              }}
            >
              <span style={{display:'flex',alignItems:'center',gap:6}}>
                {step === TOTAL_STEPS - 1 ? 'Gerar página' : 'Próximo'} <ChevronRight size={15} />
              </span>
            </button>
          </div>

          {s.type === 'text' && (
            <p style={{ color: colors.subtle, fontSize: 12, marginTop: 12, textAlign: 'center', fontWeight: 500 }}>Prima Enter para avançar</p>
          )}
        </div>
      </div>
    </div>
  )
}
