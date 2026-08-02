import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Navbar } from '../components/Navbar'
import SkillsPicker from '../components/SkillsPicker'
import { calculatePotential } from '../lib/score'
import {
  Rocket, Plus, Users2,
  ChevronRight, User, Globe, MessageSquare, Star,
  Check, ArrowRight, Sparkles,
  Pencil, ExternalLink, Copy, Share2, Link, Circle,
  Calendar, AlertTriangle, TrendingUp, Trophy, Clock,
} from 'lucide-react'
import {
  Button, Card, SectionLabel, Modal, ModalActions,
  EmptyState,
} from '../components/ui'

/* ── Helpers ── */

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

function timeAgoLabel(ts) {
  if (!ts) return ''
  const diff = (Date.now() - new Date(ts)) / 1000
  if (diff < 3600) return `há ${Math.max(1, Math.floor(diff / 60))} min`
  if (diff < 86400) return `há ${Math.floor(diff / 3600)}h`
  if (diff < 604800) return `há ${Math.floor(diff / 86400)} dias`
  return new Date(ts).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' })
}

/* ── Focus logic ── */

function computeFocus({ projects, myInterests, profNotifs, pendingTasks, loadingProjects }) {
  if (loadingProjects) return null
  const today = new Date(); today.setHours(0, 0, 0, 0)

  if (myInterests.length > 0) return { type: 'recruiter', data: myInterests[0] }
  if (profNotifs.length > 0) return { type: 'teacher_feedback', data: profNotifs[0] }

  const toDefense = p => Math.ceil((new Date(p.defense_date + 'T00:00:00') - today) / 86400000)
  const urgentDefense = projects
    .filter(p => p.defense_date)
    .map(p => ({ ...p, daysLeft: toDefense(p) }))
    .filter(p => p.daysLeft >= 0 && p.daysLeft <= 7)
    .sort((a, b) => a.daysLeft - b.daysLeft)[0]
  if (urgentDefense) return { type: 'defense', data: urgentDefense }

  const overdueTask = pendingTasks.find(t => t.due_date && new Date(t.due_date + 'T23:59:59') < new Date())
  if (overdueTask) return { type: 'overdue_task', data: overdueTask }

  const nearDefense = projects
    .filter(p => p.defense_date)
    .map(p => ({ ...p, daysLeft: toDefense(p) }))
    .filter(p => p.daysLeft >= 0 && p.daysLeft <= 60)
    .sort((a, b) => a.daysLeft - b.daysLeft)[0]
  if (nearDefense) return { type: 'defense', data: nearDefense }

  if (pendingTasks.length > 0) return { type: 'pending_tasks', data: pendingTasks }
  if (!projects.length) return null

  const toImprove = [...projects].filter(p => (p.score ?? 0) < 60).sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0]
  if (toImprove) return { type: 'improve_project', data: toImprove }

  const best = [...projects].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0]
  if (best) return { type: 'showcase', data: best }

  return null
}

/* ── FocusSignal — card redesenhado com ícone, fundo e botão real ── */

function FocusSignal({ focus, navigate, onDismissFeedback, onCompleteTask }) {
  if (!focus) return null

  let label, headline, sub, cta, ctaAction, icon, accentVar, bgVar

  switch (focus.type) {
    case 'recruiter': {
      const rec = focus.data.recruiterProfile
      label = 'Nova oportunidade'
      headline = `${rec.full_name || rec.username || 'Uma empresa'} tem interesse no teu trabalho`
      sub = `${rec.company ? rec.company + ' · ' : ''}projeto "${focus.data.project.name}"`
      cta = 'Responder agora'
      ctaAction = () => navigate(`/mensagens?to=${rec.id}`)
      icon = <Star size={14} />
      accentVar = '#d97706'
      bgVar = 'rgba(217,119,6,0.08)'
      break
    }
    case 'teacher_feedback': {
      label = 'Feedback do professor'
      headline = focus.data.message
      sub = timeAgoLabel(focus.data.created_at)
      cta = 'Ver projeto'
      ctaAction = () => onDismissFeedback(focus.data.id, focus.data.project_slug)
      icon = <MessageSquare size={14} />
      accentVar = 'var(--color-success)'
      bgVar = 'var(--color-success-subtle)'
      break
    }
    case 'defense': {
      const d = focus.data
      const urgency = d.daysLeft === 0 ? 'Hoje' : d.daysLeft === 1 ? 'Amanhã' : `${d.daysLeft} dias`
      label = 'Defesa do projeto'
      headline = `${d.name} — ${urgency}`
      sub = new Date(d.defense_date + 'T00:00:00').toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' })
      cta = 'Ver projeto'
      ctaAction = () => navigate(`/projeto/${d.slug}`)
      icon = <Calendar size={14} />
      accentVar = d.daysLeft <= 3 ? 'var(--color-error)' : d.daysLeft <= 7 ? 'var(--color-warning)' : 'var(--color-primary)'
      bgVar = d.daysLeft <= 3 ? 'var(--color-error-subtle)' : d.daysLeft <= 7 ? 'var(--color-warning-subtle)' : 'var(--color-primary-subtle)'
      break
    }
    case 'overdue_task': {
      label = 'Tarefa em atraso'
      headline = focus.data.title
      sub = focus.data.classes?.name || ''
      cta = 'Marcar como feita'
      ctaAction = () => onCompleteTask(focus.data.id)
      icon = <AlertTriangle size={14} />
      accentVar = 'var(--color-error)'
      bgVar = 'var(--color-error-subtle)'
      break
    }
    case 'pending_tasks': {
      const count = focus.data.length
      label = 'A fazer'
      headline = `${count} tarefa${count !== 1 ? 's' : ''} por completar`
      sub = focus.data[0].title + (focus.data[0].classes?.name ? ` — ${focus.data[0].classes.name}` : '')
      cta = null; ctaAction = null
      icon = <Clock size={14} />
      accentVar = 'var(--color-primary)'
      bgVar = 'var(--color-primary-subtle)'
      break
    }
    case 'improve_project': {
      const p = focus.data
      label = 'Próximo passo'
      headline = `"${p.name}" pode ir mais longe`
      sub = p.cover_url
        ? `Score ${p.score ?? 0}/100 — adiciona mais detalhes para subir.`
        : 'Adiciona uma capa para aumentar o score.'
      cta = 'Melhorar projeto'
      ctaAction = () => navigate(`/editar/${p.slug}`)
      icon = <TrendingUp size={14} />
      accentVar = 'var(--color-primary)'
      bgVar = 'var(--color-primary-subtle)'
      break
    }
    case 'showcase': {
      const p = focus.data
      label = 'O teu melhor projeto'
      headline = p.name
      sub = p.ai_tagline || `Score ${p.score}/100`
      cta = 'Ver projeto'
      ctaAction = () => navigate(`/projeto/${p.slug}`)
      icon = <Trophy size={14} />
      accentVar = 'var(--color-primary)'
      bgVar = 'var(--color-primary-subtle)'
      break
    }
    default:
      return null
  }

  return (
    <div className="sdash-signal-card" style={{ '--signal-accent': accentVar, '--signal-bg': bgVar }}>
      <div className="sdash-signal-header">
        <span className="sdash-signal-icon-badge">{icon}</span>
        <span className="sdash-signal-label">{label}</span>
      </div>
      <div className="sdash-signal-headline">{headline}</div>
      {sub && <div className="sdash-signal-sub">{sub}</div>}
      {cta && ctaAction && (
        <button className="sdash-signal-cta" onClick={ctaAction}>{cta} →</button>
      )}
    </div>
  )
}

/* ── FeaturedProject ── */

function FeaturedProject({ project, onView, onEdit, onCopy, copied }) {
  const scoreColor = getScoreColor(project.score)
  const hasCover = !!project.cover_url

  return (
    <div
      className={`sdash-featured${hasCover ? ' sdash-featured-has-cover' : ''}`}
      onClick={onView}
      style={hasCover ? { '--sdash-cover': `url(${project.cover_url})` } : undefined}
    >
      {hasCover && <div className="sdash-featured-cover-bg" />}
      <div className="sdash-featured-inner">
        <div className="sdash-featured-meta">
          {project.area
            ? <span className="sdash-featured-area">{project.area}</span>
            : <span />}
          {project.score != null && (
            <span className="sdash-featured-score" style={{ color: scoreColor }}>{project.score}</span>
          )}
        </div>
        <div className="sdash-featured-name">{project.name}</div>
        {project.ai_tagline && (
          <div className="sdash-featured-tagline">{project.ai_tagline}</div>
        )}
        <div className="sdash-featured-footer" onClick={e => e.stopPropagation()}>
          <button className="sdash-featured-btn" onClick={onView}>Ver projeto →</button>
          <button className="sdash-featured-ghost" onClick={onEdit} title="Editar"><Pencil size={13} /></button>
          <button className="sdash-featured-ghost" onClick={onCopy} title={copied ? 'Copiado!' : 'Copiar link'}>
            {copied ? <Check size={13} /> : <Link size={13} />}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── ProjectItem (compact row) ── */

function ProjectItem({ project, onView, onEdit, onDelete, onCopy, copied, isCollab }) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const scoreColor = getScoreColor(project.score)

  return (
    <div className="sdash-proj-item">
      <div className="sdash-proj-item-main" onClick={onView}>
        <div className="sdash-proj-item-name">{project.name}</div>
        {project.area && <div className="sdash-proj-item-area">{project.area}</div>}
      </div>
      <div className="sdash-proj-item-right">
        {project.score != null && (
          <span className="sdash-proj-item-score" style={{ color: scoreColor }}>{project.score}</span>
        )}
        <div className="sdash-proj-item-actions">
        {confirmDelete ? (
          <>
            <Button size="sm" variant="danger" onClick={e => { e.stopPropagation(); onDelete(project.id); setConfirmDelete(false) }}>Sim</Button>
            <Button size="sm" variant="secondary" onClick={e => { e.stopPropagation(); setConfirmDelete(false) }}>Não</Button>
          </>
        ) : (
          <>
            <button onClick={e => { e.stopPropagation(); onEdit() }} className="dash-ghost-btn" title="Editar"><Pencil size={14} /></button>
            <button onClick={e => { e.stopPropagation(); onCopy() }} className="dash-ghost-btn" title={copied ? 'Copiado!' : 'Copiar link'}>
              {copied ? <Check size={14} color="var(--color-success)" /> : <Link size={14} />}
            </button>
            {!isCollab && (
              <button onClick={e => { e.stopPropagation(); setConfirmDelete(true) }} className="dash-ghost-btn dash-ghost-btn-danger" title="Apagar">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
                  <path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
                </svg>
              </button>
            )}
          </>
        )}
        </div>
      </div>
    </div>
  )
}

/* ── ActivityChart — sparkline de projetos criados por mês ── */

function ActivityChart({ projects }) {
  const MONTHS = 6
  const now = new Date()
  const buckets = Array.from({ length: MONTHS }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (MONTHS - 1 - i), 1)
    return {
      label: d.toLocaleDateString('pt-PT', { month: 'short' }),
      start: d,
      end: new Date(d.getFullYear(), d.getMonth() + 1, 1),
      count: 0,
    }
  })

  projects.forEach(p => {
    const d = new Date(p.created_at)
    buckets.forEach(b => { if (d >= b.start && d < b.end) b.count++ })
  })

  const max = Math.max(...buckets.map(b => b.count), 1)
  const W = 240, H = 52
  const padX = 6, padY = 6
  const innerW = W - padX * 2
  const innerH = H - padY * 2

  const pts = buckets.map((b, i) => ({
    x: padX + (i / (MONTHS - 1)) * innerW,
    y: padY + (1 - b.count / max) * innerH,
    count: b.count,
    label: b.label,
  }))

  const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
  const areaD = `${pathD} L${pts[pts.length - 1].x.toFixed(1)} ${(H - padY).toFixed(1)} L${pts[0].x.toFixed(1)} ${(H - padY).toFixed(1)} Z`

  const totalProjects = projects.length
  const recentMonth = buckets[buckets.length - 1].count
  const subLabel = totalProjects === 0
    ? 'Ainda sem projetos'
    : recentMonth > 0
      ? `${recentMonth} projeto${recentMonth !== 1 ? 's' : ''} este mês`
      : `${totalProjects} projeto${totalProjects !== 1 ? 's' : ''} no total`

  return (
    <div className="sdash-activity-block">
      <div className="sdash-activity-header">
        <span className="sdash-context-label" style={{ marginBottom: 0 }}>Atividade</span>
        <span className="sdash-activity-sub">{subLabel}</span>
      </div>
      <svg
        width="100%"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="sdash-activity-chart"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="sdash-act-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaD} fill="url(#sdash-act-grad)" />
        <path d={pathD} fill="none" stroke="var(--color-primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        {pts.map((p, i) => (
          p.count > 0 && (
            <circle key={i} cx={p.x} cy={p.y} r="2.5" fill="var(--color-primary)" />
          )
        ))}
      </svg>
      <div className="sdash-activity-months">
        {buckets.map((b, i) => (
          <span key={i} className="sdash-activity-month">{b.label}</span>
        ))}
      </div>
    </div>
  )
}

/* ── CalendarBlock — próximas defesas com sync ── */

function makeGoogleCalURL(title, dateStr) {
  const d = new Date(dateStr + 'T09:00:00')
  const end = new Date(dateStr + 'T10:00:00')
  const fmt = dt => dt.toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z'
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `Defesa: ${title}`,
    dates: `${fmt(d)}/${fmt(end)}`,
    details: `Defesa do projeto "${title}" via Showo`,
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

function makeICSContent(title, dateStr) {
  const d = new Date(dateStr + 'T09:00:00')
  const end = new Date(dateStr + 'T10:00:00')
  const fmt = dt => dt.toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z'
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'BEGIN:VEVENT',
    `DTSTART:${fmt(d)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:Defesa: ${title}`,
    `DESCRIPTION:Defesa do projeto "${title}" via Showo`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
}

function CalendarBlock({ projects }) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const upcoming = projects
    .filter(p => p.defense_date && new Date(p.defense_date + 'T00:00:00') >= today)
    .sort((a, b) => a.defense_date < b.defense_date ? -1 : 1)
    .slice(0, 3)

  if (!upcoming.length) return null

  function downloadICS(project) {
    const content = makeICSContent(project.name, project.defense_date)
    const blob = new Blob([content], { type: 'text/calendar' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `defesa-${project.name.replace(/\s+/g, '-').toLowerCase()}.ics`
    a.click(); URL.revokeObjectURL(url)
  }

  return (
    <div className="sdash-context-block sdash-cal-block">
      <div className="sdash-cal-header">
        <span className="sdash-context-label" style={{ marginBottom: 0 }}>Próximas defesas</span>
        <Calendar size={13} color="var(--color-text-tertiary)" />
      </div>
      <div className="sdash-cal-list">
        {upcoming.map(p => {
          const d = new Date(p.defense_date + 'T00:00:00')
          const daysLeft = Math.ceil((d - today) / 86400000)
          const urgencyColor = daysLeft <= 3 ? 'var(--color-error)' : daysLeft <= 7 ? 'var(--color-warning)' : 'var(--color-text-tertiary)'
          return (
            <div key={p.id} className="sdash-cal-row">
              <div className="sdash-cal-date-badge">
                <span className="sdash-cal-day">{d.getDate()}</span>
                <span className="sdash-cal-mon">{d.toLocaleDateString('pt-PT', { month: 'short' })}</span>
              </div>
              <div className="sdash-cal-info">
                <div className="sdash-cal-name">{p.name}</div>
                <div className="sdash-cal-days" style={{ color: urgencyColor }}>
                  {daysLeft === 0 ? 'Hoje' : daysLeft === 1 ? 'Amanhã' : `em ${daysLeft} dias`}
                </div>
              </div>
              <div className="sdash-cal-actions">
                <a
                  href={makeGoogleCalURL(p.name, p.defense_date)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="sdash-cal-btn"
                  title="Google Calendar"
                >G</a>
                <button
                  className="sdash-cal-btn"
                  onClick={() => downloadICS(p)}
                  title="Apple Calendar / iCal"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 4h16v16H4zM16 2v4M8 2v4M4 10h16"/></svg>
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ── PotentialBlock ── */

function PotentialBlock({ projects, profile, username, copiedSlug, setCopiedSlug }) {
  const withScore = projects.filter(p => p.score != null)
  if (!withScore.length) return null

  const { potential } = profile
    ? calculatePotential({ projects, profile })
    : { potential: 0 }

  const incomplete = projects.filter(p => (p.score ?? 0) < 70).length
  const best = Math.max(...withScore.map(p => p.score))

  let narrative
  if (potential >= 80) narrative = 'Perfil muito forte. Continua assim.'
  else if (potential >= 60) narrative = incomplete > 0
    ? `${incomplete} projeto${incomplete !== 1 ? 's' : ''} por completar para subir.`
    : `Melhor projeto: ${best}/100.`
  else if (potential >= 40) narrative = 'Completa mais detalhes nos projetos para crescer.'
  else narrative = 'Adiciona imagem de capa e descrição para melhorar.'

  return (
    <div className="sdash-context-block sdash-context-block--blue">
      <div className="sdash-context-label">Potencial</div>
      <div className="sdash-potential-number" style={{ color: getScoreColor(potential) }}>{potential}</div>
      <div className="sdash-potential-sub">de 100</div>
      <div className="sdash-potential-narrative">{narrative}</div>
      {username && (
        <button
          className="sdash-profile-link"
          onClick={() => {
            navigator.clipboard.writeText(`${window.location.origin}/u/${username}`).then(() => {
              setCopiedSlug('__profile__')
              setTimeout(() => setCopiedSlug(null), 1500)
            })
          }}
        >
          {copiedSlug === '__profile__'
            ? <><Check size={11} /> Copiado</>
            : <><Link size={11} /> showo.pt/u/{username}</>}
        </button>
      )}
    </div>
  )
}

/* ── TurmaBlock ── */

function TurmaBlock({ turmas, loadingTurmas, onJoin, navigate, showModal }) {
  if (loadingTurmas) return null

  if (turmas.length === 0) {
    return (
      <div className="sdash-context-block sdash-context-block--turma">
        <div className="sdash-context-label">Turma</div>
        <div className="sdash-turma-empty-text">Não estás em nenhuma turma ainda.</div>
        <button className="sdash-cta-link" onClick={onJoin}>Entrar com código →</button>
      </div>
    )
  }

  const t = turmas[0]
  const handleClick = () => turmas.length === 1 ? navigate(`/turma/${t.code}`) : showModal()

  return (
    <div className="sdash-context-block sdash-context-block--turma sdash-context-block-clickable" onClick={handleClick}>
      <div className="sdash-context-label">Turma</div>
      <div className="sdash-turma-name-block">
        {turmas.length === 1 ? t.name : `${turmas.length} turmas`}
      </div>
      {turmas.length === 1 && t.teacher_name && (
        <div className="sdash-turma-teacher-block">{t.teacher_name}</div>
      )}
      {turmas.length > 1 && (
        <div className="sdash-turma-teacher-block">{turmas.map(tt => tt.name).join(' · ')}</div>
      )}
    </div>
  )
}

/* ── TasksBlock ── */

function TasksBlock({ tasks, onComplete }) {
  return (
    <div className="sdash-context-block">
      <div className="sdash-context-label">
        Tarefas{' '}
        <span style={{ color: 'var(--color-text-secondary)', textTransform: 'none', letterSpacing: 0, fontWeight: 600 }}>
          · {tasks.length} pendente{tasks.length !== 1 ? 's' : ''}
        </span>
      </div>
      <div className="sdash-tasks-list">
        {tasks.slice(0, 4).map(t => {
          const isOverdue = t.due_date && new Date(t.due_date + 'T23:59:59') < new Date()
          return (
            <div key={t.id} className="sdash-task-row">
              <button className="sdash-task-check" onClick={() => onComplete(t.id)} title="Marcar como feita">
                <Circle size={14} color={isOverdue ? 'var(--color-error)' : 'var(--color-text-tertiary)'} />
              </button>
              <div className="sdash-task-info">
                <span className="sdash-task-title">{t.title}</span>
                {t.due_date && (
                  <span className="sdash-task-due" style={{ color: isOverdue ? 'var(--color-error)' : undefined }}>
                    {new Date(t.due_date + 'T00:00:00').toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' })}
                    {isOverdue ? ' · atrasada' : ''}
                  </span>
                )}
              </div>
            </div>
          )
        })}
        {tasks.length > 4 && (
          <div className="sdash-tasks-more">+{tasks.length - 4} mais</div>
        )}
      </div>
    </div>
  )
}

/* ── RecruiterBand ── */

function RecruiterBand({ interests, navigate }) {
  return (
    <div className="sdash-recruiter-band">
      <div className="sdash-recruiter-band-label">
        <Star size={11} /> Interesse de empresa
      </div>
      {interests.map((item) => {
        const rec = item.recruiterProfile
        return (
          <div key={`${item.recruiterProfile?.id}-${item.project?.id}`} className="sdash-recruiter-row">
            <div className="sdash-recruiter-info">
              <span className="sdash-recruiter-who">{rec.full_name || rec.username || 'Recrutador'}</span>
              {rec.company && <span className="sdash-recruiter-company"> · {rec.company}</span>}
              <span className="sdash-recruiter-project"> — {item.project.name}</span>
            </div>
            <div className="sdash-recruiter-actions">
              {rec.username && (
                <button className="dash-ghost-btn" onClick={() => navigate(`/u/${rec.username}`)} title="Ver perfil">
                  <ExternalLink size={13} />
                </button>
              )}
              <Button size="sm" variant="secondary" icon={<MessageSquare size={11} />} onClick={() => navigate(`/mensagens?to=${rec.id}`)}>
                Responder
              </Button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ── Modals ── */

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

function OnboardingAlunoModal({ user, profile, onDismiss, firstProject, claimedSlug }) {
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

  const [projects, setProjects] = useState([])
  const [loadingProjects, setLoadingProjects] = useState(true)
  const [collabProjects, setCollabProjects] = useState([])
  const [studentTurmas, setStudentTurmas] = useState([])
  const [loadingStudentTurmas, setLoadingStudentTurmas] = useState(true)
  const [profNotifs, setProfNotifs] = useState([])
  const [pendingTasks, setPendingTasks] = useState([])
  const [myInterests, setMyInterests] = useState([])

  const [showJoinModal, setShowJoinModal] = useState(false)
  const [showTurmasModal, setShowTurmasModal] = useState(false)
  const [showOnboardingAluno, setShowOnboardingAluno] = useState(false)
  const [toast, setToast] = useState('')
  const [copiedSlug, setCopiedSlug] = useState(null)

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 3000) }
  function dismissOnboardingAluno() { localStorage.setItem(`showo_onb_v2_${user.id}`, '1'); setShowOnboardingAluno(false) }

  function copyProjectLink(slug) {
    navigator.clipboard.writeText(`${window.location.origin}/projeto/${slug}`).then(() => {
      setCopiedSlug(slug); setTimeout(() => setCopiedSlug(null), 2500)
    })
  }

  /* ── Onboarding ── */
  useEffect(() => {
    if (!localStorage.getItem(`showo_onb_v2_${user.id}`)) setShowOnboardingAluno(true)
  }, [user.id])

  /* ── Own projects ── */
  useEffect(() => {
    async function load() {
      let { data, error } = await supabase
        .from('projects')
        .select('id, name, slug, score, area, created_at, ai_tagline, views, defense_date, ai_feedback, cover_url, teacher_score, project_type, class_projects(class_id), collaborator_count:project_collaborators(count)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      if (error) {
        const fallback = await supabase.from('projects')
          .select('id, name, slug, score, area, created_at, ai_tagline, views, defense_date, ai_feedback, cover_url, teacher_score, project_type')
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

  async function deleteProject(id) {
    await supabase.from('projects').delete().eq('id', id).eq('user_id', user.id)
    setProjects(prev => prev.filter(p => p.id !== id))
    showToast('Projeto eliminado.')
  }

  /* ── Collab projects ── */
  useEffect(() => {
    async function load() {
      const { data: collabs } = await supabase.from('project_collaborators').select('project_id').eq('user_id', user.id).eq('status', 'accepted')
      if (!collabs?.length) return
      const { data: projs } = await supabase.from('projects').select('id, name, slug, score, area, ai_tagline, creator_name, created_at, views').in('id', collabs.map(c => c.project_id)).order('score', { ascending: false })
      setCollabProjects(projs || [])
    }
    load()
  }, [user.id])

  /* ── Student turmas ── */
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
      setStudentTurmas([...dbTurmas, ...cached.filter(t => !dbIds.has(t.id))])
      setLoadingStudentTurmas(false)
    }
    load()
  }, [user.id])

  /* ── Pending tasks ── */
  useEffect(() => {
    async function load() {
      const { data: memberships } = await supabase.from('class_members').select('class_id').eq('user_id', user.id)
      if (!memberships?.length) { setPendingTasks([]); return }
      const classIds = [...new Set(memberships.map(m => m.class_id))]
      const { data: taskRows } = await supabase.from('class_tasks').select('id, title, due_date, class_id, classes(name, teacher_id)').in('class_id', classIds)
      if (!taskRows?.length) { setPendingTasks([]); return }
      const { data: myCompletions } = await supabase.from('class_task_completions').select('task_id').eq('user_id', user.id).in('task_id', taskRows.map(t => t.id))
      const doneIds = new Set((myCompletions || []).map(c => c.task_id))
      setPendingTasks(taskRows.filter(t => !doneIds.has(t.id)).sort((a, b) => (a.due_date || '9999') < (b.due_date || '9999') ? -1 : 1))
    }
    load()
  }, [user.id])

  async function completePendingTask(taskId) {
    const task = pendingTasks.find(t => t.id === taskId)
    setPendingTasks(prev => prev.filter(t => t.id !== taskId))
    await supabase.from('class_task_completions').insert({ task_id: taskId, user_id: user.id })
    if (task?.classes?.teacher_id) {
      const studentName = profile?.full_name || user?.user_metadata?.full_name || 'Um aluno'
      supabase.rpc('create_notification', { p_user_id: task.classes.teacher_id, p_type: 'TASK_COMPLETED', p_message: `${studentName} concluiu a tarefa "${task.title}" em "${task.classes.name}".` })
    }
  }

  /* ── Prof notifications ── */
  useEffect(() => {
    supabase.from('notifications').select('id, message, project_slug, created_at').eq('user_id', user.id).eq('type', 'TEACHER_FEEDBACK').eq('read', false).order('created_at', { ascending: false }).limit(5).then(({ data }) => { if (data) setProfNotifs(data) })
  }, [user.id])

  async function dismissProfNotif(id, slug) {
    setProfNotifs(prev => prev.filter(n => n.id !== id))
    await supabase.from('notifications').update({ read: true }).eq('id', id)
    if (slug) navigate(`/projeto/${slug}`)
  }

  /* ── Recruiter interest ── */
  useEffect(() => {
    async function load() {
      const { data: myProjs } = await supabase.from('projects').select('id, name, slug').eq('user_id', user.id)
      if (!myProjs?.length) return
      const projMap = {}; myProjs.forEach(p => { projMap[p.id] = p })
      const { data: interests } = await supabase.from('recruiter_interests').select('recruiter_id, project_id, created_at').in('project_id', myProjs.map(p => p.id)).order('created_at', { ascending: false })
      if (!interests?.length) return
      const recruiterIds = [...new Set(interests.map(i => i.recruiter_id))]
      const { data: profs } = await supabase.from('profiles').select('id, full_name, username, avatar_url, company, role').in('id', recruiterIds)
      const profMap = {}; profs?.forEach(p => { profMap[p.id] = p })
      setMyInterests(interests.map(i => ({ ...i, recruiterProfile: profMap[i.recruiter_id], project: projMap[i.project_id] })).filter(i => i.recruiterProfile && i.project))
    }
    load()
  }, [user.id])

  /* ── Render ── */
  const firstName = getDisplayName(user)

  const greeting = (() => {
    const h = new Date().getHours()
    if (h >= 5 && h < 12) return `Bom dia, ${firstName}`
    if (h >= 12 && h < 20) return `Boa tarde, ${firstName}`
    return `Boa noite, ${firstName}`
  })()

  const motivational = (() => {
    if (loadingProjects) return null
    const bestScore = projects.length ? Math.max(...projects.map(p => p.score ?? 0)) : null
    if (bestScore !== null && bestScore >= 85) return 'O teu portfólio está a destacar-se.'
    if (bestScore !== null && bestScore >= 65) return 'Bom caminho. Continua a construir.'
    if (projects.length === 0) return 'Vamos começar o teu portfólio.'
    const h = new Date().getHours()
    if (h < 10) return 'Cedo, mas cedo é bom.'
    if (h >= 22) return 'O melhor trabalho às vezes sai à noite.'
    return 'O teu trabalho fala por ti.'
  })()

  const focus = computeFocus({ projects, myInterests, profNotifs, pendingTasks, loadingProjects })

  const today = new Date(); today.setHours(0, 0, 0, 0)
  const withDefense = projects
    .filter(p => p.defense_date)
    .map(p => ({ ...p, daysLeft: Math.ceil((new Date(p.defense_date + 'T00:00:00') - today) / 86400000) }))
    .filter(p => p.daysLeft >= 0)
    .sort((a, b) => a.daysLeft - b.daysLeft)
  const featuredProject = withDefense[0] || [...projects].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0]
  const restProjects = projects.filter(p => p.id !== featuredProject?.id)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', fontFamily: 'var(--font-body)', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      {showOnboardingAluno && (
        <OnboardingAlunoModal user={user} profile={profile} onDismiss={dismissOnboardingAluno} firstProject={projects[0] ?? null} claimedSlug={claimedSlug} />
      )}

      <div className={`dash-toast${toast ? ' visible' : ''}`}>{toast}</div>

      {showJoinModal && <JoinTurmaModal onClose={() => setShowJoinModal(false)} navigate={navigate} onJoined={(turma) => {
        setStudentTurmas(prev => prev.find(t => t.id === turma.id) ? prev : [...prev, turma])
        try { const lsKey = `showo_turmas_${user.id}`; const existing = JSON.parse(localStorage.getItem(lsKey) || '[]'); if (!existing.find(t => t.id === turma.id)) localStorage.setItem(lsKey, JSON.stringify([...existing, turma])) } catch {}
      }} />}
      {showTurmasModal && <TurmasListModal turmas={studentTurmas} onClose={() => setShowTurmasModal(false)} navigate={navigate} onJoin={() => setShowJoinModal(true)} />}

      <div className="page-content" style={{ paddingTop: 64, paddingBottom: 80 }}>
        <div className="sdash-grid">

          {/* LEFT — Greeting + Projects + Activity */}
          <div className="sdash-projects-col">
            <div className="sdash-greeting">
              <div className="sdash-greeting-line">
                <span className="sdash-greeting-text">{greeting}</span>
                <span className="sdash-role-tag">Aluno</span>
              </div>
              {motivational && <p className="sdash-greeting-motivational">{motivational}</p>}
              <span className="sdash-greeting-date">
                {new Date().toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' })}
              </span>
            </div>

            {loadingProjects ? (
              <div className="sdash-skeleton-col">
                <div className="skel skel-card sdash-skel-featured" />
                {[1, 2].map(i => (
                  <div key={i} className="skel skel-card sdash-skel-row" style={{ animationDelay: `${i * 0.1}s` }} />
                ))}
              </div>
            ) : projects.length === 0 ? (
              <EmptyState
                icon={<Rocket size={28} />}
                title="O teu portfólio começa aqui"
                description="Cria o teu primeiro projeto e partilha o que estás a construir."
                action={() => navigate('/novo')}
                actionLabel="Criar projeto"
              />
            ) : (
              <>
                <div className="sdash-section-header">
                  <span className="sdash-section-title">
                    Projetos{projects.length > 1 ? ` · ${projects.length}` : ''}
                  </span>
                  <Button size="sm" variant="secondary" icon={<Plus size={13} />} onClick={() => navigate('/novo')}>
                    Novo
                  </Button>
                </div>

                {featuredProject && (
                  <FeaturedProject
                    project={featuredProject}
                    onView={() => navigate(`/projeto/${featuredProject.slug}`)}
                    onEdit={() => navigate(`/editar/${featuredProject.slug}`)}
                    onCopy={() => copyProjectLink(featuredProject.slug)}
                    copied={copiedSlug === featuredProject.slug}
                  />
                )}

                {restProjects.length > 0 && (
                  <div className="sdash-project-list">
                    {restProjects.map(p => (
                      <ProjectItem
                        key={p.id}
                        project={p}
                        onView={() => navigate(`/projeto/${p.slug}`)}
                        onEdit={() => navigate(`/editar/${p.slug}`)}
                        onDelete={deleteProject}
                        onCopy={() => copyProjectLink(p.slug)}
                        copied={copiedSlug === p.slug}
                      />
                    ))}
                  </div>
                )}
              </>
            )}

            {collabProjects.length > 0 && !loadingProjects && (
              <>
                <div className="sdash-collab-label">Partilhados comigo · {collabProjects.length}</div>
                <div className="sdash-project-list">
                  {collabProjects.map(p => (
                    <ProjectItem
                      key={p.id}
                      project={p}
                      isCollab
                      onView={() => navigate(`/projeto/${p.slug}`)}
                      onEdit={() => navigate(`/projeto/${p.slug}`)}
                      onDelete={() => {}}
                      onCopy={() => copyProjectLink(p.slug)}
                      copied={copiedSlug === p.slug}
                    />
                  ))}
                </div>
              </>
            )}

            {myInterests.length > 0 && focus?.type !== 'recruiter' && (
              <RecruiterBand interests={myInterests} navigate={navigate} />
            )}

            {!loadingProjects && (
              <ActivityChart projects={projects} />
            )}
          </div>

          {/* RIGHT — Signal + Potential + Calendar + Turma + Tasks */}
          <div className="sdash-context-col">
            {loadingProjects ? (
              <div className="sdash-signal-card" style={{ '--signal-accent': 'var(--color-border)', '--signal-bg': 'var(--color-surface)' }}>
                <div className="skel skel-line" style={{ height: 10, width: 80, borderRadius: 3, marginBottom: 10 }} />
                <div className="skel skel-line" style={{ height: 15, width: '100%', borderRadius: 4, marginBottom: 6 }} />
                <div className="skel skel-line" style={{ height: 15, width: '65%', borderRadius: 4 }} />
              </div>
            ) : focus ? (
              <FocusSignal
                focus={focus}
                navigate={navigate}
                onDismissFeedback={dismissProfNotif}
                onCompleteTask={completePendingTask}
              />
            ) : null}

            {!loadingProjects && (
              <PotentialBlock
                projects={projects}
                profile={profile}
                username={profile?.username}
                copiedSlug={copiedSlug}
                setCopiedSlug={setCopiedSlug}
              />
            )}

            {!loadingProjects && (
              <CalendarBlock projects={projects} />
            )}

            <TurmaBlock
              turmas={studentTurmas}
              loadingTurmas={loadingStudentTurmas}
              onJoin={() => setShowJoinModal(true)}
              navigate={navigate}
              showModal={() => setShowTurmasModal(true)}
            />

            {pendingTasks.length > 0 && (
              <TasksBlock tasks={pendingTasks} onComplete={completePendingTask} />
            )}

            {!loadingProjects && projects.length === 0 && profile?.username && (
              <div className="sdash-context-block">
                <div className="sdash-context-label">O teu perfil</div>
                <button
                  className="sdash-profile-link sdash-profile-link-standalone"
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/u/${profile.username}`).then(() => {
                      setCopiedSlug('__profile__'); setTimeout(() => setCopiedSlug(null), 1500)
                    })
                  }}
                >
                  {copiedSlug === '__profile__'
                    ? <><Check size={11} /> Copiado</>
                    : <><Link size={11} /> showo.pt/u/{profile.username}</>}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
