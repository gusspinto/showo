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

  return (
    <>
      <style>{`
        .nav-btn:hover { color: #e8f2ff !important; background: rgba(255,255,255,0.06) !important; }
        .nav-logo { transition: opacity 0.15s; }
        .nav-logo:hover { opacity: 0.85; }

        /* 3-column layout on desktop */
        .nav-left  { display: flex; align-items: center; gap: 2px; flex: 1; }
        .nav-mid   { display: flex; align-items: center; justify-content: center; }
        .nav-right { display: flex; align-items: center; justify-content: flex-end; gap: 8px; flex: 1; }

        /* Mobile: hide nav links, keep icon + CTA */
        @media (max-width: 600px) {
          .nav-left  { display: none; }
          .nav-mid   { flex: 1; justify-content: flex-start; }
          .nav-right { flex: none; }
          .nav-logo  { width: 120px !important; height: auto !important; }
          .showo-nav-pad { padding-left: 20px !important; padding-right: 20px !important; }
        }
      `}</style>

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
        {/* Left — nav links */}
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

        {/* Centre — logo mark */}
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

        {/* Right — CTA + any injected children */}
        <div className="nav-right">
          {children}
        </div>
      </nav>
    </>
  )
}
