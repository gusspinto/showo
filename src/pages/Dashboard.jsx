import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Pencil, ExternalLink } from 'lucide-react'
import SkillsPicker from '../components/SkillsPicker'
import { Navbar } from '../components/Navbar'
import CreateProjectModal from '../components/CreateProjectModal'
import { Folder, Trophy, BarChart2, Rocket, Eye, GraduationCap, Plus, X, Users, Users2, ChevronRight, ChevronDown, User, Settings, Compass, Medal, LogOut, Globe, TrendingUp, MessageSquare, Star, Mail, Search, BookOpen, Trash2, Check, Calendar, ArrowRight, Target, Zap, Sparkles, Briefcase, Building2, Send, Copy, Share2, Link, HelpCircle, AlertTriangle, ListChecks, Circle } from 'lucide-react'
import ConvidarVagaModal from '../components/ConvidarVagaModal'
import { getCurrentAcademicYear, academicYearOptions } from '../lib/academicYear'
import { calculatePotential } from '../lib/score'

const C = {
  bg: 'var(--c-bg)',
  card: 'var(--c-card)',
  cardHover: 'var(--c-card-hover)',
  border: 'var(--c-border)',
  borderBright: 'var(--c-border-bright)',
  glass: 'var(--c-glass)',
  glassHover: 'var(--c-glass-hover)',
  glassBorder: 'var(--c-glass-border)',
  glassBorderBright: 'var(--c-glass-border-bright)',
  glassStyle: { backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' },
  blue: '#1b78f7',
  blueHover: '#1564d4',
  muted: 'var(--c-muted)',
  text: 'var(--c-text)',
  subtle: 'var(--c-subtle)',
  green: '#22c55e',
  yellow: '#fbbf24',
  red: '#ef4444',
  purple: '#a78bfa',
}

const PARTNER_LEAD_STATUS = {
  interessado: { label: 'Interessado', color: C.subtle },
  contactado:  { label: 'Contactado',  color: C.blue },
  resposta:    { label: 'Resposta',    color: C.purple },
  entrevista:  { label: 'Entrevista',  color: C.yellow },
  aceite:      { label: 'Aceite',      color: C.green },
  recusado:    { label: 'Recusado',    color: C.red },
}

function getScoreColor(score) {
  if (score == null) return C.muted
  if (score >= 86) return '#22c55e'
  if (score >= 71) return '#8b5cf6'
  if (score >= 51) return '#3b82f6'
  if (score >= 31) return '#f59e0b'
  return '#ef4444'
}

function getDisplayName(user) {
  const name = user?.user_metadata?.full_name
  if (name) return name.split(' ')[0]
  return user?.email?.split('@')[0] ?? ''
}

function timeAgoLabel(ts) {
  if (!ts) return ''
  const diff = (Date.now() - new Date(ts)) / 1000
  if (diff < 3600) return `há ${Math.max(1, Math.floor(diff / 60))} min`
  if (diff < 86400) return `há ${Math.floor(diff / 3600)}h`
  if (diff < 604800) return `há ${Math.floor(diff / 86400)} dias`
  return new Date(ts).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' })
}


function ScoreBadge({ score }) {
  const color = getScoreColor(score)
  return (
    <span style={{ color, fontSize: 12, fontWeight: 700 }}>
      {score ?? '—'}
    </span>
  )
}

function StatCard({ icon, label, value, color, onClick }) {
  const [hov, setHov] = useState(false)
  const accent = color ?? C.blue
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      className="stat-card-wrap"
      style={{
        ...C.glassStyle,
        background: hov && onClick ? C.glassHover : C.glass,
        border: `1px solid ${hov && onClick ? C.glassBorderBright : C.glassBorder}`,
        borderRadius: 12,
        padding: '18px 20px',
        display: 'flex', flexDirection: 'column', gap: 10,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'background 0.15s, border-color 0.15s',
        boxShadow: 'none',
        position: 'relative', overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8, flexShrink: 0,
          background: 'var(--c-bg-alt)', border: '1px solid var(--c-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: accent,
        }}>
          {icon}
        </div>
        <span style={{ color: C.muted, fontSize: 12, fontWeight: 500 }}>{label}</span>
      </div>
      <span style={{ color: accent, fontSize: 30, fontWeight: 400, fontFamily: 'var(--font-heading)', letterSpacing: '-1.5px', lineHeight: 1, marginTop: 4 }}>
        {value}
      </span>
    </div>
  )
}

function ActionBtn({ onClick, label, primary, small }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: primary
          ? (hovered ? C.blueHover : C.blue)
          : (hovered ? 'var(--c-card-hover)' : 'transparent'),
        border: primary ? 'none' : `1px solid ${C.border}`,
        borderRadius: 8,
        padding: small ? '6px 12px' : '8px 16px',
        color: primary ? '#fff' : C.muted,
        fontSize: small ? 12 : 13, fontWeight: 600, cursor: 'pointer',
        fontFamily: 'var(--font-body)',
        transition: 'background 0.15s, color 0.15s',
        display: 'flex', alignItems: 'center', gap: 5,
        boxShadow: primary ? '0 2px 8px rgba(27,120,247,0.2)' : 'none',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  )
}

function ProjectRow({ project, onView, onEdit, onDelete, onCopy, copied }) {
  const [hovered, setHovered] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const date = new Date(project.created_at).toLocaleDateString('pt-PT', {
    day: 'numeric', month: 'short',
  })
  const scoreColor = getScoreColor(project.score)
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={(e) => { if (window.innerWidth <= 600 && !e.target.closest('button')) onView() }}
      style={{
        ...C.glassStyle,
        background: hovered ? C.glassHover : C.glass,
        border: `1px solid ${hovered ? C.glassBorderBright : C.glassBorder}`,
        borderRadius: 14, padding: 0,
        display: 'flex', alignItems: 'stretch',
        transition: 'background 0.15s, border-color 0.15s',
        cursor: 'default',
        boxShadow: 'none',
        overflow: 'hidden',
      }}
      className="dash-project-row"
    >
      {/* Main content */}
      <div className="dash-proj-body" style={{ flex: 1, minWidth: 0, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Info */}
        <div className="dash-project-info" style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 2 }}>
            <span
              onClick={onView}
              style={{ color: C.text, fontSize: 14, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer' }}
            >
              {project.name}
            </span>
            {project.area && (
              <span className="dash-proj-area-tag" style={{ color: C.subtle, fontSize: 10, fontWeight: 600, flexShrink: 0, background: 'var(--c-bg-alt)', border: `1px solid ${C.glassBorder}`, borderRadius: 5, padding: '1px 6px' }}>
                {project.area}
              </span>
            )}
          </div>
          <p className="dash-proj-tagline" style={{ color: C.muted, fontSize: 12, margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.4, display: project.ai_tagline ? undefined : 'none' }}>
            {project.ai_tagline}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
            <span style={{ color: C.subtle, fontSize: 11 }}>{date}</span>
            {project.views > 0 && <span style={{ color: C.subtle, fontSize: 11, display: 'flex', alignItems: 'center', gap: 3 }}><Eye size={10} /> {project.views}</span>}
            {project.collaborator_count > 0 && <span style={{ color: C.subtle, fontSize: 11, display: 'flex', alignItems: 'center', gap: 3 }}><Users size={10} /> {project.collaborator_count}</span>}
          </div>
        </div>

        {/* Score ring — always visible */}
        <div className="dash-proj-score" onClick={onView} style={{ position: 'relative', width: 42, height: 42, flexShrink: 0, cursor: 'pointer', filter: `drop-shadow(0 0 5px ${scoreColor}80)` }}>
          <svg width={42} height={42} overflow="visible" style={{ transform: 'rotate(-90deg)', display: 'block' }}>
            <circle cx={21} cy={21} r={17} fill="none" stroke="var(--c-border)" strokeWidth={3.5} />
            <circle cx={21} cy={21} r={17} fill="none" stroke={scoreColor} strokeWidth={3.5}
              strokeDasharray={`${((project.score ?? 0) / 100) * 2 * Math.PI * 17} ${2 * Math.PI * 17}`}
              strokeLinecap="round"
            />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: scoreColor }}>
            {project.score ?? '—'}
          </div>
        </div>

        {/* Actions — expand on hover */}
        <div className="dash-project-actions">
          {confirmDelete ? (
            <>
              <span style={{ fontSize: 12, color: C.muted, alignSelf: 'center', whiteSpace: 'nowrap' }}>Apagar?</span>
              <button
                onClick={() => { onDelete(project.id); setConfirmDelete(false) }}
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 7, padding: '7px 13px', color: '#ef4444', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
              >Sim</button>
              <button
                onClick={() => setConfirmDelete(false)}
                style={{ background: 'rgba(27,120,247,0.1)', border: '1px solid rgba(27,120,247,0.3)', borderRadius: 7, padding: '7px 13px', color: C.blue, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
              >Não</button>
            </>
          ) : (
            <>
              <button onClick={onView} title="Ver projeto" className="dash-ghost-btn"><ExternalLink size={15} /></button>
              <button onClick={onEdit} title="Editar" className="dash-ghost-btn"><Pencil size={15} /></button>
              <button onClick={onCopy} title={copied ? 'Link copiado!' : 'Copiar link'} className="dash-ghost-btn" style={copied ? { color: '#22c55e', opacity: 1 } : undefined}>{copied ? <Check size={15} /> : <Link size={15} />}</button>
              <button onClick={() => setConfirmDelete(true)} title="Apagar" className="dash-ghost-btn dash-ghost-btn-danger"><Trash2 size={15} /></button>
            </>
          )}
        </div>

        {/* Actions — mobile (always visible, smaller set) */}
        <div className="dash-proj-actions-mobile">
          {confirmDelete ? (
            <>
              <span style={{ fontSize: 11, color: C.muted, whiteSpace: 'nowrap' }}>Apagar?</span>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(project.id); setConfirmDelete(false) }}
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 7, padding: '7px 12px', color: '#ef4444', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
              >Sim</button>
              <button
                onClick={(e) => { e.stopPropagation(); setConfirmDelete(false) }}
                style={{ background: 'rgba(27,120,247,0.1)', border: '1px solid rgba(27,120,247,0.3)', borderRadius: 7, padding: '7px 12px', color: C.blue, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
              >Não</button>
            </>
          ) : (
            <>
              <button onClick={(e) => { e.stopPropagation(); onEdit() }} title="Editar" className="dash-ghost-btn" style={{ opacity: 0.6 }}><Pencil size={14} /></button>
              <button onClick={(e) => { e.stopPropagation(); setConfirmDelete(true) }} title="Apagar" className="dash-ghost-btn dash-ghost-btn-danger" style={{ opacity: 0.6 }}><Trash2 size={14} /></button>
            </>
          )}
        </div>
      </div>{/* end main content */}
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
    if (!desc.trim()) return
    navigate('/interview', { state: { type: type || 'personal', description: desc.trim() } })
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
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
              style={{
                fontSize: 12, padding: '6px 14px', borderRadius: 7,
                border: `1px solid ${sel ? C.blue : C.border}`,
                background: sel ? `${C.blue}20` : 'transparent',
                color: sel ? C.blue : C.muted,
                cursor: 'pointer', fontFamily: 'inherit',
                fontWeight: sel ? 700 : 500,
                transition: 'background 0.12s, border-color 0.12s, color 0.12s',
              }}
            >
              {t.label}
            </button>
          )
        })}
      </div>
      {/* Input + button */}
      <div className="qc-input-row" style={{ display: 'flex', gap: 10 }}>
        <input
          value={desc}
          onChange={e => setDesc(e.target.value)}
          placeholder={type ? `Nome do teu ${QUICK_TYPES.find(t => t.id === type)?.label.toLowerCase()}...` : 'Descreve o teu projeto em poucas palavras…'}
          className="qc-input"
          style={{
            flex: 1, background: C.bg, border: `1px solid ${C.border}`,
            borderRadius: 9, padding: '13px 16px', color: C.text,
            fontSize: 14, fontFamily: 'inherit', outline: 'none', minWidth: 0,
            transition: 'border-color 0.15s',
          }}
          onFocus={e => e.target.style.borderColor = C.blue}
          onBlur={e => e.target.style.borderColor = C.border}
        />
        <button
          type="submit"
          className="qc-btn"
          disabled={!desc.trim()}
          style={{
            background: desc.trim() ? `#1b78f7` : C.border,
            border: 'none', borderRadius: 9,
            width: 46, height: 46,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: desc.trim() ? 'pointer' : 'not-allowed', flexShrink: 0,
            boxShadow: desc.trim() ? '0 2px 8px rgba(27,120,247,0.2)' : 'none',
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={e => { if (desc.trim()) e.currentTarget.style.opacity = '0.85' }}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
          </svg>
        </button>
      </div>
      <p className="qc-footnote" style={{ margin: 0, fontSize: 12, color: C.subtle }}>
        A IA gera a tua página em segundos · Sem cartão de crédito
      </p>
    </form>
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
  const [academicYear, setAcademicYear] = useState(getCurrentAcademicYear())
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
      .insert({ name: name.trim(), subject: subject.trim() || null, code, teacher_id: user.id, teacher_name: teacherName, academic_year: academicYear })
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
      <div style={{ background: C.card, border: `1px solid ${C.borderBright}`, borderRadius: 14, padding: 28, width: '100%', maxWidth: 400, boxShadow: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 400, color: C.text, fontFamily: 'var(--font-heading)', letterSpacing: '-0.3px' }}>Nova turma</h3>
          <button onClick={onClose} className="icon-btn-ghost"><X size={18} /></button>
        </div>
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: C.muted, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Nome da turma *</label>
            <input
              value={name} onChange={e => setName(e.target.value)} required
              placeholder="ex: Turma A — 11º ano"
              style={{ width: '100%', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 12px', color: C.text, fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none' }}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: C.muted, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Disciplina</label>
            <input
              value={subject} onChange={e => setSubject(e.target.value)}
              placeholder="ex: Programação e Sistemas de Informação"
              style={{ width: '100%', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 12px', color: C.text, fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none' }}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: C.muted, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Ano letivo</label>
            <select
              value={academicYear} onChange={e => setAcademicYear(e.target.value)}
              style={{ width: '100%', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 12px', color: C.text, fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none', cursor: 'pointer' }}
            >
              {academicYearOptions().map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          {error && <p style={{ color: '#ef4444', fontSize: 13, margin: 0 }}>{error}</p>}
          <button type="submit" disabled={saving || !name.trim()} style={{ background: '#1b78f7', border: 'none', borderRadius: 8, padding: '11px', color: '#fff', fontSize: 14, fontWeight: 600, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.7 : 1, fontFamily: 'inherit', marginTop: 4, boxShadow: '0 2px 8px rgba(27,120,247,0.2)' }}>
            {saving ? 'A criar…' : 'Criar turma'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ── Join Turma Modal ─────────────────────────────────────────────────────────
function JoinTurmaModal({ onClose, navigate, onJoined }) {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(false)
  const [joined, setJoined] = useState(null)
  const [verified, setVerified] = useState(null)

  async function handleJoin(e) {
    e.preventDefault()
    const trimmed = code.trim().toUpperCase()
    if (!trimmed) return
    setChecking(true); setError('')
    try {
      // join_class validates the code and registers membership server-side
      // in one step (class_members' INSERT policy isn't reliable to hit
      // directly from the client — it was never captured in a tracked
      // migration).
      const { data: rows, error: sbErr } = await supabase.rpc('join_class', { p_code: trimmed })
      const data = rows?.[0]
      if (sbErr || !data) {
        setError(sbErr && sbErr.message !== 'class_not_found' ? sbErr.message : 'Código inválido. Verifica com o professor.')
        return
      }
      // join_class verifies the row itself (inside the same transaction)
      // and returns that result directly — a separate follow-up SELECT
      // from a fresh connection isn't reliable (read-after-write timing
      // between two independent requests, confirmed while debugging this).
      setVerified(!!data.verified)
      setJoined(data)
      onJoined?.(data)
    } catch {
      setError('Erro de ligação. Tenta novamente.')
    } finally {
      setChecking(false)
    }
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: C.card, border: `1px solid ${C.borderBright}`, borderRadius: 16, padding: '36px 32px', width: '100%', maxWidth: 400, boxShadow: 'none' }}>
        {joined ? (
          <>
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <div style={{
                width: 60, height: 60, borderRadius: 16, margin: '0 auto 18px',
                background: verified ? 'rgba(34,197,94,0.1)' : 'rgba(251,191,36,0.1)',
                border: `1px solid ${verified ? 'rgba(34,197,94,0.25)' : 'rgba(251,191,36,0.3)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Check size={30} color={verified ? '#22c55e' : '#fbbf24'} />
              </div>
              <h3 style={{ color: C.text, margin: '0 0 6px', fontSize: 20, fontWeight: 400, letterSpacing: '-0.5px', fontFamily: 'var(--font-heading)' }}>
                {verified ? 'Entraste na turma!' : 'Turma encontrada'}
              </h3>
              <p style={{ color: C.muted, margin: 0, fontSize: 14, lineHeight: 1.5 }}>
                {verified ? joined.name : `${joined.name} — não consegui confirmar o teu registo como membro. Verifica na turma.`}
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                onClick={() => { navigate(`/turma/${joined.code}`); onClose() }}
                style={{ width: '100%', background: `#1b78f7`, border: 'none', borderRadius: 10, padding: '14px', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 2px 8px rgba(27,120,247,0.2)' }}
              >
                <span style={{display:'flex',alignItems:'center',gap:6,justifyContent:'center'}}>Ir para a turma <ArrowRight size={15} /></span>
              </button>
              <button
                onClick={onClose}
                style={{ width: '100%', background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 10, padding: '12px', color: C.muted, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Fechar
              </button>
            </div>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
              <div>
                <h3 style={{ color: C.text, margin: '0 0 4px', fontSize: 20, fontWeight: 400, letterSpacing: '-0.5px', fontFamily: 'var(--font-heading)' }}>Entrar numa turma</h3>
                <p style={{ color: C.muted, margin: 0, fontSize: 13 }}>Pede o código de 6 letras ao teu professor</p>
              </div>
              <button onClick={onClose} className="icon-btn-ghost" style={{ marginTop: 2 }}><X size={18} /></button>
            </div>
            <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <input
                value={code}
                onChange={e => { setCode(e.target.value.toUpperCase()); setError('') }}
                placeholder="CÓDIGO"
                maxLength={6}
                autoFocus
                style={{
                  width: '100%', background: C.bg,
                  border: `2px solid ${error ? '#ef4444' : code.length === 6 ? C.blue : C.border}`,
                  borderRadius: 10, padding: '18px',
                  color: C.text, fontSize: 28, fontWeight: 900, outline: 'none',
                  letterSpacing: 10, textAlign: 'center', fontFamily: 'inherit',
                  boxSizing: 'border-box', transition: 'border-color 0.15s',
                  boxShadow: code.length === 6 && !error ? '0 0 0 3px rgba(27,120,247,0.12)' : 'none',
                }}
              />
              {error && (
                <p style={{ color: '#ef4444', fontSize: 13, margin: 0, textAlign: 'center' }}>{error}</p>
              )}
              <button
                type="submit"
                disabled={checking || code.trim().length < 2}
                style={{
                  width: '100%',
                  background: code.trim() ? `#1b78f7` : C.border,
                  border: 'none', borderRadius: 10, padding: '15px',
                  color: '#fff', fontSize: 15, fontWeight: 700,
                  cursor: code.trim() ? 'pointer' : 'not-allowed',
                  fontFamily: 'inherit', opacity: checking ? 0.7 : 1,
                  transition: 'opacity 0.15s',
                  boxShadow: code.trim() ? '0 2px 8px rgba(27,120,247,0.2)' : 'none',
                }}
              >
                {checking ? 'A verificar…' : 'Confirmar código'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

// ── Turmas List Modal ─────────────────────────────────────────────────────────
function TurmasListModal({ turmas, onClose, navigate, onJoin }) {
  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: C.card, border: `1px solid ${C.borderBright}`, borderRadius: 16, padding: '28px 24px', width: '100%', maxWidth: 420, boxShadow: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
          <div>
            <h3 style={{ color: C.text, margin: '0 0 2px', fontSize: 18, fontWeight: 400, fontFamily: 'var(--font-heading)', letterSpacing: '-0.4px' }}>As minhas turmas</h3>
            <p style={{ color: C.muted, margin: 0, fontSize: 13 }}>{turmas.length} turma{turmas.length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={onClose} className="icon-btn-ghost"><X size={18} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          {turmas.map(t => (
            <div
              key={t.id}
              onClick={() => { navigate(`/turma/${t.code}`); onClose() }}
              style={{ background: 'var(--c-bg-alt)', border: `1px solid ${C.border}`, borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', transition: 'background 0.15s, border-color 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.background = C.cardHover; e.currentTarget.style.borderColor = C.borderBright }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--c-bg-alt)'; e.currentTarget.style.borderColor = C.border }}
            >
              <div style={{ width: 38, height: 38, borderRadius: 9, background: 'rgba(27,120,247,0.1)', border: '1px solid rgba(27,120,247,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Users2 size={16} color="#1b78f7" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</div>
                {t.teacher_name && <div style={{ fontSize: 12, color: C.muted, marginTop: 1 }}>{t.teacher_name}</div>}
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: C.blue, letterSpacing: 1, flexShrink: 0 }}>{t.code}</span>
              <ChevronRight size={14} color={C.subtle} style={{ flexShrink: 0 }} />
            </div>
          ))}
        </div>
        <button
          onClick={() => { onClose(); onJoin() }}
          style={{ width: '100%', background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 10, padding: '12px', color: C.muted, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'border-color 0.15s, color 0.15s' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = C.borderBright; e.currentTarget.style.color = C.text }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.muted }}
        >
          <Plus size={14} /> Entrar noutra turma
        </button>
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
      style={{ ...C.glassStyle, background: hov ? C.glassHover : C.glass, border: `1px solid ${hov ? C.glassBorderBright : C.glassBorder}`, borderRadius: 12, padding: '14px 16px', cursor: 'pointer', transition: 'background 0.15s, border-color 0.15s', display: 'flex', alignItems: 'center', gap: 12 }}
    >
      <div style={{ width: 36, height: 36, borderRadius: 9, background: 'rgba(27,120,247,0.1)', border: '1px solid rgba(27,120,247,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Users2 size={16} color="#1b78f7" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
          <div style={{ color: C.text, fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{turma.name}</div>
          {turma.academic_year && (
            <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 700, color: C.muted, background: C.border, borderRadius: 5, padding: '2px 6px' }}>{turma.academic_year}</span>
          )}
        </div>
        {turma.subject && <div style={{ color: C.muted, fontSize: 12, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{turma.subject}</div>}
        <div style={{ color: C.subtle, fontSize: 11, marginTop: 4, display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ color: C.blue, fontWeight: 700, letterSpacing: 1 }}>{turma.code}</span>
          {turma.member_count != null && <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Users size={10} />{turma.member_count} aluno{turma.member_count !== 1 ? 's' : ''}</span>}
          {turma.project_count != null && <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Folder size={10} />{turma.project_count} projeto{turma.project_count !== 1 ? 's' : ''}</span>}
          {turma.avg_score != null && <span style={{ color: turma.avg_score >= 90 ? C.green : turma.avg_score >= 71 ? C.blue : turma.avg_score >= 40 ? C.yellow : C.red, fontWeight: 700 }}>⌀ {turma.avg_score}</span>}
        </div>
      </div>
      <ChevronRight size={16} color={C.subtle} />
    </div>
  )
}

const SCORE_BREAKDOWN = [
  { label: 'Nome do projeto', pts: 5 },
  { label: 'Área do projeto', pts: 5 },
  { label: 'Problema descrito', pts: 15 },
  { label: 'Solução descrita', pts: 15 },
  { label: 'Público-alvo', pts: 10 },
  { label: 'Funcionalidades', pts: 10 },
  { label: 'Tecnologias / Ferramentas', pts: 8 },
  { label: 'Desafios encontrados', pts: 8 },
  { label: 'Resultados obtidos', pts: 12 },
  { label: 'Aprendizagens', pts: 12 },
  { label: 'Imagem de capa', pts: 10 },
]

function ScoreInfoTooltip() {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ position: 'relative', marginLeft: 'auto' }}>
      <button
        onMouseEnter={e => { setOpen(true); e.currentTarget.style.color = C.muted }}
        onMouseLeave={e => { setOpen(false); e.currentTarget.style.color = C.subtle }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        style={{
          background: 'none', border: 'none', padding: 4, cursor: 'pointer',
          color: C.subtle, display: 'flex', alignItems: 'center', borderRadius: 6,
          transition: 'color 0.15s',
        }}
        aria-label="Como é calculado o score?"
      >
        <HelpCircle size={14} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', right: 0, top: '100%', marginTop: 6,
          background: C.card, border: `1px solid ${C.borderBright}`,
          borderRadius: 10, padding: '12px 14px', zIndex: 50,
          width: 220, boxShadow: 'none',
          animation: 'fadeIn 0.15s ease',
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
            Como é calculado
          </div>
          {SCORE_BREAKDOWN.map(row => (
            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '3px 0' }}>
              <span style={{ fontSize: 11, color: C.muted }}>{row.label}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: C.blue, flexShrink: 0, marginLeft: 8 }}>+{row.pts}</span>
            </div>
          ))}
          <div style={{ borderTop: `1px solid ${C.border}`, marginTop: 8, paddingTop: 8, display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: C.text }}>Total máximo</span>
            <span style={{ fontSize: 11, fontWeight: 800, color: C.blue }}>100 pts</span>
          </div>
        </div>
      )}
    </div>
  )
}

const POTENTIAL_DIMS = [
  { key: 'quality',     label: 'Qualidade',    max: 30 },
  { key: 'depth',       label: 'Profundidade', max: 20 },
  { key: 'profile',     label: 'Perfil',       max: 15 },
  { key: 'validation',  label: 'Validação',    max: 20 },
  { key: 'consistency', label: 'Consistência', max: 15 },
]

function InsightsBlock({ projects, profile, rankingPos, rankingPct, username, copiedSlug, setCopiedSlug, navigate }) {
  const withScore = projects.filter(p => p.score != null)
  if (!withScore.length) return null
  const best = Math.max(...withScore.map(p => p.score))
  const avg = Math.round(withScore.reduce((s, p) => s + p.score, 0) / withScore.length)
  const totalViews = projects.reduce((s, p) => s + (p.views ?? 0), 0)
  const sorted = [...withScore].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
  const trend = sorted.length > 1 ? sorted[sorted.length - 1].score - sorted[0].score : null
  const { potential, breakdown } = profile ? calculatePotential({ projects, profile }) : { potential: 0, breakdown: {} }

  const ringSize = 100
  const ringStroke = 5
  const ringRadius = (ringSize - ringStroke) / 2
  const ringCirc = 2 * Math.PI * ringRadius
  const ringOffset = ringCirc - (potential / 100) * ringCirc

  const headingNum = { fontFamily: 'var(--font-heading)', fontVariantNumeric: 'tabular-nums', letterSpacing: '-2px', lineHeight: 1, fontWeight: 400 }

  const thirdStat = totalViews > 0
    ? { value: totalViews, color: C.blue, label: 'Views' }
    : trend != null
      ? { value: `${trend >= 0 ? '+' : ''}${trend}`, color: trend >= 0 ? C.green : C.red, label: 'Evolução' }
      : null

  return (
    <div style={{ ...C.glassStyle, background: C.glass, border: `1px solid ${C.glassBorder}`, borderRadius: 14, overflow: 'hidden', animation: 'dash-section-in 0.4s ease both' }}>
      <div style={{ padding: '18px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <TrendingUp size={13} color={C.blue} />
          <span style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Resumo</span>
          <ScoreInfoTooltip />
        </div>

        {/* Top row: ring + stats side by side */}
        <div className="dash-insights-top" style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 16 }}>
          <div className="dash-insights-ring" style={{ position: 'relative', width: ringSize, height: ringSize, flexShrink: 0 }}>
            <div style={{ position: 'absolute', inset: '20%', borderRadius: '50%', background: 'rgba(27,120,247,0.06)', filter: 'blur(14px)', pointerEvents: 'none' }} />
            <svg width={ringSize} height={ringSize} style={{ transform: 'rotate(-90deg)', position: 'relative', zIndex: 1 }}>
              <circle cx={ringSize / 2} cy={ringSize / 2} r={ringRadius} fill="none" stroke="var(--c-border)" strokeWidth={ringStroke} />
              <circle
                cx={ringSize / 2} cy={ringSize / 2} r={ringRadius}
                fill="none" stroke="#1b78f7" strokeWidth={ringStroke} strokeLinecap="round"
                strokeDasharray={ringCirc} strokeDashoffset={ringOffset}
                style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.22,1,0.36,1)', filter: 'drop-shadow(0 0 5px rgba(27,120,247,0.25))' }}
              />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
              <div style={{ ...headingNum, fontSize: 30, color: '#1b78f7' }}>{potential}</div>
              <div style={{ fontSize: 8, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.12em', marginTop: 4 }}>Potencial</div>
            </div>
          </div>

          <div className="dash-insights-stats" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <div style={{ ...headingNum, fontSize: 24, color: getScoreColor(best) }}>{best}</div>
              <div style={{ fontSize: 10, color: C.muted, fontWeight: 600 }}>Melhor</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <div style={{ ...headingNum, fontSize: 24, color: getScoreColor(avg) }}>{avg}</div>
              <div style={{ fontSize: 10, color: C.muted, fontWeight: 600 }}>Média · {withScore.length}p</div>
            </div>
            {thirdStat && (
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <div style={{ ...headingNum, fontSize: 24, color: thirdStat.color }}>{thirdStat.value}</div>
                <div style={{ fontSize: 10, color: C.muted, fontWeight: 600 }}>{thirdStat.label}</div>
              </div>
            )}
            {rankingPct != null && (
              <div onClick={() => navigate('/ranking')} style={{ display: 'flex', alignItems: 'baseline', gap: 8, cursor: 'pointer' }}>
                <div style={{ ...headingNum, fontSize: 24, color: C.blue }}>#{rankingPos}</div>
                <div style={{ fontSize: 10, color: C.muted, fontWeight: 600 }}>Top {rankingPct}%</div>
              </div>
            )}
          </div>
        </div>

        {/* Dimension breakdown */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {POTENTIAL_DIMS.map(d => {
            const val = breakdown[d.key] ?? 0
            const pct = (val / d.max) * 100
            return (
              <div key={d.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 10, color: C.muted, width: 78, flexShrink: 0, fontWeight: 600 }}>{d.label}</span>
                <div style={{ flex: 1, height: 3, background: C.border, borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: '#1b78f7', borderRadius: 999, transition: 'width 0.8s cubic-bezier(0.22,1,0.36,1)' }} />
                </div>
                <span style={{ fontSize: 9, fontWeight: 700, color: C.subtle, width: 28, textAlign: 'right', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>{val}/{d.max}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Share strip — integrated */}
      {username && (
        <div style={{ padding: '10px 18px', borderTop: `1px solid ${C.glassBorder}`, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link size={12} color={C.subtle} style={{ flexShrink: 0 }} />
          <span style={{ fontSize: 11, color: C.muted, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            showo.pt/u/{username}
          </span>
          <button
            onClick={() => {
              const url = `${window.location.origin}/u/${username}`
              navigator.clipboard.writeText(url).then(() => {
                setCopiedSlug('__profile__')
                setTimeout(() => setCopiedSlug(null), 1500)
              })
            }}
            style={{
              background: copiedSlug === '__profile__' ? 'rgba(34,197,94,0.1)' : `${C.blue}12`,
              border: `1px solid ${copiedSlug === '__profile__' ? 'rgba(34,197,94,0.3)' : `${C.blue}25`}`,
              borderRadius: 6, padding: '3px 10px',
              color: copiedSlug === '__profile__' ? '#22c55e' : C.blue,
              fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0,
            }}
          >
            {copiedSlug === '__profile__' ? <><Check size={11} /> Copiado</> : <><Copy size={11} /> Copiar</>}
          </button>
        </div>
      )}
    </div>
  )
}

const ONBOARDING = {
  aluno: {
    title: 'Bem-vindo ao Showo!',
    subtitle: 'O teu portfólio profissional começa aqui.',
    steps: [
      { icon: <Pencil size={20} color="var(--c-muted)" />, title: 'Cria o teu projeto', desc: 'Responde a algumas perguntas sobre o teu trabalho — a IA trata do resto.' },
      { icon: <Globe size={20} color="var(--c-muted)" />, title: 'Partilha a tua página', desc: 'Cada projeto ganha uma página pública pronta a enviar a recrutadores e professores.' },
      { icon: <TrendingUp size={20} color="var(--c-muted)" />, title: 'Acompanha o crescimento', desc: 'Vê o score, visualizações e feedback em tempo real.' },
    ],
    cta: 'Criar o meu primeiro projeto',
    ctaPath: '/interview',
    ctaState: { type: 'personal', description: '' },
  },
  professor: {
    title: 'Bem-vindo ao Showo!',
    subtitle: 'Acompanha e avalia os projetos dos teus alunos.',
    steps: [
      { icon: <GraduationCap size={20} color="var(--c-muted)" />, title: 'Cria uma turma', desc: 'Gera um código único e partilha-o com os teus alunos para que se juntem.' },
      { icon: <BarChart2 size={20} color="var(--c-muted)" />, title: 'Acompanha o progresso', desc: 'Vê scores, completude e evolução de cada aluno numa tabela clara.' },
      { icon: <MessageSquare size={20} color="var(--c-muted)" />, title: 'Dá feedback', desc: 'Deixa comentários por secção diretamente nos projetos dos alunos.' },
    ],
    cta: 'Criar a minha primeira turma',
    ctaAction: 'createTurma',
  },
  recrutador: {
    title: 'Bem-vindo ao Showo!',
    subtitle: 'Descobre talentos reais com projetos reais.',
    steps: [
      { icon: <Compass size={20} color="var(--c-muted)" />, title: 'Explora projetos', desc: 'Navega por projetos de estudantes organizados por área e score.' },
      { icon: <Star size={20} color="var(--c-muted)" />, title: 'Perfis completos', desc: 'Cada aluno tem uma página com links, tecnologias e contexto do projeto.' },
      { icon: <Mail size={20} color="var(--c-muted)" />, title: 'Contacta diretamente', desc: 'Encontra o LinkedIn ou email de cada candidato no perfil.' },
    ],
    cta: 'Explorar projetos',
    ctaPath: '/explorar',
  },
  empresa: {
    title: 'Bem-vindo ao Showo!',
    subtitle: 'Encontra o talento certo para a tua empresa.',
    steps: [
      { icon: <Search size={20} color="var(--c-muted)" />, title: 'Descobre talento jovem', desc: 'Acede a projetos reais de estudantes do ensino profissional e universitário.' },
      { icon: <Trophy size={20} color="var(--c-muted)" />, title: 'Filtra pelos melhores', desc: 'O ranking e os scores ajudam-te a identificar rapidamente os candidatos de destaque.' },
      { icon: <Users size={20} color="var(--c-muted)" />, title: 'Estabelece contacto', desc: 'Cada perfil inclui links de contacto direto com o estudante.' },
    ],
    cta: 'Ver ranking',
    ctaPath: '/ranking',
  },
}

/* ─────────── 3-step aluno onboarding ─────────── */
function OnboardingAlunoModal({ user, profile, onDismiss, firstProject, claimedSlug }) {
  const navigate = useNavigate()
  // When coming from anonymous project claim, start at step -1 (claim confirmation)
  const [step, setStep] = useState(claimedSlug ? -1 : 0) // -1=claim 0=perfil 1=projeto 2=partilhar
  const [username, setUsername] = useState(profile?.username ?? '')
  const [bio, setBio] = useState(profile?.bio ?? '')
  const [area, setArea] = useState(profile?.area ?? '')
  const [skills, setSkills] = useState(profile?.skills ?? [])
  const [saving, setSaving] = useState(false)
  const [saveErr, setSaveErr] = useState(null)
  const [copied, setCopied] = useState(false)

  const resolvedUsername = username.trim() || profile?.username || user?.id
  const profileUrl = `${window.location.origin}/u/${resolvedUsername}`

  async function saveProfile() {
    setSaving(true)
    setSaveErr(null)
    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      username: username.trim() || null,
      bio: bio.trim() || null,
      area: area || null,
      skills,
    }, { onConflict: 'id' })
    setSaving(false)
    if (error) {
      if (error.code === '23505') setSaveErr('Este username já está a ser usado.')
      else setSaveErr('Erro ao guardar. Tenta novamente.')
      return
    }
    setStep(1)
  }

  function copyUrl() {
    navigator.clipboard.writeText(profileUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    })
  }

  function skip() {
    if (step < 2) setStep(s => s + 1)
    else onDismiss()
  }

  const TOTAL = 3

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 4000,
      background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      fontFamily: 'inherit',
    }}>
      <div style={{
        background: C.card, border: '1px solid rgba(27,120,247,0.25)',
        borderRadius: 16, width: '100%', maxWidth: 460,
        boxShadow: 'none',
        animation: 'onbFadeUp 0.25s ease',
        maxHeight: '90vh', overflowY: 'auto',
      }}>
        <style>{`@keyframes onbFadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}`}</style>

        {/* ── Step -1: Projeto reclamado ── */}
        {step === -1 && claimedSlug && (
          <div style={{ padding: '36px 30px 28px', textAlign: 'center' }}>
            <div style={{ width: 54, height: 54, borderRadius: '50%', background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <Check size={26} color="#22c55e" />
            </div>
            <h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 700, color: C.text, letterSpacing: '-0.4px', fontFamily: 'var(--font-heading)' }}>
              Olá{profile?.full_name ? ` ${profile.full_name.split(' ')[0]}` : ''}! O teu projeto está guardado.
            </h2>
            <p style={{ margin: '0 0 24px', fontSize: 14, color: C.muted, lineHeight: 1.65 }}>
              O projeto que criaste sem conta foi guardado na tua conta. Podes editá-lo e partilhá-lo a qualquer momento.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                onClick={() => { onDismiss(); navigate(`/projeto/${claimedSlug}`) }}
                style={{ background: '#1b78f7', border: 'none', borderRadius: 9, padding: '13px', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 2px 8px rgba(27,120,247,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}
              >
                Ir para o projeto <ArrowRight size={15} />
              </button>
              <button
                onClick={() => setStep(0)}
                style={{ background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 9, padding: '12px', color: C.muted, fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Saltar por agora
              </button>
            </div>
          </div>
        )}

        {/* ── Step 0: Perfil ── */}
        {step === 0 && (
          <div style={{ padding: '36px 30px 28px' }}>
            <div style={{ textAlign: 'center', marginBottom: 26 }}>
              <div style={{ width: 54, height: 54, borderRadius: '50%', background: 'rgba(27,120,247,0.12)', border: '1px solid rgba(27,120,247,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                <User size={24} color={C.blue} />
              </div>
              <h2 style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 400, color: C.text, letterSpacing: '-0.5px', fontFamily: 'var(--font-heading)' }}>Completa o teu perfil</h2>
              <p style={{ margin: 0, fontSize: 14, color: C.muted, lineHeight: 1.5 }}>
                O teu perfil é o teu cartão de visita para recrutadores.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
              {/* Username */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Username</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: C.muted, fontWeight: 500, pointerEvents: 'none' }}>@</span>
                  <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    placeholder="o_teu_username"
                    maxLength={30}
                    style={{ width: '100%', background: 'rgba(27,120,247,0.06)', border: '1.5px solid rgba(27,120,247,0.2)', borderRadius: 10, color: C.text, fontSize: 14, padding: '11px 14px 11px 30px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                  />
                </div>
                <p style={{ margin: '5px 0 0', fontSize: 11, color: C.muted }}>Apenas letras minúsculas, números e _</p>
              </div>

              {/* Bio */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Bio <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(opcional)</span></label>
                <textarea
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  placeholder="Estudante de Informática no 12º ano, apaixonado por desenvolvimento web e IA…"
                  rows={3}
                  maxLength={200}
                  style={{ width: '100%', background: 'rgba(27,120,247,0.06)', border: '1.5px solid rgba(27,120,247,0.2)', borderRadius: 10, color: C.text, fontSize: 14, padding: '11px 14px', outline: 'none', fontFamily: 'inherit', resize: 'none', lineHeight: 1.6, boxSizing: 'border-box' }}
                />
              </div>

              {/* Área */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Área <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(opcional)</span></label>
                <select
                  value={area}
                  onChange={e => setArea(e.target.value)}
                  style={{ width: '100%', background: 'rgba(27,120,247,0.06)', border: '1.5px solid rgba(27,120,247,0.2)', borderRadius: 10, color: area ? C.text : C.muted, fontSize: 14, padding: '11px 14px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', cursor: 'pointer', appearance: 'none', WebkitAppearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center' }}
                >
                  <option value="">Seleciona a tua área</option>
                  <option value="Programação e Informática">Programação e Informática</option>
                  <option value="Design e Multimédia">Design e Multimédia</option>
                  <option value="Marketing e Comunicação">Marketing e Comunicação</option>
                  <option value="Gestão e Administração">Gestão e Administração</option>
                  <option value="Eletrónica e Automação">Eletrónica e Automação</option>
                  <option value="Audiovisual e Cinema">Audiovisual e Cinema</option>
                  <option value="Turismo e Hotelaria">Turismo e Hotelaria</option>
                  <option value="Saúde">Saúde</option>
                  <option value="Desporto">Desporto</option>
                  <option value="Artes e Espetáculo">Artes e Espetáculo</option>
                  <option value="Construção e Engenharia">Construção e Engenharia</option>
                  <option value="Outra">Outra</option>
                </select>
              </div>

              {/* Skills */}
              <div>
                <SkillsPicker
                  label="Competências (opcional)"
                  value={skills}
                  onChange={setSkills}
                  max={8}
                />
              </div>
            </div>

            {saveErr && (
              <div style={{ fontSize: 12, color: '#ef4444', padding: '8px 12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, marginBottom: 12 }}>
                {saveErr}
              </div>
            )}

            <button
              onClick={saveProfile}
              disabled={saving}
              style={{ width: '100%', background: '#1b78f7', border: 'none', borderRadius: 9, padding: '13px', color: '#fff', fontSize: 15, fontWeight: 700, cursor: saving ? 'default' : 'pointer', fontFamily: 'inherit', boxShadow: '0 2px 8px rgba(27,120,247,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, opacity: saving ? 0.7 : 1 }}
            >
              {saving ? 'A guardar…' : <><span>Guardar perfil</span><ArrowRight size={15} /></>}
            </button>
            <button onClick={skip} style={{ display: 'block', width: '100%', background: 'none', border: 'none', color: C.muted, fontSize: 13, cursor: 'pointer', marginTop: 12, fontFamily: 'inherit', padding: 0 }}>
              Saltar por agora
            </button>
          </div>
        )}

        {/* ── Step 1: Criar projeto ── */}
        {step === 1 && (
          <div style={{ padding: '36px 30px 28px', textAlign: 'center' }}>
            <div style={{ width: 54, height: 54, borderRadius: '50%', background: 'rgba(27,120,247,0.12)', border: '1px solid rgba(27,120,247,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <Rocket size={24} color={C.blue} />
            </div>
            <h2 style={{ margin: '0 0 10px', fontSize: 20, fontWeight: 400, color: C.text, letterSpacing: '-0.5px', fontFamily: 'var(--font-heading)' }}>Cria o teu primeiro projecto</h2>
            <p style={{ margin: '0 auto 24px', fontSize: 14, color: C.muted, lineHeight: 1.6, maxWidth: 340 }}>
              Conta-nos o que fizeste, em poucas frases. Tratamos do resto e entregamos-te uma página pronta a mostrar.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, background: 'var(--c-bg-alt)', border: `1px solid ${C.border}`, borderRadius: 12, padding: '16px 18px', textAlign: 'left', marginBottom: 8 }}>
                {[
                  { icon: <Pencil size={15} color={C.blue} />, text: 'Formulário guiado passo a passo' },
                  { icon: <Sparkles size={15} color={C.blue} />, text: 'IA analisa e melhora cada resposta' },
                  { icon: <Globe size={15} color={C.blue} />, text: 'Página pública partilhável em segundos' },
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: C.muted }}>
                    <span style={{ flexShrink: 0 }}>{item.icon}</span>
                    {item.text}
                  </div>
                ))}
              </div>
              <button
                onClick={() => { onDismiss(); navigate('/novo') }}
                style={{ background: '#1b78f7', border: 'none', borderRadius: 9, padding: '13px', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 2px 8px rgba(27,120,247,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}
              >
                <span>Criar projecto</span><ArrowRight size={15} />
              </button>
              <button
                onClick={() => setStep(2)}
                style={{ background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 9, padding: '12px', color: C.muted, fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Já tenho projecto, avançar →
              </button>
            </div>
            <button onClick={onDismiss} style={{ display: 'block', width: '100%', background: 'none', border: 'none', color: C.muted, fontSize: 13, cursor: 'pointer', marginTop: 12, fontFamily: 'inherit', padding: 0 }}>
              Saltar introdução
            </button>
          </div>
        )}

        {/* ── Step 2: Partilhar ── */}
        {step === 2 && (
          <div style={{ padding: '36px 30px 28px', textAlign: 'center' }}>
            <div style={{ width: 54, height: 54, borderRadius: '50%', background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <Share2 size={24} color={C.green} />
            </div>
            <h2 style={{ margin: '0 0 10px', fontSize: 20, fontWeight: 400, color: C.text, letterSpacing: '-0.5px', fontFamily: 'var(--font-heading)' }}>Partilha a tua página</h2>
            <p style={{ margin: '0 auto 24px', fontSize: 14, color: C.muted, lineHeight: 1.6, maxWidth: 340 }}>
              A tua página de perfil está pronta. Envia-a a recrutadores, professores ou amigos.
            </p>
            {/* URL box */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--c-bg-alt)', border: `1.5px solid ${C.border}`, borderRadius: 10, padding: '10px 14px', marginBottom: 20, textAlign: 'left' }}>
              <Link size={14} color={C.muted} style={{ flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 13, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profileUrl}</span>
              <button
                onClick={copyUrl}
                style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5, background: copied ? 'rgba(34,197,94,0.12)' : 'rgba(27,120,247,0.1)', border: `1px solid ${copied ? 'rgba(34,197,94,0.3)' : 'rgba(27,120,247,0.3)'}`, borderRadius: 7, padding: '5px 12px', fontSize: 12, fontWeight: 600, color: copied ? C.green : C.blue, cursor: 'pointer', fontFamily: 'inherit', transition: 'background 0.2s, border-color 0.2s', whiteSpace: 'nowrap' }}
              >
                {copied ? <><Check size={12} /> Copiado!</> : <><Copy size={12} /> Copiar</>}
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                onClick={() => { onDismiss(); navigate(`/u/${resolvedUsername}`) }}
                style={{ background: '#1b78f7', border: 'none', borderRadius: 9, padding: '13px', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 2px 8px rgba(27,120,247,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}
              >
                <span>Ver a minha página</span><ArrowRight size={15} />
              </button>
              <button onClick={onDismiss} style={{ background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 9, padding: '12px', color: C.muted, fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
                Ir para o dashboard
              </button>
            </div>
          </div>
        )}

        {/* Dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, paddingBottom: 22 }}>
          {Array.from({ length: TOTAL }).map((_, i) => (
            <div key={i} style={{ width: i === step ? 20 : 6, height: 6, borderRadius: 3, background: i === step ? C.blue : C.border, transition: 'all 0.2s' }} />
          ))}
        </div>
      </div>
    </div>
  )
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
        background: C.card, border: '1px solid rgba(27,120,247,0.25)',
        borderRadius: 16, padding: '36px 32px', width: '100%', maxWidth: 440,
        boxShadow: 'none',
        fontFamily: 'inherit',
      }}>
        {step === 0 ? (
          <>
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <img src="/icon.png" alt="Showo" style={{ width: 60, height: 60, objectFit: 'contain', marginBottom: 14, display: 'block', margin: '0 auto 14px' }} />
              <h2 style={{ color: 'var(--c-text)', fontSize: 22, fontWeight: 400, margin: '0 0 8px', letterSpacing: '-0.5px', fontFamily: 'var(--font-heading)' }}>
                {cfg.title}
              </h2>
              <p style={{ color: 'var(--c-muted)', fontSize: 15, margin: 0, lineHeight: 1.5 }}>{cfg.subtitle}</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
              {cfg.steps.map((s, i) => (
                <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', background: 'var(--c-bg-alt)', border: '1px solid var(--c-border)', borderRadius: 10, padding: '14px 16px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1, width: 24, height: 24 }}>{s.icon}</span>
                  <div>
                    <div style={{ color: 'var(--c-text)', fontSize: 14, fontWeight: 600, marginBottom: 3 }}>{s.title}</div>
                    <div style={{ color: 'var(--c-muted)', fontSize: 13, lineHeight: 1.4 }}>{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setStep(1)}
                style={{ flex: 1, background: '#1b78f7', border: 'none', borderRadius: 9, padding: '13px', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 2px 8px rgba(27,120,247,0.2)' }}
              >
                <span style={{display:'flex',alignItems:'center',gap:6,justifyContent:'center'}}>Continuar <ArrowRight size={15} /></span>
              </button>
            </div>
            <button
              onClick={onDismiss}
              style={{ display: 'block', width: '100%', background: 'none', border: 'none', color: 'var(--c-subtle)', fontSize: 13, cursor: 'pointer', marginTop: 14, fontFamily: 'inherit', padding: 0 }}
            >
              Saltar introdução
            </button>
          </>
        ) : (
          <>
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}><Rocket size={44} color="#1b78f7" /></div>
              <h2 style={{ color: 'var(--c-text)', fontSize: 20, fontWeight: 400, margin: '0 0 8px', letterSpacing: '-0.5px', fontFamily: 'var(--font-heading)' }}>
                Pronto para começar?
              </h2>
              <p style={{ color: 'var(--c-muted)', fontSize: 14, margin: 0, lineHeight: 1.55, maxWidth: 320, marginLeft: 'auto', marginRight: 'auto' }}>
                {role === 'aluno' && 'A IA vai guiar-te passo a passo para transformar o teu projeto numa página profissional.'}
                {role === 'professor' && 'Cria a tua turma agora e partilha o código com os teus alunos.'}
                {role === 'recrutador' && 'Explora os projetos e descobre os talentos que procuras.'}
                {role === 'empresa' && 'Vê quem está no topo do ranking e encontra o teu próximo talento.'}
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                onClick={handleCta}
                style={{ background: '#1b78f7', border: 'none', borderRadius: 9, padding: '14px', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 2px 8px rgba(27,120,247,0.2)' }}
              >
                <span style={{display:'flex',alignItems:'center',gap:6,justifyContent:'center'}}>{cfg.cta} <ArrowRight size={15} /></span>
              </button>
              <button
                onClick={onDismiss}
                style={{ background: 'transparent', border: '1px solid var(--c-border)', borderRadius: 9, padding: '13px', color: 'var(--c-muted)', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Explorar primeiro
              </button>
            </div>
          </>
        )}

        {/* Dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 20 }}>
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div key={i} style={{ width: i === step ? 20 : 6, height: 6, borderRadius: 3, background: i === step ? '#1b78f7' : 'var(--c-border)', transition: 'all 0.2s' }} />
          ))}
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { user, profile, loading: authLoading, isAdmin } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [claimedSlug] = useState(() => location.state?.claimedSlug ?? null)
  const [projects, setProjects] = useState([])
  const [loadingProjects, setLoadingProjects] = useState(true)
  const [turmas, setTurmas] = useState([])
  const [turmaYearFilter, setTurmaYearFilter] = useState('all')
  const [needsReview, setNeedsReview] = useState([]) // projects in the teacher's turmas with no feedback from them yet
  const [recentActivity, setRecentActivity] = useState([]) // latest projects submitted across the teacher's turmas
  const [upcomingDefenses, setUpcomingDefenses] = useState([]) // students' defense dates coming up, across all turmas
  const [flaggedForRevision, setFlaggedForRevision] = useState([]) // projects the teacher marked "needs revision"
  const [resubmitted, setResubmitted] = useState([]) // projects whose students marked corrections as done
  const [totalMembers, setTotalMembers] = useState(0)
  const [weeklyActivity, setWeeklyActivity] = useState([]) // last 8 weeks: { label, count } — projects submitted across the teacher's turmas
  const [studentTurmas, setStudentTurmas] = useState([])
  const [loadingStudentTurmas, setLoadingStudentTurmas] = useState(true)
  const [profNotifs, setProfNotifs] = useState([]) // unread professor notifications (grade/feedback/status) — aluno only
  const [pendingTasks, setPendingTasks] = useState([]) // class tasks not yet completed — aluno only
  const [showCreateTurma, setShowCreateTurma] = useState(false)
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [showTurmasModal, setShowTurmasModal] = useState(false)
  const [toast, setToast] = useState('')
  const [copiedSlug, setCopiedSlug] = useState(null)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [showOnboardingAluno, setShowOnboardingAluno] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [collabProjects, setCollabProjects] = useState([])
  const [savedTalents, setSavedTalents] = useState([])
  const [savedTalentsLoading, setSavedTalentsLoading] = useState(true)
  const [savedTalentsKey, setSavedTalentsKey] = useState(0)
  // Student: recruiters who showed interest
  const [myInterests, setMyInterests] = useState([])
  const [myInterestsLoading, setMyInterestsLoading] = useState(false)
  // Recruiter: active vagas (for ConvidarVagaModal)
  const [recruiterVagas, setRecruiterVagas] = useState([])
  // Empresa (claimed via a professor's partner-company invite): students the professor flagged as interested
  const [partnerLeads, setPartnerLeads] = useState([])
  const [partnerLeadsLoading, setPartnerLeadsLoading] = useState(true)
  // Invite modal target
  const [inviteTarget, setInviteTarget] = useState(null) // { studentId, studentName }
  const [resumoOpen, setResumoOpen] = useState(false)
  const [rankingPct, setRankingPct] = useState(null)
  const [rankingPos, setRankingPos] = useState(null)

  // Admins land on the admin panel, not the aluno/professor/recrutador
  // dashboard — is_admin is an elevated flag on top of role, not a role
  // itself, so this account would otherwise show whatever role it happens
  // to carry (usually 'aluno').
  useEffect(() => {
    if (!authLoading && isAdmin) navigate('/admin', { replace: true })
  }, [authLoading, isAdmin, navigate])

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  function copyProjectLink(slug) {
    const url = `${window.location.origin}/projeto/${slug}`
    navigator.clipboard.writeText(url).then(() => {
      setCopiedSlug(slug)
      setTimeout(() => setCopiedSlug(null), 2500)
    })
  }

  function dismissOnboarding() {
    localStorage.setItem(`showo_onboarded_${user.id}`, '1')
    setShowOnboarding(false)
  }

  function dismissOnboardingAluno() {
    localStorage.setItem(`showo_onb_v2_${user.id}`, '1')
    setShowOnboardingAluno(false)
  }

  useEffect(() => {
    if (!authLoading && !user) navigate('/login')
  }, [user, authLoading, navigate])

  useEffect(() => {
    if (!user || !profile) return
    const isAluno = !profile.role || profile.role === 'aluno'
    if (isAluno) {
      // New 3-step onboarding for alunos
      const v2Key = `showo_onb_v2_${user.id}`
      if (!localStorage.getItem(v2Key)) {
        setShowOnboardingAluno(true)
      }
    } else {
      // Legacy 2-step onboarding for other roles
      const key = `showo_onboarded_${user.id}`
      if (!localStorage.getItem(key)) {
        setShowOnboarding(true)
      }
    }
  }, [user, profile])

  useEffect(() => {
    if (!user) return
    async function load() {
      let { data, error } = await supabase
        .from('projects')
        .select('id, name, slug, score, area, created_at, ai_tagline, views, defense_date, ai_feedback, cover_url, teacher_score, project_type, class_projects(class_id), collaborator_count:project_collaborators(count)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        const fallback = await supabase
          .from('projects')
          .select('id, name, slug, score, area, created_at, ai_tagline, views, defense_date, ai_feedback, cover_url, teacher_score, project_type')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
        data = fallback.data
        error = fallback.error
      }

      const normalized = (data || []).map(p => ({
        ...p,
        collaborator_count: Array.isArray(p.collaborator_count)
          ? (p.collaborator_count[0]?.count ?? 0)
          : (p.collaborator_count ?? 0),
      }))
      setProjects(normalized)
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
        .select('id, name, slug, score, area, ai_tagline, creator_name, created_at, views')
        .in('id', ids)
        .order('score', { ascending: false })
      setCollabProjects(projs || [])
    }
    loadCollabProjects()
  }, [user])

  // Load saved talents for recruiters/empresas
  useEffect(() => {
    if (!user) return
    if (profile?.role !== 'recrutador' && profile?.role !== 'empresa') {
      setSavedTalentsLoading(false)
      return
    }
    setSavedTalentsLoading(true)
    async function loadSavedTalents() {
      const { data: interests } = await supabase
        .from('recruiter_interests')
        .select('project_id, created_at')
        .eq('recruiter_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20)
      if (!interests?.length) { setSavedTalents([]); setSavedTalentsLoading(false); return }

      const ids = interests.map(i => i.project_id)
      const { data: projects } = await supabase
        .from('projects')
        .select('id, name, slug, score, area, creator_name, course, school_year, avatar_url, user_id, ai_tagline')
        .in('id', ids)
      if (!projects?.length) { setSavedTalents([]); setSavedTalentsLoading(false); return }

      // Load owner profiles
      const ownerIds = [...new Set(projects.map(p => p.user_id).filter(Boolean))]
      let profileMap = {}
      if (ownerIds.length) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, full_name, username, avatar_url')
          .in('id', ownerIds)
        profs?.forEach(p => { profileMap[p.id] = p })
      }

      // Order by interest date
      const ordered = interests.map(i => {
        const p = projects.find(p => p.id === i.project_id)
        if (!p) return null
        return { ...p, savedAt: i.created_at, ownerProfile: profileMap[p.user_id] }
      }).filter(Boolean)

      setSavedTalents(ordered)
      setSavedTalentsLoading(false)
    }
    loadSavedTalents()
  }, [user, profile?.role, savedTalentsKey])

  // Load interests for student (recruiters who marked interest on their projects)
  useEffect(() => {
    const role = profile?.role
    if (!user || role === 'professor' || role === 'recrutador' || role === 'empresa') return
    setMyInterestsLoading(true)
    async function loadMyInterests() {
      const { data: myProjs } = await supabase
        .from('projects')
        .select('id, name, slug')
        .eq('user_id', user.id)
      if (!myProjs?.length) { setMyInterests([]); setMyInterestsLoading(false); return }

      const projMap = {}
      myProjs.forEach(p => { projMap[p.id] = p })

      const { data: interests } = await supabase
        .from('recruiter_interests')
        .select('recruiter_id, project_id, created_at')
        .in('project_id', myProjs.map(p => p.id))
        .order('created_at', { ascending: false })
      if (!interests?.length) { setMyInterests([]); setMyInterestsLoading(false); return }

      const recruiterIds = [...new Set(interests.map(i => i.recruiter_id))]
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url, company, role')
        .in('id', recruiterIds)
      const profMap = {}
      profs?.forEach(p => { profMap[p.id] = p })

      setMyInterests(
        interests
          .map(i => ({ ...i, recruiterProfile: profMap[i.recruiter_id], project: projMap[i.project_id] }))
          .filter(i => i.recruiterProfile && i.project)
      )
      setMyInterestsLoading(false)
    }
    loadMyInterests()
  }, [user, profile?.role])

  // Load recruiter's active vagas (for invite modal)
  useEffect(() => {
    if (!user || (profile?.role !== 'recrutador' && profile?.role !== 'empresa')) return
    supabase
      .from('vagas')
      .select('id, title:titulo, location:localizacao, type:tipo')
      .eq('recruiter_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .then(({ data }) => setRecruiterVagas(data || []))
  }, [user, profile?.role])

  // Empresa claimed via a professor's partner-company invite (Parceiros.jsx)
  // — surfaces the students the professor already flagged as interested.
  useEffect(() => {
    if (!user || profile?.role !== 'empresa') { setPartnerLeadsLoading(false); return }
    async function loadPartnerLeads() {
      const { data: companies } = await supabase.from('partner_companies').select('id, name').eq('claimed_by', user.id)
      if (!companies?.length) { setPartnerLeads([]); setPartnerLeadsLoading(false); return }
      const companyNameById = {}
      companies.forEach(c => { companyNameById[c.id] = c.name })

      const { data: leadRows } = await supabase
        .from('internship_leads')
        .select('id, student_id, company_id, status, created_at')
        .in('company_id', companies.map(c => c.id))
        .order('created_at', { ascending: false })

      if (!leadRows?.length) { setPartnerLeads([]); setPartnerLeadsLoading(false); return }

      const studentIds = [...new Set(leadRows.map(l => l.student_id))]
      const { data: students } = await supabase.from('profiles').select('id, full_name, username, avatar_url').in('id', studentIds)
      const studentById = {}
      ;(students || []).forEach(s => { studentById[s.id] = s })

      setPartnerLeads(leadRows.map(l => ({
        ...l,
        companyName: companyNameById[l.company_id],
        student: studentById[l.student_id],
      })))
      setPartnerLeadsLoading(false)
    }
    loadPartnerLeads()
  }, [user, profile?.role])

  async function updatePartnerLeadStatus(leadId, status) {
    setPartnerLeads(prev => prev.map(l => l.id === leadId ? { ...l, status } : l))
    await supabase.from('internship_leads').update({ status }).eq('id', leadId)
  }

  useEffect(() => {
    if (!user || loadingProjects) return
    if (profile?.role === 'professor' || profile?.role === 'recrutador' || profile?.role === 'empresa') return
    const scored = projects.filter(p => p.score != null)
    if (!scored.length) return
    const best = Math.max(...scored.map(p => p.score))
    if (!best) return
    ;(async () => {
      const { data } = await supabase
        .from('projects')
        .select('user_id, score')
        .not('score', 'is', null)
        .gt('score', 0)
      if (!data?.length) return
      const maxByUser = {}
      data.forEach(p => {
        if (!maxByUser[p.user_id] || p.score > maxByUser[p.user_id]) maxByUser[p.user_id] = p.score
      })
      const total = Object.keys(maxByUser).length
      if (total < 2) return
      const higherCount = Object.values(maxByUser).filter(s => s > best).length
      setRankingPos(higherCount + 1)
      setRankingPct(Math.max(1, Math.round(((higherCount + 1) / total) * 100)))
    })()
  }, [user, projects, loadingProjects, profile?.role])

  useEffect(() => {
    if (!user || profile?.role !== 'professor') return
    async function loadTurmas() {
      const { data: cls } = await supabase
        .from('classes')
        .select('id, name, subject, code, academic_year, created_at')
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false })
      if (!cls?.length) { setTurmas([]); setNeedsReview([]); setFlaggedForRevision([]); setResubmitted([]); setTotalMembers(0); setWeeklyActivity([]); return }

      const [{ data: cp }, { data: members }] = await Promise.all([
        supabase.from('class_projects').select('class_id, project_id').in('class_id', cls.map(c => c.id)),
        supabase.from('class_members').select('class_id, user_id').in('class_id', cls.map(c => c.id)),
      ])
      setTotalMembers(new Set((members || []).map(m => m.user_id)).size)

      const counts = {}
      const classProjects = {}
      cp?.forEach(r => {
        counts[r.class_id] = (counts[r.class_id] || 0) + 1
        if (!classProjects[r.class_id]) classProjects[r.class_id] = []
        classProjects[r.class_id].push(r.project_id)
      })

      // One richer fetch covers scores (turma averages), needs-review,
      // recent activity and upcoming defenses — no point querying projects
      // four separate times for the same id list.
      const allProjectIds = cp?.map(r => r.project_id) ?? []
      let scoreMap = {}
      const classNameByProject = {}
      Object.entries(classProjects).forEach(([classId, ids]) => {
        const cls_ = cls.find(c => c.id === classId)
        ids.forEach(pid => { classNameByProject[pid] = cls_?.name })
      })

      if (allProjectIds.length) {
        const [{ data: projDetails }, { data: myFeedback }] = await Promise.all([
          supabase.from('projects').select('id, name, slug, creator_name, score, created_at, defense_date, review_status').in('id', allProjectIds),
          supabase.from('teacher_feedback').select('project_id').eq('teacher_id', user.id).in('project_id', allProjectIds),
        ])
        const projs = projDetails || []
        projs.forEach(p => { scoreMap[p.id] = p.score })

        const reviewedIds = new Set((myFeedback || []).map(f => f.project_id))
        setNeedsReview(
          projs
            .filter(p => !reviewedIds.has(p.id))
            .map(p => ({ ...p, className: classNameByProject[p.id] }))
        )

        setFlaggedForRevision(
          projs
            .filter(p => p.review_status === 'needs_revision')
            .map(p => ({ ...p, className: classNameByProject[p.id] }))
        )

        setResubmitted(
          projs
            .filter(p => p.review_status === 'resubmitted')
            .map(p => ({ ...p, className: classNameByProject[p.id] }))
        )

        setRecentActivity(
          [...projs]
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, 5)
            .map(p => ({ ...p, className: classNameByProject[p.id] }))
        )

        // 8-week submission trend — buckets start Monday, oldest first.
        const weeks = []
        const now = new Date()
        const mondayOf = d => { const x = new Date(d); const day = (x.getDay() + 6) % 7; x.setDate(x.getDate() - day); x.setHours(0, 0, 0, 0); return x }
        const thisMonday = mondayOf(now)
        for (let i = 7; i >= 0; i--) {
          const start = new Date(thisMonday); start.setDate(start.getDate() - i * 7)
          const end = new Date(start); end.setDate(end.getDate() + 7)
          weeks.push({ start, end, label: start.toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' }), count: 0 })
        }
        projs.forEach(p => {
          const created = new Date(p.created_at)
          const bucket = weeks.find(w => created >= w.start && created < w.end)
          if (bucket) bucket.count++
        })
        setWeeklyActivity(weeks.map(w => ({ label: w.label, count: w.count })))

        const today = new Date(); today.setHours(0, 0, 0, 0)
        setUpcomingDefenses(
          projs
            .filter(p => p.defense_date && new Date(p.defense_date + 'T00:00:00') >= today)
            .map(p => ({
              ...p,
              className: classNameByProject[p.id],
              daysLeft: Math.ceil((new Date(p.defense_date + 'T00:00:00') - today) / 86400000),
            }))
            .sort((a, b) => a.daysLeft - b.daysLeft)
            .slice(0, 5)
        )
      } else {
        setNeedsReview([])
        setRecentActivity([])
        setUpcomingDefenses([])
        setFlaggedForRevision([])
        setResubmitted([])
        setWeeklyActivity([])
      }

      const memberCounts = {}
      members?.forEach(m => { memberCounts[m.class_id] = (memberCounts[m.class_id] || 0) + 1 })

      setTurmas(cls.map(c => {
        const ids = classProjects[c.id] ?? []
        const scores = ids.map(id => scoreMap[id]).filter(s => s != null)
        const avg_score = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null
        return { ...c, project_count: counts[c.id] ?? 0, member_count: memberCounts[c.id] ?? 0, avg_score }
      }))
    }
    loadTurmas()
  }, [user, profile?.role])

  // ── Student turmas (aluno only) ─────────────────────────────────────────────
  useEffect(() => {
    if (!user || profile?.role === 'professor') { setLoadingStudentTurmas(false); return }
    async function loadStudentTurmas() {
      // 1. Read turmas saved via code-entry (localStorage)
      const lsKey = `showo_turmas_${user.id}`
      let cached = []
      try { cached = JSON.parse(localStorage.getItem(lsKey) || '[]') } catch {}

      // 2. Load turmas via project linkage (class_projects)
      let dbTurmas = []
      const { data: myProjs } = await supabase.from('projects').select('id').eq('user_id', user.id)
      if (myProjs?.length) {
        const { data: cp } = await supabase.from('class_projects').select('class_id').in('project_id', myProjs.map(p => p.id))
        if (cp?.length) {
          const classIds = [...new Set(cp.map(r => r.class_id))]
          const { data: classes } = await supabase.from('classes').select('id, name, code, teacher_name').in('id', classIds)
          dbTurmas = classes || []
        }
      }

      // 3. Merge — DB is source of truth, cached fills in turmas not yet linked via project
      const dbIds = new Set(dbTurmas.map(t => t.id))
      const merged = [...dbTurmas, ...cached.filter(t => !dbIds.has(t.id))]
      setStudentTurmas(merged)
      setLoadingStudentTurmas(false)
    }
    loadStudentTurmas()
  }, [user, profile?.role])

  // ── Pending class tasks (aluno only) — reads real class_members rows, not the
  // localStorage+project-linkage merge studentTurmas uses, so a student who joined
  // via code but hasn't linked a project yet still sees their turma's tasks ──
  useEffect(() => {
    if (!user || profile?.role === 'professor') return
    async function loadPendingTasks() {
      const { data: memberships } = await supabase.from('class_members').select('class_id').eq('user_id', user.id)
      if (!memberships?.length) { setPendingTasks([]); return }
      const classIds = [...new Set(memberships.map(m => m.class_id))]
      const { data: taskRows } = await supabase
        .from('class_tasks')
        .select('id, title, due_date, class_id, classes(name, teacher_id)')
        .in('class_id', classIds)
      if (!taskRows?.length) { setPendingTasks([]); return }
      const taskIds = taskRows.map(t => t.id)
      const { data: myCompletions } = await supabase
        .from('class_task_completions')
        .select('task_id')
        .eq('user_id', user.id)
        .in('task_id', taskIds)
      const doneIds = new Set((myCompletions || []).map(c => c.task_id))
      setPendingTasks(
        taskRows
          .filter(t => !doneIds.has(t.id))
          .sort((a, b) => (a.due_date || '9999') < (b.due_date || '9999') ? -1 : 1)
      )
    }
    loadPendingTasks()
  }, [user, profile?.role])

  async function completePendingTask(taskId) {
    const task = pendingTasks.find(t => t.id === taskId)
    setPendingTasks(prev => prev.filter(t => t.id !== taskId))
    await supabase.from('class_task_completions').insert({ task_id: taskId, user_id: user.id })
    if (task?.classes?.teacher_id) {
      const studentName = profile?.full_name || user?.user_metadata?.full_name || 'Um aluno'
      supabase.rpc('create_notification', {
        p_user_id: task.classes.teacher_id,
        p_type: 'TASK_COMPLETED',
        p_message: `${studentName} concluiu a tarefa "${task.title}" em "${task.classes.name}".`,
      })
    }
  }

  // ── Unread professor notifications (aluno only) — grade given, feedback left, status flagged ──
  useEffect(() => {
    if (!user || profile?.role === 'professor') return
    supabase
      .from('notifications')
      .select('id, message, project_slug, created_at')
      .eq('user_id', user.id)
      .eq('type', 'TEACHER_FEEDBACK')
      .eq('read', false)
      .order('created_at', { ascending: false })
      .limit(5)
      .then(({ data }) => { if (data) setProfNotifs(data) })
  }, [user, profile?.role])

  async function dismissProfNotif(id, slug) {
    setProfNotifs(prev => prev.filter(n => n.id !== id))
    await supabase.from('notifications').update({ read: true }).eq('id', id)
    if (slug) navigate(`/projeto/${slug}`)
  }

  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 32, height: 32, border: `2px solid ${C.border}`, borderTop: `2px solid ${C.blue}`, borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (!user) return null
  if (isAdmin) return null // redirecting to /admin

  const firstName = getDisplayName(user)
  const scores = projects.map(p => p.score).filter(s => s != null)
  const bestScore = scores.length ? Math.max(...scores) : null
  const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null
  const totalViews = projects.reduce((sum, p) => sum + (p.views ?? 0), 0)
  const isTeacher = profile?.role === 'professor'
  const isRecruiter = profile?.role === 'recrutador' || profile?.role === 'empresa'

  const { potential: potentialScore } = (() => {
    if (isTeacher || isRecruiter || !profile) return { potential: null }
    const withScore = projects.filter(p => p.score != null)
    if (!withScore.length) return { potential: null }
    return calculatePotential({ projects, profile })
  })()

  const greeting = (() => {
    const h = new Date().getHours()
    if (h >= 5  && h < 12) return `Bom dia, ${firstName}`
    if (h >= 12 && h < 20) return `Boa tarde, ${firstName}`
    if (h >= 20 && h < 23) return `Boa noite, ${firstName}`
    if (h >= 23 || h < 1)  return `Ainda aqui, ${firstName}?`
    return `A acabar à última da hora, ${firstName}?`
  })()

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: 'var(--font-body)' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes dash-section-in {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          0%   { background-position: -600px 0; }
          100% { background-position:  600px 0; }
        }
        .dash-skeleton {
          background: linear-gradient(90deg, ${C.card} 25%, ${C.cardHover} 50%, ${C.card} 75%);
          background-size: 1200px 100%;
          animation: shimmer 1.6s infinite linear;
          border: 1px solid ${C.border};
          border-radius: 10px;
        }

        /* ── Section header ── */
        .dash-sec-hd {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 16px;
        }
        .dash-sec-label {
          display: flex; align-items: center; gap: 7px;
          font-size: 11px; font-weight: 700; color: ${C.muted};
          text-transform: uppercase; letter-spacing: 0.1em;
          font-family: var(--font-body);
        }
        .dash-sec-count {
          background: rgba(255,255,255,0.04);
          border: 1px solid ${C.border};
          border-radius: 20px; padding: 1px 7px;
          font-size: 10px; font-weight: 700; color: ${C.subtle};
        }

        /* ── Stat pills — refined ── */
        .dash-stat-pill {
          display: inline-flex; align-items: center; gap: 5px;
          background: rgba(255,255,255,0.03);
          border: 1px solid ${C.border};
          border-radius: 8px;
          padding: 5px 12px;
          font-size: 12px; font-weight: 600; color: ${C.muted};
          white-space: nowrap;
          transition: border-color 0.15s, color 0.15s;
          cursor: default;
        }
        .dash-stat-pill:hover { border-color: ${C.borderBright}; color: ${C.text}; }

        /* ── Project rows — hover feedback ── */
        .dash-project-row {
          transition: background 0.15s, border-color 0.15s !important;
        }
        .dash-project-row:hover {
          border-color: ${C.borderBright} !important;
        }

        /* ── Project actions — expand on hover ── */
        .dash-project-actions {
          display: flex; gap: 2px; align-items: center;
          flex-shrink: 0; overflow: hidden;
          max-width: 0; opacity: 0;
          transition: max-width 0.3s cubic-bezier(.4,0,.2,1), opacity 0.2s ease;
        }
        .dash-project-row:hover .dash-project-actions {
          max-width: 180px;
          opacity: 1;
        }
        .dash-ghost-btn {
          width: 32px; height: 32px; border-radius: 8px;
          background: transparent; border: none;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; color: ${C.subtle}; flex-shrink: 0;
          transition: color 0.15s, background 0.15s;
        }
        .dash-ghost-btn:hover { color: ${C.text}; background: ${C.glass}; }
        .dash-ghost-btn-danger:hover { color: #ef4444; background: rgba(239,68,68,0.08); }

        /* ── Animated entry for lists ── */
        @keyframes dash-item-in {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        @media (max-width: 860px) {
          .dash-hd-btn-profile { display: none !important; }
        }
        /* Mobile project icon actions — hidden by default (desktop shows text buttons) */
        .dash-proj-actions-mobile { display: none; }
        /* ── CTA buttons in cards — coerência de tamanho ── */
        .dash-action-btn {
          font-size: 13px; font-weight: 600;
          padding: 7px 14px; border-radius: 8px;
          white-space: nowrap; cursor: pointer; font-family: inherit;
          transition: opacity 0.15s;
          flex-shrink: 0;
        }
        .dash-action-btn:hover { opacity: 0.88; }
        .dash-action-btn:active { opacity: 0.75; }

        /* ── Action insight cards — hover feedback ── */
        .dash-insight-card {
          transition: border-color 0.15s !important;
        }
        .dash-insight-card:hover {
          border-color: rgba(27,120,247,0.35) !important;
        }
        /* Chart hidden on mobile */
        .dash-chart-wrap { }

        .dash-proj-area-tag { }

        /* ── Turma + Projetos side by side (aluno dashboard) ── */
        .dash-turma-projects-grid {
          display: grid;
          grid-template-columns: 360px 1fr;
          gap: 24px;
          align-items: start;
        }
        .dash-turma-col, .dash-projects-col { min-width: 0; display: flex; flex-direction: column; gap: 16px; }
        .dash-resumo-toggle { display: none; align-items: center; gap: 8px; background: var(--c-glass); border: 1px solid var(--c-glass-border); border-radius: 12px; padding: 14px 16px; cursor: pointer; transition: background 0.15s; }
        .dash-resumo-toggle:active { background: var(--c-glass-hover); }

        @media (max-width: 860px) {
          .dash-turma-projects-grid { grid-template-columns: 1fr; gap: 20px; }
        }

        /* ── Teacher 2-column: turmas left, feed right ── */
        .dash-teacher-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          align-items: start;
        }
        .dash-teacher-left, .dash-teacher-right {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        @media (max-width: 900px) {
          .dash-teacher-grid { grid-template-columns: 1fr; gap: 20px; }
        }
        /* ── Chart hidden on small screens ── */

        @media (max-width: 600px) {
          /* ── Chart ── */
          .dash-chart-wrap { display: none; }

          /* ── Project card — compact on mobile, no cover ── */
          .dash-project-row { cursor: pointer; }
          .dash-project-actions { display: none !important; }
          .dash-proj-actions-mobile {
            display: flex !important;
            align-items: center;
            gap: 4px;
            flex-shrink: 0;
          }
          .dash-proj-tagline { display: none !important; }
          .dash-proj-area-tag { display: none !important; }
          .dash-proj-body { padding: 12px 14px !important; }
          /* InsightsBlock: stack ring + stats vertically */
          .dash-insights-top { flex-direction: column !important; align-items: flex-start !important; gap: 12px !important; }
          .dash-insights-ring { width: 72px !important; height: 72px !important; }
          .dash-insights-ring svg { width: 72px !important; height: 72px !important; }
          .dash-insights-stats { flex-direction: row !important; flex-wrap: wrap !important; gap: 16px !important; }

          /* ── Stat pills — slightly bigger touch feel ── */
          .dash-stat-pill {
            font-size: 12px !important;
            padding: 5px 13px !important;
          }

          /* ── Section header buttons ── */
          .dash-sec-hd button { font-size: 13px !important; }

          /* ── Header ── */
          .dash-hd-btn-profile { display: none !important; }

          /* ── Score / stats area — 2 pills per row ── */
          .dash-score-section { flex-direction: row !important; flex-wrap: wrap !important; gap: 6px !important; }
          .dash-stat-pill { font-size: 11px !important; padding: 4px 10px !important; }
          /* ── Quick actions grid ── */
          .dash-quick-actions { grid-template-columns: 1fr !important; }
          /* ── Onboarding progress bar — hide on mobile ── */
          .dash-onboarding-progress { display: none !important; }
          /* ── Onboarding / guide card — stack vertically on mobile ── */
          .dash-guide-card {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 14px !important;
            padding: 16px !important;
            border-left-width: 0 !important;
            border-top: 3px solid var(--guide-accent) !important;
          }
          .dash-guide-card .dash-guide-icon {
            width: 40px !important; height: 40px !important;
          }
          .dash-guide-card .dash-guide-text { text-align: left; }
          .dash-guide-card .dash-guide-text div:first-child { font-size: 15px !important; }
          .dash-guide-card .dash-guide-text div:last-child { font-size: 13px !important; }
          .dash-guide-card .dash-action-btn {
            align-self: stretch !important;
            text-align: center !important;
            padding: 12px 14px !important;
            font-size: 14px !important;
            border-radius: 10px !important;
          }
          /* ── Project row score pill — show abbreviated ── */
          .dash-proj-score { font-size: 11px !important; }
          /* ── Welcome/greeting — reduce font size ── */
          .dash-greeting { font-size: clamp(20px, 5vw, 28px) !important; }
          /* ── Milestones / progress section ── */
          .dash-milestones { padding: 14px !important; }
          /* ── Teacher stats grid — 2 cols on mobile ── */
          .dash-teacher-stats { grid-template-columns: repeat(2, 1fr) !important; gap: 8px !important; }
          /* ── Compact action bar — wrap on mobile ── */
          .dash-quick-actions-row { flex-wrap: wrap !important; }
          /* ── Toasts — bottom tab bar retired, so sit near the true bottom edge ── */
          .dash-toast-center { bottom: calc(24px + env(safe-area-inset-bottom, 0px)) !important; }
          /* ── Mobile: projects first, resumo collapsed ── */
          .dash-turma-col { order: 2 !important; padding-top: 0 !important; }
          .dash-projects-col { order: 1 !important; }
          .dash-resumo-toggle {
            display: flex !important;
          }
          .dash-resumo-body.collapsed {
            display: none !important;
          }
          .dash-toast-xp { bottom: calc(24px + env(safe-area-inset-bottom, 0px)) !important; right: 12px !important; min-width: 0 !important; max-width: calc(100vw - 24px) !important; }
        }
      `}</style>
      <Navbar />

      {showOnboardingAluno && (
        <OnboardingAlunoModal
          user={user}
          profile={profile}
          onDismiss={dismissOnboardingAluno}
          firstProject={projects[0] ?? null}
          claimedSlug={claimedSlug}
        />
      )}

      {showOnboarding && (
        <OnboardingModal
          user={user}
          profile={profile}
          onDismiss={dismissOnboarding}
          onCreateTurma={() => { dismissOnboarding(); setShowCreateTurma(true) }}
        />
      )}

      {/* Toast simples */}
      <div className="dash-toast-center" style={{
        position: 'fixed', bottom: 28, left: '50%',
        transform: `translateX(-50%) translateY(${toast ? 0 : 80}px)`,
        opacity: toast ? 1 : 0, transition: 'all 0.3s cubic-bezier(0.34,1.56,0.64,1)',
        background: 'var(--c-bg-alt)', border: `1px solid ${C.borderBright}`, borderRadius: 10,
        padding: '12px 24px', fontSize: 14, fontWeight: 600, color: C.text,
        zIndex: 3000, pointerEvents: 'none', whiteSpace: 'nowrap',
        boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
      }}>{toast}</div>

      {showCreateTurma && (
        <CreateTurmaModal
          onClose={() => setShowCreateTurma(false)}
          onCreated={turma => setTurmas(prev => [{ ...turma, project_count: 0 }, ...prev])}
        />
      )}

      {showJoinModal && (
        <JoinTurmaModal
          onClose={() => setShowJoinModal(false)}
          navigate={navigate}
          onJoined={(turma) => {
            setStudentTurmas(prev => prev.find(t => t.id === turma.id) ? prev : [...prev, turma])
            // Persist in localStorage (fallback)
            try {
              const lsKey = `showo_turmas_${user.id}`
              const existing = JSON.parse(localStorage.getItem(lsKey) || '[]')
              if (!existing.find(t => t.id === turma.id)) {
                localStorage.setItem(lsKey, JSON.stringify([...existing, turma]))
              }
            } catch {}
            // Membership itself was already registered server-side by join_class
          }}
        />
      )}

      {showTurmasModal && (
        <TurmasListModal
          turmas={studentTurmas}
          onClose={() => setShowTurmasModal(false)}
          navigate={navigate}
          onJoin={() => setShowJoinModal(true)}
        />
      )}

      {/* Brand accent line */}
      <div style={{ height: 2, background: `linear-gradient(90deg, transparent 0%, ${C.blue}88 35%, #4f46e588 65%, transparent 100%)` }} />

      <div className="dash-content page-content">

        {/* ── Header ── */}
        {!isTeacher ? (
          /* ── Aluno header — compact ── */
          <div style={{ marginBottom: 24, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 className="dash-greeting" style={{ color: C.text, fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 400, margin: '0 0 6px', letterSpacing: '-1px', lineHeight: 1.15, fontFamily: 'var(--font-heading)' }}>
                {greeting}
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: C.blue }}>
                  {{ aluno: 'Aluno', professor: 'Professor', recrutador: 'Recrutador', empresa: 'Empresa' }[profile?.role] ?? 'Aluno'}
                </span>
                <span style={{ color: C.subtle, fontSize: 12 }}>· {user.email}</span>
              </div>
            </div>
            <button
              onClick={() => navigate(`/u/${profile?.username || ''}`)}
              className="dash-action-btn"
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: `${C.blue}18`, border: `1px solid ${C.blue}30`, color: C.blue }}
              onMouseEnter={e => { e.currentTarget.style.background = `${C.blue}28`; e.currentTarget.style.borderColor = `${C.blue}55` }}
              onMouseLeave={e => { e.currentTarget.style.background = `${C.blue}18`; e.currentTarget.style.borderColor = `${C.blue}30` }}
            >
              <User size={14} /> Perfil
            </button>
          </div>
        ) : (
          /* ── Teacher header — keep existing ── */
          <div style={{ marginBottom: 36, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 className="dash-greeting" style={{ color: C.text, fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 400, margin: '0 0 6px', letterSpacing: '-1px', lineHeight: 1.15, fontFamily: 'var(--font-heading)' }}>
                {greeting}
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: C.blue }}>Professor</span>
                <span style={{ color: C.subtle, fontSize: 12 }}>· {user.email}</span>
              </div>
              {!loadingProjects && turmas.length > 0 && (
                <div className="dash-score-section" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <span className="dash-stat-pill">
                    <Users2 size={11} /> {turmas.length} turma{turmas.length !== 1 ? 's' : ''}
                  </span>
                  {totalMembers > 0 && (
                    <span className="dash-stat-pill">
                      <Users size={11} /> {totalMembers} aluno{totalMembers !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Próximos passos (aluno only) ── */}
        {!isTeacher && !loadingProjects && (() => {
          const steps = []

          if (projects.length === 0) {
            steps.push({
              id: 'create', Icon: Plus, color: C.blue,
              title: 'Cria o teu primeiro projeto',
              desc: 'Começa a construir o teu portfólio. Leva menos de 2 minutos.',
              cta: 'Criar projeto', action: () => setShowCreateModal(true),
            })
          } else {
            if (!profile?.avatar_url) {
              steps.push({
                id: 'avatar', Icon: User, color: '#8b5cf6',
                title: 'Adiciona uma foto de perfil',
                desc: 'Perfis com foto têm mais visibilidade no ranking e mais credibilidade.',
                cta: 'Ir para Definições', action: () => navigate('/settings'),
              })
            }
            if (bestScore !== null && bestScore < 60) {
              steps.push({
                id: 'score60', Icon: Target, color: '#22c55e',
                title: `Score ${bestScore} → tenta chegar a 60`,
                desc: 'Adiciona tecnologias, links e uma boa descrição ao projeto para subir.',
                cta: 'Editar projeto', action: () => navigate(`/editar/${projects[0]?.slug}`),
              })
            } else if (bestScore !== null && bestScore >= 60 && bestScore < 90) {
              steps.push({
                id: 'score90', Icon: Zap, color: '#f97316',
                title: `Score ${bestScore} → vai para 90+`,
                desc: 'Usa análise de IA, adiciona colaboradores ou mais detalhes ao projeto.',
                cta: 'Ver projeto', action: () => navigate(`/projeto/${projects[0]?.slug}`),
              })
            }
            if (!projects.some(p => p.ai_tagline)) {
              steps.push({
                id: 'ai', Icon: Sparkles, color: '#a78bfa',
                title: 'Experimenta a análise de IA',
                desc: 'A IA analisa o teu projeto e sugere melhorias concretas para subir o score.',
                cta: 'Analisar agora', action: () => navigate(`/projeto/${projects[0]?.slug}`),
              })
            }
            if (totalViews < 10) {
              steps.push({
                id: 'share', Icon: Globe, color: '#06b6d4',
                title: 'Partilha o teu projeto',
                desc: `Só tens ${totalViews} visualizações. Partilha o link nas redes sociais.`,
                cta: 'Ver projeto', action: () => navigate(`/projeto/${projects[0]?.slug}`),
              })
            }
          }

          if (steps.length === 0) return null
          const primary = steps[0]
          const secondary = steps.slice(1, 3)
          const PIcon = primary.Icon

          // Onboarding progress — only the two universal steps count (project + avatar)
          const onboardingDone = (projects.length > 0 ? 1 : 0) + (profile?.avatar_url ? 1 : 0)
          const showOnboardingProgress = onboardingDone < 2

          // No project yet — the empty-state card below already has its own "Criar projeto" CTA,
          // so just show the progress label here, not a second redundant card.
          if (primary.id === 'create') {
            return showOnboardingProgress ? (
              <div className="dash-onboarding-progress" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Primeiros passos</span>
                <div style={{ flex: '0 0 60px', height: 4, background: C.border, borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{ width: `${(onboardingDone / 2) * 100}%`, height: '100%', background: C.blue, borderRadius: 999, transition: 'width 0.4s ease' }} />
                </div>
                <span style={{ fontSize: 11, color: C.subtle }}>{onboardingDone}/2</span>
              </div>
            ) : null
          }

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 }}>
              {showOnboardingProgress && (
                <div className="dash-onboarding-progress" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Primeiros passos</span>
                  <div style={{ flex: '0 0 60px', height: 4, background: C.glassBorder, borderRadius: 999, overflow: 'hidden' }}>
                    <div style={{ width: `${(onboardingDone / 2) * 100}%`, height: '100%', background: C.blue, borderRadius: 999, transition: 'width 0.4s ease' }} />
                  </div>
                  <span style={{ fontSize: 11, color: C.subtle }}>{onboardingDone}/2</span>
                </div>
              )}
              {/* Primary action — full width, accent left border */}
              <div
                className="dash-guide-card"
                style={{
                  '--guide-accent': primary.color,
                  ...C.glassStyle,
                  background: C.glass,
                  border: `1px solid ${primary.color}30`,
                  borderLeft: `3px solid ${primary.color}`,
                  borderRadius: 12, padding: '18px 20px',
                  display: 'flex', gap: 16, alignItems: 'center',
                  transition: 'border-color 0.15s',
                  boxShadow: 'none',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = primary.color + '55' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = primary.color + '30' }}
              >
                <div className="dash-guide-icon" style={{ width: 44, height: 44, borderRadius: 10, flexShrink: 0, background: primary.color + '18', border: `1px solid ${primary.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <PIcon size={20} color={primary.color} />
                </div>
                <div className="dash-guide-text" style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: C.text, marginBottom: 2 }}>{primary.title}</div>
                  <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5 }}>{primary.desc}</div>
                </div>
                <button
                  className="dash-action-btn"
                  onClick={primary.action}
                  style={{
                    background: primary.color,
                    border: 'none', color: '#fff',
                    boxShadow: `0 2px 8px ${primary.color}33`,
                  }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                >
                  {primary.cta}
                </button>
              </div>

              {/* Secondary steps — compact inline row */}
              {secondary.length > 0 && (
                <div className="dash-quick-actions" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {secondary.map(s => {
                    const SIcon = s.Icon
                    return (
                      <button
                        key={s.id}
                        onClick={s.action}
                        style={{
                          ...C.glassStyle,
                          display: 'flex', alignItems: 'center', gap: 8,
                          background: C.glass, border: `1px solid ${C.glassBorder}`,
                          borderRadius: 8, padding: '9px 14px',
                          color: C.muted, fontSize: 12, fontWeight: 600,
                          cursor: 'pointer', fontFamily: 'inherit',
                          transition: 'border-color 0.12s, color 0.12s',
                          flex: 1, minWidth: 160,
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = s.color + '55'; e.currentTarget.style.color = C.text }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = C.glassBorder; e.currentTarget.style.color = C.muted }}
                      >
                        <SIcon size={13} color={s.color} style={{ flexShrink: 0 }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</span>
                        <ChevronRight size={12} style={{ marginLeft: 'auto', flexShrink: 0 }} />
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })()}

        {/* ── Stats overview (professor only) ── */}
        {isTeacher && turmas.length > 0 && (
          <div className="dash-teacher-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 24, animation: 'dash-section-in 0.4s ease both' }}>
            {[
              { label: 'Alunos', value: totalMembers },
              { label: 'Projetos', value: turmas.reduce((s, t) => s + (t.project_count || 0), 0) },
              {
                label: 'Score médio',
                value: (() => {
                  const withScore = turmas.filter(t => t.avg_score != null)
                  if (!withScore.length) return '—'
                  return Math.round(withScore.reduce((s, t) => s + t.avg_score, 0) / withScore.length)
                })(),
              },
              { label: 'Por rever', value: needsReview.length, accent: needsReview.length > 0 },
            ].map(stat => (
              <div key={stat.label} style={{ ...C.glassStyle, background: C.glass, border: `1px solid ${stat.accent ? 'rgba(239,68,68,0.25)' : C.glassBorder}`, borderRadius: 14, padding: '18px 20px' }}>
                <div style={{ fontSize: 32, fontWeight: 400, fontFamily: 'var(--font-heading)', color: stat.accent ? '#ef4444' : C.blue, letterSpacing: '-1px', lineHeight: 1 }}>{stat.value}</div>
                <div style={{ fontSize: 12, color: C.muted, fontWeight: 600, marginTop: 6 }}>{stat.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── Atividade semanal (professor only) — projects submitted per week
             across all their turmas, last 8 weeks. Same signal the monthly
             AI report is built from. ── */}
        {isTeacher && turmas.length > 0 && weeklyActivity.some(w => w.count > 0) && (
          <div style={{ ...C.glassStyle, background: C.glass, border: `1px solid ${C.glassBorder}`, borderRadius: 12, padding: '18px 22px', marginBottom: 24, animation: 'dash-section-in 0.4s 0.15s ease both' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <BarChart2 size={13} color={C.muted} />
              <span style={{ fontSize: 12, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Projetos submetidos — últimas 8 semanas
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 90 }}>
              {(() => {
                const max = Math.max(1, ...weeklyActivity.map(w => w.count))
                return weeklyActivity.map(w => (
                  <div key={w.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: w.count > 0 ? C.blue : C.subtle }}>{w.count > 0 ? w.count : ''}</span>
                    <div style={{
                      width: '100%', maxWidth: 28,
                      height: `${Math.max(4, (w.count / max) * 56)}px`,
                      background: w.count > 0 ? 'linear-gradient(180deg, #1b78f7, #1b78f799)' : C.border,
                      borderRadius: 4,
                    }} />
                  </div>
                ))
              })()}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              {weeklyActivity.map(w => (
                <span key={w.label} style={{ flex: 1, fontSize: 9, color: C.subtle, textAlign: 'center' }}>{w.label}</span>
              ))}
            </div>
            {!profile?.monthly_report_opt_in && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.border}` }}>
                <span style={{ fontSize: 12, color: C.muted }}>Recebe este resumo por email todos os meses.</span>
                <button
                  onClick={() => navigate('/settings')}
                  style={{ background: 'none', border: 'none', color: C.blue, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}
                >
                  Ativar relatório mensal
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Primeiros passos (professor only) ── */}
        {isTeacher && (() => {
          const done = (turmas.length > 0 ? 1 : 0) + (totalMembers > 0 ? 1 : 0)
          if (done >= 2) return null
          const step = turmas.length === 0
            ? { Icon: Users2, color: C.blue, title: 'Cria a tua primeira turma', desc: 'Gera um código e partilha-o com os teus alunos para começarem a submeter projetos.', cta: 'Criar turma', action: () => setShowCreateTurma(true) }
            : { Icon: Users, color: '#8b5cf6', title: 'Convida os teus alunos', desc: `Partilha o código de ${turmas[0]?.name ?? 'uma turma'} — sem alunos, a turma fica vazia.`, cta: 'Ver turma', action: () => navigate(`/turma/${turmas[0]?.code}`) }
          const SIcon = step.Icon
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 }}>
              <div className="dash-onboarding-progress" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Primeiros passos</span>
                <div style={{ flex: '0 0 60px', height: 4, background: C.glassBorder, borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{ width: `${(done / 2) * 100}%`, height: '100%', background: C.blue, borderRadius: 999, transition: 'width 0.4s ease' }} />
                </div>
                <span style={{ fontSize: 11, color: C.subtle }}>{done}/2</span>
              </div>
              <div className="dash-guide-card" style={{ '--guide-accent': step.color, ...C.glassStyle, background: C.glass, border: `1px solid ${step.color}30`, borderLeft: `3px solid ${step.color}`, borderRadius: 12, padding: '18px 20px', display: 'flex', gap: 16, alignItems: 'center' }}>
                <div className="dash-guide-icon" style={{ width: 44, height: 44, borderRadius: 10, flexShrink: 0, background: step.color + '18', border: `1px solid ${step.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <SIcon size={20} color={step.color} />
                </div>
                <div className="dash-guide-text" style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: C.text, marginBottom: 2 }}>{step.title}</div>
                  <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5 }}>{step.desc}</div>
                </div>
                <button
                  className="dash-action-btn"
                  onClick={step.action}
                  style={{ background: step.color, border: 'none', color: '#fff', boxShadow: `0 2px 8px ${step.color}33` }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                >
                  {step.cta}
                </button>
              </div>
            </div>
          )
        })()}

        {/* ── Teacher 2-column: turmas left, review/activity right ── */}
        {isTeacher && (
          <div className="dash-teacher-grid">
            {/* ── Left: turmas ── */}
            <div className="dash-teacher-left">
              <div style={{ animation: 'dash-section-in 0.4s 0.2s ease both' }}>
                <div className="dash-sec-hd">
                  <div className="dash-sec-label">
                    <Users2 size={13} /> As minhas turmas
                    {turmas.length > 0 && <span className="dash-sec-count">{turmas.length}</span>}
                  </div>
                  <button
                    onClick={() => setShowCreateTurma(true)}
                    className="dash-action-btn"
                    style={{ display: 'flex', alignItems: 'center', gap: 6, background: `${C.blue}18`, border: `1px solid ${C.blue}30`, color: C.blue }}
                    onMouseEnter={e => { e.currentTarget.style.background = `${C.blue}28`; e.currentTarget.style.borderColor = `${C.blue}55` }}
                    onMouseLeave={e => { e.currentTarget.style.background = `${C.blue}18`; e.currentTarget.style.borderColor = `${C.blue}30` }}
                  >
                    <Plus size={13} /> Nova turma
                  </button>
                </div>
                {(() => {
                  const years = [...new Set(turmas.map(t => t.academic_year).filter(Boolean))].sort().reverse()
                  if (years.length < 2) return null
                  return (
                    <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
                      {['all', ...years].map(y => (
                        <button
                          key={y}
                          onClick={() => setTurmaYearFilter(y)}
                          style={{
                            background: turmaYearFilter === y ? 'rgba(27,120,247,0.14)' : 'transparent',
                            border: `1px solid ${turmaYearFilter === y ? 'rgba(27,120,247,0.3)' : C.border}`,
                            borderRadius: 999, padding: '5px 12px', fontSize: 12, fontWeight: 700,
                            color: turmaYearFilter === y ? C.blue : C.muted, cursor: 'pointer', fontFamily: 'inherit',
                            transition: 'background 0.15s, border-color 0.15s',
                          }}
                        >
                          {y === 'all' ? 'Todos os anos' : y}
                        </button>
                      ))}
                    </div>
                  )
                })()}
                {turmas.length === 0 ? (
                  <div style={{ ...C.glassStyle, background: C.glass, border: `1px dashed ${C.glassBorder}`, borderRadius: 12, padding: '40px 28px', textAlign: 'center' }}>
                    <div style={{ marginBottom: 14, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 52, height: 52, borderRadius: 12, background: 'rgba(27,120,247,0.08)', border: '1px solid rgba(27,120,247,0.15)' }}>
                      <Users2 size={24} color="#1b78f7" />
                    </div>
                    <p style={{ color: C.text, fontSize: 15, fontWeight: 700, margin: '0 0 6px' }}>Ainda não tens turmas</p>
                    <p style={{ color: C.muted, fontSize: 13, margin: '0 0 22px', lineHeight: 1.6 }}>Cria uma turma e partilha o código com os teus alunos.</p>
                    <button onClick={() => setShowCreateTurma(true)} style={{ background: '#1b78f7', border: 'none', borderRadius: 8, padding: '10px 24px', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 2px 8px rgba(27,120,247,0.2)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>Criar primeira turma <ArrowRight size={14} /></span>
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {turmas
                      .filter(t => turmaYearFilter === 'all' || t.academic_year === turmaYearFilter)
                      .map(t => <TurmaCard key={t.id} turma={t} navigate={navigate} />)}
                  </div>
                )}
              </div>
            </div>

            {/* ── Right: review + activity feed ── */}
            <div className="dash-teacher-right">
              {/* Students who marked their corrections as done — first thing the
                  teacher sees on entry, since it's the most actionable list */}
              {resubmitted.length > 0 && (
                <div style={{ animation: 'dash-section-in 0.4s 0.18s ease both' }}>
                  <div className="dash-sec-hd">
                    <div className="dash-sec-label">
                      <Check size={13} /> Correções enviadas
                      <span className="dash-sec-count">{resubmitted.length}</span>
                    </div>
                  </div>
                  <div style={{ ...C.glassStyle, background: C.glass, border: '1px solid rgba(27,120,247,0.25)', borderRadius: 12, overflow: 'hidden' }}>
                    {resubmitted.slice(0, 5).map((p, i) => (
                      <div
                        key={p.id}
                        onClick={() => navigate(`/projeto/${p.slug}`)}
                        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: i < Math.min(resubmitted.length, 5) - 1 ? `1px solid ${C.glassBorder}` : 'none', cursor: 'pointer', transition: 'background 0.12s' }}
                        onMouseEnter={e => e.currentTarget.style.background = C.glassHover}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, background: 'rgba(27,120,247,0.1)', border: '1px solid rgba(27,120,247,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Check size={14} color="#1b78f7" />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                          <div style={{ fontSize: 11, color: C.subtle }}>{p.creator_name || 'Aluno'}{p.className ? ` · ${p.className}` : ''} · pronto para nova revisão</div>
                        </div>
                        <ChevronRight size={14} color={C.subtle} style={{ flexShrink: 0 }} />
                      </div>
                    ))}
                    {resubmitted.length > 5 && (
                      <div style={{ padding: '10px 16px', fontSize: 12, color: C.subtle, textAlign: 'center' }}>
                        +{resubmitted.length - 5} projeto{resubmitted.length - 5 !== 1 ? 's' : ''} com correções enviadas
                      </div>
                    )}
                  </div>
                </div>
              )}

              {needsReview.length > 0 && (
                <div style={{ animation: 'dash-section-in 0.4s 0.2s ease both' }}>
                  <div className="dash-sec-hd">
                    <div className="dash-sec-label">
                      <MessageSquare size={13} /> Precisa da tua atenção
                      <span className="dash-sec-count">{needsReview.length}</span>
                    </div>
                  </div>
                  <div style={{ ...C.glassStyle, background: C.glass, border: `1px solid ${C.glassBorder}`, borderRadius: 12, overflow: 'hidden' }}>
                    {needsReview.slice(0, 5).map((p, i) => (
                      <div
                        key={p.id}
                        onClick={() => navigate(`/projeto/${p.slug}`)}
                        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: i < Math.min(needsReview.length, 5) - 1 ? `1px solid ${C.glassBorder}` : 'none', cursor: 'pointer', transition: 'background 0.12s' }}
                        onMouseEnter={e => e.currentTarget.style.background = C.glassHover}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Folder size={14} color="#fbbf24" />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                          <div style={{ fontSize: 11, color: C.subtle }}>{p.creator_name || 'Aluno'}{p.className ? ` · ${p.className}` : ''} · sem feedback teu</div>
                        </div>
                        <ChevronRight size={14} color={C.subtle} style={{ flexShrink: 0 }} />
                      </div>
                    ))}
                    {needsReview.length > 5 && (
                      <div style={{ padding: '10px 16px', fontSize: 12, color: C.subtle, textAlign: 'center' }}>
                        +{needsReview.length - 5} projeto{needsReview.length - 5 !== 1 ? 's' : ''} por rever
                      </div>
                    )}
                  </div>
                </div>
              )}

              {flaggedForRevision.length > 0 && (
                <div style={{ animation: 'dash-section-in 0.4s 0.25s ease both' }}>
                  <div className="dash-sec-hd">
                    <div className="dash-sec-label">
                      <AlertTriangle size={13} /> A aguardar revisão
                      <span className="dash-sec-count">{flaggedForRevision.length}</span>
                    </div>
                  </div>
                  <div style={{ ...C.glassStyle, background: C.glass, border: `1px solid ${C.glassBorder}`, borderRadius: 12, overflow: 'hidden' }}>
                    {flaggedForRevision.slice(0, 5).map((p, i) => (
                      <div
                        key={p.id}
                        onClick={() => navigate(`/projeto/${p.slug}`)}
                        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: i < Math.min(flaggedForRevision.length, 5) - 1 ? `1px solid ${C.glassBorder}` : 'none', cursor: 'pointer', transition: 'background 0.12s' }}
                        onMouseEnter={e => e.currentTarget.style.background = C.glassHover}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <AlertTriangle size={14} color="#f97316" />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                          <div style={{ fontSize: 11, color: C.subtle }}>{p.creator_name || 'Aluno'}{p.className ? ` · ${p.className}` : ''} · a aguardar correções</div>
                        </div>
                        <ChevronRight size={14} color={C.subtle} style={{ flexShrink: 0 }} />
                      </div>
                    ))}
                    {flaggedForRevision.length > 5 && (
                      <div style={{ padding: '10px 16px', fontSize: 12, color: C.subtle, textAlign: 'center' }}>
                        +{flaggedForRevision.length - 5} projeto{flaggedForRevision.length - 5 !== 1 ? 's' : ''} a aguardar revisão
                      </div>
                    )}
                  </div>
                </div>
              )}

              {upcomingDefenses.length > 0 && (
                <div>
                  <div className="dash-sec-hd">
                    <div className="dash-sec-label">
                      <Calendar size={13} /> Próximas defesas
                      <span className="dash-sec-count">{upcomingDefenses.length}</span>
                    </div>
                  </div>
                  <div style={{ ...C.glassStyle, background: C.glass, border: `1px solid ${C.glassBorder}`, borderRadius: 12, overflow: 'hidden' }}>
                    {upcomingDefenses.map((p, i) => {
                      const urgentColor = p.daysLeft <= 7 ? '#ef4444' : p.daysLeft <= 30 ? '#f97316' : C.blue
                      return (
                        <div
                          key={p.id}
                          onClick={() => navigate(`/projeto/${p.slug}`)}
                          style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: i < upcomingDefenses.length - 1 ? `1px solid ${C.glassBorder}` : 'none', cursor: 'pointer', transition: 'background 0.12s' }}
                          onMouseEnter={e => e.currentTarget.style.background = C.glassHover}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, background: `${urgentColor}18`, border: `1px solid ${urgentColor}40`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Calendar size={14} color={urgentColor} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                            <div style={{ fontSize: 11, color: C.subtle }}>{p.creator_name || 'Aluno'}{p.className ? ` · ${p.className}` : ''}</div>
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 700, color: urgentColor, flexShrink: 0 }}>
                            {p.daysLeft === 0 ? 'Hoje' : p.daysLeft === 1 ? 'Amanhã' : `${p.daysLeft} dias`}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {recentActivity.length > 0 && (
                <div style={{ animation: 'dash-section-in 0.4s 0.3s ease both' }}>
                  <div className="dash-sec-hd">
                    <div className="dash-sec-label">
                      <TrendingUp size={13} /> Atividade recente
                    </div>
                  </div>
                  <div style={{ ...C.glassStyle, background: C.glass, border: `1px solid ${C.glassBorder}`, borderRadius: 12, overflow: 'hidden' }}>
                    {recentActivity.map((p, i) => (
                      <div
                        key={p.id}
                        onClick={() => navigate(`/projeto/${p.slug}`)}
                        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: i < recentActivity.length - 1 ? `1px solid ${C.glassBorder}` : 'none', cursor: 'pointer', transition: 'background 0.12s' }}
                        onMouseEnter={e => e.currentTarget.style.background = C.glassHover}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Folder size={14} color="#22c55e" />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                          <div style={{ fontSize: 11, color: C.subtle }}>{p.creator_name || 'Aluno'}{p.className ? ` · ${p.className}` : ''} · {timeAgoLabel(p.created_at)}</div>
                        </div>
                        {p.score != null && (
                          <span style={{ fontSize: 12, fontWeight: 700, color: p.score >= 71 ? '#22c55e' : p.score >= 40 ? '#f59e0b' : '#ef4444', flexShrink: 0 }}>
                            {p.score}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── All sections ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* ── Defense countdown strip (aluno only) ── */}
          {!isTeacher && !loadingProjects && (() => {
            const today = new Date(); today.setHours(0,0,0,0)
            const upcoming = projects
              .filter(p => p.defense_date)
              .map(p => ({ ...p, daysLeft: Math.ceil((new Date(p.defense_date + 'T00:00:00') - today) / 86400000) }))
              .sort((a, b) => a.daysLeft - b.daysLeft)
            const next = upcoming[0]
            if (!next) return null
            const urgentColor = next.daysLeft <= 7 ? '#ef4444' : next.daysLeft <= 30 ? '#f97316' : C.blue
            const defenseDate = new Date(next.defense_date + 'T00:00:00').toLocaleDateString('pt-PT', { weekday: 'short', day: 'numeric', month: 'long' })
            const scoreVal = next.score ?? 0
            const scoreCol = getScoreColor(next.score)
            return (
              <div
                className="dash-milestones"
                onClick={() => navigate(`/projeto/${next.slug}`)}
                style={{ ...C.glassStyle, background: C.glass, border: `1px solid ${urgentColor}35`, borderRadius: 12, overflow: 'hidden', cursor: 'pointer', transition: 'border-color 0.15s', boxShadow: 'none' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = urgentColor + '70' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = urgentColor + '35' }}
              >
                {/* Top accent */}
                <div style={{ height: 3, background: `linear-gradient(90deg, ${urgentColor}, ${urgentColor}33)` }} />
                <div style={{ padding: '14px 18px' }}>
                  {/* Header row */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: urgentColor, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>
                        {next.daysLeft < 0 ? 'Concluída' : next.daysLeft === 0 ? 'Hoje!' : next.daysLeft <= 7 ? 'Esta semana' : 'Defesa do projeto'}
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{next.name}</div>
                      <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{defenseDate}</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 16 }}>
                      <div style={{ fontSize: 32, fontWeight: 400, fontFamily: 'var(--font-heading)', color: urgentColor, lineHeight: 1, letterSpacing: '-1.5px' }}>
                        {next.daysLeft > 0 ? next.daysLeft : next.daysLeft === 0 ? '0' : <Medal size={24} />}
                      </div>
                      {next.daysLeft > 0 && <div style={{ fontSize: 10, color: urgentColor, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>dias</div>}
                    </div>
                  </div>
                  {/* Score progress bar */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ fontSize: 11, color: C.muted }}>Score atual</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: scoreCol }}>{next.score ?? '—'} / 100</span>
                    </div>
                    <div style={{ height: 5, background: C.glassBorder, borderRadius: 999, overflow: 'hidden' }}>
                      <div style={{ width: `${scoreVal}%`, height: '100%', background: `linear-gradient(90deg, ${scoreCol}, ${scoreCol}99)`, borderRadius: 999, transition: 'width 0.6s ease' }} />
                    </div>
                    <div style={{ fontSize: 11, color: C.subtle, marginTop: 5 }}>
                      {next.daysLeft > 7 ? 'Mantém o ritmo — completa mais secções para subir o score.' : next.daysLeft > 0 ? 'Última fase — foca no que falta para chegar ao máximo.' : 'Defesa concluída.'}
                    </div>
                  </div>
                </div>
              </div>
            )
          })()}

          {/* ── Novidades do professor (alunos only) — new grade/feedback/status, mirrors the teacher's "needs attention" list ── */}
          {!isTeacher && profNotifs.length > 0 && (
            <div style={{ marginBottom: 4, animation: 'dash-section-in 0.4s 0.15s ease both' }}>
              <div className="dash-sec-hd">
                <div className="dash-sec-label">
                  <GraduationCap size={13} /> Novidades do professor
                  <span className="dash-sec-count">{profNotifs.length}</span>
                </div>
              </div>
              <div style={{ ...C.glassStyle, background: C.glass, border: `1px solid ${C.glassBorder}`, borderRadius: 12, overflow: 'hidden' }}>
                {profNotifs.map((n, i) => (
                  <div
                    key={n.id}
                    onClick={() => dismissProfNotif(n.id, n.project_slug)}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: i < profNotifs.length - 1 ? `1px solid ${C.glassBorder}` : 'none', cursor: 'pointer', transition: 'background 0.12s' }}
                    onMouseEnter={e => e.currentTarget.style.background = C.glassHover}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <GraduationCap size={14} color="#10b981" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: C.text, lineHeight: 1.4 }}>{n.message}</div>
                      <div style={{ fontSize: 11, color: C.subtle, marginTop: 2 }}>{timeAgoLabel(n.created_at)}</div>
                    </div>
                    <ChevronRight size={14} color={C.subtle} style={{ flexShrink: 0 }} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── 2-column grid (aluno): turma+insights left, projects right ── */}
          {!isTeacher && <div className="dash-turma-projects-grid">

            {/* ── Left column: insights + turma + tasks ── */}
            <div className="dash-turma-col" style={{ paddingTop: 46 }}>
              {/* Resumo toggle — mobile only */}
              <div className="dash-resumo-toggle" onClick={() => setResumoOpen(o => !o)}>
                <TrendingUp size={14} color={C.blue} />
                <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: C.muted }}>Resumo &amp; Potencial</span>
                <ChevronDown size={15} color={C.subtle} style={{ transform: resumoOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }} />
              </div>
              <div className={`dash-resumo-body${resumoOpen ? '' : ' collapsed'}`}>
                <InsightsBlock projects={projects} profile={profile} rankingPos={rankingPos} rankingPct={rankingPct} username={profile?.username} copiedSlug={copiedSlug} setCopiedSlug={setCopiedSlug} navigate={navigate} />
              </div>

              {!loadingStudentTurmas && (
                <div style={{ animation: 'dash-section-in 0.4s 0.15s ease both' }}>
                  {studentTurmas.length > 0 ? (
                    <div
                      onClick={() => studentTurmas.length === 1 ? navigate(`/turma/${studentTurmas[0].code}`) : setShowTurmasModal(true)}
                      style={{ ...C.glassStyle, display: 'flex', alignItems: 'center', gap: 12, background: C.glass, border: `1px solid ${C.glassBorder}`, borderRadius: 12, padding: '14px 16px', cursor: 'pointer', transition: 'background 0.12s' }}
                      onMouseEnter={e => e.currentTarget.style.background = C.glassHover}
                      onMouseLeave={e => e.currentTarget.style.background = C.glass}
                    >
                      <div style={{ width: 36, height: 36, borderRadius: 9, flexShrink: 0, background: 'rgba(27,120,247,0.1)', border: '1px solid rgba(27,120,247,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Users2 size={16} color={C.blue} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {studentTurmas.length === 1 ? studentTurmas[0].name : `${studentTurmas.length} turmas`}
                        </div>
                        <div style={{ fontSize: 12, color: C.muted, marginTop: 1 }}>
                          {studentTurmas.length === 1
                            ? (studentTurmas[0].teacher_name || 'Ver turma')
                            : studentTurmas.map(t => t.name).join(' · ')}
                        </div>
                      </div>
                      <ChevronRight size={14} color={C.subtle} style={{ flexShrink: 0 }} />
                    </div>
                  ) : (
                    <div
                      onClick={() => setShowJoinModal(true)}
                      style={{
                        ...C.glassStyle, background: C.glass, border: `1px solid ${C.blue}20`,
                        borderRadius: 10, padding: '12px 16px',
                        cursor: 'pointer', transition: 'border-color 0.15s, background 0.15s',
                        display: 'flex', alignItems: 'center', gap: 12,
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = C.blue + '55'; e.currentTarget.style.background = C.glassHover }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = C.blue + '20'; e.currentTarget.style.background = C.glass }}
                    >
                      <div style={{ width: 36, height: 36, borderRadius: 9, flexShrink: 0, background: 'rgba(27,120,247,0.1)', border: '1px solid rgba(27,120,247,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Users2 size={16} color={C.blue} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Junta-te a uma turma</div>
                        <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>Insere o código de 6 letras do professor</div>
                      </div>
                      <div style={{
                        background: `${C.blue}15`, border: `1px solid ${C.blue}30`,
                        borderRadius: 7, padding: '5px 12px',
                        color: C.blue, fontSize: 12, fontWeight: 700, flexShrink: 0,
                        display: 'flex', alignItems: 'center', gap: 4,
                      }}>
                        Entrar <ArrowRight size={12} />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {pendingTasks.length > 0 && (
                <div style={{ animation: 'dash-section-in 0.4s 0.2s ease both' }}>
                  <div className="dash-sec-hd">
                    <div className="dash-sec-label">
                      <ListChecks size={13} /> Tarefas pendentes
                      <span className="dash-sec-count">{pendingTasks.length}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {pendingTasks.slice(0, 5).map(t => {
                      const overdue = t.due_date && new Date(t.due_date + 'T23:59:59') < new Date()
                      return (
                        <div key={t.id} style={{ ...C.glassStyle, background: C.glass, border: `1px solid ${overdue ? 'rgba(239,68,68,0.3)' : C.glassBorder}`, borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                          <button onClick={(e) => { e.stopPropagation(); completePendingTask(t.id) }} style={{ background: 'none', border: 'none', padding: 2, cursor: 'pointer', flexShrink: 0, display: 'flex' }}>
                            <Circle size={17} color={C.subtle} />
                          </button>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</div>
                            <div style={{ fontSize: 11, color: C.subtle, marginTop: 1 }}>
                              {t.classes?.name}
                              {t.due_date && (
                                <span style={{ color: overdue ? '#ef4444' : C.subtle, fontWeight: overdue ? 700 : 400 }}>
                                  {' — '}{new Date(t.due_date + 'T00:00:00').toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' })}{overdue ? ' (atrasada)' : ''}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* ── Right column: projects + collab ── */}
            <div className="dash-projects-col">
              <div id="proj-list">
            <div className="dash-sec-hd">
              <div className="dash-sec-label">
                <Folder size={13} /> Os meus projetos
                {!loadingProjects && projects.length > 0 && <span className="dash-sec-count">{projects.length}</span>}
              </div>
              {!loadingProjects && projects.length > 0 && (
                <button
                  className="dash-action-btn"
                  onClick={() => setShowCreateModal(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, background: `${C.blue}18`, border: `1px solid ${C.blue}30`, color: C.blue }}
                  onMouseEnter={e => { e.currentTarget.style.background = `${C.blue}28`; e.currentTarget.style.borderColor = `${C.blue}55` }}
                  onMouseLeave={e => { e.currentTarget.style.background = `${C.blue}18`; e.currentTarget.style.borderColor = `${C.blue}30` }}
                >
                  <Plus size={13} /> Novo projeto
                </button>
              )}
            </div>

            {loadingProjects ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[1,2,3].map(i => <div key={i} className="dash-skeleton" style={{ height: 72, opacity: 1 - i * 0.15 }} />)}
              </div>
            ) : projects.length === 0 ? (
              <div style={{ ...C.glassStyle, background: C.glass, border: `1px dashed ${C.glassBorder}`, borderRadius: 12, padding: '52px 28px', textAlign: 'center' }}>
                <div style={{ marginBottom: 18, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 60, height: 60, borderRadius: 14, background: `${C.blue}18`, border: `1px solid ${C.blue}25` }}>
                  <Rocket size={28} color={C.blue} />
                </div>
                <p style={{ color: C.text, fontSize: 17, fontWeight: 700, margin: '0 0 8px' }}>O teu portfólio começa aqui</p>
                <p style={{ color: C.muted, fontSize: 13, margin: '0 0 28px', lineHeight: 1.7, maxWidth: 300, marginLeft: 'auto', marginRight: 'auto' }}>
                  Cria o teu primeiro projeto e partilha o que estás a construir com o mundo.
                </p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  style={{ background: `#1b78f7`, border: 'none', borderRadius: 8, padding: '13px 32px', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 2px 8px rgba(27,120,247,0.2)' }}
                >
                  Criar projeto
                </button>

                <div style={{ display: 'flex', justifyContent: 'center', gap: 28, flexWrap: 'wrap', marginTop: 36, paddingTop: 28, borderTop: `1px solid ${C.glassBorder}`, maxWidth: 560, marginLeft: 'auto', marginRight: 'auto' }}>
                  {[
                    { Icon: Sparkles, title: 'IA analisa o teu projeto', desc: 'Recebes feedback e um score sobre o que falta melhorar.' },
                    { Icon: Globe, title: 'Página pública partilhável', desc: 'Um link profissional para mostrares a recrutadores ou colegas.' },
                    { Icon: Trophy, title: 'Entras no ranking', desc: 'Compara o teu progresso com outros alunos da comunidade.' },
                  ].map(b => (
                    <div key={b.title} style={{ flex: '1 1 150px', maxWidth: 170, textAlign: 'center' }}>
                      <b.Icon size={18} color={C.subtle} style={{ marginBottom: 8 }} />
                      <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 4 }}>{b.title}</div>
                      <div style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.5 }}>{b.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {projects.map((project, idx) => (
                  <div key={project.id} style={{ animation: `dash-item-in 0.3s cubic-bezier(0.16,1,0.3,1) ${idx * 0.06}s both` }}>
                    <ProjectRow project={project} onView={() => navigate(`/projeto/${project.slug}`)} onEdit={() => navigate(`/editar/${project.slug}`)} onDelete={deleteProject} onCopy={() => copyProjectLink(project.slug)} copied={copiedSlug === project.slug} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Partilhados comigo ── */}
          {collabProjects.length > 0 && (
            <div>
              <div className="dash-sec-hd">
                <div className="dash-sec-label">
                  <Users size={13} /> Partilhados comigo
                  <span className="dash-sec-count">{collabProjects.length}</span>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {collabProjects.map((p, idx) => (
                  <div key={p.id} style={{ animation: `dash-item-in 0.3s cubic-bezier(0.16,1,0.3,1) ${idx * 0.06}s both` }}>
                    <ProjectRow project={p} onView={() => navigate(`/projeto/${p.slug}`)} onEdit={() => navigate(`/projeto/${p.slug}`)} onDelete={() => {}} onCopy={() => copyProjectLink(p.slug)} copied={copiedSlug === p.slug} />
                  </div>
                ))}
              </div>
            </div>
          )}
            </div>{/* end dash-projects-col */}
          </div>}{/* end dash-turma-projects-grid */}

          {/* ── Recrutadores com interesse (alunos — só mostra quando há dados) ── */}
          {!isTeacher && !isRecruiter && myInterests.length > 0 && (
            <div style={{ marginTop: 32 }}>
              <div className="dash-sec-hd">
                <span className="dash-sec-label">
                  <Star size={14} color="#f59e0b" />
                  Recrutadores com interesse
                  {myInterests.length > 0 && (
                    <span className="dash-sec-count">{myInterests.length}</span>
                  )}
                </span>
              </div>

              {myInterestsLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[1, 2].map(i => <div key={i} className="dash-skeleton" style={{ height: 72, opacity: 1 - i * 0.2 }} />)}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {myInterests.map((item, idx) => {
                    const rec = item.recruiterProfile
                    const displayName = rec.full_name || rec.username || 'Recrutador'
                    return (
                      <div key={idx} style={{
                        ...C.glassStyle,
                        background: C.glass, border: `1px solid ${C.glassBorder}`,
                        borderRadius: 14, padding: '14px 18px',
                        display: 'flex', alignItems: 'center', gap: 14,
                      }}>
                        {/* Avatar */}
                        <div style={{
                          width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                          background: 'linear-gradient(135deg, rgba(245,158,11,0.2), rgba(251,191,36,0.1))',
                          border: '1.5px solid rgba(245,158,11,0.3)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          overflow: 'hidden',
                        }}>
                          {rec.avatar_url
                            ? <img src={rec.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <Building2 size={17} color="#f59e0b" />
                          }
                        </div>
                        {/* Info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {displayName}
                          </div>
                          <div style={{ fontSize: 12, color: C.muted, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {rec.company
                              ? <><span style={{ color: '#f59e0b' }}>{rec.company}</span> · </>
                              : null
                            }
                            interessa-se por{' '}
                            <span
                              style={{ color: C.blue, cursor: 'pointer' }}
                              onClick={() => navigate(`/projeto/${item.project.slug}`)}
                            >
                              {item.project.name}
                            </span>
                          </div>
                        </div>
                        {/* Actions */}
                        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                          {rec.username && (
                            <button
                              onClick={() => navigate(`/u/${rec.username}`)}
                              style={{ background: 'none', border: `1px solid ${C.glassBorder}`, borderRadius: 8, padding: '5px 10px', fontSize: 12, color: C.muted, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}
                            >
                              Perfil
                            </button>
                          )}
                          <button
                            onClick={() => navigate(`/mensagens?to=${rec.id}`)}
                            style={{
                              background: `${C.blue}15`, border: `1px solid ${C.blue}30`,
                              borderRadius: 8, padding: '5px 10px', fontSize: 12, color: C.blue,
                              cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700,
                              display: 'flex', alignItems: 'center', gap: 4,
                            }}
                          >
                            <MessageSquare size={12} /> Mensagem
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Alunos recomendados por professores (empresas parceiras) ── */}
          {profile?.role === 'empresa' && !partnerLeadsLoading && partnerLeads.length > 0 && (
            <div style={{ marginTop: 32 }}>
              <div className="dash-sec-hd">
                <span className="dash-sec-label">
                  <Building2 size={14} color={C.blue} />
                  Alunos recomendados por professores
                  <span className="dash-sec-count">{partnerLeads.length}</span>
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {partnerLeads.map(l => {
                  const meta = PARTNER_LEAD_STATUS[l.status] || PARTNER_LEAD_STATUS.interessado
                  return (
                    <div key={l.id} style={{ ...C.glassStyle, background: C.glass, border: `1px solid ${C.glassBorder}`, borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          onClick={() => l.student?.username && navigate(`/u/${l.student.username}`)}
                          style={{ fontSize: 14, fontWeight: 700, color: C.text, cursor: l.student?.username ? 'pointer' : 'default', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        >
                          {l.student?.full_name || l.student?.username || 'Aluno'}
                        </div>
                        <div style={{ fontSize: 11, color: C.subtle, marginTop: 2 }}>via {l.companyName}</div>
                      </div>
                      <select
                        value={l.status}
                        onChange={e => updatePartnerLeadStatus(l.id, e.target.value)}
                        style={{ background: `${meta.color}18`, border: `1px solid ${meta.color}40`, borderRadius: 6, padding: '4px 8px', color: meta.color, fontSize: 11, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', outline: 'none', flexShrink: 0 }}
                      >
                        {Object.entries(PARTNER_LEAD_STATUS).map(([k, v]) => <option key={k} value={k} style={{ background: C.card, color: C.text }}>{v.label}</option>)}
                      </select>
                      {l.student?.username && (
                        <button onClick={() => navigate(`/u/${l.student.username}`)} className="icon-btn-ghost" title="Ver portefólio"><ChevronRight size={15} /></button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── Talentos guardados (recrutadores) ── */}
          {isRecruiter && (
            <div style={{ marginTop: 32 }}>
              <div className="dash-sec-hd">
                <span className="dash-sec-label">
                  <Star size={14} color="#f59e0b" />
                  Talentos guardados
                  {savedTalents.length > 0 && (
                    <span className="dash-sec-count">{savedTalents.length}</span>
                  )}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button
                    onClick={() => setSavedTalentsKey(k => k + 1)}
                    title="Atualizar lista"
                    style={{ background: 'none', border: 'none', color: C.muted, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4, padding: '2px 6px', borderRadius: 6 }}
                    onMouseEnter={e => e.currentTarget.style.color = C.text}
                    onMouseLeave={e => e.currentTarget.style.color = C.muted}
                  >
                    ↻
                  </button>
                  <button
                    onClick={() => navigate('/explorar')}
                    style={{ background: 'none', border: 'none', color: C.blue, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4 }}
                  >
                    Explorar <ChevronRight size={13} />
                  </button>
                </div>
              </div>

              {savedTalentsLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[1,2,3].map(i => <div key={i} className="dash-skeleton" style={{ height: 72, opacity: 1 - i * 0.15 }} />)}
                </div>
              ) : savedTalents.length === 0 ? (
                <div style={{
                  ...C.glassStyle,
                  background: C.glass, border: `1px solid ${C.glassBorder}`,
                  borderRadius: 14, padding: '24px 20px', textAlign: 'center',
                }}>
                  <Star size={28} color="var(--c-subtle)" style={{ marginBottom: 10 }} />
                  <p style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 600, color: C.text }}>
                    Ainda sem talentos guardados
                  </p>
                  <p style={{ margin: '0 0 14px', fontSize: 13, color: C.muted }}>
                    Abre um projeto e clica em "Tenho interesse" para guardar.
                  </p>
                  <button
                    onClick={() => navigate('/explorar')}
                    style={{ background: `#1b78f7`, border: 'none', borderRadius: 9, padding: '9px 20px', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    Explorar projetos
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {savedTalents.map(p => {
                    const ownerName = p.ownerProfile?.full_name || p.creator_name || 'Sem nome'
                    const ownerUsername = p.ownerProfile?.username
                    const scoreColor = getScoreColor(p.score)
                    return (
                      <div
                        key={p.id}
                        style={{ ...C.glassStyle, background: C.glass, border: `1px solid ${C.glassBorder}`, borderRadius: 14, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', transition: 'all 0.15s' }}
                        onClick={() => navigate(`/projeto/${p.slug}`)}
                        onMouseEnter={e => { e.currentTarget.style.background = C.glassHover; e.currentTarget.style.borderColor = C.glassBorderBright }}
                        onMouseLeave={e => { e.currentTarget.style.background = C.glass; e.currentTarget.style.borderColor = C.glassBorder }}
                      >
                        {/* Score ring */}
                        <svg width="38" height="38" viewBox="0 0 38 38" style={{ flexShrink: 0 }}>
                          <circle cx={19} cy={19} r={15} fill="none" stroke={C.glassBorder} strokeWidth={3} />
                          <circle cx={19} cy={19} r={15} fill="none" stroke={scoreColor} strokeWidth={3}
                            strokeDasharray={`${((p.score ?? 0) / 100) * 2 * Math.PI * 15} ${2 * Math.PI * 15}`}
                            strokeLinecap="round" strokeDashoffset={2 * Math.PI * 15 * 0.25}
                            style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
                          />
                          <text x="19" y="23" textAnchor="middle" fontSize="9" fontWeight="800" fill={scoreColor}>{p.score ?? '—'}</text>
                        </svg>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {p.name}
                          </div>
                          <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
                            {ownerName}{p.area ? ` · ${p.area}` : ''}{p.course ? ` · ${p.course}` : ''}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexWrap: 'wrap' }}>
                          {ownerUsername && (
                            <button
                              onClick={e => { e.stopPropagation(); navigate(`/u/${ownerUsername}`) }}
                              style={{ background: 'none', border: `1px solid ${C.glassBorder}`, borderRadius: 8, padding: '5px 10px', fontSize: 12, color: C.muted, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}
                            >
                              Perfil
                            </button>
                          )}
                          <button
                            onClick={e => { e.stopPropagation(); navigate(`/mensagens?to=${p.user_id}`) }}
                            style={{ background: `${C.blue}15`, border: `1px solid ${C.blue}30`, borderRadius: 8, padding: '5px 10px', fontSize: 12, color: C.blue, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}
                          >
                            <MessageSquare size={12} /> Mensagem
                          </button>
                          <button
                            onClick={e => {
                              e.stopPropagation()
                              setInviteTarget({ studentId: p.user_id, studentName: ownerName })
                            }}
                            style={{
                              background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)',
                              borderRadius: 8, padding: '5px 10px', fontSize: 12, color: '#f59e0b',
                              cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700,
                              display: 'flex', alignItems: 'center', gap: 4,
                            }}
                          >
                            <Send size={12} /> Convidar
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

        </div>{/* end sections */}
      </div>
      {showCreateModal && <CreateProjectModal onClose={() => setShowCreateModal(false)} />}
      {inviteTarget && (
        <ConvidarVagaModal
          studentId={inviteTarget.studentId}
          studentName={inviteTarget.studentName}
          vagas={recruiterVagas}
          onClose={() => setInviteTarget(null)}
        />
      )}
    </div>
  )
}
