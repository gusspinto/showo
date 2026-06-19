import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Hand, Search, Lightbulb, Settings, Wrench, Trophy, BookOpen, Mic, GraduationCap, Check, X, Smartphone, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react'

const C = {
  bg: 'var(--c-bg)',
  card: 'var(--c-card)',
  border: 'var(--c-border)',
  blue: '#1b78f7',
  yellow: '#fbbf24',
  green: '#22c55e',
  red: '#ef4444',
  muted: 'var(--c-muted)',
  subtle: 'var(--c-subtle)',
  text: 'var(--c-text)',
}

// ─── Notes summary (all sections in one view) ───────────────────────────────

const NOTE_SECTIONS = [
  { id: 'cover',        label: 'Introdução',      Icon: Hand },
  { id: 'problem',      label: 'O Problema',       Icon: Search },
  { id: 'solution',     label: 'A Solução',        Icon: Lightbulb },
  { id: 'features',     label: 'Funcionalidades',  Icon: Settings },
  { id: 'technologies', label: 'Tecnologias',      Icon: Wrench },
  { id: 'results',      label: 'Resultados',       Icon: Trophy },
  { id: 'learnings',    label: 'Aprendizagens',    Icon: BookOpen },
  { id: 'closing',      label: 'Encerramento',     Icon: Mic },
]

function NotesPanel({ aiData, loadingAI, aiError, onRetry }) {
  if (loadingAI) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '60px 0', color: C.muted }}>
      <div style={{ width: 28, height: 28, border: `3px solid ${C.border}`, borderTop: `3px solid ${C.blue}`, borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <span style={{ fontSize: 15 }}>A preparar as tuas notas com IA...</span>
    </div>
  )

  if (aiError) return (
    <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 14, padding: '28px', textAlign: 'center' }}>
      <p style={{ color: C.red, fontSize: 15, margin: '0 0 6px', fontWeight: 600 }}>Não foi possível gerar as notas</p>
      <p style={{ color: C.muted, fontSize: 13, margin: '0 0 18px' }}>
        Faz deploy do Edge Function <code style={{ background: 'var(--c-card-hover)', padding: '2px 6px', borderRadius: 4 }}>defense-notes</code> no Supabase e tenta novamente.
      </p>
      <button onClick={onRetry} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '9px 20px', color: C.red, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
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
        <div style={{ background: 'rgba(27,120,247,0.07)', border: '1px solid rgba(27,120,247,0.2)', borderRadius: 12, padding: '14px 18px', marginBottom: 24, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <Lightbulb size={18} color={C.blue} style={{ flexShrink: 0 }} />
          <p style={{ margin: 0, fontSize: 14, color: C.muted, lineHeight: 1.6 }}>{tip}</p>
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {filled.map(section => (
          <div key={section.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <section.Icon size={16} color={C.muted} />
              <span style={{ fontSize: 12, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 1 }}>{section.label}</span>
            </div>
            <p style={{ margin: 0, fontSize: 15, color: C.text, lineHeight: 1.7 }}>{notes[section.id]}</p>
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
    <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 14, padding: '28px', textAlign: 'center' }}>
      <p style={{ color: C.red, fontSize: 15, margin: '0 0 6px', fontWeight: 600 }}>Não foi possível gerar as perguntas</p>
      <p style={{ color: C.muted, fontSize: 13, margin: '0 0 18px' }}>Faz deploy do Edge Function <code style={{ background: 'var(--c-card-hover)', padding: '2px 6px', borderRadius: 4 }}>defense-notes</code> no Supabase.</p>
      <button onClick={onRetry} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '9px 20px', color: C.red, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
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
                background: isPracticed ? 'rgba(34,197,94,0.05)' : C.card,
                border: `1px solid ${isPracticed ? 'rgba(34,197,94,0.25)' : C.border}`,
                borderRadius: 14, overflow: 'hidden',
                transition: 'border-color 0.2s, background 0.2s',
              }}
            >
              {/* Question */}
              <div style={{ padding: '18px 20px', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                <span style={{
                  width: 26, height: 26, borderRadius: 8, flexShrink: 0,
                  background: isPracticed ? 'rgba(34,197,94,0.12)' : 'rgba(251,191,36,0.08)',
                  border: `1px solid ${isPracticed ? 'rgba(34,197,94,0.3)' : 'rgba(251,191,36,0.2)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700, color: isPracticed ? C.green : C.yellow,
                }}>
                  {isPracticed ? <Check size={12} /> : i + 1}
                </span>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: isPracticed ? '#6ee7b7' : C.text, lineHeight: 1.5, flex: 1 }}>
                  {item.q}
                </p>
              </div>

              {/* Answer (revealed) */}
              {isRevealed && (
                <div style={{ borderTop: `1px solid ${C.border}`, padding: '16px 20px 16px 60px', background: 'var(--c-bg-alt)' }}>
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
                      background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)',
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
        <div style={{ marginTop: 24, background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 14, padding: '20px', textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.green }}>Preparação completa</p>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: C.muted }}>Treinaste todas as perguntas. Boa defesa!</p>
        </div>
      )}
    </div>
  )
}

// ─── Backup slides ────────────────────────────────────────────────────────────

// ─── Presenter guide (phone companion) ───────────────────────────────────────

const SECTIONS = [
  { id: 'cover',        label: 'Introdução',      Icon: Hand,     accent: '#1b78f7' },
  { id: 'problem',      label: 'O Problema',       Icon: Search,   accent: '#f97316' },
  { id: 'solution',     label: 'A Solução',        Icon: Lightbulb,accent: '#22c55e' },
  { id: 'features',     label: 'Funcionalidades',  Icon: Settings, accent: '#06b6d4' },
  { id: 'technologies', label: 'Tecnologias',      Icon: Wrench,   accent: '#818cf8' },
  { id: 'results',      label: 'Resultados',       Icon: Trophy,   accent: '#22c55e' },
  { id: 'learnings',    label: 'Aprendizagens',    Icon: BookOpen, accent: '#f472b6' },
  { id: 'closing',      label: 'Encerramento',     Icon: Mic,      accent: '#1b78f7' },
]

function hasContent(project, id) {
  const map = { cover: true, problem: project.problem, solution: project.solution, features: project.features, technologies: project.technologies, results: project.results, learnings: project.learnings, closing: true }
  return !!map[id]
}

// Estimated minutes per section
const SECTION_TIMES = { cover: 1, problem: 2, solution: 2, features: 3, technologies: 2, results: 2, learnings: 2, closing: 1 }

function PresenterGuide({ project, aiData, loadingAI, aiError, onRetry, onClose, collaboratorSections, studentName }) {
  const allSections = SECTIONS.filter(s => hasContent(project, s.id))
  // If collaboratorSections is set (non-owner), only show assigned sections
  const sections = collaboratorSections?.length > 0
    ? allSections.filter(s => collaboratorSections.includes(s.id))
    : allSections
  const totalMins = sections.reduce((acc, s) => acc + (SECTION_TIMES[s.id] || 2), 0)

  const [started, setStarted]     = useState(false)
  const [finished, setFinished]   = useState(false)
  const [current, setCurrent]     = useState(0)
  const [checked, setChecked]     = useState({})   // { sectionId_pointIdx: bool }
  const [showNote, setShowNote]   = useState(false) // toggle full speaker note
  const [timer, setTimer]         = useState(0)
  const [timerOn, setTimerOn]     = useState(false)
  const timerRef = useRef(null)
  const touchStartX = useRef(null)

  const section   = sections[current]
  const accent    = section?.accent || C.blue
  const keyPoints = aiData?.key_points?.[section?.id] ?? []
  const speakerNote = aiData?.slide_notes?.[section?.id] ?? ''

  useEffect(() => {
    if (timerOn) { timerRef.current = setInterval(() => setTimer(t => t + 1), 1000) }
    else clearInterval(timerRef.current)
    return () => clearInterval(timerRef.current)
  }, [timerOn])

  useEffect(() => {
    function onKey(e) {
      if (!started) return
      if (e.key === 'ArrowRight') next()
      if (e.key === 'ArrowLeft')  prev()
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [current, started])

  function next() {
    if (current < sections.length - 1) {
      setCurrent(c => c + 1)
      setChecked({})
      setShowNote(false)
    }
  }
  function prev() {
    if (current > 0) {
      setCurrent(c => c - 1)
      setChecked({})
      setShowNote(false)
    }
  }

  function fmt(s) {
    const m = Math.floor(s / 60), sec = s % 60
    return `${m}:${String(sec).padStart(2,'0')}`
  }

  function handleTouchStart(e) { touchStartX.current = e.touches[0].clientX }
  function handleTouchEnd(e) {
    if (touchStartX.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    if (dx < -50) next()
    if (dx >  50) prev()
    touchStartX.current = null
  }

  const checkedCount = keyPoints.filter((_, i) => checked[`${section?.id}_${i}`]).length
  const allChecked   = keyPoints.length > 0 && checkedCount === keyPoints.length
  const sectionMins  = SECTION_TIMES[section?.id] || 2

  // ── Finished / celebration screen ────────────────────────────────────────
  if (finished) {
    const firstName = studentName ? studentName.split(' ')[0] : null
    const mins = Math.floor(timer / 60)
    const secs = timer % 60
    const timeStr = mins > 0 ? `${mins}m ${String(secs).padStart(2,'0')}s` : `${secs}s`

    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'var(--c-bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit', color: C.text, padding: 32, textAlign: 'center' }}>
        <style>{`@keyframes pop{0%{transform:scale(0.5);opacity:0}60%{transform:scale(1.15)}100%{transform:scale(1);opacity:1}} @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}`}</style>

        <div style={{ marginBottom: 4, animation: 'pop 0.5s ease-out' }}><GraduationCap size={80} color={C.blue} /></div>
        <h2 style={{ fontSize: 28, fontWeight: 800, margin: '16px 0 8px', letterSpacing: '-0.5px', animation: 'fadeUp 0.4s 0.2s ease-out both' }}>
          Boa apresentação{firstName ? `, ${firstName}` : ''}!
        </h2>
        <p style={{ fontSize: 18, color: C.muted, margin: '0 0 8px', animation: 'fadeUp 0.4s 0.35s ease-out both' }}>
          Vês como foi fácil?
        </p>
        <p style={{ fontSize: 14, color: C.muted, margin: '0 0 32px', lineHeight: 1.6, maxWidth: 300, animation: 'fadeUp 0.4s 0.45s ease-out both' }}>
          Passaste por todas as secções. Agora é só confiar no trabalho que fizeste.
        </p>

        <div style={{ display: 'flex', gap: 12, marginBottom: 32, animation: 'fadeUp 0.4s 0.5s ease-out both' }}>
          <div style={{ background: 'var(--c-card)', border: '1px solid var(--c-border)', borderRadius: 12, padding: '16px 24px' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: C.text }}>{timeStr}</div>
            <div style={{ fontSize: 11, color: C.subtle, marginTop: 2 }}>duração</div>
          </div>
          <div style={{ background: 'var(--c-card)', border: '1px solid var(--c-border)', borderRadius: 12, padding: '16px 24px' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: C.text }}>{sections.length}</div>
            <div style={{ fontSize: 11, color: C.subtle, marginTop: 2 }}>secções</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 320, animation: 'fadeUp 0.4s 0.6s ease-out both' }}>
          <button
            onClick={() => { setFinished(false); setTimer(0); setTimerOn(false); setCurrent(0); setChecked({}); setShowNote(false) }}
            style={{ padding: '14px 0', background: '#1b78f7', border: 'none', borderRadius: 14, color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 6px 24px rgba(27,120,247,0.35)' }}
          >
            Recomeçar do início
          </button>
          <button
            onClick={onClose}
            style={{ padding: '14px 0', background: 'transparent', border: '1px solid var(--c-border)', borderRadius: 14, color: C.muted, fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Fechar
          </button>
        </div>
      </div>
    )
  }

  // ── Start screen ─────────────────────────────────────────────────────────
  if (!started) {
    const juryCount = aiData?.jury_questions?.length ?? 0
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'var(--c-bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit', color: C.text, padding: 24 }}>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes pop{0%{transform:scale(0.92)}60%{transform:scale(1.04)}100%{transform:scale(1)}} @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}`}</style>

        <div style={{ maxWidth: 360, width: '100%', textAlign: 'center', animation: 'fadeUp 0.3s ease-out' }}>
          {/* Icon */}
          <div style={{ width: 72, height: 72, borderRadius: 20, background: 'rgba(27,120,247,0.12)', border: '1px solid rgba(27,120,247,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <Mic size={34} color={C.blue} />
          </div>

          <h2 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 8px', letterSpacing: '-0.4px' }}>Guia do Apresentador</h2>
          <p style={{ fontSize: 15, color: C.muted, margin: '0 0 32px', lineHeight: 1.6 }}>
            Usa este guia no teu telemóvel enquanto apresentas no Canva ou PowerPoint.
          </p>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 32 }}>
            {[
              { n: sections.length, label: 'secções' },
              { n: `~${totalMins}m`, label: 'duração' },
              { n: juryCount || '—', label: 'perguntas' },
            ].map(({ n, label }) => (
              <div key={label} style={{ background: 'var(--c-card)', border: '1px solid var(--c-border)', borderRadius: 12, padding: '14px 8px' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: C.text }}>{n}</div>
                <div style={{ fontSize: 11, color: C.subtle, marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Tips */}
          <div style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.18)', borderRadius: 12, padding: '14px 16px', marginBottom: 28, textAlign: 'left' }}>
            <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: 1 }}>Antes de começar</p>
            {['Coloca o telemóvel em silêncio', 'Abre o teu Canva/PowerPoint no PC', 'Mantém este guia no telemóvel'].map(tip => (
              <p key={tip} style={{ margin: '4px 0 0', fontSize: 13, color: C.muted }}>· {tip}</p>
            ))}
          </div>

          {loadingAI && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', marginBottom: 16 }}>
              <div style={{ width: 14, height: 14, border: '2px solid #1e3050', borderTop: '2px solid #1b78f7', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              <span style={{ fontSize: 13, color: C.muted }}>A preparar pontos-chave com IA...</span>
            </div>
          )}

          <button
            onClick={() => { setStarted(true); setTimerOn(true) }}
            style={{
              width: '100%', padding: '16px 0',
              background: '#1b78f7',
              border: 'none', borderRadius: 14,
              color: '#fff', fontSize: 17, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit',
              boxShadow: '0 8px 32px rgba(27,120,247,0.4)',
            }}
          >
            Começar apresentação <ArrowRight size={16} style={{ verticalAlign: 'middle', marginLeft: 4 }} />
          </button>

          <button onClick={onClose} style={{ marginTop: 14, background: 'none', border: 'none', color: C.subtle, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
            Voltar atrás
          </button>
        </div>
      </div>
    )
  }

  // ── Active guide ──────────────────────────────────────────────────────────
  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'var(--c-bg)', display: 'flex', flexDirection: 'column', fontFamily: 'inherit', color: C.text }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes pop{0%{transform:scale(0.92)}60%{transform:scale(1.04)}100%{transform:scale(1)}}`}</style>

      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '1px solid var(--c-border)', flexShrink: 0, background: 'var(--c-card)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Timer — tap to pause/resume */}
          <button
            onClick={() => setTimerOn(s => !s)}
            style={{ background: timerOn ? `${accent}18` : 'var(--c-bg-alt)', border: `1px solid ${timerOn ? accent + '44' : 'var(--c-border)'}`, borderRadius: 8, padding: '6px 12px', color: timerOn ? accent : C.subtle, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', minWidth: 60, textAlign: 'center' }}
          >
            {fmt(timer)}
          </button>
          <span style={{ fontSize: 12, color: C.subtle, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{project.name}</span>
        </div>
        {/* Section dots */}
        <div style={{ display: 'flex', gap: 5 }}>
          {sections.map((s, i) => (
            <button key={s.id} onClick={() => { setCurrent(i); setChecked({}); setShowNote(false) }}
              style={{ width: i === current ? 18 : 6, height: 6, borderRadius: 3, border: 'none', cursor: 'pointer', padding: 0, background: i === current ? accent : i < current ? '#2a4070' : 'var(--c-border)', transition: 'all 0.2s' }}
            />
          ))}
        </div>
        <button onClick={onClose} style={{ background: 'var(--c-bg-alt)', border: '1px solid var(--c-border)', borderRadius: 8, padding: '6px 10px', color: C.subtle, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={16} /></button>
      </div>

      {/* Section header */}
      <div key={section.id} style={{ padding: '22px 24px 0', flexShrink: 0, animation: 'pop 0.25s ease-out' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 40, height: 40, borderRadius: 12, background: `${accent}18`, border: `1px solid ${accent}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><section.Icon size={20} color={accent} /></span>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: accent, textTransform: 'uppercase', letterSpacing: 1.5 }}>
                {current + 1} / {sections.length}
              </div>
              <div style={{ fontSize: 21, fontWeight: 800, color: C.text, letterSpacing: '-0.3px', lineHeight: 1.2 }}>{section.label}</div>
            </div>
          </div>
          {/* Time estimate badge */}
          <div style={{ background: 'var(--c-bg-alt)', border: '1px solid var(--c-border)', borderRadius: 8, padding: '4px 10px', textAlign: 'center' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.muted }}>~{sectionMins}m</div>
          </div>
        </div>
        {/* Progress bar */}
        <div style={{ height: 3, background: 'var(--c-border)', borderRadius: 2, overflow: 'hidden', marginTop: 8 }}>
          <div style={{ height: '100%', background: accent, borderRadius: 2, width: `${((current + 1) / sections.length) * 100}%`, transition: 'width 0.3s' }} />
        </div>
      </div>

      {/* Key points + speaker note */}
      <div style={{ flex: 1, overflow: 'auto', padding: '18px 24px' }}>
        {loadingAI ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[0,1,2].map(i => (
              <div key={i} style={{ height: 56, background: 'var(--c-card)', border: '1px solid var(--c-border)', borderRadius: 12, opacity: 0.5 + i * 0.15 }} />
            ))}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
              <div style={{ width: 14, height: 14, border: '2px solid var(--c-border)', borderTop: `2px solid ${accent}`, borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              <span style={{ fontSize: 13, color: C.subtle }}>A gerar pontos-chave...</span>
            </div>
          </div>
        ) : aiError ? (
          <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, padding: '20px', textAlign: 'center' }}>
            <p style={{ color: C.red, margin: '0 0 12px', fontSize: 14 }}>Não foi possível carregar os pontos-chave.</p>
            <button onClick={onRetry} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '8px 18px', color: C.red, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Tentar novamente</button>
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
                    background: done ? `${accent}10` : 'var(--c-card)',
                    border: `1.5px solid ${done ? accent + '50' : 'var(--c-border)'}`,
                    borderRadius: 14, padding: '16px 18px', cursor: 'pointer',
                    textAlign: 'left', fontFamily: 'inherit',
                    transition: 'all 0.15s',
                  }}
                >
                  <span style={{
                    width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                    background: done ? accent : 'var(--c-bg-alt)',
                    border: `1.5px solid ${done ? accent : 'var(--c-border)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, color: done ? '#fff' : C.subtle, fontWeight: 700,
                    transition: 'all 0.15s',
                  }}>
                    {done ? <Check size={13} color="#fff" /> : i + 1}
                  </span>
                  <span style={{ fontSize: 16, fontWeight: done ? 400 : 600, color: done ? C.subtle : C.text, lineHeight: 1.4, textDecoration: done ? 'line-through' : 'none', transition: 'all 0.15s' }}>
                    {point}
                  </span>
                </button>
              )
            })}

            {allChecked && (
              <div style={{ background: `${accent}0d`, border: `1px solid ${accent}30`, borderRadius: 12, padding: '14px 18px', textAlign: 'center', animation: 'pop 0.3s ease-out' }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>Secção completa — avança! <ChevronRight size={16} /></span>
              </div>
            )}

            {/* Speaker note toggle */}
            {speakerNote && (
              <div style={{ marginTop: 4 }}>
                <button
                  onClick={() => setShowNote(s => !s)}
                  style={{ background: 'transparent', border: `1px solid ${showNote ? 'var(--c-border-bright)' : 'var(--c-border)'}`, borderRadius: 9, padding: '7px 14px', color: showNote ? C.blue : C.subtle, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}
                >
                  {showNote
                    ? <><ChevronUp size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />Esconder nota</>
                    : <><ChevronDown size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />Ver nota completa</>
                  }
                </button>
                {showNote && (
                  <div style={{ marginTop: 10, background: 'rgba(27,120,247,0.05)', border: '1px solid rgba(27,120,247,0.15)', borderRadius: 12, padding: '14px 16px', animation: 'pop 0.2s ease-out' }}>
                    <p style={{ margin: 0, fontSize: 14, color: C.muted, lineHeight: 1.75 }}>{speakerNote}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* No AI data — show raw content as fallback */
          <div style={{ background: 'var(--c-card)', border: '1px solid var(--c-border)', borderRadius: 12, padding: '18px' }}>
            <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: C.subtle, textTransform: 'uppercase', letterSpacing: 1 }}>Conteúdo</p>
            <p style={{ margin: 0, fontSize: 15, color: C.muted, lineHeight: 1.7 }}>
              {section.id === 'cover'        && (project.ai_tagline || project.goal || project.name)}
              {section.id === 'problem'      && project.problem}
              {section.id === 'solution'     && project.solution}
              {section.id === 'features'     && project.features}
              {section.id === 'technologies' && project.technologies}
              {section.id === 'results'      && project.results}
              {section.id === 'learnings'    && project.learnings}
              {section.id === 'closing'      && 'Agradece ao júri e abre para perguntas.'}
            </p>
          </div>
        )}
      </div>

      {/* Nav buttons */}
      <div style={{ display: 'flex', gap: 10, padding: '16px 24px', borderTop: '1px solid var(--c-border)', flexShrink: 0, background: 'var(--c-card)' }}>
        <button
          onClick={prev}
          disabled={current === 0}
          style={{ flex: 1, padding: '16px 0', background: 'var(--c-bg-alt)', border: '1px solid var(--c-border)', borderRadius: 14, color: current === 0 ? 'var(--c-border)' : C.muted, fontSize: 20, cursor: current === 0 ? 'default' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        ><ChevronLeft size={20} /></button>
        <button
          onClick={() => {
            if (current === sections.length - 1) { setTimerOn(false); setFinished(true) }
            else next()
          }}
          style={{ flex: 3, padding: '16px 0', background: `linear-gradient(135deg, ${current === sections.length - 1 ? '#22c55e, #16a34a' : `${accent}, ${accent}bb`})`, border: 'none', borderRadius: 14, color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: `0 4px 20px ${current === sections.length - 1 ? 'rgba(34,197,94,0.4)' : accent + '44'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
        >
          {current === sections.length - 1
            ? 'Terminar apresentação'
            : <>Próxima secção <ChevronRight size={16} /></>
          }
        </button>
      </div>
    </div>
  )
}

// ─── Group / collaborators panel ─────────────────────────────────────────────

const ALL_SECTIONS = [
  { id: 'cover',        label: 'Introdução',      Icon: Hand },
  { id: 'problem',      label: 'O Problema',       Icon: Search },
  { id: 'solution',     label: 'A Solução',        Icon: Lightbulb },
  { id: 'features',     label: 'Funcionalidades',  Icon: Settings },
  { id: 'technologies', label: 'Tecnologias',      Icon: Wrench },
  { id: 'results',      label: 'Resultados',       Icon: Trophy },
  { id: 'learnings',    label: 'Aprendizagens',    Icon: BookOpen },
  { id: 'closing',      label: 'Encerramento',     Icon: Mic },
]

function GrupoPanel({ project }) {
  const { user } = useAuth()
  const [search, setSearch]               = useState('')
  const [searchResult, setSearchResult]   = useState(null)
  const [searching, setSearching]         = useState(false)
  const [searchErr, setSearchErr]         = useState('')
  const [collaborators, setCollaborators] = useState([])
  const [prevStatuses, setPrevStatuses]   = useState({}) // { user_id: status } — detect changes
  const [pendingSections, setPendingSections] = useState({})
  const [saving, setSaving]               = useState(false)
  const [saved, setSaved]                 = useState(false)
  const [events, setEvents]               = useState([]) // [{ id, msg, color }]

  // Load on mount + poll every 5 s to detect status changes
  useEffect(() => {
    loadCollaborators()
    const t = setInterval(loadCollaborators, 5000)
    return () => clearInterval(t)
  }, [])

  function pushEvent(msg, color = C.green) {
    const id = Date.now()
    setEvents(prev => [...prev, { id, msg, color }])
    setTimeout(() => setEvents(prev => prev.filter(e => e.id !== id)), 4000)
  }

  async function loadCollaborators() {
    const { data } = await supabase
      .from('project_collaborators')
      .select('id, user_id, status, sections, profiles(id, username, full_name)')
      .eq('project_id', project.id)
    if (!data) return

    // Detect status changes vs previous load
    setPrevStatuses(prev => {
      data.forEach(c => {
        const name = c.profiles?.full_name || c.profiles?.username || 'O colega'
        const oldStatus = prev[c.user_id]
        if (oldStatus === 'pending' && c.status === 'accepted') {
          pushEvent(`${name} aceitou o convite`, C.green)
        } else if (oldStatus === 'pending' && c.status === 'declined') {
          pushEvent(`${name} recusou o convite`, C.red)
        }
      })
      const next = {}
      data.forEach(c => { next[c.user_id] = c.status })
      return next
    })

    setCollaborators(data)
    setPendingSections(prev => {
      const updated = { ...prev }
      data.forEach(c => { if (!updated[c.user_id]) updated[c.user_id] = c.sections ?? [] })
      return updated
    })
  }

  async function doSearch() {
    const q = search.trim()
    if (!q) return
    setSearching(true)
    setSearchErr('')
    setSearchResult(null)
    const { data } = await supabase
      .from('profiles')
      .select('id, username, full_name')
      .eq('username', q)
      .single()
    if (!data) {
      setSearchErr('Utilizador não encontrado. Verifica o username.')
    } else if (collaborators.find(c => c.user_id === data.id)) {
      setSearchErr('Este utilizador já foi adicionado.')
    } else {
      setSearchResult(data)
    }
    setSearching(false)
  }

  async function addCollaborator() {
    if (!searchResult) return
    const name = searchResult.full_name || searchResult.username
    await supabase.from('project_collaborators').upsert({
      project_id: project.id,
      user_id: searchResult.id,
      invited_by: user?.id,
      sections: [],
      status: 'pending',
    })
    setSearchResult(null)
    setSearch('')
    pushEvent(`${name} recebeu o convite`, C.blue)
    loadCollaborators()
  }

  async function saveAssignments() {
    setSaving(true)
    for (const [userId, sections] of Object.entries(pendingSections)) {
      await supabase
        .from('project_collaborators')
        .update({ sections })
        .eq('project_id', project.id)
        .eq('user_id', userId)
    }
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function removeCollaborator(userId) {
    await supabase
      .from('project_collaborators')
      .delete()
      .eq('project_id', project.id)
      .eq('user_id', userId)
    loadCollaborators()
  }

  function toggleSection(userId, sectionId) {
    setPendingSections(prev => {
      const current = prev[userId] ?? []
      return {
        ...prev,
        [userId]: current.includes(sectionId)
          ? current.filter(s => s !== sectionId)
          : [...current, sectionId],
      }
    })
  }

  const hasChanges = collaborators.some(c => {
    const original = c.sections ?? []
    const pending = pendingSections[c.user_id] ?? []
    return JSON.stringify([...original].sort()) !== JSON.stringify([...pending].sort())
  })

  return (
    <div>
      <p style={{ margin: '0 0 18px', fontSize: 14, color: C.muted, lineHeight: 1.6 }}>
        Adiciona os teus colegas de grupo pelo username do Showo. Depois atribui as secções que cada um vai apresentar — o Guia do Apresentador deles só mostrará as secções deles.
      </p>

      {/* Event toasts */}
      {events.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
          {events.map(e => (
            <div key={e.id} style={{
              background: `${e.color}10`, border: `1px solid ${e.color}35`,
              borderRadius: 10, padding: '10px 14px',
              fontSize: 13, fontWeight: 600, color: e.color,
              animation: 'fadeIn 0.2s ease-out',
            }}>
              {e.msg}
            </div>
          ))}
        </div>
      )}

      {/* Search */}
      <div style={{ display: 'flex', gap: 8, marginBottom: searchErr ? 8 : 20 }}>
        <input
          type="text"
          value={search}
          onChange={e => { setSearch(e.target.value); setSearchErr(''); setSearchResult(null) }}
          onKeyDown={e => e.key === 'Enter' && doSearch()}
          placeholder="Username do colega (ex: joaosilva)"
          style={{ flex: 1, background: 'var(--c-bg)', border: `1.5px solid ${C.border}`, borderRadius: 10, color: C.text, fontSize: 14, padding: '10px 14px', outline: 'none', fontFamily: 'inherit' }}
        />
        <button
          onClick={doSearch}
          disabled={!search.trim() || searching}
          style={{ background: 'rgba(27,120,247,0.1)', border: '1px solid rgba(27,120,247,0.25)', borderRadius: 10, padding: '10px 16px', color: C.blue, fontSize: 13, fontWeight: 600, cursor: search.trim() ? 'pointer' : 'default', fontFamily: 'inherit' }}
        >
          {searching ? '...' : 'Procurar'}
        </button>
      </div>

      {searchErr && <p style={{ color: C.red, fontSize: 13, margin: '0 0 16px' }}>{searchErr}</p>}

      {searchResult && (
        <div style={{ background: 'rgba(27,120,247,0.06)', border: '1px solid rgba(27,120,247,0.2)', borderRadius: 12, padding: '14px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{searchResult.full_name || searchResult.username}</div>
            <div style={{ fontSize: 12, color: C.muted }}>@{searchResult.username}</div>
          </div>
          <button
            onClick={addCollaborator}
            style={{ background: '#1b78f7', border: 'none', borderRadius: 8, padding: '8px 16px', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Adicionar
          </button>
        </div>
      )}

      {/* Collaborator list with section assignment */}
      {collaborators.length === 0 ? (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '28px', textAlign: 'center' }}>
          <p style={{ margin: 0, color: C.subtle, fontSize: 14 }}>Nenhum colega adicionado ainda.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {collaborators.map(collab => {
            const name = collab.profiles?.full_name || collab.profiles?.username || 'Colega'
            const assigned = pendingSections[collab.user_id] ?? []
            const isPending  = collab.status === 'pending'
            const isDeclined = collab.status === 'declined'
            const statusColor = isPending ? '#fbbf24' : isDeclined ? '#ef4444' : C.green
            const statusLabel = isPending ? 'Convite pendente' : isDeclined ? 'Recusou o convite' : 'Aceite'
            return (
              <div key={collab.user_id} style={{ background: C.card, border: `1px solid ${isDeclined ? 'rgba(239,68,68,0.2)' : C.border}`, borderRadius: 14, padding: '18px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isPending || isDeclined ? 6 : 14 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{name}</div>
                    <div style={{ fontSize: 12, color: C.muted }}>@{collab.profiles?.username}</div>
                  </div>
                  <button
                    onClick={() => removeCollaborator(collab.user_id)}
                    style={{ background: 'transparent', border: 'none', color: C.subtle, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    Remover
                  </button>
                </div>

                {/* Status badge */}
                <div style={{ marginBottom: isPending || isDeclined ? 0 : 12 }}>
                  <span style={{ fontSize: 12, color: statusColor, fontWeight: 600 }}>{statusLabel}</span>
                  {isPending && <span style={{ fontSize: 12, color: C.subtle, marginLeft: 8 }}>— a aguardar que o colega aceite</span>}
                </div>

                {/* Section assignment — only if accepted */}
                {!isPending && !isDeclined && (
                  <>
                    <p style={{ margin: '14px 0 10px', fontSize: 11, fontWeight: 700, color: C.subtle, textTransform: 'uppercase', letterSpacing: 1 }}>
                      Secções atribuídas ({assigned.length})
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {ALL_SECTIONS.map(s => {
                        const on = assigned.includes(s.id)
                        return (
                          <button
                            key={s.id}
                            onClick={() => toggleSection(collab.user_id, s.id)}
                            style={{
                              background: on ? 'rgba(27,120,247,0.12)' : 'transparent',
                              border: `1px solid ${on ? 'rgba(27,120,247,0.4)' : C.border}`,
                              borderRadius: 7, padding: '5px 10px',
                              color: on ? C.blue : C.muted,
                              fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                              transition: 'all 0.12s',
                            }}
                          >
                            <s.Icon size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />{s.label}
                          </button>
                        )
                      })}
                    </div>
                  </>
                )}
              </div>
            )
          })}

          {(hasChanges || saved) && (
            <button
              onClick={saveAssignments}
              disabled={saving}
              style={{
                padding: '12px 0', width: '100%',
                background: saved ? 'rgba(34,197,94,0.1)' : '#1b78f7',
                border: saved ? '1px solid rgba(34,197,94,0.3)' : 'none',
                borderRadius: 12,
                color: saved ? C.green : '#fff',
                fontSize: 14, fontWeight: 700, cursor: saving ? 'default' : 'pointer', fontFamily: 'inherit',
              }}
            >
              {saving ? 'A guardar...' : saved ? <><Check size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />Guardado</> : 'Guardar atribuições'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function DefenseMode({ project, isOwner, collaboratorSections, onClose }) {
  const { profile } = useAuth()
  const studentName = profile?.full_name || profile?.username || ''
  const isCollaborator = collaboratorSections !== null && !isOwner
  const canSeeFullPrep = isOwner || isCollaborator

  const [tab, setTab]             = useState('notes')   // 'notes' | 'jury' | 'guide' | 'grupo'
  const [aiData, setAiData]       = useState(null)
  const [loadingAI, setLoadingAI] = useState(false)
  const [aiError, setAiError]     = useState(false)
  const [guideMode, setGuideMode] = useState(false)

  useEffect(() => {
    if (!canSeeFullPrep) return
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
      collaboratorSections={collaboratorSections}
      studentName={studentName}
    />
  )

  const tabs = [
    { id: 'notes', label: 'Notas',    show: canSeeFullPrep },
    { id: 'jury',  label: 'Júri',     show: canSeeFullPrep },
    { id: 'guide', label: 'No dia',   show: true },
    { id: 'grupo', label: 'Grupo',    show: isOwner },
  ].filter(t => t.show)

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9900, background: 'rgba(5,9,18,0.92)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, fontFamily: 'inherit' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>

      <div style={{ background: 'var(--c-card)', border: '1px solid var(--c-border)', borderRadius: 20, width: '100%', maxWidth: 720, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 32px 80px rgba(0,0,0,0.7)', animation: 'fadeIn 0.2s ease-out' }}>

        {/* Header */}
        <div style={{ padding: '22px 28px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <h2 style={{ margin: '0 0 2px', fontSize: 18, fontWeight: 800, color: C.text }}>Preparar defesa</h2>
            <p style={{ margin: 0, fontSize: 13, color: C.subtle }}>{project.name}</p>
          </div>
          <button onClick={onClose} style={{ background: 'var(--c-bg-alt)', border: '1px solid var(--c-border)', borderRadius: 8, padding: '7px 10px', color: C.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={18} /></button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, padding: '16px 28px 0', flexShrink: 0 }}>
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                background: tab === t.id ? 'rgba(27,120,247,0.12)' : 'transparent',
                border: `1px solid ${tab === t.id ? 'rgba(27,120,247,0.35)' : C.border}`,
                borderRadius: 9, padding: '8px 16px',
                color: tab === t.id ? C.blue : C.muted,
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
          {!canSeeFullPrep && (
            <div style={{ background: 'rgba(27,120,247,0.06)', border: '1px solid rgba(27,120,247,0.15)', borderRadius: 12, padding: '20px', textAlign: 'center' }}>
              <p style={{ margin: 0, color: C.muted, fontSize: 14 }}>A preparação completa está disponível para o criador e colaboradores do projeto.</p>
            </div>
          )}
          {tab === 'notes' && canSeeFullPrep && <NotesPanel aiData={aiData} loadingAI={loadingAI} aiError={aiError} onRetry={loadAI} />}
          {tab === 'jury'  && canSeeFullPrep && <JuryPanel  aiData={aiData} loadingAI={loadingAI} aiError={aiError} onRetry={loadAI} />}
          {tab === 'grupo' && isOwner && <GrupoPanel project={project} />}
          {tab === 'guide' && (
            <div>
              {/* Preview card */}
              <div style={{ background: 'linear-gradient(135deg, rgba(27,120,247,0.08), rgba(79,70,229,0.06))', border: '1px solid rgba(27,120,247,0.2)', borderRadius: 16, padding: '22px 24px', marginBottom: 20 }}>
                <div style={{ marginBottom: 10 }}><Smartphone size={28} color={C.blue} /></div>
                <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 800, color: C.text }}>Guia do Apresentador</h3>
                <p style={{ margin: '0 0 16px', fontSize: 14, color: C.muted, lineHeight: 1.6 }}>
                  Um guia no telemóvel enquanto apresentas no Canva ou PowerPoint. Acompanha as tuas secções, faz check dos pontos-chave e consulta o que dizer se ficares em branco.
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                  {['Pontos-chave interativos', 'Nota completa por secção', 'Temporizador', 'Navegação por swipe'].map(f => (
                    <span key={f} style={{ background: 'rgba(27,120,247,0.08)', border: '1px solid rgba(27,120,247,0.18)', borderRadius: 6, padding: '4px 10px', fontSize: 12, color: C.blue }}>{f}</span>
                  ))}
                </div>
                <button
                  onClick={() => setGuideMode(true)}
                  style={{
                    width: '100%', padding: '14px 0',
                    background: '#1b78f7',
                    border: 'none', borderRadius: 12,
                    color: '#fff', fontSize: 15, fontWeight: 700,
                    cursor: 'pointer', fontFamily: 'inherit',
                    boxShadow: '0 6px 24px rgba(27,120,247,0.35)',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>Abrir guia <ArrowRight size={15} /></span>
                </button>
              </div>

              <p style={{ fontSize: 12, color: C.subtle, textAlign: 'center', margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                <Lightbulb size={12} /> Abre num segundo ecrã ou telemóvel durante a apresentação real
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
