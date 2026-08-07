import { useState, useEffect } from 'react'

export default function SplashScreen({ visible }) {
  const [logoIn, setLogoIn] = useState(false)

  useEffect(() => {
    if (!visible) {
      const t = setTimeout(() => setLogoIn(false), 700)
      return () => clearTimeout(t)
    }
    setLogoIn(false)
    const t = setTimeout(() => setLogoIn(true), 60)
    return () => clearTimeout(t)
  }, [visible])

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 999999,
      backgroundColor: '#060c18',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      opacity: visible ? 1 : 0,
      pointerEvents: visible ? 'all' : 'none',
      transition: 'opacity 0.6s cubic-bezier(0.4,0,0.2,1)',
    }}>
      <img
        src="/darkmode_icon_logo.png"
        alt="Showo"
        draggable={false}
        style={{
          height: 'clamp(32px, 8vw, 48px)',
          width: 'auto',
          display: 'block',
          userSelect: 'none',
          opacity: logoIn ? 1 : 0,
          transform: logoIn ? 'scale(1)' : 'scale(0.88)',
          transition: 'opacity 0.5s cubic-bezier(0.34,1.2,0.64,1), transform 0.5s cubic-bezier(0.34,1.2,0.64,1)',
        }}
      />
    </div>
  )
}
