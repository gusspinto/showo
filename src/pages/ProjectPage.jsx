import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { QRCodeSVG } from 'qrcode.react'
import { supabase } from '../lib/supabase'
import { calculateScore } from '../lib/score'
import { CHALLENGES, getChallengeStatus } from '../lib/challenges'
import { Navbar } from '../components/Navbar'
import { generateProject } from '../lib/generateProject'
import { useAuth } from '../context/AuthContext'
import DefenseMode from '../components/DefenseMode'
import { analyzeProject } from '../lib/analyzeProject'
import { Check, X, Loader, GraduationCap, Save, Sparkles, Bot, Lightbulb, Pencil, Search, Target, Wrench, Zap, TrendingUp, Briefcase, Users, Rocket, Trophy, BarChart2, CheckCircle, BookOpen, ChevronDown } from 'lucide-react'

const colors = {
  bg: '#0d1424',
  bgAlt: '#111c32',
  card: '#152030',
  cardHover: '#1c2d44',
  border: '#1e3050',
  borderBright: '#2a4275',
  blue: '#1b78f7',
  blueHover: '#1564d4',
  blueGlow: 'rgba(27,120,247,0.15)',
  blueSubtle: 'rgba(27,120,247,0.08)',
  blueBg: '#0a1729',
  text: '#e8f2ff',
  muted: '#7d93b0',
  subtle: '#3d5270',
  green: '#22c55e',
  greenGlow: 'rgba(34,197,94,0.12)',
  greenBg: '#061a0f',
  yellow: '#eab308',
  yellowGlow: 'rgba(234,179,8,0.12)',
  orange: '#f97316',
  orangeGlow: 'rgba(249,115,22,0.12)',
}

const CONFETTI_COLORS = ['#1b78f7', '#22c55e', '#eab308', '#f97316', '#a855f7', '#ec4899', '#06b6d4']

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

// Progress bar gradient: white → blue, darker as pct increases (closer to goal = darker blue)
function progBar(pct) {
  const blue = pct >= 90 ? '#0f4ba0'
             : pct >= 70 ? '#1348c0'
             : pct >= 50 ? '#1564d4'
             : pct >= 30 ? '#1b78f7'
             :              '#60a5fa'
  return `linear-gradient(90deg, rgba(255,255,255,0.85) 0%, ${blue} 100%)`
}

function getLevelInfo(score) {
  if (score === 100) return { label: 'Projeto completo!', color: colors.green }
  if (score >= 81) return { label: 'Impressionante', color: colors.blue }
  if (score >= 61) return { label: 'Quase pronto', color: colors.orange }
  if (score >= 41) return { label: 'A ganhar forma', color: colors.yellow }
  return { label: 'Em desenvolvimento', color: colors.muted }
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
    <div className="proj-card-pad" style={{
      background: colors.card,
      border: `1px solid ${isShort ? 'rgba(234,179,8,0.22)' : isEmpty ? colors.subtle + '55' : colors.border}`,
      borderRadius: 16, padding: '20px 24px', marginBottom: 12,
      boxShadow: '0 2px 16px rgba(0,0,0,0.2)',
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
            style={{ background: 'none', border: 'none', color: colors.subtle, cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit', padding: '2px 6px', borderRadius: 6 }}
            onMouseEnter={e => e.target.style.color = colors.blue}
            onMouseLeave={e => e.target.style.color = colors.subtle}
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
                style={{ background: 'rgba(27,120,247,0.08)', border: '1px solid rgba(27,120,247,0.18)', color: '#5a9ff5', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}
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
        background: isCompleted ? 'rgba(52,211,153,0.03)' : colors.bgAlt,
        border: `1px solid ${isCompleted ? 'rgba(52,211,153,0.14)' : colors.border}`,
        transition: 'border-color 0.15s',
      }}
    >
      {/* Status dot / icon */}
      <div style={{
        width: 30, height: 30, borderRadius: 9, flexShrink: 0,
        background: isCompleted ? 'rgba(52,211,153,0.1)' : 'rgba(255,255,255,0.03)',
        border: `1px solid ${isCompleted ? 'rgba(52,211,153,0.22)' : colors.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: isCompleted ? '#34d399' : colors.muted,
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
            <div style={{ flex: 1, height: 3, background: colors.border, borderRadius: 99, overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 99,
                width: `${progress * 100}%`,
                background: progBar(Math.round(progress * 100)),
              }} />
            </div>
            <span style={{ fontSize: 10, color: colors.subtle, flexShrink: 0 }}>{val.length}/{challenge.threshold}</span>
          </div>
        )}
      </div>

      {/* Points badge */}
      <span style={{
        fontSize: 11, fontWeight: 700, flexShrink: 0, borderRadius: 999, padding: '2px 9px',
        color: isCompleted ? '#34d399' : colors.blue,
        background: isCompleted ? 'rgba(52,211,153,0.08)' : 'rgba(27,120,247,0.08)',
        border: `1px solid ${isCompleted ? 'rgba(52,211,153,0.18)' : 'rgba(27,120,247,0.18)'}`,
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
    accepted: { label: 'Colaborador', color: '#34d399', bg: 'rgba(52,211,153,0.1)', border: 'rgba(52,211,153,0.25)', avatar: 'linear-gradient(135deg,#34d399,#059669)', dim: false },
    pending:  { label: 'Pendente', color: '#eab308', bg: 'rgba(234,179,8,0.1)',  border: 'rgba(234,179,8,0.25)',  avatar: 'linear-gradient(135deg,#ca8a04,#92400e)', dim: true  },
    declined: { label: 'Recusou',  color: '#f87171', bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.25)', avatar: 'linear-gradient(135deg,#ef4444,#b91c1c)', dim: true  },
  }

  // For non-owners, only show accepted; already filtered at query level but guard here too
  const visibleMembers = isOwner ? members : members.filter(m => m.status === 'accepted')

  // Solo project — no team card; the detailed "Autor" card below handles this
  if (visibleMembers.length === 0) return null

  // Team project — show full Equipa card
  return (
    <div style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 16, padding: '18px 22px', boxShadow: '0 2px 16px rgba(0,0,0,0.2)' }}>
      <h3 style={{ margin: '0 0 14px', fontSize: 11, fontWeight: 700, color: colors.muted, textTransform: 'uppercase', letterSpacing: 1 }}>Equipa</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Owner */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
            {displayOwner[0]?.toUpperCase()}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: colors.text }}>{displayOwner}</span>
            <span style={{ fontSize: 11, background: 'rgba(27,120,247,0.1)', border: '1px solid rgba(27,120,247,0.25)', borderRadius: 5, padding: '1px 7px', color: '#60a5fa', fontWeight: 700 }}>Dono</span>
          </div>
        </div>
        {/* Collaborators */}
        {visibleMembers.map(m => {
          const name = m.profiles?.full_name || m.profiles?.username || 'Colaborador'
          const sections = (m.sections ?? []).map(s => SECTION_LABELS[s]).filter(Boolean)
          const cfg = statusCfg[m.status] || statusCfg.accepted
          return (
            <div key={m.user_id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, opacity: cfg.dim ? 0.65 : 1 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: cfg.avatar, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                {name[0]?.toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: colors.text }}>{name}</span>
                  <span style={{ fontSize: 11, background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: 5, padding: '1px 7px', color: cfg.color, fontWeight: 700 }}>{cfg.label}</span>
                </div>
                {m.status === 'accepted' && sections.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 5 }}>
                    {sections.map(s => (
                      <span key={s} style={{ fontSize: 11, color: colors.muted, background: 'rgba(255,255,255,0.04)', border: `1px solid ${colors.border}`, borderRadius: 4, padding: '1px 6px' }}>{s}</span>
                    ))}
                  </div>
                )}
              </div>
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
  const [completudeOpen, setCompletudeOpen] = useState(false)
  const [tipsOpen, setTipsOpen] = useState(false)
  const [sectionsOpen, setSectionsOpen] = useState(false)
  const [teacherFeedback, setTeacherFeedback] = useState([])
  const [showFeedbackForm, setShowFeedbackForm] = useState(false)
  const [fbComment, setFbComment] = useState('')
  const [fbFieldKey, setFbFieldKey] = useState('geral')
  const [fbSaving, setFbSaving] = useState(false)
  const [fbEditing, setFbEditing] = useState(null)

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
          .select('id, username, full_name')
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
    if (authLoading) return // wait for auth to resolve before checking ownership
    const isOwner = !!(user?.id && project.user_id && user.id === project.user_id)
    const editToken = localStorage.getItem(`edit_token_${project.slug}`)
    if (isOwner || editToken) return // don't track owner views

    // Increment view counter once per session
    const viewKey = `viewed_${project.slug}`
    if (!sessionStorage.getItem(viewKey)) {
      sessionStorage.setItem(viewKey, '1')
      supabase.rpc('increment_project_views', { project_id: project.id })
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
        .proj-h1-row         { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 15px; flex-wrap: wrap; }
        .proj-dashboard      { display: none; }
        .proj-ai-fab         { display: none; }
        .proj-ai-fab-label   { display: none; }
        .proj-fab-area       { display: none; }
        .proj-fab-defense-label { display: none; }
        /* Sidebar section toggles — visible on all breakpoints (desktop + mobile) */
        .sidebar-section-toggle { display: flex; }
        .sidebar-section-body.collapsed { display: none; }
        .proj-sections-toggle { display: none; }
        @media (max-width: 860px) {
          /* Edit button proportional to mobile title */
          .proj-edit-inline { width: 26px !important; height: 26px !important; border-radius: 7px !important; margin-top: 2px !important; }
          .proj-h1-row { margin-bottom: 4px !important; gap: 8px !important; }
          .proj-tagline { margin-top: 4px !important; margin-bottom: 14px !important; font-size: 15px !important; }
          /* Completude + tips side-by-side on mobile/tablet */
          .proj-completude-grid {
            display: grid !important;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            align-items: start;   /* each card only as tall as its own content */
          }
          /* Tighter padding inside grid cards */
          .proj-completude-grid > div { padding: 12px 12px !important; }
          /* Shrink long heading so it fits without wrapping */
          .proj-completude-grid h3 {
            font-size: 9px !important;
            letter-spacing: 0.03em !important;
            line-height: 1.3 !important;
          }
          /* Prevent toggle chevron from shrinking away */
          .proj-completude-grid .sidebar-section-toggle { flex-shrink: 0; }
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
          /* AI FAB — pill com label no tablet */
          .proj-ai-fab       { display: flex !important; border-radius: 999px !important; width: auto !important; padding: 0 18px !important; gap: 8px !important; font-family: var(--font-body); font-size: 14px; font-weight: 700; }
          .proj-ai-fab-label { display: inline !important; }
          /* Defense FAB — pill com label no tablet */
          .proj-fab-defense-label { display: inline !important; }
        }
        @media (max-width: 600px) {
          .proj-wrap         { padding: 0 16px 80px !important; overflow-x: hidden !important; }
          .proj-cover        { height: 200px !important; margin-top: 20px !important; border-radius: 14px !important; }
          .proj-hero         { padding: 20px 0 16px !important; }
          .proj-h1           { font-size: 30px !important; }
          .proj-score-abs    { display: none !important; }
          .proj-dashboard    { display: flex !important; }
          .proj-tagline      { font-size: 15px !important; }
          .proj-card-pad     { padding: 18px 16px !important; border-radius: 14px !important; }
          .proj-badges       { margin-bottom: 10px !important; }
          /* Mobile: ambos os FABs circulares, sem label */
          .proj-ai-fab       { border-radius: 50% !important; width: 52px !important; padding: 0 !important; gap: 0 !important; }
          .proj-ai-fab-label { display: none !important; }
          .proj-fab-defense-label { display: none !important; }
          .proj-fab-defense { padding: 0 !important; width: 52px !important; min-width: 52px !important; }
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <Bot size={22} color="#818cf8" />
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, letterSpacing: '-0.3px' }}>Análise da IA</h3>
            </div>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: colors.muted, paddingLeft: 32 }}>
              Feedback personalizado para melhorar o teu projeto
            </p>

            {/* Analyze button */}
            {isOwner && (
              <div style={{ display: 'flex', justifyContent: aiFeedback ? 'flex-end' : 'flex-start', marginBottom: 20 }}>
                <button
                  onClick={handleAnalyzeAI}
                  disabled={analyzingAI}
                  style={{
                    background: analyzingAI ? 'rgba(27,120,247,0.1)' : 'linear-gradient(135deg,#3b82f6,#4f46e5)',
                    border: analyzingAI ? '1px solid rgba(27,120,247,0.3)' : 'none',
                    borderRadius: 10, padding: '9px 18px',
                    color: analyzingAI ? '#60a5fa' : '#fff',
                    fontSize: 13, fontWeight: 700,
                    cursor: analyzingAI ? 'default' : 'pointer',
                    fontFamily: 'inherit',
                    boxShadow: analyzingAI ? 'none' : '0 4px 16px rgba(27,120,247,0.35)',
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}
                >
                  {analyzingAI
                    ? <><Sparkles size={14} style={{ verticalAlign: 'middle' }} /> A analisar…</>
                    : aiFeedback
                      ? <><Sparkles size={14} style={{ verticalAlign: 'middle' }} /> Reanalisar</>
                      : <><Sparkles size={14} style={{ verticalAlign: 'middle' }} /> Analisar com IA</>}
                </button>
              </div>
            )}

            {analyzeError && (
              <div style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: 10, padding: '12px 16px', color: '#f87171', fontSize: 13, marginBottom: 16 }}>
                {analyzeError}
              </div>
            )}

            {aiFeedback && !analyzingAI && (
              <div>
                <div style={{ background: 'rgba(27,120,247,0.06)', border: '1px solid rgba(27,120,247,0.15)', borderRadius: 12, padding: '14px 16px', marginBottom: 16 }}>
                  <div style={{ fontSize: 13, color: '#e8f2ff', lineHeight: 1.65, marginBottom: aiFeedback.score_hint ? 8 : 0 }}>
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
              width: 52, height: 52, borderRadius: '50%',
              background: 'linear-gradient(135deg, #6d28d9, #4f46e5)',
              border: 'none',
              color: '#fff', cursor: analyzingAI ? 'default' : 'pointer',
              alignItems: 'center', justifyContent: 'center',
              animation: analyzingAI ? 'none' : 'sparkle-pulse 2s ease-in-out infinite',
              opacity: analyzingAI ? 0.7 : 1,
              backdropFilter: 'blur(8px)',
            }}
          >
            <Sparkles size={22} />
            <span className="proj-ai-fab-label">Análise</span>
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
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 20%, #0d1424 100%)' }} />
              </div>
            ) : (
              <div style={{
                width: '100%', height: 220,
                background: `linear-gradient(135deg, ${hero.c1}22 0%, ${hero.c2}55 50%, #0d1424 100%)`,
                position: 'relative', overflow: 'hidden',
              }}>
                <div style={{ position: 'absolute', top: -60, left: '10%', width: 400, height: 400, borderRadius: '50%', background: `radial-gradient(ellipse, ${hero.c1}28 0%, transparent 65%)`, pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', top: -20, right: '5%', width: 250, height: 250, borderRadius: '50%', background: `radial-gradient(ellipse, ${hero.c2}22 0%, transparent 65%)`, pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 40%, #0d1424 100%)' }} />
              </div>
            )}
          </div>
        )
      })()}

      <div className="proj-wrap" style={{ maxWidth: 1080, margin: '0 auto', padding: '0 24px 80px', overflowX: 'clip' }}>

        {/* Two-column layout: main content + sticky sidebar */}
        <div className="proj-layout">
        <div className="proj-main">

        {/* Hero */}
        <div className="proj-hero" style={{ padding: '24px 0 40px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24 }}>
          <div style={{ flex: 1, minWidth: 0 }}>

          {/* Badges */}
          {(() => {
            const hero = TYPE_HERO[project.project_type] ?? TYPE_HERO.personal
            return (
              <div className="proj-badges" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 15 }}>
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
              </div>
            )
          })()}

          {/* Title row — edit icon sits right after title text */}
          <div className="proj-h1-row">
            <h1 className="proj-h1" style={{ fontSize: 'clamp(22px, 5vw, 48px)', fontWeight: 900, margin: 0, lineHeight: 1.1, letterSpacing: '-0.5px' }}>
              {project.name}
            </h1>
            {isOwner && (
              <button
                className="proj-edit-inline"
                onClick={() => {
                  const token = localStorage.getItem(`edit_token_${project.slug}`)
                  navigate(`/editar/${project.slug}${token ? `?token=${token}` : ''}`)
                }}
                title="Editar projeto"
                style={{
                  alignItems: 'center', justifyContent: 'center',
                  width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                  background: 'rgba(255,255,255,0.05)',
                  border: `1px solid ${colors.border}`,
                  color: colors.muted, cursor: 'pointer',
                  transition: 'all 0.15s', marginTop: 6,
                }}
              >
                <Pencil size={15} />
              </button>
            )}
          </div>

          {project.ai_tagline && (
            <p className="proj-tagline" style={{ fontSize: 18, color: colors.muted, lineHeight: 1.6, margin: '10px 0 16px', maxWidth: 580, fontWeight: 400 }}>
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
              <div style={{ height: 3, background: colors.border, borderRadius: 2, overflow: 'hidden', marginBottom: 5 }}>
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
          </div>
          </div>{/* end flex row */}
        </div>{/* end proj-hero */}

        {/* proj-body: everything after hero — ordered after sidebar on tablet/mobile */}
        <div className="proj-body">

        {/* Certificate banner — owner only, score >= 75 */}
        {isOwner && score >= 75 && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(79,70,229,0.12), rgba(27,120,247,0.08))',
            border: '1px solid rgba(79,70,229,0.3)',
            borderRadius: 16, padding: '18px 22px', marginBottom: 20,
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

        {/* AI Description */}
        {project.ai_description && (
          <div className="proj-card-pad" style={{
            background: 'linear-gradient(135deg, #0e1f3e 0%, #0a1729 100%)',
            border: '1px solid rgba(27,120,247,0.25)',
            borderRadius: 18, padding: '24px 28px', marginBottom: 24,
            boxShadow: '0 4px 24px rgba(27,120,247,0.08)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#818cf8', textTransform: 'uppercase', letterSpacing: 1.2 }}>Resumo gerado por IA</span>
              </div>
              <button
                onClick={handleRegenerate}
                disabled={regenerating || regenCooldown > 0}
                style={{
                  background: 'rgba(27,120,247,0.1)',
                  border: '1px solid rgba(27,120,247,0.2)',
                  color: '#60a5fa',
                  borderRadius: 8, padding: '6px 12px',
                  fontSize: 12, fontWeight: 600,
                  cursor: (regenerating || regenCooldown > 0) ? 'default' : 'pointer',
                  opacity: (regenerating || regenCooldown > 0) ? 0.55 : 1,
                  whiteSpace: 'nowrap',
                  fontFamily: 'inherit',
                }}
              >
                {regenerating ? 'A gerar...' : regenCooldown > 0 ? `${regenCooldown}s` : 'Regenerar'}
              </button>
            </div>
            <p style={{ margin: 0, fontSize: 16, lineHeight: 1.8, color: '#cbd5f0' }}>{project.ai_description}</p>
          </div>
        )}

        {/* Highlights — 3 column cards */}
        {highlights.length > 0 && (() => {
          const hero = TYPE_HERO[project.project_type] ?? TYPE_HERO.personal
          const HlIcons = [Zap, TrendingUp, Lightbulb]
          return (
            <div className="proj-highlights-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 24 }}>
              {highlights.map((h, i) => {
                const HlIcon = HlIcons[i] ?? Sparkles
                return (
                <div key={i} style={{
                  background: `linear-gradient(135deg, ${hero.c1}0d, ${hero.c2}07)`,
                  border: `1px solid ${hero.c1}30`,
                  borderRadius: 14, padding: '16px 18px',
                  display: 'flex', flexDirection: 'column', gap: 10,
                }}>
                  <HlIcon size={18} color={hero.c1} />
                  <p style={{ margin: 0, fontSize: 13, color: '#b8d4f0', lineHeight: 1.6 }}>{h}</p>
                </div>
                )
              })}
            </div>
          )
        })()}

        {/* PAP details */}
        {isPap && (project.pap_supervisor || project.pap_date) && (
          <div className="proj-card-pad" style={{ background: colors.yellowGlow, border: '1px solid rgba(234,179,8,0.18)', borderRadius: 16, padding: '20px 24px', marginBottom: 12 }}>
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

        {/* AI Analysis — compact trigger card (opens modal) */}
        {isOwner ? (
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(109,40,217,0.07), rgba(79,70,229,0.05))',
              border: '1px solid rgba(129,140,248,0.2)',
              borderRadius: 16, padding: '16px 20px',
              marginBottom: 16, marginTop: 8,
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
              color: aiFeedback ? '#34d399' : '#fff',
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
            borderRadius: 16, padding: '16px 20px', marginBottom: 16, marginTop: 8,
            display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
          }}>
            <Bot size={20} color="#818cf8" style={{ flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 200 }}>
              <p style={{ margin: '0 0 8px', fontSize: 13, color: '#c4b5fd', lineHeight: 1.55 }}>
                Cria o teu projeto e recebe análise por IA com feedback personalizado.
              </p>
              <button
                onClick={() => window.location.href = '/novo'}
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

        {/* Missions — owner only */}
        {isOwner && <div id="missions-section" style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 18, padding: '22px 24px', marginBottom: 16, marginTop: 8, boxShadow: '0 4px 24px rgba(0,0,0,0.2)', scrollMarginTop: 88 }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, gap: 12 }}>
            <div>
              <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 800, letterSpacing: '-0.2px' }}>Missões</h3>
              <p style={{ margin: 0, fontSize: 12, color: colors.muted }}>Completa missões para melhorar o score</p>
            </div>
            {/* XP card with progress bar inside */}
            <div style={{
              background: colors.bg, border: `1px solid ${colors.border}`,
              borderRadius: 12, padding: '12px 16px', minWidth: 110, flexShrink: 0,
            }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: colors.blue, letterSpacing: '-0.5px', marginBottom: 6 }}>
                {earnedXP}<span style={{ fontSize: 12, color: colors.subtle, fontWeight: 500 }}>/{totalXP} pts</span>
              </div>
              <div style={{ height: 4, background: colors.border, borderRadius: 99, overflow: 'hidden', marginBottom: 5 }}>
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

        {/* Share */}
        <div className="proj-card-pad" style={{
          background: colors.card,
          border: `1px solid ${colors.border}`,
          borderRadius: 18, padding: '32px 28px', marginTop: 32,
          boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
        }}>
          <div style={{ marginBottom: 24 }}>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, letterSpacing: '-0.2px' }}>{isOwner ? 'Partilha o teu projeto' : 'Partilha este projeto'}</h3>
          </div>
          <div style={{ display: 'flex', gap: 36, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <p style={{ color: colors.muted, fontSize: 13, margin: '0 0 10px', fontWeight: 500 }}>Link do projeto</p>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <div style={{ flex: 1, background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 8, padding: '10px 14px', fontSize: 13, color: colors.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {pageUrl}
                </div>
                <button
                  onClick={handleCopy}
                  style={{
                    background: copied ? `linear-gradient(135deg, ${colors.green}, #16a34a)` : `linear-gradient(135deg, ${colors.blue}, #4f46e5)`,
                    color: '#fff', border: 'none', borderRadius: 8,
                    padding: '10px 16px', fontSize: 13, fontWeight: 600,
                    cursor: 'pointer', whiteSpace: 'nowrap',
                    transition: 'background 0.3s',
                    fontFamily: 'inherit',
                    boxShadow: copied ? '0 4px 16px rgba(34,197,94,0.3)' : '0 4px 16px rgba(27,120,247,0.3)',
                  }}
                >
                  {copied ? <><Check size={13} style={{ verticalAlign: 'middle' }} /> Copiado!</> : 'Copiar link'}
                </button>
              </div>
              <button
                onClick={() => navigate('/novo')}
                style={{
                  background: 'transparent',
                  border: `1px solid ${colors.border}`,
                  color: colors.muted,
                  borderRadius: 8, padding: '10px 18px',
                  fontSize: 14, cursor: 'pointer', width: '100%',
                  fontFamily: 'inherit',
                  transition: 'border-color 0.2s',
                }}
              >
                Criar o meu projeto →
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
              <div style={{ background: '#fff', borderRadius: 14, padding: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.3)' }}>
                <QRCodeSVG value={pageUrl} size={120} />
              </div>
              <span style={{ color: colors.subtle, fontSize: 12, fontWeight: 500 }}>QR Code</span>
            </div>
          </div>
        </div>

        {/* Author — bottom of page, all devices */}
        {(project.creator_name || project.course || project.school_year || project.school) && (
          <div className="proj-card-pad" style={{
            background: colors.card, border: `1px solid ${colors.border}`,
            borderRadius: 18, padding: '20px 24px', marginTop: 8,
            display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
          }}>
            <div style={{
              width: 44, height: 44, flexShrink: 0,
              background: `linear-gradient(135deg, ${colors.blue}, #4f46e5)`,
              borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 17, fontWeight: 800, color: '#fff',
            }}>
              {project.creator_name ? project.creator_name[0].toUpperCase() : '?'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: colors.text, marginBottom: 3 }}>
                {project.creator_name || 'Autor'}
              </div>
              <div style={{ fontSize: 13, color: colors.muted }}>
                {[project.course, project.school_year, project.school].filter(Boolean).join(' · ')}
              </div>
            </div>
            {(project.linkedin_url || project.github_url || project.portfolio_url) && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flexShrink: 0 }}>
                {project.linkedin_url && (
                  <a href={project.linkedin_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(10,102,194,0.1)', border: '1px solid rgba(10,102,194,0.25)', color: '#60a5fa', borderRadius: 8, padding: '7px 14px', fontSize: 13, fontWeight: 600 }}>
                    <span style={{ fontWeight: 900, fontStyle: 'italic' }}>in</span> LinkedIn
                  </a>
                )}
                {project.github_url && (
                  <a href={project.github_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.04)', border: `1px solid ${colors.border}`, color: colors.text, borderRadius: 8, padding: '7px 14px', fontSize: 13, fontWeight: 600 }}>
                    GitHub
                  </a>
                )}
                {project.portfolio_url && (
                  <a href={project.portfolio_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.2)', color: '#c084fc', borderRadius: 8, padding: '7px 14px', fontSize: 13, fontWeight: 600 }}>
                    Portfólio
                  </a>
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
          {/* View count */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: colors.muted, fontSize: 13, fontWeight: 500 }}>
            <Eye size={15} color={colors.muted} />
            <span><strong style={{ color: colors.text }}>{project.views ?? 0}</strong> visualizaç{project.views === 1 ? 'ão' : 'ões'}</span>
          </div>

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
                              style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: 3, display: 'flex', alignItems: 'center', borderRadius: 4 }}
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
                    <textarea value={fbComment} onChange={e => setFbComment(e.target.value)} placeholder={`Feedback sobre ${FB_SECTION_LABELS[fbFieldKey]}…`} rows={3} style={{ width: '100%', background: '#0d1424', border: `1px solid ${colors.border}`, borderRadius: 8, padding: '9px 11px', color: colors.text, fontSize: 13, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box', outline: 'none' }} />
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

          {/* Profile completeness + tips — side-by-side grid on mobile */}
          <div className="proj-completude-grid">
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
              <div style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 16, padding: '20px 22px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: completudeOpen ? 14 : 0 }}>
                  <h3 style={{ margin: 0, fontSize: 11, fontWeight: 800, color: colors.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Completude</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: pct === 100 ? '#10b981' : pct > 60 ? colors.blue : colors.yellow }}>{pct}%</span>
                    <button
                      className="sidebar-section-toggle"
                      onClick={() => { const next = !completudeOpen; setCompletudeOpen(next); if (next) setTipsOpen(false) }}
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
                        {f.quality === 'good'  && <span style={{ fontSize: 11, color: '#10b981', fontWeight: 800 }}>✓</span>}
                        {f.quality === 'short' && <span style={{ fontSize: 10, color: colors.yellow, fontWeight: 700 }}>curto</span>}
                        {f.quality === 'empty' && <span style={{ fontSize: 11, color: colors.subtle }}>—</span>}
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 14, height: 4, background: colors.border, borderRadius: 99, overflow: 'hidden' }}>
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
                <CheckCircle size={24} color="#34d399" style={{ marginBottom: 6 }} />
                <p style={{ margin: 0, fontSize: 13, color: '#34d399', fontWeight: 700 }}>Perfil completo!</p>
              </div>
            )

            return (
              <div style={{ background: 'linear-gradient(135deg, rgba(27,120,247,0.07), rgba(79,70,229,0.04))', border: '1px solid rgba(27,120,247,0.18)', borderRadius: 16, padding: '18px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: tipsOpen ? 14 : 0 }}>
                  <h3 style={{ margin: 0, minWidth: 0, fontSize: 11, fontWeight: 800, color: '#5a9ff5', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 5, flex: 1, overflow: 'hidden' }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#5a9ff5" strokeWidth="2.5" style={{ flexShrink: 0 }}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Como aumentar o score</span>
                  </h3>
                  <button
                    className="sidebar-section-toggle"
                    onClick={() => { const next = !tipsOpen; setTipsOpen(next); if (next) setCompletudeOpen(false) }}
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
