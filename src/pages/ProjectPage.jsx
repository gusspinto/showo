import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { QRCodeSVG } from 'qrcode.react'
import { supabase, supabaseUrl, supabaseAnonKey } from '../lib/supabase'
import { calculateScore } from '../lib/score'
import { CHALLENGES, getChallengeStatus } from '../lib/challenges'
import { Navbar } from '../components/Navbar'
import { generateProject } from '../lib/generateProject'
import { useAuth } from '../context/AuthContext'
import { useSidebar } from '../context/SidebarContext'
import DefenseMode from '../components/DefenseMode'
import { analyzeProject } from '../lib/analyzeProject'
import { Check, X, Loader, GraduationCap, Save, Sparkles, Bot, Lightbulb, Pencil, Search, Target, Wrench, Zap, TrendingUp, Briefcase, Users, Rocket, Trophy, BarChart2, CheckCircle, BookOpen, ChevronDown, Eye, UserPlus, Calendar } from 'lucide-react'

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
  blueBg: 'var(--c-blue-bg)',
  text: 'var(--c-text)',
  muted: 'var(--c-muted)',
  subtle: 'var(--c-subtle)',
  green: '#22c55e',
  greenGlow: 'rgba(34,197,94,0.12)',
  greenBg: 'var(--c-green-bg)',
  yellow: '#fbbf24',
  yellowGlow: 'rgba(234,179,8,0.12)',
  orange: '#f97316',
  orangeGlow: 'rgba(249,115,22,0.12)',
}

const CONFETTI_COLORS = ['#1b78f7', '#22c55e', '#fbbf24', '#f97316', '#a855f7', '#ec4899', '#06b6d4']

const PROJECT_TYPE_LABELS = {
  group: 'Trabalho de grupo',
  pap: 'PAP / Projeto final',
  presentation: 'Apresentação',
  personal: 'Projeto pessoal',
  competition: 'Projeto de competição',
  internship: 'Estágio',
  other: 'Outro',
}

const TYPE_HERO = {
  pap:         { c1: '#6366f1', c2: '#4f46e5', Icon: GraduationCap },
  internship:  { c1: '#10b981', c2: '#059669', Icon: Briefcase },
  group:       { c1: '#f59e0b', c2: '#d97706', Icon: Users },
  personal:    { c1: '#1b78f7', c2: '#4f46e5', Icon: Rocket },
  competition: { c1: '#ef4444', c2: '#dc2626', Icon: Trophy },
  presentation:{ c1: '#8b5cf6', c2: '#7c3aed', Icon: BarChart2 },
}

const QUALITY_MIN = 60 // below this = "needs more"

const PROFILE_SCORE_FIELDS = [
  { key: 'problem',         label: 'Problema',       minLen: QUALITY_MIN, tip: 'Descreve quem sofre com o problema, qual o impacto real e por que é urgente. Evita respostas de uma linha.' },
  { key: 'solution',        label: 'Solução',        minLen: QUALITY_MIN, tip: 'Explica como funciona tecnicamente: a abordagem, a arquitetura, o que a torna única.' },
  { key: 'results',         label: 'Resultados',     minLen: QUALITY_MIN, tip: 'Acrescenta números concretos: %, tempo poupado, utilizadores impactados, métricas.' },
  { key: 'learnings',       label: 'Aprendizagens',  minLen: QUALITY_MIN, tip: 'Explica o que foi difícil, o que farias diferente, e que competências reais ganhaste.' },
  { key: 'technologies',    label: 'Tecnologias',    minLen: 15,          tip: 'Lista linguagens, frameworks, bases de dados, APIs e ferramentas. Quanto mais completo, melhor.' },
  { key: 'target_audience', label: 'Público-alvo',   minLen: QUALITY_MIN, tip: 'Sê específico: perfil, faixa etária, contexto profissional, necessidades concretas.' },
  { key: 'features',        label: 'Funcionalidades', minLen: QUALITY_MIN, tip: 'Descreve cada funcionalidade com uma frase sobre o que faz e porquê é relevante.' },
  { key: 'cover_url',       label: 'Foto de capa',   minLen: 1,           tip: 'Uma boa imagem de capa aumenta muito a impressão do projeto.' },
]

const SECTION_META = {
  problem:         { Icon: Search,     label: 'Problema' },
  solution:        { Icon: Lightbulb,  label: 'Solução' },
  target_audience: { Icon: Target,     label: 'Público-alvo' },
  features:        { Icon: Wrench,     label: 'Funcionalidades' },
  technologies:    { Icon: Wrench,     label: 'Tecnologias' },
  challenges:      { Icon: Zap,        label: 'Desafios' },
  results:         { Icon: TrendingUp, label: 'Resultados' },
  learnings:       { Icon: Lightbulb,  label: 'Aprendizagens' },
}

// Progress bar: semantic color based on completion
// <40% orange (needs attention), 40-89% blue (in progress), ≥90% green (done)
function progBar(pct) {
  if (pct >= 90) return '#22c55e'
  if (pct >= 40) return '#1b78f7'
  return '#f97316'
}
// Translucent track that matches the fill colour (~12% opacity)
function progTrack(pct) {
  if (pct >= 90) return 'rgba(34,197,94,0.12)'
  if (pct >= 40) return 'rgba(27,120,247,0.12)'
  return 'rgba(249,115,22,0.12)'
}

function getLevelInfo(score) {
  if (score === 100) return { label: 'Projeto completo!', color: colors.green }
  if (score >= 90) return { label: 'Excelente',          color: colors.green }
  if (score >= 71) return { label: 'Impressionante',     color: colors.blue }
  if (score >= 40) return { label: 'A ganhar forma',     color: colors.yellow }
  return { label: 'Em desenvolvimento', color: colors.red }
}

function ScoreRing({ score, size = 108 }) {
  const stroke = size <= 80 ? 6 : 8
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const dash = (score / 100) * circ
  const dasharray = `${dash} ${circ - dash}`
  const { color } = getLevelInfo(score)

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      {/* Outer glow ring */}
      <div style={{
        position: 'absolute', inset: -6, borderRadius: '50%',
        background: `radial-gradient(circle, ${color}18 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', display: 'block', position: 'relative', zIndex: 1 }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={colors.border} strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={stroke}
          strokeDasharray={dasharray} strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.6s ease-out, stroke 0.4s', filter: `drop-shadow(0 0 6px ${color}80)` }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0, zIndex: 2,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontSize: size <= 80 ? 18 : 26, fontWeight: 900, color, lineHeight: 1, letterSpacing: '-1px' }}>{score}</span>
        <span style={{ fontSize: size <= 80 ? 7 : 9, color: colors.muted, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 2 }}>score</span>
      </div>
    </div>
  )
}

function Section({ fieldKey, content, isOwner, onImprove }) {
  const meta    = SECTION_META[fieldKey] ?? { Icon: Wrench, label: fieldKey }
  const fieldCfg = PROFILE_SCORE_FIELDS.find(f => f.key === fieldKey)
  const len     = (content || '').trim().length
  const isEmpty = len === 0
  const isShort = len > 0 && len < (fieldCfg?.minLen ?? QUALITY_MIN)
  const challenge = CHALLENGES.find(c => c.field === fieldKey)

  if (isEmpty && !isOwner) return null

  return (
    <div className="proj-card-pad proj-card" style={{
      border: `1px solid ${isShort ? 'rgba(234,179,8,0.22)' : isEmpty ? colors.subtle + '55' : colors.border}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isEmpty ? 0 : 12 }}>
        <h3 style={{
          margin: 0, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
          color: isShort ? colors.yellow : isEmpty ? colors.subtle : colors.muted,
          display: 'flex', alignItems: 'center', gap: 7,
        }}>
          <meta.Icon size={13} />
          {meta.label}
          {isShort && (
            <span style={{ fontSize: 10, color: colors.yellow, background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.2)', borderRadius: 4, padding: '1px 7px', letterSpacing: '0.03em', fontWeight: 700 }}>
              Pouco detalhe
            </span>
          )}
        </h3>
        {isOwner && challenge && (
          <button
            onClick={() => onImprove(challenge)}
            style={{ background: `${colors.blue}10`, border: `1px solid ${colors.blue}22`, color: '#60a5fa', cursor: 'pointer', fontSize: 11, fontWeight: 700, fontFamily: 'inherit', padding: '3px 9px', borderRadius: 6, flexShrink: 0, transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.background = `${colors.blue}1e`; e.currentTarget.style.borderColor = `${colors.blue}44` }}
            onMouseLeave={e => { e.currentTarget.style.background = `${colors.blue}10`; e.currentTarget.style.borderColor = `${colors.blue}22` }}
          >
            Editar →
          </button>
        )}
      </div>

      {isEmpty ? (
        isOwner && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <p style={{ margin: 0, fontSize: 13, color: colors.subtle, fontStyle: 'italic' }}>Campo ainda vazio</p>
            {challenge && (
              <button
                onClick={() => onImprove(challenge)}
                style={{ background: `${colors.blue}10`, border: `1px solid ${colors.blue}22`, color: '#60a5fa', borderRadius: 6, padding: '3px 9px', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0, transition: 'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.background = `${colors.blue}1e`; e.currentTarget.style.borderColor = `${colors.blue}44` }}
                onMouseLeave={e => { e.currentTarget.style.background = `${colors.blue}10`; e.currentTarget.style.borderColor = `${colors.blue}22` }}
              >
                Preencher
              </button>
            )}
          </div>
        )
      ) : (
        <>
          <p style={{ margin: 0, color: isShort ? '#afc3dc' : colors.text, fontSize: 15, lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>{content}</p>
          {isOwner && isShort && fieldCfg?.tip && (
            <div style={{ marginTop: 12, display: 'flex', alignItems: 'flex-start', gap: 8, background: 'rgba(234,179,8,0.05)', border: '1px solid rgba(234,179,8,0.14)', borderRadius: 8, padding: '9px 12px' }}>
              <Lightbulb size={13} color="#d4a820" style={{ flexShrink: 0 }} />
              <p style={{ margin: 0, fontSize: 12, color: '#d4a820', lineHeight: 1.6 }}>{fieldCfg.tip}</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function MissionRow({ challenge, project, onImprove, isOwner }) {
  const isCompleted = getChallengeStatus(challenge, project) === 'completed'
  const val         = String(project[challenge.field] || '').trim()
  const progress    = Math.min(val.length / challenge.threshold, 1)
  const ChalIcon    = challenge.icon
  const realGain    = (() => {
    if (isCompleted) return challenge.scoreGain
    const cur = calculateScore(project).score
    const max = calculateScore({ ...project, [challenge.field]: 'x'.repeat(challenge.threshold) }).score
    return Math.max(0, max - cur)
  })()

  return (
    <div
      className="mission-row"
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '11px 14px', borderRadius: 12,
        background: isCompleted ? 'rgba(34,197,94,0.03)' : colors.bgAlt,
        border: `1px solid ${isCompleted ? 'rgba(34,197,94,0.14)' : colors.border}`,
        transition: 'border-color 0.15s',
      }}
    >
      {/* Status dot / icon */}
      <div style={{
        width: 30, height: 30, borderRadius: 9, flexShrink: 0,
        background: isCompleted ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.03)',
        border: `1px solid ${isCompleted ? 'rgba(34,197,94,0.22)' : colors.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: isCompleted ? '#22c55e' : colors.muted,
      }}>
        {isCompleted ? <Check size={13} strokeWidth={3} /> : <ChalIcon size={13} />}
      </div>

      {/* Title + mini progress */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13, fontWeight: isCompleted ? 500 : 700,
          color: isCompleted ? colors.subtle : colors.text,
          textDecoration: isCompleted ? 'line-through' : 'none',
          marginBottom: (!isCompleted && val.length > 0) ? 5 : 0,
        }}>
          {challenge.title}
        </div>
        {!isCompleted && val.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ flex: 1, height: 3, background: progTrack(Math.round(progress * 100)), borderRadius: 99, overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 99,
                width: `${progress * 100}%`,
                background: progBar(Math.round(progress * 100)),
                transition: 'width 0.4s ease-out',
              }} />
            </div>
            <span style={{ fontSize: 10, color: colors.subtle, flexShrink: 0 }}>{val.length}/{challenge.threshold}</span>
          </div>
        )}
      </div>

      {/* Points badge */}
      <span style={{
        fontSize: 11, fontWeight: 700, flexShrink: 0, borderRadius: 999, padding: '2px 9px',
        color: isCompleted ? '#22c55e' : colors.blue,
        background: isCompleted ? 'rgba(34,197,94,0.08)' : 'rgba(27,120,247,0.08)',
        border: `1px solid ${isCompleted ? 'rgba(34,197,94,0.18)' : 'rgba(27,120,247,0.18)'}`,
      }}>
        {isCompleted ? <Check size={10} strokeWidth={3} /> : `+${realGain} XP`}
      </span>

      {/* Action */}
      {!isCompleted && isOwner && (
        <button
          onClick={() => onImprove(challenge)}
          style={{
            background: 'rgba(27,120,247,0.08)', border: '1px solid rgba(27,120,247,0.18)',
            color: '#5a9ff5', borderRadius: 8, padding: '5px 12px',
            fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
          }}
        >
          Fazer →
        </button>
      )}
    </div>
  )
}

function EditModal({ challenge, project, onClose, onSave, saving }) {
  const [value, setValue] = useState(String(project[challenge.field] || ''))
  const len = value.trim().length
  const isComplete = len >= challenge.threshold
  const ChalIcon = challenge.icon
  const progress = Math.min(len / challenge.threshold, 1)

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.8)',
        backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: 24,
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: colors.card,
        border: `1px solid ${colors.borderBright}`,
        borderRadius: 20,
        padding: '28px 32px',
        width: '100%', maxWidth: 560,
        boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 42, height: 42, borderRadius: 12,
              background: 'rgba(255,255,255,0.05)',
              border: `1px solid ${colors.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: colors.muted,
            }}>
              <ChalIcon size={22} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: colors.text }}>{challenge.fieldLabel}</h2>
              <span style={{ fontSize: 12, color: colors.blue, fontWeight: 600 }}>+{challenge.scoreGain} XP ao completar</span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: colors.muted, cursor: 'pointer', fontSize: 22, lineHeight: 1, padding: 4, borderRadius: 6 }}>×</button>
        </div>
        <p style={{ color: colors.muted, fontSize: 14, margin: '0 0 16px', lineHeight: 1.55 }}>{challenge.description}</p>
        <textarea
          autoFocus
          value={value}
          onChange={e => setValue(e.target.value)}
          style={{
            width: '100%', minHeight: 150,
            background: colors.bg,
            border: `1.5px solid ${isComplete ? colors.green : colors.border}`,
            borderRadius: 10, padding: '12px 14px',
            color: colors.text, fontSize: 15, lineHeight: 1.65,
            resize: 'vertical', fontFamily: 'var(--font-body)',
            boxSizing: 'border-box', outline: 'none',
            transition: 'border-color 0.2s',
          }}
          placeholder={`Escreve sobre ${challenge.fieldLabel.toLowerCase()}...`}
        />
        <div style={{ margin: '10px 0 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: isComplete ? colors.green : colors.muted, fontWeight: isComplete ? 600 : 400, display: 'flex', alignItems: 'center', gap: 4 }}>
              {isComplete ? <><Check size={12} /> Objetivo atingido!</> : `${len} / ${challenge.threshold} caracteres`}
            </span>
            <span style={{ fontSize: 12, color: colors.subtle }}>{Math.round(progress * 100)}%</span>
          </div>
          <div style={{ height: 5, background: colors.border, borderRadius: 3, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 3,
              width: `${progress * 100}%`,
              background: isComplete
                ? `linear-gradient(90deg, ${colors.green}, #4ade80)`
                : `linear-gradient(90deg, ${colors.blue}, #818cf8)`,
              transition: 'width 0.15s, background 0.3s',
            }} />
          </div>
        </div>
        <button
          onClick={() => onSave(value)}
          disabled={saving}
          style={{
            width: '100%',
            background: isComplete
              ? `linear-gradient(135deg, ${colors.green}, #16a34a)`
              : `linear-gradient(135deg, ${colors.blue}, #4f46e5)`,
            color: '#fff', border: 'none', borderRadius: 10,
            padding: '14px 0', fontSize: 16, fontWeight: 700,
            cursor: saving ? 'default' : 'pointer',
            opacity: saving ? 0.75 : 1,
            transition: 'opacity 0.2s',
            fontFamily: 'inherit',
            boxShadow: isComplete ? '0 4px 20px rgba(34,197,94,0.3)' : '0 4px 20px rgba(27,120,247,0.3)',
          }}
        >
          {saving ? 'A guardar...' : `Guardar e ganhar +${challenge.scoreGain} XP`}
        </button>
      </div>
    </div>
  )
}

function Toast({ message, visible }) {
  return (
    <div style={{
      position: 'fixed', bottom: 32, left: '50%',
      transform: `translateX(-50%) translateY(${visible ? 0 : 100}px)`,
      opacity: visible ? 1 : 0,
      background: 'linear-gradient(135deg, #111c32, #0a1729)',
      border: `1px solid ${colors.borderBright}`,
      borderRadius: 14, padding: '14px 28px',
      color: colors.text, fontSize: 15, fontWeight: 600,
      zIndex: 2000,
      transition: 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s',
      whiteSpace: 'nowrap',
      boxShadow: '0 8px 48px rgba(0,0,0,0.6)',
      pointerEvents: 'none',
      fontFamily: 'inherit',
    }}>
      {message}
    </div>
  )
}

function Confetti() {
  const particlesRef = useRef(null)
  if (!particlesRef.current) {
    particlesRef.current = Array.from({ length: 55 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 1.8,
      duration: 2.5 + Math.random() * 2,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      size: 6 + Math.random() * 8,
      round: Math.random() > 0.5,
    }))
  }
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 998, overflow: 'hidden' }}>
      {particlesRef.current.map(p => (
        <div key={p.id} style={{ position: 'absolute', top: '-12px', left: `${p.left}%`, width: p.size, height: p.size, background: p.color, borderRadius: p.round ? '50%' : 2, animation: `confetti-fall ${p.duration}s ${p.delay}s ease-in forwards` }} />
      ))}
    </div>
  )
}

const SECTION_LABELS = { cover: 'Introdução', problem: 'Problema', solution: 'Solução', features: 'Funcionalidades', technologies: 'Tecnologias', results: 'Resultados', learnings: 'Aprendizagens', closing: 'Encerramento' }

function MembersPanel({ ownerName, members, colors, isOwner }) {
  if (!ownerName && members.length === 0) return null
  const displayOwner = ownerName || 'Dono'

  const statusCfg = {
    accepted: { label: 'Colaborador', color: '#22c55e', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.25)', avatar: 'linear-gradient(135deg,#22c55e,#059669)', dim: false },
    pending:  { label: 'Pendente', color: '#fbbf24', bg: 'rgba(234,179,8,0.1)',  border: 'rgba(234,179,8,0.25)',  avatar: 'linear-gradient(135deg,#ca8a04,#92400e)', dim: true  },
    declined: { label: 'Recusou',  color: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.25)', avatar: 'linear-gradient(135deg,#ef4444,#b91c1c)', dim: true  },
  }

  // For non-owners, only show accepted; already filtered at query level but guard here too
  const visibleMembers = isOwner ? members : members.filter(m => m.status === 'accepted')

  // Solo project — no team card; the detailed "Autor" card below handles this
  if (visibleMembers.length === 0) return null

  // Team project — show full Equipa card
  return (
    <div className="proj-card">
      <h3 className="proj-sec-label">Equipa</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Owner */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg, #1b78f7, #4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff' }}>
            {displayOwner[0]?.toUpperCase()}
          </div>
          <span style={{ fontSize: 14, fontWeight: 600, color: colors.text, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayOwner}</span>
          <span style={{ fontSize: 11, flexShrink: 0, background: 'rgba(27,120,247,0.1)', border: '1px solid rgba(27,120,247,0.25)', borderRadius: 5, padding: '2px 8px', color: '#60a5fa', fontWeight: 700 }}>Dono</span>
        </div>
        {/* Collaborators */}
        {visibleMembers.map(m => {
          const name = m.profiles?.full_name || m.profiles?.username || 'Colaborador'
          const sections = (m.sections ?? []).map(s => SECTION_LABELS[s]).filter(Boolean)
          const cfg = statusCfg[m.status] || statusCfg.accepted
          const hasSubRow = m.status === 'accepted' && sections.length > 0
          return (
            <div key={m.user_id} style={{ display: 'flex', alignItems: hasSubRow ? 'flex-start' : 'center', gap: 10, opacity: cfg.dim ? 0.65 : 1 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, background: cfg.avatar, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff' }}>
                {name[0]?.toUpperCase()}
              </div>
              {hasSubRow ? (
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: colors.text }}>{name}</span>
                    <span style={{ fontSize: 11, background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: 5, padding: '2px 8px', color: cfg.color, fontWeight: 700 }}>{cfg.label}</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 5 }}>
                    {sections.map(s => (
                      <span key={s} style={{ fontSize: 11, color: colors.muted, background: 'rgba(255,255,255,0.04)', border: `1px solid ${colors.border}`, borderRadius: 4, padding: '1px 6px' }}>{s}</span>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  <span style={{ fontSize: 14, fontWeight: 600, color: colors.text, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                  <span style={{ fontSize: 11, flexShrink: 0, background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: 5, padding: '2px 8px', color: cfg.color, fontWeight: 700 }}>{cfg.label}</span>
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function ProjectPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { user, profile, loading: authLoading } = useAuth()
  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [score, setScore] = useState(0)
  const [displayScore, setDisplayScore] = useState(0)
  const [editModal, setEditModal] = useState(null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState({ visible: false, message: '' })
  const [showConfetti, setShowConfetti] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [regenCooldown, setRegenCooldown] = useState(0)
  const [defenseMode, setDefenseMode] = useState(false)
  const [collaboratorSections, setCollaboratorSections] = useState(null) // null = not a collaborator
  const [members, setMembers] = useState([]) // [{ user_id, status, sections, profiles }]
  const [ownerProfile, setOwnerProfile] = useState(null)
  const [aiFeedback, setAiFeedback] = useState(null)
  const [analyzingAI, setAnalyzingAI] = useState(false)
  const [analyzeError, setAnalyzeError] = useState(null)
  const [aiModalOpen, setAiModalOpen] = useState(false)
  const [completudeOpen, setCompletudeOpen] = useState(true)
  const [tipsOpen, setTipsOpen] = useState(true)
  const [viewsExpanded, setViewsExpanded] = useState(false)
  const [sectionsOpen, setSectionsOpen] = useState(false)
  const [showQR, setShowQR] = useState(false)
  const [showInvite, setShowInvite] = useState(false)
  const [inviteInput, setInviteInput] = useState('')
  const [inviting, setInviting] = useState(false)
  const [inviteMsg, setInviteMsg] = useState(null) // { type: 'success'|'error', text }
  const [milestoneCard, setMilestoneCard] = useState(null) // { score, tier }
  const [defenseDate, setDefenseDate] = useState('')
  const [savingDefense, setSavingDefense] = useState(false)
  const [teacherFeedback, setTeacherFeedback] = useState([])
  const [showFeedbackForm, setShowFeedbackForm] = useState(false)
  const [fbComment, setFbComment] = useState('')
  const [fbFieldKey, setFbFieldKey] = useState('geral')
  const [fbSaving, setFbSaving] = useState(false)
  const [fbEditing, setFbEditing] = useState(null)

  const { setExtras } = useSidebar()

  const prevScoreRef = useRef(null)
  const rafRef = useRef(null)
  const toastTimerRef = useRef(null)
  const cooldownRef = useRef(null)

  // Show toast for newly created projects
  useEffect(() => {
    if (location.state?.newProject && location.state?.message) {
      triggerToast(location.state.message)
      window.history.replaceState({}, '')
    }
  }, [])

  // Populate sidebar with project controls when this is the owner's project
  useEffect(() => {
    if (!project || !user) { setExtras(null); return }
    const owned = (user.id === project.user_id) || !!localStorage.getItem(`edit_token_${project.slug}`)
    if (owned) {
      setExtras({
        type: 'project',
        slug: project.slug,
        title: project.name,
        defenseDate: project.defense_date,
        aiScore: project.ai_score,
        analyzingAI,
        onDefense: () => setDefenseMode(true),
        onAnalyze: handleAnalyzeAI,
      })
    } else {
      setExtras(null)
    }
    return () => setExtras(null)
  }, [project?.id, project?.defense_date, project?.ai_score, user?.id, analyzingAI])

  const pageUrl = window.location.href

  useEffect(() => {
    async function fetchProject() {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('slug', slug)
        .single()

      if (error || !data) {
        setLoading(false)
        return
      }

      const { score: s } = calculateScore(data)
      setProject(data)
      setScore(s)
      setDisplayScore(s)
      prevScoreRef.current = s
      setLoading(false)

      if (s > 0 && (!data.score || data.score !== s)) {
        supabase.from('projects').update({ score: s }).eq('id', data.id)
      }

      // Load cached AI feedback
      if (data.ai_feedback) setAiFeedback(data.ai_feedback)
      // Load defense date
      if (data.defense_date) setDefenseDate(data.defense_date)

      const isProjectOwner = !!(user?.id && data.user_id && user.id === data.user_id)

      async function loadMembers(projectId) {
        // Step 1: get collaborator rows (no embedded join — two FKs to profiles causes PostgREST ambiguity)
        const q = supabase
          .from('project_collaborators')
          .select('user_id, status, sections')
          .eq('project_id', projectId)
        const { data: rows } = isProjectOwner ? await q : await q.eq('status', 'accepted')
        if (!rows?.length) { setMembers([]); return }

        // Step 2: fetch profiles separately
        const userIds = [...new Set(rows.map(r => r.user_id))]
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, full_name')
          .in('id', userIds)
        const profileMap = {}
        profiles?.forEach(p => { profileMap[p.id] = p })

        setMembers(rows.map(r => ({ ...r, profiles: profileMap[r.user_id] || null })))
      }
      loadMembers(data.id)

      // Realtime: update members panel when any collaborator row changes
      const channel = supabase
        .channel(`members-${data.id}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'project_collaborators',
          filter: `project_id=eq.${data.id}`,
        }, () => loadMembers(data.id))
        .subscribe()

      // Load owner profile for correct name display
      if (data.user_id) {
        supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url, available_for_work')
          .eq('id', data.user_id)
          .single()
          .then(({ data: prof }) => {
            if (prof) setOwnerProfile(prof)
          })
      }

      // Check if logged-in user is an accepted collaborator (not the owner)
      if (user?.id && data.user_id && user.id !== data.user_id) {
        supabase
          .from('project_collaborators')
          .select('sections')
          .eq('project_id', data.id)
          .eq('user_id', user.id)
          .eq('status', 'accepted')
          .single()
          .then(({ data: collab }) => {
            if (collab) setCollaboratorSections(collab.sections ?? [])
          })
      }

      // Load teacher feedback (visible to project owner + the teacher)
      if (user?.id) {
        supabase
          .from('teacher_feedback')
          .select('*')
          .eq('project_id', data.id)
          .then(({ data: fb }) => { if (fb) setTeacherFeedback(fb) })
      }

      return () => supabase.removeChannel(channel)
    }
    fetchProject()
  }, [slug, user?.id])

  // View tracking + PROJECT_VIEW / COMPANY_VIEW notifications
  useEffect(() => {
    if (!project) return
    if (authLoading) return
    if (!user?.id) return
    const isOwner = !!(project.user_id && user.id === project.user_id)
    const editToken = localStorage.getItem(`edit_token_${project.slug}`)
    if (isOwner || editToken) return

    const viewKey = `viewed_${project.slug}`
    if (!sessionStorage.getItem(viewKey)) {
      sessionStorage.setItem(viewKey, '1')
      // keepalive ensures the POST reaches the DB even if the user refreshes immediately
      fetch(`${supabaseUrl}/rest/v1/rpc/increment_project_views`, {
        method: 'POST',
        keepalive: true,
        headers: {
          'Content-Type': 'application/json',
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({ project_id: project.id }),
      })
      setProject(prev => prev ? { ...prev, views: (prev.views ?? 0) + 1 } : prev)
    }

    // PROJECT_VIEW notification (max once per hour per project)
    const notifKey = `notified_view_${project.slug}`
    if (!sessionStorage.getItem(notifKey)) {
      sessionStorage.setItem(notifKey, '1')
      // Get city first, then notify
      fetch('https://ip-api.com/json/?fields=city,status')
        .then(r => r.json())
        .then(geo => {
          const city = geo?.status === 'success' ? (geo.city || 'Portugal') : 'Portugal'
          const visitor_role = profile?.role ?? null
          supabase.functions.invoke('notify-view', { body: { project_slug: project.slug, type: 'PROJECT_VIEW', city, visitor_role } })
        })
        .catch(() => {
          const visitor_role = profile?.role ?? null
          supabase.functions.invoke('notify-view', { body: { project_slug: project.slug, type: 'PROJECT_VIEW', city: 'Portugal', visitor_role } })
        })
    }

    // COMPANY_VIEW after 30s (max once per day per project)
    const companyKey = `company_view_${project.slug}`
    const lastCompany = sessionStorage.getItem(companyKey)
    if (!lastCompany) {
      const t = setTimeout(() => {
        sessionStorage.setItem(companyKey, '1')
        supabase.functions.invoke('notify-view', { body: { project_slug: project.slug, type: 'COMPANY_VIEW', visitor_role: profile?.role ?? null } })
      }, 30000)
      return () => clearTimeout(t)
    }
  }, [project?.id, user?.id, authLoading])

  useEffect(() => {
    if (prevScoreRef.current === null || prevScoreRef.current === score) return
    const from = prevScoreRef.current
    const to = score
    prevScoreRef.current = to
    cancelAnimationFrame(rafRef.current)
    const duration = 800
    const startTime = performance.now()
    function animate(now) {
      const progress = Math.min((now - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayScore(Math.round(from + (to - from) * eased))
      if (progress < 1) rafRef.current = requestAnimationFrame(animate)
    }
    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [score])

  function triggerToast(message) {
    clearTimeout(toastTimerRef.current)
    setToast({ visible: true, message })
    toastTimerRef.current = setTimeout(() => setToast(t => ({ ...t, visible: false })), 3500)
  }

  async function handleSave(fieldValue) {
    setSaving(true)
    const challenge = editModal
    const oldScore = score
    const wasCompleted = getChallengeStatus(challenge, project) === 'completed'

    const updatedProject = { ...project, [challenge.field]: fieldValue }
    const { score: newScore } = calculateScore(updatedProject)

    const { error } = await supabase
      .from('projects')
      .update({ [challenge.field]: fieldValue, score: newScore })
      .eq('id', project.id)

    if (error) { setSaving(false); return }

    setProject(updatedProject)
    setScore(newScore)

    const isNowCompleted = getChallengeStatus(challenge, updatedProject) === 'completed'
    if (!wasCompleted && isNowCompleted) {
      triggerToast(`+${challenge.scoreGain} XP! Score: ${oldScore} → ${newScore}`)
      if (newScore === 100) {
        setShowConfetti(true)
        setTimeout(() => setShowConfetti(false), 5000)
      }
      // MISSION_COMPLETE notification
      if (user?.id) {
        supabase.from('notifications').insert({
          user_id: user.id,
          type: 'MISSION_COMPLETE',
          message: `Missão completa: ${challenge.fieldLabel} +${challenge.scoreGain} XP`,
          project_slug: project.slug,
        })
      }
    } else {
      triggerToast(`Guardado! Score atual: ${newScore}`)
    }

    // SCORE_MILESTONE notification
    const MILESTONES = [50, 70, 85, 90]
    const current = updatedProject.notified_milestones ?? []
    const newMilestones = MILESTONES.filter(m => newScore >= m && oldScore < m && !current.includes(m))
    if (newMilestones.length && user?.id) {
      const m = newMilestones[newMilestones.length - 1]
      supabase.from('notifications').insert({
        user_id: user.id,
        type: 'SCORE_MILESTONE',
        message: `O teu projeto "${project.name}" atingiu ${m} pontos!`,
        project_slug: project.slug,
      })
      const updatedMilestones = [...current, ...newMilestones]
      supabase.from('projects').update({ notified_milestones: updatedMilestones }).eq('id', project.id)
      setProject(p => ({ ...p, notified_milestones: updatedMilestones }))
      // Show shareable milestone card
      const tier = m >= 90 ? 'Excelente' : m >= 70 ? 'Profissional' : 'Em progresso'
      setMilestoneCard({ score: m, tier })
    }

    setEditModal(null)
    setSaving(false)
  }

  function handleCopy() {
    navigator.clipboard.writeText(pageUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  async function handleAnalyzeAI() {
    if (!project) return
    setAnalyzingAI(true)
    setAnalyzeError(null)
    try {
      const result = await analyzeProject(project)
      setAiFeedback(result)
      // persist to DB so it loads next time
      await supabase.from('projects').update({ ai_feedback: result }).eq('id', project.id)
    } catch (e) {
      setAnalyzeError('Erro ao analisar. Tenta novamente.')
    }
    setAnalyzingAI(false)
  }


  function handleAIClick() {
    setAiModalOpen(true)
    if (!aiFeedback && !analyzingAI) {
      handleAnalyzeAI()
    }
  }

  async function handleInvite(e) {
    e.preventDefault()
    const val = inviteInput.trim()
    if (!val || !project?.id) return
    setInviting(true)
    setInviteMsg(null)
    try {
      // Look up by username first, then email
      let { data: found } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', val)
        .maybeSingle()
      if (!found) {
        // Try auth users via profiles email col if it exists
        const { data: byEmail } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', val)
          .maybeSingle()
        found = byEmail
      }
      if (!found) {
        setInviteMsg({ type: 'error', text: 'Utilizador não encontrado. Verifica o username.' })
        setInviting(false)
        return
      }
      if (found.id === user?.id) {
        setInviteMsg({ type: 'error', text: 'Não podes convidar-te a ti próprio.' })
        setInviting(false)
        return
      }
      const { error } = await supabase
        .from('project_collaborators')
        .upsert({ project_id: project.id, user_id: found.id, status: 'pending', sections: [] }, { onConflict: 'project_id,user_id' })
      if (error) throw error
      setInviteMsg({ type: 'success', text: 'Convite enviado!' })
      setInviteInput('')
      setTimeout(() => { setShowInvite(false); setInviteMsg(null) }, 2000)
    } catch {
      setInviteMsg({ type: 'error', text: 'Erro ao enviar convite. Tenta novamente.' })
    }
    setInviting(false)
  }

  async function handleRegenerate() {
    if (regenCooldown > 0 || regenerating) return
    setRegenerating(true)
    try {
      const aiResult = await generateProject(project)
      const { error } = await supabase
        .from('projects')
        .update({ ai_tagline: aiResult.tagline, ai_description: aiResult.description, ai_highlights: aiResult.highlights })
        .eq('id', project.id)
      if (!error) {
        setProject(p => ({ ...p, ai_tagline: aiResult.tagline, ai_description: aiResult.description, ai_highlights: aiResult.highlights }))
        triggerToast('Texto da IA atualizado!')
        let t = 60
        setRegenCooldown(t)
        cooldownRef.current = setInterval(() => {
          t -= 1
          setRegenCooldown(t)
          if (t <= 0) clearInterval(cooldownRef.current)
        }, 1000)
      }
    } catch { triggerToast('Erro ao regenerar. Tenta novamente.') }
    setRegenerating(false)
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: colors.bg, color: colors.text, fontFamily: 'var(--font-body)', overflowX: 'clip' }}>
        <Navbar />
        <style>{`
          @keyframes shimmer {
            0%, 100% { opacity: 0.4; }
            50%       { opacity: 0.85; }
          }
          .sk { background: ${colors.card}; border-radius: 10px; animation: shimmer 1.6s ease-in-out infinite; }
          .sk-wrap { max-width: 720px; margin: 0 auto; padding: 0 16px 80px; box-sizing: border-box; }
        `}</style>
        <div className="sk-wrap">
          {/* Cover */}
          <div className="sk" style={{ width: '100%', height: 200, borderRadius: 16, marginTop: 24 }} />
          {/* Title */}
          <div className="sk" style={{ height: 30, width: '60%', marginTop: 28 }} />
          {/* Tagline */}
          <div className="sk" style={{ height: 16, width: '88%', marginTop: 14, animationDelay: '0.1s' }} />
          <div className="sk" style={{ height: 16, width: '72%', marginTop: 10, animationDelay: '0.15s' }} />
          {/* Score bar */}
          <div style={{ display: 'flex', gap: 12, marginTop: 28 }}>
            <div className="sk" style={{ height: 48, flex: 1, animationDelay: '0.2s' }} />
            <div className="sk" style={{ height: 48, flex: 1, animationDelay: '0.25s' }} />
          </div>
          {/* Card block */}
          <div className="sk" style={{ height: 140, width: '100%', marginTop: 20, borderRadius: 16, animationDelay: '0.3s' }} />
          <div className="sk" style={{ height: 100, width: '100%', marginTop: 14, borderRadius: 16, animationDelay: '0.35s' }} />
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: colors.bg, color: colors.text, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-body)', gap: 16, textAlign: 'center', padding: 24 }}>
        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Este projeto não existe ou foi removido</h2>
        <p style={{ color: colors.muted, margin: 0 }}>O link pode estar incorrecto ou o projeto foi eliminado.</p>
        <button
          onClick={() => navigate('/novo')}
          style={{ background: `linear-gradient(135deg, ${colors.blue}, #4f46e5)`, color: '#fff', border: 'none', borderRadius: 10, padding: '12px 28px', fontSize: 16, fontWeight: 700, cursor: 'pointer', marginTop: 8, boxShadow: '0 4px 20px rgba(27,120,247,0.3)', fontFamily: 'inherit' }}
        >
          Criar o meu projeto →
        </button>
        <button
          onClick={() => navigate('/')}
          style={{ background: 'transparent', border: `1px solid ${colors.border}`, color: colors.muted, borderRadius: 8, padding: '10px 22px', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          Ir para o início
        </button>
      </div>
    )
  }

  const highlights = Array.isArray(project.ai_highlights) ? project.ai_highlights : []
  const level = getLevelInfo(displayScore)
  const internshipReady = score > 80 && !!project.technologies?.trim() && !!project.results?.trim()
  const isPap = project.is_pap || project.project_type === 'pap'

  async function handleSaveDefenseDate(dateStr) {
    setDefenseDate(dateStr)
    setSavingDefense(true)
    await supabase.from('projects').update({ defense_date: dateStr || null }).eq('id', project.id)
    setProject(p => ({ ...p, defense_date: dateStr || null }))
    setSavingDefense(false)
  }

  const isOwner = (
    (user?.id && project.user_id && user.id === project.user_id) ||
    !!localStorage.getItem(`edit_token_${project.slug}`)
  )
  const isProfessor = profile?.role === 'professor' && !isOwner && !!user?.id

  async function handleFbSave() {
    if (!fbComment.trim() || !project) return
    setFbSaving(true)
    if (fbEditing) {
      const { data: updated } = await supabase.from('teacher_feedback').update({ comment: fbComment.trim() }).eq('id', fbEditing).select().single()
      if (updated) setTeacherFeedback(prev => prev.map(f => f.id === fbEditing ? updated : f))
      setFbEditing(null)
    } else {
      const { data: created } = await supabase.from('teacher_feedback')
        .upsert({ project_id: project.id, teacher_id: user.id, field_key: fbFieldKey, comment: fbComment.trim() }, { onConflict: 'project_id,teacher_id,field_key' })
        .select().single()
      if (created) {
        setTeacherFeedback(prev => { const idx = prev.findIndex(f => f.field_key === fbFieldKey && f.teacher_id === user.id); return idx >= 0 ? prev.map((f, i) => i === idx ? created : f) : [...prev, created] })
        // Notify the student (only on new feedback, not edits)
        if (project.user_id) {
          supabase.from('notifications').insert({
            user_id: project.user_id,
            type: 'TEACHER_FEEDBACK',
            message: `O teu professor deixou feedback no projeto "${project.name}".`,
            project_slug: project.slug,
            read: false,
          })
        }
      }
    }
    setFbComment(''); setFbSaving(false)
  }

  async function handleFbDelete(id) {
    await supabase.from('teacher_feedback').delete().eq('id', id)
    setTeacherFeedback(prev => prev.filter(f => f.id !== id))
  }

  const sortedChallenges = [...CHALLENGES].sort((a, b) => {
    const aCompleted = getChallengeStatus(a, project) === 'completed' ? 1 : 0
    const bCompleted = getChallengeStatus(b, project) === 'completed' ? 1 : 0
    return aCompleted - bCompleted
  })
  const completedCount = CHALLENGES.filter(c => getChallengeStatus(c, project) === 'completed').length
  const earnedXP = CHALLENGES.reduce((sum, c) => sum + (getChallengeStatus(c, project) === 'completed' ? c.scoreGain : 0), 0)
  const totalXP = CHALLENGES.reduce((sum, c) => sum + c.scoreGain, 0)

  return (
    <div style={{ minHeight: '100vh', backgroundColor: colors.bg, color: colors.text, fontFamily: 'var(--font-body)', overflowX: 'clip' }}>
      <Helmet>
        <title>{project.name} — Showo</title>
        <meta name="description" content={project.ai_tagline || project.goal || `Projeto de ${project.creator_name || 'estudante'} no Showo`} />
        <meta property="og:title" content={`${project.name} — Showo`} />
        <meta property="og:description" content={project.ai_tagline || project.goal || `Projeto de ${project.creator_name || 'estudante'} no Showo`} />
        <meta property="og:url" content={pageUrl} />
        <meta property="og:type" content="website" />
        {project.cover_url && <meta property="og:image" content={project.cover_url} />}
        <meta name="twitter:card" content={project.cover_url ? 'summary_large_image' : 'summary'} />
        <meta name="twitter:title" content={`${project.name} — Showo`} />
        <meta name="twitter:description" content={project.ai_tagline || project.goal || `Projeto no Showo`} />
        {project.cover_url && <meta name="twitter:image" content={project.cover_url} />}
      </Helmet>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes sparkle-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(139,92,246,0.5), 0 4px 20px rgba(0,0,0,0.4); }
          50%       { box-shadow: 0 0 0 10px rgba(139,92,246,0), 0 4px 20px rgba(0,0,0,0.4); }
        }
        @keyframes confetti-fall {
          0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
          80% { opacity: 1; }
          100% { transform: translateY(105vh) rotate(720deg); opacity: 0; }
        }
        /* ── Design system ── */
        /* Base card: use on all proj-body cards */
        .proj-card {
          background: ${colors.card};
          border: 1px solid ${colors.border};
          border-radius: 16px;
          padding: 20px 22px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.18);
        }
        /* Consistent section label (11px uppercase muted with icon) */
        .proj-sec-label {
          font-size: 11px; font-weight: 700; color: ${colors.muted};
          text-transform: uppercase; letter-spacing: 0.08em;
          display: flex; align-items: center; gap: 7px;
          margin: 0 0 14px;
        }

        /* Body: flex column with uniform gap */
        .proj-body {
          display: flex; flex-direction: column; gap: 16px;
        }
        /* Sections within the accordion body */
        .proj-sections-body {
          display: flex; flex-direction: column; gap: 12px;
        }

        .proj-layout {
          display: grid;
          grid-template-columns: 1fr 280px;
          gap: 28px;
          align-items: start;
        }
        .proj-highlights-grid { }
        @media (max-width: 700px) {
          .proj-highlights-grid { grid-template-columns: 1fr !important; }
        }
        .proj-layout > * { min-width: 0; }
        .proj-sidebar {
          position: sticky;
          top: 88px;
        }
        @media (max-width: 860px) {
          /* Dissolve proj-main so hero / body / sidebar can be individually ordered */
          .proj-layout { grid-template-columns: 1fr; }
          .proj-main   { display: contents; }
          .proj-hero   { order: 1; min-width: 0; }
          .proj-sidebar{ position: static; order: 2; min-width: 0; }
          .proj-body   { order: 3; min-width: 0; }
        }
        /* Edit button always visible next to title */
        .proj-edit-inline    { display: flex; }
        .proj-h1-row         { display: flex; align-items: center; gap: 10px; margin-bottom: 18px; flex-wrap: nowrap; }
        .proj-dashboard      { display: none; }
        .proj-ai-fab         { display: none; }
        .proj-ai-fab-label   { display: inline; }
        .proj-fab-area       { display: flex; }
        .proj-ai-fab         { display: flex; }
        .proj-fab-defense-label { display: inline; }
        .proj-invite-label   { display: inline; }
        /* Sidebar section toggles */
        .sidebar-section-toggle { display: flex; }
        .sidebar-section-body.collapsed { display: none; }
        /* Mobile-only accordion for sections */
        .proj-sections-toggle { display: none; }
        .proj-share-qr-label { display: inline; }
        /* Views widget — hover to reveal count on desktop */
        .proj-views-count { opacity: 0; max-width: 0; overflow: hidden; transition: opacity 0.18s, max-width 0.18s; }
        .proj-views-widget:hover .proj-views-count,
        .proj-views-widget.expanded .proj-views-count { opacity: 1; max-width: 80px; }
        @media (max-width: 860px) {
          /* Edit button proportional to mobile title */
          .proj-edit-inline { width: 26px !important; height: 26px !important; border-radius: 7px !important; }
          .proj-h1-row { margin-bottom: 6px !important; gap: 8px !important; align-items: center !important; }
          .proj-tagline { margin-top: 4px !important; margin-bottom: 14px !important; font-size: 15px !important; }
          /* AI FAB hidden on mobile/tablet — AI card in body is sufficient */
          .proj-ai-fab { display: none !important; }
          .proj-ai-fab-label { display: none !important; }
          /* QR code centered on mobile */
          .proj-share-qr { align-self: center !important; }
          /* Completude + tips: full-width stacked on tablet */
          .proj-completude-grid { display: flex !important; flex-direction: column; gap: 12px; }
          .proj-sections-toggle {
            display: flex !important;
            align-items: center; gap: 14px; text-align: left;
            width: 100%; background: ${colors.card};
            border: 1px solid ${colors.borderBright};
            border-radius: 14px; padding: 16px 20px;
            cursor: pointer; font-family: inherit;
            margin-bottom: 12px;
            transition: background 0.15s;
          }
          .proj-sections-toggle:active { background: ${colors.cardHover} !important; }
          .proj-sections-body.collapsed { display: none !important; }
          .proj-nav-btns     { display: none !important; }
          .proj-fab-area     { display: flex !important; }
          /* AI FAB — hidden on tablet too; AI card in body is sufficient */
          .proj-ai-fab       { display: none !important; }
          .proj-ai-fab-label { display: none !important; }
          /* Defense FAB — pill com label no tablet */
          .proj-fab-defense-label { display: inline !important; }
          /* Invite button: icon only on tablet */
          .proj-invite-label { display: none !important; }
          /* Author: centered on tablet/mobile */
          .proj-author-bottom {
            flex-direction: column !important;
            align-items: center !important;
            text-align: center !important;
          }
          .proj-author-bottom > div[style*="flex: 1"] { text-align: center; }
          .proj-author-links { justify-content: center !important; }
          /* Body gap override on tablet */
          .proj-body { gap: 14px; }
          .proj-share-qr-label { display: none; }
        }
        @media (max-width: 600px) {
          .proj-wrap         { padding: 0 16px 80px !important; overflow-x: hidden !important; }
          .proj-cover        { height: 200px !important; margin-top: 20px !important; border-radius: 14px !important; }
          .proj-hero         { padding: 20px 0 16px !important; }
          .proj-h1           { font-size: 30px !important; }
          .proj-score-abs    { display: none !important; }
          .proj-dashboard    { display: flex !important; }
          .proj-tagline      { font-size: 15px !important; }
          .proj-card-pad, .proj-card { padding: 16px 18px !important; border-radius: 14px !important; }
          .proj-badges       { margin-bottom: 14px !important; }
          /* Mobile: AI FAB hidden, Defense FAB circular */
          .proj-ai-fab       { display: none !important; }
          .proj-ai-fab-label { display: none !important; }
          .proj-fab-defense-label { display: none !important; }
          .proj-fab-defense { padding: 0 !important; width: 52px !important; min-width: 52px !important; }
          /* Invite: icon only on mobile */
          .proj-invite-label { display: none !important; }
          /* Author: centered on mobile */
          .proj-author-bottom {
            flex-direction: column !important;
            align-items: center !important;
            text-align: center !important;
          }
          .proj-author-bottom-text { text-align: center; }
          .proj-author-links { justify-content: center !important; }
          /* Body gap on mobile */
          .proj-body { gap: 12px; }
        }
      `}</style>

      {defenseMode && (
        <DefenseMode
          project={project}
          isOwner={isOwner}
          collaboratorSections={collaboratorSections}
          onClose={() => setDefenseMode(false)}
        />
      )}

      {showConfetti && <Confetti />}
      <Toast message={toast.message} visible={toast.visible} />

      {/* ── Milestone shareable card overlay ── */}
      {milestoneCard && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 600,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px 16px',
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(12px)',
          }}
          onClick={() => setMilestoneCard(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 400,
              background: 'linear-gradient(145deg, #0e1f3a 0%, #152030 60%, #060c18 100%)',
              border: '1px solid rgba(27,120,247,0.3)',
              borderRadius: 24,
              padding: '36px 32px',
              textAlign: 'center',
              position: 'relative',
              boxShadow: '0 24px 80px rgba(27,120,247,0.2), 0 8px 32px rgba(0,0,0,0.6)',
              overflow: 'hidden',
            }}
          >
            {/* Glow blobs */}
            <div style={{ position: 'absolute', top: -60, left: '50%', transform: 'translateX(-50%)', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(27,120,247,0.18) 0%, transparent 70%)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: -40, right: -40, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(79,70,229,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />

            {/* Icon */}
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center', position: 'relative' }}>
              {milestoneCard.score >= 90
                ? <Trophy size={52} color="#22c55e" />
                : milestoneCard.score >= 70
                ? <Rocket size={52} color="#60a5fa" />
                : <Target size={52} color="#fbbf24" />}
            </div>

            {/* Title */}
            <div style={{ fontSize: 13, fontWeight: 700, color: colors.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8, position: 'relative' }}>
              Marco desbloqueado
            </div>
            <div style={{ fontSize: 28, fontWeight: 900, color: colors.text, letterSpacing: '-0.5px', marginBottom: 6, position: 'relative' }}>
              {milestoneCard.score} pontos!
            </div>
            <div style={{ fontSize: 15, color: colors.muted, marginBottom: 24, position: 'relative' }}>
              {project.name}
            </div>

            {/* Score badge */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: milestoneCard.score >= 90 ? 'rgba(34,197,94,0.12)' : milestoneCard.score >= 70 ? 'rgba(27,120,247,0.12)' : 'rgba(251,191,36,0.12)',
              border: `1px solid ${milestoneCard.score >= 90 ? 'rgba(34,197,94,0.3)' : milestoneCard.score >= 70 ? 'rgba(27,120,247,0.3)' : 'rgba(251,191,36,0.3)'}`,
              borderRadius: 999, padding: '6px 20px', marginBottom: 28,
              color: milestoneCard.score >= 90 ? '#22c55e' : milestoneCard.score >= 70 ? '#60a5fa' : '#fbbf24',
              fontSize: 13, fontWeight: 800, position: 'relative',
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              {milestoneCard.tier}
            </div>

            {/* URL pill */}
            <div style={{ fontSize: 11, color: colors.subtle, marginBottom: 24, position: 'relative' }}>
              showo.vercel.app/p/{project.slug}
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: 10, position: 'relative' }}>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/p/${project.slug}`)
                  triggerToast('Link copiado!')
                  setMilestoneCard(null)
                }}
                style={{
                  flex: 1,
                  background: 'linear-gradient(135deg, #1b78f7, #4f46e5)',
                  border: 'none', borderRadius: 12,
                  padding: '13px 0', color: '#fff',
                  fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                  boxShadow: '0 6px 20px rgba(27,120,247,0.35)',
                }}
              >
                Copiar link
              </button>
              <button
                onClick={() => setMilestoneCard(null)}
                style={{
                  flex: 1,
                  background: 'rgba(255,255,255,0.05)',
                  border: `1px solid ${colors.border}`, borderRadius: 12,
                  padding: '13px 0', color: colors.muted,
                  fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {editModal && (
        <EditModal challenge={editModal} project={project} onClose={() => setEditModal(null)} onSave={handleSave} saving={saving} />
      )}

      {/* AI Feedback Modal */}
      {aiModalOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 500,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px 16px',
            background: 'rgba(0,0,0,0.72)',
            backdropFilter: 'blur(8px)',
          }}
          onClick={() => setAiModalOpen(false)}
        >
          <div
            style={{
              background: colors.card,
              border: `1px solid ${colors.border}`,
              borderRadius: 20,
              padding: '28px',
              maxWidth: 580,
              width: '100%',
              maxHeight: '85vh',
              overflowY: 'auto',
              position: 'relative',
              boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Close */}
            <button
              onClick={() => setAiModalOpen(false)}
              style={{
                position: 'absolute', top: 16, right: 16,
                background: 'rgba(255,255,255,0.05)',
                border: `1px solid ${colors.border}`,
                borderRadius: 8, width: 32, height: 32,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: colors.muted,
              }}
            ><X size={16} /></button>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 20, paddingRight: 44 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, background: 'rgba(129,140,248,0.12)', border: '1px solid rgba(129,140,248,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Bot size={20} color="#818cf8" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, letterSpacing: '-0.3px' }}>Análise da IA</h3>
                  <p style={{ margin: 0, fontSize: 12, color: colors.muted, marginTop: 2 }}>Feedback personalizado para melhorar o teu projeto</p>
                </div>
              </div>
              {/* Analyze / Reanalisar button — always in header */}
              {isOwner && (
                <button
                  onClick={handleAnalyzeAI}
                  disabled={analyzingAI}
                  style={{
                    flexShrink: 0,
                    background: analyzingAI ? 'rgba(27,120,247,0.08)' : aiFeedback ? 'rgba(27,120,247,0.1)' : 'linear-gradient(135deg,#1b78f7,#4f46e5)',
                    border: analyzingAI || aiFeedback ? `1px solid ${colors.blue}30` : 'none',
                    borderRadius: 9, padding: '8px 16px',
                    color: analyzingAI || aiFeedback ? '#60a5fa' : '#fff',
                    fontSize: 12, fontWeight: 700,
                    cursor: analyzingAI ? 'default' : 'pointer',
                    fontFamily: 'inherit',
                    boxShadow: analyzingAI || aiFeedback ? 'none' : '0 4px 14px rgba(27,120,247,0.3)',
                    display: 'flex', alignItems: 'center', gap: 7,
                    transition: 'all 0.15s',
                  }}
                >
                  <Sparkles size={13} />
                  {analyzingAI ? 'A analisar…' : aiFeedback ? 'Reanalisar' : 'Analisar'}
                </button>
              )}
            </div>

            {analyzeError && (
              <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, padding: '12px 16px', color: '#ef4444', fontSize: 13, marginBottom: 16 }}>
                {analyzeError}
              </div>
            )}

            {aiFeedback && !analyzingAI && (
              <div>
                <div style={{ background: 'rgba(27,120,247,0.06)', border: '1px solid rgba(27,120,247,0.15)', borderRadius: 12, padding: '14px 16px', marginBottom: 16 }}>
                  <div style={{ fontSize: 13, color: 'var(--c-text)', lineHeight: 1.65, marginBottom: aiFeedback.score_hint ? 8 : 0 }}>
                    {aiFeedback.overall}
                  </div>
                  {aiFeedback.score_hint && (
                    <div style={{ fontSize: 12, color: '#60a5fa', fontWeight: 600, display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                      <Lightbulb size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                      <span>{aiFeedback.score_hint}</span>
                    </div>
                  )}
                </div>
                {aiFeedback.sections && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {Object.entries(aiFeedback.sections).map(([key, sec]) => {
                      const LABELS = { goal: 'Objetivo', problem: 'Problema', solution: 'Solução', target_audience: 'Público-alvo', features: 'Funcionalidades', technologies: 'Tecnologias', results: 'Resultados', learnings: 'Aprendizagens' }
                      const ratingColor = sec.rating === 'forte' ? colors.green : sec.rating === 'médio' ? colors.yellow : colors.orange
                      const ratingBg = sec.rating === 'forte' ? 'rgba(34,197,94,0.1)' : sec.rating === 'médio' ? 'rgba(234,179,8,0.1)' : 'rgba(249,115,22,0.1)'
                      return (
                        <div key={key} style={{ background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 10, padding: '12px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: colors.muted }}>{LABELS[key] || key}</span>
                            <span style={{ fontSize: 11, fontWeight: 700, color: ratingColor, background: ratingBg, borderRadius: 5, padding: '2px 7px', textTransform: 'uppercase', flexShrink: 0 }}>{sec.rating}</span>
                          </div>
                          <p style={{ margin: '0 0 4px', fontSize: 12, color: '#afc3dc', lineHeight: 1.55 }}>{sec.feedback}</p>
                          {sec.tip && (
                            <p style={{ margin: 0, fontSize: 12, color: '#60a5fa', lineHeight: 1.55 }}>→ {sec.tip}</p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {!aiFeedback && !analyzingAI && (
              <div style={{ textAlign: 'center', padding: '24px 0', color: colors.muted, fontSize: 13 }}>
                Clica em "Analisar com IA" para receber feedback personalizado do teu projeto.
              </div>
            )}
          </div>
        </div>
      )}

      {/* FABs — visible on tablet + mobile via CSS (hidden on desktop) */}
      <div className="proj-fab-area" style={{
        position: 'fixed', bottom: 24, right: 20,
        flexDirection: 'column', gap: 10, zIndex: 90,
      }}>
        {/* AI Analyse FAB */}
        {isOwner && (
          <button
            className="proj-ai-fab"
            onClick={handleAIClick}
            title="Análise com IA"
            disabled={analyzingAI}
            style={{
              height: 52, borderRadius: 999, padding: '0 18px',
              background: 'linear-gradient(135deg, #6d28d9, #4f46e5)',
              border: 'none',
              color: '#fff', cursor: analyzingAI ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              animation: analyzingAI ? 'none' : 'sparkle-pulse 2s ease-in-out infinite',
              opacity: analyzingAI ? 0.7 : 1,
              boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
              fontFamily: 'inherit', fontSize: 14, fontWeight: 700,
            }}
          >
            <Sparkles size={20} />
            <span className="proj-ai-fab-label">{analyzingAI ? 'A analisar…' : 'Análise IA'}</span>
          </button>
        )}
        {/* Defense FAB — circular on mobile, pill with text on tablet */}
        {(isOwner || collaboratorSections !== null) && (
          <button
            className="proj-fab-defense"
            onClick={() => setDefenseMode(true)}
            title="Preparar defesa"
            style={{
              borderRadius: 999,
              background: 'rgba(251,191,36,0.12)',
              border: '1px solid rgba(251,191,36,0.4)',
              color: '#fbbf24', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '0 18px', height: 52, minWidth: 52,
              boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
              backdropFilter: 'blur(8px)',
              fontFamily: 'inherit', fontSize: 14, fontWeight: 700,
            }}
          >
            <GraduationCap size={22} />
            <span className="proj-fab-defense-label">Defesa</span>
          </button>
        )}
      </div>

      <Navbar showCreateProject={true}>
        <div className="proj-nav-btns" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isOwner && (
            <button
              onClick={handleAIClick}
              style={{
                background: 'rgba(109,40,217,0.08)',
                border: '1px solid rgba(109,40,217,0.25)',
                color: '#a78bfa',
                borderRadius: 8, padding: '8px 14px',
                fontSize: 13, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', gap: 6,
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(109,40,217,0.15)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(109,40,217,0.08)'}
              title="Análise do projeto com IA"
            >
              <Sparkles size={15} /> Análise IA
            </button>
          )}
          {(isOwner || collaboratorSections !== null) && (
            <button
              onClick={() => setDefenseMode(true)}
              style={{
                background: 'rgba(251,191,36,0.08)',
                border: '1px solid rgba(251,191,36,0.25)',
                color: '#fbbf24',
                borderRadius: 8, padding: '8px 14px',
                fontSize: 13, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', gap: 6,
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(251,191,36,0.14)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(251,191,36,0.08)'}
              title="Preparar a defesa do projeto"
            >
              <GraduationCap size={15} /> Preparar defesa
            </button>
          )}
        </div>
      </Navbar>

      {/* Full-width gradient hero — always shown, adapts to project type */}
      {(() => {
        const hero = TYPE_HERO[project.project_type] ?? TYPE_HERO.personal
        return (
          <div style={{ position: 'relative', width: '100%', overflow: 'hidden' }}>
            {project.cover_url ? (
              <div className="proj-cover" style={{ width: '100%', height: 300, position: 'relative' }}>
                <img src={project.cover_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 20%, #060c18 100%)' }} />
              </div>
            ) : (
              <div style={{
                width: '100%', height: 220,
                background: `linear-gradient(135deg, ${hero.c1}22 0%, ${hero.c2}55 50%, #060c18 100%)`,
                position: 'relative', overflow: 'hidden',
              }}>
                <div style={{ position: 'absolute', top: -60, left: '10%', width: 400, height: 400, borderRadius: '50%', background: `radial-gradient(ellipse, ${hero.c1}28 0%, transparent 65%)`, pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', top: -20, right: '5%', width: 250, height: 250, borderRadius: '50%', background: `radial-gradient(ellipse, ${hero.c2}22 0%, transparent 65%)`, pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 40%, #060c18 100%)' }} />
              </div>
            )}
          </div>
        )
      })()}

      <div className="proj-wrap page-content-wide" style={{ overflowX: 'clip', paddingTop: 24 }}>

        {/* Two-column layout: main content + sticky sidebar */}
        <div className="proj-layout">
        <div className="proj-main">

        {/* Hero */}
        <div className="proj-hero" style={{ padding: '24px 0 40px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24 }}>
          <div style={{ flex: 1, minWidth: 0 }}>

          {/* Badges + invite */}
          {(() => {
            const hero = TYPE_HERO[project.project_type] ?? TYPE_HERO.personal
            return (
              <div className="proj-badges" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                {project.project_type && PROJECT_TYPE_LABELS[project.project_type] && (
                  <div style={{
                    background: `linear-gradient(135deg, ${hero.c1}, ${hero.c2})`,
                    color: '#fff', borderRadius: 8, padding: '5px 14px',
                    fontSize: 11, fontWeight: 800, letterSpacing: '0.06em',
                    display: 'flex', alignItems: 'center', gap: 6,
                    boxShadow: `0 4px 16px ${hero.c1}40`,
                  }}>
                    {hero.Icon && <hero.Icon size={12} />} {PROJECT_TYPE_LABELS[project.project_type].toUpperCase()}
                  </div>
                )}
                {project.area && (
                  <div style={{
                    background: colors.blueSubtle, color: '#60a5fa',
                    border: '1px solid rgba(27,120,247,0.2)',
                    borderRadius: 8, padding: '5px 14px', fontSize: 12, fontWeight: 600,
                  }}>
                    {project.area}
                  </div>
                )}

                {/* Invite collaborator — owner only */}
                {isOwner && !showInvite && (
                  <button
                    onClick={() => setShowInvite(true)}
                    title="Convida o teu colega"
                    className="proj-invite-btn"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      background: 'transparent',
                      border: `1px solid ${colors.border}`,
                      borderRadius: 8, padding: '5px 12px',
                      color: colors.subtle, cursor: 'pointer',
                      fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = colors.borderBright; e.currentTarget.style.color = colors.muted }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = colors.border; e.currentTarget.style.color = colors.subtle }}
                  >
                    <UserPlus size={13} />
                    <span className="proj-invite-label">Convida o teu colega</span>
                  </button>
                )}

                {/* Invite inline form */}
                {isOwner && showInvite && (
                  <form
                    onSubmit={handleInvite}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}
                  >
                    <input
                      autoFocus
                      value={inviteInput}
                      onChange={e => { setInviteInput(e.target.value); setInviteMsg(null) }}
                      placeholder="username do colega"
                      style={{
                        background: colors.bg, border: `1px solid ${inviteMsg?.type === 'error' ? '#ef4444' : inviteMsg?.type === 'success' ? '#22c55e' : colors.borderBright}`,
                        borderRadius: 8, padding: '5px 12px', color: colors.text,
                        fontSize: 12, fontFamily: 'inherit', outline: 'none',
                        width: 150, transition: 'border-color 0.15s',
                      }}
                    />
                    <button
                      type="submit"
                      disabled={inviting || !inviteInput.trim()}
                      style={{
                        background: `${colors.blue}18`, border: `1px solid ${colors.blue}30`,
                        borderRadius: 8, padding: '5px 12px', color: '#60a5fa',
                        fontSize: 12, fontWeight: 700, cursor: inviting ? 'default' : 'pointer',
                        fontFamily: 'inherit', opacity: inviting ? 0.6 : 1,
                      }}
                    >{inviting ? '…' : 'Convidar'}</button>
                    <button
                      type="button"
                      onClick={() => { setShowInvite(false); setInviteInput(''); setInviteMsg(null) }}
                      style={{ background: 'transparent', border: 'none', color: colors.subtle, cursor: 'pointer', padding: '4px 6px', borderRadius: 6, display: 'flex', alignItems: 'center' }}
                    ><X size={14} /></button>
                    {inviteMsg && (
                      <span style={{ fontSize: 11, fontWeight: 600, color: inviteMsg.type === 'success' ? '#22c55e' : '#ef4444', width: '100%' }}>
                        {inviteMsg.text}
                      </span>
                    )}
                  </form>
                )}
              </div>
            )
          })()}

          {/* Title row — edit icon + views widget sit right after title text */}
          <div className="proj-h1-row" style={{ alignItems: 'center' }}>
            <h1 className="proj-h1" style={{ fontSize: 'clamp(22px, 5vw, 48px)', fontWeight: 900, margin: 0, lineHeight: 1.1, letterSpacing: '-0.5px', flex: 1 }}>
              {project.name}
            </h1>
            {/* Views — eye icon, hover/click to reveal count */}
            <div
              className={`proj-views-widget${viewsExpanded ? ' expanded' : ''}`}
              onClick={() => setViewsExpanded(v => !v)}
              title={`${project.views ?? 0} visualizações`}
              style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', color: colors.muted, flexShrink: 0, padding: '4px 6px', borderRadius: 6 }}
            >
              <Eye size={14} color={colors.muted} />
              <span className="proj-views-count" style={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>
                {project.views ?? 0}
              </span>
            </div>
            {isOwner && (
              <button
                className="proj-edit-inline"
                onClick={() => {
                  const token = localStorage.getItem(`edit_token_${project.slug}`)
                  navigate(`/editar/${project.slug}${token ? `?token=${token}` : ''}`)
                }}
                title="Editar projeto"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                  background: 'rgba(255,255,255,0.05)',
                  border: `1px solid ${colors.border}`,
                  color: colors.muted, cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                <Pencil size={15} />
              </button>
            )}
          </div>

          {project.ai_tagline && (
            <p className="proj-tagline" style={{ fontSize: 18, color: colors.muted, lineHeight: 1.6, margin: '12px 0 24px', maxWidth: 580, fontWeight: 400 }}>
              {project.ai_tagline}
            </p>
          )}

          {/* Mobile dashboard — score + level (hidden on desktop, shown on mobile) */}
          <div className="proj-dashboard" style={{
            display: 'none', alignItems: 'center', gap: 14, marginBottom: 18,
            background: colors.bgAlt,
            border: `1px solid ${colors.border}`,
            borderRadius: 12, padding: '12px 16px',
          }}>
            <ScoreRing score={displayScore} size={72} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 6,
                background: level.color + '15', color: level.color,
                borderRadius: 999, padding: '3px 10px', fontSize: 12, fontWeight: 700,
                border: `1px solid ${level.color}35`,
              }}>{level.label}</div>
              <div style={{ height: 3, background: progTrack(Math.round((earnedXP / totalXP) * 100)), borderRadius: 2, overflow: 'hidden', marginBottom: 5 }}>
                <div style={{
                  height: '100%', borderRadius: 2,
                  width: `${(earnedXP / totalXP) * 100}%`,
                  background: progBar(Math.round((earnedXP / totalXP) * 100)),
                  transition: 'width 0.5s',
                }} />
              </div>
              <div style={{ fontSize: 11, color: colors.muted }}>
                {completedCount}/{CHALLENGES.length} missões · {earnedXP}/{totalXP} XP
              </div>
            </div>
          </div>

          </div>{/* end left flex column */}

          {/* Score ring — right flex column */}
          <div className="proj-score-abs" style={{
            flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, alignSelf: 'center',
          }}>
            <ScoreRing score={displayScore} />
            <div style={{
              background: level.color + '15', color: level.color,
              borderRadius: 999, padding: '4px 12px',
              fontSize: 10, fontWeight: 700, border: `1px solid ${level.color}35`,
              textAlign: 'center', maxWidth: 120, lineHeight: 1.5, letterSpacing: 0.2,
            }}>
              {level.label}
            </div>
            {internshipReady && (
              <div style={{
                background: colors.greenGlow, color: colors.green,
                border: '1px solid rgba(34,197,94,0.25)',
                borderRadius: 999, padding: '4px 12px',
                fontSize: 10, fontWeight: 700, textAlign: 'center', maxWidth: 120, lineHeight: 1.5,
              }}>
                Pronto para estágio
              </div>
            )}
            {ownerProfile?.available_for_work && (
              <div style={{
                background: 'rgba(16,185,129,0.1)', color: '#10b981',
                border: '1px solid rgba(16,185,129,0.3)',
                borderRadius: 999, padding: '4px 12px',
                fontSize: 10, fontWeight: 700, textAlign: 'center', maxWidth: 140, lineHeight: 1.5,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
              }}>
                <Briefcase size={11} style={{ flexShrink: 0 }} /> Disponível
              </div>
            )}
          </div>
          </div>{/* end flex row */}
        </div>{/* end proj-hero */}

        {/* proj-body: everything after hero — ordered after sidebar on tablet/mobile */}
        <div className="proj-body">

        {/* Defense date countdown — owner only */}
        {isOwner && (() => {
          const today = new Date(); today.setHours(0,0,0,0)
          const target = defenseDate ? new Date(defenseDate + 'T00:00:00') : null
          const daysLeft = target ? Math.ceil((target - today) / 86400000) : null
          const urgentColor = daysLeft != null && daysLeft <= 7 ? '#ef4444' : daysLeft != null && daysLeft <= 30 ? '#f97316' : '#1b78f7'
          return (
            <div style={{
              background: 'linear-gradient(135deg, rgba(27,120,247,0.07), rgba(79,70,229,0.04))',
              border: `1px solid ${defenseDate ? urgentColor + '40' : 'rgba(27,120,247,0.2)'}`,
              borderRadius: 16, padding: '18px 22px',
              display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
            }}>
              <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 44, height: 44, borderRadius: 12, background: `${urgentColor}15`, border: `1px solid ${urgentColor}30` }}><Calendar size={22} color={urgentColor} /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: colors.text, marginBottom: 4 }}>
                  {daysLeft === null ? 'Quando é a tua defesa?' :
                   daysLeft < 0 ? 'Defesa concluída' :
                   daysLeft === 0 ? 'A defesa é hoje!' :
                   daysLeft === 1 ? 'A defesa é amanhã!' :
                   `${daysLeft} dias para a defesa`}
                </div>
                {daysLeft != null && daysLeft > 0 && (
                  <div style={{ fontSize: 12, color: colors.muted }}>
                    {daysLeft <= 7 ? 'Foca no que falta completar.' :
                     daysLeft <= 30 ? 'Mantém o ritmo. Continua a melhorar o score.' :
                     'Tens tempo. Vai completando missão a missão.'}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <input
                  type="date"
                  value={defenseDate}
                  onChange={e => handleSaveDefenseDate(e.target.value)}
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: `1px solid ${colors.border}`,
                    borderRadius: 8, padding: '7px 10px',
                    color: colors.text, fontSize: 13,
                    fontFamily: 'inherit', cursor: 'pointer',
                    outline: 'none',
                    colorScheme: 'dark',
                  }}
                />
                {savingDefense && <div style={{ width: 14, height: 14, border: `2px solid ${colors.border}`, borderTop: `2px solid ${colors.blue}`, borderRadius: '50%', animation: 'spin 1s linear infinite' }} />}
              </div>
            </div>
          )
        })()}

        {/* Certificate banner — owner only, score >= 75 */}
        {isOwner && score >= 75 && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(79,70,229,0.12), rgba(27,120,247,0.08))',
            border: '1px solid rgba(79,70,229,0.3)',
            borderRadius: 16, padding: '18px 22px',
            display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
          }}>
            <GraduationCap size={28} color="#c4b5fd" style={{ flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#c4b5fd', marginBottom: 2 }}>
                O teu projeto atingiu nível profissional.
              </div>
              <div style={{ fontSize: 13, color: colors.muted }}>
                O teu certificado verificado por IA está disponível.
              </div>
            </div>
            <button
              onClick={() => navigate(`/certificado/${project.slug}`)}
              style={{
                background: 'linear-gradient(135deg, #4f46e5, #1b78f7)',
                color: '#fff', border: 'none', borderRadius: 10,
                padding: '10px 20px', fontSize: 13, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
                boxShadow: '0 4px 16px rgba(79,70,229,0.3)',
              }}
            >
              Ver certificado →
            </button>
          </div>
        )}

        {/* AI Analysis — compact trigger card (opens modal) — above AI description */}
        {isOwner ? (
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(109,40,217,0.07), rgba(79,70,229,0.05))',
              border: '1px solid rgba(129,140,248,0.2)',
              borderRadius: 16, padding: '16px 20px',
              display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
              cursor: 'pointer',
            }}
            onClick={handleAIClick}
          >
            <Bot size={22} color="#818cf8" style={{ flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: colors.text, marginBottom: 2 }}>Análise da IA</div>
              <div style={{ fontSize: 12, color: colors.muted }}>
                {aiFeedback ? 'Feedback guardado · clica para ver' : 'Recebe feedback personalizado para melhorar o score'}
              </div>
            </div>
            <div style={{
              background: aiFeedback ? 'rgba(34,197,94,0.1)' : 'linear-gradient(135deg,#6d28d9,#4f46e5)',
              border: aiFeedback ? '1px solid rgba(34,197,94,0.3)' : 'none',
              borderRadius: 10, padding: '8px 16px',
              color: aiFeedback ? '#22c55e' : '#fff',
              fontSize: 13, fontWeight: 700,
              flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6,
              boxShadow: aiFeedback ? 'none' : '0 4px 14px rgba(109,40,217,0.35)',
            }}>
              <Sparkles size={13} />
              {aiFeedback ? 'Ver análise' : 'Analisar'}
            </div>
          </div>
        ) : (
          /* Teaser for non-owners */
          <div style={{
            background: 'linear-gradient(135deg, #0e1830 0%, #0a1220 100%)',
            border: '1px solid rgba(129,140,248,0.15)',
            borderRadius: 16, padding: '16px 20px',
            display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
          }}>
            <Bot size={20} color="#818cf8" style={{ flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 200 }}>
              <p style={{ margin: '0 0 8px', fontSize: 13, color: '#c4b5fd', lineHeight: 1.55 }}>
                Cria o teu projeto e recebe análise por IA com feedback personalizado.
              </p>
              <button
                onClick={() => navigate('/novo')}
                style={{
                  background: 'linear-gradient(135deg, #6d28d9, #4f46e5)',
                  border: 'none', borderRadius: 8, padding: '7px 16px',
                  color: '#fff', fontSize: 12, fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'inherit',
                  boxShadow: '0 4px 14px rgba(109,40,217,0.35)',
                }}
              >
                Criar o meu projeto →
              </button>
            </div>
          </div>
        )}

        {/* AI Description */}
        {project.ai_description && (
          <div className="proj-card-pad proj-card" style={{
            background: `linear-gradient(135deg, rgba(129,140,248,0.04) 0%, rgba(27,120,247,0.02) 100%)`,
            border: '1px solid rgba(129,140,248,0.18)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: 6 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                Resumo gerado por IA
              </span>
              {isOwner && (
                <button
                  onClick={handleRegenerate}
                  disabled={regenerating || regenCooldown > 0}
                  style={{
                    background: 'transparent',
                    border: `1px solid rgba(129,140,248,0.22)`,
                    color: '#818cf8',
                    borderRadius: 7, padding: '4px 10px',
                    fontSize: 11, fontWeight: 600,
                    cursor: (regenerating || regenCooldown > 0) ? 'default' : 'pointer',
                    opacity: (regenerating || regenCooldown > 0) ? 0.5 : 0.8,
                    whiteSpace: 'nowrap',
                    fontFamily: 'inherit',
                    transition: 'opacity 0.15s',
                  }}
                  onMouseEnter={e => { if (!(regenerating || regenCooldown > 0)) e.currentTarget.style.opacity = '1' }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = (regenerating || regenCooldown > 0) ? '0.5' : '0.8' }}
                >
                  {regenerating ? 'A gerar...' : regenCooldown > 0 ? `${regenCooldown}s` : 'Regenerar'}
                </button>
              )}
            </div>
            <p style={{ margin: 0, fontSize: 17, lineHeight: 1.85, color: colors.text, fontWeight: 400 }}>{project.ai_description}</p>
          </div>
        )}

        {/* Highlights — 3 column cards */}
        {highlights.length > 0 && (() => {
          const hero = TYPE_HERO[project.project_type] ?? TYPE_HERO.personal
          const HlIcons = [Zap, TrendingUp, Lightbulb]
          return (
            <div className="proj-highlights-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
              {highlights.map((h, i) => {
                const HlIcon = HlIcons[i] ?? Sparkles
                return (
                  <div key={i} className="proj-card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 9, flexShrink: 0, background: `${hero.c1}14`, border: `1px solid ${hero.c1}28`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <HlIcon size={15} color={hero.c1} />
                    </div>
                    <p style={{ margin: 0, fontSize: 13, color: colors.muted, lineHeight: 1.65 }}>{h}</p>
                  </div>
                )
              })}
            </div>
          )
        })()}

        {/* PAP details */}
        {isPap && (project.pap_supervisor || project.pap_date) && (
          <div className="proj-card-pad proj-card" style={{ background: colors.yellowGlow, border: '1px solid rgba(234,179,8,0.18)' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 11, fontWeight: 700, color: colors.yellow, textTransform: 'uppercase', letterSpacing: 0.8 }}>Detalhes da PAP</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
              {project.pap_supervisor && (
                <div>
                  <div style={{ fontSize: 11, color: colors.subtle, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Orientador</div>
                  <div style={{ fontSize: 15, color: colors.text, fontWeight: 500 }}>{project.pap_supervisor}</div>
                </div>
              )}
              {project.pap_date && (
                <div>
                  <div style={{ fontSize: 11, color: colors.subtle, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Apresentação</div>
                  <div style={{ fontSize: 15, color: colors.text, fontWeight: 500 }}>{project.pap_date}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Project sections — accordion on mobile/tablet, always visible on desktop */}
        <button
          className="proj-sections-toggle"
          onClick={() => setSectionsOpen(o => !o)}
        >
          <BookOpen size={18} color={colors.blue} style={{ flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: colors.text, marginBottom: 2 }}>Explorar o projeto</div>
            <div style={{ fontSize: 12, color: colors.muted }}>Problema · Solução · Resultados · e mais</div>
          </div>
          <ChevronDown size={16} color={colors.muted} style={{ flexShrink: 0, transition: 'transform 0.22s', transform: sectionsOpen ? 'rotate(180deg)' : 'none' }} />
        </button>

        <div className={`proj-sections-body${sectionsOpen ? '' : ' collapsed'}`}>
          <Section fieldKey="problem"         content={project.problem}         isOwner={isOwner} onImprove={setEditModal} />
          <Section fieldKey="solution"        content={project.solution}        isOwner={isOwner} onImprove={setEditModal} />
          <Section fieldKey="target_audience" content={project.target_audience} isOwner={isOwner} onImprove={setEditModal} />
          <Section fieldKey="features"        content={project.features}        isOwner={isOwner} onImprove={setEditModal} />
          <Section fieldKey="technologies"    content={project.technologies}    isOwner={isOwner} onImprove={setEditModal} />
          <Section fieldKey="challenges"      content={project.challenges}      isOwner={isOwner} onImprove={setEditModal} />
          <Section fieldKey="results"         content={project.results}         isOwner={isOwner} onImprove={setEditModal} />
          <Section fieldKey="learnings"       content={project.learnings}       isOwner={isOwner} onImprove={setEditModal} />
        </div>

        {/* Missions — owner only */}
        {isOwner && <div id="missions-section" className="proj-card" style={{ scrollMarginTop: 88 }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, gap: 12 }}>
            <div>
              <h3 className="proj-sec-label" style={{ marginBottom: 4 }}>Missões</h3>
              <p style={{ margin: 0, fontSize: 12, color: colors.muted }}>Completa missões para melhorar o teu score</p>
            </div>
            {/* XP card with progress bar inside */}
            <div style={{
              background: colors.bg, border: `1px solid ${colors.border}`,
              borderRadius: 12, padding: '12px 16px', minWidth: 110, flexShrink: 0,
            }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: colors.blue, letterSpacing: '-0.5px', marginBottom: 6 }}>
                {earnedXP}<span style={{ fontSize: 12, color: colors.subtle, fontWeight: 500 }}>/{totalXP} pts</span>
              </div>
              <div style={{ height: 4, background: progTrack(Math.round((earnedXP / totalXP) * 100)), borderRadius: 99, overflow: 'hidden', marginBottom: 5 }}>
                <div style={{
                  height: '100%', borderRadius: 99,
                  width: `${(earnedXP / totalXP) * 100}%`,
                  background: progBar(Math.round((earnedXP / totalXP) * 100)),
                  transition: 'width 0.6s ease-out',
                }} />
              </div>
              <div style={{ fontSize: 10, color: colors.subtle, fontWeight: 600 }}>{completedCount}/{CHALLENGES.length} completas</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {sortedChallenges.map(c => (
              <MissionRow key={c.id} challenge={c} project={project} onImprove={setEditModal} isOwner={isOwner} />
            ))}
          </div>
        </div>}

        {/* Share — compact bar */}
        <div className="proj-card" style={{ padding: '12px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: colors.muted, textTransform: 'uppercase', letterSpacing: '0.08em', flexShrink: 0 }}>
              {isOwner ? 'Partilhar' : 'Partilha'}
            </span>
            <div style={{ flex: 1, minWidth: 0, background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 7, padding: '7px 12px', fontSize: 12, color: colors.subtle, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {pageUrl}
            </div>
            <button
              onClick={handleCopy}
              style={{
                background: copied ? `${colors.green}18` : `${colors.blue}18`,
                border: `1px solid ${copied ? colors.green + '35' : colors.blue + '30'}`,
                color: copied ? colors.green : '#60a5fa',
                borderRadius: 8, padding: '7px 14px',
                fontSize: 12, fontWeight: 700,
                cursor: 'pointer', whiteSpace: 'nowrap',
                transition: 'all 0.2s',
                fontFamily: 'inherit', flexShrink: 0,
                display: 'flex', alignItems: 'center', gap: 5,
              }}
            >
              {copied ? <><Check size={12} />Copiado</> : 'Copiar'}
            </button>
            <button
              onClick={() => setShowQR(true)}
              title="Ver QR Code"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: `1px solid ${colors.border}`,
                borderRadius: 8, padding: '7px 10px',
                color: colors.muted, cursor: 'pointer',
                fontFamily: 'inherit', flexShrink: 0,
                display: 'flex', alignItems: 'center', gap: 5,
                fontSize: 12, fontWeight: 600,
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = colors.borderBright; e.currentTarget.style.color = colors.text }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = colors.border; e.currentTarget.style.color = colors.muted }}
            >
              {/* QR icon */}
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                <rect x="3" y="14" width="7" height="7"/>
                <path d="M14 14h3v3h-3zM17 17h3v3h-3zM14 20h3"/>
              </svg>
              <span className="proj-share-qr-label">QR Code</span>
            </button>
          </div>
        </div>

        {/* QR Modal */}
        {showQR && (
          <div
            onClick={() => setShowQR(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 800,
              background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 24,
            }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{
                background: colors.card, border: `1px solid ${colors.borderBright}`,
                borderRadius: 20, padding: '28px 32px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20,
                boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
                maxWidth: 320, width: '100%',
                position: 'relative',
              }}
            >
              <button
                onClick={() => setShowQR(false)}
                style={{ position: 'absolute', top: 14, right: 14, background: 'rgba(255,255,255,0.05)', border: `1px solid ${colors.border}`, borderRadius: 8, width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: colors.muted }}
              ><X size={14} /></button>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: colors.text, textAlign: 'center', marginBottom: 4 }}>{project.name}</div>
                <div style={{ fontSize: 12, color: colors.muted, textAlign: 'center' }}>Aponta a câmara para abrir</div>
              </div>
              <div style={{ background: '#fff', borderRadius: 16, padding: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
                <QRCodeSVG value={pageUrl} size={180} />
              </div>
              <div style={{ background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 8, padding: '8px 14px', fontSize: 11, color: colors.subtle, textAlign: 'center', wordBreak: 'break-all', maxWidth: '100%' }}>
                {pageUrl}
              </div>
            </div>
          </div>
        )}

        {/* Author — bottom of page */}
        {(project.creator_name || project.course || project.school_year || project.school) && (
          <div className="proj-author-bottom proj-card" style={{
            display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
          }}>
            {/* Avatar */}
            {ownerProfile?.avatar_url ? (
              <img
                src={ownerProfile.avatar_url}
                alt={project.creator_name}
                style={{ width: 44, height: 44, borderRadius: '50%', flexShrink: 0, objectFit: 'cover', border: `2px solid ${colors.border}` }}
              />
            ) : (
              <div style={{
                width: 44, height: 44, flexShrink: 0,
                background: `linear-gradient(135deg, ${colors.blue}, #4f46e5)`,
                borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, fontWeight: 800, color: '#fff',
              }}>
                {project.creator_name ? project.creator_name[0].toUpperCase() : '?'}
              </div>
            )}
            <div className="proj-author-bottom-text" style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, color: colors.text, fontWeight: 700, marginBottom: 2 }}>
                {project.creator_name || 'Autor'}
              </div>
              {[project.course, project.school_year, project.school].filter(Boolean).length > 0 && (
                <div style={{ fontSize: 12, color: colors.muted, fontWeight: 400 }}>
                  {[project.course, project.school_year, project.school].filter(Boolean).join(' · ')}
                </div>
              )}
            </div>
            {(project.linkedin_url || project.github_url || project.portfolio_url) && (
              <div className="proj-author-links" style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                {project.linkedin_url && (
                  <a href={project.linkedin_url} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: colors.muted, fontWeight: 600, textDecoration: 'none', background: 'rgba(255,255,255,0.04)', border: `1px solid ${colors.border}`, borderRadius: 7, padding: '5px 10px', transition: 'all 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = colors.borderBright; e.currentTarget.style.color = colors.text }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = colors.border; e.currentTarget.style.color = colors.muted }}
                  >LinkedIn</a>
                )}
                {project.github_url && (
                  <a href={project.github_url} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: colors.muted, fontWeight: 600, textDecoration: 'none', background: 'rgba(255,255,255,0.04)', border: `1px solid ${colors.border}`, borderRadius: 7, padding: '5px 10px', transition: 'all 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = colors.borderBright; e.currentTarget.style.color = colors.text }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = colors.border; e.currentTarget.style.color = colors.muted }}
                  >GitHub</a>
                )}
                {project.portfolio_url && (
                  <a href={project.portfolio_url} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: colors.muted, fontWeight: 600, textDecoration: 'none', background: 'rgba(255,255,255,0.04)', border: `1px solid ${colors.border}`, borderRadius: 7, padding: '5px 10px', transition: 'all 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = colors.borderBright; e.currentTarget.style.color = colors.text }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = colors.border; e.currentTarget.style.color = colors.muted }}
                  >Portfólio</a>
                )}
              </div>
            )}
          </div>
        )}

        <div style={{ textAlign: 'center', padding: '40px 0 0', color: colors.subtle, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, flexWrap: 'wrap' }}>
          Criado com{' '}
          <img src="/logo.png" alt="Showo" style={{ height: 16, width: 'auto', verticalAlign: 'middle', opacity: 0.7 }} />
          {' '}· Transforma projetos em páginas profissionais
        </div>
        </div>{/* end proj-body */}
        </div>{/* end proj-main */}

        {/* Sidebar */}
        <aside className="proj-sidebar" style={{ paddingTop: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <MembersPanel
            ownerName={ownerProfile?.full_name || ownerProfile?.username || project.creator_name}
            members={members}
            colors={colors}
            isOwner={isOwner}
          />

          {/* Teacher feedback — sidebar: desktop first/second slot, mobile above author */}
          {(isOwner || isProfessor) && (teacherFeedback.length > 0 || isProfessor) && (() => {
            const FB_SECTION_LABELS = { description: 'Descrição', tech: 'Tecnologias', links: 'Links', demo: 'Demo', team: 'Equipa', gallery: 'Galeria', geral: 'Geral' }
            const myFeedback = isProfessor ? teacherFeedback.filter(f => f.teacher_id === user?.id) : teacherFeedback
            return (
              <div style={{ background: 'linear-gradient(135deg,rgba(251,191,36,0.05),rgba(245,158,11,0.02))', border: '1px solid rgba(251,191,36,0.22)', borderRadius: 16, overflow: 'hidden' }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px', borderBottom: myFeedback.length > 0 || showFeedbackForm ? '1px solid rgba(251,191,36,0.12)' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <GraduationCap size={14} color="#fbbf24" />
                    <span style={{ fontSize: 13, fontWeight: 700, color: colors.text }}>Feedback do Professor</span>
                  </div>
                  {isProfessor && (
                    <button
                      onClick={() => setShowFeedbackForm(f => !f)}
                      style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, padding: '4px 9px', borderRadius: 6, border: `1px solid ${showFeedbackForm ? 'rgba(251,191,36,0.5)' : 'rgba(251,191,36,0.3)'}`, background: showFeedbackForm ? 'rgba(251,191,36,0.15)' : 'transparent', color: '#fbbf24', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700 }}
                    >
                      {showFeedbackForm ? <><X size={11} /> Fechar</> : <><Pencil size={11} /> Editar</>}
                    </button>
                  )}
                </div>

                {/* Feedback items — each on one compact row */}
                {myFeedback.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {myFeedback.map((f, idx) => (
                      <div
                        key={f.id}
                        style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 16px', borderBottom: idx < myFeedback.length - 1 ? '1px solid rgba(251,191,36,0.08)' : 'none' }}
                      >
                        <span style={{ fontSize: 9, fontWeight: 800, color: '#fbbf24', background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 4, padding: '2px 6px', letterSpacing: 0.5, textTransform: 'uppercase', flexShrink: 0, marginTop: 2, whiteSpace: 'nowrap' }}>
                          {FB_SECTION_LABELS[f.field_key] || f.field_key}
                        </span>
                        <span style={{ flex: 1, fontSize: 13, color: colors.text, lineHeight: 1.5 }}>{f.comment}</span>
                        {isProfessor && (
                          <div style={{ display: 'flex', gap: 4, flexShrink: 0, marginTop: 1 }}>
                            <button
                              onClick={() => { setFbEditing(f.id); setFbFieldKey(f.field_key); setFbComment(f.comment); setShowFeedbackForm(true) }}
                              title="Editar"
                              style={{ background: 'none', border: 'none', color: colors.muted, cursor: 'pointer', padding: 3, display: 'flex', alignItems: 'center', borderRadius: 4 }}
                            ><Pencil size={11} /></button>
                            <button
                              onClick={() => handleFbDelete(f.id)}
                              title="Apagar"
                              style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 3, display: 'flex', alignItems: 'center', borderRadius: 4 }}
                            ><X size={11} /></button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {isProfessor && teacherFeedback.length === 0 && !showFeedbackForm && (
                  <p style={{ margin: 0, fontSize: 13, color: colors.muted, padding: '10px 16px' }}>Ainda não deixaste feedback.</p>
                )}

                {/* Feedback form */}
                {isProfessor && showFeedbackForm && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '12px 16px', borderTop: myFeedback.length > 0 ? '1px solid rgba(251,191,36,0.12)' : 'none' }}>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                      {Object.entries(FB_SECTION_LABELS).map(([k, l]) => (
                        <button key={k} onClick={() => setFbFieldKey(k)} style={{ fontSize: 11, padding: '3px 8px', borderRadius: 5, border: `1px solid ${fbFieldKey === k ? '#fbbf24' : colors.border}`, background: fbFieldKey === k ? 'rgba(251,191,36,0.12)' : 'transparent', color: fbFieldKey === k ? '#fbbf24' : colors.muted, cursor: 'pointer', fontFamily: 'inherit', fontWeight: fbFieldKey === k ? 700 : 400 }}>{l}</button>
                      ))}
                    </div>
                    <textarea value={fbComment} onChange={e => setFbComment(e.target.value)} placeholder={`Feedback sobre ${FB_SECTION_LABELS[fbFieldKey]}…`} rows={3} style={{ width: '100%', background: 'var(--c-bg)', border: `1px solid ${colors.border}`, borderRadius: 8, padding: '9px 11px', color: colors.text, fontSize: 13, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box', outline: 'none' }} />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={handleFbSave} disabled={fbSaving || !fbComment.trim()} style={{ flex: 1, background: 'linear-gradient(135deg,#d97706,#b45309)', border: 'none', borderRadius: 8, padding: '9px', color: '#fff', fontSize: 13, fontWeight: 600, cursor: fbSaving || !fbComment.trim() ? 'default' : 'pointer', opacity: fbSaving || !fbComment.trim() ? 0.6 : 1, fontFamily: 'inherit' }}>
                        {fbSaving ? 'A guardar…' : fbEditing ? 'Atualizar' : 'Guardar'}
                      </button>
                      {fbEditing && <button onClick={() => { setFbEditing(null); setFbComment('') }} style={{ background: 'transparent', border: `1px solid ${colors.border}`, borderRadius: 8, padding: '9px 12px', color: colors.muted, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>Cancelar</button>}
                    </div>
                  </div>
                )}
              </div>
            )
          })()}

          {/* Profile completeness + tips */}
          <div className="proj-completude-grid" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {isOwner && (() => {
            const fieldQuality = PROFILE_SCORE_FIELDS.map(f => {
              const val = String(project[f.key] || '').trim()
              const len = val.length
              const quality = len === 0 ? 'empty' : len < f.minLen ? 'short' : 'good'
              return { ...f, val, len, quality }
            })
            const goodCount  = fieldQuality.filter(f => f.quality === 'good').length
            const pct = Math.round((goodCount / fieldQuality.length) * 100)

            return (
              <div className="proj-card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: completudeOpen ? 14 : 0 }}>
                  <h3 className="proj-sec-label" style={{ margin: 0 }}>Completude</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: pct === 100 ? '#10b981' : pct > 60 ? colors.blue : colors.yellow }}>{pct}%</span>
                    <button
                      className="sidebar-section-toggle"
                      onClick={() => setCompletudeOpen(o => !o)}
                      style={{ background: 'none', border: 'none', color: colors.muted, cursor: 'pointer', padding: '2px 4px', alignItems: 'center' }}
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: completudeOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                        <path d="M2 4l4 4 4-4"/>
                      </svg>
                    </button>
                  </div>
                </div>
                <div className={`sidebar-section-body${completudeOpen ? '' : ' collapsed'}`}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {fieldQuality.map(f => (
                      <div key={f.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, background: f.quality === 'good' ? '#10b981' : f.quality === 'short' ? colors.yellow : colors.subtle }} />
                        <span style={{ flex: 1, fontSize: 12, color: f.quality === 'good' ? colors.text : f.quality === 'short' ? '#d4a820' : colors.subtle, fontWeight: f.quality === 'good' ? 600 : 400 }}>{f.label}</span>
                        {f.quality === 'good'  && <Check size={11} color="#10b981" strokeWidth={3} />}
                        {f.quality === 'short' && <span style={{ fontSize: 10, color: colors.yellow, fontWeight: 700 }}>curto</span>}
                        {f.quality === 'empty' && <span style={{ fontSize: 11, color: colors.subtle }}>—</span>}
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 14, height: 4, background: progTrack(pct), borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 99, width: `${pct}%`, background: progBar(pct), transition: 'width 0.5s' }} />
                  </div>
                </div>
              </div>
            )
          })()}

          {/* How to improve — owner only */}
          {isOwner && (() => {
            const needsWork = PROFILE_SCORE_FIELDS.map(f => {
              const val = String(project[f.key] || '').trim()
              const len = val.length
              const quality = len === 0 ? 'empty' : len < f.minLen ? 'short' : 'good'
              return { ...f, quality }
            }).filter(f => f.quality !== 'good').slice(0, 3)

            if (needsWork.length === 0) return (
              <div style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 16, padding: '16px 20px', textAlign: 'center' }}>
                <CheckCircle size={24} color="#22c55e" style={{ marginBottom: 6 }} />
                <p style={{ margin: 0, fontSize: 13, color: '#22c55e', fontWeight: 700 }}>Perfil completo!</p>
              </div>
            )

            return (
              <div className="proj-card" style={{ background: 'linear-gradient(135deg, rgba(27,120,247,0.05), rgba(79,70,229,0.03))', border: '1px solid rgba(27,120,247,0.18)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: tipsOpen ? 14 : 0 }}>
                  <h3 className="proj-sec-label" style={{ margin: 0, color: '#5a9ff5', flex: 1, minWidth: 0, overflow: 'hidden' }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#5a9ff5" strokeWidth="2.5" style={{ flexShrink: 0 }}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Como aumentar o score</span>
                  </h3>
                  <button
                    className="sidebar-section-toggle"
                    onClick={() => setTipsOpen(o => !o)}
                    style={{ background: 'none', border: 'none', color: '#5a9ff5', cursor: 'pointer', padding: '2px 4px', alignItems: 'center' }}
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: tipsOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                      <path d="M2 4l4 4 4-4"/>
                    </svg>
                  </button>
                </div>
                <div className={`sidebar-section-body${tipsOpen ? '' : ' collapsed'}`}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {needsWork.map(f => (
                      <div key={f.key} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                        <div style={{ width: 5, height: 5, borderRadius: '50%', background: f.quality === 'short' ? colors.yellow : '#1b78f7', flexShrink: 0, marginTop: 6 }} />
                        <div>
                          <span style={{ fontSize: 11, fontWeight: 700, color: f.quality === 'short' ? colors.yellow : '#5a9ff5', display: 'block', marginBottom: 2 }}>
                            {f.label} {f.quality === 'short' ? '· muito curto' : '· em falta'}
                          </span>
                          <p style={{ margin: 0, fontSize: 12, color: colors.muted, lineHeight: 1.55 }}>{f.tip}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {isOwner && (
                    <button
                      onClick={() => document.getElementById('missions-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                      style={{ marginTop: 14, width: '100%', background: 'rgba(27,120,247,0.1)', border: '1px solid rgba(27,120,247,0.2)', color: '#5a9ff5', borderRadius: 10, padding: '9px 0', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                      Ver missões ↓
                    </button>
                  )}
                </div>
              </div>
            )
          })()}
          </div>{/* end proj-completude-grid */}
        </aside>
        </div>{/* end proj-layout */}

      </div>
    </div>
  )
}
