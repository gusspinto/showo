import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { MessageSquare, Send, Pencil, Trash2, X, Check } from 'lucide-react'
import { containsProfanity } from '../lib/profanity'

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'agora mesmo'
  if (m < 60) return `há ${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `há ${h}h`
  const d = Math.floor(h / 24)
  if (d < 30) return `há ${d}d`
  return new Date(dateStr).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' })
}

export default function ProjectComments({ projectId, projectAuthorId }) {
  const { user, profile } = useAuth()
  const [comments, setComments]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [draft, setDraft]           = useState('')
  const [sending, setSending]       = useState(false)
  const [editingId, setEditingId]   = useState(null)
  const [editDraft, setEditDraft]   = useState('')
  const [deletingId, setDeletingId] = useState(null)
  const [profiles, setProfiles]     = useState({})
  const textareaRef = useRef(null)

  // Load comments + author profiles
  useEffect(() => {
    if (!projectId) return
    let cancelled = false

    async function load() {
      setLoading(true)
      const { data } = await supabase
        .from('project_comments')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true })
      if (cancelled) return
      const rows = data || []
      setComments(rows)

      // Load profiles for unique user_ids
      const ids = [...new Set(rows.map(c => c.user_id))]
      if (ids.length > 0) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, full_name, username, avatar_url, role')
          .in('id', ids)
        if (!cancelled && profs) {
          const map = {}
          profs.forEach(p => { map[p.id] = p })
          setProfiles(map)
        }
      }
      setLoading(false)
    }
    load()

    // Realtime subscription
    const channel = supabase.channel(`comments-${projectId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'project_comments',
        filter: `project_id=eq.${projectId}`,
      }, async payload => {
        const c = payload.new
        setComments(prev => {
          if (prev.find(x => x.id === c.id)) return prev
          return [...prev, c]
        })
        // Load profile if missing
        if (c.user_id) {
          setProfiles(prev => {
            if (prev[c.user_id]) return prev
            supabase.from('profiles').select('id, full_name, username, avatar_url, role')
              .eq('id', c.user_id).single()
              .then(({ data: p }) => {
                if (p) setProfiles(pp => ({ ...pp, [p.id]: p }))
              })
            return prev
          })
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'project_comments',
        filter: `project_id=eq.${projectId}`,
      }, payload => {
        setComments(prev => prev.map(c => c.id === payload.new.id ? payload.new : c))
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'project_comments',
        filter: `project_id=eq.${projectId}`,
      }, payload => {
        setComments(prev => prev.filter(c => c.id !== payload.old.id))
      })
      .subscribe()

    return () => { cancelled = true; supabase.removeChannel(channel) }
  }, [projectId])

  async function send() {
    const content = draft.trim()
    if (!content || !user) return
    if (containsProfanity(content)) { setDraft(''); return }
    setSending(true)
    setDraft('')
    const { data: newComment } = await supabase
      .from('project_comments')
      .insert({ project_id: projectId, user_id: user.id, content })
      .select()
      .single()
    if (newComment) {
      setComments(prev => prev.find(x => x.id === newComment.id) ? prev : [...prev, newComment])
      // Garante que o perfil do autor está no mapa
      if (profile) setProfiles(prev => prev[user.id] ? prev : { ...prev, [user.id]: profile })
      // Notificação gerada automaticamente pelo trigger notify_on_comment() na DB
    }
    setSending(false)
  }

  async function saveEdit(id) {
    const content = editDraft.trim()
    if (!content) return
    if (containsProfanity(content)) { setEditDraft(''); return }
    const edited_at = new Date().toISOString()
    setComments(prev => prev.map(c => c.id === id ? { ...c, content, edited_at } : c))
    setEditingId(null)
    setEditDraft('')
    await supabase.from('project_comments').update({ content, edited_at }).eq('id', id)
  }

  async function deleteComment(id) {
    setComments(prev => prev.filter(c => c.id !== id))
    setDeletingId(null)
    await supabase.from('project_comments').delete().eq('id', id)
  }

  function canModify(comment) {
    if (!user) return false
    if (comment.user_id === user.id) return true
    // Project author can delete any comment
    if (projectAuthorId === user.id) return true
    return false
  }

  const initials = p => {
    if (!p) return '?'
    const n = p.full_name || p.username || ''
    return n.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?'
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <MessageSquare size={18} color="#1b78f7" />
        <h3 style={{
          margin: 0, fontSize: 16, fontWeight: 700,
          fontFamily: 'var(--font-heading)', color: 'var(--c-text)',
        }}>
          Comentários {comments.length > 0 && (
            <span style={{
              marginLeft: 6, fontSize: 12, fontWeight: 600,
              background: 'rgba(27,120,247,0.1)', color: '#1b78f7',
              borderRadius: 20, padding: '2px 8px',
            }}>{comments.length}</span>
          )}
        </h3>
      </div>

      {/* Comments list */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
          <div style={{ width: 22, height: 22, border: '2px solid var(--c-border)', borderTop: '2px solid #1b78f7', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      ) : comments.length === 0 ? (
        <p style={{ margin: 0, fontSize: 14, color: 'var(--c-muted)', textAlign: 'center', padding: '16px 0' }}>
          Ainda sem comentários. Sê o primeiro!
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {comments.map(c => {
            const p = profiles[c.user_id]
            const isOwn = user?.id === c.user_id
            const isEditing = editingId === c.id
            const isDeleting = deletingId === c.id

            return (
              <div key={c.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                {/* Avatar */}
                <a href={p ? `/u/${p.username}` : '#'} style={{ textDecoration: 'none', flexShrink: 0 }}>
                  {p?.avatar_url ? (
                    <img
                      src={p.avatar_url}
                      alt=""
                      style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', display: 'block' }}
                    />
                  ) : (
                    <div style={{
                      width: 34, height: 34, borderRadius: '50%',
                      background: 'linear-gradient(135deg,#1b78f7,#4f46e5)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 700, color: '#fff',
                    }}>
                      {initials(p)}
                    </div>
                  )}
                </a>

                {/* Bubble */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    background: 'var(--c-bg-alt)', borderRadius: 12,
                    padding: '10px 14px', border: '1px solid var(--c-border)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
                      <a
                        href={p ? `/u/${p.username}` : '#'}
                        style={{ fontSize: 13, fontWeight: 700, color: 'var(--c-text)', textDecoration: 'none' }}
                      >
                        {p?.full_name || p?.username || 'Utilizador'}
                      </a>
                      <span style={{ fontSize: 11, color: 'var(--c-muted)' }}>
                        {timeAgo(c.created_at)}
                        {c.edited_at && ' · editado'}
                      </span>
                      {isOwn && !isEditing && (
                        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                          <button
                            onClick={() => { setEditingId(c.id); setEditDraft(c.content) }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-muted)', display: 'flex', alignItems: 'center', padding: 2 }}
                            title="Editar"
                          >
                            <Pencil size={13} />
                          </button>
                          {isDeleting ? (
                            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                              <button onClick={() => deleteComment(c.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center', padding: 2 }} title="Confirmar">
                                <Check size={13} />
                              </button>
                              <button onClick={() => setDeletingId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-muted)', display: 'flex', alignItems: 'center', padding: 2 }} title="Cancelar">
                                <X size={13} />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeletingId(c.id)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-muted)', display: 'flex', alignItems: 'center', padding: 2 }}
                              title="Eliminar"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      )}
                      {/* Project author can delete others' comments */}
                      {!isOwn && projectAuthorId === user?.id && !isEditing && (
                        <div style={{ marginLeft: 'auto' }}>
                          {isDeleting ? (
                            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                              <button onClick={() => deleteComment(c.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center', padding: 2 }}>
                                <Check size={13} />
                              </button>
                              <button onClick={() => setDeletingId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-muted)', display: 'flex', alignItems: 'center', padding: 2 }}>
                                <X size={13} />
                              </button>
                            </div>
                          ) : (
                            <button onClick={() => setDeletingId(c.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-muted)', display: 'flex', alignItems: 'center', padding: 2 }} title="Remover comentário">
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {isEditing ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <textarea
                          value={editDraft}
                          onChange={e => setEditDraft(e.target.value)}
                          autoFocus
                          rows={3}
                          style={{
                            width: '100%', resize: 'none',
                            background: 'var(--c-bg)', border: '1px solid var(--c-border)',
                            borderRadius: 8, padding: '8px 10px',
                            fontSize: 13, color: 'var(--c-text)', fontFamily: 'inherit',
                            outline: 'none', boxSizing: 'border-box',
                          }}
                        />
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => { setEditingId(null); setEditDraft('') }}
                            style={{
                              background: 'var(--c-bg)', border: '1px solid var(--c-border)',
                              borderRadius: 8, padding: '5px 12px', fontSize: 12,
                              color: 'var(--c-muted)', cursor: 'pointer', fontFamily: 'inherit',
                            }}
                          >Cancelar</button>
                          <button
                            onClick={() => saveEdit(c.id)}
                            style={{
                              background: 'linear-gradient(135deg,#1b78f7,#4f46e5)',
                              border: 'none', borderRadius: 8, padding: '5px 12px',
                              fontSize: 12, color: '#fff', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600,
                            }}
                          >Guardar</button>
                        </div>
                      </div>
                    ) : (
                      <p style={{ margin: 0, fontSize: 14, color: 'var(--c-text)', lineHeight: 1.6, wordBreak: 'break-word' }}>
                        {c.content}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Input */}
      {user ? (
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
          ) : (
            <div style={{
              width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg,#1b78f7,#4f46e5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700, color: '#fff',
            }}>
              {initials(profile)}
            </div>
          )}
          <div style={{ flex: 1, display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
              }}
              placeholder="Escreve um comentário…"
              rows={2}
              maxLength={1000}
              style={{
                flex: 1, resize: 'none',
                background: 'var(--c-bg-alt)', border: '1px solid var(--c-border)',
                borderRadius: 10, padding: '10px 12px',
                fontSize: 13, color: 'var(--c-text)', fontFamily: 'inherit',
                outline: 'none', lineHeight: 1.5,
                transition: 'border-color 0.15s',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = '#1b78f7' }}
              onBlur={e => { e.currentTarget.style.borderColor = 'var(--c-border)' }}
            />
            <button
              onClick={send}
              disabled={!draft.trim() || sending}
              style={{
                flexShrink: 0, width: 38, height: 38,
                background: draft.trim() ? 'linear-gradient(135deg,#1b78f7,#4f46e5)' : 'var(--c-bg-alt)',
                border: '1px solid var(--c-border)',
                borderRadius: 10, cursor: draft.trim() ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s',
              }}
            >
              <Send size={16} color={draft.trim() ? '#fff' : 'var(--c-muted)'} />
            </button>
          </div>
        </div>
      ) : (
        <p style={{ margin: 0, fontSize: 13, color: 'var(--c-muted)', textAlign: 'center' }}>
          <a href="/login" style={{ color: '#1b78f7' }}>Entra</a> para comentar.
        </p>
      )}
    </div>
  )
}
