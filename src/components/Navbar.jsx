import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

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
  const { user, profile, signOut } = useAuth()
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
              <UserChip
                user={user}
                onClick={() => navigate('/dashboard')}
                onProfile={profileUrl ? () => navigate(profileUrl) : null}
                onSettings={() => navigate('/settings')}
                onSignOut={handleSignOut}
              />
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
