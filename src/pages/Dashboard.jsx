import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Pencil, ExternalLink } from 'lucide-react'
import { Navbar } from '../components/Navbar'
import { Folder, Trophy, BarChart2, Rocket, Eye, GraduationCap, Plus, X, Users, ChevronRight, User, Settings, Compass, Medal, LogOut, Globe, TrendingUp, MessageSquare, Star, Mail, Search, ChevronDown, BookOpen, Trash2 } from 'lucide-react'

const C = {
  bg: '#0d1424',
  card: '#152030',
  cardHover: '#1c2d44',
  border: '#1e3050',
  borderBright: '#2a4275',
  blue: '#1b78f7',
  blueHover: '#1564d4',
  muted: '#7d93b0',
  text: '#e8f2ff',
  subtle: '#3d5270',
  green: '#34d399',
  yellow: '#fbbf24',
  red: '#f87171',
  purple: '#a78bfa',
}

function getScoreColor(score) {
  if (score == null) return C.muted
  if (score >= 90) return C.green
  if (score >= 71) return C.blue
  if (score >= 40) return C.yellow
  return C.red
}

function getDisplayName(user) {
  const name = user?.user_metadata?.full_name
  if (name) return name.split(' ')[0]
  return user?.email?.split('@')[0] ?? ''
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 860)
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= 860)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return isMobile
}

function ScoreBadge({ score }) {
  const color = getScoreColor(score)
  return (
    <span style={{
      background: `${color}18`, border: `1px solid ${color}44`,
      borderRadius: 6, padding: '2px 9px', color, fontSize: 12, fontWeight: 700,
    }}>
      {score ?? '—'}
    </span>
  )
}

function StatCard({ icon, label, value, color, onClick, expandable, expanded, children }) {
  return (
    <div
      onClick={onClick}
      className="stat-card-wrap"
      style={{
        background: C.card,
        border: `1px solid ${expanded ? C.borderBright : C.border}`,
        borderRadius: 14, padding: '20px 22px',
        display: 'flex', flexDirection: 'column', gap: 6,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'background 0.15s, border-color 0.15s',
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: color ?? C.text }}>
        {icon}
        {expandable && (
          <ChevronDown
            size={15} color={C.muted}
            style={{ transition: 'transform 0.2s', transform: expanded ? 'rotate(180deg)' : 'none' }}
          />
        )}
      </span>
      <span style={{ color: color ?? C.text, fontSize: 26, fontWeight: 800, letterSpacing: '-0.5px', lineHeight: 1 }}>
        {value}
      </span>
      <span style={{ color: C.muted, fontSize: 13 }}>{label}</span>
      {expanded && children && (
        <div style={{ marginTop: 10, borderTop: `1px solid ${C.border}`, paddingTop: 10 }}>
          {children}
        </div>
      )}
    </div>
  )
}

function ActionBtn({ onClick, label, primary }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: primary ? (hovered ? C.blueHover : C.blue) : (hovered ? 'rgba(255,255,255,0.07)' : 'transparent'),
        border: primary ? 'none' : `1px solid ${C.border}`,
        borderRadius: 7, padding: '7px 14px',
        color: primary ? '#fff' : C.muted,
        fontSize: 13, fontWeight: 600, cursor: 'pointer',
        fontFamily: 'var(--font-body)', transition: 'background 0.15s, color 0.15s',
      }}
    >
      {label}
    </button>
  )
}

function ProjectRow({ project, onView, onEdit, onDelete }) {
  const [hovered, setHovered] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const date = new Date(project.created_at).toLocaleDateString('pt-PT', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? C.cardHover : C.card,
        border: `1px solid ${hovered ? C.borderBright : C.border}`,
        borderRadius: 12, padding: '16px 20px',
        display: 'flex', alignItems: 'center', gap: 14,
        transition: 'background 0.15s, border-color 0.15s',
        cursor: 'default',
      }}
      className="dash-project-row"
    >
      {/* Score ring */}
      <div style={{
        width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
        background: `conic-gradient(${getScoreColor(project.score)} ${(project.score ?? 0) * 3.6}deg, #1e3050 0deg)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          width: 34, height: 34, borderRadius: '50%', background: C.card,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 700, color: getScoreColor(project.score),
        }}>
          {project.score ?? '—'}
        </div>
      </div>

      {/* Info */}
      <div className="dash-project-info" style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
          <span style={{ color: C.text, fontSize: 15, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {project.name}
          </span>
          {project.area && (
            <span style={{ color: C.muted, fontSize: 12, background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`, borderRadius: 5, padding: '1px 7px', flexShrink: 0 }}>
              {project.area}
            </span>
          )}
        </div>
        {project.ai_tagline && (
          <p style={{ color: C.muted, fontSize: 13, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {project.ai_tagline}
          </p>
        )}
        <span style={{ color: C.subtle, fontSize: 11, marginTop: 3, display: 'block' }}>{date}</span>
      </div>

      {/* Actions */}
      <div className="dash-project-actions">
        {confirmDelete ? (
          <>
            <span style={{ fontSize: 12, color: C.muted, alignSelf: 'center' }}>Tens a certeza?</span>
            <ActionBtn onClick={() => { onDelete(project.id); setConfirmDelete(false) }} label="Apagar" />
            <ActionBtn onClick={() => setConfirmDelete(false)} label="Cancelar" primary />
          </>
        ) : (
          <>
            <ActionBtn onClick={() => setConfirmDelete(true)} label="Apagar" />
            <ActionBtn onClick={onEdit} label="Editar" />
            <ActionBtn onClick={onView} label="Ver" primary />
          </>
        )}
      </div>
    </div>
  )
}

const QUICK_TYPES = [
  { id: 'pap',        label: 'PAP',               formGoal: 'school' },
  { id: 'internship', label: 'Estágio',            formGoal: 'work'   },
  { id: 'group',      label: 'Trabalho de grupo',  formGoal: 'school' },
  { id: 'personal',   label: 'Projeto pessoal',    formGoal: 'personal'},
  { id: 'competition',label: 'Competição',         formGoal: 'personal'},
]

function QuickCreateProject({ navigate }) {
  const [type, setType] = useState('')
  const [desc, setDesc] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    navigate('/interview', { state: { type: type || 'personal', description: desc.trim() } })
  }

  return (
    <div style={{ marginBottom: 28 }}>
      <form onSubmit={handleSubmit} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Type pills */}
        <div className="qc-pills" style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
          {QUICK_TYPES.map(t => {
            const sel = type === t.id
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setType(sel ? '' : t.id)}
                className="qc-pill"
                style={{ fontSize: 12, padding: '5px 12px', borderRadius: 20, border: `1px solid ${sel ? C.blue : C.border}`, background: sel ? `${C.blue}22` : 'transparent', color: sel ? '#60a5fa' : C.muted, cursor: 'pointer', fontFamily: 'inherit', fontWeight: sel ? 700 : 400, transition: 'all 0.12s' }}
              >
                {t.label}
              </button>
            )
          })}
        </div>
        {/* Input + button */}
        <div className="qc-input-row" style={{ display: 'flex', gap: 9 }}>
          <input
            value={desc}
            onChange={e => setDesc(e.target.value)}
            placeholder={type ? `Nome do teu ${QUICK_TYPES.find(t => t.id === type)?.label.toLowerCase()}...` : 'Descreve o teu projeto em poucas palavras...'}
            className="qc-input"
            style={{ flex: 1, background: '#0d1424', border: `1px solid ${C.border}`, borderRadius: 10, padding: '11px 14px', color: C.text, fontSize: 14, fontFamily: 'inherit', outline: 'none', minWidth: 0 }}
            onFocus={e => e.target.style.borderColor = C.borderBright}
            onBlur={e => e.target.style.borderColor = C.border}
          />
          <button
            type="submit"
            className="qc-btn"
            style={{ background: `linear-gradient(135deg, ${C.blue}, #4f46e5)`, border: 'none', borderRadius: 10, width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, boxShadow: '0 4px 16px rgba(59,130,246,0.35)' }}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </button>
        </div>
        <p className="qc-footnote" style={{ margin: 0, fontSize: 12, color: C.subtle, textAlign: 'center' }}>Sem registo obrigatório · Sem cartão de crédito</p>
      </form>
    </div>
  )
}

function JoinTurmaBar({ navigate }) {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(false)

  async function handleJoin(e) {
    e.preventDefault()
    const trimmed = code.trim().toUpperCase()
    if (!trimmed) return
    setChecking(true)
    setError('')
    const { data } = await supabase
      .from('classes')
      .select('code')
      .eq('code', trimmed)
      .single()
    setChecking(false)
    if (!data) { setError('Código inválido. Verifica com o professor.'); return }
    navigate(`/turma/${trimmed}`)
  }

  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '16px 20px', marginBottom: 28, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
      <i className="fi fi-rs-workshop" style={{ fontSize: 18, color: '#3b82f6', flexShrink: 0, lineHeight: 1 }} />
      <span style={{ fontSize: 14, fontWeight: 600, color: C.text, flexShrink: 0 }}>Entrar numa turma</span>
      <form onSubmit={handleJoin} style={{ display: 'flex', gap: 8, flex: 1, minWidth: 200 }}>
        <input
          value={code}
          onChange={e => { setCode(e.target.value.toUpperCase()); setError('') }}
          placeholder="Código da turma"
          maxLength={6}
          style={{ flex: 1, background: '#0d1424', border: `1px solid ${error ? '#f87171' : C.border}`, borderRadius: 8, padding: '8px 12px', color: C.text, fontSize: 14, fontFamily: 'inherit', outline: 'none', letterSpacing: 2, fontWeight: 700, minWidth: 0 }}
        />
        <button
          type="submit"
          disabled={checking || !code.trim()}
          style={{ background: C.blue, border: 'none', borderRadius: 8, padding: '8px 18px', color: '#fff', fontSize: 13, fontWeight: 600, cursor: checking || !code.trim() ? 'default' : 'pointer', opacity: checking || !code.trim() ? 0.6 : 1, fontFamily: 'inherit', flexShrink: 0 }}
        >
          {checking ? '…' : 'Entrar'}
        </button>
      </form>
      {error && <span style={{ fontSize: 12, color: '#f87171', width: '100%', marginTop: -4 }}>{error}</span>}
    </div>
  )
}

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

function CreateTurmaModal({ onClose, onCreated }) {
  const { user, profile } = useAuth()
  const [name, setName] = useState('')
  const [subject, setSubject] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleCreate(e) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    setError('')
    const code = generateCode()
    const teacherName = profile?.full_name || user?.user_metadata?.full_name || ''
    const { data, error: err } = await supabase
      .from('classes')
      .insert({ name: name.trim(), subject: subject.trim() || null, code, teacher_id: user.id, teacher_name: teacherName })
      .select()
      .single()
    setSaving(false)
    if (err) { setError(err.message); return }
    onCreated(data)
    onClose()
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: C.card, border: `1px solid ${C.borderBright}`, borderRadius: 18, padding: 28, width: '100%', maxWidth: 400, boxShadow: '0 16px 48px rgba(0,0,0,0.6)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: C.text }}>Nova turma</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, padding: 4 }}><X size={18} /></button>
        </div>
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: C.muted, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Nome da turma *</label>
            <input
              value={name} onChange={e => setName(e.target.value)} required
              placeholder="ex: Turma A — 11º ano"
              style={{ width: '100%', background: '#0d1424', border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 12px', color: C.text, fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none' }}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: C.muted, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Disciplina</label>
            <input
              value={subject} onChange={e => setSubject(e.target.value)}
              placeholder="ex: Programação e Sistemas de Informação"
              style={{ width: '100%', background: '#0d1424', border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 12px', color: C.text, fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none' }}
            />
          </div>
          {error && <p style={{ color: '#f87171', fontSize: 13, margin: 0 }}>{error}</p>}
          <button type="submit" disabled={saving || !name.trim()} style={{ background: 'linear-gradient(135deg,#3b82f6,#4f46e5)', border: 'none', borderRadius: 8, padding: '11px', color: '#fff', fontSize: 14, fontWeight: 600, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.7 : 1, fontFamily: 'inherit', marginTop: 4 }}>
            {saving ? 'A criar…' : 'Criar turma'}
          </button>
        </form>
      </div>
    </div>
  )
}

function TurmaCard({ turma, navigate }) {
  const [hov, setHov] = useState(false)
  return (
    <div
      onClick={() => navigate(`/turma/${turma.code}`)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{ background: hov ? C.cardHover : C.card, border: `1px solid ${hov ? C.borderBright : C.border}`, borderRadius: 12, padding: '16px 18px', cursor: 'pointer', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 14 }}
    >
      <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <i className="fi fi-rs-workshop" style={{ fontSize: 18, color: '#3b82f6', lineHeight: 1 }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: C.text, fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{turma.name}</div>
        {turma.subject && <div style={{ color: C.muted, fontSize: 12, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{turma.subject}</div>}
        <div style={{ color: C.subtle, fontSize: 11, marginTop: 4, display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ color: '#60a5fa', fontWeight: 700, letterSpacing: 1 }}>{turma.code}</span>
          {turma.project_count != null && <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Users size={10} />{turma.project_count} projeto{turma.project_count !== 1 ? 's' : ''}</span>}
          {turma.avg_score != null && <span style={{ color: turma.avg_score >= 70 ? '#22c55e' : turma.avg_score >= 40 ? '#eab308' : '#f97316', fontWeight: 700 }}>⌀ {turma.avg_score}</span>}
        </div>
      </div>
      <ChevronRight size={16} color={C.subtle} />
    </div>
  )
}

const ONBOARDING = {
  aluno: {
    title: 'Bem-vindo ao Showo!',
    subtitle: 'O teu portfólio profissional começa aqui.',
    steps: [
      { icon: <Pencil size={20} color="#7d93b0" />, title: 'Cria o teu projeto', desc: 'Responde a algumas perguntas sobre o teu trabalho — a IA trata do resto.' },
      { icon: <Globe size={20} color="#7d93b0" />, title: 'Partilha a tua página', desc: 'Cada projeto ganha uma página pública pronta a enviar a recrutadores e professores.' },
      { icon: <TrendingUp size={20} color="#7d93b0" />, title: 'Acompanha o crescimento', desc: 'Vê o score, visualizações e feedback em tempo real.' },
    ],
    cta: 'Criar o meu primeiro projeto',
    ctaPath: '/interview',
    ctaState: { type: 'personal', description: '' },
  },
  professor: {
    title: 'Bem-vindo ao Showo!',
    subtitle: 'Acompanha e avalia os projetos dos teus alunos.',
    steps: [
      { icon: <GraduationCap size={20} color="#7d93b0" />, title: 'Cria uma turma', desc: 'Gera um código único e partilha-o com os teus alunos para que se juntem.' },
      { icon: <BarChart2 size={20} color="#7d93b0" />, title: 'Acompanha o progresso', desc: 'Vê scores, completude e evolução de cada aluno numa tabela clara.' },
      { icon: <MessageSquare size={20} color="#7d93b0" />, title: 'Dá feedback', desc: 'Deixa comentários por secção diretamente nos projetos dos alunos.' },
    ],
    cta: 'Criar a minha primeira turma',
    ctaAction: 'createTurma',
  },
  recrutador: {
    title: 'Bem-vindo ao Showo!',
    subtitle: 'Descobre talentos reais com projetos reais.',
    steps: [
      { icon: <Compass size={20} color="#7d93b0" />, title: 'Explora projetos', desc: 'Navega por projetos de estudantes organizados por área e score.' },
      { icon: <Star size={20} color="#7d93b0" />, title: 'Perfis completos', desc: 'Cada aluno tem uma página com links, tecnologias e contexto do projeto.' },
      { icon: <Mail size={20} color="#7d93b0" />, title: 'Contacta diretamente', desc: 'Encontra o LinkedIn ou email de cada candidato no perfil.' },
    ],
    cta: 'Explorar projetos',
    ctaPath: '/explorar',
  },
  empresa: {
    title: 'Bem-vindo ao Showo!',
    subtitle: 'Encontra o talento certo para a tua empresa.',
    steps: [
      { icon: <Search size={20} color="#7d93b0" />, title: 'Descobre talento jovem', desc: 'Acede a projetos reais de estudantes do ensino profissional e universitário.' },
      { icon: <Trophy size={20} color="#7d93b0" />, title: 'Filtra pelos melhores', desc: 'O ranking e os scores ajudam-te a identificar rapidamente os candidatos de destaque.' },
      { icon: <Users size={20} color="#7d93b0" />, title: 'Estabelece contacto', desc: 'Cada perfil inclui links de contacto direto com o estudante.' },
    ],
    cta: 'Ver ranking',
    ctaPath: '/ranking',
  },
}

function OnboardingModal({ user, profile, onDismiss, onCreateTurma }) {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const role = profile?.role || 'aluno'
  const cfg = ONBOARDING[role] || ONBOARDING.aluno
  const totalSteps = 2

  function handleCta() {
    onDismiss()
    if (cfg.ctaAction === 'createTurma') {
      onCreateTurma()
    } else if (cfg.ctaPath) {
      navigate(cfg.ctaPath, cfg.ctaState ? { state: cfg.ctaState } : undefined)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 4000,
      background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div style={{
        background: '#111827', border: '1px solid #2a4275',
        borderRadius: 20, padding: '36px 32px', width: '100%', maxWidth: 440,
        boxShadow: '0 24px 64px rgba(0,0,0,0.7)',
        fontFamily: 'Inter, sans-serif',
      }}>
        {step === 0 ? (
          <>
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <img src="/icon.png" alt="Showo" style={{ width: 60, height: 60, objectFit: 'contain', marginBottom: 14, display: 'block', margin: '0 auto 14px' }} />
              <h2 style={{ color: '#e8f2ff', fontSize: 22, fontWeight: 800, margin: '0 0 8px', letterSpacing: '-0.3px' }}>
                {cfg.title}
              </h2>
              <p style={{ color: '#7d93b0', fontSize: 15, margin: 0, lineHeight: 1.5 }}>{cfg.subtitle}</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
              {cfg.steps.map((s, i) => (
                <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', background: 'rgba(255,255,255,0.03)', border: '1px solid #1e3050', borderRadius: 12, padding: '14px 16px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1, width: 24, height: 24 }}>{s.icon}</span>
                  <div>
                    <div style={{ color: '#e8f2ff', fontSize: 14, fontWeight: 600, marginBottom: 3 }}>{s.title}</div>
                    <div style={{ color: '#7d93b0', fontSize: 13, lineHeight: 1.4 }}>{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setStep(1)}
                style={{ flex: 1, background: 'linear-gradient(135deg,#1b78f7,#4f46e5)', border: 'none', borderRadius: 10, padding: '13px', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 20px rgba(27,120,247,0.35)' }}
              >
                Continuar →
              </button>
            </div>
            <button
              onClick={onDismiss}
              style={{ display: 'block', width: '100%', background: 'none', border: 'none', color: '#3d5270', fontSize: 13, cursor: 'pointer', marginTop: 14, fontFamily: 'inherit', padding: 0 }}
            >
              Saltar introdução
            </button>
          </>
        ) : (
          <>
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}><Rocket size={44} color="#1b78f7" /></div>
              <h2 style={{ color: '#e8f2ff', fontSize: 20, fontWeight: 800, margin: '0 0 8px', letterSpacing: '-0.3px' }}>
                Pronto para começar?
              </h2>
              <p style={{ color: '#7d93b0', fontSize: 14, margin: 0, lineHeight: 1.55, maxWidth: 320, marginLeft: 'auto', marginRight: 'auto' }}>
                {role === 'aluno' && 'A IA vai guiar-te passo a passo para transformar o teu projeto numa página profissional.'}
                {role === 'professor' && 'Cria a tua turma agora e partilha o código com os teus alunos.'}
                {role === 'recrutador' && 'Explora os projetos e descobre os talentos que procuras.'}
                {role === 'empresa' && 'Vê quem está no topo do ranking e encontra o teu próximo talento.'}
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                onClick={handleCta}
                style={{ background: 'linear-gradient(135deg,#1b78f7,#4f46e5)', border: 'none', borderRadius: 10, padding: '14px', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 20px rgba(27,120,247,0.35)' }}
              >
                {cfg.cta} →
              </button>
              <button
                onClick={onDismiss}
                style={{ background: 'transparent', border: '1px solid #1e3050', borderRadius: 10, padding: '13px', color: '#7d93b0', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Explorar primeiro
              </button>
            </div>
          </>
        )}

        {/* Dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 20 }}>
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div key={i} style={{ width: i === step ? 20 : 6, height: 6, borderRadius: 3, background: i === step ? '#1b78f7' : '#1e3050', transition: 'all 0.2s' }} />
          ))}
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { user, profile, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const [projects, setProjects] = useState([])
  const [loadingProjects, setLoadingProjects] = useState(true)
  const [turmas, setTurmas] = useState([])
  const [showCreateTurma, setShowCreateTurma] = useState(false)
  const [toast, setToast] = useState('')
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [projCardOpen, setProjCardOpen] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [collabProjects, setCollabProjects] = useState([])

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  function dismissOnboarding() {
    localStorage.setItem(`showo_onboarded_${user.id}`, '1')
    setShowOnboarding(false)
  }

  useEffect(() => {
    if (!authLoading && !user) navigate('/login')
  }, [user, authLoading, navigate])

  useEffect(() => {
    if (!user) return
    const key = `showo_onboarded_${user.id}`
    if (!localStorage.getItem(key)) {
      setShowOnboarding(true)
    }
  }, [user])

  useEffect(() => {
    if (!user) return
    async function load() {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, slug, score, area, created_at, ai_tagline, views')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      if (!error) setProjects(data || [])
      setLoadingProjects(false)
    }
    load()
  }, [user])

  async function deleteProject(id) {
    await supabase.from('projects').delete().eq('id', id).eq('user_id', user.id)
    setProjects(prev => prev.filter(p => p.id !== id))
    showToast('Projeto eliminado.')
  }

  useEffect(() => {
    if (!user) return
    async function loadCollabProjects() {
      const { data: collabs } = await supabase
        .from('project_collaborators')
        .select('project_id')
        .eq('user_id', user.id)
        .eq('status', 'accepted')
      if (!collabs?.length) return
      const ids = collabs.map(c => c.project_id)
      const { data: projs } = await supabase
        .from('projects')
        .select('id, name, slug, score, area, ai_tagline, creator_name')
        .in('id', ids)
        .order('score', { ascending: false })
      setCollabProjects(projs || [])
    }
    loadCollabProjects()
  }, [user])

  useEffect(() => {
    if (!user || profile?.role !== 'professor') return
    async function loadTurmas() {
      const { data: cls } = await supabase
        .from('classes')
        .select('id, name, subject, code, created_at')
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false })
      if (!cls?.length) { setTurmas([]); return }

      const { data: cp } = await supabase
        .from('class_projects')
        .select('class_id, project_id')
        .in('class_id', cls.map(c => c.id))

      const counts = {}
      const classProjects = {}
      cp?.forEach(r => {
        counts[r.class_id] = (counts[r.class_id] || 0) + 1
        if (!classProjects[r.class_id]) classProjects[r.class_id] = []
        classProjects[r.class_id].push(r.project_id)
      })

      // Fetch scores for all projects across all turmas
      const allProjectIds = cp?.map(r => r.project_id) ?? []
      let scoreMap = {}
      if (allProjectIds.length) {
        const { data: projs } = await supabase
          .from('projects')
          .select('id, score')
          .in('id', allProjectIds)
        projs?.forEach(p => { scoreMap[p.id] = p.score })
      }

      setTurmas(cls.map(c => {
        const ids = classProjects[c.id] ?? []
        const scores = ids.map(id => scoreMap[id]).filter(s => s != null)
        const avg_score = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null
        return { ...c, project_count: counts[c.id] ?? 0, avg_score }
      }))
    }
    loadTurmas()
  }, [user, profile?.role])

  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 32, height: 32, border: `2px solid ${C.border}`, borderTop: `2px solid ${C.blue}`, borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (!user) return null

  const firstName = getDisplayName(user)
  const scores = projects.map(p => p.score).filter(s => s != null)
  const bestScore = scores.length ? Math.max(...scores) : null
  const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null
  const totalViews = projects.reduce((sum, p) => sum + (p.views ?? 0), 0)

  const greeting = (() => {
    const h = new Date().getHours()
    if (h >= 5  && h < 12) return `Bom dia, ${firstName}`
    if (h >= 12 && h < 17) return `Boa tarde, ${firstName}`
    if (h >= 17 && h < 21) return `Boa noite, ${firstName}`
    if (h >= 21 && h < 24) return `Ainda aqui, ${firstName}?`
    return `A acabar à última da hora, ${firstName}?`
  })()

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: 'var(--font-body)' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .dash-project-actions { display: flex; gap: 6px; flex-shrink: 0; }
        @media (max-width: 860px) {
          /* Hide full project list on mobile/tablet */
          .dash-proj-section { display: none !important; }
          /* Equal horizontal padding for centered layout */
          .dash-content { padding-left: 20px !important; padding-right: 20px !important; }
          /* Stat cards tappable */
          .stat-card-wrap { user-select: none; -webkit-tap-highlight-color: transparent; }
          .stat-card-wrap:active { background: #1c2d44 !important; }
        }
        @media (max-width: 600px) {
          .dash-project-row { flex-wrap: wrap; gap: 10px !important; }
          .dash-project-info { min-width: 0; flex: 1 1 calc(100% - 58px); }
          .dash-project-actions { width: 100%; justify-content: flex-end; border-top: 1px solid #1e3050; padding-top: 10px; margin-top: 2px; }
          /* QuickCreate compact */
          .qc-pills { gap: 5px !important; }
          .qc-pill { font-size: 11px !important; padding: 4px 10px !important; }
          .qc-input-row { gap: 7px !important; }
          .qc-input { padding: 10px 12px !important; font-size: 13px !important; }
          .qc-btn { width: 40px !important; height: 40px !important; }
          .qc-footnote { display: none !important; }
        }
      `}</style>
      <Navbar />

      {showOnboarding && (
        <OnboardingModal
          user={user}
          profile={profile}
          onDismiss={dismissOnboarding}
          onCreateTurma={() => { dismissOnboarding(); setShowCreateTurma(true) }}
        />
      )}

      {/* Toast */}
      <div style={{
        position: 'fixed', bottom: 28, left: '50%',
        transform: `translateX(-50%) translateY(${toast ? 0 : 80}px)`,
        opacity: toast ? 1 : 0, transition: 'all 0.3s cubic-bezier(0.34,1.56,0.64,1)',
        background: '#111c32', border: `1px solid ${C.borderBright}`, borderRadius: 12,
        padding: '12px 24px', fontSize: 14, fontWeight: 600, color: C.text,
        zIndex: 3000, pointerEvents: 'none', whiteSpace: 'nowrap',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      }}>{toast}</div>

      {showCreateTurma && (
        <CreateTurmaModal
          onClose={() => setShowCreateTurma(false)}
          onCreated={turma => setTurmas(prev => [{ ...turma, project_count: 0 }, ...prev])}
        />
      )}

      <div className="dash-content" style={{ maxWidth: 800, margin: '0 auto', padding: '44px 24px 80px' }}>

        {/* Header */}
        <div style={{ marginBottom: 36, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ color: C.text, fontSize: 28, fontWeight: 800, margin: '0 0 4px', letterSpacing: '-0.5px' }}>
              {greeting}
            </h1>
            <p style={{ color: C.muted, fontSize: 15, margin: 0 }}>{user.email}</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => navigate(profile?.username ? `/u/${profile.username}` : `/u/${user.id}`)}
              style={{ background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 14px', color: C.muted, fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'border-color 0.15s, color 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = C.borderBright; e.currentTarget.style.color = C.text }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.muted }}
            >
              Ver perfil
            </button>
            <button
              onClick={() => navigate('/settings')}
              style={{ background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 14px', color: C.muted, fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'border-color 0.15s, color 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = C.borderBright; e.currentTarget.style.color = C.text }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.muted }}
            >
              Definições
            </button>
          </div>
        </div>

        {/* Professor: Turmas section */}
        {profile?.role === 'professor' && (
          <div style={{ marginBottom: 36 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h2 style={{ color: C.text, fontSize: 16, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                As minhas turmas
                {turmas.length > 0 && <span style={{ color: C.muted, fontWeight: 400, fontSize: 14 }}>({turmas.length})</span>}
              </h2>
              <button
                onClick={() => setShowCreateTurma(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: 8, padding: '7px 14px', color: '#60a5fa', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                <Plus size={14} /> Nova turma
              </button>
            </div>
            {turmas.length === 0 ? (
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '28px', textAlign: 'center' }}>
                <i className="fi fi-rs-workshop" style={{ fontSize: 36, color: C.subtle, lineHeight: 1, marginBottom: 10, display: 'block' }} />
                <p style={{ color: C.text, fontSize: 15, fontWeight: 600, margin: '0 0 6px' }}>Ainda não tens turmas</p>
                <p style={{ color: C.muted, fontSize: 13, margin: '0 0 16px' }}>Cria uma turma e partilha o código com os teus alunos.</p>
                <button onClick={() => setShowCreateTurma(true)} style={{ background: C.blue, border: 'none', borderRadius: 8, padding: '9px 20px', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Criar primeira turma →
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {turmas.map(t => <TurmaCard key={t.id} turma={t} navigate={navigate} />)}
              </div>
            )}
          </div>
        )}

        {/* Aluno: Entrar numa turma */}
        {profile?.role !== 'professor' && (
          <JoinTurmaBar navigate={navigate} />
        )}

        {/* Stats */}
        {!loadingProjects && projects.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: 12,
            marginBottom: 36,
          }}>
            <StatCard
              icon={<Folder size={22} />} label="Projetos" value={projects.length} color={C.blue}
              expandable={isMobile} expanded={isMobile && projCardOpen}
              onClick={isMobile ? () => setProjCardOpen(o => !o) : undefined}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {projects.slice(0, 5).map(p => (
                  <div
                    key={p.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '8px 10px', borderRadius: 9,
                      background: confirmDeleteId === p.id ? 'rgba(248,113,113,0.07)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${confirmDeleteId === p.id ? 'rgba(248,113,113,0.3)' : C.border}`,
                      transition: 'background 0.12s',
                    }}
                  >
                    {confirmDeleteId === p.id ? (
                      <>
                        <span style={{ fontSize: 12, color: C.muted, flex: 1 }}>Apagar projeto?</span>
                        <button onClick={e => { e.stopPropagation(); deleteProject(p.id); setConfirmDeleteId(null) }} style={{ background: 'none', border: 'none', color: '#f87171', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', padding: '2px 8px' }}>Sim</button>
                        <button onClick={e => { e.stopPropagation(); setConfirmDeleteId(null) }} style={{ background: 'none', border: 'none', color: C.muted, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', padding: '2px 8px' }}>Não</button>
                      </>
                    ) : (
                      <>
                        <div
                          onClick={e => { e.stopPropagation(); navigate(`/projeto/${p.slug}`) }}
                          style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, cursor: 'pointer',
                            background: `conic-gradient(${getScoreColor(p.score)} ${(p.score ?? 0) * 3.6}deg, #1e3050 0deg)`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                        >
                          <div style={{ width: 20, height: 20, borderRadius: '50%', background: C.card, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700, color: getScoreColor(p.score) }}>
                            {p.score ?? '—'}
                          </div>
                        </div>
                        <span
                          onClick={e => { e.stopPropagation(); navigate(`/projeto/${p.slug}`) }}
                          style={{ fontSize: 13, fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, cursor: 'pointer' }}
                        >{p.name}</span>
                        <div style={{ display: 'flex', gap: 2, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => navigate(`/editar/${p.slug}`)}
                            title="Editar"
                            style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', padding: 5, display: 'flex', alignItems: 'center', borderRadius: 5 }}
                          ><Pencil size={13} /></button>
                          <button
                            onClick={() => setConfirmDeleteId(p.id)}
                            title="Apagar"
                            style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: 5, display: 'flex', alignItems: 'center', borderRadius: 5 }}
                          ><Trash2 size={13} /></button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
                {projects.length > 5 && (
                  <span style={{ color: '#60a5fa', fontSize: 12, padding: '2px 0' }}>
                    +{projects.length - 5} mais
                  </span>
                )}
              </div>
            </StatCard>
            <StatCard icon={<Trophy size={22} />} label="Melhor score" value={bestScore ?? '—'} color={getScoreColor(bestScore)} onClick={() => navigate('/ranking')} />
            <StatCard icon={<BarChart2 size={22} />} label="Score médio" value={avgScore ?? '—'} color={getScoreColor(avgScore)} />
            <StatCard icon={<Eye size={22} />} label="Total visualizações" value={totalViews} color={C.purple} />
          </div>
        )}

        {/* Quick-create widget */}
        <QuickCreateProject navigate={navigate} />

        {/* Shared projects — only shown when user has accepted collaborations */}
        {collabProjects.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ color: C.text, fontSize: 16, fontWeight: 700, margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
              Partilhados comigo
              <span style={{ color: C.muted, fontWeight: 400, fontSize: 14 }}>({collabProjects.length})</span>
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {collabProjects.map(p => (
                <div
                  key={p.id}
                  onClick={() => navigate(`/projeto/${p.slug}`)}
                  style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', transition: 'background 0.15s, border-color 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = C.cardHover; e.currentTarget.style.borderColor = C.borderBright }}
                  onMouseLeave={e => { e.currentTarget.style.background = C.card; e.currentTarget.style.borderColor = C.border }}
                >
                  <div style={{ width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                    background: `conic-gradient(${getScoreColor(p.score)} ${(p.score ?? 0) * 3.6}deg, #1e3050 0deg)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: C.card, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: getScoreColor(p.score) }}>
                      {p.score ?? '—'}
                    </div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: C.text, fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                    {p.creator_name && <div style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>de {p.creator_name}</div>}
                  </div>
                  {p.area && (
                    <span style={{ fontSize: 11, color: C.muted, background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`, borderRadius: 5, padding: '2px 8px', flexShrink: 0 }}>
                      {p.area}
                    </span>
                  )}
                  <ChevronRight size={15} color={C.subtle} style={{ flexShrink: 0 }} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Projects — hidden on mobile/tablet, shown on desktop */}
        <div className="dash-proj-section">
          <div id="proj-list" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ color: C.text, fontSize: 16, fontWeight: 700, margin: 0 }}>
              Os meus projetos
              {projects.length > 0 && (
                <span style={{ color: C.muted, fontWeight: 400, fontSize: 14, marginLeft: 8 }}>
                  ({projects.length})
                </span>
              )}
            </h2>
          </div>

          {loadingProjects ? (
            <div style={{ color: C.muted, fontSize: 15, padding: '24px 0' }}>A carregar projetos…</div>
          ) : projects.length === 0 ? (
            <div style={{
              background: C.card, border: `1px solid ${C.border}`,
              borderRadius: 14, padding: '52px 32px', textAlign: 'center',
            }}>
              <div style={{ marginBottom: 14, display: 'flex', justifyContent: 'center', color: C.blue }}><Rocket size={44} /></div>
              <p style={{ color: C.text, fontSize: 17, fontWeight: 700, margin: '0 0 8px' }}>
                Ainda não tens projetos
              </p>
              <p style={{ color: C.muted, fontSize: 14, margin: '0 0 24px', lineHeight: 1.65 }}>
                Cria o teu primeiro projeto e partilha o que estás a construir com o mundo.
              </p>
              <button
                onClick={() => navigate('/novo')}
                style={{
                  background: C.blue, border: 'none', borderRadius: 8,
                  padding: '11px 24px', color: '#fff', fontSize: 14, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Criar primeiro projeto →
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {projects.map(project => (
                <ProjectRow
                  key={project.id}
                  project={project}
                  onView={() => navigate(`/projeto/${project.slug}`)}
                  onEdit={() => navigate(`/editar/${project.slug}`)}
                  onDelete={deleteProject}
                />
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
