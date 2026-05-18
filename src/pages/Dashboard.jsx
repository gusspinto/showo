import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Pencil, ExternalLink } from 'lucide-react'
import { Navbar } from '../components/Navbar'
import { Folder, Trophy, BarChart2, Rocket, Eye, School, Plus, X, Users, ChevronRight } from 'lucide-react'

const C = {
  bg: '#0d1424',
  card: '#152030',
  cardHover: '#1c2d44',
  border: '#1e3050',
  borderBright: '#2a4275',
  blue: '#1b78f7',
  blueHover: '#1564d4',
  muted: '#7d93b0',
  text: '#e8f2ff',
  subtle: '#3d5270',
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
      <span style={{ display: 'flex', alignItems: 'center', color: color ?? C.text }}>{icon}</span>
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
        fontSize: 13, fontWeight: 600, cursor: 'pointer',
        fontFamily: 'var(--font-body)', transition: 'background 0.15s, color 0.15s',
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
        border: `1px solid ${hovered ? C.borderBright : C.border}`,
        borderRadius: 12, padding: '16px 20px',
        display: 'flex', alignItems: 'center', gap: 14,
        transition: 'background 0.15s, border-color 0.15s',
        cursor: 'default',
      }}
      className="dash-project-row"
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
      <div className="dash-project-info" style={{ flex: 1, minWidth: 0 }}>
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
        <span style={{ color: C.subtle, fontSize: 11, marginTop: 3, display: 'block' }}>{date}</span>
      </div>

      {/* Actions */}
      <div className="dash-project-actions">
        <ActionBtn onClick={onEdit} label="Editar" />
        <ActionBtn onClick={onView} label="Ver" primary />
      </div>
    </div>
  )
}

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

function CreateTurmaModal({ onClose, onCreated }) {
  const { user, profile } = useAuth()
  const [name, setName] = useState('')
  const [subject, setSubject] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleCreate(e) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    setError('')
    const code = generateCode()
    const teacherName = profile?.full_name || user?.user_metadata?.full_name || ''
    const { data, error: err } = await supabase
      .from('classes')
      .insert({ name: name.trim(), subject: subject.trim() || null, code, teacher_id: user.id, teacher_name: teacherName })
      .select()
      .single()
    setSaving(false)
    if (err) { setError(err.message); return }
    onCreated(data)
    onClose()
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: C.card, border: `1px solid ${C.borderBright}`, borderRadius: 18, padding: 28, width: '100%', maxWidth: 400, boxShadow: '0 16px 48px rgba(0,0,0,0.6)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: C.text }}>Nova turma</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, padding: 4 }}><X size={18} /></button>
        </div>
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: C.muted, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Nome da turma *</label>
            <input
              value={name} onChange={e => setName(e.target.value)} required
              placeholder="ex: Turma A — 11º ano"
              style={{ width: '100%', background: '#0d1424', border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 12px', color: C.text, fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none' }}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: C.muted, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Disciplina</label>
            <input
              value={subject} onChange={e => setSubject(e.target.value)}
              placeholder="ex: Programação e Sistemas de Informação"
              style={{ width: '100%', background: '#0d1424', border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 12px', color: C.text, fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none' }}
            />
          </div>
          {error && <p style={{ color: '#f87171', fontSize: 13, margin: 0 }}>{error}</p>}
          <button type="submit" disabled={saving || !name.trim()} style={{ background: 'linear-gradient(135deg,#3b82f6,#4f46e5)', border: 'none', borderRadius: 8, padding: '11px', color: '#fff', fontSize: 14, fontWeight: 600, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.7 : 1, fontFamily: 'inherit', marginTop: 4 }}>
            {saving ? 'A criar…' : 'Criar turma'}
          </button>
        </form>
      </div>
    </div>
  )
}

function TurmaCard({ turma, navigate }) {
  const [hov, setHov] = useState(false)
  return (
    <div
      onClick={() => navigate(`/turma/${turma.code}`)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{ background: hov ? C.cardHover : C.card, border: `1px solid ${hov ? C.borderBright : C.border}`, borderRadius: 12, padding: '16px 18px', cursor: 'pointer', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 14 }}
    >
      <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <School size={18} color="#3b82f6" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: C.text, fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{turma.name}</div>
        {turma.subject && <div style={{ color: C.muted, fontSize: 12, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{turma.subject}</div>}
        <div style={{ color: C.subtle, fontSize: 11, marginTop: 4, display: 'flex', gap: 10 }}>
          <span style={{ color: '#60a5fa', fontWeight: 700, letterSpacing: 1 }}>{turma.code}</span>
          {turma.project_count != null && <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Users size={10} />{turma.project_count} projeto{turma.project_count !== 1 ? 's' : ''}</span>}
        </div>
      </div>
      <ChevronRight size={16} color={C.subtle} />
    </div>
  )
}

export default function Dashboard() {
  const { user, profile, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [projects, setProjects] = useState([])
  const [loadingProjects, setLoadingProjects] = useState(true)
  const [turmas, setTurmas] = useState([])
  const [showCreateTurma, setShowCreateTurma] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) navigate('/login')
  }, [user, authLoading, navigate])

  useEffect(() => {
    if (!user) return
    async function load() {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, slug, score, area, created_at, ai_tagline, views')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      if (!error) setProjects(data || [])
      setLoadingProjects(false)
    }
    load()
  }, [user])

  useEffect(() => {
    if (!user || profile?.role !== 'professor') return
    async function loadTurmas() {
      const { data: cls } = await supabase
        .from('classes')
        .select('id, name, subject, code, created_at')
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false })
      if (!cls?.length) { setTurmas([]); return }
      // Get project counts
      const { data: cp } = await supabase
        .from('class_projects')
        .select('class_id')
        .in('class_id', cls.map(c => c.id))
      const counts = {}
      cp?.forEach(r => { counts[r.class_id] = (counts[r.class_id] || 0) + 1 })
      setTurmas(cls.map(c => ({ ...c, project_count: counts[c.id] ?? 0 })))
    }
    loadTurmas()
  }, [user, profile?.role])

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
  const totalViews = projects.reduce((sum, p) => sum + (p.views ?? 0), 0)

  const greeting = (() => {
    const h = new Date().getHours()
    if (h >= 5  && h < 12) return `Bom dia, ${firstName}`
    if (h >= 12 && h < 17) return `Boa tarde, ${firstName}`
    if (h >= 17 && h < 21) return `Boa noite, ${firstName}`
    if (h >= 21 && h < 24) return `Ainda aqui, ${firstName}?`
    return `A acabar à última da hora, ${firstName}?`
  })()

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: 'var(--font-body)' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .dash-header-btns { display: flex; gap: 8px; }
        .dash-project-actions { display: flex; gap: 6px; flex-shrink: 0; }
        @media (max-width: 600px) {
          .dash-header-btns { flex-wrap: wrap; }
          .dash-project-row { flex-wrap: wrap; gap: 10px !important; }
          .dash-project-info { min-width: 0; flex: 1 1 calc(100% - 58px); }
          .dash-project-actions { width: 100%; justify-content: flex-end; border-top: 1px solid #1e3050; padding-top: 10px; margin-top: 2px; }
        }
      `}</style>
      <Navbar />
      {showCreateTurma && (
        <CreateTurmaModal
          onClose={() => setShowCreateTurma(false)}
          onCreated={turma => setTurmas(prev => [{ ...turma, project_count: 0 }, ...prev])}
        />
      )}

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '44px 24px 80px' }}>

        {/* Header */}
        <div style={{ marginBottom: 36, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ color: C.text, fontSize: 28, fontWeight: 800, margin: '0 0 4px', letterSpacing: '-0.5px' }}>
              {greeting}
            </h1>
            <p style={{ color: C.muted, fontSize: 15, margin: 0 }}>{user.email}</p>
          </div>
          <div className="dash-header-btns">
            <button
              onClick={() => navigate(profile?.username ? `/u/${profile.username}` : `/u/${user.id}`)}
              style={{
                background: 'transparent', border: `1px solid ${C.border}`,
                borderRadius: 8, padding: '8px 14px',
                color: C.muted, fontSize: 13, fontWeight: 500,
                cursor: 'pointer', fontFamily: 'var(--font-body)',
                transition: 'border-color 0.15s, color 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = C.borderBright; e.currentTarget.style.color = C.text }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.muted }}
            >
              Ver perfil
            </button>
            <button
              onClick={() => navigate('/settings')}
              style={{
                background: 'transparent', border: `1px solid ${C.border}`,
                borderRadius: 8, padding: '8px 14px',
                color: C.muted, fontSize: 13, fontWeight: 500,
                cursor: 'pointer', fontFamily: 'var(--font-body)',
                transition: 'border-color 0.15s, color 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = C.borderBright; e.currentTarget.style.color = C.text }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.muted }}
            >
              Definições
            </button>
          </div>
        </div>

        {/* Professor: Turmas section */}
        {profile?.role === 'professor' && (
          <div style={{ marginBottom: 36 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h2 style={{ color: C.text, fontSize: 16, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <School size={18} color="#3b82f6" /> As minhas turmas
                {turmas.length > 0 && <span style={{ color: C.muted, fontWeight: 400, fontSize: 14 }}>({turmas.length})</span>}
              </h2>
              <button
                onClick={() => setShowCreateTurma(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: 8, padding: '7px 14px', color: '#60a5fa', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                <Plus size={14} /> Nova turma
              </button>
            </div>
            {turmas.length === 0 ? (
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '28px', textAlign: 'center' }}>
                <School size={36} color={C.subtle} style={{ marginBottom: 10 }} />
                <p style={{ color: C.text, fontSize: 15, fontWeight: 600, margin: '0 0 6px' }}>Ainda não tens turmas</p>
                <p style={{ color: C.muted, fontSize: 13, margin: '0 0 16px' }}>Cria uma turma e partilha o código com os teus alunos.</p>
                <button onClick={() => setShowCreateTurma(true)} style={{ background: C.blue, border: 'none', borderRadius: 8, padding: '9px 20px', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Criar primeira turma →
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {turmas.map(t => <TurmaCard key={t.id} turma={t} navigate={navigate} />)}
              </div>
            )}
          </div>
        )}

        {/* Stats */}
        {!loadingProjects && projects.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: 12,
            marginBottom: 36,
          }}>
            <StatCard icon={<Folder size={22} />} label="Projetos" value={projects.length} color={C.blue} />
            <StatCard icon={<Trophy size={22} />} label="Melhor score" value={bestScore ?? '—'} color={getScoreColor(bestScore)} />
            <StatCard icon={<BarChart2 size={22} />} label="Score médio" value={avgScore ?? '—'} color={getScoreColor(avgScore)} />
            <StatCard icon={<Eye size={22} />} label="Total visualizações" value={totalViews} color={C.purple} />
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
            <div style={{ marginBottom: 14, display: 'flex', justifyContent: 'center', color: C.blue }}><Rocket size={44} /></div>
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
