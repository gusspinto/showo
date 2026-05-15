import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { QRCodeSVG } from 'qrcode.react'
import { supabase } from '../lib/supabase'
import { calculateScore } from '../lib/score'
import { CHALLENGES, getChallengeStatus } from '../lib/challenges'
import { Navbar } from '../components/Navbar'
import { generateProject } from '../lib/generateProject'
import { useAuth } from '../context/AuthContext'
import DefenseMode from '../components/DefenseMode'

const colors = {
  bg: '#0d1424',
  bgAlt: '#111c32',
  card: '#152030',
  cardHover: '#1c2d44',
  border: '#1e3050',
  borderBright: '#2a4275',
  blue: '#3b82f6',
  blueHover: '#2563eb',
  blueGlow: 'rgba(59,130,246,0.15)',
  blueSubtle: 'rgba(59,130,246,0.08)',
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

const CONFETTI_COLORS = ['#3b82f6', '#22c55e', '#eab308', '#f97316', '#a855f7', '#ec4899', '#06b6d4']

const PROJECT_TYPE_LABELS = {
  group: 'Trabalho de grupo',
  pap: 'PAP / Projeto final',
  presentation: 'Apresentação',
  personal: 'Projeto pessoal',
  competition: 'Projeto de competição',
  other: 'Outro',
}

function getLevelInfo(score) {
  if (score === 100) return { label: 'Projeto completo!', color: colors.green }
  if (score >= 81) return { label: 'Impressionante', color: colors.blue }
  if (score >= 61) return { label: 'Quase pronto', color: colors.orange }
  if (score >= 41) return { label: 'A ganhar forma', color: colors.yellow }
  return { label: 'Em desenvolvimento', color: colors.muted }
}

function ScoreRing({ score }) {
  const size = 108
  const stroke = 8
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
        <span style={{ fontSize: 26, fontWeight: 900, color, lineHeight: 1, letterSpacing: '-1px' }}>{score}</span>
        <span style={{ fontSize: 9, color: colors.muted, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 2 }}>score</span>
      </div>
    </div>
  )
}

function Section({ title, content }) {
  if (!content) return null
  return (
    <div style={{
      background: colors.card,
      border: `1px solid ${colors.border}`,
      borderRadius: 16,
      padding: '22px 26px',
      marginBottom: 12,
      boxShadow: '0 2px 16px rgba(0,0,0,0.25)',
    }}>
      <h3 style={{ margin: '0 0 12px', fontSize: 11, fontWeight: 700, color: colors.muted, textTransform: 'uppercase', letterSpacing: 1 }}>{title}</h3>
      <p style={{ margin: 0, color: colors.text, fontSize: 15, lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>{content}</p>
    </div>
  )
}

function ChallengeCard({ challenge, project, onImprove }) {
  const isCompleted = getChallengeStatus(challenge, project) === 'completed'
  const val = String(project[challenge.field] || '').trim()
  const progress = Math.min(val.length / challenge.threshold, 1)

  return (
    <div style={{
      background: isCompleted ? colors.greenBg : colors.bgAlt,
      border: `1px solid ${isCompleted ? 'rgba(34,197,94,0.22)' : colors.border}`,
      borderRadius: 14,
      padding: '16px 18px',
      transition: 'border-color 0.2s',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <div style={{
          width: 38, height: 38, borderRadius: 10, flexShrink: 0, marginTop: 1,
          background: isCompleted ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.04)',
          border: `1px solid ${isCompleted ? 'rgba(34,197,94,0.2)' : colors.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
        }}>
          {challenge.icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: isCompleted ? colors.green : colors.text }}>
              {isCompleted && <span style={{ marginRight: 4 }}>✓</span>}{challenge.title}
            </span>
            <span style={{
              fontSize: 12, fontWeight: 700, flexShrink: 0,
              color: isCompleted ? colors.green : colors.blue,
              background: isCompleted ? colors.greenGlow : colors.blueSubtle,
              border: `1px solid ${isCompleted ? 'rgba(34,197,94,0.2)' : 'rgba(59,130,246,0.15)'}`,
              borderRadius: 999, padding: '2px 10px',
            }}>
              +{challenge.xp} XP
            </span>
          </div>
          <p style={{ margin: '0 0 10px', fontSize: 13, color: colors.muted, lineHeight: 1.55 }}>
            {challenge.description}
          </p>
          {!isCompleted && (
            <>
              <div style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: colors.subtle }}>{val.length} / {challenge.threshold} caracteres</span>
                  <span style={{ fontSize: 11, color: colors.subtle }}>{Math.round(progress * 100)}%</span>
                </div>
                <div style={{ height: 4, background: colors.border, borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 2,
                    width: `${progress * 100}%`,
                    background: progress > 0.7
                      ? `linear-gradient(90deg, ${colors.orange}, ${colors.yellow})`
                      : `linear-gradient(90deg, ${colors.blue}, #818cf8)`,
                    transition: 'width 0.3s',
                  }} />
                </div>
              </div>
              <button
                onClick={() => onImprove(challenge)}
                style={{
                  background: colors.blueSubtle,
                  color: colors.blue,
                  border: '1px solid rgba(59,130,246,0.2)',
                  borderRadius: 8,
                  padding: '8px 16px',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'background 0.15s',
                }}
              >
                Melhorar agora →
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function EditModal({ challenge, project, onClose, onSave, saving }) {
  const [value, setValue] = useState(String(project[challenge.field] || ''))
  const len = value.trim().length
  const isComplete = len >= challenge.threshold
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
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
            }}>
              {challenge.icon}
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: colors.text }}>{challenge.fieldLabel}</h2>
              <span style={{ fontSize: 12, color: colors.blue, fontWeight: 600 }}>+{challenge.xp} XP ao completar</span>
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
            resize: 'vertical', fontFamily: 'Inter, system-ui, sans-serif',
            boxSizing: 'border-box', outline: 'none',
            transition: 'border-color 0.2s',
          }}
          placeholder={`Escreve sobre ${challenge.fieldLabel.toLowerCase()}...`}
        />
        <div style={{ margin: '10px 0 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: isComplete ? colors.green : colors.muted, fontWeight: isComplete ? 600 : 400 }}>
              {isComplete ? '✓ Objetivo atingido!' : `${len} / ${challenge.threshold} caracteres`}
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
            boxShadow: isComplete ? '0 4px 20px rgba(34,197,94,0.3)' : '0 4px 20px rgba(59,130,246,0.3)',
          }}
        >
          {saving ? 'A guardar...' : `Guardar e ganhar +${challenge.xp} XP`}
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
    pending:  { label: '⏳ Pendente', color: '#eab308', bg: 'rgba(234,179,8,0.1)',  border: 'rgba(234,179,8,0.25)',  avatar: 'linear-gradient(135deg,#ca8a04,#92400e)', dim: true  },
    declined: { label: '✕ Recusou',  color: '#f87171', bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.25)', avatar: 'linear-gradient(135deg,#ef4444,#b91c1c)', dim: true  },
  }

  // For non-owners, only show accepted; already filtered at query level but guard here too
  const visibleMembers = isOwner ? members : members.filter(m => m.status === 'accepted')

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
            <span style={{ fontSize: 11, background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: 5, padding: '1px 7px', color: '#60a5fa', fontWeight: 700 }}>Dono</span>
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
  const { user } = useAuth()
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

  const prevScoreRef = useRef(null)
  const rafRef = useRef(null)
  const toastTimerRef = useRef(null)
  const cooldownRef = useRef(null)

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

      return () => supabase.removeChannel(channel)
    }
    fetchProject()
  }, [slug, user?.id])

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
      triggerToast(`🎉 +${challenge.xp} XP! Score: ${oldScore} → ${newScore}`)
      if (newScore === 100) {
        setShowConfetti(true)
        setTimeout(() => setShowConfetti(false), 5000)
      }
    } else {
      triggerToast(`💾 Guardado! Score atual: ${newScore}`)
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
        triggerToast('✨ Texto da IA atualizado!')
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
      <div style={{ minHeight: '100vh', backgroundColor: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 40, height: 40, border: `3px solid ${colors.border}`, borderTop: `3px solid ${colors.blue}`, borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (!project) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: colors.bg, color: colors.text, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, system-ui, sans-serif', gap: 16, textAlign: 'center', padding: 24 }}>
        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Este projeto não existe ou foi removido</h2>
        <p style={{ color: colors.muted, margin: 0 }}>O link pode estar incorrecto ou o projeto foi eliminado.</p>
        <button
          onClick={() => navigate('/novo')}
          style={{ background: `linear-gradient(135deg, ${colors.blue}, #4f46e5)`, color: '#fff', border: 'none', borderRadius: 10, padding: '12px 28px', fontSize: 16, fontWeight: 700, cursor: 'pointer', marginTop: 8, boxShadow: '0 4px 20px rgba(59,130,246,0.3)', fontFamily: 'inherit' }}
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
    (!project.edit_token && !project.user_id) ||
    !!localStorage.getItem(`edit_token_${project.slug}`)
  )

  const sortedChallenges = [...CHALLENGES].sort((a, b) => {
    const aCompleted = getChallengeStatus(a, project) === 'completed' ? 1 : 0
    const bCompleted = getChallengeStatus(b, project) === 'completed' ? 1 : 0
    return aCompleted - bCompleted
  })
  const completedCount = CHALLENGES.filter(c => getChallengeStatus(c, project) === 'completed').length
  const earnedXP = CHALLENGES.reduce((sum, c) => sum + (getChallengeStatus(c, project) === 'completed' ? c.xp : 0), 0)
  const totalXP = CHALLENGES.reduce((sum, c) => sum + c.xp, 0)

  return (
    <div style={{ minHeight: '100vh', backgroundColor: colors.bg, color: colors.text, fontFamily: 'Inter, system-ui, sans-serif' }}>
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
        @keyframes confetti-fall {
          0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
          80% { opacity: 1; }
          100% { transform: translateY(105vh) rotate(720deg); opacity: 0; }
        }
        .proj-layout {
          display: grid;
          grid-template-columns: 1fr 260px;
          gap: 28px;
          align-items: start;
        }
        .proj-sidebar {
          position: sticky;
          top: 88px;
        }
        @media (max-width: 860px) {
          .proj-layout { grid-template-columns: 1fr; }
          .proj-sidebar { position: static; order: -1; }
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

      <Navbar>
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
            🎓 Preparar defesa
          </button>
        )}
        {project && (isOwner || collaboratorSections !== null) && (
          <button
            onClick={() => {
              const token = localStorage.getItem(`edit_token_${project.slug}`)
              navigate(`/editar/${project.slug}${token ? `?token=${token}` : ''}`)
            }}
            style={{
              background: 'transparent',
              border: `1px solid ${colors.border}`,
              color: colors.muted,
              borderRadius: 8, padding: '8px 16px',
              fontSize: 13, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Editar
          </button>
        )}
        <button
          onClick={() => navigate('/novo')}
          style={{
            background: `linear-gradient(135deg, ${colors.blue}, #4f46e5)`,
            color: '#fff', border: 'none',
            borderRadius: 8, padding: '9px 18px',
            fontSize: 14, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit',
            boxShadow: '0 4px 16px rgba(59,130,246,0.3)',
          }}
        >
          Criar projeto
        </button>
      </Navbar>

      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0 24px 80px' }}>

        {/* Cover image — full width above the grid */}
        {project.cover_url && (
          <div style={{ width: '100%', height: 300, position: 'relative', marginTop: 36, borderRadius: 20, overflow: 'hidden', boxShadow: '0 16px 48px rgba(0,0,0,0.5)' }}>
            <img src={project.cover_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 30%, #0d1424ee)' }} />
          </div>
        )}

        {/* Two-column layout: main content + sticky sidebar */}
        <div className="proj-layout">
        <div className="proj-main">

        {/* Hero */}
        <div style={{ position: 'relative', padding: `${project.cover_url ? '32px' : '64px'} 0 40px` }}>
          {/* Score widget */}
          <div style={{
            position: 'absolute', top: project.cover_url ? 32 : 64, right: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
          }}>
            <ScoreRing score={displayScore} />
            <div style={{
              background: level.color + '15',
              color: level.color,
              borderRadius: 999,
              padding: '4px 12px',
              fontSize: 10,
              fontWeight: 700,
              border: `1px solid ${level.color}35`,
              textAlign: 'center',
              maxWidth: 120,
              lineHeight: 1.5,
              letterSpacing: 0.2,
            }}>
              {level.label}
            </div>
            {internshipReady && (
              <div style={{
                background: colors.greenGlow,
                color: colors.green,
                border: '1px solid rgba(34,197,94,0.25)',
                borderRadius: 999,
                padding: '4px 12px',
                fontSize: 10,
                fontWeight: 700,
                textAlign: 'center',
                maxWidth: 120,
                lineHeight: 1.5,
              }}>
                Pronto para estágio
              </div>
            )}
          </div>

          {/* Badges */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
            {project.area && (
              <div style={{
                background: colors.blueSubtle,
                color: '#60a5fa',
                border: '1px solid rgba(59,130,246,0.2)',
                borderRadius: 999, padding: '5px 14px', fontSize: 13, fontWeight: 600,
              }}>
                {project.area}
              </div>
            )}
            {project.project_type && PROJECT_TYPE_LABELS[project.project_type] && (
              <div style={{
                background: 'rgba(255,255,255,0.04)',
                color: colors.muted,
                borderRadius: 999, padding: '5px 14px', fontSize: 13, fontWeight: 600,
                border: `1px solid ${colors.border}`,
              }}>
                {PROJECT_TYPE_LABELS[project.project_type]}
              </div>
            )}
            {isPap && (
              <div style={{
                background: colors.yellowGlow,
                color: colors.yellow,
                borderRadius: 999, padding: '5px 14px', fontSize: 13, fontWeight: 700,
                border: '1px solid rgba(234,179,8,0.25)',
              }}>
                PAP
              </div>
            )}
          </div>

          <h1 style={{ fontSize: 'clamp(30px, 5vw, 52px)', fontWeight: 900, margin: '0 0 16px', lineHeight: 1.1, paddingRight: 140, letterSpacing: '-0.5px' }}>
            {project.name}
          </h1>

          {project.ai_tagline && (
            <p style={{ fontSize: 19, color: colors.muted, lineHeight: 1.65, margin: '0 0 24px', maxWidth: 580, fontWeight: 400 }}>
              {project.ai_tagline}
            </p>
          )}

          {/* Creator */}
          {(project.creator_name || project.course || project.school_year) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <div style={{
                  width: 34, height: 34,
                  background: `linear-gradient(135deg, ${colors.blue}, #4f46e5)`,
                  borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 800, flexShrink: 0, color: '#fff',
                }}>
                  {project.creator_name ? project.creator_name[0].toUpperCase() : '?'}
                </div>
                <span style={{ fontSize: 14, color: colors.muted }}>
                  {project.creator_name && <span style={{ color: colors.text, fontWeight: 600 }}>{project.creator_name}</span>}
                  {project.course && <span> · {project.course}</span>}
                  {project.school_year && <span> · {project.school_year}</span>}
                  {project.school && <span> · {project.school}</span>}
                </span>
              </div>
              {(project.linkedin_url || project.github_url || project.portfolio_url) && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {project.linkedin_url && (
                    <a href={project.linkedin_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(10,102,194,0.1)', border: '1px solid rgba(10,102,194,0.25)', color: '#60a5fa', borderRadius: 8, padding: '6px 12px', fontSize: 13, fontWeight: 600 }}>
                      <span style={{ fontWeight: 900, fontStyle: 'italic' }}>in</span> LinkedIn
                    </a>
                  )}
                  {project.github_url && (
                    <a href={project.github_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.04)', border: `1px solid ${colors.border}`, color: colors.text, borderRadius: 8, padding: '6px 12px', fontSize: 13, fontWeight: 600 }}>
                      GitHub
                    </a>
                  )}
                  {project.portfolio_url && (
                    <a href={project.portfolio_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.2)', color: '#c084fc', borderRadius: 8, padding: '6px 12px', fontSize: 13, fontWeight: 600 }}>
                      Portfólio
                    </a>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* AI Description */}
        {project.ai_description && (
          <div style={{
            background: 'linear-gradient(135deg, #0e1f3e 0%, #0a1729 100%)',
            border: '1px solid rgba(59,130,246,0.25)',
            borderRadius: 18, padding: '24px 28px', marginBottom: 24,
            boxShadow: '0 4px 24px rgba(59,130,246,0.08)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#818cf8', textTransform: 'uppercase', letterSpacing: 1.2 }}>Resumo gerado por IA</span>
              </div>
              <button
                onClick={handleRegenerate}
                disabled={regenerating || regenCooldown > 0}
                style={{
                  background: 'rgba(59,130,246,0.1)',
                  border: '1px solid rgba(59,130,246,0.2)',
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

        {/* Highlights */}
        {highlights.length > 0 && (
          <div style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 16, padding: '22px 26px', marginBottom: 24, boxShadow: '0 2px 16px rgba(0,0,0,0.25)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 11, fontWeight: 700, color: colors.muted, textTransform: 'uppercase', letterSpacing: 1 }}>Destaques</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {highlights.map((h, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{
                    width: 20, height: 20,
                    background: colors.greenGlow,
                    border: '1px solid rgba(34,197,94,0.25)',
                    borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, marginTop: 2,
                  }}>
                    <span style={{ color: colors.green, fontSize: 11, fontWeight: 700 }}>✓</span>
                  </div>
                  <p style={{ margin: 0, color: colors.text, fontSize: 15, lineHeight: 1.65 }}>{h}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PAP details */}
        {isPap && (project.pap_supervisor || project.pap_date) && (
          <div style={{ background: colors.yellowGlow, border: '1px solid rgba(234,179,8,0.18)', borderRadius: 16, padding: '20px 24px', marginBottom: 12 }}>
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

        {/* Project sections */}
        <Section title="Problema" content={project.problem} />
        <Section title="Solução" content={project.solution} />
        <Section title="Público-alvo" content={project.target_audience} />
        <Section title="Funcionalidades" content={project.features} />
        <Section title="Tecnologias" content={project.technologies} />
        <Section title="Desafios" content={project.challenges} />
        <Section title="Resultados" content={project.results} />
        <Section title="Aprendizagens" content={project.learnings} />

        {/* Missions — only for owner */}
        {isOwner && <div style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 20, padding: '28px', marginBottom: 16, marginTop: 8, boxShadow: '0 4px 24px rgba(0,0,0,0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 14 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5 }}>
                <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800, letterSpacing: '-0.3px' }}>Missões</h3>
              </div>
              <p style={{ margin: 0, fontSize: 13, color: colors.muted, paddingLeft: 46 }}>Completa missões para melhorar o score</p>
            </div>
            <div style={{
              background: colors.bg,
              border: `1px solid ${colors.border}`,
              borderRadius: 12, padding: '10px 20px',
              textAlign: 'center', flexShrink: 0,
            }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: colors.blue, letterSpacing: '-0.5px' }}>
                {earnedXP} <span style={{ fontSize: 13, color: colors.subtle, fontWeight: 500 }}>/ {totalXP} XP</span>
              </div>
              <div style={{ fontSize: 11, color: colors.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 }}>{completedCount}/{CHALLENGES.length} completas</div>
            </div>
          </div>

          {/* XP progress bar */}
          <div style={{ height: 6, background: colors.border, borderRadius: 3, overflow: 'hidden', marginBottom: 20 }}>
            <div style={{
              height: '100%', borderRadius: 3,
              width: `${(earnedXP / totalXP) * 100}%`,
              background: `linear-gradient(90deg, ${colors.blue}, ${colors.green})`,
              transition: 'width 0.6s ease-out',
              boxShadow: '0 0 8px rgba(59,130,246,0.4)',
            }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {sortedChallenges.map(challenge => (
              <ChallengeCard key={challenge.id} challenge={challenge} project={project} onImprove={setEditModal} />
            ))}
          </div>
        </div>}

        {/* Share */}
        <div style={{
          background: colors.card,
          border: `1px solid ${colors.border}`,
          borderRadius: 18, padding: '32px 28px', marginTop: 32,
          boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
        }}>
          <div style={{ marginBottom: 24 }}>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, letterSpacing: '-0.2px' }}>Partilha o teu projeto</h3>
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
                    boxShadow: copied ? '0 4px 16px rgba(34,197,94,0.3)' : '0 4px 16px rgba(59,130,246,0.3)',
                  }}
                >
                  {copied ? '✓ Copiado!' : 'Copiar link'}
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

        <div style={{ textAlign: 'center', padding: '40px 0 0', color: colors.subtle, fontSize: 13 }}>
          Criado com{' '}
          <span style={{
            background: 'linear-gradient(135deg, #3b82f6, #818cf8)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            backgroundClip: 'text', fontWeight: 700,
          }}>
            Showo
          </span>
          {' '}· Transforma projetos em páginas profissionais
        </div>
        </div>{/* end proj-main */}

        {/* Sidebar */}
        <aside className="proj-sidebar" style={{ paddingTop: project.cover_url ? 32 : 64 }}>
          <MembersPanel
            ownerName={ownerProfile?.full_name || ownerProfile?.username || project.creator_name}
            members={members}
            colors={colors}
            isOwner={isOwner}
          />
        </aside>
        </div>{/* end proj-layout */}

      </div>
    </div>
  )
}
