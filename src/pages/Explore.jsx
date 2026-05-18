import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Navbar } from '../components/Navbar'
import { useAuth } from '../context/AuthContext'

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
  recrutador: { label: 'Recrutador', color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)', border: 'rgba(139,92,246,0.3)', emoji: '🔍' },
  empresa:    { label: 'Empresa',    color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.3)',  emoji: '🏢' },
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

  const recruiterMode = profile?.role === 'recrutador' || profile?.role === 'empresa'
  const roleInfo = ROLE_LABELS[profile?.role] ?? null

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('projects')
        .select('id,name,slug,area,creator_name,course,school_year,ai_tagline,project_type,is_pap,score,created_at,technologies,views')
        .order('score', { ascending: false })
        .limit(300)
      if (!error && data) {
        setProjects(data)
        // Extract unique areas
        const areaSet = [...new Set(data.map(p => p.area).filter(Boolean))].sort()
        setAreas([{ id: '', label: 'Todas as áreas' }, ...areaSet.map(a => ({ id: a, label: a }))])
      }
      setLoading(false)
    }
    load()
  }, [])

  function handleProjectClick(project) {
    if (recruiterMode) {
      // Trigger COMPANY_VIEW notification immediately in recruiter mode
      const key = `recruiter_viewed_${project.slug}`
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, '1')
        supabase.functions.invoke('notify-view', {
          body: { project_slug: project.slug, type: 'COMPANY_VIEW', visitor_role: profile?.role ?? null }
        })
      }
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
    return true
  })

  const hasFilters = filterArea || filterType || filterMinScore > 0 || filterZone

  return (
    <div style={{ minHeight: '100vh', backgroundColor: colors.bg, color: colors.text, fontFamily: 'var(--font-body)' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .explore-card { transition: all 0.2s ease !important; }
        .explore-card:hover { border-color: #2a4275 !important; transform: translateY(-3px) !important; box-shadow: 0 12px 40px rgba(0,0,0,0.45) !important; }
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
            <span style={{ fontSize: 18, flexShrink: 0 }}>{roleInfo.emoji}</span>
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

          {hasFilters && (
            <button
              onClick={() => { setFilterArea(''); setFilterType(''); setFilterMinScore(0); setFilterZone('') }}
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
              <button onClick={() => { setSearch(''); setFilterArea(''); setFilterType(''); setFilterMinScore(0); setFilterZone('') }}
                style={{ marginTop: 12, background: 'transparent', border: `1px solid ${colors.border}`, color: colors.muted, borderRadius: 10, padding: '10px 22px', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
                Limpar pesquisa
              </button>
            )}
          </div>
        ) : (
          <>
            <div style={{ color: colors.subtle, fontSize: 13, marginBottom: 20, fontWeight: 500 }}>
              {filtered.length} projeto{filtered.length !== 1 ? 's' : ''}{query && ` para "${search}"`}
            </div>
            <div className="explore-grid" style={{ display: 'grid', gap: 16 }}>
              {filtered.map(project => (
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
                  {/* Cover gradient */}
                  <div style={{
                    height: 80, borderRadius: '10px 10px 0 0',
                    marginTop: -22, marginLeft: -22, marginRight: -22, marginBottom: 16,
                    background: getAreaGradient(project.area),
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0 16px',
                  }}>
                    <span style={{ fontSize: 36, fontWeight: 900, color: 'rgba(255,255,255,0.25)', userSelect: 'none', lineHeight: 1 }}>
                      {project.name ? project.name[0].toUpperCase() : '?'}
                    </span>
                    {project.project_type && TYPE_COLORS[project.project_type] && (
                      <span style={{
                        fontSize: 11, fontWeight: 700, color: '#fff',
                        background: TYPE_COLORS[project.project_type] + '99',
                        border: `1px solid ${TYPE_COLORS[project.project_type]}55`,
                        borderRadius: 6, padding: '3px 9px',
                      }}>
                        {PROJECT_TYPES.find(t => t.id === project.project_type)?.label || project.project_type}
                      </span>
                    )}
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

                  {/* Creator + school year */}
                  {(project.creator_name || project.school_year) && (
                    <div style={{ fontSize: 12, color: colors.subtle, fontWeight: 500 }}>
                      {[project.creator_name, project.school_year].filter(Boolean).join(' · ')}
                    </div>
                  )}

                  {/* Technologies (recruiter mode) */}
                  {recruiterMode && project.technologies && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {project.technologies.split(/[,\s·]+/).filter(Boolean).slice(0, 4).map((t, i) => (
                        <span key={i} style={{ fontSize: 11, color: colors.muted, background: 'rgba(255,255,255,0.04)', border: `1px solid ${colors.border}`, borderRadius: 5, padding: '2px 7px' }}>
                          {t.trim()}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* CTA */}
                  <div style={{ marginTop: 'auto', paddingTop: 6, borderTop: '1px solid rgba(30,48,80,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13, color: '#60a5fa', fontWeight: 600 }}>
                      {recruiterMode ? '👀 Visitar candidato →' : 'Ver projeto →'}
                    </span>
                    {(project.views ?? 0) > 0 && (
                      <span style={{ fontSize: 11, color: colors.subtle }}>👁 {project.views}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
