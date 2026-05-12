import { useNavigate } from 'react-router-dom'

const C = {
  blue: '#3b82f6',
  muted: '#94a3b8',
  border: '#2e3a54',
}

const btnStyle = {
  background: 'transparent',
  border: 'none',
  color: C.muted,
  fontSize: 13,
  cursor: 'pointer',
  padding: '8px 10px',
  borderRadius: 6,
  whiteSpace: 'nowrap',
}

export function Navbar({ children, showLinks = true }) {
  const navigate = useNavigate()

  return (
    <>
      <style>{`
        .showo-nav-links { display: flex; align-items: center; gap: 2px; }
        @media (max-width: 620px) { .showo-nav-links { display: none; } }
        @media (max-width: 500px) { .showo-nav-pad { padding-left: 20px !important; padding-right: 20px !important; } }
      `}</style>
      <nav
        className="showo-nav-pad"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 40px', borderBottom: `1px solid ${C.border}`,
        }}
      >
        <span
          onClick={() => navigate('/')}
          style={{ fontSize: 22, fontWeight: 700, color: C.blue, cursor: 'pointer', userSelect: 'none' }}
        >
          Showo
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {showLinks && (
            <div className="showo-nav-links">
              <button onClick={() => navigate('/explorar')} style={btnStyle}>🔍 Explorar</button>
              <button onClick={() => navigate('/ranking')} style={btnStyle}>🏆 Ranking</button>
            </div>
          )}
          {children}
        </div>
      </nav>
    </>
  )
}
