export default function SplashScreen({ visible }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      backgroundColor: '#0d1424',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      opacity: visible ? 1 : 0,
      transform: visible ? 'none' : 'translateY(-12px)',
      pointerEvents: visible ? 'all' : 'none',
      transition: 'opacity 0.65s cubic-bezier(0.4,0,0.2,1), transform 0.65s cubic-bezier(0.4,0,0.2,1)',
    }}>
      <style>{`
        @keyframes logo-enter {
          0%   { opacity: 0; transform: translateX(210px) scale(0.93); }
          18%  { opacity: 1; transform: translateX(210px) scale(1); }
          70%  { opacity: 1; transform: translateX(0); }
          100% { opacity: 1; transform: translateX(0); }
        }

        @keyframes learn-descend {
          0%   { opacity: 1; transform: translateY(-72px); }
          70%  { transform: translateY(3px); }
          88%  { transform: translateY(-1px); }
          100% { opacity: 1; transform: translateY(0); }
        }

        @keyframes divider-grow {
          0%,50% { transform: scaleY(0); opacity: 0; }
          52%    { opacity: 1; }
          70%    { transform: scaleY(1); opacity: 1; }
          100%   { transform: scaleY(1); opacity: 1; }
        }

        @keyframes text-wipe-1 {
          0%,55% { opacity:0; clip-path:inset(0 100% 0 0); transform:translateX(16px); }
          80%    { opacity:1; clip-path:inset(0 0% 0 0); transform:translateX(0); }
          100%   { opacity:1; clip-path:inset(0 0% 0 0); transform:translateX(0); }
        }

        @keyframes text-wipe-2 {
          0%,63% { opacity:0; clip-path:inset(0 100% 0 0); transform:translateX(16px); }
          88%    { opacity:1; clip-path:inset(0 0% 0 0); transform:translateX(0); }
          100%   { opacity:1; clip-path:inset(0 0% 0 0); transform:translateX(0); }
        }

        /* Mobile: same row layout as desktop, scaled down */
        @media (max-width: 560px) {
          .splash-logo-img   { width: 126px !important; }
          .splash-logo-block { padding-bottom: 26px !important; }
          .splash-mask       { bottom: 26px !important; }
          .splash-learn      { font-size: 16px !important; }
          .splash-spacer     { width: 14px !important; }
          .splash-divider    { height: 50px !important; }
          .splash-tagline > div { font-size: 14px !important; }
        }
      `}</style>

      <div className="splash-inner" style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center' }}>

        {/* Logo block — slides in as a unit */}
        <div style={{
          flexShrink: 0,
          animation: 'logo-enter 2.2s cubic-bezier(0.22,1,0.36,1) both',
        }}>
          <div className="splash-logo-block" style={{ position: 'relative', paddingBottom: 44 }}>

            {/* z-index 3 — logo on top */}
            <img
              src="/showo_logo.png"
              alt="Showo"
              draggable={false}
              className="splash-logo-img"
              style={{
                width: 'clamp(190px, 26vw, 280px)',
                height: 'auto',
                display: 'block',
                userSelect: 'none',
                position: 'relative',
                zIndex: 3,
              }}
            />

            {/* z-index 2 — opaque mask covers logo area so Learn is hidden while sliding through */}
            <div className="splash-mask" style={{
              position: 'absolute',
              top: 0, left: 0, right: 0,
              bottom: 44,
              backgroundColor: '#0d1424',
              zIndex: 2,
            }} />

            {/* z-index 1 — "Learn" slides out from within the logo.
                opacity starts at 0 so nothing is visible before the animation fires.
                animationFillMode 'forwards' holds the final frame (opacity 1, translateY 0). */}
            <div className="splash-learn" style={{
              position: 'absolute',
              bottom: 0, left: 0, right: 0,
              textAlign: 'right',
              paddingRight: 21,
              zIndex: 1,
              fontSize: 'clamp(20px, 3vw, 36px)',
              fontWeight: 700,
              fontFamily: 'Inter, system-ui, sans-serif',
              color: '#ffffff',
              letterSpacing: '-0.5px',
              lineHeight: 1,
              opacity: 0,
              transform: 'translateY(-72px)',
              animationName: 'learn-descend',
              animationDuration: '0.9s',
              animationTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
              animationFillMode: 'forwards',
              animationDelay: '1.6s',
            }}>
              Learn
            </div>

          </div>
        </div>

        <div className="splash-spacer" style={{ width: 36, flexShrink: 0 }} />

        {/* Divider */}
        <div className="splash-divider" style={{
          width: 1.5, height: 80, flexShrink: 0,
          background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.22) 30%, rgba(255,255,255,0.22) 70%, transparent)',
          transformOrigin: 'center center',
          animation: 'divider-grow 2.2s cubic-bezier(0.22,1,0.36,1) both',
        }} />

        <div className="splash-spacer" style={{ width: 36, flexShrink: 0 }} />

        {/* Tagline */}
        <div className="splash-tagline" style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
          <div style={{
            fontSize: 'clamp(20px, 3vw, 32px)', fontWeight: 800,
            fontFamily: 'Inter, system-ui, sans-serif',
            color: '#e8f2ff', letterSpacing: '-0.4px', lineHeight: 1.25, whiteSpace: 'nowrap',
            animation: 'text-wipe-1 2.2s cubic-bezier(0.22,1,0.36,1) both',
          }}>
            Dá um{' '}<span style={{ color: '#3b82f6', fontStyle: 'italic' }}>boost</span>
          </div>
          <div style={{
            fontSize: 'clamp(20px, 3vw, 32px)', fontWeight: 800,
            fontFamily: 'Inter, system-ui, sans-serif',
            color: '#e8f2ff', letterSpacing: '-0.4px', lineHeight: 1.25, whiteSpace: 'nowrap',
            animation: 'text-wipe-2 2.2s cubic-bezier(0.22,1,0.36,1) both',
          }}>
            aos teus projetos!
          </div>
        </div>

      </div>
    </div>
  )
}
