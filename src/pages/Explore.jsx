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
  blue: '#1b78f7',
  blueSubtle: 'rgba(27,120,247,0.08)',
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

function ScoreRingSmall({ score }) {
  const size = 52
  const stroke = 4
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const dash = (score / 100) * circ
  const color = getLevelColor(score)

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', display: 'block' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={colors.border} strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={stroke}
          strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 4px ${color}70)` }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 12, fontWeight: 800, color, letterSpacing: '-0.3px' }}>{score}</span>
      </div>
    </div>
  )
}

export default function Explore() {
  const navigate = useNavigate()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function fetch() {
      const { data, error } = await supabase
        .from('projects')
        .select('id,name,slug,area,creator_name,course,school_year,ai_tagline,project_type,is_pap,score,created_at')
        .order('score', { ascending: false })
        .limit(200)

      if (error || !data) { setLoading(false); return }
      setProjects(data)
      setLoading(false)
    }
    fetch()
  }, [])

  const query = search.toLowerCase().trim()
  const filtered = query
    ? projects.filter(p =>
        p.name?.toLowerCase().includes(query) ||
        p.area?.toLowerCase().includes(query) ||
        p.course?.toLowerCase().includes(query)
      )
    : projects

  return (
    <div style={{ minHeight: '100vh', backgroundColor: colors.bg, color: colors.text, fontFamily: 'var(--font-body)' }}>
      <style>{`
        .explore-card:hover {
          border-color: #2a4275 !important;
          transform: translateY(-3px) !important;
          box-shadow: 0 12px 40px rgba(0,0,0,0.45) !important;
        }
        .explore-card { transition: all 0.2s ease !important; }
      `}</style>

      <Navbar>
        <button
          onClick={() => navigate('/novo')}
          style={{
            background: `linear-gradient(135deg, ${colors.blue}, #4f46e5)`,
            color: '#fff', border: 'none', borderRadius: 8,
            padding: '9px 18px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            fontFamily: 'inherit',
            boxShadow: '0 4px 16px rgba(27,120,247,0.3)',
          }}
        >
          Criar projeto
        </button>
      </Navbar>

      <div style={{ maxWidth: 1020, margin: '0 auto', padding: '44px 24px 80px' }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 900, margin: '0 0 8px', letterSpacing: '-0.5px' }}>
            Explorar Projetos
          </h1>
          <p style={{ color: colors.muted, margin: 0, fontSize: 15 }}>Descobre o que outros estudantes estão a construir</p>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 32 }}>
          <svg
            style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
            width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.subtle} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Pesquisar por nome, área ou curso..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%',
              background: colors.card,
              border: `1px solid ${colors.border}`,
              borderRadius: 12,
              color: colors.text,
              fontSize: 15,
              padding: '14px 16px 14px 48px',
              outline: 'none',
              fontFamily: 'var(--font-body)',
              boxSizing: 'border-box',
              transition: 'border-color 0.2s, box-shadow 0.2s',
            }}
            onFocus={e => {
              e.target.style.borderColor = colors.blue
              e.target.style.boxShadow = '0 0 0 3px rgba(27,120,247,0.1)'
            }}
            onBlur={e => {
              e.target.style.borderColor = colors.border
              e.target.style.boxShadow = 'none'
            }}
          />
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
            <div style={{ width: 36, height: 36, border: `3px solid ${colors.border}`, borderTop: `3px solid ${colors.blue}`, borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: colors.muted }}>
            <p style={{ fontSize: 16 }}>{query ? `Nenhum projeto encontrado para "${search}"` : 'Ainda não há projetos. Sê o primeiro!'}</p>
            {!query && (
              <button
                onClick={() => navigate('/novo')}
                style={{
                  marginTop: 16,
                  background: `linear-gradient(135deg, ${colors.blue}, #4f46e5)`,
                  color: '#fff', border: 'none', borderRadius: 10,
                  padding: '12px 24px', fontSize: 15, fontWeight: 700, cursor: 'pointer',
                  fontFamily: 'inherit',
                  boxShadow: '0 4px 20px rgba(27,120,247,0.3)',
                }}
              >
                Criar o meu projeto →
              </button>
            )}
          </div>
        ) : (
          <>
            <div style={{ color: colors.subtle, fontSize: 13, marginBottom: 20, fontWeight: 500 }}>
              {filtered.length} projeto{filtered.length !== 1 ? 's' : ''}{query && ` para "${search}"`}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(288px, 1fr))', gap: 16 }}>
              {filtered.map(project => {
                const scoreColor = getLevelColor(project.score)
                return (
                  <div
                    key={project.id}
                    className="explore-card"
                    style={{
                      background: colors.card,
                      border: `1px solid ${colors.border}`,
                      borderRadius: 18,
                      padding: '22px',
                      cursor: 'pointer',
                      display: 'flex', flexDirection: 'column', gap: 12,
                      boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
                    }}
                    onClick={() => navigate(`/projeto/${project.slug}`)}
                  >
                    {/* Top row */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {project.area && (
                          <span style={{
                            fontSize: 11, color: '#60a5fa',
                            background: 'rgba(27,120,247,0.08)',
                            border: '1px solid rgba(27,120,247,0.15)',
                            borderRadius: 999, padding: '3px 10px', fontWeight: 600,
                          }}>
                            {project.area}
                          </span>
                        )}
                        {project.is_pap && (
                          <span style={{
                            fontSize: 11, color: colors.yellow,
                            background: 'rgba(234,179,8,0.08)',
                            border: '1px solid rgba(234,179,8,0.2)',
                            borderRadius: 999, padding: '3px 10px', fontWeight: 600,
                          }}>
                            PAP
                          </span>
                        )}
                      </div>
                      <ScoreRingSmall score={project.score} />
                    </div>

                    {/* Name + tagline */}
                    <div>
                      <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: colors.text, lineHeight: 1.3, letterSpacing: '-0.1px' }}>
                        {project.name}
                      </h3>
                      {project.ai_tagline && (
                        <p style={{
                          margin: 0, fontSize: 13, color: colors.muted, lineHeight: 1.55,
                          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                        }}>
                          {project.ai_tagline}
                        </p>
                      )}
                    </div>

                    {/* Creator */}
                    {(project.creator_name || project.school_year) && (
                      <div style={{ fontSize: 12, color: colors.subtle, fontWeight: 500 }}>
                        {[project.creator_name, project.school_year].filter(Boolean).join(' · ')}
                      </div>
                    )}

                    {/* CTA */}
                    <div style={{ marginTop: 'auto', paddingTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 13, color: '#60a5fa', fontWeight: 600 }}>Ver projeto →</span>
                      <div style={{
                        width: 26, height: 26, borderRadius: '50%',
                        background: 'rgba(27,120,247,0.08)',
                        border: '1px solid rgba(27,120,247,0.15)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, color: '#60a5fa',
                      }}>
                        →
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
