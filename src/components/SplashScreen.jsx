import { useState, useEffect } from 'react'

/*
  Sequência:
  Phase 0 (0–1s)    → icon.png sozinho, centrado
  Phase 1 (1–1.5s)  → logo.png emerge à direita; os dois centrados juntos
  Phase 2 (1.6s+)   → ambos deslizam para a esquerda (flex reflow natural)
                       → separador vertical aparece
                       → slogan aparece à direita ("boost" em #1b78f7, fonte Croogla)
*/

export default function SplashScreen({ visible }) {
  const [phase, setPhase] = useState(0)

  useEffect(() => {
    if (!visible) {
      const t = setTimeout(() => setPhase(0), 800)
      return () => clearTimeout(t)
    }
    setPhase(0)
    const t1 = setTimeout(() => setPhase(1), 1400)   // icon sozinho 1.4s
    const t2 = setTimeout(() => setPhase(2), 2500)   // icon+logo juntos 1.1s
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [visible])

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      backgroundColor: '#0d1424',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      opacity: visible ? 1 : 0,
      transform: visible ? 'none' : 'translateY(-12px)',
      pointerEvents: visible ? 'all' : 'none',
      transition: 'opacity 0.65s cubic-bezier(0.4,0,0.2,1), transform 0.65s cubic-bezier(0.4,0,0.2,1)',
      overflow: 'hidden',
      padding: '0 24px',
    }}>
      <style>{`
        .sp-icon      { height: 64px; width: auto; display: block; user-select: none; flex-shrink: 0; }
        .sp-logo      { height: 44px; width: auto; display: block; user-select: none; flex-shrink: 0; }
        .sp-divider-bar { height: 72px; width: 1.5px; }
        .sp-slogan    { font-size: 22px; }

        @media (max-width: 768px) {
          .sp-icon        { height: 52px; }
          .sp-logo        { height: 36px; }
          .sp-divider-bar { height: 58px; }
          .sp-slogan      { font-size: 18px; }
        }
        @media (max-width: 520px) {
          .sp-icon        { height: 40px; }
          .sp-logo        { height: 28px; }
          .sp-divider-bar { height: 44px; }
          .sp-slogan      { font-size: 14px; }
        }
      `}</style>

      <div style={{ display: 'flex', alignItems: 'center' }}>

        {/* ── Icon + Wordmark group ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>

          {/* icon.png — visível desde o início */}
          <img
            src="/icon.png"
            alt=""
            draggable={false}
            className="sp-icon"
          />

          {/* logo.png — emerge no phase 1 */}
          <div style={{
            overflow: 'hidden',
            maxWidth: phase >= 1 ? '400px' : '0px',
            opacity: phase >= 1 ? 1 : 0,
            transition: 'max-width 0.75s ease-in-out, opacity 0.6s ease-in-out',
            flexShrink: 0,
          }}>
            <img
              src="/logo.png"
              alt="Showo"
              draggable={false}
              className="sp-logo"
            />
          </div>
        </div>

        {/* ── Separador vertical — aparece no phase 2 ── */}
        <div style={{
          overflow: 'hidden',
          maxWidth: phase >= 2 ? '64px' : '0px',
          opacity: phase >= 2 ? 1 : 0,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'max-width 0.6s ease-in-out, opacity 0.5s ease-in-out',
        }}>
          <div style={{ width: 28, flexShrink: 0 }} />
          <div
            className="sp-divider-bar"
            style={{
              background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.22) 30%, rgba(255,255,255,0.22) 70%, transparent)',
              transform: phase >= 2 ? 'scaleY(1)' : 'scaleY(0)',
              transformOrigin: 'center',
              transition: 'transform 0.55s ease-in-out 0.1s',
              flexShrink: 0,
            }}
          />
          <div style={{ width: 28, flexShrink: 0 }} />
        </div>

        {/* ── Slogan — aparece no phase 2 ── */}
        <div style={{
          overflow: 'hidden',
          maxWidth: phase >= 2 ? '500px' : '0px',
          opacity: phase >= 2 ? 1 : 0,
          flexShrink: 0,
          transition: 'max-width 0.65s ease-in-out 0.15s, opacity 0.55s ease-in-out 0.2s',
        }}>
          <div
            className="sp-slogan"
            style={{
              fontFamily: 'var(--font-heading)',
              fontWeight: 800,
              color: '#e8f2ff',
              whiteSpace: 'nowrap',
              letterSpacing: '-0.3px',
              lineHeight: 1.2,
              paddingRight: 4,
            }}
          >
            Dá um{' '}
            <span style={{ color: '#1b78f7' }}>boost</span>
            {' '}aos teus projetos!
          </div>
        </div>

      </div>
    </div>
  )
}
