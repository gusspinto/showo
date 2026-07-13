import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Navbar } from '../components/Navbar'
import { Folder, Check, Search, User, Copy, Inbox, Download, MessageSquare, X, ChevronUp, ChevronDown, ArrowRight, Pencil, UserMinus, GraduationCap } from 'lucide-react'
import CreateProjectModal from '../components/CreateProjectModal'

const C = {
  bg: 'var(--c-bg)', bgAlt: 'var(--c-bg-alt)', card: 'var(--c-card)', cardHover: 'var(--c-card-hover)',
  border: 'var(--c-border)', borderBright: 'var(--c-border-bright)',
  blue: '#1b78f7', text: 'var(--c-text)', muted: 'var(--c-muted)', subtle: 'var(--c-subtle)',
  green: '#22c55e', yellow: '#fbbf24', red: '#ef4444',
}

function scoreColor(s) {
  if (s == null) return C.muted
  if (s >= 90) return C.green
  if (s >= 71) return C.blue
  if (s >= 40) return C.yellow
  return C.red
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
        borderRadius: 12, overflow: 'hidden', cursor: 'pointer',
        transition: 'background 0.15s, border-color 0.15s',
        boxShadow: 'none',
      }}
    >
      {project.cover_url ? (
        <img src={project.cover_url} alt="" style={{ width: '100%', height: 120, objectFit: 'cover', display: 'block' }} />
      ) : (
        <div style={{ width: '100%', height: 80, background: 'linear-gradient(135deg,rgba(27,120,247,0.08),rgba(79,70,229,0.05))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Folder size={28} color="#1b78f7" />
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
            <span style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>
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
          supabase.rpc('create_notification', {
            p_user_id: project.user_id,
            p_type: 'TEACHER_FEEDBACK',
            p_message: `O teu professor deixou feedback no projeto "${project.name}".`,
            p_project_slug: project.slug,
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
      <div className="turmapage-modal" style={{ background: C.card, border: `1px solid ${C.borderBright}`, borderRadius: 14, padding: 28, width: '100%', maxWidth: 480, maxHeight: '80vh', overflowY: 'auto', boxShadow: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 400, color: C.text, fontFamily: 'var(--font-heading)', letterSpacing: '-0.3px' }}>Feedback do professor</h3>
            <p style={{ margin: '3px 0 0', fontSize: 13, color: C.muted }}>{project.name}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, padding: 4 }}><X size={18} /></button>
        </div>

        {existing.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
            {existing.map(f => (
              <div key={f.id} style={{ background: 'var(--c-bg)', border: `1px solid ${C.border}`, borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: C.blue, textTransform: 'uppercase', letterSpacing: 0.5 }}>{SECTION_LABELS[f.field_key] || f.field_key}</span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => { setEditing(f.id); setFieldKey(f.field_key); setComment(f.comment) }} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 12, padding: 0, fontFamily: 'inherit' }}>Editar</button>
                    <button onClick={() => handleDelete(f.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 12, padding: 0, fontFamily: 'inherit' }}>Apagar</button>
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
              <button key={k} onClick={() => setFieldKey(k)} style={{ fontSize: 12, padding: '4px 10px', borderRadius: 6, border: `1px solid ${fieldKey === k ? '#1b78f7' : C.border}`, background: fieldKey === k ? 'rgba(27,120,247,0.15)' : 'transparent', color: fieldKey === k ? C.blue : C.muted, cursor: 'pointer', fontFamily: 'inherit', fontWeight: fieldKey === k ? 700 : 400 }}>
                {l}
              </button>
            ))}
          </div>
          <textarea
            value={comment} onChange={e => setComment(e.target.value)}
            placeholder={`Comentário sobre ${SECTION_LABELS[fieldKey] || fieldKey}…`}
            rows={3}
            style={{ width: '100%', background: 'var(--c-bg)', border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 12px', color: C.text, fontSize: 13, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box', outline: 'none' }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleSave} disabled={saving || !comment.trim()} style={{ flex: 1, background: '#1b78f7', border: 'none', borderRadius: 8, padding: '10px', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: saving || !comment.trim() ? 0.6 : 1, fontFamily: 'inherit', boxShadow: '0 2px 8px rgba(27,120,247,0.2)' }}>
              {saving ? 'A guardar…' : editing ? 'Atualizar' : 'Guardar feedback'}
            </button>
            {editing && <button onClick={() => { setEditing(null); setComment('') }} style={{ background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 14px', color: C.muted, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>Cancelar</button>}
          </div>
        </div>
      </div>
    </div>
  )
}

function EditTurmaModal({ turma, onClose, onSave }) {
  const [name, setName] = useState(turma.name || '')
  const [subject, setSubject] = useState(turma.subject || '')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    await onSave(name.trim(), subject.trim())
    setSaving(false)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: C.card, border: `1px solid ${C.borderBright}`, borderRadius: 14, padding: 28, width: '100%', maxWidth: 400, boxShadow: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 400, color: C.text, fontFamily: 'var(--font-heading)', letterSpacing: '-0.3px' }}>Editar turma</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, padding: 4 }}><X size={18} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: C.muted, marginBottom: 6, fontWeight: 600 }}>Nome</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Nome da turma"
              style={{ width: '100%', background: 'var(--c-bg)', border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 12px', color: C.text, fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: C.muted, marginBottom: 6, fontWeight: 600 }}>Disciplina (opcional)</label>
            <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Ex: Programação"
              style={{ width: '100%', background: 'var(--c-bg)', border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 12px', color: C.text, fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <button onClick={handleSave} disabled={saving || !name.trim()} style={{ background: '#1b78f7', border: 'none', borderRadius: 8, padding: '11px', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: saving || !name.trim() ? 0.6 : 1, fontFamily: 'inherit' }}>
            {saving ? 'A guardar…' : 'Guardar alterações'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Avatar({ avatarUrl, name, size = 40 }) {
  const initial = (name || '?')[0].toUpperCase()
  const colors = ['#1b78f7','#8b5cf6','#0d9488','#f59e0b','#ec4899','#10b981']
  const bg = colors[(initial.charCodeAt(0) || 0) % colors.length]
  if (avatarUrl) return (
    <img src={avatarUrl} alt={name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
  )
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.4, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
      {initial}
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
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [members, setMembers] = useState([]) // { user_id, full_name, avatar_url, role, projectCount }
  const [leavingClass, setLeavingClass] = useState(false)
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)
  const [showEditTurma, setShowEditTurma] = useState(false)
  const [removingMember, setRemovingMember] = useState(null) // { user_id, full_name }

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

      let projs = []
      if (cp?.length) {
        const ids = cp.map(r => r.project_id)
        const { data } = await supabase
          .from('projects')
          .select('id, name, slug, score, area, creator_name, cover_url, ai_tagline, created_at, user_id, goal, problem, solution, features, technologies, results, linkedin_url, github_url, portfolio_url')
          .in('id', ids)
        projs = data || []
        setProjects(projs)
      }

      // Fetch all members from class_members table (source of truth)
      const { data: classMembers, error: classMembersError } = await supabase
        .from('class_members')
        .select('user_id, joined_at')
        .eq('class_id', cls.id)

      if (classMembersError) {
        console.error('class_members fetch failed:', classMembersError)
        showToast('Erro ao carregar alunos: ' + classMembersError.message)
      }

      const memberUserIds = (classMembers || []).map(m => m.user_id)
      // Always include teacher even if not in class_members
      const allIds = cls.teacher_id
        ? [...new Set([cls.teacher_id, ...memberUserIds])]
        : [...new Set(memberUserIds)]

      if (allIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, username, avatar_url, role')
          .in('id', allIds)
        if (profilesError) console.error('profiles fetch failed:', profilesError)
        const profileMap = {}
        ;(profiles || []).forEach(p => { profileMap[p.id] = p })
        const memberList = allIds.map(uid => {
          const prof = profileMap[uid] || {}
          const projCount = projs.filter(p => p.user_id === uid).length
          const joinedAt = (classMembers || []).find(m => m.user_id === uid)?.joined_at || null
          return {
            user_id: uid,
            full_name: prof.full_name || prof.username || (uid === cls.teacher_id ? cls.teacher_name : 'Aluno'),
            avatar_url: prof.avatar_url || null,
            role: uid === cls.teacher_id ? 'professor' : 'aluno',
            projectCount: projCount,
            joinedAt,
          }
        })
        // professor first, then by join date
        memberList.sort((a, b) => {
          if (a.role === 'professor') return -1
          if (b.role === 'professor') return 1
          return (a.joinedAt || '') < (b.joinedAt || '') ? -1 : 1
        })
        setMembers(memberList)
      } else if (cls.teacher_name) {
        setMembers([{ user_id: cls.teacher_id || 'teacher', full_name: cls.teacher_name, avatar_url: null, role: 'professor', projectCount: 0, joinedAt: null }])
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

    // Ensure student is registered as a member
    if (!error && user?.id) {
      supabase.from('class_members').upsert(
        { class_id: turma.id, user_id: user.id },
        { onConflict: 'class_id,user_id' }
      )
    }

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
        supabase.rpc('create_notification', {
          p_user_id: turma.teacher_id,
          p_type: 'STUDENT_JOINED',
          p_message: `Um aluno adicionou o projeto "${added?.name ?? 'novo projeto'}" à turma "${turma.name}".`,
          p_project_slug: added?.slug ?? null,
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
      <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: 'inherit', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 }}>
        <Search size={52} color="#1b78f7" />
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 400, fontFamily: 'var(--font-heading)', letterSpacing: '-0.4px' }}>Turma não encontrada</h2>
        <p style={{ color: C.muted, margin: 0 }}>O código <strong style={{ color: C.text }}>{code}</strong> não existe. Verifica com o professor.</p>
        <button onClick={() => navigate('/')} style={{ background: C.blue, border: 'none', borderRadius: 8, padding: '10px 24px', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 2px 8px rgba(27,120,247,0.2)' }}>
          Ir para o início
        </button>
      </div>
    )
  }

  async function leaveClass() {
    if (!turma || !user) return
    setLeavingClass(true)
    // Also unlinks the student's own projects from this class server-side —
    // otherwise the dashboard's "my turmas" (derived independently from
    // class_projects) kept showing this turma after "leaving".
    await supabase.rpc('leave_class', { p_class_id: turma.id })
    // Clean localStorage
    try {
      const lsKey = `showo_turmas_${user.id}`
      const existing = JSON.parse(localStorage.getItem(lsKey) || '[]')
      localStorage.setItem(lsKey, JSON.stringify(existing.filter(t => t.id !== turma.id)))
    } catch {}
    setLeavingClass(false)
    navigate('/dashboard')
  }

  async function handleUpdateTurma(name, subject) {
    const { error } = await supabase.rpc('update_class', { p_class_id: turma.id, p_name: name, p_subject: subject || null })
    if (error) { showToast('Erro ao atualizar turma: ' + error.message); return }
    setTurma(prev => ({ ...prev, name, subject: subject || null }))
    setShowEditTurma(false)
    showToast('Turma atualizada')
  }

  async function handleRemoveMember(memberUserId) {
    const { error } = await supabase.rpc('remove_class_member', { p_class_id: turma.id, p_user_id: memberUserId })
    if (error) { showToast('Erro ao remover aluno: ' + error.message); return }
    setMembers(prev => prev.filter(m => m.user_id !== memberUserId))
    setRemovingMember(null)
    showToast('Aluno removido da turma')
  }

  const alreadyAdded = new Set(projects.map(p => p.id))
  const addableProjects = myProjects.filter(p => !alreadyAdded.has(p.id))

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: 'inherit' }}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @media (max-width: 480px) { .turmapage-grid { grid-template-columns: 1fr !important; } }
        @media (max-width: 600px) { .turmapage-hd { flex-direction: column !important; align-items: flex-start !important; gap: 12px !important; } }
        @media (max-width: 520px) { .turmapage-modal { padding: 20px 16px !important; } }
        .tp-icon-btn {
          background: transparent; border: 1px solid transparent; color: var(--c-subtle);
          cursor: pointer; padding: 5px; display: inline-flex; align-items: center;
          border-radius: 7px; flex-shrink: 0;
          transition: background 0.18s ease, border-color 0.18s ease, color 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease;
        }
        .tp-icon-btn:hover {
          background: rgba(27,120,247,0.08); border-color: rgba(27,120,247,0.35);
          color: #1b78f7; transform: scale(1.08); box-shadow: 0 2px 10px rgba(27,120,247,0.18);
        }
        .tp-icon-btn:active { transform: scale(0.94); }
      `}</style>
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
        opacity: toast ? 1 : 0, transition: 'opacity 0.3s, transform 0.3s',
        background: 'var(--c-bg-alt)', border: `1px solid ${C.borderBright}`, borderRadius: 10,
        padding: '12px 24px', fontSize: 14, fontWeight: 600, color: C.text,
        zIndex: 3000, pointerEvents: 'none', whiteSpace: 'nowrap',
        boxShadow: 'none',
      }}>{toast}</div>

      {/* Edit turma */}
      {showEditTurma && (
        <EditTurmaModal turma={turma} onClose={() => setShowEditTurma(false)} onSave={handleUpdateTurma} />
      )}

      {/* Remove member confirm */}
      {removingMember && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
          onClick={() => setRemovingMember(null)}>
          <div style={{ background: C.card, border: `1px solid ${C.borderBright}`, borderRadius: 14, padding: '32px 28px', width: '100%', maxWidth: 360, boxShadow: 'none', textAlign: 'center' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ width: 52, height: 52, borderRadius: 12, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
              <UserMinus size={24} color="#ef4444" />
            </div>
            <h3 style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 400, color: C.text, fontFamily: 'var(--font-heading)', letterSpacing: '-0.3px' }}>Remover aluno?</h3>
            <p style={{ margin: '0 0 24px', fontSize: 14, color: C.muted, lineHeight: 1.5 }}>
              <strong style={{ color: C.text }}>{removingMember.full_name}</strong> deixa de aparecer na turma. Os projetos que já submeteu ficam na turma.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setRemovingMember(null)} style={{ flex: 1, background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 8, padding: '11px', color: C.muted, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                Cancelar
              </button>
              <button onClick={() => handleRemoveMember(removingMember.user_id)} style={{ flex: 1, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '11px', color: '#ef4444', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                Remover
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Leave class confirm */}
      {showLeaveConfirm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
          onClick={() => setShowLeaveConfirm(false)}>
          <div style={{ background: C.card, border: `1px solid ${C.borderBright}`, borderRadius: 14, padding: '32px 28px', width: '100%', maxWidth: 360, boxShadow: 'none', textAlign: 'center' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ width: 52, height: 52, borderRadius: 12, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
              <X size={24} color="#ef4444" />
            </div>
            <h3 style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 400, color: C.text, fontFamily: 'var(--font-heading)', letterSpacing: '-0.3px' }}>Sair da turma?</h3>
            <p style={{ margin: '0 0 24px', fontSize: 14, color: C.muted, lineHeight: 1.5 }}>
              Vais sair de <strong style={{ color: C.text }}>{turma?.name}</strong>. Os teus projetos ficam, mas deixas de aparecer na lista de membros.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShowLeaveConfirm(false)} style={{ flex: 1, background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 8, padding: '11px', color: C.muted, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                Cancelar
              </button>
              <button onClick={() => { setShowLeaveConfirm(false); leaveClass() }} disabled={leavingClass} style={{ flex: 1, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '11px', color: '#ef4444', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: leavingClass ? 0.6 : 1 }}>
                {leavingClass ? 'A sair…' : 'Sair'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add project modal */}
      {showAdd && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
          onClick={e => e.target === e.currentTarget && setShowAdd(false)}
        >
          <div style={{ background: C.card, border: `1px solid ${C.borderBright}`, borderRadius: 14, padding: '28px', width: '100%', maxWidth: 400, boxShadow: 'none' }}>
            <h3 style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 400, fontFamily: 'var(--font-heading)', letterSpacing: '-0.3px', color: C.text }}>Adicionar à turma</h3>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: C.muted }}>Seleciona um projeto para adicionar a <strong style={{ color: C.text }}>{turma.name}</strong></p>
            {addableProjects.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px 0', color: C.muted, fontSize: 14 }}>
                {myProjects.length === 0 ? 'Ainda não tens projetos.' : 'Todos os teus projetos já estão nesta turma.'}
                {myProjects.length === 0 && (
                  <div style={{ marginTop: 12 }}>
                    <button onClick={() => setShowCreateModal(true)} style={{ background: C.blue, border: 'none', borderRadius: 8, padding: '9px 20px', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 2px 8px rgba(27,120,247,0.2)' }}>
                      <span style={{display:'flex',alignItems:'center',gap:6}}>Criar projeto <ArrowRight size={14} /></span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {addableProjects.map(p => (
                  <div key={p.id} style={{ background: C.bgAlt, border: `1px solid ${C.border}`, borderRadius: 8, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: C.muted }}>Score: {p.score ?? '—'}</div>
                    </div>
                    <button
                      onClick={() => addProject(p.id)}
                      disabled={adding === p.id}
                      style={{ background: '#1b78f7', border: 'none', borderRadius: 8, padding: '7px 16px', color: '#fff', fontSize: 13, fontWeight: 600, cursor: adding === p.id ? 'default' : 'pointer', fontFamily: 'inherit', opacity: adding === p.id ? 0.6 : 1, flexShrink: 0 }}
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

      <div className="page-content">
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div className="turmapage-hd" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <h1 style={{ margin: 0, fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 400, letterSpacing: '-0.8px', fontFamily: 'var(--font-heading)' }}>{turma.name}</h1>
                  {isTeacher && (
                    <button onClick={() => setShowEditTurma(true)} title="Editar turma"
                      className="tp-icon-btn" style={{ marginTop: 6 }}>
                      <Pencil size={16} />
                    </button>
                  )}
                </div>
                {turma.subject && <p style={{ margin: 0, fontSize: 14, color: C.muted }}>{turma.subject}</p>}
              </div>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 13, color: C.subtle }}>
                {turma.teacher_name && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><User size={13} />{turma.teacher_name}</span>}
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Folder size={13} />{projects.length} projeto{projects.length !== 1 ? 's' : ''}</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              {/* Code badge */}
              <button
                onClick={copyCode}
                style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(27,120,247,0.06)', border: `1px solid rgba(27,120,247,0.2)`, borderRadius: 7, padding: '6px 10px', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                <span style={{ fontSize: 10, color: C.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Código</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: C.blue, letterSpacing: 1.5 }}>{turma.code}</span>
                <span style={{ color: copied ? C.green : C.muted, display: 'flex' }}>{copied ? <Check size={11} /> : <Copy size={11} />}</span>
              </button>
              {/* Copy link */}
              <button
                onClick={copyLink}
                style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(27,120,247,0.06)', border: `1px solid rgba(27,120,247,0.2)`, borderRadius: 7, padding: '6px 10px', cursor: 'pointer', fontFamily: 'inherit', color: copiedLink ? C.green : C.muted, fontSize: 12, fontWeight: 600, transition: 'color 0.15s' }}
              >
                {copiedLink ? <Check size={12} /> : <Copy size={12} />}
                {copiedLink ? 'Copiado!' : 'Copiar link'}
              </button>
              {/* Professor: export CSV */}
              {isTeacher && projects.length > 0 && (
                <button
                  onClick={exportCSV}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 7, padding: '6px 10px', color: '#4ade80', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  <Download size={12} /> CSV
                </button>
              )}
              {/* Leave class (students only) */}
              {!isTeacher && user && (
                <button
                  onClick={() => setShowLeaveConfirm(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 7, padding: '6px 10px', color: '#ef4444', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'background 0.15s, border-color 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.12)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.35)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.06)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.2)' }}
                >
                  <X size={12} /> Sair
                </button>
              )}
              {/* Add project (students only) */}
              {!isTeacher && (user ? (
                <button
                  onClick={() => setShowAdd(true)}
                  style={{ background: '#1b78f7', border: 'none', borderRadius: 7, padding: '7px 14px', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 2px 8px rgba(27,120,247,0.2)' }}
                >
                  + Adicionar projeto
                </button>
              ) : (
                <button
                  onClick={() => navigate('/login')}
                  style={{ background: 'rgba(27,120,247,0.08)', border: `1px solid rgba(27,120,247,0.2)`, borderRadius: 7, padding: '7px 14px', color: C.blue, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  Entrar para adicionar
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Professor — own section, visually set apart from the student roster */}
        {(() => {
          const teacherMember = members.find(m => m.role === 'professor')
          if (!teacherMember) return null
          return (
            <div style={{ marginBottom: 28 }}>
              <div style={{
                background: 'linear-gradient(135deg, rgba(27,120,247,0.1), rgba(79,70,229,0.06))',
                border: '1px solid rgba(27,120,247,0.3)',
                borderRadius: 12, padding: '16px 20px',
                display: 'flex', alignItems: 'center', gap: 14,
              }}>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <Avatar avatarUrl={teacherMember.avatar_url} name={teacherMember.full_name} size={46} />
                  <div style={{
                    position: 'absolute', bottom: -3, right: -3, width: 20, height: 20, borderRadius: '50%',
                    background: '#1b78f7', border: `2px solid ${C.bg}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <GraduationCap size={11} color="#fff" />
                  </div>
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{teacherMember.full_name}</div>
                  <div style={{ fontSize: 12, color: C.blue, fontWeight: 600, marginTop: 2 }}>A gerir esta turma</div>
                </div>
              </div>
            </div>
          )
        })()}

        {/* Members — students only. Always visible (even empty) so the page
            doesn't read as "just a place to dump projects" — the roster is
            the point of a turma. */}
        {(() => {
          const students = members.filter(m => m.role !== 'professor')
          return (
            <div style={{ marginBottom: 32 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                  Alunos
                </span>
                <span style={{ fontSize: 11, fontWeight: 700, color: C.subtle }}>
                  {students.length}
                </span>
              </div>
              {students.length === 0 ? (
                <div style={{ background: C.card, border: `1px dashed ${C.border}`, borderRadius: 10, padding: '24px 20px', textAlign: 'center' }}>
                  <p style={{ margin: 0, fontSize: 13, color: C.muted }}>
                    {isTeacher
                      ? <>Ainda sem alunos. Partilha o código <strong style={{ color: C.blue }}>{turma.code}</strong> para começarem a entrar.</>
                      : 'Ainda não há colegas nesta turma.'}
                  </p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
                  {students.map(m => (
                    <div key={m.user_id} style={{
                      background: C.card, border: `1px solid ${C.border}`,
                      borderRadius: 10, padding: '14px 16px',
                      display: 'flex', alignItems: 'center', gap: 12,
                    }}>
                      <Avatar avatarUrl={m.avatar_url} name={m.full_name} size={38} />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {m.full_name}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                          <span style={{ fontSize: 11, color: C.muted }}>
                            {m.projectCount === 0 ? 'Sem projetos' : `${m.projectCount} projeto${m.projectCount !== 1 ? 's' : ''}`}
                          </span>
                        </div>
                      </div>
                      {isTeacher && (
                        <button
                          onClick={() => setRemovingMember({ user_id: m.user_id, full_name: m.full_name })}
                          title="Remover da turma"
                          className="tp-icon-btn"
                        >
                          <UserMinus size={15} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })()}

        {/* Projects */}
        {sortedProjects.length === 0 ? (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '60px 32px', textAlign: 'center' }}>
            <div style={{ marginBottom: 14 }}><Inbox size={44} color="var(--c-subtle)" /></div>
            <p style={{ color: C.text, fontSize: 17, fontWeight: 700, margin: '0 0 8px' }}>Ainda não há projetos</p>
            {isTeacher ? (
              <p style={{ color: C.muted, fontSize: 14, margin: 0 }}>Partilha o código <strong style={{ color: C.blue }}>{turma.code}</strong> com os teus alunos para que adicionem os seus projetos.</p>
            ) : (
              <>
                <p style={{ color: C.muted, fontSize: 14, margin: '0 0 24px' }}>Sê o primeiro a adicionar o teu projeto a esta turma.</p>
                {user && (
                  <button onClick={() => setShowAdd(true)} style={{ background: '#1b78f7', border: 'none', borderRadius: 8, padding: '10px 22px', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 2px 8px rgba(27,120,247,0.2)' }}>
                    + Adicionar o meu projeto
                  </button>
                )}
              </>
            )}
          </div>
        ) : isTeacher ? (
          /* Professor table view */
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
            {/* Table header */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(160px,1fr) 64px 120px 88px 130px', gap: 0, padding: '10px 16px', borderBottom: `1px solid ${C.border}`, background: 'var(--c-bg)', minWidth: 580 }}>
              {[['name','Projeto'], ['score','Score'], ['completude','Completude'], ['updated','Data'], [null,'Ações']].map(([field, label]) => (
                <div key={label} onClick={() => field && toggleSort(field)} style={{ fontSize: 11, fontWeight: 700, color: field ? (sortBy === field ? C.blue : C.muted) : C.muted, textTransform: 'uppercase', letterSpacing: 0.5, cursor: field ? 'pointer' : 'default', display: 'flex', alignItems: 'center', gap: 4, userSelect: 'none' }}>
                  {label}
                  {field && sortBy === field && (sortAsc ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                </div>
              ))}
            </div>
            {sortedProjects.map((p, i) => {
              const completude = computeCompletude(p)
              const updated = p.created_at ? new Date(p.created_at).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' }) : '—'
              return (
                <div key={p.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(160px,1fr) 64px 120px 88px 130px', gap: 0, padding: '12px 16px', borderBottom: i < sortedProjects.length - 1 ? `1px solid ${C.border}` : 'none', alignItems: 'center', transition: 'background 0.12s', minWidth: 580 }}
                  onMouseEnter={e => e.currentTarget.style.background = C.cardHover}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <div style={{ minWidth: 0, paddingRight: 12 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer' }} onClick={() => navigate(`/projeto/${p.slug}`)}>
                      {p.name}
                    </div>
                    {p.creator_name && <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{p.creator_name}</div>}
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: scoreColor(p.score) }}>{p.score ?? '—'}</div>
                  <div style={{ paddingRight: 8 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: completude >= 80 ? C.green : completude >= 50 ? C.yellow : C.muted, marginBottom: 4 }}>{completude}%</div>
                    <div style={{ height: 4, borderRadius: 2, background: C.border, overflow: 'hidden' }}>
                      <div style={{ width: `${completude}%`, height: '100%', background: completude >= 80 ? C.green : completude >= 50 ? C.yellow : '#f97316', borderRadius: 2 }} />
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: C.muted }}>{updated}</div>
                  <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                    <button onClick={() => navigate(`/projeto/${p.slug}`)} style={{ fontSize: 12, padding: '5px 11px', borderRadius: 6, border: `1px solid ${C.border}`, background: 'transparent', color: C.muted, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>Ver</button>
                    <button onClick={() => setFeedbackProject(p)} title="Feedback" style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid rgba(27,120,247,0.3)', background: 'rgba(27,120,247,0.08)', color: C.blue, cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0 }}><MessageSquare size={12} /></button>
                    <button onClick={() => removeProject(p.id)} title="Remover" style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid rgba(239,68,68,0.3)', background: 'transparent', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0 }}><X size={12} /></button>
                  </div>
                </div>
              )
            })}
            </div>
          </div>
        ) : (
          /* Student grid view */
          <div className="turmapage-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
            {sortedProjects.map(p => (
              <ProjectCard key={p.id} project={p} navigate={navigate} />
            ))}
          </div>
        )}
      </div>
      {showCreateModal && <CreateProjectModal onClose={() => setShowCreateModal(false)} />}
    </div>
  )
}
