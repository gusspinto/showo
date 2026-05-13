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
}

function ScoreBadge({ score }) {
  const color = score >= 80 ? C.green : score >= 50 ? C.yellow : C.muted
  return (
    <span style={{ background: `${color}18`, border: `1px solid ${color}55`, borderRadius: 6, padding: '2px 8px', color, fontSize: 12, fontWeight: 600 }}>
      {score ?? '—'}
    </span>
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
        fontFamily: 'Inter, sans-serif', transition: 'background 0.15s',
      }}
    >
      {label}
    </button>
  )
}

function ProjectRow({ project, onView, onEdit }) {
  const [hovered, setHovered] = useState(false)
  const date = new Date(project.created_at).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short', year: 'numeric' })
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? C.cardHover : C.card,
        border: `1px solid ${hovered ? '#2a4070' : C.border}`,
        borderRadius: 12, padding: '18px 22px',
        display: 'flex', alignItems: 'center', gap: 16,
        transition: 'background 0.15s, border-color 0.15s',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <span style={{ color: C.text, fontSize: 16, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {project.name}
          </span>
          <ScoreBadge score={project.score} />
        </div>
        {project.ai_tagline && (
          <p style={{ color: C.muted, fontSize: 13, margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {project.ai_tagline}
          </p>
        )}
        <span style={{ color: '#4a5568', fontSize: 12 }}>{date}</span>
      </div>
      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        <ActionBtn onClick={onEdit} label="Editar" />
        <ActionBtn onClick={onView} label="Ver" primary />
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { user, loading: authLoading, signOut } = useAuth()
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
        .select('id, name, slug, score, created_at, ai_tagline')
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
        <div style={{ color: C.muted, fontFamily: 'Inter, sans-serif' }}>A carregar…</div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: 'Inter, sans-serif' }}>
      <Navbar />

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '48px 24px' }}>
        <div style={{ marginBottom: 40 }}>
          <h1 style={{ color: C.text, fontSize: 26, fontWeight: 700, margin: '0 0 6px' }}>Os meus projetos</h1>
          <p style={{ color: C.muted, fontSize: 15, margin: 0 }}>{user.email}</p>
        </div>

        <button
          onClick={() => navigate('/novo')}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: C.blue, border: 'none', borderRadius: 10,
            padding: '12px 22px', color: '#fff', fontSize: 15, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit', marginBottom: 32,
          }}
          onMouseEnter={e => e.currentTarget.style.background = C.blueHover}
          onMouseLeave={e => e.currentTarget.style.background = C.blue}
        >
          + Novo projeto
        </button>

        {loadingProjects ? (
          <div style={{ color: C.muted, fontSize: 15 }}>A carregar projetos…</div>
        ) : projects.length === 0 ? (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: '48px 32px', textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 14 }}>📂</div>
            <p style={{ color: C.text, fontSize: 16, fontWeight: 600, margin: '0 0 8px' }}>Ainda não tens projetos</p>
            <p style={{ color: C.muted, fontSize: 14, margin: 0 }}>Cria o teu primeiro projeto e partilha o que estás a construir.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
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
