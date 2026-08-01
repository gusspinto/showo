import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Navbar } from '../components/Navbar'
import {
  Folder, Users, Users2, Plus, ChevronRight, BarChart2,
  MessageSquare, Check, Calendar, ArrowRight, Rocket,
  TrendingUp, AlertTriangle, GraduationCap, Settings,
} from 'lucide-react'
import { academicYearOptions } from '../lib/academicYear'
import {
  Button, Card, SectionLabel, Badge, Modal, ModalActions,
  EmptyState, ProgressBar,
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

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

/* ── Sub-components ── */

function FeedItem({ icon, iconBg, title, subtitle, rightContent, onClick }) {
  return (
    <div className="dash-feed-item" onClick={onClick} style={onClick ? { cursor: 'pointer' } : undefined}>
      <div className="dash-feed-icon" style={{ background: iconBg }}>{icon}</div>
      <div className="dash-feed-body">
        <div className="dash-feed-title">{title}</div>
        {subtitle && <div className="dash-feed-sub">{subtitle}</div>}
      </div>
      {rightContent && <div className="dash-feed-right">{rightContent}</div>}
    </div>
  )
}

function FeaturedTurma({ turma, navigate }) {
  return (
    <div className="sdash-featured" onClick={() => navigate(`/turma/${turma.code}`)} style={{ marginBottom: 'var(--sp-3)' }}>
      <div className="sdash-featured-inner">
        <div className="sdash-featured-meta">
          <span className="sdash-featured-area">
            {[turma.academic_year, turma.subject].filter(Boolean).join(' · ') || 'Turma'}
          </span>
          {turma.avg_score != null && (
            <span className="sdash-featured-score" style={{ color: getScoreColor(turma.avg_score) }}>{turma.avg_score}</span>
          )}
        </div>
        <div className="sdash-featured-name">{turma.name}</div>
        <div className="sdash-featured-footer" style={{ marginTop: 'var(--sp-4)' }}>
          <button className="sdash-featured-btn" onClick={e => { e.stopPropagation(); navigate(`/turma/${turma.code}`) }}>Ver turma</button>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', marginLeft: 10 }}>
            {turma.member_count ?? 0} aluno{turma.member_count !== 1 ? 's' : ''} · {turma.project_count ?? 0} projeto{turma.project_count !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
    </div>
  )
}

function TurmaRow({ turma, navigate }) {
  return (
    <div className="sdash-proj-item" onClick={() => navigate(`/turma/${turma.code}`)}>
      <div className="sdash-proj-item-main">
        <div className="sdash-proj-item-name">{turma.name}</div>
        <div className="sdash-proj-item-area">
          {turma.code}
          {turma.academic_year ? ` · ${turma.academic_year}` : ''}
          {turma.member_count != null ? ` · ${turma.member_count} aluno${turma.member_count !== 1 ? 's' : ''}` : ''}
        </div>
      </div>
      <div className="sdash-proj-item-right">
        {turma.avg_score != null && (
          <span className="sdash-proj-item-score" style={{ color: getScoreColor(turma.avg_score) }}>{turma.avg_score}</span>
        )}
        <div className="sdash-proj-item-actions">
          <ChevronRight size={14} color="var(--color-text-tertiary)" />
        </div>
      </div>
    </div>
  )
}

function CreateTurmaModal({ onClose, onCreated, user, profile }) {
  const [name, setName] = useState('')
  const [subject, setSubject] = useState('')
  const [academicYear, setAcademicYear] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleCreate(e) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    const code = generateCode()
    const teacherName = profile?.full_name || user?.user_metadata?.full_name || ''
    const { data, error } = await supabase.from('classes')
      .insert({ name: name.trim(), subject: subject.trim() || null, code, teacher_id: user.id, teacher_name: teacherName, academic_year: academicYear || null })
      .select().single()
    setSaving(false)
    if (!error && data) onCreated(data)
    onClose()
  }

  return (
    <Modal onClose={onClose} title="Nova turma">
      <form onSubmit={handleCreate}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <SectionLabel>Nome da turma *</SectionLabel>
            <input value={name} onChange={e => setName(e.target.value)} required placeholder="ex: Turma A — 11º ano" className="dash-input" />
          </div>
          <div>
            <SectionLabel>Disciplina (opcional)</SectionLabel>
            <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="ex: Programação e Sistemas" className="dash-input" />
          </div>
          <div>
            <SectionLabel>Ano letivo</SectionLabel>
            <select value={academicYear} onChange={e => setAcademicYear(e.target.value)} className="dash-input">
              <option value="">Seleciona...</option>
              {academicYearOptions().map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
        <ModalActions>
          <Button type="submit" disabled={!name.trim() || saving} loading={saving} fullWidth>
            {saving ? 'A criar…' : 'Criar turma'}
          </Button>
        </ModalActions>
      </form>
    </Modal>
  )
}

const ONBOARDING_TEACHER = {
  title: 'Bem-vindo à Showo para Professores',
  subtitle: 'Acompanha e avalia os projetos dos teus alunos.',
  steps: [
    { icon: <GraduationCap size={20} color="var(--color-text-secondary)" />, title: 'Cria uma turma', desc: 'Gera um código único e partilha-o com os teus alunos para que se juntem.' },
    { icon: <BarChart2 size={20} color="var(--color-text-secondary)" />, title: 'Acompanha o progresso', desc: 'Vê scores, completude e evolução de cada aluno numa tabela clara.' },
    { icon: <MessageSquare size={20} color="var(--color-text-secondary)" />, title: 'Dá feedback', desc: 'Deixa comentários por secção diretamente nos projetos dos alunos.' },
  ],
  cta: 'Criar a minha primeira turma',
}

function OnboardingModal({ user, profile, onDismiss, onCreateTurma }) {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)

  return (
    <div className="dash-modal-overlay dash-modal-overlay-light">
      <div className="dash-modal-card dash-modal-card-sm">
        {step === 0 ? (
          <>
            <div className="dash-center-mb">
              <img src="/icon.png" alt="Showo" className="dash-onb-logo" />
              <h2 className="dash-onb-title-xl">{ONBOARDING_TEACHER.title}</h2>
              <p className="dash-onb-subtitle-md">{ONBOARDING_TEACHER.subtitle}</p>
            </div>
            <div className="dash-col-3 dash-mb-4" style={{ marginBottom: 28 }}>
              {ONBOARDING_TEACHER.steps.map((s, i) => (
                <Card key={i} padding="md">
                  <div className="dash-onb-step">
                    <span className="dash-onb-step-icon">{s.icon}</span>
                    <div>
                      <div className="dash-onb-step-title">{s.title}</div>
                      <div className="dash-onb-step-desc">{s.desc}</div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
            <Button fullWidth iconRight={<ArrowRight size={15} />} onClick={() => setStep(1)}>Continuar</Button>
            <button onClick={onDismiss} className="dash-skip-btn-dim-lg">Saltar introdução</button>
          </>
        ) : (
          <>
            <div className="dash-center-mb">
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}><Rocket size={44} color="var(--color-primary)" /></div>
              <h2 className="dash-onb-title">Pronto para começar?</h2>
              <p className="dash-onb-subtitle-narrow">Cria a tua turma agora e partilha o código com os teus alunos.</p>
            </div>
            <Button fullWidth iconRight={<ArrowRight size={15} />} onClick={() => { onDismiss(); onCreateTurma() }}>{ONBOARDING_TEACHER.cta}</Button>
            <Button variant="secondary" fullWidth onClick={onDismiss} className="dash-mt-2">Explorar primeiro</Button>
          </>
        )}
        <div className="dash-step-dots-mt">
          {[0, 1].map(i => (
            <div key={i} className={`dash-step-dot${i === step ? ' active' : ''}`} />
          ))}
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   TeacherDashboard
   ══════════════════════════════════════════════════════════════════════════ */

export default function TeacherDashboard({ user, profile }) {
  const navigate = useNavigate()

  const [turmas, setTurmas] = useState([])
  const [turmaYearFilter, setTurmaYearFilter] = useState('all')
  const [needsReview, setNeedsReview] = useState([])
  const [recentActivity, setRecentActivity] = useState([])
  const [upcomingDefenses, setUpcomingDefenses] = useState([])
  const [flaggedForRevision, setFlaggedForRevision] = useState([])
  const [resubmitted, setResubmitted] = useState([])
  const [totalMembers, setTotalMembers] = useState(0)
  const [weeklyActivity, setWeeklyActivity] = useState([])

  const [showCreateTurma, setShowCreateTurma] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [toast, setToast] = useState('')

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 3000) }
  function dismissOnboarding() { localStorage.setItem(`showo_onboarded_${user.id}`, '1'); setShowOnboarding(false) }

  useEffect(() => {
    if (!localStorage.getItem(`showo_onboarded_${user.id}`)) setShowOnboarding(true)
  }, [user.id])

  /* ── Load turmas + review data ── */
  useEffect(() => {
    async function load() {
      const { data: cls } = await supabase.from('classes').select('id, name, subject, code, academic_year, created_at').eq('teacher_id', user.id).order('created_at', { ascending: false })
      if (!cls?.length) { setTurmas([]); setNeedsReview([]); setFlaggedForRevision([]); setResubmitted([]); setTotalMembers(0); setWeeklyActivity([]); return }

      const [{ data: cp }, { data: members }] = await Promise.all([
        supabase.from('class_projects').select('class_id, project_id').in('class_id', cls.map(c => c.id)),
        supabase.from('class_members').select('class_id, user_id').in('class_id', cls.map(c => c.id)),
      ])
      setTotalMembers(new Set((members || []).map(m => m.user_id)).size)

      const counts = {}; const classProjects = {}
      cp?.forEach(r => { counts[r.class_id] = (counts[r.class_id] || 0) + 1; if (!classProjects[r.class_id]) classProjects[r.class_id] = []; classProjects[r.class_id].push(r.project_id) })

      const allProjectIds = cp?.map(r => r.project_id) ?? []
      let scoreMap = {}
      const classNameByProject = {}
      Object.entries(classProjects).forEach(([classId, ids]) => {
        const c = cls.find(c => c.id === classId)
        ids.forEach(pid => { classNameByProject[pid] = c?.name })
      })

      if (allProjectIds.length) {
        const [{ data: projDetails }, { data: myFeedback }] = await Promise.all([
          supabase.from('projects').select('id, name, slug, creator_name, score, created_at, defense_date, review_status').in('id', allProjectIds),
          supabase.from('teacher_feedback').select('project_id').eq('teacher_id', user.id).in('project_id', allProjectIds),
        ])
        const projs = projDetails || []
        projs.forEach(p => { scoreMap[p.id] = p.score })
        const reviewedIds = new Set((myFeedback || []).map(f => f.project_id))

        setNeedsReview(projs.filter(p => !reviewedIds.has(p.id)).map(p => ({ ...p, className: classNameByProject[p.id] })))
        setFlaggedForRevision(projs.filter(p => p.review_status === 'needs_revision').map(p => ({ ...p, className: classNameByProject[p.id] })))
        setResubmitted(projs.filter(p => p.review_status === 'resubmitted').map(p => ({ ...p, className: classNameByProject[p.id] })))
        setRecentActivity([...projs].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5).map(p => ({ ...p, className: classNameByProject[p.id] })))

        const weeks = []
        const mondayOf = d => { const x = new Date(d); const day = (x.getDay() + 6) % 7; x.setDate(x.getDate() - day); x.setHours(0, 0, 0, 0); return x }
        const thisMonday = mondayOf(new Date())
        for (let i = 7; i >= 0; i--) {
          const start = new Date(thisMonday); start.setDate(start.getDate() - i * 7)
          const end = new Date(start); end.setDate(end.getDate() + 7)
          weeks.push({ start, end, label: start.toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' }), count: 0 })
        }
        projs.forEach(p => { const created = new Date(p.created_at); const bucket = weeks.find(w => created >= w.start && created < w.end); if (bucket) bucket.count++ })
        setWeeklyActivity(weeks.map(w => ({ label: w.label, count: w.count })))

        const today = new Date(); today.setHours(0, 0, 0, 0)
        setUpcomingDefenses(
          projs.filter(p => p.defense_date && new Date(p.defense_date + 'T00:00:00') >= today)
            .map(p => ({ ...p, className: classNameByProject[p.id], daysLeft: Math.ceil((new Date(p.defense_date + 'T00:00:00') - today) / 86400000) }))
            .sort((a, b) => a.daysLeft - b.daysLeft).slice(0, 5)
        )
      } else {
        setNeedsReview([]); setRecentActivity([]); setUpcomingDefenses([]); setFlaggedForRevision([]); setResubmitted([]); setWeeklyActivity([])
      }

      const memberCounts = {}; members?.forEach(m => { memberCounts[m.class_id] = (memberCounts[m.class_id] || 0) + 1 })
      setTurmas(cls.map(c => {
        const ids = classProjects[c.id] ?? []
        const scores = ids.map(id => scoreMap[id]).filter(s => s != null)
        const avg_score = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null
        return { ...c, project_count: counts[c.id] ?? 0, member_count: memberCounts[c.id] ?? 0, avg_score }
      }))
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

  const filteredTurmas = turmas.filter(t => turmaYearFilter === 'all' || t.academic_year === turmaYearFilter)
  const firstStepsDone = (turmas.length > 0 ? 1 : 0) + (totalMembers > 0 ? 1 : 0)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', fontFamily: 'var(--font-body)', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      {showOnboarding && (
        <OnboardingModal user={user} profile={profile} onDismiss={dismissOnboarding} onCreateTurma={() => { dismissOnboarding(); setShowCreateTurma(true) }} />
      )}
      {showCreateTurma && (
        <CreateTurmaModal user={user} profile={profile} onClose={() => setShowCreateTurma(false)} onCreated={turma => setTurmas(prev => [{ ...turma, project_count: 0 }, ...prev])} />
      )}
      <div className={`dash-toast${toast ? ' visible' : ''}`}>{toast}</div>

      <div className="page-content" style={{ paddingTop: 64, paddingBottom: 80 }}>
        <div className="sdash-grid">

          {/* ── LEFT: Greeting + Stats + Turmas + Chart ── */}
          <div className="sdash-projects-col">
            <div className="sdash-greeting">
              <div className="sdash-greeting-line">
                <span className="sdash-greeting-text">{greeting}</span>
                <span className="sdash-role-tag">Professor</span>
              </div>
              <span className="sdash-greeting-date">
                {new Date().toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' })}
              </span>
            </div>

            {/* Stats */}
            {turmas.length > 0 && (
              <div className="dash-stats-grid" style={{ marginBottom: 'var(--sp-6)' }}>
                {[
                  { label: 'Alunos', value: totalMembers },
                  { label: 'Projetos', value: turmas.reduce((s, t) => s + (t.project_count || 0), 0) },
                  { label: 'Score médio', value: (() => { const ws = turmas.filter(t => t.avg_score != null); return ws.length ? Math.round(ws.reduce((s, t) => s + t.avg_score, 0) / ws.length) : '—' })() },
                  { label: 'Por rever', value: needsReview.length, accent: needsReview.length > 0 },
                ].map(stat => (
                  <Card key={stat.label} padding="md" style={stat.accent ? { borderColor: 'var(--color-error)' } : undefined}>
                    <div className={stat.accent ? 'dash-stat-value-accent' : 'dash-stat-value'}>{stat.value}</div>
                    <div className="dash-stat-label">{stat.label}</div>
                  </Card>
                ))}
              </div>
            )}

            {/* Turmas */}
            <div className="sdash-section-header">
              <span className="sdash-section-title">
                As minhas turmas{turmas.length > 0 ? ` · ${turmas.length}` : ''}
              </span>
              <Button size="sm" variant="secondary" icon={<Plus size={13} />} onClick={() => setShowCreateTurma(true)}>Nova turma</Button>
            </div>

            {(() => {
              const years = [...new Set(turmas.map(t => t.academic_year).filter(Boolean))].sort().reverse()
              if (years.length >= 2) return (
                <div className="dash-year-filter">
                  {['all', ...years].map(y => (
                    <Button key={y} size="sm" variant={turmaYearFilter === y ? 'primary' : 'ghost'} onClick={() => setTurmaYearFilter(y)}>
                      {y === 'all' ? 'Todos' : y}
                    </Button>
                  ))}
                </div>
              )
              return null
            })()}

            {filteredTurmas.length === 0 ? (
              <EmptyState icon={<Users2 size={24} />} title="Ainda não tens turmas" description="Cria uma turma e partilha o código com os teus alunos." action={() => setShowCreateTurma(true)} actionLabel="Criar primeira turma" />
            ) : (
              <>
                <FeaturedTurma turma={filteredTurmas[0]} navigate={navigate} />
                {filteredTurmas.length > 1 && (
                  <div className="sdash-project-list" style={{ marginBottom: 'var(--sp-5)' }}>
                    {filteredTurmas.slice(1).map(t => <TurmaRow key={t.id} turma={t} navigate={navigate} />)}
                  </div>
                )}
              </>
            )}

            {/* Weekly chart */}
            {turmas.length > 0 && weeklyActivity.some(w => w.count > 0) && (
              <Card padding="md">
                <div className="dash-insights-header">
                  <BarChart2 size={13} color="var(--color-text-tertiary)" />
                  <SectionLabel style={{ marginBottom: 0 }}>Projetos submetidos — últimas 8 semanas</SectionLabel>
                </div>
                <div className="dash-chart-bars">
                  {(() => {
                    const max = Math.max(1, ...weeklyActivity.map(w => w.count))
                    return weeklyActivity.map(w => (
                      <div key={w.label} className="dash-chart-col">
                        <span className="dash-chart-count" style={{ color: w.count > 0 ? 'var(--color-primary)' : 'var(--color-text-tertiary)' }}>{w.count > 0 ? w.count : ''}</span>
                        <div className="dash-chart-bar" style={{ height: `${Math.max(4, (w.count / max) * 56)}px`, background: w.count > 0 ? 'var(--color-primary)' : 'var(--color-border)' }} />
                      </div>
                    ))
                  })()}
                </div>
                <div className="dash-chart-labels">
                  {weeklyActivity.map(w => <span key={w.label} className="dash-chart-label">{w.label}</span>)}
                </div>
                {!profile?.monthly_report_opt_in && (
                  <div className="dash-chart-footer">
                    <span className="dash-chart-footer-text">Recebe este resumo por email todos os meses.</span>
                    <Button size="sm" variant="ghost" onClick={() => navigate('/settings')}>Ativar relatório mensal</Button>
                  </div>
                )}
              </Card>
            )}
          </div>

          {/* ── RIGHT: Context column ── */}
          <div className="sdash-context-col">

            {/* Settings */}
            <Button variant="secondary" size="sm" icon={<Settings size={13} />} onClick={() => navigate('/settings')} style={{ alignSelf: 'flex-start' }}>Definições</Button>

            {/* First steps */}
            {firstStepsDone < 2 && (() => {
              const step = turmas.length === 0
                ? { Icon: Users2, title: 'Cria a tua primeira turma', desc: 'Gera um código e partilha-o com os teus alunos.', cta: 'Criar turma', action: () => setShowCreateTurma(true) }
                : { Icon: Users, title: 'Convida os teus alunos', desc: `Partilha o código de ${turmas[0]?.name ?? 'uma turma'}.`, cta: 'Ver turma', action: () => navigate(`/turma/${turmas[0]?.code}`) }
              return (
                <div className="sdash-context-block" style={{ borderColor: 'var(--color-primary-muted)', background: 'var(--color-primary-subtle)' }}>
                  <div className="sdash-context-label">Primeiros passos · {firstStepsDone}/2</div>
                  <div className="dash-row-3" style={{ marginBottom: 'var(--sp-3)' }}>
                    <div className="dash-icon-circle dash-icon-circle-primary">
                      <step.Icon size={16} color="var(--color-primary)" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--color-text)' }}>{step.title}</div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginTop: 2 }}>{step.desc}</div>
                    </div>
                  </div>
                  <ProgressBar value={firstStepsDone} max={2} size="sm" style={{ marginBottom: 'var(--sp-3)' }} />
                  <Button size="sm" onClick={step.action} fullWidth>{step.cta}</Button>
                </div>
              )
            })()}

            {/* Correções enviadas */}
            {resubmitted.length > 0 && (
              <div className="sdash-context-block" style={{ padding: 0, overflow: 'hidden', borderColor: 'var(--color-info)' }}>
                <div style={{ padding: 'var(--sp-3) var(--sp-4)', borderBottom: '1px solid var(--color-border)' }}>
                  <span className="sdash-context-label" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Check size={11} /> Correções enviadas · {resubmitted.length}
                  </span>
                </div>
                {resubmitted.slice(0, 4).map(p => (
                  <FeedItem key={p.id} onClick={() => navigate(`/projeto/${p.slug}`)}
                    icon={<Check size={14} color="var(--color-info)" />}
                    iconBg="var(--color-info-subtle)"
                    title={p.name}
                    subtitle={`${p.creator_name || 'Aluno'}${p.className ? ` · ${p.className}` : ''}`}
                  />
                ))}
                {resubmitted.length > 4 && <div className="dash-overflow-more">+{resubmitted.length - 4} mais</div>}
              </div>
            )}

            {/* Precisa de atenção */}
            {needsReview.length > 0 && (
              <div className="sdash-context-block" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: 'var(--sp-3) var(--sp-4)', borderBottom: '1px solid var(--color-border)' }}>
                  <span className="sdash-context-label" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <MessageSquare size={11} /> Precisa de atenção · {needsReview.length}
                  </span>
                </div>
                {needsReview.slice(0, 4).map(p => (
                  <FeedItem key={p.id} onClick={() => navigate(`/projeto/${p.slug}`)}
                    icon={<Folder size={14} color="var(--color-warning)" />}
                    iconBg="var(--color-warning-subtle)"
                    title={p.name}
                    subtitle={`${p.creator_name || 'Aluno'}${p.className ? ` · ${p.className}` : ''}`}
                  />
                ))}
                {needsReview.length > 4 && <div className="dash-overflow-more">+{needsReview.length - 4} mais</div>}
              </div>
            )}

            {/* A aguardar revisão */}
            {flaggedForRevision.length > 0 && (
              <div className="sdash-context-block" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: 'var(--sp-3) var(--sp-4)', borderBottom: '1px solid var(--color-border)' }}>
                  <span className="sdash-context-label" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <AlertTriangle size={11} /> A aguardar revisão · {flaggedForRevision.length}
                  </span>
                </div>
                {flaggedForRevision.slice(0, 4).map(p => (
                  <FeedItem key={p.id} onClick={() => navigate(`/projeto/${p.slug}`)}
                    icon={<AlertTriangle size={14} color="var(--color-accent)" />}
                    iconBg="var(--color-accent-subtle)"
                    title={p.name}
                    subtitle={`${p.creator_name || 'Aluno'}${p.className ? ` · ${p.className}` : ''}`}
                  />
                ))}
              </div>
            )}

            {/* Próximas defesas */}
            {upcomingDefenses.length > 0 && (
              <div className="sdash-context-block" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: 'var(--sp-3) var(--sp-4)', borderBottom: '1px solid var(--color-border)' }}>
                  <span className="sdash-context-label" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Calendar size={11} /> Próximas defesas · {upcomingDefenses.length}
                  </span>
                </div>
                {upcomingDefenses.map(p => {
                  const urgentVariant = p.daysLeft <= 7 ? 'error' : p.daysLeft <= 30 ? 'warning' : 'primary'
                  return (
                    <FeedItem key={p.id} onClick={() => navigate(`/projeto/${p.slug}`)}
                      icon={<Calendar size={14} color={`var(--color-${urgentVariant})`} />}
                      iconBg={`var(--color-${urgentVariant}-subtle)`}
                      title={p.name}
                      subtitle={`${p.creator_name || 'Aluno'}${p.className ? ` · ${p.className}` : ''}`}
                      rightContent={<Badge variant={urgentVariant}>{p.daysLeft === 0 ? 'Hoje' : p.daysLeft === 1 ? 'Amanhã' : `${p.daysLeft}d`}</Badge>}
                    />
                  )
                })}
              </div>
            )}

            {/* Atividade recente */}
            {recentActivity.length > 0 && (
              <div className="sdash-context-block" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: 'var(--sp-3) var(--sp-4)', borderBottom: '1px solid var(--color-border)' }}>
                  <span className="sdash-context-label" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <TrendingUp size={11} /> Atividade recente
                  </span>
                </div>
                {recentActivity.map(p => (
                  <FeedItem key={p.id} onClick={() => navigate(`/projeto/${p.slug}`)}
                    icon={<Folder size={14} color="var(--color-success)" />}
                    iconBg="var(--color-success-subtle)"
                    title={p.name}
                    subtitle={`${p.creator_name || 'Aluno'}${p.className ? ` · ${p.className}` : ''} · ${timeAgoLabel(p.created_at)}`}
                    rightContent={p.score != null ? <Badge variant={p.score >= 71 ? 'success' : p.score >= 40 ? 'warning' : 'error'}>{p.score}</Badge> : undefined}
                  />
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
