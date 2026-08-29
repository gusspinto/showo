// Per-student detail page for teachers: /turma/:code/aluno/:userId
// Everything the professor needs about one student in one place — projects,
// grades, review states and task completion — without hopping between pages.
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Navbar } from '../components/Navbar'
import { FolderIcon as Folder } from '@solar-icons/react/bold/folder'
import { AltArrowLeftIcon as ChevronLeft } from '@solar-icons/react/bold/alt-arrow-left'
import { AltArrowRightIcon as ChevronRight } from '@solar-icons/react/bold/alt-arrow-right'
import { SquareArrowRightUpIcon as ExternalLink } from '@solar-icons/react/bold/square-arrow-right-up'
import { CheckCircleIcon as CheckCircle } from '@solar-icons/react/bold/check-circle'
import { RecordCircleIcon as Circle } from '@solar-icons/react/bold/record-circle'
import { DangerTriangleIcon as AlertTriangle } from '@solar-icons/react/bold/danger-triangle'
import { CheckCircleIcon as Check } from '@solar-icons/react/bold/check-circle'
import { CalendarIcon as Calendar } from '@solar-icons/react/bold/calendar'
import { ChecklistIcon as ListChecks } from '@solar-icons/react/bold/checklist'
import { ChatRoundLineIcon as MessageSquare } from '@solar-icons/react/bold/chat-round-line'
import { Book2Icon as BookOpen } from '@solar-icons/react/bold/book-2'
import { GraphNewUpIcon as TrendingUp } from '@solar-icons/react/bold/graph-new-up'
import { ClockCircleIcon as Clock } from '@solar-icons/react/bold/clock-circle'
import { CpuIcon as Cpu } from '@solar-icons/react/bold/cpu'

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

function gradeColor(g) {
  if (g == null) return C.subtle
  if (g >= 16) return C.green
  if (g >= 10) return C.blue
  return 'var(--color-warning)'
}

function Avatar({ avatarUrl, name, size = 40 }) {
  const initial = (name || '?')[0].toUpperCase()
  const colors = ['var(--color-primary)', 'var(--color-accent)', '#0d9488', 'var(--color-warning)', '#ec4899', '#10b981']
  const bg = colors[(initial.charCodeAt(0) || 0) % colors.length]
  if (avatarUrl) {
    return <img src={avatarUrl} alt="" style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
  }
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.42, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
      {initial}
    </div>
  )
}

const REVIEW_META = {
  ready_for_defense: { label: 'Pronto para defesa', color: 'var(--color-success)', Icon: CheckCircle },
  needs_revision:    { label: 'Precisa de revisão', color: 'var(--color-warning)', Icon: AlertTriangle },
  resubmitted:       { label: 'Correções enviadas', color: 'var(--color-primary)', Icon: Check },
}

const SECTION_LABELS = {
  geral: 'Nota geral', description: 'Descrição', tech: 'Tecnologias',
  metodologia: 'Metodologia', resultados: 'Resultados', apresentacao: 'Apresentação',
  links: 'Links', demo: 'Demo', team: 'Equipa', gallery: 'Galeria',
}

function InlineFeedback({ project, teacherId }) {
  const [items, setItems] = useState(null) // null = not loaded yet
  const [open, setOpen] = useState(false)
  const [comment, setComment] = useState('')
  const [fieldKey, setFieldKey] = useState('geral')
  const [saving, setSaving] = useState(false)

  async function load() {
    if (items !== null) return
    const { data } = await supabase.from('teacher_feedback').select('*').eq('project_id', project.id).eq('teacher_id', teacherId)
    setItems(data || [])
  }

  function toggle() {
    if (!open) load()
    setOpen(o => !o)
  }

  async function handleSave() {
    if (!comment.trim()) return
    setSaving(true)
    const { data } = await supabase.from('teacher_feedback')
      .upsert({ project_id: project.id, teacher_id: teacherId, field_key: fieldKey, comment: comment.trim() }, { onConflict: 'project_id,teacher_id,field_key' })
      .select().single()
    if (data) {
      setItems(prev => { const idx = (prev || []).findIndex(f => f.field_key === fieldKey); return idx >= 0 ? prev.map((f, i) => i === idx ? data : f) : [...(prev || []), data] })
      if (project.user_id) {
        supabase.rpc('create_notification', { p_user_id: project.user_id, p_type: 'TEACHER_FEEDBACK', p_message: `O teu professor deixou feedback no projeto "${project.name}".`, p_project_slug: project.slug })
      }
    }
    setComment('')
    setSaving(false)
  }

  async function handleDelete(id) {
    await supabase.from('teacher_feedback').delete().eq('id', id)
    setItems(prev => (prev || []).filter(f => f.id !== id))
  }

  const count = items?.length ?? 0

  return (
    <div style={{ marginTop: 10 }}>
      <button onClick={toggle} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 700, color: open ? C.blue : C.muted }}>
        <MessageSquare size={13} />
        {open ? 'Fechar feedback' : count > 0 ? `Feedback (${count})` : 'Deixar feedback'}
        <ChevronRight size={12} style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }} />
      </button>

      {open && (
        <div style={{ marginTop: 10, padding: '14px 16px', background: 'var(--color-bg)', border: `1px solid ${C.border}`, borderRadius: 10 }}>
          {items === null ? (
            <div style={{ fontSize: 12, color: C.subtle }}>A carregar…</div>
          ) : (
            <>
              {(items || []).length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                  {items.map(f => (
                    <div key={f.id} style={{ padding: '10px 12px', background: C.bgAlt, border: `1px solid ${C.border}`, borderRadius: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: C.blue, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                          {SECTION_LABELS[f.field_key] || f.field_key}
                        </span>
                        <button onClick={() => handleDelete(f.id)} style={{ background: 'none', border: 'none', color: C.subtle, cursor: 'pointer', fontSize: 11, padding: 0, fontFamily: 'inherit' }}>Apagar</button>
                      </div>
                      <p style={{ margin: 0, fontSize: 13, color: C.text, lineHeight: 1.5 }}>{f.comment}</p>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                {Object.entries(SECTION_LABELS).map(([k, l]) => (
                  <button key={k} onClick={() => setFieldKey(k)} style={{ fontSize: 11, padding: '3px 9px', borderRadius: 5, border: `1px solid ${fieldKey === k ? C.blue : C.border}`, background: fieldKey === k ? 'var(--color-primary-subtle)' : 'transparent', color: fieldKey === k ? C.blue : C.muted, cursor: 'pointer', fontFamily: 'inherit', fontWeight: fieldKey === k ? 700 : 400 }}>
                    {l}
                  </button>
                ))}
              </div>
              <textarea
                value={comment} onChange={e => setComment(e.target.value)}
                placeholder={`Comentário sobre ${SECTION_LABELS[fieldKey] || fieldKey}…`}
                rows={2}
                style={{ width: '100%', background: C.bgAlt, border: `1px solid ${C.border}`, borderRadius: 7, padding: '8px 10px', color: C.text, fontSize: 13, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box', outline: 'none' }}
              />
              <button onClick={handleSave} disabled={saving || !comment.trim()} style={{ marginTop: 6, background: C.blue, border: 'none', borderRadius: 7, padding: '7px 14px', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', opacity: saving || !comment.trim() ? 0.5 : 1, fontFamily: 'inherit' }}>
                {saving ? 'A guardar…' : 'Guardar'}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default function TurmaAluno() {
  const { code, userId } = useParams()
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()

  const [loading, setLoading] = useState(true)
  const [denied, setDenied] = useState(false)
  const [turma, setTurma] = useState(null)
  const [student, setStudent] = useState(null)
  const [projects, setProjects] = useState([])
  const [tasks, setTasks] = useState([])           // class tasks with this student's completion
  const [joinedAt, setJoinedAt] = useState(null)
  const [journalEntries, setJournalEntries] = useState([]) // all entries across projects in this turma

  useEffect(() => {
    if (authLoading) return
    if (!user) { setDenied(true); setLoading(false); return }
    let cancelled = false
    async function load() {
      const { data: cls } = await supabase
        .from('classes')
        .select('id, name, subject, code, teacher_id, academic_year')
        .eq('code', code.toUpperCase())
        .single()
      if (cancelled) return
      // Teacher-only page — everyone else goes back to the turma
      if (!cls || cls.teacher_id !== user.id) { setDenied(true); setLoading(false); return }
      setTurma(cls)

      const [profileRes, memberRes, cpRes, tasksRes] = await Promise.all([
        supabase.from('profiles').select('id, full_name, username, avatar_url, area, skills, available_for_work').eq('id', userId).single(),
        supabase.from('class_members').select('joined_at').eq('class_id', cls.id).eq('user_id', userId).maybeSingle(),
        supabase.from('class_projects').select('project_id').eq('class_id', cls.id),
        supabase.from('class_tasks').select('id, title, description, due_date, created_at').eq('class_id', cls.id).order('due_date', { ascending: true, nullsFirst: false }).order('created_at', { ascending: false }),
      ])
      if (cancelled) return

      setStudent(profileRes.data || null)
      setJoinedAt(memberRes.data?.joined_at || null)

      // This student's projects inside this turma
      const ids = (cpRes.data || []).map(r => r.project_id)
      if (ids.length) {
        const { data: projs } = await supabase
          .from('projects')
          .select('id, name, slug, score, area, cover_url, created_at, user_id, review_status, teacher_score, views, technologies')
          .in('id', ids)
          .eq('user_id', userId)
        if (!cancelled) setProjects(projs || [])
      }

      // Journal entries for all this student's projects in the turma
      if (ids.length) {
        const { data: journalRows } = await supabase
          .from('project_journal_entries')
          .select('id, project_id, kind, content, created_at')
          .in('project_id', ids)
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
        if (!cancelled) setJournalEntries(journalRows || [])
      }

      // Task completion for this student
      const taskRows = tasksRes.data || []
      if (taskRows.length) {
        const { data: completions } = await supabase
          .from('class_task_completions')
          .select('task_id, completed_at')
          .in('task_id', taskRows.map(t => t.id))
          .eq('user_id', userId)
        if (cancelled) return
        const doneMap = new Map((completions || []).map(c => [c.task_id, c.completed_at]))
        setTasks(taskRows.map(t => ({ ...t, completed_at: doneMap.get(t.id) || null })))
      } else {
        setTasks([])
      }

      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [code, userId, user, authLoading])

  if (loading || authLoading) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg }}>
        <Navbar />
        <div className="page-content" style={{ display: 'flex', justifyContent: 'center', paddingTop: 120 }}>
          <style>{`@keyframes ta-sh{0%{background-position:-300px 0}100%{background-position:300px 0}}`}</style>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            {[130, 85, 110].map((w, i) => (
              <div key={i} style={{ height: i === 0 ? 14 : 9, width: w, borderRadius: 6, background: 'linear-gradient(90deg,var(--color-bg-alt) 25%,var(--color-surface-hover) 50%,var(--color-bg-alt) 75%)', backgroundSize: '300px 100%', animation: `ta-sh 1.5s ease-in-out infinite ${i*0.12}s` }} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (denied || !turma) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg }}>
        <Navbar />
        <div className="page-content" style={{ textAlign: 'center', paddingTop: 100 }}>
          <p style={{ color: C.muted, fontSize: 15 }}>Esta página é só para o professor da turma.</p>
          <button onClick={() => navigate(`/turma/${code}`)} style={{ marginTop: 12, background: 'var(--color-primary-subtle)', border: '1px solid var(--color-primary-subtle)', borderRadius: 8, padding: '9px 18px', color: C.blue, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            Ir para a turma
          </button>
        </div>
      </div>
    )
  }

  const name = student?.full_name || student?.username || 'Aluno'
  const withScore = projects.filter(p => p.score != null)
  const avgScore = withScore.length ? Math.round(withScore.reduce((s, p) => s + p.score, 0) / withScore.length) : null
  const graded = projects.filter(p => p.teacher_score != null)
  const avgGrade = graded.length ? Math.round((graded.reduce((s, p) => s + p.teacher_score, 0) / graded.length) * 10) / 10 : null
  const doneTasks = tasks.filter(t => t.completed_at).length
  const skills = Array.isArray(student?.skills) ? student.skills : []

  const headingNum = { fontFamily: 'var(--font-heading)', fontVariantNumeric: 'tabular-nums', letterSpacing: '-1.5px', lineHeight: 1, fontWeight: 400 }

  // Journal analytics
  const totalEntries = journalEntries.length
  const activeDays = new Set(journalEntries.map(e => e.created_at.slice(0, 10))).size
  const lastEntry = journalEntries[0] ? new Date(journalEntries[0].created_at) : null
  const kindsUsed = [...new Set(journalEntries.map(e => e.kind))]
  const kindCounts = journalEntries.reduce((acc, e) => { acc[e.kind] = (acc[e.kind] || 0) + 1; return acc }, {})
  const allTechs = projects.flatMap(p => {
    if (!p.technologies) return []
    if (Array.isArray(p.technologies)) return p.technologies
    if (typeof p.technologies === 'string') return p.technologies.split(',').map(t => t.trim()).filter(Boolean)
    return []
  })
  const uniqueTechs = [...new Set(allTechs)].slice(0, 12)

  const KIND_LABELS = {
    progresso: 'Progresso', dificuldade: 'Dificuldade', decisao: 'Decisão',
    pesquisa: 'Pesquisa', ideia: 'Ideia', resultado: 'Resultado', nota: 'Nota',
  }
  const KIND_COLORS = {
    progresso: 'var(--color-primary)', dificuldade: 'var(--color-warning)', decisao: 'var(--color-accent)',
    pesquisa: '#0d9488', ideia: '#f59e0b', resultado: 'var(--color-success)', nota: 'var(--color-text-secondary)',
  }

  function formatRelativeDate(d) {
    const diff = Math.floor((Date.now() - d.getTime()) / 86400000)
    if (diff === 0) return 'hoje'
    if (diff === 1) return 'ontem'
    if (diff < 7) return `há ${diff} dias`
    if (diff < 30) return `há ${Math.floor(diff / 7)} sem.`
    return d.toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' })
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg }}>
      <Navbar />
      <div className="page-content" style={{ maxWidth: 900, margin: '0 auto' }}>

        {/* Back */}
        <button
          onClick={() => navigate(`/turma/${code}`)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', color: C.muted, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', padding: '0 0 18px', marginTop: 4 }}
        >
          <ChevronLeft size={15} /> {turma.name}
        </button>

        {/* Student header */}
        <div style={{ ...C.glassStyle, background: C.glass, border: `1px solid ${C.glassBorder}`, borderRadius: 14, padding: '24px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
          <Avatar avatarUrl={student?.avatar_url} name={name} size={64} />
          <div style={{ flex: 1, minWidth: 200 }}>
            <h1 style={{ margin: 0, fontSize: 'clamp(22px, 3vw, 30px)', fontWeight: 400, letterSpacing: '-0.6px', fontFamily: 'var(--font-heading)', color: C.text }}>{name}</h1>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 6, fontSize: 13, color: C.muted }}>
              {student?.area && <span>{student.area}</span>}
              {joinedAt && <span>Na turma desde {new Date(joinedAt).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
            </div>
            {skills.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                {skills.slice(0, 6).map(s => (
                  <span key={s} style={{ fontSize: 11, fontWeight: 600, color: C.muted, background: C.bgAlt, border: `1px solid ${C.border}`, borderRadius: 999, padding: '3px 10px' }}>{s}</span>
                ))}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            {student?.username && (
              <button
                onClick={() => navigate(`/u/${student.username}`)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 14px', color: C.muted, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                <ExternalLink size={13} /> Perfil público
              </button>
            )}
            <button
              onClick={() => navigate(`/mensagens?to=${userId}`, { state: { returnTo: { pathname: `/turma/${code}/aluno/${userId}`, label: name } } })}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--color-primary-subtle)', border: '1px solid var(--color-primary-subtle)', borderRadius: 8, padding: '8px 14px', color: C.blue, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              <MessageSquare size={13} /> Mensagem
            </button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 28 }}>
          {[
            { label: 'Projetos na turma', value: projects.length, color: C.blue },
            { label: 'Score médio', value: avgScore ?? '—', color: scoreColor(avgScore) },
            { label: 'Nota média', value: avgGrade != null ? `${avgGrade}` : '—', color: gradeColor(avgGrade), sub: avgGrade != null ? '/20' : null },
            { label: 'Registos no diário', value: totalEntries || '—', color: totalEntries > 0 ? 'var(--color-success)' : C.subtle },
            { label: 'Tarefas concluídas', value: tasks.length ? `${doneTasks}/${tasks.length}` : '—', color: tasks.length && doneTasks === tasks.length ? C.green : C.blue },
          ].map(s => (
            <div key={s.label} style={{ ...C.glassStyle, background: C.glass, border: `1px solid ${C.glassBorder}`, borderRadius: 12, padding: '16px 18px' }}>
              <div style={{ ...headingNum, fontSize: 30, color: s.color }}>
                {s.value}{s.sub && <span style={{ fontSize: 15, color: C.subtle }}>{s.sub}</span>}
              </div>
              <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, marginTop: 6 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Projects */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <Folder size={14} color={C.muted} />
          <span style={{ fontSize: 13, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Projetos</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: C.subtle }}>{projects.length}</span>
        </div>
        {projects.length === 0 ? (
          <div style={{ ...C.glassStyle, background: C.glass, border: `1px dashed ${C.glassBorder}`, borderRadius: 10, padding: '24px 20px', textAlign: 'center', marginBottom: 28 }}>
            <p style={{ margin: 0, fontSize: 13, color: C.muted }}>Este aluno ainda não adicionou projetos à turma.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 28 }}>
            {projects.map(p => {
              const rev = REVIEW_META[p.review_status]
              return (
                <div key={p.id}>
                  <div
                    onClick={() => navigate(`/projeto/${p.slug}`, { state: { turmaCode: turma.code, turmaName: turma.name } })}
                    style={{ ...C.glassStyle, background: C.glass, border: `1px solid ${C.glassBorder}`, borderRadius: 10, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', transition: 'background 0.12s, border-color 0.12s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = C.glassHover; e.currentTarget.style.borderColor = C.glassBorderBright }}
                    onMouseLeave={e => { e.currentTarget.style.background = C.glass; e.currentTarget.style.borderColor = C.glassBorder }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                        {rev && (
                          <span title={rev.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, color: rev.color, background: `${rev.color}14`, border: `1px solid ${rev.color}30`, borderRadius: 999, padding: '2px 8px', flexShrink: 0 }}>
                            <rev.Icon size={10} /> {rev.label}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: C.subtle, marginTop: 3 }}>
                        {p.area || 'Sem área'} · {new Date(p.created_at).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' })}
                        {p.views != null && ` · ${p.views} visualizaç${p.views === 1 ? 'ão' : 'ões'}`}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: scoreColor(p.score) }}>{p.score ?? '—'}</div>
                      <div style={{ fontSize: 10, color: C.subtle }}>score</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 44 }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: gradeColor(p.teacher_score) }}>{p.teacher_score != null ? `${p.teacher_score}/20` : '—'}</div>
                      <div style={{ fontSize: 10, color: C.subtle }}>nota</div>
                    </div>
                    <ChevronRight size={15} color={C.subtle} style={{ flexShrink: 0 }} />
                  </div>
                  <InlineFeedback project={p} teacherId={user.id} />
                </div>
              )
            })}
          </div>
        )}

        {/* Journal activity */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <BookOpen size={14} color={C.muted} />
            <span style={{ fontSize: 13, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Diário de Projeto</span>
          </div>

          {totalEntries === 0 ? (
            <div style={{ ...C.glassStyle, background: C.glass, border: `1px dashed ${C.glassBorder}`, borderRadius: 10, padding: '20px', textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: 13, color: C.subtle }}>Ainda sem registos no diário.</p>
            </div>
          ) : (
            <>
              {/* Stats row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: 14 }}>
                {[
                  { Icon: TrendingUp, label: 'Registos', value: totalEntries, color: C.blue },
                  { Icon: Clock, label: 'Dias ativos', value: activeDays, color: 'var(--color-success)' },
                  { Icon: Calendar, label: 'Último registo', value: lastEntry ? formatRelativeDate(lastEntry) : '—', color: C.text, small: true },
                ].map(s => (
                  <div key={s.label} style={{ ...C.glassStyle, background: C.glass, border: `1px solid ${C.glassBorder}`, borderRadius: 10, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: `${s.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <s.Icon size={15} color={s.color} />
                    </div>
                    <div>
                      <div style={{ fontSize: s.small ? 15 : 20, fontWeight: 700, fontFamily: 'var(--font-heading)', color: s.color, letterSpacing: '-0.5px', lineHeight: 1.1 }}>{s.value}</div>
                      <div style={{ fontSize: 10, color: C.subtle, fontWeight: 600, marginTop: 3 }}>{s.label}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Kinds used */}
              <div style={{ ...C.glassStyle, background: C.glass, border: `1px solid ${C.glassBorder}`, borderRadius: 10, padding: '14px 16px', marginBottom: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.subtle, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Tipos de registo</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {Object.entries(kindCounts).sort((a, b) => b[1] - a[1]).map(([kind, count]) => (
                    <span key={kind} style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      fontSize: 12, fontWeight: 600,
                      color: KIND_COLORS[kind] || C.muted,
                      background: `${KIND_COLORS[kind] || C.muted}14`,
                      border: `1px solid ${KIND_COLORS[kind] || C.muted}28`,
                      borderRadius: 999, padding: '4px 10px',
                    }}>
                      {KIND_LABELS[kind] || kind}
                      <span style={{ fontSize: 10, opacity: 0.7 }}>{count}</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Technologies */}
              {uniqueTechs.length > 0 && (
                <div style={{ ...C.glassStyle, background: C.glass, border: `1px solid ${C.glassBorder}`, borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                    <Cpu size={12} color={C.subtle} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: C.subtle, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Tecnologias</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {uniqueTechs.map(t => (
                      <span key={t} style={{ fontSize: 12, fontWeight: 600, color: C.muted, background: C.bgAlt, border: `1px solid ${C.border}`, borderRadius: 999, padding: '4px 10px' }}>{t}</span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Tasks */}
        {tasks.length > 0 && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <ListChecks size={14} color={C.muted} />
              <span style={{ fontSize: 13, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Tarefas</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: doneTasks === tasks.length ? C.green : C.subtle }}>{doneTasks}/{tasks.length}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 40 }}>
              {tasks.map(t => {
                const done = !!t.completed_at
                const overdue = !done && t.due_date && new Date(t.due_date + 'T23:59:59') < new Date()
                return (
                  <div key={t.id} style={{ ...C.glassStyle, background: C.glass, border: `1px solid ${overdue ? 'var(--color-error-subtle)' : C.glassBorder}`, borderRadius: 10, padding: '11px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                    {done
                      ? <CheckCircle size={16} color={C.green} style={{ flexShrink: 0 }} />
                      : <Circle size={16} color={overdue ? 'var(--color-error)' : C.subtle} style={{ flexShrink: 0 }} />}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: done ? C.muted : C.text, textDecoration: done ? 'line-through' : 'none' }}>{t.title}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, fontSize: 11 }}>
                      {t.due_date && (
                        <span style={{ color: overdue ? 'var(--color-error)' : C.subtle, display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: overdue ? 700 : 400 }}>
                          <Calendar size={11} />
                          {new Date(t.due_date + 'T00:00:00').toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' })}
                        </span>
                      )}
                      {done && (
                        <span style={{ color: C.green, fontWeight: 600 }}>
                          feita {new Date(t.completed_at).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' })}
                        </span>
                      )}
                      {overdue && <span style={{ color: 'var(--color-error)', fontWeight: 700 }}>atrasada</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
