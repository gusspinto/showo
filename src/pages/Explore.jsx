import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Navbar } from '../components/Navbar'
import { useAuth } from '../context/AuthContext'
import { Search, Building2, Eye, Briefcase, Users, GraduationCap, BookOpen, Heart } from 'lucide-react'
import CreateProjectModal from '../components/CreateProjectModal'

const colors = {
  bg: 'var(--c-bg)',
  bgAlt: 'var(--c-bg-alt)',
  card: 'var(--c-card)',
  cardHover: 'var(--c-card-hover)',
  border: 'var(--c-border)',
  borderBright: 'var(--c-border-bright)',
  blue: '#1b78f7',
  blueSubtle: 'rgba(27,120,247,0.08)',
  text: 'var(--c-text)',
  muted: 'var(--c-muted)',
  subtle: 'var(--c-subtle)',
  green: '#22c55e',
  yellow: '#fbbf24',
  orange: '#f97316',
  red: '#ef4444',
}

const PROJECT_TYPES = [
  { id: '', label: 'Todos os tipos' },
  { id: 'pap', label: 'PAP / Projeto final' },
  { id: 'internship', label: 'Estágio' },
  { id: 'personal', label: 'Projeto pessoal' },
  { id: 'group', label: 'Trabalho de grupo' },
  { id: 'competition', label: 'Competição' },
]

const ZONES = [
  { id: '', label: 'Toda Portugal' },
  { id: 'Porto', label: 'Porto' },
  { id: 'Lisboa', label: 'Lisboa' },
  { id: 'Braga', label: 'Braga' },
  { id: 'Coimbra', label: 'Coimbra' },
  { id: 'Outro', label: 'Outro' },
]

const TYPE_COLORS = {
  pap:         '#6366f1',
  internship:  '#10b981',
  group:       '#f59e0b',
  personal:    '#1b78f7',
  competition: '#ef4444',
  presentation:'#8b5cf6',
}

function getAreaGradient(area) {
  const a = (area || '').toLowerCase()
  if (a.includes('educa')) return 'linear-gradient(135deg, #1e3a5f, #2d6a4f)'
  if (a.includes('comercial') || a.includes('marketing') || a.includes('vendas')) return 'linear-gradient(135deg, #3d1a6e, #1a3a6e)'
  if (a.includes('tecnolog') || a.includes('informátic') || a.includes('programaç') || a.includes('software')) return 'linear-gradient(135deg, #0d2137, #1a4a6e)'
  if (a.includes('saúde') || a.includes('saude') || a.includes('medical') || a.includes('bio')) return 'linear-gradient(135deg, #1a4a2e, #2d6a4f)'
  return 'linear-gradient(135deg, #2d1a4a, #1a2d6e)'
}

function getLevelColor(score) {
  if (score == null) return colors.muted
  if (score >= 90)  return colors.green
  if (score >= 71)  return colors.blue
  if (score >= 40)  return colors.yellow
  return colors.red
}

function ScoreRingSmall({ score }) {
  const size = 52, stroke = 4
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const dash = (score / 100) * circ
  const color = getLevelColor(score)
  return (
    <div style={{ position: 'relative', width: size, height: size, filter: `drop-shadow(0 0 4px ${color}70)` }}>
      <svg width={size} height={size} overflow="visible" style={{ transform: 'rotate(-90deg)', display: 'block' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={colors.border} strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={`${dash} ${circ-dash}`} strokeLinecap="round" />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 12, fontWeight: 800, color, letterSpacing: '-0.3px' }}>{score}</span>
      </div>
    </div>
  )
}

function SelectFilter({ value, onChange, options, label }) {
  return (
    <div style={{ position: 'relative', minWidth: 160 }}>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          appearance: 'none', WebkitAppearance: 'none',
          background: colors.bgAlt, border: `1px solid ${value ? colors.blue : colors.border}`,
          color: value ? colors.text : colors.muted,
          borderRadius: 10, padding: '9px 36px 9px 14px',
          fontSize: 13, fontWeight: 500, cursor: 'pointer',
          fontFamily: 'inherit', outline: 'none', width: '100%',
          transition: 'border-color 0.15s',
        }}
        aria-label={label}
      >
        {options.map(o => (
          <option key={o.id} value={o.id} style={{ background: colors.bg, color: colors.text }}>
            {o.label}
          </option>
        ))}
      </select>
      <svg style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
        width="12" height="8" viewBox="0 0 12 8" fill="none">
        <path d="M1 1l5 5 5-5" stroke={colors.muted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
  )
}

const ROLE_LABELS = {
  recrutador: { label: 'Recrutador', color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)', border: 'rgba(139,92,246,0.3)', icon: <Search size={16} /> },
  empresa:    { label: 'Empresa',    color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.3)',  icon: <Building2 size={16} /> },
}

export default function Explore() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { profile } = useAuth()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [filterArea, setFilterArea] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterMinScore, setFilterMinScore] = useState(0)
  const [filterZone, setFilterZone] = useState('')
  const [areas, setAreas] = useState([])
  const [sortBy, setSortBy] = useState('score')
  const [filterAvailable, setFilterAvailable] = useState(false)

  const recruiterMode = profile?.role === 'recrutador' || profile?.role === 'empresa'
  const roleInfo = ROLE_LABELS[profile?.role] ?? null

  const VIEWS_KEY = `showo_views_${new Date().toISOString().slice(0, 13)}`

  // People tab — default to 'pessoas' if URL param says so
  const [tab, setTab] = useState(() => searchParams.get('tab') === 'pessoas' ? 'pessoas' : 'projetos')
  const [people, setPeople] = useState([])
  const [peopleLoading, setPeopleLoading] = useState(false)
  const [peopleLoaded, setPeopleLoaded] = useState(false)
  const [peopleSearch, setPeopleSearch] = useState('')
  const [filterSkill, setFilterSkill] = useState('')

  // Likes
  const [likeCounts, setLikeCounts]   = useState({})  // { projectId: number }
  const [userLiked,  setUserLiked]    = useState(new Set())
  const [likeLoading, setLikeLoading] = useState(new Set())

  useEffect(() => {
    async function load() {
      // Main projects query — no FK join to avoid PostgREST relationship errors
      const { data, error } = await supabase
        .from('projects')
        .select('id,name,slug,area,creator_name,course,school_year,ai_tagline,project_type,is_pap,score,created_at,technologies,views,cover_url,user_id,tags')
        .order('score', { ascending: false })
        .limit(300)

      if (!error && data) {
        // Fetch available-for-work users separately (avoids FK join requirement)
        const { data: availProfs } = await supabase
          .from('profiles')
          .select('id')
          .eq('available_for_work', true)
        const availIds = new Set(availProfs?.map(p => p.id) ?? [])

        // Use fresh DB values, keep highest seen this hour (avoids flickering)
        let viewCache = {}
        try { viewCache = JSON.parse(localStorage.getItem(VIEWS_KEY) || '{}') } catch {}
        const merged = data.map(p => {
          const cached = viewCache[p.slug] ?? 0
          const fresh = p.views ?? 0
          const best = Math.max(cached, fresh)
          viewCache[p.slug] = best
          return { ...p, views: best, available_for_work: availIds.has(p.user_id) }
        })
        try { localStorage.setItem(VIEWS_KEY, JSON.stringify(viewCache)) } catch {}
        setProjects(merged)
        const areaSet = [...new Set(merged.map(p => p.area).filter(Boolean))].sort()
        setAreas([{ id: '', label: 'Todas as áreas' }, ...areaSet.map(a => ({ id: a, label: a }))])

        // Load like counts for all projects
        const ids = merged.map(p => p.id)
        supabase.from('project_likes').select('project_id').in('project_id', ids).then(({ data: likeRows }) => {
          const counts = {}
          likeRows?.forEach(l => { counts[l.project_id] = (counts[l.project_id] || 0) + 1 })
          setLikeCounts(counts)
        })
        // Load user's own likes (if logged in — profile is available after auth resolves)
        if (profile?.id) {
          supabase.from('project_likes').select('project_id').in('project_id', ids).eq('user_id', profile.id).then(({ data: ul }) => {
            setUserLiked(new Set(ul?.map(l => l.project_id) || []))
          })
        }
      }
      setLoading(false)
    }
    load()
  }, [profile?.id])

  async function loadPeople() {
    if (peopleLoaded) return
    setPeopleLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, username, bio, role, avatar_url, company, company_role, looking_for, available_for_work, skills')
      .not('full_name', 'is', null)
      .order('created_at', { ascending: false })
      .limit(200)
    setPeople(data || [])
    setPeopleLoaded(true)
    setPeopleLoading(false)
  }

  async function toggleLike(e, projectId) {
    e.stopPropagation()
    if (!profile?.id) { navigate('/login'); return }
    if (likeLoading.has(projectId)) return
    setLikeLoading(prev => new Set([...prev, projectId]))
    const isLiked = userLiked.has(projectId)
    // Optimistic update
    setUserLiked(prev => { const s = new Set(prev); isLiked ? s.delete(projectId) : s.add(projectId); return s })
    setLikeCounts(prev => ({ ...prev, [projectId]: Math.max(0, (prev[projectId] || 0) + (isLiked ? -1 : 1)) }))
    if (isLiked) {
      await supabase.from('project_likes').delete().eq('project_id', projectId).eq('user_id', profile.id)
    } else {
      await supabase.from('project_likes').insert({ project_id: projectId, user_id: profile.id })
    }
    setLikeLoading(prev => { const s = new Set(prev); s.delete(projectId); return s })
  }

  function handleTabChange(t) {
    setTab(t)
    if (t === 'pessoas') loadPeople()
  }

  function handleProjectClick(project) {
    const role = profile?.role ?? null
    const type = (role === 'recrutador' || role === 'empresa') ? 'COMPANY_VIEW' : 'PROJECT_VIEW'
    const key  = `explore_notif_${project.slug}`
    const isOwn = !!(profile?.id && project.user_id && profile.id === project.user_id)

    if (profile?.id && !isOwn && !sessionStorage.getItem(key)) {
      sessionStorage.setItem(key, '1')
      // Get city async — don't block navigation
      fetch('https://ip-api.com/json/?fields=city,status')
        .then(r => r.json())
        .then(geo => {
          const city = geo?.status === 'success' ? (geo.city || 'Portugal') : 'Portugal'
          supabase.functions.invoke('notify-view', { body: { project_slug: project.slug, type, city, visitor_role: role } })
        })
        .catch(() => {
          supabase.functions.invoke('notify-view', { body: { project_slug: project.slug, type, city: 'Portugal', visitor_role: role } })
        })
    }

    navigate(`/projeto/${project.slug}`)
  }

  const query = search.toLowerCase().trim()

  const filtered = projects.filter(p => {
    if (query && !(
      p.name?.toLowerCase().includes(query) ||
      p.area?.toLowerCase().includes(query) ||
      p.course?.toLowerCase().includes(query) ||
      p.creator_name?.toLowerCase().includes(query)
    )) return false
    if (filterArea && p.area !== filterArea) return false
    if (filterType) {
      if (filterType === 'pap') { if (!p.is_pap && p.project_type !== 'pap') return false }
      else if (p.project_type !== filterType) return false
    }
    if (filterMinScore > 0 && (p.score ?? 0) < filterMinScore) return false
    if (filterZone && filterZone !== 'Outro') {
      if (!p.school_year?.includes(filterZone) && !p.course?.includes(filterZone) && !p.creator_name?.includes(filterZone)) return false
    }
    if (filterAvailable && !p.available_for_work) return false
    return true
  })

  const hasFilters = filterArea || filterType || filterMinScore > 0 || filterZone || filterAvailable

  const peopleQuery = peopleSearch.toLowerCase().trim()
  const filteredPeople = people.filter(p => {
    if (peopleQuery && !(
      p.full_name?.toLowerCase().includes(peopleQuery) ||
      p.username?.toLowerCase().includes(peopleQuery) ||
      p.bio?.toLowerCase().includes(peopleQuery) ||
      p.company?.toLowerCase().includes(peopleQuery) ||
      p.looking_for?.toLowerCase().includes(peopleQuery)
    )) return false
    if (filterSkill && !(p.skills || []).includes(filterSkill)) return false
    return true
  })

  const SORT_OPTIONS = [
    { id: 'score',   label: 'Melhor score' },
    { id: 'recent',  label: 'Mais recentes' },
    { id: 'views',   label: 'Mais vistos' },
  ]

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'recent') return new Date(b.created_at) - new Date(a.created_at)
    if (sortBy === 'views')  return (b.views ?? 0) - (a.views ?? 0)
    return (b.score ?? 0) - (a.score ?? 0)
  })

  return (
    <div style={{ minHeight: '100vh', backgroundColor: colors.bg, color: colors.text, fontFamily: 'var(--font-body)' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes shimmer {
          0%   { background-position: -600px 0; }
          100% { background-position:  600px 0; }
        }
        .explore-skeleton {
          background: linear-gradient(90deg, #152030 25%, #1c2d44 50%, #152030 75%);
          background-size: 1200px 100%;
          animation: shimmer 1.6s infinite linear;
          border: 1px solid #1e3050;
          border-radius: 14px;
        }
        .explore-card { transition: all 0.18s ease !important; }
        .explore-card:hover { border-color: var(--c-border-bright) !important; transform: translateY(-3px) !important; box-shadow: 0 12px 40px rgba(0,0,0,0.3) !important; background: var(--c-card-hover) !important; }
        .explore-card-arrow { opacity: 0; transform: translateX(-4px); transition: opacity 0.15s, transform 0.15s; }
        .explore-card:hover .explore-card-arrow { opacity: 1; transform: translateX(0); }
        .explore-grid { grid-template-columns: repeat(auto-fill, minmax(288px, 1fr)); }
        .explore-search { width: 100%; background: var(--c-card); border: 1px solid var(--c-border); border-radius: 12px; color: var(--c-text); font-size: 15px; padding: 14px 16px 14px 48px; outline: none; font-family: var(--font-body); box-sizing: border-box; transition: border-color 0.2s, box-shadow 0.2s; }
        .explore-search:focus { border-color: #1b78f7 !important; box-shadow: 0 0 0 3px rgba(27,120,247,0.12) !important; }
        .filter-row { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
        @media (max-width: 680px) {
          .explore-grid { grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)) !important; }
          .filter-row { gap: 8px; }
          .filter-row select { font-size: 12px !important; padding: 8px 32px 8px 12px !important; }
        }
        @media (max-width: 440px) {
          .explore-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <Navbar>
        <button
          onClick={() => setShowCreateModal(true)}
          style={{ background: `linear-gradient(135deg, ${colors.blue}, #4f46e5)`, color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 16px rgba(27,120,247,0.3)' }}
        >
          Criar projeto
        </button>
      </Navbar>

      <div className="page-content">
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 900, margin: '0 0 8px', letterSpacing: '-0.5px' }}>
            Explorar
          </h1>
          <p style={{ color: colors.muted, margin: 0, fontSize: 15 }}>Descobre projetos e pessoas da comunidade Showo</p>
        </div>

        {/* Search + Tab row */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
          {/* Animated tab switch */}
          <div style={{
            position: 'relative', display: 'inline-flex', flexShrink: 0,
            background: 'var(--c-card)', border: '1px solid var(--c-border)',
            borderRadius: 12, padding: 4,
          }}>
            {/* Sliding pill */}
            <div style={{
              position: 'absolute', top: 4, bottom: 4, left: 4,
              width: 'calc(50% - 4px)',
              background: 'linear-gradient(135deg, #1b78f7, #4f46e5)',
              borderRadius: 9,
              transform: `translateX(${tab === 'projetos' ? 0 : 100}%)`,
              transition: 'transform 0.32s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: '0 4px 18px rgba(27,120,247,0.45)',
              zIndex: 0,
            }} />
            {[
              { id: 'projetos', label: 'Projetos', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg> },
              { id: 'pessoas',  label: 'Pessoas',  icon: <Users size={14} /> },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => handleTabChange(t.id)}
                style={{
                  position: 'relative', zIndex: 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  padding: '9px 0', minWidth: 108, borderRadius: 9, border: 'none',
                  background: 'transparent',
                  color: tab === t.id ? '#fff' : colors.muted,
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'color 0.25s cubic-bezier(0.4,0,0.2,1)',
                  whiteSpace: 'nowrap',
                }}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {/* Unified search input */}
          <div style={{ position: 'relative', flex: 1 }}>
            <svg style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
              width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.subtle} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              className="explore-search"
              placeholder={tab === 'projetos' ? 'Pesquisar por nome, área ou curso...' : 'Pesquisar por nome, empresa, área...'}
              value={tab === 'projetos' ? search : peopleSearch}
              onChange={e => tab === 'projetos' ? setSearch(e.target.value) : setPeopleSearch(e.target.value)}
            />
          </div>
        </div>

        {tab === 'projetos' && (<>

        {/* Recruiter/Empresa banner — shown automatically based on account role */}
        {recruiterMode && roleInfo && (
          <div style={{
            background: roleInfo.bg,
            border: `1px solid ${roleInfo.border}`,
            borderRadius: 12, padding: '14px 20px', marginBottom: 24,
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <span style={{ color: roleInfo.color, display: 'flex', flexShrink: 0, alignItems: 'center' }}>{roleInfo.icon}</span>
            <p style={{ margin: 0, fontSize: 13, color: roleInfo.color, lineHeight: 1.5 }}>
              <strong>Estás em modo {roleInfo.label}</strong> — os criadores dos projetos são notificados quando os visitas.
              Vês também as tecnologias usadas em cada projeto.
            </p>
          </div>
        )}

        {/* Filters */}
        <div className="filter-row" style={{ marginBottom: 28 }}>
          <SelectFilter value={filterArea} onChange={setFilterArea} options={areas} label="Filtrar por área" />
          <SelectFilter value={filterType} onChange={setFilterType} options={PROJECT_TYPES} label="Filtrar por tipo" />
          <SelectFilter value={filterZone} onChange={setFilterZone} options={ZONES} label="Filtrar por zona" />

          {/* Score slider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: colors.bgAlt, border: `1px solid ${filterMinScore > 0 ? colors.blue : colors.border}`, borderRadius: 10, padding: '8px 14px', minWidth: 180 }}>
            <span style={{ fontSize: 12, color: colors.muted, whiteSpace: 'nowrap' }}>Score ≥</span>
            <input
              type="range" min={0} max={100} step={5} value={filterMinScore}
              onChange={e => setFilterMinScore(Number(e.target.value))}
              style={{ flex: 1, accentColor: colors.blue, cursor: 'pointer' }}
            />
            <span style={{ fontSize: 12, fontWeight: 700, color: filterMinScore > 0 ? colors.blue : colors.muted, minWidth: 26, textAlign: 'right' }}>
              {filterMinScore > 0 ? filterMinScore : 'Todos'}
            </span>
          </div>

          <SelectFilter value={sortBy} onChange={setSortBy} options={SORT_OPTIONS} label="Ordenar por" />

          {/* Available for work toggle */}
          <button
            onClick={() => setFilterAvailable(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: filterAvailable ? 'rgba(16,185,129,0.1)' : colors.bgAlt,
              border: `1px solid ${filterAvailable ? 'rgba(16,185,129,0.4)' : colors.border}`,
              borderRadius: 10, padding: '9px 14px',
              color: filterAvailable ? '#10b981' : colors.muted,
              fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              transition: 'all 0.15s', whiteSpace: 'nowrap',
            }}
          >
            <Briefcase size={13} />
            Disponível p/ estágio
          </button>

          {hasFilters && (
            <button
              onClick={() => { setFilterArea(''); setFilterType(''); setFilterMinScore(0); setFilterZone(''); setFilterAvailable(false); setFilterSkill('') }}
              style={{ background: 'transparent', border: `1px solid ${colors.border}`, color: colors.muted, borderRadius: 10, padding: '9px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Limpar filtros
            </button>
          )}
        </div>

        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(288px, 1fr))', gap: 16 }}>
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="explore-skeleton" style={{ height: 240, opacity: 1 - (i % 3) * 0.12 }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: colors.muted }}>
            <p style={{ fontSize: 16 }}>{(query || hasFilters) ? 'Nenhum projeto encontrado com esses filtros.' : 'Ainda não há projetos. Sê o primeiro!'}</p>
            {(query || hasFilters) && (
              <button onClick={() => { setSearch(''); setFilterArea(''); setFilterType(''); setFilterMinScore(0); setFilterZone(''); setFilterAvailable(false) }}
                style={{ marginTop: 12, background: 'transparent', border: `1px solid ${colors.border}`, color: colors.muted, borderRadius: 10, padding: '10px 22px', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
                Limpar pesquisa
              </button>
            )}
          </div>
        ) : (
          <>
            <div style={{ color: colors.subtle, fontSize: 13, marginBottom: 20, fontWeight: 500 }}>
              {sorted.length} projeto{sorted.length !== 1 ? 's' : ''}{query && ` para "${search}"`}
            </div>
            <div className="explore-grid" style={{ display: 'grid', gap: 16 }}>
              {sorted.map(project => (
                <div
                  key={project.id}
                  className="explore-card"
                  onClick={() => handleProjectClick(project)}
                  style={{
                    background: colors.card, border: `1px solid ${colors.border}`,
                    borderRadius: 18, padding: '22px', cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', gap: 12,
                    boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
                  }}
                >
                  {/* Cover */}
                  <div style={{
                    height: project.cover_url ? 120 : 80,
                    borderRadius: '10px 10px 0 0',
                    marginTop: -22, marginLeft: -22, marginRight: -22, marginBottom: 16,
                    background: getAreaGradient(project.area),
                    position: 'relative', overflow: 'hidden',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: project.cover_url ? 0 : '0 16px',
                  }}>
                    {project.cover_url ? (
                      <>
                        <img src={project.cover_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 40%, rgba(13,20,36,0.7) 100%)' }} />
                        {project.project_type && TYPE_COLORS[project.project_type] && (
                          <span style={{ position: 'absolute', top: 10, right: 10, fontSize: 11, fontWeight: 700, color: '#fff', background: TYPE_COLORS[project.project_type] + 'cc', borderRadius: 6, padding: '3px 9px' }}>
                            {PROJECT_TYPES.find(t => t.id === project.project_type)?.label || project.project_type}
                          </span>
                        )}
                      </>
                    ) : (
                      <>
                        <span style={{ fontSize: 36, fontWeight: 900, color: 'rgba(255,255,255,0.25)', userSelect: 'none', lineHeight: 1 }}>
                          {project.name ? project.name[0].toUpperCase() : '?'}
                        </span>
                        {project.project_type && TYPE_COLORS[project.project_type] && (
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', background: TYPE_COLORS[project.project_type] + '99', border: `1px solid ${TYPE_COLORS[project.project_type]}55`, borderRadius: 6, padding: '3px 9px' }}>
                            {PROJECT_TYPES.find(t => t.id === project.project_type)?.label || project.project_type}
                          </span>
                        )}
                      </>
                    )}
                    {/* Views badge — always visible */}
                    <div style={{
                      position: 'absolute', bottom: 8, left: 10,
                      display: 'flex', alignItems: 'center', gap: 4,
                      background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
                      borderRadius: 20, padding: '3px 8px',
                      fontSize: 11, fontWeight: 600,
                      color: (project.views ?? 0) > 0 ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.4)',
                    }}>
                      <Eye size={11} />
                      {project.views ?? 0}
                    </div>
                  </div>

                  {/* Score + area */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {project.area && (
                        <span style={{ fontSize: 11, color: colors.blue, background: 'rgba(27,120,247,0.08)', border: '1px solid rgba(27,120,247,0.15)', borderRadius: 999, padding: '3px 10px', fontWeight: 600 }}>
                          {project.area}
                        </span>
                      )}
                      {project.is_pap && (
                        <span style={{ fontSize: 11, color: colors.yellow, background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.2)', borderRadius: 999, padding: '3px 10px', fontWeight: 600 }}>
                          PAP
                        </span>
                      )}
                      {project.available_for_work && (
                        <span style={{ fontSize: 11, color: '#10b981', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 999, padding: '3px 10px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <Briefcase size={10} style={{ flexShrink: 0 }} /> Disponível
                        </span>
                      )}
                    </div>
                    <ScoreRingSmall score={project.score ?? 0} />
                  </div>

                  {/* Name + tagline */}
                  <div>
                    <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: colors.text, lineHeight: 1.3, letterSpacing: '-0.1px' }}>
                      {project.name}
                    </h3>
                    {project.ai_tagline && (
                      <p style={{ margin: 0, fontSize: 13, color: colors.muted, lineHeight: 1.55, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {project.ai_tagline}
                      </p>
                    )}
                  </div>

                  {/* Creator + school year + like button + hover arrow */}
                  <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    {(project.creator_name || project.school_year) ? (
                      <div style={{ fontSize: 12, color: colors.subtle, fontWeight: 500, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {[project.creator_name, project.school_year].filter(Boolean).join(' · ')}
                      </div>
                    ) : <div />}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      {/* Like button */}
                      <button
                        onClick={e => toggleLike(e, project.id)}
                        title={userLiked.has(project.id) ? 'Remover gosto' : 'Dar gosto'}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 4,
                          background: 'none', border: 'none',
                          padding: '2px 0', cursor: 'pointer',
                          color: userLiked.has(project.id) ? '#ef4444' : colors.subtle,
                          transition: 'color 0.15s',
                        }}
                        onMouseEnter={e => { if (!userLiked.has(project.id)) e.currentTarget.style.color = '#ef4444' }}
                        onMouseLeave={e => { if (!userLiked.has(project.id)) e.currentTarget.style.color = colors.subtle }}
                      >
                        <Heart size={13} fill={userLiked.has(project.id) ? '#ef4444' : 'none'} strokeWidth={2} />
                        {(likeCounts[project.id] || 0) > 0 && (
                          <span style={{ fontSize: 11, fontWeight: 600 }}>{likeCounts[project.id]}</span>
                        )}
                      </button>
                      <svg className="explore-card-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colors.blue} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14M12 5l7 7-7 7"/>
                      </svg>
                    </div>
                  </div>

                  {/* Tags */}
                  {project.tags && project.tags.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                      {project.tags.slice(0, 4).map(tag => (
                        <span key={tag} style={{ fontSize: 11, color: colors.muted, background: 'var(--c-bg-alt)', border: `1px solid ${colors.border}`, borderRadius: 5, padding: '2px 7px' }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Technologies (recruiter mode) */}
                  {recruiterMode && !project.tags?.length && project.technologies && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                      {project.technologies.split(/[,\s·]+/).filter(Boolean).slice(0, 4).map((t, i) => (
                        <span key={i} style={{ fontSize: 11, color: colors.muted, background: 'var(--c-bg-alt)', border: `1px solid ${colors.border}`, borderRadius: 5, padding: '2px 7px' }}>
                          {t.trim()}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        </>)}

        {/* ── Pessoas tab ── */}
        {tab === 'pessoas' && (
          <>
            {/* Skill filter chips */}
            {!peopleLoading && people.length > 0 && (() => {
              const allSkills = [...new Set(people.flatMap(p => p.skills || []))].sort()
              if (allSkills.length === 0) return null
              return (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
                  {[{ id: '', label: 'Todas as competências' }, ...allSkills.map(s => ({ id: s, label: s }))].map(s => (
                    <button
                      key={s.id}
                      onClick={() => setFilterSkill(s.id)}
                      style={{
                        padding: '6px 14px', borderRadius: 20,
                        border: `1.5px solid ${filterSkill === s.id ? colors.blue : colors.border}`,
                        background: filterSkill === s.id ? 'rgba(27,120,247,0.1)' : colors.bgAlt,
                        color: filterSkill === s.id ? colors.blue : colors.muted,
                        fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        fontFamily: 'inherit', transition: 'all 0.15s',
                      }}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              )
            })()}

            {peopleLoading ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(288px, 1fr))', gap: 16 }}>
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="explore-skeleton" style={{ height: 100 }} />
                ))}
              </div>
            ) : filteredPeople.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '64px 24px', color: colors.muted }}>
                <Users size={44} color={colors.subtle} style={{ marginBottom: 16 }} />
                <p style={{ fontSize: 16, fontWeight: 600, margin: '0 0 8px', color: colors.text }}>
                  {peopleQuery ? 'Nenhuma pessoa encontrada.' : 'Ainda não há perfis públicos.'}
                </p>
              </div>
            ) : (
              <>
                <p style={{ fontSize: 13, color: colors.subtle, margin: '0 0 16px' }}>
                  {filteredPeople.length} pessoa{filteredPeople.length !== 1 ? 's' : ''}{peopleQuery && ` para "${peopleSearch}"`}
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(288px, 1fr))', gap: 16 }}>
                  {filteredPeople.map(p => {
                    const ROLE_MAP = {
                      aluno:      { color: '#1b78f7', bg: 'rgba(27,120,247,0.1)',  label: 'Aluno',      icon: <GraduationCap size={11} /> },
                      professor:  { color: '#10b981', bg: 'rgba(16,185,129,0.1)',  label: 'Professor',  icon: <BookOpen size={11} /> },
                      recrutador: { color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)',  label: 'Recrutador', icon: <Search size={11} /> },
                      empresa:    { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  label: 'Empresa',    icon: <Building2 size={11} /> },
                    }
                    const rc = ROLE_MAP[p.role] ?? ROLE_MAP.aluno
                    const displayName = p.full_name || p.username || 'Utilizador'
                    const initial = displayName[0].toUpperCase()
                    const avatarSeeds = ['#1b78f7','#8b5cf6','#0d9488','#f59e0b','#ec4899','#10b981']
                    const avatarBg = avatarSeeds[(initial.charCodeAt(0) || 0) % avatarSeeds.length]
                    const profileUrl = p.username ? `/u/${p.username}` : null

                    return (
                      <div
                        key={p.id}
                        className="explore-card"
                        onClick={() => profileUrl && navigate(profileUrl)}
                        style={{
                          background: colors.card,
                          border: `1px solid ${colors.border}`,
                          borderRadius: 14,
                          padding: '16px 18px',
                          cursor: profileUrl ? 'pointer' : 'default',
                          display: 'flex', alignItems: 'center', gap: 14,
                        }}
                      >
                        {/* Avatar */}
                        {p.avatar_url ? (
                          <img src={p.avatar_url} alt={displayName} style={{ width: 46, height: 46, borderRadius: 12, objectFit: 'cover', flexShrink: 0 }} />
                        ) : (
                          <div style={{ width: 46, height: 46, borderRadius: 12, background: avatarBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19, fontWeight: 800, color: '#fff', flexShrink: 0, letterSpacing: '-0.5px' }}>
                            {initial}
                          </div>
                        )}

                        {/* Info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <span style={{ fontSize: 14, fontWeight: 700, color: colors.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-0.2px' }}>
                              {displayName}
                            </span>
                            {p.available_for_work && (
                              <span style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 700, color: '#10b981', background: 'rgba(16,185,129,0.1)', borderRadius: 999, padding: '2px 7px' }}>
                                <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#10b981' }} /> Disponível
                              </span>
                            )}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: rc.color, background: rc.bg, borderRadius: 6, padding: '2px 8px' }}>
                              {rc.icon} {rc.label}
                            </span>
                            {(p.company || p.area || p.course) && (
                              <span style={{ fontSize: 12, color: colors.subtle, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {p.company ? `${p.company}${p.company_role ? ` · ${p.company_role}` : ''}` : (p.area || p.course)}
                              </span>
                            )}
                          </div>
                          {p.skills && p.skills.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                              {p.skills.slice(0, 4).map(skill => (
                                <span key={skill} style={{
                                  fontSize: 10, fontWeight: 600,
                                  color: filterSkill === skill ? colors.blue : colors.muted,
                                  background: filterSkill === skill ? 'rgba(27,120,247,0.1)' : colors.bgAlt,
                                  border: `1px solid ${filterSkill === skill ? 'rgba(27,120,247,0.3)' : colors.border}`,
                                  borderRadius: 20, padding: '2px 8px',
                                }}>
                                  {skill}
                                </span>
                              ))}
                              {p.skills.length > 4 && (
                                <span style={{ fontSize: 10, color: colors.subtle }}>+{p.skills.length - 4}</span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Arrow */}
                        {profileUrl && (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={colors.subtle} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                        )}
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </>
        )}

      </div>
      {showCreateModal && <CreateProjectModal onClose={() => setShowCreateModal(false)} />}
    </div>
  )
}
