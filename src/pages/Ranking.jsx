import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Navbar } from '../components/Navbar'
import { useAuth } from '../context/AuthContext'
import { Trophy, ChevronRight, TrendingUp, TrendingDown, Minus, SlidersHorizontal, X } from 'lucide-react'

const RANK_STORAGE_KEY = 'showo_ranking_positions'

function loadPrevPositions() {
  try {
    const raw = localStorage.getItem(RANK_STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

function saveCurrentPositions(projects) {
  try {
    const map = {}
    projects.forEach((p, i) => { map[p.id] = i + 1 })
    localStorage.setItem(RANK_STORAGE_KEY, JSON.stringify(map))
  } catch {}
}

const C = {
  bg:          'var(--color-bg)',
  bgAlt:       'var(--color-bg-alt)',
  card:        'var(--color-surface)',
  cardHover:   'var(--color-surface-hover)',
  border:      'var(--color-border)',
  borderBright:'var(--color-border-hover)',
  blue:        'var(--color-primary)',
  text:        'var(--color-text)',
  muted:       'var(--color-text-secondary)',
  subtle:      'var(--color-text-tertiary)',
  green:       'var(--color-success)',
  yellow:      'var(--color-warning)',
  orange:      'var(--color-warning)',
  glass: 'var(--color-glass)', glassHover: 'var(--color-glass-hover)',
  glassBorder: 'var(--color-glass-border)', glassBorderBright: 'var(--color-glass-border-bright)',
  glassStyle: { backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' },
}

// Tier color based on score — connects directly to the scoring system
function getTierColor(score) {
  if (score >= 86) return 'var(--color-success)'   // professional
  if (score >= 71) return 'var(--color-accent)'   // almost professional
  if (score >= 51) return '#3b82f6'   // gaining shape
  if (score >= 31) return 'var(--color-warning)'   // starting
  return C.subtle                      // draft
}

// Rank position accent: 1st=yellow, 2nd=muted(silver-ish), 3rd=orange
const RANK_ACCENT = [C.yellow, C.muted, C.orange]

function RankDelta({ currentRank, prevRank }) {
  if (!prevRank || prevRank === currentRank) {
    return <Minus size={11} color="var(--color-text-tertiary)" />
  }
  const diff = prevRank - currentRank  // positive = moved up
  if (diff > 0) return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 2, color: 'var(--color-success)', fontSize: 10, fontWeight: 700 }}>
      <TrendingUp size={11} /> {diff}
    </span>
  )
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 2, color: 'var(--color-error)', fontSize: 10, fontWeight: 700 }}>
      <TrendingDown size={11} /> {Math.abs(diff)}
    </span>
  )
}

function ScoreRing({ score, size = 64, strokeW = 5 }) {
  const r    = (size - strokeW) / 2
  const circ = 2 * Math.PI * r
  const dash = (score / 100) * circ
  const color = getTierColor(score)
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0, filter: `drop-shadow(0 0 5px ${color}80)` }}>
      <svg width={size} height={size} overflow="visible" style={{ transform: 'rotate(-90deg)', display: 'block' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={C.border} strokeWidth={strokeW} />
        <circle
          cx={size/2} cy={size/2} r={r} fill="none"
          stroke={color} strokeWidth={strokeW}
          strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round"
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: size >= 64 ? 17 : size >= 48 ? 13 : 10, fontWeight: 900, color, letterSpacing: '-0.5px', lineHeight: 1 }}>{score}</span>
        {size >= 48 && <span style={{ fontSize: 8, fontWeight: 600, color: C.subtle, letterSpacing: '0.5px', marginTop: 1 }}>PTS</span>}
      </div>
    </div>
  )
}

export default function Ranking() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const [projects, setProjects]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [areaFilter, setAreaFilter] = useState('')
  const [yearFilter, setYearFilter] = useState('')
  const [courseFilter, setCourseFilter] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const prevPositions = useRef(loadPrevPositions())

  useEffect(() => {
    let saveTimer = null
    async function load() {
      const { data, error } = await supabase
        .from('projects')
        .select('id,name,slug,area,creator_name,course,school_year,project_type,is_pap,score,ai_tagline,created_at,user_id')
        .order('score', { ascending: false })
        .limit(200)
      if (!error && data) {
        setProjects(data)
        // Save new positions after a short delay (so prev is shown first this session)
        saveTimer = setTimeout(() => saveCurrentPositions(data), 3000)
      }
      setLoading(false)
    }
    load()
    return () => clearTimeout(saveTimer)
  }, [])

  const areas   = [...new Set(projects.map(p => p.area).filter(Boolean))].sort()
  const years   = [...new Set(projects.map(p => p.school_year).filter(Boolean))].sort()
  const courses = [...new Set(projects.map(p => p.course).filter(Boolean))].sort()

  const filtered = projects.filter(p => {
    if (areaFilter   && p.area        !== areaFilter)   return false
    if (yearFilter   && p.school_year !== yearFilter)   return false
    if (courseFilter && p.course      !== courseFilter) return false
    return true
  })

  const activeFilterCount = [areaFilter, yearFilter, courseFilter].filter(Boolean).length
  const top3 = filtered.slice(0, 3)
  const rest = filtered.slice(3)

  const selectStyle = {
    background: C.card, border: `1px solid ${C.border}`,
    color: C.text, borderRadius: 8, padding: '9px 14px',
    fontSize: 14, cursor: 'pointer', outline: 'none',
    fontFamily: 'var(--font-body)', transition: 'border-color 0.2s',
    appearance: 'none', WebkitAppearance: 'none',
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: C.bg, color: C.text, fontFamily: 'var(--font-body)' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .rank-row { transition: background 0.15s, border-color 0.15s !important; cursor: pointer !important; }
        .rank-row:hover { background: ${C.glassHover} !important; border-color: ${C.glassBorderBright} !important; }
        .rank-top { cursor: pointer !important; }
        .rank-top:hover .rank-top-card { background: ${C.glassHover} !important; border-color: ${C.glassBorderBright} !important; }
        /* Filter toggle button */
        .rank-filter-btn {
          display: flex; align-items: center; gap: 6px;
          background: var(--color-surface); border: 1px solid var(--color-border);
          border-radius: 10px; padding: 0 14px; height: 40px;
          color: var(--color-text-secondary); font-size: 13px; font-weight: 600;
          cursor: pointer; font-family: inherit; white-space: nowrap;
          transition: border-color 0.15s, color 0.15s;
          position: relative; flex-shrink: 0;
        }
        .rank-filter-btn:hover { border-color: var(--color-border-hover); color: var(--color-text); }
        .rank-filter-btn.active { border-color: var(--color-primary); color: var(--color-primary); background: var(--color-primary-subtle); }
        .rank-filter-badge {
          position: absolute; top: -5px; right: -5px;
          min-width: 16px; height: 16px; border-radius: 99px;
          background: var(--color-primary); color: #fff;
          font-size: 10px; font-weight: 800;
          display: flex; align-items: center; justify-content: center;
          padding: 0 4px; border: 2px solid var(--color-bg);
        }
        /* Filter panel */
        .rank-filter-panel {
          background: var(--color-surface); border: 1px solid var(--color-border);
          border-radius: 14px; padding: 14px;
          margin-bottom: 20px;
          display: flex; flex-wrap: wrap; gap: 10px; align-items: center;
        }
        .rank-filter-panel select { flex: 1; min-width: 140px; }
        @media (max-width: 600px) {
          .rank-top-info-tagline { display: none !important; }
          .rank-col-school { display: none !important; }
          .rank-col-course { display: none !important; }
          .rank-filter-btn-label { display: none !important; }
          .rank-filter-panel { grid-template-columns: 1fr 1fr !important; display: grid !important; gap: 8px !important; padding: 12px !important; }
          .rank-filter-panel select { min-width: 0 !important; width: 100% !important; }
          .rank-filter-panel .rank-clear-btn { grid-column: 1 / -1 !important; }
          /* Podium: hide 2nd and 3rd, show only winner */
          .rank-podium { flex-direction: column !important; align-items: stretch !important; gap: 0 !important; }
          .rank-top:not(.rank-top-first) { display: none !important; }
          .rank-top-first { width: 100% !important; }
          .rank-top-first .rank-top-card { flex-direction: row !important; align-items: center !important; gap: 16px !important; text-align: left !important; padding: 16px !important; }
          .rank-top-first .rank-top-card > div:last-child { flex: 1 !important; }
          /* Legend: compact */
          .rank-legend { gap: 8px !important; }
          .rank-legend span { font-size: 11px !important; }
          /* Row name: no max-width truncation */
          .rank-row-name { font-size: 13px !important; }
        }
        @media (max-width: 380px) {
          .rank-row-name { font-size: 12px !important; }
        }
      `}</style>

      <Navbar>
        {profile?.role !== 'professor' && (
          <button
            onClick={() => navigate('/novo')}
            style={{
              background: C.blue,
              color: '#fff', border: 'none', borderRadius: 8,
              padding: '9px 18px', fontSize: 14, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
              boxShadow: '0 2px 12px rgba(27,120,247,0.25)',
            }}
          >
            Criar projeto
          </button>
        )}
      </Navbar>

      <div className="page-content">

        {/* Header + filter button */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: showFilters ? 12 : 24 }}>
          <div>
            <h1 style={{ fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 400, fontFamily: 'var(--font-heading)', margin: '0 0 8px', letterSpacing: '-0.5px' }}>
              Ranking de Projetos
            </h1>
            <p style={{ color: C.muted, margin: 0, fontSize: 'clamp(13px, 1.5vw, 15px)' }}>
              Os melhores projetos da comunidade Showo, ordenados por score
            </p>
          </div>
          <button
            className={`rank-filter-btn${showFilters || activeFilterCount > 0 ? ' active' : ''}`}
            onClick={() => setShowFilters(f => !f)}
            style={{ marginTop: 6 }}
          >
            <SlidersHorizontal size={15} />
            <span className="rank-filter-btn-label">Filtros</span>
            {activeFilterCount > 0 && <span className="rank-filter-badge">{activeFilterCount}</span>}
          </button>
        </div>

        {/* Collapsible filter panel */}
        {showFilters && (
          <div className="rank-filter-panel" style={{ marginBottom: 24 }}>
            <select value={areaFilter} onChange={e => setAreaFilter(e.target.value)} style={selectStyle}
              onFocus={e => (e.target.style.borderColor = C.blue)} onBlur={e => (e.target.style.borderColor = C.border)}>
              <option value="">Todas as áreas</option>
              {areas.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <select value={yearFilter} onChange={e => setYearFilter(e.target.value)} style={selectStyle}
              onFocus={e => (e.target.style.borderColor = C.blue)} onBlur={e => (e.target.style.borderColor = C.border)}>
              <option value="">Todos os anos</option>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            {courses.length > 0 && (
              <select value={courseFilter} onChange={e => setCourseFilter(e.target.value)} style={selectStyle}
                onFocus={e => (e.target.style.borderColor = C.blue)} onBlur={e => (e.target.style.borderColor = C.border)}>
                <option value="">Todos os cursos</option>
                {courses.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            )}
            {activeFilterCount > 0 && (
              <button
                className="rank-clear-btn"
                onClick={() => { setAreaFilter(''); setYearFilter(''); setCourseFilter('') }}
                style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: `1px solid ${C.border}`, color: C.muted, borderRadius: 8, padding: '9px 14px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                <X size={13} /> Limpar filtros
              </button>
            )}
          </div>
        )}

        {/* Legend */}
        <div className="rank-legend" style={{ display: 'flex', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
          {[
            { color: 'var(--color-success)', label: 'Nível profissional  86+' },
            { color: 'var(--color-accent)', label: 'Quase profissional  71+' },
            { color: '#3b82f6', label: 'A ganhar forma  51+' },
            { color: 'var(--color-warning)', label: 'A começar  31+' },
          ].map(t => (
            <div key={t.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 3, height: 14, borderRadius: 99, background: t.color, flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: C.muted, fontWeight: 500 }}>{t.label}</span>
            </div>
          ))}
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
            <div style={{ width: 36, height: 36, border: `3px solid ${C.border}`, borderTop: `3px solid ${C.blue}`, borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: C.muted }}>
            <p style={{ fontSize: 16 }}>Nenhum projeto encontrado com estes filtros.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

            {/* ── PODIUM ── */}
            {top3.length > 0 && (
              <div style={{ marginBottom: 8 }}>
                <p style={{ margin: '0 0 20px', fontSize: 11, fontWeight: 700, color: C.subtle, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Pódio
                </p>
                {/* order: 2nd · 1st · 3rd */}
                <div className="rank-podium" style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
                  {[top3[1], top3[0], top3[2]].map((project, col) => {
                    if (!project) return <div key={col} style={{ flex: 1 }} />
                    const posMap   = [1, 0, 2]           // col→original index
                    const i        = posMap[col]          // 0=1st, 1=2nd, 2=3rd
                    const rank     = i + 1
                    const accent   = RANK_ACCENT[i]
                    const isFirst  = i === 0
                    const podiumH  = isFirst ? 72 : i === 1 ? 48 : 32
                    const isMe     = user?.id && project.user_id === user.id
                    const prevRank = prevPositions.current[project.id]
                    return (
                      <div
                        key={project.id}
                        className={`rank-top${isFirst ? ' rank-top-first' : ''}`}
                        onClick={() => navigate(`/projeto/${project.slug}`)}
                        style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}
                      >
                        {/* Card above platform */}
                        <div className="rank-top-card" style={{
                          ...C.glassStyle,
                          width: '100%',
                          background: isMe ? 'rgba(27,120,247,0.06)' : C.glass,
                          border: `1px solid ${isMe ? C.glassBorderBright : C.glassBorder}`,
                          borderRadius: 12,
                          transition: 'border-color 0.15s, background 0.15s',
                          padding: isFirst ? '20px 14px 18px' : '14px 12px 14px',
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                          marginBottom: 0,
                          textAlign: 'center',
                        }}>
                          {isFirst && (
                            <Trophy size={28} color={C.yellow} style={{ marginBottom: 4 }} />
                          )}
                          <ScoreRing score={project.score} size={isFirst ? 72 : 58} strokeW={isFirst ? 5 : 4} />
                          <div>
                            <div style={{
                              fontSize: isFirst ? 15 : 13, fontWeight: 700,
                              color: C.text, letterSpacing: '-0.2px',
                              display: '-webkit-box', WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical', overflow: 'hidden',
                              lineHeight: 1.25, marginBottom: 4,
                            }}>
                              {project.name}
                            </div>
                            {project.creator_name && (
                              <div style={{ fontSize: 11, color: C.muted, fontWeight: 500 }}>
                                {project.creator_name}
                              </div>
                            )}
                            {project.area && (
                              <div style={{ marginTop: 6, fontSize: 10, color: C.blue, fontWeight: 600 }}>
                                {project.area}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Platform */}
                        <div style={{
                          width: '100%', height: podiumH,
                          background: 'var(--color-bg-alt)',
                          borderLeft: `1px solid ${C.border}`,
                          borderRight: `1px solid ${C.border}`,
                          borderBottom: `1px solid ${C.border}`,
                          borderTop: `2px solid ${accent}`,
                          borderRadius: '0 0 8px 8px',
                          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
                        }}>
                          <span style={{ fontSize: isFirst ? 22 : 16, fontWeight: 700, color: accent }}>{rank}</span>
                          {podiumH >= 48 && <RankDelta currentRank={rank} prevRank={prevRank} />}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ── REST (#4+) — leaderboard ── */}
            {rest.length > 0 && (
              <div>
                <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 700, color: C.subtle, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Leaderboard
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {rest.map((project, i) => {
                    const rank      = i + 4
                    const tierColor = getTierColor(project.score)
                    const isMe      = user?.id && project.user_id === user.id
                    const prevRank  = prevPositions.current[project.id]
                    return (
                      <div
                        key={project.id}
                        className="rank-row"
                        onClick={() => navigate(`/projeto/${project.slug}`)}
                        style={{
                          ...C.glassStyle,
                          background: isMe ? 'rgba(27,120,247,0.05)' : C.glass,
                          border: `1px solid ${isMe ? C.glassBorderBright : C.glassBorder}`,
                          borderLeft: `2px solid ${tierColor}`,
                          borderRadius: 10,
                          padding: '13px 18px',
                          display: 'flex', alignItems: 'center', gap: 14,
                        }}
                      >
                        {/* Position + delta */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, width: 34, flexShrink: 0 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: C.subtle }}>{rank}</span>
                          <RankDelta currentRank={rank} prevRank={prevRank} />
                        </div>

                        {/* Score ring */}
                        <ScoreRing score={project.score} size={40} strokeW={3} />

                        {/* Info */}
                        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                          <span className="rank-row-name" style={{ fontSize: 14, fontWeight: 600, color: C.text, letterSpacing: '-0.1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{project.name}</span>
                          {project.is_pap && (
                            <span style={{ fontSize: 10, color: C.yellow, fontWeight: 700 }}>· PAP</span>
                          )}
                          {project.area && (
                            <span style={{ fontSize: 11, color: C.subtle }}>· {project.area}</span>
                          )}
                          {project.creator_name && (
                            <span className="rank-col-school" style={{ fontSize: 11, color: C.subtle }}>· {project.creator_name}</span>
                          )}
                          {isMe && (
                            <span style={{ fontSize: 10, color: C.blue, fontWeight: 700 }}>· O teu projeto</span>
                          )}
                        </div>

                        <ChevronRight size={14} color={C.subtle} style={{ flexShrink: 0 }} />
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  )
}
