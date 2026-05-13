import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

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

export function Navbar({ children, showLinks = true }) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  return (
    <>
      <style>{`
        .nav-btn:hover { color: #e8f2ff !important; background: rgba(255,255,255,0.06) !important; }
        .nav-logo { transition: opacity 0.15s; }
        .nav-logo:hover { opacity: 0.85; }

        .nav-left  { display: flex; align-items: center; gap: 2px; flex: 1; }
        .nav-mid   { display: flex; align-items: center; justify-content: center; }
        .nav-right { display: flex; align-items: center; justify-content: flex-end; gap: 8px; flex: 1; }

        .ham-btn { display: none !important; }

        @media (max-width: 600px) {
          .nav-left  { display: none; }
          .nav-mid   { flex: 1; justify-content: flex-start; }
          .nav-right { flex: none; }
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
          display: flex;
          flex-direction: column;
          transform: translateY(-110%);
          transition: transform 0.25s cubic-bezier(0.4,0,0.2,1);
          box-shadow: 0 8px 32px rgba(0,0,0,0.4);
        }
        .mobile-drawer.is-open {
          transform: translateY(0);
        }
        .mobile-drawer-btn {
          background: transparent;
          border: none;
          color: #7d93b0;
          font-size: 15px;
          font-weight: 500;
          cursor: pointer;
          padding: 14px 4px;
          text-align: left;
          font-family: inherit;
          border-bottom: 1px solid #1e3050;
          transition: color 0.15s;
        }
        .mobile-drawer-btn:last-child { border-bottom: none; }
        .mobile-drawer-btn:hover { color: #e8f2ff; }
      `}</style>

      {/* Mobile nav drawer */}
      {showLinks && (
        <div className={`mobile-drawer${open ? ' is-open' : ''}`}>
          <button className="mobile-drawer-btn" onClick={() => { navigate('/explorar'); setOpen(false) }}>
            Explorar
          </button>
          <button className="mobile-drawer-btn" onClick={() => { navigate('/ranking'); setOpen(false) }}>
            Ranking
          </button>
        </div>
      )}

      <nav
        className="showo-nav-pad"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          padding: '0 36px',
          height: 62,
          background: C.bg,
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: `1px solid ${C.border}`,
          boxShadow: '0 1px 24px rgba(0,0,0,0.3)',
          gap: 12,
        }}
      >
        {/* Left — nav links (desktop) */}
        {showLinks && (
          <div className="nav-left">
            <button onClick={() => navigate('/explorar')} style={btnStyle} className="nav-btn">
              Explorar
            </button>
            <button onClick={() => navigate('/ranking')} style={btnStyle} className="nav-btn">
              Ranking
            </button>
          </div>
        )}

        {/* Centre — logo */}
        <div className="nav-mid">
          <img
            src="/logo-3.png"
            alt="Showo"
            draggable={false}
            onClick={() => navigate('/')}
            className="nav-logo"
            style={{ width: 160, height: 'auto', display: 'block', cursor: 'pointer', userSelect: 'none' }}
          />
        </div>

        {/* Right — CTA + hamburger */}
        <div className="nav-right">
          {children}
          {showLinks && (
            <button
              className="ham-btn"
              onClick={() => setOpen(o => !o)}
              aria-label="Menu"
              style={{
                background: 'transparent',
                border: `1px solid ${open ? '#3b82f6' : C.border}`,
                borderRadius: 8,
                width: 38, height: 38,
                flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: 5,
                cursor: 'pointer',
                padding: 0,
                transition: 'border-color 0.2s',
                flexShrink: 0,
              }}
            >
              <span style={{
                display: 'block', width: 18, height: 1.5,
                background: open ? C.text : C.muted,
                borderRadius: 1,
                transition: 'background 0.2s, transform 0.22s',
                transform: open ? 'translateY(6.5px) rotate(45deg)' : 'none',
              }} />
              <span style={{
                display: 'block', width: 18, height: 1.5,
                background: open ? C.text : C.muted,
                borderRadius: 1,
                transition: 'background 0.2s, opacity 0.22s',
                opacity: open ? 0 : 1,
              }} />
              <span style={{
                display: 'block', width: 18, height: 1.5,
                background: open ? C.text : C.muted,
                borderRadius: 1,
                transition: 'background 0.2s, transform 0.22s',
                transform: open ? 'translateY(-6.5px) rotate(-45deg)' : 'none',
              }} />
            </button>
          )}
        </div>
      </nav>
    </>
  )
}
