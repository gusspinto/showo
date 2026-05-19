import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { Check, X, FolderOpen, User, Settings as SettingsIcon, Shield, Globe, Trophy, LogOut, Bell } from 'lucide-react'

const C = {
  bg: 'rgba(13, 20, 36, 0.88)',
  border: '#1e3050',
  blue: '#1b78f7',
  muted: '#7d93b0',
  text: '#e8f2ff',
}

const btnStyle = {
  background: 'transparent',
  border: 'none',
  color: C.muted,
  fontSize: 14,
  fontWeight: 500,
  cursor: 'pointer',
  padding: '8px 14px',
  borderRadius: 8,
  whiteSpace: 'nowrap',
  transition: 'color 0.15s, background 0.15s',
  fontFamily: 'inherit',
}

function getInitial(user) {
  const name = user?.user_metadata?.full_name
  if (name) return name.trim()[0].toUpperCase()
  return user?.email?.[0].toUpperCase() ?? '?'
}

function getDisplayName(user) {
  const name = user?.user_metadata?.full_name
  if (name) return name.split(' ')[0]   // first name only
  return user?.email?.split('@')[0] ?? ''
}

// Notification type → icon emoji
const NOTIF_ICON = {
  PROJECT_VIEW:    '👁',
  COMPANY_VIEW:    '👀',
  SCORE_MILESTONE: '🎯',
  RANKING_CHANGE:  '🚀',
  MISSION_COMPLETE:'🏆',
  TEACHER_FEEDBACK:'👨‍🏫',
  STUDENT_JOINED:  '🎓',
}

function timeAgo(ts) {
  const diff = (Date.now() - new Date(ts).getTime()) / 1000
  if (diff < 60)    return 'agora mesmo'
  if (diff < 3600)  return `há ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `há ${Math.floor(diff / 3600)}h`
  if (diff < 604800) return `há ${Math.floor(diff / 86400)} dias`
  return new Date(ts).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' })
}

function InviteInbox({ userId }) {
  const navigate = useNavigate()
  const [open, setOpen]     = useState(false)
  const [invites, setInvites] = useState([])
  const [acting, setActing] = useState({})
  const [dbNotifs, setDbNotifs] = useState([])

  // Owner response notifications — persisted in sessionStorage
  const [responses, setResponses] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem(`owner-notifs-${userId}`) || '[]') } catch { return [] }
  })

  function addResponse(notif) {
    setResponses(prev => {
      // avoid duplicate if same id+status
      if (prev.some(n => n.id === notif.id)) return prev
      const updated = [notif, ...prev].slice(0, 15)
      try { sessionStorage.setItem(`owner-notifs-${userId}`, JSON.stringify(updated)) } catch {}
      return updated
    })
  }

  function dismissResponse(id) {
    setResponses(prev => {
      const updated = prev.filter(n => n.id !== id)
      try { sessionStorage.setItem(`owner-notifs-${userId}`, JSON.stringify(updated)) } catch {}
      return updated
    })
  }

  async function loadDbNotifs() {
    const { data } = await supabase
      .from('notifications')
      .select('id, type, message, project_slug, read, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20)
    if (data) setDbNotifs(data)
  }

  async function markAllRead() {
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false)
    setDbNotifs(prev => prev.map(n => ({ ...n, read: true })))
  }

  async function markRead(id) {
    await supabase.from('notifications').update({ read: true }).eq('id', id)
    setDbNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }

  useEffect(() => {
    if (!userId) return
    loadInvites()
    loadDbNotifs()

    // Channel 1 — invites TO me (pending)
    const inviteChannel = supabase
      .channel(`invites-${userId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'project_collaborators',
        filter: `user_id=eq.${userId}`,
      }, () => loadInvites())
      .subscribe()

    // Channel 2 — responses to MY invites (invited_by = me)
    const ownerChannel = supabase
      .channel(`owner-responses-${userId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'project_collaborators',
        filter: `invited_by=eq.${userId}`,
      }, async (payload) => {
        const row = payload.new
        if (row.status !== 'accepted' && row.status !== 'declined') return
        const [profRes, projRes] = await Promise.all([
          supabase.from('profiles').select('full_name, username').eq('id', row.user_id).single(),
          supabase.from('projects').select('name, slug').eq('id', row.project_id).single(),
        ])
        addResponse({
          id: `${row.id}-${row.status}`,
          status: row.status,
          userName: profRes.data?.full_name || profRes.data?.username || 'Alguém',
          projectName: projRes.data?.name || 'um projeto',
          projectSlug: projRes.data?.slug || '',
          time: Date.now(),
        })
      })
      .subscribe()

    // Channel 3 — real-time DB notifications
    const notifChannel = supabase
      .channel(`notifs-${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, () => loadDbNotifs())
      .subscribe()

    return () => {
      supabase.removeChannel(inviteChannel)
      supabase.removeChannel(ownerChannel)
      supabase.removeChannel(notifChannel)
    }
  }, [userId])

  async function loadInvites() {
    // Step 1: get raw invite rows (no joins — avoids PostgREST ambiguity)
    const { data: rows, error } = await supabase
      .from('project_collaborators')
      .select('id, project_id, invited_by, sections')
      .eq('user_id', userId)
      .eq('status', 'pending')

    if (error || !rows?.length) { setInvites([]); return }

    // Step 2: fetch project names
    const projectIds = [...new Set(rows.map(r => r.project_id))]
    const { data: projects } = await supabase
      .from('projects')
      .select('id, name, slug')
      .in('id', projectIds)

    // Step 3: fetch inviter usernames
    const inviterIds = [...new Set(rows.map(r => r.invited_by).filter(Boolean))]
    let inviters = []
    if (inviterIds.length) {
      const { data } = await supabase
        .from('profiles')
        .select('id, username, full_name')
        .in('id', inviterIds)
      inviters = data ?? []
    }

    const enriched = rows.map(r => ({
      ...r,
      projectName: projects?.find(p => p.id === r.project_id)?.name ?? 'Projeto',
      projectSlug: projects?.find(p => p.id === r.project_id)?.slug ?? '',
      inviterName: inviters.find(p => p.id === r.invited_by)?.full_name
        || inviters.find(p => p.id === r.invited_by)?.username
        || null,
    }))
    setInvites(enriched)
  }

  async function respond(invite, newStatus) {
    setActing(a => ({ ...a, [invite.id]: newStatus }))
    const { error } = await supabase
      .from('project_collaborators')
      .update({ status: newStatus })
      .eq('id', invite.id)
      .eq('user_id', userId)   // safety: only update own rows

    if (error) {
      console.error('Invite respond error:', error)
      setActing(a => { const n = { ...a }; delete n[invite.id]; return n })
      return
    }

    setInvites(prev => prev.filter(i => i.id !== invite.id))
    setActing(a => { const n = { ...a }; delete n[invite.id]; return n })
    if (newStatus === 'accepted' && invite.projectSlug) {
      setOpen(false)
      navigate(`/projeto/${invite.projectSlug}`)
    }
  }

  const unreadDbCount = dbNotifs.filter(n => !n.read).length
  const count = invites.length + responses.length + unreadDbCount

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position: 'relative',
          background: open ? 'rgba(59,130,246,0.1)' : 'transparent',
          border: `1px solid ${open ? 'rgba(59,130,246,0.35)' : C.border}`,
          borderRadius: 8, width: 36, height: 36,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: open ? '#60a5fa' : C.muted,
          transition: 'all 0.15s',
        }}
        title="Notificações"
      >
        <Bell size={16} />
        {count > 0 && (
          <span style={{
            position: 'absolute', top: -4, right: -4,
            background: '#ef4444', borderRadius: '50%',
            width: 16, height: 16, fontSize: 9, fontWeight: 800,
            color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid rgba(13,20,36,0.9)',
          }}>
            {count}
          </span>
        )}
      </button>

      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 98 }} onClick={() => setOpen(false)} />
          <div style={{
            position: 'absolute', top: 'calc(100% + 8px)', right: 0,
            background: 'rgba(13,20,36,0.98)', border: `1px solid ${C.border}`,
            borderRadius: 14, padding: '8px',
            boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
            backdropFilter: 'blur(16px)',
            zIndex: 99, width: 310,
            maxHeight: 480, overflowY: 'auto',
          }}>

            {/* Pending invites TO me */}
            {invites.length > 0 && (
              <>
                <p style={{ margin: '6px 10px 8px', fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 1 }}>
                  Convites de grupo
                </p>
                {invites.map(invite => {
                  const invitedBy = invite.inviterName || 'um colega'
                  const isActing = !!acting[invite.id]
                  return (
                    <div key={invite.id} style={{
                      background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.15)',
                      borderRadius: 10, padding: '12px 14px', marginBottom: 6,
                    }}>
                      <p style={{ margin: '0 0 2px', fontSize: 14, fontWeight: 700, color: C.text }}>{invite.projectName}</p>
                      <p style={{ margin: '0 0 12px', fontSize: 12, color: C.muted }}>Convidado por {invitedBy}</p>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          onClick={() => respond(invite, 'accepted')} disabled={isActing}
                          style={{ flex: 1, padding: '7px 0', background: 'linear-gradient(135deg,#1b78f7,#4f46e5)', border: 'none', borderRadius: 7, color: '#fff', fontSize: 12, fontWeight: 700, cursor: isActing ? 'default' : 'pointer', fontFamily: 'inherit' }}
                        >{acting[invite.id] === 'accepted' ? '...' : <><Check size={12} style={{ verticalAlign: 'middle', marginRight: 3 }} />Aceitar</>}</button>
                        <button
                          onClick={() => respond(invite, 'declined')} disabled={isActing}
                          style={{ flex: 1, padding: '7px 0', background: 'transparent', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 7, color: '#f87171', fontSize: 12, fontWeight: 600, cursor: isActing ? 'default' : 'pointer', fontFamily: 'inherit' }}
                        >{acting[invite.id] === 'declined' ? '...' : 'Recusar'}</button>
                      </div>
                    </div>
                  )
                })}
              </>
            )}

            {/* Response notifications (someone accepted/declined MY invite) */}
            {responses.length > 0 && (
              <>
                <p style={{ margin: `${invites.length > 0 ? '12px' : '6px'} 10px 8px`, fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 1 }}>
                  Respostas aos teus convites
                </p>
                {responses.map(r => (
                  <div key={r.id} style={{
                    background: r.status === 'accepted' ? 'rgba(34,197,94,0.05)' : 'rgba(248,113,113,0.05)',
                    border: `1px solid ${r.status === 'accepted' ? 'rgba(34,197,94,0.2)' : 'rgba(248,113,113,0.2)'}`,
                    borderRadius: 10, padding: '10px 14px', marginBottom: 6,
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                  }}>
                    <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1, display: 'flex', alignItems: 'center' }}>
                      {r.status === 'accepted'
                        ? <Check size={16} color="#22c55e" />
                        : <X size={16} color="#f87171" />}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 700, color: C.text }}>
                        {r.userName} {r.status === 'accepted' ? 'aceitou' : 'recusou'}
                      </p>
                      <p style={{ margin: 0, fontSize: 12, color: C.muted }}>
                        {r.projectName}
                        {r.status === 'accepted' && r.projectSlug && (
                          <span
                            onClick={() => { navigate(`/projeto/${r.projectSlug}`); setOpen(false) }}
                            style={{ marginLeft: 8, color: '#60a5fa', cursor: 'pointer', textDecoration: 'underline' }}
                          >Ver projeto</span>
                        )}
                      </p>
                    </div>
                    <button
                      onClick={() => dismissResponse(r.id)}
                      style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 14, padding: 0, flexShrink: 0, lineHeight: 1, marginTop: 2, display: 'flex', alignItems: 'center' }}
                    ><X size={14} /></button>
                  </div>
                ))}
              </>
            )}

            {/* DB notifications */}
            {dbNotifs.length > 0 && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: `${(invites.length + responses.length) > 0 ? '12px' : '6px'} 10px 8px` }}>
                  <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 1 }}>
                    Notificações
                  </p>
                  {unreadDbCount > 0 && (
                    <button
                      onClick={markAllRead}
                      style={{ background: 'none', border: 'none', color: '#60a5fa', fontSize: 11, fontWeight: 600, cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}
                    >
                      Marcar todas como lidas
                    </button>
                  )}
                </div>
                {dbNotifs.map(n => (
                  <div
                    key={n.id}
                    onClick={() => {
                      markRead(n.id)
                      if (n.project_slug) { navigate(`/projeto/${n.project_slug}`); setOpen(false) }
                    }}
                    style={{
                      borderRadius: 10, padding: '10px 12px', marginBottom: 4,
                      background: n.read ? 'transparent' : 'rgba(27,120,247,0.05)',
                      border: `1px solid ${n.read ? 'transparent' : 'rgba(27,120,247,0.12)'}`,
                      borderLeft: n.read ? '3px solid transparent' : '3px solid rgba(27,120,247,0.5)',
                      cursor: n.project_slug ? 'pointer' : 'default',
                      display: 'flex', alignItems: 'flex-start', gap: 10,
                      transition: 'background 0.12s',
                    }}
                  >
                    <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{NOTIF_ICON[n.type] ?? '🔔'}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: '0 0 3px', fontSize: 13, color: n.read ? C.muted : C.text, lineHeight: 1.45, fontWeight: n.read ? 400 : 500 }}>
                        {n.message}
                      </p>
                      <span style={{ fontSize: 11, color: C.muted }}>{timeAgo(n.created_at)}</span>
                    </div>
                    {!n.read && <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.blue, flexShrink: 0, marginTop: 5 }} />}
                  </div>
                ))}
              </>
            )}

            {/* Empty state */}
            {invites.length === 0 && responses.length === 0 && dbNotifs.length === 0 && (
              <div style={{ padding: '24px 12px', textAlign: 'center' }}>
                <p style={{ margin: '0 0 6px', fontSize: 20 }}>🔔</p>
                <p style={{ margin: 0, color: C.muted, fontSize: 13 }}>Sem notificações por agora</p>
                <p style={{ margin: '4px 0 0', color: C.muted, fontSize: 11, opacity: 0.7 }}>Quando alguém vir o teu projeto, aparece aqui.</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function AvatarCircle({ avatarUrl, initial, size = 28, fontSize = 13 }) {
  return avatarUrl ? (
    <img
      src={avatarUrl}
      alt=""
      style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, display: 'block' }}
    />
  ) : (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'linear-gradient(135deg, #3b82f6, #4f46e5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize, fontWeight: 700, color: '#fff', flexShrink: 0,
      userSelect: 'none',
    }}>
      {initial}
    </div>
  )
}

function UserChip({ user, profile, onClick, onProfile, onSettings, onSignOut, onCreateProject }) {
  const [open, setOpen] = useState(false)
  const initial = getInitial(user)
  const name = getDisplayName(user)

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: open ? 'rgba(255,255,255,0.08)' : 'transparent',
          border: `1px solid ${open ? '#2a4070' : C.border}`,
          borderRadius: 24, padding: '5px 12px 5px 6px',
          cursor: 'pointer', fontFamily: 'inherit',
          transition: 'background 0.15s, border-color 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = '#2a4070' }}
        onMouseLeave={e => { if (!open) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = C.border } }}
      >
        <AvatarCircle avatarUrl={profile?.avatar_url} initial={initial} size={28} fontSize={13} />
        <span style={{ color: C.text, fontSize: 14, fontWeight: 500 }}>{name}</span>
        {/* Chevron */}
        <svg width="10" height="6" viewBox="0 0 10 6" fill="none" style={{ transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none', marginLeft: 2 }}>
          <path d="M1 1l4 4 4-4" stroke={C.muted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <>
          {/* Backdrop to close */}
          <div style={{ position: 'fixed', inset: 0, zIndex: 98 }} onClick={() => setOpen(false)} />
          <div style={{
            position: 'absolute', top: 'calc(100% + 8px)', right: 0,
            background: 'rgba(13,20,36,0.98)', border: `1px solid ${C.border}`,
            borderRadius: 12, padding: '6px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            backdropFilter: 'blur(16px)',
            zIndex: 99, minWidth: 160,
          }}>
            {onCreateProject && (
              <>
                <button
                  onClick={() => { onCreateProject(); setOpen(false) }}
                  style={{ ...dropItemStyle, color: '#60a5fa' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(27,120,247,0.08)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    Criar projeto
                  </span>
                </button>
                <div style={{ height: 1, background: C.border, margin: '4px 6px' }} />
              </>
            )}
            <button
              onClick={() => { onClick(); setOpen(false) }}
              style={{ ...dropItemStyle, color: C.text }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><FolderOpen size={15} /> Dashboard</span>
            </button>
            {onProfile && (
              <button
                onClick={() => { onProfile(); setOpen(false) }}
                style={{ ...dropItemStyle, color: C.text }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><User size={15} /> Meu perfil</span>
              </button>
            )}
            <button
              onClick={() => { onSettings(); setOpen(false) }}
              style={{ ...dropItemStyle, color: C.text }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><SettingsIcon size={15} /> Definições</span>
            </button>
            <div style={{ height: 1, background: C.border, margin: '4px 6px' }} />
            <button
              onClick={() => { onSignOut(); setOpen(false) }}
              style={{ ...dropItemStyle, color: '#f87171' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(248,113,113,0.08)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              Sair
            </button>
          </div>
        </>
      )}
    </div>
  )
}

const dropItemStyle = {
  display: 'block', width: '100%', textAlign: 'left',
  background: 'transparent', border: 'none', borderRadius: 8,
  padding: '9px 12px', fontSize: 14, fontWeight: 500,
  cursor: 'pointer', fontFamily: 'inherit',
  transition: 'background 0.12s',
}

export function Navbar({ children, showLinks = true, showCreateProject = false }) {
  const navigate = useNavigate()
  const { user, profile, signOut, isAdmin } = useAuth()
  const [open, setOpen] = useState(false)

  const profileUrl = profile?.username ? `/u/${profile.username}` : user ? `/u/${user.id}` : null

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  return (
    <>
      <style>{`
        .nav-btn:hover { color: #e8f2ff !important; background: rgba(255,255,255,0.06) !important; }
        .nav-logo { transition: opacity 0.15s; }
        .nav-logo:hover { opacity: 0.85; }

        .nav-left   { display: flex; align-items: center; gap: 2px; flex: 1; }
        .nav-mid    { display: flex; align-items: center; justify-content: center; }
        .nav-right  { display: flex; align-items: center; justify-content: flex-end; gap: 8px; flex: 1; }
        .nav-auth   { display: flex; align-items: center; gap: 8px; }
        .ham-btn    { display: none !important; }

        /* Tablet: hamburger for nav-left links + page children; keep nav-auth visible */
        @media (max-width: 860px) {
          .nav-left          { display: none; }
          .nav-children-wrap { display: none !important; }
          .ham-btn           { display: flex !important; }
          .mob-only-create   { display: none !important; }
        }

        @media (max-width: 600px) {
          .nav-mid          { flex: 1; justify-content: flex-start; }
          .nav-right        { flex: none; }
          .nav-auth         { display: none !important; }
          .nav-logo         { height: 28px !important; width: auto !important; }
          .showo-nav-pad    { padding-left: 20px !important; padding-right: 20px !important; }
          .mob-only-create  { display: flex !important; }
        }

        @media (min-width: 601px) and (max-width: 860px) {
          .nav-logo { height: 32px !important; width: auto !important; }
        }

        .mobile-drawer {
          position: fixed;
          top: 62px; left: 0; right: 0;
          background: rgba(13,20,36,0.98);
          border-bottom: 1px solid #1e3050;
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          padding: 8px 20px 16px;
          z-index: 98;
          display: flex; flex-direction: column;
          transform: translateY(-110%);
          visibility: hidden;
          transition: transform 0.25s cubic-bezier(0.4,0,0.2,1), visibility 0s 0.25s;
          box-shadow: 0 8px 32px rgba(0,0,0,0.4);
        }
        .mobile-drawer.is-open { transform: translateY(0); visibility: visible; transition: transform 0.25s cubic-bezier(0.4,0,0.2,1), visibility 0s; }
        .mobile-drawer-btn {
          background: transparent; border: none;
          color: #7d93b0; font-size: 15px; font-weight: 500;
          cursor: pointer; padding: 13px 4px; text-align: left;
          font-family: inherit; border-bottom: 1px solid #1e3050;
          transition: color 0.15s;
          display: flex; align-items: center; gap: 12px;
          width: 100%;
        }
        .mobile-drawer-btn:last-child { border-bottom: none; }
        .mobile-drawer-btn:hover { color: #e8f2ff; }
        .mobile-drawer-btn.danger { color: #f87171 !important; }
        .mobile-drawer-pair { display: flex; gap: 8px; padding: 16px 0 4px; }
        .mobile-drawer-pair-btn {
          flex: 1; display: flex; align-items: center; justify-content: center; gap: 7px;
          background: rgba(255,255,255,0.04); border: 1px solid #1e3050;
          border-radius: 10px; padding: 11px 8px;
          color: #e8f2ff; font-size: 13px; font-weight: 600;
          cursor: pointer; font-family: inherit; transition: background 0.15s, border-color 0.15s;
        }
        .mobile-drawer-pair-btn:hover { background: rgba(255,255,255,0.08); border-color: #2a4275; }
        .mobile-drawer-pair-btn.danger { color: #f87171 !important; border-color: rgba(248,113,113,0.2) !important; }
        .mobile-drawer-pair-btn.danger:hover { background: rgba(248,113,113,0.06) !important; }
        /* On tablet the UserChip is visible — hide the profile section inside drawer */
        @media (min-width: 601px) {
          .nav-drawer-profile { display: none !important; }
        }
      `}</style>

      {/* Mobile backdrop blur */}
      {showLinks && open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed', inset: 0, top: 62, zIndex: 97,
            background: 'rgba(5,9,18,0.55)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
          }}
        />
      )}

      {/* Mobile / tablet drawer */}
      {showLinks && (
        <div className={`mobile-drawer${open ? ' is-open' : ''}`}>
          {/* Nav links */}
          <button className="mobile-drawer-btn" onClick={() => { navigate('/explorar'); setOpen(false) }}>
            <Globe size={17} /> Explorar
          </button>
          <button className="mobile-drawer-btn" onClick={() => { navigate('/ranking'); setOpen(false) }}>
            <Trophy size={17} /> Ranking
          </button>

          {user ? (
            <div className="nav-drawer-profile">
              {/* User header — border-bottom do botão Ranking já separa, sem borderTop extra */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 4px 0' }}>
                <AvatarCircle avatarUrl={profile?.avatar_url} initial={getInitial(user)} size={36} fontSize={14} />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#e8f2ff', lineHeight: 1.2 }}>{getDisplayName(user)}</div>
                  <div style={{ fontSize: 11, color: '#7d93b0', marginTop: 2 }}>{user.email}</div>
                </div>
              </div>

              {/* Dashboard + Meu perfil side by side */}
              <div className="mobile-drawer-pair">
                <button className="mobile-drawer-pair-btn" onClick={() => { navigate('/dashboard'); setOpen(false) }}>
                  <FolderOpen size={15} /> Dashboard
                </button>
                {profile?.username && (
                  <button className="mobile-drawer-pair-btn" onClick={() => { navigate(`/u/${profile.username}`); setOpen(false) }}>
                    <User size={15} /> Meu perfil
                  </button>
                )}
                <button className="mobile-drawer-pair-btn" onClick={() => { navigate('/settings'); setOpen(false) }}>
                  <SettingsIcon size={15} /> Definições
                </button>
              </div>

              {/* Sair */}
              <button className="mobile-drawer-pair-btn danger" onClick={() => { handleSignOut(); setOpen(false) }}
                style={{ width: '100%', marginTop: 6, justifyContent: 'center' }}>
                <LogOut size={15} /> Sair
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8, padding: '16px 0 4px', borderTop: '1px solid #1e3050', marginTop: 4 }}>
              <button
                onClick={() => { navigate('/login'); setOpen(false) }}
                style={{ flex: 1, padding: '12px 0', background: 'transparent', border: '1px solid #1e3050', borderRadius: 10, color: '#e8f2ff', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
              >Entrar</button>
              <button
                onClick={() => { navigate('/register'); setOpen(false) }}
                style={{ flex: 1, padding: '12px 0', background: 'linear-gradient(135deg, #1b78f7, #4f46e5)', border: 'none', borderRadius: 10, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 16px rgba(27,120,247,0.3)' }}
              >Criar conta</button>
            </div>
          )}
        </div>
      )}

      <nav
        className="showo-nav-pad"
        style={{
          position: 'sticky', top: 0, zIndex: 100,
          display: 'flex', alignItems: 'center',
          padding: '0 36px', height: 62,
          background: C.bg,
          backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
          borderBottom: `1px solid ${C.border}`,
          boxShadow: '0 1px 24px rgba(0,0,0,0.3)',
          gap: 12,
        }}
      >
        {/* Left */}
        {showLinks && (
          <div className="nav-left">
            <button onClick={() => navigate('/explorar')} style={btnStyle} className="nav-btn">Explorar</button>
            <button onClick={() => navigate('/ranking')} style={btnStyle} className="nav-btn">Ranking</button>
          </div>
        )}

        {/* Centre */}
        <div className="nav-mid">
          <img
            src="/logo.png" alt="Showo" draggable={false}
            onClick={() => navigate('/')} className="nav-logo"
            style={{ height: 36, width: 'auto', display: 'block', cursor: 'pointer', userSelect: 'none' }}
          />
        </div>

        {/* Right */}
        <div className="nav-right">
          {/* Page-specific buttons (children) */}
          {children && (
            <div className="nav-children-wrap" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {children}
            </div>
          )}

          {/* Subtle divider when children + auth both present (desktop) */}
          {children && user && (
            <div className="nav-auth" style={{ width: 1, height: 20, background: C.border, margin: '0 4px', flexShrink: 0 }} />
          )}

          {/* Notification bell — always visible when logged in (including mobile) */}
          {user && <InviteInbox userId={user.id} />}

          {/* Auth section */}
          <div className="nav-auth">
            {user ? (
              <>
                {isAdmin && (
                  <button
                    onClick={() => navigate('/admin')}
                    style={{
                      background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.25)',
                      color: '#a855f7', borderRadius: 8, padding: '6px 12px',
                      fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                    }}
                    title="Painel de administração"
                  ><Shield size={14} /></button>
                )}
                <UserChip
                  user={user}
                  profile={profile}
                  onClick={() => navigate('/dashboard')}
                  onProfile={profileUrl ? () => navigate(profileUrl) : null}
                  onSettings={() => navigate('/settings')}
                  onSignOut={handleSignOut}
                  onCreateProject={showCreateProject ? () => navigate('/novo') : undefined}
                />
              </>
            ) : (
              <>
                <button onClick={() => navigate('/login')} style={btnStyle} className="nav-btn">
                  Entrar
                </button>
                <button
                  onClick={() => navigate('/register')}
                  style={{
                    background: C.blue, border: 'none', borderRadius: 8,
                    padding: '8px 16px', color: '#fff', fontSize: 14, fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'inherit', transition: 'background 0.15s', whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={e => e.target.style.background = '#1564d4'}
                  onMouseLeave={e => e.target.style.background = C.blue}
                >
                  Criar conta
                </button>
              </>
            )}
          </div>

          {/* Mobile quick-create button — only on mobile (not tablet) */}
          {showLinks && (
            <button
              className="ham-btn mob-only-create"
              onClick={() => navigate('/novo')}
              aria-label="Criar projeto"
              style={{
                background: 'linear-gradient(135deg, #1b78f7, #4f46e5)',
                border: 'none',
                borderRadius: 8, width: 38, height: 38,
                flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', padding: 0, flexShrink: 0,
                boxShadow: '0 4px 12px rgba(27,120,247,0.35)',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </button>
          )}

          {/* Hamburger */}
          {showLinks && (
            <button
              className="ham-btn" onClick={() => setOpen(o => !o)} aria-label="Menu"
              style={{
                background: 'transparent',
                border: `1px solid ${open ? '#3b82f6' : C.border}`,
                borderRadius: 8, width: 38, height: 38,
                flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 5, cursor: 'pointer', padding: 0, transition: 'border-color 0.2s', flexShrink: 0,
              }}
            >
              {[
                open ? 'translateY(6.5px) rotate(45deg)' : 'none',
                null,
                open ? 'translateY(-6.5px) rotate(-45deg)' : 'none',
              ].map((transform, i) => (
                <span key={i} style={{
                  display: 'block', width: 18, height: 1.5,
                  background: open ? C.text : C.muted,
                  borderRadius: 1,
                  transition: i === 1 ? 'background 0.2s, opacity 0.22s' : 'background 0.2s, transform 0.22s',
                  transform: transform ?? 'none',
                  opacity: i === 1 && open ? 0 : 1,
                }} />
              ))}
            </button>
          )}
        </div>
      </nav>
    </>
  )
}
