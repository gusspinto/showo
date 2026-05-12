import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { generateProject } from '../lib/generateProject'
import { saveProject } from '../lib/saveProject'
import { calculateScore } from '../lib/score'
import { Toast, useToast } from '../components/Toast'
import { Navbar } from '../components/Navbar'

const colors = {
  bg: '#1c2333',
  blue: '#3b82f6',
  text: '#ffffff',
  muted: '#94a3b8',
  card: '#232d42',
  border: '#2e3a54',
  inputBg: '#1a2235',
  green: '#22c55e',
  yellow: '#eab308',
  orange: '#f97316',
}

const inputBase = {
  width: '100%', background: '#1a2235', border: '2px solid #2e3a54',
  borderRadius: 10, color: '#ffffff', fontSize: 15, padding: '13px 16px',
  outline: 'none', fontFamily: 'system-ui, sans-serif', boxSizing: 'border-box',
  transition: 'border-color 0.2s',
}

const GOAL_OPTIONS = [
  { id: 'school',     icon: '🎓', title: 'Apresentar um projeto escolar', subtitle: 'PAP, trabalho de grupo ou apresentação' },
  { id: 'internship', icon: '💼', title: 'Conseguir um estágio',           subtitle: 'Mostra o teu trabalho a recrutadores' },
  { id: 'show',       icon: '🚀', title: 'Mostrar o meu projeto',          subtitle: 'Partilha o que construíste com o mundo' },
  { id: 'clients',    icon: '👥', title: 'Conseguir clientes',             subtitle: 'Transforma projetos em prova profissional' },
]

const SCHOOL_YEARS = ['10º ano', '11º ano', '12º ano', 'Licenciatura', 'Mestrado', 'Outro']

const PROJECT_TYPES = [
  { id: 'group',        icon: '📋', label: 'Trabalho de grupo' },
  { id: 'pap',          icon: '🎓', label: 'PAP / Projeto final' },
  { id: 'presentation', icon: '📊', label: 'Apresentação' },
  { id: 'personal',     icon: '💻', label: 'Projeto pessoal' },
  { id: 'competition',  icon: '🏆', label: 'Projeto de competição' },
  { id: 'other',        icon: '✨', label: 'Outro' },
]

// 10 steps total
// types: dual_text | text | textarea | dual_textarea | finalize
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

const TOTAL_STEPS = STEPS.length // 10

const GOAL_LABELS = {
  school: '📝 Projeto escolar', internship: '💼 Para recrutadores',
  show: '🚀 Partilha pública', clients: '🤝 Prova profissional',
}

function getScoreColor(s) {
  if (s > 80) return colors.green
  if (s >= 60) return colors.orange
  if (s >= 40) return colors.yellow
  return colors.blue
}

function getMotivation(s) {
  if (s > 80) return 'Excelente! 🏆'
  if (s >= 60) return 'Quase lá! ⭐'
  if (s >= 40) return 'Bom progresso! 🔥'
  return 'Continua! Estás a começar 💪'
}

async function resizeImage(file, maxWidth = 1200) {
  return new Promise(resolve => {
    const reader = new FileReader()
    reader.onload = e => {
      const img = new Image()
      img.onload = () => {
        const ratio = Math.min(maxWidth / img.width, 1)
        const canvas = document.createElement('canvas')
        canvas.width = img.width * ratio
        canvas.height = img.height * ratio
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', 0.82))
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  })
}

export default function NewProject() {
  const navigate = useNavigate()
  const [phase, setPhase] = useState('goal') // 'goal' | 'form' | 'generating' | 'success'
  const [formGoal, setFormGoal] = useState(null)
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState({})
  const [error, setError] = useState(null)
  const [savedProject, setSavedProject] = useState(null)
  const [copiedLink, setCopiedLink] = useState(null)
  const { toast, show: showToast } = useToast()
  const fileInputRef = useRef(null)

  const progress = phase === 'goal' ? 0 : ((step + 1) / TOTAL_STEPS) * 100
  const estimatedScore = calculateScore(answers).score
  const s = STEPS[step] ?? STEPS[0]

  function set(key, val) {
    setAnswers(p => ({ ...p, [key]: val }))
  }

  function canProceed() {
    if (phase === 'goal') return !!formGoal
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
    if (step < TOTAL_STEPS - 1) { setStep(n => n + 1); return }

    setPhase('generating')
    setError(null)
    try {
      const aiResult = await generateProject(answers)
      const project = await saveProject(answers, aiResult)
      localStorage.setItem(`edit_token_${project.slug}`, project.edit_token)
      setSavedProject(project)
      setPhase('success')
    } catch (err) {
      console.error(err)
      setError('Ocorreu um erro. Tenta novamente.')
      setPhase('form')
      showToast('Erro ao gerar o projeto. Tenta novamente.', 'error')
    }
  }

  async function handleImageUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 8 * 1024 * 1024) { showToast('Imagem demasiado grande (máx. 8MB)', 'error'); return }
    try {
      const base64 = await resizeImage(file)
      set('cover_url', base64)
      showToast('Imagem adicionada! ✓')
    } catch { showToast('Erro ao processar a imagem', 'error') }
  }

  // ── GOAL ─────────────────────────────────────────────────
  if (phase === 'goal') {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: colors.bg, color: colors.text, fontFamily: 'system-ui, sans-serif', display: 'flex', flexDirection: 'column' }}>
        <Navbar showLinks={false} />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
          <div style={{ width: '100%', maxWidth: 560 }}>
            <h2 style={{ fontSize: 'clamp(24px, 4vw, 34px)', fontWeight: 800, marginBottom: 8, textAlign: 'center', marginTop: 0 }}>
              O que pretendes alcançar?
            </h2>
            <p style={{ color: colors.muted, textAlign: 'center', marginBottom: 32, fontSize: 16 }}>
              Escolhe o teu objetivo para personalizarmos a experiência
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 24 }}>
              {GOAL_OPTIONS.map(opt => {
                const sel = formGoal === opt.id
                return (
                  <button
                    key={opt.id}
                    onClick={() => setFormGoal(opt.id)}
                    style={{ background: sel ? 'rgba(59,130,246,0.12)' : colors.card, border: `2px solid ${sel ? colors.blue : colors.border}`, borderRadius: 16, padding: '20px 16px', color: colors.text, cursor: 'pointer', textAlign: 'left', transition: 'border-color 0.15s, background 0.15s' }}
                  >
                    <div style={{ fontSize: 26, marginBottom: 8 }}>{opt.icon}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{opt.title}</div>
                    <div style={{ fontSize: 12, color: colors.muted, lineHeight: 1.4 }}>{opt.subtitle}</div>
                  </button>
                )
              })}
            </div>
            <button
              onClick={handleNext}
              disabled={!formGoal}
              style={{ width: '100%', background: formGoal ? colors.blue : colors.border, color: '#fff', border: 'none', borderRadius: 12, padding: '15px 0', fontSize: 17, fontWeight: 700, cursor: formGoal ? 'pointer' : 'not-allowed', transition: 'background 0.2s' }}
            >
              Continuar →
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
      <div style={{ minHeight: '100vh', backgroundColor: colors.bg, color: colors.text, fontFamily: 'system-ui, sans-serif', display: 'flex', flexDirection: 'column' }}>
        <Navbar showLinks={false} />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
          <div style={{ width: '100%', maxWidth: 560 }}>
            <div style={{ textAlign: 'center', marginBottom: 36 }}>
              <div style={{ fontSize: 52, marginBottom: 12 }}>🎉</div>
              <h2 style={{ fontSize: 'clamp(24px, 4vw, 32px)', fontWeight: 800, margin: '0 0 8px' }}>O teu projeto está pronto!</h2>
              <p style={{ color: colors.muted, margin: 0, fontSize: 15 }}>Guarda o link de edição — só tu o tens.</p>
            </div>

            {/* Project link */}
            <div style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 14, padding: '20px 24px', marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Link do projeto</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1, background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 8, padding: '10px 12px', fontSize: 13, color: colors.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{projectUrl}</div>
                <button
                  onClick={() => copyLink(projectUrl, 'project')}
                  style={{ background: copiedLink === 'project' ? colors.green : colors.blue, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'background 0.2s' }}
                >
                  {copiedLink === 'project' ? '✓ Copiado' : 'Copiar'}
                </button>
              </div>
            </div>

            {/* Edit link */}
            <div style={{ background: 'rgba(234,179,8,0.06)', border: '1px solid rgba(234,179,8,0.25)', borderRadius: 14, padding: '20px 24px', marginBottom: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 16 }}>🔐</span>
                <div style={{ fontSize: 12, fontWeight: 700, color: colors.yellow, textTransform: 'uppercase', letterSpacing: 0.5 }}>Teu link privado de edição</div>
              </div>
              <p style={{ margin: '0 0 12px', fontSize: 13, color: colors.muted, lineHeight: 1.5 }}>Guarda este link. É o único modo de editar o teu projeto — não o partilhes.</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1, background: colors.bg, border: `1px solid rgba(234,179,8,0.2)`, borderRadius: 8, padding: '10px 12px', fontSize: 13, color: colors.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{editUrl}</div>
                <button
                  onClick={() => copyLink(editUrl, 'edit')}
                  style={{ background: copiedLink === 'edit' ? colors.green : colors.yellow, color: '#1c2333', border: 'none', borderRadius: 8, padding: '10px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'background 0.2s' }}
                >
                  {copiedLink === 'edit' ? '✓ Copiado' : 'Copiar'}
                </button>
              </div>
            </div>

            <button
              onClick={() => navigate(`/projeto/${savedProject.slug}`)}
              style={{ width: '100%', background: colors.blue, color: '#fff', border: 'none', borderRadius: 12, padding: '15px 0', fontSize: 17, fontWeight: 700, cursor: 'pointer' }}
            >
              Ver o meu projeto →
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── GENERATING ────────────────────────────────────────────
  if (phase === 'generating') {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: colors.bg, color: colors.text, fontFamily: 'system-ui, sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
        <div style={{ width: 60, height: 60, border: `4px solid ${colors.border}`, borderTop: `4px solid ${colors.blue}`, borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <p style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>✨ A IA está a analisar o teu projeto...</p>
        <p style={{ color: colors.muted, fontSize: 15, margin: 0 }}>Isto pode demorar alguns segundos</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  // ── FORM ─────────────────────────────────────────────────
  const isFinalize = s.type === 'finalize'

  return (
    <div style={{ minHeight: '100vh', backgroundColor: colors.bg, color: colors.text, fontFamily: 'system-ui, sans-serif', display: 'flex', flexDirection: 'column' }}>
      <Toast {...toast} />

      <Navbar showLinks={false}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {formGoal && (
            <span style={{ fontSize: 11, color: colors.blue, background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 999, padding: '3px 10px', fontWeight: 600 }}>
              {GOAL_LABELS[formGoal]}
            </span>
          )}
          <span style={{ color: colors.muted, fontSize: 14 }}>{step + 1}/{TOTAL_STEPS}</span>
        </div>
      </Navbar>

      <div style={{ height: 3, background: colors.border }}>
        <div style={{ height: '100%', width: `${progress}%`, background: colors.blue, transition: 'width 0.4s ease' }} />
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '44px 24px 40px', overflowY: 'auto' }}>
        <div style={{ width: '100%', maxWidth: 600 }}>

          <div style={{ fontSize: 11, color: colors.blue, fontWeight: 700, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>
            {isFinalize ? 'Finalizar' : `Passo ${step + 1} de ${TOTAL_STEPS}`}
          </div>

          {/* ── dual_text ── */}
          {s.type === 'dual_text' && (
            <>
              <h2 style={{ fontSize: 'clamp(22px, 4vw, 30px)', fontWeight: 700, marginBottom: 24, marginTop: 6, lineHeight: 1.3 }}>{s.label}</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {s.keys.map((key, i) => (
                  <div key={key}>
                    <label style={{ display: 'block', fontSize: 13, color: colors.muted, fontWeight: 600, marginBottom: 6 }}>{s.labels[i]}</label>
                    <input
                      type="text"
                      value={answers[key] ?? ''}
                      onChange={e => set(key, e.target.value)}
                      onKeyDown={i === s.keys.length - 1 ? handleKeyDown : undefined}
                      placeholder={s.placeholders[i]}
                      autoFocus={i === 0}
                      style={{ ...inputBase, fontSize: 17 }}
                      onFocus={e => (e.target.style.borderColor = colors.blue)}
                      onBlur={e => (e.target.style.borderColor = colors.border)}
                    />
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── text ── */}
          {s.type === 'text' && (
            <>
              <h2 style={{ fontSize: 'clamp(22px, 4vw, 30px)', fontWeight: 700, marginBottom: 24, marginTop: 6, lineHeight: 1.3 }}>{s.label}</h2>
              <input
                key={s.key}
                type="text"
                value={answers[s.key] ?? ''}
                onChange={e => set(s.key, e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={s.placeholder}
                autoFocus
                style={{ ...inputBase, fontSize: 18, padding: '15px 16px' }}
                onFocus={e => (e.target.style.borderColor = colors.blue)}
                onBlur={e => (e.target.style.borderColor = colors.border)}
              />
            </>
          )}

          {/* ── textarea ── */}
          {s.type === 'textarea' && (
            <>
              <h2 style={{ fontSize: 'clamp(22px, 4vw, 30px)', fontWeight: 700, marginBottom: 24, marginTop: 6, lineHeight: 1.3 }}>{s.label}</h2>
              <textarea
                key={s.key}
                value={answers[s.key] ?? ''}
                onChange={e => set(s.key, e.target.value)}
                placeholder={s.placeholder}
                rows={5}
                autoFocus
                style={{ ...inputBase, fontSize: 16, padding: '14px 16px', resize: 'vertical', lineHeight: 1.6, border: '2px solid #2e3a54' }}
                onFocus={e => (e.target.style.borderColor = colors.blue)}
                onBlur={e => (e.target.style.borderColor = colors.border)}
              />
            </>
          )}

          {/* ── dual_textarea ── */}
          {s.type === 'dual_textarea' && (
            <>
              <h2 style={{ fontSize: 'clamp(22px, 4vw, 30px)', fontWeight: 700, marginBottom: 24, marginTop: 6, lineHeight: 1.3 }}>{s.label}</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {s.keys.map((key, i) => (
                  <div key={key}>
                    <label style={{ display: 'block', fontSize: 13, color: colors.muted, fontWeight: 600, marginBottom: 6 }}>{s.labels[i]}</label>
                    <textarea
                      value={answers[key] ?? ''}
                      onChange={e => set(key, e.target.value)}
                      placeholder={s.placeholders[i]}
                      rows={4}
                      autoFocus={i === 0}
                      style={{ ...inputBase, fontSize: 15, resize: 'vertical', lineHeight: 1.6, border: '2px solid #2e3a54' }}
                      onFocus={e => (e.target.style.borderColor = colors.blue)}
                      onBlur={e => (e.target.style.borderColor = colors.border)}
                    />
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── finalize ── */}
          {isFinalize && (
            <>
              <h2 style={{ fontSize: 'clamp(22px, 4vw, 30px)', fontWeight: 700, marginBottom: 6, marginTop: 6, lineHeight: 1.3 }}>Quase pronto!</h2>
              <p style={{ color: colors.muted, fontSize: 15, marginBottom: 28, marginTop: 0 }}>
                Todos os campos abaixo são opcionais — podes preencher agora ou depois.
              </p>

              {/* About */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>Sobre ti</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <input type="text" placeholder="O teu nome próprio (ex: João)" value={answers.creator_name ?? ''} onChange={e => set('creator_name', e.target.value)} style={inputBase} />
                  <input type="text" placeholder="Curso (ex: Técnico de Informática)" value={answers.course ?? ''} onChange={e => set('course', e.target.value)} style={inputBase} />
                  <select
                    value={answers.school_year ?? ''}
                    onChange={e => set('school_year', e.target.value)}
                    style={{ ...inputBase, cursor: 'pointer', color: answers.school_year ? '#fff' : colors.muted }}
                  >
                    <option value="" disabled style={{ color: colors.muted }}>Ano escolar</option>
                    {SCHOOL_YEARS.map(y => <option key={y} value={y} style={{ background: '#1a2235', color: '#fff' }}>{y}</option>)}
                  </select>
                  <input type="text" placeholder="Escola (opcional)" value={answers.school ?? ''} onChange={e => set('school', e.target.value)} style={inputBase} />
                  {formGoal === 'school' && (
                    <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', padding: '13px 16px', background: colors.inputBg, borderRadius: 10, border: `1px solid ${answers.is_pap ? colors.blue : colors.border}` }}>
                      <input type="checkbox" checked={answers.is_pap ?? false} onChange={e => set('is_pap', e.target.checked)} style={{ width: 18, height: 18, accentColor: colors.blue, cursor: 'pointer' }} />
                      <span style={{ fontSize: 15 }}>Este projeto é a minha <strong>PAP</strong> 🎓</span>
                    </label>
                  )}
                  {answers.is_pap && (
                    <>
                      <input type="text" placeholder="Nome do orientador" value={answers.pap_supervisor ?? ''} onChange={e => set('pap_supervisor', e.target.value)} style={inputBase} />
                      <input type="text" placeholder="Data de apresentação (ex: 15 de Junho de 2025)" value={answers.pap_date ?? ''} onChange={e => set('pap_date', e.target.value)} style={inputBase} />
                    </>
                  )}
                </div>
              </div>

              {/* Social links */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>Links e redes (opcional)</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <input type="url" placeholder="LinkedIn (https://linkedin.com/in/...)" value={answers.linkedin_url ?? ''} onChange={e => set('linkedin_url', e.target.value)} style={inputBase} />
                  <input type="url" placeholder="GitHub (https://github.com/...)" value={answers.github_url ?? ''} onChange={e => set('github_url', e.target.value)} style={inputBase} />
                  <input type="url" placeholder="Portfólio ou site pessoal" value={answers.portfolio_url ?? ''} onChange={e => set('portfolio_url', e.target.value)} style={inputBase} />
                </div>
              </div>

              {/* Type */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>Tipo de projeto</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                  {PROJECT_TYPES.map(t => {
                    const sel = answers.project_type === t.id
                    return (
                      <button
                        key={t.id}
                        onClick={() => set('project_type', sel ? null : t.id)}
                        style={{ background: sel ? 'rgba(59,130,246,0.12)' : colors.card, border: `2px solid ${sel ? colors.blue : colors.border}`, borderRadius: 10, padding: '14px 10px', color: colors.text, cursor: 'pointer', textAlign: 'center', transition: 'border-color 0.15s' }}
                      >
                        <div style={{ fontSize: 20, marginBottom: 4 }}>{t.icon}</div>
                        <div style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.3 }}>{t.label}</div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Image */}
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>Imagem de capa</div>
                {answers.cover_url ? (
                  <div>
                    <img src={answers.cover_url} alt="" style={{ width: '100%', height: 180, objectFit: 'cover', borderRadius: 10, border: `1px solid ${colors.border}`, display: 'block' }} />
                    <button onClick={() => set('cover_url', null)} style={{ marginTop: 8, background: 'transparent', border: `1px solid ${colors.border}`, color: colors.muted, borderRadius: 8, padding: '7px 14px', fontSize: 13, cursor: 'pointer' }}>
                      Remover imagem
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    style={{ border: `2px dashed ${colors.border}`, borderRadius: 10, padding: '32px 20px', textAlign: 'center', cursor: 'pointer', transition: 'border-color 0.2s' }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = colors.blue)}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = colors.border)}
                  >
                    <div style={{ fontSize: 28, marginBottom: 8 }}>📷</div>
                    <p style={{ color: colors.muted, margin: 0, fontSize: 14 }}>Clica para escolher uma imagem (opcional)</p>
                  </div>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
              </div>
            </>
          )}

          {/* Score preview (not on finalize) */}
          {!isFinalize && estimatedScore > 0 && (
            <div style={{ marginTop: 18, padding: '13px 16px', background: colors.card, borderRadius: 10, border: `1px solid ${colors.border}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
                <span style={{ fontSize: 13, color: colors.muted }}>Score estimado</span>
                <span style={{ fontSize: 16, fontWeight: 800, color: getScoreColor(estimatedScore) }}>{estimatedScore}</span>
              </div>
              <div style={{ height: 4, background: colors.border, borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 2, width: `${estimatedScore}%`, background: getScoreColor(estimatedScore), transition: 'width 0.4s ease, background 0.3s' }} />
              </div>
              <p style={{ margin: '7px 0 0', fontSize: 12, color: colors.muted }}>{getMotivation(estimatedScore)}</p>
            </div>
          )}

          {error && <p style={{ color: '#f87171', fontSize: 14, marginTop: 12 }}>{error}</p>}

          {/* Navigation */}
          <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
            {step > 0 && (
              <button
                onClick={() => setStep(n => n - 1)}
                style={{ background: 'transparent', border: `2px solid ${colors.border}`, color: colors.muted, borderRadius: 10, padding: '12px 20px', fontSize: 15, cursor: 'pointer', fontWeight: 600 }}
              >
                ← Anterior
              </button>
            )}
            <button
              onClick={handleNext}
              disabled={!canProceed()}
              style={{ flex: 1, background: canProceed() ? colors.blue : colors.border, color: '#fff', border: 'none', borderRadius: 10, padding: '14px 24px', fontSize: 16, fontWeight: 700, cursor: canProceed() ? 'pointer' : 'not-allowed', transition: 'background 0.2s' }}
            >
              {step === TOTAL_STEPS - 1 ? 'Gerar página →' : 'Próximo →'}
            </button>
          </div>

          {s.type === 'text' && (
            <p style={{ color: colors.muted, fontSize: 13, marginTop: 14, textAlign: 'center' }}>Prima Enter para avançar</p>
          )}
        </div>
      </div>
    </div>
  )
}
