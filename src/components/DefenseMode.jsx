import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { AiUsageBadge, ConfirmUseModal } from './PlanGate'
import { HandShakeIcon as Hand } from '@solar-icons/react/bold/hand-shake'
import { MagnifierIcon as Search } from '@solar-icons/react/bold/magnifier'
import { LightbulbIcon as Lightbulb } from '@solar-icons/react/bold/lightbulb'
import { SettingsIcon as Settings } from '@solar-icons/react/bold/settings'
import { SettingsMinimalisticIcon as Wrench } from '@solar-icons/react/bold/settings-minimalistic'
import { CupStarIcon as Trophy } from '@solar-icons/react/bold/cup-star'
import { Book2Icon as BookOpen } from '@solar-icons/react/bold/book-2'
import { MicrophoneIcon as Mic } from '@solar-icons/react/bold/microphone'
import { SquareAcademicCapIcon as GraduationCap } from '@solar-icons/react/bold/square-academic-cap'
import { CheckCircleIcon as Check } from '@solar-icons/react/bold/check-circle'
import { CloseIcon as X } from '@solar-icons/react/bold/close'
import { SmartphoneIcon as Smartphone } from '@solar-icons/react/bold/smartphone'
import { AltArrowUpIcon as ChevronUp } from '@solar-icons/react/bold/alt-arrow-up'
import { AltArrowDownIcon as ChevronDown } from '@solar-icons/react/bold/alt-arrow-down'
import { AltArrowLeftIcon as ChevronLeft } from '@solar-icons/react/bold/alt-arrow-left'
import { AltArrowRightIcon as ChevronRight } from '@solar-icons/react/bold/alt-arrow-right'
import { ArrowRightIcon as ArrowRight } from '@solar-icons/react/bold/arrow-right'
import { EyeIcon as Eye } from '@solar-icons/react/bold/eye'
import { EyeClosedIcon as EyeOff } from '@solar-icons/react/bold/eye-closed'
import { Tuning2Icon as SlidersHorizontal } from '@solar-icons/react/bold/tuning-2'
import { AlignLeftIcon as AlignLeft } from '@solar-icons/react/bold/align-left'
import { PlayCircleIcon as Play } from '@solar-icons/react/bold/play-circle'
import { PauseCircleIcon as Pause } from '@solar-icons/react/bold/pause-circle'
import { DownloadIcon as FileDown } from '@solar-icons/react/bold/download'
import PptxGenJS from 'pptxgenjs'

const C = {
  bg: 'var(--color-bg)',
  card: 'var(--color-surface)',
  border: 'var(--color-border)',
  blue: 'var(--color-text)',
  yellow: 'var(--color-warning)',
  green: 'var(--color-success)',
  red: 'var(--color-error)',
  muted: 'var(--color-text-secondary)',
  subtle: 'var(--color-text-tertiary)',
  text: 'var(--color-text)',
}

// ─── Notes summary (all sections in one view) ───────────────────────────────

const NOTE_SECTIONS = [
  { id: 'cover',        label: 'Introdução',      Icon: Hand },
  { id: 'problem',      label: 'O Problema',       Icon: Search },
  { id: 'solution',     label: 'A Solução',        Icon: Lightbulb },
  { id: 'features',     label: 'Funcionalidades',  Icon: Settings },
  { id: 'technologies', label: 'Ferramentas & Recursos',      Icon: Wrench },
  { id: 'results',      label: 'Resultados',       Icon: Trophy },
  { id: 'learnings',    label: 'Aprendizagens',    Icon: BookOpen },
  { id: 'closing',      label: 'Encerramento',     Icon: Mic },
]

const DM_SKEL_CSS = `
  @keyframes dm-shimmer { 0%{background-position:-400px 0} 100%{background-position:400px 0} }
  @keyframes dm-card-in { from{opacity:0;transform:translateY(7px)} to{opacity:1;transform:translateY(0)} }
`
const skelLine = (w = '100%', delay = '0s') => ({
  height: 12, width: w, borderRadius: 6,
  background: 'linear-gradient(90deg,var(--color-bg-alt) 25%,var(--color-surface-hover) 50%,var(--color-bg-alt) 75%)',
  backgroundSize: '400px 100%',
  animation: `dm-shimmer 1.5s ease-in-out infinite ${delay}`,
})

function NotesSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <style>{DM_SKEL_CSS}</style>
      {NOTE_SECTIONS.map((section, i) => (
        <div key={section.id} style={{
          background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '18px 20px',
          animation: `dm-card-in 0.35s ease-out ${i * 200}ms both`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <section.Icon size={16} color={C.muted} />
            <span style={{ fontSize: 12, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 1 }}>{section.label}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            <div style={skelLine('100%', '0s')} />
            <div style={skelLine('82%', '0.12s')} />
            <div style={skelLine('60%', '0.24s')} />
          </div>
        </div>
      ))}
    </div>
  )
}

function JurySkeleton() {
  return (
    <div>
      <style>{DM_SKEL_CSS}</style>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={skelLine(100, '0s')} />
      </div>
      <div style={{ height: 4, background: C.border, borderRadius: 2, marginBottom: 24 }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} style={{
            background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden',
            animation: `dm-card-in 0.35s ease-out ${i * 270}ms both`,
          }}>
            <div style={{ padding: '18px 20px', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              <span style={{
                width: 26, height: 26, borderRadius: 8, flexShrink: 0,
                background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700, color: C.yellow,
              }}>{i + 1}</span>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 3 }}>
                <div style={skelLine('100%', '0s')} />
                <div style={skelLine('72%', '0.15s')} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function NotesPanel({ aiData, loadingAI, aiError, onRetry }) {
  if (loadingAI) return <NotesSkeleton />

  if (aiError) return (
    <div style={{ background: 'var(--color-bg-alt)', border: `1px solid ${C.border}`, borderRadius: 14, padding: '32px 28px', textAlign: 'center' }}>
      <p style={{ color: C.text, fontSize: 15, margin: '0 0 8px', fontWeight: 600 }}>Não foi possível gerar as notas</p>
      <p style={{ color: C.muted, fontSize: 13, margin: '0 0 20px', lineHeight: 1.6 }}>
        A IA não conseguiu processar o projeto de momento. Certifica-te de que os campos principais estão preenchidos e tenta novamente.
      </p>
      <button onClick={onRetry} style={{ background: C.blue, color: 'var(--color-bg)', border: 'none', borderRadius: 8, padding: '10px 22px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
        Tentar novamente
      </button>
    </div>
  )

  if (!aiData) return (
    <div style={{ background: 'var(--color-bg-alt)', border: `1px solid ${C.border}`, borderRadius: 14, padding: '32px 28px', textAlign: 'center' }}>
      <p style={{ color: C.text, fontSize: 15, margin: '0 0 8px', fontWeight: 600 }}>Notas da defesa</p>
      <p style={{ color: C.muted, fontSize: 13, margin: '0 0 20px', lineHeight: 1.6 }}>
        A IA vai gerar notas personalizadas para cada secção da tua apresentação com base no conteúdo do projeto.
      </p>
      <button onClick={onRetry} style={{ background: C.blue, color: 'var(--color-bg)', border: 'none', borderRadius: 8, padding: '10px 22px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
        Gerar notas
      </button>
    </div>
  )

  const tip = aiData.tip
  const notes = aiData.slide_notes ?? {}
  const filled = NOTE_SECTIONS.filter(s => notes[s.id])

  return (
    <div>
      {tip && (
        <div style={{ background: 'var(--color-surface-hover)', border: '1px solid var(--color-surface-hover)', borderRadius: 12, padding: '14px 18px', marginBottom: 24, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
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
          <div style={{ textAlign: 'center', padding: '40px 0', color: C.muted }}>
            <p style={{ fontSize: 14, margin: '0 0 16px' }}>Não foi possível gerar notas para este projeto.</p>
            <button onClick={onRetry} style={{ background: C.blue, color: 'var(--color-bg)', border: 'none', borderRadius: 8, padding: '9px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              Tentar novamente
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Jury flashcards ─────────────────────────────────────────────────────────

function JuryPanel({ aiData, loadingAI, aiError, onRetry }) {
  const [revealed, setRevealed] = useState({})
  const [practiced, setPracticed] = useState({})

  if (loadingAI) return <JurySkeleton />

  if (aiError) return (
    <div style={{ background: 'var(--color-bg-alt)', border: `1px solid ${C.border}`, borderRadius: 14, padding: '32px 28px', textAlign: 'center' }}>
      <p style={{ color: C.text, fontSize: 15, margin: '0 0 8px', fontWeight: 600 }}>Não foi possível gerar as perguntas</p>
      <p style={{ color: C.muted, fontSize: 13, margin: '0 0 20px', lineHeight: 1.6 }}>
        A IA não conseguiu processar o projeto de momento. Certifica-te de que os campos principais estão preenchidos e tenta novamente.
      </p>
      <button onClick={onRetry} style={{ background: C.blue, color: 'var(--color-bg)', border: 'none', borderRadius: 8, padding: '10px 22px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
        Tentar novamente
      </button>
    </div>
  )

  if (!aiData) return (
    <div style={{ background: 'var(--color-bg-alt)', border: `1px solid ${C.border}`, borderRadius: 14, padding: '32px 28px', textAlign: 'center' }}>
      <p style={{ color: C.text, fontSize: 15, margin: '0 0 8px', fontWeight: 600 }}>Perguntas do júri</p>
      <p style={{ color: C.muted, fontSize: 13, margin: '0 0 20px', lineHeight: 1.6 }}>
        A IA vai simular as perguntas que um júri faria sobre o teu projeto, com respostas sugeridas.
      </p>
      <button onClick={onRetry} style={{ background: C.blue, color: 'var(--color-bg)', border: 'none', borderRadius: 8, padding: '10px 22px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
        Gerar perguntas
      </button>
    </div>
  )

  const questions = aiData.jury_questions ?? []
  const practicedCount = Object.values(practiced).filter(Boolean).length

  if (questions.length === 0) return (
    <div style={{ textAlign: 'center', padding: '40px 0', color: C.muted }}>
      <p style={{ fontSize: 14, margin: '0 0 16px' }}>Não foi possível gerar perguntas para este projeto.</p>
      <button onClick={onRetry} style={{ background: C.blue, color: 'var(--color-bg)', border: 'none', borderRadius: 8, padding: '9px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
        Tentar novamente
      </button>
    </div>
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
                background: isPracticed ? 'var(--color-success-subtle)' : C.card,
                border: `1px solid ${isPracticed ? 'var(--color-success-subtle)' : C.border}`,
                borderRadius: 14, overflow: 'hidden',
                transition: 'border-color 0.2s, background 0.2s',
              }}
            >
              {/* Question */}
              <div style={{ padding: '18px 20px', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                <span style={{
                  width: 26, height: 26, borderRadius: 8, flexShrink: 0,
                  background: isPracticed ? 'var(--color-success-subtle)' : 'rgba(251,191,36,0.08)',
                  border: `1px solid ${isPracticed ? 'var(--color-success-subtle)' : 'rgba(251,191,36,0.2)'}`,
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
                <div style={{ borderTop: `1px solid ${C.border}`, padding: '16px 20px 16px 60px', background: 'var(--color-bg-alt)' }}>
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
                      background: 'var(--color-success-subtle)', border: '1px solid var(--color-success-subtle)',
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
        <div style={{ marginTop: 24, background: 'var(--color-success-subtle)', border: '1px solid var(--color-success-subtle)', borderRadius: 14, padding: '20px', textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.green }}>Preparação completa</p>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: C.muted }}>Treinaste todas as perguntas. Boa defesa!</p>
        </div>
      )}
    </div>
  )
}

// ─── Teleprompter cover fallback ─────────────────────────────────────────────
function tpCoverFallback(project) {
  const name   = project?.name        || 'o meu projeto'
  const school = project?.school      || ''
  const course = project?.school_course || project?.course || ''
  const goal   = project?.goal        || ''

  const schoolLine = school || course
    ? `Sou aluno${course ? ` do curso de ${course}` : ''}${school ? ` na ${school}` : ''}.`
    : ''

  const goalLine = goal
    ? `O objetivo deste projeto é ${goal.charAt(0).toLowerCase()}${goal.slice(1)}.`
    : ''

  return [
    `Bom dia. O meu nome é [o teu nome] e venho hoje apresentar o meu projeto: ${name}.`,
    schoolLine,
    `Ao longo desta apresentação irei explicar o problema que identifiquei, a solução que desenvolvi, as tecnologias que utilizei e os resultados que obtive.`,
    goalLine,
    `Peço que guardem as questões para o final. Obrigado pela atenção.`,
  ].filter(Boolean).join('\n\n')
}

// ─── Backup slides ────────────────────────────────────────────────────────────

// ─── Presenter guide (phone companion) ───────────────────────────────────────

const SECTIONS = [
  { id: 'cover',        label: 'Introdução',      Icon: Hand,     accent: 'var(--color-text)' },
  { id: 'problem',      label: 'O Problema',       Icon: Search,   accent: 'var(--color-warning)' },
  { id: 'solution',     label: 'A Solução',        Icon: Lightbulb,accent: 'var(--color-success)' },
  { id: 'features',     label: 'Funcionalidades',  Icon: Settings, accent: '#06b6d4' },
  { id: 'technologies', label: 'Ferramentas & Recursos',      Icon: Wrench,   accent: '#818cf8' },
  { id: 'results',      label: 'Resultados',       Icon: Trophy,   accent: 'var(--color-success)' },
  { id: 'learnings',    label: 'Aprendizagens',    Icon: BookOpen, accent: '#f472b6' },
  { id: 'closing',      label: 'Encerramento',     Icon: Mic,      accent: 'var(--color-text)' },
]

function hasContent(project, id) {
  const map = { cover: true, problem: project.problem, solution: project.solution, features: project.features, technologies: project.technologies, results: project.results, learnings: project.learnings, closing: true }
  return !!map[id]
}

// Estimated minutes per section (defaults — overridable per project via guide_config.times)
const SECTION_TIMES = { cover: 1, problem: 2, solution: 2, features: 3, technologies: 2, results: 2, learnings: 2, closing: 1 }

// Applies a project's guide_config (custom order, hidden sections, custom minutes)
// on top of the sections that actually have content. Falls back to the default
// order/visibility/timing when no config has been saved yet.
function buildSections(project) {
  const available = SECTIONS.filter(s => hasContent(project, s.id))
  const config = project.guide_config
  if (!config) return available

  const hidden = new Set(config.hidden || [])
  const byId = Object.fromEntries(available.map(s => [s.id, s]))
  const order = (config.order || []).filter(id => byId[id] && !hidden.has(id))
  // Any newly-content-filled section not yet present in the saved order goes at the end
  const remaining = available.filter(s => !order.includes(s.id) && !hidden.has(s.id))
  return [...order.map(id => byId[id]), ...remaining]
}

function sectionMinutes(project, id) {
  return project.guide_config?.times?.[id] || SECTION_TIMES[id] || 2
}

// Same as buildSections but keeps hidden sections in the list (flagged) so the
// editor can show + re-enable them instead of dropping them entirely.
function editorRows(project) {
  const available = SECTIONS.filter(s => hasContent(project, s.id))
  const config = project.guide_config
  const hidden = new Set(config?.hidden || [])
  const byId = Object.fromEntries(available.map(s => [s.id, s]))
  const orderIds = (config?.order || []).filter(id => byId[id])
  const remaining = available.filter(s => !orderIds.includes(s.id)).map(s => s.id)
  return [...orderIds, ...remaining].map(id => ({
    ...byId[id], hidden: hidden.has(id), mins: config?.times?.[id] || SECTION_TIMES[id] || 2,
  }))
}

function GuideEditor({ project, onSave }) {
  const [rows, setRows]     = useState(() => editorRows(project))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)

  function move(i, dir) {
    setRows(r => {
      const next = [...r]
      const j = i + dir
      if (j < 0 || j >= next.length) return r
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  }
  function toggleHidden(i) {
    setRows(r => r.map((row, idx) => idx === i ? { ...row, hidden: !row.hidden } : row))
  }
  function setMins(i, val) {
    const n = Math.max(1, Math.min(15, Number(val) || 1))
    setRows(r => r.map((row, idx) => idx === i ? { ...row, mins: n } : row))
  }

  async function handleSave() {
    setSaving(true)
    await onSave({
      order: rows.map(r => r.id),
      hidden: rows.filter(r => r.hidden).map(r => r.id),
      times: Object.fromEntries(rows.map(r => [r.id, r.mins])),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: '16px 18px', marginBottom: 20, animation: 'fadeIn 0.2s ease-out' }}>
      <p style={{ margin: '0 0 4px', fontSize: 12, fontWeight: 700, color: C.subtle, textTransform: 'uppercase', letterSpacing: 1 }}>
        Personalizar secções
      </p>
      <p style={{ margin: '0 0 14px', fontSize: 12, color: C.subtle }}>
        Reordena, esconde secções ou ajusta o tempo estimado de cada uma.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {rows.map((row, i) => (
          <div key={row.id} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 10px', borderRadius: 10,
            background: row.hidden ? 'transparent' : 'var(--color-bg-alt)',
            opacity: row.hidden ? 0.5 : 1,
            transition: 'opacity 0.15s, background 0.15s',
          }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <button onClick={() => move(i, -1)} disabled={i === 0} style={{ background: 'none', border: 'none', color: C.subtle, cursor: i === 0 ? 'default' : 'pointer', padding: 1, opacity: i === 0 ? 0.3 : 1 }}><ChevronUp size={13} /></button>
              <button onClick={() => move(i, 1)} disabled={i === rows.length - 1} style={{ background: 'none', border: 'none', color: C.subtle, cursor: i === rows.length - 1 ? 'default' : 'pointer', padding: 1, opacity: i === rows.length - 1 ? 0.3 : 1 }}><ChevronDown size={13} /></button>
            </div>
            <row.Icon size={15} color={row.hidden ? C.subtle : row.accent} style={{ flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: row.hidden ? C.subtle : C.text }}>{row.label}</span>
            <input
              type="number" min={1} max={15} value={row.mins}
              onChange={e => setMins(i, e.target.value)}
              style={{ width: 40, background: 'var(--color-bg)', border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, fontSize: 12, padding: '4px 2px', textAlign: 'center', fontFamily: 'inherit' }}
            />
            <span style={{ fontSize: 11, color: C.subtle }}>min</span>
            <button onClick={() => toggleHidden(i)} title={row.hidden ? 'Mostrar secção' : 'Esconder secção'} style={{ background: 'none', border: 'none', color: row.hidden ? C.subtle : C.blue, cursor: 'pointer', display: 'flex', padding: 4, borderRadius: 6 }}>
              {row.hidden ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        ))}
      </div>
      <button
        onClick={handleSave}
        disabled={saving}
        className="dm-cta-btn"
        style={{ marginTop: 14, width: '100%', padding: '10px 0', background: saved ? 'var(--color-success-subtle)' : 'var(--color-text)', border: saved ? '1px solid var(--color-success-subtle)' : 'none', borderRadius: 10, color: saved ? C.green : 'var(--color-bg)', fontSize: 13, fontWeight: 700, cursor: saving ? 'default' : 'pointer', fontFamily: 'inherit' }}
      >
        {saving ? 'A guardar...' : saved ? 'Guardado' : 'Guardar personalização'}
      </button>
    </div>
  )
}

function PresenterGuide({ project, aiData, loadingAI, aiError, onRetry, onClose, collaboratorSections, studentName }) {
  const allSections = buildSections(project)
  // If collaboratorSections is set (non-owner), only show assigned sections
  const sections = collaboratorSections?.length > 0
    ? allSections.filter(s => collaboratorSections.includes(s.id))
    : allSections
  const totalMins = sections.reduce((acc, s) => acc + sectionMinutes(project, s.id), 0)

  const [started, setStarted]     = useState(false)
  const [finished, setFinished]   = useState(false)
  const [current, setCurrent]     = useState(0)
  const [checked, setChecked]     = useState({})   // { sectionId_pointIdx: bool }
  const [showNote, setShowNote]   = useState(false) // toggle full speaker note
  const [timer, setTimer]         = useState(0)
  const [timerOn, setTimerOn]     = useState(false)
  const timerRef = useRef(null)
  const touchStartX = useRef(null)

  // Teleprompter mode
  const [tpOn, setTpOn]         = useState(false)
  const [tpPaused, setTpPaused] = useState(false)
  const [tpSpeed, setTpSpeed]   = useState(1)  // 0=slow, 1=medium, 2=fast
  const tpScrollRef              = useRef(null)
  const tpRafRef                 = useRef(null)
  const TP_SPEEDS = [0.25, 0.6, 1.2]

  useEffect(() => {
    if (!tpOn || tpPaused) { cancelAnimationFrame(tpRafRef.current); return }
    const px = TP_SPEEDS[tpSpeed]
    function scroll() {
      const el = tpScrollRef.current
      if (el) {
        el.scrollTop += px
        if (el.scrollTop >= el.scrollHeight - el.clientHeight - 2) el.scrollTop = 0
      }
      tpRafRef.current = requestAnimationFrame(scroll)
    }
    tpRafRef.current = requestAnimationFrame(scroll)
    return () => cancelAnimationFrame(tpRafRef.current)
  }, [tpOn, tpPaused, tpSpeed])

  useEffect(() => {
    if (tpScrollRef.current) tpScrollRef.current.scrollTop = 0
    setTpPaused(false)
  }, [current])

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
  const sectionMins  = section ? sectionMinutes(project, section.id) : 2

  // ── Finished / celebration screen ────────────────────────────────────────
  if (finished) {
    const firstName = studentName ? studentName.split(' ')[0] : null
    const mins = Math.floor(timer / 60)
    const secs = timer % 60
    const timeStr = mins > 0 ? `${mins}m ${String(secs).padStart(2,'0')}s` : `${secs}s`

    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'var(--color-bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit', color: C.text, padding: 32, textAlign: 'center' }}>
        <style>{`
          @keyframes pop{0%{transform:scale(0.5);opacity:0}60%{transform:scale(1.15)}100%{transform:scale(1);opacity:1}}
          @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
          .dm-cta-btn { transition: filter 0.15s, opacity 0.15s; }
          .dm-cta-btn:hover { filter: brightness(1.08); }
          .dm-ghost-btn { transition: background 0.15s, border-color 0.15s, color 0.15s; }
          .dm-ghost-btn:hover { background: var(--color-surface-hover); border-color: var(--color-border-hover); color: var(--color-text); }
        `}</style>

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
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12, padding: '16px 24px' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: C.text }}>{timeStr}</div>
            <div style={{ fontSize: 11, color: C.subtle, marginTop: 2 }}>duração</div>
          </div>
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12, padding: '16px 24px' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: C.text }}>{sections.length}</div>
            <div style={{ fontSize: 11, color: C.subtle, marginTop: 2 }}>secções</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 320, animation: 'fadeUp 0.4s 0.6s ease-out both' }}>
          <button
            onClick={() => { setFinished(false); setTimer(0); setTimerOn(false); setCurrent(0); setChecked({}); setShowNote(false) }}
            className="dm-cta-btn"
            style={{ padding: '14px 0', background: 'var(--color-text)', border: 'none', borderRadius: 14, color: 'var(--color-bg)', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 6px 24px var(--color-surface-hover)' }}
          >
            Recomeçar do início
          </button>
          <button
            onClick={onClose}
            className="dm-ghost-btn"
            style={{ padding: '14px 0', background: 'transparent', border: '1px solid var(--color-border)', borderRadius: 14, color: C.muted, fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
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
      <div style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'var(--color-bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit', color: C.text, padding: 24 }}>
        <style>{`
          @keyframes spin{to{transform:rotate(360deg)}}
          @keyframes pop{0%{transform:scale(0.92)}60%{transform:scale(1.04)}100%{transform:scale(1)}}
          @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
          .dm-cta-btn { transition: filter 0.15s, opacity 0.15s; }
          .dm-cta-btn:hover { filter: brightness(1.08); }
          .dm-ghost-btn { transition: background 0.15s, border-color 0.15s, color 0.15s; }
          .dm-ghost-btn:hover { background: var(--color-surface-hover); border-color: var(--color-border-hover); color: var(--color-text); }
        `}</style>

        <div style={{ maxWidth: 360, width: '100%', textAlign: 'center', animation: 'fadeUp 0.3s ease-out' }}>
          {/* Icon */}
          <div style={{ width: 72, height: 72, borderRadius: 20, background: 'var(--color-surface-hover)', border: '1px solid var(--color-surface-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
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
              { n: juryCount || '?', label: 'perguntas' },
            ].map(({ n, label }) => (
              <div key={label} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12, padding: '14px 8px' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: C.text }}>{n}</div>
                <div style={{ fontSize: 11, color: C.subtle, marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Tips */}
          <div style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.18)', borderRadius: 12, padding: '14px 16px', marginBottom: 28, textAlign: 'left' }}>
            <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: 'var(--color-warning)', textTransform: 'uppercase', letterSpacing: 1 }}>Antes de começar</p>
            {['Coloca o telemóvel em silêncio', 'Abre o teu Canva/PowerPoint no PC', 'Mantém este guia no telemóvel'].map(tip => (
              <p key={tip} style={{ margin: '4px 0 0', fontSize: 13, color: C.muted }}>· {tip}</p>
            ))}
          </div>

          {loadingAI && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', marginBottom: 16 }}>
              <div style={{ width: 14, height: 14, border: '2px solid var(--color-border)', borderTop: '2px solid var(--color-text)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              <span style={{ fontSize: 13, color: C.muted }}>A preparar pontos-chave com IA...</span>
            </div>
          )}

          <button
            onClick={() => { setStarted(true); setTimerOn(true) }}
            className="dm-cta-btn"
            style={{
              width: '100%', padding: '16px 0',
              background: 'var(--color-text)',
              border: 'none', borderRadius: 14,
              color: 'var(--color-bg)', fontSize: 17, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit',
              boxShadow: '0 8px 32px var(--color-surface-hover)',
            }}
          >
            Começar apresentação <ArrowRight size={16} style={{ verticalAlign: 'middle', marginLeft: 4 }} />
          </button>

          <button onClick={onClose} className="dm-ghost-btn" style={{ marginTop: 14, background: 'none', border: 'none', borderRadius: 8, padding: '6px 10px', color: C.subtle, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
            Voltar atrás
          </button>
        </div>
      </div>
    )
  }

  // ── Active guide ──────────────────────────────────────────────────────────
  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'var(--color-bg)', display: 'flex', flexDirection: 'column', fontFamily: 'inherit', color: C.text }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pop{0%{transform:scale(0.92)}60%{transform:scale(1.04)}100%{transform:scale(1)}}
        .dm-cta-btn { transition: filter 0.15s, opacity 0.15s; }
        .dm-cta-btn:hover { filter: brightness(1.08); }
        .dm-ghost-btn { transition: background 0.15s, border-color 0.15s, color 0.15s; }
        .dm-ghost-btn:hover:not(:disabled) { background: var(--color-surface-hover); border-color: var(--color-border-hover); color: var(--color-text); }
      `}</style>

      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid var(--color-border)', flexShrink: 0, background: 'var(--color-surface)', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {/* Timer — tap to pause/resume */}
          <button
            onClick={() => setTimerOn(s => !s)}
            style={{ background: timerOn ? `${accent}18` : 'var(--color-bg-alt)', border: `1px solid ${timerOn ? accent + '44' : 'var(--color-border)'}`, borderRadius: 8, padding: '5px 10px', color: timerOn ? accent : C.subtle, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', minWidth: 52, textAlign: 'center' }}
          >
            {fmt(timer)}
          </button>
          {/* Teleprompter toggle */}
          <button
            onClick={() => { setTpOn(s => !s); setTpPaused(false) }}
            title="Modo teleponto"
            style={{ background: tpOn ? `${accent}18` : 'var(--color-bg-alt)', border: `1px solid ${tpOn ? accent + '55' : 'var(--color-border)'}`, borderRadius: 8, padding: '5px 8px', color: tpOn ? accent : C.subtle, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <AlignLeft size={14} />
          </button>
        </div>
        {/* Section dots — collapse to just current/total on very small screens */}
        <div style={{ display: 'flex', gap: 4, flex: 1, justifyContent: 'center', overflow: 'hidden' }}>
          {sections.length <= 10 ? sections.map((s, i) => (
            <button key={s.id} onClick={() => { setCurrent(i); setChecked({}); setShowNote(false); setTpPaused(false) }}
              style={{ width: i === current ? 16 : 5, height: 5, borderRadius: 3, border: 'none', cursor: 'pointer', padding: 0, background: i === current ? accent : i < current ? '#2a4070' : 'var(--color-border)', transition: 'all 0.2s', flexShrink: 0 }}
            />
          )) : (
            <span style={{ fontSize: 12, color: C.subtle, fontWeight: 600 }}>{current + 1}/{sections.length}</span>
          )}
        </div>
        <button onClick={onClose} className="dm-ghost-btn" style={{ background: 'var(--color-bg-alt)', border: '1px solid var(--color-border)', borderRadius: 8, padding: '5px 8px', color: C.subtle, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={15} /></button>
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
          <div style={{ background: 'var(--color-bg-alt)', border: '1px solid var(--color-border)', borderRadius: 8, padding: '4px 10px', textAlign: 'center' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.muted }}>~{sectionMins}m</div>
          </div>
        </div>
        {/* Progress bar */}
        <div style={{ height: 3, background: 'var(--color-border)', borderRadius: 2, overflow: 'hidden', marginTop: 8 }}>
          <div style={{ height: '100%', background: accent, borderRadius: 2, width: `${((current + 1) / sections.length) * 100}%`, transition: 'width 0.3s' }} />
        </div>
      </div>

      {/* Teleprompter mode overlay */}
      {tpOn && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#000', overflow: 'hidden', position: 'relative' }}>
          {/* Fade edges */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 60, background: 'linear-gradient(to bottom, #000, transparent)', zIndex: 2, pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 80, background: 'linear-gradient(to top, #000, transparent)', zIndex: 2, pointerEvents: 'none' }} />

          {/* Scrolling text — only flowing speech, no bullets */}
          <div
            ref={tpScrollRef}
            onClick={() => setTpPaused(p => !p)}
            style={{ flex: 1, overflow: 'hidden', padding: '60px 32px 100px', cursor: 'pointer', userSelect: 'none' }}
          >
            {/* Section label */}
            <div style={{ fontSize: 11, fontWeight: 700, color: `${accent}99`, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 24 }}>
              {current + 1}/{sections.length} · {section.label}
            </div>

            {(() => {
              const text = speakerNote || (section.id === 'cover' ? tpCoverFallback(project) : '')
              if (!text) return (
                <p style={{ margin: 0, fontSize: 20, color: 'rgba(255,255,255,0.35)', lineHeight: 1.6, fontStyle: 'italic' }}>
                  Gera as notas da defesa para ver o texto aqui.
                </p>
              )
              // Split on newlines so paragraphs breathe
              return text.split(/\n+/).filter(Boolean).map((para, i) => (
                <p key={i} style={{ margin: '0 0 32px', fontSize: 28, fontWeight: 600, color: '#fff', lineHeight: 1.65, letterSpacing: '-0.2px' }}>
                  {para}
                </p>
              ))
            })()}
          </div>

          {/* Controls bar */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '14px 20px' }}>
            <button onClick={() => setTpPaused(p => !p)} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 10, padding: '10px 18px', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}>
              {tpPaused ? <><Play size={14} /> Retomar</> : <><Pause size={14} /> Pausar</>}
            </button>
            <div style={{ display: 'flex', gap: 4 }}>
              {['D', 'M', 'R'].map((label, i) => (
                <button key={i} onClick={() => setTpSpeed(i)} style={{ background: tpSpeed === i ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.07)', border: `1px solid ${tpSpeed === i ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.12)'}`, borderRadius: 7, padding: '7px 10px', color: tpSpeed === i ? '#fff' : 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {label}
                </button>
              ))}
            </div>
            <button onClick={() => setTpOn(false)} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>Sair</button>
          </div>
        </div>
      )}

      {/* Key points + speaker note */}
      <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px', display: tpOn ? 'none' : undefined }}>
        {loadingAI ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[0,1,2].map(i => (
              <div key={i} style={{ height: 56, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12, opacity: 0.5 + i * 0.15 }} />
            ))}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
              <div style={{ width: 14, height: 14, border: '2px solid var(--color-border)', borderTop: `2px solid ${accent}`, borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              <span style={{ fontSize: 13, color: C.subtle }}>A gerar pontos-chave...</span>
            </div>
          </div>
        ) : aiError ? (
          <div style={{ background: 'var(--color-error-subtle)', border: '1px solid var(--color-error-subtle)', borderRadius: 12, padding: '20px', textAlign: 'center' }}>
            <p style={{ color: C.red, margin: '0 0 12px', fontSize: 14 }}>Não foi possível carregar os pontos-chave.</p>
            <button onClick={onRetry} style={{ background: 'var(--color-error-subtle)', border: '1px solid var(--color-error-subtle)', borderRadius: 8, padding: '8px 18px', color: C.red, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Tentar novamente</button>
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
                    background: done ? `${accent}10` : 'var(--color-surface)',
                    border: `1.5px solid ${done ? accent + '50' : 'var(--color-border)'}`,
                    borderRadius: 14, padding: '18px 18px', cursor: 'pointer',
                    textAlign: 'left', fontFamily: 'inherit',
                    transition: 'all 0.15s', minHeight: 64,
                  }}
                >
                  <span style={{
                    width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                    background: done ? accent : 'var(--color-bg-alt)',
                    border: `1.5px solid ${done ? accent : 'var(--color-border)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, color: done ? '#fff' : C.subtle, fontWeight: 700,
                    transition: 'all 0.15s',
                  }}>
                    {done ? <Check size={14} color="#fff" /> : i + 1}
                  </span>
                  <span style={{ fontSize: 17, fontWeight: done ? 400 : 600, color: done ? C.subtle : C.text, lineHeight: 1.4, textDecoration: done ? 'line-through' : 'none', transition: 'all 0.15s' }}>
                    {point}
                  </span>
                </button>
              )
            })}

            {allChecked && (
              <div style={{ background: `${accent}0d`, border: `1px solid ${accent}30`, borderRadius: 12, padding: '14px 18px', textAlign: 'center', animation: 'pop 0.3s ease-out' }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>Secção completa, avança! <ChevronRight size={16} /></span>
              </div>
            )}

            {/* Speaker note toggle */}
            {speakerNote && (
              <div style={{ marginTop: 4 }}>
                <button
                  onClick={() => setShowNote(s => !s)}
                  style={{ background: 'transparent', border: `1px solid ${showNote ? 'var(--color-border-hover)' : 'var(--color-border)'}`, borderRadius: 9, padding: '7px 14px', color: showNote ? C.blue : C.subtle, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}
                >
                  {showNote
                    ? <><ChevronUp size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />Esconder nota</>
                    : <><ChevronDown size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />Ver nota completa</>
                  }
                </button>
                {showNote && (
                  <div style={{ marginTop: 10, background: 'var(--color-surface-hover)', border: '1px solid var(--color-surface-hover)', borderRadius: 12, padding: '14px 16px', animation: 'pop 0.2s ease-out' }}>
                    <p style={{ margin: 0, fontSize: 14, color: C.muted, lineHeight: 1.75 }}>{speakerNote}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* No AI data — show raw content as fallback */
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12, padding: '18px' }}>
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
      <div style={{ display: 'flex', gap: 10, padding: '12px 16px', borderTop: '1px solid var(--color-border)', flexShrink: 0, background: 'var(--color-surface)' }}>
        <button
          onClick={prev}
          disabled={current === 0}
          className="dm-ghost-btn"
          style={{ flex: 1, padding: '18px 0', background: 'var(--color-bg-alt)', border: '1px solid var(--color-border)', borderRadius: 14, color: current === 0 ? 'var(--color-border)' : C.muted, fontSize: 20, cursor: current === 0 ? 'default' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        ><ChevronLeft size={22} /></button>
        <button
          onClick={() => {
            if (current === sections.length - 1) { setTimerOn(false); setFinished(true) }
            else next()
          }}
          className="dm-cta-btn"
          style={{ flex: 3, padding: '18px 0', background: `linear-gradient(135deg, ${current === sections.length - 1 ? 'var(--color-success), #16a34a' : `${accent}, ${accent}bb`})`, border: 'none', borderRadius: 14, color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: `0 4px 20px ${current === sections.length - 1 ? 'var(--color-success-subtle)' : accent + '44'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
        >
          {current === sections.length - 1
            ? 'Terminar apresentação'
            : <>Próxima <ChevronRight size={16} /></>
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
  { id: 'technologies', label: 'Ferramentas & Recursos',      Icon: Wrench },
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
        Adiciona os teus colegas de grupo pelo username do Showo. Depois atribui as secções que cada um vai apresentar. O Guia do Apresentador deles só mostrará as secções deles.
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
          style={{ flex: 1, background: 'var(--color-bg)', border: `1.5px solid ${C.border}`, borderRadius: 10, color: C.text, fontSize: 14, padding: '10px 14px', outline: 'none', fontFamily: 'inherit' }}
        />
        <button
          onClick={doSearch}
          disabled={!search.trim() || searching}
          style={{ background: 'var(--color-surface-hover)', border: '1px solid var(--color-surface-hover)', borderRadius: 10, padding: '10px 16px', color: C.blue, fontSize: 13, fontWeight: 600, cursor: search.trim() ? 'pointer' : 'default', fontFamily: 'inherit' }}
        >
          {searching ? '...' : 'Procurar'}
        </button>
      </div>

      {searchErr && <p style={{ color: C.red, fontSize: 13, margin: '0 0 16px' }}>{searchErr}</p>}

      {searchResult && (
        <div style={{ background: 'var(--color-surface-hover)', border: '1px solid var(--color-surface-hover)', borderRadius: 12, padding: '14px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{searchResult.full_name || searchResult.username}</div>
            <div style={{ fontSize: 12, color: C.muted }}>@{searchResult.username}</div>
          </div>
          <button
            onClick={addCollaborator}
            style={{ background: 'var(--color-text)', border: 'none', borderRadius: 8, padding: '8px 16px', color: 'var(--color-bg)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
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
            const statusColor = isPending ? 'var(--color-warning)' : isDeclined ? 'var(--color-error)' : C.green
            const statusLabel = isPending ? 'Convite pendente' : isDeclined ? 'Recusou o convite' : 'Aceite'
            return (
              <div key={collab.user_id} style={{ background: C.card, border: `1px solid ${isDeclined ? 'var(--color-error-subtle)' : C.border}`, borderRadius: 14, padding: '18px 20px' }}>
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
                  {isPending && <span style={{ fontSize: 12, color: C.subtle, marginLeft: 8 }}>a aguardar que o colega aceite</span>}
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
                              background: on ? 'var(--color-surface-hover)' : 'transparent',
                              border: `1px solid ${on ? 'var(--color-surface-hover)' : C.border}`,
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
                background: saved ? 'var(--color-success-subtle)' : 'var(--color-text)',
                border: saved ? '1px solid var(--color-success-subtle)' : 'none',
                borderRadius: 12,
                color: saved ? C.green : 'var(--color-bg)',
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

// ─── PowerPoint export ──────────────────────────────────────────────────────

const SECTION_COLORS = {
  cover: '1a1a1a', problem: 'D97706', solution: '059669',
  features: '0891B2', technologies: '6366F1', results: '059669',
  learnings: 'EC4899', closing: '1a1a1a',
}

function extractBullets(text, aiNote, max = 5) {
  const sources = [text, aiNote].filter(Boolean).join('\n')
  if (!sources) return []
  const seen = new Set()
  const lines = sources.split(/[\n.!?]+/)
    .map(l => l.replace(/^[-•*\d]+[.)]\s*/, '').replace(/^(PONTOS-CHAVE|O QUE DIZER):?\s*/i, '').trim())
    .filter(l => l.length > 15 && l.length < 150 && !seen.has(l.toLowerCase()) && (seen.add(l.toLowerCase()), true))
  return lines.slice(0, max)
}

function exportPptx(project, aiData) {
  const pptx = new PptxGenJS()
  pptx.title = project.name || 'Apresentação'
  pptx.author = 'Showo'
  pptx.layout = 'LAYOUT_WIDE'

  const FONT = 'Calibri'
  const BG = 'FFFFFF'
  const TEXT_DARK = '1E1E1E'
  const TEXT_MID = '555555'
  const TEXT_LIGHT = '999999'
  const CARD_BG = 'F3F4F6'

  // Cover slide — dark, minimal
  const cover = pptx.addSlide()
  cover.background = { color: '111111' }
  const coverAccent = SECTION_COLORS[buildSections(project)[0]?.id] || 'D97706'
  cover.addShape(pptx.ShapeType.rect, { x: 0.8, y: 3.0, w: 1.2, h: 0.06, fill: { color: coverAccent } })
  cover.addText(project.name || 'Projeto', {
    x: 0.8, y: 1.2, w: 11,
    fontSize: 44, fontFace: FONT, bold: true, color: 'FFFFFF',
  })
  if (project.ai_tagline) {
    cover.addText(project.ai_tagline, {
      x: 0.8, y: 3.4, w: 11,
      fontSize: 18, fontFace: FONT, italic: true, color: '888888', lineSpacingMultiple: 1.3,
    })
  }
  if (project.area) {
    cover.addText(project.area.toUpperCase(), {
      x: 0.8, y: 6.4, w: 11,
      fontSize: 12, fontFace: FONT, color: '666666', charSpacing: 3,
    })
  }
  const coverNote = aiData?.slide_notes?.cover
  if (coverNote) cover.addNotes(coverNote)

  // Content slides
  const contentSections = buildSections(project).filter(s => s.id !== 'cover' && s.id !== 'closing')

  for (const section of contentSections) {
    const slide = pptx.addSlide()
    slide.background = { color: BG }
    const keyPoints = aiData?.key_points?.[section.id] ?? []
    const speakerNote = aiData?.slide_notes?.[section.id] ?? ''
    const accent = SECTION_COLORS[section.id] || '1a1a1a'
    const content = getSlideContent(project, section.id)
    const bullets = extractBullets(content, speakerNote, 5)

    // Top accent line
    slide.addShape(pptx.ShapeType.rect, { x: 0.8, y: 0.55, w: 0.8, h: 0.05, fill: { color: accent } })

    // Section title
    slide.addText(section.label, {
      x: 0.8, y: 0.7, w: 8,
      fontSize: 28, fontFace: FONT, bold: true, color: TEXT_DARK,
    })

    // Main content bullets (left side, or full width if no key points)
    const hasRight = keyPoints.length > 0
    const contentW = hasRight ? 6.5 : 11
    if (bullets.length) {
      const bulletRows = bullets.map(b => ({
        text: b, options: { bullet: { code: '2022', color: accent }, indentLevel: 0 },
      }))
      slide.addText(bulletRows, {
        x: 0.8, y: 1.5, w: contentW, h: 5.2,
        fontSize: 16, fontFace: FONT, color: TEXT_MID,
        valign: 'top', lineSpacingMultiple: 1.5, paraSpaceAfter: 8,
      })
    } else if (content) {
      slide.addText(content.slice(0, 400), {
        x: 0.8, y: 1.5, w: contentW, h: 5.2,
        fontSize: 15, fontFace: FONT, color: TEXT_MID,
        valign: 'top', wrap: true, lineSpacingMultiple: 1.4,
      })
    }

    // Key points on right as cards
    if (hasRight) {
      slide.addText('PONTOS-CHAVE', {
        x: 8.0, y: 1.5, w: 4.5,
        fontSize: 10, fontFace: FONT, bold: true, color: TEXT_LIGHT, charSpacing: 2,
      })
      keyPoints.slice(0, 4).forEach((p, i) => {
        const cardY = 2.0 + i * 1.1
        slide.addShape(pptx.ShapeType.roundRect, {
          x: 8.0, y: cardY, w: 4.5, h: 0.9,
          fill: { color: CARD_BG }, rectRadius: 0.06,
        })
        slide.addShape(pptx.ShapeType.rect, {
          x: 8.0, y: cardY, w: 0.08, h: 0.9, fill: { color: accent },
        })
        slide.addText(p, {
          x: 8.3, y: cardY, w: 4.0, h: 0.9,
          fontSize: 12, fontFace: FONT, color: TEXT_DARK, valign: 'middle', lineSpacingMultiple: 1.2,
        })
      })
    }

    // Speaker notes
    const noteParts = []
    if (keyPoints.length) noteParts.push('PONTOS-CHAVE:\n' + keyPoints.map((p, i) => `${i + 1}. ${p}`).join('\n'))
    if (speakerNote) noteParts.push('\nO QUE DIZER:\n' + speakerNote)
    if (content) noteParts.push('\nCONTEÚDO COMPLETO:\n' + content)
    if (noteParts.length) slide.addNotes(noteParts.join('\n'))
  }

  // Closing slide
  const closing = pptx.addSlide()
  closing.background = { color: '111111' }
  closing.addText('Obrigado', {
    x: 0, y: 2.2, w: '100%',
    fontSize: 44, fontFace: FONT, bold: true, color: 'FFFFFF', align: 'center',
  })
  closing.addShape(pptx.ShapeType.rect, { x: 5.9, y: 3.6, w: 1.2, h: 0.05, fill: { color: coverAccent } })
  closing.addText(project.name || '', {
    x: 0, y: 3.9, w: '100%',
    fontSize: 16, fontFace: FONT, color: '666666', align: 'center',
  })
  const closingNote = aiData?.slide_notes?.closing
  if (closingNote) closing.addNotes(closingNote)

  const slug = (project.slug || project.name || 'apresentacao').replace(/[^a-z0-9_-]/gi, '_')
  pptx.writeFile({ fileName: `${slug}_notas.pptx` })
}

function getSlideContent(project, sectionId) {
  const map = {
    problem: project.problem,
    solution: project.solution,
    features: project.features,
    technologies: project.technologies,
    results: project.results,
    learnings: project.learnings,
  }
  return (map[sectionId] || '').trim()
}

// ─── Defense Training (record + AI feedback) ────────────────────────────────

function DefenseTraining({ project, checkGate, consumeAI }) {
  const [phase, setPhase] = useState('idle') // idle | recording | processing | done | error | unsupported
  const [transcript, setTranscript] = useState('')
  const [feedback, setFeedback] = useState(null)
  const [error, setError] = useState('')
  const [elapsed, setElapsed] = useState(0)
  const recognitionRef = useRef(null)
  const timerRef = useRef(null)
  const transcriptRef = useRef('')

  const SpeechRecognition = typeof window !== 'undefined'
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null

  function startRecording() {
    const gate = checkGate('defenseTraining')
    if (!gate.allowed) { setError(gate.message?.body || 'Limite de treinos atingido.'); return }

    if (!SpeechRecognition) { setPhase('unsupported'); return }

    setError('')
    setTranscript('')
    setFeedback(null)
    transcriptRef.current = ''

    const recognition = new SpeechRecognition()
    recognition.lang = 'pt-PT'
    recognition.continuous = true
    recognition.interimResults = true
    recognition.maxAlternatives = 1

    recognition.onresult = (e) => {
      let full = ''
      for (let i = 0; i < e.results.length; i++) {
        full += e.results[i][0].transcript + ' '
      }
      transcriptRef.current = full.trim()
      setTranscript(full.trim())
    }

    recognition.onerror = (e) => {
      if (e.error === 'not-allowed') setError('Permissão de microfone negada. Permite o acesso nas definições do browser.')
      else if (e.error !== 'aborted') setError('Erro no reconhecimento de voz: ' + e.error)
    }

    recognition.onend = () => {
      if (phase === 'recording') recognition.start()
    }

    recognitionRef.current = recognition
    recognition.start()
    setPhase('recording')
    setElapsed(0)
    timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000)
  }

  async function stopRecording() {
    clearInterval(timerRef.current)
    if (recognitionRef.current) {
      recognitionRef.current.onend = null
      recognitionRef.current.stop()
    }

    const finalTranscript = transcriptRef.current
    if (finalTranscript.length < 50) {
      setError('Transcrição demasiado curta. Tenta apresentar pelo menos 1 minuto.')
      setPhase('idle')
      return
    }

    setPhase('processing')
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('defense-training', {
        body: { transcript: finalTranscript, project, durationSeconds: elapsed },
      })
      if (fnErr || data?.error) {
        setError(data?.error || 'Erro ao obter feedback.')
        setPhase('error')
        return
      }
      consumeAI('defenseTraining')
      setFeedback(data)
      setPhase('done')
    } catch {
      setError('Erro de ligação.')
      setPhase('error')
    }
  }

  const formatTime = (s) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`

  if (phase === 'unsupported') {
    return (
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, textAlign: 'center' }}>
        <p style={{ margin: 0, color: C.muted, fontSize: 14 }}>O teu browser não suporta reconhecimento de voz. Usa o Chrome ou o Edge.</p>
      </div>
    )
  }

  if (phase === 'done' && feedback) {
    const scoreColor = feedback.score >= 70 ? 'var(--color-success)' : feedback.score >= 40 ? 'var(--color-warning)' : 'var(--color-error)'
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Score header */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 36, fontWeight: 900, color: scoreColor }}>{feedback.score}</span>
          <div>
            <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Pontuação geral</span>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: C.muted }}>{feedback.duration_feedback}</p>
          </div>
        </div>

        {/* Content coverage */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '18px 20px' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 1 }}>Cobertura de conteúdo</span>
          {feedback.content_coverage?.covered?.length > 0 && (
            <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {feedback.content_coverage.covered.map((s, i) => (
                <span key={i} style={{ background: 'var(--color-success-subtle)', color: 'var(--color-success)', borderRadius: 6, padding: '3px 8px', fontSize: 11, fontWeight: 600 }}>{s}</span>
              ))}
            </div>
          )}
          {feedback.content_coverage?.missing?.length > 0 && (
            <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {feedback.content_coverage.missing.map((s, i) => (
                <span key={i} style={{ background: 'var(--color-error-subtle)', color: 'var(--color-error)', borderRadius: 6, padding: '3px 8px', fontSize: 11, fontWeight: 600 }}>{s}</span>
              ))}
            </div>
          )}
          {feedback.content_coverage?.comment && <p style={{ margin: '10px 0 0', fontSize: 13, color: C.text, lineHeight: 1.6 }}>{feedback.content_coverage.comment}</p>}
        </div>

        {/* Clarity */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 1 }}>Clareza</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: feedback.clarity?.score >= 70 ? 'var(--color-success)' : 'var(--color-warning)' }}>{feedback.clarity?.score}/100</span>
          </div>
          {feedback.clarity?.strengths?.map((s, i) => <p key={i} style={{ margin: '4px 0', fontSize: 13, color: C.text }}>✓ {s}</p>)}
          {feedback.clarity?.improvements?.map((s, i) => <p key={i} style={{ margin: '4px 0', fontSize: 13, color: C.muted }}>→ {s}</p>)}
        </div>

        {/* Filler words */}
        {feedback.filler_words?.detected?.length > 0 && (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '18px 20px' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 1 }}>Palavras de preenchimento</span>
            <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {feedback.filler_words.detected.map((w, i) => (
                <span key={i} style={{ background: 'var(--color-warning-subtle)', color: 'var(--color-warning)', borderRadius: 6, padding: '3px 8px', fontSize: 11, fontWeight: 600 }}>"{w}"</span>
              ))}
            </div>
            {feedback.filler_words.comment && <p style={{ margin: '8px 0 0', fontSize: 13, color: C.muted }}>{feedback.filler_words.comment}</p>}
          </div>
        )}

        {/* Top tips */}
        {feedback.top_tips?.length > 0 && (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '18px 20px' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 1 }}>Dicas para a próxima</span>
            {feedback.top_tips.map((t, i) => <p key={i} style={{ margin: '8px 0 0', fontSize: 13, color: C.text, lineHeight: 1.6 }}>{i + 1}. {t}</p>)}
          </div>
        )}

        <button
          onClick={() => { setPhase('idle'); setFeedback(null); setTranscript(''); setElapsed(0) }}
          style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '12px 0', color: C.text, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
        >Treinar outra vez</button>
      </div>
    )
  }

  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '24px 20px', textAlign: 'center' }}>
      {phase === 'idle' && (
        <>
          <Mic size={32} color={C.blue} style={{ marginBottom: 12 }} />
          <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 800, color: C.text }}>Treina a tua defesa</h3>
          <p style={{ margin: '0 0 20px', fontSize: 13, color: C.muted, lineHeight: 1.6 }}>
            Carrega em gravar e apresenta o teu projeto como se estivesses frente ao júri. A IA vai analisar o conteúdo, a clareza e dar-te dicas.
          </p>
          {error && <p style={{ margin: '0 0 12px', fontSize: 12, color: C.red }}>{typeof error === 'string' ? error : error.body || 'Erro'}</p>}
          <button
            onClick={startRecording}
            style={{
              background: C.blue, border: 'none', borderRadius: 10, padding: '12px 28px',
              color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              display: 'inline-flex', alignItems: 'center', gap: 8,
            }}
          ><Mic size={16} /> Começar a gravar</button>
        </>
      )}

      {phase === 'recording' && (
        <>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--color-error-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', animation: 'pulse 1.5s ease-in-out infinite' }}>
            <Mic size={28} color="var(--color-error)" />
          </div>
          <style>{`@keyframes pulse { 0%,100% { transform: scale(1); opacity: 1 } 50% { transform: scale(1.08); opacity: 0.8 } }`}</style>
          <p style={{ fontSize: 28, fontWeight: 900, color: C.text, margin: '0 0 4px', fontVariantNumeric: 'tabular-nums' }}>{formatTime(elapsed)}</p>
          <p style={{ fontSize: 12, color: C.muted, margin: '0 0 4px' }}>A ouvir...</p>
          {transcript && (
            <p style={{ fontSize: 12, color: C.muted, margin: '8px 0 16px', maxHeight: 60, overflow: 'auto', textAlign: 'left', background: 'var(--color-bg)', borderRadius: 8, padding: '8px 10px', lineHeight: 1.5 }}>
              {transcript.slice(-200)}
            </p>
          )}
          <button
            onClick={stopRecording}
            style={{
              background: 'var(--color-error)', border: 'none', borderRadius: 10, padding: '12px 28px',
              color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >Parar e obter feedback</button>
        </>
      )}

      {phase === 'processing' && (
        <>
          <div style={{ width: 32, height: 32, border: '3px solid var(--color-border)', borderTopColor: C.blue, borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: '0 0 4px' }}>A analisar a tua apresentação...</p>
          <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>Isto demora alguns segundos.</p>
        </>
      )}

      {phase === 'error' && (
        <>
          <p style={{ fontSize: 14, color: C.red, margin: '0 0 12px' }}>{error}</p>
          <button
            onClick={() => { setPhase('idle'); setError('') }}
            style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 20px', color: C.text, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
          >Tentar outra vez</button>
        </>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function DefenseMode({ project, isOwner, collaboratorSections, onClose }) {
  const { profile, checkGate, consumeAI } = useAuth()
  const studentName = profile?.full_name || profile?.username || ''
  const isCollaborator = collaboratorSections !== null && !isOwner
  const canSeeFullPrep = isOwner || isCollaborator

  const [tab, setTab]             = useState('notes')   // 'notes' | 'jury' | 'guide' | 'grupo'
  const [aiData, setAiData]       = useState(project.defense_ai_data || null)
  const [loadingAI, setLoadingAI] = useState(false)
  const [aiError, setAiError]     = useState(false)
  const [guideConfig, setGuideConfig] = useState(project.guide_config || null)
  const [showGuideEditor, setShowGuideEditor] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [confirmUse, setConfirmUse] = useState(null)
  const effectiveProject = { ...project, guide_config: guideConfig }

  async function saveGuideConfig(next) {
    setGuideConfig(next)
    await supabase.from('projects').update({ guide_config: next }).eq('id', project.id)
  }


  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  function tryLoadAI() {
    const gate = checkGate('defense')
    if (!gate.allowed) { setAiError(true); return }
    if (gate.remaining <= 2 && gate.remaining !== Infinity) {
      setConfirmUse({ remaining: gate.remaining, limit: gate.limit })
      return
    }
    loadAI()
  }

  function loadAI() {
    setLoadingAI(true)
    setAiError(false)
    setConfirmUse(null)
    supabase.functions.invoke('defense-notes', { body: { project } })
      .then(({ data, error }) => {
        if (error || !data) { setAiError(true); return }
        const hasNotes = data.slide_notes && Object.values(data.slide_notes).some(Boolean)
        const hasQuestions = Array.isArray(data.jury_questions) && data.jury_questions.length > 0
        if (!hasNotes && !hasQuestions) { setAiError(true); return }
        consumeAI('defense')
        setAiData(data)
        if (project?.id) supabase.from('projects').update({ defense_ai_data: data }).eq('id', project.id)
      })
      .catch(() => setAiError(true))
      .finally(() => setLoadingAI(false))
  }

  async function handleExportPptx() {
    if (!aiData) { tryLoadAI(); return }
    setExporting(true)
    try { exportPptx(effectiveProject, aiData) } finally { setExporting(false) }
  }

  const tabs = [
    { id: 'notes', label: 'Notas',    show: canSeeFullPrep },
    { id: 'jury',  label: 'Júri',     show: canSeeFullPrep },
    { id: 'guide', label: 'No dia',   show: true },
    { id: 'grupo', label: 'Grupo',    show: isOwner },
  ].filter(t => t.show)

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, fontFamily: 'inherit' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      {confirmUse && (
        <ConfirmUseModal
          feature="defense"
          remaining={confirmUse.remaining}
          limit={confirmUse.limit}
          onConfirm={loadAI}
          onCancel={onClose}
        />
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>

      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', width: '100%', maxWidth: 720, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-xl)', animation: 'fadeIn 0.2s ease-out' }}>

        {/* Header */}
        <div style={{ padding: '22px 28px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <h2 style={{ margin: '0 0 2px', fontSize: 'var(--text-lg)', fontWeight: 700, color: C.text, fontFamily: 'var(--font-heading)', letterSpacing: '-0.02em' }}>Preparar defesa</h2>
            <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: C.muted, display: 'flex', alignItems: 'center', gap: 8 }}>{project.name} <AiUsageBadge feature="defense" compact /></p>
          </div>
          <button
            onClick={onClose}
            className="dm-icon-btn"
            style={{ background: 'transparent', border: 'none', borderRadius: 'var(--radius-sm)', padding: 4, color: C.subtle, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'color 0.15s' }}
          ><X size={18} /></button>
        </div>

        <style>{`
          .dm-icon-btn:hover { color: var(--color-text) !important; }
          .dm-tab-btn:hover:not(.active) { color: var(--color-text) !important; border-color: var(--color-border-hover) !important; }
        `}</style>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, padding: '16px 28px 0', flexShrink: 0 }}>
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`dm-tab-btn${tab === t.id ? ' active' : ''}`}
              style={{
                background: tab === t.id ? 'var(--color-surface-hover)' : 'transparent',
                border: `1px solid ${tab === t.id ? 'var(--color-surface-hover)' : C.border}`,
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
            <div style={{ background: 'var(--color-surface-hover)', border: '1px solid var(--color-surface-hover)', borderRadius: 12, padding: '20px', textAlign: 'center' }}>
              <p style={{ margin: 0, color: C.muted, fontSize: 14 }}>A preparação completa está disponível para o criador e colaboradores do projeto.</p>
            </div>
          )}
          {tab === 'notes' && canSeeFullPrep && <NotesPanel aiData={aiData} loadingAI={loadingAI} aiError={aiError} onRetry={tryLoadAI} />}
          {tab === 'jury'  && canSeeFullPrep && <JuryPanel  aiData={aiData} loadingAI={loadingAI} aiError={aiError} onRetry={tryLoadAI} />}
          {tab === 'grupo' && isOwner && <GrupoPanel project={project} />}
          {tab === 'guide' && (
            <div>
              {isOwner && (
                <button
                  onClick={() => setShowGuideEditor(s => !s)}
                  className="dm-ghost-btn"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 7,
                    background: showGuideEditor ? 'var(--color-surface-hover)' : 'var(--color-bg-alt)',
                    border: `1px solid ${showGuideEditor ? 'var(--color-surface-hover)' : C.border}`,
                    borderRadius: 9, padding: '8px 14px', marginBottom: 16,
                    color: showGuideEditor ? C.blue : C.muted, fontSize: 13, fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  <SlidersHorizontal size={14} /> Personalizar secções
                </button>
              )}

              {showGuideEditor && isOwner && (
                <GuideEditor project={effectiveProject} onSave={saveGuideConfig} />
              )}

              {/* PowerPoint export card */}
              <div style={{
                position: 'relative', overflow: 'hidden',
                background: '#000000',
                border: '1px solid rgba(255,255,255,0.18)', borderRadius: 20,
                padding: '24px 26px', marginBottom: 20, color: '#fff',
              }}>
                <div aria-hidden="true" style={{
                  position: 'absolute', inset: 0, pointerEvents: 'none',
                  background: 'radial-gradient(60% 60% at 85% 0%, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 70%)',
                }} />
                <div style={{ position: 'relative' }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: 14, marginBottom: 14,
                    background: 'rgba(255,255,255,0.16)', border: '1px solid rgba(255,255,255,0.25)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}><FileDown size={24} color="#fff" /></div>
                  <h3 style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 800, color: '#fff' }}>Notas para PowerPoint</h3>
                  <p style={{ margin: '0 0 16px', fontSize: 14, color: 'rgba(255,255,255,0.85)', lineHeight: 1.6 }}>
                    Exporta um PowerPoint com as notas do apresentador em cada slide. Abre no PowerPoint, usa a Vista do Apresentador, e tens tudo o que precisas de dizer no ecrã à tua frente.
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                    {['Notas por secção', 'Pontos-chave', 'Vista do Apresentador', 'Funciona offline'].map(f => (
                      <span key={f} style={{ background: 'rgba(255,255,255,0.14)', backdropFilter: 'blur(6px)', border: '1px solid rgba(255,255,255,0.28)', borderRadius: 999, padding: '5px 12px', fontSize: 12, fontWeight: 600, color: '#fff' }}>{f}</span>
                    ))}
                  </div>
                  <button
                    onClick={handleExportPptx}
                    disabled={exporting || loadingAI}
                    className="dm-cta-btn"
                    style={{
                      width: '100%', padding: '14px 0',
                      background: '#fff',
                      border: 'none', borderRadius: 12,
                      color: '#000000', fontSize: 15, fontWeight: 700,
                      cursor: exporting || loadingAI ? 'wait' : 'pointer', fontFamily: 'inherit',
                      boxShadow: '0 8px 28px rgba(0,0,0,0.25)',
                      opacity: exporting || loadingAI ? 0.7 : 1,
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                      {loadingAI ? 'A gerar notas...' : exporting ? 'A exportar...' : !aiData ? 'Gerar e exportar PowerPoint' : 'Exportar PowerPoint'}
                      {!loadingAI && !exporting && <FileDown size={15} />}
                    </span>
                  </button>
                </div>
              </div>

              {!aiData && (
                <p style={{ fontSize: 12, color: C.subtle, textAlign: 'center', margin: '0 0 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                  <Lightbulb size={12} /> A AI gera notas e pontos-chave para cada secção da tua apresentação
                </p>
              )}

              {/* Defense training */}
              {canSeeFullPrep && <DefenseTraining project={project} checkGate={checkGate} consumeAI={consumeAI} />}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
