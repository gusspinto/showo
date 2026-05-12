import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Navbar } from '../components/Navbar'

const colors = {
  bg: '#1c2333',
  blue: '#3b82f6',
  text: '#ffffff',
  muted: '#94a3b8',
  card: '#232d42',
  border: '#2e3a54',
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
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round" />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 12, fontWeight: 800, color }}>{score}</span>
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
    <div style={{ minHeight: '100vh', backgroundColor: colors.bg, color: colors.text, fontFamily: 'system-ui, sans-serif' }}>
      <Navbar>
        <button onClick={() => navigate('/novo')} style={{ background: colors.blue, color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Criar projeto</button>
      </Navbar>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '40px 24px 80px' }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 800, margin: '0 0 8px' }}>🔍 Explorar Projetos</h1>
          <p style={{ color: colors.muted, margin: 0, fontSize: 16 }}>Descobre o que outros estudantes estão a construir</p>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 32 }}>
          <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', fontSize: 16, color: colors.muted, pointerEvents: 'none' }}>🔍</span>
          <input
            type="text"
            placeholder="Pesquisar por nome, área ou curso..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', background: colors.card, border: `1px solid ${colors.border}`,
              borderRadius: 12, color: colors.text, fontSize: 15, padding: '14px 16px 14px 46px',
              outline: 'none', fontFamily: 'system-ui, sans-serif', boxSizing: 'border-box',
              transition: 'border-color 0.2s',
            }}
            onFocus={e => (e.target.style.borderColor = colors.blue)}
            onBlur={e => (e.target.style.borderColor = colors.border)}
          />
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
            <div style={{ width: 36, height: 36, border: `3px solid ${colors.border}`, borderTop: `3px solid ${colors.blue}`, borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: colors.muted }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
            <p style={{ fontSize: 16 }}>{query ? `Nenhum projeto encontrado para "${search}"` : 'Ainda não há projetos. Sê o primeiro!'}</p>
            {!query && (
              <button
                onClick={() => navigate('/novo')}
                style={{ marginTop: 16, background: colors.blue, color: '#fff', border: 'none', borderRadius: 10, padding: '12px 24px', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}
              >
                Criar o meu projeto →
              </button>
            )}
          </div>
        ) : (
          <>
            <div style={{ color: colors.muted, fontSize: 13, marginBottom: 20 }}>
              {filtered.length} projeto{filtered.length !== 1 ? 's' : ''}{query && ` para "${search}"`}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {filtered.map(project => {
                const scoreColor = getLevelColor(project.score)
                return (
                  <div
                    key={project.id}
                    style={{
                      background: colors.card, border: `1px solid ${colors.border}`,
                      borderRadius: 16, padding: '20px', cursor: 'pointer',
                      transition: 'border-color 0.2s, transform 0.15s',
                      display: 'flex', flexDirection: 'column', gap: 12,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = colors.blue; e.currentTarget.style.transform = 'translateY(-2px)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = colors.border; e.currentTarget.style.transform = 'none' }}
                    onClick={() => navigate(`/projeto/${project.slug}`)}
                  >
                    {/* Top row: area badge + score ring */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {project.area && (
                          <span style={{ fontSize: 11, color: colors.blue, background: 'rgba(59,130,246,0.1)', borderRadius: 999, padding: '3px 10px', fontWeight: 600 }}>
                            {project.area}
                          </span>
                        )}
                        {project.is_pap && (
                          <span style={{ fontSize: 11, color: colors.yellow, background: 'rgba(234,179,8,0.1)', borderRadius: 999, padding: '3px 10px', fontWeight: 600 }}>
                            PAP
                          </span>
                        )}
                      </div>
                      <ScoreRingSmall score={project.score} />
                    </div>

                    {/* Name */}
                    <div>
                      <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: colors.text, lineHeight: 1.3 }}>{project.name}</h3>
                      {project.ai_tagline && (
                        <p style={{ margin: 0, fontSize: 13, color: colors.muted, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {project.ai_tagline}
                        </p>
                      )}
                    </div>

                    {/* Creator info */}
                    {(project.creator_name || project.school_year) && (
                      <div style={{ fontSize: 12, color: colors.muted }}>
                        {[project.creator_name, project.school_year].filter(Boolean).join(' · ')}
                      </div>
                    )}

                    {/* CTA */}
                    <div style={{ marginTop: 'auto', paddingTop: 4 }}>
                      <span style={{ fontSize: 13, color: colors.blue, fontWeight: 600 }}>Ver projeto →</span>
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
