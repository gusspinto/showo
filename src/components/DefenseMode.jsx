import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'

// Build slides from project data, skipping empty ones
function buildSlides(project) {
  const slides = []

  // Cover — always first
  slides.push({
    id: 'cover',
    type: 'cover',
    label: '',
    title: project.name,
    subtitle: project.ai_tagline || project.goal || '',
    meta: [project.creator_name, project.course, project.school_year].filter(Boolean).join(' · '),
    area: project.area,
    accent: '#3b82f6',
  })

  if (project.problem?.trim()) slides.push({
    id: 'problem',
    type: 'content',
    label: 'O Problema',
    title: 'Que problema identificámos?',
    content: project.problem,
    accent: '#f97316',
    icon: '🔍',
  })

  if (project.solution?.trim()) slides.push({
    id: 'solution',
    type: 'content',
    label: 'A Solução',
    title: 'Como o resolvemos',
    content: project.solution,
    accent: '#22c55e',
    icon: '💡',
  })

  if (project.target_audience?.trim()) slides.push({
    id: 'target',
    type: 'content',
    label: 'Público-Alvo',
    title: 'Para quem é?',
    content: project.target_audience,
    accent: '#8b5cf6',
    icon: '👥',
  })

  if (project.features?.trim()) slides.push({
    id: 'features',
    type: 'bullets',
    label: 'Funcionalidades',
    title: 'O que faz o projeto',
    items: project.features.split(/[,\n]/).map(f => f.trim()).filter(Boolean),
    accent: '#06b6d4',
    icon: '⚙️',
  })

  if (project.technologies?.trim()) slides.push({
    id: 'technologies',
    type: 'tech',
    label: 'Tecnologias',
    title: 'Stack utilizada',
    items: project.technologies.split(/[,\n]/).map(t => t.trim()).filter(Boolean),
    accent: '#818cf8',
    icon: '🛠️',
  })

  if (project.challenges?.trim()) slides.push({
    id: 'challenges',
    type: 'content',
    label: 'Desafios',
    title: 'O que foi difícil',
    content: project.challenges,
    accent: '#fbbf24',
    icon: '🧩',
  })

  if (project.results?.trim()) slides.push({
    id: 'results',
    type: 'content',
    label: 'Resultados',
    title: 'O que alcançámos',
    content: project.results,
    accent: '#34d399',
    icon: '🏆',
  })

  if (project.learnings?.trim()) slides.push({
    id: 'learnings',
    type: 'content',
    label: 'Aprendizagens',
    title: 'O que aprendi',
    content: project.learnings,
    accent: '#f472b6',
    icon: '📚',
  })

  // Closing — always last
  slides.push({
    id: 'closing',
    type: 'closing',
    label: '',
    title: 'Obrigado',
    subtitle: 'Questões?',
    meta: [project.creator_name, project.linkedin_url ? 'LinkedIn' : '', project.github_url ? 'GitHub' : ''].filter(Boolean).join(' · '),
    accent: '#3b82f6',
  })

  return slides
}

function SlideContent({ slide, notes, showNotes }) {
  const accent = slide.accent || '#3b82f6'

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      padding: slide.type === 'cover' || slide.type === 'closing' ? '0' : '0 60px',
      justifyContent: 'center',
      position: 'relative',
    }}>
      {/* Accent glow */}
      <div style={{
        position: 'absolute',
        top: slide.type === 'cover' ? '50%' : 80,
        left: slide.type === 'cover' ? '50%' : 40,
        transform: slide.type === 'cover' ? 'translate(-50%,-50%)' : 'none',
        width: slide.type === 'cover' ? 600 : 300,
        height: slide.type === 'cover' ? 600 : 300,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${accent}12 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      {slide.type === 'cover' && (
        <div style={{ textAlign: 'center', padding: '0 60px', position: 'relative', zIndex: 1 }}>
          {slide.area && (
            <span style={{
              display: 'inline-block', marginBottom: 24,
              background: `${accent}18`, border: `1px solid ${accent}44`,
              borderRadius: 999, padding: '6px 18px',
              color: accent, fontSize: 14, fontWeight: 700, letterSpacing: 1,
              textTransform: 'uppercase',
            }}>
              {slide.area}
            </span>
          )}
          <h1 style={{
            fontSize: 'clamp(42px, 7vw, 86px)', fontWeight: 900,
            margin: '0 0 20px', lineHeight: 1.05, letterSpacing: '-2px',
            color: '#f0f6ff',
          }}>
            {slide.title}
          </h1>
          {slide.subtitle && (
            <p style={{ fontSize: 'clamp(16px, 2.5vw, 26px)', color: '#7d93b0', margin: '0 0 36px', lineHeight: 1.5, maxWidth: 700, marginLeft: 'auto', marginRight: 'auto' }}>
              {slide.subtitle}
            </p>
          )}
          {slide.meta && (
            <p style={{ fontSize: 16, color: '#4a6080', fontWeight: 500 }}>{slide.meta}</p>
          )}
        </div>
      )}

      {slide.type === 'content' && (
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 860 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <span style={{
              background: `${accent}18`, border: `1px solid ${accent}30`,
              borderRadius: 8, padding: '6px 10px', fontSize: 20,
            }}>{slide.icon}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: accent, textTransform: 'uppercase', letterSpacing: 1.5 }}>{slide.label}</span>
          </div>
          <h2 style={{ fontSize: 'clamp(22px, 4vw, 44px)', fontWeight: 800, margin: '0 0 28px', color: '#f0f6ff', letterSpacing: '-0.5px', lineHeight: 1.2 }}>
            {slide.title}
          </h2>
          <p style={{ fontSize: 'clamp(16px, 2vw, 22px)', color: '#a0b4cc', lineHeight: 1.75, margin: 0, whiteSpace: 'pre-wrap' }}>
            {slide.content}
          </p>
        </div>
      )}

      {slide.type === 'bullets' && (
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 900 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <span style={{ background: `${accent}18`, border: `1px solid ${accent}30`, borderRadius: 8, padding: '6px 10px', fontSize: 20 }}>{slide.icon}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: accent, textTransform: 'uppercase', letterSpacing: 1.5 }}>{slide.label}</span>
          </div>
          <h2 style={{ fontSize: 'clamp(22px, 3.5vw, 40px)', fontWeight: 800, margin: '0 0 28px', color: '#f0f6ff', letterSpacing: '-0.5px' }}>
            {slide.title}
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {slide.items.slice(0, 6).map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                  background: `${accent}18`, border: `1px solid ${accent}30`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700, color: accent, marginTop: 2,
                }}>
                  {i + 1}
                </div>
                <span style={{ fontSize: 'clamp(15px, 1.8vw, 20px)', color: '#a0b4cc', lineHeight: 1.5 }}>{item}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {slide.type === 'tech' && (
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 900 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <span style={{ background: `${accent}18`, border: `1px solid ${accent}30`, borderRadius: 8, padding: '6px 10px', fontSize: 20 }}>{slide.icon}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: accent, textTransform: 'uppercase', letterSpacing: 1.5 }}>{slide.label}</span>
          </div>
          <h2 style={{ fontSize: 'clamp(22px, 3.5vw, 40px)', fontWeight: 800, margin: '0 0 32px', color: '#f0f6ff', letterSpacing: '-0.5px' }}>
            {slide.title}
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
            {slide.items.map((tech, i) => (
              <span key={i} style={{
                background: `${accent}12`, border: `1px solid ${accent}35`,
                borderRadius: 12, padding: '12px 22px',
                fontSize: 'clamp(14px, 1.5vw, 18px)', fontWeight: 700, color: accent,
              }}>
                {tech}
              </span>
            ))}
          </div>
        </div>
      )}

      {slide.type === 'closing' && (
        <div style={{ textAlign: 'center', padding: '0 60px', position: 'relative', zIndex: 1 }}>
          <h1 style={{ fontSize: 'clamp(52px, 10vw, 120px)', fontWeight: 900, margin: '0 0 16px', letterSpacing: '-3px', color: '#f0f6ff' }}>
            {slide.title}
          </h1>
          <p style={{ fontSize: 'clamp(22px, 3.5vw, 42px)', color: '#3b82f6', fontWeight: 700, margin: '0 0 32px' }}>
            {slide.subtitle}
          </p>
          {slide.meta && (
            <p style={{ fontSize: 16, color: '#4a6080', fontWeight: 500 }}>{slide.meta}</p>
          )}
        </div>
      )}

      {/* Speaker notes panel */}
      {showNotes && notes && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          background: 'rgba(10,14,24,0.97)', borderTop: '1px solid #1e3050',
          padding: '16px 60px', zIndex: 10,
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
            Notas do orador
          </div>
          <p style={{ margin: 0, fontSize: 15, color: '#a0b4cc', lineHeight: 1.65 }}>{notes}</p>
        </div>
      )}
    </div>
  )
}

export default function DefenseMode({ project, isOwner, onClose }) {
  const [current, setCurrent]       = useState(0)
  const [showNotes, setShowNotes]   = useState(false)
  const [showJury, setShowJury]     = useState(false)
  const [aiData, setAiData]         = useState(null)
  const [loadingAI, setLoadingAI]   = useState(false)
  const [timer, setTimer]           = useState(0)
  const [timerOn, setTimerOn]       = useState(false)
  const [copied, setCopied]         = useState(false)
  const timerRef = useRef(null)
  const slides = buildSlides(project)
  const slide = slides[current]

  // Load AI notes on mount (owner only)
  useEffect(() => {
    if (!isOwner) return
    setLoadingAI(true)
    supabase.functions.invoke('defense-notes', { body: { project } })
      .then(({ data }) => { if (data) setAiData(data) })
      .finally(() => setLoadingAI(false))
  }, [])

  // Keyboard navigation
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); next() }
      if (e.key === 'ArrowLeft')                    { e.preventDefault(); prev() }
      if (e.key === 'Escape')                        onClose()
      if (e.key === 'n' || e.key === 'N')            setShowNotes(s => !s)
      if (e.key === 'j' || e.key === 'J')            setShowJury(s => !s)
      if (e.key === 't' || e.key === 'T')            toggleTimer()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [current])

  // Timer
  useEffect(() => {
    if (timerOn) {
      timerRef.current = setInterval(() => setTimer(t => t + 1), 1000)
    } else {
      clearInterval(timerRef.current)
    }
    return () => clearInterval(timerRef.current)
  }, [timerOn])

  function next() { if (current < slides.length - 1) setCurrent(c => c + 1) }
  function prev() { if (current > 0) setCurrent(c => c - 1) }
  function toggleTimer() { setTimerOn(s => !s) }

  function formatTime(s) {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const slideNotes = aiData?.slide_notes?.[slide.id]
  const juryQuestions = aiData?.jury_questions ?? []
  const tip = aiData?.tip

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9900,
      background: '#080e1a',
      display: 'flex', flexDirection: 'column',
      fontFamily: 'Inter, system-ui, sans-serif',
      color: '#f0f6ff',
      userSelect: 'none',
    }}>
      <style>{`
        @keyframes fadeSlide {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 24px', borderBottom: '1px solid #0f1e35', flexShrink: 0,
        background: 'rgba(8,14,26,0.9)', zIndex: 2,
      }}>
        {/* Left: project name + slide label */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#3b82f6' }}>{project.name}</span>
          {slide.label && (
            <>
              <span style={{ color: '#1e3050' }}>·</span>
              <span style={{ fontSize: 12, color: '#4a6080' }}>{slide.label}</span>
            </>
          )}
        </div>

        {/* Right: controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Timer */}
          <button
            onClick={toggleTimer}
            title="T — Timer"
            style={{
              background: timerOn ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${timerOn ? 'rgba(34,197,94,0.3)' : '#1e3050'}`,
              borderRadius: 8, padding: '6px 12px',
              color: timerOn ? '#34d399' : '#4a6080',
              fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              minWidth: 60, textAlign: 'center',
            }}
          >
            {formatTime(timer)}
          </button>

          {/* Notes */}
          {isOwner && (
            <button
              onClick={() => setShowNotes(s => !s)}
              title="N — Notas"
              style={{
                background: showNotes ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${showNotes ? 'rgba(59,130,246,0.4)' : '#1e3050'}`,
                borderRadius: 8, padding: '6px 12px',
                color: showNotes ? '#60a5fa' : '#4a6080',
                fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              {loadingAI ? '⏳' : '📝'} Notas
            </button>
          )}

          {/* Jury questions */}
          {isOwner && (
            <button
              onClick={() => setShowJury(s => !s)}
              title="J — Perguntas do Júri"
              style={{
                background: showJury ? 'rgba(251,191,36,0.1)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${showJury ? 'rgba(251,191,36,0.3)' : '#1e3050'}`,
                borderRadius: 8, padding: '6px 12px',
                color: showJury ? '#fbbf24' : '#4a6080',
                fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              🎓 Júri
            </button>
          )}

          {/* Divider */}
          <div style={{ width: 1, height: 22, background: '#1e3050' }} />

          {/* Slide counter */}
          <span style={{ fontSize: 12, color: '#4a6080', fontWeight: 600, minWidth: 50, textAlign: 'center' }}>
            {current + 1} / {slides.length}
          </span>

          {/* Close */}
          <button
            onClick={onClose}
            title="Esc — Fechar"
            style={{
              background: 'rgba(255,255,255,0.04)', border: '1px solid #1e3050',
              borderRadius: 8, padding: '6px 10px',
              color: '#4a6080', fontSize: 16, cursor: 'pointer', lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Main slide area */}
      {!showJury ? (
        <div
          key={current}
          style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            animation: 'fadeSlide 0.3s ease-out',
            paddingBottom: showNotes && slideNotes ? 120 : 0,
            overflow: 'hidden', position: 'relative',
          }}
        >
          <SlideContent
            slide={slide}
            notes={slideNotes}
            showNotes={showNotes && !!slideNotes}
          />
        </div>
      ) : (
        /* Jury questions panel */
        <div style={{ flex: 1, overflow: 'auto', padding: '40px 60px' }}>
          <div style={{ maxWidth: 820, margin: '0 auto' }}>
            <div style={{ marginBottom: 28 }}>
              <h2 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 6px', color: '#fbbf24' }}>
                Perguntas Prováveis do Júri
              </h2>
              {tip && <p style={{ color: '#7d93b0', fontSize: 14, margin: 0 }}>💡 {tip}</p>}
            </div>
            {loadingAI ? (
              <p style={{ color: '#4a6080' }}>A gerar perguntas...</p>
            ) : juryQuestions.length === 0 ? (
              <p style={{ color: '#4a6080' }}>Sem perguntas geradas.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {juryQuestions.map((item, i) => (
                  <div key={i} style={{
                    background: '#0d1829', border: '1px solid #1e3050',
                    borderRadius: 14, padding: '20px 24px',
                  }}>
                    <p style={{ margin: '0 0 10px', fontSize: 16, fontWeight: 700, color: '#fbbf24' }}>
                      {i + 1}. {item.q}
                    </p>
                    <p style={{ margin: 0, fontSize: 15, color: '#7d93b0', lineHeight: 1.65 }}>
                      {item.a}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bottom nav */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
        padding: '14px 24px', borderTop: '1px solid #0f1e35', flexShrink: 0,
        background: 'rgba(8,14,26,0.9)',
      }}>
        {/* Slide dots */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {slides.map((s, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              style={{
                width: i === current ? 22 : 8,
                height: 8, borderRadius: 4,
                background: i === current ? slide.accent : '#1e3050',
                border: 'none', cursor: 'pointer', padding: 0,
                transition: 'all 0.2s',
              }}
            />
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, marginLeft: 16 }}>
          <button
            onClick={prev}
            disabled={current === 0}
            style={{
              background: 'rgba(255,255,255,0.04)', border: '1px solid #1e3050',
              borderRadius: 8, padding: '8px 20px', color: current === 0 ? '#1e3050' : '#7d93b0',
              fontSize: 18, cursor: current === 0 ? 'default' : 'pointer', fontFamily: 'inherit',
            }}
          >
            ←
          </button>
          <button
            onClick={next}
            disabled={current === slides.length - 1}
            style={{
              background: current === slides.length - 1 ? 'rgba(255,255,255,0.04)' : `linear-gradient(135deg, ${slide.accent}, ${slide.accent}cc)`,
              border: 'none', borderRadius: 8, padding: '8px 32px',
              color: current === slides.length - 1 ? '#1e3050' : '#fff',
              fontSize: 15, fontWeight: 700,
              cursor: current === slides.length - 1 ? 'default' : 'pointer',
              fontFamily: 'inherit',
              boxShadow: current === slides.length - 1 ? 'none' : `0 4px 16px ${slide.accent}44`,
              transition: 'all 0.2s',
            }}
          >
            {current === slides.length - 1 ? 'Fim' : 'Avançar →'}
          </button>
        </div>

        <div style={{ marginLeft: 12, fontSize: 11, color: '#2a3a50' }}>
          ← → navegar · N notas · J júri · T timer · Esc fechar
        </div>
      </div>
    </div>
  )
}
