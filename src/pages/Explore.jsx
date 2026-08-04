import { useEffect, useState, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Navbar } from '../components/Navbar'
import { useAuth } from '../context/AuthContext'
import { Search, Building2, Eye, Briefcase, Users, GraduationCap, BookOpen, SlidersHorizontal, X } from 'lucide-react'
import './Explore.css'

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
  pap:         'var(--color-info)',
  internship:  'var(--color-success)',
  group:       'var(--color-warning)',
  personal:    'var(--color-primary)',
  competition: 'var(--color-error)',
  presentation:'var(--color-accent)',
}

function getAreaColor(area) {
  const a = (area || '').toLowerCase()
  if (a.includes('educa')) return 'var(--color-info-subtle)'
  if (a.includes('comercial') || a.includes('marketing') || a.includes('vendas')) return 'var(--color-primary-subtle)'
  if (a.includes('tecnolog') || a.includes('informátic') || a.includes('programaç') || a.includes('software')) return 'var(--color-surface-alt)'
  if (a.includes('saúde') || a.includes('saude') || a.includes('medical') || a.includes('bio')) return 'var(--color-success-subtle)'
  return 'var(--color-surface-alt)'
}

function SelectFilter({ value, onChange, options, label }) {
  return (
    <div className="explore-select-wrap">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className={`explore-select${value ? ' has-value' : ''}`}
        aria-label={label}
      >
        {options.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
      </select>
      <svg className="explore-select-arrow" width="12" height="8" viewBox="0 0 12 8" fill="none">
        <path d="M1 1l5 5 5-5" stroke="var(--color-text-secondary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
  )
}

const VIEWS_KEY = `showo_views_${new Date().toISOString().slice(0, 13)}`

const ROLE_LABELS = {
  recrutador: { label: 'Recrutador', color: 'var(--color-accent)', icon: <Search size={16} /> },
  empresa:    { label: 'Empresa',    color: 'var(--color-warning)', icon: <Building2 size={16} /> },
}

function ProjectsSkeleton() {
  return (
    <div className="explore-grid">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="skel skel-card" style={{ animationDelay: `${i * 0.12}s` }}>
          <div className="skel-cover" style={{ aspectRatio: '16/6' }} />
          <div className="flex-col gap-2 p-4">
            <div className="skel-line w-40 h-sm" />
            <div className="skel-line w-80 h-lg" />
            <div className="skel-line w-full" />
            <div className="skel-line w-60" />
          </div>
        </div>
      ))}
    </div>
  )
}

function PeopleSkeleton() {
  return (
    <div className="explore-grid">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="skel skel-card" style={{ animationDelay: `${i * 0.1}s` }}>
          <div className="flex items-center gap-3 p-4">
            <div className="skel-circle" style={{ width: 46, height: 46 }} />
            <div className="flex-col gap-2 flex-1">
              <div className="skel-line w-60 h-lg" />
              <div className="skel-line w-40 h-sm" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
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
  const [visibleCount, setVisibleCount] = useState(24)

  const [tab, setTab] = useState(() => searchParams.get('tab') === 'pessoas' ? 'pessoas' : 'projetos')
  const [people, setPeople] = useState([])
  const [peopleLoading, setPeopleLoading] = useState(false)
  const [peopleLoaded, setPeopleLoaded] = useState(false)
  const [peopleSearch, setPeopleSearch] = useState('')
  const [filterSkill, setFilterSkill] = useState('')
  const [filterPeopleArea, setFilterPeopleArea] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [showPeopleFilters, setShowPeopleFilters] = useState(false)

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('projects')
        .select('id,name,slug,area,creator_name,course,school_year,ai_tagline,project_type,is_pap,score,created_at,technologies,views,cover_url,user_id,tags')
        .order('score', { ascending: false })
        .limit(300)

      if (!error && data) {
        const { data: availProfs } = await supabase
          .from('profiles')
          .select('id')
          .eq('available_for_work', true)
        const availIds = new Set(availProfs?.map(p => p.id) ?? [])

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
      .select('id, full_name, username, bio, role, avatar_url, company, company_role, looking_for, available_for_work, skills, area')
      .not('full_name', 'is', null)
      .is('banned_at', null)
      .order('created_at', { ascending: false })
      .limit(200)
    setPeople(data || [])
    setPeopleLoaded(true)
    setPeopleLoading(false)
  }

  function handleTabChange(t) {
    setTab(t)
    if (t === 'pessoas') loadPeople()
  }

  function handleProjectClick(project) {
    const role = profile?.role ?? null
    const type = (role === 'recrutador' || role === 'empresa') ? 'COMPANY_VIEW' : 'PROJECT_VIEW'
    const key = `explore_notif_${project.slug}`
    const isOwn = !!(profile?.id && project.user_id && profile.id === project.user_id)

    if (profile?.id && !isOwn && !sessionStorage.getItem(key)) {
      sessionStorage.setItem(key, '1')
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

  const filtered = useMemo(() => projects.filter(p => {
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
  }), [projects, query, filterArea, filterType, filterMinScore, filterZone, filterAvailable])

  const hasFilters = filterArea || filterType || filterMinScore > 0 || filterZone || filterAvailable
  const activeFilterCount = [filterArea, filterType, filterZone, filterMinScore > 0, filterAvailable].filter(Boolean).length

  const peopleQuery = peopleSearch.toLowerCase().trim()
  const filteredPeople = useMemo(() => people.filter(p => {
    if (peopleQuery && !(
      p.full_name?.toLowerCase().includes(peopleQuery) ||
      p.username?.toLowerCase().includes(peopleQuery) ||
      p.bio?.toLowerCase().includes(peopleQuery) ||
      p.company?.toLowerCase().includes(peopleQuery) ||
      p.looking_for?.toLowerCase().includes(peopleQuery)
    )) return false
    if (filterSkill && !(p.skills || []).includes(filterSkill)) return false
    if (filterPeopleArea && p.area !== filterPeopleArea) return false
    return true
  }), [people, peopleQuery, filterSkill, filterPeopleArea])

  const SORT_OPTIONS = [
    { id: 'score',  label: 'Melhor score' },
    { id: 'recent', label: 'Mais recentes' },
    { id: 'views',  label: 'Mais vistos' },
  ]

  const sorted = useMemo(() => [...filtered].sort((a, b) => {
    if (sortBy === 'recent') return new Date(b.created_at) - new Date(a.created_at)
    if (sortBy === 'views')  return (b.views ?? 0) - (a.views ?? 0)
    return (b.score ?? 0) - (a.score ?? 0)
  }), [filtered, sortBy])

  useEffect(() => { setVisibleCount(24) }, [query, filterArea, filterType, filterMinScore, filterZone, filterAvailable, sortBy])

  return (
    <div className="min-h-screen bg-page font-body">
      <Navbar>
        {profile?.role !== 'professor' && (
          <button
            className="explore-create-btn"
            onClick={() => profile?.id ? navigate('/novo') : navigate('/register')}
          >
            Criar projeto
          </button>
        )}
      </Navbar>

      <div className="page-content">
        {/* Header */}
        <div className="explore-header">
          <h1 className="explore-title">Explorar</h1>
          <p className="explore-subtitle">Descobre projetos e pessoas da comunidade Showo</p>
        </div>

        {/* Search + Tab + Filter row */}
        <div className={`explore-toolbar${showFilters ? ' has-filters' : ''}`}>
          {/* Tab switch */}
          <div className="explore-tabs-wrap">
            <div className={`explore-tab-pill${tab === 'pessoas' ? ' pessoas' : ''}`} />
            {[
              { id: 'projetos', label: 'Projetos', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg> },
              { id: 'pessoas',  label: 'Pessoas',  icon: <Users size={14} /> },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => handleTabChange(t.id)}
                className={`explore-tab-btn${tab === t.id ? ' active' : ''}`}
              >
                {t.icon}
                <span className="explore-tab-label">{t.label}</span>
              </button>
            ))}
          </div>

          {/* Search input */}
          <div className="explore-search-wrap">
            <svg className="explore-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              className="explore-search"
              placeholder={tab === 'projetos' ? 'Pesquisar...' : 'Pesquisar pessoa...'}
              value={tab === 'projetos' ? search : peopleSearch}
              onChange={e => tab === 'projetos' ? setSearch(e.target.value) : setPeopleSearch(e.target.value)}
            />
          </div>

          {/* Filter toggle */}
          {tab === 'projetos' && (
            <button
              className={`explore-filter-btn${showFilters || activeFilterCount > 0 ? ' active' : ''}`}
              onClick={() => setShowFilters(f => !f)}
              aria-label="Filtros"
            >
              <SlidersHorizontal size={15} />
              <span className="explore-filter-btn-label">Filtros</span>
              {activeFilterCount > 0 && <span className="explore-filter-badge">{activeFilterCount}</span>}
            </button>
          )}
          {tab === 'pessoas' && (
            <button
              className={`explore-filter-btn${showPeopleFilters || filterPeopleArea || filterSkill ? ' active' : ''}`}
              onClick={() => setShowPeopleFilters(f => !f)}
              aria-label="Filtros"
            >
              <SlidersHorizontal size={15} />
              <span className="explore-filter-btn-label">Filtros</span>
              {(filterPeopleArea || filterSkill) && (
                <span className="explore-filter-badge">{[filterPeopleArea, filterSkill].filter(Boolean).length}</span>
              )}
            </button>
          )}
        </div>

        {/* ── Projetos tab ── */}
        {tab === 'projetos' && (<>
          {recruiterMode && roleInfo && (
            <div className="explore-recruiter-banner" style={{ borderLeftColor: roleInfo.color }}>
              <span className="flex-shrink-0 flex items-center" style={{ color: roleInfo.color }}>{roleInfo.icon}</span>
              <p>
                <strong style={{ color: roleInfo.color }}>Estás em modo {roleInfo.label}</strong> — os criadores dos projetos são notificados quando os visitas.
                Vês também as tecnologias usadas em cada projeto.
              </p>
            </div>
          )}

          {showFilters && (
            <div className="explore-filter-panel">
              <SelectFilter value={filterArea} onChange={setFilterArea} options={areas} label="Filtrar por área" />
              <SelectFilter value={filterType} onChange={setFilterType} options={PROJECT_TYPES} label="Filtrar por tipo" />
              <SelectFilter value={filterZone} onChange={setFilterZone} options={ZONES} label="Filtrar por zona" />
              <SelectFilter value={sortBy} onChange={setSortBy} options={SORT_OPTIONS} label="Ordenar por" />

              <div className={`filter-score-wrap${filterMinScore > 0 ? ' has-value' : ''}`}>
                <span className="filter-score-label">Score ≥</span>
                <input type="range" min={0} max={100} step={5} value={filterMinScore}
                  onChange={e => setFilterMinScore(Number(e.target.value))}
                  className="filter-score-range" />
                <span className={`filter-score-value${filterMinScore > 0 ? ' active' : ''}`}>
                  {filterMinScore > 0 ? filterMinScore : 'Todos'}
                </span>
              </div>

              <button
                onClick={() => setFilterAvailable(v => !v)}
                className={`filter-toggle-btn${filterAvailable ? ' active' : ''}`}
              >
                <Briefcase size={13} /> Disponível p/ estágio
              </button>

              {hasFilters && (
                <button
                  className="filter-clear-btn"
                  onClick={() => { setFilterArea(''); setFilterType(''); setFilterMinScore(0); setFilterZone(''); setFilterAvailable(false); setFilterSkill('') }}
                >
                  <X size={13} /> Limpar filtros
                </button>
              )}
            </div>
          )}

          {loading ? (
            <ProjectsSkeleton />
          ) : filtered.length === 0 ? (
            <div className="explore-empty">
              <p className="text-md">{(query || hasFilters) ? 'Nenhum projeto encontrado com esses filtros.' : 'Ainda não há projetos. Sê o primeiro!'}</p>
              {(query || hasFilters) && (
                <button className="explore-empty-clear"
                  onClick={() => { setSearch(''); setFilterArea(''); setFilterType(''); setFilterMinScore(0); setFilterZone(''); setFilterAvailable(false) }}>
                  Limpar pesquisa
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="explore-result-count">
                {sorted.length} projeto{sorted.length !== 1 ? 's' : ''}{query && ` para "${search}"`}
              </div>
              <div className="explore-grid">
                {sorted.slice(0, visibleCount).map(project => (
                  <div key={project.id} className="explore-card" onClick={() => handleProjectClick(project)}>
                    {/* Cover */}
                    <div
                      className="explore-card-cover"
                      style={{
                        height: project.cover_url ? 160 : 96,
                        background: project.cover_url ? undefined : getAreaColor(project.area),
                        padding: 0,
                      }}
                    >
                      {project.cover_url ? (
                        <>
                          <img src={project.cover_url} alt="" />
                          <div className="explore-card-cover-gradient" />
                          {project.project_type && TYPE_COLORS[project.project_type] && (
                            <span className="explore-type-badge on-cover" style={{ background: TYPE_COLORS[project.project_type] + 'cc' }}>
                              {PROJECT_TYPES.find(t => t.id === project.project_type)?.label || project.project_type}
                            </span>
                          )}
                        </>
                      ) : (
                        <>
                          <span className="explore-card-cover-letter">
                            {project.name ? project.name[0].toUpperCase() : '?'}
                          </span>
                          {project.project_type && TYPE_COLORS[project.project_type] && (
                            <span className="explore-type-badge" style={{ background: TYPE_COLORS[project.project_type] + '99', border: `1px solid ${TYPE_COLORS[project.project_type]}55`, position: 'absolute', top: 10, right: 10 }}>
                              {PROJECT_TYPES.find(t => t.id === project.project_type)?.label || project.project_type}
                            </span>
                          )}
                        </>
                      )}
                      {project.score != null && (
                        <div className="explore-score-badge">
                          {project.score}
                        </div>
                      )}
                      {(project.views ?? 0) > 0 && (
                        <div className="explore-views-badge has-views">
                          <Eye size={11} />
                          {project.views}
                        </div>
                      )}
                    </div>

                    {/* Badges */}
                    <div className="explore-card-badges">
                      {project.area && <span className="text-primary">{project.area}</span>}
                      {project.is_pap && <>{project.area && <span className="text-subtle">·</span>}<span className="text-warning">{'​'}PAP</span></>}
                      {project.available_for_work && (
                        <>
                          {(project.area || project.is_pap) && <span className="text-subtle">·</span>}
                          <span className="text-primary flex items-center gap-1" title="Disponível para estágio">
                            <Briefcase size={10} className="flex-shrink-0" />
                          </span>
                        </>
                      )}
                    </div>

                    {/* Name + tagline */}
                    <div>
                      <h3 className="explore-card-name">{project.name}</h3>
                      {project.ai_tagline && <p className="explore-card-tagline">{project.ai_tagline}</p>}
                    </div>

                    {/* Footer */}
                    <div className="explore-card-footer">
                      {(project.creator_name || project.school_year) ? (
                        <div className="explore-card-creator">
                          {[project.creator_name, project.school_year].filter(Boolean).join(' · ')}
                        </div>
                      ) : <div />}
                      <svg className="explore-card-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14M12 5l7 7-7 7"/>
                      </svg>
                    </div>

                    {/* Tags */}
                    {project.tags && project.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {project.tags.slice(0, 4).map(tag => (
                          <span key={tag} className="explore-tag">{tag}</span>
                        ))}
                      </div>
                    )}

                    {/* Technologies (recruiter mode) */}
                    {recruiterMode && !project.tags?.length && project.technologies && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {project.technologies.split(/[,\s·]+/).filter(Boolean).slice(0, 4).map((t, i) => (
                          <span key={i} className="explore-tag">{t.trim()}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {visibleCount < sorted.length && (
                <div className="text-center mt-8">
                  <button className="explore-load-more" onClick={() => setVisibleCount(v => v + 24)}>
                    Carregar mais ({sorted.length - visibleCount} restantes)
                  </button>
                </div>
              )}
            </>
          )}
        </>)}

        {/* ── Pessoas tab ── */}
        {tab === 'pessoas' && (
          <>
            {showPeopleFilters && !peopleLoading && people.length > 0 && (
              <div className="explore-filter-panel people-filters">
                {(() => {
                  const allAreas = [...new Set(people.map(p => p.area).filter(Boolean))].sort()
                  if (allAreas.length === 0) return null
                  return (
                    <div>
                      <div className="filter-chip-label">Área</div>
                      <div className="filter-chip-group">
                        {[{ id: '', label: 'Todas' }, ...allAreas.map(a => ({ id: a, label: a }))].map(a => (
                          <button key={a.id} onClick={() => setFilterPeopleArea(a.id)}
                            className={`filter-chip${filterPeopleArea === a.id ? ' active' : ''}`}>
                            {a.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                })()}

                {(() => {
                  const allSkills = [...new Set(people.flatMap(p => p.skills || []))].sort()
                  if (allSkills.length === 0) return null
                  return (
                    <div>
                      <div className="filter-chip-label">Competências</div>
                      <div className="filter-chip-group">
                        {[{ id: '', label: 'Todas' }, ...allSkills.map(s => ({ id: s, label: s }))].map(s => (
                          <button key={s.id} onClick={() => setFilterSkill(s.id)}
                            className={`filter-chip${filterSkill === s.id ? ' active' : ''}`}>
                            {s.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                })()}

                {(filterPeopleArea || filterSkill) && (
                  <button className="filter-clear-btn" style={{ alignSelf: 'flex-start' }}
                    onClick={() => { setFilterPeopleArea(''); setFilterSkill('') }}>
                    <X size={13} /> Limpar filtros
                  </button>
                )}
              </div>
            )}

            {peopleLoading ? (
              <PeopleSkeleton />
            ) : filteredPeople.length === 0 ? (
              <div className="explore-people-empty">
                <Users size={44} color="var(--color-text-tertiary)" className="mb-4" />
                <p className="explore-people-empty-title">
                  {peopleQuery ? 'Nenhuma pessoa encontrada.' : 'Ainda não há perfis públicos.'}
                </p>
              </div>
            ) : (
              <>
                <p className="explore-result-count">
                  {filteredPeople.length} pessoa{filteredPeople.length !== 1 ? 's' : ''}{peopleQuery && ` para "${peopleSearch}"`}
                </p>
                <div className="explore-grid">
                  {filteredPeople.map(p => {
                    const ROLE_MAP = {
                      aluno:      { color: 'var(--color-primary)', label: 'Aluno',      icon: <GraduationCap size={11} /> },
                      professor:  { color: '#10b981',              label: 'Professor',  icon: <BookOpen size={11} /> },
                      recrutador: { color: 'var(--color-accent)',  label: 'Recrutador', icon: <Search size={11} /> },
                      empresa:    { color: 'var(--color-warning)', label: 'Empresa',    icon: <Building2 size={11} /> },
                    }
                    const rc = ROLE_MAP[p.role] ?? ROLE_MAP.aluno
                    const displayName = p.full_name || p.username || 'Utilizador'
                    const initial = displayName[0].toUpperCase()
                    const avatarSeeds = ['var(--color-primary)','var(--color-accent)','#0d9488','var(--color-warning)','#ec4899','#10b981']
                    const avatarBg = avatarSeeds[(initial.charCodeAt(0) || 0) % avatarSeeds.length]
                    const profileUrl = `/u/${p.username || p.id}`

                    return (
                      <div key={p.id} className="explore-person-card"
                        onClick={() => navigate(profileUrl)}
                        style={{ cursor: 'pointer' }}>
                        {p.avatar_url ? (
                          <img src={p.avatar_url} alt={displayName} className="explore-avatar" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="explore-avatar-fallback" style={{ background: avatarBg }}>{initial}</div>
                        )}

                        <div className="flex-1" style={{ minWidth: 0 }}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="explore-person-name">{displayName}</span>
                            {p.available_for_work && (
                              <span className="flex-shrink-0 flex items-center text-primary" title="Disponível para estágio">
                                <Briefcase size={12} strokeWidth={2.5} />
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="explore-person-role" style={{ color: rc.color }}>
                              {rc.icon} {rc.label}
                            </span>
                            {(p.company || p.area || p.course) && (
                              <span className="explore-person-detail">
                                · {p.company ? `${p.company}${p.company_role ? ` · ${p.company_role}` : ''}` : (p.area || p.course)}
                              </span>
                            )}
                          </div>
                          {p.skills && p.skills.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {p.skills.slice(0, 4).map(skill => (
                                <span key={skill} className={`explore-skill-tag${filterSkill === skill ? ' active' : ''}`}>
                                  {skill}
                                </span>
                              ))}
                              {p.skills.length > 4 && (
                                <span className="text-2xs text-subtle">+{p.skills.length - 4}</span>
                              )}
                            </div>
                          )}
                        </div>

                        {profileUrl && (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                            <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                          </svg>
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
    </div>
  )
}
