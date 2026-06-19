import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { useSidebar } from '../context/SidebarContext'
import { supabase } from '../lib/supabase'
import { Check, X, FolderOpen, User, Settings as SettingsIcon, Shield, Globe, Trophy, LogOut, Bell, Eye, Target, TrendingUp, GraduationCap, UserPlus, LayoutDashboard, Plus, Compass, Sun, Moon, Sparkles, Pencil, ArrowLeft, Briefcase, Medal, Users2, Swords, Building2, Search, Star, MessageSquare, Kanban, Heart, CheckCircle, XCircle, AlignJustify, Paintbrush, Mail } from 'lucide-react'

// Strip emoji characters from notification messages coming from the DB
function stripEmoji(str) {
  if (!str) return str
  return str.replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27FF}\u{2900}-\u{297F}\u{1F300}-\u{1F9FF}\u{FE00}-\u{FEFF}]/gu, '').replace(/\s{2,}/g, ' ').trim()
}
import CreateProjectModal from './CreateProjectModal'

const C = {
  bg: 'rgba(13, 20, 36, 0.88)',
  border: 'var(--c-border)',
  blue: '#1b78f7',
  muted: 'var(--c-muted)',
  text: 'var(--c-text)',
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

// Notification type → Lucide icon
function getNotifIcon(type) {
  const s = { size: 15, strokeWidth: 2 }
  switch (type) {
    case 'PROJECT_VIEW':     return <Eye {...s} />
    case 'COMPANY_VIEW':     return <Eye {...s} />
    case 'SCORE_MILESTONE':  return <Target {...s} />
    case 'RANKING_CHANGE':   return <TrendingUp {...s} />
    case 'MISSION_COMPLETE': return <Trophy {...s} />
    case 'TEACHER_FEEDBACK': return <GraduationCap {...s} />
    case 'STUDENT_JOINED':   return <UserPlus {...s} />
    case 'PROJECT_LIKE':        return <Heart {...s} />
    case 'PROJECT_COMMENT':     return <MessageSquare {...s} />
    case 'RECRUITER_INTEREST':  return <Star {...s} />
    case 'NEW_CANDIDATURA':     return <Briefcase {...s} />
    case 'CANDIDATURA_ACEITE':  return <CheckCircle {...s} />
    case 'CANDIDATURA_RECUSADA':return <XCircle {...s} />
    case 'VAGA_INVITE':         return <Mail {...s} />
    default:                    return <Bell {...s} />
  }
}

function timeAgo(ts) {
  const diff = (Date.now() - new Date(ts).getTime()) / 1000
  if (diff < 60)    return 'agora mesmo'
  if (diff < 3600)  return `há ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `há ${Math.floor(diff / 3600)}h`
  if (diff < 604800) return `há ${Math.floor(diff / 86400)} dias`
  return new Date(ts).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' })
}

function InviteInbox({ userId, sidebar = false }) {
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

  async function markRead(ids) {
    const arr = Array.isArray(ids) ? ids : [ids]
    await supabase.from('notifications').update({ read: true }).in('id', arr)
    setDbNotifs(prev => prev.map(n => arr.includes(n.id) ? { ...n, read: true } : n))
  }

  async function deleteNotifs(ids) {
    const arr = Array.isArray(ids) ? ids : [ids]
    await supabase.from('notifications').delete().in('id', arr)
    setDbNotifs(prev => prev.filter(n => !arr.includes(n.id)))
  }

  // Group VIEW notifications by project_slug, track time-window counts
  const VIEW_TYPES = ['PROJECT_VIEW', 'COMPANY_VIEW']
  function groupedNotifs(notifs) {
    const now = Date.now()
    const result = []
    const seen = {}
    for (const n of notifs) {
      if (VIEW_TYPES.includes(n.type) && n.project_slug) {
        const key = `${n.type}__${n.project_slug}`
        const ts = new Date(n.created_at).getTime()
        const age = (now - ts) / 1000
        if (seen[key] != null) {
          const g = result[seen[key]]
          g.groupIds.push(n.id)
          g.count++
          if (!n.read) g.anyUnread = true
          if (age <= 1800) g.count30m++
          if (age <= 3600) g.count1h++
          if (age <= 86400) g.count24h++
          if (ts > g.latestTs) { g.latestTs = ts; g.created_at = n.created_at }
        } else {
          seen[key] = result.length
          result.push({
            ...n,
            count: 1,
            groupIds: [n.id],
            anyUnread: !n.read,
            latestTs: ts,
            count30m: age <= 1800 ? 1 : 0,
            count1h:  age <= 3600 ? 1 : 0,
            count24h: age <= 86400 ? 1 : 0,
          })
        }
      } else {
        result.push({ ...n, count: 1, groupIds: [n.id], anyUnread: !n.read, latestTs: new Date(n.created_at).getTime(), count30m: 0, count1h: 0, count24h: 0 })
      }
    }
    return result
  }

  function viewMessage(n) {
    const isCompany = n.type === 'COMPANY_VIEW'
    const who = isCompany ? 'empresas/recrutadores' : 'pessoas'
    if (n.count30m >= 2) return `${n.count30m} ${who} nas últimas 30 min`
    if (n.count1h >= 2)  return `${n.count1h} ${who} na última hora`
    if (n.count24h >= 2) return `${n.count24h} ${who} hoje`
    if (n.count > 1)     return `${n.count} ${who} viram o teu projeto`
    return stripEmoji(n.message)
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

  const grouped = groupedNotifs(dbNotifs)
  const unreadDbCount = grouped.filter(n => n.anyUnread).length
  const count = invites.length + responses.length + unreadDbCount

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position: 'relative',
          background: open ? 'rgba(27,120,247,0.13)' : 'transparent',
          border: 'none',
          borderRadius: 8, width: 32, height: 32,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: open ? '#1b78f7' : 'var(--c-muted)',
          transition: 'background 0.13s, color 0.13s', flexShrink: 0,
        }}
        onMouseEnter={e => { if (!open) { e.currentTarget.style.background = 'var(--c-card-hover)'; e.currentTarget.style.color = 'var(--c-text)' } }}
        onMouseLeave={e => { if (!open) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--c-muted)' } }}
        title="Notificações"
      >
        <Bell size={15} />
        {count > 0 && (
          <span style={{
            position: 'absolute', top: -4, right: -4,
            background: '#ef4444', borderRadius: '50%',
            width: 15, height: 15, fontSize: 8, fontWeight: 800,
            color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid var(--c-bg)',
          }}>
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 198 }} onClick={() => setOpen(false)} />
          <div
            className={sidebar ? '' : 'notif-drop'}
            style={{
              ...(sidebar
                ? { position: 'fixed', left: 248, bottom: 16 }
                : { position: 'absolute', top: 'calc(100% + 8px)', right: 0 }
              ),
              background: 'var(--c-card)', border: `1px solid var(--c-border)`,
              borderRadius: 14, padding: '8px',
              boxShadow: '0 8px 40px rgba(0,0,0,0.45)',
              backdropFilter: 'blur(16px)',
              zIndex: 199, width: 310,
              maxHeight: 'calc(100vh - 80px)', overflowY: 'auto',
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
                      background: 'rgba(27,120,247,0.05)', border: '1px solid rgba(27,120,247,0.15)',
                      borderRadius: 10, padding: '12px 14px', marginBottom: 6,
                    }}>
                      <p style={{ margin: '0 0 2px', fontSize: 14, fontWeight: 700, color: C.text }}>{invite.projectName}</p>
                      <p style={{ margin: '0 0 12px', fontSize: 12, color: C.muted }}>Convidado por {invitedBy}</p>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          onClick={() => respond(invite, 'accepted')} disabled={isActing}
                          style={{ flex: 1, padding: '7px 0', background: '#1b78f7', border: 'none', borderRadius: 7, color: '#fff', fontSize: 12, fontWeight: 700, cursor: isActing ? 'default' : 'pointer', fontFamily: 'inherit' }}
                        >{acting[invite.id] === 'accepted' ? '...' : <><Check size={12} style={{ verticalAlign: 'middle', marginRight: 3 }} />Aceitar</>}</button>
                        <button
                          onClick={() => respond(invite, 'declined')} disabled={isActing}
                          style={{ flex: 1, padding: '7px 0', background: 'transparent', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 7, color: '#ef4444', fontSize: 12, fontWeight: 600, cursor: isActing ? 'default' : 'pointer', fontFamily: 'inherit' }}
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
                    background: r.status === 'accepted' ? 'rgba(34,197,94,0.05)' : 'rgba(239,68,68,0.05)',
                    border: `1px solid ${r.status === 'accepted' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
                    borderRadius: 10, padding: '10px 14px', marginBottom: 6,
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                  }}>
                    <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1, display: 'flex', alignItems: 'center' }}>
                      {r.status === 'accepted'
                        ? <Check size={16} color="#22c55e" />
                        : <X size={16} color="#ef4444" />}
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
                            style={{ marginLeft: 8, color: C.blue, cursor: 'pointer', textDecoration: 'underline' }}
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
                      style={{ background: 'none', border: 'none', color: C.blue, fontSize: 11, fontWeight: 600, cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}
                    >
                      Marcar todas como lidas
                    </button>
                  )}
                </div>
                {grouped.map(n => (
                  <div
                    key={n.id}
                    onClick={(e) => {
                      if (e.target.closest('[data-delete]')) return
                      markRead(n.groupIds)
                      if (n.project_slug) { navigate(`/projeto/${n.project_slug}`); setOpen(false) }
                    }}
                    style={{
                      borderRadius: 10, padding: '10px 12px', marginBottom: 4,
                      background: n.anyUnread ? 'rgba(27,120,247,0.05)' : 'transparent',
                      border: `1px solid ${n.anyUnread ? 'rgba(27,120,247,0.12)' : 'transparent'}`,
                      borderLeft: n.anyUnread ? '3px solid rgba(27,120,247,0.5)' : '3px solid transparent',
                      cursor: n.project_slug ? 'pointer' : 'default',
                      display: 'flex', alignItems: 'flex-start', gap: 10,
                      transition: 'background 0.12s',
                    }}
                  >
                    <span style={{ display: 'flex', flexShrink: 0, marginTop: 1, color: C.muted }}>{getNotifIcon(n.type)}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: '0 0 2px', fontSize: 13, color: n.anyUnread ? C.text : C.muted, lineHeight: 1.45, fontWeight: n.anyUnread ? 500 : 400 }}>
                        {VIEW_TYPES.includes(n.type) ? viewMessage(n) : stripEmoji(n.message)}
                      </p>
                      {n.project_slug && VIEW_TYPES.includes(n.type) && (
                        <p style={{ margin: '0 0 2px', fontSize: 11, color: C.blue, opacity: 0.8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {n.project_slug}
                        </p>
                      )}
                      <span style={{ fontSize: 11, color: C.muted }}>{timeAgo(n.created_at)}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, marginTop: 2 }}>
                      {n.anyUnread && <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.blue }} />}
                      <button
                        data-delete
                        onClick={() => deleteNotifs(n.groupIds)}
                        title="Apagar notificação"
                        style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', padding: '2px 3px', borderRadius: 4, display: 'flex', alignItems: 'center', opacity: 0.6, transition: 'opacity 0.12s, color 0.12s', lineHeight: 1 }}
                        onMouseEnter={e => { e.currentTarget.style.opacity = 1; e.currentTarget.style.color = '#ef4444' }}
                        onMouseLeave={e => { e.currentTarget.style.opacity = 0.6; e.currentTarget.style.color = C.muted }}
                      >
                        <X size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* Empty state */}
            {invites.length === 0 && responses.length === 0 && dbNotifs.length === 0 && (
              <div style={{ padding: '24px 12px', textAlign: 'center' }}>
                <Bell size={22} color={C.muted} style={{ marginBottom: 6 }} />
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
      background: '#1b78f7',
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
          background: open ? 'var(--c-card-hover)' : 'transparent',
          border: `1px solid ${open ? 'var(--c-border-bright)' : C.border}`,
          borderRadius: 24, padding: '5px 12px 5px 6px',
          cursor: 'pointer', fontFamily: 'inherit',
          transition: 'background 0.15s, border-color 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--c-card-hover)'; e.currentTarget.style.borderColor = 'var(--c-border-bright)' }}
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
            background: 'var(--c-card)', border: `1px solid ${C.border}`,
            borderRadius: 12, padding: '6px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            backdropFilter: 'blur(16px)',
            zIndex: 99, minWidth: 160,
          }}>
            {onCreateProject && (
              <>
                <button
                  onClick={() => { onCreateProject(); setOpen(false) }}
                  style={{ ...dropItemStyle, color: C.blue }}
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
              onMouseEnter={e => e.currentTarget.style.background = 'var(--c-card-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><FolderOpen size={15} /> Dashboard</span>
            </button>
            {onProfile && (
              <button
                onClick={() => { onProfile(); setOpen(false) }}
                style={{ ...dropItemStyle, color: C.text }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--c-card-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><User size={15} /> Meu perfil</span>
              </button>
            )}
            <button
              onClick={() => { onSettings(); setOpen(false) }}
              style={{ ...dropItemStyle, color: C.text }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--c-card-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><SettingsIcon size={15} /> Definições</span>
            </button>
            <div style={{ height: 1, background: C.border, margin: '4px 6px' }} />
            <button
              onClick={() => { onSignOut(); setOpen(false) }}
              style={{ ...dropItemStyle, color: '#ef4444' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
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

export function Navbar({ children, showLinks = true, showCreateProject = false, previewEditingMobile = false, onWorkspaceToggle }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, profile, signOut, isAdmin } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { extras } = useSidebar()
  const [open, setOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [createModal, setCreateModal] = useState(false)

  const isRecruiter = profile?.role === 'recrutador' || profile?.role === 'empresa'
  const recruiterAccent = profile?.role === 'empresa' ? '#f59e0b' : '#8b5cf6'

  const [unreadMsgs, setUnreadMsgs] = useState(0)
  useEffect(() => {
    if (!user) return
    // Count unread messages
    supabase.from('mensagens').select('id', { count: 'exact', head: true })
      .eq('to_id', user.id).is('read_at', null)
      .then(({ count }) => setUnreadMsgs(count || 0))
    // Subscribe for new messages
    const ch = supabase.channel(`unread-${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensagens', filter: `to_id=eq.${user.id}` },
        () => setUnreadMsgs(n => n + 1))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'mensagens', filter: `to_id=eq.${user.id}` },
        () => {
          supabase.from('mensagens').select('id', { count: 'exact', head: true })
            .eq('to_id', user.id).is('read_at', null)
            .then(({ count }) => setUnreadMsgs(count || 0))
        })
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [user])

  const profileUrl = profile?.username ? `/u/${profile.username}` : user ? `/u/${user.id}` : null

  function isActive(path) {
    if (path === '/dashboard') return location.pathname === '/dashboard'
    if (path === 'profile') return location.pathname.startsWith('/u/')
    return location.pathname === path || location.pathname.startsWith(path + '/')
  }

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  return (
    <>
      <style>{`
        .nav-btn:hover { color: var(--c-text) !important; background: var(--c-card-hover) !important; }
        .nav-logo { transition: opacity 0.15s; }
        .nav-logo:hover { opacity: 0.85; }

        .nav-left   { display: flex; align-items: center; gap: 2px; flex: 1; }
        .nav-mid    { display: flex; align-items: center; justify-content: center; }
        .nav-right  { display: flex; align-items: center; justify-content: flex-end; gap: 8px; flex: 1; }
        .nav-auth   { display: flex; align-items: center; gap: 8px; }
        .ham-btn    { display: none !important; }

        /* ── Sidebar (desktop >860px) ── */
        /* ═══════════════════════════════════
           SIDEBAR — redesign
        ═══════════════════════════════════ */
        .sidebar {
          display: none;
          position: fixed;
          left: 0; top: 0; bottom: 0;
          width: 232px;
          background: var(--c-sidebar-bg);
          border-right: 1px solid var(--c-border);
          flex-direction: column;
          padding: 0;
          z-index: 100;
          overflow: hidden;
        }
        .sb-logo {
          display: flex; align-items: center;
          padding: 18px 16px 16px;
          cursor: pointer; border: none; background: transparent;
          font-family: inherit; text-align: left; width: 100%;
          transition: opacity 0.15s;
        }
        .sb-logo:hover { opacity: 0.75; }
        .sb-logo-divider {
          height: 1px;
          background: linear-gradient(90deg, transparent, var(--c-border), transparent);
          margin: 0 0 8px; opacity: 0.8;
        }
        .sb-section {
          padding: 0 10px;
          flex: 1; overflow-y: auto; overflow-x: hidden; min-height: 0;
        }
        .sb-section::-webkit-scrollbar { width: 2px; }
        .sb-section::-webkit-scrollbar-track { background: transparent; }
        .sb-section::-webkit-scrollbar-thumb { background: var(--c-border); border-radius: 99px; }

        /* Sidebar animation keyframes */
        @keyframes sb-fade-slide-in {
          from { opacity: 0; transform: translateY(-4px) scale(0.99); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .sb-create-wrap {
          display: grid;
          grid-template-rows: 1fr;
          transition: grid-template-rows 0.28s cubic-bezier(0.16,1,0.3,1),
                      opacity 0.2s ease;
          opacity: 1;
        }
        .sb-create-wrap.hidden {
          grid-template-rows: 0fr;
          opacity: 0;
          pointer-events: none;
        }
        .sb-create-inner { overflow: hidden; min-height: 0; }
        .sb-soon {
          display: inline-flex; align-items: center;
          margin-left: auto; font-size: 9px; font-weight: 700;
          color: var(--c-subtle); background: var(--c-bg);
          border: 1px solid var(--c-border); border-radius: 4px;
          padding: 1px 5px; text-transform: uppercase; letter-spacing: 0.05em;
          flex-shrink: 0;
        }
        .sb-label {
          font-size: 10px; font-weight: 700; color: var(--c-subtle);
          text-transform: uppercase; letter-spacing: 0.12em;
          padding: 14px 4px 5px; display: block;
        }
        /* Nav item — left-bar active indicator style */
        .sb-item {
          display: flex; align-items: center; gap: 10px;
          width: 100%; padding: 8px 10px;
          border-radius: 8px; border: none;
          background: transparent; color: var(--c-muted);
          font-size: 13px; font-weight: 500;
          cursor: pointer; font-family: inherit;
          transition: background 0.15s, color 0.15s, transform 0.1s;
          text-align: left; white-space: nowrap;
          position: relative;
        }
        .sb-item:hover {
          background: rgba(255,255,255,0.04);
          color: var(--c-text);
          transform: translateX(2px);
        }
        .sb-item.active {
          background: rgba(27,120,247,0.1);
          color: #1b78f7;
          font-weight: 600;
        }
        /* Active left accent bar */
        .sb-item.active::before {
          content: '';
          position: absolute;
          left: -10px; top: 25%; bottom: 25%;
          width: 3px;
          background: #1b78f7;
          border-radius: 0 3px 3px 0;
        }
        .sb-item.danger { color: #ef4444; }
        .sb-item.danger:hover { background: rgba(239,68,68,0.07); color: #ef4444; transform: none; }
        /* Create button — solid blue, no gradient */
        .sb-create {
          display: flex; align-items: center; gap: 8px;
          margin: 8px 0 4px;
          padding: 9px 13px;
          background: #1b78f7;
          border: none; border-radius: 9px;
          color: #fff; font-size: 13px; font-weight: 600;
          cursor: pointer; font-family: inherit;
          box-shadow: 0 2px 10px rgba(27,120,247,0.28);
          transition: background 0.15s, box-shadow 0.15s, transform 0.1s;
          width: 100%;
        }
        .sb-create:hover { background: #1564d4; box-shadow: 0 6px 18px rgba(27,120,247,0.4); }
        .sb-create:active { transform: translateY(0); }
        .sb-divider { height: 1px; background: var(--c-border); margin: 6px 0; opacity: 0.6; }
        /* Project section card — subtle highlight */
        .sb-project-section {
          background: rgba(27,120,247,0.06);
          border: 1px solid rgba(27,120,247,0.14);
          border-radius: 10px;
          padding: 4px 0 6px;
          margin: 6px 0 4px;
          animation: sb-fade-slide-in 0.25s cubic-bezier(0.16,1,0.3,1) both;
        }
        .sb-project-section .sb-label { color: rgba(27,120,247,0.7); padding-top: 8px; }
        .sb-project-section .sb-item:hover { background: rgba(27,120,247,0.1); color: var(--c-text); }
        body.light .sb-project-section { background: rgba(27,120,247,0.05); border-color: rgba(27,120,247,0.15); }
        body.light .sb-item:hover { background: rgba(0,0,0,0.04); }
        .sb-bottom { padding: 0 10px 14px; }

        @media (min-width: 861px) {
          .sidebar   { display: flex; }
          .top-nav   { display: none !important; }
          .bottom-nav { display: none !important; }
          body { padding-left: 240px !important; padding-bottom: 0 !important; }
        }

        /* Tablet (601–860px): hamburger visible, bottom nav hidden */
        @media (max-width: 860px) {
          .nav-left          { display: none; }
          .nav-children-wrap { display: none !important; }
          .ham-btn           { display: flex !important; }
          .mob-only-create   { display: none !important; }
        }

        @media (min-width: 601px) and (max-width: 860px) {
          .nav-logo { height: 32px !important; width: auto !important; }
        }

        /* Mobile (≤600px): bottom nav takes over — logo centrada, sem hamburger */
        @media (max-width: 600px) {
          .nav-mid       { position: absolute; left: 50%; transform: translateX(-50%); }
          .nav-right     { flex: none; margin-left: auto; }
          .nav-auth      { display: none !important; }
          .nav-logo      { height: 28px !important; width: auto !important; }
          .showo-nav-pad { padding-left: 20px !important; padding-right: 20px !important; }
          .mob-only-create { display: none !important; }
          .ham-btn       { display: none !important; }
          .bottom-nav    { display: flex !important; }
          body           { padding-bottom: 78px; }

          /* Notification dropdown — full-width anchored below navbar */
          .notif-drop {
            position: fixed !important;
            top: 62px !important;
            right: 16px !important;
            left: 16px !important;
            width: auto !important;
            max-width: none !important;
          }
        }

        /* Mobile drawer (tablet only) */
        .mobile-drawer {
          position: fixed;
          top: 62px; left: 0; right: 0;
          background: var(--c-card);
          border-bottom: 1px solid var(--c-border);
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
          color: var(--c-muted); font-size: 15px; font-weight: 500;
          cursor: pointer; padding: 13px 4px; text-align: left;
          font-family: inherit; border-bottom: 1px solid var(--c-border);
          transition: color 0.15s;
          display: flex; align-items: center; gap: 12px;
          width: 100%;
        }
        .mobile-drawer-btn:last-child { border-bottom: none; }
        .mobile-drawer-btn:hover { color: var(--c-text); }
        .mobile-drawer-btn.danger { color: #ef4444 !important; }
        .mobile-drawer-pair { display: flex; gap: 8px; padding: 16px 0 4px; }
        .mobile-drawer-pair-btn {
          flex: 1; display: flex; align-items: center; justify-content: center; gap: 7px;
          background: var(--c-bg-alt); border: 1px solid var(--c-border);
          border-radius: 10px; padding: 11px 8px;
          color: var(--c-text); font-size: 13px; font-weight: 600;
          cursor: pointer; font-family: inherit; transition: background 0.15s, border-color 0.15s;
        }
        .mobile-drawer-pair-btn:hover { background: var(--c-card-hover); border-color: var(--c-border-bright); }
        .mobile-drawer-pair-btn.danger { color: #ef4444 !important; border-color: rgba(239,68,68,0.2) !important; }
        .mobile-drawer-pair-btn.danger:hover { background: rgba(239,68,68,0.06) !important; }
        @media (min-width: 601px) {
          .nav-drawer-profile { display: none !important; }
        }

        /* ── Bottom navigation bar (mobile only) ── */
        .bottom-nav {
          display: none;
          position: fixed;
          bottom: 0; left: 0; right: 0;
          z-index: 100;
          background: rgba(13,20,36,0.97);
          border-top: 1px solid #1e3050;
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          padding: 6px 0 max(10px, env(safe-area-inset-bottom, 10px));
          box-shadow: 0 -4px 32px rgba(0,0,0,0.45);
          align-items: stretch;
        }
        .bn-item {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 0;
          color: #7d93b0;
          font-family: inherit;
          transition: color 0.15s;
          -webkit-tap-highlight-color: transparent;
          min-height: 50px;
        }
        .bn-item.active { color: #1b78f7; }
        .bn-item:active { opacity: 0.65; }
        .bn-create-wrap {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .bn-create-btn {
          background: transparent;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #7d93b0;
          padding: 0;
          -webkit-tap-highlight-color: transparent;
          transition: color 0.15s, transform 0.15s;
          min-height: 50px;
          width: 100%;
        }
        .bn-create-btn:active { transform: scale(0.88); opacity: 0.7; }

        /* Raise bottom-nav so it stays visible above the menu sheet */
        .bottom-nav { z-index: 500 !important; }

        /* ── Mobile full-navigation sheet (≤600px) ── */
        @keyframes mob-sheet-up {
          from { transform: translateY(100%); opacity: 0.75; }
          to   { transform: translateY(0);    opacity: 1;   }
        }
        .mob-menu-overlay {
          position: fixed; inset: 0; z-index: 399;
          background: rgba(0,0,0,0.55);
          backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);
        }
        .mob-menu-sheet {
          position: fixed; left: 0; right: 0; bottom: 0; z-index: 400;
          max-height: calc(100vh - 60px);
          background: var(--c-card);
          border-top: 1px solid var(--c-border);
          border-radius: 20px 20px 0 0;
          display: flex; flex-direction: column;
          animation: mob-sheet-up 0.32s cubic-bezier(0.22,1,0.36,1) both;
          box-shadow: 0 -6px 40px rgba(0,0,0,0.5);
        }
        .mob-sheet-handle {
          width: 40px; height: 4px; border-radius: 99px;
          background: var(--c-border-bright);
          margin: 12px auto 0; flex-shrink: 0; cursor: pointer;
        }
        .mob-sheet-scroll {
          overflow-y: auto; flex: 1;
          padding: 0 12px max(env(safe-area-inset-bottom, 20px), 20px);
          min-height: 0;
        }
        .mob-sheet-scroll::-webkit-scrollbar { display: none; }
        .mob-nav-section-label {
          font-size: 10.5px; font-weight: 700; color: var(--c-subtle);
          text-transform: uppercase; letter-spacing: 0.1em;
          padding: 14px 12px 5px; display: block;
        }
        .mob-nav-btn {
          display: flex; align-items: center; gap: 13px;
          width: 100%; padding: 12px 12px;
          border-radius: 10px; border: none;
          background: transparent; color: var(--c-muted);
          font-size: 15px; font-weight: 500;
          cursor: pointer; font-family: inherit;
          text-align: left; transition: background 0.12s, color 0.12s;
          -webkit-tap-highlight-color: transparent;
        }
        .mob-nav-btn:active { background: var(--c-card-hover); color: var(--c-text); }
        .mob-nav-btn.active { color: #1b78f7; background: rgba(27,120,247,0.08); }
        .mob-nav-btn.danger { color: #ef4444; }
        .mob-nav-btn.danger:active { background: rgba(239,68,68,0.08); color: #ef4444; }
        .mob-nav-soon {
          margin-left: auto; font-size: 9px; font-weight: 700;
          color: var(--c-subtle); background: var(--c-bg-alt);
          border: 1px solid var(--c-border); border-radius: 4px;
          padding: 1px 5px; text-transform: uppercase; letter-spacing: 0.04em;
          flex-shrink: 0;
        }
        .mob-nav-divider { height: 1px; background: var(--c-border); margin: 6px 12px; }
        .mob-project-section {
          background: rgba(27,120,247,0.06); border: 1px solid rgba(27,120,247,0.15);
          border-radius: 12px; margin: 8px 0; padding: 4px 0 6px;
        }
        .mob-project-section .mob-nav-section-label { color: #1b78f7; padding-top: 8px; }
        .mob-project-section .mob-nav-btn:active { background: rgba(27,120,247,0.12); }

        /* Enhanced tablet drawer: scrollable + section labels */
        .mobile-drawer { max-height: calc(100vh - 62px); overflow-y: auto; }
        .mob-drawer-label {
          font-size: 10.5px; font-weight: 700; color: var(--c-subtle);
          text-transform: uppercase; letter-spacing: 0.1em;
          padding: 12px 4px 4px; display: block;
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
          {/* Public nav links */}
          <button className="mobile-drawer-btn" onClick={() => { navigate('/explorar'); setOpen(false) }}>
            <Compass size={17} /> Explorar
          </button>
          <button className="mobile-drawer-btn" onClick={() => { navigate('/ranking'); setOpen(false) }}>
            <Trophy size={17} /> Ranking
          </button>

          {user ? (
            <div className="nav-drawer-profile">
              {/* User header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 4px 10px' }}>
                <AvatarCircle avatarUrl={profile?.avatar_url} initial={getInitial(user)} size={36} fontSize={14} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--c-text)', lineHeight: 1.2 }}>{getDisplayName(user)}</div>
                  <div style={{ fontSize: 11, color: 'var(--c-muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</div>
                </div>
                <button onClick={toggleTheme} style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--c-bg-alt)', border: '1px solid var(--c-border)', color: 'var(--c-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
                </button>
              </div>

              {/* Role-based sections */}
              {isRecruiter ? (
                <>
                  <span className="mob-drawer-label">Recrutamento</span>
                  <button className="mobile-drawer-btn" onClick={() => { navigate('/explorar?tab=pessoas'); setOpen(false) }}>
                    <Users2 size={16} /> Candidatos
                  </button>
                  <button className="mobile-drawer-btn" onClick={() => { navigate('/vagas'); setOpen(false) }}>
                    <Briefcase size={16} /> Vagas
                  </button>
                  <button className="mobile-drawer-btn" onClick={() => { navigate('/pipeline'); setOpen(false) }}>
                    <Kanban size={16} /> Pipeline
                  </button>
                  <button className="mobile-drawer-btn" onClick={() => { navigate('/candidatos'); setOpen(false) }}>
                    <Star size={16} /> Guardados
                  </button>
                  <button className="mobile-drawer-btn" onClick={() => { navigate('/mensagens'); setOpen(false) }}>
                    <MessageSquare size={16} /> Mensagens
                    {unreadMsgs > 0 && <span style={{ marginLeft: 'auto', background: '#1b78f7', color: '#fff', borderRadius: 99, minWidth: 18, height: 18, fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>{unreadMsgs > 9 ? '9+' : unreadMsgs}</span>}
                  </button>
                  {user && (
                    <button className="mobile-drawer-btn" onClick={() => { navigate(`/empresa/${user.id}`); setOpen(false) }}>
                      <Building2 size={16} /> Minha empresa
                    </button>
                  )}
                </>
              ) : (
                <>
                  <span className="mob-drawer-label">Oportunidades</span>
                  <button className="mobile-drawer-btn" onClick={() => { navigate('/vagas'); setOpen(false) }}>
                    <Briefcase size={16} /> Vagas
                  </button>
                  <span className="mob-drawer-label">Comunidade</span>
                  <button className="mobile-drawer-btn" onClick={() => { navigate('/missoes'); setOpen(false) }}>
                    <Swords size={16} /> Missões
                  </button>
                  <button className="mobile-drawer-btn" onClick={() => { navigate('/turmas'); setOpen(false) }}>
                    <Users2 size={16} /> Turmas
                  </button>
                  <button className="mobile-drawer-btn" onClick={() => { navigate('/conquistas'); setOpen(false) }}>
                    <Medal size={16} /> Conquistas
                  </button>
                  <button className="mobile-drawer-btn" onClick={() => { navigate('/mensagens'); setOpen(false) }}>
                    <MessageSquare size={16} /> Mensagens
                    {unreadMsgs > 0 && <span style={{ marginLeft: 'auto', background: '#1b78f7', color: '#fff', borderRadius: 99, minWidth: 18, height: 18, fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>{unreadMsgs > 9 ? '9+' : unreadMsgs}</span>}
                  </button>
                </>
              )}

              {/* Project management extras */}
              {extras?.type === 'project' && (
                <>
                  <span className="mob-drawer-label" style={{ color: '#1b78f7' }}>Gerir projeto</span>
                  {extras.showBack && (
                    <button className="mobile-drawer-btn" onClick={() => { navigate(`/projeto/${extras.slug}`); setOpen(false) }}>
                      <ArrowLeft size={16} /> Ver projeto
                    </button>
                  )}
                  {!extras.showBack && (
                    <button className="mobile-drawer-btn" onClick={() => { navigate(`/editar/${extras.slug}`); setOpen(false) }}>
                      <Pencil size={16} /> Editar
                    </button>
                  )}
                  {extras.onDefense && (
                    <button className="mobile-drawer-btn" onClick={() => { extras.onDefense(); setOpen(false) }}>
                      <GraduationCap size={16} /> Modo defesa
                    </button>
                  )}
                  {extras.onAnalyze && (
                    <button className="mobile-drawer-btn" onClick={() => { extras.onAnalyze(); setOpen(false) }}>
                      <Sparkles size={16} /> Análise IA
                    </button>
                  )}
                  <button className="mobile-drawer-btn" onClick={() => { navigate(`/certificado/${extras.slug}`); setOpen(false) }}>
                    <Trophy size={16} /> Certificado
                  </button>
                  {extras.onTogglePublicView && (
                    <button className="mobile-drawer-btn" style={{ color: extras.viewAsPublic ? '#1b78f7' : undefined }}
                      onClick={() => { extras.onTogglePublicView(); setOpen(false) }}>
                      <Globe size={16} /> {extras.viewAsPublic ? 'Sair da preview' : 'Preview visitante'}
                    </button>
                  )}
                </>
              )}

              {/* Dashboard + Meu perfil + Definições */}
              <div className="mobile-drawer-pair">
                <button className="mobile-drawer-pair-btn" onClick={() => { navigate('/dashboard'); setOpen(false) }}>
                  <FolderOpen size={15} /> Dashboard
                </button>
                {profileUrl && (
                  <button className="mobile-drawer-pair-btn" onClick={() => { navigate(profileUrl); setOpen(false) }}>
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
            <div style={{ display: 'flex', gap: 8, padding: '16px 0 4px', borderTop: '1px solid var(--c-border)', marginTop: 4 }}>
              <button
                onClick={() => { navigate('/login'); setOpen(false) }}
                style={{ flex: 1, padding: '12px 0', background: 'transparent', border: '1px solid var(--c-border)', borderRadius: 10, color: 'var(--c-text)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
              >Entrar</button>
              <button
                onClick={() => { navigate('/register'); setOpen(false) }}
                style={{ flex: 1, padding: '12px 0', background: '#1b78f7', border: 'none', borderRadius: 10, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 16px rgba(27,120,247,0.3)' }}
              >Criar conta</button>
            </div>
          )}
        </div>
      )}

      <nav
        className="top-nav showo-nav-pad"
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
            src={theme === 'light' ? '/light_mode_LI.png' : '/logo.png'} alt="Showo" draggable={false}
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
                  onCreateProject={showCreateProject ? () => setCreateModal(true) : undefined}
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
              onClick={() => setCreateModal(true)}
              aria-label="Criar projeto"
              style={{
                background: '#1b78f7',
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
                border: `1px solid ${open ? '#1b78f7' : C.border}`,
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

      {/* ── Sidebar — desktop only (>860px) ── */}
      <div className="sidebar">
        {/* Logo */}
        <button className="sb-logo" onClick={() => navigate(user ? '/dashboard' : '/')}>
          <img src={theme === 'light' ? '/light_mode_LI.png' : '/icon_logo.png'} alt="Showo" style={{ height: 28, width: 'auto', objectFit: 'contain' }} />
        </button>
        <div className="sb-logo-divider" />

        {/* Main nav + project controls in one scrollable section */}
        <div className="sb-section">
          {user && isRecruiter ? (
            /* ── RECRUITER / EMPRESA sidebar ── */
            <>
              <button className={`sb-item${isActive('/dashboard') ? ' active' : ''}`} onClick={() => navigate('/dashboard')}>
                <LayoutDashboard size={16} /> Dashboard
              </button>

              <div className="sb-divider" style={{ margin: '8px 0 4px' }} />
              <span className="sb-label">Recrutamento</span>

              <button className={`sb-item${location.pathname === '/explorar' && new URLSearchParams(location.search).get('tab') === 'pessoas' ? ' active' : ''}`}
                onClick={() => navigate('/explorar?tab=pessoas')}
                style={{ color: isActive('/explorar') && new URLSearchParams(location.search).get('tab') === 'pessoas' ? recruiterAccent : undefined }}>
                <Users2 size={16} /> Candidatos
              </button>

              <button className={`sb-item${isActive('/vagas') ? ' active' : ''}`} onClick={() => navigate('/vagas')}>
                <Briefcase size={16} /> Vagas
              </button>

              <button className={`sb-item${isActive('/pipeline') ? ' active' : ''}`} onClick={() => navigate('/pipeline')}>
                <Kanban size={16} /> Pipeline
              </button>

              <button className={`sb-item${isActive('/candidatos') ? ' active' : ''}`} onClick={() => navigate('/candidatos')}>
                <Star size={16} /> Guardados
              </button>

              <button className={`sb-item${isActive('/mensagens') ? ' active' : ''}`} onClick={() => navigate('/mensagens')}
                style={{ position: 'relative' }}>
                <MessageSquare size={16} /> Mensagens
                {unreadMsgs > 0 && (
                  <span style={{ marginLeft: 'auto', background: '#1b78f7', color: '#fff', borderRadius: 99, minWidth: 18, height: 18, fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>
                    {unreadMsgs > 9 ? '9+' : unreadMsgs}
                  </span>
                )}
              </button>

              {user && (
                <button className={`sb-item${location.pathname === `/empresa/${user.id}` ? ' active' : ''}`}
                  onClick={() => navigate(`/empresa/${user.id}`)}>
                  <Building2 size={16} /> Minha empresa
                </button>
              )}

              <div className="sb-divider" style={{ margin: '8px 0 4px' }} />
              <span className="sb-label">Explorar</span>

              <button className={`sb-item${isActive('/explorar') && !new URLSearchParams(location.search).get('tab') ? ' active' : ''}`}
                onClick={() => navigate('/explorar')}>
                <Compass size={16} /> Projetos
              </button>

              {/* New vaga button */}
              <div style={{ margin: '10px 0 4px', padding: '0 0' }}>
                <button onClick={() => navigate('/vagas')}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '10px 0 4px', padding: '10px 14px', background: `linear-gradient(135deg, ${recruiterAccent}, #4f46e5)`, border: 'none', borderRadius: 10, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: `0 2px 14px ${recruiterAccent}44`, width: '100%' }}>
                  <Plus size={14} /> Nova vaga
                </button>
              </div>
            </>
          ) : (
            /* ── ALUNO / PROFESSOR sidebar ── */
            <>
              {user && (
                <button className={`sb-item${isActive('/dashboard') ? ' active' : ''}`} onClick={() => navigate('/dashboard')}>
                  <LayoutDashboard size={16} /> Dashboard
                </button>
              )}
              <button className={`sb-item${isActive('/explorar') ? ' active' : ''}`} onClick={() => navigate('/explorar')}>
                <Compass size={16} /> Explorar
              </button>
              <button className={`sb-item${isActive('/ranking') ? ' active' : ''}`} onClick={() => navigate('/ranking')}>
                <Trophy size={16} /> Ranking
              </button>

              {user && (
                <>
                  <div className="sb-divider" style={{ margin: '8px 0 4px' }} />
                  <span className="sb-label">Oportunidades</span>
                  <button className={`sb-item${isActive('/vagas') ? ' active' : ''}`} onClick={() => navigate('/vagas')}>
                    <Briefcase size={16} /> Vagas
                  </button>
                  <button className="sb-item" disabled style={{ opacity: 0.45, cursor: 'default' }}>
                    <Building2 size={16} /> Estágio
                    <span className="sb-soon">breve</span>
                  </button>

                  <div className="sb-divider" style={{ margin: '8px 0 4px' }} />
                  <span className="sb-label">Comunidade</span>
                  <button className={`sb-item${isActive('/missoes') ? ' active' : ''}`} onClick={() => navigate('/missoes')}>
                    <Swords size={16} /> Missões
                  </button>
                  <button className={`sb-item${isActive('/turmas') ? ' active' : ''}`} onClick={() => navigate('/turmas')}>
                    <Users2 size={16} /> Turmas
                  </button>
                  <button className={`sb-item${isActive('/conquistas') ? ' active' : ''}`} onClick={() => navigate('/conquistas')}>
                    <Medal size={16} /> Conquistas
                  </button>

                  <div className="sb-divider" style={{ margin: '8px 0 4px' }} />
                  <button className="sb-item" disabled style={{ opacity: 0.45, cursor: 'default' }}>
                    <FolderOpen size={16} /> Portfólio
                    <span className="sb-soon">breve</span>
                  </button>
                </>
              )}

              {user && (
                <div className={`sb-create-wrap ${extras ? 'hidden' : 'visible'}`}>
                  <div className="sb-create-inner">
                    <button className="sb-create" onClick={() => setCreateModal(true)}>
                      <Plus size={14} /> Criar projeto
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Project controls — immediately after nav, no gap */}
          {extras?.type === 'project' && (
            <div className="sb-project-section">
              {/* Back to project (shown when on sub-page like edit/cert) */}
              {extras.showBack && (
                <button className="sb-item" onClick={() => navigate(`/projeto/${extras.slug}`)}>
                  <ArrowLeft size={16} /> Ver projeto
                </button>
              )}
              <span className="sb-label">Gerir projeto</span>
              {!extras.showBack && (
                <button className="sb-item" onClick={() => navigate(`/editar/${extras.slug}`)}>
                  <Pencil size={16} /> Editar
                </button>
              )}
              {extras.onDefense && (
                <button className="sb-item" onClick={extras.onDefense}>
                  <GraduationCap size={16} />
                  Modo defesa
                  {extras.defenseDate && (
                    <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--c-muted)', fontWeight: 500 }}>
                      {new Date(extras.defenseDate).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' })}
                    </span>
                  )}
                </button>
              )}
              {extras.onAnalyze && (
                <button
                  className="sb-item"
                  onClick={extras.onAnalyze}
                  disabled={extras.analyzingAI}
                  style={{ opacity: extras.analyzingAI ? 0.6 : 1 }}
                >
                  <Sparkles size={16} />
                  {extras.analyzingAI ? 'A analisar…' : 'Análise IA'}
                  {extras.aiScore != null && !extras.analyzingAI && (
                    <span style={{
                      marginLeft: 'auto', fontSize: 11, fontWeight: 700,
                      color: extras.aiScore >= 90 ? '#22c55e' : extras.aiScore >= 71 ? '#1b78f7' : extras.aiScore >= 40 ? '#fbbf24' : '#ef4444',
                    }}>
                      {extras.aiScore}
                    </span>
                  )}
                </button>
              )}
              <button className="sb-item" onClick={() => navigate(`/certificado/${extras.slug}`)}>
                <Trophy size={16} /> Certificado
              </button>
              {extras.onTogglePublicView && (
                <button
                  className="sb-item"
                  onClick={extras.onTogglePublicView}
                  style={{ color: extras.viewAsPublic ? C.blue : 'var(--c-muted)' }}
                >
                  <Globe size={16} />
                  {extras.viewAsPublic ? 'Sair da preview' : 'Preview visitante'}
                </button>
              )}
            </div>
          )}
        </div>

        <div className="sb-divider" />

        {/* Bottom — user section */}
        <div className="sb-bottom">
          {user ? (
            <>
              {/* Profile row + notifications + theme toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '0 4px 2px' }}>
                {profileUrl && (
                  <button className={`sb-item${isActive('profile') ? ' active' : ''}`} style={{ flex: 1, margin: 0 }} onClick={() => navigate(profileUrl)}>
                    <AvatarCircle avatarUrl={profile?.avatar_url} initial={getInitial(user)} size={20} fontSize={9} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{getDisplayName(user)}</span>
                  </button>
                )}
                {/* Theme toggle */}
                <button
                  onClick={toggleTheme}
                  title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
                  style={{
                    flexShrink: 0, width: 32, height: 32, borderRadius: 8,
                    background: 'transparent', border: 'none',
                    color: 'var(--c-muted)', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'background 0.13s, color 0.13s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--c-card-hover)'; e.currentTarget.style.color = 'var(--c-text)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--c-muted)' }}
                >
                  {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
                </button>
                {/* Mensagens — compact icon with badge */}
                <button
                  onClick={() => navigate('/mensagens')}
                  title="Mensagens"
                  style={{
                    flexShrink: 0, width: 32, height: 32, borderRadius: 8,
                    background: isActive('/mensagens') ? 'rgba(27,120,247,0.13)' : 'transparent',
                    border: 'none',
                    color: isActive('/mensagens') ? '#1b78f7' : 'var(--c-muted)',
                    cursor: 'pointer', position: 'relative',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'background 0.13s, color 0.13s',
                  }}
                  onMouseEnter={e => { if (!isActive('/mensagens')) { e.currentTarget.style.background = 'var(--c-card-hover)'; e.currentTarget.style.color = 'var(--c-text)' } }}
                  onMouseLeave={e => { if (!isActive('/mensagens')) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--c-muted)' } }}
                >
                  <MessageSquare size={15} />
                  {unreadMsgs > 0 && (
                    <span style={{
                      position: 'absolute', top: 3, right: 3,
                      width: 8, height: 8, borderRadius: '50%',
                      background: '#1b78f7', border: '1.5px solid var(--c-sidebar-bg)',
                    }} />
                  )}
                </button>
                <InviteInbox userId={user.id} sidebar={true} />
              </div>
              <button className="sb-item" onClick={() => navigate('/settings')}>
                <SettingsIcon size={16} /> Definições
              </button>
              <button className="sb-item danger" onClick={handleSignOut}>
                <LogOut size={16} /> Sair
              </button>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '0 4px 2px' }}>
                <button className="sb-item" style={{ flex: 1, margin: 0 }} onClick={() => navigate('/login')}>Entrar</button>
                <button
                  onClick={toggleTheme}
                  title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
                  style={{
                    flexShrink: 0, width: 32, height: 32, borderRadius: 8,
                    background: 'transparent', border: 'none',
                    color: 'var(--c-muted)', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'background 0.13s, color 0.13s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--c-card-hover)'; e.currentTarget.style.color = 'var(--c-text)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--c-muted)' }}
                >
                  {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
                </button>
              </div>
              <button className="sb-item active" onClick={() => navigate('/register')}>Criar conta</button>
            </>
          )}
        </div>
      </div>

      {/* ── Mobile full-navigation sheet (≤600px) ── */}
      {menuOpen && (
        <>
          <div className="mob-menu-overlay" onClick={() => setMenuOpen(false)} />
          <div className="mob-menu-sheet">
            <div className="mob-sheet-handle" onClick={() => setMenuOpen(false)} />
            <div className="mob-sheet-scroll">

              {/* User header */}
              {user ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 12px 14px' }}>
                  <button
                    style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0, textAlign: 'left', minWidth: 0 }}
                    onClick={() => { profileUrl && navigate(profileUrl); setMenuOpen(false) }}
                  >
                    <AvatarCircle avatarUrl={profile?.avatar_url} initial={getInitial(user)} size={44} fontSize={17} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--c-text)' }}>{getDisplayName(user)}</div>
                      <div style={{ fontSize: 12, color: 'var(--c-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</div>
                    </div>
                  </button>
                  <button onClick={toggleTheme} style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--c-bg-alt)', border: '1px solid var(--c-border)', color: 'var(--c-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
                  </button>
                </div>
              ) : (
                <div style={{ padding: '16px 12px 12px', display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button onClick={() => { navigate('/login'); setMenuOpen(false) }} style={{ flex: 1, padding: '13px 0', background: 'transparent', border: '1px solid var(--c-border)', borderRadius: 10, color: 'var(--c-text)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Entrar</button>
                  <button onClick={() => { navigate('/register'); setMenuOpen(false) }} style={{ flex: 1, padding: '13px 0', background: '#1b78f7', border: 'none', borderRadius: 10, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Criar conta</button>
                  <button onClick={toggleTheme} style={{ width: 46, height: 46, borderRadius: 10, background: 'var(--c-bg-alt)', border: '1px solid var(--c-border)', color: 'var(--c-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
                  </button>
                </div>
              )}

              {/* ── Criar projeto — no hamburger quando pincel está no centro ── */}
              {previewEditingMobile && user && (
                <>
                  <span className="mob-nav-section-label">Ações</span>
                  <button className="mob-nav-btn" onClick={() => { setMenuOpen(false); setCreateModal(true) }}>
                    <Plus size={20} /> Criar projeto
                  </button>
                  <div className="mob-nav-divider" />
                </>
              )}

              {/* ── Gerir projeto — PRIMEIRO quando em projeto próprio ── */}
              {extras?.type === 'project' && (
                <>
                  <div className="mob-project-section" style={{ marginTop: 4 }}>
                    <span className="mob-nav-section-label">Gerir projeto</span>
                    {extras.showBack && (
                      <button className="mob-nav-btn" onClick={() => { navigate(`/projeto/${extras.slug}`); setMenuOpen(false) }}>
                        <ArrowLeft size={20} /> Ver projeto
                      </button>
                    )}
                    {!extras.showBack && (
                      <button className="mob-nav-btn" onClick={() => { navigate(`/editar/${extras.slug}`); setMenuOpen(false) }}>
                        <Pencil size={20} /> Editar
                      </button>
                    )}
                    {extras.onDefense && (
                      <button className="mob-nav-btn" onClick={() => { extras.onDefense(); setMenuOpen(false) }}>
                        <GraduationCap size={20} /> Modo defesa
                        {extras.defenseDate && (
                          <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--c-muted)', fontWeight: 500 }}>
                            {new Date(extras.defenseDate).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' })}
                          </span>
                        )}
                      </button>
                    )}
                    {extras.onAnalyze && (
                      <button className="mob-nav-btn" onClick={() => { extras.onAnalyze(); setMenuOpen(false) }} disabled={extras.analyzingAI} style={{ opacity: extras.analyzingAI ? 0.6 : 1 }}>
                        <Sparkles size={20} /> {extras.analyzingAI ? 'A analisar…' : 'Análise IA'}
                        {extras.aiScore != null && !extras.analyzingAI && (
                          <span style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 700, color: extras.aiScore >= 90 ? '#22c55e' : extras.aiScore >= 71 ? '#1b78f7' : extras.aiScore >= 40 ? '#fbbf24' : '#ef4444' }}>
                            {extras.aiScore}
                          </span>
                        )}
                      </button>
                    )}
                    <button className="mob-nav-btn" onClick={() => { navigate(`/certificado/${extras.slug}`); setMenuOpen(false) }}>
                      <Trophy size={20} /> Certificado
                    </button>
                    {extras.onTogglePublicView && (
                      <button className="mob-nav-btn" style={{ color: extras.viewAsPublic ? '#1b78f7' : undefined }}
                        onClick={() => { extras.onTogglePublicView(); setMenuOpen(false) }}>
                        <Globe size={20} /> {extras.viewAsPublic ? 'Sair da preview' : 'Preview visitante'}
                      </button>
                    )}
                  </div>
                  <div className="mob-nav-divider" />
                </>
              )}

              {/* Role-based nav sections */}
              {isRecruiter ? (
                <>
                  <button className={`mob-nav-btn${isActive('/dashboard') ? ' active' : ''}`} onClick={() => { navigate('/dashboard'); setMenuOpen(false) }}>
                    <LayoutDashboard size={20} /> Dashboard
                  </button>
                  <span className="mob-nav-section-label">Recrutamento</span>
                  <button className={`mob-nav-btn${isActive('/explorar') && new URLSearchParams(location.search).get('tab') === 'pessoas' ? ' active' : ''}`}
                    onClick={() => { navigate('/explorar?tab=pessoas'); setMenuOpen(false) }}>
                    <Users2 size={20} /> Candidatos
                  </button>
                  <button className={`mob-nav-btn${isActive('/vagas') ? ' active' : ''}`} onClick={() => { navigate('/vagas'); setMenuOpen(false) }}>
                    <Briefcase size={20} /> Vagas
                  </button>
                  <button className={`mob-nav-btn${isActive('/pipeline') ? ' active' : ''}`} onClick={() => { navigate('/pipeline'); setMenuOpen(false) }}>
                    <Kanban size={20} /> Pipeline
                  </button>
                  <button className={`mob-nav-btn${isActive('/candidatos') ? ' active' : ''}`} onClick={() => { navigate('/candidatos'); setMenuOpen(false) }}>
                    <Star size={20} /> Guardados
                  </button>
                  <button className={`mob-nav-btn${isActive('/mensagens') ? ' active' : ''}`} onClick={() => { navigate('/mensagens'); setMenuOpen(false) }}>
                    <MessageSquare size={20} /> Mensagens
                    {unreadMsgs > 0 && <span style={{ marginLeft: 'auto', background: '#1b78f7', color: '#fff', borderRadius: 99, minWidth: 18, height: 18, fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>{unreadMsgs > 9 ? '9+' : unreadMsgs}</span>}
                  </button>
                  {user && (
                    <button className={`mob-nav-btn${location.pathname === `/empresa/${user.id}` ? ' active' : ''}`}
                      onClick={() => { navigate(`/empresa/${user.id}`); setMenuOpen(false) }}>
                      <Building2 size={20} /> Minha empresa
                    </button>
                  )}
                  <span className="mob-nav-section-label">Explorar</span>
                  <button className={`mob-nav-btn${isActive('/explorar') && !new URLSearchParams(location.search).get('tab') ? ' active' : ''}`}
                    onClick={() => { navigate('/explorar'); setMenuOpen(false) }}>
                    <Compass size={20} /> Projetos
                  </button>
                  <button className={`mob-nav-btn${isActive('/ranking') ? ' active' : ''}`} onClick={() => { navigate('/ranking'); setMenuOpen(false) }}>
                    <Trophy size={20} /> Ranking
                  </button>
                </>
              ) : (
                <>
                  {user && (
                    <button className={`mob-nav-btn${isActive('/dashboard') ? ' active' : ''}`} onClick={() => { navigate('/dashboard'); setMenuOpen(false) }}>
                      <LayoutDashboard size={20} /> Dashboard
                    </button>
                  )}
                  <button className={`mob-nav-btn${isActive('/explorar') ? ' active' : ''}`} onClick={() => { navigate('/explorar'); setMenuOpen(false) }}>
                    <Compass size={20} /> Explorar
                  </button>
                  <button className={`mob-nav-btn${isActive('/ranking') ? ' active' : ''}`} onClick={() => { navigate('/ranking'); setMenuOpen(false) }}>
                    <Trophy size={20} /> Ranking
                  </button>
                  {user && (
                    <>
                      <span className="mob-nav-section-label">Oportunidades</span>
                      <button className={`mob-nav-btn${isActive('/vagas') ? ' active' : ''}`} onClick={() => { navigate('/vagas'); setMenuOpen(false) }}>
                        <Briefcase size={20} /> Vagas
                      </button>
                      <button className="mob-nav-btn" style={{ opacity: 0.45, cursor: 'default' }} disabled>
                        <Building2 size={20} /> Estágio <span className="mob-nav-soon">breve</span>
                      </button>
                      <span className="mob-nav-section-label">Comunidade</span>
                      <button className={`mob-nav-btn${isActive('/missoes') ? ' active' : ''}`} onClick={() => { navigate('/missoes'); setMenuOpen(false) }}>
                        <Swords size={20} /> Missões
                      </button>
                      <button className={`mob-nav-btn${isActive('/turmas') ? ' active' : ''}`} onClick={() => { navigate('/turmas'); setMenuOpen(false) }}>
                        <Users2 size={20} /> Turmas
                      </button>
                      <button className={`mob-nav-btn${isActive('/conquistas') ? ' active' : ''}`} onClick={() => { navigate('/conquistas'); setMenuOpen(false) }}>
                        <Medal size={20} /> Conquistas
                      </button>
                      <button className="mob-nav-btn" style={{ opacity: 0.45, cursor: 'default' }} disabled>
                        <FolderOpen size={20} /> Portfólio <span className="mob-nav-soon">breve</span>
                      </button>
                    </>
                  )}
                </>
              )}

              <div className="mob-nav-divider" />

              {/* Profile / admin / settings / logout */}
              {user && (
                <>
                  {profileUrl && (
                    <button className={`mob-nav-btn${isActive('profile') ? ' active' : ''}`} onClick={() => { navigate(profileUrl); setMenuOpen(false) }}>
                      <User size={20} /> Meu perfil
                    </button>
                  )}
                  {isAdmin && (
                    <button className="mob-nav-btn" onClick={() => { navigate('/admin'); setMenuOpen(false) }} style={{ color: '#a855f7' }}>
                      <Shield size={20} /> Administração
                    </button>
                  )}
                  <button className={`mob-nav-btn${isActive('/settings') ? ' active' : ''}`} onClick={() => { navigate('/settings'); setMenuOpen(false) }}>
                    <SettingsIcon size={20} /> Definições
                  </button>
                  <button className="mob-nav-btn danger" onClick={() => { handleSignOut(); setMenuOpen(false) }}>
                    <LogOut size={20} /> Sair
                  </button>
                </>
              )}

            </div>
          </div>
        </>
      )}

      {/* ── Bottom navigation bar — mobile only (≤600px) ── */}
      <div className="bottom-nav">
        {user ? (
          <>
            {/* Dashboard */}
            <button
              className={`bn-item${isActive('/dashboard') ? ' active' : ''}`}
              onClick={() => { setMenuOpen(false); navigate('/dashboard') }}
            >
              <LayoutDashboard size={24} strokeWidth={isActive('/dashboard') ? 2.5 : 1.8} />
            </button>

            {/* Explorar */}
            <button
              className={`bn-item${isActive('/explorar') ? ' active' : ''}`}
              onClick={() => { setMenuOpen(false); navigate('/explorar') }}
            >
              <Compass size={24} strokeWidth={isActive('/explorar') ? 2.5 : 1.8} />
            </button>

            {/* Centro — workspace em preview mode, + em modo normal */}
            <div className="bn-create-wrap">
              {previewEditingMobile ? (
                <button
                  className="bn-create-btn"
                  onClick={onWorkspaceToggle}
                  aria-label="Editor de preview"
                  style={{ color: '#1b78f7' }}
                >
                  <Paintbrush size={24} strokeWidth={2} />
                </button>
              ) : (
                <button className="bn-create-btn" onClick={() => { setMenuOpen(false); setCreateModal(true) }} aria-label="Criar projeto">
                  <Plus size={26} strokeWidth={2} />
                </button>
              )}
            </div>

            {/* Mensagens */}
            <button
              className={`bn-item${isActive('/mensagens') ? ' active' : ''}`}
              onClick={() => { setMenuOpen(false); navigate('/mensagens') }}
              aria-label="Mensagens"
              style={{ position: 'relative' }}
            >
              <MessageSquare size={22} strokeWidth={isActive('/mensagens') ? 2.5 : 1.8} />
              {unreadMsgs > 0 && (
                <span style={{ position: 'absolute', top: 8, left: 'calc(50% + 5px)', width: 7, height: 7, borderRadius: '50%', background: '#ef4444', border: '1.5px solid rgba(13,20,36,0.97)' }} />
              )}
            </button>

            {/* Menu — abre o sheet */}
            <button
              className={`bn-item${menuOpen ? ' active' : ''}`}
              onClick={() => setMenuOpen(o => !o)}
              aria-label="Menu"
            >
              <AlignJustify size={22} strokeWidth={menuOpen ? 2.5 : 1.8} />
            </button>
          </>
        ) : (
          <>
            {/* Explorar */}
            <button
              className={`bn-item${isActive('/explorar') ? ' active' : ''}`}
              onClick={() => navigate('/explorar')}
            >
              <Compass size={22} strokeWidth={isActive('/explorar') ? 2.5 : 1.8} />
            </button>

            {/* Ranking */}
            <button
              className={`bn-item${isActive('/ranking') ? ' active' : ''}`}
              onClick={() => navigate('/ranking')}
            >
              <Trophy size={22} strokeWidth={isActive('/ranking') ? 2.5 : 1.8} />
            </button>

            {/* Entrar */}
            <button
              className={`bn-item${isActive('/login') ? ' active' : ''}`}
              onClick={() => navigate('/login')}
              style={{ color: isActive('/login') ? '#1b78f7' : 'var(--c-text)' }}
            >
              <User size={22} strokeWidth={1.8} />
            </button>
          </>
        )}
      </div>

      {createModal && <CreateProjectModal onClose={() => setCreateModal(false)} />}
    </>
  )
}
