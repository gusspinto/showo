import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

const C = {
  bg: '#080e1a',
  card: '#0d1829',
  border: '#1e3050',
  blue: '#3b82f6',
  yellow: '#fbbf24',
  green: '#34d399',
  red: '#f87171',
  muted: '#7d93b0',
  subtle: '#3d5270',
  text: '#e8f2ff',
}

// ─── Notes summary (all sections in one view) ───────────────────────────────

const NOTE_SECTIONS = [
  { id: 'cover',        label: 'Introdução',      icon: '👋' },
  { id: 'problem',      label: 'O Problema',       icon: '🔍' },
  { id: 'solution',     label: 'A Solução',        icon: '💡' },
  { id: 'features',     label: 'Funcionalidades',  icon: '⚙️' },
  { id: 'technologies', label: 'Tecnologias',      icon: '🛠️' },
  { id: 'results',      label: 'Resultados',       icon: '🏆' },
  { id: 'learnings',    label: 'Aprendizagens',    icon: '📚' },
  { id: 'closing',      label: 'Encerramento',     icon: '🎤' },
]

function NotesPanel({ aiData, loadingAI, aiError, onRetry }) {
  if (loadingAI) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '60px 0', color: C.muted }}>
      <div style={{ width: 28, height: 28, border: `3px solid ${C.border}`, borderTop: `3px solid ${C.blue}`, borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <span style={{ fontSize: 15 }}>A preparar as tuas notas com IA...</span>
    </div>
  )

  if (aiError) return (
    <div style={{ background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 14, padding: '28px', textAlign: 'center' }}>
      <p style={{ color: C.red, fontSize: 15, margin: '0 0 6px', fontWeight: 600 }}>Não foi possível gerar as notas</p>
      <p style={{ color: C.muted, fontSize: 13, margin: '0 0 18px' }}>
        Faz deploy do Edge Function <code style={{ background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: 4 }}>defense-notes</code> no Supabase e tenta novamente.
      </p>
      <button onClick={onRetry} style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 8, padding: '9px 20px', color: C.red, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
        Tentar novamente
      </button>
    </div>
  )

  if (!aiData) return null

  const tip = aiData.tip
  const notes = aiData.slide_notes ?? {}
  const filled = NOTE_SECTIONS.filter(s => notes[s.id])

  return (
    <div>
      {tip && (
        <div style={{ background: 'rgba(59,130,246,0.07)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 12, padding: '14px 18px', marginBottom: 24, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <span style={{ fontSize: 18, flexShrink: 0 }}>💡</span>
          <p style={{ margin: 0, fontSize: 14, color: '#93c5fd', lineHeight: 1.6 }}>{tip}</p>
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {filled.map(section => (
          <div key={section.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 16 }}>{section.icon}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 1 }}>{section.label}</span>
            </div>
            <p style={{ margin: 0, fontSize: 15, color: '#a0b4cc', lineHeight: 1.7 }}>{notes[section.id]}</p>
          </div>
        ))}
        {filled.length === 0 && (
          <p style={{ color: C.subtle, fontSize: 14, textAlign: 'center', padding: '20px 0' }}>Sem notas geradas.</p>
        )}
      </div>
    </div>
  )
}

// ─── Jury flashcards ─────────────────────────────────────────────────────────

function JuryPanel({ aiData, loadingAI, aiError, onRetry }) {
  const [revealed, setRevealed] = useState({})
  const [practiced, setPracticed] = useState({})

  if (loadingAI) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '60px 0', color: C.muted }}>
      <div style={{ width: 28, height: 28, border: `3px solid ${C.border}`, borderTop: `3px solid ${C.yellow}`, borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <span style={{ fontSize: 15 }}>A preparar perguntas do júri...</span>
    </div>
  )

  if (aiError) return (
    <div style={{ background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 14, padding: '28px', textAlign: 'center' }}>
      <p style={{ color: C.red, fontSize: 15, margin: '0 0 6px', fontWeight: 600 }}>Não foi possível gerar as perguntas</p>
      <p style={{ color: C.muted, fontSize: 13, margin: '0 0 18px' }}>Faz deploy do Edge Function <code style={{ background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: 4 }}>defense-notes</code> no Supabase.</p>
      <button onClick={onRetry} style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 8, padding: '9px 20px', color: C.red, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
        Tentar novamente
      </button>
    </div>
  )

  if (!aiData) return null

  const questions = aiData.jury_questions ?? []
  const practicedCount = Object.values(practiced).filter(Boolean).length

  if (questions.length === 0) return (
    <p style={{ color: C.subtle, fontSize: 14, textAlign: 'center', padding: '20px 0' }}>Sem perguntas geradas.</p>
  )

  return (
    <div>
      {/* Progress */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <span style={{ fontSize: 13, color: C.muted }}>
          <span style={{ color: practicedCount === questions.length ? C.green : C.text, fontWeight: 700 }}>{practicedCount}</span>
          /{questions.length} treinadas
        </span>
        {practicedCount > 0 && (
          <button
            onClick={() => { setRevealed({}); setPracticed({}) }}
            style={{ background: 'transparent', border: 'none', color: C.subtle, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Recomeçar
          </button>
        )}
      </div>

      {/* Progress bar */}
      <div style={{ height: 4, background: C.border, borderRadius: 2, overflow: 'hidden', marginBottom: 24 }}>
        <div style={{
          height: '100%', borderRadius: 2,
          width: `${(practicedCount / questions.length) * 100}%`,
          background: `linear-gradient(90deg, ${C.blue}, ${C.green})`,
          transition: 'width 0.4s ease-out',
        }} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {questions.map((item, i) => {
          const isRevealed = revealed[i]
          const isPracticed = practiced[i]
          return (
            <div
              key={i}
              style={{
                background: isPracticed ? 'rgba(52,211,153,0.05)' : C.card,
                border: `1px solid ${isPracticed ? 'rgba(52,211,153,0.25)' : C.border}`,
                borderRadius: 14, overflow: 'hidden',
                transition: 'border-color 0.2s, background 0.2s',
              }}
            >
              {/* Question */}
              <div style={{ padding: '18px 20px', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                <span style={{
                  width: 26, height: 26, borderRadius: 8, flexShrink: 0,
                  background: isPracticed ? 'rgba(52,211,153,0.12)' : 'rgba(251,191,36,0.08)',
                  border: `1px solid ${isPracticed ? 'rgba(52,211,153,0.3)' : 'rgba(251,191,36,0.2)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700, color: isPracticed ? C.green : C.yellow,
                }}>
                  {isPracticed ? '✓' : i + 1}
                </span>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: isPracticed ? '#6ee7b7' : C.text, lineHeight: 1.5, flex: 1 }}>
                  {item.q}
                </p>
              </div>

              {/* Answer (revealed) */}
              {isRevealed && (
                <div style={{ borderTop: `1px solid ${C.border}`, padding: '16px 20px 16px 60px', background: 'rgba(255,255,255,0.02)' }}>
                  <p style={{ margin: 0, fontSize: 14, color: C.muted, lineHeight: 1.7 }}>{item.a}</p>
                </div>
              )}

              {/* Actions */}
              <div style={{ padding: '0 20px 16px 60px', display: 'flex', gap: 8 }}>
                {!isPracticed && (
                  <button
                    onClick={() => setRevealed(r => ({ ...r, [i]: !r[i] }))}
                    style={{
                      background: 'transparent',
                      border: `1px solid ${C.border}`,
                      borderRadius: 7, padding: '6px 14px',
                      color: C.muted, fontSize: 12, fontWeight: 600,
                      cursor: 'pointer', fontFamily: 'inherit',
                      transition: 'border-color 0.15s',
                    }}
                  >
                    {isRevealed ? 'Esconder resposta' : 'Ver resposta sugerida'}
                  </button>
                )}
                {!isPracticed ? (
                  <button
                    onClick={() => setPracticed(p => ({ ...p, [i]: true }))}
                    style={{
                      background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)',
                      borderRadius: 7, padding: '6px 14px',
                      color: C.green, fontSize: 12, fontWeight: 600,
                      cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    Marcar como treinada
                  </button>
                ) : (
                  <button
                    onClick={() => { setPracticed(p => ({ ...p, [i]: false })); setRevealed(r => ({ ...r, [i]: false })) }}
                    style={{
                      background: 'transparent', border: 'none',
                      color: C.subtle, fontSize: 12,
                      cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    Desfazer
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {practicedCount === questions.length && (
        <div style={{ marginTop: 24, background: 'rgba(52,211,153,0.07)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: 14, padding: '20px', textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.green }}>Preparação completa 🎓</p>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: C.muted }}>Treinaste todas as perguntas. Boa defesa!</p>
        </div>
      )}
    </div>
  )
}

// ─── Backup slides ────────────────────────────────────────────────────────────

// ─── Presenter guide (phone companion) ───────────────────────────────────────

const SECTIONS = [
  { id: 'cover',        label: 'Introdução',      icon: '👋', accent: '#3b82f6' },
  { id: 'problem',      label: 'O Problema',       icon: '🔍', accent: '#f97316' },
  { id: 'solution',     label: 'A Solução',        icon: '💡', accent: '#22c55e' },
  { id: 'features',     label: 'Funcionalidades',  icon: '⚙️', accent: '#06b6d4' },
  { id: 'technologies', label: 'Tecnologias',      icon: '🛠️', accent: '#818cf8' },
  { id: 'results',      label: 'Resultados',       icon: '🏆', accent: '#34d399' },
  { id: 'learnings',    label: 'Aprendizagens',    icon: '📚', accent: '#f472b6' },
  { id: 'closing',      label: 'Encerramento',     icon: '🎤', accent: '#3b82f6' },
]

function hasContent(project, id) {
  const map = { cover: true, problem: project.problem, solution: project.solution, features: project.features, technologies: project.technologies, results: project.results, learnings: project.learnings, closing: true }
  return !!map[id]
}

function PresenterGuide({ project, aiData, loadingAI, aiError, onRetry, onClose }) {
  const sections = SECTIONS.filter(s => hasContent(project, s.id))
  const [current, setCurrent]   = useState(0)
  const [checked, setChecked]   = useState({})   // { sectionId_pointIdx: bool }
  const [timer, setTimer]       = useState(0)
  const [timerOn, setTimerOn]   = useState(false)
  const timerRef = useRef(null)

  const section = sections[current]
  const accent  = section?.accent || C.blue
  const keyPoints = aiData?.key_points?.[section?.id] ?? []

  useEffect(() => {
    if (timerOn) { timerRef.current = setInterval(() => setTimer(t => t + 1), 1000) }
    else clearInterval(timerRef.current)
    return () => clearInterval(timerRef.current)
  }, [timerOn])

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'ArrowRight') next()
      if (e.key === 'ArrowLeft')  prev()
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [current])

  function next() { if (current < sections.length - 1) { setCurrent(c => c + 1); setChecked({}) } }
  function prev() { if (current > 0) { setCurrent(c => c - 1); setChecked({}) } }

  function fmt(s) {
    const m = Math.floor(s / 60), sec = s % 60
    return `${m}:${String(sec).padStart(2,'0')}`
  }

  const checkedCount = keyPoints.filter((_, i) => checked[`${section.id}_${i}`]).length
  const allChecked   = keyPoints.length > 0 && checkedCount === keyPoints.length

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 10000, background: '#060c18', display: 'flex', flexDirection: 'column', fontFamily: 'Inter, system-ui, sans-serif', color: C.text }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes pop{0%{transform:scale(0.92)}60%{transform:scale(1.04)}100%{transform:scale(1)}}`}</style>

      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '1px solid #0f1e35', flexShrink: 0, background: '#07101e' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Timer */}
          <button
            onClick={() => setTimerOn(s => !s)}
            style={{ background: timerOn ? `${accent}18` : 'rgba(255,255,255,0.04)', border: `1px solid ${timerOn ? accent + '44' : '#1e3050'}`, borderRadius: 8, padding: '6px 12px', color: timerOn ? accent : C.subtle, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', minWidth: 60, textAlign: 'center' }}
          >
            {fmt(timer)}
          </button>
          <span style={{ fontSize: 12, color: C.subtle }}>{project.name}</span>
        </div>
        {/* Section dots */}
        <div style={{ display: 'flex', gap: 5 }}>
          {sections.map((s, i) => (
            <button key={s.id} onClick={() => { setCurrent(i); setChecked({}) }}
              style={{ width: i === current ? 18 : 6, height: 6, borderRadius: 3, border: 'none', cursor: 'pointer', padding: 0, background: i === current ? accent : i < current ? '#2a4070' : '#1e3050', transition: 'all 0.2s' }}
            />
          ))}
        </div>
        <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid #1e3050', borderRadius: 8, padding: '6px 10px', color: C.subtle, fontSize: 16, cursor: 'pointer', lineHeight: 1 }}>✕</button>
      </div>

      {/* Section header */}
      <div key={section.id} style={{ padding: '28px 24px 0', flexShrink: 0, animation: 'pop 0.25s ease-out' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <span style={{ width: 40, height: 40, borderRadius: 12, background: `${accent}18`, border: `1px solid ${accent}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{section.icon}</span>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: accent, textTransform: 'uppercase', letterSpacing: 1.5 }}>
              {current + 1} de {sections.length}
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: C.text, letterSpacing: '-0.3px', lineHeight: 1.2 }}>{section.label}</div>
          </div>
        </div>
        {/* Progress bar */}
        <div style={{ height: 3, background: '#1e3050', borderRadius: 2, overflow: 'hidden', marginTop: 12 }}>
          <div style={{ height: '100%', background: accent, borderRadius: 2, width: `${((current + 1) / sections.length) * 100}%`, transition: 'width 0.3s' }} />
        </div>
      </div>

      {/* Key points */}
      <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>
        {loadingAI ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[0,1,2].map(i => (
              <div key={i} style={{ height: 56, background: '#0d1829', border: '1px solid #1e3050', borderRadius: 12, opacity: 0.5 + i * 0.15 }} />
            ))}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
              <div style={{ width: 14, height: 14, border: '2px solid #1e3050', borderTop: `2px solid ${accent}`, borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              <span style={{ fontSize: 13, color: C.subtle }}>A gerar pontos-chave...</span>
            </div>
          </div>
        ) : aiError ? (
          <div style={{ background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 12, padding: '20px', textAlign: 'center' }}>
            <p style={{ color: C.red, margin: '0 0 12px', fontSize: 14 }}>Não foi possível carregar os pontos-chave.</p>
            <button onClick={onRetry} style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 8, padding: '8px 18px', color: C.red, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Tentar novamente</button>
          </div>
        ) : keyPoints.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: C.subtle, textTransform: 'uppercase', letterSpacing: 1 }}>O que tens de mencionar</p>
            {keyPoints.map((point, i) => {
              const key = `${section.id}_${i}`
              const done = !!checked[key]
              return (
                <button
                  key={i}
                  onClick={() => setChecked(c => ({ ...c, [key]: !done }))}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14, width: '100%',
                    background: done ? `${accent}10` : '#0d1829',
                    border: `1.5px solid ${done ? accent + '50' : '#1e3050'}`,
                    borderRadius: 14, padding: '16px 18px', cursor: 'pointer',
                    textAlign: 'left', fontFamily: 'inherit',
                    transition: 'all 0.15s',
                    animation: done ? 'pop 0.2s ease-out' : 'none',
                  }}
                >
                  <span style={{
                    width: 26, height: 26, borderRadius: 8, flexShrink: 0,
                    background: done ? accent : 'rgba(255,255,255,0.04)',
                    border: `1.5px solid ${done ? accent : '#2a4070'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, color: done ? '#fff' : C.subtle, fontWeight: 700,
                    transition: 'all 0.15s',
                  }}>
                    {done ? '✓' : i + 1}
                  </span>
                  <span style={{ fontSize: 16, fontWeight: done ? 500 : 600, color: done ? C.subtle : C.text, lineHeight: 1.4, textDecoration: done ? 'line-through' : 'none', transition: 'all 0.15s' }}>
                    {point}
                  </span>
                </button>
              )
            })}

            {allChecked && (
              <div style={{ marginTop: 8, background: `${accent}0d`, border: `1px solid ${accent}30`, borderRadius: 12, padding: '14px 18px', textAlign: 'center', animation: 'pop 0.3s ease-out' }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: accent }}>Secção completa — avança! →</span>
              </div>
            )}
          </div>
        ) : (
          /* No AI data — show raw content as fallback */
          <div style={{ background: '#0d1829', border: '1px solid #1e3050', borderRadius: 12, padding: '18px' }}>
            <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: C.subtle, textTransform: 'uppercase', letterSpacing: 1 }}>Conteúdo</p>
            <p style={{ margin: 0, fontSize: 15, color: C.muted, lineHeight: 1.7 }}>
              {section.id === 'cover'   && (project.ai_tagline || project.goal || project.name)}
              {section.id === 'problem' && project.problem}
              {section.id === 'solution' && project.solution}
              {section.id === 'features' && project.features}
              {section.id === 'technologies' && project.technologies}
              {section.id === 'results' && project.results}
              {section.id === 'learnings' && project.learnings}
              {section.id === 'closing' && 'Agradece ao júri e abre para perguntas.'}
            </p>
          </div>
        )}
      </div>

      {/* Nav buttons */}
      <div style={{ display: 'flex', gap: 10, padding: '16px 24px', borderTop: '1px solid #0f1e35', flexShrink: 0, background: '#07101e' }}>
        <button
          onClick={prev}
          disabled={current === 0}
          style={{ flex: 1, padding: '16px 0', background: 'rgba(255,255,255,0.03)', border: '1px solid #1e3050', borderRadius: 14, color: current === 0 ? '#1e3050' : C.muted, fontSize: 20, cursor: current === 0 ? 'default' : 'pointer', fontFamily: 'inherit' }}
        >←</button>
        <button
          onClick={next}
          disabled={current === sections.length - 1}
          style={{ flex: 3, padding: '16px 0', background: current === sections.length - 1 ? 'rgba(255,255,255,0.03)' : `linear-gradient(135deg, ${accent}, ${accent}bb)`, border: 'none', borderRadius: 14, color: current === sections.length - 1 ? '#1e3050' : '#fff', fontSize: 16, fontWeight: 700, cursor: current === sections.length - 1 ? 'default' : 'pointer', fontFamily: 'inherit', boxShadow: current === sections.length - 1 ? 'none' : `0 4px 20px ${accent}44` }}
        >
          {current === sections.length - 1 ? 'Fim' : 'Próxima secção →'}
        </button>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function DefenseMode({ project, isOwner, onClose }) {
  const [tab, setTab]             = useState('notes')   // 'notes' | 'jury' | 'guide'
  const [aiData, setAiData]       = useState(null)
  const [loadingAI, setLoadingAI] = useState(false)
  const [aiError, setAiError]     = useState(false)
  const [guideMode, setGuideMode] = useState(false)

  useEffect(() => {
    if (!isOwner) return
    loadAI()
  }, [])

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape' && !guideMode) onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [guideMode])

  function loadAI() {
    setLoadingAI(true)
    setAiError(false)
    supabase.functions.invoke('defense-notes', { body: { project } })
      .then(({ data, error }) => {
        if (error || !data) { setAiError(true); return }
        setAiData(data)
      })
      .catch(() => setAiError(true))
      .finally(() => setLoadingAI(false))
  }

  if (guideMode) return (
    <PresenterGuide
      project={project}
      aiData={aiData}
      loadingAI={loadingAI}
      aiError={aiError}
      onRetry={loadAI}
      onClose={() => setGuideMode(false)}
    />
  )

  const tabs = [
    { id: 'notes', label: '📝 Notas',    show: isOwner },
    { id: 'jury',  label: '🎓 Júri',     show: isOwner },
    { id: 'guide', label: '📱 No dia',   show: true },
  ].filter(t => t.show)

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9900, background: 'rgba(5,9,18,0.92)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, fontFamily: 'Inter, system-ui, sans-serif' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>

      <div style={{ background: '#0a1220', border: '1px solid #1e3050', borderRadius: 20, width: '100%', maxWidth: 720, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 32px 80px rgba(0,0,0,0.7)', animation: 'fadeIn 0.2s ease-out' }}>

        {/* Header */}
        <div style={{ padding: '22px 28px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <h2 style={{ margin: '0 0 2px', fontSize: 18, fontWeight: 800, color: C.text }}>Preparar defesa</h2>
            <p style={{ margin: 0, fontSize: 13, color: C.subtle }}>{project.name}</p>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid #1e3050', borderRadius: 8, padding: '7px 10px', color: C.muted, fontSize: 18, cursor: 'pointer', lineHeight: 1 }}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, padding: '16px 28px 0', flexShrink: 0 }}>
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => t.id === 'guide' ? setGuideMode(true) : setTab(t.id)}
              style={{
                background: tab === t.id ? 'rgba(59,130,246,0.12)' : 'transparent',
                border: `1px solid ${tab === t.id ? 'rgba(59,130,246,0.35)' : C.border}`,
                borderRadius: 9, padding: '8px 16px',
                color: tab === t.id ? '#60a5fa' : C.muted,
                fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                transition: 'all 0.15s',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '20px 28px 28px' }}>
          {!isOwner && (
            <div style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: 12, padding: '20px', textAlign: 'center' }}>
              <p style={{ margin: 0, color: C.muted, fontSize: 14 }}>A preparação completa está disponível apenas para o criador do projeto.</p>
            </div>
          )}
          {tab === 'notes' && isOwner && <NotesPanel aiData={aiData} loadingAI={loadingAI} aiError={aiError} onRetry={loadAI} />}
          {tab === 'jury'  && isOwner && <JuryPanel  aiData={aiData} loadingAI={loadingAI} aiError={aiError} onRetry={loadAI} />}
        </div>
      </div>
    </div>
  )
}
