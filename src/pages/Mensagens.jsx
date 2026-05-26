import { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Navbar } from '../components/Navbar'
import { Send, ArrowLeft, MessageSquare, Search, Plus, X, Pencil, Trash2, Check, CheckCheck, AlertTriangle } from 'lucide-react'
import { containsProfanity } from '../lib/profanity'
import { looksLikeSpam } from '../lib/score'

const C = {
  bg:     'var(--c-bg)',
  card:   'var(--c-card)',
  border: 'var(--c-border)',
  blue:   '#1b78f7',
  muted:  'var(--c-muted)',
  text:   'var(--c-text)',
  subtle: 'var(--c-subtle)',
}

function timeAgo(ts) {
  const diff = (Date.now() - new Date(ts)) / 1000
  if (diff < 60)     return 'agora'
  if (diff < 3600)   return `${Math.floor(diff / 60)}m`
  if (diff < 86400)  return `${Math.floor(diff / 3600)}h`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`
  return new Date(ts).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' })
}

function Avatar({ profile, size = 36 }) {
  const name = profile?.full_name || profile?.username || '?'
  const initial = name[0].toUpperCase()
  const colors = ['#1b78f7','#8b5cf6','#0d9488','#f59e0b','#ec4899','#10b981']
  const bg = colors[(initial.charCodeAt(0) || 0) % colors.length]
  if (profile?.avatar_url) return (
    <img src={profile.avatar_url} alt={name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
  )
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.38, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
      {initial}
    </div>
  )
}

function NovaConversa({ onSelect, onClose }) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const debounce = useRef(null)

  useEffect(() => {
    clearTimeout(debounce.current)
    if (!q.trim()) { setResults([]); return }
    setSearching(true)
    debounce.current = setTimeout(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url, role')
        .or(`full_name.ilike.%${q}%,username.ilike.%${q}%`)
        .limit(8)
      setResults(data ?? [])
      setSearching(false)
    }, 300)
    return () => clearTimeout(debounce.current)
  }, [q])

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }} onClick={onClose} />
      <div style={{ position: 'relative', background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, width: '100%', maxWidth: 420, zIndex: 1, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: `1px solid ${C.border}` }}>
          <Search size={15} color={C.muted} style={{ flexShrink: 0 }} />
          <input
            autoFocus
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Procurar utilizador..."
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: C.text, fontSize: 15, fontFamily: 'inherit' }}
          />
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: C.muted, display: 'flex', padding: 2 }}><X size={16} /></button>
        </div>
        <div style={{ maxHeight: 320, overflowY: 'auto' }}>
          {!q.trim() && (
            <p style={{ margin: 0, padding: '24px 16px', textAlign: 'center', fontSize: 13, color: C.muted }}>Escreve o nome ou @username</p>
          )}
          {searching && (
            <p style={{ margin: 0, padding: '20px 16px', textAlign: 'center', fontSize: 13, color: C.muted }}>A procurar...</p>
          )}
          {!searching && q.trim() && results.length === 0 && (
            <p style={{ margin: 0, padding: '20px 16px', textAlign: 'center', fontSize: 13, color: C.muted }}>Nenhum utilizador encontrado</p>
          )}
          {results.map(p => (
            <button key={p.id} onClick={() => onSelect(p)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', transition: 'background 0.12s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--c-bg-alt)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <Avatar profile={p} size={38} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{p.full_name || p.username || 'Utilizador'}</div>
                {p.username && <div style={{ fontSize: 12, color: C.muted }}>@{p.username}</div>}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function Mensagens() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()

  const [profiles, setProfiles]           = useState({})
  const [conversations, setConversations] = useState([])
  const [activeId, setActiveId]           = useState(null)
  const [messages, setMessages]           = useState([])
  const [draft, setDraft]                 = useState('')
  const [sending, setSending]             = useState(false)
  const [sendError, setSendError]         = useState('')
  const [search, setSearch]               = useState('')
  const [loading, setLoading]             = useState(true)
  const [showNova, setShowNova]           = useState(false)
  const [mobileView, setMobileView]       = useState('list')

  // Edit / Delete states
  const [editingId, setEditingId]         = useState(null)
  const [editDraft, setEditDraft]         = useState('')
  const [hoveredMsgId, setHoveredMsgId]   = useState(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  const bottomRef   = useRef(null)
  const editInputRef = useRef(null)
  const activeIdRef  = useRef(null)

  useEffect(() => { activeIdRef.current = activeId }, [activeId])

  // Focus edit input when editing starts
  useEffect(() => {
    if (editingId) editInputRef.current?.focus()
  }, [editingId])

  async function ensureProfile(id) {
    if (!id || profiles[id]) return profiles[id]
    const { data } = await supabase.from('profiles').select('id, full_name, username, avatar_url, role').eq('id', id).single()
    if (data) setProfiles(p => ({ ...p, [data.id]: data }))
    return data
  }

  const buildConversations = useCallback((msgs, myId) => {
    const map = {}
    for (const m of msgs) {
      const otherId = m.from_id === myId ? m.to_id : m.from_id
      if (!map[otherId] || new Date(m.created_at) > new Date(map[otherId].lastMsg.created_at)) {
        map[otherId] = { otherId, lastMsg: m }
      }
      if (!map[otherId].unread) map[otherId].unread = 0
      if (m.to_id === myId && !m.read_at) map[otherId].unread++
    }
    return Object.values(map).sort((a, b) => new Date(b.lastMsg.created_at) - new Date(a.lastMsg.created_at))
  }, [])

  useEffect(() => {
    if (!user) { navigate('/login'); return }
    loadAll()

    // ── Inbox: mensagens recebidas (INSERT + UPDATE + DELETE)
    const inboxCh = supabase
      .channel(`inbox-${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'mensagens',
        filter: `to_id=eq.${user.id}`,
      }, async (payload) => {
        const m = payload.new
        const fromId = m.from_id
        if (!profiles[fromId]) {
          const { data } = await supabase.from('profiles').select('id, full_name, username, avatar_url, role').eq('id', fromId).single()
          if (data) setProfiles(p => ({ ...p, [data.id]: data }))
        }
        if (activeIdRef.current === fromId) {
          setMessages(prev => prev.some(x => x.id === m.id) ? prev : [...prev, m])
          markRead(fromId)
        }
        setConversations(prev => {
          const existing = prev.find(c => c.otherId === fromId)
          const updated = { otherId: fromId, lastMsg: m, unread: activeIdRef.current === fromId ? 0 : (existing?.unread || 0) + 1 }
          return [updated, ...prev.filter(c => c.otherId !== fromId)]
        })
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'mensagens',
        filter: `to_id=eq.${user.id}`,
      }, (payload) => {
        const m = payload.new
        setMessages(prev => prev.map(x => x.id === m.id ? { ...x, ...m } : x))
        setConversations(prev => prev.map(c =>
          c.lastMsg?.id === m.id ? { ...c, lastMsg: { ...c.lastMsg, ...m } } : c
        ))
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'mensagens',
        filter: `to_id=eq.${user.id}`,
      }, (payload) => {
        const id = payload.old?.id
        if (!id) return
        setMessages(prev => prev.filter(x => x.id !== id))
        // Reload conversations to update last message
        loadAll()
      })
      .subscribe()

    // ── Sent: mensagens enviadas por mim (UPDATE — read receipts + edits confirmados)
    const sentCh = supabase
      .channel(`sent-${user.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'mensagens',
        filter: `from_id=eq.${user.id}`,
      }, (payload) => {
        const m = payload.new
        setMessages(prev => prev.map(x => x.id === m.id ? { ...x, ...m } : x))
        setConversations(prev => prev.map(c =>
          c.lastMsg?.id === m.id ? { ...c, lastMsg: { ...c.lastMsg, ...m } } : c
        ))
      })
      .subscribe()

    return () => {
      supabase.removeChannel(inboxCh)
      supabase.removeChannel(sentCh)
    }
  }, [user])

  useEffect(() => {
    const toId = searchParams.get('to')
    if (toId && user && toId !== user.id) {
      ensureProfile(toId).then(() => {
        setActiveId(toId)
        setMobileView('thread')
      })
    }
  }, [searchParams, user])

  useEffect(() => {
    if (activeId) {
      loadThread(activeId)
      markRead(activeId)
    }
  }, [activeId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function loadAll() {
    setLoading(true)
    const { data } = await supabase
      .from('mensagens')
      .select('*')
      .or(`from_id.eq.${user.id},to_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
    const msgs = data ?? []
    const convs = buildConversations(msgs, user.id)
    setConversations(convs)
    const ids = [...new Set(convs.map(c => c.otherId))]
    if (ids.length) {
      const { data: profs } = await supabase.from('profiles').select('id, full_name, username, avatar_url, role').in('id', ids)
      const map = {}
      profs?.forEach(p => { map[p.id] = p })
      setProfiles(p => ({ ...p, ...map }))
    }
    setLoading(false)
  }

  async function loadThread(otherId) {
    const { data } = await supabase
      .from('mensagens')
      .select('*')
      .or(`and(from_id.eq.${user.id},to_id.eq.${otherId}),and(from_id.eq.${otherId},to_id.eq.${user.id})`)
      .order('created_at', { ascending: true })
    setMessages(data ?? [])
  }

  async function markRead(otherId) {
    await supabase
      .from('mensagens')
      .update({ read_at: new Date().toISOString() })
      .eq('from_id', otherId)
      .eq('to_id', user.id)
      .is('read_at', null)
    setConversations(prev => prev.map(c => c.otherId === otherId ? { ...c, unread: 0 } : c))
  }

  async function send() {
    if (!draft.trim() || !activeId || sending) return
    const content = draft.trim()
    if (containsProfanity(content)) { setSendError('Linguagem inapropriada detetada.'); return }
    if (looksLikeSpam(content)) { setSendError('Mensagem detetada como spam. Escreve algo mais elaborado.'); return }
    setSendError('')
    setSending(true)
    setDraft('')
    const { data } = await supabase.from('mensagens').insert({ from_id: user.id, to_id: activeId, content }).select().single()
    if (data) {
      setMessages(prev => [...prev, data])
      setConversations(prev => {
        const updated = { otherId: activeId, lastMsg: data, unread: 0 }
        return [updated, ...prev.filter(c => c.otherId !== activeId)]
      })
    }
    setSending(false)
  }

  async function saveEdit(msgId) {
    const content = editDraft.trim()
    if (!content) return
    if (containsProfanity(content) || looksLikeSpam(content)) { setSendError('Conteúdo inapropriado ou spam.'); return }
    const { data } = await supabase
      .from('mensagens')
      .update({ content, edited_at: new Date().toISOString() })
      .eq('id', msgId)
      .eq('from_id', user.id)
      .select()
      .single()
    if (data) {
      setMessages(prev => prev.map(x => x.id === msgId ? { ...x, ...data } : x))
      setConversations(prev => prev.map(c =>
        c.lastMsg?.id === msgId ? { ...c, lastMsg: { ...c.lastMsg, content: data.content, edited_at: data.edited_at } } : c
      ))
    }
    setEditingId(null)
    setEditDraft('')
  }

  async function deleteMsg(msgId) {
    await supabase.from('mensagens').delete().eq('id', msgId).eq('from_id', user.id)
    setMessages(prev => prev.filter(x => x.id !== msgId))
    setConfirmDeleteId(null)
    // Reload conversations to fix last message
    loadAll()
  }

  function startEdit(m) {
    setEditingId(m.id)
    setEditDraft(m.content)
    setConfirmDeleteId(null)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditDraft('')
  }

  function openConversation(otherId) {
    setActiveId(otherId)
    setMobileView('thread')
    ensureProfile(otherId)
  }

  function selectNewConversation(profile) {
    setProfiles(p => ({ ...p, [profile.id]: profile }))
    setActiveId(profile.id)
    setMobileView('thread')
    setShowNova(false)
    loadThread(profile.id)
  }

  const filteredConvs = conversations.filter(c => {
    const p = profiles[c.otherId]
    if (!search) return true
    return (p?.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
           (p?.username || '').toLowerCase().includes(search.toLowerCase())
  })

  const activeProfile = profiles[activeId]
  const totalUnread = conversations.reduce((s, c) => s + (c.unread || 0), 0)

  // Last message sent by me in this conversation (for read receipt)
  const lastSentMsg = [...messages].reverse().find(m => m.from_id === user?.id)

  if (!user) return null

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: 'inherit' }}>
      <Navbar />
      <div className="page-content" style={{ padding: 0, maxWidth: '100%' }}>
        <div style={{ maxWidth: 920, margin: '0 auto', padding: '0 clamp(8px,3vw,24px)', paddingTop: 28 }}>

          <div style={{ marginBottom: 20 }}>
            <h1 style={{ color: C.text, fontSize: 'clamp(22px,4vw,32px)', fontWeight: 900, margin: '0 0 4px', letterSpacing: '-0.4px' }}>
              Mensagens {totalUnread > 0 && <span style={{ fontSize: 15, fontWeight: 700, background: C.blue, color: '#fff', borderRadius: 99, padding: '2px 9px', verticalAlign: 'middle', marginLeft: 6 }}>{totalUnread}</span>}
            </h1>
            <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>Conversas com recrutadores e candidatos</p>
          </div>

          <div style={{ display: 'flex', gap: 12, height: 'calc(100vh - 200px)', minHeight: 400 }}>

            {/* ── Conversation list ── */}
            <div style={{
              width: 280, flexShrink: 0,
              background: C.card, border: `1px solid ${C.border}`,
              borderRadius: 14, display: 'flex', flexDirection: 'column', overflow: 'hidden',
              ...(mobileView === 'thread' ? { display: 'none' } : {}),
            }} className="msg-list">
              <div style={{ padding: '12px 12px 8px', borderBottom: `1px solid ${C.border}`, display: 'flex', gap: 6 }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <Search size={14} color={C.muted} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Pesquisar..."
                    style={{ width: '100%', background: 'var(--c-bg)', border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 13, padding: '8px 10px 8px 30px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                </div>
                <button onClick={() => setShowNova(true)} title="Nova mensagem"
                  style={{ flexShrink: 0, width: 34, height: 34, borderRadius: 8, background: C.blue, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(27,120,247,0.3)' }}>
                  <Plus size={16} color="#fff" />
                </button>
              </div>

              <div style={{ flex: 1, overflowY: 'auto' }}>
                {loading ? (
                  [1,2,3].map(i => <div key={i} style={{ margin: 8, height: 60, background: 'var(--c-bg-alt)', borderRadius: 10, opacity: 0.5 }} />)
                ) : filteredConvs.length === 0 ? (
                  <div style={{ padding: '40px 16px', textAlign: 'center' }}>
                    <MessageSquare size={28} color={C.muted} style={{ marginBottom: 8, opacity: 0.5 }} />
                    <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>Sem conversas ainda</p>
                  </div>
                ) : filteredConvs.map(c => {
                  const p = profiles[c.otherId]
                  const isActive = activeId === c.otherId
                  const isMine = c.lastMsg.from_id === user.id
                  return (
                    <button key={c.otherId} onClick={() => openConversation(c.otherId)}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: isActive ? 'rgba(27,120,247,0.08)' : 'transparent', border: 'none', borderLeft: isActive ? `3px solid ${C.blue}` : '3px solid transparent', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', transition: 'background 0.12s' }}
                      onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--c-bg-alt)' }}
                      onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}>
                      <Avatar profile={p} size={38} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                          <span style={{ fontSize: 13, fontWeight: c.unread ? 700 : 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {p?.full_name || p?.username || 'Utilizador'}
                          </span>
                          <span style={{ fontSize: 10, color: C.subtle, flexShrink: 0, marginLeft: 6 }}>{timeAgo(c.lastMsg.created_at)}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                          <span style={{ fontSize: 12, color: c.unread ? C.text : C.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: c.unread ? 600 : 400 }}>
                            {isMine && <span style={{ color: C.subtle }}>Tu: </span>}{c.lastMsg.content}
                          </span>
                          {c.unread > 0 && (
                            <span style={{ flexShrink: 0, background: C.blue, color: '#fff', borderRadius: 99, minWidth: 18, height: 18, fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>{c.unread}</span>
                          )}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* ── Thread ── */}
            <div style={{ flex: 1, background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, display: 'flex', flexDirection: 'column', overflow: 'hidden', ...(mobileView === 'list' && !activeId ? { display: 'none' } : {}) }} className="msg-thread">

              {!activeId ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32, textAlign: 'center' }}>
                  <MessageSquare size={40} color={C.muted} style={{ opacity: 0.4 }} />
                  <p style={{ color: C.muted, fontSize: 15, fontWeight: 600, margin: 0 }}>Seleciona uma conversa</p>
                  <p style={{ color: C.subtle, fontSize: 13, margin: 0 }}>Ou envia uma mensagem a partir de um perfil</p>
                </div>
              ) : (
                <>
                  {/* Thread header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
                    <button onClick={() => { setMobileView('list'); setActiveId(null) }} className="msg-back"
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: C.muted, display: 'flex', alignItems: 'center', padding: 4, borderRadius: 6 }}>
                      <ArrowLeft size={16} />
                    </button>
                    <Avatar profile={activeProfile} size={32} />
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>
                        {activeProfile?.full_name || activeProfile?.username || 'Utilizador'}
                      </div>
                      {activeProfile?.username && <div style={{ fontSize: 11, color: C.muted }}>@{activeProfile.username}</div>}
                    </div>
                    {activeProfile?.username && (
                      <button onClick={() => navigate(`/u/${activeProfile.username}`)}
                        style={{ marginLeft: 'auto', background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 7, padding: '5px 10px', color: C.muted, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                        Ver perfil
                      </button>
                    )}
                  </div>

                  {/* Messages */}
                  <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 8px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {messages.length === 0 && (
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, textAlign: 'center', padding: 32 }}>
                        <Avatar profile={activeProfile} size={52} />
                        <p style={{ color: C.text, fontSize: 14, fontWeight: 700, margin: 0 }}>{activeProfile?.full_name || activeProfile?.username}</p>
                        <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>Começa a conversa!</p>
                      </div>
                    )}

                    {messages.map((m, i) => {
                      const isMine = m.from_id === user.id
                      const prevIsMine = i > 0 && messages[i-1].from_id === user.id
                      const isLastSent = isMine && m.id === lastSentMsg?.id
                      const isHovered = hoveredMsgId === m.id
                      const isConfirmingDelete = confirmDeleteId === m.id
                      const isEditing = editingId === m.id

                      return (
                        <div key={m.id}
                          style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start', marginTop: isMine === prevIsMine ? 2 : 10, position: 'relative' }}
                          onMouseEnter={() => { setHoveredMsgId(m.id) }}
                          onMouseLeave={() => { setHoveredMsgId(null); if (confirmDeleteId === m.id && !isEditing) setConfirmDeleteId(null) }}>

                          <div style={{ maxWidth: '72%' }}>

                            {/* Action buttons for own messages */}
                            {isMine && isHovered && !isEditing && (
                              <div style={{
                                display: 'flex', alignItems: 'center', gap: 4,
                                justifyContent: 'flex-end', marginBottom: 4,
                              }}>
                                {isConfirmingDelete ? (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--c-bg)', border: `1px solid ${C.border}`, borderRadius: 8, padding: '3px 8px', fontSize: 12, color: C.muted }}>
                                    <span>Apagar?</span>
                                    <button onClick={() => deleteMsg(m.id)}
                                      style={{ background: '#ef4444', border: 'none', borderRadius: 5, color: '#fff', fontSize: 11, fontWeight: 700, padding: '2px 7px', cursor: 'pointer', fontFamily: 'inherit' }}>
                                      Sim
                                    </button>
                                    <button onClick={() => setConfirmDeleteId(null)}
                                      style={{ background: 'transparent', border: 'none', color: C.muted, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', padding: '2px 4px' }}>
                                      Não
                                    </button>
                                  </div>
                                ) : (
                                  <>
                                    <button onClick={() => startEdit(m)} title="Editar"
                                      style={{ background: 'var(--c-bg)', border: `1px solid ${C.border}`, borderRadius: 7, padding: '4px 7px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: C.muted, transition: 'color 0.1s' }}
                                      onMouseEnter={e => e.currentTarget.style.color = C.text}
                                      onMouseLeave={e => e.currentTarget.style.color = C.muted}>
                                      <Pencil size={12} />
                                    </button>
                                    <button onClick={() => setConfirmDeleteId(m.id)} title="Eliminar"
                                      style={{ background: 'var(--c-bg)', border: `1px solid ${C.border}`, borderRadius: 7, padding: '4px 7px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: C.muted, transition: 'color 0.1s' }}
                                      onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                                      onMouseLeave={e => e.currentTarget.style.color = C.muted}>
                                      <Trash2 size={12} />
                                    </button>
                                  </>
                                )}
                              </div>
                            )}

                            {/* Message bubble or edit input */}
                            {isEditing ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <textarea
                                  ref={editInputRef}
                                  value={editDraft}
                                  onChange={e => setEditDraft(e.target.value)}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit(m.id) }
                                    if (e.key === 'Escape') cancelEdit()
                                  }}
                                  rows={Math.min(editDraft.split('\n').length + 1, 6)}
                                  style={{
                                    background: 'var(--c-bg)', border: `1.5px solid ${C.blue}`,
                                    borderRadius: 10, color: C.text, fontSize: 14,
                                    padding: '9px 13px', outline: 'none', fontFamily: 'inherit',
                                    resize: 'none', minWidth: 180,
                                  }}
                                />
                                <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                                  <button onClick={cancelEdit}
                                    style={{ background: 'var(--c-bg)', border: `1px solid ${C.border}`, borderRadius: 7, padding: '5px 12px', color: C.muted, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                                    Cancelar
                                  </button>
                                  <button onClick={() => saveEdit(m.id)} disabled={!editDraft.trim()}
                                    style={{ background: editDraft.trim() ? C.blue : 'var(--c-border)', border: 'none', borderRadius: 7, padding: '5px 12px', color: '#fff', fontSize: 12, fontWeight: 700, cursor: editDraft.trim() ? 'pointer' : 'default', fontFamily: 'inherit' }}>
                                    Guardar
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div style={{
                                background: isMine ? C.blue : 'var(--c-bg-alt)',
                                color: isMine ? '#fff' : C.text,
                                borderRadius: isMine ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                                padding: '9px 13px',
                                fontSize: 14,
                                lineHeight: 1.5,
                                wordBreak: 'break-word',
                              }}>
                                {m.content}
                              </div>
                            )}

                            {/* Timestamp + edited + read receipt */}
                            {!isEditing && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: isMine ? 'flex-end' : 'flex-start', marginTop: 3, paddingInline: 4 }}>
                                <span style={{ fontSize: 10, color: C.subtle }}>{timeAgo(m.created_at)}</span>
                                {m.edited_at && <span style={{ fontSize: 10, color: C.subtle }}>· editado</span>}
                                {isMine && isLastSent && (
                                  m.read_at
                                    ? <CheckCheck size={12} color={C.blue} style={{ flexShrink: 0 }} />
                                    : <Check size={12} color={C.subtle} style={{ flexShrink: 0 }} />
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                    <div ref={bottomRef} />
                  </div>

                  {/* Input */}
                  <div style={{ padding: '8px 12px 12px', borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
                    {sendError && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#ef4444', fontSize: 11, fontWeight: 600, marginBottom: 6, padding: '5px 10px', background: 'rgba(239,68,68,0.08)', borderRadius: 7, border: '1px solid rgba(239,68,68,0.2)' }}>
                        <AlertTriangle size={11} /> {sendError}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      value={draft}
                      onChange={e => { setDraft(e.target.value); if (sendError) setSendError('') }}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                      placeholder="Escreve uma mensagem..."
                      style={{ flex: 1, background: 'var(--c-bg)', border: `1.5px solid ${sendError ? '#ef4444' : C.border}`, borderRadius: 10, color: C.text, fontSize: 14, padding: '10px 14px', outline: 'none', fontFamily: 'inherit', transition: 'border-color 0.15s' }}
                    />
                    <button onClick={send} disabled={!draft.trim() || sending}
                      style={{ background: draft.trim() ? C.blue : 'var(--c-border)', border: 'none', borderRadius: 10, width: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: draft.trim() ? 'pointer' : 'default', transition: 'background 0.15s', flexShrink: 0 }}>
                      <Send size={16} color="#fff" />
                    </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {showNova && <NovaConversa onSelect={selectNewConversation} onClose={() => setShowNova(false)} />}

      <style>{`
        @media (max-width: 640px) {
          .msg-list   { display: flex !important; width: 100% !important; }
          .msg-thread { display: none !important; }
          .msg-thread.active { display: flex !important; }
          .msg-back   { display: flex !important; }
        }
        @media (min-width: 641px) {
          .msg-list   { display: flex !important; }
          .msg-thread { display: flex !important; }
          .msg-back   { display: none !important; }
        }
      `}</style>
    </div>
  )
}
