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

function generateClassCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export default function Dashboard() {
  const { user, profile, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [projects, setProjects] = useState([])
  const [loadingProjects, setLoadingProjects] = useState(true)
  const [myClasses, setMyClasses] = useState([])
  const [showCreateClass, setShowCreateClass] = useState(false)
  const [className, setClassName] = useState('')
  const [classSubject, setClassSubject] = useState('')
  const [creatingClass, setCreatingClass] = useState(false)
  const [classToast, setClassToast] = useState('')
  const [copiedCode, setCopiedCode] = useState(null)

  function showClassToast(msg) {
    setClassToast(msg)
    setTimeout(() => setClassToast(''), 3500)
  }

  useEffect(() => {
    if (!authLoading && !user) navigate('/login')
  }, [user, authLoading, navigate])

  useEffect(() => {
    if (!user) return
    async function load() {
      const [projRes, classRes] = await Promise.all([
        supabase.from('projects').select('id, name, slug, score, area, created_at, ai_tagline').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('classes').select('id, name, subject, code, created_at').eq('teacher_id', user.id).order('created_at', { ascending: false }),
      ])
      if (!projRes.error) setProjects(projRes.data || [])
      if (!classRes.error) setMyClasses(classRes.data || [])
      setLoadingProjects(false)
    }
    load()
  }, [user])

  async function createClass() {
    if (!className.trim()) return
    setCreatingClass(true)
    let code = generateClassCode()
    // Try to insert, retry if code collision
    for (let i = 0; i < 5; i++) {
      const { data, error } = await supabase
        .from('classes')
        .insert({ name: className.trim(), subject: classSubject.trim() || null, code, teacher_id: user.id, teacher_name: profile?.full_name || profile?.username || null })
        .select()
        .single()
      if (!error && data) {
        setMyClasses(prev => [data, ...prev])
        setClassName('')
        setClassSubject('')
        setShowCreateClass(false)
        showClassToast(`✅ Turma criada! Código: ${code}`)
        break
      }
      if (error?.code === '23505') { code = generateClassCode(); continue } // code collision
      showClassToast('Erro ao criar turma.')
      break
    }
    setCreatingClass(false)
  }

  async function deleteClass(id) {
    await supabase.from('classes').delete().eq('id', id)
    setMyClasses(prev => prev.filter(c => c.id !== id))
    showClassToast('Turma eliminada.')
  }

  function copyCode(code) {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

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
    if (h >= 5  && h < 12) return `Bom dia, ${firstName}`
    if (h >= 12 && h < 17) return `Boa tarde, ${firstName}`
    if (h >= 17 && h < 21) return `Boa noite, ${firstName}`
    if (h >= 21 && h < 24) return `Ainda aqui, ${firstName}?`
    return `A acabar à última da hora, ${firstName}?`
  })()

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: 'Inter, sans-serif' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <Navbar />

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '44px 24px 80px' }}>

        {/* Header */}
        <div style={{ marginBottom: 36, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ color: C.text, fontSize: 28, fontWeight: 800, margin: '0 0 4px', letterSpacing: '-0.5px' }}>
              {greeting}
            </h1>
            <p style={{ color: C.muted, fontSize: 15, margin: 0 }}>{user.email}</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => navigate(profile?.username ? `/u/${profile.username}` : `/u/${user.id}`)}
              style={{
                background: 'transparent', border: `1px solid ${C.border}`,
                borderRadius: 8, padding: '8px 14px',
                color: C.muted, fontSize: 13, fontWeight: 500,
                cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                transition: 'border-color 0.15s, color 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#2a4275'; e.currentTarget.style.color = C.text }}
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
                cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                transition: 'border-color 0.15s, color 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#2a4275'; e.currentTarget.style.color = C.text }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.muted }}
            >
              Definições
            </button>
          </div>
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

        {/* Toast for classes */}
        <div style={{
          position: 'fixed', bottom: 28, left: '50%',
          transform: `translateX(-50%) translateY(${classToast ? 0 : 80}px)`,
          opacity: classToast ? 1 : 0, transition: 'all 0.3s cubic-bezier(0.34,1.56,0.64,1)',
          background: '#111c32', border: '1px solid #2a4275', borderRadius: 12,
          padding: '12px 24px', fontSize: 14, fontWeight: 600, color: C.text,
          zIndex: 3000, pointerEvents: 'none', whiteSpace: 'nowrap',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}>{classToast}</div>

        {/* Create class modal */}
        {showCreateClass && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
            onClick={e => e.target === e.currentTarget && setShowCreateClass(false)}>
            <div style={{ background: '#111c32', border: '1px solid #2a4275', borderRadius: 18, padding: '28px', width: '100%', maxWidth: 400, boxShadow: '0 16px 48px rgba(0,0,0,0.6)', fontFamily: 'Inter, sans-serif' }}>
              <h3 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700, color: C.text }}>Nova turma</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: C.muted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Nome da turma *</label>
                  <input
                    value={className} onChange={e => setClassName(e.target.value)}
                    placeholder="Ex: 12º DEV, Turma A..."
                    onKeyDown={e => e.key === 'Enter' && createClass()}
                    style={{ width: '100%', background: '#0a1118', border: '1px solid #1e3050', borderRadius: 8, padding: '10px 12px', color: C.text, fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: C.muted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Disciplina (opcional)</label>
                  <input
                    value={classSubject} onChange={e => setClassSubject(e.target.value)}
                    placeholder="Ex: Projeto e Desenvolvimento..."
                    style={{ width: '100%', background: '#0a1118', border: '1px solid #1e3050', borderRadius: 8, padding: '10px 12px', color: C.text, fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setShowCreateClass(false)} style={{ flex: 1, background: 'transparent', border: '1px solid #1e3050', borderRadius: 8, padding: '10px', color: C.muted, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>Cancelar</button>
                <button onClick={createClass} disabled={!className.trim() || creatingClass} style={{ flex: 2, background: 'linear-gradient(135deg,#3b82f6,#4f46e5)', border: 'none', borderRadius: 8, padding: '10px', color: '#fff', fontSize: 14, fontWeight: 700, cursor: !className.trim() || creatingClass ? 'default' : 'pointer', opacity: !className.trim() || creatingClass ? 0.6 : 1, fontFamily: 'inherit' }}>
                  {creatingClass ? 'A criar...' : 'Criar turma'}
                </button>
              </div>
            </div>
          </div>
        )}

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

        {/* ── Turmas ── */}
        <div style={{ marginTop: 48 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ color: C.text, fontSize: 16, fontWeight: 700, margin: 0 }}>
              As minhas turmas
              {myClasses.length > 0 && <span style={{ color: C.muted, fontWeight: 400, fontSize: 14, marginLeft: 8 }}>({myClasses.length})</span>}
            </h2>
            <button
              onClick={() => setShowCreateClass(true)}
              style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 8, padding: '7px 14px', color: '#60a5fa', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              + Criar turma
            </button>
          </div>

          {myClasses.length === 0 ? (
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: '36px 32px', textAlign: 'center' }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>🏫</div>
              <p style={{ color: C.text, fontSize: 15, fontWeight: 700, margin: '0 0 6px' }}>Nenhuma turma criada</p>
              <p style={{ color: C.muted, fontSize: 13, margin: '0 0 18px', lineHeight: 1.6 }}>Cria uma turma, partilha o código com os alunos e acompanha os projetos deles.</p>
              <button onClick={() => setShowCreateClass(true)} style={{ background: C.blue, border: 'none', borderRadius: 8, padding: '9px 20px', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                Criar primeira turma →
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {myClasses.map(cls => (
                <div key={cls.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>🏫</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{cls.name}</div>
                    {cls.subject && <div style={{ fontSize: 12, color: C.muted }}>{cls.subject}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', flexShrink: 0 }}>
                    <button onClick={() => copyCode(cls.code)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: 7, padding: '5px 10px', cursor: 'pointer', fontFamily: 'inherit' }}>
                      <span style={{ fontSize: 13, fontWeight: 800, color: '#60a5fa', letterSpacing: 1.5 }}>{cls.code}</span>
                      <span style={{ fontSize: 11, color: copiedCode === cls.code ? C.green : C.muted }}>{copiedCode === cls.code ? '✓' : '⎘'}</span>
                    </button>
                    <button onClick={() => navigate(`/turma/${cls.code}`)} style={{ background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 7, padding: '5px 12px', color: C.muted, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                      Ver turma
                    </button>
                    <button onClick={() => deleteClass(cls.id)} style={{ background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 7, padding: '5px 10px', color: '#f87171', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
