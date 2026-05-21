import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Navbar } from '../components/Navbar'
import { useAuth } from '../context/AuthContext'
import { Trophy, ChevronRight } from 'lucide-react'

const C = {
  bg:          '#060c18',
  bgAlt:       '#111c32',
  card:        '#152030',
  cardHover:   '#1c2d44',
  border:      '#1e3050',
  borderBright:'#2a4275',
  blue:        '#1b78f7',
  text:        '#e8f2ff',
  muted:       '#7d93b0',
  subtle:      '#3d5270',
  green:       '#22c55e',
  yellow:      '#fbbf24',
  orange:      '#f97316',
}

// Tier color based on score — connects directly to the scoring system
function getTierColor(score) {
  if (score >= 86) return '#22c55e'   // professional
  if (score >= 71) return '#8b5cf6'   // almost professional
  if (score >= 51) return '#3b82f6'   // gaining shape
  if (score >= 31) return '#f59e0b'   // starting
  return C.subtle                      // draft
}

// Rank position accent: 1st=yellow, 2nd=muted(silver-ish), 3rd=orange
const RANK_ACCENT = [C.yellow, C.muted, C.orange]

function ScoreRing({ score, size = 64, strokeW = 5 }) {
  const r    = (size - strokeW) / 2
  const circ = 2 * Math.PI * r
  const dash = (score / 100) * circ
  const color = getTierColor(score)
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', display: 'block' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={C.border} strokeWidth={strokeW} />
        <circle
          cx={size/2} cy={size/2} r={r} fill="none"
          stroke={color} strokeWidth={strokeW}
          strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 5px ${color}80)` }}
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
  const { user } = useAuth()
  const [projects, setProjects]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [areaFilter, setAreaFilter] = useState('')
  const [yearFilter, setYearFilter] = useState('')

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('projects')
        .select('id,name,slug,area,creator_name,course,school_year,project_type,is_pap,score,ai_tagline,created_at,user_id')
        .order('score', { ascending: false })
        .limit(200)
      if (!error && data) setProjects(data)
      setLoading(false)
    }
    load()
  }, [])

  const areas = [...new Set(projects.map(p => p.area).filter(Boolean))].sort()
  const years = [...new Set(projects.map(p => p.school_year).filter(Boolean))].sort()

  const filtered = projects.filter(p => {
    if (areaFilter && p.area !== areaFilter) return false
    if (yearFilter && p.school_year !== yearFilter) return false
    return true
  })

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
        .rank-row { transition: background 0.15s, border-color 0.15s, transform 0.15s !important; cursor: pointer !important; }
        .rank-row:hover { background: ${C.cardHover} !important; border-color: ${C.borderBright} !important; transform: translateX(3px) !important; }
        .rank-top { transition: background 0.15s, border-color 0.15s, box-shadow 0.15s, transform 0.15s !important; cursor: pointer !important; }
        .rank-top:hover { background: ${C.cardHover} !important; transform: translateX(4px) !important; }
        @media (max-width: 600px) {
          .rank-filters { flex-direction: column !important; gap: 8px !important; }
          .rank-filters select { width: 100% !important; }
          .rank-top-info-tagline { display: none !important; }
        }
      `}</style>

      <Navbar>
        <button
          onClick={() => navigate('/novo')}
          style={{
            background: `linear-gradient(135deg, ${C.blue}, #4f46e5)`,
            color: '#fff', border: 'none', borderRadius: 8,
            padding: '9px 18px', fontSize: 14, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit',
            boxShadow: '0 4px 16px rgba(27,120,247,0.3)',
          }}
        >
          Criar projeto
        </button>
      </Navbar>

      <div className="page-content">

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 900, margin: '0 0 8px', letterSpacing: '-0.5px' }}>
            Ranking de Projetos
          </h1>
          <p style={{ color: C.muted, margin: 0, fontSize: 15 }}>
            Os melhores projetos da comunidade Showo, ordenados por score
          </p>
        </div>

        {/* Filters */}
        <div className="rank-filters" style={{ display: 'flex', gap: 10, marginBottom: 32, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <select value={areaFilter} onChange={e => setAreaFilter(e.target.value)} style={selectStyle}
              onFocus={e => (e.target.style.borderColor = C.blue)}
              onBlur={e => (e.target.style.borderColor = C.border)}>
              <option value="">Todas as áreas</option>
              {areas.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div style={{ position: 'relative' }}>
            <select value={yearFilter} onChange={e => setYearFilter(e.target.value)} style={selectStyle}
              onFocus={e => (e.target.style.borderColor = C.blue)}
              onBlur={e => (e.target.style.borderColor = C.border)}>
              <option value="">Todos os anos</option>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          {(areaFilter || yearFilter) && (
            <button
              onClick={() => { setAreaFilter(''); setYearFilter('') }}
              style={{ background: 'transparent', border: `1px solid ${C.border}`, color: C.muted, borderRadius: 8, padding: '9px 14px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Limpar ×
            </button>
          )}
          <span style={{ marginLeft: 'auto', color: C.subtle, fontSize: 13, fontWeight: 500 }}>
            {filtered.length} projeto{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
          {[
            { color: '#22c55e', label: 'Nível profissional  86+' },
            { color: '#8b5cf6', label: 'Quase profissional  71+' },
            { color: '#3b82f6', label: 'A ganhar forma  51+' },
            { color: '#f59e0b', label: 'A começar  31+' },
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
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
                  {[top3[1], top3[0], top3[2]].map((project, col) => {
                    if (!project) return <div key={col} style={{ flex: 1 }} />
                    const posMap   = [1, 0, 2]           // col→original index
                    const i        = posMap[col]          // 0=1st, 1=2nd, 2=3rd
                    const rank     = i + 1
                    const accent   = RANK_ACCENT[i]
                    const isFirst  = i === 0
                    const podiumH  = isFirst ? 72 : i === 1 ? 48 : 32
                    const isMe     = user?.id && project.user_id === user.id
                    return (
                      <div
                        key={project.id}
                        className="rank-top"
                        onClick={() => navigate(`/projeto/${project.slug}`)}
                        style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}
                      >
                        {/* Card above platform */}
                        <div style={{
                          width: '100%',
                          background: isMe ? 'rgba(27,120,247,0.08)' : C.card,
                          border: `1px solid ${isMe ? C.borderBright : C.border}`,
                          borderRadius: 14,
                          padding: isFirst ? '20px 14px 18px' : '14px 12px 14px',
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                          boxShadow: isFirst ? `0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px ${accent}18` : '0 2px 12px rgba(0,0,0,0.22)',
                          marginBottom: 0,
                          textAlign: 'center',
                        }}>
                          {isFirst && (
                            <Trophy size={28} color={C.yellow} style={{ marginBottom: 4 }} />
                          )}
                          <ScoreRing score={project.score} size={isFirst ? 72 : 58} strokeW={isFirst ? 5 : 4} />
                          <div>
                            <div style={{
                              fontSize: isFirst ? 15 : 13, fontWeight: 800,
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
                              <div style={{ marginTop: 6 }}>
                                <span style={{ fontSize: 10, color: '#60a5fa', background: 'rgba(27,120,247,0.1)', border: '1px solid rgba(27,120,247,0.18)', borderRadius: 999, padding: '2px 7px', fontWeight: 600 }}>
                                  {project.area}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Platform */}
                        <div style={{
                          width: '100%', height: podiumH,
                          background: `linear-gradient(180deg, ${accent}22 0%, ${accent}10 100%)`,
                          border: `1px solid ${accent}35`,
                          borderTop: `2px solid ${accent}`,
                          borderRadius: '0 0 10px 10px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <span style={{ fontSize: isFirst ? 22 : 16, fontWeight: 900, color: accent }}>{rank}</span>
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
                    return (
                      <div
                        key={project.id}
                        className="rank-row"
                        onClick={() => navigate(`/projeto/${project.slug}`)}
                        style={{
                          background: isMe ? 'rgba(27,120,247,0.05)' : C.card,
                          border: `1px solid ${isMe ? C.borderBright : C.border}`,
                          borderLeft: `3px solid ${tierColor}`,
                          borderRadius: 12,
                          padding: '13px 18px',
                          display: 'flex', alignItems: 'center', gap: 14,
                          boxShadow: isMe ? `0 0 0 1px ${C.blue}20` : 'none',
                        }}
                      >
                        {/* Position number */}
                        <span style={{ fontSize: 12, fontWeight: 700, color: C.subtle, width: 26, textAlign: 'right', flexShrink: 0 }}>
                          {rank}
                        </span>

                        {/* Score ring */}
                        <ScoreRing score={project.score} size={40} strokeW={3} />

                        {/* Info */}
                        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 14, fontWeight: 600, color: C.text, letterSpacing: '-0.1px' }}>{project.name}</span>
                          {project.is_pap && (
                            <span style={{ fontSize: 9, color: C.yellow, fontWeight: 700, background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.18)', padding: '1px 6px', borderRadius: 999 }}>PAP</span>
                          )}
                          {project.area && (
                            <span style={{ fontSize: 11, color: C.subtle }}>{project.area}</span>
                          )}
                          {project.creator_name && (
                            <span style={{ fontSize: 11, color: C.subtle }}>· {project.creator_name}</span>
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
