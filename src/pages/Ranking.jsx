import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Navbar } from '../components/Navbar'
import { Trophy, Medal, Award } from 'lucide-react'

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

const TOP3 = [
  { color: '#fbbf24', label: '1.º', Icon: Trophy, grad: 'linear-gradient(135deg,#1e1a0e 0%,#2a2010 60%,#1e1a0e 100%)' },
  { color: '#94a3b8', label: '2.º', Icon: Medal,  grad: 'linear-gradient(135deg,#161b22 0%,#1e2530 60%,#161b22 100%)' },
  { color: '#cd7c2f', label: '3.º', Icon: Award,  grad: 'linear-gradient(135deg,#1a1208 0%,#221a0e 60%,#1a1208 100%)' },
]

function getLevelColor(score) {
  if (score === 100) return colors.green
  if (score >= 81) return colors.blue
  if (score >= 61) return colors.orange
  if (score >= 41) return colors.yellow
  return colors.muted
}

function ScoreRingLg({ score }) {
  const size = 72, stroke = 5
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const dash = (score / 100) * circ
  const color = getLevelColor(score)
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', display: 'block' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={colors.border} strokeWidth={stroke} />
        <circle
          cx={size/2} cy={size/2} r={r} fill="none"
          stroke={color} strokeWidth={stroke}
          strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 6px ${color}90)` }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 18, fontWeight: 900, color, letterSpacing: '-0.5px', lineHeight: 1 }}>{score}</span>
        <span style={{ fontSize: 9, fontWeight: 600, color: colors.subtle, letterSpacing: '0.5px', marginTop: 1 }}>SCORE</span>
      </div>
    </div>
  )
}

function ScoreRingMd({ score }) {
  const size = 52, stroke = 4
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const dash = (score / 100) * circ
  const color = getLevelColor(score)
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', display: 'block' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={colors.border} strokeWidth={stroke} />
        <circle
          cx={size/2} cy={size/2} r={r} fill="none"
          stroke={color} strokeWidth={stroke}
          strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 5px ${color}80)` }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 13, fontWeight: 800, color, letterSpacing: '-0.3px' }}>{score}</span>
      </div>
    </div>
  )
}

function ScoreRingSm({ score }) {
  const size = 40, stroke = 3
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const dash = (score / 100) * circ
  const color = getLevelColor(score)
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', display: 'block' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={colors.border} strokeWidth={stroke} />
        <circle
          cx={size/2} cy={size/2} r={r} fill="none"
          stroke={color} strokeWidth={stroke}
          strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 3px ${color}70)` }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 10, fontWeight: 800, color, letterSpacing: '-0.2px' }}>{score}</span>
      </div>
    </div>
  )
}

export default function Ranking() {
  const navigate = useNavigate()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [areaFilter, setAreaFilter] = useState('')
  const [yearFilter, setYearFilter] = useState('')

  useEffect(() => {
    async function fetch() {
      const { data, error } = await supabase
        .from('projects')
        .select('id,name,slug,area,creator_name,course,school_year,project_type,is_pap,score,ai_tagline,created_at')
        .order('score', { ascending: false })
        .limit(200)

      if (error || !data) { setLoading(false); return }
      setProjects(data)
      setLoading(false)
    }
    fetch()
  }, [])

  const areas = [...new Set(projects.map(p => p.area).filter(Boolean))].sort()
  const years = [...new Set(projects.map(p => p.school_year).filter(Boolean))].sort()

  const filtered = projects.filter(p => {
    if (areaFilter && p.area !== areaFilter) return false
    if (yearFilter && p.school_year !== yearFilter) return false
    return true
  })

  const top3 = filtered.slice(0, 3)
  const mid = filtered.slice(3, 10)
  const rest = filtered.slice(10)

  const selectStyle = {
    background: colors.card,
    border: `1px solid ${colors.border}`,
    color: colors.text,
    borderRadius: 8,
    padding: '9px 14px',
    fontSize: 14,
    cursor: 'pointer',
    outline: 'none',
    fontFamily: 'var(--font-body)',
    transition: 'border-color 0.2s',
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: colors.bg, color: colors.text, fontFamily: 'var(--font-body)' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .rank-top:hover { transform: translateY(-4px) !important; }
        .rank-mid:hover { transform: translateX(4px) !important; }
        .rank-rest:hover { background: ${colors.cardHover} !important; }
        .rank-top, .rank-mid, .rank-rest { transition: all 0.18s ease !important; }
        @media (max-width: 520px) {
          .podium-grid { flex-direction: column !important; align-items: stretch !important; }
          .podium-card { min-height: unset !important; }
        }
      `}</style>

      <Navbar>
        <button
          onClick={() => navigate('/novo')}
          style={{
            background: `linear-gradient(135deg, ${colors.blue}, #4f46e5)`,
            color: '#fff', border: 'none', borderRadius: 12,
            padding: '9px 18px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            fontFamily: 'inherit',
            boxShadow: '0 4px 16px rgba(27,120,247,0.3)',
          }}
        >
          Criar projeto
        </button>
      </Navbar>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '44px 24px 80px' }}>
        {/* Header */}
        <div style={{ marginBottom: 36 }}>
          <h1 style={{ fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 900, margin: '0 0 8px', letterSpacing: '-0.5px' }}>
            Ranking de Projetos
          </h1>
          <p style={{ color: colors.muted, margin: 0, fontSize: 15 }}>Os melhores projetos da comunidade Showo, ordenados por score</p>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 36, flexWrap: 'wrap', alignItems: 'center' }}>
          <select
            value={areaFilter}
            onChange={e => setAreaFilter(e.target.value)}
            style={selectStyle}
            onFocus={e => (e.target.style.borderColor = colors.blue)}
            onBlur={e => (e.target.style.borderColor = colors.border)}
          >
            <option value="">Todas as áreas</option>
            {areas.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <select
            value={yearFilter}
            onChange={e => setYearFilter(e.target.value)}
            style={selectStyle}
            onFocus={e => (e.target.style.borderColor = colors.blue)}
            onBlur={e => (e.target.style.borderColor = colors.border)}
          >
            <option value="">Todos os anos</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          {(areaFilter || yearFilter) && (
            <button
              onClick={() => { setAreaFilter(''); setYearFilter('') }}
              style={{
                background: 'transparent',
                border: `1px solid ${colors.border}`,
                color: colors.muted,
                borderRadius: 8, padding: '9px 14px',
                fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Limpar ×
            </button>
          )}
          <span style={{ marginLeft: 'auto', color: colors.subtle, fontSize: 13, fontWeight: 500 }}>
            {filtered.length} projeto{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
            <div style={{ width: 36, height: 36, border: `3px solid ${colors.border}`, borderTop: `3px solid ${colors.blue}`, borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: colors.muted }}>
            <p style={{ fontSize: 16 }}>Nenhum projeto encontrado com estes filtros.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* ── TOP 3 ── podium layout: 2nd | 1st | 3rd */}
            {top3.length > 0 && (() => {
              // Podium order: 2nd (left), 1st (center, tallest), 3rd (right)
              const podium = [
                top3[1] ? { proj: top3[1], rank: 1, t: TOP3[1], size: 'md' } : null,
                top3[0] ? { proj: top3[0], rank: 0, t: TOP3[0], size: 'lg' } : null,
                top3[2] ? { proj: top3[2], rank: 2, t: TOP3[2], size: 'sm' } : null,
              ].filter(Boolean)

              return (
                <div className="podium-grid" style={{ display: 'flex', alignItems: 'flex-end', gap: 10, marginBottom: 8 }}>
                  {podium.map(({ proj, rank, t, size }) => {
                    const RankIcon = t.Icon
                    const isFirst = size === 'lg'
                    const isSm   = size === 'sm'
                    const iconSize = isFirst ? 28 : 22
                    const ringEl  = isFirst ? <ScoreRingLg score={proj.score} /> : <ScoreRingMd score={proj.score} />
                    const minH    = isFirst ? 260 : isSm ? 180 : 215

                    return (
                      <div
                        key={proj.id}
                        className="rank-top podium-card"
                        onClick={() => navigate(`/projeto/${proj.slug}`)}
                        style={{
                          flex: isFirst ? 1.15 : 1,
                          minHeight: minH,
                          background: t.grad,
                          border: `1.5px solid ${t.color}30`,
                          borderRadius: 18,
                          padding: isFirst ? '24px 18px 28px' : isSm ? '18px 14px 18px' : '20px 16px 22px',
                          cursor: 'pointer',
                          boxShadow: isFirst
                            ? `0 8px 36px ${t.color}28, 0 2px 8px rgba(0,0,0,0.4)`
                            : `0 4px 18px ${t.color}16`,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 8,
                          textAlign: 'center',
                          position: 'relative',
                          overflow: 'hidden',
                        }}
                      >
                        {/* Glow bg for 1st */}
                        {isFirst && (
                          <div style={{
                            position: 'absolute', top: -20, left: '50%', transform: 'translateX(-50%)',
                            width: 120, height: 120, borderRadius: '50%',
                            background: `radial-gradient(circle, ${t.color}22 0%, transparent 70%)`,
                            pointerEvents: 'none',
                          }} />
                        )}

                        {/* Rank icon */}
                        <RankIcon
                          size={iconSize}
                          color={t.color}
                          strokeWidth={2}
                          style={{ filter: `drop-shadow(0 0 ${isFirst ? 10 : 6}px ${t.color}80)`, flexShrink: 0 }}
                        />
                        <span style={{ fontSize: isFirst ? 13 : 11, fontWeight: 800, color: t.color, letterSpacing: '0.3px', marginTop: -2 }}>
                          {t.label}
                        </span>

                        {/* Score ring */}
                        {ringEl}

                        {/* Name */}
                        <span style={{
                          fontSize: isFirst ? 15 : 13,
                          fontWeight: 800, color: colors.text,
                          lineHeight: 1.25, marginTop: 2,
                          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                        }}>
                          {proj.name}
                        </span>

                        {/* Tagline — only on 1st */}
                        {isFirst && proj.ai_tagline && (
                          <p style={{
                            margin: 0, fontSize: 11, color: colors.muted, lineHeight: 1.45,
                            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                          }}>
                            {proj.ai_tagline}
                          </p>
                        )}

                        {/* Badges */}
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'center', marginTop: 2 }}>
                          {proj.is_pap && (
                            <span style={{
                              fontSize: 9, color: colors.yellow, fontWeight: 700,
                              background: 'rgba(234,179,8,0.1)',
                              border: '1px solid rgba(234,179,8,0.25)',
                              padding: '1px 6px', borderRadius: 999,
                            }}>PAP</span>
                          )}
                          {proj.area && (
                            <span style={{
                              fontSize: 9, color: '#60a5fa',
                              background: 'rgba(27,120,247,0.1)',
                              border: '1px solid rgba(27,120,247,0.18)',
                              borderRadius: 999, padding: '1px 7px', fontWeight: 600,
                            }}>{proj.area}</span>
                          )}
                        </div>

                        {/* Creator */}
                        {!isSm && (
                          <div style={{ fontSize: 10, color: colors.subtle, marginTop: 'auto' }}>
                            {[proj.creator_name, proj.school_year].filter(Boolean).join(' · ')}
                          </div>
                        )}

                        {/* Platform bar at bottom */}
                        <div style={{
                          position: 'absolute', bottom: 0, left: 0, right: 0,
                          height: isFirst ? 6 : isSm ? 3 : 4,
                          background: `linear-gradient(90deg, transparent, ${t.color}60, transparent)`,
                        }} />
                      </div>
                    )
                  })}
                </div>
              )
            })()}

            {/* ── #4–10 ── medium cards */}
            {mid.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {mid.map((project, i) => {
                  const rank = i + 4
                  return (
                    <div
                      key={project.id}
                      className="rank-mid"
                      onClick={() => navigate(`/projeto/${project.slug}`)}
                      style={{
                        background: colors.card,
                        border: `1px solid ${colors.border}`,
                        borderRadius: 16,
                        padding: '18px 22px',
                        cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 16,
                        boxShadow: '0 2px 12px rgba(0,0,0,0.28)',
                      }}
                    >
                      {/* Rank badge */}
                      <div style={{
                        width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                        background: colors.bgAlt,
                        border: `1px solid ${colors.border}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 13, fontWeight: 800, color: colors.muted,
                      }}>
                        {rank}
                      </div>

                      {/* Score ring */}
                      <ScoreRingMd score={project.score} />

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                          <span style={{ fontSize: 15, fontWeight: 700, color: colors.text, letterSpacing: '-0.1px' }}>{project.name}</span>
                          {project.is_pap && (
                            <span style={{
                              fontSize: 10, color: colors.yellow, fontWeight: 700,
                              background: 'rgba(234,179,8,0.08)',
                              border: '1px solid rgba(234,179,8,0.2)',
                              padding: '2px 7px', borderRadius: 999,
                            }}>PAP</span>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          {project.area && (
                            <span style={{
                              fontSize: 11, color: '#60a5fa',
                              background: 'rgba(27,120,247,0.08)',
                              border: '1px solid rgba(27,120,247,0.15)',
                              borderRadius: 999, padding: '2px 9px', fontWeight: 600,
                            }}>{project.area}</span>
                          )}
                          {(project.creator_name || project.school_year) && (
                            <span style={{ fontSize: 12, color: colors.subtle }}>
                              {[project.creator_name, project.school_year].filter(Boolean).join(' · ')}
                            </span>
                          )}
                        </div>
                      </div>

                      <span style={{ fontSize: 13, color: colors.subtle, flexShrink: 0, fontWeight: 600 }}>Ver →</span>
                    </div>
                  )
                })}
              </div>
            )}

            {/* ── #11+ ── compact list */}
            {rest.length > 0 && (
              <div style={{
                background: colors.card,
                border: `1px solid ${colors.border}`,
                borderRadius: 16,
                overflow: 'hidden',
              }}>
                {rest.map((project, i) => {
                  const rank = i + 11
                  const isLast = i === rest.length - 1
                  return (
                    <div
                      key={project.id}
                      className="rank-rest"
                      onClick={() => navigate(`/projeto/${project.slug}`)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 14,
                        padding: '13px 20px',
                        cursor: 'pointer',
                        borderBottom: isLast ? 'none' : `1px solid ${colors.border}`,
                      }}
                    >
                      <span style={{ fontSize: 12, fontWeight: 700, color: colors.subtle, width: 30, textAlign: 'right', flexShrink: 0 }}>
                        #{rank}
                      </span>

                      <ScoreRingSm score={project.score} />

                      <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: colors.text, letterSpacing: '-0.1px' }}>{project.name}</span>
                        {project.is_pap && (
                          <span style={{
                            fontSize: 9, color: colors.yellow, fontWeight: 700,
                            background: 'rgba(234,179,8,0.08)',
                            border: '1px solid rgba(234,179,8,0.18)',
                            padding: '1px 6px', borderRadius: 999,
                          }}>PAP</span>
                        )}
                        {project.area && (
                          <span style={{ fontSize: 11, color: colors.subtle }}>{project.area}</span>
                        )}
                        {project.creator_name && (
                          <span style={{ fontSize: 11, color: colors.subtle }}>· {project.creator_name}</span>
                        )}
                      </div>

                      <span style={{ fontSize: 12, color: colors.subtle, flexShrink: 0 }}>→</span>
                    </div>
                  )
                })}
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  )
}
