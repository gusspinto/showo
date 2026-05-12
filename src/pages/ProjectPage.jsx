import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { supabase } from '../lib/supabase'
import { calculateScore } from '../lib/score'
import { CHALLENGES, getChallengeStatus } from '../lib/challenges'
import { Navbar } from '../components/Navbar'
import { generateProject } from '../lib/generateProject'

const colors = {
  bg: '#1c2333',
  blue: '#3b82f6',
  text: '#ffffff',
  muted: '#94a3b8',
  card: '#232d42',
  border: '#2e3a54',
  green: '#22c55e',
  yellow: '#eab308',
  orange: '#f97316',
}

const CONFETTI_COLORS = ['#3b82f6', '#22c55e', '#eab308', '#f97316', '#a855f7', '#ec4899', '#06b6d4']

const PROJECT_TYPE_LABELS = {
  group: '📋 Trabalho de grupo',
  pap: '🎓 PAP / Projeto final',
  presentation: '📊 Apresentação',
  personal: '💻 Projeto pessoal',
  competition: '🏆 Projeto de competição',
  other: '✨ Outro',
}

function getLevelInfo(score) {
  if (score === 100) return { label: 'Projeto completo! 🏆', color: colors.green }
  if (score >= 81) return { label: 'Impressionante', color: colors.blue }
  if (score >= 61) return { label: 'Quase pronto', color: colors.orange }
  if (score >= 41) return { label: 'A ganhar forma', color: colors.yellow }
  return { label: 'Em desenvolvimento', color: colors.muted }
}

function ScoreRing({ score }) {
  const size = 100
  const stroke = 7
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const dash = (score / 100) * circ
  const dasharray = `${dash} ${circ - dash}`
  const { color } = getLevelInfo(score)

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', display: 'block' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={colors.border} strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={stroke}
          strokeDasharray={dasharray} strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.6s ease-out, stroke 0.4s' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontSize: 24, fontWeight: 800, color, lineHeight: 1 }}>{score}</span>
        <span style={{ fontSize: 9, color: colors.muted, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}>score</span>
      </div>
    </div>
  )
}

function Section({ icon, title, content }) {
  if (!content) return null
  return (
    <div style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 16, padding: '24px 28px', marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <span style={{ fontSize: 20 }}>{icon}</span>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>{title}</h3>
      </div>
      <p style={{ margin: 0, color: colors.text, fontSize: 16, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{content}</p>
    </div>
  )
}

function ChallengeCard({ challenge, project, onImprove }) {
  const isCompleted = getChallengeStatus(challenge, project) === 'completed'
  const val = String(project[challenge.field] || '').trim()
  const progress = Math.min(val.length / challenge.threshold, 1)

  return (
    <div style={{
      background: isCompleted ? 'rgba(34,197,94,0.06)' : colors.bg,
      border: `1px solid ${isCompleted ? 'rgba(34,197,94,0.25)' : colors.border}`,
      borderRadius: 14, padding: '18px 20px',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <span style={{ fontSize: 22, flexShrink: 0, marginTop: 1 }}>{challenge.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: isCompleted ? colors.green : colors.text }}>
              {isCompleted ? '✓ ' : ''}{challenge.title}
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, color: isCompleted ? colors.green : colors.blue, flexShrink: 0 }}>
              +{challenge.xp} XP
            </span>
          </div>
          <p style={{ margin: '0 0 10px', fontSize: 13, color: colors.muted, lineHeight: 1.5 }}>
            {challenge.description}
          </p>
          {!isCompleted && (
            <>
              <div style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: 11, color: colors.muted }}>{val.length} / {challenge.threshold} caracteres</span>
                  <span style={{ fontSize: 11, color: colors.muted }}>{Math.round(progress * 100)}%</span>
                </div>
                <div style={{ height: 4, background: colors.border, borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 2, width: `${progress * 100}%`, background: progress > 0.7 ? colors.orange : colors.blue, transition: 'width 0.3s' }} />
                </div>
              </div>
              <button
                onClick={() => onImprove(challenge)}
                style={{ background: 'rgba(59,130,246,0.12)', color: colors.blue, border: '1px solid rgba(59,130,246,0.3)', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
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
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 20, padding: '28px 32px', width: '100%', maxWidth: 560, boxShadow: '0 24px 60px rgba(0,0,0,0.5)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 26 }}>{challenge.icon}</span>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: colors.text }}>{challenge.fieldLabel}</h2>
              <span style={{ fontSize: 12, color: colors.blue, fontWeight: 600 }}>+{challenge.xp} XP ao completar</span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: colors.muted, cursor: 'pointer', fontSize: 22, lineHeight: 1, padding: 4 }}>×</button>
        </div>
        <p style={{ color: colors.muted, fontSize: 14, margin: '0 0 16px', lineHeight: 1.5 }}>{challenge.description}</p>
        <textarea
          autoFocus
          value={value}
          onChange={e => setValue(e.target.value)}
          style={{ width: '100%', minHeight: 150, background: colors.bg, border: `1.5px solid ${isComplete ? colors.green : colors.border}`, borderRadius: 10, padding: '12px 14px', color: colors.text, fontSize: 15, lineHeight: 1.6, resize: 'vertical', fontFamily: 'system-ui, sans-serif', boxSizing: 'border-box', outline: 'none', transition: 'border-color 0.2s' }}
          placeholder={`Escreve sobre ${challenge.fieldLabel.toLowerCase()}...`}
        />
        <div style={{ margin: '10px 0 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: isComplete ? colors.green : colors.muted, fontWeight: isComplete ? 600 : 400 }}>{isComplete ? '✓ Objetivo atingido!' : `${len} / ${challenge.threshold} caracteres`}</span>
            <span style={{ fontSize: 12, color: colors.muted }}>{Math.round(progress * 100)}%</span>
          </div>
          <div style={{ height: 5, background: colors.border, borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 3, width: `${progress * 100}%`, background: isComplete ? colors.green : colors.blue, transition: 'width 0.15s, background 0.3s' }} />
          </div>
        </div>
        <button
          onClick={() => onSave(value)}
          disabled={saving}
          style={{ width: '100%', background: isComplete ? colors.green : colors.blue, color: '#fff', border: 'none', borderRadius: 10, padding: '14px 0', fontSize: 16, fontWeight: 700, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.75 : 1, transition: 'background 0.3s, opacity 0.2s' }}
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
      background: 'linear-gradient(135deg, #1e3a5f, #162d4a)',
      border: `1px solid ${colors.blue}`,
      borderRadius: 12, padding: '14px 28px',
      color: colors.text, fontSize: 16, fontWeight: 600,
      zIndex: 2000,
      transition: 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s',
      whiteSpace: 'nowrap',
      boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
      pointerEvents: 'none',
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

export default function ProjectPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
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
    }
    fetchProject()
  }, [slug])

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
        <div style={{ width: 40, height: 40, border: `4px solid ${colors.border}`, borderTop: `4px solid ${colors.blue}`, borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (!project) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: colors.bg, color: colors.text, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif', gap: 16, textAlign: 'center', padding: 24 }}>
        <div style={{ fontSize: 48 }}>🔍</div>
        <h2 style={{ margin: 0, fontSize: 24 }}>Este projeto não existe ou foi removido</h2>
        <p style={{ color: colors.muted, margin: 0 }}>O link pode estar incorrecto ou o projeto foi eliminado.</p>
        <button
          onClick={() => navigate('/novo')}
          style={{ background: colors.blue, color: '#fff', border: 'none', borderRadius: 10, padding: '12px 28px', fontSize: 16, fontWeight: 700, cursor: 'pointer', marginTop: 8 }}
        >
          Criar o meu projeto →
        </button>
        <button
          onClick={() => navigate('/')}
          style={{ background: 'transparent', border: `1px solid ${colors.border}`, color: colors.muted, borderRadius: 8, padding: '10px 22px', fontSize: 14, cursor: 'pointer' }}
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

  const sortedChallenges = [...CHALLENGES].sort((a, b) => {
    const aCompleted = getChallengeStatus(a, project) === 'completed' ? 1 : 0
    const bCompleted = getChallengeStatus(b, project) === 'completed' ? 1 : 0
    return aCompleted - bCompleted
  })
  const completedCount = CHALLENGES.filter(c => getChallengeStatus(c, project) === 'completed').length
  const earnedXP = CHALLENGES.reduce((sum, c) => sum + (getChallengeStatus(c, project) === 'completed' ? c.xp : 0), 0)
  const totalXP = CHALLENGES.reduce((sum, c) => sum + c.xp, 0)

  return (
    <div style={{ minHeight: '100vh', backgroundColor: colors.bg, color: colors.text, fontFamily: 'system-ui, sans-serif' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes confetti-fall {
          0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
          80% { opacity: 1; }
          100% { transform: translateY(105vh) rotate(720deg); opacity: 0; }
        }
      `}</style>

      {showConfetti && <Confetti />}
      <Toast message={toast.message} visible={toast.visible} />
      {editModal && (
        <EditModal challenge={editModal} project={project} onClose={() => setEditModal(null)} onSave={handleSave} saving={saving} />
      )}

      <Navbar>
        {project && (!project.edit_token || localStorage.getItem(`edit_token_${project.slug}`)) && (
          <button
            onClick={() => {
              const token = localStorage.getItem(`edit_token_${project.slug}`)
              navigate(`/editar/${project.slug}${token ? `?token=${token}` : ''}`)
            }}
            style={{ background: 'transparent', border: `1px solid ${colors.border}`, color: colors.muted, borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            ✏️ Editar
          </button>
        )}
        <button
          onClick={() => navigate('/novo')}
          style={{ background: colors.blue, color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
        >
          Criar projeto
        </button>
      </Navbar>

      <div style={{ maxWidth: 780, margin: '0 auto', padding: '0 24px 80px' }}>

        {/* Cover image */}
        {project.cover_url && (
          <div style={{ width: '100%', height: 280, position: 'relative', marginTop: 32, borderRadius: 16, overflow: 'hidden' }}>
            <img src={project.cover_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 40%, #1c2333)' }} />
          </div>
        )}

        {/* Hero */}
        <div style={{ position: 'relative', padding: `${project.cover_url ? '32px' : '60px'} 0 40px` }}>
          {/* Score + level */}
          <div style={{ position: 'absolute', top: project.cover_url ? 32 : 60, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <ScoreRing score={displayScore} />
            <div style={{ background: level.color + '20', color: level.color, borderRadius: 999, padding: '4px 10px', fontSize: 10, fontWeight: 700, border: `1px solid ${level.color}40`, textAlign: 'center', maxWidth: 110, lineHeight: 1.4 }}>
              {level.label}
            </div>
            {internshipReady && (
              <div style={{ background: 'rgba(34,197,94,0.1)', color: colors.green, border: '1px solid rgba(34,197,94,0.3)', borderRadius: 999, padding: '4px 10px', fontSize: 10, fontWeight: 700, textAlign: 'center', maxWidth: 110, lineHeight: 1.4 }}>
                ✅ Pronto para estágio
              </div>
            )}
          </div>

          {/* Badges row */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
            {project.area && (
              <div style={{ background: '#1e3a5f', color: colors.blue, borderRadius: 999, padding: '5px 14px', fontSize: 13, fontWeight: 600 }}>
                {project.area}
              </div>
            )}
            {project.project_type && PROJECT_TYPE_LABELS[project.project_type] && (
              <div style={{ background: 'rgba(148,163,184,0.1)', color: colors.muted, borderRadius: 999, padding: '5px 14px', fontSize: 13, fontWeight: 600, border: `1px solid ${colors.border}` }}>
                {PROJECT_TYPE_LABELS[project.project_type]}
              </div>
            )}
            {isPap && (
              <div style={{ background: 'rgba(234,179,8,0.1)', color: colors.yellow, borderRadius: 999, padding: '5px 14px', fontSize: 13, fontWeight: 700, border: '1px solid rgba(234,179,8,0.3)' }}>
                🎓 PAP
              </div>
            )}
          </div>

          <h1 style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 800, margin: '0 0 16px', lineHeight: 1.1, paddingRight: 130 }}>
            {project.name}
          </h1>

          {project.ai_tagline && (
            <p style={{ fontSize: 20, color: colors.muted, lineHeight: 1.6, margin: '0 0 20px', maxWidth: 600 }}>
              {project.ai_tagline}
            </p>
          )}

          {/* Creator attribution */}
          {(project.creator_name || project.course || project.school_year) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ width: 32, height: 32, background: colors.blue, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, flexShrink: 0 }}>
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
                    <a href={project.linkedin_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(10,102,194,0.12)', border: '1px solid rgba(10,102,194,0.3)', color: '#60a5fa', borderRadius: 8, padding: '6px 12px', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                      <span>in</span> LinkedIn
                    </a>
                  )}
                  {project.github_url && (
                    <a href={project.github_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.06)', border: `1px solid ${colors.border}`, color: colors.text, borderRadius: 8, padding: '6px 12px', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                      GitHub
                    </a>
                  )}
                  {project.portfolio_url && (
                    <a href={project.portfolio_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.3)', color: '#c084fc', borderRadius: 8, padding: '6px 12px', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                      🌐 Portfólio
                    </a>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* AI Description */}
        {project.ai_description && (
          <div style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #1a2d4a 100%)', border: '1px solid #2563eb40', borderRadius: 16, padding: '24px 28px', marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 16 }}>✨</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: colors.blue, textTransform: 'uppercase', letterSpacing: 1 }}>Resumo gerado por IA</span>
              </div>
              <button
                onClick={handleRegenerate}
                disabled={regenerating || regenCooldown > 0}
                style={{ background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.3)', color: colors.blue, borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: (regenerating || regenCooldown > 0) ? 'default' : 'pointer', opacity: (regenerating || regenCooldown > 0) ? 0.6 : 1, whiteSpace: 'nowrap' }}
              >
                {regenerating ? '⏳ A gerar...' : regenCooldown > 0 ? `🕐 ${regenCooldown}s` : '🔄 Regenerar'}
              </button>
            </div>
            <p style={{ margin: 0, fontSize: 16, lineHeight: 1.8, color: '#e2e8f0' }}>{project.ai_description}</p>
          </div>
        )}

        {/* Highlights */}
        {highlights.length > 0 && (
          <div style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 16, padding: '24px 28px', marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
              <span style={{ fontSize: 20 }}>🏆</span>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>Destaques</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {highlights.map((h, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ width: 22, height: 22, background: '#166534', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                    <span style={{ color: colors.green, fontSize: 12, fontWeight: 700 }}>✓</span>
                  </div>
                  <p style={{ margin: 0, color: colors.text, fontSize: 15, lineHeight: 1.6 }}>{h}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PAP details */}
        {isPap && (project.pap_supervisor || project.pap_date) && (
          <div style={{ background: 'rgba(234,179,8,0.06)', border: '1px solid rgba(234,179,8,0.2)', borderRadius: 16, padding: '20px 24px', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 18 }}>🎓</span>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: colors.yellow, textTransform: 'uppercase', letterSpacing: 0.5 }}>Detalhes da PAP</h3>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
              {project.pap_supervisor && (
                <div>
                  <div style={{ fontSize: 11, color: colors.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 }}>Orientador</div>
                  <div style={{ fontSize: 15, color: colors.text }}>{project.pap_supervisor}</div>
                </div>
              )}
              {project.pap_date && (
                <div>
                  <div style={{ fontSize: 11, color: colors.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 }}>Apresentação</div>
                  <div style={{ fontSize: 15, color: colors.text }}>{project.pap_date}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Project sections */}
        <Section icon="🎯" title="Problema" content={project.problem} />
        <Section icon="💡" title="Solução" content={project.solution} />
        <Section icon="👥" title="Público-alvo" content={project.target_audience} />
        <Section icon="⚙️" title="Funcionalidades" content={project.features} />
        <Section icon="🛠️" title="Tecnologias" content={project.technologies} />
        <Section icon="🧗" title="Desafios" content={project.challenges} />
        <Section icon="📈" title="Resultados" content={project.results} />
        <Section icon="🧠" title="Aprendizagens" content={project.learnings} />

        {/* Missions */}
        <div style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 20, padding: 28, marginBottom: 16, marginTop: 8 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <span style={{ fontSize: 22 }}>🎮</span>
                <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Missões</h3>
              </div>
              <p style={{ margin: 0, fontSize: 14, color: colors.muted }}>Completa missões para melhorar o teu projeto e aumentar o score</p>
            </div>
            <div style={{ background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 12, padding: '10px 18px', textAlign: 'center', flexShrink: 0 }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: colors.blue }}>{earnedXP} <span style={{ fontSize: 13, color: colors.muted, fontWeight: 400 }}>/ {totalXP} XP</span></div>
              <div style={{ fontSize: 11, color: colors.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{completedCount}/{CHALLENGES.length} completas</div>
            </div>
          </div>
          <div style={{ height: 6, background: colors.border, borderRadius: 3, overflow: 'hidden', marginBottom: 20 }}>
            <div style={{ height: '100%', borderRadius: 3, width: `${(earnedXP / totalXP) * 100}%`, background: `linear-gradient(90deg, ${colors.blue}, ${colors.green})`, transition: 'width 0.6s ease-out' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {sortedChallenges.map(challenge => (
              <ChallengeCard key={challenge.id} challenge={challenge} project={project} onImprove={setEditModal} />
            ))}
          </div>
        </div>

        {/* Share */}
        <div style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 16, padding: '32px 28px', marginTop: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
            <span style={{ fontSize: 22 }}>🔗</span>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Partilha o teu projeto</h3>
          </div>
          <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <p style={{ color: colors.muted, fontSize: 14, margin: '0 0 12px' }}>Link do projeto</p>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <div style={{ flex: 1, background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 8, padding: '10px 14px', fontSize: 13, color: colors.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {pageUrl}
                </div>
                <button
                  onClick={handleCopy}
                  style={{ background: copied ? colors.green : colors.blue, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'background 0.2s' }}
                >
                  {copied ? '✓ Copiado!' : 'Copiar link'}
                </button>
              </div>
              <button
                onClick={() => navigate('/novo')}
                style={{ background: 'transparent', border: `1px solid ${colors.border}`, color: colors.muted, borderRadius: 8, padding: '10px 18px', fontSize: 14, cursor: 'pointer', width: '100%' }}
              >
                Criar o meu projeto →
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
              <div style={{ background: '#fff', borderRadius: 12, padding: 12 }}>
                <QRCodeSVG value={pageUrl} size={120} />
              </div>
              <span style={{ color: colors.muted, fontSize: 12 }}>QR Code</span>
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'center', padding: '40px 0 0', color: colors.muted, fontSize: 13 }}>
          Criado com <span style={{ color: colors.blue, fontWeight: 700 }}>Showo</span> · Transforma projetos em páginas profissionais
        </div>
      </div>
    </div>
  )
}
