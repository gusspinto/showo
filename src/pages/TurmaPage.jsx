import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Navbar } from '../components/Navbar'
import { Folder, Check, Search, School, User, Copy, Inbox } from 'lucide-react'

const C = {
  bg: '#0d1424', bgAlt: '#0a1018', card: '#111c32', cardHover: '#152030',
  border: '#1e3050', borderBright: '#2a4275',
  blue: '#3b82f6', text: '#e8f2ff', muted: '#7d93b0', subtle: '#3d5270',
  green: '#22c55e', yellow: '#eab308',
}

function scoreColor(s) {
  if (!s) return C.muted
  if (s >= 80) return C.green
  if (s >= 50) return C.yellow
  return '#f97316'
}

function ProjectCard({ project, navigate }) {
  const [hov, setHov] = useState(false)
  return (
    <div
      onClick={() => navigate(`/projeto/${project.slug}`)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? C.cardHover : C.card,
        border: `1px solid ${hov ? C.borderBright : C.border}`,
        borderRadius: 14, overflow: 'hidden', cursor: 'pointer',
        transition: 'all 0.18s', transform: hov ? 'translateY(-2px)' : 'none',
        boxShadow: hov ? '0 8px 32px rgba(0,0,0,0.4)' : 'none',
      }}
    >
      {project.cover_url ? (
        <img src={project.cover_url} alt="" style={{ width: '100%', height: 120, objectFit: 'cover', display: 'block' }} />
      ) : (
        <div style={{ width: '100%', height: 80, background: 'linear-gradient(135deg,rgba(59,130,246,0.08),rgba(79,70,229,0.05))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Folder size={28} color="#3b82f6" />
        </div>
      )}
      <div style={{ padding: '14px 16px' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {project.name}
        </div>
        {project.creator_name && (
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>{project.creator_name}</div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {project.area && (
            <span style={{ fontSize: 11, color: C.muted, background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`, borderRadius: 4, padding: '2px 7px' }}>
              {project.area}
            </span>
          )}
          <span style={{ fontSize: 12, fontWeight: 800, color: scoreColor(project.score), marginLeft: 'auto' }}>
            {project.score ?? '—'}
          </span>
        </div>
      </div>
    </div>
  )
}

export default function TurmaPage() {
  const { code } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [turma, setTurma] = useState(null)
  const [projects, setProjects] = useState([])
  const [myProjects, setMyProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [adding, setAdding] = useState(null)
  const [toast, setToast] = useState('')
  const [copied, setCopied] = useState(false)

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 3500)
  }

  useEffect(() => {
    async function load() {
      // Load class
      const { data: cls, error } = await supabase
        .from('classes')
        .select('id, name, subject, code, teacher_name, created_at')
        .eq('code', code.toUpperCase())
        .single()

      if (error || !cls) { setLoading(false); return }
      setTurma(cls)

      // Load class projects
      const { data: cp } = await supabase
        .from('class_projects')
        .select('project_id')
        .eq('class_id', cls.id)

      if (cp?.length) {
        const ids = cp.map(r => r.project_id)
        const { data: projs } = await supabase
          .from('projects')
          .select('id, name, slug, score, area, creator_name, cover_url, ai_tagline')
          .in('id', ids)
          .order('score', { ascending: false })
        setProjects(projs || [])
      }

      setLoading(false)
    }
    load()
  }, [code])

  // Load user's own projects for the add modal
  useEffect(() => {
    if (!user) return
    supabase
      .from('projects')
      .select('id, name, slug, score')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setMyProjects(data || []))
  }, [user])

  async function addProject(projectId) {
    if (!turma) return
    setAdding(projectId)
    const { error } = await supabase
      .from('class_projects')
      .insert({ class_id: turma.id, project_id: projectId })

    if (error) {
      if (error.code === '23505') showToast('Este projeto já está na turma.')
      else showToast('Erro ao adicionar: ' + error.message)
    } else {
      // Reload projects
      const { data: projs } = await supabase
        .from('projects')
        .select('id, name, slug, score, area, creator_name, cover_url, ai_tagline')
        .in('id', [...projects.map(p => p.id), projectId])
        .order('score', { ascending: false })
      setProjects(projs || [])
      showToast('Projeto adicionado à turma!')
      setShowAdd(false)
    }
    setAdding(null)
  }

  function copyCode() {
    navigator.clipboard.writeText(turma.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 36, height: 36, border: `3px solid ${C.border}`, borderTop: `3px solid ${C.blue}`, borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  if (!turma) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: 'Inter, system-ui, sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 }}>
        <Search size={52} color="#3b82f6" />
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Turma não encontrada</h2>
        <p style={{ color: C.muted, margin: 0 }}>O código <strong style={{ color: C.text }}>{code}</strong> não existe. Verifica com o professor.</p>
        <button onClick={() => navigate('/')} style={{ background: C.blue, border: 'none', borderRadius: 8, padding: '10px 24px', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          Ir para o início
        </button>
      </div>
    )
  }

  const alreadyAdded = new Set(projects.map(p => p.id))
  const addableProjects = myProjects.filter(p => !alreadyAdded.has(p.id))

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: 'Inter, system-ui, sans-serif' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <Navbar />

      {/* Toast */}
      <div style={{
        position: 'fixed', bottom: 28, left: '50%',
        transform: `translateX(-50%) translateY(${toast ? 0 : 80}px)`,
        opacity: toast ? 1 : 0, transition: 'all 0.3s cubic-bezier(0.34,1.56,0.64,1)',
        background: '#111c32', border: `1px solid ${C.borderBright}`, borderRadius: 12,
        padding: '12px 24px', fontSize: 14, fontWeight: 600, color: C.text,
        zIndex: 3000, pointerEvents: 'none', whiteSpace: 'nowrap',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      }}>{toast}</div>

      {/* Add project modal */}
      {showAdd && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
          onClick={e => e.target === e.currentTarget && setShowAdd(false)}
        >
          <div style={{ background: C.card, border: `1px solid ${C.borderBright}`, borderRadius: 18, padding: '28px', width: '100%', maxWidth: 400, boxShadow: '0 16px 48px rgba(0,0,0,0.6)' }}>
            <h3 style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 700 }}>Adicionar à turma</h3>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: C.muted }}>Seleciona um projeto para adicionar a <strong style={{ color: C.text }}>{turma.name}</strong></p>
            {addableProjects.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px 0', color: C.muted, fontSize: 14 }}>
                {myProjects.length === 0 ? 'Ainda não tens projetos.' : 'Todos os teus projetos já estão nesta turma.'}
                {myProjects.length === 0 && (
                  <div style={{ marginTop: 12 }}>
                    <button onClick={() => navigate('/novo')} style={{ background: C.blue, border: 'none', borderRadius: 8, padding: '9px 20px', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                      Criar projeto →
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {addableProjects.map(p => (
                  <div key={p.id} style={{ background: C.bgAlt, border: `1px solid ${C.border}`, borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: C.muted }}>Score: {p.score ?? '—'}</div>
                    </div>
                    <button
                      onClick={() => addProject(p.id)}
                      disabled={adding === p.id}
                      style={{ background: 'linear-gradient(135deg,#3b82f6,#4f46e5)', border: 'none', borderRadius: 8, padding: '7px 16px', color: '#fff', fontSize: 13, fontWeight: 600, cursor: adding === p.id ? 'default' : 'pointer', fontFamily: 'inherit', opacity: adding === p.id ? 0.6 : 1, flexShrink: 0 }}
                    >
                      {adding === p.id ? '...' : 'Adicionar'}
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => setShowAdd(false)} style={{ marginTop: 16, width: '100%', background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 8, padding: '9px', color: C.muted, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '40px 24px 80px' }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg,rgba(59,130,246,0.2),rgba(79,70,229,0.15))', border: `1px solid rgba(59,130,246,0.25)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <School size={22} color="#3b82f6" />
                </div>
                <div>
                  <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, letterSpacing: '-0.3px' }}>{turma.name}</h1>
                  {turma.subject && <p style={{ margin: 0, fontSize: 14, color: C.muted }}>{turma.subject}</p>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 13, color: C.subtle }}>
                {turma.teacher_name && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><User size={13} />{turma.teacher_name}</span>}
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Folder size={13} />{projects.length} projeto{projects.length !== 1 ? 's' : ''}</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              {/* Code badge */}
              <button
                onClick={copyCode}
                style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(59,130,246,0.06)', border: `1px solid rgba(59,130,246,0.2)`, borderRadius: 10, padding: '8px 14px', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                <span style={{ fontSize: 11, color: C.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Código</span>
                <span style={{ fontSize: 16, fontWeight: 800, color: '#60a5fa', letterSpacing: 2 }}>{turma.code}</span>
                <span style={{ fontSize: 12, color: copied ? C.green : C.muted }}>{copied ? <Check size={12} /> : <Copy size={12} />}</span>
              </button>
              {/* Add project */}
              {user ? (
                <button
                  onClick={() => setShowAdd(true)}
                  style={{ background: 'linear-gradient(135deg,#3b82f6,#4f46e5)', border: 'none', borderRadius: 10, padding: '9px 18px', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 16px rgba(59,130,246,0.3)' }}
                >
                  + Adicionar o meu projeto
                </button>
              ) : (
                <button
                  onClick={() => navigate('/login')}
                  style={{ background: 'rgba(59,130,246,0.08)', border: `1px solid rgba(59,130,246,0.2)`, borderRadius: 10, padding: '9px 18px', color: '#60a5fa', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  Entrar para adicionar
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Projects grid */}
        {projects.length === 0 ? (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: '60px 32px', textAlign: 'center' }}>
            <div style={{ marginBottom: 14 }}><Inbox size={44} color="#3d5270" /></div>
            <p style={{ color: C.text, fontSize: 17, fontWeight: 700, margin: '0 0 8px' }}>Ainda não há projetos</p>
            <p style={{ color: C.muted, fontSize: 14, margin: '0 0 24px' }}>Partilha o código <strong style={{ color: '#60a5fa' }}>{turma.code}</strong> com os teus alunos para que adicionem os seus projetos.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
            {projects.map(p => (
              <ProjectCard key={p.id} project={p} navigate={navigate} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
