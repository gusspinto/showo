import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Navbar } from '../components/Navbar'
import { Folder, Check, Search, School, User, Copy, Inbox, Download, MessageSquare, X, ChevronUp, ChevronDown } from 'lucide-react'

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

const SECTION_LABELS = {
  description: 'Descrição', tech: 'Tecnologias', links: 'Links', demo: 'Demo',
  team: 'Equipa', gallery: 'Galeria', geral: 'Geral',
}

function FeedbackModal({ project, teacherId, onClose }) {
  const [comment, setComment] = useState('')
  const [fieldKey, setFieldKey] = useState('geral')
  const [existing, setExisting] = useState([])
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(null)

  useEffect(() => {
    supabase
      .from('teacher_feedback')
      .select('*')
      .eq('project_id', project.id)
      .eq('teacher_id', teacherId)
      .then(({ data }) => setExisting(data || []))
  }, [project.id, teacherId])

  async function handleSave() {
    if (!comment.trim()) return
    setSaving(true)
    if (editing) {
      await supabase.from('teacher_feedback').update({ comment: comment.trim() }).eq('id', editing)
      setExisting(prev => prev.map(f => f.id === editing ? { ...f, comment: comment.trim() } : f))
    } else {
      const { data } = await supabase.from('teacher_feedback')
        .upsert({ project_id: project.id, teacher_id: teacherId, field_key: fieldKey, comment: comment.trim() }, { onConflict: 'project_id,teacher_id,field_key' })
        .select().single()
      if (data) {
        setExisting(prev => { const idx = prev.findIndex(f => f.field_key === fieldKey); return idx >= 0 ? prev.map((f, i) => i === idx ? data : f) : [...prev, data] })
        // Notify the student
        if (project.user_id) {
          supabase.from('notifications').insert({
            user_id: project.user_id,
            type: 'TEACHER_FEEDBACK',
            message: `O teu professor deixou feedback no projeto "${project.name}".`,
            project_slug: project.slug,
            read: false,
          })
        }
      }
    }
    setComment(''); setEditing(null); setSaving(false)
  }

  async function handleDelete(id) {
    await supabase.from('teacher_feedback').delete().eq('id', id)
    setExisting(prev => prev.filter(f => f.id !== id))
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: C.card, border: `1px solid ${C.borderBright}`, borderRadius: 18, padding: 28, width: '100%', maxWidth: 480, maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 16px 48px rgba(0,0,0,0.6)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.text }}>Feedback do professor</h3>
            <p style={{ margin: '3px 0 0', fontSize: 13, color: C.muted }}>{project.name}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, padding: 4 }}><X size={18} /></button>
        </div>

        {existing.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
            {existing.map(f => (
              <div key={f.id} style={{ background: '#0d1424', border: `1px solid ${C.border}`, borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: 0.5 }}>{SECTION_LABELS[f.field_key] || f.field_key}</span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => { setEditing(f.id); setFieldKey(f.field_key); setComment(f.comment) }} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 12, padding: 0, fontFamily: 'inherit' }}>Editar</button>
                    <button onClick={() => handleDelete(f.id)} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: 12, padding: 0, fontFamily: 'inherit' }}>Apagar</button>
                  </div>
                </div>
                <p style={{ margin: 0, fontSize: 13, color: C.text, lineHeight: 1.5 }}>{f.comment}</p>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {Object.entries(SECTION_LABELS).map(([k, l]) => (
              <button key={k} onClick={() => setFieldKey(k)} style={{ fontSize: 12, padding: '4px 10px', borderRadius: 6, border: `1px solid ${fieldKey === k ? '#3b82f6' : C.border}`, background: fieldKey === k ? 'rgba(59,130,246,0.15)' : 'transparent', color: fieldKey === k ? '#60a5fa' : C.muted, cursor: 'pointer', fontFamily: 'inherit', fontWeight: fieldKey === k ? 700 : 400 }}>
                {l}
              </button>
            ))}
          </div>
          <textarea
            value={comment} onChange={e => setComment(e.target.value)}
            placeholder={`Comentário sobre ${SECTION_LABELS[fieldKey] || fieldKey}…`}
            rows={3}
            style={{ width: '100%', background: '#0d1424', border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 12px', color: C.text, fontSize: 13, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box', outline: 'none' }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleSave} disabled={saving || !comment.trim()} style={{ flex: 1, background: 'linear-gradient(135deg,#3b82f6,#4f46e5)', border: 'none', borderRadius: 8, padding: '10px', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: saving || !comment.trim() ? 0.6 : 1, fontFamily: 'inherit' }}>
              {saving ? 'A guardar…' : editing ? 'Atualizar' : 'Guardar feedback'}
            </button>
            {editing && <button onClick={() => { setEditing(null); setComment('') }} style={{ background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 14px', color: C.muted, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>Cancelar</button>}
          </div>
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
  const [isTeacher, setIsTeacher] = useState(false)
  const [sortBy, setSortBy] = useState('score')
  const [sortAsc, setSortAsc] = useState(false)
  const [feedbackProject, setFeedbackProject] = useState(null)
  const [copiedLink, setCopiedLink] = useState(false)

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 3500)
  }

  useEffect(() => {
    async function load() {
      const { data: cls, error } = await supabase
        .from('classes')
        .select('id, name, subject, code, teacher_name, teacher_id, created_at')
        .eq('code', code.toUpperCase())
        .single()

      if (error || !cls) { setLoading(false); return }
      setTurma(cls)
      if (user && cls.teacher_id === user.id) setIsTeacher(true)

      const { data: cp } = await supabase
        .from('class_projects')
        .select('project_id')
        .eq('class_id', cls.id)

      if (cp?.length) {
        const ids = cp.map(r => r.project_id)
        const { data: projs } = await supabase
          .from('projects')
          .select('id, name, slug, score, area, creator_name, cover_url, ai_tagline, created_at, user_id, goal, problem, solution, features, technologies, results, linkedin_url, github_url, portfolio_url')
          .in('id', ids)
        setProjects(projs || [])
      }

      setLoading(false)
    }
    load()
  }, [code, user])

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
      const { data: projs } = await supabase
        .from('projects')
        .select('id, name, slug, score, area, creator_name, cover_url, ai_tagline, created_at, user_id, goal, problem, solution, features, technologies, results, linkedin_url, github_url, portfolio_url')
        .in('id', [...projects.map(p => p.id), projectId])
      setProjects(projs || [])
      showToast('Projeto adicionado à turma!')
      setShowAdd(false)
      // Notify the teacher
      if (turma.teacher_id) {
        const added = myProjects.find(p => p.id === projectId)
        supabase.from('notifications').insert({
          user_id: turma.teacher_id,
          type: 'STUDENT_JOINED',
          message: `Um aluno adicionou o projeto "${added?.name ?? 'novo projeto'}" à turma "${turma.name}".`,
          project_slug: added?.slug ?? null,
          read: false,
        })
      }
    }
    setAdding(null)
  }

  async function removeProject(projectId) {
    if (!turma || !isTeacher) return
    await supabase.from('class_projects').delete().eq('class_id', turma.id).eq('project_id', projectId)
    setProjects(prev => prev.filter(p => p.id !== projectId))
    showToast('Projeto removido da turma.')
  }

  function copyCode() {
    navigator.clipboard.writeText(turma.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function copyLink() {
    navigator.clipboard.writeText(`${window.location.origin}/turma/${turma.code}`)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  function computeCompletude(p) {
    const checks = [
      !!(p.goal || p.problem),
      !!p.solution,
      !!p.technologies,
      !!p.features,
      !!p.results,
      !!(p.linkedin_url || p.github_url || p.portfolio_url),
      !!p.cover_url,
    ]
    return Math.round((checks.filter(Boolean).length / checks.length) * 100)
  }

  function exportCSV() {
    const rows = [['Aluno', 'Projeto', 'Score', 'Completude (%)', 'Data', 'Link']]
    sortedProjects.forEach(p => {
      const date = p.created_at ? new Date(p.created_at).toLocaleDateString('pt-PT') : '—'
      rows.push([p.creator_name || '—', p.name, p.score ?? '—', computeCompletude(p), date, `${window.location.origin}/projeto/${p.slug}`])
    })
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `${turma.name}-${turma.code}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  function toggleSort(field) {
    if (sortBy === field) setSortAsc(a => !a)
    else { setSortBy(field); setSortAsc(field === 'name') }
  }

  const sortedProjects = [...projects].sort((a, b) => {
    let av, bv
    if (sortBy === 'score') { av = a.score ?? -1; bv = b.score ?? -1 }
    else if (sortBy === 'completude') { av = computeCompletude(a); bv = computeCompletude(b) }
    else if (sortBy === 'updated') { av = a.created_at || ''; bv = b.created_at || '' }
    else { av = (a.name || '').toLowerCase(); bv = (b.name || '').toLowerCase() }
    if (av < bv) return sortAsc ? -1 : 1
    if (av > bv) return sortAsc ? 1 : -1
    return 0
  })

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

      {/* Feedback modal */}
      {feedbackProject && (
        <FeedbackModal
          project={feedbackProject}
          teacherId={user.id}
          onClose={() => setFeedbackProject(null)}
        />
      )}

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
                <span style={{ color: copied ? C.green : C.muted }}>{copied ? <Check size={12} /> : <Copy size={12} />}</span>
              </button>
              {/* Copy link */}
              <button
                onClick={copyLink}
                style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(59,130,246,0.06)', border: `1px solid rgba(59,130,246,0.2)`, borderRadius: 10, padding: '8px 14px', cursor: 'pointer', fontFamily: 'inherit', color: copiedLink ? C.green : C.muted, fontSize: 13, fontWeight: 600, transition: 'color 0.15s' }}
              >
                {copiedLink ? <Check size={13} /> : <Copy size={13} />}
                {copiedLink ? 'Link copiado!' : 'Copiar link'}
              </button>
              {/* Professor: export CSV */}
              {isTeacher && projects.length > 0 && (
                <button
                  onClick={exportCSV}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 10, padding: '9px 14px', color: '#4ade80', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  <Download size={14} /> Exportar CSV
                </button>
              )}
              {/* Add project (students only) */}
              {!isTeacher && (user ? (
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
              ))}
            </div>
          </div>
        </div>

        {/* Projects */}
        {sortedProjects.length === 0 ? (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: '60px 32px', textAlign: 'center' }}>
            <div style={{ marginBottom: 14 }}><Inbox size={44} color="#3d5270" /></div>
            <p style={{ color: C.text, fontSize: 17, fontWeight: 700, margin: '0 0 8px' }}>Ainda não há projetos</p>
            <p style={{ color: C.muted, fontSize: 14, margin: '0 0 24px' }}>Partilha o código <strong style={{ color: '#60a5fa' }}>{turma.code}</strong> com os teus alunos para que adicionem os seus projetos.</p>
          </div>
        ) : isTeacher ? (
          /* Professor table view */
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden' }}>
            {/* Table header */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 90px 140px 100px', gap: 0, padding: '10px 16px', borderBottom: `1px solid ${C.border}`, background: '#0d1424' }}>
              {[['name','Projeto'], ['score','Score'], ['completude','Completude'], ['updated','Data'], [null,'']].map(([field, label]) => (
                <div key={label} onClick={() => field && toggleSort(field)} style={{ fontSize: 11, fontWeight: 700, color: field ? (sortBy === field ? '#60a5fa' : C.muted) : C.muted, textTransform: 'uppercase', letterSpacing: 0.5, cursor: field ? 'pointer' : 'default', display: 'flex', alignItems: 'center', gap: 4, userSelect: 'none' }}>
                  {label}
                  {field && sortBy === field && (sortAsc ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                </div>
              ))}
            </div>
            {sortedProjects.map((p, i) => {
              const completude = computeCompletude(p)
              const updated = p.created_at ? new Date(p.created_at).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' }) : '—'
              return (
                <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 90px 140px 100px', gap: 0, padding: '13px 16px', borderBottom: i < sortedProjects.length - 1 ? `1px solid ${C.border}` : 'none', alignItems: 'center', transition: 'background 0.12s' }}
                  onMouseEnter={e => e.currentTarget.style.background = C.cardHover}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer' }} onClick={() => navigate(`/projeto/${p.slug}`)}>
                      {p.name}
                    </div>
                    {p.creator_name && <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{p.creator_name}</div>}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: scoreColor(p.score) }}>{p.score ?? '—'}</div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: completude >= 80 ? C.green : completude >= 50 ? C.yellow : C.muted, marginBottom: 3 }}>{completude}%</div>
                    <div style={{ height: 4, borderRadius: 2, background: C.border, overflow: 'hidden' }}>
                      <div style={{ width: `${completude}%`, height: '100%', background: completude >= 80 ? C.green : completude >= 50 ? C.yellow : '#f97316', borderRadius: 2 }} />
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: C.muted }}>{updated}</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => navigate(`/projeto/${p.slug}`)} style={{ fontSize: 12, padding: '5px 10px', borderRadius: 6, border: `1px solid ${C.border}`, background: 'transparent', color: C.muted, cursor: 'pointer', fontFamily: 'inherit' }}>Ver</button>
                    <button onClick={() => setFeedbackProject(p)} style={{ fontSize: 12, padding: '5px 8px', borderRadius: 6, border: '1px solid rgba(59,130,246,0.3)', background: 'rgba(59,130,246,0.08)', color: '#60a5fa', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4 }}><MessageSquare size={11} /></button>
                    <button onClick={() => removeProject(p.id)} style={{ fontSize: 12, padding: '5px 8px', borderRadius: 6, border: '1px solid rgba(248,113,113,0.3)', background: 'transparent', color: '#f87171', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center' }}><X size={11} /></button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          /* Student grid view */
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
            {sortedProjects.map(p => (
              <ProjectCard key={p.id} project={p} navigate={navigate} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
