import { useEffect, useState, useRef, useMemo, memo } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { QRCodeSVG } from 'qrcode.react'
import { supabase, supabaseUrl, supabaseAnonKey } from '../lib/supabase'
import { calculateScore, looksLikeSpam } from '../lib/score'
import { containsProfanity } from '../lib/profanity'
import { CHALLENGES, getChallengeStatus } from '../lib/challenges'
import { Navbar } from '../components/Navbar'
import { generateProject } from '../lib/generateProject'
import { generateReport } from '../lib/generateReport'
import { useAuth } from '../context/AuthContext'
import { useSidebar } from '../context/SidebarContext'
import { useTheme } from '../context/ThemeContext'
import CreateProjectModal from '../components/CreateProjectModal'
import DefenseMode from '../components/DefenseMode'
import ProjectComments from '../components/ProjectComments'
import { analyzeProject } from '../lib/analyzeProject'
import { Check, X, Loader, GraduationCap, Save, Sparkles, Bot, Lightbulb, Pencil, Search, Target, Wrench, Zap, TrendingUp, Briefcase, Users, Rocket, Trophy, BarChart2, CheckCircle, BookOpen, ChevronDown, Eye, EyeOff, UserPlus, Calendar, Mail, ArrowRight, ChevronRight, Globe, Image, MessageSquare, Quote, Layout, Type, Link, GripVertical, Plus, AlignLeft, Star, Camera, FileText, ClipboardList, Copy, Monitor, Tablet, Smartphone, Minus, Video, AlignCenter, AlignRight, Palette, AlertTriangle, Heart, User, Settings } from 'lucide-react'

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

// Area-based gradient for the hero background (when no cover image)
function getAreaGradient(area) {
  const a = (area || '').toLowerCase()
  if (a.includes('tecnolog') || a.includes('informátic') || a.includes('programaç') || a.includes('software') || a.includes('digital') || a.includes('eletrónic'))
    return { g1: '#0a1e3d', g2: '#0d2137', accent1: '#1b78f7', accent2: '#0ea5e9' }
  if (a.includes('comercial') || a.includes('marketing') || a.includes('vendas') || a.includes('gestão') || a.includes('negócio'))
    return { g1: '#1a0a3d', g2: '#200a4a', accent1: '#8b5cf6', accent2: '#6366f1' }
  if (a.includes('design') || a.includes('arte') || a.includes('visual') || a.includes('multimédia') || a.includes('gráfico'))
    return { g1: '#051a1f', g2: '#082030', accent1: '#0d9488', accent2: '#06b6d4' }
  if (a.includes('saúde') || a.includes('saude') || a.includes('farmác') || a.includes('medicina') || a.includes('bio'))
    return { g1: '#051a12', g2: '#062818', accent1: '#10b981', accent2: '#22c55e' }
  if (a.includes('construção') || a.includes('civil') || a.includes('arquitet'))
    return { g1: '#1a1005', g2: '#231500', accent1: '#f59e0b', accent2: '#f97316' }
  // default: deep slate to dark blue
  return { g1: '#0c1528', g2: '#0d1e38', accent1: '#1b78f7', accent2: '#4f46e5' }
}

function getLevelInfo(score) {
  if (score >= 86) return { label: 'Nível profissional', color: '#22c55e' }
  if (score >= 71) return { label: 'Quase profissional', color: '#8b5cf6' }
  if (score >= 51) return { label: 'A ganhar forma', color: '#3b82f6' }
  if (score >= 31) return { label: 'A começar', color: '#f59e0b' }
  return { label: 'Rascunho', color: '#ef4444' }
}

const ScoreRing = memo(function ScoreRing({ score, size = 108 }) {
  const stroke = size <= 80 ? 6 : 8
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const dash = (score / 100) * circ
  const dasharray = `${dash} ${circ - dash}`
  const { color } = getLevelInfo(score)

  return (
    <div style={{ position: 'relative', width: size, height: size, filter: `drop-shadow(0 0 6px ${color}80)` }}>
      {/* Outer glow ring */}
      <div style={{
        position: 'absolute', inset: -6, borderRadius: '50%',
        background: `radial-gradient(circle, ${color}18 0%, transparent 70%)`,
        pointerEvents: 'none',
        filter: 'none',
      }} />
      <svg width={size} height={size} overflow="visible" style={{ transform: 'rotate(-90deg)', display: 'block', position: 'relative', zIndex: 1 }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={colors.border} strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={stroke}
          strokeDasharray={dasharray} strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.6s ease-out, stroke 0.4s' }}
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
})

const SECTION_CLAMP_LINES = 8  // max lines before "ver mais"
const APPROX_CHARS_PER_LINE = 70

const Section = memo(function Section({ fieldKey, content, isOwner, onImprove }) {
  const meta    = SECTION_META[fieldKey] ?? { Icon: Wrench, label: fieldKey }
  const fieldCfg = PROFILE_SCORE_FIELDS.find(f => f.key === fieldKey)
  const len     = (content || '').trim().length
  const isEmpty = len === 0
  const isShort = len > 0 && len < (fieldCfg?.minLen ?? QUALITY_MIN)
  const challenge = CHALLENGES.find(c => c.field === fieldKey)
  const isTruncatable = len > SECTION_CLAMP_LINES * APPROX_CHARS_PER_LINE
  const [expanded, setExpanded] = useState(false)

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
        {isOwner && challenge && !isEmpty && (
          <button
            onClick={() => onImprove(challenge)}
            style={{ background: `${colors.blue}10`, border: `1px solid ${colors.blue}22`, color: colors.blue, cursor: 'pointer', fontSize: 11, fontWeight: 700, fontFamily: 'inherit', padding: '3px 9px', borderRadius: 6, flexShrink: 0, transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.background = `${colors.blue}1e`; e.currentTarget.style.borderColor = `${colors.blue}44` }}
            onMouseLeave={e => { e.currentTarget.style.background = `${colors.blue}10`; e.currentTarget.style.borderColor = `${colors.blue}22` }}
          >
            <span style={{display:'flex',alignItems:'center',gap:4}}>Editar <ChevronRight size={12} /></span>
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
                style={{ background: `${colors.blue}10`, border: `1px solid ${colors.blue}22`, color: colors.blue, borderRadius: 6, padding: '3px 9px', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0, transition: 'all 0.15s' }}
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
          <div style={{ position: 'relative' }}>
            <p style={{
              margin: 0, color: isShort ? '#afc3dc' : colors.text,
              fontSize: 15, lineHeight: 1.75,
              whiteSpace: 'pre-wrap', overflowWrap: 'break-word', wordBreak: 'break-word',
              ...(isTruncatable && !expanded ? {
                display: '-webkit-box',
                WebkitLineClamp: SECTION_CLAMP_LINES,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              } : {}),
            }}>{content}</p>
            {isTruncatable && !expanded && (
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                height: 48,
                background: `linear-gradient(to bottom, transparent, ${colors.card})`,
                pointerEvents: 'none',
              }} />
            )}
          </div>
          {isTruncatable && (
            <button
              onClick={() => setExpanded(e => !e)}
              style={{
                marginTop: 8, background: 'none', border: 'none',
                color: colors.blue, fontSize: 12, fontWeight: 700,
                cursor: 'pointer', padding: 0, fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', gap: 4,
              }}
            >
              {expanded ? 'Ver menos' : 'Ver mais'}
            </button>
          )}
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
})

const MissionRow = memo(function MissionRow({ challenge, project, onImprove, isOwner }) {
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
        background: isCompleted ? 'rgba(34,197,94,0.1)' : 'var(--c-bg-alt)',
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
            color: colors.blue, borderRadius: 8, padding: '5px 12px',
            fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
          }}
        >
          <span style={{display:'flex',alignItems:'center',gap:4}}>Fazer <ChevronRight size={12} /></span>
        </button>
      )}
    </div>
  )
})

function EditModal({ challenge, project, onClose, onSave, saving }) {
  const [value, setValue] = useState(String(project[challenge.field] || ''))
  const len = value.trim().length
  const isComplete = len >= challenge.threshold
  const isSpam = looksLikeSpam(value) || containsProfanity(value)
  const spamMsg = containsProfanity(value)
    ? 'Linguagem inapropriada. A Showo é uma plataforma para estudantes — mantém o conteúdo respeitoso.'
    : 'Texto inválido — escreve conteúdo real.'
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
        borderRadius: 14,
        padding: '28px 32px',
        width: '100%', maxWidth: 560,
        boxShadow: 'none',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 42, height: 42, borderRadius: 10,
              background: 'var(--c-card-hover)',
              border: `1px solid ${colors.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: colors.muted,
            }}>
              <ChalIcon size={22} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 400, fontFamily: 'var(--font-heading)', letterSpacing: '-0.01em', color: colors.text }}>{challenge.fieldLabel}</h2>
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
            border: `1.5px solid ${isSpam ? '#ef4444' : isComplete ? colors.green : colors.border}`,
            borderRadius: 10, padding: '12px 14px',
            color: colors.text, fontSize: 15, lineHeight: 1.65,
            resize: 'vertical', fontFamily: 'var(--font-body)',
            boxSizing: 'border-box', outline: 'none',
            transition: 'border-color 0.2s',
          }}
          placeholder={`Escreve sobre ${challenge.fieldLabel.toLowerCase()}...`}
        />
        {isSpam && (
          <p style={{ margin: '6px 0 0', fontSize: 12, color: '#ef4444', display: 'flex', alignItems: 'center', gap: 5 }}>
            <AlertTriangle size={12} /> {spamMsg}
          </p>
        )}
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
          disabled={saving || isSpam}
          style={{
            width: '100%',
            background: isSpam
              ? colors.border
              : isComplete
                ? colors.green
                : colors.blue,
            color: isSpam ? colors.muted : '#fff',
            border: 'none', borderRadius: 10,
            padding: '14px 0', fontSize: 16, fontWeight: 700,
            cursor: saving || isSpam ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.75 : 1,
            transition: 'background 0.2s',
            fontFamily: 'inherit',
            boxShadow: isSpam ? 'none' : isComplete ? '0 2px 8px rgba(34,197,94,0.2)' : '0 2px 8px rgba(27,120,247,0.2)',
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
      background: 'var(--c-card)',
      border: `1px solid ${colors.borderBright}`,
      borderRadius: 10, padding: '14px 28px',
      color: 'var(--c-text)', fontSize: 15, fontWeight: 600,
      zIndex: 2000,
      transition: 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s',
      whiteSpace: 'nowrap',
      boxShadow: 'none',
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

// ── Block types for preview workspace ─────────────────────────────────────────
const BLOCK_TYPES = [
  { type: 'note',    label: 'Nota',          Icon: AlignLeft,  desc: 'Mensagem tua para visitantes' },
  { type: 'heading', label: 'Título',        Icon: Type,       desc: 'Título de secção personalizado' },
  { type: 'callout', label: 'Destaque',      Icon: Sparkles,   desc: 'Caixa em destaque colorida' },
  { type: 'quote',   label: 'Citação',       Icon: Quote,      desc: 'Frase ou citação marcante' },
  { type: 'metric',  label: 'Métrica',       Icon: Star,       desc: 'Número ou dado relevante' },
  { type: 'stats',   label: 'Estatísticas',  Icon: BarChart2,  desc: '3 métricas lado a lado' },
  { type: 'image',   label: 'Imagem',        Icon: Image,      desc: 'Imagem por URL ou upload' },
  { type: 'gallery', label: 'Galeria',       Icon: Layout,     desc: 'Até 3 imagens lado a lado' },
  { type: 'video',   label: 'Vídeo',         Icon: Video,      desc: 'YouTube ou Vimeo embed' },
  { type: 'card',    label: 'Card',          Icon: ClipboardList, desc: 'Cartão livre — título + dados (ex: idade, função...)' },
  { type: 'cta',     label: 'Botão CTA',     Icon: ArrowRight, desc: 'Chamada à ação destacada' },
  { type: 'link',    label: 'Link',          Icon: Link,       desc: 'GitHub, demo, portfolio...' },
  { type: 'divider', label: 'Divisor',       Icon: Minus,      desc: 'Linha separadora de secções' },
]

function newBlock(type, posIndex = 0) {
  return {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2),
    type, content: '', imageUrl: '', imageUrl2: '', imageUrl3: '',
    label: '', url: '', color: '', align: 'left', width: 'full',
    videoUrl: '',
    stat1Value: '', stat1Label: '',
    stat2Value: '', stat2Label: '',
    stat3Value: '', stat3Label: '',
    dividerStyle: 'solid',
    cardTitle: '',
    cardRows: [{ label: '', value: '' }, { label: '', value: '' }],
    // Position in the freeform canvas (% of canvas width/height) — staggered
    // so newly-added blocks don't all stack on top of each other at 0,0.
    pos: { x: 8 + (posIndex % 4) * 6, y: 8 + (posIndex % 5) * 10 },
  }
}

const BLOCK_ACCENT_COLORS = [
  { label: 'Azul',    value: '#1b78f7' },
  { label: 'Verde',   value: '#22c55e' },
  { label: 'Roxo',    value: '#a78bfa' },
  { label: 'Laranja', value: '#f97316' },
  { label: 'Rosa',    value: '#ec4899' },
  { label: 'Cinza',   value: '#6b7280' },
]

// ── Preview style options ──────────────────────────────────────────────────────
const FONT_OPTIONS = [
  { key: 'default',  label: 'Montserrat', css: 'Montserrat, sans-serif',    sample: 'Aa' },
  { key: 'inter',    label: 'Inter',      css: 'Inter, sans-serif',          sample: 'Aa' },
  { key: 'syne',     label: 'Syne',       css: 'Syne, sans-serif',           sample: 'Aa' },
  { key: 'fredoka',  label: 'Fredoka',    css: '"Fredoka One", cursive',     sample: 'Aa' },
  { key: 'mono',     label: 'Mono',       css: '"Courier New", monospace',   sample: 'Aa' },
  { key: 'serif',    label: 'Serif',      css: 'Georgia, serif',             sample: 'Aa' },
]

const TITLE_FONT_OPTIONS = [
  { key: 'croogla',  label: 'Croogla',  css: 'Croogla, sans-serif',                    sample: 'Aw' },
  { key: 'syne',     label: 'Syne',     css: 'Syne, sans-serif',                        sample: 'Aw' },
  { key: 'playfair', label: 'Playfair', css: '"Playfair Display", serif',               sample: 'Aw' },
  { key: 'space',    label: 'Space',    css: '"Space Grotesk", sans-serif',              sample: 'Aw' },
  { key: 'fredoka',  label: 'Fredoka',  css: '"Fredoka One", cursive',                  sample: 'Aw' },
  { key: 'inter',    label: 'Inter',    css: 'Inter, sans-serif',                        sample: 'Aw' },
]

const TITLE_STYLE_OPTIONS = [
  { key: 'normal',   label: 'Normal'    },
  { key: 'caps',     label: 'CAPS'      },
  { key: 'gradient', label: 'Gradiente' },
]

const BG_OPTIONS = [
  { key: 'default',  label: 'Padrão',   bg: null,      preview: '#060c18',
    previewGradient: 'linear-gradient(135deg, #060c18 0%, #111c32 100%)' },
  { key: 'midnight', label: 'Midnight', bg: '#030508', preview: '#030508',
    previewGradient: 'linear-gradient(135deg, #030508 0%, #0a0a12 100%)' },
  { key: 'navy',     label: 'Navy',
    bg: 'radial-gradient(ellipse at 25% 60%, #0c1e38 0%, #060d1a 100%)',
    preview: '#0c1e38', previewGradient: 'linear-gradient(135deg, #0c1e38 0%, #060d1a 100%)' },
  { key: 'cosmic',   label: 'Cosmic',
    bg: 'radial-gradient(ellipse at 75% 25%, #160b2a 0%, #08031a 100%)',
    preview: '#160b2a', previewGradient: 'linear-gradient(135deg, #160b2a 0%, #08031a 100%)' },
  { key: 'forest',   label: 'Floresta',
    bg: 'radial-gradient(ellipse at 50% 0%, #081408 0%, #04090a 100%)',
    preview: '#081408', previewGradient: 'linear-gradient(135deg, #0a1a0a 0%, #04090a 100%)' },
  { key: 'warm',     label: 'Quente',   bg: '#140c02', preview: '#140c02',
    previewGradient: 'linear-gradient(135deg, #1e1004 0%, #0e0702 100%)' },
  { key: 'slate',    label: 'Ardósia',  bg: '#0c1018', preview: '#0c1018',
    previewGradient: 'linear-gradient(135deg, #0c1018 0%, #070b10 100%)' },
  { key: 'paper',    label: 'Papel',    bg: '#f5f0e8', preview: '#f5f0e8', isLight: true,
    previewGradient: 'linear-gradient(135deg, #f5f0e8 0%, #ece5d8 100%)' },
  { key: 'chalk',    label: 'Cinza',    bg: '#eff0f2', preview: '#eff0f2', isLight: true,
    previewGradient: 'linear-gradient(135deg, #eff0f2 0%, #e2e4e9 100%)' },
]

function getVideoEmbedUrl(url) {
  if (!url) return null
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/)
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`
  const vm = url.match(/vimeo\.com\/(\d+)/)
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`
  if (url.includes('/embed/')) return url
  return null
}

// ── Drag-and-drop block reorder hook ──────────────────────────────────────────
function useDragBlocks(blocks, setBlocks) {
  const dragIdx = useRef(null)
  const dragOver = useRef(null)

  function onDragStart(i) { dragIdx.current = i }
  function onDragEnter(i) { dragOver.current = i }
  function onDragEnd() {
    if (dragIdx.current === null || dragOver.current === null || dragIdx.current === dragOver.current) {
      dragIdx.current = null; dragOver.current = null; return
    }
    setBlocks(bs => {
      const arr = [...bs]
      const [moved] = arr.splice(dragIdx.current, 1)
      arr.splice(dragOver.current, 0, moved)
      dragIdx.current = null; dragOver.current = null
      return arr
    })
  }
  return { onDragStart, onDragEnter, onDragEnd }
}

// ── Free-position drag for canvas mode — pointer-based, updates block.pos
// (% of the canvas box) on move, commits to previewBlocks on release. ──
function useCanvasDrag(canvasRef, setPreviewBlocks) {
  const draggingId = useRef(null)
  const offset = useRef({ x: 0, y: 0 })

  function onPointerDown(e, block) {
    const canvas = canvasRef.current
    if (!canvas) return
    e.preventDefault()
    draggingId.current = block.id
    const rect = canvas.getBoundingClientRect()
    const curX = (block.pos?.x ?? 8) / 100 * rect.width
    const curY = (block.pos?.y ?? 8) / 100 * rect.height
    offset.current = { x: e.clientX - rect.left - curX, y: e.clientY - rect.top - curY }
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
  }

  function onPointerMove(e) {
    const canvas = canvasRef.current
    if (!canvas || draggingId.current === null) return
    const rect = canvas.getBoundingClientRect()
    let x = (e.clientX - rect.left - offset.current.x) / rect.width * 100
    let y = (e.clientY - rect.top - offset.current.y) / rect.height * 100
    x = Math.max(0, Math.min(92, x))
    y = Math.max(0, Math.min(92, y))
    setPreviewBlocks(bs => bs.map(b => b.id === draggingId.current ? { ...b, pos: { x, y } } : b))
  }

  function onPointerUp() {
    draggingId.current = null
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', onPointerUp)
  }

  return { onPointerDown }
}

// ── Public visitor view ────────────────────────────────────────────────────────
const wsInput = {
  width: '100%', boxSizing: 'border-box',
  background: 'var(--c-card)', border: '1px solid var(--c-border)',
  borderRadius: 7, padding: '7px 9px',
  fontSize: 12, color: 'var(--c-text)', outline: 'none', fontFamily: 'inherit',
  display: 'block', marginBottom: 0,
}

// ── Workspace panel design tokens ─────────────────────────────────────────────
const wsGroup = {
  background: 'var(--c-bg-alt)',
  border: '1px solid var(--c-border)',
  borderRadius: 12, padding: '13px 14px',
}
const wsGroupLabel = {
  fontSize: 10, fontWeight: 700,
  color: 'var(--c-subtle)',
  textTransform: 'uppercase', letterSpacing: '0.1em',
  marginBottom: 11,
}
const wsControlLabel = {
  fontSize: 11, fontWeight: 600,
  color: 'var(--c-muted)', marginBottom: 6,
}
const wsInputNew = {
  width: '100%', boxSizing: 'border-box',
  background: 'var(--c-bg)', border: '1px solid var(--c-border)',
  borderRadius: 8, padding: '8px 11px',
  color: 'var(--c-text)', fontSize: 12,
  fontFamily: 'inherit', outline: 'none',
  transition: 'border-color 0.2s',
}

function PublicView({ project, ownerProfile, isOwner, onExitPreview, previewBlocks, setPreviewBlocks, previewStyle, setPreviewStyle, previewEditing, setPreviewEditing,
  liked, likeCount, likeLoading, onLike,
  hasInterest, interestCount, interestLoading, onInterest,
  isRecruiterRole,
  wsExpanded, setWsExpanded,
  onCoverChange,
  previewDevice, setPreviewDevice,
}) {
  const navigate = useNavigate()
  const { theme } = useTheme()

  // Hooks must be at top level — never inside conditionals or IIFEs
  const dragIdx    = useRef(null)
  const dragOver   = useRef(null)
  const [dragOverIdx, setDragOverIdx] = useState(null)
  const sectionDragRef = useRef(null)
  const [dragOverSectionIdx, setDragOverSectionIdx] = useState(null)
  const [mediaEditKey, setMediaEditKey] = useState(null)
  const canvasRef = useRef(null)
  const { onPointerDown: onCanvasPointerDown } = useCanvasDrag(canvasRef, setPreviewBlocks)

  function uploadSectionMedia(sectionKey) {
    const input = document.createElement('input')
    input.type = 'file'; input.accept = 'image/*'
    input.onchange = async (e) => {
      const file = e.target.files[0]; if (!file) return
      const ext = file.name.split('.').pop()
      const path = `sections/${project.id}/${sectionKey}_${Date.now()}.${ext}`
      const { data, error } = await supabase.storage.from('project-images').upload(path, file, { upsert: true })
      if (!error && data) {
        const { data: { publicUrl } } = supabase.storage.from('project-images').getPublicUrl(path)
        setPreviewStyle(ps => ({
          ...ps,
          sectionMedia: { ...(ps.sectionMedia || {}), [sectionKey]: { ...(ps.sectionMedia?.[sectionKey] || {}), type: 'image', url: publicUrl } },
        }))
      }
    }
    input.click()
  }
  const [previewTab, setPreviewTab] = useState('estilo')  // 'estilo' | 'blocos' | 'seccoes'
  const [previewSaved, setPreviewSaved] = useState(false)
  const [previewSaveError, setPreviewSaveError] = useState(false)
  const bannerRef = useRef(null)
  const [bannerH, setBannerH] = useState(44)
  const [isDesktop, setIsDesktop] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 760)

  // Keep isDesktop reactive — panel stays open but switches sidebar ↔ bottom-sheet
  useEffect(() => {
    function onResize() { setIsDesktop(window.innerWidth >= 760) }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Measure banner height so the workspace panel always aligns flush below it
  useEffect(() => {
    if (!bannerRef.current) return
    const obs = new ResizeObserver(([e]) => setBannerH(Math.round(e.contentRect.height) + 1))
    obs.observe(bannerRef.current)
    return () => obs.disconnect()
  }, [])

  function onDragStart(i) { dragIdx.current = i }
  function onDragEnter(i) { dragOver.current = i; setDragOverIdx(i) }
  function onDragEnd() {
    setDragOverIdx(null)
    if (dragIdx.current === null || dragOver.current === null || dragIdx.current === dragOver.current) {
      dragIdx.current = null; dragOver.current = null; return
    }
    const from = dragIdx.current
    const to   = dragOver.current
    dragIdx.current = null; dragOver.current = null
    setPreviewBlocks(bs => {
      const arr = [...bs]
      const [moved] = arr.splice(from, 1)
      arr.splice(to, 0, moved)
      return arr
    })
  }

  function uploadImage(blockId, field) {
    const input = document.createElement('input')
    input.type = 'file'; input.accept = 'image/*'
    input.onchange = async (e) => {
      const file = e.target.files[0]; if (!file) return
      const ext = file.name.split('.').pop()
      const path = `preview/${project.id}/${blockId}_${field}_${Date.now()}.${ext}`
      const { data, error } = await supabase.storage.from('project-images').upload(path, file, { upsert: true })
      if (!error && data) {
        const { data: { publicUrl } } = supabase.storage.from('project-images').getPublicUrl(path)
        setPreviewBlocks(bs => bs.map(b => b.id === blockId ? { ...b, [field]: publicUrl } : b))
      }
    }
    input.click()
  }

  function upd(blockId, field, val) {
    setPreviewBlocks(bs => bs.map(b => b.id === blockId ? { ...b, [field]: val } : b))
  }

  const tech = (project.technologies || '')
    .split(/[,\n•\-]+/).map(t => t.trim()).filter(t => t.length > 0 && t.length < 40)

  const features = (project.features || '')
    .split(/\n/).map(f => f.trim().replace(/^[-•*]\s*/, '')).filter(f => f.length > 1)

  const displayName = ownerProfile?.full_name || ownerProfile?.username || project.creator_name || null
  const avatarUrl   = ownerProfile?.avatar_url || null
  const course      = project.course || ownerProfile?.course || null
  const school      = project.school || ownerProfile?.school || null

  const TYPE_HERO_PUBLIC = {
    pap:       { c1: '#1e40af', c2: '#7c3aed' },
    internship:{ c1: '#065f46', c2: '#0369a1' },
    group:     { c1: '#7c2d12', c2: '#701a75' },
    personal:  { c1: '#1e3a5f', c2: '#312e81' },
    competition:{ c1: '#713f12', c2: '#831843' },
  }

  // Accent palettes — each swatch maps to a gradient pair
  const ACCENT_PALETTES = [
    { key: 'default', label: 'Padrão',   swatch: null,      c1: null,       c2: null       },
    { key: 'blue',    label: 'Azul',     swatch: '#1b78f7', c1: '#1e40af',  c2: '#4f46e5'  },
    { key: 'purple',  label: 'Roxo',     swatch: '#7c3aed', c1: '#4c1d95',  c2: '#831843'  },
    { key: 'teal',    label: 'Teal',     swatch: '#0d9488', c1: '#065f46',  c2: '#0369a1'  },
    { key: 'crimson', label: 'Carmim',   swatch: '#dc2626', c1: '#7f1d1d',  c2: '#92400e'  },
    { key: 'amber',   label: 'Âmbar',   swatch: '#d97706', c1: '#78350f',  c2: '#6d28d9'  },
    { key: 'pink',    label: 'Rosa',     swatch: '#db2777', c1: '#831843',  c2: '#701a75'  },
    { key: 'green',   label: 'Verde',    swatch: '#16a34a', c1: '#14532d',  c2: '#164e63'  },
    { key: 'slate',   label: 'Pizarra',  swatch: '#475569', c1: '#1e293b',  c2: '#0f172a'  },
  ]

  const HERO_SIZES = [
    { key: 'default', label: 'Normal',    height: 280 },
    { key: 'compact', label: 'Compacto',  height: 180 },
    { key: 'full',    label: 'Impactante', height: 400 },
  ]

  const selectedPalette = ACCENT_PALETTES.find(p => p.key === previewStyle.accent) || ACCENT_PALETTES[0]
  const typeHero = TYPE_HERO_PUBLIC[project.project_type] ?? TYPE_HERO_PUBLIC.personal
  const hero = selectedPalette.c1
    ? { c1: selectedPalette.c1, c2: selectedPalette.c2 }
    : typeHero

  const heroHeight        = (HERO_SIZES.find(s => s.key === previewStyle.heroSize) || HERO_SIZES[0]).height
  const selectedFont      = FONT_OPTIONS.find(f => f.key === (previewStyle.font || 'default')) || FONT_OPTIONS[0]
  const selectedTitleFont = TITLE_FONT_OPTIONS.find(f => f.key === (previewStyle.titleFont || 'croogla')) || TITLE_FONT_OPTIONS[0]
  const titleStyle        = previewStyle.titleStyle || 'normal'
  const selectedBg        = BG_OPTIONS.find(b => b.key === (previewStyle.bg || 'default')) || BG_OPTIONS[0]
  const resolvedBg        = selectedBg.bg || 'var(--c-bg)'
  // pvTheme: force dark/light CSS vars inside preview regardless of app theme
  const pvTheme           = selectedBg.isLight ? 'light' : selectedBg.key !== 'default' ? 'dark' : null
  const titleAlign        = previewStyle.titleAlign || 'left'
  const coverAsHero       = !!(previewStyle.coverAsHero && project.cover_url)
  const customTagline     = previewStyle.customTagline || ''
  const cardStyleVal      = previewStyle.cardStyle || 'border'
  const hiddenSections = new Set(previewStyle.hiddenSections || [])
  const DEFAULT_SECTION_ORDER = ['problem','solution','target_audience','features','technologies','challenges','results','learnings','pap_supervisor']
  const orderedSections = previewStyle.sectionOrder?.length ? previewStyle.sectionOrder : DEFAULT_SECTION_ORDER
  const sectionMedia = previewStyle.sectionMedia || {}

  // Pairs a section card with an optional image/video on the side (set via the
  // Secções tab) — falls back to the plain full-width card when no media is set.
  function withSectionMedia(key, card) {
    const media = sectionMedia[key]
    if (!media || !media.url) return card
    const embedUrl = media.type === 'video' ? getVideoEmbedUrl(media.url) : null
    const side = media.side === 'left' ? 'row-reverse' : 'row'
    return (
      <div key={key} style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'stretch', flexDirection: side }}>
        <div style={{ flex: '1 1 280px', minWidth: 0 }}>{card}</div>
        <div style={{ flex: '1 1 220px', maxWidth: '100%', width: 'min(100%, 320px)', borderRadius: 14, overflow: 'hidden', background: 'var(--c-card)', border: '1px solid var(--c-border)' }}>
          {embedUrl ? (
            <iframe src={embedUrl} title="" style={{ width: '100%', height: '100%', minHeight: 200, border: 'none', display: 'block' }} allowFullScreen />
          ) : (
            <img src={media.url} alt="" style={{ width: '100%', height: '100%', minHeight: 200, objectFit: 'cover', display: 'block' }} />
          )}
        </div>
      </div>
    )
  }

  const DEVICES = [
    { id: 'desktop',  Icon: Monitor,    label: 'Desktop',   title: 'Vista desktop' },
    { id: 'tablet',   Icon: Tablet,     label: 'Tablet',    title: 'Vista tablet (768px)' },
    { id: 'mobile',   Icon: Smartphone, label: 'Mobile',    title: 'Vista mobile (390px)' },
  ]
  const deviceMaxWidth = previewDevice === 'mobile' ? 390 : previewDevice === 'tablet' ? 768 : undefined

  return (
    <div className="pv-outer" style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column' }}>

      {/* ── Card style + preview theme scoped CSS ── */}
      <style>{`
        /* Card style applies to BOTH owner-view cards AND preview section cards */
        [data-pv-cs="flat"] .proj-card,
        [data-pv-cs="flat"] .pv-section-card {
          background: transparent !important;
          border-color: transparent !important;
          box-shadow: none !important;
          border-left-color: transparent !important;
        }
        [data-pv-cs="glass"] .proj-card,
        [data-pv-cs="glass"] .pv-section-card {
          background: rgba(255,255,255,0.05) !important;
          backdrop-filter: blur(16px) !important;
          -webkit-backdrop-filter: blur(16px) !important;
          border: 1px solid rgba(255,255,255,0.09) !important;
        }
        [data-pv-theme="dark"] {
          --c-bg:#060c18; --c-bg-alt:#111c32; --c-card:#152030; --c-card-hover:#1c2d44;
          --c-border:#1e3050; --c-border-bright:#2a4275; --c-muted:#7d93b0;
          --c-text:#e8f2ff; --c-subtle:#3d5270; --c-input-bg:#060c18;
        }
        [data-pv-theme="light"] {
          --c-bg:#f5f0e8; --c-bg-alt:#ede6d8; --c-card:#faf7f2; --c-card-hover:#f0ebe1;
          --c-border:#d8d0c4; --c-border-bright:#bdb4a6; --c-muted:#6b6158;
          --c-text:#1c1714; --c-subtle:#8c8278; --c-input-bg:#e8e1d6;
        }
        @keyframes pv-slidein {
          from { transform: translateX(20px); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        @keyframes pv-slidein-up {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        /* Desktop: right sidebar */
        /* Desktop: preview começa após a sidebar (z-index 100) — segue a sidebar quando comprimida */
        @media (min-width: 861px) {
          .pv-outer { left: 232px !important; transition: left 0.22s cubic-bezier(0.4,0,0.2,1); }
          body.sidebar-collapsed .pv-outer { left: 64px !important; }
        }
        /* Tablet: top-nav visível (62px) — container e painel começam abaixo */
        @media (min-width: 601px) and (max-width: 860px) {
          .pv-outer { top: 62px !important; }
          .pv-workspace { top: calc(62px + 44px) !important; }
        }
        .pv-workspace { animation: pv-slidein 0.2s cubic-bezier(0.22,1,0.36,1); }
        /* Mobile: bottom sheet — acima da bottom nav (62px) */
        .pv-ws-sheet {
          position: fixed !important;
          left: 0 !important; right: 0 !important;
          bottom: 62px !important; top: auto !important;
          width: 100% !important;
          height: auto !important;
          max-height: 48vh !important;
          border-radius: 18px 18px 0 0 !important;
          border-left: none !important;
          border-top: 1px solid var(--c-border) !important;
          box-shadow: none !important;
          animation: pv-slidein-up 0.26s cubic-bezier(0.22,1,0.36,1) !important;
          z-index: 510 !important;
          transition: max-height 0.26s cubic-bezier(0.22,1,0.36,1) !important;
          overflow: hidden !important;
        }
        .pv-ws-sheet.ws-collapsed {
          max-height: 0 !important;
          border-top: none !important;
        }
        /* Overlay behind bottom sheet */
        .pv-ws-overlay {
          position: fixed; inset: 0; z-index: 499;
          background: rgba(0,0,0,0.45);
          backdrop-filter: blur(2px);
          -webkit-backdrop-filter: blur(2px);
        }
        /* Drag handle */
        .pv-ws-drag-handle {
          width: 40px; height: 4px; border-radius: 99px;
          background: var(--c-border-bright);
          margin: 10px auto 0;
          flex-shrink: 0;
        }
        .pv-workspace input:focus,
        .pv-workspace textarea:focus {
          border-color: rgba(27,120,247,0.55) !important;
          box-shadow: 0 0 0 3px rgba(27,120,247,0.1);
          outline: none;
        }
        .pv-banner-btn:hover { opacity: 0.85; }
        .pv-device-btn { transition: all 0.15s; }
        .pv-device-btn:hover { opacity: 0.8; }

        /* ── Mobile: banner ── */
        @media (max-width: 600px) {
          .pv-banner-inner { flex-wrap: wrap; gap: 6px !important; padding: 8px 12px !important; }
          .pv-banner-label { display: none; }
          .pv-device-toggles { display: none !important; }
          .pv-banner-sep { display: none !important; }
        }
        /* ── Mobile: content ── */
        @media (max-width: 600px) {
          .pv-story { padding: 0 14px 80px !important; gap: 20px !important; }
          .pv-hero-title { font-size: clamp(24px, 7vw, 40px) !important; letter-spacing: -0.5px !important; line-height: 1.1 !important; }
          .pv-section-card { padding: 16px 16px !important; border-radius: 12px !important; }
          /* Title block — reduce horizontal padding on mobile */
          .pv-title-block { padding: 0 16px !important; }
          /* Creator pill — smaller on mobile */
          .pv-creator-pill { font-size: 12px !important; padding: 5px 12px !important; }
        }
      `}</style>

      {/* ── Owner preview banner — desktop moves these controls into the sidebar's
          "Gerir projeto" section instead (no room for a floating top bar there
          since the sidebar now stays visible during preview/edit). Mobile/tablet
          has no sidebar, so it keeps this bar. ── */}
      {isOwner && !isDesktop && (
        <div ref={bannerRef} className="pv-banner-inner" style={{
          flexShrink: 0, zIndex: 300,
          background: theme === 'light' ? 'rgba(248,250,252,0.97)' : 'rgba(6,12,24,0.97)',
          backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
          borderBottom: theme === 'light' ? '1px solid rgba(0,0,0,0.09)' : '1px solid rgba(27,120,247,0.18)',
          padding: '7px 16px',
          display: 'flex', alignItems: 'center', gap: 8, minHeight: 44,
        }}>
          <Globe size={13} color={colors.blue} style={{ flexShrink: 0 }} />
          <span className="pv-banner-label" style={{ fontSize: 12, color: 'var(--c-muted)', fontWeight: 600, letterSpacing: '-0.1px' }}>
            Preview do visitante
          </span>

          {/* Separator */}
          <div className="pv-banner-sep" style={{ width: 1, height: 18, background: 'var(--c-border)', flexShrink: 0, marginLeft: 4, marginRight: 4 }} />

          {/* Device size toggles — pill azul + texto branco */}
          <div className="pv-device-toggles" style={{ display: 'flex', alignItems: 'center', gap: 2, background: 'var(--c-bg-alt)', border: '1px solid var(--c-border)', borderRadius: 9, padding: '3px' }}>
            {DEVICES.map(({ id, Icon, label, title }) => {
              const isAct = previewDevice === id
              return (
                <button
                  key={id}
                  title={title}
                  onClick={() => setPreviewDevice(id)}
                  className="pv-device-btn"
                  style={{
                    background: isAct ? '#1b78f7' : 'transparent',
                    border: 'none',
                    borderRadius: 7,
                    height: 28,
                    padding: isAct ? '0 10px' : '0',
                    minWidth: 28,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                    cursor: 'pointer',
                    color: isAct ? '#fff' : 'var(--c-muted)',
                    transition: 'all 0.15s',
                    boxShadow: isAct ? '0 2px 8px rgba(27,120,247,0.3)' : 'none',
                  }}
                >
                  <Icon size={13} strokeWidth={isAct ? 2.2 : 1.8} />
                  {isAct && <span style={{ fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>{label}</span>}
                </button>
              )
            })}
          </div>

          <div style={{ flex: 1 }} />

          {!previewEditing && (
            <button
              onClick={() => setPreviewEditing(true)}
              style={{
                background: 'transparent',
                border: '1px solid rgba(27,120,247,0.4)',
                borderRadius: 7, padding: '5px 12px',
                color: '#1b78f7',
                fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', gap: 5, transition: 'all 0.15s',
              }}
            >
              <Pencil size={11} />
              <span>{isDesktop ? 'Editar workspace' : 'Editar'}</span>
            </button>
          )}
          <button
            onClick={onExitPreview}
            style={{
              background: 'transparent',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 7, padding: '5px 10px',
              color: '#ef4444', fontSize: 12, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', gap: 4, transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
          >
            <X size={12} /> <span>{isDesktop ? 'Sair' : ''}</span>
          </button>
        </div>
      )}

      {/* ── Overlay behind mobile bottom sheet ── */}
      {isOwner && previewEditing && !isDesktop && (
        <div className="pv-ws-overlay" onClick={() => setPreviewEditing(false)} />
      )}

      {/* ── Scrollable preview area — full height, background set here ── */}
      <div style={{
        flex: 1, overflowY: 'auto', overflowX: 'hidden',
        background: resolvedBg,
        paddingRight: isOwner && previewEditing && isDesktop ? (wsExpanded ? 360 : 60) : 0,
        transition: 'padding-right 0.26s ease, padding-bottom 0.26s ease',
        paddingBottom: wsExpanded && !isDesktop ? 'calc(48vh + 10px)' : undefined,
      }}>

      {/* ── Device frame + CSS scope (data-pv-cs, data-pv-theme) ── */}
      <div data-pv-cs={cardStyleVal} data-pv-theme={pvTheme || undefined} style={{
        margin: previewDevice !== 'desktop' ? `${isOwner ? 16 : 40}px auto 0` : '0 auto',
        maxWidth: deviceMaxWidth,
        width: '100%',
        boxShadow: previewDevice !== 'desktop' ? '0 0 0 1px rgba(0,0,0,0.2)' : 'none',
        borderRadius: previewDevice !== 'desktop' ? 14 : 0,
        overflow: previewDevice !== 'desktop' ? 'hidden' : 'visible',
        transition: 'max-width 0.3s ease',
        background: resolvedBg,
      }}>

      {/* ── Hero ── */}
      <div style={{ position: 'relative', overflow: 'hidden' }}>
        {coverAsHero ? (
          /* Cover full-bleed hero */
          <div style={{ width: '100%', height: Math.round(heroHeight * 1.4), position: 'relative' }}>
            <img src={project.cover_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.1) 40%, var(--c-bg) 100%)' }} />
            <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(135deg, ${hero.c1}22, transparent 60%)` }} />
          </div>
        ) : project.cover_url ? (
          <div style={{ width: '100%', height: Math.round(heroHeight * 1.14), position: 'relative' }}>
            <img src={project.cover_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, var(--c-bg) 100%)' }} />
          </div>
        ) : (
          <div style={{
            width: '100%', height: heroHeight, position: 'relative',
            background: `linear-gradient(135deg, ${hero.c1}44 0%, ${hero.c2}66 60%, transparent 100%)`,
          }}>
            <div style={{ position: 'absolute', top: -40, left: '5%', width: 500, height: 500, borderRadius: '50%', background: `radial-gradient(ellipse, ${hero.c1}22 0%, transparent 65%)`, pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 30%, var(--c-bg) 100%)' }} />
          </div>
        )}

        {/* Title block over hero */}
        <div className="pv-title-block" style={{ maxWidth: 860, margin: '0 auto', padding: '0 28px', position: 'relative', marginTop: coverAsHero ? -160 : project.cover_url ? -100 : -80, textAlign: titleAlign }}>
          {/* Area / type chips — backed by a translucent pill when sitting over a
              cover photo, so they stay readable regardless of the image underneath */}
          <div style={{
            display: 'inline-flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 18,
            justifyContent: titleAlign === 'center' ? 'center' : titleAlign === 'right' ? 'flex-end' : 'flex-start',
            ...(project.cover_url ? {
              background: 'rgba(5,9,18,0.55)', backdropFilter: 'blur(6px)',
              padding: '6px 12px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.1)',
            } : {}),
          }}>
            {project.project_type && (
              <span style={{
                color: hero.c1, fontSize: 12, fontWeight: 700, letterSpacing: '0.06em',
              }}>
                {project.project_type.toUpperCase()}
              </span>
            )}
            {project.project_type && project.area && (
              <span style={{ color: colors.subtle, fontSize: 12 }}>·</span>
            )}
            {project.area && (
              <span style={{ color: colors.blue, fontSize: 12, fontWeight: 600 }}>{project.area}</span>
            )}
            {project.score != null && (project.project_type || project.area) && (
              <span style={{ color: colors.subtle, fontSize: 12 }}>·</span>
            )}
            {project.score != null && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: colors.subtle, fontSize: 12 }}>
                <span style={{
                  width: 5, height: 5, borderRadius: '50%',
                  background: project.score >= 86 ? '#22c55e' : project.score >= 51 ? '#1b78f7' : '#f97316',
                }} />
                {project.score} score
              </span>
            )}
          </div>

          <h1 className="pv-hero-title" style={{
            fontSize: 'clamp(36px, 6vw, 64px)', fontWeight: 900,
            letterSpacing: titleStyle === 'caps' ? '0.04em' : '-1.5px', lineHeight: 1.0,
            margin: '0 0 14px',
            fontFamily: selectedTitleFont.css,
            textTransform: titleStyle === 'caps' ? 'uppercase' : 'none',
            textAlign: titleAlign,
            ...(titleStyle === 'gradient' ? {
              background: `linear-gradient(135deg, ${hero.c1}, ${hero.c2})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            } : { color: 'var(--c-text)' }),
          }}>
            {project.name}
            {(project.score || 0) >= 100 && (
              <span title="Score perfeito" style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                marginLeft: 14, verticalAlign: 'middle',
                width: 32, height: 32, borderRadius: 10,
                background: '#1b78f7',
                boxShadow: '0 2px 8px rgba(27,120,247,0.3)',
                flexShrink: 0,
                WebkitTextFillColor: 'initial',
              }}>
                <GraduationCap size={17} color="#fff" />
              </span>
            )}
          </h1>

          {(customTagline || project.ai_tagline) && (
            <p style={{
              fontSize: 'clamp(16px, 2.2vw, 20px)', color: coverAsHero ? 'rgba(255,255,255,0.75)' : 'var(--c-muted)',
              margin: titleAlign === 'right' ? '0 0 28px auto' : '0 0 28px',
              maxWidth: titleAlign === 'center' ? '100%' : 600, lineHeight: 1.5, fontWeight: 400, textAlign: titleAlign,
            }}>
              {customTagline || project.ai_tagline}
            </p>
          )}

          {/* Creator pill */}
          {displayName && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: 'var(--c-card)', border: '1px solid var(--c-border)', borderRadius: 999, padding: '6px 16px 6px 6px' }}>
              {avatarUrl ? (
                <img src={avatarUrl} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
              ) : (
                <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, background: hero.c1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff' }}>
                  {displayName[0]?.toUpperCase()}
                </div>
              )}
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-text)' }}>{displayName}</span>
              {course && <span style={{ fontSize: 12, color: 'var(--c-muted)' }}>· {course}</span>}
            </div>
          )}

          {/* Social / project links */}
          {(previewStyle.linkDemo || previewStyle.linkGithub || previewStyle.linkLinkedin) && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16, justifyContent: titleAlign === 'center' ? 'center' : titleAlign === 'right' ? 'flex-end' : 'flex-start' }}>
              {previewStyle.linkDemo && (
                <a href={previewStyle.linkDemo} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: hero.c1, color: '#fff', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 700, textDecoration: 'none', boxShadow: `0 2px 8px ${hero.c1}33` }}>
                  <Globe size={13} /> Ver demo
                </a>
              )}
              {previewStyle.linkGithub && (
                <a href={previewStyle.linkGithub} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'var(--c-card)', border: '1px solid var(--c-border)', color: 'var(--c-text)', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                  <FileText size={13} /> GitHub
                </a>
              )}
              {previewStyle.linkLinkedin && (
                <a href={previewStyle.linkLinkedin} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'rgba(10,102,194,0.1)', border: '1px solid rgba(10,102,194,0.3)', color: '#0a66c2', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                  <User size={13} /> LinkedIn
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Workspace panel — sidebar (desktop) or bottom sheet (mobile) ── */}
      {isOwner && previewEditing && (
        <div className={`pv-workspace${isDesktop ? '' : ` pv-ws-sheet${wsExpanded ? '' : ' ws-collapsed'}`}`} style={{
          position: 'fixed', right: 0, top: isDesktop ? 0 : bannerH, bottom: 0, zIndex: 200,
          width: isDesktop ? (wsExpanded ? 360 : 60) : 360,
          background: 'var(--c-sidebar-bg)',
          borderLeft: '1px solid var(--c-border)',
          display: 'flex', flexDirection: 'column',
          fontFamily: 'var(--font-body)',
          transition: isDesktop ? 'width 0.22s cubic-bezier(0.4,0,0.2,1)' : undefined,
          overflow: 'hidden',
        }}>
          {/* Drag handle — mobile only, taps to close workspace */}
          {!isDesktop && (
            <div className="pv-ws-drag-handle" style={{ cursor: 'pointer' }}
              onClick={() => setWsExpanded(false)} />
          )}

          {/* Collapse/expand control — same idiom as the left sidebar's edge button */}
          {isDesktop && (
            <button
              onClick={() => setWsExpanded(e => !e)}
              title={wsExpanded ? 'Colapsar' : 'Expandir'}
              style={{
                position: 'absolute', top: 68, left: -11,
                width: 22, height: 22, borderRadius: '50%',
                background: 'var(--c-sidebar-bg)', border: '1px solid var(--c-border)',
                color: 'var(--c-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', zIndex: 5, padding: 0,
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              }}
            >
              <ChevronRight size={12} style={{ transform: wsExpanded ? 'none' : 'rotate(180deg)', transition: 'transform 0.2s' }} />
            </button>
          )}

          {/* Collapsed desktop rail — just the 3 tab icons, click expands + switches tab */}
          {isDesktop && !wsExpanded && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '16px 0' }}>
              {[
                { id: 'estilo',  Icon: Palette },
                { id: 'blocos',  Icon: Layout  },
                { id: 'seccoes', Icon: Eye     },
              ].map(t => (
                <button
                  key={t.id}
                  title={t.id}
                  onClick={() => { setPreviewTab(t.id); setWsExpanded(true) }}
                  style={{
                    width: 36, height: 36, borderRadius: 9, border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: previewTab === t.id ? 'rgba(27,120,247,0.15)' : 'transparent',
                    color: previewTab === t.id ? '#1b78f7' : 'var(--c-muted)',
                    transition: 'background 0.13s, color 0.13s',
                  }}
                ><t.Icon size={16} /></button>
              ))}
            </div>
          )}

          {/* ── Panel header: tabs + save + close ── */}
          {(!isDesktop || wsExpanded) && <div style={{
            padding: '8px 10px 0',
            borderBottom: '1px solid var(--c-border)',
            flexShrink: 0,
          }}>
            {/* Tabs + actions row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              {/* Segmented tab control */}
              <div style={{
                display: 'flex', gap: 2, flex: 1,
                background: 'var(--c-bg-alt)', border: '1px solid var(--c-border)',
                borderRadius: 10, padding: '3px',
              }}>
                {[
                  { id: 'estilo',  label: 'Estilo',  Icon: Palette },
                  { id: 'blocos',  label: 'Blocos',  Icon: Layout  },
                  { id: 'seccoes', label: 'Secções', Icon: Eye     },
                ].map(t => (
                  <button key={t.id} onClick={() => setPreviewTab(t.id)} style={{
                    flex: 1, padding: '6px 4px', borderRadius: 7, border: 'none',
                    cursor: 'pointer', fontFamily: 'inherit',
                    background: previewTab === t.id ? '#1b78f7' : 'transparent',
                    color: previewTab === t.id ? '#fff' : 'var(--c-muted)',
                    fontSize: 11, fontWeight: previewTab === t.id ? 700 : 500,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                    transition: 'all 0.15s',
                    boxShadow: previewTab === t.id ? '0 1px 8px rgba(27,120,247,0.25)' : 'none',
                  }}>
                    <t.Icon size={11} /> {t.label}
                  </button>
                ))}
              </div>
              {/* Save icon */}
              <button
                onClick={async () => {
                  const { error } = await supabase.from('projects')
                    .update({ preview_blocks: previewBlocks, preview_style: previewStyle })
                    .eq('id', project.id)
                  if (!error) {
                    setPreviewSaveError(false)
                    setPreviewSaved(true)
                    setTimeout(() => setPreviewSaved(false), 2000)
                  } else {
                    console.error('Save preview error:', error)
                    setPreviewSaveError(true)
                    setTimeout(() => setPreviewSaveError(false), 4000)
                  }
                }}
                title={previewSaveError ? 'Erro ao guardar — tenta novamente' : 'Guardar'}
                style={{ width: 28, height: 28, borderRadius: 7, background: previewSaveError ? 'rgba(239,68,68,0.1)' : previewSaved ? 'rgba(34,197,94,0.1)' : 'rgba(27,120,247,0.08)', border: `1px solid ${previewSaveError ? 'rgba(239,68,68,0.3)' : previewSaved ? 'rgba(34,197,94,0.3)' : 'rgba(27,120,247,0.2)'}`, color: previewSaveError ? '#ef4444' : previewSaved ? '#22c55e' : '#1b78f7', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s', flexShrink: 0 }}
              >
                {previewSaveError ? <X size={13} strokeWidth={3} /> : previewSaved ? <Check size={13} strokeWidth={3} /> : <Save size={13} />}
              </button>
              {/* Close */}
              <button
                onClick={() => { setPreviewEditing(false); setWsExpanded(false) }}
                style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.14s', flexShrink: 0 }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.18)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
              ><X size={13} /></button>
            </div>
          </div>}

          {(!isDesktop || wsExpanded) && <>
          {/* ── TAB: ESTILO ── */}
          {previewTab === 'estilo' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>

              {/* Group: Identidade visual */}
              <div style={wsGroup}>
                <div style={wsGroupLabel}>Identidade visual</div>

                {/* Accent color — 5-col grid */}
                <div style={{ marginBottom: 14 }}>
                  <div style={wsControlLabel}>Cor de destaque</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                    {ACCENT_PALETTES.map(p => {
                      const isSelected = (previewStyle.accent || 'default') === p.key
                      return (
                        <button key={p.key} title={p.label}
                          onClick={() => setPreviewStyle(s => ({ ...s, accent: p.key }))}
                          style={{
                            height: 36, borderRadius: 9, border: 'none',
                            cursor: 'pointer', padding: 0, position: 'relative',
                            background: p.swatch
                              ? `linear-gradient(135deg, ${p.c1}, ${p.c2})`
                              : 'conic-gradient(#1e40af 0deg 60deg,#7c3aed 60deg 120deg,#065f46 120deg 180deg,#7c2d12 180deg 240deg,#d97706 240deg 300deg,#db2777 300deg 360deg)',
                            outline: isSelected ? '2px solid rgba(255,255,255,0.8)' : '2px solid transparent',
                            outlineOffset: 2, transition: 'outline-color 0.15s',
                          }}
                        >
                          {isSelected && (
                            <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Check size={13} color="#fff" strokeWidth={3} />
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--c-subtle)', marginTop: 5, textAlign: 'right' }}>
                    {(ACCENT_PALETTES.find(p => p.key === (previewStyle.accent || 'default')) || ACCENT_PALETTES[0]).label}
                  </div>
                </div>

                {/* Background — 4-col grid */}
                <div>
                  <div style={wsControlLabel}>Fundo da página</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 5 }}>
                    {BG_OPTIONS.map(b => {
                      const isSel = (previewStyle.bg || 'default') === b.key
                      const labelColor = b.isLight ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.65)'
                      const labelColorSel = b.isLight ? '#0f172a' : '#fff'
                      const checkColor = b.isLight ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.9)'
                      return (
                        <button key={b.key} title={b.label}
                          onClick={() => setPreviewStyle(ps => ({ ...ps, bg: b.key }))}
                          style={{
                            borderRadius: 9, border: isSel ? '2px solid #1b78f7' : '2px solid transparent', cursor: 'pointer', padding: 0, overflow: 'hidden',
                            background: b.previewGradient || '#060c18',
                            outline: isSel ? '2px solid rgba(27,120,247,0.3)' : '2px solid transparent',
                            outlineOffset: 2, transition: 'all 0.15s',
                          }}
                        >
                          <div style={{ height: 28, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {isSel && <Check size={11} color={checkColor} strokeWidth={3} />}
                          </div>
                          <div style={{
                            padding: '3px 2px 4px',
                            background: b.isLight ? 'rgba(0,0,0,0.08)' : 'rgba(0,0,0,0.35)',
                            fontSize: 9, fontWeight: isSel ? 700 : 600,
                            color: isSel ? labelColorSel : labelColor,
                            textAlign: 'center', lineHeight: 1,
                          }}>{b.label}</div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Group: Hero & Capa */}
              <div style={wsGroup}>
                <div style={wsGroupLabel}>Hero & capa</div>
                <div style={{ marginBottom: 12 }}>
                  <div style={wsControlLabel}>Tamanho do hero</div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {HERO_SIZES.map(s => {
                      const isSelected = (previewStyle.heroSize || 'default') === s.key
                      return (
                        <button key={s.key} onClick={() => setPreviewStyle(ps => ({ ...ps, heroSize: s.key }))}
                          style={{
                            flex: 1, padding: '8px 4px', borderRadius: 8,
                            border: `1px solid ${isSelected ? '#1b78f7' : 'var(--c-border)'}`,
                            background: isSelected ? 'rgba(27,120,247,0.12)' : 'var(--c-bg)',
                            color: isSelected ? '#1b78f7' : 'var(--c-muted)',
                            fontSize: 11, fontWeight: isSelected ? 700 : 500,
                            cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.12s',
                          }}
                        >{s.label}</button>
                      )
                    })}
                  </div>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    <div>
                      <div style={wsControlLabel}>Capa como fundo do hero</div>
                      <div style={{ fontSize: 10, color: 'var(--c-subtle)', marginTop: 1 }}>
                        {project.cover_url ? 'Usa a imagem de capa no hero' : 'Adiciona uma capa primeiro'}
                      </div>
                    </div>
                    <button
                      onClick={() => project.cover_url && setPreviewStyle(ps => ({ ...ps, coverAsHero: !ps.coverAsHero }))}
                      style={{
                        width: 42, height: 24, borderRadius: 99, flexShrink: 0,
                        background: previewStyle.coverAsHero && project.cover_url ? '#1b78f7' : 'var(--c-border)',
                        border: 'none', cursor: project.cover_url ? 'pointer' : 'not-allowed',
                        transition: 'background 0.2s', position: 'relative',
                        opacity: project.cover_url ? 1 : 0.4,
                      }}
                    >
                      <div style={{
                        width: 18, height: 18, borderRadius: '50%', background: '#fff',
                        position: 'absolute', top: 3,
                        left: previewStyle.coverAsHero && project.cover_url ? 21 : 3,
                        transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.35)',
                      }} />
                    </button>
                  </div>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    <div>
                      <div style={wsControlLabel}>Blocos em canvas livre</div>
                      <div style={{ fontSize: 10, color: 'var(--c-subtle)', marginTop: 1 }}>
                        Arrasta os blocos para qualquer posição, em vez de em lista
                      </div>
                    </div>
                    <button
                      onClick={() => setPreviewStyle(ps => ({ ...ps, canvasMode: !ps.canvasMode }))}
                      style={{
                        width: 42, height: 24, borderRadius: 99, flexShrink: 0,
                        background: previewStyle.canvasMode ? '#1b78f7' : 'var(--c-border)',
                        border: 'none', cursor: 'pointer',
                        transition: 'background 0.2s', position: 'relative',
                      }}
                    >
                      <div style={{
                        width: 18, height: 18, borderRadius: '50%', background: '#fff',
                        position: 'absolute', top: 3,
                        left: previewStyle.canvasMode ? 21 : 3,
                        transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.35)',
                      }} />
                    </button>
                  </div>
                </div>
                <div>
                  <div style={wsControlLabel}>Tagline personalizada</div>
                  <input
                    value={previewStyle.customTagline || ''}
                    onChange={e => setPreviewStyle(ps => ({ ...ps, customTagline: e.target.value }))}
                    placeholder={project.ai_tagline || 'Escreve uma tagline...'}
                    style={wsInputNew}
                    maxLength={120}
                  />
                  <div style={{ fontSize: 10, color: 'var(--c-subtle)', marginTop: 5 }}>Substitui a tagline gerada pela IA.</div>
                </div>
              </div>

              {/* Group: Tipografia */}
              <div style={wsGroup}>
                <div style={wsGroupLabel}>Tipografia</div>
                <div style={{ marginBottom: 12 }}>
                  <div style={wsControlLabel}>Fonte do título</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 4, marginBottom: 8 }}>
                    {TITLE_FONT_OPTIONS.map(f => {
                      const isSel = (previewStyle.titleFont || 'croogla') === f.key
                      return (
                        <button key={f.key} title={f.label}
                          onClick={() => setPreviewStyle(ps => ({ ...ps, titleFont: f.key }))}
                          style={{
                            padding: '8px 2px', borderRadius: 8, cursor: 'pointer', textAlign: 'center',
                            border: `1px solid ${isSel ? '#1b78f7' : 'var(--c-border)'}`,
                            background: isSel ? 'rgba(27,120,247,0.12)' : 'var(--c-bg)',
                            color: isSel ? '#1b78f7' : 'var(--c-muted)',
                            transition: 'all 0.12s',
                          }}
                        >
                          <div style={{ height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, fontFamily: f.css, lineHeight: 1 }}>{f.sample}</div>
                          <div style={{ fontSize: 8, marginTop: 3, fontWeight: isSel ? 700 : 500, fontFamily: 'var(--font-body)' }}>{f.label}</div>
                        </button>
                      )
                    })}
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {TITLE_STYLE_OPTIONS.map(s => {
                      const isSel = (previewStyle.titleStyle || 'normal') === s.key
                      return (
                        <button key={s.key} onClick={() => setPreviewStyle(ps => ({ ...ps, titleStyle: s.key }))}
                          style={{
                            flex: 1, padding: '7px 4px', borderRadius: 8, cursor: 'pointer',
                            border: `1px solid ${isSel ? '#1b78f7' : 'var(--c-border)'}`,
                            background: isSel ? 'rgba(27,120,247,0.12)' : 'var(--c-bg)',
                            color: isSel ? '#1b78f7' : 'var(--c-muted)',
                            fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-body)', transition: 'all 0.12s',
                          }}
                        >{s.label}</button>
                      )
                    })}
                  </div>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <div style={wsControlLabel}>Alinhamento do título</div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {[
                      { val: 'left', Icon: AlignLeft }, { val: 'center', Icon: AlignCenter }, { val: 'right', Icon: AlignRight },
                    ].map(a => {
                      const isSel = (previewStyle.titleAlign || 'left') === a.val
                      return (
                        <button key={a.val} onClick={() => setPreviewStyle(ps => ({ ...ps, titleAlign: a.val }))}
                          style={{
                            flex: 1, padding: '8px 0', borderRadius: 8, cursor: 'pointer',
                            border: `1px solid ${isSel ? '#1b78f7' : 'var(--c-border)'}`,
                            background: isSel ? 'rgba(27,120,247,0.12)' : 'var(--c-bg)',
                            color: isSel ? '#1b78f7' : 'var(--c-muted)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.12s',
                          }}
                        ><a.Icon size={14} /></button>
                      )
                    })}
                  </div>
                </div>
                <div>
                  <div style={wsControlLabel}>Fonte do texto</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 4 }}>
                    {FONT_OPTIONS.map(f => {
                      const isSel = (previewStyle.font || 'default') === f.key
                      return (
                        <button key={f.key} title={f.label}
                          onClick={() => setPreviewStyle(ps => ({ ...ps, font: f.key }))}
                          style={{
                            padding: '8px 2px', borderRadius: 8, cursor: 'pointer', textAlign: 'center',
                            border: `1px solid ${isSel ? '#1b78f7' : 'var(--c-border)'}`,
                            background: isSel ? 'rgba(27,120,247,0.12)' : 'var(--c-bg)',
                            color: isSel ? '#1b78f7' : 'var(--c-muted)', transition: 'all 0.12s',
                          }}
                        >
                          <div style={{ height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, fontFamily: f.css, lineHeight: 1 }}>{f.sample}</div>
                          <div style={{ fontSize: 8, marginTop: 3, fontWeight: isSel ? 700 : 500, fontFamily: 'var(--font-body)' }}>{f.label}</div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Group: Links do projeto */}
              <div style={wsGroup}>
                <div style={wsGroupLabel}>Links</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {[
                    { key: 'linkDemo',     Icon: Globe,       placeholder: 'Demo / site (https://...)' },
                    { key: 'linkGithub',   Icon: FileText,    placeholder: 'GitHub (https://github.com/...)' },
                    { key: 'linkLinkedin', Icon: User,        placeholder: 'LinkedIn (https://linkedin.com/...)' },
                  ].map(({ key, Icon, placeholder }) => (
                    <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <div style={{ width: 26, height: 26, borderRadius: 7, background: 'var(--c-bg)', border: '1px solid var(--c-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icon size={12} color="var(--c-muted)" />
                      </div>
                      <input
                        value={previewStyle[key] || ''}
                        onChange={e => setPreviewStyle(ps => ({ ...ps, [key]: e.target.value }))}
                        placeholder={placeholder}
                        style={{ ...wsInputNew, flex: 1 }}
                      />
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 10, color: 'var(--c-subtle)', marginTop: 6 }}>Aparecem no hero como botões de acção.</div>
              </div>

              {/* Group: Estilo dos cards */}
              <div style={wsGroup}>
                <div style={wsGroupLabel}>Estilo dos cards</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[
                    { key: 'border', label: 'Padrão',  desc: 'Com bordas'    },
                    { key: 'flat',   label: 'Flat',    desc: 'Sem bordas'    },
                    { key: 'glass',  label: 'Glass',   desc: 'Transparente'  },
                  ].map(c => {
                    const isSel = (previewStyle.cardStyle || 'border') === c.key
                    return (
                      <button key={c.key} onClick={() => setPreviewStyle(ps => ({ ...ps, cardStyle: c.key }))}
                        style={{
                          flex: 1, padding: '10px 4px', borderRadius: 9, cursor: 'pointer', textAlign: 'center',
                          border: `1px solid ${isSel ? '#1b78f7' : 'var(--c-border)'}`,
                          background: isSel ? 'rgba(27,120,247,0.12)' : 'var(--c-bg)',
                          color: isSel ? '#1b78f7' : 'var(--c-muted)',
                          fontFamily: 'inherit', transition: 'all 0.12s',
                        }}
                      >
                        <div style={{ fontSize: 12, fontWeight: 700 }}>{c.label}</div>
                        <div style={{ fontSize: 9, marginTop: 3, color: isSel ? 'rgba(27,120,247,0.65)' : 'var(--c-subtle)' }}>{c.desc}</div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Group: Imagem de capa */}
              <div style={wsGroup}>
                <div style={wsGroupLabel}>Imagem de capa</div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  {project.cover_url && (
                    <img src={project.cover_url} alt="" style={{ width: 58, height: 42, borderRadius: 8, objectFit: 'cover', flexShrink: 0, border: '1px solid var(--c-border)' }} />
                  )}
                  <button
                    onClick={() => {
                      const input = document.createElement('input')
                      input.type = 'file'; input.accept = 'image/*'
                      input.onchange = async () => {
                        const file = input.files[0]; if (!file) return
                        const ext = file.name.split('.').pop()
                        const path = `${project.id}/cover_${Date.now()}.${ext}`
                        const { error: upErr } = await supabase.storage.from('covers').upload(path, file, { upsert: true })
                        if (!upErr) {
                          const { data: { publicUrl } } = supabase.storage.from('covers').getPublicUrl(path)
                          await supabase.from('projects').update({ cover_url: publicUrl }).eq('id', project.id)
                          onCoverChange?.(publicUrl)
                        }
                      }
                      input.click()
                    }}
                    style={{
                      flex: 1, padding: '11px 14px', borderRadius: 9,
                      background: 'rgba(27,120,247,0.06)', border: '1.5px dashed rgba(27,120,247,0.3)',
                      color: '#1b78f7', cursor: 'pointer', fontFamily: 'inherit',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      fontSize: 12, fontWeight: 600, transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(27,120,247,0.12)'; e.currentTarget.style.borderColor = 'rgba(27,120,247,0.5)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(27,120,247,0.06)'; e.currentTarget.style.borderColor = 'rgba(27,120,247,0.3)' }}
                  >
                    <Camera size={14} />
                    {project.cover_url ? 'Alterar capa' : 'Carregar capa'}
                  </button>
                </div>
              </div>

              {/* Group: Rodapé */}
              <div style={{ ...wsGroup, marginBottom: 4 }}>
                <div style={wsGroupLabel}>Rodapé</div>
                <input
                  value={previewStyle.footerText || ''}
                  onChange={e => setPreviewStyle(ps => ({ ...ps, footerText: e.target.value }))}
                  placeholder="Ex: Projeto desenvolvido em 2025 · ETIC Lisboa"
                  style={wsInputNew}
                  maxLength={120}
                />
                <div style={{ fontSize: 10, color: 'var(--c-subtle)', marginTop: 5 }}>Aparece no fundo da preview pública.</div>
              </div>
            </div>
          )}

          {/* ── TAB: BLOCOS ── */}
          {previewTab === 'blocos' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              {/* Block type picker — compact 3-col chip grid */}
              <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--c-border)' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--c-subtle)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Adicionar bloco</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 5 }}>
                  {BLOCK_TYPES.map(bt => {
                    const BtIcon = bt.Icon
                    return (
                      <button key={bt.type} title={bt.desc} onClick={() => {
                          const b = newBlock(bt.type, previewBlocks.length)
                          setPreviewBlocks(bs => [b, ...bs])
                          // New blocks always land at the very top of the page,
                          // whether or not the order has been customized yet.
                          setPreviewStyle(ps => {
                            const base = ps.layoutOrder?.length
                              ? ps.layoutOrder
                              : [...previewBlocks.map(pb => ({ kind: 'block', id: pb.id })), ...orderedSections.map(key => ({ kind: 'section', key }))]
                            return { ...ps, layoutOrder: [{ kind: 'block', id: b.id }, ...base] }
                          })
                        }}
                        style={{
                          background: 'var(--c-bg)', border: '1px solid var(--c-border)',
                          borderRadius: 8, padding: '7px 6px',
                          cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center',
                          transition: 'all 0.13s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(27,120,247,0.08)'; e.currentTarget.style.borderColor = 'rgba(27,120,247,0.35)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'var(--c-bg)'; e.currentTarget.style.borderColor = 'var(--c-border)' }}
                      >
                        <div style={{ width: 26, height: 26, borderRadius: 7, background: 'rgba(27,120,247,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <BtIcon size={12} color="#1b78f7" />
                        </div>
                        <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--c-text)', lineHeight: 1.2 }}>{bt.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Existing blocks list */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 7 }}>
                {previewBlocks.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 48, height: 48, borderRadius: 14, background: 'var(--c-bg-alt)', border: '1.5px dashed var(--c-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Layout size={20} color="var(--c-subtle)" />
                    </div>
                    <div>
                      <div style={{ fontSize: 13, color: 'var(--c-muted)', fontWeight: 700 }}>Nenhum bloco ainda</div>
                      <div style={{ fontSize: 11, color: 'var(--c-subtle)', marginTop: 3, lineHeight: 1.5 }}>Adiciona um bloco acima para<br/>personalizar a tua preview.</div>
                    </div>
                  </div>
                ) : previewBlocks.map((block, idx) => {
                  const bt = BLOCK_TYPES.find(b => b.type === block.type) || BLOCK_TYPES[0]
                  const BtIcon = bt.Icon
                  const isDragTarget = dragOverIdx === idx
                  const accentColor = block.color || '#1b78f7'
                  const hasText = ['heading','note','quote','callout','metric','stats'].includes(block.type)
                  return (
                    <div key={block.id} draggable
                      onDragStart={() => onDragStart(idx)} onDragEnter={() => onDragEnter(idx)}
                      onDragEnd={onDragEnd} onDragOver={e => e.preventDefault()}
                      style={{
                        background: isDragTarget ? 'rgba(27,120,247,0.05)' : 'var(--c-bg-alt)',
                        border: `1px solid ${isDragTarget ? 'rgba(27,120,247,0.4)' : 'var(--c-border)'}`,
                        borderLeft: `3px solid ${accentColor}`,
                        borderRadius: 9, padding: '9px 10px',
                        cursor: 'grab', transition: 'all 0.1s',
                        transform: isDragTarget ? 'scale(1.01)' : 'none',
                      }}
                    >
                      {/* Block header */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                        <GripVertical size={12} color="var(--c-subtle)" style={{ flexShrink: 0, cursor: 'grab' }} />
                        <div style={{ width: 20, height: 20, borderRadius: 5, background: `${accentColor}1a`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <BtIcon size={10} color={accentColor} />
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-text)', flex: 1 }}>{bt.label}</span>
                        <button onClick={() => {
                            setPreviewBlocks(bs => bs.filter(b => b.id !== block.id))
                            setPreviewStyle(ps => ps.layoutOrder?.length
                              ? { ...ps, layoutOrder: ps.layoutOrder.filter(item => !(item.kind === 'block' && item.id === block.id)) }
                              : ps)
                          }}
                          style={{ background: 'none', border: 'none', color: 'var(--c-subtle)', cursor: 'pointer', padding: '2px 3px', display: 'flex', alignItems: 'center', borderRadius: 4, transition: 'color 0.12s' }}
                          onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                          onMouseLeave={e => e.currentTarget.style.color = 'var(--c-subtle)'}
                        ><X size={12} /></button>
                      </div>

                      {/* Block content inputs */}
                      {block.type === 'heading' && <input value={block.content || ''} onChange={e => upd(block.id, 'content', e.target.value)} placeholder="Título da secção..." style={wsInputNew} />}
                      {block.type === 'note' && <textarea value={block.content || ''} onChange={e => upd(block.id, 'content', e.target.value)} placeholder="A tua mensagem para quem visita..." rows={2} style={{ ...wsInputNew, resize: 'vertical', lineHeight: 1.5 }} />}
                      {block.type === 'quote' && <textarea value={block.content || ''} onChange={e => upd(block.id, 'content', e.target.value)} placeholder="Frase ou citação marcante..." rows={2} style={{ ...wsInputNew, resize: 'vertical', lineHeight: 1.5 }} />}
                      {block.type === 'callout' && (<>
                        <input value={block.label || ''} onChange={e => upd(block.id, 'label', e.target.value)} placeholder="Título (opcional)" style={{ ...wsInputNew, marginBottom: 5 }} />
                        <textarea value={block.content || ''} onChange={e => upd(block.id, 'content', e.target.value)} placeholder="Conteúdo do destaque..." rows={2} style={{ ...wsInputNew, resize: 'vertical', lineHeight: 1.5 }} />
                      </>)}
                      {block.type === 'link' && (<>
                        <input value={block.label || ''} onChange={e => upd(block.id, 'label', e.target.value)} placeholder="Texto (ex: Ver demo)" style={{ ...wsInputNew, marginBottom: 5 }} />
                        <input value={block.url || ''} onChange={e => upd(block.id, 'url', e.target.value)} placeholder="URL (https://...)" style={wsInputNew} />
                      </>)}
                      {block.type === 'metric' && (<>
                        <input value={block.label || ''} onChange={e => upd(block.id, 'label', e.target.value)} placeholder="Valor (ex: 2.500)" style={{ ...wsInputNew, marginBottom: 5, fontWeight: 800 }} />
                        <input value={block.content || ''} onChange={e => upd(block.id, 'content', e.target.value)} placeholder="Descrição" style={wsInputNew} />
                      </>)}
                      {block.type === 'image' && (<>
                        <div style={{ display: 'flex', gap: 5, marginBottom: 5 }}>
                          <input value={block.imageUrl || ''} onChange={e => upd(block.id, 'imageUrl', e.target.value)} placeholder="URL da imagem..." style={{ ...wsInputNew, flex: 1 }} />
                          <button onClick={() => uploadImage(block.id, 'imageUrl')} style={{ background: 'rgba(27,120,247,0.1)', border: '1px solid rgba(27,120,247,0.25)', borderRadius: 6, padding: '0 9px', color: colors.blue, cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0 }}><Camera size={12} /></button>
                        </div>
                        <input value={block.content || ''} onChange={e => upd(block.id, 'content', e.target.value)} placeholder="Legenda (opcional)" style={wsInputNew} />
                      </>)}
                      {block.type === 'gallery' && (<>
                        {['imageUrl','imageUrl2','imageUrl3'].map((field, gi) => (
                          <div key={field} style={{ display: 'flex', gap: 5, marginBottom: gi < 2 ? 5 : 0 }}>
                            <input value={block[field] || ''} onChange={e => upd(block.id, field, e.target.value)} placeholder={`Imagem ${gi+1}`} style={{ ...wsInputNew, flex: 1 }} />
                            <button onClick={() => uploadImage(block.id, field)} style={{ background: 'rgba(27,120,247,0.1)', border: '1px solid rgba(27,120,247,0.25)', borderRadius: 6, padding: '0 9px', color: colors.blue, cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0 }}><Camera size={12} /></button>
                          </div>
                        ))}
                      </>)}
                      {block.type === 'video' && <input value={block.videoUrl || ''} onChange={e => upd(block.id, 'videoUrl', e.target.value)} placeholder="URL do YouTube ou Vimeo..." style={wsInputNew} />}
                      {block.type === 'stats' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                          {[1,2,3].map(n => (
                            <div key={n} style={{ display: 'flex', gap: 4 }}>
                              <input value={block[`stat${n}Value`] || ''} onChange={e => upd(block.id, `stat${n}Value`, e.target.value)} placeholder={`Valor ${n}`} style={{ ...wsInputNew, flex: '0 0 40%', fontWeight: 800 }} />
                              <input value={block[`stat${n}Label`] || ''} onChange={e => upd(block.id, `stat${n}Label`, e.target.value)} placeholder={`Desc. ${n}`} style={{ ...wsInputNew, flex: 1 }} />
                            </div>
                          ))}
                        </div>
                      )}
                      {block.type === 'cta' && (<>
                        <input value={block.content || ''} onChange={e => upd(block.id, 'content', e.target.value)} placeholder="Texto do botão" style={{ ...wsInputNew, marginBottom: 5, fontWeight: 700 }} />
                        <input value={block.url || ''} onChange={e => upd(block.id, 'url', e.target.value)} placeholder="URL de destino (https://...)" style={wsInputNew} />
                      </>)}
                      {block.type === 'card' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                          <input value={block.cardTitle || ''} onChange={e => upd(block.id, 'cardTitle', e.target.value)} placeholder="Título do card (opcional)" style={{ ...wsInputNew, fontWeight: 700 }} />
                          {(block.cardRows || []).map((row, i) => (
                            <div key={i} style={{ display: 'flex', gap: 4 }}>
                              <input
                                value={row.label}
                                onChange={e => {
                                  const rows = [...block.cardRows]; rows[i] = { ...rows[i], label: e.target.value }
                                  upd(block.id, 'cardRows', rows)
                                }}
                                placeholder="Ex: Idade" style={{ ...wsInputNew, flex: '0 0 42%' }}
                              />
                              <input
                                value={row.value}
                                onChange={e => {
                                  const rows = [...block.cardRows]; rows[i] = { ...rows[i], value: e.target.value }
                                  upd(block.id, 'cardRows', rows)
                                }}
                                placeholder="Ex: 17 anos" style={{ ...wsInputNew, flex: 1 }}
                              />
                              <button
                                onClick={() => upd(block.id, 'cardRows', block.cardRows.filter((_, ri) => ri !== i))}
                                style={{ background: 'none', border: 'none', color: 'var(--c-subtle)', cursor: 'pointer', display: 'flex', flexShrink: 0, padding: '0 2px' }}
                              ><X size={13} /></button>
                            </div>
                          ))}
                          {(block.cardRows || []).length < 6 && (
                            <button
                              onClick={() => upd(block.id, 'cardRows', [...(block.cardRows || []), { label: '', value: '' }])}
                              style={{ alignSelf: 'flex-start', fontSize: 11, fontWeight: 600, color: '#1b78f7', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0', fontFamily: 'inherit' }}
                            >+ Adicionar linha</button>
                          )}
                        </div>
                      )}
                      {block.type === 'divider' && (
                        <div style={{ display: 'flex', gap: 3 }}>
                          {['solid','dashed','dotted','gradient'].map(s => (
                            <button key={s} onClick={() => upd(block.id, 'dividerStyle', s)}
                              style={{
                                flex: 1, padding: '5px 0', borderRadius: 6, cursor: 'pointer',
                                border: `1px solid ${(block.dividerStyle || 'solid') === s ? '#1b78f7' : 'var(--c-border)'}`,
                                background: (block.dividerStyle || 'solid') === s ? 'rgba(27,120,247,0.12)' : 'var(--c-bg)',
                                color: (block.dividerStyle || 'solid') === s ? '#1b78f7' : 'var(--c-muted)',
                                fontSize: 9, fontWeight: 700, fontFamily: 'inherit',
                              }}
                            >{s.charAt(0).toUpperCase() + s.slice(1)}</button>
                          ))}
                        </div>
                      )}

                      {/* Footer: accent color + alignment (compact) */}
                      <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ display: 'flex', gap: 4, flex: 1 }}>
                          {BLOCK_ACCENT_COLORS.map(c => (
                            <button key={c.value} title={c.label}
                              onClick={() => upd(block.id, 'color', block.color === c.value ? '' : c.value)}
                              style={{
                                width: 16, height: 16, borderRadius: '50%', background: c.value,
                                border: block.color === c.value ? '2px solid var(--c-text)' : '1.5px solid transparent',
                                cursor: 'pointer', padding: 0, flexShrink: 0,
                                boxShadow: block.color === c.value ? `0 0 0 1px ${c.value}` : 'none',
                                transition: 'transform 0.1s',
                              }}
                              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.3)'}
                              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                            />
                          ))}
                        </div>
                        {hasText && (
                          <div style={{ display: 'flex', gap: 2 }}>
                            {[{ val: 'left', Icon: AlignLeft }, { val: 'center', Icon: AlignCenter }, { val: 'right', Icon: AlignRight }].map(a => (
                              <button key={a.val} onClick={() => upd(block.id, 'align', a.val)}
                                style={{
                                  width: 24, height: 22, borderRadius: 5,
                                  background: (block.align || 'left') === a.val ? '#1b78f7' : 'transparent',
                                  border: `1px solid ${(block.align || 'left') === a.val ? '#1b78f7' : 'var(--c-border)'}`,
                                  cursor: 'pointer', color: (block.align || 'left') === a.val ? '#fff' : 'var(--c-muted)',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
                                }}
                              ><a.Icon size={11} /></button>
                            ))}
                          </div>
                        )}
                      </div>
                      {/* Width — pairs two consecutive "Metade" blocks side by side */}
                      <div style={{ marginTop: 6, display: 'flex', gap: 4 }}>
                        {[{ val: 'full', label: 'Largura total' }, { val: 'half', label: 'Metade' }].map(w => (
                          <button key={w.val} onClick={() => upd(block.id, 'width', w.val)}
                            style={{
                              flex: 1, padding: '4px 0', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit',
                              background: (block.width || 'full') === w.val ? 'rgba(27,120,247,0.12)' : 'var(--c-bg)',
                              border: `1px solid ${(block.width || 'full') === w.val ? '#1b78f7' : 'var(--c-border)'}`,
                              color: (block.width || 'full') === w.val ? '#1b78f7' : 'var(--c-muted)',
                              fontSize: 10, fontWeight: 600,
                            }}
                          >{w.label}</button>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── TAB: SECÇÕES ── */}
          {previewTab === 'seccoes' && (() => {
            const NATIVE_SECTIONS_MAP = {
              problem:         { label: 'Problema',        Icon: Search     },
              solution:        { label: 'Solução',         Icon: Lightbulb  },
              target_audience: { label: 'Público-alvo',    Icon: Target     },
              features:        { label: 'Funcionalidades', Icon: Wrench     },
              technologies:    { label: 'Tecnologias',     Icon: Zap        },
              challenges:      { label: 'Desafios',        Icon: Zap        },
              results:         { label: 'Resultados',      Icon: TrendingUp },
              learnings:       { label: 'Aprendizagens',   Icon: BookOpen   },
              pap_supervisor:  { label: 'Orientador',       Icon: GraduationCap },
            }
            const hidden = new Set(previewStyle.hiddenSections || [])
            const blocksById = Object.fromEntries(previewBlocks.map(b => [b.id, b]))
            const defaultLayout = [
              ...previewBlocks.map(b => ({ kind: 'block', id: b.id })),
              ...orderedSections.map(key => ({ kind: 'section', key })),
            ]
            const layoutDisplay = previewStyle.layoutOrder?.length ? previewStyle.layoutOrder : defaultLayout

            function moveLayoutItem(from, to) {
              if (from === to) return
              const next = [...layoutDisplay]
              next.splice(to, 0, next.splice(from, 1)[0])
              setPreviewStyle(ps => ({ ...ps, layoutOrder: next }))
            }

            return (
              <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--c-subtle)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Ordem da página</div>
                <p style={{ margin: '0 0 12px', fontSize: 11, color: 'var(--c-muted)', lineHeight: 1.5 }}>
                  Arrasta para reordenar — podes intercalar blocos com secções livremente. Toca em <Eye size={10} style={{ verticalAlign: 'middle' }} /> para ocultar uma secção.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {layoutDisplay.map((item, idx) => {
                    if (item.kind === 'block') {
                      const block = blocksById[item.id]
                      if (!block) return null
                      const bt = BLOCK_TYPES.find(b => b.type === block.type) || BLOCK_TYPES[0]
                      const BIcon = bt.Icon
                      const isOver = dragOverSectionIdx === idx
                      const previewText = block.content || block.cardTitle || block.label || bt.label
                      return (
                        <div key={block.id} draggable
                          onDragStart={() => { sectionDragRef.current = idx }}
                          onDragOver={e => { e.preventDefault(); if (dragOverSectionIdx !== idx) setDragOverSectionIdx(idx) }}
                          onDragLeave={() => setDragOverSectionIdx(null)}
                          onDrop={e => { e.preventDefault(); setDragOverSectionIdx(null); moveLayoutItem(sectionDragRef.current, idx) }}
                          onDragEnd={() => setDragOverSectionIdx(null)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            background: isOver ? 'rgba(27,120,247,0.08)' : 'var(--c-bg-alt)',
                            border: `1px solid ${isOver ? '#1b78f7' : 'rgba(27,120,247,0.15)'}`,
                            borderLeft: '3px solid #1b78f7',
                            borderRadius: 10, padding: '8px 10px',
                            userSelect: 'none', cursor: 'grab',
                          }}
                        >
                          <div style={{ cursor: 'grab', color: 'var(--c-subtle)', display: 'flex', flexShrink: 0 }}><GripVertical size={14} /></div>
                          <div style={{ width: 26, height: 26, borderRadius: 7, flexShrink: 0, background: 'rgba(27,120,247,0.1)', border: '1px solid rgba(27,120,247,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1b78f7' }}>
                            <BIcon size={12} strokeWidth={2} />
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 600, flex: 1, color: 'var(--c-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {bt.label}{previewText ? ` · ${previewText}` : ''}
                          </span>
                          {block.width === 'half' && <span style={{ fontSize: 9, color: '#1b78f7', fontWeight: 700, background: 'rgba(27,120,247,0.1)', border: '1px solid rgba(27,120,247,0.25)', borderRadius: 4, padding: '1px 5px', flexShrink: 0 }}>metade</span>}
                        </div>
                      )
                    }

                    const key = item.key
                    const s = NATIVE_SECTIONS_MAP[key]
                    if (!s) return null
                    const isHidden = hidden.has(key)
                    const hasContent = key === 'features' ? features.length > 0 : key === 'technologies' ? tech.length > 0 : !!(project[key]?.trim())
                    const SIcon = s.Icon
                    const isOver = dragOverSectionIdx === idx
                    const media = previewStyle.sectionMedia?.[key]
                    return (
                      <div key={key}>
                      <div draggable
                        onDragStart={() => { sectionDragRef.current = idx }}
                        onDragOver={e => { e.preventDefault(); if (dragOverSectionIdx !== idx) setDragOverSectionIdx(idx) }}
                        onDragLeave={() => setDragOverSectionIdx(null)}
                        onDrop={e => { e.preventDefault(); setDragOverSectionIdx(null); moveLayoutItem(sectionDragRef.current, idx) }}
                        onDragEnd={() => setDragOverSectionIdx(null)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          background: isOver ? 'rgba(27,120,247,0.08)' : isHidden ? 'var(--c-bg)' : hasContent ? 'var(--c-bg-alt)' : 'var(--c-bg)',
                          border: `1px solid ${isOver ? '#1b78f7' : isHidden ? 'var(--c-border)' : hasContent ? 'rgba(27,120,247,0.15)' : 'var(--c-border)'}`,
                          borderLeft: `3px solid ${hasContent && !isHidden ? '#1b78f7' : 'var(--c-border)'}`,
                          borderRadius: 10, padding: '8px 10px',
                          opacity: hasContent ? 1 : 0.45, transition: 'all 0.12s',
                          userSelect: 'none', cursor: hasContent ? 'grab' : 'default',
                        }}
                      >
                        <div style={{ cursor: 'grab', color: 'var(--c-subtle)', display: 'flex', flexShrink: 0 }}>
                          <GripVertical size={14} />
                        </div>
                        <div style={{ width: 26, height: 26, borderRadius: 7, flexShrink: 0, background: isHidden ? 'var(--c-bg-alt)' : 'rgba(27,120,247,0.1)', border: `1px solid ${isHidden ? 'var(--c-border)' : 'rgba(27,120,247,0.2)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: isHidden ? 'var(--c-subtle)' : '#1b78f7' }}>
                          <SIcon size={12} strokeWidth={2} />
                          </div>
                        <span style={{ fontSize: 12, fontWeight: 600, flex: 1, color: isHidden ? 'var(--c-subtle)' : 'var(--c-text)', textDecoration: isHidden ? 'line-through' : 'none' }}>
                          {s.label}
                        </span>
                        {!hasContent && <span style={{ fontSize: 9, color: 'var(--c-subtle)', fontWeight: 600, background: 'var(--c-bg-alt)', border: '1px solid var(--c-border)', borderRadius: 4, padding: '1px 5px' }}>vazio</span>}
                        <button
                          onClick={() => {
                            const newHidden = new Set(hidden)
                            isHidden ? newHidden.delete(key) : newHidden.add(key)
                            setPreviewStyle(ps => ({ ...ps, hiddenSections: [...newHidden] }))
                          }}
                          title={isHidden ? 'Mostrar' : 'Ocultar'}
                          style={{ background: 'none', border: 'none', padding: '3px 4px', cursor: 'pointer', display: 'flex', color: isHidden ? 'var(--c-subtle)' : '#1b78f7', flexShrink: 0, borderRadius: 6, transition: 'background 0.12s' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(27,120,247,0.1)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'none'}
                        >
                          {isHidden ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                        {hasContent && (
                          <button
                            onClick={() => setMediaEditKey(k => k === key ? null : key)}
                            title="Imagem/vídeo ao lado"
                            style={{ background: media ? 'rgba(27,120,247,0.12)' : 'none', border: 'none', padding: '3px 4px', cursor: 'pointer', display: 'flex', color: media ? '#1b78f7' : 'var(--c-subtle)', flexShrink: 0, borderRadius: 6, transition: 'background 0.12s' }}
                          >
                            <Image size={14} />
                          </button>
                        )}
                      </div>
                      {mediaEditKey === key && (
                        <div style={{ marginTop: 4, marginLeft: 22, padding: '10px 12px', background: 'var(--c-bg)', border: '1px solid var(--c-border)', borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              onClick={() => uploadSectionMedia(key)}
                              style={{ flex: 1, padding: '6px 8px', fontSize: 11, fontWeight: 600, background: 'var(--c-bg-alt)', border: '1px solid var(--c-border)', borderRadius: 6, color: 'var(--c-text)', cursor: 'pointer', fontFamily: 'inherit' }}
                            >Carregar imagem</button>
                            {media && (
                              <button
                                onClick={() => setPreviewStyle(ps => {
                                  const next = { ...(ps.sectionMedia || {}) }
                                  delete next[key]
                                  return { ...ps, sectionMedia: next }
                                })}
                                style={{ padding: '6px 10px', fontSize: 11, fontWeight: 600, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, color: '#ef4444', cursor: 'pointer', fontFamily: 'inherit' }}
                              >Remover</button>
                            )}
                          </div>
                          <input
                            type="text" placeholder="Ou cola um link de vídeo (YouTube/Vimeo)"
                            defaultValue={media?.type === 'video' ? media.url : ''}
                            onBlur={e => {
                              const url = e.target.value.trim()
                              if (!url) return
                              setPreviewStyle(ps => ({
                                ...ps,
                                sectionMedia: { ...(ps.sectionMedia || {}), [key]: { ...(ps.sectionMedia?.[key] || {}), type: 'video', url } },
                              }))
                            }}
                            style={{ width: '100%', padding: '6px 8px', fontSize: 11, background: 'var(--c-bg-alt)', border: '1px solid var(--c-border)', borderRadius: 6, color: 'var(--c-text)', fontFamily: 'inherit', boxSizing: 'border-box' }}
                          />
                          {media && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: 10, color: 'var(--c-subtle)', fontWeight: 600 }}>Lado:</span>
                              {['right', 'left'].map(side => (
                                <button
                                  key={side}
                                  onClick={() => setPreviewStyle(ps => ({
                                    ...ps,
                                    sectionMedia: { ...(ps.sectionMedia || {}), [key]: { ...(ps.sectionMedia?.[key] || {}), side } },
                                  }))}
                                  style={{
                                    padding: '4px 10px', fontSize: 11, fontWeight: 600, borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit',
                                    background: (media.side || 'right') === side ? 'rgba(27,120,247,0.15)' : 'var(--c-bg-alt)',
                                    border: `1px solid ${(media.side || 'right') === side ? '#1b78f7' : 'var(--c-border)'}`,
                                    color: (media.side || 'right') === side ? '#1b78f7' : 'var(--c-muted)',
                                  }}
                                >{side === 'right' ? 'Direita' : 'Esquerda'}</button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      </div>
                    )
                  })}
                </div>
                <p style={{ margin: '12px 0 0', fontSize: 10, color: 'var(--c-subtle)', lineHeight: 1.5 }}>
                  A ordem é guardada ao clicar em "Guardar alterações".
                </p>
              </div>
            )
          })()}
          </>}

        </div>
      )}

      {/* ── Story sections ── */}
      <div className="pv-story" style={{ maxWidth: deviceMaxWidth ? Math.min(860, deviceMaxWidth) : 860, margin: `${isDesktop ? 40 : bannerH + 16}px auto 0`, padding: `0 ${previewDevice === 'mobile' ? '16px' : '28px'} 80px`, display: 'flex', flexDirection: 'column', gap: 32, fontFamily: selectedFont.css }}>

        {/* Custom blocks — workspace blocks shown first */}
        {(() => {
        function renderOneBlock(block) {
          const accent = block.color || '#1b78f7'
          const align  = block.align  || 'left'

          if (block.type === 'heading' && block.content) return (
            <div key={block.id} style={{ textAlign: align }}>
              <h2 style={{ margin: 0, fontSize: 'clamp(22px,3.5vw,32px)', fontWeight: 400, fontFamily: 'var(--font-heading)', color: block.color || 'var(--c-text)', letterSpacing: '-0.02em', lineHeight: 1.15 }}>
                {block.content}
              </h2>
            </div>
          )

          if (block.type === 'note' && block.content) return (
            <div key={block.id} style={{ background: 'var(--c-card)', border: `1px solid ${accent}33`, borderLeft: `4px solid ${accent}`, borderRadius: '0 12px 12px 0', padding: '22px 26px', textAlign: align }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: accent, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6, justifyContent: align === 'right' ? 'flex-end' : align === 'center' ? 'center' : 'flex-start' }}>
                <AlignLeft size={11} /> Nota do criador
              </div>
              <p style={{ margin: 0, fontSize: 16, color: 'var(--c-text)', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{block.content}</p>
            </div>
          )

          if (block.type === 'quote' && block.content) return (
            <div key={block.id} style={{ borderLeft: `4px solid ${accent}`, padding: '20px 28px', background: `${accent}08`, borderRadius: '0 10px 10px 0', textAlign: align }}>
              <p style={{ margin: 0, fontSize: 'clamp(16px,2.2vw,22px)', color: 'var(--c-text)', fontStyle: 'italic', lineHeight: 1.7, fontWeight: 500 }}>
                "{block.content}"
              </p>
            </div>
          )

          if (block.type === 'callout' && block.content) return (
            <div key={block.id} style={{ background: `${accent}0d`, border: `1px solid ${accent}33`, borderRadius: 12, padding: '20px 24px', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, flexShrink: 0, background: `${accent}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Sparkles size={17} color={accent} />
              </div>
              <div style={{ flex: 1, textAlign: align }}>
                {block.label && <div style={{ fontSize: 12, fontWeight: 800, color: accent, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{block.label}</div>}
                <p style={{ margin: 0, fontSize: 15, color: 'var(--c-text)', lineHeight: 1.7 }}>{block.content}</p>
              </div>
            </div>
          )

          if (block.type === 'link' && block.url) return (
            <div key={block.id} style={{ textAlign: align }}>
              <a href={block.url} target="_blank" rel="noopener noreferrer" style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: `${accent}18`, border: `1px solid ${accent}44`,
                borderRadius: 8, padding: '11px 20px',
                color: accent, fontSize: 14, fontWeight: 700, textDecoration: 'none',
                transition: 'all 0.15s',
              }}>
                <Link size={14} /> {block.label || block.url}
              </a>
            </div>
          )

          if (block.type === 'metric' && block.label) return (
            <div key={block.id} style={{ background: 'var(--c-card)', border: `1px solid ${accent}33`, borderRadius: 12, padding: '24px 28px', textAlign: align }}>
              <div style={{ fontSize: 'clamp(36px,5vw,56px)', fontWeight: 900, color: accent, letterSpacing: '-2px', lineHeight: 1, marginBottom: 8 }}>{block.label}</div>
              {block.content && <div style={{ fontSize: 15, color: 'var(--c-muted)', fontWeight: 500 }}>{block.content}</div>}
            </div>
          )

          if (block.type === 'image' && block.imageUrl) return (
            <div key={block.id} style={{ borderRadius: 12, overflow: 'hidden' }}>
              <img src={block.imageUrl} alt={block.content || ''} style={{ width: '100%', maxHeight: 480, objectFit: 'cover', display: 'block' }} onError={e => { e.target.style.display = 'none' }} />
              {block.content && <div style={{ padding: '10px 16px', background: 'var(--c-card)', fontSize: 13, color: 'var(--c-muted)', fontStyle: 'italic', textAlign: align }}>{block.content}</div>}
            </div>
          )

          if (block.type === 'gallery') {
            const imgs = [block.imageUrl, block.imageUrl2, block.imageUrl3].filter(Boolean)
            if (!imgs.length) return null
            return (
              <div key={block.id} style={{ display: 'grid', gridTemplateColumns: `repeat(${imgs.length}, 1fr)`, gap: 8, borderRadius: 12, overflow: 'hidden' }}>
                {imgs.map((src, gi) => (
                  <div key={gi} style={{ aspectRatio: '4/3', overflow: 'hidden' }}>
                    <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} onError={e => { e.target.style.display = 'none' }} />
                  </div>
                ))}
              </div>
            )
          }

          if (block.type === 'video') {
            const embedUrl = getVideoEmbedUrl(block.videoUrl)
            if (!embedUrl) return null
            return (
              <div key={block.id} style={{ borderRadius: 12, overflow: 'hidden', background: '#000', aspectRatio: '16/9', position: 'relative' }}>
                <iframe
                  src={embedUrl}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
                />
              </div>
            )
          }

          if (block.type === 'stats') {
            const stats = [
              { value: block.stat1Value, label: block.stat1Label },
              { value: block.stat2Value, label: block.stat2Label },
              { value: block.stat3Value, label: block.stat3Label },
            ].filter(s => s.value)
            if (!stats.length) return null
            return (
              <div key={block.id} style={{ display: 'grid', gridTemplateColumns: `repeat(${stats.length}, 1fr)`, gap: 12 }}>
                {stats.map((s, si) => (
                  <div key={si} style={{
                    background: 'var(--c-card)', border: `1px solid ${accent}33`,
                    borderRadius: 12, padding: '24px 20px', textAlign: 'center',
                    borderTop: `3px solid ${accent}`,
                  }}>
                    <div style={{ fontSize: 'clamp(28px,4.5vw,44px)', fontWeight: 900, color: accent, letterSpacing: '-1.5px', lineHeight: 1, marginBottom: 8 }}>{s.value}</div>
                    {s.label && <div style={{ fontSize: 13, color: 'var(--c-muted)', fontWeight: 500, lineHeight: 1.4 }}>{s.label}</div>}
                  </div>
                ))}
              </div>
            )
          }

          if (block.type === 'cta' && block.content) return (
            <div key={block.id} style={{ textAlign: 'center', padding: '16px 0' }}>
              <a
                href={block.url || undefined}
                target="_blank" rel="noopener noreferrer"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 10,
                  background: accent,
                  color: '#fff', fontSize: 16, fontWeight: 800,
                  padding: '16px 36px', borderRadius: 10,
                  textDecoration: 'none', letterSpacing: '-0.2px',
                  boxShadow: `0 2px 8px ${accent}33`,
                  transition: 'opacity 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.opacity = '0.88' }}
                onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
              >
                {block.content} <ArrowRight size={18} />
              </a>
            </div>
          )

          if (block.type === 'card') {
            const rows = (block.cardRows || []).filter(r => r.label || r.value)
            if (!block.cardTitle && rows.length === 0) return null
            return (
              <div key={block.id} style={{ background: 'var(--c-card)', border: '1px solid var(--c-border)', borderLeft: `4px solid ${accent}`, borderRadius: '0 12px 12px 0', padding: '22px 26px' }}>
                {block.cardTitle && (
                  <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--c-text)', marginBottom: rows.length ? 14 : 0 }}>{block.cardTitle}</div>
                )}
                {rows.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {rows.map((r, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 14 }}>
                        <span style={{ color: 'var(--c-muted)' }}>{r.label}</span>
                        <span style={{ color: 'var(--c-text)', fontWeight: 600, textAlign: 'right' }}>{r.value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          }

          if (block.type === 'divider') {
            const ds = block.dividerStyle || 'solid'
            if (ds === 'gradient') return (
              <div key={block.id} style={{ height: 2, borderRadius: 99, background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }} />
            )
            return (
              <div key={block.id} style={{ borderTop: `1.5px ${ds} ${accent}44`, borderRadius: 99 }} />
            )
          }

          return null
        }

        function renderOneSection(key) {
          if (key === 'problem')
            return !project.problem ? null : withSectionMedia(key,
              <div className="pv-section-card" style={{ background: 'var(--c-card)', border: '1px solid var(--c-border)', borderLeft: `4px solid ${hero.c1}`, borderRadius: '0 12px 12px 0', padding: '28px 32px' }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--c-muted)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Target size={13} /> O problema que resolve
                </div>
                <p style={{ margin: 0, fontSize: 'clamp(15px,2vw,18px)', color: 'var(--c-text)', lineHeight: 1.8, fontWeight: 400, overflowWrap: 'break-word' }}>{project.problem}</p>
              </div>
            )

          if (key === 'solution')
            return !project.solution ? null : withSectionMedia(key,
              <div className="pv-section-card" style={{ background: 'var(--c-card)', border: '1px solid var(--c-border)', borderRadius: 12, padding: '28px 32px' }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: colors.blue, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Zap size={13} /> A solução
                </div>
                <p style={{ margin: 0, fontSize: 'clamp(15px,2vw,18px)', color: 'var(--c-text)', lineHeight: 1.8, fontWeight: 400, overflowWrap: 'break-word' }}>{project.solution}</p>
              </div>
            )

          if (key === 'target_audience')
            return !project.target_audience ? null : withSectionMedia(key,
              <div className="pv-section-card" style={{ background: 'var(--c-card)', border: '1px solid var(--c-border)', borderRadius: 12, padding: '28px 32px' }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--c-muted)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Users size={13} /> Público-alvo
                </div>
                <p style={{ margin: 0, fontSize: 'clamp(15px,2vw,18px)', color: 'var(--c-text)', lineHeight: 1.8, fontWeight: 400, overflowWrap: 'break-word' }}>{project.target_audience}</p>
              </div>
            )

          if (key === 'features')
            return features.length === 0 ? null : withSectionMedia(key,
              <div className="pv-section-card" style={{ background: 'var(--c-card)', border: '1px solid var(--c-border)', borderRadius: 12, padding: '28px 32px' }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--c-muted)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Wrench size={13} /> O que faz
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {features.slice(0, 8).map((f, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{ width: 22, height: 22, borderRadius: 6, flexShrink: 0, marginTop: 1, background: `${hero.c1}22`, border: `1px solid ${hero.c1}44`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <CheckCircle size={12} color={`${hero.c1}cc`} />
                      </div>
                      <span style={{ fontSize: 15, color: 'var(--c-text)', lineHeight: 1.6, overflowWrap: 'break-word' }}>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            )

          if (key === 'technologies')
            return tech.length === 0 ? null : withSectionMedia(key,
              <div className="pv-section-card" style={{ background: 'var(--c-card)', border: '1px solid var(--c-border)', borderRadius: 12, padding: '28px 32px' }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--c-muted)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Zap size={13} /> Tecnologias
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, fontSize: 14, color: 'var(--c-text)', fontWeight: 500 }}>
                  {tech.map((t, i) => (
                    <span key={i}>{t}{i < tech.length - 1 ? <span style={{ color: 'var(--c-subtle)', margin: '0 8px' }}>·</span> : null}</span>
                  ))}
                </div>
              </div>
            )

          if (key === 'challenges')
            return !project.challenges ? null : withSectionMedia(key,
              <div className="pv-section-card" style={{ background: 'var(--c-card)', border: '1px solid var(--c-border)', borderLeft: '4px solid #f97316', borderRadius: '0 12px 12px 0', padding: '28px 32px' }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#f97316', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Zap size={13} /> Desafios
                </div>
                <p style={{ margin: 0, fontSize: 'clamp(15px,2vw,18px)', color: 'var(--c-text)', lineHeight: 1.8, fontWeight: 400, overflowWrap: 'break-word' }}>{project.challenges}</p>
              </div>
            )

          if (key === 'results')
            return !project.results ? null : withSectionMedia(key,
              <div className="pv-section-card" style={{ background: 'var(--c-card)', border: '1px solid var(--c-border)', borderRadius: 12, padding: '28px 32px' }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#22c55e', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <BarChart2 size={13} /> Resultados
                </div>
                <p style={{ margin: 0, fontSize: 'clamp(15px,2vw,18px)', color: 'var(--c-text)', lineHeight: 1.8, overflowWrap: 'break-word' }}>{project.results}</p>
              </div>
            )

          if (key === 'learnings')
            return !project.learnings ? null : withSectionMedia(key,
              <div className="pv-section-card" style={{ background: 'var(--c-card)', border: '1px solid var(--c-border)', borderRadius: 12, padding: '28px 32px' }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#8b5cf6', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <BookOpen size={13} /> Aprendizagens
                </div>
                <p style={{ margin: 0, fontSize: 'clamp(15px,2vw,18px)', color: 'var(--c-text)', lineHeight: 1.8, overflowWrap: 'break-word' }}>{project.learnings}</p>
              </div>
            )

          if (key === 'pap_supervisor')
            return !project.pap_supervisor ? null : withSectionMedia(key,
              <div className="pv-section-card" style={{ background: 'var(--c-card)', border: '1px solid var(--c-border)', borderRadius: 12, padding: '24px 32px', display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, background: 'rgba(27,120,247,0.12)', border: '1px solid rgba(27,120,247,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <GraduationCap size={18} color="#1b78f7" />
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--c-muted)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 3 }}>Orientador</div>
                  <p style={{ margin: 0, fontSize: 16, color: 'var(--c-text)', fontWeight: 600 }}>{project.pap_supervisor}</p>
                </div>
              </div>
            )

          return null
        }

        // Unified layout order — custom blocks and native sections interleaved
        // freely, in whatever order the owner dragged them in the Secções tab.
        // Falls back to "all blocks, then all sections" for projects saved
        // before this existed, so nothing shifts for existing customizations.
        const blocksById = Object.fromEntries(previewBlocks.map(b => [b.id, b]))
        const defaultLayout = [
          ...previewBlocks.map(b => ({ kind: 'block', id: b.id })),
          ...orderedSections.map(key => ({ kind: 'section', key })),
        ]
        const layout = (previewStyle.layoutOrder?.length ? previewStyle.layoutOrder : defaultLayout)
          .filter(item => item.kind === 'block' ? !!blocksById[item.id] : !hiddenSections.has(item.key))
          // In canvas mode, custom blocks are drawn freely-positioned above
          // (see canvasMode block below) instead of inline in the flow.
          .filter(item => !previewStyle.canvasMode || item.kind !== 'block')

        // A "half" block pairs with whatever comes right after it (block or
        // section) into a side-by-side row — one toggle is enough to see it,
        // no need to also mark the neighbour as half.
        const groups = []
        for (let i = 0; i < layout.length; i++) {
          const item = layout[i]
          const isHalfBlock = item.kind === 'block' && blocksById[item.id]?.width === 'half'
          const next = layout[i + 1]
          if (isHalfBlock && next) {
            groups.push([item, next]); i++
          } else {
            groups.push([item])
          }
        }

        function renderItem(item) {
          return item.kind === 'block' ? renderOneBlock(blocksById[item.id]) : renderOneSection(item.key)
        }

        const canvas = previewStyle.canvasMode && previewBlocks.length > 0 && (
          <div
            key="canvas" ref={canvasRef}
            style={{
              position: 'relative', width: '100%', minHeight: 420,
              background: 'var(--c-bg-alt)', border: '1.5px dashed var(--c-border)', borderRadius: 14,
              overflow: isOwner && previewEditing ? 'visible' : 'hidden',
            }}
          >
            {previewBlocks.map(block => (
              <div
                key={block.id}
                onPointerDown={isOwner && previewEditing ? (e => onCanvasPointerDown(e, block)) : undefined}
                style={{
                  position: 'absolute',
                  left: `${block.pos?.x ?? 8}%`, top: `${block.pos?.y ?? 8}%`,
                  width: 'min(360px, 80%)',
                  cursor: isOwner && previewEditing ? 'grab' : 'default',
                  touchAction: 'none',
                }}
              >
                {renderOneBlock(block)}
              </div>
            ))}
          </div>
        )

        return [
          canvas,
          ...groups.map((g, gi) => g.length === 2 ? (
            <div key={gi} style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
              <div style={{ flex: '1 1 280px', minWidth: 0 }}>{renderItem(g[0])}</div>
              <div style={{ flex: '1 1 280px', minWidth: 0 }}>{renderItem(g[1])}</div>
            </div>
          ) : (
            <div key={gi}>{renderItem(g[0])}</div>
          )),
        ]
        })()}

        {/* Creator card */}
        {(displayName || course || school) && (
          <div style={{
            background: 'var(--c-card)', border: '1px solid var(--c-border)',
            borderRadius: 12, padding: '28px 32px',
            display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap',
          }}>
            {avatarUrl ? (
              <img src={avatarUrl} alt="" style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
            ) : displayName && (
              <div style={{
                width: 56, height: 56, borderRadius: '50%', flexShrink: 0,
                background: hero.c1,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, fontWeight: 800, color: '#fff',
              }}>{displayName[0]?.toUpperCase()}</div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                A história de {project.name}
              </div>
              {displayName && <div style={{ fontSize: 18, fontWeight: 400, fontFamily: 'var(--font-heading)', letterSpacing: '-0.01em', color: 'var(--c-text)', marginBottom: 4 }}>{displayName}</div>}
              {course && <div style={{ fontSize: 14, color: 'var(--c-muted)' }}>{course}{school ? ` · ${school}` : ''}</div>}
            </div>
            {ownerProfile?.username && (
              <button
                onClick={() => navigate(`/u/${ownerProfile.username}`)}
                style={{
                  background: '#1b78f7',
                  border: 'none', borderRadius: 8, padding: '10px 22px',
                  color: '#fff', fontSize: 13, fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
                  boxShadow: '0 2px 8px rgba(27,120,247,0.2)',
                }}
              >
                Ver perfil
              </button>
            )}
          </div>
        )}

        {/* ── Engagement: Gostos / Interesse + Comentários ── */}
        <div style={{ width: '100%' }}>

          {/* Barra de gostos / interesse */}
          {!isOwner && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0 16px', flexWrap: 'wrap' }}>

              {/* ❤️ Gostos — alunos, professores, visitantes */}
              {!isRecruiterRole && (
                <button
                  onClick={onLike}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 7,
                    background: liked ? 'rgba(239,68,68,0.1)' : 'var(--c-card)',
                    border: `1.5px solid ${liked ? 'rgba(239,68,68,0.35)' : 'var(--c-border)'}`,
                    borderRadius: 10, padding: '8px 16px',
                    color: liked ? '#ef4444' : 'var(--c-muted)',
                    fontSize: 14, fontWeight: 700, cursor: likeLoading ? 'default' : 'pointer',
                    fontFamily: 'inherit', transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { if (!liked) { e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)'; e.currentTarget.style.color = '#ef4444' }}}
                  onMouseLeave={e => { if (!liked) { e.currentTarget.style.borderColor = 'var(--c-border)'; e.currentTarget.style.color = 'var(--c-muted)' }}}
                >
                  <Heart size={16} fill={liked ? '#ef4444' : 'none'} />
                  {likeCount > 0 ? likeCount : ''} {likeCount === 1 ? 'gosto' : 'gostos'}
                </button>
              )}

              {/* ⭐ Tenho interesse — recrutadores e empresas */}
              {isRecruiterRole && !hasInterest && (
                <button
                  onClick={onInterest}
                  disabled={interestLoading}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    background: 'var(--c-card)',
                    border: '1.5px solid var(--c-border)',
                    borderRadius: 10, padding: '9px 20px',
                    color: 'var(--c-muted)',
                    fontSize: 14, fontWeight: 700, cursor: interestLoading ? 'default' : 'pointer',
                    fontFamily: 'inherit', transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(245,158,11,0.4)'; e.currentTarget.style.color = '#f59e0b'; e.currentTarget.style.background = 'rgba(245,158,11,0.07)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--c-border)'; e.currentTarget.style.color = 'var(--c-muted)'; e.currentTarget.style.background = 'var(--c-card)' }}
                >
                  <Star size={16} fill="none" />
                  {interestLoading ? 'A guardar…' : 'Tenho interesse'}
                </button>
              )}
            </div>
          )}

          {/* Confirmação de interesse: card com ações */}
          {isRecruiterRole && hasInterest && !isOwner && (
            <div style={{
              background: 'rgba(245,158,11,0.08)',
              border: '1.5px solid rgba(245,158,11,0.35)',
              borderRadius: 12, padding: '16px 20px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              flexWrap: 'wrap', gap: 12,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Star size={18} fill="#f59e0b" color="#f59e0b" />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#f59e0b' }}>Interesse guardado!</div>
                  <div style={{ fontSize: 12, color: 'var(--c-muted)', marginTop: 1 }}>
                    {ownerProfile?.full_name || ownerProfile?.username || 'O estudante'} foi notificado.
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {ownerProfile?.username && (
                  <a
                    href={`/u/${ownerProfile.username}`}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                      background: 'var(--c-card)', border: '1px solid var(--c-border)',
                      color: 'var(--c-text)', textDecoration: 'none',
                    }}
                  >
                    <UserPlus size={14} /> Ver perfil
                  </a>
                )}
                <a
                  href={`/mensagens${ownerProfile?.id ? `?to=${ownerProfile.id}` : ''}`}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                    background: '#f59e0b', border: 'none',
                    color: '#000', textDecoration: 'none',
                  }}
                >
                  <MessageSquare size={14} /> Enviar mensagem
                </a>
                <button
                  onClick={onInterest}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                    background: 'none', border: '1px solid rgba(245,158,11,0.3)',
                    color: 'rgba(245,158,11,0.7)', cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  <X size={12} /> Remover
                </button>
              </div>
            </div>
          )}

          {/* Comentários */}
          <div style={{ background: 'var(--c-card)', border: '1px solid var(--c-border)', borderRadius: 12, padding: '22px 24px' }}>
            <ProjectComments projectId={project.id} projectAuthorId={project.user_id} />
          </div>
        </div>

        {/* Rodapé personalizado */}
        {previewStyle.footerText && (
          <div style={{ textAlign: 'center', padding: '20px 0 8px', borderTop: '1px solid var(--c-border)', marginTop: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--c-subtle)', fontWeight: 500, letterSpacing: '0.03em' }}>{previewStyle.footerText}</span>
          </div>
        )}

      </div>{/* end story-sections wrapper */}
      </div>{/* end device-frame / CSS scope */}
      </div>{/* end preview scroll area */}
    </div>
  )
}

function MembersPanel({ ownerName, members, colors, isOwner }) {
  if (!ownerName && members.length === 0) return null
  const displayOwner = ownerName || 'Dono'

  const statusCfg = {
    accepted: { label: 'Colaborador', color: '#22c55e', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.25)', avatar: '#22c55e', dim: false },
    pending:  { label: 'Pendente', color: '#fbbf24', bg: 'rgba(234,179,8,0.1)',  border: 'rgba(234,179,8,0.25)',  avatar: '#ca8a04', dim: true  },
    declined: { label: 'Recusou',  color: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.25)', avatar: '#ef4444', dim: true  },
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
          <div style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, background: '#1b78f7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff' }}>
            {displayOwner[0]?.toUpperCase()}
          </div>
          <span style={{ fontSize: 14, fontWeight: 600, color: colors.text, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayOwner}</span>
          <span style={{ fontSize: 11, flexShrink: 0, background: 'rgba(27,120,247,0.1)', border: '1px solid rgba(27,120,247,0.25)', borderRadius: 5, padding: '2px 8px', color: colors.blue, fontWeight: 700 }}>Dono</span>
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
                      <span key={s} style={{ fontSize: 11, color: colors.muted, background: 'var(--c-bg-alt)', border: `1px solid ${colors.border}`, borderRadius: 4, padding: '1px 6px' }}>{s}</span>
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
  const [showLaunchOverlay, setShowLaunchOverlay] = useState(false)
  const [launchCopied, setLaunchCopied] = useState(false)
  const [claimBannerDismissed, setClaimBannerDismissed] = useState(false)
  const [defenseDate, setDefenseDate] = useState('')
  const [savingDefense, setSavingDefense] = useState(false)
  const [teacherFeedback, setTeacherFeedback] = useState([])
  const [showFeedbackForm, setShowFeedbackForm] = useState(false)
  const [fbComment, setFbComment] = useState('')
  const [fbFieldKey, setFbFieldKey] = useState('geral')
  const [fbSaving, setFbSaving] = useState(false)
  const [fbEditing, setFbEditing] = useState(null)

  const { setExtras } = useSidebar()
  const { theme } = useTheme()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [viewAsPublic, setViewAsPublic] = useState(false)
  const [previewEditing, setPreviewEditing] = useState(false)
  const [wsExpanded, setWsExpanded] = useState(false)
  const [previewBlocks, setPreviewBlocks] = useState([])
  const [previewStyle, setPreviewStyle] = useState({})
  const [previewDevice, setPreviewDevice] = useState('desktop')
  // Jury / professor ratings state
  const [juryRatings, setJuryRatings] = useState({})        // { criteriaId: 0-10 }
  const [juryNote, setJuryNote] = useState('')
  const [jurySaving, setJurySaving] = useState(false)
  const [jurySaved, setJurySaved] = useState(false)
  // Report generation state
  const [reportModal, setReportModal] = useState(false)
  const [reportData, setReportData] = useState(null)
  const [reportLoading, setReportLoading] = useState(false)
  const [reportError, setReportError] = useState(null)

  // Likes
  const [likeCount, setLikeCount]   = useState(0)
  const [liked, setLiked]           = useState(false)
  const [likeLoading, setLikeLoading] = useState(false)

  // Recruiter interest
  const [interestCount, setInterestCount]     = useState(0)
  const [hasInterest, setHasInterest]         = useState(false)
  const [interestLoading, setInterestLoading] = useState(false)
  const [interestors, setInterestors]         = useState([])   // recruiter profiles for owner modal
  const [showInterestors, setShowInterestors] = useState(false)

  const prevScoreRef = useRef(null)
  const rafRef = useRef(null)
  const autoSaveRef = useRef(null)
  const toastTimerRef = useRef(null)
  const cooldownRef = useRef(null)
  const membersChannelRef = useRef(null) // realtime channel — must be cleaned up on unmount

  // ── Auto-save: debounce 1.5s quando previewBlocks ou previewStyle muda ──
  useEffect(() => {
    if (!previewEditing || !project?.id) return
    clearTimeout(autoSaveRef.current)
    autoSaveRef.current = setTimeout(async () => {
      await supabase.from('projects')
        .update({ preview_blocks: previewBlocks, preview_style: previewStyle })
        .eq('id', project.id)
    }, 1500)
    return () => clearTimeout(autoSaveRef.current)
  }, [previewBlocks, previewStyle]) // eslint-disable-line

  // Show launch overlay for newly created projects
  useEffect(() => {
    if (location.state?.newProject) {
      setShowLaunchOverlay(true)
      window.history.replaceState({}, '')
    }
  }, [])

  // Populate sidebar with project controls when this is the owner's project
  useEffect(() => {
    if (!project || !user) { setExtras(null); return }
    // When logged in, only user_id match counts. Token is fallback for anonymous (no user_id) projects only.
    const owned = user.id === project.user_id ||
      (!project.user_id && !!localStorage.getItem(`edit_token_${project.slug}`))
    if (owned) {
      setExtras({
        type: 'project',
        slug: project.slug,
        title: project.name,
        defenseDate: project.defense_date,
        aiScore: project.ai_score,
        analyzingAI,
        viewAsPublic,
        showCertificate: score >= 100,
        onDefense: project.project_type === 'pap' ? () => setDefenseMode(true) : null,
        onAnalyze: handleAIClick,
        onTogglePublicView: () => {
          const entering = !viewAsPublic
          setViewAsPublic(entering)
          if (entering) { setPreviewEditing(true); setWsExpanded(true) }
        },
        previewEditing,
        onEditWorkspace: () => { setPreviewEditing(true); setWsExpanded(e => !e) },
        previewDevice,
        setPreviewDevice,
      })
    } else {
      setExtras(null)
    }
    return () => setExtras(null)
  }, [project?.id, project?.project_type, project?.defense_date, project?.ai_score, user?.id, analyzingAI, aiFeedback, viewAsPublic, score, previewEditing, previewDevice])

  const pageUrl = window.location.href

  // Effect 1: fetch project + public data — runs only when slug changes (never re-runs due to auth)
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

      if (data.ai_feedback) setAiFeedback(data.ai_feedback)
      if (data.defense_date) setDefenseDate(data.defense_date)
      if (Array.isArray(data.preview_blocks)) setPreviewBlocks(data.preview_blocks)
      if (data.preview_style && typeof data.preview_style === 'object') setPreviewStyle(data.preview_style)

      // Public likes count (no user needed)
      supabase.from('project_likes').select('user_id', { count: 'exact' }).eq('project_id', data.id).then(({ count }) => {
        setLikeCount(count || 0)
      })

      // Public recruiter interest count
      supabase.from('recruiter_interests').select('recruiter_id', { count: 'exact' }).eq('project_id', data.id).then(({ count }) => {
        setInterestCount(count || 0)
      })

      // Members + realtime channel
      async function loadMembers(projectId, isOwner) {
        const q = supabase.from('project_collaborators').select('user_id, status, sections').eq('project_id', projectId)
        const { data: rows } = isOwner ? await q : await q.eq('status', 'accepted')
        if (!rows?.length) { setMembers([]); return }
        const userIds = [...new Set(rows.map(r => r.user_id))]
        const { data: profiles } = await supabase.from('profiles').select('id, username, full_name').in('id', userIds)
        const profileMap = {}
        profiles?.forEach(p => { profileMap[p.id] = p })
        setMembers(rows.map(r => ({ ...r, profiles: profileMap[r.user_id] || null })))
      }
      // isOwner unknown at this point (user not yet resolved) — load accepted members only
      loadMembers(data.id, false)

      if (membersChannelRef.current) supabase.removeChannel(membersChannelRef.current)
      membersChannelRef.current = supabase
        .channel(`members-${data.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'project_collaborators', filter: `project_id=eq.${data.id}` },
          () => loadMembers(data.id, false))
        .subscribe()

      // Owner profile
      if (data.user_id) {
        supabase.from('profiles').select('id, username, full_name, avatar_url, available_for_work').eq('id', data.user_id).single()
          .then(({ data: prof }) => { if (prof) setOwnerProfile(prof) })
      }
    }

    fetchProject()
    return () => {
      if (membersChannelRef.current) {
        supabase.removeChannel(membersChannelRef.current)
        membersChannelRef.current = null
      }
    }
  }, [slug])

  // Effect 2: user-specific data — runs when auth resolves, never re-fetches the project
  useEffect(() => {
    if (!user?.id || !project?.id) return
    const pid = project.id
    const isOwner = user.id === project.user_id

    // User's own like
    supabase.from('project_likes').select('user_id').eq('project_id', pid).eq('user_id', user.id).maybeSingle()
      .then(({ data: l }) => setLiked(!!l))

    if (isOwner) {
      // Owner sees recruiter profiles
      supabase.from('recruiter_interests')
        .select('recruiter_id, profiles!recruiter_id(id, full_name, username, avatar_url, company, role)')
        .eq('project_id', pid)
        .then(({ data: rows }) => {
          setInterestCount(rows?.length || 0)
          setInterestors((rows || []).map(r => r.profiles).filter(Boolean))
        })
    } else {
      // Non-owner: check own recruiter interest + collaborator sections
      supabase.from('recruiter_interests').select('recruiter_id').eq('project_id', pid).eq('recruiter_id', user.id).single()
        .then(({ data: ri }) => setHasInterest(!!ri))

      supabase.from('project_collaborators').select('sections').eq('project_id', pid).eq('user_id', user.id).eq('status', 'accepted').single()
        .then(({ data: collab }) => { if (collab) setCollaboratorSections(collab.sections ?? []) })
    }

    // Teacher feedback
    supabase.from('teacher_feedback').select('*').eq('project_id', pid)
      .then(({ data: fb }) => { if (fb) setTeacherFeedback(fb) })
  }, [user?.id, project?.id])

  // View tracking + PROJECT_VIEW / COMPANY_VIEW notifications
  useEffect(() => {
    if (!project) return
    if (authLoading) return
    if (!user?.id) return
    // Logged-in users: only real owner skips view count. Token is irrelevant when authenticated.
    const isOwner = !!(project.user_id && user.id === project.user_id)
    if (isOwner) return

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

    // PROJECT_VIEW notification after 15s (max once per hour per project)
    const notifKey = `notified_view_${project.slug}`
    let t1 = null
    let t2 = null
    if (!sessionStorage.getItem(notifKey)) {
      t1 = setTimeout(() => {
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
      }, 15000)
    }

    // COMPANY_VIEW after 30s (max once per day per project)
    const companyKey = `company_view_${project.slug}`
    if (!sessionStorage.getItem(companyKey)) {
      t2 = setTimeout(() => {
        sessionStorage.setItem(companyKey, '1')
        supabase.functions.invoke('notify-view', { body: { project_slug: project.slug, type: 'COMPANY_VIEW', visitor_role: profile?.role ?? null } })
      }, 30000)
    }

    return () => {
      if (t1) clearTimeout(t1)
      if (t2) clearTimeout(t2)
    }
  }, [project?.id, user?.id, authLoading])

  useEffect(() => {
    if (prevScoreRef.current === null || prevScoreRef.current === score) return
    const from = prevScoreRef.current
    const to = score
    prevScoreRef.current = to
    // Show score-gain toast when score increases during the session
    if (to > from) {
      const gain = to - from
      setTimeout(() => triggerToast(`Score subiu +${gain} ${gain === 1 ? 'ponto' : 'pontos'}`), 900)
    }
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

  // ── Memoised derived values — must be before any early returns ──
  const level = useMemo(() => getLevelInfo(displayScore), [displayScore])
  const internshipReady = useMemo(
    () => !!(project && score > 80 && project.technologies?.trim() && project.results?.trim()),
    [score, project]
  )
  const sortedChallenges = useMemo(() => {
    if (!project) return [...CHALLENGES]
    return [...CHALLENGES].sort((a, b) => {
      const aCompleted = getChallengeStatus(a, project) === 'completed' ? 1 : 0
      const bCompleted = getChallengeStatus(b, project) === 'completed' ? 1 : 0
      return aCompleted - bCompleted
    })
  }, [project])
  const completedCount = useMemo(
    () => project ? CHALLENGES.filter(c => getChallengeStatus(c, project) === 'completed').length : 0,
    [project]
  )
  const earnedXP = useMemo(
    () => project ? CHALLENGES.reduce((sum, c) => sum + (getChallengeStatus(c, project) === 'completed' ? c.scoreGain : 0), 0) : 0,
    [project]
  )
  const totalXP = useMemo(() => CHALLENGES.reduce((sum, c) => sum + c.scoreGain, 0), [])

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
      const newDescription = Array.isArray(aiResult.historia)
        ? aiResult.historia.join('\n\n')
        : (aiResult.description ?? null)
      const { error } = await supabase
        .from('projects')
        .update({ ai_tagline: aiResult.tagline, ai_description: newDescription, ai_highlights: aiResult.highlights })
        .eq('id', project.id)
      if (!error) {
        setProject(p => ({ ...p, ai_tagline: aiResult.tagline, ai_description: newDescription, ai_highlights: aiResult.highlights }))
        triggerToast('A tua história foi atualizada!')
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
          <div className="sk" style={{ width: '100%', height: 200, borderRadius: 12, marginTop: 24 }} />
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
          <div className="sk" style={{ height: 140, width: '100%', marginTop: 20, borderRadius: 12, animationDelay: '0.3s' }} />
          <div className="sk" style={{ height: 100, width: '100%', marginTop: 14, borderRadius: 12, animationDelay: '0.35s' }} />
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: colors.bg, color: colors.text, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-body)', gap: 16, textAlign: 'center', padding: 24 }}>
        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 400, fontFamily: 'var(--font-heading)', letterSpacing: '-0.01em' }}>Este projeto não existe ou foi removido</h2>
        <p style={{ color: colors.muted, margin: 0 }}>O link pode estar incorrecto ou o projeto foi eliminado.</p>
        <button
          onClick={() => setShowCreateModal(true)}
          style={{ background: colors.blue, color: '#fff', border: 'none', borderRadius: 10, padding: '12px 28px', fontSize: 16, fontWeight: 700, cursor: 'pointer', marginTop: 8, boxShadow: '0 2px 8px rgba(27,120,247,0.2)', fontFamily: 'inherit' }}
        >
          <span style={{display:"flex",alignItems:"center",gap:6}}>Criar o meu projeto <ArrowRight size={15} /></span>
        </button>
        {showCreateModal && <CreateProjectModal onClose={() => setShowCreateModal(false)} />}
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
  const isPap = project.is_pap || project.project_type === 'pap'

  async function handleSaveDefenseDate(dateStr) {
    setDefenseDate(dateStr)
    setSavingDefense(true)
    await supabase.from('projects').update({ defense_date: dateStr || null }).eq('id', project.id)
    setProject(p => ({ ...p, defense_date: dateStr || null }))
    setSavingDefense(false)
  }

  const isOwner = user?.id
    ? (user.id === project.user_id)  // logged-in: only user_id match
    : !!localStorage.getItem(`edit_token_${project.slug}`)  // anonymous: token fallback
  const isProfessor = profile?.role === 'professor' && !isOwner && !!user?.id
  const isRecruiterRole = profile?.role === 'recrutador' || profile?.role === 'empresa'

  async function handleLike() {
    if (!user) { navigate('/login'); return }
    if (likeLoading) return
    setLikeLoading(true)
    if (liked) {
      await supabase.from('project_likes').delete().eq('project_id', project.id).eq('user_id', user.id)
      setLiked(false)
      setLikeCount(c => Math.max(0, c - 1))
    } else {
      await supabase.from('project_likes').insert({ project_id: project.id, user_id: user.id })
      setLiked(true)
      setLikeCount(c => c + 1)
      // Notificação gerada automaticamente pelo trigger notify_on_like() na DB
    }
    setLikeLoading(false)
  }

  async function handleInterest() {
    if (!user) { navigate('/login'); return }
    if (interestLoading) return
    setInterestLoading(true)
    if (hasInterest) {
      await supabase.from('recruiter_interests').delete().eq('project_id', project.id).eq('recruiter_id', user.id)
      setHasInterest(false)
      setInterestCount(c => Math.max(0, c - 1))
    } else {
      await supabase.from('recruiter_interests').insert({ project_id: project.id, recruiter_id: user.id })
      setHasInterest(true)
      setInterestCount(c => c + 1)
      // mensagem + bell notification geradas automaticamente pelo trigger notify_on_recruiter_interest()
    }
    setInterestLoading(false)
  }

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

  const scoreSuffix = project.score != null ? ` · Score ${project.score}` : ''
  const shareTitle = `${project.name} — Showo${scoreSuffix}`
  const shareDescription = project.ai_tagline || project.goal || `Projeto de ${project.creator_name || 'estudante'} no Showo`

  return (
    <div style={{ minHeight: '100vh', backgroundColor: colors.bg, color: colors.text, fontFamily: 'var(--font-body)', overflowX: 'clip' }}>
      <Helmet>
        <title>{shareTitle}</title>
        <meta name="description" content={shareDescription} />
        {/* Open Graph — WhatsApp, Facebook, LinkedIn */}
        <meta property="og:title" content={shareTitle} />
        <meta property="og:description" content={shareDescription} />
        <meta property="og:url" content={pageUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Showo" />
        {project.cover_url
          ? <meta property="og:image" content={project.cover_url} />
          : <meta property="og:image" content={`${window.location.origin}/og-default.png`} />}
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        {/* Twitter / X */}
        <meta name="twitter:card" content={project.cover_url ? 'summary_large_image' : 'summary'} />
        <meta name="twitter:title" content={shareTitle} />
        <meta name="twitter:description" content={shareDescription} />
        {project.cover_url && <meta name="twitter:image" content={project.cover_url} />}
      </Helmet>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes sparkle-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(139,92,246,0.5); }
          50%       { box-shadow: 0 0 0 10px rgba(139,92,246,0); }
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
          border-radius: 12px;
          padding: 20px 22px;
          box-shadow: none;
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
        /* FABs: visible on mobile, hidden on desktop (controls are in sidebar) */
        .proj-fab-area       { display: none; }
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
          /* FABs visible on mobile (no sidebar available) */
          .proj-fab-area     { display: flex !important; }
          .proj-ai-fab       { display: flex !important; }
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
          .proj-h1           { font-size: 32px !important; }
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
        ${viewAsPublic ? `
          /* ── Preview mode: the sidebar stays visible (so the owner can keep
             navigating the app) — .pv-outer already offsets to clear it. ── */
          .top-nav          { display: none !important; }
          .bottom-nav       { display: none !important; }
        ` : ''}
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
      {showCreateModal && <CreateProjectModal onClose={() => setShowCreateModal(false)} />}

      {/* ── Report Generation Modal ── */}
      {reportModal && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 16px', background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)' }}
          onClick={() => setReportModal(false)}
        >
          <div
            style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 14, padding: '28px', maxWidth: 660, width: '100%', maxHeight: '88vh', overflowY: 'auto', position: 'relative', boxShadow: 'none' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <FileText size={18} color="#10b981" />
              </div>
              <div style={{ flex: 1 }}>
                <h2 style={{ margin: 0, fontSize: 17, fontWeight: 400, fontFamily: 'var(--font-heading)', letterSpacing: '-0.01em', color: colors.text }}>
                  Rascunho de {project.project_type === 'pap' ? 'Relatório PAP' : 'Relatório de Estágio'}
                </h2>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: colors.muted }}>Gerado por IA · revê e adapta antes de entregar</p>
              </div>
              <button onClick={() => setReportModal(false)} style={{ background: 'none', border: 'none', color: colors.muted, cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' }}><X size={18} /></button>
            </div>

            {reportLoading && (
              <div style={{ textAlign: 'center', padding: '48px 0', color: colors.muted }}>
                <div style={{ width: 32, height: 32, border: `2px solid ${colors.border}`, borderTop: '2px solid #10b981', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 14px' }} />
                <p style={{ margin: 0, fontSize: 14 }}>A gerar rascunho com IA…<br/><span style={{ fontSize: 12 }}>Pode demorar até 30 segundos</span></p>
              </div>
            )}

            {reportError && (
              <div style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, padding: '16px', color: '#ef4444', fontSize: 13 }}>
                {reportError}
                <button onClick={async () => { setReportError(null); setReportLoading(true); try { const d = await generateReport(project, project.project_type); setReportData(d) } catch(e) { setReportError(e.message) } setReportLoading(false) }} style={{ marginLeft: 12, background: 'none', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 6, padding: '3px 10px', color: '#ef4444', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12 }}>Tentar novamente</button>
              </div>
            )}

            {reportData && !reportLoading && (() => {
              const sections = [
                { key: 'resumo',        label: 'Resumo Executivo' },
                { key: 'introducao',    label: '1. Introdução' },
                { key: 'problema',      label: '2. Identificação do Problema' },
                { key: 'solucao',       label: '3. Solução Desenvolvida' },
                { key: 'desenvolvimento', label: '4. Desenvolvimento' },
                { key: 'resultados',    label: '5. Resultados' },
                { key: 'reflexao',      label: '6. Reflexão Crítica' },
                { key: 'conclusao',     label: '7. Conclusão' },
              ]
              const fullText = sections.map(s => `${s.label}\n\n${reportData[s.key] || ''}`).join('\n\n───\n\n')
              return (
                <>
                  <button
                    onClick={() => { navigator.clipboard.writeText(fullText); triggerToast('Relatório copiado!') }}
                    style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 9, padding: '8px 16px', color: '#10b981', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 20, transition: 'all 0.14s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(16,185,129,0.16)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(16,185,129,0.1)'}
                  >
                    <Copy size={13} /> Copiar relatório completo
                  </button>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                    {sections.map((s, i) => reportData[s.key] ? (
                      <div key={s.key} style={{ paddingBottom: 22, borderBottom: i < sections.length - 1 ? `1px solid ${colors.border}` : 'none', marginBottom: i < sections.length - 1 ? 22 : 0 }}>
                        <h3 style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 800, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</h3>
                        <p style={{ margin: 0, fontSize: 14, color: colors.text, lineHeight: 1.85, whiteSpace: 'pre-wrap' }}>{reportData[s.key]}</p>
                      </div>
                    ) : null)}
                  </div>
                  <p style={{ margin: '20px 0 0', fontSize: 11, color: colors.subtle, lineHeight: 1.5, fontStyle: 'italic' }}>
                    Este é um rascunho gerado por IA. Revê com atenção, adapta ao teu estilo e verifica com o teu orientador antes de entregar.
                  </p>
                </>
              )
            })()}</div>
        </div>
      )}

      {/* ── Launch overlay (shown once after project creation) ── */}
      {showLaunchOverlay && project && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px 16px',
            background: 'rgba(7,13,26,0.96)',
            backdropFilter: 'blur(16px)',
            animation: 'fadeIn 0.4s ease',
          }}
          onClick={() => setShowLaunchOverlay(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 440,
              background: '#152030',
              border: '1px solid rgba(27,120,247,0.35)',
              borderRadius: 14,
              padding: '44px 36px 36px',
              textAlign: 'center',
              position: 'relative',
              boxShadow: 'none',
              overflow: 'hidden',
            }}
          >
            {/* Glow blobs */}
            <div style={{ position: 'absolute', top: -80, left: '50%', transform: 'translateX(-50%)', width: 360, height: 360, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(27,120,247,0.16) 0%, transparent 70%)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: -60, right: -40, width: 240, height: 240, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(79,70,229,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />

            {/* Star icon */}
            <div style={{ fontSize: 40, marginBottom: 20, lineHeight: 1, position: 'relative', color: '#1b78f7', letterSpacing: 4 }}>✦</div>

            <h2 style={{
              margin: '0 0 10px',
              fontFamily: 'var(--font-heading)',
              fontSize: 28,
              fontWeight: 400,
              color: '#e8f2ff',
              letterSpacing: '-0.02em',
              lineHeight: 1.2,
              position: 'relative',
            }}>
              O teu projeto está no ar.
            </h2>

            <p style={{
              margin: '0 0 28px',
              fontSize: 16,
              color: 'rgba(232,242,255,0.6)',
              lineHeight: 1.6,
              position: 'relative',
            }}>
              Partilha com alguém que importa.
            </p>

            {/* URL copy field */}
            <div style={{
              display: 'flex',
              gap: 8,
              marginBottom: 16,
              position: 'relative',
            }}>
              <input
                readOnly
                value={`${window.location.origin}/projeto/${project.slug}`}
                style={{
                  flex: 1,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(27,120,247,0.25)',
                  borderRadius: 10,
                  padding: '11px 14px',
                  fontSize: 13,
                  color: 'rgba(232,242,255,0.7)',
                  fontFamily: 'monospace',
                  outline: 'none',
                  cursor: 'text',
                  minWidth: 0,
                }}
                onFocus={e => e.target.select()}
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/projeto/${project.slug}`)
                  setLaunchCopied(true)
                  setTimeout(() => setLaunchCopied(false), 2500)
                }}
                style={{
                  background: launchCopied ? 'rgba(34,197,94,0.15)' : 'rgba(27,120,247,0.15)',
                  border: `1px solid ${launchCopied ? 'rgba(34,197,94,0.4)' : 'rgba(27,120,247,0.4)'}`,
                  borderRadius: 10,
                  padding: '11px 16px',
                  cursor: 'pointer',
                  color: launchCopied ? '#22c55e' : '#5a9ff5',
                  fontSize: 13,
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s',
                  flexShrink: 0,
                }}
              >
                {launchCopied ? '✓ Copiado' : 'Copiar'}
              </button>
            </div>

            {/* CTA button */}
            <button
              onClick={() => setShowLaunchOverlay(false)}
              style={{
                display: 'block',
                width: '100%',
                background: '#1b78f7',
                border: 'none',
                borderRadius: 10,
                padding: '14px 24px',
                color: '#fff',
                fontSize: 16,
                fontWeight: 700,
                cursor: 'pointer',
                letterSpacing: '-0.2px',
                boxShadow: '0 2px 8px rgba(27,120,247,0.2)',
                transition: 'opacity 0.15s',
                position: 'relative',
              }}
              onMouseEnter={e => { e.currentTarget.style.opacity = '0.88' }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
            >
              Ver a minha página →
            </button>

            {!user && (
              <div style={{
                marginTop: 18, paddingTop: 18,
                borderTop: '1px solid rgba(255,255,255,0.08)',
                position: 'relative',
              }}>
                <p style={{ margin: '0 0 12px', fontSize: 13, color: 'rgba(232,242,255,0.55)', lineHeight: 1.6 }}>
                  Criaste este projeto sem conta — se perderes o link, não há forma de o recuperar.
                  Cria uma conta para o guardar.
                </p>
                <button
                  onClick={() => navigate('/register', { state: { claimSlug: project.slug } })}
                  style={{
                    display: 'block', width: '100%',
                    background: 'transparent',
                    border: '1px solid rgba(27,120,247,0.4)',
                    borderRadius: 10, padding: '11px 24px',
                    color: '#5a9ff5', fontSize: 14, fontWeight: 700,
                    cursor: 'pointer', letterSpacing: '-0.2px',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(27,120,247,0.1)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                >
                  Criar conta e guardar projeto
                </button>
              </div>
            )}
          </div>
        </div>
      )}

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
              background: 'var(--c-card)',
              border: '1px solid rgba(27,120,247,0.35)',
              borderRadius: 14,
              padding: '36px 32px',
              textAlign: 'center',
              position: 'relative',
              boxShadow: 'none',
              overflow: 'hidden',
            }}
          >
            {/* Glow blobs */}
            <div style={{ position: 'absolute', top: -60, left: '50%', transform: 'translateX(-50%)', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(27,120,247,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: -40, right: -40, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(79,70,229,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />

            {/* Icon */}
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center', position: 'relative' }}>
              {milestoneCard.score >= 90
                ? <Trophy size={52} color="#22c55e" />
                : milestoneCard.score >= 70
                ? <Rocket size={52} color={colors.blue} />
                : <Target size={52} color="#fbbf24" />}
            </div>

            {/* Title */}
            <div style={{ fontSize: 13, fontWeight: 700, color: colors.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8, position: 'relative' }}>
              Marco desbloqueado
            </div>
            <div style={{ fontSize: 28, fontWeight: 400, fontFamily: 'var(--font-heading)', color: colors.text, letterSpacing: '-0.02em', marginBottom: 6, position: 'relative' }}>
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
              borderRadius: 8, padding: '6px 20px', marginBottom: 28,
              color: milestoneCard.score >= 90 ? '#22c55e' : milestoneCard.score >= 70 ? colors.blue : '#fbbf24',
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
                  background: '#1b78f7',
                  border: 'none', borderRadius: 10,
                  padding: '13px 0', color: '#fff',
                  fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                  boxShadow: '0 2px 8px rgba(27,120,247,0.2)',
                }}
              >
                Copiar link
              </button>
              <button
                onClick={() => setMilestoneCard(null)}
                style={{
                  flex: 1,
                  background: 'var(--c-card-hover)',
                  border: `1px solid ${colors.border}`, borderRadius: 10,
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
              borderRadius: 14,
              padding: '28px',
              maxWidth: 660,
              width: '100%',
              maxHeight: '85vh',
              overflowY: 'auto',
              position: 'relative',
              boxShadow: 'none',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Close */}
            <button
              onClick={() => setAiModalOpen(false)}
              style={{
                position: 'absolute', top: 16, right: 16,
                background: 'var(--c-card-hover)',
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
                  <h3 style={{ margin: 0, fontSize: 17, fontWeight: 400, fontFamily: 'var(--font-heading)', letterSpacing: '-0.01em' }}>Análise da IA</h3>
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
                    background: analyzingAI ? 'rgba(27,120,247,0.08)' : aiFeedback ? 'rgba(27,120,247,0.1)' : '#1b78f7',
                    border: analyzingAI || aiFeedback ? `1px solid ${colors.blue}30` : 'none',
                    borderRadius: 8, padding: '8px 16px',
                    color: analyzingAI || aiFeedback ? colors.blue : '#fff',
                    fontSize: 12, fontWeight: 700,
                    cursor: analyzingAI ? 'default' : 'pointer',
                    fontFamily: 'inherit',
                    boxShadow: analyzingAI || aiFeedback ? 'none' : '0 2px 8px rgba(27,120,247,0.2)',
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
                {/* Summary */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: colors.muted, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>Resumo</div>
                  <p style={{ margin: 0, fontSize: 13.5, color: 'var(--c-text)', lineHeight: 1.6 }}>
                    {aiFeedback.overall}
                  </p>
                  {aiFeedback.score_hint && (
                    <div style={{ marginTop: 10, display: 'inline-flex', alignItems: 'flex-start', gap: 6, fontSize: 12, color: colors.blue, fontWeight: 600, background: 'rgba(27,120,247,0.08)', border: '1px solid rgba(27,120,247,0.18)', borderRadius: 8, padding: '7px 10px' }}>
                      <Lightbulb size={13} style={{ flexShrink: 0, marginTop: 1 }} />
                      <span>{aiFeedback.score_hint}</span>
                    </div>
                  )}
                </div>

                {aiFeedback.sections && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: colors.muted, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>Por secção</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 8 }}>
                      {Object.entries(aiFeedback.sections).map(([key, sec]) => {
                        const LABELS = { goal: 'Objetivo', problem: 'Problema', solution: 'Solução', target_audience: 'Público-alvo', features: 'Funcionalidades', technologies: 'Tecnologias', results: 'Resultados', learnings: 'Aprendizagens' }
                        const ICONS = { goal: Target, problem: AlertTriangle, solution: Wrench, target_audience: Users, features: Zap, technologies: Wrench, results: TrendingUp, learnings: BookOpen }
                        const SecIcon = ICONS[key] || CheckCircle
                        const ratingColor = sec.rating === 'forte' ? colors.green : sec.rating === 'médio' ? colors.yellow : colors.orange
                        return (
                          <div key={key} style={{ background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 10, padding: '12px 14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7 }}>
                              <span style={{ width: 7, height: 7, borderRadius: '50%', background: ratingColor, flexShrink: 0 }} />
                              <SecIcon size={13} color={colors.muted} style={{ flexShrink: 0 }} />
                              <span style={{ fontSize: 12, fontWeight: 700, color: colors.text }}>{LABELS[key] || key}</span>
                            </div>
                            <p style={{ margin: 0, fontSize: 12, color: colors.muted, lineHeight: 1.5 }}>{sec.feedback}</p>
                            {sec.tip && (
                              <p style={{ margin: '8px 0 0', fontSize: 12, color: colors.blue, lineHeight: 1.45, display: 'flex', alignItems: 'flex-start', gap: 5, paddingTop: 8, borderTop: `1px solid ${colors.border}` }}>
                                <ChevronRight size={12} style={{ flexShrink: 0, marginTop: 2 }} /> <span>{sec.tip}</span>
                              </p>
                            )}
                          </div>
                        )
                      })}
                    </div>
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
              background: '#6d28d9',
              border: 'none',
              color: '#fff', cursor: analyzingAI ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              animation: analyzingAI ? 'none' : 'sparkle-pulse 2s ease-in-out infinite',
              opacity: analyzingAI ? 0.7 : 1,
              boxShadow: 'none',
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
              boxShadow: 'none',
              backdropFilter: 'blur(8px)',
              fontFamily: 'inherit', fontSize: 14, fontWeight: 700,
            }}
          >
            <GraduationCap size={22} />
            <span className="proj-fab-defense-label">Defesa</span>
          </button>
        )}
      </div>

      <Navbar
        showCreateProject={true}
        previewEditingMobile={isOwner && viewAsPublic}
        onWorkspaceToggle={() => { setPreviewEditing(true); setWsExpanded(e => !e) }}
      >
        <div className="proj-nav-btns" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isOwner && (
            <button
              onClick={() => navigate(`/projeto/${project.slug}/gerir`)}
              style={{
                background: 'rgba(27,120,247,0.08)',
                border: '1px solid rgba(27,120,247,0.25)',
                color: '#1b78f7',
                borderRadius: 8, padding: '8px 14px',
                fontSize: 13, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', gap: 6,
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(27,120,247,0.14)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(27,120,247,0.08)'}
              title="Gerir projeto"
            >
              <Settings size={15} /> Gerir
            </button>
          )}
        </div>
      </Navbar>

      {isOwner && !user && !claimBannerDismissed && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14,
          flexWrap: 'wrap', padding: '10px 20px',
          background: 'rgba(27,120,247,0.08)', borderBottom: '1px solid rgba(27,120,247,0.2)',
        }}>
          <span style={{ fontSize: 13, color: 'var(--c-muted)', fontWeight: 500 }}>
            Este projeto não tem conta associada — se perderes o link, não há forma de o recuperar.
          </span>
          <button
            onClick={() => navigate('/register', { state: { claimSlug: project.slug } })}
            style={{
              background: '#1b78f7', border: 'none', borderRadius: 7,
              padding: '6px 14px', color: '#fff', fontSize: 13, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
            }}
          >
            Criar conta e guardar
          </button>
          <button
            onClick={() => setClaimBannerDismissed(true)}
            style={{ background: 'none', border: 'none', color: 'var(--c-muted)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}
          >
            Agora não
          </button>
        </div>
      )}

      {/* ── Public visitor view (pure visitors + owners in preview mode) ── */}
      {((!isOwner && collaboratorSections === null && !isProfessor) || (isOwner && viewAsPublic)) && (
        <PublicView
          project={project}
          ownerProfile={ownerProfile}
          isOwner={isOwner}
          onExitPreview={() => { setViewAsPublic(false); setPreviewEditing(false) }}
          previewBlocks={previewBlocks}
          setPreviewBlocks={setPreviewBlocks}
          previewStyle={previewStyle}
          setPreviewStyle={setPreviewStyle}
          previewEditing={previewEditing}
          setPreviewEditing={setPreviewEditing}
          liked={liked}
          likeCount={likeCount}
          likeLoading={likeLoading}
          onLike={handleLike}
          hasInterest={hasInterest}
          interestCount={interestCount}
          interestLoading={interestLoading}
          onInterest={handleInterest}
          isRecruiterRole={isRecruiterRole}
          wsExpanded={wsExpanded}
          setWsExpanded={setWsExpanded}
          onCoverChange={url => setProject(p => ({ ...p, cover_url: url }))}
          previewDevice={previewDevice}
          setPreviewDevice={setPreviewDevice}
        />
      )}

      {/* ── Owner / collaborator / professor view ── */}
      {(isOwner || collaboratorSections !== null || isProfessor) && !viewAsPublic && (<>

      {/* Full-width hero — cover image or rich area gradient */}
      {(() => {
        const ag = getAreaGradient(project.area)
        return (
          <div style={{ position: 'relative', width: '100%', overflow: 'hidden' }}>
            {project.cover_url ? (
              <div className="proj-cover" style={{ width: '100%', height: 320, position: 'relative' }}>
                <img src={project.cover_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                {/* Strong dark gradient overlay for text legibility */}
                <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to bottom, transparent 0%, var(--c-bg) 100%)` }} />
              </div>
            ) : (
              <div style={{
                width: '100%', height: 260,
                background: `linear-gradient(160deg, ${ag.g1} 0%, ${ag.g2} 100%)`,
                position: 'relative', overflow: 'hidden',
              }}>
                {/* Large ambient glow blobs */}
                <div style={{ position: 'absolute', top: -80, left: '-5%', width: 500, height: 500, borderRadius: '50%', background: `radial-gradient(ellipse, ${ag.accent1}22 0%, transparent 60%)`, pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', top: -40, right: '-5%', width: 380, height: 380, borderRadius: '50%', background: `radial-gradient(ellipse, ${ag.accent2}18 0%, transparent 60%)`, pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', bottom: -60, left: '30%', width: 300, height: 300, borderRadius: '50%', background: `radial-gradient(ellipse, ${ag.accent1}14 0%, transparent 70%)`, pointerEvents: 'none' }} />
                {/* Fade to page background at bottom */}
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 35%, var(--c-bg) 100%)' }} />
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
                  <span style={{
                    color: hero.c1,
                    fontSize: 12, fontWeight: 700, letterSpacing: '0.06em',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}>
                    {hero.Icon && <hero.Icon size={12} />} {PROJECT_TYPE_LABELS[project.project_type].toUpperCase()}
                  </span>
                )}
                {project.area && (
                  <>
                    {project.project_type && PROJECT_TYPE_LABELS[project.project_type] && <span style={{ color: colors.subtle, fontSize: 12 }}>·</span>}
                    <span style={{ color: colors.blue, fontSize: 12, fontWeight: 600 }}>
                      {project.area}
                    </span>
                  </>
                )}

                {/* Tags */}
                {project.tags && project.tags.length > 0 && project.tags.map((tag, i) => (
                  <span key={tag} style={{ color: 'var(--c-muted)', fontSize: 12, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}>
                    {(i > 0 || project.area || (project.project_type && PROJECT_TYPE_LABELS[project.project_type])) && <span style={{ color: colors.subtle }}>·</span>}
                    {tag}
                  </span>
                ))}

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
                        borderRadius: 8, padding: '5px 12px', color: colors.blue,
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

          {/* Title row — Syne font, large */}
          <div className="proj-h1-row" style={{ alignItems: 'flex-start' }}>
            <h1 className="proj-h1" style={{
              fontSize: 'clamp(34px, 5.5vw, 48px)',
              fontWeight: 500,
              margin: 0,
              lineHeight: 1.08,
              letterSpacing: '-0.02em',
              flex: 1,
              fontFamily: 'var(--font-heading)',
              color: colors.text,
            }}>
              {project.name}
            </h1>
            {/* Views — eye icon, hover/click to reveal count */}
            <div
              className={`proj-views-widget${viewsExpanded ? ' expanded' : ''}`}
              onClick={() => setViewsExpanded(v => !v)}
              title={`${project.views ?? 0} visualizações`}
              style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', color: colors.muted, flexShrink: 0, padding: '4px 6px', borderRadius: 6, marginTop: 8 }}
            >
              <Eye size={14} color={colors.muted} />
              <span className="proj-views-count" style={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>
                {project.views ?? 0}
              </span>
            </div>
          </div>

          {project.ai_tagline && (
            <p className="proj-tagline" style={{ fontSize: 20, color: 'var(--c-muted)', lineHeight: 1.55, margin: '16px 0 18px', maxWidth: 600, fontWeight: 400, letterSpacing: '-0.1px' }}>
              {project.ai_tagline}
            </p>
          )}

          {/* Student identity line — name · area · course + status badges */}
          {(project.creator_name || project.area || project.course || internshipReady || ownerProfile?.available_for_work) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
              {/* "Disponível" — briefcase badge */}
              {ownerProfile?.available_for_work && (
                <div
                  title="Disponível para trabalho / estágio"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    background: 'rgba(16,185,129,0.1)', color: '#10b981',
                    border: '1px solid rgba(16,185,129,0.25)',
                    borderRadius: 999, padding: '4px 12px',
                    fontSize: 11, fontWeight: 700, lineHeight: 1.5,
                    cursor: 'default',
                  }}
                >
                  <Briefcase size={11} strokeWidth={2.5} />
                  Disponivel para estágio
                </div>
              )}
              {[project.creator_name, project.area, project.course, project.school_year]
                .filter(Boolean)
                .map((item, i) => (
                  <span key={i} style={{ fontSize: 13, color: colors.muted, display: 'flex', alignItems: 'center', gap: 8 }}>
                    {i > 0 && <span style={{ color: colors.subtle, fontSize: 11 }}>·</span>}
                    {item}
                  </span>
                ))}
            </div>
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
                borderRadius: 6, padding: '3px 10px', fontSize: 12, fontWeight: 700,
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

          {/* Score ring — right flex column — secondary, smaller */}
          <div className="proj-score-abs" style={{
            flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingTop: 4,
          }}>
            <ScoreRing score={displayScore} size={84} />
            <div style={{
              background: level.color + '12', color: level.color,
              borderRadius: 999, padding: '3px 10px',
              fontSize: 9, fontWeight: 700, border: `1px solid ${level.color}30`,
              textAlign: 'center', maxWidth: 120, lineHeight: 1.5, letterSpacing: 0.4,
              textTransform: 'uppercase',
            }}>
              {level.label}
            </div>
          </div>
          </div>{/* end flex row */}
        </div>{/* end proj-hero */}

        {/* proj-body: everything after hero — ordered after sidebar on tablet/mobile */}
        <div className="proj-body">

        {/* ── Owner mini-dashboard: defense / AI analysis / report ── */}
        {isOwner && (() => {
          const isPapOrInternship = project.project_type === 'pap' || project.project_type === 'internship'
          const today = new Date(); today.setHours(0,0,0,0)
          const target = defenseDate ? new Date(defenseDate + 'T00:00:00') : null
          const daysLeft = target ? Math.ceil((target - today) / 86400000) : null
          const urgentColor = daysLeft != null && daysLeft <= 7 ? '#ef4444' : daysLeft != null && daysLeft <= 30 ? '#f97316' : '#1b78f7'

          const miniCardBase = {
            borderRadius: 12, padding: '12px 14px',
            display: 'flex', flexDirection: 'column', gap: 6,
            cursor: 'pointer', fontFamily: 'inherit',
            textAlign: 'left', transition: 'all 0.15s',
            border: '1px solid var(--c-border)',
            background: 'var(--c-bg-alt)',
          }

          return (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10, marginBottom: 4 }}>

              {/* PAP defense date */}
              {project.project_type === 'pap' && (
                <div style={{ ...miniCardBase, background: `rgba(${urgentColor === '#ef4444' ? '239,68,68' : urgentColor === '#f97316' ? '249,115,22' : '27,120,247'},0.05)`, border: `1px solid ${urgentColor}30`, position: 'relative' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: `${urgentColor}15`, border: `1px solid ${urgentColor}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Calendar size={13} color={urgentColor} />
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: daysLeft != null && daysLeft <= 7 ? '#ef4444' : colors.text, flex: 1, minWidth: 0 }}>
                      {daysLeft === null ? 'Data de defesa' :
                       daysLeft < 0 ? 'Defesa concluída' :
                       daysLeft === 0 ? 'Hoje!' :
                       daysLeft === 1 ? 'Amanhã!' :
                       `${daysLeft}d restantes`}
                    </div>
                  </div>
                  <input
                    type="date"
                    value={defenseDate}
                    onChange={e => handleSaveDefenseDate(e.target.value)}
                    onClick={e => e.stopPropagation()}
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      background: 'var(--c-card)', border: `1px solid ${colors.border}`,
                      borderRadius: 6, padding: '5px 8px', color: colors.text,
                      fontSize: 11, fontFamily: 'inherit', cursor: 'pointer', outline: 'none',
                      colorScheme: theme === 'light' ? 'light' : 'dark',
                    }}
                  />
                  {savingDefense && <div style={{ position: 'absolute', top: 8, right: 8, width: 10, height: 10, border: `1.5px solid ${colors.border}`, borderTop: `1.5px solid ${colors.blue}`, borderRadius: '50%', animation: 'spin 1s linear infinite' }} />}
                </div>
              )}

              {/* Report generation */}
              {isPapOrInternship && (
                <button
                  onClick={async () => {
                    if (reportData) { setReportModal(true); return }
                    setReportLoading(true); setReportError(null); setReportModal(true)
                    try {
                      const data = await generateReport(project, project.project_type)
                      setReportData(data)
                    } catch (e) {
                      setReportError(e.message || 'Erro ao gerar relatório')
                    }
                    setReportLoading(false)
                  }}
                  style={{ ...miniCardBase, background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.2)' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(16,185,129,0.1)'; e.currentTarget.style.borderColor = 'rgba(16,185,129,0.35)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(16,185,129,0.05)'; e.currentTarget.style.borderColor = 'rgba(16,185,129,0.2)' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <FileText size={14} color="#10b981" />
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#10b981' }}>Rascunho</div>
                    {reportData && <Check size={11} color="#22c55e" style={{ marginLeft: 'auto' }} />}
                  </div>
                  <div style={{ fontSize: 11, color: colors.muted, lineHeight: 1.4 }}>
                    {reportData ? 'Ver rascunho gerado' : `Gerar relatório ${project.project_type === 'pap' ? 'PAP' : 'estágio'}`}
                  </div>
                </button>
              )}
            </div>
          )
        })()}

        {/* AI Analysis teaser for non-owners */}
        {!isOwner && (
          <div style={{
            background: colors.card,
            border: `1px solid ${colors.border}`,
            borderRadius: 12, padding: '16px 20px',
            display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
          }}>
            <Bot size={20} color={colors.blue} style={{ flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 200 }}>
              <p style={{ margin: '0 0 8px', fontSize: 13, color: colors.muted, lineHeight: 1.55 }}>
                Cria o teu projeto e recebe análise por IA com feedback personalizado.
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                style={{
                  background: '#6d28d9',
                  border: 'none', borderRadius: 8, padding: '7px 16px',
                  color: '#fff', fontSize: 12, fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'inherit',
                  boxShadow: '0 2px 8px rgba(109,40,217,0.2)',
                }}
              >
                <span style={{display:"flex",alignItems:"center",gap:6}}>Criar o meu projeto <ArrowRight size={15} /></span>
              </button>
            </div>
          </div>
        )}

        {/* A tua história — AI narrative with blue gradient */}
        {project.ai_description && (
          <div className="proj-card-pad proj-card" style={{
            background: '#1b78f7',
            border: '1px solid rgba(79,70,229,0.5)',
            position: 'relative', overflow: 'hidden',
          }}>
            {/* Subtle radial glow */}
            <div style={{ position: 'absolute', top: -40, right: -40, width: 220, height: 220, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(255,255,255,0.07) 0%, transparent 70%)', pointerEvents: 'none' }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 24, flexWrap: 'wrap', position: 'relative' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: 6 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                A tua história
              </span>
              {isOwner && (
                <button
                  onClick={handleRegenerate}
                  disabled={regenerating || regenCooldown > 0}
                  style={{
                    background: 'rgba(255,255,255,0.12)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    color: 'rgba(255,255,255,0.85)',
                    borderRadius: 7, padding: '4px 10px',
                    fontSize: 11, fontWeight: 600,
                    cursor: (regenerating || regenCooldown > 0) ? 'default' : 'pointer',
                    opacity: (regenerating || regenCooldown > 0) ? 0.5 : 1,
                    whiteSpace: 'nowrap',
                    fontFamily: 'inherit',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { if (!(regenerating || regenCooldown > 0)) e.currentTarget.style.background = 'rgba(255,255,255,0.2)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)' }}
                >
                  {regenerating ? 'A gerar...' : regenCooldown > 0 ? `${regenCooldown}s` : 'Regenerar'}
                </button>
              )}
            </div>
            {/* Split into paragraphs — new content has \n\n, old content is single block */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, position: 'relative' }}>
              {project.ai_description.split('\n\n').filter(p => p.trim()).map((para, i) => (
                <p key={i} style={{
                  margin: 0,
                  fontSize: i === 0 ? 18 : 16,
                  lineHeight: 1.9,
                  color: i === 0 ? 'rgba(255,255,255,0.96)' : 'rgba(255,255,255,0.82)',
                  fontWeight: i === 0 ? 500 : 400,
                  letterSpacing: '-0.1px',
                }}>
                  {para.trim()}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Highlights — 3 column cards — blue branded */}
        {highlights.length > 0 && (() => {
          const HlIcons = [Zap, TrendingUp, Lightbulb]
          const hlAccents = ['#1b78f7', '#1d6fe8', '#2563eb']
          return (
            <div className="proj-highlights-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
              {highlights.map((h, i) => {
                const HlIcon = HlIcons[i] ?? Sparkles
                const acc = hlAccents[i] ?? '#1b78f7'
                return (
                  <div key={i} className="proj-card" style={{
                    display: 'flex', flexDirection: 'column', gap: 12,
                    background: `${acc}10`,
                    border: `1px solid ${acc}30`,
                    position: 'relative', overflow: 'hidden',
                  }}>
                    <div style={{ position: 'absolute', bottom: -20, right: -16, width: 80, height: 80, borderRadius: '50%', background: `radial-gradient(ellipse, ${acc}14 0%, transparent 70%)`, pointerEvents: 'none' }} />
                    <div style={{ width: 32, height: 32, borderRadius: 9, flexShrink: 0, background: `${acc}18`, border: `1px solid ${acc}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <HlIcon size={15} color={acc} />
                    </div>
                    <p style={{ margin: 0, fontSize: 13, color: colors.text, lineHeight: 1.65, position: 'relative' }}>{h}</p>
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
        <div className="proj-card" style={{ padding: '14px 16px' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: colors.muted, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 10 }}>
            {isOwner ? 'Partilhar' : 'Partilha'}
          </span>
          {/* URL row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <div style={{ flex: 1, minWidth: 0, background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 7, padding: '7px 12px', fontSize: 12, color: colors.subtle, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {pageUrl}
            </div>
            <button
              onClick={handleCopy}
              style={{
                background: copied ? `${colors.green}18` : `${colors.blue}18`,
                border: `1px solid ${copied ? colors.green + '35' : colors.blue + '30'}`,
                color: copied ? colors.green : colors.blue,
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
                background: 'var(--c-bg-alt)',
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
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                <rect x="3" y="14" width="7" height="7"/>
                <path d="M14 14h3v3h-3zM17 17h3v3h-3zM14 20h3"/>
              </svg>
              <span className="proj-share-qr-label">QR Code</span>
            </button>
          </div>
          {/* Social share row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginTop: 10 }}>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`Vê o meu projeto ${project.name} no Showo!\n${pageUrl}`)}`}
              target="_blank" rel="noopener noreferrer"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                background: 'rgba(37,211,102,0.1)', border: '1px solid rgba(37,211,102,0.25)',
                borderRadius: 9, padding: '9px 0',
                color: '#25d366', fontSize: 13, fontWeight: 700,
                textDecoration: 'none', transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(37,211,102,0.18)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(37,211,102,0.1)'}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="#25d366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              WhatsApp
            </a>
            <a
              href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(pageUrl)}`}
              target="_blank" rel="noopener noreferrer"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                background: 'rgba(10,102,194,0.1)', border: '1px solid rgba(10,102,194,0.25)',
                borderRadius: 9, padding: '9px 0',
                color: '#0a66c2', fontSize: 13, fontWeight: 700,
                textDecoration: 'none', transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(10,102,194,0.18)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(10,102,194,0.1)'}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="#0a66c2"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
              LinkedIn
            </a>
            <a
              href={`mailto:?subject=${encodeURIComponent(`Vê o meu projeto: ${project.name}`)}&body=${encodeURIComponent(`Olá!\n\nQuero partilhar o meu projeto contigo no Showo:\n${pageUrl}`)}`}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                background: `rgba(125,147,176,0.1)`, border: `1px solid ${colors.border}`,
                borderRadius: 9, padding: '9px 0',
                color: colors.muted, fontSize: 13, fontWeight: 700,
                textDecoration: 'none', transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = `rgba(125,147,176,0.18)`}
              onMouseLeave={e => e.currentTarget.style.background = `rgba(125,147,176,0.1)`}
            >
              <Mail size={15} />
              Email
            </a>
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
                borderRadius: 14, padding: '28px 32px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20,
                boxShadow: 'none',
                maxWidth: 320, width: '100%',
                position: 'relative',
              }}
            >
              <button
                onClick={() => setShowQR(false)}
                style={{ position: 'absolute', top: 14, right: 14, background: 'var(--c-card-hover)', border: `1px solid ${colors.border}`, borderRadius: 8, width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: colors.muted }}
              ><X size={14} /></button>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: colors.text, textAlign: 'center', marginBottom: 4 }}>{project.name}</div>
                <div style={{ fontSize: 12, color: colors.muted, textAlign: 'center' }}>Aponta a câmara para abrir</div>
              </div>
              <div style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: 'none' }}>
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
                background: colors.blue,
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
                    style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: colors.muted, fontWeight: 600, textDecoration: 'none', background: 'var(--c-bg-alt)', border: `1px solid ${colors.border}`, borderRadius: 7, padding: '5px 10px', transition: 'all 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = colors.borderBright; e.currentTarget.style.color = colors.text }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = colors.border; e.currentTarget.style.color = colors.muted }}
                  >LinkedIn</a>
                )}
                {project.github_url && (
                  <a href={project.github_url} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: colors.muted, fontWeight: 600, textDecoration: 'none', background: 'var(--c-bg-alt)', border: `1px solid ${colors.border}`, borderRadius: 7, padding: '5px 10px', transition: 'all 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = colors.borderBright; e.currentTarget.style.color = colors.text }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = colors.border; e.currentTarget.style.color = colors.muted }}
                  >GitHub</a>
                )}
                {project.portfolio_url && (
                  <a href={project.portfolio_url} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: colors.muted, fontWeight: 600, textDecoration: 'none', background: 'var(--c-bg-alt)', border: `1px solid ${colors.border}`, borderRadius: 7, padding: '5px 10px', transition: 'all 0.15s' }}
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
          <img src={theme === 'light' ? '/light_mode_LI.png' : '/logo.png'} alt="Showo" style={{ height: 16, width: 'auto', verticalAlign: 'middle', opacity: 0.7 }} />
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

          {/* ── Jury evaluation card (professors only) ── */}
          {isProfessor && (() => {
            const JURY_CRITERIA = [
              { id: 'problem',        label: 'Problema',        desc: 'Clareza e relevância' },
              { id: 'solution',       label: 'Solução',         desc: 'Adequação e criatividade' },
              { id: 'tech',           label: 'Tecnologia',      desc: 'Profundidade técnica' },
              { id: 'results',        label: 'Resultados',      desc: 'Evidência e impacto' },
              { id: 'presentation',   label: 'Apresentação',    desc: 'Qualidade do projeto' },
            ]
            const totalRated = JURY_CRITERIA.filter(c => juryRatings[c.id] != null).length
            const avgScore   = totalRated === 0 ? null : Math.round(JURY_CRITERIA.reduce((s, c) => s + (juryRatings[c.id] ?? 0), 0) / JURY_CRITERIA.length * 10) / 10

            return (
              <div style={{ background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.22)', borderRadius: 12, overflow: 'hidden', marginBottom: 4 }}>
                {/* Header */}
                <div style={{ padding: '13px 16px 10px', borderBottom: '1px solid rgba(99,102,241,0.12)', display: 'flex', alignItems: 'center', gap: 9 }}>
                  <ClipboardList size={14} color="#818cf8" />
                  <span style={{ fontSize: 13, fontWeight: 700, color: colors.text, flex: 1 }}>Avaliação Júri</span>
                  {avgScore != null && (
                    <span style={{ fontSize: 18, fontWeight: 900, color: avgScore >= 7 ? '#22c55e' : avgScore >= 5 ? '#1b78f7' : '#f97316', letterSpacing: '-0.5px' }}>{avgScore}<span style={{ fontSize: 11, color: colors.muted, fontWeight: 500 }}>/10</span></span>
                  )}
                </div>

                {/* Criteria rating */}
                <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {JURY_CRITERIA.map(c => (
                    <div key={c.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: colors.text }}>{c.label}</span>
                        <span style={{ fontSize: 10, color: colors.muted }}>{c.desc}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {[1,2,3,4,5,6,7,8,9,10].map(n => {
                          const val = juryRatings[c.id] ?? 0
                          const active = n <= val
                          return (
                            <button
                              key={n}
                              onClick={() => setJuryRatings(r => ({ ...r, [c.id]: r[c.id] === n ? 0 : n }))}
                              style={{
                                flex: 1, height: 20, borderRadius: 4, border: 'none', cursor: 'pointer', padding: 0,
                                background: active ? (val >= 7 ? '#22c55e' : val >= 5 ? '#1b78f7' : '#f97316') : 'var(--c-bg)',
                                transition: 'background 0.1s',
                              }}
                              title={`${n}/10`}
                            />
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Note */}
                <div style={{ padding: '0 16px 12px' }}>
                  <textarea
                    value={juryNote}
                    onChange={e => setJuryNote(e.target.value)}
                    placeholder="Nota geral para o aluno (opcional)…"
                    rows={2}
                    style={{ width: '100%', background: 'var(--c-bg)', border: `1px solid ${colors.border}`, borderRadius: 8, padding: '8px 10px', color: colors.text, fontSize: 12, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box', outline: 'none', lineHeight: 1.5 }}
                  />
                </div>

                {/* Save button */}
                <div style={{ padding: '0 16px 14px' }}>
                  <button
                    disabled={jurySaving || totalRated === 0}
                    onClick={async () => {
                      if (totalRated === 0) return
                      setJurySaving(true)
                      const payload = { ratings: juryRatings, avg: avgScore, note: juryNote }
                      // Save as a teacher feedback entry
                      await supabase.from('teacher_feedback').upsert({
                        project_id: project.id, teacher_id: user.id, field_key: 'jury_eval',
                        comment: JSON.stringify(payload),
                      }, { onConflict: 'project_id,teacher_id,field_key' })
                      if (project.user_id) {
                        supabase.from('notifications').insert({
                          user_id: project.user_id, type: 'TEACHER_FEEDBACK',
                          message: `O júri avaliou o teu projeto "${project.name}": ${avgScore}/10`,
                          project_slug: project.slug, read: false,
                        })
                      }
                      setJurySaving(false); setJurySaved(true)
                      setTimeout(() => setJurySaved(false), 3000)
                    }}
                    style={{
                      width: '100%', padding: '10px', borderRadius: 8,
                      background: jurySaved ? 'rgba(34,197,94,0.12)' : '#6366f1',
                      border: jurySaved ? '1px solid rgba(34,197,94,0.3)' : 'none',
                      color: jurySaved ? '#22c55e' : '#fff',
                      fontSize: 13, fontWeight: 700, cursor: totalRated === 0 || jurySaving ? 'default' : 'pointer',
                      opacity: totalRated === 0 ? 0.5 : 1, fontFamily: 'inherit',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}
                  >
                    {jurySaved ? <><Check size={13} /> Avaliação guardada</> : jurySaving ? 'A guardar…' : <><ClipboardList size={13} /> Guardar avaliação</>}
                  </button>
                </div>
              </div>
            )
          })()}

          {/* Teacher feedback — sidebar: desktop first/second slot, mobile above author */}
          {(isOwner || isProfessor) && (teacherFeedback.length > 0 || isProfessor) && (() => {
            const FB_SECTION_LABELS = { description: 'Descrição', tech: 'Tecnologias', links: 'Links', demo: 'Demo', team: 'Equipa', gallery: 'Galeria', geral: 'Geral' }
            const myFeedback = isProfessor ? teacherFeedback.filter(f => f.teacher_id === user?.id) : teacherFeedback
            return (
              <div style={{ background: 'rgba(251,191,36,0.04)', border: '1px solid rgba(251,191,36,0.22)', borderRadius: 12, overflow: 'hidden' }}>
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
                      <button onClick={handleFbSave} disabled={fbSaving || !fbComment.trim()} style={{ flex: 1, background: '#d97706', border: 'none', borderRadius: 8, padding: '9px', color: '#fff', fontSize: 13, fontWeight: 600, cursor: fbSaving || !fbComment.trim() ? 'default' : 'pointer', opacity: fbSaving || !fbComment.trim() ? 0.6 : 1, fontFamily: 'inherit' }}>
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

            const isComplete = pct === 100
            return (
              <div className="proj-card" style={isComplete ? {
                background: 'rgba(34,197,94,0.04)',
                border: '1px solid rgba(34,197,94,0.22)',
              } : {}}>
                {isComplete ? (
                  /* ── Completude 100%: celebratory completed state ── */
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                      background: 'rgba(34,197,94,0.12)',
                      border: '1px solid rgba(34,197,94,0.25)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Check size={15} color="#22c55e" strokeWidth={3} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#22c55e', marginBottom: 2 }}>Perfil 100% completo</div>
                      <div style={{ fontSize: 12, color: colors.subtle }}>Todos os campos preenchidos com qualidade</div>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#22c55e', flexShrink: 0 }}>100%</span>
                  </div>
                ) : (
                  /* ── Normal state: collapsible checklist ── */
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: completudeOpen ? 14 : 0 }}>
                      <h3 className="proj-sec-label" style={{ margin: 0 }}>Completude</h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 800, color: pct > 60 ? colors.blue : colors.yellow }}>{pct}%</span>
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
                  </>
                )}
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

            if (needsWork.length === 0) return null // completude card already shows 100% state

            return (
              <div className="proj-card" style={{ background: 'rgba(27,120,247,0.04)', border: '1px solid rgba(27,120,247,0.18)' }}>
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
                      <span style={{display:'flex',alignItems:'center',gap:6,justifyContent:'center'}}>Ver missões <ChevronDown size={14} /></span>
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

      </>)}{/* end owner/collaborator conditional */}

      {/* ── Likes + Interest + Comments — visible to ALL (owners, recruiters, visitors) ── */}
      {project && (
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '0 32px 40px' }}>

          {/* Barra de gostos / interesse (owner view) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '20px 0 8px', flexWrap: 'wrap' }}>

            {/* ❤️ Gostos — alunos e professores */}
            {!isRecruiterRole && (
              <button
                onClick={handleLike}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  background: liked ? 'rgba(239,68,68,0.1)' : 'var(--c-bg-alt)',
                  border: `1.5px solid ${liked ? 'rgba(239,68,68,0.35)' : 'var(--c-border)'}`,
                  borderRadius: 10, padding: '8px 16px',
                  color: liked ? '#ef4444' : 'var(--c-muted)',
                  fontSize: 14, fontWeight: 700, cursor: likeLoading ? 'default' : 'pointer',
                  fontFamily: 'inherit', transition: 'all 0.15s',
                }}
                onMouseEnter={e => { if (!liked) { e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)'; e.currentTarget.style.color = '#ef4444' }}}
                onMouseLeave={e => { if (!liked) { e.currentTarget.style.borderColor = 'var(--c-border)'; e.currentTarget.style.color = 'var(--c-muted)' }}}
              >
                <Heart size={16} fill={liked ? '#ef4444' : 'none'} />
                {likeCount > 0 ? likeCount : ''} {likeCount === 1 ? 'gosto' : 'gostos'}
              </button>
            )}

            {/* Contador de interesse — dono do projeto (clicável) */}
            {isOwner && interestCount > 0 && (
              <button onClick={() => setShowInterestors(true)} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)',
                borderRadius: 10, padding: '8px 14px',
                color: '#f59e0b', fontSize: 13, fontWeight: 700,
                cursor: 'pointer',
              }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245,158,11,0.15)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(245,158,11,0.08)' }}
              >
                <Star size={14} fill="#f59e0b" />
                {interestCount} recrutador{interestCount !== 1 ? 'es' : ''} com interesse
              </button>
            )}
          </div>

          {/* Modal: lista de recrutadores com interesse */}
          {showInterestors && (
            <div onClick={() => setShowInterestors(false)} style={{
              position: 'fixed', inset: 0, zIndex: 200,
              background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div onClick={e => e.stopPropagation()} style={{
                background: 'var(--c-card)', border: '1px solid var(--c-border)',
                borderRadius: 14, padding: '28px 28px 24px', maxWidth: 440, width: '90%',
                maxHeight: '70vh', overflowY: 'auto',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Star size={18} fill="#f59e0b" color="#f59e0b" />
                    <span style={{ fontWeight: 700, fontSize: 16 }}>Recrutadores interessados</span>
                  </div>
                  <button onClick={() => setShowInterestors(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-muted)', padding: 4 }}>
                    <X size={18} />
                  </button>
                </div>
                {interestors.length === 0 ? (
                  <p style={{ color: 'var(--c-muted)', fontSize: 14, textAlign: 'center', padding: '16px 0' }}>Ainda nenhum recrutador.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {interestors.map(rec => (
                      <div key={rec.id} style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '12px 14px', borderRadius: 12,
                        background: 'var(--c-bg)', border: '1px solid var(--c-border)',
                      }}>
                        <div style={{
                          width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                          background: 'var(--c-border)',
                          overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {rec.avatar_url
                            ? <img src={rec.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <User size={18} color="var(--c-muted)" />
                          }
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--c-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {rec.full_name || rec.username || 'Recrutador'}
                          </div>
                          {rec.company && (
                            <div style={{ fontSize: 12, color: 'var(--c-muted)', marginTop: 1 }}>{rec.company}</div>
                          )}
                        </div>
                        <a href={`/u/${rec.username || rec.id}`} style={{
                          padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                          background: 'var(--c-bg-alt)', border: '1px solid var(--c-border)',
                          color: 'var(--c-text)', textDecoration: 'none', flexShrink: 0,
                        }}>Ver perfil</a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Comments */}
          <div style={{
            background: 'var(--c-card)', border: '1px solid var(--c-border)',
            borderRadius: 12, padding: '22px 24px',
          }}>
            <ProjectComments projectId={project.id} projectAuthorId={project.user_id} />
          </div>
        </div>
      )}

    </div>
  )
}
