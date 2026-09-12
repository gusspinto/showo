import { useEffect, useState, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Navbar } from '../components/Navbar'
import { PlaneIcon as Send } from '@solar-icons/react/bold/plane'
import { ArrowLeftIcon as ArrowLeft } from '@solar-icons/react/bold/arrow-left'
import { ChatRoundLineIcon as MessageSquare } from '@solar-icons/react/bold/chat-round-line'
import { MagnifierIcon as Search } from '@solar-icons/react/bold/magnifier'
import { PlusIcon as Plus } from '../components/icons/PlusIcon'
import { CloseIcon as X } from '@solar-icons/react/bold/close'
import { Pen2Icon as Pencil } from '@solar-icons/react/bold/pen-2'
import { TrashBinMinimalisticIcon as Trash2 } from '@solar-icons/react/bold/trash-bin-minimalistic'
import { CheckCircleIcon as Check } from '@solar-icons/react/bold/check-circle'
import { CheckReadIcon as CheckCheck } from '@solar-icons/react/bold/check-read'
import { DangerTriangleIcon as AlertTriangle } from '@solar-icons/react/bold/danger-triangle'
import { CopyIcon as Copy } from '@solar-icons/react/bold/copy'
import { containsProfanity } from '../lib/profanity'
import { looksLikeSpam } from '../lib/score'
import { useIsMobile } from '../lib/useIsMobile'
import './Mensagens.css'

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
  const colors = ['var(--color-primary)','var(--color-accent)','#0d9488','var(--color-warning)','#ec4899','#10b981']
  const bg = colors[(initial.charCodeAt(0) || 0) % colors.length]
  if (profile?.avatar_url) return (
    <img src={profile.avatar_url} alt={name} className="msg-avatar-img" style={{ width: size, height: size }} />
  )
  return (
    <div className="msg-avatar-fallback" style={{ width: size, height: size, background: bg, fontSize: size * 0.38 }}>
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
    <div className="msg-nova-overlay">
      <div className="msg-nova-backdrop" onClick={onClose} />
      <div className="msg-nova-card">
        <div className="msg-nova-header">
          <Search size={15} color="var(--color-text-secondary)" className="flex-shrink-0" />
          <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Procurar utilizador..." className="msg-nova-input" />
          <button onClick={onClose} className="msg-nova-close"><X size={16} /></button>
        </div>
        <div className="msg-nova-results">
          {!q.trim() && <p className="msg-nova-empty">Escreve o nome ou @username</p>}
          {searching && <p className="msg-nova-empty">A procurar...</p>}
          {!searching && q.trim() && results.length === 0 && <p className="msg-nova-empty">Nenhum utilizador encontrado</p>}
          {results.map(p => (
            <button key={p.id} onClick={() => onSelect(p)} className="msg-nova-result-btn">
              <Avatar profile={p} size={38} />
              <div>
                <div className="msg-nova-result-name">{p.full_name || p.username || 'Utilizador'}</div>
                {p.username && <div className="msg-nova-result-user">@{p.username}</div>}
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
  const location = useLocation()
  const returnTo = location.state?.returnTo
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
  const isMobile = useIsMobile()

  useEffect(() => {
    document.body.classList.add('page-mensagens')
    return () => document.body.classList.remove('page-mensagens')
  }, [])

  useEffect(() => {
    if (isMobile && mobileView === 'thread') {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [mobileView, isMobile])

  const [editingId, setEditingId]         = useState(null)
  const [editDraft, setEditDraft]         = useState('')
  const [hoveredMsgId, setHoveredMsgId]   = useState(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [actionMsg, setActionMsg]         = useState(null)
  const [showDeletePopup, setShowDeletePopup] = useState(false)
  const [showEditPopup, setShowEditPopup] = useState(false)
  const longPressTimer = useRef(null)

  const bottomRef   = useRef(null)
  const editInputRef = useRef(null)
  const activeIdRef  = useRef(null)

  useEffect(() => { activeIdRef.current = activeId }, [activeId])
  useEffect(() => { if (editingId) editInputRef.current?.focus() }, [editingId])

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

    const inboxCh = supabase
      .channel(`inbox-${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensagens', filter: `to_id=eq.${user.id}` }, async (payload) => {
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
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'mensagens', filter: `to_id=eq.${user.id}` }, (payload) => {
        const m = payload.new
        setMessages(prev => prev.map(x => x.id === m.id ? { ...x, ...m } : x))
        setConversations(prev => prev.map(c => c.lastMsg?.id === m.id ? { ...c, lastMsg: { ...c.lastMsg, ...m } } : c))
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'mensagens', filter: `to_id=eq.${user.id}` }, (payload) => {
        const id = payload.old?.id
        if (!id) return
        setMessages(prev => prev.filter(x => x.id !== id))
        loadAll()
      })
      .subscribe()

    const sentCh = supabase
      .channel(`sent-${user.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'mensagens', filter: `from_id=eq.${user.id}` }, (payload) => {
        const m = payload.new
        setMessages(prev => prev.map(x => x.id === m.id ? { ...x, ...m } : x))
        setConversations(prev => prev.map(c => c.lastMsg?.id === m.id ? { ...c, lastMsg: { ...c.lastMsg, ...m } } : c))
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
      ensureProfile(toId).then(() => { setActiveId(toId); setMobileView('thread') })
    }
  }, [searchParams, user])

  useEffect(() => { if (activeId) { loadThread(activeId); markRead(activeId) } }, [activeId])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function loadAll() {
    setLoading(true)
    const { data } = await supabase.from('mensagens').select('*').or(`from_id.eq.${user.id},to_id.eq.${user.id}`).order('created_at', { ascending: false })
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
    const { data } = await supabase.from('mensagens').select('*').or(`and(from_id.eq.${user.id},to_id.eq.${otherId}),and(from_id.eq.${otherId},to_id.eq.${user.id})`).order('created_at', { ascending: true })
    setMessages(data ?? [])
  }

  async function markRead(otherId) {
    await supabase.from('mensagens').update({ read_at: new Date().toISOString() }).eq('from_id', otherId).eq('to_id', user.id).is('read_at', null)
    setConversations(prev => prev.map(c => c.otherId === otherId ? { ...c, unread: 0 } : c))
  }

  async function send() {
    if (!draft.trim() || !activeId || sending) return
    const content = draft.trim()
    if (containsProfanity(content)) { setSendError('Linguagem inapropriada detetada.'); return }
    if (looksLikeSpam(content)) { setSendError('Mensagem detetada como spam. Escreve algo mais elaborado.'); return }
    setSendError(''); setSending(true); setDraft('')
    const { data, error } = await supabase.from('mensagens').insert({ from_id: user.id, to_id: activeId, content }).select().single()
    if (error || !data) {
      console.error('send message failed:', error)
      setSendError('Não foi possível enviar. Tenta de novo.')
      setDraft(content) // não perder o que a pessoa escreveu
      setSending(false)
      return
    }
    setMessages(prev => [...prev, data])
    setConversations(prev => {
      const updated = { otherId: activeId, lastMsg: data, unread: 0 }
      return [updated, ...prev.filter(c => c.otherId !== activeId)]
    })
    setSending(false)
  }

  async function saveEdit(msgId) {
    const content = editDraft.trim()
    if (!content) return
    if (containsProfanity(content) || looksLikeSpam(content)) { setSendError('Conteúdo inapropriado ou spam.'); return }
    const { data, error } = await supabase.from('mensagens').update({ content, edited_at: new Date().toISOString() }).eq('id', msgId).eq('from_id', user.id).select().single()
    if (error || !data) {
      console.error('edit message failed:', error)
      setSendError('Não foi possível guardar a alteração.')
      return
    }
    setMessages(prev => prev.map(x => x.id === msgId ? { ...x, ...data } : x))
    setConversations(prev => prev.map(c => c.lastMsg?.id === msgId ? { ...c, lastMsg: { ...c.lastMsg, content: data.content, edited_at: data.edited_at } } : c))
    setEditingId(null); setEditDraft('')
  }

  async function deleteMsg(msgId) {
    await supabase.from('mensagens').delete().eq('id', msgId).eq('from_id', user.id)
    setMessages(prev => prev.filter(x => x.id !== msgId))
    setConfirmDeleteId(null)
    loadAll()
  }

  function startEdit(m) { setEditingId(m.id); setEditDraft(m.content); setConfirmDeleteId(null) }
  function cancelEdit() { setEditingId(null); setEditDraft('') }
  function openActionOverlay(m) { setActionMsg(m); setShowDeletePopup(false); setShowEditPopup(false) }
  function closeActionOverlay() { setActionMsg(null); setShowDeletePopup(false); setShowEditPopup(false) }
  function handleActionCopy() { navigator.clipboard.writeText(actionMsg.content); closeActionOverlay() }
  function handleActionEdit() { setShowEditPopup(true); setEditDraft(actionMsg.content) }
  function handleActionDelete() { setShowDeletePopup(true) }
  async function confirmActionDelete() { if (actionMsg) await deleteMsg(actionMsg.id); closeActionOverlay() }
  async function confirmActionEdit() { if (actionMsg && editDraft.trim()) await saveEdit(actionMsg.id); closeActionOverlay() }

  function handleLongPress(m) {
    if (m.from_id !== user.id) return
    longPressTimer.current = setTimeout(() => openActionOverlay(m), 400)
  }
  function cancelLongPress() { clearTimeout(longPressTimer.current) }

  function openConversation(otherId) { setActiveId(otherId); setMobileView('thread'); ensureProfile(otherId) }

  function selectNewConversation(profile) {
    setProfiles(p => ({ ...p, [profile.id]: profile }))
    setActiveId(profile.id); setMobileView('thread'); setShowNova(false)
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
  const lastSentMsg = [...messages].reverse().find(m => m.from_id === user?.id)

  if (!user) return null

  const isMobileThread = isMobile && mobileView === 'thread' && activeId

  function renderMessages() {
    return (
      <div className="msg-messages">
        {messages.length === 0 && (
          <div className="msg-empty-thread">
            <Avatar profile={activeProfile} size={52} />
            <p className="text-base font-bold" style={{ margin: 0 }}>{activeProfile?.full_name || activeProfile?.username}</p>
            <p className="text-sm text-muted" style={{ margin: 0 }}>Começa a conversa!</p>
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
              className={`msg-bubble-wrap${isMine ? ' mine' : ''}`}
              style={{ marginTop: isMine === prevIsMine ? 2 : 10 }}
              onMouseEnter={() => setHoveredMsgId(m.id)}
              onMouseLeave={() => { setHoveredMsgId(null); if (confirmDeleteId === m.id && !isEditing) setConfirmDeleteId(null) }}
              onTouchStart={() => handleLongPress(m)}
              onTouchEnd={cancelLongPress}
              onTouchMove={cancelLongPress}>
              <div className="msg-bubble-content">
                {isMine && isHovered && !isEditing && (
                  <div className="msg-desktop-actions">
                    {isConfirmingDelete ? (
                      <div className="msg-delete-confirm">
                        <span>Apagar?</span>
                        <button onClick={() => deleteMsg(m.id)} className="msg-delete-yes">Sim</button>
                        <button onClick={() => setConfirmDeleteId(null)} className="msg-delete-no">Não</button>
                      </div>
                    ) : (
                      <>
                        <button onClick={() => startEdit(m)} title="Editar" className="msg-action-inline-btn"><Pencil size={12} /></button>
                        <button onClick={() => setConfirmDeleteId(m.id)} title="Eliminar" className="msg-action-inline-btn delete"><Trash2 size={12} /></button>
                      </>
                    )}
                  </div>
                )}
                {isEditing ? (
                  <div className="msg-desktop-actions flex-col gap-2">
                    <textarea ref={editInputRef} value={editDraft} onChange={e => setEditDraft(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit(m.id) } if (e.key === 'Escape') cancelEdit() }}
                      rows={Math.min(editDraft.split('\n').length + 1, 6)} className="msg-edit-textarea" />
                    <div className="flex gap-2" style={{ justifyContent: 'flex-end' }}>
                      <button onClick={cancelEdit} className="msg-edit-cancel">Cancelar</button>
                      <button onClick={() => saveEdit(m.id)} disabled={!editDraft.trim()} className={`msg-edit-save ${editDraft.trim() ? 'enabled' : 'disabled'}`}>Guardar</button>
                    </div>
                  </div>
                ) : (
                  <div className={`msg-bubble${isMine ? ' mine' : ''}`}>{m.content}</div>
                )}
                {!isEditing && (
                  <div className={`msg-bubble-meta${isMine ? ' mine' : ''}`}>
                    <span className="msg-bubble-time">{timeAgo(m.created_at)}</span>
                    {m.edited_at && <span className="msg-bubble-time">· editado</span>}
                    {isMine && isLastSent && (m.read_at
                      ? <CheckCheck size={12} color="var(--color-primary)" className="flex-shrink-0" />
                      : <Check size={12} color="var(--color-text-tertiary)" className="flex-shrink-0" />
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>
    )
  }

  function renderInput() {
    return (
      <div className="msg-input-area">
        {sendError && (
          <div className="msg-send-error"><AlertTriangle size={11} /> {sendError}</div>
        )}
        <div className="msg-input-row">
          <input
            value={draft}
            onChange={e => { setDraft(e.target.value); if (sendError) setSendError('') }}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            placeholder="Escreve uma mensagem..."
            className={`msg-input${sendError ? ' has-error' : ''}`}
          />
          <button onClick={send} disabled={!draft.trim() || sending}
            className={`msg-send-btn ${draft.trim() ? 'enabled' : 'disabled'}`}>
            <Send size={16} color="#fff" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
    <div className="min-h-screen bg-page">
      <Navbar
        mobileLeft={mobileView === 'thread' ? (
          <button onClick={() => { setMobileView('list'); setActiveId(null) }}
            className="flex items-center gap-1" style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, padding: '6px 4px' }}>
            <ArrowLeft size={18} />
          </button>
        ) : null}
      />
      <div className="page-content" style={{ padding: 0, maxWidth: '100%' }}>
        <div className="msg-inner">

          <div className={`msg-page-header${mobileView === 'thread' ? ' mob-hidden' : ''}`} style={{ marginBottom: 20 }}>
            <h1 className="msg-page-title">
              Mensagens {totalUnread > 0 && <span className="msg-unread-badge">{totalUnread}</span>}
            </h1>
          </div>

          <div className="msg-outer-wrap">

            {/* ── Conversation list ── */}
            <div className={`msg-list${mobileView === 'thread' ? ' mob-hidden' : ''}`}>
              <div className="msg-list-header">
                <div className="msg-search-wrap">
                  <Search size={14} color="var(--color-text-secondary)" className="msg-search-icon" />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Pesquisar..." className="msg-search-input" />
                </div>
                <button onClick={() => setShowNova(true)} title="Nova mensagem" className="msg-compose-btn">
                  <Plus size={16} color="#fff" />
                </button>
              </div>

              <div className="msg-list-body">
                {loading ? (
                  <div className="skel">
                    {[1,2,3].map(i => <div key={i} className="msg-skel-item" style={{ animationDelay: `${i * 0.1}s` }} />)}
                  </div>
                ) : filteredConvs.length === 0 ? (
                  <div className="msg-list-empty">
                    <MessageSquare size={28} color="var(--color-text-secondary)" style={{ marginBottom: 8, opacity: 0.5 }} />
                    <p className="text-sm text-muted" style={{ margin: 0 }}>Sem conversas ainda</p>
                  </div>
                ) : filteredConvs.map(c => {
                  const p = profiles[c.otherId]
                  const isActive = activeId === c.otherId
                  const isMineMsg = c.lastMsg.from_id === user.id
                  return (
                    <button key={c.otherId} onClick={() => openConversation(c.otherId)}
                      className={`msg-conv-item${isActive ? ' active' : ''}`}>
                      <Avatar profile={p} size={38} />
                      <div className="msg-conv-info">
                        <div className="msg-conv-top">
                          <span className={`msg-conv-name${c.unread ? ' unread' : ''}`}>
                            {p?.full_name || p?.username || 'Utilizador'}
                          </span>
                          <span className="msg-conv-time">{timeAgo(c.lastMsg.created_at)}</span>
                        </div>
                        <div className="msg-conv-bottom">
                          <span className={`msg-conv-preview${c.unread ? ' unread' : ''}`}>
                            {isMineMsg && <span className="msg-conv-prefix">Tu: </span>}{c.lastMsg.content}
                          </span>
                          {c.unread > 0 && <span className="msg-conv-unread-dot">{c.unread}</span>}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* ── Thread ── */}
            <div className="msg-thread">
              {!activeId ? (
                <div className="msg-thread-empty">
                  <MessageSquare size={40} color="var(--color-text-secondary)" style={{ opacity: 0.4 }} />
                  <p className="text-base font-semibold text-muted" style={{ margin: 0 }}>Seleciona uma conversa</p>
                  <p className="text-sm text-subtle" style={{ margin: 0 }}>Ou envia uma mensagem a partir de um perfil</p>
                </div>
              ) : (
                <>
                  <div className="msg-thread-hd">
                    <button onClick={() => { setMobileView('list'); setActiveId(null) }} className="msg-back-btn">
                      <ArrowLeft size={16} /> Voltar
                    </button>
                    <Avatar profile={activeProfile} size={32} />
                    <div>
                      <div className="msg-hd-name">{activeProfile?.full_name || activeProfile?.username || 'Utilizador'}</div>
                      {activeProfile?.username && <div className="msg-hd-username">@{activeProfile.username}</div>}
                    </div>
                    <div className="msg-hd-actions">
                      {returnTo && (
                        <button onClick={() => navigate(returnTo.pathname, { state: returnTo.state })} className="msg-hd-return-btn">
                          <ArrowLeft size={13} /> Voltar {returnTo.label ? `a "${returnTo.label}"` : ''}
                        </button>
                      )}
                      {activeProfile?.username && (
                        <button onClick={() => navigate(`/u/${activeProfile.username}`)} className="msg-hd-profile-btn">Ver perfil</button>
                      )}
                    </div>
                  </div>
                  {renderMessages()}
                  {renderInput()}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {showNova && <NovaConversa onSelect={selectNewConversation} onClose={() => setShowNova(false)} />}

      {/* ── Mobile action overlay ── */}
      {actionMsg && (
        <div className="msg-action-overlay" onClick={closeActionOverlay}>
          {!showDeletePopup && !showEditPopup && (
            <div onClick={e => e.stopPropagation()} className="msg-action-menu">
              <div className="msg-action-preview">
                <div className="msg-action-preview-bubble">{actionMsg.content}</div>
              </div>
              {[
                { icon: <Copy size={18} />, label: 'Copiar', color: 'var(--color-text)', action: handleActionCopy },
                { icon: <Pencil size={18} />, label: 'Editar', color: 'var(--color-primary)', action: handleActionEdit },
                { icon: <Trash2 size={18} />, label: 'Eliminar', color: 'var(--color-error)', action: handleActionDelete },
              ].map(a => (
                <button key={a.label} onClick={a.action} className="msg-action-btn" style={{ color: a.color }}>
                  {a.icon} {a.label}
                </button>
              ))}
            </div>
          )}

          {showDeletePopup && (
            <div onClick={e => e.stopPropagation()} className="msg-popup delete">
              <Trash2 size={28} color="var(--color-error)" style={{ marginBottom: 12 }} />
              <p className="msg-popup-title">Eliminar mensagem?</p>
              <p className="msg-popup-desc">Esta ação não pode ser revertida.</p>
              <div className="msg-popup-actions">
                <button onClick={closeActionOverlay} className="msg-popup-cancel">Cancelar</button>
                <button onClick={confirmActionDelete} className="msg-popup-confirm delete">Eliminar</button>
              </div>
            </div>
          )}

          {showEditPopup && (
            <div onClick={e => e.stopPropagation()} className="msg-popup edit">
              <p className="msg-popup-title" style={{ marginBottom: 14 }}>Editar mensagem</p>
              <textarea autoFocus value={editDraft} onChange={e => setEditDraft(e.target.value)}
                rows={Math.min((editDraft || '').split('\n').length + 1, 6)} className="msg-popup-textarea" />
              <div className="msg-popup-actions" style={{ marginTop: 12 }}>
                <button onClick={closeActionOverlay} className="msg-popup-cancel">Cancelar</button>
                <button onClick={confirmActionEdit} disabled={!editDraft?.trim()}
                  className={`msg-popup-confirm ${editDraft?.trim() ? 'save' : 'disabled'}`}>Guardar</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>

    {/* ── Mobile thread portal ── */}
    {isMobileThread && createPortal(
      <div className="msg-mobile-thread">
        <div className="msg-mobile-hd">
          <Avatar profile={activeProfile} size={32} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="msg-mobile-hd-name">{activeProfile?.full_name || activeProfile?.username || 'Utilizador'}</div>
            {activeProfile?.username && <div className="msg-mobile-hd-user">@{activeProfile.username}</div>}
          </div>
        </div>
        {renderMessages()}
        {renderInput()}
      </div>,
      document.body
    )}
    </>
  )
}
