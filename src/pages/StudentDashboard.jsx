import { useEffect, useState, useMemo, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Navbar } from '../components/Navbar'
import SkillsPicker from '../components/SkillsPicker'
import { calculatePotential } from '../lib/score'
import {
  Rocket, Plus, Users2, ChevronRight, User, Globe, MessageSquare, Star,
  Check, ArrowRight, Sparkles, Pencil, ExternalLink, Copy, Share2, Link,
  Trash2, Flame, GraduationCap, ArrowUpRight, FileText,
} from 'lucide-react'
import { Button, Card, SectionLabel, Modal, ModalActions } from '../components/ui'

import ProjectPulse, { ProjectPulseEmpty } from '../components/dashboard/ProjectPulse'
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
   Modais herdados (turmas + onboarding) — inalterados na lógica
   ══════════════════════════════════════════════════════════════════════════ */

function JoinTurmaModal({ onClose, navigate, onJoined }) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [joined, setJoined] = useState(null)
  const [verified, setVerified] = useState(false)

  async function handleJoin(e) {
    e.preventDefault()
    setLoading(true); setError(null)
    const { data, error: sbErr } = await supabase.rpc('join_class_by_code', { p_code: code.toUpperCase().trim() })
    setLoading(false)
    if (sbErr || !data) { setError(sbErr && sbErr.message !== 'class_not_found' ? sbErr.message : 'Código inválido. Verifica com o professor.'); return }
    setJoined(data)
    const { error: verifyErr } = await supabase.from('class_members').select('id').eq('class_id', data.id).single()
    if (!verifyErr) setVerified(true)
    onJoined(data)
  }

  return (
    <Modal onClose={onClose} title={joined ? undefined : 'Entrar numa turma'} subtitle={joined ? undefined : 'Pede o código de 6 letras ao teu professor'}>
      {joined ? (
        <div className="dash-center">
          <div className="dash-icon-round dash-icon-round-success"><Check size={26} color="var(--color-success)" /></div>
          <h3 className="dash-onb-title">{verified ? 'Entraste na turma!' : 'Turma encontrada'}</h3>
          <p className="dash-onb-subtitle">{verified ? joined.name : `${joined.name} — não consegui confirmar o teu registo. Verifica na turma.`}</p>
          <Button fullWidth icon={<ArrowRight size={15} />} onClick={() => { navigate(`/turma/${joined.code}`); onClose() }}>Ir para a turma</Button>
        </div>
      ) : (
        <form onSubmit={handleJoin}>
          <input value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="ABC123" maxLength={6} className="dash-input" style={{ textAlign: 'center', fontSize: 24, letterSpacing: 6, fontWeight: 700 }} autoFocus />
          {error && <p style={{ color: 'var(--color-error)', fontSize: 13, marginTop: 8 }}>{error}</p>}
          <ModalActions>
            <Button type="submit" disabled={code.trim().length < 6 || loading} loading={loading} fullWidth>Entrar na turma</Button>
          </ModalActions>
        </form>
      )}
    </Modal>
  )
}

function TurmasListModal({ turmas, onClose, navigate, onJoin }) {
  return (
    <Modal onClose={onClose} title="As minhas turmas" subtitle={`${turmas.length} turma${turmas.length !== 1 ? 's' : ''}`}>
      {turmas.map(t => (
        <Card key={t.id} hoverable onClick={() => { navigate(`/turma/${t.code}`); onClose() }} padding="md">
          <div className="dash-row-3">
            <div className="dash-icon-circle dash-icon-circle-primary"><Users2 size={16} color="var(--color-primary)" /></div>
            <div className="dash-proj-info">
              <div className="dash-turma-list-name">{t.name}</div>
              {t.teacher_name && <div className="dash-turma-list-teacher">{t.teacher_name}</div>}
            </div>
            <ChevronRight size={14} color="var(--color-text-tertiary)" />
          </div>
        </Card>
      ))}
      <Button variant="secondary" fullWidth onClick={onJoin} style={{ marginTop: 8 }}>Entrar noutra turma</Button>
    </Modal>
  )
}

function OnboardingAlunoModal({ user, profile, onDismiss, claimedSlug }) {
  const navigate = useNavigate()
  const [step, setStep] = useState(claimedSlug ? -1 : 0)
  const [username, setUsername] = useState(profile?.username ?? '')
  const [bio, setBio] = useState(profile?.bio ?? '')
  const [area, setArea] = useState(profile?.area ?? '')
  const [skills, setSkills] = useState(profile?.skills ?? [])
  const [saving, setSaving] = useState(false)
  const [saveErr, setSaveErr] = useState(null)
  const [copied, setCopied] = useState(false)
  const resolvedUsername = username.trim() || profile?.username || user?.id
  const profileUrl = `${window.location.origin}/u/${resolvedUsername}`
  const TOTAL = 3
  const AREAS = ['Programação e Informática','Design e Multimédia','Marketing e Comunicação','Gestão e Administração','Eletrónica e Automação','Audiovisual e Cinema','Turismo e Hotelaria','Saúde','Desporto','Artes e Espetáculo','Construção e Engenharia','Outra']

  async function saveProfile() {
    setSaving(true); setSaveErr(null)
    const { error } = await supabase.from('profiles').upsert({ id: user.id, username: username.trim() || null, bio: bio.trim() || null, area: area || null, skills }, { onConflict: 'id' })
    setSaving(false)
    if (error) { setSaveErr(error.code === '23505' ? 'Este username já está a ser usado.' : 'Erro ao guardar.'); return }
    setStep(1)
  }

  return (
    <div className="dash-modal-overlay dash-modal-overlay-dark">
      <div className="dash-modal-card dash-modal-card-lg">
        {step === -1 && claimedSlug && (
          <div className="dash-modal-section dash-center">
            <div className="dash-icon-round dash-icon-round-success"><Check size={26} color="var(--color-success)" /></div>
            <h2 className="dash-onb-title">Olá{profile?.full_name ? ` ${profile.full_name.split(' ')[0]}` : ''}! O teu projeto está guardado.</h2>
            <p className="dash-onb-subtitle" style={{ marginBottom: 24 }}>O projeto que criaste sem conta foi guardado na tua conta.</p>
            <div className="dash-col-2">
              <Button fullWidth iconRight={<ArrowRight size={15} />} onClick={() => { onDismiss(); navigate(`/projeto/${claimedSlug}`) }}>Ir para o projeto</Button>
              <Button variant="secondary" fullWidth onClick={() => setStep(0)}>Saltar por agora</Button>
            </div>
          </div>
        )}
        {step === 0 && (
          <div className="dash-modal-section">
            <div className="dash-center-mb-sm">
              <div className="dash-icon-round dash-icon-round-primary"><User size={24} color="var(--color-primary)" /></div>
              <h2 className="dash-onb-title" style={{ marginBottom: 6 }}>Completa o teu perfil</h2>
              <p className="dash-onb-subtitle">O teu perfil é o teu cartão de visita.</p>
            </div>
            <div className="dash-col-3 dash-mb-5">
              <div>
                <SectionLabel>Username</SectionLabel>
                <div style={{ position: 'relative' }}>
                  <span className="dash-input-prefix">@</span>
                  <input type="text" value={username} onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))} placeholder="o_teu_username" maxLength={30} className="dash-input-onb" style={{ paddingLeft: 30 }} />
                </div>
              </div>
              <div>
                <SectionLabel>Bio (opcional)</SectionLabel>
                <textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="Estudante de Informática…" rows={3} maxLength={200} className="dash-input-onb" style={{ resize: 'none', lineHeight: 1.6 }} />
              </div>
              <div>
                <SectionLabel>Área (opcional)</SectionLabel>
                <select value={area} onChange={e => setArea(e.target.value)} className="dash-input-onb" style={{ cursor: 'pointer' }}>
                  <option value="">Seleciona a tua área</option>
                  {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div><SkillsPicker label="Competências (opcional)" value={skills} onChange={setSkills} max={8} /></div>
            </div>
            {saveErr && <div className="dash-error-box">{saveErr}</div>}
            <Button onClick={saveProfile} disabled={saving} loading={saving} fullWidth iconRight={<ArrowRight size={15} />}>Guardar perfil</Button>
            <button onClick={() => setStep(s => s + 1)} className="dash-skip-btn">Saltar por agora</button>
          </div>
        )}
        {step === 1 && (
          <div className="dash-modal-section dash-center">
            <div className="dash-icon-round dash-icon-round-primary"><Rocket size={24} color="var(--color-primary)" /></div>
            <h2 className="dash-onb-title" style={{ marginBottom: 10 }}>Cria o teu primeiro projeto</h2>
            <p className="dash-onb-subtitle-wide">Conta-nos o que fizeste, em poucas frases. Tratamos do resto.</p>
            <Card padding="md" style={{ textAlign: 'left' }} className="dash-mb-4">
              {[
                { icon: <Pencil size={15} color="var(--color-primary)" />, text: 'Formulário guiado passo a passo' },
                { icon: <Sparkles size={15} color="var(--color-primary)" />, text: 'IA analisa e melhora cada resposta' },
                { icon: <Globe size={15} color="var(--color-primary)" />, text: 'Página pública partilhável em segundos' },
              ].map((item, i) => (
                <div key={i} className="dash-onb-feature"><span className="dash-no-shrink">{item.icon}</span>{item.text}</div>
              ))}
            </Card>
            <Button fullWidth iconRight={<ArrowRight size={15} />} onClick={() => { onDismiss(); navigate('/novo') }}>Criar projeto</Button>
            <Button variant="secondary" fullWidth onClick={() => setStep(2)} className="dash-mt-2">Já tenho projeto, avançar</Button>
            <button onClick={onDismiss} className="dash-skip-btn-dim">Saltar</button>
          </div>
        )}
        {step === 2 && (
          <div className="dash-modal-section dash-center">
            <div className="dash-icon-round dash-icon-round-success"><Share2 size={24} color="var(--color-success)" /></div>
            <h2 className="dash-onb-title" style={{ marginBottom: 10 }}>Partilha a tua página</h2>
            <p className="dash-onb-subtitle-wide">A tua página de perfil está pronta. Envia-a a quem quiseres.</p>
            <Card padding="sm" className="dash-mb-5" style={{ display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left' }}>
              <Link size={14} color="var(--color-text-secondary)" className="dash-no-shrink" />
              <span className="dash-profile-url">{profileUrl}</span>
              <Button size="sm" variant={copied ? 'ghost' : 'secondary'} icon={copied ? <Check size={12} /> : <Copy size={12} />}
                onClick={() => { navigator.clipboard.writeText(profileUrl).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2500) }) }}
                style={copied ? { color: 'var(--color-success)' } : undefined}>
                {copied ? 'Copiado!' : 'Copiar'}
              </Button>
            </Card>
            <Button fullWidth iconRight={<ArrowRight size={15} />} onClick={() => { onDismiss(); navigate(`/u/${resolvedUsername}`) }}>Ver a minha página</Button>
            <Button variant="secondary" fullWidth onClick={onDismiss} className="dash-mt-2">Ir para o dashboard</Button>
          </div>
        )}
        <div className="dash-step-dots">
          {Array.from({ length: TOTAL }).map((_, i) => (
            <div key={i} className={`dash-step-dot${i === step ? ' active' : ''}`} />
          ))}
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   StudentDashboard
   ══════════════════════════════════════════════════════════════════════════ */

export default function StudentDashboard({ user, profile }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [claimedSlug] = useState(() => location.state?.claimedSlug ?? null)

  /* ── Dados ── */
  const [projects, setProjects] = useState([])
  const [loadingProjects, setLoadingProjects] = useState(true)
  const [focusFull, setFocusFull] = useState(null)      // linha completa do projeto em foco
  const [entries, setEntries] = useState([])
  const [loadingEntries, setLoadingEntries] = useState(true)
  const [collabProjects, setCollabProjects] = useState([])
  const [turmas, setTurmas] = useState([])
  const [loadingTurmas, setLoadingTurmas] = useState(true)
  const [profNotifs, setProfNotifs] = useState([])
  const [pendingTasks, setPendingTasks] = useState([])
  const [completions, setCompletions] = useState([])
  const [reminders, setReminders] = useState([])
  const [myInterests, setMyInterests] = useState([])
  const [icsToken, setIcsToken] = useState(null)
  const [googleConnected, setGoogleConnected] = useState(null)

  /* ── UI ── */
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [showTurmasModal, setShowTurmasModal] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
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

  /* ── Onboarding ── */
  useEffect(() => {
    if (!localStorage.getItem(`showo_onb_v2_${user.id}`)) setShowOnboarding(true)
  }, [user.id])

  function dismissOnboarding() {
    localStorage.setItem(`showo_onb_v2_${user.id}`, '1')
    setShowOnboarding(false)
  }

  function dismissPotentialTutorial() {
    localStorage.setItem(`showo_tut_potential_${user.id}`, '1')
    setTutorialPotentialSeen(true)
  }

  /* ── Projetos ── */
  useEffect(() => {
    async function load() {
      let { data, error } = await supabase
        .from('projects')
        .select('id, name, slug, score, area, created_at, ai_tagline, views, defense_date, cover_url, teacher_score, project_type, is_pap, class_projects(class_id), collaborator_count:project_collaborators(count)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      if (error) {
        const fallback = await supabase.from('projects')
          .select('id, name, slug, score, area, created_at, ai_tagline, views, defense_date, cover_url, teacher_score, project_type, is_pap')
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
      if (shouldShowRecap(user.id)) setShowRecap(true)
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

  /* ── Turmas ── */
  useEffect(() => {
    async function load() {
      const lsKey = `showo_turmas_${user.id}`
      let cached = []; try { cached = JSON.parse(localStorage.getItem(lsKey) || '[]') } catch {}
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
      const dbIds = new Set(dbTurmas.map(t => t.id))
      setTurmas([...dbTurmas, ...cached.filter(t => !dbIds.has(t.id))])
      setLoadingTurmas(false)
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

  const otherProjects = projects.filter(p => p.id !== focusProject?.id)
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
  const potentialPanel = (
    <section className="sdb-panel sdb-panel--tint sdb-o-potential">
      <header className="sdb-panel-head">
        <span className="sdb-eyebrow sdb-eyebrow--brand">Potencial do perfil</span>
      </header>
      <div className="sdb-potential">
        <span className="sdb-potential-value" style={{ color: getScoreColor(potential) }}>{potential}</span>
        <span className="sdb-potential-of">/100</span>
      </div>
      <div className="sdb-potential-track">
        <span className="sdb-potential-fill" style={{ width: `${potential}%` }} />
      </div>
      <p className="sdb-potential-note">
        {projects.length === 0
          ? 'Adiciona projetos e completa o perfil para o potencial começar a subir.'
          : potential >= 80 ? 'Perfil forte. Mantém os projetos atualizados.'
          : potential >= 60 ? 'Bom caminho — completa os projetos mais fracos para subir.'
          : 'Completa os projetos e preenche o perfil para subir.'}
      </p>
      <p className="sdb-potential-disclaimer">
        O score de cada projeto é calculado por IA — não substitui a nota do professor.
      </p>
      {(profile?.username || user?.id) && (
        <button className="sdb-profile-link" onClick={() => {
          const slug = profile?.username || user?.id
          navigator.clipboard.writeText(`${window.location.origin}/u/${slug}`)
            .then(() => showToast('Link do perfil copiado.'))
        }}>
          <Link size={11} /> showo.pt/u/{profile?.username || user?.id}
        </button>
      )}
    </section>
  )

  const turmaPanel = (
    <section className="sdb-panel sdb-o-turma">
      <header className="sdb-panel-head">
        <span className="sdb-eyebrow">Turma</span>
        {turmas.length > 1 && (
          <button className="sdb-linkbtn" onClick={() => setShowTurmasModal(true)}>ver todas</button>
        )}
      </header>
      {loadingTurmas ? (
        <div className="skel skel-line" style={{ height: 14, width: '70%' }} />
      ) : turmas.length === 0 ? (
        <>
          <p className="sdb-empty-line">
            Não estás em nenhuma turma. Com o código do professor, os teus projetos
            passam a ser acompanhados por ele.
          </p>
          <button className="sdb-linkbtn sdb-linkbtn--strong" onClick={() => setShowJoinModal(true)}>
            Entrar com código
          </button>
        </>
      ) : (
        <button className="sdb-turma" onClick={() => navigate(`/turma/${turmas[0].code}`)}>
          <span className="sdb-turma-icon"><GraduationCap size={15} /></span>
          <span className="sdb-turma-body">
            <span className="sdb-turma-name">{turmas[0].name}</span>
            {turmas[0].teacher_name && <span className="sdb-turma-teacher">{turmas[0].teacher_name}</span>}
          </span>
          <ArrowUpRight size={14} />
        </button>
      )}
    </section>
  )

  /* ══════════════════════════════════════════════════════════════════════
     Render
     ══════════════════════════════════════════════════════════════════════ */

  return (
    <div className="sdb-root">
      <Navbar />

      {showOnboarding && (
        <OnboardingAlunoModal user={user} profile={profile} onDismiss={dismissOnboarding} claimedSlug={claimedSlug} />
      )}
      <div className={`dash-toast${toast ? ' visible' : ''}`}>{toast}</div>

      {showJoinModal && (
        <JoinTurmaModal onClose={() => setShowJoinModal(false)} navigate={navigate} onJoined={turma => {
          setTurmas(prev => (prev.find(t => t.id === turma.id) ? prev : [...prev, turma]))
          try {
            const lsKey = `showo_turmas_${user.id}`
            const existing = JSON.parse(localStorage.getItem(lsKey) || '[]')
            if (!existing.find(t => t.id === turma.id)) localStorage.setItem(lsKey, JSON.stringify([...existing, turma]))
          } catch {}
        }} />
      )}
      {showTurmasModal && (
        <TurmasListModal turmas={turmas} onClose={() => setShowTurmasModal(false)} navigate={navigate} onJoin={() => { setShowTurmasModal(false); setShowJoinModal(true) }} />
      )}
      {composerKind && focusFull && (
        <JournalComposer
          userId={user.id}
          project={focusFull}
          initialKind={composerKind}
          onClose={() => setComposerKind(null)}
          onCreated={entry => { setEntries(prev => [entry, ...prev]); showToast('Registo guardado no diário.') }}
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
            {!isEmptyState && (
              <>
                {contextClauses.length > 0 ? (
                  <p className="sdb-hero-context">
                    {contextClauses.map((c, i) => (
                      <span key={i}>
                        {i > 0 && <i className="sdb-hero-sep" />}
                        {c}
                      </span>
                    ))}
                  </p>
                ) : (
                  <p className="sdb-hero-context sdb-hero-context--quiet">
                    {loadingProjects ? 'A carregar o teu dia…' : 'Está tudo em dia.'}
                  </p>
                )}
                <div className="sdb-hero-actions">
                  <button className="sdb-btn sdb-btn--solid" onClick={primaryAction.onClick}>
                    {primaryAction.label}
                  </button>
                  {focusProject && (
                    <button className="sdb-btn sdb-btn--quiet" onClick={() => navigate(`/projeto/${focusProject.slug}`)}>
                      Ver projeto
                    </button>
                  )}
                </div>
              </>
            )}
          </div>

          <aside className="sdb-hero-side">
            {loadingProjects || loadingEntries ? (
              <>
                <div className="skel skel-line" style={{ height: 26, width: '55%' }} />
                <div className="skel skel-line" style={{ height: 10, width: '85%' }} />
              </>
            ) : entries.length > 0 ? (
              <>
                <div className="sdb-streak">
                  <Flame size={22} strokeWidth={2} />
                  <div className="sdb-streak-main">
                    <span className="sdb-streak-value">{streak}</span>
                    <span className="sdb-streak-label">
                      {streak === 1 ? 'semana seguida com registos' : 'semanas seguidas com registos'}
                    </span>
                  </div>
                </div>
                <div className="sdb-daystrip" aria-label="Atividade dos últimos 7 dias">
                  {last7.map(d => (
                    <span key={d.iso} className={`sdb-daystrip-day${d.active ? ' is-active' : ''}`} title={d.iso}>
                      <i />
                      {d.label}
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <NextMissionCard steps={setupSteps} userId={user.id} />
            )}
          </aside>
        </header>

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
              {loadingProjects || (focusProject && loadingEntries) ? (
                <ProjectPulse loading />
              ) : focusFull ? (
                <ProjectPulse
                  project={focusFull}
                  entries={entries}
                  coverage={coverage}
                  onLog={kind => setComposerKind(kind)}
                  onOpenReport={() => setShowReport(true)}
                  onOpenJournal={() => setShowJournal(true)}
                  onOpen={() => navigate(`/projeto/${focusFull.slug}`)}
                  onEdit={() => navigate(`/editar/${focusFull.slug}`)}
                  onDelete={() => deleteProject(focusFull.id)}
                />
              ) : (
                <ProjectPulseEmpty onCreate={() => navigate('/novo')} />
              )}
            </div>

            {focusFull && (focusFull.is_pap || focusFull.project_type === 'pap') && (
              <PapCoverageCard
                coverage={coverage}
                onOpenReport={() => setShowReport(true)}
              />
            )}

            {focusProject && (
              <div className="sdb-duo sdb-o-rhythm">
                <ActivityPanel buckets={activityBuckets} />
                <RecapsPanel recaps={recaps} />
              </div>
            )}

            {(otherProjects.length > 0 || collabProjects.length > 0) && (
              <section className="sdb-panel sdb-panel--flush sdb-o-portfolio">
                <header className="sdb-panel-head sdb-panel-head--inset">
                  <span className="sdb-eyebrow">
                    O resto do portfólio <span className="sdb-count">{otherProjects.length + collabProjects.length}</span>
                  </span>
                  <button className="sdb-linkbtn" onClick={() => navigate('/novo')}>
                    <Plus size={12} /> Novo projeto
                  </button>
                </header>
                <ul className="sdb-projlist">
                  {otherProjects.map(p => (
                    <ProjectRow key={p.id} project={p}
                      onOpen={() => navigate(`/projeto/${p.slug}`)}
                      onEdit={() => navigate(`/editar/${p.slug}`)}
                      onCopy={() => copyProjectLink(p.slug)}
                      copied={copiedSlug === p.slug}
                      onDelete={() => deleteProject(p.id)}
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
            )}

            {isEmptyState && turmaPanel}
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

            <section className="sdb-panel sdb-o-tasks">
              <header className="sdb-panel-head">
                <span className="sdb-eyebrow">
                  Tarefas {pendingTasks.length > 0 && <span className="sdb-count">{pendingTasks.length}</span>}
                </span>
              </header>
              {pendingTasks.length === 0 ? (
                <p className="sdb-empty-line">
                  {turmas.length === 0
                    ? 'As tarefas dos teus professores aparecem aqui quando entrares numa turma.'
                    : 'Sem tarefas pendentes. Está tudo feito.'}
                </p>
              ) : (
                <ul className="sdb-tasks">
                  {pendingTasks.slice(0, 5).map(t => {
                    const late = t.due_date && new Date(t.due_date + 'T23:59:59') < new Date()
                    return (
                      <li key={t.id} className={`sdb-task${justDone === t.id ? ' is-done' : ''}${late ? ' is-late' : ''}`}>
                        <button className="sdb-task-check" onClick={() => completeTask(t.id)}
                          aria-label={`Marcar "${t.title}" como concluída`}>
                          <Check size={12} />
                        </button>
                        <span className="sdb-task-body">
                          <span className="sdb-task-title">{t.title}</span>
                          <span className="sdb-task-meta">
                            {t.classes?.name}
                            {t.due_date && ` · ${new Date(t.due_date + 'T00:00:00').toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' })}`}
                            {late && ' · em atraso'}
                          </span>
                        </span>
                      </li>
                    )
                  })}
                  {pendingTasks.length > 5 && (
                    <li className="sdb-tasks-more">+{pendingTasks.length - 5} por mostrar</li>
                  )}
                </ul>
              )}
            </section>

            {!isEmptyState && potentialPanel}
            {!isEmptyState && turmaPanel}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Card PAP: cobertura do relatório ────────────────────────────────────── */

function PapCoverageCard({ coverage, onOpenReport }) {
  return (
    <section className="sdb-panel sdb-pap-card">
      <header className="sdb-panel-head">
        <span className="sdb-eyebrow">Relatório PAP</span>
        <button className="sdb-linkbtn" onClick={onOpenReport}>
          <FileText size={12} /> Ver rascunho
        </button>
      </header>
      <div className="sdb-coverage sdb-coverage--neutral">
        <div className="sdb-coverage-top">
          <span className="sdb-coverage-value">
            {coverage.covered}<span className="sdb-coverage-total">/{coverage.total}</span>
          </span>
          <span className="sdb-coverage-caption">secções com matéria</span>
        </div>
        <div className="sdb-coverage-rail sdb-coverage-rail--plain" role="img"
          aria-label={`${coverage.covered} de ${coverage.total} secções cobertas`}>
          {coverage.sections.map(s => (
            <span
              key={s.id}
              className={`sdb-coverage-seg${s.covered ? ' is-on' : ''}`}
              title={`${s.label} — ${s.covered ? 'com matéria' : 'ainda vazia'}`}
            />
          ))}
        </div>
        {coverage.missing.length > 0 ? (
          <p className="sdb-coverage-missing">
            Falta matéria em <strong>{coverage.missing.map(s => s.label).join(', ')}</strong>.
          </p>
        ) : (
          <p className="sdb-coverage-missing">
            Todas as secções têm matéria. Podes gerar o rascunho completo.
          </p>
        )}
      </div>
    </section>
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

function ProjectRow({ project, shared, onOpen, onEdit, onCopy, copied, onDelete }) {
  const [confirm, setConfirm] = useState(false)

  return (
    <li className="sdb-projrow">
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
