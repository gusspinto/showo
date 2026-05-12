import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Navbar } from '../components/Navbar'

const colors = {
  bg: '#0d1424',
  bgAlt: '#111c32',
  card: '#152030',
  cardHover: '#1c2d44',
  border: '#1e3050',
  borderBright: '#2a4275',
  blue: '#3b82f6',
  blueSubtle: 'rgba(59,130,246,0.08)',
  text: '#e8f2ff',
  muted: '#7d93b0',
  subtle: '#3d5270',
  green: '#22c55e',
  yellow: '#eab308',
  orange: '#f97316',
}

function getLevelColor(score) {
  if (score === 100) return colors.green
  if (score >= 81) return colors.blue
  if (score >= 61) return colors.orange
  if (score >= 41) return colors.yellow
  return colors.muted
}

function MiniScoreRing({ score }) {
  const size = 48
  const stroke = 4
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const dash = (score / 100) * circ
  const color = getLevelColor(score)

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', display: 'block' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={colors.border} strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={stroke}
          strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 4px ${color}80)` }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 11, fontWeight: 800, color, letterSpacing: '-0.3px' }}>{score}</span>
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
        .select('id,name,slug,area,creator_name,course,school_year,project_type,is_pap,score,created_at')
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

  const selectStyle = {
    background: colors.card,
    border: `1px solid ${colors.border}`,
    color: colors.text,
    borderRadius: 8,
    padding: '9px 14px',
    fontSize: 14,
    cursor: 'pointer',
    outline: 'none',
    fontFamily: 'Inter, system-ui, sans-serif',
    transition: 'border-color 0.2s',
  }

  const TOP3_GLOW = ['#fbbf24', '#94a3b8', '#cd7c2f']

  return (
    <div style={{ minHeight: '100vh', backgroundColor: colors.bg, color: colors.text, fontFamily: 'Inter, system-ui, sans-serif' }}>
      <Navbar>
        <button
          onClick={() => navigate('/novo')}
          style={{
            background: `linear-gradient(135deg, ${colors.blue}, #4f46e5)`,
            color: '#fff', border: 'none', borderRadius: 8,
            padding: '9px 18px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            fontFamily: 'inherit',
            boxShadow: '0 4px 16px rgba(59,130,246,0.3)',
          }}
        >
          Criar projeto
        </button>
      </Navbar>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '44px 24px 80px' }}>
        {/* Header */}
        <div style={{ marginBottom: 36 }}>
          <h1 style={{ fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 900, margin: '0 0 8px', letterSpacing: '-0.5px' }}>
            🏆 Ranking de Projetos
          </h1>
          <p style={{ color: colors.muted, margin: 0, fontSize: 15 }}>Os melhores projetos da comunidade Showo, ordenados por score</p>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 28, flexWrap: 'wrap', alignItems: 'center' }}>
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
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: colors.muted }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
            <p style={{ fontSize: 16 }}>Nenhum projeto encontrado com estes filtros.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.map((project, i) => {
              const isTop3 = i < 3
              const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null
              const scoreColor = getLevelColor(project.score)
              const glowColor = isTop3 ? TOP3_GLOW[i] : null

              return (
                <div
                  key={project.id}
                  onClick={() => navigate(`/projeto/${project.slug}`)}
                  style={{
                    background: isTop3
                      ? `linear-gradient(135deg, #152030 0%, #1a2840 100%)`
                      : colors.card,
                    border: `1px solid ${isTop3 ? (glowColor + '35') : colors.border}`,
                    borderRadius: 14,
                    padding: '16px 20px',
                    display: 'flex', alignItems: 'center', gap: 16,
                    cursor: 'pointer',
                    transition: 'transform 0.15s, box-shadow 0.15s, border-color 0.15s',
                    boxShadow: isTop3 ? `0 4px 20px ${glowColor}15` : '0 2px 10px rgba(0,0,0,0.25)',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateX(3px)'
                    e.currentTarget.style.boxShadow = isTop3
                      ? `0 8px 32px ${glowColor}25`
                      : '0 4px 20px rgba(0,0,0,0.4)'
                    e.currentTarget.style.borderColor = isTop3 ? (glowColor + '55') : colors.borderBright
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'none'
                    e.currentTarget.style.boxShadow = isTop3 ? `0 4px 20px ${glowColor}15` : '0 2px 10px rgba(0,0,0,0.25)'
                    e.currentTarget.style.borderColor = isTop3 ? (glowColor + '35') : colors.border
                  }}
                >
                  {/* Rank */}
                  <div style={{ width: 36, textAlign: 'center', flexShrink: 0 }}>
                    {medal ? (
                      <span style={{ fontSize: 24 }}>{medal}</span>
                    ) : (
                      <span style={{ fontSize: 14, fontWeight: 700, color: colors.subtle }}>#{i + 1}</span>
                    )}
                  </div>

                  {/* Score ring */}
                  <MiniScoreRing score={project.score} />

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: colors.text, letterSpacing: '-0.1px' }}>{project.name}</span>
                      {project.is_pap && (
                        <span style={{
                          fontSize: 10, color: colors.yellow, fontWeight: 700,
                          background: 'rgba(234,179,8,0.1)',
                          border: '1px solid rgba(234,179,8,0.2)',
                          padding: '2px 8px', borderRadius: 999,
                        }}>
                          PAP
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      {project.area && (
                        <span style={{
                          fontSize: 11, color: '#60a5fa',
                          background: 'rgba(59,130,246,0.08)',
                          border: '1px solid rgba(59,130,246,0.15)',
                          borderRadius: 999, padding: '2px 10px', fontWeight: 600,
                        }}>
                          {project.area}
                        </span>
                      )}
                      {(project.creator_name || project.course || project.school_year) && (
                        <span style={{ fontSize: 12, color: colors.subtle }}>
                          {[project.creator_name, project.course, project.school_year].filter(Boolean).join(' · ')}
                        </span>
                      )}
                    </div>
                  </div>

                  <span style={{ fontSize: 13, color: colors.subtle, flexShrink: 0, fontWeight: 500 }}>Ver →</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
