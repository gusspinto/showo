import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Pencil, ExternalLink } from 'lucide-react'
import SkillsPicker from '../components/SkillsPicker'
import { Navbar } from '../components/Navbar'
import CreateProjectModal from '../components/CreateProjectModal'
import { Folder, Trophy, BarChart2, Rocket, Eye, GraduationCap, Plus, X, Users, Users2, ChevronRight, User, Settings, Compass, Medal, LogOut, Globe, TrendingUp, MessageSquare, Star, Mail, Search, BookOpen, Trash2, Check, Calendar, ArrowRight, Target, Zap, Sparkles, Briefcase, Building2, Send, Copy, Share2, Link, Swords } from 'lucide-react'
import { MISSIONS, checkMissionProgress } from './Missoes'
import ConvidarVagaModal from '../components/ConvidarVagaModal'

const C = {
  bg: 'var(--c-bg)',
  card: 'var(--c-card)',
  cardHover: 'var(--c-card-hover)',
  border: 'var(--c-border)',
  borderBright: 'var(--c-border-bright)',
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
        background: hov && onClick ? C.cardHover : C.card,
        border: `1px solid ${hov && onClick ? C.borderBright : C.border}`,
        borderRadius: 16,
        padding: '18px 20px',
        display: 'flex', flexDirection: 'column', gap: 10,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'background 0.15s, border-color 0.15s, box-shadow 0.15s',
        boxShadow: hov && onClick ? `0 0 0 1px ${accent}22, 0 4px 20px rgba(0,0,0,0.3)` : '0 2px 12px rgba(0,0,0,0.2)',
        position: 'relative', overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 9, flexShrink: 0,
          background: 'var(--c-bg-alt)', border: '1px solid var(--c-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: accent,
        }}>
          {icon}
        </div>
        <span style={{ color: C.muted, fontSize: 12, fontWeight: 500 }}>{label}</span>
      </div>
      <span style={{ color: accent, fontSize: 30, fontWeight: 900, letterSpacing: '-1.5px', lineHeight: 1, marginTop: 4 }}>
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
        boxShadow: primary ? '0 2px 12px rgba(27,120,247,0.25)' : 'none',
        whiteSpace: 'nowrap',
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
    day: 'numeric', month: 'short',
  })
  const scoreColor = getScoreColor(project.score)
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={(e) => { if (window.innerWidth <= 600 && !e.target.closest('button')) onView() }}
      style={{
        background: hovered ? C.cardHover : C.card,
        border: `1px solid ${hovered ? C.borderBright : C.border}`,
        borderRadius: 14, padding: '14px 18px',
        display: 'flex', alignItems: 'center', gap: 14,
        transition: 'background 0.15s, border-color 0.15s, box-shadow 0.15s',
        cursor: 'default',
        boxShadow: hovered ? '0 2px 12px rgba(0,0,0,0.12)' : 'none',
      }}
      className="dash-project-row"
    >
      {/* Score ring — SVG stroke (matches Explore style) */}
      <div onClick={onView} style={{ position: 'relative', width: 42, height: 42, flexShrink: 0, cursor: 'pointer', filter: `drop-shadow(0 0 5px ${scoreColor}80)` }}>
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
            <span style={{ color: C.subtle, fontSize: 11, background: 'var(--c-bg-alt)', border: `1px solid ${C.border}`, borderRadius: 5, padding: '1px 7px', flexShrink: 0 }}>
              {project.area}
            </span>
          )}
        </div>
        {project.ai_tagline ? (
          <p style={{ color: C.muted, fontSize: 12, margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.4 }}>
            {project.ai_tagline}
          </p>
        ) : null}
        <span style={{ color: C.subtle, fontSize: 11 }}>{date}</span>
      </div>

      {/* Actions — desktop icon buttons */}
      <div className="dash-project-actions">
        {confirmDelete ? (
          <>
            <span style={{ fontSize: 12, color: C.muted, alignSelf: 'center', whiteSpace: 'nowrap' }}>Apagar?</span>
            <button
              onClick={() => { onDelete(project.id); setConfirmDelete(false) }}
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '7px 13px', color: '#ef4444', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
            >Sim</button>
            <button
              onClick={() => setConfirmDelete(false)}
              style={{ background: 'rgba(27,120,247,0.1)', border: '1px solid rgba(27,120,247,0.3)', borderRadius: 8, padding: '7px 13px', color: C.blue, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
            >Não</button>
          </>
        ) : (
          <>
            <button
              onClick={() => setConfirmDelete(true)}
              title="Apagar"
              style={{ width: 34, height: 34, borderRadius: 9, background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#ef4444', flexShrink: 0 }}
            ><Trash2 size={14} /></button>
            <button
              onClick={onEdit}
              title="Editar"
              style={{ width: 34, height: 34, borderRadius: 9, background: 'var(--c-card-hover)', border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: C.muted, flexShrink: 0 }}
            ><Pencil size={14} /></button>
            <button
              onClick={onView}
              title="Ver projeto"
              style={{ width: 34, height: 34, borderRadius: 9, background: 'rgba(27,120,247,0.1)', border: '1px solid rgba(27,120,247,0.28)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: C.blue, flexShrink: 0 }}
            ><ExternalLink size={14} /></button>
          </>
        )}
      </div>

      {/* Actions — mobile icon buttons */}
      <div className="dash-proj-actions-mobile">
        {confirmDelete ? (
          <>
            <span style={{ fontSize: 11, color: C.muted, whiteSpace: 'nowrap' }}>Apagar?</span>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(project.id); setConfirmDelete(false) }}
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '7px 12px', color: '#ef4444', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
            >Sim</button>
            <button
              onClick={(e) => { e.stopPropagation(); setConfirmDelete(false) }}
              style={{ background: 'rgba(27,120,247,0.1)', border: '1px solid rgba(27,120,247,0.3)', borderRadius: 8, padding: '7px 12px', color: C.blue, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
            >Não</button>
          </>
        ) : (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); setConfirmDelete(true) }}
              title="Apagar"
              style={{ width: 36, height: 36, borderRadius: 9, background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#ef4444' }}
            ><Trash2 size={14} /></button>
            <button
              onClick={(e) => { e.stopPropagation(); onEdit() }}
              title="Editar"
              style={{ width: 36, height: 36, borderRadius: 9, background: 'var(--c-card-hover)', border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: C.muted }}
            ><Pencil size={14} /></button>
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
                fontSize: 12, padding: '6px 14px', borderRadius: 20,
                border: `1px solid ${sel ? C.blue : C.border}`,
                background: sel ? `${C.blue}20` : 'transparent',
                color: sel ? C.blue : C.muted,
                cursor: 'pointer', fontFamily: 'inherit',
                fontWeight: sel ? 700 : 500,
                transition: 'all 0.12s',
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
            borderRadius: 12, padding: '13px 16px', color: C.text,
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
            background: desc.trim() ? `linear-gradient(135deg, ${C.blue}, #4f46e5)` : C.border,
            border: 'none', borderRadius: 12,
            width: 46, height: 46,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: desc.trim() ? 'pointer' : 'not-allowed', flexShrink: 0,
            boxShadow: desc.trim() ? '0 4px 20px rgba(27,120,247,0.4)' : 'none',
            transition: 'all 0.15s',
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
          {error && <p style={{ color: '#ef4444', fontSize: 13, margin: 0 }}>{error}</p>}
          <button type="submit" disabled={saving || !name.trim()} style={{ background: 'linear-gradient(135deg,#1b78f7,#4f46e5)', border: 'none', borderRadius: 8, padding: '11px', color: '#fff', fontSize: 14, fontWeight: 600, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.7 : 1, fontFamily: 'inherit', marginTop: 4 }}>
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

  async function handleJoin(e) {
    e.preventDefault()
    const trimmed = code.trim().toUpperCase()
    if (!trimmed) return
    setChecking(true); setError('')
    try {
      const { data, error: sbErr } = await supabase.from('classes').select('id, name, code, teacher_name').eq('code', trimmed).single()
      if (sbErr || !data) { setError('Código inválido. Verifica com o professor.'); return }
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
      <div style={{ background: C.card, border: `1px solid ${C.borderBright}`, borderRadius: 22, padding: '36px 32px', width: '100%', maxWidth: 400, boxShadow: '0 32px 80px rgba(0,0,0,0.7)' }}>
        {joined ? (
          <>
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <div style={{ width: 60, height: 60, borderRadius: 18, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
                <Check size={30} color="#22c55e" />
              </div>
              <h3 style={{ color: C.text, margin: '0 0 6px', fontSize: 20, fontWeight: 800, letterSpacing: '-0.3px' }}>Turma encontrada!</h3>
              <p style={{ color: C.muted, margin: 0, fontSize: 14, lineHeight: 1.5 }}>{joined.name}</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                onClick={() => { navigate(`/turma/${joined.code}`); onClose() }}
                style={{ width: '100%', background: `linear-gradient(135deg, ${C.blue}, #4f46e5)`, border: 'none', borderRadius: 12, padding: '14px', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 20px rgba(27,120,247,0.35)' }}
              >
                <span style={{display:'flex',alignItems:'center',gap:6,justifyContent:'center'}}>Ir para a turma <ArrowRight size={15} /></span>
              </button>
              <button
                onClick={onClose}
                style={{ width: '100%', background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 12, padding: '12px', color: C.muted, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Fechar
              </button>
            </div>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
              <div>
                <h3 style={{ color: C.text, margin: '0 0 4px', fontSize: 20, fontWeight: 800, letterSpacing: '-0.3px' }}>Entrar numa turma</h3>
                <p style={{ color: C.muted, margin: 0, fontSize: 13 }}>Pede o código de 6 letras ao teu professor</p>
              </div>
              <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, padding: 4, display: 'flex', marginTop: 2 }}><X size={18} /></button>
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
                  borderRadius: 14, padding: '18px',
                  color: C.text, fontSize: 28, fontWeight: 900, outline: 'none',
                  letterSpacing: 10, textAlign: 'center', fontFamily: 'inherit',
                  boxSizing: 'border-box', transition: 'border-color 0.15s',
                  boxShadow: code.length === 6 && !error ? '0 0 0 4px rgba(27,120,247,0.1)' : 'none',
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
                  background: code.trim() ? `linear-gradient(135deg, ${C.blue}, #4f46e5)` : C.border,
                  border: 'none', borderRadius: 12, padding: '15px',
                  color: '#fff', fontSize: 15, fontWeight: 700,
                  cursor: code.trim() ? 'pointer' : 'not-allowed',
                  fontFamily: 'inherit', opacity: checking ? 0.7 : 1,
                  transition: 'all 0.15s',
                  boxShadow: code.trim() ? '0 4px 20px rgba(27,120,247,0.35)' : 'none',
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
      <div style={{ background: C.card, border: `1px solid ${C.borderBright}`, borderRadius: 22, padding: '28px 24px', width: '100%', maxWidth: 420, boxShadow: '0 32px 80px rgba(0,0,0,0.7)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
          <div>
            <h3 style={{ color: C.text, margin: '0 0 2px', fontSize: 18, fontWeight: 800 }}>As minhas turmas</h3>
            <p style={{ color: C.muted, margin: 0, fontSize: 13 }}>{turmas.length} turma{turmas.length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, padding: 4, display: 'flex' }}><X size={18} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          {turmas.map(t => (
            <div
              key={t.id}
              onClick={() => { navigate(`/turma/${t.code}`); onClose() }}
              style={{ background: 'var(--c-bg-alt)', border: `1px solid ${C.border}`, borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.background = C.cardHover; e.currentTarget.style.borderColor = C.borderBright }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--c-bg-alt)'; e.currentTarget.style.borderColor = C.border }}
            >
              <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(27,120,247,0.1)', border: '1px solid rgba(27,120,247,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
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
          style={{ width: '100%', background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 12, padding: '12px', color: C.muted, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'all 0.15s' }}
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
      style={{ background: hov ? C.cardHover : C.card, border: `1px solid ${hov ? C.borderBright : C.border}`, borderRadius: 12, padding: '16px 18px', cursor: 'pointer', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 14 }}
    >
      <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(27,120,247,0.1)', border: '1px solid rgba(27,120,247,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Users2 size={18} color="#1b78f7" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: C.text, fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{turma.name}</div>
        {turma.subject && <div style={{ color: C.muted, fontSize: 12, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{turma.subject}</div>}
        <div style={{ color: C.subtle, fontSize: 11, marginTop: 4, display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ color: C.blue, fontWeight: 700, letterSpacing: 1 }}>{turma.code}</span>
          {turma.project_count != null && <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Users size={10} />{turma.project_count} projeto{turma.project_count !== 1 ? 's' : ''}</span>}
          {turma.avg_score != null && <span style={{ color: turma.avg_score >= 90 ? C.green : turma.avg_score >= 71 ? C.blue : turma.avg_score >= 40 ? C.yellow : C.red, fontWeight: 700 }}>⌀ {turma.avg_score}</span>}
        </div>
      </div>
      <ChevronRight size={16} color={C.subtle} />
    </div>
  )
}

function InsightsBlock({ projects }) {
  const withScore = projects.filter(p => p.score != null)
  if (!withScore.length) return null
  const best = Math.max(...withScore.map(p => p.score))
  const bestProj = withScore.find(p => p.score === best)
  const avg = Math.round(withScore.reduce((s, p) => s + p.score, 0) / withScore.length)
  const totalViews = projects.reduce((s, p) => s + (p.views ?? 0), 0)
  const sorted = [...withScore].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
  const trend = sorted.length > 1 ? sorted[sorted.length - 1].score - sorted[0].score : null

  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: '18px 22px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
        <TrendingUp size={13} color={C.muted} />
        <span style={{ fontSize: 12, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Resumo</span>
      </div>

      {/* 3 big numbers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0, marginBottom: 20 }}>
        <div style={{ textAlign: 'center', padding: '0 8px' }}>
          <div style={{ fontSize: 38, fontWeight: 900, color: getScoreColor(best), letterSpacing: '-2px', lineHeight: 1 }}>{best}</div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>Melhor score</div>
          <div style={{ fontSize: 10, color: C.subtle, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bestProj?.name}</div>
        </div>
        <div style={{ textAlign: 'center', padding: '0 8px', borderLeft: `1px solid ${C.border}`, borderRight: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 38, fontWeight: 900, color: getScoreColor(avg), letterSpacing: '-2px', lineHeight: 1 }}>{avg}</div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>Score médio</div>
          <div style={{ fontSize: 10, color: C.subtle, marginTop: 1 }}>{withScore.length} projeto{withScore.length !== 1 ? 's' : ''}</div>
        </div>
        <div style={{ textAlign: 'center', padding: '0 8px' }}>
          {totalViews > 0 ? (
            <>
              <div style={{ fontSize: 38, fontWeight: 900, color: C.blue, letterSpacing: '-2px', lineHeight: 1 }}>{totalViews}</div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>Visualizações</div>
              <div style={{ fontSize: 10, color: C.subtle, marginTop: 1 }}>total</div>
            </>
          ) : trend != null ? (
            <>
              <div style={{ fontSize: 38, fontWeight: 900, color: trend >= 0 ? C.green : C.red, letterSpacing: '-2px', lineHeight: 1 }}>{trend >= 0 ? '+' : ''}{trend}</div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>Evolução</div>
              <div style={{ fontSize: 10, color: C.subtle, marginTop: 1 }}>1º → último</div>
            </>
          ) : <div style={{ fontSize: 11, color: C.subtle, paddingTop: 12 }}>—</div>}
        </div>
      </div>

      {/* Progress bars per project */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9, paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
        {withScore.slice(0, 4).map(p => (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 11, color: C.muted, width: 100, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
            <div style={{ flex: 1, height: 5, background: C.border, borderRadius: 999, overflow: 'hidden' }}>
              <div style={{ width: `${p.score}%`, height: '100%', background: getScoreColor(p.score), borderRadius: 999 }} />
            </div>
            <span style={{ fontSize: 11, fontWeight: 800, color: getScoreColor(p.score), width: 22, textAlign: 'right', flexShrink: 0 }}>{p.score}</span>
          </div>
        ))}
      </div>
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
function OnboardingAlunoModal({ user, profile, onDismiss, firstProject }) {
  const navigate = useNavigate()
  const [step, setStep] = useState(0) // 0=perfil 1=projeto 2=partilhar
  const [username, setUsername] = useState(profile?.username ?? '')
  const [bio, setBio] = useState(profile?.bio ?? '')
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
        background: C.card, border: '1px solid #2a4275',
        borderRadius: 22, width: '100%', maxWidth: 460,
        boxShadow: '0 28px 80px rgba(0,0,0,0.75)',
        animation: 'onbFadeUp 0.25s ease',
        maxHeight: '90vh', overflowY: 'auto',
      }}>
        <style>{`@keyframes onbFadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}`}</style>

        {/* ── Step 0: Perfil ── */}
        {step === 0 && (
          <div style={{ padding: '36px 30px 28px' }}>
            <div style={{ textAlign: 'center', marginBottom: 26 }}>
              <div style={{ width: 54, height: 54, borderRadius: '50%', background: 'rgba(27,120,247,0.12)', border: '1px solid rgba(27,120,247,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                <User size={24} color={C.blue} />
              </div>
              <h2 style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 800, color: C.text, letterSpacing: '-0.3px' }}>Completa o teu perfil</h2>
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
                    style={{ width: '100%', background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: 10, color: C.text, fontSize: 14, padding: '11px 14px 11px 30px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
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
                  style={{ width: '100%', background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: 10, color: C.text, fontSize: 14, padding: '11px 14px', outline: 'none', fontFamily: 'inherit', resize: 'none', lineHeight: 1.6, boxSizing: 'border-box' }}
                />
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
              style={{ width: '100%', background: 'linear-gradient(135deg,#1b78f7,#4f46e5)', border: 'none', borderRadius: 11, padding: '13px', color: '#fff', fontSize: 15, fontWeight: 700, cursor: saving ? 'default' : 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 20px rgba(27,120,247,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, opacity: saving ? 0.7 : 1 }}
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
            <h2 style={{ margin: '0 0 10px', fontSize: 20, fontWeight: 800, color: C.text, letterSpacing: '-0.3px' }}>Cria o teu primeiro projecto</h2>
            <p style={{ margin: '0 auto 24px', fontSize: 14, color: C.muted, lineHeight: 1.6, maxWidth: 340 }}>
              Responde a algumas perguntas sobre o teu trabalho — a IA transforma as tuas respostas numa página profissional pronta a partilhar.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, background: 'var(--c-bg-alt)', border: `1px solid ${C.border}`, borderRadius: 14, padding: '16px 18px', textAlign: 'left', marginBottom: 8 }}>
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
                style={{ background: 'linear-gradient(135deg,#1b78f7,#4f46e5)', border: 'none', borderRadius: 11, padding: '13px', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 20px rgba(27,120,247,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}
              >
                <span>Criar projecto</span><ArrowRight size={15} />
              </button>
              <button
                onClick={() => setStep(2)}
                style={{ background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 11, padding: '12px', color: C.muted, fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}
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
            <h2 style={{ margin: '0 0 10px', fontSize: 20, fontWeight: 800, color: C.text, letterSpacing: '-0.3px' }}>Partilha a tua página</h2>
            <p style={{ margin: '0 auto 24px', fontSize: 14, color: C.muted, lineHeight: 1.6, maxWidth: 340 }}>
              A tua página de perfil está pronta. Envia-a a recrutadores, professores ou amigos.
            </p>
            {/* URL box */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--c-bg-alt)', border: `1.5px solid ${C.border}`, borderRadius: 12, padding: '10px 14px', marginBottom: 20, textAlign: 'left' }}>
              <Link size={14} color={C.muted} style={{ flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 13, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profileUrl}</span>
              <button
                onClick={copyUrl}
                style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5, background: copied ? 'rgba(34,197,94,0.12)' : 'rgba(27,120,247,0.1)', border: `1px solid ${copied ? 'rgba(34,197,94,0.3)' : 'rgba(27,120,247,0.3)'}`, borderRadius: 8, padding: '5px 12px', fontSize: 12, fontWeight: 600, color: copied ? C.green : C.blue, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s', whiteSpace: 'nowrap' }}
              >
                {copied ? <><Check size={12} /> Copiado!</> : <><Copy size={12} /> Copiar</>}
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                onClick={() => { onDismiss(); navigate(`/u/${resolvedUsername}`) }}
                style={{ background: 'linear-gradient(135deg,#1b78f7,#4f46e5)', border: 'none', borderRadius: 11, padding: '13px', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 20px rgba(27,120,247,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}
              >
                <span>Ver a minha página</span><ArrowRight size={15} />
              </button>
              <button onClick={onDismiss} style={{ background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 11, padding: '12px', color: C.muted, fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
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
        background: C.card, border: '1px solid #2a4275',
        borderRadius: 20, padding: '36px 32px', width: '100%', maxWidth: 440,
        boxShadow: '0 24px 64px rgba(0,0,0,0.7)',
        fontFamily: 'inherit',
      }}>
        {step === 0 ? (
          <>
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <img src="/icon.png" alt="Showo" style={{ width: 60, height: 60, objectFit: 'contain', marginBottom: 14, display: 'block', margin: '0 auto 14px' }} />
              <h2 style={{ color: 'var(--c-text)', fontSize: 22, fontWeight: 800, margin: '0 0 8px', letterSpacing: '-0.3px' }}>
                {cfg.title}
              </h2>
              <p style={{ color: 'var(--c-muted)', fontSize: 15, margin: 0, lineHeight: 1.5 }}>{cfg.subtitle}</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
              {cfg.steps.map((s, i) => (
                <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', background: 'var(--c-bg-alt)', border: '1px solid var(--c-border)', borderRadius: 12, padding: '14px 16px' }}>
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
                style={{ flex: 1, background: 'linear-gradient(135deg,#1b78f7,#4f46e5)', border: 'none', borderRadius: 10, padding: '13px', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 20px rgba(27,120,247,0.35)' }}
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
              <h2 style={{ color: 'var(--c-text)', fontSize: 20, fontWeight: 800, margin: '0 0 8px', letterSpacing: '-0.3px' }}>
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
                style={{ background: 'linear-gradient(135deg,#1b78f7,#4f46e5)', border: 'none', borderRadius: 10, padding: '14px', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 20px rgba(27,120,247,0.35)' }}
              >
                <span style={{display:'flex',alignItems:'center',gap:6,justifyContent:'center'}}>{cfg.cta} <ArrowRight size={15} /></span>
              </button>
              <button
                onClick={onDismiss}
                style={{ background: 'transparent', border: '1px solid var(--c-border)', borderRadius: 10, padding: '13px', color: 'var(--c-muted)', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}
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
  const { user, profile, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [projects, setProjects] = useState([])
  const [loadingProjects, setLoadingProjects] = useState(true)
  const [turmas, setTurmas] = useState([])
  const [studentTurmas, setStudentTurmas] = useState([])
  const [loadingStudentTurmas, setLoadingStudentTurmas] = useState(true)
  const [showCreateTurma, setShowCreateTurma] = useState(false)
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [showTurmasModal, setShowTurmasModal] = useState(false)
  const [toast, setToast] = useState('')
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
  // Invite modal target
  const [inviteTarget, setInviteTarget] = useState(null) // { studentId, studentName }

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
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
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, slug, score, area, created_at, ai_tagline, views, defense_date, ai_feedback, cover_url, collaborator_count:project_members(count)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      if (!error) {
        const normalized = (data || []).map(p => ({
          ...p,
          collaborator_count: Array.isArray(p.collaborator_count)
            ? (p.collaborator_count[0]?.count ?? 0)
            : (p.collaborator_count ?? 0),
        }))
        setProjects(normalized)
      }
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
      .select('id, title, location, type')
      .eq('recruiter_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .then(({ data }) => setRecruiterVagas(data || []))
  }, [user, profile?.role])

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
  const isTeacher = profile?.role === 'professor'
  const isRecruiter = profile?.role === 'recrutador' || profile?.role === 'empresa'

  // XP earned from missions (computed, not stored)
  const earnedXP = !isTeacher && !loadingProjects
    ? MISSIONS.reduce((sum, m) => sum + (checkMissionProgress(m, projects, profile, user) ? m.xp : 0), 0)
    : 0

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
        @keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes shimmer {
          0%   { background-position: -600px 0; }
          100% { background-position:  600px 0; }
        }
        .dash-skeleton {
          background: linear-gradient(90deg, ${C.card} 25%, ${C.cardHover} 50%, ${C.card} 75%);
          background-size: 1200px 100%;
          animation: shimmer 1.6s infinite linear;
          border: 1px solid ${C.border};
          border-radius: 14px;
        }

        /* Section header pattern */
        .dash-sec-hd {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 14px;
        }
        .dash-sec-label {
          display: flex; align-items: center; gap: 8px;
          font-size: 12px; font-weight: 700; color: ${C.muted};
          text-transform: uppercase; letter-spacing: 0.08em;
          font-family: var(--font-body);
        }
        .dash-sec-count {
          background: ${C.border}; border-radius: 20px; padding: 2px 8px;
          font-size: 10px; font-weight: 700; color: ${C.muted};
        }

        /* Inline stat pills */
        .dash-stat-pill {
          display: inline-flex; align-items: center; gap: 5px;
          background: var(--c-bg-alt);
          border: 1px solid ${C.border};
          border-radius: 999px;
          padding: 4px 11px;
          font-size: 11px; font-weight: 600; color: ${C.muted};
          white-space: nowrap;
        }

        /* Project rows */
        .dash-project-actions { display: flex; gap: 6px; flex-shrink: 0; align-items: center; }

        @media (max-width: 860px) {
          .dash-hd-btn-settings { display: none !important; }
        }
        /* Mobile project icon actions — hidden by default (desktop shows text buttons) */
        .dash-proj-actions-mobile { display: none; }
        /* Chart hidden on mobile */
        .dash-chart-wrap { }

        @media (max-width: 600px) {
          /* ── Chart ── */
          .dash-chart-wrap { display: none; }

          /* ── Project card — whole card tappable ── */
          .dash-project-row { cursor: pointer; padding: 13px 14px !important; }
          .dash-project-actions { display: none !important; }
          .dash-proj-actions-mobile {
            display: flex !important;
            align-items: center;
            gap: 6px;
            flex-shrink: 0;
          }

          /* ── Stat pills — slightly bigger touch feel ── */
          .dash-stat-pill {
            font-size: 12px !important;
            padding: 5px 13px !important;
          }

          /* ── Section header buttons ── */
          .dash-sec-hd button { padding: 8px 14px !important; font-size: 13px !important; }

          /* ── Header ── */
          .dash-header-btns { gap: 6px !important; }
          .dash-hd-btn-profile { display: none !important; }
        }
      `}</style>
      <Navbar />

      {showOnboardingAluno && (
        <OnboardingAlunoModal
          user={user}
          profile={profile}
          onDismiss={dismissOnboardingAluno}
          firstProject={projects[0] ?? null}
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

      {/* Toast */}
      <div style={{
        position: 'fixed', bottom: 28, left: '50%',
        transform: `translateX(-50%) translateY(${toast ? 0 : 80}px)`,
        opacity: toast ? 1 : 0, transition: 'all 0.3s cubic-bezier(0.34,1.56,0.64,1)',
        background: 'var(--c-bg-alt)', border: `1px solid ${C.borderBright}`, borderRadius: 12,
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
            // Persist in DB so teacher can see all members
            if (user?.id) {
              supabase.from('class_members').upsert(
                { class_id: turma.id, user_id: user.id },
                { onConflict: 'class_id,user_id' }
              )
            }
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
        <div style={{ marginBottom: 36, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ color: C.text, fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 900, margin: '0 0 6px', letterSpacing: '-0.5px', lineHeight: 1.15 }}>
              {greeting}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
              {profile?.role && (
                <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.blue, background: `${C.blue}18`, border: `1px solid ${C.blue}30`, borderRadius: 5, padding: '2px 7px' }}>
                  {{ aluno: 'Aluno', professor: 'Professor', recrutador: 'Recrutador', empresa: 'Empresa' }[profile.role] ?? 'Membro'}
                </span>
              )}
              <span style={{ color: C.subtle, fontSize: 12 }}>{user.email}</span>
            </div>
            {/* Inline stat pills — appear once data loads */}
            {!loadingProjects && (isTeacher ? turmas.length > 0 : projects.length > 0 || totalViews > 0) && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {!isTeacher && (
                  <>
                    <span className="dash-stat-pill">
                      <Folder size={11} /> {projects.length} projeto{projects.length !== 1 ? 's' : ''}
                    </span>
                    {bestScore != null && (
                      <span className="dash-stat-pill" style={{ color: getScoreColor(bestScore), borderColor: `${getScoreColor(bestScore)}30`, background: `${getScoreColor(bestScore)}0c` }}>
                        <Trophy size={11} /> {bestScore}
                      </span>
                    )}
                    {totalViews > 0 && (
                      <span className="dash-stat-pill">
                        <Eye size={11} /> {totalViews} visualizações
                      </span>
                    )}
                    {earnedXP > 0 && (
                      <span
                        className="dash-stat-pill"
                        onClick={() => navigate('/missoes')}
                        style={{ cursor: 'pointer', color: '#a78bfa', borderColor: 'rgba(167,139,250,0.3)', background: 'rgba(167,139,250,0.08)' }}
                        title="Ver missões"
                      >
                        <Swords size={11} /> {earnedXP} XP
                      </span>
                    )}
                  </>
                )}
                {isTeacher && (
                  <span className="dash-stat-pill">
                    <Users2 size={11} /> {turmas.length} turma{turmas.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="dash-header-btns" style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button
              className="dash-hd-btn-profile"
              onClick={() => navigate(profile?.username ? `/u/${profile.username}` : `/u/${user.id}`)}
              style={{ background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 9, padding: '8px 16px', color: C.muted, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = C.borderBright; e.currentTarget.style.color = C.text }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.muted }}
            >
              Ver perfil
            </button>
            <button
              className="dash-hd-btn-settings"
              onClick={() => navigate('/settings')}
              style={{ background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 9, padding: '8px 16px', color: C.muted, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = C.borderBright; e.currentTarget.style.color = C.text }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.muted }}
            >
              Definições
            </button>
          </div>
        </div>

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

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 }}>
              {/* Primary action — full width, accent left border */}
              <div
                style={{
                  background: C.card,
                  border: `1px solid ${primary.color}30`,
                  borderLeft: `3px solid ${primary.color}`,
                  borderRadius: 14, padding: '18px 20px',
                  display: 'flex', gap: 16, alignItems: 'center',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                  boxShadow: `0 2px 16px ${primary.color}12`,
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = primary.color + '55'; e.currentTarget.style.boxShadow = `0 4px 24px ${primary.color}22` }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = primary.color + '30'; e.currentTarget.style.boxShadow = `0 2px 16px ${primary.color}12` }}
              >
                <div style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0, background: primary.color + '18', border: `1px solid ${primary.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <PIcon size={20} color={primary.color} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: C.text, marginBottom: 2 }}>{primary.title}</div>
                  <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5 }}>{primary.desc}</div>
                </div>
                <button
                  onClick={primary.action}
                  style={{
                    background: `linear-gradient(135deg, ${primary.color}, ${primary.color}cc)`,
                    border: 'none', borderRadius: 9, padding: '9px 18px',
                    color: '#fff', fontSize: 13, fontWeight: 700,
                    cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
                    boxShadow: `0 4px 14px ${primary.color}44`,
                    transition: 'opacity 0.12s',
                    whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                >
                  {primary.cta}
                </button>
              </div>

              {/* Secondary steps — compact inline row */}
              {secondary.length > 0 && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {secondary.map(s => {
                    const SIcon = s.Icon
                    return (
                      <button
                        key={s.id}
                        onClick={s.action}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          background: C.card, border: `1px solid ${C.border}`,
                          borderRadius: 10, padding: '9px 14px',
                          color: C.muted, fontSize: 12, fontWeight: 600,
                          cursor: 'pointer', fontFamily: 'inherit',
                          transition: 'border-color 0.12s, color 0.12s',
                          flex: 1, minWidth: 160,
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = s.color + '55'; e.currentTarget.style.color = C.text }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.muted }}
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

        {/* ── All sections ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* ── Turmas (professor only) ── */}
          {isTeacher && (
            <div>
              <div className="dash-sec-hd">
                <div className="dash-sec-label">
                  <Users2 size={13} /> As minhas turmas
                  {turmas.length > 0 && <span className="dash-sec-count">{turmas.length}</span>}
                </div>
                <button
                  onClick={() => setShowCreateTurma(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(27,120,247,0.1)', border: '1px solid rgba(27,120,247,0.22)', borderRadius: 8, padding: '6px 12px', color: C.blue, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(27,120,247,0.18)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(27,120,247,0.1)' }}
                >
                  <Plus size={13} /> Nova turma
                </button>
              </div>
              {turmas.length === 0 ? (
                <div style={{ background: C.card, border: `1px dashed ${C.border}`, borderRadius: 14, padding: '40px 28px', textAlign: 'center' }}>
                  <div style={{ marginBottom: 14, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 52, height: 52, borderRadius: 14, background: 'rgba(27,120,247,0.08)', border: '1px solid rgba(27,120,247,0.15)' }}>
                    <Users2 size={24} color="#1b78f7" />
                  </div>
                  <p style={{ color: C.text, fontSize: 15, fontWeight: 700, margin: '0 0 6px' }}>Ainda não tens turmas</p>
                  <p style={{ color: C.muted, fontSize: 13, margin: '0 0 22px', lineHeight: 1.6 }}>Cria uma turma e partilha o código com os teus alunos.</p>
                  <button onClick={() => setShowCreateTurma(true)} style={{ background: `linear-gradient(135deg, ${C.blue}, #4f46e5)`, border: 'none', borderRadius: 9, padding: '10px 24px', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 16px rgba(27,120,247,0.3)' }}>
                    <span style={{display:'flex',alignItems:'center',gap:6}}>Criar primeira turma <ArrowRight size={14} /></span>
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {turmas.map(t => <TurmaCard key={t.id} turma={t} navigate={navigate} />)}
                </div>
              )}
            </div>
          )}

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
                onClick={() => navigate(`/projeto/${next.slug}`)}
                style={{ background: C.card, border: `1px solid ${urgentColor}35`, borderRadius: 16, overflow: 'hidden', cursor: 'pointer', transition: 'border-color 0.15s, box-shadow 0.15s', boxShadow: '0 2px 12px rgba(0,0,0,0.18)' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = urgentColor + '70'; e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,0,0,0.28)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = urgentColor + '35'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.18)' }}
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
                      <div style={{ fontSize: 32, fontWeight: 900, color: urgentColor, lineHeight: 1, letterSpacing: '-1.5px' }}>
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
                    <div style={{ height: 5, background: C.border, borderRadius: 999, overflow: 'hidden' }}>
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

          {/* ── Turma widget (alunos only) ── */}
          {!isTeacher && !loadingStudentTurmas && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', background: studentTurmas.length > 0 ? 'rgba(27,120,247,0.05)' : 'var(--c-bg-alt)', border: `1px solid ${studentTurmas.length > 0 ? 'rgba(27,120,247,0.18)' : C.border}`, borderRadius: 12, padding: '11px 14px', transition: 'all 0.2s' }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(27,120,247,0.1)', border: '1px solid rgba(27,120,247,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Users2 size={14} color="#1b78f7" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                {studentTurmas.length > 0 ? (
                  <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>
                    {studentTurmas.length === 1 ? studentTurmas[0].name : `${studentTurmas.length} turmas`}
                    {studentTurmas.length === 1 && studentTurmas[0].teacher_name && (
                      <span style={{ color: C.muted, fontWeight: 400, marginLeft: 8, fontSize: 12 }}>· {studentTurmas[0].teacher_name}</span>
                    )}
                  </span>
                ) : (
                  <span style={{ fontSize: 13, color: C.muted }}>Ainda não entraste em nenhuma turma</span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 7, flexShrink: 0 }}>
                {studentTurmas.length > 0 && (
                  <button onClick={() => setShowTurmasModal(true)} style={{ background: 'rgba(27,120,247,0.1)', border: '1px solid rgba(27,120,247,0.22)', borderRadius: 7, padding: '6px 12px', color: C.blue, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s', whiteSpace: 'nowrap' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(27,120,247,0.18)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(27,120,247,0.1)'}>
                    Ver turmas
                  </button>
                )}
                <button
                  onClick={() => setShowJoinModal(true)}
                  style={{ background: studentTurmas.length === 0 ? `linear-gradient(135deg, ${C.blue}, #4f46e5)` : 'transparent', border: `1px solid ${studentTurmas.length === 0 ? 'transparent' : C.border}`, borderRadius: 7, padding: '6px 12px', color: studentTurmas.length === 0 ? '#fff' : C.muted, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s', whiteSpace: 'nowrap', boxShadow: studentTurmas.length === 0 ? '0 2px 10px rgba(27,120,247,0.3)' : 'none' }}
                  onMouseEnter={e => { if (studentTurmas.length > 0) { e.currentTarget.style.borderColor = C.borderBright; e.currentTarget.style.color = C.text } }}
                  onMouseLeave={e => { if (studentTurmas.length > 0) { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.muted } }}
                >
                  {studentTurmas.length === 0 ? 'Entrar numa turma' : 'Entrar noutra'}
                </button>
              </div>
            </div>
          )}

          {/* ── Insights Block (antes dos projetos, desktop only) ── */}
          {!isTeacher && !loadingProjects && projects.filter(p => p.score != null).length >= 1 && (
            <div className="dash-chart-wrap">
              <InsightsBlock projects={projects} />
            </div>
          )}

          {/* ── Projetos (dominant section) ── */}
          {!isTeacher && <div id="proj-list">
            <div className="dash-sec-hd">
              <div className="dash-sec-label">
                <Folder size={13} /> Os meus projetos
                {!loadingProjects && projects.length > 0 && <span className="dash-sec-count">{projects.length}</span>}
              </div>
              {!loadingProjects && projects.length > 0 && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, background: `${C.blue}18`, border: `1px solid ${C.blue}30`, borderRadius: 8, padding: '6px 12px', color: C.blue, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}
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
              <div style={{ background: C.card, border: `1px dashed ${C.border}`, borderRadius: 16, padding: '52px 28px', textAlign: 'center' }}>
                <div style={{ marginBottom: 18, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 60, height: 60, borderRadius: 18, background: `${C.blue}18`, border: `1px solid ${C.blue}25` }}>
                  <Rocket size={28} color={C.blue} />
                </div>
                <p style={{ color: C.text, fontSize: 17, fontWeight: 700, margin: '0 0 8px' }}>O teu portfólio começa aqui</p>
                <p style={{ color: C.muted, fontSize: 13, margin: '0 0 28px', lineHeight: 1.7, maxWidth: 300, marginLeft: 'auto', marginRight: 'auto' }}>
                  Cria o teu primeiro projeto e partilha o que estás a construir com o mundo.
                </p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  style={{ background: `linear-gradient(135deg, ${C.blue}, #4f46e5)`, border: 'none', borderRadius: 10, padding: '13px 32px', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 20px rgba(27,120,247,0.35)' }}
                >
                  Criar projeto
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {projects.map(project => (
                  <ProjectRow key={project.id} project={project} onView={() => navigate(`/projeto/${project.slug}`)} onEdit={() => navigate(`/editar/${project.slug}`)} onDelete={deleteProject} />
                ))}
              </div>
            )}
          </div>}

          {/* ── Partilhados comigo ── */}
          {!isTeacher && collabProjects.length > 0 && (
            <div>
              <div className="dash-sec-hd">
                <div className="dash-sec-label">
                  <Users size={13} /> Partilhados comigo
                  <span className="dash-sec-count">{collabProjects.length}</span>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {collabProjects.map(p => (
                  <div key={p.id} onClick={() => navigate(`/projeto/${p.slug}`)} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', transition: 'all 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = C.cardHover; e.currentTarget.style.borderColor = C.borderBright }}
                    onMouseLeave={e => { e.currentTarget.style.background = C.card; e.currentTarget.style.borderColor = C.border }}>
                    <div style={{ position: 'relative', width: 38, height: 38, flexShrink: 0, filter: `drop-shadow(0 0 4px ${getScoreColor(p.score)}80)` }}>
                      <svg width={38} height={38} overflow="visible" style={{ transform: 'rotate(-90deg)', display: 'block' }}>
                        <circle cx={19} cy={19} r={15} fill="none" stroke="var(--c-border)" strokeWidth={3} />
                        <circle cx={19} cy={19} r={15} fill="none" stroke={getScoreColor(p.score)} strokeWidth={3}
                          strokeDasharray={`${((p.score ?? 0) / 100) * 2 * Math.PI * 15} ${2 * Math.PI * 15}`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: getScoreColor(p.score) }}>{p.score ?? '—'}</div>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: C.text, fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                      {p.creator_name && <div style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>de {p.creator_name}</div>}
                    </div>
                    {p.area && <span style={{ fontSize: 11, color: C.subtle, background: 'var(--c-bg-alt)', border: `1px solid ${C.border}`, borderRadius: 5, padding: '2px 8px', flexShrink: 0 }}>{p.area}</span>}
                    <ChevronRight size={15} color={C.subtle} style={{ flexShrink: 0 }} />
                  </div>
                ))}
              </div>
            </div>
          )}

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
                        background: C.card, border: `1px solid ${C.border}`,
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
                              style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 8, padding: '5px 10px', fontSize: 12, color: C.muted, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}
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
                  background: C.card, border: `1px solid ${C.border}`,
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
                    style={{ background: `linear-gradient(135deg,${C.blue},#4f46e5)`, border: 'none', borderRadius: 9, padding: '9px 20px', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
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
                        style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', transition: 'all 0.15s' }}
                        onClick={() => navigate(`/projeto/${p.slug}`)}
                        onMouseEnter={e => { e.currentTarget.style.background = C.cardHover; e.currentTarget.style.borderColor = C.borderBright }}
                        onMouseLeave={e => { e.currentTarget.style.background = C.card; e.currentTarget.style.borderColor = C.border }}
                      >
                        {/* Score ring */}
                        <svg width="38" height="38" viewBox="0 0 38 38" style={{ flexShrink: 0 }}>
                          <circle cx={19} cy={19} r={15} fill="none" stroke={C.border} strokeWidth={3} />
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
                              style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 8, padding: '5px 10px', fontSize: 12, color: C.muted, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}
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
