import { useEffect, useState, useMemo, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Navbar } from '../components/Navbar'
import SkillsPicker from '../components/SkillsPicker'
import { calculatePotential, calculateScore } from '../lib/score'
import {
  Rocket, Plus, User, Globe, MessageSquare, Star,
  Check, ArrowRight, Sparkles, Pencil, ExternalLink, Copy, Share2, Link,
  Trash2, Flame, ArrowUpRight, Trophy, Pin, BookOpen, X, Layers,
} from 'lucide-react'
import { Button, Card, SectionLabel, Modal, Select } from '../components/ui'
import { useAuth } from '../context/AuthContext'

// ProjectPulse removed — focus project now shown as auto-pinned card
import JournalComposer from '../components/dashboard/JournalComposer'
import JournalDrawer from '../components/dashboard/JournalDrawer'
import ReportPanel from '../components/dashboard/ReportPanel'
import AgendaPanel from '../components/dashboard/AgendaPanel'
import { ActivityPanel } from '../components/dashboard/RhythmPanel'
import WeeklyRecap, { shouldShowRecap, RecapsPanel } from '../components/dashboard/WeeklyRecap'
import AddReminderModal from '../components/dashboard/AddReminderModal'
import CalendarSyncModal from '../components/dashboard/CalendarSyncModal'
import '../components/dashboard/MonthCalendar.css'
import {
  computeReportCoverage, computeWeekStreak, buildWeeklyActivity, computeEngagementSignal,
  timeAgoLabel, startOfDay,
} from '../lib/journal'
import './Dashboard.css'          // modais e toast partilhados (namespace dash-*)
import './StudentDashboard.css'

/* ══════════════════════════════════════════════════════════════════════════
   Helpers
   ══════════════════════════════════════════════════════════════════════════ */

function getScoreColor(score) {
  if (score == null) return 'var(--color-text-tertiary)'
  if (score >= 86) return 'var(--color-success)'
  if (score >= 71) return 'var(--color-primary)'
  if (score >= 51) return 'var(--color-info)'
  if (score >= 31) return 'var(--color-warning)'
  return 'var(--color-error)'
}

function getDisplayName(user) {
  const name = user?.user_metadata?.full_name
  if (name) return name.split(' ')[0]
  return user?.email?.split('@')[0] ?? ''
}

function toISO(d) {
  const p = n => (n < 10 ? '0' + n : String(n))
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

function daysUntil(dateStr) {
  if (!dateStr) return null
  return Math.ceil((new Date(dateStr + 'T00:00:00') - startOfDay(new Date())) / 86400000)
}

/* Qual é "o projeto" do aluno neste momento: a PAP ganha sempre, depois quem
   tem defesa mais próxima, depois o mais recente. */
function pickFocusProject(projects) {
  if (!projects.length) return null
  const rank = p => {
    let r = 0
    if (p.is_pap || p.project_type === 'pap') r += 100
    const d = daysUntil(p.defense_date)
    if (d != null && d >= 0) r += 50 - Math.min(49, d / 4)
    return r
  }
  return [...projects].sort((a, b) => {
    const diff = rank(b) - rank(a)
    if (diff !== 0) return diff
    return new Date(b.created_at) - new Date(a.created_at)
  })[0]
}

/* ══════════════════════════════════════════════════════════════════════════
   StudentDashboard
   ══════════════════════════════════════════════════════════════════════════ */

export default function StudentDashboard({ user, profile }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { checkGate } = useAuth()
  /* ── Dados ── */
  const [projects, setProjects] = useState([])
  const [loadingProjects, setLoadingProjects] = useState(true)
  const [projectOfMonth, setProjectOfMonth] = useState(null)
  const [focusFull, setFocusFull] = useState(null)      // linha completa do projeto em foco
  const [entries, setEntries] = useState([])
  const [loadingEntries, setLoadingEntries] = useState(true)
  const [collabProjects, setCollabProjects] = useState([])
  const [profNotifs, setProfNotifs] = useState([])
  const [pendingTasks, setPendingTasks] = useState([])
  const [completions, setCompletions] = useState([])
  const [reminders, setReminders] = useState([])
  const [myInterests, setMyInterests] = useState([])
  const [icsToken, setIcsToken] = useState(null)
  const [googleConnected, setGoogleConnected] = useState(null)

  /* ── UI ── */
  const [tutorialPotentialSeen, setTutorialPotentialSeen] = useState(() => !!localStorage.getItem(`showo_tut_potential_${user.id}`))
  const [composerKind, setComposerKind] = useState(null)
  const [showJournal, setShowJournal] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [showAddReminder, setShowAddReminder] = useState(null)
  const [showCalendarSync, setShowCalendarSync] = useState(false)
  const [showRecap, setShowRecap] = useState(false)
  const [recaps, setRecaps] = useState([])
  const [toast, setToast] = useState('')
  const [copiedSlug, setCopiedSlug] = useState(null)
  const [justDone, setJustDone] = useState(null)

  const showToast = useCallback(msg => {
    setToast(msg); setTimeout(() => setToast(''), 3000)
  }, [])

  function copyProjectLink(slug) {
    navigator.clipboard.writeText(`${window.location.origin}/projeto/${slug}`).then(() => {
      setCopiedSlug(slug); setTimeout(() => setCopiedSlug(null), 2500)
    })
  }

  /* ── Projeto do Mês ── */
  useEffect(() => {
    const currentMonth = new Date().toISOString().slice(0, 7)
    supabase
      .from('project_of_month')
      .select('month, note, project:project_id (id, name, slug, area, ai_tagline, score, cover_url, preview_style, user_id, creator_name)')
      .eq('month', currentMonth)
      .maybeSingle()
      .then(({ data }) => {
        if (!data?.project) return
        supabase.from('profiles').select('full_name, avatar_url').eq('id', data.project.user_id).maybeSingle()
          .then(({ data: profile }) => setProjectOfMonth({ ...data, profile: profile || null }))
      })
  }, [])

  function dismissPotentialTutorial() {
    localStorage.setItem(`showo_tut_potential_${user.id}`, '1')
    setTutorialPotentialSeen(true)
  }

  /* ── Projetos ── */
  useEffect(() => {
    async function load() {
      let { data, error } = await supabase
        .from('projects')
        .select('id, name, slug, score, area, created_at, ai_tagline, views, defense_date, cover_url, teacher_score, project_type, is_pap, featured, featured_order, dashboard_pinned, class_projects(class_id), collaborator_count:project_collaborators(count)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      if (error) {
        const fallback = await supabase.from('projects')
          .select('id, name, slug, score, area, created_at, ai_tagline, views, defense_date, cover_url, teacher_score, project_type, is_pap, dashboard_pinned')
          .eq('user_id', user.id).order('created_at', { ascending: false })
        data = fallback.data
      }
      setProjects((data || []).map(p => ({
        ...p,
        collaborator_count: Array.isArray(p.collaborator_count) ? (p.collaborator_count[0]?.count ?? 0) : (p.collaborator_count ?? 0),
      })))
      setLoadingProjects(false)
    }
    load()
  }, [user.id])

  const focusProject = useMemo(() => pickFocusProject(projects), [projects])

  /* ── Projeto em foco: linha completa + diário ──
     Os campos longos só são precisos para este projeto, por isso não vale a
     pena arrastá-los na listagem toda. */
  useEffect(() => {
    if (!focusProject) { setFocusFull(null); setEntries([]); setLoadingEntries(false); return }
    let cancelled = false
    setLoadingEntries(true)
    async function load() {
      const [{ data: full }, { data: rows }] = await Promise.all([
        supabase.from('projects')
          .select('id, name, slug, area, project_type, is_pap, defense_date, score, creator_name, school, course, goal, problem, solution, target_audience, features, technologies, challenges, results, learnings, report_draft, report_updated_at')
          .eq('id', focusProject.id).maybeSingle(),
        supabase.from('project_journal_entries')
          .select('id, kind, content, created_at')
          .eq('project_id', focusProject.id)
          .order('created_at', { ascending: false }),
      ])
      if (cancelled) return
      setFocusFull(full || focusProject)
      setEntries(rows || [])
      setLoadingEntries(false)
      // Use oldest project's created_at to guard recap from appearing on day 1
      const oldestProjectDate = projects.length ? projects[projects.length - 1].created_at : null
      if (checkGate('weeklyRecap').allowed && shouldShowRecap(user.id, oldestProjectDate)) setShowRecap(true)
    }
    load()
    return () => { cancelled = true }
  }, [focusProject?.id])

  /* ── Projetos partilhados comigo ── */
  useEffect(() => {
    async function load() {
      const { data: collabs } = await supabase.from('project_collaborators').select('project_id').eq('user_id', user.id).eq('status', 'accepted')
      if (!collabs?.length) return
      const { data: projs } = await supabase.from('projects').select('id, name, slug, score, area, ai_tagline, creator_name, created_at, views').in('id', collabs.map(c => c.project_id)).order('score', { ascending: false })
      setCollabProjects(projs || [])
    }
    load()
  }, [user.id])


  /* ── Tarefas de turma (pendentes + concluídas para o gráfico) ── */
  useEffect(() => {
    async function load() {
      const { data: memberships } = await supabase.from('class_members').select('class_id').eq('user_id', user.id)
      if (!memberships?.length) { setPendingTasks([]); setCompletions([]); return }
      const classIds = [...new Set(memberships.map(m => m.class_id))]
      const { data: taskRows } = await supabase.from('class_tasks').select('id, title, due_date, class_id, classes(name, teacher_id)').in('class_id', classIds)
      if (!taskRows?.length) { setPendingTasks([]); setCompletions([]); return }
      const { data: myCompletions } = await supabase.from('class_task_completions')
        .select('task_id, completed_at').eq('user_id', user.id).in('task_id', taskRows.map(t => t.id))
      const doneIds = new Set((myCompletions || []).map(c => c.task_id))
      setCompletions(myCompletions || [])
      setPendingTasks(taskRows.filter(t => !doneIds.has(t.id))
        .sort((a, b) => ((a.due_date || '9999') < (b.due_date || '9999') ? -1 : 1)))
    }
    load()
  }, [user.id])

  async function completeTask(taskId) {
    const task = pendingTasks.find(t => t.id === taskId)
    setJustDone(taskId)
    setTimeout(() => {
      setPendingTasks(prev => prev.filter(t => t.id !== taskId))
      setJustDone(null)
    }, 420)
    setCompletions(prev => [...prev, { task_id: taskId, completed_at: new Date().toISOString() }])
    await supabase.from('class_task_completions').insert({ task_id: taskId, user_id: user.id })
    if (task?.classes?.teacher_id) {
      const studentName = profile?.full_name || user?.user_metadata?.full_name || 'Um aluno'
      supabase.rpc('create_notification', {
        p_user_id: task.classes.teacher_id, p_type: 'TASK_COMPLETED',
        p_message: `${studentName} concluiu a tarefa "${task.title}" em "${task.classes.name}".`,
      })
    }
  }

  /* ── Recaps semanais ── */
  useEffect(() => {
    supabase.from('weekly_recaps')
      .select('id, week_start, reflection, entry_count, kinds_used, engagement_signal')
      .eq('user_id', user.id)
      .order('week_start', { ascending: false })
      .limit(6)
      .then(({ data }) => { if (data) setRecaps(data) })
  }, [user.id])

  /* ── Lembretes pessoais + token do feed ICS ── */
  useEffect(() => {
    supabase.from('personal_reminders')
      .select('id, title, reminder_date, notes, done')
      .eq('user_id', user.id).eq('done', false)
      .order('reminder_date', { ascending: true })
      .then(({ data }) => { if (data) setReminders(data) })

    supabase.rpc('get_my_ics_token')
      .then(({ data }) => { if (data) setIcsToken(data) })

    supabase.from('google_calendar_tokens').select('connected_at').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => setGoogleConnected(!!data))
  }, [user.id])

  /* ── Feedback do professor ── */
  useEffect(() => {
    supabase.from('notifications')
      .select('id, message, project_slug, created_at')
      .eq('user_id', user.id).eq('type', 'TEACHER_FEEDBACK').eq('read', false)
      .order('created_at', { ascending: false }).limit(5)
      .then(({ data }) => { if (data) setProfNotifs(data) })
  }, [user.id])

  async function openFeedback(notif) {
    setProfNotifs(prev => prev.filter(n => n.id !== notif.id))
    await supabase.from('notifications').update({ read: true }).eq('id', notif.id)
    if (notif.project_slug) navigate(`/projeto/${notif.project_slug}`)
  }

  /* ── Interesse de empresas ── */
  useEffect(() => {
    async function load() {
      const { data: myProjs } = await supabase.from('projects').select('id, name, slug').eq('user_id', user.id)
      if (!myProjs?.length) return
      const projMap = {}; myProjs.forEach(p => { projMap[p.id] = p })
      const { data: interests } = await supabase.from('recruiter_interests')
        .select('recruiter_id, project_id, created_at')
        .in('project_id', myProjs.map(p => p.id))
        .order('created_at', { ascending: false })
      if (!interests?.length) return
      const recruiterIds = [...new Set(interests.map(i => i.recruiter_id))]
      const { data: profs } = await supabase.from('profiles').select('id, full_name, username, avatar_url, company, role').in('id', recruiterIds)
      const profMap = {}; profs?.forEach(p => { profMap[p.id] = p })
      setMyInterests(interests
        .map(i => ({ ...i, recruiterProfile: profMap[i.recruiter_id], project: projMap[i.project_id] }))
        .filter(i => i.recruiterProfile && i.project))
    }
    load()
  }, [user.id])

  async function deleteProject(id) {
    await supabase.from('projects').delete().eq('id', id).eq('user_id', user.id)
    setProjects(prev => prev.filter(p => p.id !== id))
    showToast('Projeto eliminado.')
  }

  async function toggleFeatured(id) {
    const project = projects.find(p => p.id === id)
    if (!project) return
    const currentFeatured = projects.filter(p => p.featured)
    if (!project.featured && currentFeatured.length >= 3) {
      showToast('Podes destacar até 3 projetos.')
      return
    }
    const newFeatured = !project.featured
    const newOrder = newFeatured ? currentFeatured.length + 1 : null
    setProjects(prev => prev.map(p => p.id === id ? { ...p, featured: newFeatured, featured_order: newOrder } : p))
    await supabase.from('projects').update({ featured: newFeatured, featured_order: newOrder }).eq('id', id)
  }

  async function toggleDashboardPinned(id) {
    const project = projects.find(p => p.id === id)
    if (!project) return
    const currentPinned = projects.filter(p => p.dashboard_pinned)
    if (!project.dashboard_pinned && currentPinned.length >= 2) {
      showToast('Podes fixar até 2 projetos na dashboard.')
      return
    }
    const newVal = !project.dashboard_pinned
    setProjects(prev => prev.map(p => p.id === id ? { ...p, dashboard_pinned: newVal } : p))
    await supabase.from('projects').update({ dashboard_pinned: newVal }).eq('id', id)
  }

  /* ══════════════════════════════════════════════════════════════════════
     Derivados
     ══════════════════════════════════════════════════════════════════════ */

  const coverage = useMemo(
    () => computeReportCoverage(focusFull ?? focusProject ?? {}, entries),
    [focusFull, focusProject, entries],
  )

  const streak = useMemo(() => computeWeekStreak(entries), [entries])

  const activityBuckets = useMemo(
    () => buildWeeklyActivity({ entries, completions, weeks: 12 }),
    [entries, completions],
  )

  const calendarEvents = useMemo(() => {
    const list = []
    pendingTasks.forEach(t => {
      if (t.due_date) list.push({ id: `t-${t.id}`, date: t.due_date, type: 'task', title: t.title, subtitle: t.classes?.name })
    })
    reminders.forEach(r => {
      list.push({ id: `r-${r.id}`, date: r.reminder_date, type: 'reminder', title: r.title, subtitle: r.notes || null })
    })
    projects.forEach(p => {
      if (p.defense_date) list.push({ id: `d-${p.id}`, date: p.defense_date, type: 'defense', title: `Defesa — ${p.name}`, slug: p.slug })
    })
    return list
  }, [pendingTasks, reminders, projects])

  /* Últimos 7 dias: houve trabalho registado? Não é uma pontuação, é um
     espelho — mostra ao aluno o padrão dele. */
  const last7 = useMemo(() => {
    const today = startOfDay(new Date())
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today); d.setDate(d.getDate() - (6 - i))
      const iso = toISO(d)
      const active =
        entries.some(e => toISO(new Date(e.created_at)) === iso) ||
        completions.some(c => c.completed_at && toISO(new Date(c.completed_at)) === iso)
      return { iso, active, label: d.toLocaleDateString('pt-PT', { weekday: 'short' }).charAt(0).toUpperCase() }
    })
  }, [entries, completions])

  const firstName = getDisplayName(user)
  const greeting = (() => {
    const h = new Date().getHours()
    if (h >= 5 && h < 12) return `Bom dia, ${firstName}`
    if (h >= 12 && h < 20) return `Boa tarde, ${firstName}`
    return `Boa noite, ${firstName}`
  })()

  const overdueTasks = pendingTasks.filter(t => t.due_date && new Date(t.due_date + 'T23:59:59') < new Date())
  const defenseDays = daysUntil(focusProject?.defense_date)
  const lastEntry = entries[0]
  const hasDraft = profile?.project_draft && Object.keys(profile.project_draft).length > 0

  /* Frase de contexto — construída só a partir do que existe mesmo. No máximo
     três sinais, do mais urgente para o menos. */
  const contextClauses = useMemo(() => {
    if (loadingProjects) return []
    const out = []
    if (myInterests.length > 0) {
      const rec = myInterests[0].recruiterProfile
      out.push(`${rec?.company || rec?.full_name || 'Uma empresa'} mostrou interesse no teu trabalho`)
    }
    if (profNotifs.length > 0) out.push('tens feedback novo do professor')
    if (defenseDays != null && defenseDays >= 0 && defenseDays <= 45) {
      out.push(defenseDays === 0 ? 'a defesa é hoje'
        : defenseDays === 1 ? 'a defesa é amanhã'
        : `faltam ${defenseDays} dias para a defesa`)
    }
    if (overdueTasks.length > 0) {
      out.push(`${overdueTasks.length} tarefa${overdueTasks.length > 1 ? 's' : ''} em atraso`)
    } else if (pendingTasks.length > 0) {
      out.push(`${pendingTasks.length} tarefa${pendingTasks.length > 1 ? 's' : ''} por fazer`)
    }
    if (focusProject) {
      out.push(lastEntry
        ? `último registo ${timeAgoLabel(lastEntry.created_at)}`
        : 'ainda não registaste nada no diário')
    }
    if (!focusProject && !hasDraft) out.push('está na hora de criar o teu primeiro projeto')
    if (hasDraft) out.push('tens um projeto por terminar')
    return out.slice(0, 3)
  }, [loadingProjects, myInterests, profNotifs, defenseDays, overdueTasks, pendingTasks, focusProject, lastEntry, hasDraft])

  /* Ação principal — a mesma pergunta do aluno ("o que faço agora?") com uma
     resposta só. */
  const primaryAction = useMemo(() => {
    if (myInterests.length > 0) {
      return { label: 'Responder à empresa', onClick: () => navigate(`/mensagens?to=${myInterests[0].recruiter_id}`) }
    }
    if (profNotifs.length > 0) {
      return { label: 'Ver feedback do professor', onClick: () => openFeedback(profNotifs[0]) }
    }
    if (hasDraft) return { label: 'Continuar rascunho', onClick: () => navigate('/novo') }
    if (!focusProject) return { label: 'Criar o meu projeto', onClick: () => navigate('/novo') }
    return { label: 'Registar progresso', onClick: () => setComposerKind('progresso') }
  }, [myInterests, profNotifs, hasDraft, focusProject, navigate])

  const otherProjects = projects
  const engagement = useMemo(() => computeEngagementSignal(entries), [entries])
  const { potential } = profile ? calculatePotential({ projects, profile, engagement }) : { potential: 0 }
  const isEmptyState = !loadingProjects && projects.length === 0
  const showPotentialTutorial = !tutorialPotentialSeen && !loadingProjects && projects.length >= 1

  const setupSteps = [
    { done: !!(profile?.username && profile?.bio), label: 'Perfil preenchido', action: () => navigate('/settings') },
    { done: projects.length > 0, label: 'Primeiro projeto', action: () => navigate('/novo') },
    { done: entries.length > 0, label: 'Primeiro registo', action: () => focusProject && setComposerKind('progresso') },
  ]

  function handleEventClick(e) {
    if (e.type === 'defense' && e.slug) navigate(`/projeto/${e.slug}`)
  }

  /* ── Painéis partilhados (reposicionados em empty state) ── */
  const potentialPanel = (() => {
    const r = 26
    const circ = 2 * Math.PI * r
    const filled = (potential / 100) * circ
    const scoreColor = getScoreColor(potential)
    const scoreLabel = potential >= 80 ? 'Perfil forte' : potential >= 60 ? 'Bom caminho' : potential >= 40 ? 'A crescer' : 'Em início'
    const scoreHint = potential >= 80
      ? 'O teu perfil está sólido. Continua a atualizar os projetos.'
      : potential >= 60
      ? 'Falta pouco. Adiciona mais projetos e registos no diário.'
      : potential >= 40
      ? 'Completa o perfil e publica mais projetos para subir.'
      : 'Começa por completar o teu perfil e criar o primeiro projeto.'
    const slug = profile?.username
    return (
      <section className="sdb-panel sdb-panel--tint sdb-o-potential">
        <header className="sdb-panel-head">
          <span className="sdb-eyebrow sdb-eyebrow--brand">Potencial do perfil</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: scoreColor }}>{potential}/100</span>
        </header>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ position: 'relative', width: 68, height: 68, flexShrink: 0 }}>
            <svg width={68} height={68} style={{ transform: 'rotate(-90deg)', display: 'block' }}>
              <circle cx={34} cy={34} r={r} fill="none" stroke="var(--color-border)" strokeWidth={6} />
              <circle cx={34} cy={34} r={r} fill="none"
                stroke={scoreColor} strokeWidth={6}
                strokeDasharray={`${filled} ${circ}`}
                strokeLinecap="round"
                style={{ transition: 'stroke-dasharray 0.6s ease' }}
              />
            </svg>
            <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, fontWeight: 800, color: scoreColor, lineHeight: 1 }}>
              {potential}
            </span>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>{scoreLabel}</p>
            <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--color-text-tertiary)', lineHeight: 1.5 }}>{scoreHint}</p>
          </div>
        </div>
        {slug ? (
          <button className="sdb-profile-link" onClick={() => {
            navigator.clipboard.writeText(`${window.location.origin}/u/${slug}`)
              .then(() => showToast('Link do perfil copiado.'))
          }}>
            <Link size={11} /> showo.pt/u/{slug}
          </button>
        ) : (
          <button className="sdb-profile-link" onClick={() => navigate('/settings')}>
            <Link size={11} /> Completa o perfil para teres um link público
          </button>
        )}
      </section>
    )
  })()

  /* ══════════════════════════════════════════════════════════════════════
     Render
     ══════════════════════════════════════════════════════════════════════ */

  return (
    <div className="sdb-root">
      <Navbar />

<div className={`dash-toast${toast ? ' visible' : ''}`}>{toast}</div>

      {composerKind && focusFull && (
        <JournalComposer
          userId={user.id}
          project={focusFull}
          initialKind={composerKind}
          onClose={() => setComposerKind(null)}
          onCreated={entry => {
            const newEntries = [entry, ...entries]
            setEntries(newEntries)
            showToast('Registo guardado no diário.')
            // Recalculate and sync score
            if (focusFull) {
              const { score: s } = calculateScore(focusFull, newEntries)
              if (s !== focusFull.score) {
                setProjects(prev => prev.map(p => p.id === focusFull.id ? { ...p, score: s } : p))
                supabase.from('projects').update({ score: s }).eq('id', focusFull.id)
              }
            }
          }}
        />
      )}
      {showJournal && focusFull && (
        <JournalDrawer
          project={focusFull}
          entries={entries}
          onClose={() => setShowJournal(false)}
          onLog={kind => { setShowJournal(false); setComposerKind(kind) }}
          onDeleted={id => setEntries(prev => prev.filter(e => e.id !== id))}
        />
      )}
      {showReport && focusFull && (
        <ReportPanel
          project={focusFull}
          entries={entries}
          coverage={coverage}
          onClose={() => setShowReport(false)}
          onDraftSaved={(draft, at) => setFocusFull(p => ({ ...p, report_draft: draft, report_updated_at: at }))}
        />
      )}
      {showAddReminder && (
        <AddReminderModal
          userId={user.id}
          initialDate={showAddReminder instanceof Date ? showAddReminder : new Date()}
          onClose={() => setShowAddReminder(null)}
          onCreated={r => setReminders(prev => [...prev, r].sort((a, b) => (a.reminder_date < b.reminder_date ? -1 : 1)))}
        />
      )}
      {showCalendarSync && (
        <CalendarSyncModal
          userId={user.id} icsToken={icsToken}
          onClose={() => setShowCalendarSync(false)}
          onTokenRotated={t => setIcsToken(t)}
        />
      )}
      {showPotentialTutorial && (
        <PotentialTutorial potential={potential} onDismiss={dismissPotentialTutorial} />
      )}

      {showRecap && (
        <WeeklyRecap
          userId={user.id}
          project={focusFull || focusProject}
          entries={entries}
          streak={streak}
          onClose={() => setShowRecap(false)}
          onSaved={recap => {
            showToast('Recap da semana guardado.')
            setRecaps(prev => {
              const without = prev.filter(r => r.week_start !== recap.week_start)
              return [{ ...recap, id: recap.id ?? `local-${Date.now()}` }, ...without].slice(0, 6)
            })
          }}
        />
      )}

      <div className={`sdb-page${isEmptyState ? ' sdb-page--empty' : ''}`}>

        {/* ══════════════ CABEÇALHO DO DIA ══════════════ */}
        <header className="sdb-hero">
          <div className="sdb-hero-main">
            <span className="sdb-hero-date">
              {new Date().toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' })}
            </span>
            <h1 className="sdb-hero-greeting">{greeting}</h1>
          </div>

          <aside className={`sdb-hero-side${entries.length > 0 && !loadingProjects && !loadingEntries ? ' sdb-hero-side--activity' : ''}`}>
            {loadingProjects || loadingEntries ? (
              <>
                <div className="skel skel-line" style={{ height: 26, width: '55%' }} />
                <div className="skel skel-line" style={{ height: 10, width: '85%' }} />
              </>
            ) : entries.length > 0 ? (
              <>
                <span className="sdb-eyebrow" style={{ color: 'var(--color-warning)' }}>Atividade</span>
                <div className="sdb-streak-row">
                  <Flame size={14} strokeWidth={2.5} />
                  <span>{streak} {streak === 1 ? 'semana seguida' : 'semanas seguidas'}</span>
                </div>
                <div className="sdb-daydots" aria-label="Atividade dos últimos 7 dias">
                  {last7.map(d => (
                    <span key={d.iso} className={`sdb-daydot${d.active ? ' is-active' : ''}`} title={d.iso} />
                  ))}
                </div>
              </>
            ) : (
              <NextMissionCard steps={setupSteps} userId={user.id} />
            )}
          </aside>
        </header>

        {/* ══════════════ PROJETO DO MÊS ══════════════ */}
        {projectOfMonth && (() => {
          const p = projectOfMonth.project
          const profile = projectOfMonth.profile
          const displayName = profile?.full_name || p.creator_name || 'Estudante'
          const monthLabel = (() => {
            const [y, m] = projectOfMonth.month.split('-')
            return new Date(+y, +m - 1, 1).toLocaleString('pt-PT', { month: 'long', year: 'numeric' })
          })()
          const isOwn = p.user_id === user.id
          return (
            <div
              className="sdb-pom"
              onClick={() => navigate(`/projeto/${p.slug}`)}
              style={{ cursor: 'pointer' }}
            >
              {/* Cover strip */}
              {p.cover_url && (
                <div className="sdb-pom-cover">
                  <img src={p.cover_url} alt="" />
                  <div className="sdb-pom-cover-overlay" />
                </div>
              )}
              <div className="sdb-pom-body" style={{ background: !p.cover_url ? 'linear-gradient(135deg, #0c1e38 0%, #060d1a 100%)' : undefined }}>
                <div className="sdb-pom-badge">
                  <Trophy size={11} /> Projeto do mês · {monthLabel}
                </div>
                <div className="sdb-pom-info">
                  <div>
                    <div className="sdb-pom-name">{p.name}</div>
                    {p.ai_tagline && <div className="sdb-pom-tagline">{p.ai_tagline}</div>}
                    <div className="sdb-pom-author">
                      {profile?.avatar_url
                        ? <img src={profile.avatar_url} alt="" className="sdb-pom-avatar" />
                        : <div className="sdb-pom-avatar sdb-pom-avatar-fb">{displayName[0]?.toUpperCase()}</div>
                      }
                      <span>{isOwn ? 'O teu projeto!' : displayName}</span>
                    </div>
                  </div>
                  {p.score != null && (
                    <div className="sdb-pom-score">
                      <span className="sdb-pom-score-num">{p.score}</span>
                      <span className="sdb-pom-score-lbl">pts</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })()}

        {/* ══════════════ GRELHA ══════════════ */}
        <div className={`sdb-grid${isEmptyState ? ' sdb-grid--empty' : ''}`}>

          {/* ── Coluna principal ── */}
          <div className="sdb-col">

            {myInterests.length > 0 && (
              <section className="sdb-panel sdb-panel--tint sdb-o-recruiter sdb-opportunity">
                <header className="sdb-panel-head">
                  <span className="sdb-eyebrow sdb-eyebrow--brand"><Star size={11} /> Interesse de empresa</span>
                </header>
                <ul className="sdb-opportunity-list">
                  {myInterests.slice(0, 3).map(item => {
                    const rec = item.recruiterProfile
                    return (
                      <li key={`${rec.id}-${item.project.id}`}>
                        <div>
                          <strong>{rec.company || rec.full_name || rec.username}</strong>
                          <span> guardou “{item.project.name}”</span>
                        </div>
                        <Button size="sm" variant="secondary" icon={<MessageSquare size={12} />}
                          onClick={() => navigate(`/mensagens?to=${rec.id}`)}>
                          Responder
                        </Button>
                      </li>
                    )
                  })}
                </ul>
              </section>
            )}

            <div className="sdb-o-pulse">
              {(() => {
                if (loadingProjects || (focusProject && loadingEntries)) {
                  return <div className="sdb-pinned-card" style={{ height: 160, display:'flex', alignItems:'center', justifyContent:'center' }}><div className="skel" style={{ width:'80%', height:20, borderRadius:6 }} /></div>
                }
                const manuallyPinned = projects.filter(p => p.dashboard_pinned === true)
                const focusExplicitlyUnpinned = focusFull?.dashboard_pinned === false
                const showAutoFocus = focusFull && manuallyPinned.length === 0 && !focusExplicitlyUnpinned
                const focusIsPap = focusFull && (focusFull.is_pap || focusFull.project_type === 'pap')
                return (
                  <>
                    {showAutoFocus && (
                      <PinnedProjectCard
                        project={focusFull}
                        auto
                        coverage={focusIsPap ? coverage : null}
                        onOpenReport={focusIsPap ? () => setShowReport(true) : null}
                        onUnpin={() => {
                          setProjects(prev => prev.map(p => p.id === focusFull.id ? { ...p, dashboard_pinned: false } : p))
                          setFocusFull(p => ({ ...p, dashboard_pinned: false }))
                          supabase.from('projects').update({ dashboard_pinned: false }).eq('id', focusFull.id)
                        }}
                        onEdit={() => navigate(`/editar/${focusFull.slug}`)}
                        onDelete={() => deleteProject(focusFull.id)}
                        onOpen={() => navigate(`/projeto/${focusFull.slug}`)}
                        onOpenDiary={() => navigate(`/projeto/${focusFull.slug}/diario`)}
                        onLog={kind => setComposerKind(kind)}
                      />
                    )}
                    {manuallyPinned.map(pinned => {
                      const pinnedIsPap = pinned.is_pap || pinned.project_type === 'pap'
                      return (
                        <PinnedProjectCard
                          key={pinned.id}
                          project={pinned}
                          coverage={pinnedIsPap ? coverage : null}
                          onOpenReport={pinnedIsPap ? () => setShowReport(true) : null}
                          onUnpin={() => toggleDashboardPinned(pinned.id)}
                          onEdit={() => navigate(`/editar/${pinned.slug}`)}
                          onDelete={() => deleteProject(pinned.id)}
                          onOpen={() => navigate(`/projeto/${pinned.slug}`)}
                          onOpenDiary={() => navigate(`/projeto/${pinned.slug}/diario`)}
                          onLog={kind => setComposerKind(kind)}
                        />
                      )
                    })}
                  </>
                )
              })()}
            </div>

            {!isEmptyState && (
              <div className="sdb-mobile-stats">
                {checkGate('weeklyRecap').allowed ? (
                  <div className="sdb-stat-tile">
                    <span className="sdb-eyebrow" style={{ color: 'var(--color-warning)' }}>Atividade</span>
                    <div className="sdb-stat-tile-num" style={{ color: 'var(--color-warning)' }}>{streak}</div>
                    <span className="sdb-stat-tile-label">{streak === 1 ? 'semana' : 'semanas'} seguidas</span>
                    <div className="sdb-daydots" style={{ marginTop: 'auto', paddingTop: 10 }}>
                      {last7.map(d => (
                        <span key={d.iso} className={`sdb-daydot${d.active ? ' is-active' : ''}`} />
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="sdb-stat-tile">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: 26 }}>
                      <span className="sdb-eyebrow">Projetos</span>
                      <Layers size={13} color="var(--color-text-tertiary)" />
                    </div>
                    <div className="sdb-stat-tile-num">{projects.length}</div>
                    <span className="sdb-stat-tile-label">{projects.length === 1 ? 'projeto criado' : 'projetos criados'}</span>
                  </div>
                )}
                <div className="sdb-stat-tile">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: 26 }}>
                    <span className="sdb-eyebrow sdb-eyebrow--brand">Potencial</span>
                    <svg width={26} height={26} style={{ flexShrink: 0, transform: 'rotate(-90deg)' }}>
                      <circle cx={13} cy={13} r={9} fill="none" stroke="var(--color-border)" strokeWidth={2.5} />
                      <circle cx={13} cy={13} r={9} fill="none"
                        stroke={getScoreColor(potential)} strokeWidth={2.5}
                        strokeDasharray={`${(potential / 100) * 2 * Math.PI * 9} ${2 * Math.PI * 9}`}
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                  <div className="sdb-stat-tile-num" style={{ color: getScoreColor(potential) }}>{potential}</div>
                  <span className="sdb-stat-tile-label">/100</span>
                </div>
              </div>
            )}

            {isEmptyState && (
              <section className="sdb-first-project" onClick={() => navigate('/novo')}>
                <h2 className="sdb-first-project-title">Cria o teu primeiro projeto</h2>
                <Button
                  iconRight={<ArrowRight size={15} />}
                  onClick={e => { e.stopPropagation(); navigate('/novo') }}
                >
                  Começar
                </Button>
              </section>
            )}

            {isEmptyState && (
              <section
                onClick={() => navigate('/aprende')}
                style={{
                  cursor: 'pointer',
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 20,
                  padding: '24px 24px 20px',
                  display: 'flex', flexDirection: 'column', gap: 12,
                  transition: 'border-color 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--color-primary)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--color-border)'}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontSize: 18, fontWeight: 800, fontFamily: 'var(--font-heading)', letterSpacing: '-0.3px', color: 'var(--color-text)' }}>
                    Novo por aqui?
                  </span>
                  <span style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                    Em menos de 5 minutos aprendes tudo o que precisas para tirar o máximo partido do Showo.
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-primary)', fontSize: 13, fontWeight: 600 }}>
                  Ver guia <ArrowRight size={13} />
                </div>
              </section>
            )}

            {focusProject && (
              <div className="sdb-duo sdb-o-rhythm">
                <ActivityPanel buckets={activityBuckets} />
                {checkGate('weeklyRecap').allowed && <RecapsPanel recaps={recaps} />}
              </div>
            )}

            {(otherProjects.length > 0 || collabProjects.length > 0) && (() => {
              const featuredCount = projects.filter(p => p.featured).length
              const canFeature = featuredCount < 3
              const sortedOther = [...otherProjects].sort((a, b) => {
                if (a.featured && !b.featured) return -1
                if (!a.featured && b.featured) return 1
                return (a.featured_order ?? 99) - (b.featured_order ?? 99)
              })
              return (
              <section className="sdb-panel sdb-panel--flush sdb-o-portfolio">
                <header className="sdb-panel-head sdb-panel-head--inset">
                  <span className="sdb-eyebrow">
                    Portfólio <span className="sdb-count">{otherProjects.length + collabProjects.length}</span>
                  </span>
                  <button className="sdb-linkbtn" onClick={() => navigate('/novo')}>
                    <Plus size={12} /> Novo projeto
                  </button>
                </header>
                <ul className="sdb-projlist">
                  {sortedOther.map(p => (
                    <ProjectRow key={p.id} project={p}
                      onOpen={() => navigate(`/projeto/${p.slug}`)}
                      onEdit={() => navigate(`/editar/${p.slug}`)}
                      onCopy={() => copyProjectLink(p.slug)}
                      copied={copiedSlug === p.slug}
                      onDelete={() => deleteProject(p.id)}
                      onToggleFeatured={toggleFeatured}
                      canFeature={canFeature}
                      onToggleDashboardPin={toggleDashboardPinned}
                    />
                  ))}
                  {collabProjects.map(p => (
                    <ProjectRow key={p.id} project={p} shared
                      onOpen={() => navigate(`/projeto/${p.slug}`)}
                      onEdit={() => navigate(`/projeto/${p.slug}`)}
                      onCopy={() => copyProjectLink(p.slug)}
                      copied={copiedSlug === p.slug}
                    />
                  ))}
                </ul>
              </section>
              )
            })()}

          </div>

          {/* ── Coluna de contexto ── */}
          <div className="sdb-col">

            <div className="sdb-o-agenda">
              <AgendaPanel
                events={calendarEvents}
                googleConnected={googleConnected}
                onAddReminder={date => setShowAddReminder(date instanceof Date ? date : new Date())}
                onSync={() => setShowCalendarSync(true)}
                onEventClick={handleEventClick}
              />
            </div>

            {!isEmptyState && potentialPanel}

          </div>
        </div>
      </div>
    </div>
  )
}


/* ── Missão única: próximo passo do utilizador novo ──────────────────────── */

function NextMissionCard({ steps, userId }) {
  const storageKey = `showo_steps_done_${userId}`

  const firstUncompleted = steps.findIndex(s => !s.done)
  const allDone = firstUncompleted === -1

  const [animIdx, setAnimIdx] = useState(null)   // índice a animar (strikethrough)
  const [phase, setPhase] = useState('idle')     // 'idle' | 'striking' | 'out' | 'in'

  useEffect(() => {
    const prevDone = JSON.parse(localStorage.getItem(storageKey) || '[false,false,false]')
    const currDone = steps.map(s => s.done)

    // Guardar estado atual imediatamente para evitar re-animação em refresh
    localStorage.setItem(storageKey, JSON.stringify(currDone))

    // Detetar qual step foi concluído desde a última visita
    const justCompleted = prevDone.findIndex((was, i) => !was && currDone[i])
    if (justCompleted < 0) return

    setAnimIdx(justCompleted)
    setPhase('striking')

    const t1 = setTimeout(() => setPhase('out'), 700)
    const t2 = setTimeout(() => { setAnimIdx(null); setPhase('in') }, 1050)
    const t3 = setTimeout(() => setPhase('idle'), 1400)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (allDone) return null

  const displayIdx = animIdx !== null ? animIdx : firstUncompleted
  const step = steps[displayIdx]
  if (!step) return null

  return (
    <div className={`sdb-mission sdb-mission--${phase}`}>
      <span className="sdb-eyebrow">Próximos passos</span>
      <button className="sdb-mission-label" onClick={step.action}>
        {step.label}
      </button>
    </div>
  )
}

/* ── Tutorial: Potencial ──────────────────────────────────────────────────── */

function PotentialTutorial({ potential, onDismiss }) {
  const [step, setStep] = useState(0)
  const color = potential >= 80 ? 'var(--color-success)'
    : potential >= 60 ? 'var(--color-primary)'
    : potential >= 40 ? 'var(--color-info)'
    : potential >= 20 ? 'var(--color-warning)'
    : 'var(--color-error)'

  return (
    <div className="ptut-backdrop" onClick={onDismiss}>
      <div className="ptut-card" onClick={e => e.stopPropagation()}>
        {step === 0 ? (
          <>
            <span className="sdb-eyebrow sdb-eyebrow--brand">O teu perfil</span>
            <h2 className="ptut-title">O teu Potencial</h2>
            <div className="ptut-score-row">
              <span className="ptut-score" style={{ color }}>{potential}</span>
              <span className="ptut-of">/100</span>
            </div>
            <div className="ptut-bar">
              <span className="ptut-bar-fill" style={{ width: `${potential}%`, background: color }} />
            </div>
            <p className="ptut-body">
              O Potencial sobe à medida que completas projetos, usas o diário e recebes validação
              de professores e recrutadores. É o teu indicador de crescimento na plataforma e
              só tu o consegues ver.
            </p>
            <div className="ptut-actions">
              <button className="sdb-btn sdb-btn--solid" onClick={() => setStep(1)}>Continuar</button>
            </div>
          </>
        ) : (
          <>
            <span className="sdb-eyebrow sdb-eyebrow--brand">Antes de continuares</span>
            <h2 className="ptut-title">Sobre os scores dos projetos</h2>
            <p className="ptut-body">
              Os projetos têm um score gerado automaticamente pela IA com base no que
              preencheste. Serve para te dar uma ideia de onde podes melhorar antes de entregar.
            </p>
            <p className="ptut-body ptut-body--warn">
              Este score é completamente privado e não substitui a avaliação do teu professor.
              É uma ferramenta tua, não uma nota.
            </p>
            <div className="ptut-actions">
              <button className="sdb-btn sdb-btn--solid" onClick={onDismiss}>Percebi, vamos lá</button>
            </div>
          </>
        )}
        <div className="ptut-steps">
          <span className={`ptut-dot${step === 0 ? ' is-active' : ''}`} />
          <span className={`ptut-dot${step === 1 ? ' is-active' : ''}`} />
        </div>
      </div>
    </div>
  )
}

/* ── Linha de projeto (portfólio) ─────────────────────────────────────────── */

function ProjectRow({ project, shared, onOpen, onEdit, onCopy, copied, onDelete, onToggleFeatured, canFeature, onToggleDashboardPin }) {
  const [confirm, setConfirm] = useState(false)

  return (
    <li className={`sdb-projrow${project.featured ? ' sdb-projrow--featured' : ''}`}>
      <span className="sdb-projrow-score">
        <span className="sdb-projrow-num">{project.score ?? '—'}</span>
        <span className="sdb-projrow-track">
          <span className="sdb-projrow-fill" style={{ width: `${project.score ?? 0}%` }} />
        </span>
      </span>

      <button className="sdb-projrow-main" onClick={onOpen}>
        <span className="sdb-projrow-name">
          {project.name}
          {shared && <span className="sdb-projrow-tag">partilhado</span>}
        </span>
        <span className="sdb-projrow-area">{project.area || 'Sem área definida'}</span>
      </button>

      <span className="sdb-projrow-actions">
        {confirm ? (
          <>
            <button className="sdb-projrow-danger" onClick={() => { onDelete(); setConfirm(false) }}>Apagar</button>
            <button className="sdb-linkbtn" onClick={() => setConfirm(false)}>Manter</button>
          </>
        ) : (
          <>
            {onToggleDashboardPin && !shared && (
              <button
                className={`sdb-icon-btn sdb-icon-btn--quiet sdb-icon-btn--pin${project.dashboard_pinned ? ' is-pinned' : ''}`}
                onClick={() => onToggleDashboardPin(project.id)}
                title={project.dashboard_pinned ? 'Remover da dashboard' : 'Fixar na dashboard'}
                aria-label="Fixar na dashboard"
              >
                <Pin size={13} fill={project.dashboard_pinned ? 'currentColor' : 'none'} />
              </button>
            )}
            {onToggleFeatured && !shared && (
              <button
                className={`sdb-icon-btn sdb-icon-btn--quiet sdb-icon-btn--star${project.featured ? ' is-featured' : ''}`}
                onClick={() => onToggleFeatured(project.id)}
                title={project.featured ? 'Remover destaque do perfil' : canFeature ? 'Destacar no perfil' : 'Máximo de 3 destaques atingido'}
                aria-label="Destacar no perfil"
                disabled={!project.featured && !canFeature}
              >
                <Star size={13} fill={project.featured ? 'currentColor' : 'none'} />
              </button>
            )}
            <button className="sdb-icon-btn sdb-icon-btn--quiet" onClick={onEdit} title="Editar" aria-label="Editar projeto">
              <Pencil size={13} />
            </button>
            <button className="sdb-icon-btn sdb-icon-btn--quiet" onClick={onCopy}
              title={copied ? 'Copiado' : 'Copiar link'} aria-label="Copiar link do projeto">
              {copied ? <Check size={13} /> : <ExternalLink size={13} />}
            </button>
            {!shared && (
              <button className="sdb-icon-btn sdb-icon-btn--quiet sdb-icon-btn--danger"
                onClick={() => setConfirm(true)} title="Apagar" aria-label="Apagar projeto">
                <Trash2 size={13} />
              </button>
            )}
          </>
        )}
      </span>
    </li>
  )
}

/* ── Card de projecto fixado na dashboard ─────────────────────────────────── */
const TYPE_MAP = { pap: 'PAP', internship: 'Estágio', group: 'Trabalho de grupo', personal: 'Projeto pessoal', competition: 'Competição', presentation: 'Apresentação' }

function PinnedProjectCard({ project, auto, coverage, onOpenReport, onUnpin, onEdit, onDelete, onOpen, onOpenDiary, onLog }) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const typeLabel = auto ? 'Em foco' : (project.is_pap ? 'PAP' : (TYPE_MAP[project.project_type] || 'Projeto'))

  return (
    <section className="sdb-pinned-card">
      <div
        className="sdb-pinned-head"
        style={project.cover_url ? { '--cover-bg': `url(${project.cover_url})` } : {}}
        data-has-cover={!!project.cover_url}
      >
        <div className="sdb-pinned-head-left">
          <span className="sdb-pinned-type">{typeLabel}</span>
          {!confirmDelete && (
            <>
              {!auto && (
                <button className="sdb-icon-btn sdb-icon-btn--pin is-pinned" onClick={onUnpin} title="Retirar da dashboard">
                  <Pin size={14} fill="currentColor" />
                </button>
              )}
              <button className="sdb-icon-btn" onClick={onEdit} title="Editar projeto">
                <Pencil size={14} />
              </button>
            </>
          )}
        </div>
        <div className="sdb-pinned-head-right">
          {confirmDelete ? (
            <>
              <button className="sdb-pulse-danger-confirm" onClick={() => { onDelete(); setConfirmDelete(false) }}>Apagar</button>
              <button className="sdb-icon-btn" onClick={() => setConfirmDelete(false)}>✕</button>
            </>
          ) : (
            <>
              {auto && (
                <button className="sdb-icon-btn sdb-icon-btn--quiet" onClick={onUnpin} title="Remover da dashboard">
                  ✕
                </button>
              )}
              {!auto && (
                <button className="sdb-icon-btn sdb-icon-btn--danger" onClick={() => setConfirmDelete(true)} title="Apagar projeto">
                  <Trash2 size={14} />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <div className="sdb-pinned-body">
        <div className="sdb-pinned-name-row">
          <h2 className="sdb-pinned-name" title={project.name}>{project.name}</h2>
          {project.score != null && <span className="sdb-pinned-score">{project.score}</span>}
        </div>
        <div className="sdb-pinned-meta">
          {project.area && <span>{project.area}</span>}
          {project.ai_tagline && <span className="sdb-pinned-tagline">"{project.ai_tagline}"</span>}
          {project.defense_date && (() => {
            const today = new Date(); today.setHours(0,0,0,0)
            const target = new Date(project.defense_date + 'T00:00:00')
            const days = Math.ceil((target - today) / 86400000)
            if (days < 0) return null
            const label = days === 0 ? 'é hoje' : days === 1 ? 'é amanhã' : `faltam ${days} dias`
            return (
              <span className={`sdb-deadline${days <= 7 ? ' is-close' : ''}`} style={{ fontSize: 12 }}>
                {target.toLocaleDateString('pt-PT', { day: 'numeric', month: 'long' })} — {label}
              </span>
            )
          })()}
        </div>

        {coverage && (
          <div className="sdb-pinned-pap">
            <div className="sdb-coverage-rail sdb-coverage-rail--plain" style={{ margin: '6px 0 4px' }}>
              {coverage.sections.map(s => (
                <span key={s.id} className={`sdb-coverage-seg${s.covered ? ' is-on' : ''}`} title={s.label} />
              ))}
            </div>
            <div className="sdb-pinned-pap-foot">
              <span>PAP · {coverage.covered}/{coverage.total} secções</span>
              {onOpenReport && (
                <button className="sdb-linkbtn" onClick={onOpenReport}>Ver rascunho</button>
              )}
            </div>
          </div>
        )}

        <div className="sdb-pinned-foot">
          <button className="sdb-btn sdb-btn--solid sdb-btn--sm" onClick={() => onLog?.('progresso')}>
            <Plus size={13} /> Registar
          </button>
          <button className="sdb-btn sdb-btn--quiet sdb-btn--sm" onClick={onOpenDiary}>
            <BookOpen size={13} /> Diário
          </button>
          <button className="sdb-btn sdb-btn--quiet sdb-btn--sm" onClick={onOpen}>
            <ArrowUpRight size={13} /> Ver
          </button>
        </div>
      </div>
    </section>
  )
}
