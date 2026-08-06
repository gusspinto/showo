import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Navbar } from '../components/Navbar'
import {
  AlertTriangle, HelpCircle, User, Folder, Star,
  Shield, BarChart2, MapPin, Calendar, Check, X, Search,
  KeyRound, Plus, Copy,
} from 'lucide-react'

const C = {
  bg: 'var(--color-bg)',
  bgAlt: 'var(--color-bg-alt)',
  card: 'var(--color-surface)',
  cardHover: 'var(--color-surface-hover)',
  border: 'var(--color-border)',
  borderBright: 'var(--color-border-hover)',
  blue: 'var(--color-primary)',
  blueHover: 'var(--color-primary-hover)',
  blueSoft: 'var(--color-primary-subtle)',
  text: 'var(--color-text)',
  muted: 'var(--color-text-secondary)',
  subtle: 'var(--color-text-tertiary)',
  green: 'var(--color-success)',
  greenSoft: 'var(--color-success-subtle)',
  red: 'var(--color-error)',
  redSoft: 'var(--color-error-subtle)',
  redBorder: 'var(--color-error-subtle)',
  yellow: 'var(--color-warning)',
  yellowSoft: 'rgba(251,191,36,0.08)',
  purple: 'var(--color-accent)',
  purpleSoft: 'rgba(168,85,247,0.08)',
  orange: 'var(--color-warning)',
  glass: 'var(--color-glass)', glassBorder: 'var(--color-glass-border)',
  glassStyle: { backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' },
}

// authenticated only has column-level SELECT grant on these (no email — that
// comes from admin_get_users() instead) since migration 033; select('*')
// fails outright and silently returns no rows.
const PROFILE_COLUMNS = 'id, username, total_xp, created_at, full_name, bio, is_admin, banned_at, role, avatar_url, available_for_work, company, company_role, company_website, linkedin_url, looking_for, company_description, company_location, company_industry, company_size, skills, school, project_draft, signup_country, signup_city, signup_referrer, signup_utm_source, last_active_at, last_action'

function StatCard({ icon, label, value, color = C.blue, sub }) {
  return (
    <div style={{
      ...C.glassStyle,
      background: C.glass, border: `1px solid ${C.glassBorder}`,
      borderRadius: 12, padding: '22px 24px',
      display: 'flex', alignItems: 'flex-start', gap: 16,
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 10, flexShrink: 0,
        background: color + '18', border: `1px solid ${color}30`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 20,
      }}>{icon}</div>
      <div>
        <div style={{ fontSize: 26, fontWeight: 400, color, letterSpacing: '-0.5px', lineHeight: 1, fontFamily: 'var(--font-heading)' }}>{value}</div>
        <div style={{ fontSize: 13, color: C.muted, fontWeight: 500, marginTop: 4 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: C.subtle, marginTop: 3 }}>{sub}</div>}
      </div>
    </div>
  )
}

function Badge({ children, color = C.blue }) {
  return (
    <span style={{ fontSize: 11, fontWeight: 700, color }}>{children}</span>
  )
}

function Avatar({ name, color = 'linear-gradient(135deg,var(--color-primary),#4f46e5)', size = 32 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: color, display: 'flex', alignItems: 'center',
      justifyContent: 'center', fontSize: size * 0.4,
      fontWeight: 700, color: '#fff',
    }}>{(name || '?')[0].toUpperCase()}</div>
  )
}

function ConfirmModal({ title, body, onConfirm, onCancel, danger = true }) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      }}
      onClick={e => e.target === e.currentTarget && onCancel()}
    >
      <div style={{
        background: C.card, border: `1px solid ${danger ? C.redBorder : C.borderBright}`,
        borderRadius: 12, padding: '28px 32px', maxWidth: 420, width: '100%',
        boxShadow: 'none',
      }}>
        <div style={{ fontSize: 28, marginBottom: 12, textAlign: 'center', display: 'flex', justifyContent: 'center' }}>
          {danger ? <AlertTriangle size={28} color="var(--color-error)" /> : <HelpCircle size={28} color="var(--color-primary)" />}
        </div>
        <h3 style={{ margin: '0 0 10px', fontSize: 17, fontWeight: 400, fontFamily: 'var(--font-heading)', letterSpacing: '-0.3px', color: C.text, textAlign: 'center' }}>{title}</h3>
        <p style={{ margin: '0 0 24px', fontSize: 14, color: C.muted, textAlign: 'center', lineHeight: 1.6 }}>{body}</p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onCancel}
            style={{ flex: 1, background: 'transparent', border: `1px solid ${C.border}`, color: C.muted, borderRadius: 8, padding: '10px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
          >Cancelar</button>
          <button
            onClick={onConfirm}
            style={{ flex: 1, background: danger ? 'transparent' : C.blue, border: `1px solid ${danger ? C.redBorder : 'transparent'}`, color: danger ? C.red : '#fff', borderRadius: 8, padding: '10px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
          >{danger ? 'Eliminar' : 'Confirmar'}</button>
        </div>
      </div>
    </div>
  )
}

// ─── HELPERS ────────────────────────────────────────────────
function timeAgoStr(dateStr) {
  if (!dateStr) return null
  const diffH = Math.floor((Date.now() - new Date(dateStr)) / 3600000)
  if (diffH < 1) return 'agora'
  if (diffH < 24) return `há ${diffH}h`
  if (diffH < 168) return `há ${Math.floor(diffH / 24)}d`
  return new Date(dateStr).toLocaleDateString('pt-PT')
}

function MiniBar({ label, value, total, color = C.blue }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ fontSize: 12, color: C.muted, width: 90, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
      <div style={{ flex: 1, height: 6, borderRadius: 3, background: C.bgAlt }}>
        <div style={{ width: `${pct}%`, height: '100%', borderRadius: 3, background: color, minWidth: pct > 0 ? 4 : 0, transition: 'width 0.3s' }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 600, color: C.text, width: 28, textAlign: 'right' }}>{value}</span>
    </div>
  )
}

// ─── CHART COMPONENTS ───────────────────────────────────────
function ChartTooltip({ x, y, children, containerRef }) {
  if (!children) return null
  const [pos, setPos] = useState({ left: 0, top: 0 })
  useEffect(() => {
    if (!containerRef?.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const svgW = containerRef.current.querySelector('svg')?.viewBox?.baseVal?.width || 300
    const scale = rect.width / svgW
    let left = x * scale
    const top = y * scale - 8
    if (left < 60) left = 60
    if (left > rect.width - 60) left = rect.width - 60
    setPos({ left, top })
  }, [x, y, containerRef])
  return (
    <div style={{
      position: 'absolute', left: pos.left, top: pos.top,
      transform: 'translate(-50%, -100%)',
      background: 'var(--color-surface)', border: `1px solid var(--color-border-hover)`,
      borderRadius: 8, padding: '6px 10px', fontSize: 11, color: C.text,
      fontWeight: 600, pointerEvents: 'none', zIndex: 10,
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)', whiteSpace: 'nowrap',
    }}>{children}</div>
  )
}

function BarChart({ data, height = 140, color = C.blue, labelKey = 'label', valueKey = 'value', detailKey }) {
  const [hover, setHover] = useState(null)
  const ref = { current: null }
  if (!data.length) return null
  const max = Math.max(...data.map(d => d[valueKey]), 1)
  const W = 300
  const pad = 10
  const labelH = 20
  const topPad = 20
  const usable = W - pad * 2
  const gap = Math.max(6, Math.round(usable * 0.12 / data.length))
  const barW = Math.max(12, Math.floor((usable - gap * (data.length + 1)) / data.length))
  const totalBars = data.length * barW + (data.length + 1) * gap
  const offsetX = pad + (usable - totalBars) / 2
  const barArea = height - labelH - topPad
  return (
    <div ref={el => ref.current = el} style={{ width: '100%', height, position: 'relative' }}
      onMouseLeave={() => setHover(null)}>
      {hover !== null && (
        <ChartTooltip
          x={offsetX + gap + hover * (barW + gap) + barW / 2}
          y={topPad + barArea - Math.max(2, (data[hover][valueKey] / max) * barArea)}
          containerRef={ref}
        >
          {data[hover][labelKey]}: {data[hover][valueKey]} {detailKey && data[hover][detailKey] ? `· ${data[hover][detailKey]}` : ''}
        </ChartTooltip>
      )}
      <svg width="100%" height={height} viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="xMidYMid meet" style={{ display: 'block', cursor: 'pointer' }}>
        {data.map((d, i) => {
          const barH = Math.max(2, (d[valueKey] / max) * barArea)
          const x = offsetX + gap + i * (barW + gap)
          const y = topPad + barArea - barH
          const isHover = hover === i
          return (
            <g key={i} onMouseEnter={() => setHover(i)} onClick={() => setHover(i === hover ? null : i)}>
              <rect x={x - 2} y={0} width={barW + 4} height={height} fill="transparent" />
              <rect x={x} y={y} width={barW} height={barH} rx={4}
                fill={isHover ? color : d.highlight ? color : `${color}80`}
                style={{ transition: 'all 0.15s' }}
              />
              {d[valueKey] > 0 && (
                <text x={x + barW / 2} y={y - 5} textAnchor="middle" fill={C.text} fontSize={10} fontWeight={700}
                  style={{ opacity: isHover ? 1 : 0.7 }}>{d[valueKey]}</text>
              )}
              <text x={x + barW / 2} y={height - 4} textAnchor="middle" fill={isHover ? C.text : 'var(--color-text-tertiary)'} fontSize={9} fontWeight={isHover ? 600 : 400}>{d[labelKey]}</text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

function SparkLine({ data, labels, height = 80, color = C.blue }) {
  const [hover, setHover] = useState(null)
  const ref = { current: null }
  if (data.length < 2) return null
  const max = Math.max(...data, 1)
  const W = 300
  const pad = 14
  const topPad = 14
  const botPad = 8
  const usableW = W - pad * 2
  const usableH = height - topPad - botPad
  const pts = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * usableW
    const y = topPad + usableH - (v / max) * usableH
    return { x, y, v }
  })
  const line = pts.map(p => `${p.x},${p.y}`).join(' ')
  const area = `${pad},${topPad + usableH} ${line} ${pad + usableW},${topPad + usableH}`
  const hitW = usableW / (data.length - 1)
  return (
    <div ref={el => ref.current = el} style={{ width: '100%', height, position: 'relative' }}
      onMouseLeave={() => setHover(null)}>
      {hover !== null && (
        <ChartTooltip x={pts[hover].x} y={pts[hover].y} containerRef={ref}>
          {labels?.[hover] || `Dia ${hover + 1}`}: {data[hover]} user{data[hover] !== 1 ? 's' : ''}
        </ChartTooltip>
      )}
      <svg width="100%" height={height} viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="xMidYMid meet" style={{ display: 'block', cursor: 'pointer' }}>
        <polygon points={area} fill={`${color}12`} />
        <polyline points={line} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {pts.map((p, i) => {
          const isHover = hover === i
          const isLast = i === pts.length - 1
          return (
            <g key={i}>
              <rect x={p.x - hitW / 2} y={0} width={hitW} height={height} fill="transparent"
                onMouseEnter={() => setHover(i)} onClick={() => setHover(i === hover ? null : i)} />
              {isHover && <line x1={p.x} y1={topPad} x2={p.x} y2={topPad + usableH} stroke={`${color}30`} strokeWidth={1} strokeDasharray="3,3" />}
              <circle cx={p.x} cy={p.y} r={isHover ? 5 : isLast ? 4 : 2}
                fill={isHover || isLast ? color : `${color}40`} stroke={color} strokeWidth={isHover ? 2 : 1.5}
                style={{ transition: 'r 0.1s' }}
              />
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// ─── OVERVIEW TAB ───────────────────────────────────────────
const SORT_OPTIONS = [
  { id: 'newest', label: 'Mais recente' },
  { id: 'oldest', label: 'Mais antigo' },
  { id: 'active', label: 'Última atividade' },
  { id: 'projects', label: 'Mais projetos' },
  { id: 'inactive', label: 'Sem projetos' },
]

const TIME_RANGES = [
  { id: '7d', label: '7 dias', days: 7 },
  { id: '30d', label: '30 dias', days: 30 },
  { id: '90d', label: '90 dias', days: 90 },
  { id: 'all', label: 'Tudo', days: null },
]

function generateMeetingSummary(users, projects, activityLog, range) {
  const now = Date.now()
  const totalUsers = users.length
  const totalProjects = projects.length
  const days = range.days || 365
  const cutoff = now - days * 86400000

  const newUsers = users.filter(u => new Date(u.created_at) > cutoff).length
  const newProjects = projects.filter(p => new Date(p.created_at) > cutoff).length

  const uniqueActive = new Set(activityLog.filter(e => new Date(e.created_at) > cutoff).map(e => e.user_id)).size
  const totalSessions = activityLog.filter(e => new Date(e.created_at) > cutoff && e.action === 'login').length

  const projectCountMap = {}
  projects.forEach(p => { if (p.user_id) projectCountMap[p.user_id] = (projectCountMap[p.user_id] || 0) + 1 })
  const withProjects = users.filter(u => projectCountMap[u.id] > 0).length
  const scores = projects.filter(p => p.score > 0).map(p => p.score)
  const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0

  const roleCounts = {}
  users.forEach(u => { const r = u.role || 'aluno'; roleCounts[r] = (roleCounts[r] || 0) + 1 })

  const date = new Date().toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' })

  let md = `# Showo — Resumo ${range.label} (${date})\n\n`
  md += `## Números gerais\n`
  md += `- **${totalUsers}** utilizadores registados (+${newUsers} no período)\n`
  md += `- **${totalProjects}** projetos (+${newProjects} no período)\n`
  md += `- **${uniqueActive}** utilizadores ativos no período\n`
  md += `- **${totalSessions}** sessões de login\n`
  md += `- **${withProjects}** users com pelo menos 1 projeto\n`
  md += `- Score médio: **${avgScore}**\n\n`
  md += `## Distribuição por role\n`
  Object.entries(roleCounts).sort((a, b) => b[1] - a[1]).forEach(([role, count]) => {
    md += `- ${role}: ${count}\n`
  })
  md += `\n## Retenção\n`
  md += `- ${uniqueActive}/${totalUsers} (${totalUsers > 0 ? Math.round((uniqueActive / totalUsers) * 100) : 0}%) voltaram no período\n`
  return md
}

function OverviewTab({ users, projects, activityLog }) {
  const [userSearch, setUserSearch] = useState('')
  const [sort, setSort] = useState('active')
  const [range, setRange] = useState(TIME_RANGES[1])
  const now = Date.now()
  const totalUsers = users.length
  const totalProjects = projects.length
  const days = range.days || 9999
  const cutoff = now - days * 86400000
  const weekAgo = now - 7 * 86400000
  const monthAgo = now - 30 * 86400000
  const newThisWeek = projects.filter(p => new Date(p.created_at) > weekAgo).length
  const newUsersWeek = users.filter(u => new Date(u.created_at) > weekAgo).length
  const newUsersMonth = users.filter(u => new Date(u.created_at) > monthAgo).length
  const scores = projects.filter(p => p.score > 0).map(p => p.score)
  const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0

  // Real engagement from activity_log
  const logInRange = activityLog.filter(e => new Date(e.created_at) > cutoff)
  const activeUsersInRange = new Set(logInRange.map(e => e.user_id)).size
  const activeThisWeek = new Set(activityLog.filter(e => new Date(e.created_at) > weekAgo).map(e => e.user_id)).size
  const activeThisMonth = new Set(activityLog.filter(e => new Date(e.created_at) > monthAgo).map(e => e.user_id)).size
  const neverActive = users.filter(u => !u.last_active_at).length
  const retentionRate = totalUsers > 0 ? Math.round((activeThisMonth / totalUsers) * 100) : 0

  // Registrations per week
  const numWeeks = Math.min(Math.ceil(days / 7), 12)
  const regWeeks = Array.from({ length: numWeeks }, (_, i) => {
    const weekStart = now - (numWeeks - 1 - i) * 7 * 86400000
    const weekEnd = weekStart + 7 * 86400000
    const count = users.filter(u => {
      const t = new Date(u.created_at).getTime()
      return t >= weekStart && t < weekEnd
    }).length
    const d = new Date(weekStart)
    return { label: `${d.getDate()}/${d.getMonth() + 1}`, value: count, highlight: i === numWeeks - 1 }
  })

  // Daily active users from activity_log (real data)
  const numDays = Math.min(days, 30)
  const dauLabels = []
  const dauData = Array.from({ length: numDays }, (_, i) => {
    const dayStart = now - (numDays - 1 - i) * 86400000
    const dayEnd = dayStart + 86400000
    const d = new Date(dayStart)
    dauLabels.push(`${d.getDate()}/${d.getMonth() + 1}`)
    return new Set(activityLog.filter(e => {
      const t = new Date(e.created_at).getTime()
      return t >= dayStart && t < dayEnd
    }).map(e => e.user_id)).size
  })

  // Projects per week
  const projWeeks = Array.from({ length: numWeeks }, (_, i) => {
    const weekStart = now - (numWeeks - 1 - i) * 7 * 86400000
    const weekEnd = weekStart + 7 * 86400000
    const count = projects.filter(p => {
      const t = new Date(p.created_at).getTime()
      return t >= weekStart && t < weekEnd
    }).length
    const d = new Date(weekStart)
    return { label: `${d.getDate()}/${d.getMonth() + 1}`, value: count, highlight: i === numWeeks - 1 }
  })

  // Project counts per user
  const projectCountMap = {}
  projects.forEach(p => { if (p.user_id) projectCountMap[p.user_id] = (projectCountMap[p.user_id] || 0) + 1 })
  const usersWithProjects = users.filter(u => projectCountMap[u.id] > 0).length
  const usersWithoutProjects = totalUsers - usersWithProjects

  // Role distribution
  const roleCounts = {}
  users.forEach(u => { const r = u.role || 'aluno'; roleCounts[r] = (roleCounts[r] || 0) + 1 })

  // Country distribution
  const countryCounts = {}
  users.forEach(u => { if (u.signup_country) countryCounts[u.signup_country] = (countryCounts[u.signup_country] || 0) + 1 })
  const topCountries = Object.entries(countryCounts).sort((a, b) => b[1] - a[1]).slice(0, 5)

  // Referrer distribution
  const refCounts = {}
  users.forEach(u => {
    if (u.signup_referrer) {
      const d = u.signup_referrer.replace(/^https?:\/\//, '').split('/')[0]
      refCounts[d] = (refCounts[d] || 0) + 1
    }
  })
  const topReferrers = Object.entries(refCounts).sort((a, b) => b[1] - a[1]).slice(0, 5)

  // Sorted & filtered users
  const uq = userSearch.toLowerCase()
  const sortedUsers = [...users]
    .filter(u => !uq || (u.full_name || '').toLowerCase().includes(uq) || (u.email || '').toLowerCase().includes(uq) || (u.signup_country || '').toLowerCase().includes(uq) || (u.role || '').toLowerCase().includes(uq))
    .sort((a, b) => {
      if (sort === 'oldest') return new Date(a.created_at) - new Date(b.created_at)
      if (sort === 'active') return (b.last_active_at ? new Date(b.last_active_at) : 0) - (a.last_active_at ? new Date(a.last_active_at) : 0)
      if (sort === 'projects') return (projectCountMap[b.id] || 0) - (projectCountMap[a.id] || 0)
      if (sort === 'inactive') return (projectCountMap[a.id] || 0) - (projectCountMap[b.id] || 0)
      return new Date(b.created_at) - new Date(a.created_at)
    })
    .slice(0, 15)

  const recentProjects = [...projects]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 8)

  const handleExport = () => {
    const md = generateMeetingSummary(users, projects, activityLog, range)
    const blob = new Blob([md], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `showo-resumo-${range.id}-${new Date().toISOString().slice(0, 10)}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleCopySummary = () => {
    const md = generateMeetingSummary(users, projects, activityLog, range)
    navigator.clipboard.writeText(md)
  }

  return (
    <div>
      {/* Time range selector + export */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {TIME_RANGES.map(r => (
            <button
              key={r.id}
              onClick={() => setRange(r)}
              style={{
                padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                fontFamily: 'inherit', cursor: 'pointer', border: 'none',
                background: range.id === r.id ? C.blue : C.bgAlt,
                color: range.id === r.id ? '#fff' : C.muted,
                transition: 'all 0.15s',
              }}
            >{r.label}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={handleCopySummary} style={{ padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', border: `1px solid ${C.border}`, background: 'transparent', color: C.muted }}>
            Copiar resumo
          </button>
          <button onClick={handleExport} style={{ padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', border: `1px solid ${C.border}`, background: 'transparent', color: C.muted }}>
            Exportar .md
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(175px, 1fr))', gap: 14, marginBottom: 24 }}>
        <StatCard icon={<User size={20} />} label="Utilizadores" value={totalUsers} color={C.blue} sub={`+${newUsersWeek} semana · +${newUsersMonth} mês`} />
        <StatCard icon={<Folder size={20} />} label="Projetos" value={totalProjects} color={C.green} sub={`+${newThisWeek} semana · ${usersWithoutProjects} sem projeto`} />
        <StatCard icon={<BarChart2 size={20} />} label="Ativos (semana)" value={activeThisWeek} color={activeThisWeek > 0 ? C.green : C.red} sub={`${activeThisMonth} mês · ${neverActive} nunca`} />
        <StatCard icon={<Star size={20} />} label="Retenção mensal" value={`${retentionRate}%`} color={retentionRate > 30 ? C.green : retentionRate > 10 ? C.yellow : C.red} sub={`${activeThisMonth}/${totalUsers} voltaram`} />
        <StatCard icon={<Star size={20} />} label="Score médio" value={avgScore} color={C.yellow} sub={`${scores.length} com score`} />
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div style={{ ...C.glassStyle, background: C.glass, border: `1px solid ${C.glassBorder}`, borderRadius: 12, padding: '16px 18px' }}>
          <h3 style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 1 }}>Registos por semana</h3>
          <p style={{ margin: '0 0 10px', fontSize: 11, color: C.subtle }}>Últimas {numWeeks} semanas</p>
          <BarChart data={regWeeks} color={C.blue} height={110} />
        </div>
        <div style={{ ...C.glassStyle, background: C.glass, border: `1px solid ${C.glassBorder}`, borderRadius: 12, padding: '16px 18px' }}>
          <h3 style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 1 }}>Atividade diária</h3>
          <p style={{ margin: '0 0 10px', fontSize: 11, color: C.subtle }}>Users ativos / dia ({numDays} dias) — activity_log</p>
          <SparkLine data={dauData} labels={dauLabels} color={C.green} height={100} />
        </div>
        <div style={{ ...C.glassStyle, background: C.glass, border: `1px solid ${C.glassBorder}`, borderRadius: 12, padding: '16px 18px' }}>
          <h3 style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 1 }}>Projetos por semana</h3>
          <p style={{ margin: '0 0 10px', fontSize: 11, color: C.subtle }}>Últimas {numWeeks} semanas</p>
          <BarChart data={projWeeks} color={C.green} height={110} />
        </div>
      </div>

      {/* Breakdowns row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16, marginBottom: 24 }}>
        {/* Roles */}
        <div style={{ ...C.glassStyle, background: C.glass, border: `1px solid ${C.glassBorder}`, borderRadius: 12, padding: '16px 18px' }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 1 }}>Por role</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {Object.entries(roleCounts).sort((a, b) => b[1] - a[1]).map(([role, count]) => (
              <MiniBar key={role} label={role} value={count} total={totalUsers} color={role === 'professor' ? C.green : role === 'empresa' ? C.yellow : C.blue} />
            ))}
          </div>
        </div>

        {/* Countries */}
        <div style={{ ...C.glassStyle, background: C.glass, border: `1px solid ${C.glassBorder}`, borderRadius: 12, padding: '16px 18px' }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 1 }}>Por país</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {topCountries.length > 0 ? topCountries.map(([country, count]) => (
              <MiniBar key={country} label={country} value={count} total={totalUsers} color={C.blue} />
            )) : <span style={{ fontSize: 12, color: C.subtle }}>Sem dados ainda</span>}
          </div>
        </div>

        {/* Referrers */}
        <div style={{ ...C.glassStyle, background: C.glass, border: `1px solid ${C.glassBorder}`, borderRadius: 12, padding: '16px 18px' }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 1 }}>Origem (referrer)</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {topReferrers.length > 0 ? topReferrers.map(([ref, count]) => (
              <MiniBar key={ref} label={ref} value={count} total={totalUsers} color={C.purple} />
            )) : <span style={{ fontSize: 12, color: C.subtle }}>Sem dados ainda</span>}
          </div>
        </div>
      </div>

      {/* Bottom row: projects + users */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 24 }}>
        {/* Recent projects */}
        <div style={{ ...C.glassStyle, background: C.glass, border: `1px solid ${C.glassBorder}`, borderRadius: 12, padding: '20px 22px' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 12, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 1 }}>Projetos recentes</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {recentProjects.map(p => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: C.bgAlt, border: `1px solid ${C.border}`, overflow: 'hidden', flexShrink: 0 }}>
                  {p.cover_url
                    ? <img src={p.cover_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Folder size={16} color={C.muted} /></div>
                  }
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: C.subtle }}>{p.creator_name || '—'}</div>
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.blue }}>{p.score || 0}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Users list with sort */}
        <div style={{ ...C.glassStyle, background: C.glass, border: `1px solid ${C.glassBorder}`, borderRadius: 12, padding: '20px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 8, flexWrap: 'wrap' }}>
            <h3 style={{ margin: 0, fontSize: 12, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 1 }}>Utilizadores</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ position: 'relative' }}>
                <Search size={12} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: C.muted }} />
                <input
                  placeholder="Procurar…"
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  style={{
                    width: 120, padding: '5px 8px 5px 26px', borderRadius: 6,
                    border: `1px solid ${C.border}`, background: C.bgAlt,
                    color: C.text, fontSize: 11, fontFamily: 'inherit', outline: 'none',
                  }}
                />
              </div>
              <select
                value={sort}
                onChange={e => setSort(e.target.value)}
                style={{
                  padding: '5px 8px', borderRadius: 6, border: `1px solid ${C.border}`,
                  background: C.bgAlt, color: C.text, fontSize: 11, fontFamily: 'inherit',
                  outline: 'none', cursor: 'pointer',
                }}
              >
                {SORT_OPTIONS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {sortedUsers.map(u => {
              const regDate = new Date(u.created_at)
              const diffH = Math.floor((now - regDate) / 3600000)
              const lastSeenH = u.last_active_at ? Math.floor((now - new Date(u.last_active_at)) / 3600000) : null
              const isOnline = lastSeenH !== null && lastSeenH < 1
              const referrerDomain = u.signup_referrer ? u.signup_referrer.replace(/^https?:\/\//, '').split('/')[0] : null
              const pc = projectCountMap[u.id] || 0

              const fmtDate = (d) => {
                if (!d) return null
                const dt = new Date(d)
                return dt.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' }) + ' ' + dt.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })
              }

              const lastActiveLabel = u.last_active_at ? (() => {
                if (lastSeenH < 1) return 'online agora'
                if (lastSeenH < 24) return `ativo há ${lastSeenH}h`
                return fmtDate(u.last_active_at)
              })() : 'nunca entrou'

              const lastActiveColor = !u.last_active_at ? C.red : isOnline ? C.green : lastSeenH < 24 ? C.green : lastSeenH < 168 ? C.yellow : C.subtle

              return (
                <div key={u.id} style={{
                  display: 'flex', alignItems: 'stretch', gap: 10, padding: '10px 12px',
                  background: C.card, border: `1px solid ${isOnline ? 'var(--color-success-subtle)' : diffH < 24 ? 'var(--color-primary-subtle)' : C.border}`,
                  borderRadius: 8,
                }}>
                  <div style={{ position: 'relative', alignSelf: 'center' }}>
                    <Avatar name={u.full_name || u.username} color={u.is_admin ? 'linear-gradient(135deg,var(--color-accent),#7c3aed)' : 'linear-gradient(135deg,var(--color-primary),#4f46e5)'} size={36} />
                    {isOnline && <div style={{ position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, borderRadius: '50%', background: C.green, border: '2px solid var(--color-surface)' }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{u.full_name || u.username || 'Sem nome'}</span>
                      {u.role && u.role !== 'aluno' && (
                        <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4, background: u.role === 'professor' ? C.greenSoft : C.purpleSoft, color: u.role === 'professor' ? C.green : C.purple }}>{u.role}</span>
                      )}
                      {diffH < 48 && <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4, background: C.blueSoft, color: C.blue }}>novo</span>}
                      {u._orphan && <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4, background: C.yellowSoft, color: C.yellow }}>sem perfil</span>}
                      {!u._orphan && pc === 0 && diffH > 48 && <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4, background: C.redSoft, color: C.red }}>sem projeto</span>}
                    </div>
                    <div style={{ fontSize: 11, color: C.subtle, marginTop: 2 }}>{u.email || '—'}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3, flexWrap: 'wrap' }}>
                      {u.signup_country && (
                        <span style={{ fontSize: 10, color: C.subtle, display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                          <MapPin size={8} />{[u.signup_city, u.signup_country].filter(Boolean).join(', ')}
                        </span>
                      )}
                      {referrerDomain && <span style={{ fontSize: 10, color: C.subtle }}>via {referrerDomain}</span>}
                      {u.signup_utm_source && <span style={{ fontSize: 10, color: C.subtle }}>utm:{u.signup_utm_source}</span>}
                      {u.school && <span style={{ fontSize: 10, color: C.subtle }}>{u.school}</span>}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 3, minWidth: 100 }}>
                    <span style={{ fontSize: 10, color: lastActiveColor, fontWeight: isOnline ? 700 : 500 }}>
                      {isOnline && '● '}{lastActiveLabel}
                    </span>
                    {pc > 0 && <span style={{ fontSize: 10, color: C.blue }}>{pc} projeto{pc > 1 ? 's' : ''}</span>}
                    <span style={{ fontSize: 10, color: C.subtle }}>registado {fmtDate(u.created_at)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── USERS TAB ──────────────────────────────────────────────
const ROLE_LABELS = { aluno: 'Aluno', professor: 'Professor', recrutador: 'Recrutador', empresa: 'Empresa' }

function UsersTab({ users, projects, onToggleAdmin, onDeleteUser, onChangeRole, onResetPassword }) {
  const [search, setSearch] = useState('')
  const [confirm, setConfirm] = useState(null)

  const projectCount = {}
  projects.forEach(p => { if (p.user_id) projectCount[p.user_id] = (projectCount[p.user_id] || 0) + 1 })

  const filtered = users.filter(u => {
    const q = search.toLowerCase()
    return (
      (u.full_name || '').toLowerCase().includes(q) ||
      (u.username || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q)
    )
  })

  return (
    <div>
      {confirm && (
        <ConfirmModal
          title={
            confirm.type === 'delete' ? 'Eliminar utilizador?' :
            confirm.type === 'makeAdmin' ? 'Tornar administrador?' :
            confirm.type === 'changeRole' ? 'Trocar cargo?' :
            confirm.type === 'resetPassword' ? 'Enviar reset de password?' :
            'Revogar administrador?'
          }
          body={
            confirm.type === 'delete'
            ? `Vais eliminar permanentemente a conta de "${confirm.user.full_name || confirm.user.username}". Esta ação não pode ser desfeita.`
            : confirm.type === 'makeAdmin'
            ? `"${confirm.user.full_name || confirm.user.username}" terá acesso total ao painel de administração.`
            : confirm.type === 'changeRole'
            ? `O cargo de "${confirm.user.full_name || confirm.user.username}" passa de ${ROLE_LABELS[confirm.user.role] || confirm.user.role} para ${ROLE_LABELS[confirm.newRole]}.`
            : confirm.type === 'resetPassword'
            ? `Vai ser enviado um email de reset de password para ${confirm.user.email}.`
            : `Revogar os privilégios de admin de "${confirm.user.full_name || confirm.user.username}"?`
          }
          danger={confirm.type === 'delete'}
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            if (confirm.type === 'delete') onDeleteUser(confirm.user.id)
            else if (confirm.type === 'changeRole') onChangeRole(confirm.user.id, confirm.newRole)
            else if (confirm.type === 'resetPassword') onResetPassword(confirm.user.email)
            else onToggleAdmin(confirm.user.id, confirm.type === 'makeAdmin')
            setConfirm(null)
          }}
        />
      )}

      <div style={{ marginBottom: 16 }}>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Pesquisar por nome, username ou email…"
          style={{
            width: '100%', background: C.card, border: `1px solid ${C.border}`,
            borderRadius: 10, padding: '10px 14px', color: C.text, fontSize: 14,
            outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
          }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', color: C.muted, padding: '40px 0', fontSize: 14 }}>Nenhum utilizador encontrado</div>
        )}
        {filtered.map(u => {
          const name = u.full_name || u.username || 'Sem nome'
          const pCount = projectCount[u.id] || 0
          const joined = u.created_at ? new Date(u.created_at).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
          return (
            <div key={u.id} style={{
              ...C.glassStyle,
              background: C.glass, border: `1px solid ${u.banned_at ? C.redBorder : C.glassBorder}`,
              borderRadius: 12, padding: '14px 16px',
              display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
            }}>
              <Avatar
                name={name}
                color={u.is_admin ? 'linear-gradient(135deg,var(--color-accent),#7c3aed)' : 'linear-gradient(135deg,var(--color-primary),#4f46e5)'}
                size={38}
              />
              <div style={{ flex: 1, minWidth: 180 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', marginBottom: 3 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{name}</span>
                  {u.username && <span style={{ fontSize: 12, color: C.subtle }}>@{u.username}</span>}
                  {u.is_admin && <Badge color={C.purple}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Shield size={11} /> Admin</span></Badge>}
                  {u.banned_at && <Badge color={C.red}>Banido</Badge>}
                </div>
                <div style={{ fontSize: 12, color: C.muted }}>{u.email || '—'}</div>
              </div>
              <div style={{ display: 'flex', gap: 20, alignItems: 'center', fontSize: 12, color: C.subtle }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{pCount}</div>
                  <div>projeto{pCount !== 1 ? 's' : ''}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontWeight: 600, color: C.muted }}>{joined}</div>
                  <div>registo</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap', alignItems: 'center' }}>
                <select
                  value={u.role || 'aluno'}
                  onChange={e => setConfirm({ type: 'changeRole', user: u, newRole: e.target.value })}
                  style={{ background: C.bgAlt, border: `1px solid ${C.border}`, color: C.text, borderRadius: 7, padding: '6px 8px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  {Object.entries(ROLE_LABELS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
                </select>
                <button
                  onClick={() => setConfirm({ type: 'resetPassword', user: u })}
                  style={{ background: 'transparent', border: `1px solid ${C.border}`, color: C.muted, borderRadius: 7, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                >Reset password</button>
                {u.is_admin ? (
                  <button
                    onClick={() => setConfirm({ type: 'revokeAdmin', user: u })}
                    style={{ background: 'transparent', border: `1px solid ${C.purple}40`, color: C.purple, borderRadius: 7, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                  >Revogar Admin</button>
                ) : (
                  <button
                    onClick={() => setConfirm({ type: 'makeAdmin', user: u })}
                    style={{ background: 'transparent', border: `1px solid ${C.purple}40`, color: C.purple, borderRadius: 7, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                  >Tornar Admin</button>
                )}
                <button
                  onClick={() => setConfirm({ type: 'delete', user: u })}
                  style={{ background: 'transparent', border: `1px solid ${C.redBorder}`, color: C.red, borderRadius: 7, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                >Eliminar</button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── PROJECTS TAB ───────────────────────────────────────────
function ProjectsTab({ projects, users, onDeleteProject }) {
  const [search, setSearch] = useState('')
  const [confirm, setConfirm] = useState(null)

  const userMap = {}
  users.forEach(u => { userMap[u.id] = u })

  const filtered = projects.filter(p => {
    const q = search.toLowerCase()
    return (
      (p.name || '').toLowerCase().includes(q) ||
      (p.creator_name || '').toLowerCase().includes(q) ||
      (p.area || '').toLowerCase().includes(q)
    )
  })

  const scoreColor = s => s >= 90 ? C.green : s >= 71 ? C.blue : s >= 40 ? C.yellow : s > 0 ? C.red : C.subtle

  return (
    <div>
      {confirm && (
        <ConfirmModal
          title="Eliminar projeto?"
          body={`Vais eliminar permanentemente o projeto "${confirm.name}". Esta ação não pode ser desfeita.`}
          danger
          onCancel={() => setConfirm(null)}
          onConfirm={() => { onDeleteProject(confirm.id); setConfirm(null) }}
        />
      )}

      <div style={{ marginBottom: 16 }}>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Pesquisar por nome, criador ou área…"
          style={{
            width: '100%', background: C.card, border: `1px solid ${C.border}`,
            borderRadius: 10, padding: '10px 14px', color: C.text, fontSize: 14,
            outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
          }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', color: C.muted, padding: '40px 0', fontSize: 14 }}>Nenhum projeto encontrado</div>
        )}
        {filtered.map(p => {
          const created = p.created_at ? new Date(p.created_at).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
          const creator = p.creator_name || userMap[p.user_id]?.full_name || userMap[p.user_id]?.username || 'Anónimo'
          return (
            <div key={p.id} style={{
              ...C.glassStyle,
              background: C.glass, border: `1px solid ${C.glassBorder}`,
              borderRadius: 12, padding: '12px 16px',
              display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
            }}>
              {/* Thumbnail */}
              <div style={{ width: 48, height: 36, borderRadius: 6, background: C.bgAlt, border: `1px solid ${C.border}`, overflow: 'hidden', flexShrink: 0 }}>
                {p.cover_url
                  ? <img src={p.cover_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Folder size={18} color={C.muted} /></div>
                }
              </div>
              {/* Info */}
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 2 }}>{p.name}</div>
                <div style={{ fontSize: 12, color: C.subtle, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><User size={12} /> {creator}</span>
                  {p.area && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><MapPin size={12} /> {p.area}</span>}
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Calendar size={12} /> {created}</span>
                </div>
              </div>
              {/* Score */}
              <div style={{ textAlign: 'center', flexShrink: 0 }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: scoreColor(p.score || 0) }}>{p.score || 0}</div>
                <div style={{ fontSize: 10, color: C.subtle, textTransform: 'uppercase', letterSpacing: 0.5 }}>score</div>
              </div>
              {/* Actions */}
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <a
                  href={`/projeto/${p.slug}`} target="_blank" rel="noopener noreferrer"
                  style={{ background: 'transparent', border: `1px solid ${C.blue}40`, color: C.blue, borderRadius: 7, padding: '6px 12px', fontSize: 12, fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
                >Ver</a>
                <button
                  onClick={() => setConfirm({ id: p.id, name: p.name })}
                  style={{ background: 'transparent', border: `1px solid ${C.redBorder}`, color: C.red, borderRadius: 7, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                >Eliminar</button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── SIGNUPS TAB ────────────────────────────────────────────
function SignupsTab({ signups, users }) {
  const [filter, setFilter] = useState('')
  const [view, setView] = useState('waitlist')
  const q = filter.toLowerCase()

  const waitlistFiltered = signups.filter(s =>
    (s.email || '').toLowerCase().includes(q) ||
    (s.country || '').toLowerCase().includes(q) ||
    (s.city || '').toLowerCase().includes(q)
  )

  const registeredFiltered = users.filter(s =>
    (s.full_name || '').toLowerCase().includes(q) ||
    (s.email || '').toLowerCase().includes(q) ||
    (s.signup_country || '').toLowerCase().includes(q) ||
    (s.signup_city || '').toLowerCase().includes(q)
  )

  const filtered = view === 'waitlist' ? waitlistFiltered : registeredFiltered

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: C.muted }} />
          <input
            placeholder="Procurar por nome, email, país…"
            value={filter}
            onChange={e => setFilter(e.target.value)}
            style={{
              width: '100%', padding: '10px 12px 10px 34px', borderRadius: 8,
              border: `1px solid ${C.border}`, background: C.bgAlt,
              color: C.text, fontSize: 13, fontFamily: 'inherit', outline: 'none',
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: 4, background: C.bgAlt, border: `1px solid ${C.border}`, borderRadius: 8, padding: 3 }}>
          {['waitlist', 'registered'].map(v => (
            <button key={v} onClick={() => setView(v)} style={{
              background: view === v ? C.blue : 'transparent', color: view === v ? '#fff' : C.muted,
              border: 'none', borderRadius: 6, padding: '5px 12px', fontSize: 12, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>{v === 'waitlist' ? `Waitlist (${signups.length})` : `Registados (${users.length})`}</button>
          ))}
        </div>
        <span style={{ fontSize: 12, color: C.muted }}>{filtered.length} resultado{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {filtered.map((s, i) => {
          const date = new Date(s.created_at)
          const now = new Date()
          const diffH = Math.floor((now - date) / 3600000)
          const timeAgo = diffH < 1 ? 'agora' : diffH < 24 ? `há ${diffH}h` : diffH < 168 ? `há ${Math.floor(diffH / 24)}d` : date.toLocaleDateString('pt-PT')
          const isNew = diffH < 24
          const country = view === 'waitlist' ? s.country : s.signup_country
          const city = view === 'waitlist' ? s.city : s.signup_city
          const referrer = view === 'waitlist' ? s.referrer : s.signup_referrer
          const utm = view === 'waitlist' ? s.utm_source : s.signup_utm_source
          const name = s.full_name || s.email || '?'

          return (
            <div key={s.id || i} style={{
              display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
              background: C.card, border: `1px solid ${isNew ? 'var(--color-primary-subtle)' : C.border}`,
              borderRadius: 10, transition: 'border-color 0.15s',
            }}>
              <div style={{
                width: 38, height: 38, borderRadius: '50%',
                background: s.avatar_url ? 'none' : C.blueSoft,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden', flexShrink: 0,
              }}>
                {s.avatar_url
                  ? <img src={s.avatar_url} alt="" referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ fontSize: 14, fontWeight: 700, color: C.blue }}>{name[0].toUpperCase()}</span>
                }
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{s.full_name || 'Sem nome'}</span>
                  {s.role && s.role !== 'aluno' && (
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: s.role === 'professor' ? C.greenSoft : C.purpleSoft, color: s.role === 'professor' ? C.green : C.purple }}>{s.role}</span>
                  )}
                  {isNew && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: C.blueSoft, color: C.blue }}>novo</span>}
                </div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{s.email}</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                {(country || city) && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end', marginBottom: 2 }}>
                    <MapPin size={11} color={C.muted} />
                    <span style={{ fontSize: 12, color: C.muted }}>{[city, country].filter(Boolean).join(', ')}</span>
                  </div>
                )}
                {referrer && (
                  <div style={{ fontSize: 11, color: C.subtle }}>via {referrer.replace(/^https?:\/\//, '').split('/')[0]}</div>
                )}
                {utm && (
                  <div style={{ fontSize: 11, color: C.subtle }}>utm: {utm}</div>
                )}
                <div style={{ fontSize: 11, color: C.subtle, marginTop: 2 }}>{timeAgo}</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── INVITES TAB (professor access codes) ────────────────────
function InvitesTab({ codes, loading, onGenerate, generating, onToggleActive }) {
  const [label, setLabel] = useState('')
  const [maxUses, setMaxUses] = useState('') // empty = ilimitado
  const [justCreated, setJustCreated] = useState(null)
  const [copied, setCopied] = useState(null)
  const [expanded, setExpanded] = useState(null)
  const [togglingId, setTogglingId] = useState(null)

  async function handleToggle(c) {
    setTogglingId(c.id)
    await onToggleActive(c.id, !!c.revoked_at)
    setTogglingId(null)
  }

  async function handleGenerate() {
    const code = await onGenerate(label, maxUses.trim() ? parseInt(maxUses, 10) : null)
    if (code) { setJustCreated(code); setLabel(''); setMaxUses('') }
  }

  function copy(code) {
    navigator.clipboard.writeText(code)
    setCopied(code)
    setTimeout(() => setCopied(null), 1500)
  }

  return (
    <div>
      <div style={{ ...C.glassStyle, background: C.glass, border: `1px solid ${C.glassBorder}`, borderRadius: 12, padding: '20px 22px', marginBottom: 24 }}>
        <h3 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700, color: C.text }}>Gerar código de acesso de Professor</h3>
        <p style={{ margin: '0 0 16px', fontSize: 13, color: C.muted }}>
          Por defeito, o código é reutilizável. Dá para partilhar um único código com uma escola inteira e cada professor regista-se com ele.
          Define um limite de usos só se quiseres um código para uma pessoa em concreto.
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            value={label} onChange={e => setLabel(e.target.value)}
            placeholder="Nota (ex: Escola Secundária de...)"
            style={{ flex: 1, background: C.bgAlt, border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 14px', color: C.text, fontSize: 13, fontFamily: 'inherit', outline: 'none' }}
          />
          <input
            value={maxUses} onChange={e => setMaxUses(e.target.value.replace(/\D/g, ''))}
            placeholder="Nº máx. usos (vazio = ilimitado)"
            inputMode="numeric"
            style={{ width: 200, background: C.bgAlt, border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 14px', color: C.text, fontSize: 13, fontFamily: 'inherit', outline: 'none' }}
          />
          <button
            onClick={handleGenerate} disabled={generating}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: C.blue, border: 'none', borderRadius: 8, padding: '10px 18px', color: '#fff', fontSize: 13, fontWeight: 700, cursor: generating ? 'default' : 'pointer', fontFamily: 'inherit', opacity: generating ? 0.6 : 1, whiteSpace: 'nowrap' }}
          >
            <Plus size={14} /> {generating ? 'A gerar…' : 'Gerar código'}
          </button>
        </div>
        {justCreated && (
          <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 10, background: C.greenSoft, border: '1px solid var(--color-success-subtle)', borderRadius: 8, padding: '10px 14px' }}>
            <span style={{ fontSize: 16, fontWeight: 800, color: C.green, letterSpacing: 2, fontFamily: 'monospace' }}>{justCreated}</span>
            <button onClick={() => copy(justCreated)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: C.green, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontFamily: 'inherit' }}>
              {copied === justCreated ? <Check size={13} /> : <Copy size={13} />} {copied === justCreated ? 'Copiado' : 'Copiar'}
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: C.muted, fontSize: 13 }}>A carregar códigos…</div>
      ) : codes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: C.muted, fontSize: 13 }}>Ainda não geraste nenhum código.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {codes.map(c => {
            const revoked = !!c.revoked_at
            const expired = c.expires_at && new Date(c.expires_at) < new Date()
            const exhausted = c.max_uses != null && c.use_count >= c.max_uses
            const inactive = revoked || expired || exhausted
            const isExpanded = expanded === c.id
            return (
              <div key={c.id} style={{ ...C.glassStyle, background: C.glass, border: `1px solid ${C.glassBorder}`, borderRadius: 10, padding: '12px 16px', opacity: revoked ? 0.6 : 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: C.text, letterSpacing: 1.5, fontFamily: 'monospace', flexShrink: 0 }}>{c.code}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {c.label && <div style={{ fontSize: 12, color: C.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.label}</div>}
                    <div style={{ fontSize: 11, color: C.subtle }}>
                      Criado {new Date(c.created_at).toLocaleDateString('pt-PT')} · {c.max_uses == null ? 'ilimitado' : `limite de ${c.max_uses}`}
                    </div>
                  </div>
                  <button onClick={() => copy(c.code)} title="Copiar" style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', display: 'flex', flexShrink: 0 }}>
                    {copied === c.code ? <Check size={14} color={C.green} /> : <Copy size={14} />}
                  </button>
                  <button
                    onClick={() => setExpanded(isExpanded ? null : c.id)}
                    disabled={c.use_count === 0}
                    style={{ background: 'none', border: 'none', color: C.blue, cursor: c.use_count ? 'pointer' : 'default', fontSize: 12, fontWeight: 700, fontFamily: 'inherit', flexShrink: 0 }}
                  >
                    {c.use_count} uso{c.use_count !== 1 ? 's' : ''}
                  </button>
                  <Badge color={inactive ? C.muted : C.green}>{revoked ? 'Desativado' : expired ? 'Expirado' : exhausted ? 'Esgotado' : 'Ativo'}</Badge>
                  <button
                    onClick={() => handleToggle(c)}
                    disabled={togglingId === c.id}
                    style={{
                      background: 'none', border: `1px solid ${revoked ? 'var(--color-success-subtle)' : 'var(--color-error-subtle)'}`,
                      color: revoked ? C.green : C.red, borderRadius: 6, padding: '4px 10px',
                      fontSize: 11, fontWeight: 700, cursor: togglingId === c.id ? 'default' : 'pointer',
                      fontFamily: 'inherit', flexShrink: 0, opacity: togglingId === c.id ? 0.6 : 1,
                    }}
                  >
                    {togglingId === c.id ? '…' : revoked ? 'Reativar' : 'Desativar'}
                  </button>
                </div>
                {isExpanded && c.redeemers?.length > 0 && (
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {c.redeemers.map(r => (
                      <div key={r.user_id} style={{ fontSize: 12, color: C.muted, display: 'flex', justifyContent: 'space-between' }}>
                        <span>{r.name}</span>
                        <span style={{ color: C.subtle }}>{new Date(r.redeemed_at).toLocaleDateString('pt-PT')}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── MAIN COMPONENT ─────────────────────────────────────────
export default function Admin() {
  const navigate = useNavigate()
  const { user, isAdmin, loading: authLoading } = useAuth()
  const [tab, setTab] = useState('overview')
  const [users, setUsers] = useState([])
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')
  const [signups, setSignups] = useState([])
  const [activityLog, setActivityLog] = useState([])
  const [codes, setCodes] = useState([])
  const [codesLoading, setCodesLoading] = useState(false)
  const [codesLoaded, setCodesLoaded] = useState(false)
  const [generatingCode, setGeneratingCode] = useState(false)

  // Guard
  useEffect(() => {
    if (!authLoading && !isAdmin) navigate('/', { replace: true })
  }, [authLoading, isAdmin, navigate])

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 3500)
  }

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [profilesRes, projectsRes, emailsRes, signupsRes, activityRes] = await Promise.all([
        supabase.from('profiles').select(PROFILE_COLUMNS).order('created_at', { ascending: false }),
        supabase.from('projects').select('*').order('created_at', { ascending: false }),
        supabase.rpc('admin_get_users'),
        supabase.from('waitlist_signups').select('*').order('created_at', { ascending: false }).limit(100),
        supabase.from('activity_log').select('user_id, action, created_at').order('created_at', { ascending: false }).limit(5000),
      ])
      if (profilesRes.error) showToast('Erro ao carregar utilizadores: ' + profilesRes.error.message)
      if (projectsRes.error) showToast('Erro ao carregar projetos: ' + projectsRes.error.message)

      const authMap = {}
      const profileIds = new Set()
      if (emailsRes.data) {
        emailsRes.data.forEach(e => { authMap[e.id] = e })
      }
      const enrichedProfiles = (profilesRes.data || []).map(p => {
        profileIds.add(p.id)
        const auth = authMap[p.id] || {}
        return {
          ...p,
          email: auth.email || p.email || null,
          last_active_at: p.last_active_at || auth.last_sign_in_at || null,
          auth_last_sign_in: auth.last_sign_in_at || null,
          confirmed_at: auth.confirmed_at || null,
        }
      })

      const orphanUsers = (emailsRes.data || [])
        .filter(e => !profileIds.has(e.id))
        .map(e => ({
          id: e.id,
          full_name: e.full_name || null,
          username: null,
          email: e.email,
          role: null,
          avatar_url: e.avatar_url || null,
          created_at: e.created_at,
          last_active_at: e.last_sign_in_at || null,
          auth_last_sign_in: e.last_sign_in_at || null,
          confirmed_at: e.confirmed_at || null,
          is_admin: false,
          _orphan: true,
        }))

      setUsers([...enrichedProfiles, ...orphanUsers])
      setProjects(projectsRes.data || [])
      setSignups(signupsRes.data || [])
      setActivityLog(activityRes.data || [])
    } catch (err) {
      console.error('Admin load error', err)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (isAdmin) loadData()
  }, [isAdmin, loadData])

  const loadCodes = useCallback(async () => {
    setCodesLoading(true)
    const [codesRes, redemptionsRes] = await Promise.all([
      supabase.from('professor_invite_codes').select('*').order('created_at', { ascending: false }),
      supabase.from('professor_invite_redemptions').select('code_id, user_id, redeemed_at').order('redeemed_at', { ascending: false }),
    ])
    if (codesRes.error) showToast('Erro ao carregar códigos: ' + codesRes.error.message)
    const rows = codesRes.data || []
    const redemptions = redemptionsRes.data || []

    const userIds = [...new Set(redemptions.map(r => r.user_id))]
    let nameMap = {}
    if (userIds.length) {
      const { data: profs } = await supabase.from('profiles').select('id, full_name, username').in('id', userIds)
      ;(profs || []).forEach(p => { nameMap[p.id] = p.full_name || p.username || 'Utilizador' })
    }

    setCodes(rows.map(c => ({
      ...c,
      redeemers: redemptions
        .filter(r => r.code_id === c.id)
        .map(r => ({ user_id: r.user_id, redeemed_at: r.redeemed_at, name: nameMap[r.user_id] })),
    })))
    setCodesLoading(false)
    setCodesLoaded(true)
  }, [])

  // codesLoaded (not codes.length) gates the auto-load — an empty or failed
  // fetch still counts as "loaded", otherwise a persistent error retries in
  // an infinite loop (setCodesLoading(false) satisfies the old condition
  // again immediately, re-triggering the effect on every failed attempt).
  useEffect(() => {
    if (isAdmin && tab === 'invites' && !codesLoaded && !codesLoading) loadCodes()
  }, [isAdmin, tab, codesLoaded, codesLoading, loadCodes])

  async function handleGenerateCode(label, maxUses) {
    setGeneratingCode(true)
    const { data, error } = await supabase.rpc('create_professor_invite_code', { p_label: label || null, p_max_uses: maxUses })
    setGeneratingCode(false)
    if (error) { showToast('Erro ao gerar código: ' + error.message); return null }
    loadCodes()
    return data
  }

  async function handleToggleCodeActive(codeId, currentlyRevoked) {
    const { error } = await supabase.rpc('set_professor_invite_code_active', { p_code_id: codeId, p_active: currentlyRevoked })
    if (error) { showToast('Erro ao atualizar código: ' + error.message); return }
    showToast(currentlyRevoked ? 'Código reativado' : 'Código desativado')
    loadCodes()
  }

  async function handleToggleAdmin(userId, makeAdmin) {
    const { error } = await supabase
      .from('profiles')
      .update({ is_admin: makeAdmin })
      .eq('id', userId)
    if (error) { showToast('Erro ao atualizar permissões'); return }
    showToast(makeAdmin ? 'Utilizador é agora administrador' : 'Privilégios revogados')
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_admin: makeAdmin } : u))
  }

  async function handleChangeRole(userId, newRole) {
    const { error } = await supabase.rpc('admin_set_user_role', { target_user_id: userId, new_role: newRole })
    if (error) { showToast('Erro ao trocar cargo: ' + error.message); return }
    showToast('Cargo atualizado')
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u))
  }

  async function handleResetPassword(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    })
    if (error) { showToast('Erro ao enviar reset: ' + error.message); return }
    showToast('Email de reset enviado')
  }

  async function handleDeleteUser(userId) {
    const { error } = await supabase.rpc('admin_delete_user', { target_user_id: userId })
    if (error) { showToast('Erro ao eliminar utilizador: ' + error.message); return }
    showToast('Utilizador eliminado')
    setUsers(prev => prev.filter(u => u.id !== userId))
    setProjects(prev => prev.filter(p => p.user_id !== userId))
  }

  async function handleDeleteProject(projectId) {
    const { error } = await supabase.rpc('admin_delete_project', { p_project_id: projectId })
    if (error) { showToast('Erro ao eliminar projeto: ' + error.message); return }
    showToast('Projeto eliminado')
    setProjects(prev => prev.filter(p => p.id !== projectId))
  }

  if (authLoading || (!isAdmin && !authLoading)) return null

  const tabs = [
    { id: 'overview', label: <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><BarChart2 size={14} /> Visão geral</span> },
    { id: 'users',    label: <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><User size={14} /> Utilizadores ({users.length})</span> },
    { id: 'projects', label: <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Folder size={14} /> Projetos ({projects.length})</span> },
    { id: 'signups',  label: <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Star size={14} /> Signups ({signups.length})</span> },
    { id: 'invites',  label: <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><KeyRound size={14} /> Convites Professor</span> },
  ]

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: 'inherit' }}>
      <Navbar>
        <div style={{ fontSize: 12, color: C.purple, fontWeight: 700 }}>
          <Shield size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />Admin
        </div>
      </Navbar>

      {/* Toast */}
      <div style={{
        position: 'fixed', bottom: 28, left: '50%', transform: `translateX(-50%) translateY(${toast ? 0 : 80}px)`,
        opacity: toast ? 1 : 0, transition: 'all 0.35s cubic-bezier(0.34,1.56,0.64,1)',
        background: 'var(--color-bg-alt)', border: `1px solid ${C.borderBright}`, borderRadius: 10,
        padding: '12px 24px', fontSize: 14, fontWeight: 600, color: C.text,
        zIndex: 3000, pointerEvents: 'none', whiteSpace: 'nowrap',
        boxShadow: 'none',
      }}>{toast}</div>

      <div className="page-content">
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 6 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 10,
              background: C.purple,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: 'none',
            }}><Shield size={22} color="#fff" /></div>
            <div>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 400, fontFamily: 'var(--font-heading)', letterSpacing: '-0.5px' }}>Painel de Administração</h1>
              <p style={{ margin: 0, fontSize: 13, color: C.muted }}>Gestão completa de utilizadores e projetos</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 4, width: 'fit-content' }}>
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                background: tab === t.id ? C.blue : 'transparent',
                color: tab === t.id ? '#fff' : C.muted,
                border: 'none', borderRadius: 8,
                padding: '8px 18px', fontSize: 13, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit',
                transition: 'all 0.15s',
              }}
            >{t.label}</button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 16 }}>
            <style>{`@keyframes ad-sh{0%{background-position:-400px 0}100%{background-position:400px 0}} @keyframes ad-in{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}`}</style>
            {Array.from({length: 8}).map((_, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'var(--color-surface)', border: `1px solid ${C.border}`, borderRadius: 10, animation: `ad-in 0.25s ease-out ${i*60}ms both` }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(90deg,var(--color-bg-alt) 25%,var(--color-surface-hover) 50%,var(--color-bg-alt) 75%)', backgroundSize: '400px 100%', animation: `ad-sh 1.5s ease-in-out infinite` }} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ height: 10, width: `${40+i*5}%`, borderRadius: 4, background: 'linear-gradient(90deg,var(--color-bg-alt) 25%,var(--color-surface-hover) 50%,var(--color-bg-alt) 75%)', backgroundSize: '400px 100%', animation: `ad-sh 1.5s ease-in-out infinite` }} />
                  <div style={{ height: 8, width: '25%', borderRadius: 4, background: 'linear-gradient(90deg,var(--color-bg-alt) 25%,var(--color-surface-hover) 50%,var(--color-bg-alt) 75%)', backgroundSize: '400px 100%', animation: `ad-sh 1.5s ease-in-out infinite 0.2s` }} />
                </div>
                <div style={{ width: 60, height: 22, borderRadius: 99, background: 'linear-gradient(90deg,var(--color-bg-alt) 25%,var(--color-surface-hover) 50%,var(--color-bg-alt) 75%)', backgroundSize: '400px 100%', animation: `ad-sh 1.5s ease-in-out infinite 0.1s` }} />
              </div>
            ))}
          </div>
        ) : (
          <>
            {tab === 'overview' && <OverviewTab users={users} projects={projects} activityLog={activityLog} />}
            {tab === 'users' && (
              <UsersTab
                users={users}
                projects={projects}
                onToggleAdmin={handleToggleAdmin}
                onDeleteUser={handleDeleteUser}
                onChangeRole={handleChangeRole}
                onResetPassword={handleResetPassword}
              />
            )}
            {tab === 'projects' && (
              <ProjectsTab
                projects={projects}
                users={users}
                onDeleteProject={handleDeleteProject}
              />
            )}
            {tab === 'signups' && <SignupsTab signups={signups} users={users} />}
            {tab === 'invites' && (
              <InvitesTab
                codes={codes}
                loading={codesLoading}
                generating={generatingCode}
                onGenerate={handleGenerateCode}
                onToggleActive={handleToggleCodeActive}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}
