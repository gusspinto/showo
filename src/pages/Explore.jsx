import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Navbar } from '../components/Navbar'
import { useAuth } from '../context/AuthContext'
import { Search, Building2, Eye, Briefcase } from 'lucide-react'

const colors = {
  bg: '#0d1424',
  bgAlt: '#111c32',
  card: '#152030',
  cardHover: '#1c2d44',
  border: '#1e3050',
  borderBright: '#2a4275',
  blue: '#1b78f7',
  blueSubtle: 'rgba(27,120,247,0.08)',
  text: '#e8f2ff',
  muted: '#7d93b0',
  subtle: '#3d5270',
  green: '#22c55e',
  yellow: '#eab308',
  orange: '#f97316',
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
  if (score === 100) return colors.green
  if (score >= 81)  return colors.blue
  if (score >= 61)  return colors.orange
  if (score >= 41)  return colors.yellow
  return colors.muted
}

function ScoreRingSmall({ score }) {
  const size = 52, stroke = 4
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const dash = (score / 100) * circ
  const color = getLevelColor(score)
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', display: 'block' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={colors.border} strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={`${dash} ${circ-dash}`} strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 4px ${color}70)` }} />
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
          <option key={o.id} value={o.id} style={{ background: '#0d1424', color: colors.text }}>
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
  const { profile } = useAuth()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
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

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('projects')
        .select('id,name,slug,area,creator_name,course,school_year,ai_tagline,project_type,is_pap,score,created_at,technologies,views,cover_url,user_id,profiles(available_for_work)')
        .order('score', { ascending: false })
        .limit(300)
      if (!error && data) {
        // Use fresh DB values, but keep highest seen value this hour (avoids flickering down)
        let viewCache = {}
        try { viewCache = JSON.parse(localStorage.getItem(VIEWS_KEY) || '{}') } catch {}
        const merged = data.map(p => {
          const cached = viewCache[p.slug] ?? 0
          const fresh = p.views ?? 0
          const best = Math.max(cached, fresh)
          viewCache[p.slug] = best
          return { ...p, views: best }
        })
        try { localStorage.setItem(VIEWS_KEY, JSON.stringify(viewCache)) } catch {}
        setProjects(merged)
        const areaSet = [...new Set(merged.map(p => p.area).filter(Boolean))].sort()
        setAreas([{ id: '', label: 'Todas as áreas' }, ...areaSet.map(a => ({ id: a, label: a }))])
      }
      setLoading(false)
    }
    load()
  }, [])

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
    if (filterAvailable && !p.profiles?.available_for_work) return false
    return true
  })

  const hasFilters = filterArea || filterType || filterMinScore > 0 || filterZone || filterAvailable

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
        .explore-card { transition: all 0.18s ease !important; }
        .explore-card:hover { border-color: #2a4275 !important; transform: translateY(-3px) !important; box-shadow: 0 12px 40px rgba(0,0,0,0.45) !important; background: #1c2d44 !important; }
        .explore-card-arrow { opacity: 0; transform: translateX(-4px); transition: opacity 0.15s, transform 0.15s; }
        .explore-card:hover .explore-card-arrow { opacity: 1; transform: translateX(0); }
        .explore-grid { grid-template-columns: repeat(auto-fill, minmax(288px, 1fr)); }
        .explore-search { width: 100%; background: #152030; border: 1px solid #1e3050; border-radius: 12px; color: #e8f2ff; font-size: 15px; padding: 14px 16px 14px 48px; outline: none; font-family: var(--font-body); box-sizing: border-box; transition: border-color 0.2s, box-shadow 0.2s; }
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
          onClick={() => navigate('/novo')}
          style={{ background: `linear-gradient(135deg, ${colors.blue}, #4f46e5)`, color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 16px rgba(27,120,247,0.3)' }}
        >
          Criar projeto
        </button>
      </Navbar>

      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '44px 24px 80px' }}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 900, margin: '0 0 8px', letterSpacing: '-0.5px' }}>
            Explorar Projetos
          </h1>
          <p style={{ color: colors.muted, margin: 0, fontSize: 15 }}>Descobre o que outros estudantes estão a construir</p>
        </div>

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

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 16 }}>
          <svg style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
            width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.subtle} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input type="text" className="explore-search"
            placeholder="Pesquisar por nome, área ou curso..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>

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
              onClick={() => { setFilterArea(''); setFilterType(''); setFilterMinScore(0); setFilterZone(''); setFilterAvailable(false) }}
              style={{ background: 'transparent', border: `1px solid ${colors.border}`, color: colors.muted, borderRadius: 10, padding: '9px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Limpar filtros
            </button>
          )}
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
            <div style={{ width: 36, height: 36, border: `3px solid ${colors.border}`, borderTop: `3px solid ${colors.blue}`, borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
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
                        <span style={{ fontSize: 11, color: '#60a5fa', background: 'rgba(27,120,247,0.08)', border: '1px solid rgba(27,120,247,0.15)', borderRadius: 999, padding: '3px 10px', fontWeight: 600 }}>
                          {project.area}
                        </span>
                      )}
                      {project.is_pap && (
                        <span style={{ fontSize: 11, color: colors.yellow, background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.2)', borderRadius: 999, padding: '3px 10px', fontWeight: 600 }}>
                          PAP
                        </span>
                      )}
                      {project.profiles?.available_for_work && (
                        <span style={{ fontSize: 11, color: '#10b981', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 999, padding: '3px 10px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          💼 Disponível
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

                  {/* Creator + school year + hover arrow */}
                  <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    {(project.creator_name || project.school_year) ? (
                      <div style={{ fontSize: 12, color: colors.subtle, fontWeight: 500, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {[project.creator_name, project.school_year].filter(Boolean).join(' · ')}
                      </div>
                    ) : <div />}
                    <svg className="explore-card-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colors.blue} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                      <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                  </div>

                  {/* Technologies (recruiter mode) */}
                  {recruiterMode && project.technologies && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                      {project.technologies.split(/[,\s·]+/).filter(Boolean).slice(0, 4).map((t, i) => (
                        <span key={i} style={{ fontSize: 11, color: colors.muted, background: 'rgba(255,255,255,0.04)', border: `1px solid ${colors.border}`, borderRadius: 5, padding: '2px 7px' }}>
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
      </div>
    </div>
  )
}
