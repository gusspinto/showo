import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

const C = {
  bg: 'rgba(13, 20, 36, 0.88)',
  border: '#1e3050',
  blue: '#3b82f6',
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

function InviteInbox({ userId }) {
  const navigate = useNavigate()
  const [open, setOpen]     = useState(false)
  const [invites, setInvites] = useState([])
  const [acting, setActing] = useState({})

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

  useEffect(() => {
    if (!userId) return
    loadInvites()

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
        // Fetch name + project in parallel
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

    return () => {
      supabase.removeChannel(inviteChannel)
      supabase.removeChannel(ownerChannel)
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

  const count = invites.length + responses.length

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
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
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
                          style={{ flex: 1, padding: '7px 0', background: 'linear-gradient(135deg,#3b82f6,#4f46e5)', border: 'none', borderRadius: 7, color: '#fff', fontSize: 12, fontWeight: 700, cursor: isActing ? 'default' : 'pointer', fontFamily: 'inherit' }}
                        >{acting[invite.id] === 'accepted' ? '...' : '✓ Aceitar'}</button>
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
                    <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>
                      {r.status === 'accepted' ? '✅' : '❌'}
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
                      style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 14, padding: 0, flexShrink: 0, lineHeight: 1, marginTop: 2 }}
                    >✕</button>
                  </div>
                ))}
              </>
            )}

            {/* Empty state */}
            {invites.length === 0 && responses.length === 0 && (
              <div style={{ padding: '24px 12px', textAlign: 'center' }}>
                <p style={{ margin: 0, color: C.muted, fontSize: 13 }}>Nenhuma notificação</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function UserChip({ user, onClick, onProfile, onSettings, onSignOut }) {
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
        {/* Avatar circle */}
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          background: 'linear-gradient(135deg, #3b82f6, #4f46e5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0,
          userSelect: 'none',
        }}>
          {initial}
        </div>
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
            <button
              onClick={() => { onClick(); setOpen(false) }}
              style={{ ...dropItemStyle, color: C.text }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              📂 Dashboard
            </button>
            {onProfile && (
              <button
                onClick={() => { onProfile(); setOpen(false) }}
                style={{ ...dropItemStyle, color: C.text }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                👤 Meu perfil
              </button>
            )}
            <button
              onClick={() => { onSettings(); setOpen(false) }}
              style={{ ...dropItemStyle, color: C.text }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              ⚙️ Definições
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

export function Navbar({ children, showLinks = true }) {
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

        @media (max-width: 600px) {
          .nav-left  { display: none; }
          .nav-mid   { flex: 1; justify-content: flex-start; }
          .nav-right { flex: none; }
          .nav-auth  { display: none; }
          .nav-logo  { width: 120px !important; }
          .showo-nav-pad { padding-left: 20px !important; padding-right: 20px !important; }
          .ham-btn   { display: flex !important; }
        }

        @media (min-width: 601px) and (max-width: 900px) {
          .nav-logo { width: 130px !important; }
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
          transition: transform 0.25s cubic-bezier(0.4,0,0.2,1);
          box-shadow: 0 8px 32px rgba(0,0,0,0.4);
        }
        .mobile-drawer.is-open { transform: translateY(0); }
        .mobile-drawer-btn {
          background: transparent; border: none;
          color: #7d93b0; font-size: 15px; font-weight: 500;
          cursor: pointer; padding: 14px 4px; text-align: left;
          font-family: inherit; border-bottom: 1px solid #1e3050;
          transition: color 0.15s;
        }
        .mobile-drawer-btn:last-child { border-bottom: none; }
        .mobile-drawer-btn:hover { color: #e8f2ff; }
        .mobile-drawer-btn.danger { color: #f87171 !important; }
      `}</style>

      {/* Mobile drawer */}
      {showLinks && (
        <div className={`mobile-drawer${open ? ' is-open' : ''}`}>
          <button className="mobile-drawer-btn" onClick={() => { navigate('/explorar'); setOpen(false) }}>Explorar</button>
          <button className="mobile-drawer-btn" onClick={() => { navigate('/ranking'); setOpen(false) }}>Ranking</button>
          {user ? (
            <>
              <button className="mobile-drawer-btn" onClick={() => { navigate('/dashboard'); setOpen(false) }}>
                {getDisplayName(user)} · Dashboard
              </button>
              <button className="mobile-drawer-btn danger" onClick={() => { handleSignOut(); setOpen(false) }}>Sair</button>
            </>
          ) : (
            <>
              <button className="mobile-drawer-btn" onClick={() => { navigate('/login'); setOpen(false) }}>Entrar</button>
              <button className="mobile-drawer-btn" onClick={() => { navigate('/register'); setOpen(false) }}>Criar conta</button>
            </>
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
            src="/logo-3.png" alt="Showo" draggable={false}
            onClick={() => navigate('/')} className="nav-logo"
            style={{ width: 160, height: 'auto', display: 'block', cursor: 'pointer', userSelect: 'none' }}
          />
        </div>

        {/* Right */}
        <div className="nav-right">
          {/* Page-specific buttons (children) */}
          {children && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {children}
            </div>
          )}

          {/* Subtle divider when children + auth both present (desktop) */}
          {children && user && (
            <div className="nav-auth" style={{ width: 1, height: 20, background: C.border, margin: '0 4px', flexShrink: 0 }} />
          )}

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
                  >🛡️</button>
                )}
                <InviteInbox userId={user.id} />
                <UserChip
                  user={user}
                  onClick={() => navigate('/dashboard')}
                  onProfile={profileUrl ? () => navigate(profileUrl) : null}
                  onSettings={() => navigate('/settings')}
                  onSignOut={handleSignOut}
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
                  onMouseEnter={e => e.target.style.background = '#2563eb'}
                  onMouseLeave={e => e.target.style.background = C.blue}
                >
                  Criar conta
                </button>
              </>
            )}
          </div>

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
