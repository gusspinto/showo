import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { useSidebar } from '../context/SidebarContext'
import { supabase } from '../lib/supabase'
import { CheckCircleIcon as Check } from '@solar-icons/react/bold/check-circle'
import { CloseIcon as X } from '@solar-icons/react/bold/close'
import { Folder2Icon as FolderOpen } from '@solar-icons/react/bold/folder-2'
import { UserIcon as User } from '@solar-icons/react/bold/user'
import { SettingsIcon as SettingsIcon } from '@solar-icons/react/bold/settings'
import { ShieldCheckIcon as Shield } from '@solar-icons/react/bold/shield-check'
import { GlobeIcon as Globe } from '@solar-icons/react/bold/globe'
import { CupStarIcon as Trophy } from '@solar-icons/react/bold/cup-star'
import { Logout2Icon as LogOut } from '@solar-icons/react/bold/logout-2'
import { DoubleAltArrowRightIcon as ArrowRightToLine } from '@solar-icons/react/bold/double-alt-arrow-right'
import { BellIcon as Bell } from '@solar-icons/react/bold/bell'
import { EyeIcon as Eye } from '@solar-icons/react/bold/eye'
import { TargetIcon as Target } from '@solar-icons/react/bold/target'
import { GraphNewUpIcon as TrendingUp } from '@solar-icons/react/bold/graph-new-up'
import { SquareAcademicCapIcon as GraduationCap } from '@solar-icons/react/bold/square-academic-cap'
import { UserPlusRoundedIcon as UserPlus } from '@solar-icons/react/bold/user-plus-rounded'
import { Widget4Icon as LayoutDashboard } from '@solar-icons/react/bold/widget-4'
import { PlusIcon as Plus } from './icons/PlusIcon'
import { CompassIcon as Compass } from '@solar-icons/react/bold/compass'
import { LibraryIcon } from '@solar-icons/react/bold/library'
import { Sun2Icon as Sun } from '@solar-icons/react/bold/sun-2'
import { MoonIcon as Moon } from '@solar-icons/react/bold/moon'
import { StarsIcon as Sparkles } from '@solar-icons/react/bold/stars'
import { Pen2Icon as Pencil } from '@solar-icons/react/bold/pen-2'
import { ArrowLeftIcon as ArrowLeft } from '@solar-icons/react/bold/arrow-left'
import { CaseIcon as Briefcase } from '@solar-icons/react/bold/case'
import { UsersGroupTwoRoundedIcon as Users2 } from '@solar-icons/react/bold/users-group-two-rounded'
import { Buildings2Icon as Building2 } from '@solar-icons/react/bold/buildings-2'
import { MagnifierIcon as Search } from '@solar-icons/react/bold/magnifier'
import { StarIcon as Star } from '@solar-icons/react/bold/star'
import { ChatRoundLineIcon as MessageSquare } from '@solar-icons/react/bold/chat-round-line'
import { Widget5Icon as Kanban } from '@solar-icons/react/bold/widget-5'
import { HeartIcon as Heart } from '@solar-icons/react/bold/heart'
import { CheckCircleIcon as CheckCircle } from '@solar-icons/react/bold/check-circle'
import { CloseCircleIcon as XCircle } from '@solar-icons/react/bold/close-circle'
import { AlignHorizontalSpacingIcon as AlignJustify } from '@solar-icons/react/bold/align-horizontal-spacing'
import { PaintRollerIcon as Paintbrush } from '@solar-icons/react/bold/paint-roller'
import { LetterIcon as Mail } from '@solar-icons/react/bold/letter'
import { AltArrowRightIcon as ChevronRight } from '@solar-icons/react/bold/alt-arrow-right'
import { MonitorIcon as Monitor } from '@solar-icons/react/bold/monitor'
import { TabletIcon as Tablet } from '@solar-icons/react/bold/tablet'
import { SmartphoneIcon as Smartphone } from '@solar-icons/react/bold/smartphone'
import { ChecklistIcon as ListChecks } from '@solar-icons/react/bold/checklist'
import { CheckCircleIcon as CheckCircle2 } from '@solar-icons/react/bold/check-circle'
import { BookBookmarkIcon as BookMarked } from '@solar-icons/react/bold/book-bookmark'
import { Book2Icon as BookOpen } from '@solar-icons/react/bold/book-2'
import { BugIcon as Bug } from '@solar-icons/react/bold/bug'

// Strip emoji characters from notification messages coming from the DB
function stripEmoji(str) {
  if (!str) return str
  return str.replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27FF}\u{2900}-\u{297F}\u{1F300}-\u{1F9FF}\u{FE00}-\u{FEFF}]/gu, '').replace(/\s{2,}/g, ' ').trim()
}
import './Navbar.css'

const C = {
  bg: 'var(--color-sidebar-bg)',
  border: 'var(--color-border)',
  blue: 'var(--color-text)',
  muted: 'var(--color-text-secondary)',
  text: 'var(--color-text)',
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
    case 'TASK_ASSIGNED':    return <ListChecks {...s} />
    case 'TASK_COMPLETED':   return <CheckCircle2 {...s} />
    case 'PROJECT_RESUBMITTED': return <CheckCircle2 {...s} />
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

// Role colors mirror Home.jsx's role picker (aluno/professor/recrutador-empresa) —
// only applied where the acting role is actually knowable from the notification
// type; view/like/comment notifications stay neutral since the actor is anonymous.
function getNotifColor(type) {
  switch (type) {
    case 'SCORE_MILESTONE':
    case 'RANKING_CHANGE':
    case 'MISSION_COMPLETE':
    case 'STUDENT_JOINED':
    case 'NEW_CANDIDATURA':
    case 'TASK_COMPLETED':
    case 'PROJECT_RESUBMITTED':
      return 'var(--color-primary)'
    case 'TEACHER_FEEDBACK':
    case 'TASK_ASSIGNED':
      return 'var(--color-success)'
    case 'RECRUITER_INTEREST':
    case 'VAGA_INVITE':
    case 'CANDIDATURA_ACEITE':
    case 'CANDIDATURA_RECUSADA':
      return 'var(--color-accent)'
    default:
      return null
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

function InviteInbox({ userId, sidebar = false, collapsed = false }) {
  const navigate = useNavigate()
  const [open, setOpen]     = useState(false)
  const notifRef = useRef(null)
  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (notifRef.current && !notifRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])
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

  async function clearAll() {
    if (dbNotifs.length > 0) {
      await supabase.from('notifications').delete().eq('user_id', userId)
      setDbNotifs([])
    }
    if (responses.length > 0) {
      setResponses([])
      try { sessionStorage.removeItem(`owner-notifs-${userId}`) } catch {}
    }
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
    // Single server-side join (get_pending_invites RPC) instead of 3
    // sequential round trips (invite rows -> project names -> inviter
    // names) — this ran on every page load for every logged-in user.
    const { data: rows, error } = await supabase.rpc('get_pending_invites')
    if (error || !rows?.length) { setInvites([]); return }

    const enriched = rows.map(r => ({
      id: r.id,
      project_id: r.project_id,
      invited_by: r.invited_by,
      sections: r.sections,
      projectName: r.project_name ?? 'Projeto',
      projectSlug: r.project_slug ?? '',
      inviterName: r.inviter_name || null,
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
    <div ref={notifRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position: 'relative',
          background: open ? 'color-mix(in srgb, var(--color-text) 13%, transparent)' : 'transparent',
          border: 'none',
          borderRadius: sidebar ? 8 : 8, width: sidebar ? 32 : 44, height: sidebar ? 32 : 44,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: open ? 'var(--color-text)' : 'var(--color-text-secondary)',
          transition: 'background 0.13s, color 0.13s', flexShrink: 0,
        }}
        onMouseEnter={e => { if (!open) { e.currentTarget.style.background = 'var(--color-surface-hover)'; e.currentTarget.style.color = 'var(--color-text)' } }}
        onMouseLeave={e => { if (!open) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-text-secondary)' } }}
        title="Notificações"
      >
        <Bell size={sidebar ? 16 : 15} />
        {count > 0 && (
          <span style={{
            position: 'absolute', top: -4, right: -4,
            background: 'var(--color-error)', borderRadius: '50%',
            width: 15, height: 15, fontSize: 8, fontWeight: 800,
            color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid var(--color-bg)',
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
                ? { position: 'fixed', left: collapsed ? 80 : 248, bottom: 16, transition: 'left 0.25s cubic-bezier(0.22,1,0.36,1)' }
                : { position: 'absolute', top: 'calc(100% + 8px)', right: 0 }
              ),
              background: 'var(--color-surface)', border: `1px solid var(--color-border)`,
              borderRadius: 14, padding: '8px',
              boxShadow: '0 8px 40px rgba(0,0,0,0.45)',
              backdropFilter: 'blur(16px)',
              zIndex: 199, width: 310,
              maxHeight: 'calc(100dvh - 80px)', overflowY: 'auto',
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
                      background: 'color-mix(in srgb, var(--color-text) 5%, transparent)', border: '1px solid color-mix(in srgb, var(--color-text) 15%, transparent)',
                      borderRadius: 10, padding: '12px 14px', marginBottom: 6,
                    }}>
                      <p style={{ margin: '0 0 2px', fontSize: 14, fontWeight: 700, color: C.text }}>{invite.projectName}</p>
                      <p style={{ margin: '0 0 12px', fontSize: 12, color: C.muted }}>Convidado por {invitedBy}</p>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          onClick={() => respond(invite, 'accepted')} disabled={isActing}
                          style={{ flex: 1, padding: '7px 0', background: 'var(--color-text)', border: 'none', borderRadius: 7, color: '#fff', fontSize: 12, fontWeight: 700, cursor: isActing ? 'default' : 'pointer', fontFamily: 'inherit' }}
                        >{acting[invite.id] === 'accepted' ? '...' : <><Check size={12} style={{ verticalAlign: 'middle', marginRight: 3 }} />Aceitar</>}</button>
                        <button
                          onClick={() => respond(invite, 'declined')} disabled={isActing}
                          style={{ flex: 1, padding: '7px 0', background: 'transparent', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 7, color: 'var(--color-error)', fontSize: 12, fontWeight: 600, cursor: isActing ? 'default' : 'pointer', fontFamily: 'inherit' }}
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
                        ? <Check size={16} color="var(--color-success)" />
                        : <X size={16} color="var(--color-error)" />}
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {unreadDbCount > 0 && (
                      <button
                        onClick={markAllRead}
                        style={{ background: 'none', border: 'none', color: C.blue, fontSize: 11, fontWeight: 600, cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}
                      >
                        Marcar todas como lidas
                      </button>
                    )}
                    <button
                      onClick={clearAll}
                      style={{ background: 'none', border: 'none', color: C.muted, fontSize: 11, fontWeight: 600, cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}
                      onMouseEnter={e => e.currentTarget.style.color = 'var(--color-error)'}
                      onMouseLeave={e => e.currentTarget.style.color = C.muted}
                    >
                      Limpar todas
                    </button>
                  </div>
                </div>
                {grouped.map(n => {
                  const roleColor = getNotifColor(n.type)
                  return (
                  <div
                    key={n.id}
                    onClick={(e) => {
                      if (e.target.closest('[data-delete]')) return
                      markRead(n.groupIds)
                      if (n.project_slug) { navigate(`/projeto/${n.project_slug}`); setOpen(false) }
                    }}
                    style={{
                      borderRadius: 10, padding: '10px 12px', marginBottom: 4,
                      background: n.anyUnread ? `color-mix(in srgb, ${roleColor || 'var(--color-text)'} 5%, transparent)` : 'transparent',
                      border: `1px solid ${n.anyUnread ? `color-mix(in srgb, ${roleColor || 'var(--color-text)'} 12%, transparent)` : 'transparent'}`,
                      borderLeft: n.anyUnread ? `3px solid ${roleColor || 'color-mix(in srgb, var(--color-text) 50%, transparent)'}` : '3px solid transparent',
                      cursor: n.project_slug ? 'pointer' : 'default',
                      display: 'flex', alignItems: 'flex-start', gap: 10,
                      transition: 'background 0.12s',
                    }}
                  >
                    <span style={{ display: 'flex', flexShrink: 0, marginTop: 1, color: roleColor || C.muted }}>{getNotifIcon(n.type)}</span>
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
                      {n.anyUnread && <div style={{ width: 6, height: 6, borderRadius: '50%', background: roleColor || C.blue }} />}
                      <button
                        data-delete
                        onClick={() => deleteNotifs(n.groupIds)}
                        title="Apagar notificação"
                        style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', padding: '2px 3px', borderRadius: 4, display: 'flex', alignItems: 'center', opacity: 0.6, transition: 'opacity 0.12s, color 0.12s', lineHeight: 1 }}
                        onMouseEnter={e => { e.currentTarget.style.opacity = 1; e.currentTarget.style.color = 'var(--color-error)' }}
                        onMouseLeave={e => { e.currentTarget.style.opacity = 0.6; e.currentTarget.style.color = C.muted }}
                      >
                        <X size={13} />
                      </button>
                    </div>
                  </div>
                  )
                })}
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
      background: 'var(--color-text)',
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
          background: open ? 'var(--color-surface-hover)' : 'transparent',
          border: `1px solid ${open ? 'var(--color-border-hover)' : C.border}`,
          borderRadius: 24, padding: '5px 12px 5px 6px',
          cursor: 'pointer', fontFamily: 'inherit',
          transition: 'background 0.15s, border-color 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-surface-hover)'; e.currentTarget.style.borderColor = 'var(--color-border-hover)' }}
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
            background: 'var(--color-surface)', border: `1px solid ${C.border}`,
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
                  onMouseEnter={e => e.currentTarget.style.background = 'color-mix(in srgb, var(--color-text) 8%, transparent)'}
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
              onMouseEnter={e => e.currentTarget.style.background = 'var(--color-surface-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><FolderOpen size={15} /> Dashboard</span>
            </button>
            {onProfile && (
              <button
                onClick={() => { onProfile(); setOpen(false) }}
                style={{ ...dropItemStyle, color: C.text }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--color-surface-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><User size={15} /> Meu perfil</span>
              </button>
            )}
            <button
              onClick={() => { onSettings(); setOpen(false) }}
              style={{ ...dropItemStyle, color: C.text }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--color-surface-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><SettingsIcon size={15} /> Definições</span>
            </button>
            <div style={{ height: 1, background: C.border, margin: '4px 6px' }} />
            <button
              onClick={() => { onSignOut(); setOpen(false) }}
              style={{ ...dropItemStyle, color: 'var(--color-error)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <LogOut size={18} /> Sair
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

export function Navbar({ children, showLinks = true, showCreateProject = false, previewEditingMobile = false, onWorkspaceToggle, hideSidebar = false, mobileLeft = null }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, profile, signOut, isAdmin, isSchoolAccount } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { extras } = useSidebar()
  const [open, setOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  // Keeps the mobile menu sheet mounted for one extra animation cycle after
  // menuOpen flips to false, so the closing slide-down/fade can actually play
  // instead of the sheet just vanishing — every existing setMenuOpen(false)
  // call site stays untouched, this just delays the unmount.
  const [menuRendered, setMenuRendered] = useState(false)
  useEffect(() => {
    if (menuOpen) { setMenuRendered(true); return }
    if (!menuRendered) return
    const t = setTimeout(() => setMenuRendered(false), 220)
    return () => clearTimeout(t)
  }, [menuOpen, menuRendered])
  // Lock background scroll while the drawer is open — otherwise the page slides
  // behind the overlay when you drag, which reads as broken on a phone.
  useEffect(() => {
    if (!menuOpen) return
    document.body.classList.add('drawer-open')
    return () => document.body.classList.remove('drawer-open')
  }, [menuOpen])
  // Botão "Criar projeto" com gradiente — no desktop (rato de verdade), o
  // brilho segue o cursor dentro do botão via custom properties, sem tocar
  // em React state (mousemove é demasiado frequente para re-render).
  // Em touch simplesmente nunca dispara, o botão fica só com o gradiente
  // estático das três cores.
  const handleGradientMove = (e) => {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    e.currentTarget.style.setProperty('--mx', `${x}%`)
    e.currentTarget.style.setProperty('--my', `${y}%`)
  }
  const handleGradientLeave = (e) => {
    e.currentTarget.style.removeProperty('--mx')
    e.currentTarget.style.removeProperty('--my')
  }

  // Mobile "Gerir projeto" popup — opened from the paintbrush that replaces the
  // "+" while viewing your own project (keeps those actions out of the drawer).
  const [projMenuOpen, setProjMenuOpen] = useState(false)
  useEffect(() => { setProjMenuOpen(false) }, [location.pathname])
  // Sidebar is icon-only by default and expands on sustained hover — no manual
  // toggle button (manual open/close — hover-to-expand was costing too much on
  // weaker machines since it fired constantly just from moving the mouse near
  // the rail). Page layout always reserves the narrow width; the expanded
  // sidebar overlays the page (GPU composited, no reflow).
  const [expanded, setExpanded] = useState(() => {
    try { return localStorage.getItem('showo_sidebar_expanded') === '1' } catch { return false }
  })
  const collapsed = !expanded
  // Labels mount only once the width transition has settled, so the
  // (text-heavy, reflow-heavy) expanded layout is never computed mid-animation —
  // during the transition itself the sidebar stays icon-only, which is cheap to
  // resize every frame. This is what keeps the toggle butter-smooth.
  const [showLabels, setShowLabels] = useState(expanded)
  const labelTimer = useRef(null)
  const [sbProfileMenuOpen, setSbProfileMenuOpen] = useState(false)
  const profileMenuRef = useRef(null)
  useEffect(() => {
    if (!sbProfileMenuOpen) return
    const handler = (e) => { if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) setSbProfileMenuOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [sbProfileMenuOpen])

  function toggleSidebar() {
    setExpanded(e => {
      const next = !e
      try { localStorage.setItem('showo_sidebar_expanded', next ? '1' : '0') } catch {}
      return next
    })
  }
  useEffect(() => {
    clearTimeout(labelTimer.current)
    if (expanded) labelTimer.current = setTimeout(() => setShowLabels(true), 260)
    else setShowLabels(false)
    return () => clearTimeout(labelTimer.current)
  }, [expanded])
  useEffect(() => () => clearTimeout(labelTimer.current), [])

  const showSidebar = !!user && !hideSidebar
  useEffect(() => {
    document.body.classList.toggle('has-sidebar', showSidebar)
    document.body.classList.toggle('sidebar-collapsed', showSidebar && collapsed)
    return () => {
      document.body.classList.remove('has-sidebar')
      document.body.classList.remove('sidebar-collapsed')
    }
  }, [showSidebar, collapsed])

  const isRecruiter = profile?.role === 'recrutador' || profile?.role === 'empresa'
  const isTeacher = profile?.role === 'professor'
  const recruiterAccent = 'var(--color-accent)'

  // No próprio perfil o "+" de criar projeto passa para a secção Trabalho —
  // não fica no topo. Evita dois botões com gradiente no mesmo ecrã.
  const onOwnProfile = !!profile?.username &&
    location.pathname.toLowerCase() === `/u/${profile.username.toLowerCase()}`
  const showCreateCta = !isTeacher && !isAdmin && !onOwnProfile

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
          {!user && (
            <>
              <button className="mobile-drawer-btn" onClick={() => { navigate('/aprende'); setOpen(false) }}>
                <BookMarked size={16} /> Aprende a usar
              </button>
              <button className="mobile-drawer-btn" onClick={() => { navigate('/pricing'); setOpen(false) }}>
                <Sparkles size={16} /> Planos
              </button>
            </>
          )}
          {user ? (
            <div className="nav-drawer-profile">
              {/* User header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 4px 10px' }}>
                <AvatarCircle avatarUrl={profile?.avatar_url} initial={getInitial(user)} size={36} fontSize={14} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)', lineHeight: 1.2 }}>{getDisplayName(user)}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</div>
                </div>
                <button onClick={toggleTheme} style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
                </button>
              </div>

              {/* Role-based sections */}
              {isRecruiter ? (
                <>
                  <button className="mobile-drawer-btn" onClick={() => { navigate('/explorar'); setOpen(false) }}>
                    <Compass size={16} /> Explorar
                  </button>
                  <button className="mobile-drawer-btn" onClick={() => { navigate('/mensagens'); setOpen(false) }}>
                    <MessageSquare size={16} /> Mensagens
                    {unreadMsgs > 0 && <span style={{ marginLeft: 'auto', background: 'var(--color-text)', color: 'var(--color-bg)', borderRadius: 99, minWidth: 18, height: 18, fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>{unreadMsgs > 9 ? '9+' : unreadMsgs}</span>}
                  </button>
                </>
              ) : (
                <>
                  {!isTeacher && (
                    <button className="mobile-drawer-btn" onClick={() => { navigate('/biblioteca'); setOpen(false) }}>
                      <LibraryIcon size={16} /> Biblioteca
                    </button>
                  )}
                  <span className="mob-drawer-label">Comunidade</span>
                  {(isTeacher || isSchoolAccount) && (
                    <button className="mobile-drawer-btn" onClick={() => { navigate('/turmas'); setOpen(false) }}>
                      <Users2 size={16} /> Turmas
                    </button>
                  )}
                  <button className="mobile-drawer-btn" onClick={() => { navigate('/mensagens'); setOpen(false) }}>
                    <MessageSquare size={16} /> Mensagens
                    {unreadMsgs > 0 && <span style={{ marginLeft: 'auto', background: 'var(--color-text)', color: 'var(--color-bg)', borderRadius: 99, minWidth: 18, height: 18, fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>{unreadMsgs > 9 ? '9+' : unreadMsgs}</span>}
                  </button>
                </>
              )}
              <button className="mobile-drawer-btn" onClick={() => { navigate('/aprende'); setOpen(false) }}>
                <BookMarked size={16} /> Aprende a usar
              </button>
              {!isSchoolAccount && !isTeacher && (
                <button className="mobile-drawer-btn" onClick={() => { navigate('/pricing'); setOpen(false) }}>
                  <Sparkles size={16} /> Planos
                </button>
              )}

              {/* Project management extras */}
              {extras?.type === 'project' && (
                <>
                  <span className="mob-drawer-label" style={{ color: 'var(--color-text)' }}>Gerir projeto</span>
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
                  {extras.showDiary && (
                    <button className="mobile-drawer-btn" onClick={() => { navigate(`/projeto/${extras.slug}/diario`); setOpen(false) }}>
                      <BookOpen size={16} /> Diário
                    </button>
                  )}
                  {extras.onDefense && (
                    <button className="mobile-drawer-btn" onClick={() => { extras.onDefense(); setOpen(false) }}>
                      <GraduationCap size={16} /> Modo defesa
                    </button>
                  )}
                  {extras.onAnalyze && (
                    <button className="mobile-drawer-btn" onClick={() => { extras.onAnalyze(); setOpen(false) }}>
                      <Sparkles size={16} /> {extras.aiScore != null ? 'Ver análise IA' : 'Análise IA'}
                    </button>
                  )}
                  {extras.showCertificate && (
                    <button className="mobile-drawer-btn" onClick={() => { navigate(`/certificado/${extras.slug}`); setOpen(false) }}>
                      <Trophy size={16} /> Certificado
                    </button>
                  )}
                  {extras.onTogglePublicView && (
                    <button className="mobile-drawer-btn" style={{ color: extras.viewAsPublic ? 'var(--color-text)' : undefined }}
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
            <div style={{ display: 'flex', gap: 8, padding: '16px 0 4px', borderTop: '1px solid var(--color-border)', marginTop: 4 }}>
              <button
                onClick={() => { navigate('/login'); setOpen(false) }}
                style={{ flex: 1, padding: '12px 0', background: 'transparent', border: '1px solid var(--color-border)', borderRadius: 10, color: 'var(--color-text)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
              >Entrar</button>
              <button
                onClick={() => { navigate('/register'); setOpen(false) }}
                style={{ flex: 1, padding: '12px 0', background: 'var(--color-text)', border: 'none', borderRadius: 10, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 16px color-mix(in srgb, var(--color-text) 30%, transparent)' }}
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
        {/* Mobile drawer trigger — leftmost, sidebar-panel icon. Yields to a
            page-provided back button (mobileLeft), e.g. inside a message thread. */}
        {showLinks && !mobileLeft && (
          <button
            className="mob-drawer-trigger"
            onClick={() => setMenuOpen(o => !o)}
            aria-label="Abrir menu"
            style={{ color: menuOpen ? 'var(--color-text)' : undefined, borderColor: menuOpen ? 'var(--color-text)' : undefined }}
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="9" y1="3" x2="9" y2="21" />
            </svg>
          </button>
        )}

        {/* Marca, mobile — logo a seguir ao hambúrguer, como o Canva faz. No
            telemóvel o centro do topo estava vazio (.nav-mid só existe no
            desktop); sem isto não havia nenhuma marca visível na página até
            se abrir o menu, e quem chega de um link partilhado não tinha
            como saber, olhando para o topo, que app é esta. */}
        {showLinks && !mobileLeft && (
          <button className="nav-mob-logo" onClick={() => navigate(user ? '/dashboard' : '/')} aria-label="Showo">
            <img
              src={theme === 'light' ? '/lightmode_icon_logo.png' : '/darkmode_icon_logo.png'}
              alt="" draggable={false}
            />
          </button>
        )}

        {/* Mobile-only left slot */}
        {mobileLeft && <div className="nav-mob-left">{mobileLeft}</div>}

        {/* Left — visitante sem conta vê a navegação pública (nada de auth
            aqui: Entrar/Criar conta saíram do topo por serem ruído para
            quem chega de um link partilhado). */}
        {showLinks && (
          <div className="nav-left">
            <button onClick={() => navigate('/explorar')} style={btnStyle} className="nav-btn">Explorar</button>
            {!user && (
              <>
                <button onClick={() => navigate('/aprende')} style={btnStyle} className="nav-btn">Aprende a usar</button>
                <button onClick={() => navigate('/pricing')} style={btnStyle} className="nav-btn">Planos</button>
              </>
            )}
          </div>
        )}

        {/* Centre */}
        <div className="nav-mid" style={{ flexDirection: 'column', gap: 1 }}>
          <img
            src={theme === 'light' ? '/lightmode_icon_logo.png' : '/darkmode_icon_logo.png'} alt="Showo" draggable={false}
            onClick={() => navigate('/')} className="nav-logo"
            style={{ height: 30, width: 'auto', display: 'block', cursor: 'pointer', userSelect: 'none' }}
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

          {/* Mobile action cluster (≤600px), right side. Logged in → quick-create
              or the preview workspace toggle. Logged out → nada aqui: com a
              logo agora centrada, um botão "Entrar" a solo do lado direito
              desequilibrava a barra sem servir nada que o herói e o drawer já
              não ofereçam. Entrar continua acessível pelos dois. */}
          {showLinks && (
            <div className="mob-nav-actions">
              {!user ? null : previewEditingMobile ? (
                <button className="mob-nav-icon-btn primary" onClick={onWorkspaceToggle} aria-label="Editar preview">
                  <Paintbrush size={18} strokeWidth={2} />
                </button>
              ) : extras?.type === 'project' ? (
                <>
                  {/* Dentro de um projeto continua a haver o "Criar projeto" —
                      não desaparece só por estarmos numa página de projeto. */}
                  {!isTeacher && !isAdmin && (
                    <button className="mob-nav-icon-btn primary gradient-cta" onMouseMove={handleGradientMove} onMouseLeave={handleGradientLeave} onClick={() => navigate('/novo')} aria-label="Criar projeto">
                      <Plus size={15} />
                    </button>
                  )}
                  <button
                    className="mob-nav-icon-btn primary"
                    data-tour="preview"
                    onClick={() => setProjMenuOpen(o => !o)}
                    aria-label="Gerir projeto"
                    style={{ background: projMenuOpen ? 'color-mix(in srgb, var(--color-text) 85%, transparent)' : undefined }}
                  >
                    <Paintbrush size={18} strokeWidth={2} />
                  </button>
                </>
              ) : showCreateCta ? (
                <button className="mob-nav-icon-btn primary gradient-cta" onMouseMove={handleGradientMove} onMouseLeave={handleGradientLeave} onClick={() => navigate('/novo')} aria-label="Criar projeto">
                  <Plus size={15} />
                </button>
              ) : null}
            </div>
          )}

          {/* Theme toggle — mobile only, not logged in */}
          {!user && (
            <button
              className="nav-mob-theme"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
            >
              {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
            </button>
          )}

          {/* Auth section — só para quem tem sessão. Visitante sem conta não
              tem nada aqui; entra pelo herói da Home ou pelo menu no mobile. */}
          {user && (
            <div className="nav-auth">
              {isAdmin && (
                <button
                  onClick={() => navigate('/admin')}
                  style={{
                    background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.25)',
                    color: 'var(--color-accent)', borderRadius: 8, padding: '6px 12px',
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
                onCreateProject={showCreateProject && !isTeacher && !isAdmin ? () => navigate('/novo') : undefined}
              />
            </div>
          )}

          {/* Mobile quick-create button — only on mobile (not tablet) */}
          {showLinks && showCreateCta && (
            <button
              className="ham-btn mob-only-create gradient-cta"
              onClick={() => navigate('/novo')}
              onMouseMove={handleGradientMove}
              onMouseLeave={handleGradientLeave}
              aria-label="Criar projeto"
              style={{
                border: 'none',
                borderRadius: 8, width: 38, height: 38,
                flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', padding: 0, flexShrink: 0,
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
                border: `1px solid ${open ? 'var(--color-text)' : C.border}`,
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

      {/* ── Mobile "Gerir projeto" popup (≤600px) — dropped from the paintbrush ── */}
      {projMenuOpen && extras?.type === 'project' && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 398 }} onClick={() => setProjMenuOpen(false)} />
          <div className="mob-proj-menu">
            <span className="mob-nav-section-label" style={{ padding: '4px 10px 6px' }}>Gerir projeto</span>
            <button className="mob-nav-btn" onClick={() => { navigate(`/editar/${extras.slug}`); setProjMenuOpen(false) }}>
              <Pencil size={18} /> Editar
            </button>
            {extras.showDiary && (
              <button className="mob-nav-btn" onClick={() => { navigate(`/projeto/${extras.slug}/diario`); setProjMenuOpen(false) }}>
                <BookOpen size={18} /> Diário
              </button>
            )}
            {extras.onDefense && (
              <button className="mob-nav-btn" onClick={() => { extras.onDefense(); setProjMenuOpen(false) }}>
                <GraduationCap size={18} /> Modo defesa
                {extras.defenseDate && (
                  <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                    {new Date(extras.defenseDate).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' })}
                  </span>
                )}
              </button>
            )}
            {extras.onAnalyze && (
              <button className="mob-nav-btn" onClick={() => { extras.onAnalyze(); setProjMenuOpen(false) }} disabled={extras.analyzingAI} style={{ opacity: extras.analyzingAI ? 0.6 : 1 }}>
                <Sparkles size={18} /> {extras.analyzingAI ? 'A analisar…' : extras.aiScore != null ? 'Ver análise IA' : 'Análise IA'}
                {extras.aiScore != null && !extras.analyzingAI && (
                  <span style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 700, color: extras.aiScore >= 90 ? 'var(--color-success)' : extras.aiScore >= 71 ? 'var(--color-primary)' : extras.aiScore >= 40 ? 'var(--color-warning)' : 'var(--color-error)' }}>
                    {extras.aiScore}
                  </span>
                )}
              </button>
            )}
            {extras.showCertificate && (
              <button className="mob-nav-btn" onClick={() => { navigate(`/certificado/${extras.slug}`); setProjMenuOpen(false) }}>
                <Trophy size={18} /> Certificado
              </button>
            )}
            {extras.onTogglePublicView && (
              <button className="mob-nav-btn" style={{ color: extras.viewAsPublic ? 'var(--color-text)' : undefined }}
                onClick={() => { extras.onTogglePublicView(); setProjMenuOpen(false) }}>
                <Globe size={18} /> {extras.viewAsPublic ? 'Sair da preview' : 'Preview visitante'}
              </button>
            )}
          </div>
        </>
      )}

      {/* ── Sidebar — desktop only (>601px). Hidden for non-auth users and pages with hideSidebar. ── */}
      {user && !hideSidebar && (
      <div className={`sidebar${collapsed ? ' collapsed' : ''}`}>
        <button
          className="sb-collapse-toggle"
          onClick={toggleSidebar}
          title={collapsed ? 'Expandir menu' : 'Colapsar menu'}
        >
          <ChevronRight size={12} style={{ transform: collapsed ? 'none' : 'rotate(180deg)', transition: 'transform 0.2s' }} />
        </button>

        {/* Logo */}
        {collapsed ? (
          <div className="sb-top-row" style={{ padding: 0 }}>
            <button className="sb-logo" onClick={() => navigate(user ? '/dashboard' : '/')} title="Showo">
              <img src="/icon.png" alt="Showo" style={{ height: 28, width: 28, objectFit: 'contain' }} />
            </button>
          </div>
        ) : (
          <div className="sb-top-row" style={!user ? { alignItems: 'center' } : undefined}>
            <button className="sb-logo" onClick={() => navigate(user ? '/dashboard' : '/')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1 }}>
              <img src={theme === 'light' ? '/lightmode_icon_logo.png' : '/darkmode_icon_logo.png'} alt="Showo" style={{ height: 28, width: 'auto', objectFit: 'contain' }} />
            </button>
          </div>
        )}
        {isSchoolAccount && showLabels && (
          <div style={{ padding: '0 16px 8px' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, color: 'var(--color-text)', background: 'color-mix(in srgb, var(--color-text) 12%, transparent)', borderRadius: 6, padding: '3px 8px', letterSpacing: '0.02em' }}>
              <GraduationCap size={12} strokeWidth={2.5} /> Modo Escola
            </span>
          </div>
        )}
        <div className="sb-logo-divider" />

        {/* Main nav + project controls in one scrollable section */}
        <div className="sb-section">
          {user && isAdmin && (
            <>
              <button className={`sb-item${isActive('/admin') ? ' active' : ''}`} onClick={() => navigate('/admin')}
                style={{ color: isActive('/admin') ? 'var(--color-accent)' : undefined }}>
                <Shield size={16} />{!collapsed && showLabels && <span>Painel de Admin</span>}
              </button>
              <div className="sb-divider" style={{ margin: '8px 0 4px' }} />
            </>
          )}
          {user && isRecruiter ? (
            /* ── RECRUITER / EMPRESA sidebar ── */
            <>
              <button className={`sb-item${isActive('/dashboard') ? ' active' : ''}`} onClick={() => navigate('/dashboard')}>
                <LayoutDashboard size={16} />{!collapsed && showLabels && <span>Dashboard</span>}
              </button>

              <button className={`sb-item${isActive('/explorar') ? ' active' : ''}`} onClick={() => navigate('/explorar')}>
                <Compass size={16} />{!collapsed && showLabels && <span>Explorar</span>}
              </button>

              <button className={`sb-item${isActive('/mensagens') ? ' active' : ''}`} onClick={() => navigate('/mensagens')}
                style={{ position: 'relative' }}>
                <MessageSquare size={16} />{!collapsed && showLabels && <span>Mensagens</span>}
                {!collapsed && showLabels && unreadMsgs > 0 && (
                  <span style={{ marginLeft: 'auto', background: 'var(--color-text)', color: 'var(--color-bg)', borderRadius: 99, minWidth: 18, height: 18, fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>
                    {unreadMsgs > 9 ? '9+' : unreadMsgs}
                  </span>
                )}
              </button>
            </>
          ) : isTeacher ? (
            /* ── PROFESSOR sidebar — no gamification/opportunities perks, those are aluno-only ── */
            <>
              {user && (
                <button className={`sb-item${isActive('/dashboard') ? ' active' : ''}`} onClick={() => navigate('/dashboard')}>
                  <LayoutDashboard size={16} />{!collapsed && showLabels && <span>Dashboard</span>}
                </button>
              )}
              <button className={`sb-item${isActive('/turmas') ? ' active' : ''}`} onClick={() => navigate('/turmas')}>
                <Users2 size={16} />{!collapsed && showLabels && <span>Turmas</span>}
              </button>
              <button className={`sb-item${isActive('/mensagens') ? ' active' : ''}`} onClick={() => navigate('/mensagens')}
                style={{ position: 'relative' }}>
                <MessageSquare size={16} />{!collapsed && showLabels && <span>Mensagens</span>}
                {!collapsed && showLabels && unreadMsgs > 0 && (
                  <span style={{ marginLeft: 'auto', background: 'var(--color-text)', color: 'var(--color-bg)', borderRadius: 99, minWidth: 18, height: 18, fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>
                    {unreadMsgs > 9 ? '9+' : unreadMsgs}
                  </span>
                )}
              </button>
              <button className={`sb-item${isActive('/explorar') ? ' active' : ''}`} onClick={() => navigate('/explorar')}>
                <Compass size={16} />{!collapsed && showLabels && <span>Explorar</span>}
              </button>
            </>
          ) : (
            /* ── ALUNO sidebar ── */
            <>
              {user && (
                <button className={`sb-item${isActive('/dashboard') ? ' active' : ''}`} onClick={() => navigate('/dashboard')}>
                  <LayoutDashboard size={16} />{!collapsed && showLabels && <span>Dashboard</span>}
                </button>
              )}
              {user && (
                <button className={`sb-item${isActive('/biblioteca') ? ' active' : ''}`} onClick={() => navigate('/biblioteca')}>
                  <LibraryIcon size={16} />{!collapsed && showLabels && <span>Biblioteca</span>}
                </button>
              )}
              {isSchoolAccount && (
                <button className={`sb-item${isActive('/turmas') ? ' active' : ''}`} onClick={() => navigate('/turmas')}>
                  <Users2 size={16} />{!collapsed && showLabels && <span>Turmas</span>}
                </button>
              )}
              <button className={`sb-item${isActive('/explorar') ? ' active' : ''}`} onClick={() => navigate('/explorar')}>
                <Compass size={16} />{!collapsed && showLabels && <span>Explorar</span>}
              </button>

              {user && (
                <>
                  <div className="sb-divider" style={{ margin: '8px 0 4px' }} />
                  {!collapsed && showLabels && <span className="sb-label">Comunidade</span>}

                  <button className={`sb-item${isActive('/mensagens') ? ' active' : ''}`} onClick={() => navigate('/mensagens')}
                    style={{ position: 'relative' }}>
                    <MessageSquare size={16} />{!collapsed && showLabels && <span>Mensagens</span>}
                    {!collapsed && showLabels && unreadMsgs > 0 && (
                      <span style={{ marginLeft: 'auto', background: 'var(--color-text)', color: 'var(--color-bg)', borderRadius: 99, minWidth: 18, height: 18, fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>
                        {unreadMsgs > 9 ? '9+' : unreadMsgs}
                      </span>
                    )}
                  </button>
                </>
              )}


              {!isSchoolAccount && (
                <button className={`sb-item${isActive('/pricing') ? ' active' : ''}`} onClick={() => navigate('/pricing')} title="Planos">
                  <Sparkles size={16} />{!collapsed && showLabels && <span>Planos</span>}
                </button>
              )}

              <button className={`sb-item${isActive('/aprende') ? ' active' : ''}`} onClick={() => navigate('/aprende')} title="Aprende a usar">
                <BookMarked size={16} />{!collapsed && showLabels && <span>Aprende a usar</span>}
              </button>

              {user && showCreateCta && (
                <div className="sb-create-wrap visible">
                  <div className="sb-create-inner">
                    <button className="sb-create gradient-cta" onMouseMove={handleGradientMove} onMouseLeave={handleGradientLeave} onClick={() => navigate('/novo')}>
                      <Plus size={14} />{!collapsed && showLabels && <span>Criar projeto</span>}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

        </div>

        <div className="sb-divider" />

        {/* Bottom — user section */}
        <div className="sb-bottom">
          {user ? (
            <>
              {/* Profile row + notifications — collapsed keeps only what's worth a glance
                  without expanding (notifications, messages); profile/settings/logout
                  require opening the sidebar. */}
              <div style={{
                display: 'flex', flexDirection: collapsed ? 'column' : 'row',
                alignItems: 'center', gap: 4, padding: collapsed ? '0 0 6px' : '0 0 2px',
                justifyContent: 'center',
              }}>
                {profileUrl && !collapsed && (
                  <button className={`sb-item${isActive('profile') ? ' active' : ''}`} style={{ flex: 1, margin: 0 }} onClick={() => navigate(profileUrl)}>
                    <AvatarCircle avatarUrl={profile?.avatar_url} initial={getInitial(user)} size={20} fontSize={9} />
                    {showLabels && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{getDisplayName(user)}</span>}
                  </button>
                )}

                {/* Feedback — ao lado das notificações (não mais uma secção
                    sozinha, à parte, com dois separadores a rodeá-la). Fica
                    à esquerda do sino em qualquer estado da sidebar. */}
                <button className="sb-action-btn" onClick={() => navigate(`/feedback?from=${encodeURIComponent(location.pathname)}`)} title="Reportar um problema" aria-label="Reportar um problema">
                  <Bug size={16} />
                </button>

                {/* Notificações — stays visible when collapsed */}
                <InviteInbox userId={user.id} sidebar={true} collapsed={collapsed} />
                {/* Avatar — collapsed: tap opens a small Perfil/Sair menu instead of
                    navigating straight away (no room here for a full nav row) */}
                {collapsed && profileUrl && (
                  <div ref={profileMenuRef} style={{ position: 'relative' }}>
                    <button
                      onClick={() => setSbProfileMenuOpen(o => !o)}
                      title={getDisplayName(user)}
                      style={{
                        width: 32, height: 32, borderRadius: 8, background: sbProfileMenuOpen ? 'var(--color-surface-hover)' : 'transparent',
                        border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'background 0.13s', marginTop: 2,
                      }}
                    >
                      <AvatarCircle avatarUrl={profile?.avatar_url} initial={getInitial(user)} size={22} fontSize={10} />
                    </button>
                    {sbProfileMenuOpen && (
                      <>
                        <div style={{
                          position: 'fixed', left: 80, bottom: 16, zIndex: 199,
                          background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                          borderRadius: 12, padding: 6, minWidth: 150,
                          boxShadow: '0 8px 32px rgba(0,0,0,0.4)', backdropFilter: 'blur(16px)',
                        }}>
                          <button
                            onClick={() => { navigate(profileUrl); setSbProfileMenuOpen(false) }}
                            style={{ ...dropItemStyle, color: C.text }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--color-surface-hover)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          >
                            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><User size={15} /> Perfil</span>
                          </button>
                          <button
                            onClick={() => { navigate('/settings'); setSbProfileMenuOpen(false) }}
                            style={{ ...dropItemStyle, color: C.text }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--color-surface-hover)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          >
                            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><SettingsIcon size={15} /> Definições</span>
                          </button>
                          <div style={{ height: 1, background: C.border, margin: '4px 6px' }} />
                          <button
                            onClick={() => { setSbProfileMenuOpen(false); handleSignOut() }}
                            style={{ ...dropItemStyle, color: 'var(--color-error)' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          >
                            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><LogOut size={15} /> Sair</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {collapsed ? null : (
                /* Definições / Modo claro / Mensagens / Sair — one tidy icon row instead of a long list */
                <div className="sb-action-row">
                  <button className="sb-action-btn" onClick={() => navigate('/settings')} title="Definições">
                    <SettingsIcon size={15} />
                  </button>
                  <button className="sb-action-btn" onClick={toggleTheme} title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}>
                    {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
                  </button>
                  <button className="sb-action-btn danger" onClick={handleSignOut} title="Sair">
                    <LogOut size={15} />
                  </button>
                </div>
              )}
            </>
          ) : (
            <>
              <button className="sb-item" onClick={() => navigate('/register')}><UserPlus size={16} />{!collapsed && showLabels && <span>Criar conta</span>}</button>
              {collapsed ? (
                <>
                  <button className="sb-item" onClick={() => navigate('/login')}><ArrowRightToLine size={16} /></button>
                  <button className="sb-item" onClick={toggleTheme} title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}>
                    {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                  </button>
                </>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, width: '100%' }}>
                  <button className="sb-item" style={{ flex: 1, margin: 0 }} onClick={() => navigate('/login')}><ArrowRightToLine size={16} /><span>Entrar</span></button>
                  <button
                    onClick={toggleTheme}
                    title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
                    style={{
                      flexShrink: 0, width: 32, height: 32, borderRadius: 8,
                      background: 'transparent', border: 'none',
                      color: 'var(--color-text-secondary)', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'background 0.13s, color 0.13s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-surface-hover)'; e.currentTarget.style.color = 'var(--color-text)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-text-secondary)' }}
                  >
                    {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      )}

      {/* ── Floating "Gerir projeto" panel — desktop only ── */}
      {extras?.type === 'project' && (
        <div className="proj-manage-float">
          {extras.showBack ? (
            <button className="pmf-btn" aria-label="Ver projeto" onClick={() => navigate(`/projeto/${extras.slug}`)}>
              <ArrowLeft size={16} />
              <span className="pmf-tooltip">Ver projeto</span>
            </button>
          ) : (
            <button className="pmf-btn" aria-label="Editar" onClick={() => navigate(`/editar/${extras.slug}`)}>
              <Pencil size={16} />
              <span className="pmf-tooltip">Editar</span>
            </button>
          )}
          {extras.showDiary && (
            <button className="pmf-btn" aria-label="Diário" onClick={() => navigate(`/projeto/${extras.slug}/diario`)}>
              <BookOpen size={16} />
              <span className="pmf-tooltip">Diário</span>
            </button>
          )}
          {extras.onDefense && (
            <button className="pmf-btn" data-tour="defense" aria-label="Modo defesa" onClick={extras.onDefense}>
              <GraduationCap size={16} />
              <span className="pmf-tooltip">Modo defesa</span>
            </button>
          )}
          {extras.onAnalyze && (
            <button className={`pmf-btn${extras.analyzingAI ? ' active' : ''}`} data-tour="ai" aria-label="Análise IA" onClick={extras.onAnalyze} disabled={extras.analyzingAI}>
              <Sparkles size={16} />
              <span className="pmf-tooltip">{extras.analyzingAI ? 'A analisar…' : 'Análise IA'}</span>
            </button>
          )}
          {extras.showCertificate && (
            <button className="pmf-btn" aria-label="Certificado" onClick={() => navigate(`/certificado/${extras.slug}`)}>
              <Trophy size={16} />
              <span className="pmf-tooltip">Certificado</span>
            </button>
          )}
          {extras.onTogglePublicView && (
            <>
              <div className="pmf-divider" />
              <button
                className={`pmf-btn${extras.viewAsPublic ? ' active' : ''}`}
                data-tour="preview"
                aria-label="Preview visitante"
                onClick={extras.onTogglePublicView}
                onMouseMove={e => {
                  const r = e.currentTarget.getBoundingClientRect()
                  const dx = (e.clientX - r.left - r.width / 2) / (r.width / 2)
                  const dy = (e.clientY - r.top - r.height / 2) / (r.height / 2)
                  e.currentTarget.style.setProperty('--ox', `${dx * 7}px`)
                  e.currentTarget.style.setProperty('--oy', `${dy * 7}px`)
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.setProperty('--ox', '0px')
                  e.currentTarget.style.setProperty('--oy', '0px')
                }}
              >
                <Globe size={16} />
                <span className="pmf-tooltip">{extras.viewAsPublic ? 'Sair preview' : 'Preview visitante'}</span>
              </button>
            </>
          )}
        </div>
      )}

      {/* ── Mobile full-navigation sheet (≤600px) ── */}
      {menuRendered && (
        <>
          <div className={`mob-menu-overlay${menuOpen ? '' : ' closing'}`} onClick={() => setMenuOpen(false)} />
          <div className={`mob-menu-sheet${menuOpen ? '' : ' closing'}`}>
            {/* A marca já vive na barra do topo (ao lado do hambúrguer, sempre
                visível), por isso deixou de precisar de se repetir aqui —
                repetir era a mesma marca duas vezes na mesma tela. */}
            <div className="mob-drawer-head">
              <button className="mob-drawer-close" onClick={() => setMenuOpen(false)} aria-label="Fechar menu">
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <line x1="9" y1="3" x2="9" y2="21" />
                </svg>
              </button>
            </div>
            <div className="mob-sheet-scroll">


              {/* ── Criar projeto — no hamburger quando pincel está no centro ── */}
              {previewEditingMobile && user && !isTeacher && !isAdmin && (
                <>
                  <span className="mob-nav-section-label">Ações</span>
                  <button className="mob-nav-btn" onClick={() => { setMenuOpen(false); navigate('/novo') }}>
                    <Plus size={18} /> Criar projeto
                  </button>
                  <div className="mob-nav-divider" />
                </>
              )}

              {/* "Gerir projeto" moved out of the drawer into the paintbrush popup
                  (see .mob-proj-menu) — keeps the drawer to pure navigation. */}

              {isAdmin && (
                <>
                  <button className={`mob-nav-btn${isActive('/admin') ? ' active' : ''}`} style={{ color: 'var(--color-accent)' }}
                    onClick={() => { navigate('/admin'); setMenuOpen(false) }}>
                    <Shield size={18} /> Painel de Admin
                  </button>
                  <div className="mob-nav-divider" />
                </>
              )}

              {/* Role-based nav sections */}
              {isRecruiter ? (
                <>
                  <button className={`mob-nav-btn${isActive('/dashboard') ? ' active' : ''}`} onClick={() => { navigate('/dashboard'); setMenuOpen(false) }}>
                    <LayoutDashboard size={18} /> Dashboard
                  </button>
                  <button className={`mob-nav-btn${isActive('/explorar') ? ' active' : ''}`} onClick={() => { navigate('/explorar'); setMenuOpen(false) }}>
                    <Compass size={18} /> Explorar
                  </button>
                  <button className={`mob-nav-btn${isActive('/mensagens') ? ' active' : ''}`} onClick={() => { navigate('/mensagens'); setMenuOpen(false) }}>
                    <MessageSquare size={18} /> Mensagens
                    {unreadMsgs > 0 && <span style={{ marginLeft: 'auto', background: 'var(--color-text)', color: 'var(--color-bg)', borderRadius: 99, minWidth: 18, height: 18, fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>{unreadMsgs > 9 ? '9+' : unreadMsgs}</span>}
                  </button>
                </>
              ) : isTeacher ? (
                <>
                  {user && (
                    <button className={`mob-nav-btn${isActive('/dashboard') ? ' active' : ''}`} onClick={() => { navigate('/dashboard'); setMenuOpen(false) }}>
                      <LayoutDashboard size={18} /> Dashboard
                    </button>
                  )}
                  <button className={`mob-nav-btn${isActive('/turmas') ? ' active' : ''}`} onClick={() => { navigate('/turmas'); setMenuOpen(false) }}>
                    <Users2 size={18} /> Turmas
                  </button>
                  <button className={`mob-nav-btn${isActive('/mensagens') ? ' active' : ''}`} onClick={() => { navigate('/mensagens'); setMenuOpen(false) }}>
                    <MessageSquare size={18} /> Mensagens
                    {unreadMsgs > 0 && <span style={{ marginLeft: 'auto', background: 'var(--color-text)', color: 'var(--color-bg)', borderRadius: 99, minWidth: 18, height: 18, fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>{unreadMsgs > 9 ? '9+' : unreadMsgs}</span>}
                  </button>
                  <button className={`mob-nav-btn${isActive('/explorar') ? ' active' : ''}`} onClick={() => { navigate('/explorar'); setMenuOpen(false) }}>
                    <Compass size={18} /> Explorar
                  </button>
                </>
              ) : (
                <>
                  {user && (
                    <button className={`mob-nav-btn${isActive('/dashboard') ? ' active' : ''}`} onClick={() => { navigate('/dashboard'); setMenuOpen(false) }}>
                      <LayoutDashboard size={18} /> Dashboard
                    </button>
                  )}
                  {user && (
                    <button className={`mob-nav-btn${isActive('/biblioteca') ? ' active' : ''}`} onClick={() => { navigate('/biblioteca'); setMenuOpen(false) }}>
                      <LibraryIcon size={18} /> Biblioteca
                    </button>
                  )}
                  {/* Visitante sem conta: o menu é o mapa do site — a explicação
                      que não cabe no herói fica a um toque, não escondida. Sem
                      Estágio aqui: é uma funcionalidade da conta de escola, não
                      algo para vender a quem ainda nem entrou. */}
                  {/* Aponta para o guia a sério (/aprende, já público), não
                      para um scroll dentro da própria home — a explicação
                      curta já está lá, quem abre o menu quer mais do que
                      isso. */}
                  {!user && (
                    <button className={`mob-nav-btn${isActive('/aprende') ? ' active' : ''}`} onClick={() => { navigate('/aprende'); setMenuOpen(false) }}>
                      <BookOpen size={18} /> Aprende a usar
                    </button>
                  )}
                  <button className={`mob-nav-btn${isActive('/explorar') ? ' active' : ''}`} onClick={() => { navigate('/explorar'); setMenuOpen(false) }}>
                    <Compass size={18} /> Explorar
                  </button>
                  {!user && (
                    <button className={`mob-nav-btn${isActive('/pricing') ? ' active' : ''}`} onClick={() => { navigate('/pricing'); setMenuOpen(false) }}>
                      <Sparkles size={18} /> Planos
                    </button>
                  )}
                  {user && (
                    <>
                      <span className="mob-nav-section-label">Comunidade</span>
                      <button className={`mob-nav-btn${isActive('/mensagens') ? ' active' : ''}`} onClick={() => { navigate('/mensagens'); setMenuOpen(false) }}>
                        <MessageSquare size={18} /> Mensagens
                        {unreadMsgs > 0 && <span style={{ marginLeft: 'auto', background: 'var(--color-text)', color: 'var(--color-bg)', borderRadius: 99, minWidth: 18, height: 18, fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>{unreadMsgs > 9 ? '9+' : unreadMsgs}</span>}
                      </button>
                      <button className={`mob-nav-btn${isActive('/pricing') ? ' active' : ''}`} onClick={() => { navigate('/pricing'); setMenuOpen(false) }}>
                        <Sparkles size={18} /> Planos
                      </button>
                      <button className={`mob-nav-btn${isActive('/aprende') ? ' active' : ''}`} onClick={() => { navigate('/aprende'); setMenuOpen(false) }}>
                        <BookOpen size={18} /> Aprende a usar
                      </button>
                    </>
                  )}
                </>
              )}

              <div className="mob-nav-divider" />

              {/* Settings / admin / logout */}
              {user && (
                <>
                  {isAdmin && (
                    <button className="mob-nav-btn" onClick={() => { navigate('/admin'); setMenuOpen(false) }} style={{ color: 'var(--color-accent)' }}>
                      <Shield size={18} /> Administração
                    </button>
                  )}
                  <button className={`mob-nav-btn${isActive('/settings') ? ' active' : ''}`} onClick={() => { navigate('/settings'); setMenuOpen(false) }}>
                    <SettingsIcon size={18} /> Definições
                  </button>
                  <button className="mob-nav-btn danger" onClick={() => { handleSignOut(); setMenuOpen(false) }}>
                    <LogOut size={18} /> Sair
                  </button>
                </>
              )}

              {/* Profile pinned to the very bottom — the avatar card doubles as the
                  "Meu perfil" entry (tap → profile), so no separate menu item needed. */}
              <div className="mob-drawer-foot">
                {user ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <button className="mob-foot-profile" onClick={() => { profileUrl && navigate(profileUrl); setMenuOpen(false) }}>
                      <AvatarCircle avatarUrl={profile?.avatar_url} initial={getInitial(user)} size={40} fontSize={15} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{getDisplayName(user)}</div>
                        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</div>
                      </div>
                    </button>
                    <button className="mob-foot-theme" onClick={() => { setMenuOpen(false); navigate(`/feedback?from=${encodeURIComponent(location.pathname)}`) }} aria-label="Reportar um problema" title="Feedback">
                      <Bug size={18} />
                    </button>
                    <button className="mob-foot-theme" onClick={toggleTheme} aria-label="Alternar tema">
                      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 8px' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)' }}>Aspeto</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <button className="mob-foot-theme" onClick={() => { setMenuOpen(false); navigate(`/feedback?from=${encodeURIComponent(location.pathname)}`) }} aria-label="Reportar um problema" title="Feedback">
                        <Bug size={18} />
                      </button>
                      <button className="mob-foot-theme" onClick={toggleTheme} aria-label="Alternar tema">
                        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                      </button>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>
        </>
      )}
    </>
  )
}
