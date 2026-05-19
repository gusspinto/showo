import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { saveProject } from '../lib/saveProject'
import { AlertTriangle } from 'lucide-react'

const C = {
  bg:     '#0d1424',
  card:   '#111c32',
  border: '#1e3050',
  bright: '#2a4275',
  blue:   '#1b78f7',
  text:   '#e8f2ff',
  muted:  '#7d93b0',
  subtle: '#3d5270',
}

const TYPE_LABELS = {
  pap:         'PAP',
  internship:  'Estágio',
  group:       'Grupo',
  personal:    'Pessoal',
  competition: 'Competição',
}

const TYPE_COLORS = {
  pap:         ['#6366f1', '#4f46e5'],
  internship:  ['#10b981', '#059669'],
  group:       ['#f59e0b', '#d97706'],
  personal:    ['#1b78f7', '#4f46e5'],
  competition: ['#ef4444', '#dc2626'],
}

function ScoreBar({ score }) {
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 11, color: C.muted, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Score estimado</span>
        <span style={{ fontSize: 13, fontWeight: 800, color: score > 60 ? '#10b981' : score > 30 ? '#f59e0b' : C.muted }}>{score}%</span>
      </div>
      <div style={{ height: 4, borderRadius: 99, background: C.border, overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 99,
          background: score > 60 ? 'linear-gradient(90deg, #10b981, #34d399)' : score > 30 ? 'linear-gradient(90deg, #f59e0b, #fbbf24)' : 'linear-gradient(90deg, #1b78f7, #818cf8)',
          width: `${score}%`, transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)',
        }} />
      </div>
    </div>
  )
}

function LivePreview({ projectType, answers, currentField, currentValue }) {
  const [c1, c2] = TYPE_COLORS[projectType] ?? ['#1b78f7', '#4f46e5']
  const display = { ...answers }
  if (currentField && currentValue) display[currentField] = currentValue

  const name = display.name || ''
  const techs = display.technologies ? display.technologies.split(/[,;]+/).map(t => t.trim()).filter(Boolean) : []
  const problem = display.problem || ''
  const solution = display.solution || ''
  const results = display.results || ''

  const filledFields = Object.values(display).filter(v => v && v.trim()).length
  const score = Math.min(95, Math.round((filledFields / 8) * 100))

  return (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`,
      borderRadius: 20, overflow: 'hidden',
      boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
    }}>
      {/* Cover gradient */}
      <div style={{
        height: 90, background: `linear-gradient(135deg, ${c1}22, ${c2}44)`,
        borderBottom: `1px solid ${C.border}`,
        display: 'flex', alignItems: 'flex-end', padding: '0 20px 14px',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -20, right: -20, width: 120, height: 120, borderRadius: '50%', background: `radial-gradient(ellipse, ${c1}33, transparent 70%)` }} />
        <div style={{
          background: `linear-gradient(135deg, ${c1}, ${c2})`,
          color: '#fff', borderRadius: 8, padding: '4px 12px',
          fontSize: 11, fontWeight: 800, letterSpacing: '0.06em',
        }}>
          {TYPE_LABELS[projectType] ?? 'PROJETO'}
        </div>
      </div>

      <div style={{ padding: '18px 20px' }}>
        {name ? (
          <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 800, color: C.text, letterSpacing: '-0.3px', lineHeight: 1.2 }}>{name}</h3>
        ) : (
          <div style={{ height: 22, width: '70%', background: C.border, borderRadius: 6, marginBottom: 8, animation: 'pulse-p 1.8s ease-in-out infinite' }} />
        )}

        {techs.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
            {techs.slice(0, 5).map(t => (
              <span key={t} style={{ background: `${c1}18`, border: `1px solid ${c1}33`, color: c1, borderRadius: 6, padding: '2px 9px', fontSize: 11, fontWeight: 600 }}>{t}</span>
            ))}
          </div>
        )}

        {(problem || solution || results) ? (
          <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, marginBottom: 14 }}>
            {problem && <p style={{ margin: '0 0 6px' }}>{problem.slice(0, 120)}{problem.length > 120 ? '…' : ''}</p>}
            {solution && !problem && <p style={{ margin: 0 }}>{solution.slice(0, 120)}{solution.length > 120 ? '…' : ''}</p>}
          </div>
        ) : (
          <div style={{ marginBottom: 14 }}>
            <div style={{ height: 12, background: C.border, borderRadius: 4, marginBottom: 6, animation: 'pulse-p 1.8s ease-in-out infinite' }} />
            <div style={{ height: 12, width: '80%', background: C.border, borderRadius: 4, animation: 'pulse-p 1.8s ease-in-out infinite 0.3s' }} />
          </div>
        )}

        <ScoreBar score={score} />
      </div>
    </div>
  )
}

export default function AIInterview() {
  const navigate   = useNavigate()
  const location   = useLocation()
  const { type: projectType = 'personal', description = '' } = location.state ?? {}

  const [phase,        setPhase]        = useState('loading')   // loading | interview | generating | error
  const [understanding,setUnderstanding]= useState('')
  const [questions,    setQuestions]    = useState([])
  const [currentQ,     setCurrentQ]     = useState(0)
  const [answers,      setAnswers]      = useState({})
  const [inputValue,   setInputValue]   = useState('')
  const [history,      setHistory]      = useState([])          // [{question, answer}]
  const [errorMsg,     setErrorMsg]     = useState('')
  const [currentValue, setCurrentValue] = useState('')

  const inputRef  = useRef(null)
  const bottomRef = useRef(null)

  // Load questions from AI
  useEffect(() => {
    async function load() {
      try {
        const { data, error } = await supabase.functions.invoke('interview-project', {
          body: { description, projectType },
        })
        if (error) throw error
        setUnderstanding(data.understanding ?? '')
        setQuestions(data.questions ?? [])
        setPhase('interview')
      } catch (e) {
        console.error(e)
        setErrorMsg('Erro ao carregar a entrevista. Tenta novamente.')
        setPhase('error')
      }
    }
    load()
  }, [])

  useEffect(() => {
    if (phase === 'interview') {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [phase, currentQ])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [history, currentQ])

  function submitAnswer(val) {
    const trimmed = val.trim()
    const q = questions[currentQ]
    if (!q) return

    const newAnswers = { ...answers, [q.field]: trimmed }
    setAnswers(newAnswers)
    setHistory(h => [...h, { label: q.label, question: q.question, answer: trimmed || '(pulado)' }])
    setInputValue('')
    setCurrentValue('')

    if (currentQ + 1 < questions.length) {
      setCurrentQ(i => i + 1)
    } else {
      generateAndSave(newAnswers)
    }
  }

  async function generateAndSave(finalAnswers) {
    setPhase('generating')
    try {
      // Merge description + interview answers into project fields
      const formData = {
        name:            finalAnswers.name            || '',
        area:            finalAnswers.area            || guessArea(description, projectType),
        goal:            description                  || '',
        problem:         finalAnswers.problem         || '',
        solution:        finalAnswers.solution        || '',
        target_audience: finalAnswers.target_audience || guessAudience(projectType),
        features:        finalAnswers.features        || '',
        technologies:    finalAnswers.technologies    || '',
        challenges:      finalAnswers.challenges      || '',
        results:         finalAnswers.results         || '',
        learnings:       finalAnswers.learnings       || '',
        school:          finalAnswers.school          || '',
        course:          finalAnswers.course          || '',
        pap_supervisor:  finalAnswers.pap_supervisor  || '',
        creator_name:    finalAnswers.creator_name    || '',
        project_type:    projectType,
        is_pap:          projectType === 'pap',
      }

      // Generate AI tagline + description + highlights (non-fatal if it fails)
      let aiResult = {}
      try {
        const { data: aiData, error: aiErr } = await supabase.functions.invoke('generate-project', {
          body: formData,
        })
        if (!aiErr && aiData) aiResult = aiData
        else if (aiErr) console.warn('generate-project error (non-fatal):', aiErr)
      } catch (aiEx) {
        console.warn('generate-project threw (non-fatal):', aiEx)
      }

      // Get current user (optional, safe)
      let userId = null
      try {
        const { data: authData } = await supabase.auth.getUser()
        userId = authData?.user?.id ?? null
      } catch {}

      // Save project
      const project = await saveProject(formData, {
        tagline:     aiResult?.tagline     ?? null,
        description: aiResult?.description ?? null,
        highlights:  aiResult?.highlights  ?? null,
      }, userId)

      // Navigate to project page with edit token
      navigate(`/projeto/${project.slug}`, {
        state: { edit_token: project.edit_token, justCreated: true },
        replace: true,
      })
    } catch (e) {
      console.error('generateAndSave failed:', e)
      setErrorMsg(`Erro ao guardar o projeto: ${e?.message || String(e)}`)
      setPhase('error')
    }
  }

  function guessArea(desc, type) {
    const d = (desc || '').toLowerCase()
    if (d.includes('mobile') || d.includes('app') || d.includes('android') || d.includes('ios')) return 'Mobile'
    if (d.includes('web') || d.includes('site') || d.includes('plataforma')) return 'Web'
    if (d.includes('ia') || d.includes('ai') || d.includes('machine learning') || d.includes('inteligência')) return 'IA / Machine Learning'
    if (d.includes('jogo') || d.includes('game') || d.includes('unity')) return 'Game Dev'
    if (d.includes('dados') || d.includes('data') || d.includes('análise')) return 'Data Science'
    if (type === 'internship') return 'Desenvolvimento de Software'
    return 'Tecnologia'
  }

  function guessAudience(type) {
    if (type === 'pap') return 'Júri de avaliação, professores, futuros empregadores'
    if (type === 'internship') return 'Equipa de desenvolvimento, gestores de projeto'
    return ''
  }

  const progress = questions.length > 0
    ? Math.round(((currentQ + (phase === 'generating' || phase === 'done' ? 1 : 0)) / questions.length) * 100)
    : 0

  const q = questions[currentQ]

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: 'var(--font-body)', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        @keyframes pulse-p { 0%,100%{opacity:0.4} 50%{opacity:0.7} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes fadeSlideUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes glow { 0%,100%{opacity:0.4} 50%{opacity:0.8} }
        .sug-chip { transition: all 0.12s !important; cursor: pointer; }
        .sug-chip:hover { background: rgba(27,120,247,0.15) !important; border-color: #1b78f7 !important; color: #e8f2ff !important; }
        .skip-btn { transition: all 0.12s !important; cursor: pointer; }
        .skip-btn:hover { color: #e8f2ff !important; }
        .send-btn:hover { background: #1564d4 !important; }
        .send-btn { transition: background 0.12s !important; }
        @media (max-width: 900px) { .iv-preview { display: none !important; } }
        @media (max-width: 600px) { .iv-main { padding: 0 16px 32px !important; } .iv-header { padding: 16px 16px 0 !important; } }
      `}</style>

      {/* Progress bar */}
      <div style={{ height: 3, background: C.border, position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100 }}>
        <div style={{
          height: '100%', background: 'linear-gradient(90deg, #1b78f7, #818cf8)',
          width: `${phase === 'loading' ? 10 : phase === 'generating' ? 95 : progress}%`,
          transition: 'width 0.5s cubic-bezier(0.4,0,0.2,1)',
        }} />
      </div>

      {/* Header */}
      <div className="iv-header" style={{ padding: '24px 32px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button
          onClick={() => navigate('/')}
          style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 14, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6, padding: 0 }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
          Voltar
        </button>
        {questions.length > 0 && phase === 'interview' && (
          <span style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>
            {currentQ + 1} / {questions.length}
          </span>
        )}
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', gap: 32, padding: '0 32px 48px', maxWidth: 1100, margin: '0 auto', width: '100%', boxSizing: 'border-box', alignItems: 'flex-start' }}>

        {/* Left: interview */}
        <div className="iv-main" style={{ flex: 1, minWidth: 0, paddingTop: 40 }}>

          {/* Loading */}
          {phase === 'loading' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 320, gap: 20, animation: 'fadeIn 0.4s ease' }}>
              <div style={{
                width: 56, height: 56, borderRadius: 16,
                background: 'linear-gradient(135deg, #1b78f7, #818cf8)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 8px 32px rgba(27,120,247,0.35)',
                animation: 'glow 2s ease-in-out infinite',
              }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: C.text }}>A analisar o teu projeto...</p>
                <p style={{ margin: '6px 0 0', fontSize: 14, color: C.muted }}>A IA está a preparar as perguntas certas para ti</p>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#1b78f7', animation: `glow 1.2s ease-in-out ${i * 0.4}s infinite` }} />
                ))}
              </div>
            </div>
          )}

          {/* Error */}
          {phase === 'error' && (
            <div style={{ textAlign: 'center', paddingTop: 80, animation: 'fadeIn 0.4s ease' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16, color: '#f87171' }}><AlertTriangle size={36} /></div>
              <p style={{ color: '#f87171', fontSize: 15, marginBottom: 8, maxWidth: 400, margin: '0 auto 8px' }}>{errorMsg}</p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 24, flexWrap: 'wrap' }}>
                <button
                  onClick={() => generateAndSave(answers)}
                  style={{ background: C.blue, color: '#fff', border: 'none', borderRadius: 12, padding: '10px 24px', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}
                >
                  Tentar novamente
                </button>
                <button
                  onClick={() => navigate('/novo')}
                  style={{ background: 'transparent', color: C.muted, border: `1px solid ${C.border}`, borderRadius: 12, padding: '10px 24px', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}
                >
                  Usar formulário manual
                </button>
              </div>
            </div>
          )}

          {/* Generating */}
          {phase === 'generating' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 320, gap: 20, animation: 'fadeIn 0.4s ease' }}>
              <div style={{
                width: 72, height: 72, borderRadius: 20,
                background: 'linear-gradient(135deg, #1b78f7, #818cf8)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 8px 48px rgba(27,120,247,0.4)',
              }}>
                <div style={{ width: 30, height: 30, border: '3px solid rgba(255,255,255,0.3)', borderTop: '3px solid #fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: C.text, letterSpacing: '-0.3px' }}>A construir o teu perfil...</p>
                <p style={{ margin: '8px 0 0', fontSize: 14, color: C.muted, lineHeight: 1.6 }}>
                  A IA está a gerar a tua tagline, descrição<br/>e destaques profissionais
                </p>
              </div>
            </div>
          )}

          {/* Interview */}
          {phase === 'interview' && (
            <div style={{ animation: 'fadeIn 0.4s ease' }}>
              {/* Understanding card */}
              {understanding && (
                <div style={{
                  background: 'linear-gradient(135deg, rgba(27,120,247,0.08), rgba(129,140,248,0.06))',
                  border: '1px solid rgba(27,120,247,0.2)',
                  borderRadius: 16, padding: '16px 20px', marginBottom: 36,
                  animation: 'fadeSlideUp 0.5s ease',
                }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                      background: 'linear-gradient(135deg, #1b78f7, #818cf8)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
                    </div>
                    <p style={{ margin: 0, fontSize: 14, color: C.text, lineHeight: 1.65, fontStyle: 'italic' }}>"{understanding}"</p>
                  </div>
                </div>
              )}

              {/* History */}
              {history.map((item, i) => (
                <div key={i} style={{ marginBottom: 28, animation: 'fadeSlideUp 0.3s ease' }}>
                  <p style={{ margin: '0 0 6px', fontSize: 12, color: C.subtle, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{item.label}</p>
                  <p style={{ margin: '0 0 4px', fontSize: 14, color: C.muted }}>{item.question}</p>
                  <div style={{
                    background: C.card, border: `1px solid ${C.border}`,
                    borderRadius: 12, padding: '10px 14px',
                    fontSize: 15, color: C.text, fontWeight: 500,
                  }}>
                    {item.answer}
                  </div>
                </div>
              ))}

              {/* Current question */}
              {q && (
                <div key={currentQ} style={{ animation: 'fadeSlideUp 0.4s ease' }}>
                  <p style={{ margin: '0 0 6px', fontSize: 12, color: C.blue, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{q.label}</p>
                  <p style={{ margin: '0 0 16px', fontSize: 20, fontWeight: 700, color: C.text, lineHeight: 1.4, letterSpacing: '-0.2px' }}>{q.question}</p>

                  {/* Suggestions */}
                  {q.suggestions?.length > 0 && (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                      {q.suggestions.map(s => (
                        <button
                          key={s}
                          type="button"
                          className="sug-chip"
                          onClick={() => {
                            const v = inputValue ? `${inputValue}, ${s}` : s
                            setInputValue(v)
                            setCurrentValue(v)
                            inputRef.current?.focus()
                          }}
                          style={{
                            background: 'rgba(27,120,247,0.07)', border: `1px solid ${C.border}`,
                            color: C.muted, borderRadius: 999, padding: '5px 14px',
                            fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
                          }}
                        >
                          + {s}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Input */}
                  <div style={{
                    display: 'flex', gap: 10, alignItems: 'flex-end',
                    background: '#111c32', border: `1.5px solid ${C.bright}`,
                    borderRadius: 14, padding: '8px 8px 8px 16px',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
                  }}
                    onFocusCapture={e => e.currentTarget.style.borderColor = C.blue}
                    onBlurCapture={e => { if (!e.currentTarget.contains(e.relatedTarget)) e.currentTarget.style.borderColor = C.bright }}
                  >
                    <textarea
                      ref={inputRef}
                      value={inputValue}
                      onChange={e => { setInputValue(e.target.value); setCurrentValue(e.target.value) }}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitAnswer(inputValue) }
                      }}
                      placeholder={q.placeholder || 'Escreve aqui...'}
                      rows={1}
                      style={{
                        flex: 1, background: 'transparent', border: 'none', color: C.text,
                        fontSize: 15, fontFamily: 'inherit', outline: 'none',
                        resize: 'none', padding: '6px 0', lineHeight: 1.5,
                        overflowY: 'hidden',
                        minHeight: 34,
                      }}
                      onInput={e => {
                        e.target.style.height = 'auto'
                        e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
                      }}
                    />
                    <button
                      type="button"
                      className="send-btn"
                      onClick={() => submitAnswer(inputValue)}
                      style={{
                        background: C.blue, border: 'none', borderRadius: 10,
                        color: '#fff', width: 42, height: 42, flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer',
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="5" y1="12" x2="19" y2="12"/>
                        <polyline points="12 5 19 12 12 19"/>
                      </svg>
                    </button>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
                    <p style={{ margin: 0, fontSize: 12, color: C.subtle }}>Enter para continuar · Shift+Enter para nova linha</p>
                    <button
                      type="button"
                      className="skip-btn"
                      onClick={() => submitAnswer('')}
                      style={{ background: 'none', border: 'none', fontSize: 12, color: C.subtle, fontFamily: 'inherit', padding: 0 }}
                    >
                      Saltar →
                    </button>
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Right: live preview */}
        <div className="iv-preview" style={{ width: 320, flexShrink: 0, position: 'sticky', top: 80, paddingTop: 40 }}>
          <p style={{ margin: '0 0 12px', fontSize: 11, color: C.subtle, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Pré-visualização</p>
          <LivePreview
            projectType={projectType}
            answers={answers}
            currentField={q?.field}
            currentValue={currentValue}
          />

          {phase === 'interview' && questions.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                {questions.map((_, i) => (
                  <div key={i} style={{
                    flex: 1, height: 3, borderRadius: 99, marginRight: i < questions.length - 1 ? 4 : 0,
                    background: i < currentQ ? C.blue : i === currentQ ? `linear-gradient(90deg, ${C.blue}, ${C.border})` : C.border,
                    transition: 'background 0.3s',
                  }} />
                ))}
              </div>
              <p style={{ margin: 0, fontSize: 11, color: C.subtle, textAlign: 'center' }}>
                {currentQ} de {questions.length} perguntas respondidas
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
