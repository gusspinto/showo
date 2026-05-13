import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Navbar } from '../components/Navbar'

const C = {
  bg: '#0d1424',
  card: '#111827',
  cardHover: '#16213a',
  border: '#1e3050',
  blue: '#3b82f6',
  blueHover: '#2563eb',
  muted: '#7d93b0',
  text: '#e8f2ff',
  green: '#34d399',
  yellow: '#fbbf24',
  red: '#f87171',
  purple: '#a78bfa',
}

function getScoreColor(score) {
  if (score == null) return C.muted
  if (score >= 90) return C.green
  if (score >= 71) return C.blue
  if (score >= 40) return C.yellow
  return C.red
}

function getDisplayName(user) {
  const name = user?.user_metadata?.full_name
  if (name) return name.split(' ')[0]
  return user?.email?.split('@')[0] ?? ''
}

function ScoreBadge({ score }) {
  const color = getScoreColor(score)
  return (
    <span style={{
      background: `${color}18`, border: `1px solid ${color}44`,
      borderRadius: 6, padding: '2px 9px', color, fontSize: 12, fontWeight: 700,
    }}>
      {score ?? '—'}
    </span>
  )
}

function StatCard({ icon, label, value, color }) {
  return (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`,
      borderRadius: 14, padding: '20px 22px',
      display: 'flex', flexDirection: 'column', gap: 6,
    }}>
      <span style={{ fontSize: 22 }}>{icon}</span>
      <span style={{ color: color ?? C.text, fontSize: 26, fontWeight: 800, letterSpacing: '-0.5px', lineHeight: 1 }}>
        {value}
      </span>
      <span style={{ color: C.muted, fontSize: 13 }}>{label}</span>
    </div>
  )
}

function ActionBtn({ onClick, label, primary }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: primary ? (hovered ? C.blueHover : C.blue) : (hovered ? 'rgba(255,255,255,0.07)' : 'transparent'),
        border: primary ? 'none' : `1px solid ${C.border}`,
        borderRadius: 7, padding: '7px 14px',
        color: primary ? '#fff' : C.muted,
        fontSize: 13, fontWeight: 500, cursor: 'pointer',
        fontFamily: 'Inter, sans-serif', transition: 'background 0.15s, color 0.15s',
      }}
    >
      {label}
    </button>
  )
}

function ProjectRow({ project, onView, onEdit }) {
  const [hovered, setHovered] = useState(false)
  const date = new Date(project.created_at).toLocaleDateString('pt-PT', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? C.cardHover : C.card,
        border: `1px solid ${hovered ? '#2a4070' : C.border}`,
        borderRadius: 12, padding: '16px 20px',
        display: 'flex', alignItems: 'center', gap: 14,
        transition: 'background 0.15s, border-color 0.15s',
        cursor: 'default',
      }}
    >
      {/* Score ring */}
      <div style={{
        width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
        background: `conic-gradient(${getScoreColor(project.score)} ${(project.score ?? 0) * 3.6}deg, #1e3050 0deg)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          width: 34, height: 34, borderRadius: '50%', background: C.card,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 700, color: getScoreColor(project.score),
        }}>
          {project.score ?? '—'}
        </div>
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
          <span style={{ color: C.text, fontSize: 15, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {project.name}
          </span>
          {project.area && (
            <span style={{ color: C.muted, fontSize: 12, background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`, borderRadius: 5, padding: '1px 7px', flexShrink: 0 }}>
              {project.area}
            </span>
          )}
        </div>
        {project.ai_tagline && (
          <p style={{ color: C.muted, fontSize: 13, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {project.ai_tagline}
          </p>
        )}
        <span style={{ color: '#374151', fontSize: 11, marginTop: 3, display: 'block' }}>{date}</span>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        <ActionBtn onClick={onEdit} label="Editar" />
        <ActionBtn onClick={onView} label="Ver" primary />
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [projects, setProjects] = useState([])
  const [loadingProjects, setLoadingProjects] = useState(true)

  useEffect(() => {
    if (!authLoading && !user) navigate('/login')
  }, [user, authLoading, navigate])

  useEffect(() => {
    if (!user) return
    async function load() {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, slug, score, area, created_at, ai_tagline')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      if (!error) setProjects(data || [])
      setLoadingProjects(false)
    }
    load()
  }, [user])

  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 32, height: 32, border: `2px solid ${C.border}`, borderTop: `2px solid ${C.blue}`, borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (!user) return null

  const firstName = getDisplayName(user)
  const scores = projects.map(p => p.score).filter(s => s != null)
  const bestScore = scores.length ? Math.max(...scores) : null
  const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Bom dia'
    if (h < 19) return 'Boa tarde'
    return 'Boa noite'
  })()

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: 'Inter, sans-serif' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <Navbar />

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '44px 24px 80px' }}>

        {/* Header */}
        <div style={{ marginBottom: 36 }}>
          <h1 style={{ color: C.text, fontSize: 28, fontWeight: 800, margin: '0 0 4px', letterSpacing: '-0.5px' }}>
            {greeting}, {firstName}! 👋
          </h1>
          <p style={{ color: C.muted, fontSize: 15, margin: 0 }}>{user.email}</p>
        </div>

        {/* Stats */}
        {!loadingProjects && projects.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 12,
            marginBottom: 36,
          }}>
            <StatCard icon="📁" label="Projetos" value={projects.length} color={C.blue} />
            <StatCard icon="🏆" label="Melhor score" value={bestScore ?? '—'} color={getScoreColor(bestScore)} />
            <StatCard icon="📊" label="Score médio" value={avgScore ?? '—'} color={getScoreColor(avgScore)} />
          </div>
        )}

        {/* New project CTA */}
        <button
          onClick={() => navigate('/novo')}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: `linear-gradient(135deg, ${C.blue}, #4f46e5)`,
            border: 'none', borderRadius: 10,
            padding: '12px 22px', color: '#fff', fontSize: 15, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit', marginBottom: 28,
            boxShadow: '0 4px 20px rgba(59,130,246,0.3)',
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          + Novo projeto
        </button>

        {/* Projects */}
        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ color: C.text, fontSize: 16, fontWeight: 700, margin: 0 }}>
            Os meus projetos
            {projects.length > 0 && (
              <span style={{ color: C.muted, fontWeight: 400, fontSize: 14, marginLeft: 8 }}>
                ({projects.length})
              </span>
            )}
          </h2>
        </div>

        {loadingProjects ? (
          <div style={{ color: C.muted, fontSize: 15, padding: '24px 0' }}>A carregar projetos…</div>
        ) : projects.length === 0 ? (
          <div style={{
            background: C.card, border: `1px solid ${C.border}`,
            borderRadius: 14, padding: '52px 32px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 44, marginBottom: 14 }}>🚀</div>
            <p style={{ color: C.text, fontSize: 17, fontWeight: 700, margin: '0 0 8px' }}>
              Ainda não tens projetos
            </p>
            <p style={{ color: C.muted, fontSize: 14, margin: '0 0 24px', lineHeight: 1.65 }}>
              Cria o teu primeiro projeto e partilha o que estás a construir com o mundo.
            </p>
            <button
              onClick={() => navigate('/novo')}
              style={{
                background: C.blue, border: 'none', borderRadius: 8,
                padding: '11px 24px', color: '#fff', fontSize: 14, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Criar primeiro projeto →
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {projects.map(project => (
              <ProjectRow
                key={project.id}
                project={project}
                onView={() => navigate(`/projeto/${project.slug}`)}
                onEdit={() => navigate(`/editar/${project.slug}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
