import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Navbar } from '../components/Navbar'
import { Folder, Check, Search, User, Copy, Inbox, Download, MessageSquare, X, ChevronUp, ChevronDown, ChevronRight, ArrowRight, Pencil, UserMinus, GraduationCap, CheckCircle, AlertTriangle, ListChecks, Circle, Trash2, Plus, Calendar, ClipboardList, Scale, Trophy } from 'lucide-react'
import { Button, Modal, ModalActions } from '../components/ui'
import { getCurrentAcademicYear, academicYearOptions } from '../lib/academicYear'

const C = {
  bg: 'var(--color-bg)', bgAlt: 'var(--color-bg-alt)', card: 'var(--color-surface)', cardHover: 'var(--color-surface-hover)',
  border: 'var(--color-border)', borderBright: 'var(--color-border-hover)',
  blue: 'var(--color-primary)', text: 'var(--color-text)', muted: 'var(--color-text-secondary)', subtle: 'var(--color-text-tertiary)',
  green: 'var(--color-success)', yellow: 'var(--color-warning)', red: 'var(--color-error)',
  glass: 'var(--color-glass)', glassHover: 'var(--color-glass-hover)',
  glassBorder: 'var(--color-glass-border)', glassBorderBright: 'var(--color-glass-border-bright)',
  glassStyle: { backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' },
}

function scoreColor(s) {
  if (s == null) return C.muted
  if (s >= 90) return C.green
  if (s >= 71) return C.blue
  if (s >= 40) return C.yellow
  return C.red
}

function ProjectCard({ project, navigate }) {
  const [hov, setHov] = useState(false)
  return (
    <div
      onClick={() => navigate(`/projeto/${project.slug}`)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        ...C.glassStyle,
        background: hov ? C.glassHover : C.glass,
        border: `1px solid ${hov ? C.glassBorderBright : C.glassBorder}`,
        borderRadius: 12, overflow: 'hidden', cursor: 'pointer',
        transition: 'background 0.15s, border-color 0.15s',
        boxShadow: 'none',
      }}
    >
      {project.cover_url ? (
        <img src={project.cover_url} alt="" style={{ width: '100%', height: 120, objectFit: 'cover', display: 'block' }} />
      ) : (
        <div style={{ width: '100%', height: 80, background: 'linear-gradient(135deg,var(--color-primary-subtle),rgba(79,70,229,0.05))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Folder size={28} color="var(--color-primary)" />
        </div>
      )}
      <div style={{ padding: '14px 16px' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {project.name}
        </div>
        {project.creator_name && (
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>{project.creator_name}</div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {project.area && (
            <span style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>
              {project.area}
            </span>
          )}
          <span style={{ fontSize: 12, fontWeight: 800, color: scoreColor(project.score), marginLeft: 'auto' }}>
            {project.score ?? '—'}
          </span>
        </div>
      </div>
    </div>
  )
}

const SECTION_LABELS = {
  description: 'Descrição', tech: 'Tecnologias', links: 'Links', demo: 'Demo',
  team: 'Equipa', gallery: 'Galeria', geral: 'Geral',
}

// field_key is free text at the DB level — rows written by other tools (an
// older AI-jury experiment left some with field_key='JURY_EVAL', for
// instance) fall outside SECTION_LABELS. Humanize those instead of showing
// the raw snake/upper-case key.
function humanizeFieldKey(key) {
  return key.replace(/_/g, ' ').toLowerCase().replace(/^./, c => c.toUpperCase())
}

// Some legacy rows (same AI-jury origin) stored a JSON blob — ratings per
// criterion plus a free-text note — directly in the comment column instead
// of the plain text this modal itself always saves. Render that shape
// nicely instead of dumping the raw JSON string.
function FeedbackComment({ comment, textColor }) {
  const trimmed = (comment || '').trim()
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed)
      if (parsed && typeof parsed === 'object' && parsed.ratings && typeof parsed.ratings === 'object') {
        const note = Object.entries(parsed).find(([k, v]) => k !== 'ratings' && k !== 'avg' && typeof v === 'string')
        return (
          <div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
              {Object.entries(parsed.ratings).map(([k, v]) => (
                <span key={k} style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-primary)', background: 'var(--color-primary-subtle)', border: '1px solid var(--color-primary-subtle)', borderRadius: 5, padding: '2px 7px', textTransform: 'capitalize' }}>
                  {k}: {v}
                </span>
              ))}
              {parsed.avg != null && (
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-success)', background: 'var(--color-success-subtle)', border: '1px solid var(--color-success-subtle)', borderRadius: 5, padding: '2px 7px' }}>
                  média: {parsed.avg}
                </span>
              )}
            </div>
            {note && <p style={{ margin: 0, fontSize: 13, color: textColor, lineHeight: 1.5 }}>{note[1]}</p>}
          </div>
        )
      }
    } catch {}
  }
  return <p style={{ margin: 0, fontSize: 13, color: textColor, lineHeight: 1.5 }}>{comment}</p>
}

function FeedbackModal({ project, teacherId, onClose }) {
  const [comment, setComment] = useState('')
  const [fieldKey, setFieldKey] = useState('geral')
  const [existing, setExisting] = useState([])
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(null)

  useEffect(() => {
    supabase
      .from('teacher_feedback')
      .select('*')
      .eq('project_id', project.id)
      .eq('teacher_id', teacherId)
      .then(({ data }) => setExisting(data || []))
  }, [project.id, teacherId])

  async function handleSave() {
    if (!comment.trim()) return
    setSaving(true)
    if (editing) {
      await supabase.from('teacher_feedback').update({ comment: comment.trim() }).eq('id', editing)
      setExisting(prev => prev.map(f => f.id === editing ? { ...f, comment: comment.trim() } : f))
    } else {
      const { data } = await supabase.from('teacher_feedback')
        .upsert({ project_id: project.id, teacher_id: teacherId, field_key: fieldKey, comment: comment.trim() }, { onConflict: 'project_id,teacher_id,field_key' })
        .select().single()
      if (data) {
        setExisting(prev => { const idx = prev.findIndex(f => f.field_key === fieldKey); return idx >= 0 ? prev.map((f, i) => i === idx ? data : f) : [...prev, data] })
        // Notify the student
        if (project.user_id) {
          supabase.rpc('create_notification', {
            p_user_id: project.user_id,
            p_type: 'TEACHER_FEEDBACK',
            p_message: `O teu professor deixou feedback no projeto "${project.name}".`,
            p_project_slug: project.slug,
          })
        }
      }
    }
    setComment(''); setEditing(null); setSaving(false)
  }

  async function handleDelete(id) {
    await supabase.from('teacher_feedback').delete().eq('id', id)
    setExisting(prev => prev.filter(f => f.id !== id))
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="turmapage-modal" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: 28, width: '100%', maxWidth: 480, maxHeight: '80vh', overflowY: 'auto', boxShadow: 'var(--shadow-xl)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 400, color: C.text, fontFamily: 'var(--font-heading)', letterSpacing: '-0.3px' }}>Feedback do professor</h3>
            <p style={{ margin: '3px 0 0', fontSize: 13, color: C.muted }}>{project.name}</p>
          </div>
          <button onClick={onClose} className="icon-btn-ghost"><X size={18} /></button>
        </div>

        {existing.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
            {existing.map(f => (
              <div key={f.id} style={{ background: 'var(--color-bg)', border: `1px solid ${C.border}`, borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: C.blue, textTransform: 'uppercase', letterSpacing: 0.5 }}>{SECTION_LABELS[f.field_key] || humanizeFieldKey(f.field_key)}</span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => { setEditing(f.id); setFieldKey(f.field_key); setComment(f.comment) }} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 12, padding: 0, fontFamily: 'inherit' }}>Editar</button>
                    <button onClick={() => handleDelete(f.id)} style={{ background: 'none', border: 'none', color: 'var(--color-error)', cursor: 'pointer', fontSize: 12, padding: 0, fontFamily: 'inherit' }}>Apagar</button>
                  </div>
                </div>
                <FeedbackComment comment={f.comment} textColor={C.text} />
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {Object.entries(SECTION_LABELS).map(([k, l]) => (
              <button key={k} onClick={() => setFieldKey(k)} style={{ fontSize: 12, padding: '4px 10px', borderRadius: 6, border: `1px solid ${fieldKey === k ? 'var(--color-primary)' : C.border}`, background: fieldKey === k ? 'var(--color-primary-subtle)' : 'transparent', color: fieldKey === k ? C.blue : C.muted, cursor: 'pointer', fontFamily: 'inherit', fontWeight: fieldKey === k ? 700 : 400 }}>
                {l}
              </button>
            ))}
          </div>
          <textarea
            value={comment} onChange={e => setComment(e.target.value)}
            placeholder={`Comentário sobre ${SECTION_LABELS[fieldKey] || fieldKey}…`}
            rows={3}
            style={{ width: '100%', background: 'var(--color-bg)', border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 12px', color: C.text, fontSize: 13, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box', outline: 'none' }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleSave} disabled={saving || !comment.trim()} style={{ flex: 1, background: 'var(--color-primary)', border: 'none', borderRadius: 8, padding: '10px', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: saving || !comment.trim() ? 0.6 : 1, fontFamily: 'inherit', boxShadow: '0 2px 8px var(--color-primary-subtle)' }}>
              {saving ? 'A guardar…' : editing ? 'Atualizar' : 'Guardar feedback'}
            </button>
            {editing && <button onClick={() => { setEditing(null); setComment('') }} style={{ background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 14px', color: C.muted, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>Cancelar</button>}
          </div>
        </div>
      </div>
    </div>
  )
}

function EditTurmaModal({ turma, onClose, onSave }) {
  const [name, setName] = useState(turma.name || '')
  const [subject, setSubject] = useState(turma.subject || '')
  const [academicYear, setAcademicYear] = useState(turma.academic_year || getCurrentAcademicYear())
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    await onSave(name.trim(), subject.trim(), academicYear)
    setSaving(false)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: 28, width: '100%', maxWidth: 400, boxShadow: 'var(--shadow-xl)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 400, color: C.text, fontFamily: 'var(--font-heading)', letterSpacing: '-0.3px' }}>Editar turma</h3>
          <button onClick={onClose} className="icon-btn-ghost"><X size={18} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: C.muted, marginBottom: 6, fontWeight: 600 }}>Nome</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Nome da turma"
              style={{ width: '100%', background: 'var(--color-bg)', border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 12px', color: C.text, fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: C.muted, marginBottom: 6, fontWeight: 600 }}>Disciplina (opcional)</label>
            <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Ex: Programação"
              style={{ width: '100%', background: 'var(--color-bg)', border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 12px', color: C.text, fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: C.muted, marginBottom: 6, fontWeight: 600 }}>Ano letivo</label>
            <select value={academicYear} onChange={e => setAcademicYear(e.target.value)}
              style={{ width: '100%', background: 'var(--color-bg)', border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 12px', color: C.text, fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', cursor: 'pointer' }}>
              {[...new Set([turma.academic_year, ...academicYearOptions()].filter(Boolean))].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <button onClick={handleSave} disabled={saving || !name.trim()} style={{ background: 'var(--color-primary)', border: 'none', borderRadius: 8, padding: '11px', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: saving || !name.trim() ? 0.6 : 1, fontFamily: 'inherit' }}>
            {saving ? 'A guardar…' : 'Guardar alterações'}
          </button>
        </div>
      </div>
    </div>
  )
}

function TaskModal({ initial, onClose, onSave }) {
  const [title, setTitle] = useState(initial?.title || '')
  const [description, setDescription] = useState(initial?.description || '')
  const [dueDate, setDueDate] = useState(initial?.due_date || '')
  const [saving, setSaving] = useState(false)

  async function handleSave(e) {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true)
    await onSave(title.trim(), description.trim(), dueDate || null)
    setSaving(false)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: 28, width: '100%', maxWidth: 420, boxShadow: 'var(--shadow-xl)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 400, color: C.text, fontFamily: 'var(--font-heading)', letterSpacing: '-0.3px' }}>{initial ? 'Editar tarefa' : 'Nova tarefa'}</h3>
          <button onClick={onClose} className="icon-btn-ghost"><X size={18} /></button>
        </div>
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: C.muted, marginBottom: 6, fontWeight: 600 }}>Título *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} required placeholder="ex: Entregar rascunho do problema/solução"
              style={{ width: '100%', background: 'var(--color-bg)', border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 12px', color: C.text, fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: C.muted, marginBottom: 6, fontWeight: 600 }}>Descrição (opcional)</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Detalhes da tarefa"
              style={{ width: '100%', background: 'var(--color-bg)', border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 12px', color: C.text, fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', resize: 'vertical' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: C.muted, marginBottom: 6, fontWeight: 600 }}>Data limite (opcional)</label>
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
              style={{ width: '100%', background: 'var(--color-bg)', border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 12px', color: C.text, fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <button type="submit" disabled={saving || !title.trim()} style={{ background: 'var(--color-primary)', border: 'none', borderRadius: 8, padding: '11px', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: saving || !title.trim() ? 0.6 : 1, fontFamily: 'inherit' }}>
            {saving ? 'A guardar…' : initial ? 'Guardar alterações' : 'Criar tarefa'}
          </button>
        </form>
      </div>
    </div>
  )
}

function Avatar({ avatarUrl, name, size = 40 }) {
  const initial = (name || '?')[0].toUpperCase()
  const colors = ['var(--color-primary)','var(--color-accent)','#0d9488','var(--color-warning)','#ec4899','#10b981']
  const bg = colors[(initial.charCodeAt(0) || 0) % colors.length]
  if (avatarUrl) return (
    <img src={avatarUrl} alt={name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
  )
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.4, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
      {initial}
    </div>
  )
}

export default function TurmaPage() {
  const { code } = useParams()
  const navigate = useNavigate()
  const { user, profile } = useAuth()

  const [turma, setTurma] = useState(null)
  const [projects, setProjects] = useState([])
  const [myProjects, setMyProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [adding, setAdding] = useState(null)
  const [toast, setToast] = useState('')
  const [copied, setCopied] = useState(false)
  const [isTeacher, setIsTeacher] = useState(false)
  const [sortBy, setSortBy] = useState('score')
  const [sortAsc, setSortAsc] = useState(false)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [bulkSaving, setBulkSaving] = useState(false)
  const [feedbackProject, setFeedbackProject] = useState(null)
  const [copiedLink, setCopiedLink] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [members, setMembers] = useState([]) // { user_id, full_name, avatar_url, role, projectCount }
  const [leavingClass, setLeavingClass] = useState(false)
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)
  const [showEditTurma, setShowEditTurma] = useState(false)
  const [removingMember, setRemovingMember] = useState(null) // { user_id, full_name }
  const [tasks, setTasks] = useState([])
  const [myCompletedTaskIds, setMyCompletedTaskIds] = useState(new Set())
  const [taskCompletionCounts, setTaskCompletionCounts] = useState({}) // task_id -> count, teacher view
  const [taskCompletions, setTaskCompletions] = useState({}) // task_id -> [{user_id, completed_at}], teacher view
  const [expandedTaskId, setExpandedTaskId] = useState(null) // teacher: which task shows per-student detail
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [deletingTask, setDeletingTask] = useState(null)
  const [rankingEnabled, setRankingEnabled] = useState(false)
  const [rankingToggling, setRankingToggling] = useState(false)
  const [criteria, setCriteria] = useState([])
  const [criteriaAdding, setCriteriaAdding] = useState(false)
  const [newCritName, setNewCritName] = useState('')
  const [newCritWeight, setNewCritWeight] = useState('25')
  const [editingCrit, setEditingCrit] = useState(null) // { id, name, weight }
  const [critSaving, setCritSaving] = useState(false)
  const [criterionScoresMap, setCriterionScoresMap] = useState({}) // { projectId: { criterionId: score } }

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 3500)
  }

  // Turmas are a school feature — only accounts connected to a school
  // (professors, verified via invite code) can access them for now.
  useEffect(() => {
    if (profile && profile.role !== 'professor') navigate('/dashboard')
  }, [profile, navigate])

  useEffect(() => {
    async function load() {
      const { data: cls, error } = await supabase
        .from('classes')
        .select('id, name, subject, code, teacher_name, teacher_id, academic_year, created_at')
        .eq('code', code.toUpperCase())
        .single()

      if (error || !cls) { setLoading(false); return }
      setTurma(cls)
      // show_ranking só existe depois da migration 067 — falha silenciosamente se ainda não existir
      supabase.from('classes').select('show_ranking').eq('id', cls.id).maybeSingle()
        .then(({ data }) => { if (data?.show_ranking != null) setRankingEnabled(!!data.show_ranking) })
      const teacherNow = user && cls.teacher_id === user.id
      if (teacherNow) setIsTeacher(true)

      let crit = []
      if (teacherNow) {
        const { data: critData } = await supabase
          .from('class_evaluation_criteria')
          .select('*')
          .eq('class_id', cls.id)
          .order('sort_order')
        crit = critData || []
        setCriteria(crit)
      }

      const { data: cp } = await supabase
        .from('class_projects')
        .select('project_id')
        .eq('class_id', cls.id)

      let projs = []
      if (cp?.length) {
        const ids = cp.map(r => r.project_id)
        const { data, error: projectsError } = await supabase
          .from('projects')
          .select('id, name, slug, score, area, creator_name, cover_url, ai_tagline, created_at, user_id, goal, problem, solution, features, technologies, results, linkedin_url, github_url, portfolio_url, review_status, teacher_score')
          .in('id', ids)
        if (projectsError) {
          console.error('projects fetch failed:', projectsError)
          showToast('Erro ao carregar projetos: ' + projectsError.message)
        }
        projs = data || []
        setProjects(projs)

        // Fetch per-criterion scores if this class has criteria
        if (teacherNow && crit.length > 0 && projs.length > 0) {
          const { data: scores } = await supabase
            .from('project_criterion_scores')
            .select('project_id, criterion_id, score')
            .in('project_id', projs.map(p => p.id))
          if (scores?.length) {
            const map = {}
            scores.forEach(s => {
              if (!map[s.project_id]) map[s.project_id] = {}
              map[s.project_id][s.criterion_id] = s.score
            })
            setCriterionScoresMap(map)
          }
        }
      }

      // Fetch all members from class_members table (source of truth)
      const { data: classMembers, error: classMembersError } = await supabase
        .from('class_members')
        .select('user_id, joined_at')
        .eq('class_id', cls.id)

      if (classMembersError) {
        console.error('class_members fetch failed:', classMembersError)
        showToast('Erro ao carregar alunos: ' + classMembersError.message)
      }

      const memberUserIds = (classMembers || []).map(m => m.user_id)
      // Always include teacher even if not in class_members
      const allIds = cls.teacher_id
        ? [...new Set([cls.teacher_id, ...memberUserIds])]
        : [...new Set(memberUserIds)]

      if (allIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, username, avatar_url, role')
          .in('id', allIds)
        if (profilesError) console.error('profiles fetch failed:', profilesError)
        const profileMap = {}
        ;(profiles || []).forEach(p => { profileMap[p.id] = p })
        const memberList = allIds.map(uid => {
          const prof = profileMap[uid] || {}
          const projCount = projs.filter(p => p.user_id === uid).length
          const joinedAt = (classMembers || []).find(m => m.user_id === uid)?.joined_at || null
          return {
            user_id: uid,
            full_name: prof.full_name || prof.username || (uid === cls.teacher_id ? cls.teacher_name : 'Aluno'),
            avatar_url: prof.avatar_url || null,
            role: uid === cls.teacher_id ? 'professor' : 'aluno',
            projectCount: projCount,
            joinedAt,
          }
        })
        // professor first, then by join date
        memberList.sort((a, b) => {
          if (a.role === 'professor') return -1
          if (b.role === 'professor') return 1
          return (a.joinedAt || '') < (b.joinedAt || '') ? -1 : 1
        })
        setMembers(memberList)
      } else if (cls.teacher_name) {
        setMembers([{ user_id: cls.teacher_id || 'teacher', full_name: cls.teacher_name, avatar_url: null, role: 'professor', projectCount: 0, joinedAt: null }])
      }

      setLoading(false)
    }
    load()
  }, [code, user])

  // Load class tasks + this student's completions (or, for the teacher, a
  // per-task completion count across the whole turma).
  useEffect(() => {
    if (!turma?.id || !user) return
    async function loadTasks() {
      const { data: taskRows } = await supabase
        .from('class_tasks')
        .select('id, title, description, due_date, created_at')
        .eq('class_id', turma.id)
        .order('due_date', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false })
      setTasks(taskRows || [])
      if (!taskRows?.length) { setMyCompletedTaskIds(new Set()); setTaskCompletionCounts({}); setTaskCompletions({}); return }

      const taskIds = taskRows.map(t => t.id)
      const { data: completions } = await supabase
        .from('class_task_completions')
        .select('task_id, user_id, completed_at')
        .in('task_id', taskIds)

      setMyCompletedTaskIds(new Set((completions || []).filter(c => c.user_id === user.id).map(c => c.task_id)))
      if (isTeacher) {
        const counts = {}
        const byTask = {}
        ;(completions || []).forEach(c => {
          counts[c.task_id] = (counts[c.task_id] || 0) + 1
          ;(byTask[c.task_id] = byTask[c.task_id] || []).push(c)
        })
        setTaskCompletionCounts(counts)
        setTaskCompletions(byTask)
      }
    }
    loadTasks()
  }, [turma?.id, user, isTeacher])

  async function handleCreateTask(title, description, dueDate) {
    const { data, error } = await supabase
      .from('class_tasks')
      .insert({ class_id: turma.id, teacher_id: user.id, title, description: description || null, due_date: dueDate || null })
      .select()
      .single()
    if (error) { showToast('Erro ao criar tarefa: ' + error.message); return }
    setTasks(prev => [data, ...prev])
    setShowTaskModal(false)

    const students = members.filter(m => m.role !== 'professor')
    await Promise.all(students.map(m => supabase.rpc('create_notification', {
      p_user_id: m.user_id,
      p_type: 'TASK_ASSIGNED',
      p_message: `Nova tarefa em "${turma.name}": ${title}`,
    })))
  }

  async function handleUpdateTask(title, description, dueDate) {
    const { error } = await supabase
      .from('class_tasks')
      .update({ title, description: description || null, due_date: dueDate || null })
      .eq('id', editingTask.id)
    if (error) { showToast('Erro ao guardar tarefa: ' + error.message); return }
    setTasks(prev => prev.map(t => t.id === editingTask.id ? { ...t, title, description: description || null, due_date: dueDate || null } : t))
    setEditingTask(null)
  }

  async function handleDeleteTask() {
    if (!deletingTask) return
    const { error } = await supabase.from('class_tasks').delete().eq('id', deletingTask.id)
    if (error) { showToast('Erro ao remover tarefa: ' + error.message); setDeletingTask(null); return }
    setTasks(prev => prev.filter(t => t.id !== deletingTask.id))
    setDeletingTask(null)
  }

  async function toggleTaskCompletion(taskId) {
    const done = myCompletedTaskIds.has(taskId)
    setMyCompletedTaskIds(prev => {
      const next = new Set(prev)
      done ? next.delete(taskId) : next.add(taskId)
      return next
    })
    if (done) {
      await supabase.from('class_task_completions').delete().eq('task_id', taskId).eq('user_id', user.id)
    } else {
      await supabase.from('class_task_completions').insert({ task_id: taskId, user_id: user.id })
      if (turma.teacher_id) {
        const task = tasks.find(t => t.id === taskId)
        const studentName = profile?.full_name || user?.user_metadata?.full_name || 'Um aluno'
        supabase.rpc('create_notification', {
          p_user_id: turma.teacher_id,
          p_type: 'TASK_COMPLETED',
          p_message: `${studentName} concluiu a tarefa "${task?.title ?? ''}" em "${turma.name}".`,
        })
      }
    }
  }

  // Load user's own projects for the add modal
  useEffect(() => {
    if (!user) return
    supabase
      .from('projects')
      .select('id, name, slug, score')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setMyProjects(data || []))
  }, [user])

  async function addProject(projectId) {
    if (!turma) return
    setAdding(projectId)
    const { error } = await supabase
      .from('class_projects')
      .insert({ class_id: turma.id, project_id: projectId })

    // Ensure student is registered as a member
    if (!error && user?.id) {
      supabase.from('class_members').upsert(
        { class_id: turma.id, user_id: user.id },
        { onConflict: 'class_id,user_id' }
      )
    }

    if (error) {
      if (error.code === '23505') showToast('Este projeto já está na turma.')
      else showToast('Erro ao adicionar: ' + error.message)
    } else {
      const { data: projs } = await supabase
        .from('projects')
        .select('id, name, slug, score, area, creator_name, cover_url, ai_tagline, created_at, user_id, goal, problem, solution, features, technologies, results, linkedin_url, github_url, portfolio_url, review_status, teacher_score')
        .in('id', [...projects.map(p => p.id), projectId])
      setProjects(projs || [])
      showToast('Projeto adicionado à turma!')
      setShowAdd(false)
      // Notify the teacher
      if (turma.teacher_id) {
        const added = myProjects.find(p => p.id === projectId)
        supabase.rpc('create_notification', {
          p_user_id: turma.teacher_id,
          p_type: 'STUDENT_JOINED',
          p_message: `Um aluno adicionou o projeto "${added?.name ?? 'novo projeto'}" à turma "${turma.name}".`,
          p_project_slug: added?.slug ?? null,
        })
      }
    }
    setAdding(null)
  }

  async function removeProject(projectId) {
    if (!turma || !isTeacher) return
    await supabase.from('class_projects').delete().eq('class_id', turma.id).eq('project_id', projectId)
    setProjects(prev => prev.filter(p => p.id !== projectId))
    showToast('Projeto removido da turma.')
  }

  // So a professor opening a single project (not the batch "Avaliar todos" flow)
  // still gets a "Voltar à turma" link on the project page.
  function goToProject(slug) {
    navigate(`/projeto/${slug}`, { state: { turmaCode: turma.code, turmaName: turma.name, turmaId: turma.id } })
  }

  function toggleSelected(projectId) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(projectId)) next.delete(projectId)
      else next.add(projectId)
      return next
    })
  }

  async function handleBulkStatus(status) {
    if (selectedIds.size === 0 || bulkSaving) return
    setBulkSaving(true)
    const ids = [...selectedIds]
    const results = await Promise.all(
      ids.map(id => supabase.rpc('set_project_review_status', { p_project_id: id, p_status: status }))
    )
    const failed = results.filter(r => r.error).length
    setProjects(prev => prev.map(p => ids.includes(p.id) ? { ...p, review_status: status } : p))
    setSelectedIds(new Set())
    setBulkSaving(false)
    showToast(failed > 0
      ? `Estado atualizado em ${ids.length - failed} de ${ids.length} projetos.`
      : `Estado atualizado em ${ids.length} projeto${ids.length !== 1 ? 's' : ''}.`)
  }

  function copyCode() {
    navigator.clipboard.writeText(turma.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function copyLink() {
    navigator.clipboard.writeText(`${window.location.origin}/turma/${turma.code}`)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  function computeCompletude(p) {
    const checks = [
      !!(p.goal || p.problem),
      !!p.solution,
      !!p.technologies,
      !!p.features,
      !!p.results,
      !!(p.linkedin_url || p.github_url || p.portfolio_url),
      !!p.cover_url,
    ]
    return Math.round((checks.filter(Boolean).length / checks.length) * 100)
  }

  const DEFAULT_CRITERIA = [
    { name: 'Conteúdo & Problema', weight: 25 },
    { name: 'Solução & Produto',   weight: 25 },
    { name: 'Execução Técnica',    weight: 25 },
    { name: 'Apresentação',        weight: 25 },
  ]

  async function addCriterion() {
    const name = newCritName.trim()
    const weight = parseFloat(newCritWeight)
    if (!name || !weight || weight <= 0 || !turma) return
    setCritSaving(true)
    const { data, error } = await supabase
      .from('class_evaluation_criteria')
      .insert({ class_id: turma.id, name, weight, sort_order: criteria.length })
      .select()
      .single()
    if (!error && data) {
      setCriteria(c => [...c, data])
      setNewCritName('')
      setNewCritWeight('25')
      setCriteriaAdding(false)
    }
    setCritSaving(false)
  }

  async function saveCriterion() {
    if (!editingCrit) return
    const name = editingCrit.name.trim()
    const weight = parseFloat(editingCrit.weight)
    if (!name || !weight || weight <= 0) return
    setCritSaving(true)
    const { error } = await supabase
      .from('class_evaluation_criteria')
      .update({ name, weight })
      .eq('id', editingCrit.id)
    if (!error) {
      setCriteria(c => c.map(x => x.id === editingCrit.id ? { ...x, name, weight } : x))
      setEditingCrit(null)
    }
    setCritSaving(false)
  }

  async function deleteCriterion(id) {
    const { error } = await supabase.from('class_evaluation_criteria').delete().eq('id', id)
    if (!error) setCriteria(c => c.filter(x => x.id !== id))
  }

  async function useDefaultCriteria() {
    if (!turma || criteria.length > 0) return
    setCritSaving(true)
    const rows = DEFAULT_CRITERIA.map((d, i) => ({ class_id: turma.id, name: d.name, weight: d.weight, sort_order: i }))
    const { data, error } = await supabase.from('class_evaluation_criteria').insert(rows).select()
    if (!error && data) setCriteria(data)
    setCritSaving(false)
  }

  function exportCSV() {
    const statusLabel = s => s === 'ready_for_defense' ? 'Pronto para defesa' : s === 'needs_revision' ? 'Precisa de revisão' : s === 'resubmitted' ? 'Correções enviadas' : '—'
    const hasCrit = criteria.length > 0
    const critHeaders = hasCrit ? criteria.map(c => `${c.name} (${c.weight}%)`) : []
    const headers = ['Aluno', 'Projeto', 'Nota (0-20)', ...critHeaders, 'Score Showo', 'Completude (%)', 'Estado', 'Data', 'Link']
    const rows = [headers]
    sortedProjects.forEach(p => {
      const date = p.created_at ? new Date(p.created_at).toLocaleDateString('pt-PT') : '—'
      const critScores = hasCrit
        ? criteria.map(c => criterionScoresMap[p.id]?.[c.id] ?? '—')
        : []
      rows.push([
        p.creator_name || '—',
        p.name,
        p.teacher_score ?? '—',
        ...critScores,
        p.score ?? '—',
        computeCompletude(p),
        statusLabel(p.review_status),
        date,
        `${window.location.origin}/projeto/${p.slug}`,
      ])
    })
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `${turma.name}-${turma.code}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  function toggleSort(field) {
    if (sortBy === field) setSortAsc(a => !a)
    else { setSortBy(field); setSortAsc(field === 'name') }
  }

  const sortedProjects = [...projects].sort((a, b) => {
    let av, bv
    if (sortBy === 'score') { av = a.score ?? -1; bv = b.score ?? -1 }
    else if (sortBy === 'completude') { av = computeCompletude(a); bv = computeCompletude(b) }
    else if (sortBy === 'updated') { av = a.created_at || ''; bv = b.created_at || '' }
    else { av = (a.name || '').toLowerCase(); bv = (b.name || '').toLowerCase() }
    if (av < bv) return sortAsc ? -1 : 1
    if (av > bv) return sortAsc ? 1 : -1
    return 0
  })

  if (profile && profile.role !== 'professor') return null

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg }}>
        <Navbar />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 'calc(100dvh - 62px)' }}>
          <style>{`@keyframes tp-sh{0%{background-position:-300px 0}100%{background-position:300px 0}}`}</style>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            {[150, 95, 125].map((w, i) => (
              <div key={i} style={{ height: i === 0 ? 14 : 9, width: w, borderRadius: 6, background: 'linear-gradient(90deg,var(--color-bg-alt) 25%,var(--color-surface-hover) 50%,var(--color-bg-alt) 75%)', backgroundSize: '300px 100%', animation: `tp-sh 1.5s ease-in-out infinite ${i*0.12}s` }} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!turma) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg }}>
        <Navbar />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24, height: 'calc(100dvh - 62px)' }}>
          <Search size={52} color="var(--color-primary)" />
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 400, fontFamily: 'var(--font-heading)', letterSpacing: '-0.4px', color: C.text }}>Turma não encontrada</h2>
          <p style={{ color: C.muted, margin: 0 }}>O código <strong style={{ color: C.text }}>{code}</strong> não existe. Verifica com o professor.</p>
          <Button onClick={() => navigate('/')}>Ir para o início</Button>
        </div>
      </div>
    )
  }

  async function leaveClass() {
    if (!turma || !user) return
    setLeavingClass(true)
    // Also unlinks the student's own projects from this class server-side —
    // otherwise the dashboard's "my turmas" (derived independently from
    // class_projects) kept showing this turma after "leaving".
    await supabase.rpc('leave_class', { p_class_id: turma.id })
    // Clean localStorage
    try {
      const lsKey = `showo_turmas_${user.id}`
      const existing = JSON.parse(localStorage.getItem(lsKey) || '[]')
      localStorage.setItem(lsKey, JSON.stringify(existing.filter(t => t.id !== turma.id)))
    } catch {}
    setLeavingClass(false)
    navigate('/dashboard')
  }

  async function toggleRanking() {
    if (!turma || rankingToggling) return
    setRankingToggling(true)
    const next = !rankingEnabled
    const { error } = await supabase.from('classes').update({ show_ranking: next }).eq('id', turma.id)
    if (!error) setRankingEnabled(next)
    setRankingToggling(false)
  }

  async function handleUpdateTurma(name, subject, academicYear) {
    const { error } = await supabase.rpc('update_class', { p_class_id: turma.id, p_name: name, p_subject: subject || null, p_academic_year: academicYear || null })
    if (error) { showToast('Erro ao atualizar turma: ' + error.message); return }
    setTurma(prev => ({ ...prev, name, subject: subject || null, academic_year: academicYear || prev.academic_year }))
    setShowEditTurma(false)
    showToast('Turma atualizada')
  }

  async function handleRemoveMember(memberUserId) {
    const { error } = await supabase.rpc('remove_class_member', { p_class_id: turma.id, p_user_id: memberUserId })
    if (error) { showToast('Erro ao remover aluno: ' + error.message); return }
    setMembers(prev => prev.filter(m => m.user_id !== memberUserId))
    setRemovingMember(null)
    showToast('Aluno removido da turma')
  }

  const alreadyAdded = new Set(projects.map(p => p.id))
  const addableProjects = myProjects.filter(p => !alreadyAdded.has(p.id))

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: 'inherit' }}>
      <style>{`
@media (max-width: 480px) { .turmapage-grid { grid-template-columns: 1fr !important; } }
        @media (max-width: 600px) { .turmapage-hd { flex-direction: column !important; align-items: flex-start !important; gap: 12px !important; } }
        @media (max-width: 520px) { .turmapage-modal { padding: 20px 16px !important; } }
      `}</style>
      <Navbar />

      {/* Feedback modal */}
      {feedbackProject && (
        <FeedbackModal
          project={feedbackProject}
          teacherId={user.id}
          onClose={() => setFeedbackProject(null)}
        />
      )}

      {/* Toast */}
      <div style={{
        position: 'fixed', bottom: 28, left: '50%',
        transform: `translateX(-50%) translateY(${toast ? 0 : 80}px)`,
        opacity: toast ? 1 : 0, transition: 'opacity 0.3s, transform 0.3s',
        background: 'var(--color-bg-alt)', border: `1px solid ${C.borderBright}`, borderRadius: 10,
        padding: '12px 24px', fontSize: 14, fontWeight: 600, color: C.text,
        zIndex: 3000, pointerEvents: 'none', whiteSpace: 'nowrap',
        boxShadow: 'none',
      }}>{toast}</div>

      {/* Edit turma */}
      {showEditTurma && (
        <EditTurmaModal turma={turma} onClose={() => setShowEditTurma(false)} onSave={handleUpdateTurma} />
      )}

      {/* New task */}
      {showTaskModal && (
        <TaskModal onClose={() => setShowTaskModal(false)} onSave={handleCreateTask} />
      )}

      {/* Edit task */}
      {editingTask && (
        <TaskModal initial={editingTask} onClose={() => setEditingTask(null)} onSave={handleUpdateTask} />
      )}

      {/* Delete task confirm */}
      {deletingTask && (
        <Modal onClose={() => setDeletingTask(null)} width={360}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 52, height: 52, borderRadius: 12, background: 'var(--color-error-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
              <Trash2 size={22} color="var(--color-error)" />
            </div>
            <h3 style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 700, color: C.text }}>Remover tarefa?</h3>
            <p style={{ margin: '0 0 24px', fontSize: 14, color: C.muted, lineHeight: 1.5 }}>
              <strong style={{ color: C.text }}>{deletingTask.title}</strong> deixa de aparecer para os alunos.
            </p>
            <ModalActions>
              <Button variant="secondary" onClick={() => setDeletingTask(null)} fullWidth>Cancelar</Button>
              <Button variant="danger" onClick={handleDeleteTask} fullWidth>Remover</Button>
            </ModalActions>
          </div>
        </Modal>
      )}

      {/* Remove member confirm */}
      {removingMember && (
        <Modal onClose={() => setRemovingMember(null)} width={360}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 52, height: 52, borderRadius: 12, background: 'var(--color-error-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
              <UserMinus size={24} color="var(--color-error)" />
            </div>
            <h3 style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 700, color: C.text }}>Remover aluno?</h3>
            <p style={{ margin: '0 0 24px', fontSize: 14, color: C.muted, lineHeight: 1.5 }}>
              <strong style={{ color: C.text }}>{removingMember.full_name}</strong> deixa de aparecer na turma. Os projetos que já submeteu ficam na turma.
            </p>
            <ModalActions>
              <Button variant="secondary" onClick={() => setRemovingMember(null)} fullWidth>Cancelar</Button>
              <Button variant="danger" onClick={() => handleRemoveMember(removingMember.user_id)} fullWidth>Remover</Button>
            </ModalActions>
          </div>
        </Modal>
      )}

      {/* Leave class confirm */}
      {showLeaveConfirm && (
        <Modal onClose={() => setShowLeaveConfirm(false)} width={360}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 52, height: 52, borderRadius: 12, background: 'var(--color-error-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
              <X size={24} color="var(--color-error)" />
            </div>
            <h3 style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 700, color: C.text }}>Sair da turma?</h3>
            <p style={{ margin: '0 0 24px', fontSize: 14, color: C.muted, lineHeight: 1.5 }}>
              Vais sair de <strong style={{ color: C.text }}>{turma?.name}</strong>. Os teus projetos ficam, mas deixas de aparecer na lista de membros.
            </p>
            <ModalActions>
              <Button variant="secondary" onClick={() => setShowLeaveConfirm(false)} fullWidth>Cancelar</Button>
              <Button variant="danger" onClick={() => { setShowLeaveConfirm(false); leaveClass() }} loading={leavingClass} fullWidth>Sair</Button>
            </ModalActions>
          </div>
        </Modal>
      )}

      {/* Add project modal */}
      {showAdd && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
          onClick={e => e.target === e.currentTarget && setShowAdd(false)}
        >
          <div style={{ background: C.card, border: `1px solid ${C.borderBright}`, borderRadius: 14, padding: '28px', width: '100%', maxWidth: 400, boxShadow: 'none' }}>
            <h3 style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 400, fontFamily: 'var(--font-heading)', letterSpacing: '-0.3px', color: C.text }}>Adicionar à turma</h3>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: C.muted }}>Seleciona um projeto para adicionar a <strong style={{ color: C.text }}>{turma.name}</strong></p>
            {addableProjects.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px 0', color: C.muted, fontSize: 14 }}>
                {myProjects.length === 0 ? 'Ainda não tens projetos.' : 'Todos os teus projetos já estão nesta turma.'}
                {myProjects.length === 0 && (
                  <div style={{ marginTop: 12 }}>
                    <Button size="sm" icon={<Plus size={13} />} onClick={() => navigate('/novo')}>Criar projeto</Button>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {addableProjects.map(p => (
                  <div key={p.id} style={{ background: C.bgAlt, border: `1px solid ${C.border}`, borderRadius: 8, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: C.muted }}>Score: {p.score ?? '—'}</div>
                    </div>
                    <button
                      onClick={() => addProject(p.id)}
                      disabled={adding === p.id}
                      style={{ background: 'var(--color-primary)', border: 'none', borderRadius: 8, padding: '7px 16px', color: '#fff', fontSize: 13, fontWeight: 600, cursor: adding === p.id ? 'default' : 'pointer', fontFamily: 'inherit', opacity: adding === p.id ? 0.6 : 1, flexShrink: 0 }}
                    >
                      {adding === p.id ? '...' : 'Adicionar'}
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => setShowAdd(false)} style={{ marginTop: 16, width: '100%', background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 8, padding: '9px', color: C.muted, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="page-content">
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div className="turmapage-hd" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <h1 style={{ margin: 0, fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 400, letterSpacing: '-0.8px', fontFamily: 'var(--font-heading)' }}>{turma.name}</h1>
                  {turma.academic_year && (
                    <span style={{ fontSize: 12, fontWeight: 700, color: C.muted, background: C.bgAlt, border: `1px solid ${C.border}`, borderRadius: 6, padding: '3px 9px', marginTop: 6 }}>{turma.academic_year}</span>
                  )}
                  {isTeacher && (
                    <button onClick={() => setShowEditTurma(true)} title="Editar turma"
                      className="icon-btn-ghost" style={{ marginTop: 6 }}>
                      <Pencil size={16} />
                    </button>
                  )}
                </div>
                {turma.subject && <p style={{ margin: 0, fontSize: 14, color: C.muted }}>{turma.subject}</p>}
              </div>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 13, color: C.subtle }}>
                {turma.teacher_name && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><User size={13} />{turma.teacher_name}</span>}
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Folder size={13} />{projects.length} projeto{projects.length !== 1 ? 's' : ''}</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              {/* Code badge */}
              <button
                onClick={copyCode}
                style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--color-primary-subtle)', border: `1px solid var(--color-primary-subtle)`, borderRadius: 7, padding: '6px 10px', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                <span style={{ fontSize: 10, color: C.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Código</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: C.blue, letterSpacing: 1.5 }}>{turma.code}</span>
                <span style={{ color: copied ? C.green : C.muted, display: 'flex' }}>{copied ? <Check size={11} /> : <Copy size={11} />}</span>
              </button>
              {/* Copy link */}
              <Button variant="secondary" size="sm" icon={copiedLink ? <Check size={12} /> : <Copy size={12} />} onClick={copyLink}>
                {copiedLink ? 'Copiado!' : 'Copiar link'}
              </Button>
              {/* Professor: export CSV */}
              {isTeacher && projects.length > 0 && (
                <Button variant="secondary" size="sm" icon={<Download size={12} />} onClick={exportCSV}>CSV</Button>
              )}
              {/* Leave class (students only) */}
              {!isTeacher && user && (
                <Button variant="danger" size="sm" icon={<X size={12} />} onClick={() => setShowLeaveConfirm(true)}>Sair</Button>
              )}
              {/* Add project (students only) */}
              {!isTeacher && (user ? (
                <Button size="sm" icon={<Plus size={13} />} onClick={() => setShowAdd(true)}>Adicionar projeto</Button>
              ) : (
                <Button variant="secondary" size="sm" onClick={() => navigate('/login')}>Entrar para adicionar</Button>
              ))}
            </div>
          </div>
        </div>

        {/* Teacher summary — quick stats + alerts. Only visible to the teacher. */}
        {isTeacher && (() => {
          const students = members.filter(m => m.role !== 'professor')
          const withoutProjects = students.filter(m => m.projectCount === 0)
          const needsRevision = projects.filter(p => p.review_status === 'needs_revision')
          const resubmitted = projects.filter(p => p.review_status === 'resubmitted')
          const today = new Date(); today.setHours(23, 59, 59, 999)
          const overdueTasks = tasks.filter(t => t.due_date && new Date(t.due_date + 'T23:59:59') < new Date())
          const scores = projects.filter(p => p.score != null)
          const avgScore = scores.length ? Math.round(scores.reduce((s, p) => s + p.score, 0) / scores.length) : null
          const alerts = [
            ...needsRevision.map(p => ({ type: 'revision', msg: `"${p.name}" precisa de revisão`, color: 'var(--color-warning)', project: p })),
            ...resubmitted.map(p => ({ type: 'resubmit', msg: `"${p.name}" enviou correções — rever de novo`, color: 'var(--color-primary)', project: p })),
            ...withoutProjects.map(m => ({ type: 'noproj', msg: `${m.full_name} ainda não entregou`, color: C.subtle })),
            ...overdueTasks.map(t => ({ type: 'task', msg: `Tarefa "${t.title}" passou o prazo`, color: 'var(--color-error)' })),
          ]

          return (
            <div style={{ marginBottom: 28 }}>
              {/* Stats strip */}
              <div style={{ display: 'flex', gap: 10, marginBottom: alerts.length > 0 ? 10 : 0, flexWrap: 'wrap' }}>
                {[
                  { label: 'Alunos', value: students.length },
                  { label: 'Projetos', value: projects.length },
                  { label: 'Score médio', value: avgScore ?? '—', color: avgScore != null ? scoreColor(avgScore) : C.muted },
                  { label: 'Tarefas', value: tasks.length > 0 ? `${tasks.length}` : '—' },
                ].map(s => (
                  <div key={s.label} style={{ ...C.glassStyle, background: C.glass, border: `1px solid ${C.glassBorder}`, borderRadius: 10, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 3, minWidth: 90 }}>
                    <span style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-heading)', color: s.color || C.text, letterSpacing: '-0.5px', lineHeight: 1 }}>{s.value}</span>
                    <span style={{ fontSize: 11, color: C.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</span>
                  </div>
                ))}
              </div>

              {/* Alerts */}
              {alerts.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {alerts.slice(0, 5).map((a, i) => (
                    <div key={i}
                      onClick={a.project ? () => goToProject(a.project.slug) : undefined}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', borderRadius: 8, background: `${a.color}10`, border: `1px solid ${a.color}28`, cursor: a.project ? 'pointer' : 'default', transition: 'opacity 0.1s' }}
                    >
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: a.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 13, color: C.text, flex: 1 }}>{a.msg}</span>
                      {a.project && <ChevronRight size={13} color={C.subtle} />}
                    </div>
                  ))}
                  {alerts.length > 5 && (
                    <div style={{ fontSize: 12, color: C.subtle, paddingLeft: 4 }}>+{alerts.length - 5} mais alertas</div>
                  )}
                </div>
              )}
            </div>
          )
        })()}

        {/* Professor — own section, visually set apart from the student roster */}
        {(() => {
          const teacherMember = members.find(m => m.role === 'professor')
          if (!teacherMember) return null
          return (
            <div style={{ marginBottom: 28 }}>
              <div style={{
                background: 'linear-gradient(135deg, var(--color-primary-subtle), rgba(79,70,229,0.06))',
                border: '1px solid var(--color-primary-subtle)',
                borderRadius: 12, padding: '16px 20px',
                display: 'flex', alignItems: 'center', gap: 14,
              }}>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <Avatar avatarUrl={teacherMember.avatar_url} name={teacherMember.full_name} size={46} />
                  <div style={{
                    position: 'absolute', bottom: -3, right: -3, width: 20, height: 20, borderRadius: '50%',
                    background: 'var(--color-primary)', border: `2px solid ${C.bg}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <GraduationCap size={11} color="#fff" />
                  </div>
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{teacherMember.full_name}</div>
                  <div style={{ fontSize: 12, color: C.blue, fontWeight: 600, marginTop: 2 }}>A gerir esta turma</div>
                </div>
              </div>
            </div>
          )
        })()}

        {/* Members — students only. Always visible (even empty) so the page
            doesn't read as "just a place to dump projects" — the roster is
            the point of a turma. */}
        {(() => {
          const students = members.filter(m => m.role !== 'professor')
          return (
            <div style={{ marginBottom: 32 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                  Alunos
                </span>
                <span style={{ fontSize: 11, fontWeight: 700, color: C.subtle }}>
                  {students.length}
                </span>
              </div>
              {students.length === 0 ? (
                <div style={{ ...C.glassStyle, background: C.glass, border: `1px dashed ${C.glassBorder}`, borderRadius: 10, padding: '24px 20px', textAlign: 'center' }}>
                  <p style={{ margin: 0, fontSize: 13, color: C.muted }}>
                    {isTeacher
                      ? <>Ainda sem alunos. Partilha o código <strong style={{ color: C.blue }}>{turma.code}</strong> para começarem a entrar.</>
                      : 'Ainda não há colegas nesta turma.'}
                  </p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
                  {students.map(m => (
                    <div
                      key={m.user_id}
                      onClick={isTeacher ? () => navigate(`/turma/${turma.code}/aluno/${m.user_id}`) : undefined}
                      style={{
                        ...C.glassStyle,
                        background: C.glass, border: `1px solid ${C.glassBorder}`,
                        borderRadius: 10, padding: '14px 16px',
                        display: 'flex', alignItems: 'center', gap: 12,
                        cursor: isTeacher ? 'pointer' : 'default',
                        transition: 'background 0.12s, border-color 0.12s',
                      }}
                      onMouseEnter={isTeacher ? e => { e.currentTarget.style.background = C.glassHover; e.currentTarget.style.borderColor = C.glassBorderBright } : undefined}
                      onMouseLeave={isTeacher ? e => { e.currentTarget.style.background = C.glass; e.currentTarget.style.borderColor = C.glassBorder } : undefined}
                    >
                      <Avatar avatarUrl={m.avatar_url} name={m.full_name} size={38} />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {m.full_name}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                          <span style={{ fontSize: 11, color: C.muted }}>
                            {m.projectCount === 0 ? 'Sem projetos' : `${m.projectCount} projeto${m.projectCount !== 1 ? 's' : ''}`}
                          </span>
                        </div>
                      </div>
                      {isTeacher && (
                        <button
                          onClick={e => { e.stopPropagation(); setRemovingMember({ user_id: m.user_id, full_name: m.full_name }) }}
                          title="Remover da turma"
                          className="icon-btn-ghost"
                        >
                          <UserMinus size={15} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })()}

        {/* Criteria — teacher-only configuration of evaluation dimensions */}
        {isTeacher && (
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Scale size={14} color={C.muted} />
                <span style={{ fontSize: 13, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                  Critérios de avaliação
                </span>
                {criteria.length > 0 && <span style={{ fontSize: 11, fontWeight: 700, color: C.subtle }}>{criteria.length}</span>}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {criteria.length === 0 && (
                  <button
                    onClick={useDefaultCriteria}
                    disabled={critSaving}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, background: C.bgAlt, border: `1px solid ${C.border}`, borderRadius: 7, padding: '6px 12px', color: C.muted, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    Usar padrão
                  </button>
                )}
                <button
                  onClick={() => { setCriteriaAdding(true); setNewCritName(''); setNewCritWeight('25') }}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--color-primary-subtle)', border: '1px solid var(--color-primary-subtle)', borderRadius: 7, padding: '6px 12px', color: C.blue, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  <Plus size={13} /> Critério
                </button>
              </div>
            </div>

            {criteria.length === 0 && !criteriaAdding ? (
              <div style={{ ...C.glassStyle, background: C.glass, border: `1px dashed ${C.glassBorder}`, borderRadius: 10, padding: '18px 20px', textAlign: 'center' }}>
                <p style={{ margin: '0 0 8px', fontSize: 13, color: C.muted }}>Sem critérios definidos. A avaliação usa uma nota única de 0-20.</p>
                <button onClick={useDefaultCriteria} style={{ background: 'none', border: 'none', color: C.blue, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline' }}>
                  Usar critérios padrão (4 × 25%)
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {criteria.map(c => (
                  editingCrit?.id === c.id ? (
                    <div key={c.id} style={{ ...C.glassStyle, background: C.glass, border: `1px solid ${C.glassBorderBright}`, borderRadius: 10, padding: '12px 14px', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <input
                        value={editingCrit.name}
                        onChange={e => setEditingCrit(x => ({ ...x, name: e.target.value }))}
                        placeholder="Nome do critério"
                        style={{ flex: 1, minWidth: 140, background: C.bgAlt, border: `1px solid ${C.border}`, borderRadius: 7, padding: '6px 10px', color: C.text, fontSize: 13, fontFamily: 'inherit', outline: 'none' }}
                        onKeyDown={e => { if (e.key === 'Enter') saveCriterion(); if (e.key === 'Escape') setEditingCrit(null) }}
                        autoFocus
                      />
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <input
                          type="number" min="1" max="100" step="1"
                          value={editingCrit.weight}
                          onChange={e => setEditingCrit(x => ({ ...x, weight: e.target.value }))}
                          style={{ width: 54, background: C.bgAlt, border: `1px solid ${C.border}`, borderRadius: 7, padding: '6px 8px', color: C.text, fontSize: 13, fontFamily: 'inherit', outline: 'none', textAlign: 'right' }}
                        />
                        <span style={{ fontSize: 12, color: C.muted }}>%</span>
                      </div>
                      <button onClick={saveCriterion} disabled={critSaving} style={{ background: C.blue, border: 'none', borderRadius: 7, padding: '6px 12px', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                        {critSaving ? '…' : 'Guardar'}
                      </button>
                      <button onClick={() => setEditingCrit(null)} style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 7, padding: '6px 10px', color: C.muted, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <div key={c.id} style={{ ...C.glassStyle, background: C.glass, border: `1px solid ${C.glassBorder}`, borderRadius: 10, padding: '11px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ flex: 1, fontSize: 13, color: C.text, fontWeight: 500 }}>{c.name}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: C.blue, background: 'var(--color-primary-subtle)', border: '1px solid var(--color-primary-subtle)', borderRadius: 5, padding: '2px 8px' }}>{c.weight}%</span>
                      <button onClick={() => setEditingCrit({ id: c.id, name: c.name, weight: String(c.weight) })} title="Editar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.subtle, display: 'flex', padding: 4 }}>
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => deleteCriterion(c.id)} title="Remover" style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.subtle, display: 'flex', padding: 4 }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )
                ))}

                {/* Add form */}
                {criteriaAdding && (
                  <div style={{ ...C.glassStyle, background: C.glass, border: `1px solid ${C.glassBorderBright}`, borderRadius: 10, padding: '12px 14px', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <input
                      value={newCritName}
                      onChange={e => setNewCritName(e.target.value)}
                      placeholder="Ex: Apresentação oral"
                      style={{ flex: 1, minWidth: 140, background: C.bgAlt, border: `1px solid ${C.border}`, borderRadius: 7, padding: '6px 10px', color: C.text, fontSize: 13, fontFamily: 'inherit', outline: 'none' }}
                      onKeyDown={e => { if (e.key === 'Enter') addCriterion(); if (e.key === 'Escape') setCriteriaAdding(false) }}
                      autoFocus
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <input
                        type="number" min="1" max="100" step="1"
                        value={newCritWeight}
                        onChange={e => setNewCritWeight(e.target.value)}
                        style={{ width: 54, background: C.bgAlt, border: `1px solid ${C.border}`, borderRadius: 7, padding: '6px 8px', color: C.text, fontSize: 13, fontFamily: 'inherit', outline: 'none', textAlign: 'right' }}
                      />
                      <span style={{ fontSize: 12, color: C.muted }}>%</span>
                    </div>
                    <button onClick={addCriterion} disabled={critSaving || !newCritName.trim()} style={{ background: C.blue, border: 'none', borderRadius: 7, padding: '6px 12px', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: (!newCritName.trim() || critSaving) ? 0.5 : 1 }}>
                      {critSaving ? '…' : 'Adicionar'}
                    </button>
                    <button onClick={() => setCriteriaAdding(false)} style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 7, padding: '6px 10px', color: C.muted, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                      Cancelar
                    </button>
                  </div>
                )}

                {/* Weight total */}
                {criteria.length > 0 && (() => {
                  const total = criteria.reduce((s, c) => s + Number(c.weight), 0)
                  const ok = Math.abs(total - 100) < 0.1
                  return (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '4px 4px 0' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: ok ? C.green : C.yellow }}>
                        Total: {total.toFixed(0)}% {ok ? '✓' : '(idealmente 100%)'}
                      </span>
                    </div>
                  )
                })()}
              </div>
            )}
          </div>
        )}

        {/* Tasks — professor sets them, students check them off individually */}
        {(isTeacher || tasks.length > 0) && (
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ListChecks size={14} color={C.muted} />
                <span style={{ fontSize: 13, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                  Tarefas
                </span>
                {tasks.length > 0 && <span style={{ fontSize: 11, fontWeight: 700, color: C.subtle }}>{tasks.length}</span>}
              </div>
              {isTeacher && (
                <button
                  onClick={() => setShowTaskModal(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--color-primary-subtle)', border: '1px solid var(--color-primary-subtle)', borderRadius: 7, padding: '6px 12px', color: C.blue, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  <Plus size={13} /> Nova tarefa
                </button>
              )}
            </div>

            {tasks.length === 0 ? (
              <div style={{ ...C.glassStyle, background: C.glass, border: `1px dashed ${C.glassBorder}`, borderRadius: 10, padding: '20px', textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: 13, color: C.muted }}>Ainda sem tarefas para esta turma.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {tasks.map(t => {
                  const done = myCompletedTaskIds.has(t.id)
                  const taskOverdue = t.due_date && new Date(t.due_date + 'T23:59:59') < new Date()
                  const overdue = taskOverdue && !done
                  const students = members.filter(m => m.role !== 'professor')
                  const doneCount = taskCompletionCounts[t.id] || 0
                  const expanded = expandedTaskId === t.id
                  const completedBy = new Map((taskCompletions[t.id] || []).map(c => [c.user_id, c.completed_at]))
                  return (
                    <div key={t.id} style={{ ...C.glassStyle, background: C.glass, border: `1px solid ${overdue && !isTeacher ? 'var(--color-error-subtle)' : C.glassBorder}`, borderRadius: 10, padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                        {!isTeacher && (
                          <button onClick={() => toggleTaskCompletion(t.id)} style={{ background: 'none', border: 'none', padding: 2, cursor: 'pointer', marginTop: 1, flexShrink: 0 }}>
                            {done ? <CheckCircle size={18} color={C.green} /> : <Circle size={18} color={C.subtle} />}
                          </button>
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: done ? C.muted : C.text, textDecoration: done ? 'line-through' : 'none' }}>{t.title}</div>
                          {t.description && <div style={{ fontSize: 12, color: C.muted, marginTop: 3, lineHeight: 1.5 }}>{t.description}</div>}
                          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 6, flexWrap: 'wrap' }}>
                            {t.due_date && (
                              <span style={{ fontSize: 11, color: overdue ? 'var(--color-error)' : C.subtle, display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: overdue ? 700 : 400 }}>
                                <Calendar size={11} />
                                {new Date(t.due_date + 'T00:00:00').toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' })}
                                {overdue && !isTeacher && ' — atrasada'}
                              </span>
                            )}
                            {isTeacher && students.length > 0 && (
                              <button
                                onClick={() => setExpandedTaskId(expanded ? null : t.id)}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 11, fontWeight: 600, color: doneCount === students.length ? C.green : taskOverdue && doneCount < students.length ? 'var(--color-error)' : C.subtle }}
                              >
                                <div style={{ width: 52, height: 4, background: C.border, borderRadius: 999, overflow: 'hidden' }}>
                                  <div style={{ width: `${students.length ? (doneCount / students.length) * 100 : 0}%`, height: '100%', background: doneCount === students.length ? C.green : C.blue, borderRadius: 999 }} />
                                </div>
                                {doneCount} de {students.length}
                                <ChevronDown size={12} style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }} />
                              </button>
                            )}
                          </div>
                        </div>
                        {isTeacher && (
                          <>
                            <button onClick={() => setEditingTask(t)} className="icon-btn-ghost" title="Editar tarefa">
                              <Pencil size={14} color={C.subtle} />
                            </button>
                            <button onClick={() => setDeletingTask(t)} className="icon-btn-ghost" title="Remover tarefa">
                              <Trash2 size={14} color={C.subtle} />
                            </button>
                          </>
                        )}
                      </div>

                      {/* Teacher: per-student completion detail */}
                      {isTeacher && expanded && (
                        <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.border}`, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 6 }}>
                          {[...students]
                            .sort((a, b) => {
                              const aDone = completedBy.has(a.user_id), bDone = completedBy.has(b.user_id)
                              if (aDone !== bDone) return aDone ? 1 : -1
                              return (a.full_name || '').localeCompare(b.full_name || '')
                            })
                            .map(m => {
                              const at = completedBy.get(m.user_id)
                              const missing = !at
                              return (
                                <div key={m.user_id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 8, background: missing ? (taskOverdue ? 'var(--color-error-subtle)' : 'transparent') : 'var(--color-success-subtle)' }}>
                                  {missing
                                    ? <Circle size={13} color={taskOverdue ? 'var(--color-error)' : C.subtle} style={{ flexShrink: 0 }} />
                                    : <CheckCircle size={13} color={C.green} style={{ flexShrink: 0 }} />}
                                  <Avatar avatarUrl={m.avatar_url} name={m.full_name} size={20} />
                                  <span style={{ fontSize: 12, fontWeight: 600, color: missing ? C.muted : C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                                    {m.full_name}
                                  </span>
                                  {at && (
                                    <span style={{ fontSize: 10, color: C.subtle, flexShrink: 0 }}>
                                      {new Date(at).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' })}
                                    </span>
                                  )}
                                </div>
                              )
                            })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Ranking */}
        {(rankingEnabled || isTeacher) && (() => {
          // Build ranking: best score per student (their projects in this turma)
          const studentMembers = members.filter(m => m.role !== 'professor')
          const ranked = studentMembers.map(m => {
            const studentProjects = projects.filter(p => p.user_id === m.user_id && p.score != null)
            const best = studentProjects.reduce((top, p) => p.score > (top?.score ?? -1) ? p : top, null)
            return { ...m, bestProject: best, bestScore: best?.score ?? null }
          }).sort((a, b) => {
            if (a.bestScore == null && b.bestScore == null) return 0
            if (a.bestScore == null) return 1
            if (b.bestScore == null) return -1
            return b.bestScore - a.bestScore
          })

          const medals = ['🥇', '🥈', '🥉']

          return (
            <div style={{ marginBottom: 32 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Trophy size={14} color={C.muted} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                    Ranking da turma
                  </span>
                </div>
                {isTeacher && (
                  <button
                    onClick={toggleRanking}
                    disabled={rankingToggling}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      background: rankingEnabled ? 'var(--color-success-subtle)' : C.bgAlt,
                      border: `1px solid ${rankingEnabled ? 'var(--color-success-subtle)' : C.border}`,
                      borderRadius: 7, padding: '5px 11px', cursor: rankingToggling ? 'default' : 'pointer',
                      fontFamily: 'inherit', fontSize: 12, fontWeight: 700,
                      color: rankingEnabled ? 'var(--color-success)' : C.muted,
                      opacity: rankingToggling ? 0.6 : 1,
                    }}
                  >
                    <div style={{ width: 28, height: 16, borderRadius: 999, background: rankingEnabled ? 'var(--color-success)' : C.border, position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                      <div style={{ position: 'absolute', top: 2, left: rankingEnabled ? 14 : 2, width: 12, height: 12, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
                    </div>
                    {rankingEnabled ? 'Visível para a turma' : 'Só visível para ti'}
                  </button>
                )}
              </div>

              {ranked.length === 0 ? (
                <div style={{ ...C.glassStyle, background: C.glass, border: `1px dashed ${C.glassBorder}`, borderRadius: 10, padding: '20px', textAlign: 'center' }}>
                  <p style={{ margin: 0, fontSize: 13, color: C.subtle }}>Sem alunos para classificar.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {ranked.map((m, idx) => {
                    const pos = idx + 1
                    const medal = medals[idx] || null
                    const isMe = user && m.user_id === user.id
                    return (
                      <div
                        key={m.user_id}
                        onClick={isTeacher ? () => navigate(`/turma/${turma.code}/aluno/${m.user_id}`) : undefined}
                        style={{
                          ...C.glassStyle,
                          background: isMe ? 'var(--color-primary-subtle)' : C.glass,
                          border: `1px solid ${isMe ? 'var(--color-primary-subtle)' : C.glassBorder}`,
                          borderRadius: 10, padding: '11px 14px',
                          display: 'flex', alignItems: 'center', gap: 12,
                          cursor: isTeacher ? 'pointer' : 'default',
                          transition: 'background 0.12s, border-color 0.12s',
                        }}
                        onMouseEnter={isTeacher ? e => { e.currentTarget.style.background = C.glassHover; e.currentTarget.style.borderColor = C.glassBorderBright } : undefined}
                        onMouseLeave={isTeacher ? e => { e.currentTarget.style.background = isMe ? 'var(--color-primary-subtle)' : C.glass; e.currentTarget.style.borderColor = isMe ? 'var(--color-primary-subtle)' : C.glassBorder } : undefined}
                      >
                        <div style={{ width: 28, textAlign: 'center', fontSize: medal ? 18 : 13, fontWeight: 800, color: pos === 1 ? '#f59e0b' : pos === 2 ? '#94a3b8' : pos === 3 ? '#b45309' : C.subtle, flexShrink: 0 }}>
                          {medal || `${pos}º`}
                        </div>
                        <Avatar avatarUrl={m.avatar_url} name={m.full_name} size={32} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: isMe ? 700 : 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {m.full_name}{isMe && <span style={{ fontSize: 11, color: 'var(--color-primary)', marginLeft: 6, fontWeight: 700 }}>tu</span>}
                          </div>
                          {m.bestProject && (
                            <div style={{ fontSize: 11, color: C.subtle, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.bestProject.name}</div>
                          )}
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          {m.bestScore != null
                            ? <span style={{ fontSize: 16, fontWeight: 800, color: scoreColor(m.bestScore), fontFamily: 'var(--font-heading)', letterSpacing: '-0.5px' }}>{m.bestScore}</span>
                            : <span style={{ fontSize: 13, color: C.subtle }}>—</span>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {!rankingEnabled && isTeacher && (
                <p style={{ margin: '10px 0 0', fontSize: 12, color: C.subtle, textAlign: 'center' }}>
                  Ativa o ranking para os alunos também o verem.
                </p>
              )}
            </div>
          )
        })()}

        {/* Projects */}
        {sortedProjects.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                Projetos
              </span>
              <span style={{ fontSize: 11, fontWeight: 700, color: C.subtle }}>
                {sortedProjects.length}
              </span>
            </div>
            {isTeacher && selectedIds.size > 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, color: C.subtle, fontWeight: 600 }}>{selectedIds.size} selecionado{selectedIds.size !== 1 ? 's' : ''}</span>
                <button
                  onClick={() => handleBulkStatus('ready_for_defense')}
                  disabled={bulkSaving}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'var(--color-success-subtle)', border: '1px solid var(--color-success-subtle)', borderRadius: 7, padding: '6px 11px', color: 'var(--color-success)', fontSize: 12, fontWeight: 700, cursor: bulkSaving ? 'default' : 'pointer', fontFamily: 'inherit' }}
                >
                  <CheckCircle size={12} /> Pronto
                </button>
                <button
                  onClick={() => handleBulkStatus('needs_revision')}
                  disabled={bulkSaving}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.3)', borderRadius: 7, padding: '6px 11px', color: 'var(--color-warning)', fontSize: 12, fontWeight: 700, cursor: bulkSaving ? 'default' : 'pointer', fontFamily: 'inherit' }}
                >
                  <AlertTriangle size={12} /> Revisão
                </button>
                <button
                  onClick={() => setSelectedIds(new Set())}
                  disabled={bulkSaving}
                  style={{ background: 'transparent', border: 'none', color: C.muted, fontSize: 12, fontWeight: 600, cursor: bulkSaving ? 'default' : 'pointer', fontFamily: 'inherit', padding: '6px 4px' }}
                >
                  Limpar
                </button>
              </div>
            ) : isTeacher && (
              <button
                onClick={() => navigate(`/projeto/${sortedProjects[0].slug}`, {
                  state: {
                    reviewQueue: sortedProjects.map(p => p.slug),
                    reviewIndex: 0,
                    turmaCode: turma.code,
                    turmaName: turma.name,
                    turmaId: turma.id,
                  },
                })}
                style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--color-primary-subtle)', border: '1px solid var(--color-primary-subtle)', borderRadius: 7, padding: '7px 12px', color: C.blue, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                <GraduationCap size={13} /> Avaliar todos
              </button>
            )}
          </div>
        )}
        {sortedProjects.length === 0 ? (
          <div style={{ ...C.glassStyle, background: C.glass, border: `1px solid ${C.glassBorder}`, borderRadius: 12, padding: '60px 32px', textAlign: 'center' }}>
            <div style={{ marginBottom: 14 }}><Inbox size={44} color="var(--color-text-tertiary)" /></div>
            <p style={{ color: C.text, fontSize: 17, fontWeight: 700, margin: '0 0 8px' }}>Ainda não há projetos</p>
            {isTeacher ? (
              <p style={{ color: C.muted, fontSize: 14, margin: 0 }}>Partilha o código <strong style={{ color: C.blue }}>{turma.code}</strong> com os teus alunos para que adicionem os seus projetos.</p>
            ) : (
              <>
                <p style={{ color: C.muted, fontSize: 14, margin: '0 0 24px' }}>Sê o primeiro a adicionar o teu projeto a esta turma.</p>
                {user && (
                  <button onClick={() => setShowAdd(true)} style={{ background: 'var(--color-primary)', border: 'none', borderRadius: 8, padding: '10px 22px', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 2px 8px var(--color-primary-subtle)' }}>
                    + Adicionar o meu projeto
                  </button>
                )}
              </>
            )}
          </div>
        ) : isTeacher ? (
          /* Professor table view */
          <div style={{ ...C.glassStyle, background: C.glass, border: `1px solid ${C.glassBorder}`, borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
            {/* Table header */}
            <div style={{ display: 'grid', gridTemplateColumns: '28px minmax(160px,1fr) 60px 64px 120px 88px 130px', gap: 0, padding: '10px 16px', borderBottom: `1px solid ${C.border}`, background: 'var(--color-bg)', minWidth: 668, alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={sortedProjects.length > 0 && selectedIds.size === sortedProjects.length}
                onChange={() => setSelectedIds(selectedIds.size === sortedProjects.length ? new Set() : new Set(sortedProjects.map(p => p.id)))}
                style={{ cursor: 'pointer' }}
              />
              {[['name','Projeto'], [null,'Nota'], ['score','Score'], ['completude','Completude'], ['updated','Data'], [null,'Ações']].map(([field, label]) => (
                <div key={label} onClick={() => field && toggleSort(field)} style={{ fontSize: 11, fontWeight: 700, color: field ? (sortBy === field ? C.blue : C.muted) : C.muted, textTransform: 'uppercase', letterSpacing: 0.5, cursor: field ? 'pointer' : 'default', display: 'flex', alignItems: 'center', gap: 4, userSelect: 'none' }}>
                  {label}
                  {field && sortBy === field && (sortAsc ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                </div>
              ))}
            </div>
            {sortedProjects.map((p, i) => {
              const completude = computeCompletude(p)
              const updated = p.created_at ? new Date(p.created_at).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' }) : '—'
              return (
                <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '28px minmax(160px,1fr) 60px 64px 120px 88px 130px', gap: 0, padding: '12px 16px', borderBottom: i < sortedProjects.length - 1 ? `1px solid ${C.border}` : 'none', alignItems: 'center', transition: 'background 0.12s', minWidth: 668 }}
                  onMouseEnter={e => e.currentTarget.style.background = C.glassHover}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(p.id)}
                    onChange={() => toggleSelected(p.id)}
                    onClick={e => e.stopPropagation()}
                    style={{ cursor: 'pointer' }}
                  />
                  <div style={{ minWidth: 0, paddingRight: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }} onClick={() => goToProject(p.slug)}>
                      {p.review_status && (
                        <span
                          title={p.review_status === 'ready_for_defense' ? 'Pronto para defesa' : p.review_status === 'resubmitted' ? 'Correções enviadas — rever de novo' : 'Precisa de revisão'}
                          style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: p.review_status === 'ready_for_defense' ? 'var(--color-success)' : p.review_status === 'resubmitted' ? 'var(--color-primary)' : 'var(--color-warning)' }}
                        />
                      )}
                      <div style={{ fontSize: 14, fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.name}
                      </div>
                    </div>
                    {p.creator_name && <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{p.creator_name}</div>}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: p.teacher_score == null ? C.subtle : p.teacher_score >= 16 ? C.green : p.teacher_score >= 10 ? C.blue : 'var(--color-warning)' }}>
                    {p.teacher_score != null ? `${p.teacher_score}/20` : '—'}
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: scoreColor(p.score) }}>{p.score ?? '—'}</div>
                  <div style={{ paddingRight: 8 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: completude >= 80 ? C.green : completude >= 50 ? C.yellow : C.muted, marginBottom: 4 }}>{completude}%</div>
                    <div style={{ height: 4, borderRadius: 2, background: C.border, overflow: 'hidden' }}>
                      <div style={{ width: `${completude}%`, height: '100%', background: completude >= 80 ? C.green : completude >= 50 ? C.yellow : 'var(--color-warning)', borderRadius: 2 }} />
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: C.muted }}>{updated}</div>
                  <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                    <button onClick={() => goToProject(p.slug)} style={{ fontSize: 12, padding: '5px 11px', borderRadius: 6, border: `1px solid ${C.border}`, background: 'transparent', color: C.muted, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>Ver</button>
                    <button onClick={() => setFeedbackProject(p)} title="Feedback" style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid var(--color-primary-subtle)', background: 'var(--color-primary-subtle)', color: C.blue, cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0 }}><MessageSquare size={12} /></button>
                    <button onClick={() => removeProject(p.id)} title="Remover" style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid var(--color-error-subtle)', background: 'transparent', color: 'var(--color-error)', cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0 }}><X size={12} /></button>
                  </div>
                </div>
              )
            })}
            </div>
          </div>
        ) : (
          /* Student grid view */
          <div className="turmapage-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
            {sortedProjects.map(p => (
              <ProjectCard key={p.id} project={p} navigate={navigate} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
