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

function buildSlides(project) {
  const slides = []
  slides.push({ id: 'cover', type: 'cover', title: project.name, subtitle: project.ai_tagline || project.goal || '', meta: [project.creator_name, project.course, project.school_year].filter(Boolean).join(' · '), area: project.area, accent: '#3b82f6' })
  if (project.problem?.trim())      slides.push({ id: 'problem',      type: 'content', label: 'O Problema',      title: 'Que problema identificámos?', content: project.problem,         accent: '#f97316', icon: '🔍' })
  if (project.solution?.trim())     slides.push({ id: 'solution',     type: 'content', label: 'A Solução',       title: 'Como o resolvemos',           content: project.solution,        accent: '#22c55e', icon: '💡' })
  if (project.features?.trim())     slides.push({ id: 'features',     type: 'bullets', label: 'Funcionalidades', title: 'O que faz o projeto',          items: project.features.split(/[,\n]/).map(f => f.trim()).filter(Boolean), accent: '#06b6d4', icon: '⚙️' })
  if (project.technologies?.trim()) slides.push({ id: 'technologies', type: 'tech',    label: 'Tecnologias',     title: 'Stack utilizada',              items: project.technologies.split(/[,\n]/).map(t => t.trim()).filter(Boolean), accent: '#818cf8', icon: '🛠️' })
  if (project.results?.trim())      slides.push({ id: 'results',      type: 'content', label: 'Resultados',      title: 'O que alcançámos',             content: project.results,         accent: '#34d399', icon: '🏆' })
  if (project.learnings?.trim())    slides.push({ id: 'learnings',    type: 'content', label: 'Aprendizagens',   title: 'O que aprendi',                content: project.learnings,       accent: '#f472b6', icon: '📚' })
  slides.push({ id: 'closing', type: 'closing', title: 'Obrigado', subtitle: 'Questões?', meta: project.creator_name || '', accent: '#3b82f6' })
  return slides
}

function SlideView({ project, onExit }) {
  const [current, setCurrent] = useState(0)
  const slides = buildSlides(project)
  const slide = slides[current]
  const accent = slide.accent || '#3b82f6'

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); if (current < slides.length - 1) setCurrent(c => c + 1) }
      if (e.key === 'ArrowLeft') { e.preventDefault(); if (current > 0) setCurrent(c => c - 1) }
      if (e.key === 'Escape') onExit()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [current])

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 10000, background: '#080e1a', display: 'flex', flexDirection: 'column', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 24px', borderBottom: '1px solid #0f1e35', background: 'rgba(8,14,26,0.95)', flexShrink: 0 }}>
        <span style={{ fontSize: 13, color: '#3b82f6', fontWeight: 700 }}>{project.name}</span>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: C.subtle }}>{current + 1} / {slides.length}</span>
          <button onClick={onExit} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid #1e3050', borderRadius: 8, padding: '6px 10px', color: C.subtle, fontSize: 16, cursor: 'pointer' }}>✕</button>
        </div>
      </div>

      {/* Slide */}
      <div key={current} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 80px', animation: 'fadeIn 0.25s ease-out', overflow: 'hidden', position: 'relative' }}>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 600, height: 600, borderRadius: '50%', background: `radial-gradient(circle, ${accent}10 0%, transparent 65%)`, pointerEvents: 'none' }} />
        <div style={{ position: 'relative', zIndex: 1, textAlign: slide.type === 'cover' || slide.type === 'closing' ? 'center' : 'left', maxWidth: 900, width: '100%' }}>
          {slide.type === 'cover' && (<>
            {slide.area && <span style={{ display: 'inline-block', marginBottom: 20, background: `${accent}18`, border: `1px solid ${accent}44`, borderRadius: 999, padding: '5px 16px', color: accent, fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>{slide.area}</span>}
            <h1 style={{ fontSize: 'clamp(44px, 8vw, 88px)', fontWeight: 900, margin: '0 0 18px', color: '#f0f6ff', letterSpacing: '-2px', lineHeight: 1.05 }}>{slide.title}</h1>
            {slide.subtitle && <p style={{ fontSize: 'clamp(16px, 2.5vw, 26px)', color: C.muted, margin: '0 0 28px' }}>{slide.subtitle}</p>}
            {slide.meta && <p style={{ fontSize: 15, color: C.subtle }}>{slide.meta}</p>}
          </>)}
          {(slide.type === 'content') && (<>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
              <span style={{ background: `${accent}18`, border: `1px solid ${accent}30`, borderRadius: 8, padding: '6px 10px', fontSize: 20 }}>{slide.icon}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: accent, textTransform: 'uppercase', letterSpacing: 1.5 }}>{slide.label}</span>
            </div>
            <h2 style={{ fontSize: 'clamp(24px, 4vw, 46px)', fontWeight: 800, margin: '0 0 24px', color: '#f0f6ff', letterSpacing: '-0.5px' }}>{slide.title}</h2>
            <p style={{ fontSize: 'clamp(16px, 2vw, 22px)', color: '#a0b4cc', lineHeight: 1.75, margin: 0 }}>{slide.content}</p>
          </>)}
          {slide.type === 'bullets' && (<>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
              <span style={{ background: `${accent}18`, border: `1px solid ${accent}30`, borderRadius: 8, padding: '6px 10px', fontSize: 20 }}>{slide.icon}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: accent, textTransform: 'uppercase', letterSpacing: 1.5 }}>{slide.label}</span>
            </div>
            <h2 style={{ fontSize: 'clamp(22px, 3.5vw, 40px)', fontWeight: 800, margin: '0 0 24px', color: '#f0f6ff' }}>{slide.title}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {slide.items.slice(0, 6).map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <span style={{ width: 26, height: 26, borderRadius: 7, background: `${accent}18`, border: `1px solid ${accent}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: accent, flexShrink: 0, marginTop: 2 }}>{i+1}</span>
                  <span style={{ fontSize: 'clamp(15px, 1.8vw, 20px)', color: '#a0b4cc', lineHeight: 1.5 }}>{item}</span>
                </div>
              ))}
            </div>
          </>)}
          {slide.type === 'tech' && (<>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
              <span style={{ background: `${accent}18`, border: `1px solid ${accent}30`, borderRadius: 8, padding: '6px 10px', fontSize: 20 }}>{slide.icon}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: accent, textTransform: 'uppercase', letterSpacing: 1.5 }}>{slide.label}</span>
            </div>
            <h2 style={{ fontSize: 'clamp(22px, 3.5vw, 40px)', fontWeight: 800, margin: '0 0 28px', color: '#f0f6ff' }}>{slide.title}</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              {slide.items.map((t, i) => <span key={i} style={{ background: `${accent}12`, border: `1px solid ${accent}35`, borderRadius: 10, padding: '10px 20px', fontSize: 'clamp(14px,1.5vw,18px)', fontWeight: 700, color: accent }}>{t}</span>)}
            </div>
          </>)}
          {slide.type === 'closing' && (<>
            <h1 style={{ fontSize: 'clamp(56px, 12vw, 120px)', fontWeight: 900, margin: '0 0 14px', color: '#f0f6ff', letterSpacing: '-3px' }}>{slide.title}</h1>
            <p style={{ fontSize: 'clamp(22px, 3.5vw, 42px)', color: '#3b82f6', fontWeight: 700, margin: '0 0 24px' }}>{slide.subtitle}</p>
            {slide.meta && <p style={{ fontSize: 15, color: C.subtle }}>{slide.meta}</p>}
          </>)}
        </div>
      </div>

      {/* Nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px 24px', borderTop: '1px solid #0f1e35', background: 'rgba(8,14,26,0.95)', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 5, marginRight: 12 }}>
          {slides.map((_, i) => <button key={i} onClick={() => setCurrent(i)} style={{ width: i === current ? 20 : 7, height: 7, borderRadius: 4, background: i === current ? accent : '#1e3050', border: 'none', cursor: 'pointer', padding: 0, transition: 'all 0.2s' }} />)}
        </div>
        <button onClick={() => setCurrent(c => Math.max(0, c-1))} disabled={current === 0} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid #1e3050', borderRadius: 8, padding: '8px 18px', color: current === 0 ? '#1e3050' : C.muted, fontSize: 16, cursor: current === 0 ? 'default' : 'pointer', fontFamily: 'inherit' }}>←</button>
        <button onClick={() => setCurrent(c => Math.min(slides.length-1, c+1))} disabled={current === slides.length-1} style={{ background: current === slides.length-1 ? 'rgba(255,255,255,0.04)' : `linear-gradient(135deg,${accent},${accent}bb)`, border: 'none', borderRadius: 8, padding: '8px 28px', color: current === slides.length-1 ? '#1e3050' : '#fff', fontSize: 14, fontWeight: 700, cursor: current === slides.length-1 ? 'default' : 'pointer', fontFamily: 'inherit', boxShadow: current === slides.length-1 ? 'none' : `0 4px 16px ${accent}44` }}>
          {current === slides.length-1 ? 'Fim' : 'Avançar →'}
        </button>
        <span style={{ marginLeft: 8, fontSize: 11, color: '#1e3050' }}>← → navegar · Esc fechar</span>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function DefenseMode({ project, isOwner, onClose }) {
  const [tab, setTab]             = useState('notes')   // 'notes' | 'jury' | 'slides'
  const [aiData, setAiData]       = useState(null)
  const [loadingAI, setLoadingAI] = useState(false)
  const [aiError, setAiError]     = useState(false)
  const [slideMode, setSlideMode] = useState(false)

  useEffect(() => {
    if (!isOwner) return
    loadAI()
  }, [])

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape' && !slideMode) onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [slideMode])

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

  if (slideMode) return <SlideView project={project} onExit={() => setSlideMode(false)} />

  const tabs = [
    { id: 'notes', label: '📝 Notas',    show: true },
    { id: 'jury',  label: '🎓 Júri',     show: isOwner },
    { id: 'slides',label: '▶ Slides',    show: true },
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
              onClick={() => t.id === 'slides' ? setSlideMode(true) : setTab(t.id)}
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
              {t.id === 'slides' && <span style={{ marginLeft: 6, fontSize: 10, color: C.subtle, fontWeight: 400 }}>backup</span>}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '20px 28px 28px' }}>
          {tab === 'notes' && !isOwner && (
            <div style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: 12, padding: '20px', textAlign: 'center' }}>
              <p style={{ margin: 0, color: C.muted, fontSize: 14 }}>As notas do orador estão disponíveis apenas para o criador do projeto.</p>
            </div>
          )}
          {tab === 'notes' && isOwner && <NotesPanel aiData={aiData} loadingAI={loadingAI} aiError={aiError} onRetry={loadAI} />}
          {tab === 'jury'  && <JuryPanel  aiData={aiData} loadingAI={loadingAI} aiError={aiError} onRetry={loadAI} />}
        </div>
      </div>
    </div>
  )
}
