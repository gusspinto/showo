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
      overflow: 'hidden',
      padding: '0 16px',
    }}>
      <style>{`
        /* ── Animations ── */
        @keyframes logo-enter-desk {
          0%   { opacity: 0; transform: translateX(var(--logo-offset)) scale(0.93); }
          18%  { opacity: 1; transform: translateX(var(--logo-offset)) scale(1); }
          70%  { opacity: 1; transform: translateX(0); }
          100% { opacity: 1; transform: translateX(0); }
        }

        @keyframes logo-enter-mob {
          0%   { opacity: 0; transform: scale(0.93); }
          25%  { opacity: 1; transform: scale(1); }
          100% { opacity: 1; transform: scale(1); }
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

        @keyframes divider-grow-h {
          0%,50% { transform: scaleX(0); opacity: 0; }
          52%    { opacity: 1; }
          70%    { transform: scaleX(1); opacity: 1; }
          100%   { transform: scaleX(1); opacity: 1; }
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

        @keyframes fade-up {
          0%    { opacity: 0; transform: translateY(12px); }
          100%  { opacity: 1; transform: translateY(0); }
        }

        /* ── Desktop layout ── */
        .splash-inner {
          display: flex;
          align-items: center;
          --logo-offset: 210px;
        }

        .splash-logo-block {
          position: relative;
          padding-bottom: 44px;
        }

        .splash-logo-anim {
          animation: logo-enter-desk 2.2s cubic-bezier(0.22,1,0.36,1) both;
        }

        .splash-divider-v {
          display: block;
          width: 1.5px;
          height: 80px;
          flex-shrink: 0;
          background: linear-gradient(to bottom, transparent, rgba(255,255,255,0.22) 30%, rgba(255,255,255,0.22) 70%, transparent);
          transform-origin: center center;
          animation: divider-grow 2.2s cubic-bezier(0.22,1,0.36,1) both;
        }

        .splash-divider-h { display: none; }

        .splash-spacer { width: 36px; flex-shrink: 0; }

        .splash-tagline-line {
          font-size: clamp(18px, 3vw, 32px);
          font-weight: 800;
          font-family: Inter, system-ui, sans-serif;
          color: #e8f2ff;
          letter-spacing: -0.4px;
          line-height: 1.25;
          white-space: nowrap;
        }

        /* ── Mobile (≤ 520px): vertical stack ── */
        @media (max-width: 520px) {
          .splash-inner {
            flex-direction: column;
            align-items: center;
            gap: 0;
          }

          .splash-logo-anim {
            animation: logo-enter-mob 1.4s cubic-bezier(0.22,1,0.36,1) both;
          }

          .splash-logo-img { width: clamp(140px, 55vw, 200px) !important; }

          .splash-logo-block {
            padding-bottom: 36px;
          }

          .splash-mask { bottom: 36px !important; }

          .splash-learn {
            font-size: clamp(16px, 5vw, 24px) !important;
          }

          .splash-spacer { display: none; }

          .splash-divider-v { display: none; }

          .splash-divider-h {
            display: block;
            width: 60px;
            height: 1.5px;
            background: linear-gradient(to right, transparent, rgba(255,255,255,0.22) 30%, rgba(255,255,255,0.22) 70%, transparent);
            transform-origin: center center;
            margin: 16px 0;
            animation: divider-grow-h 2.2s cubic-bezier(0.22,1,0.36,1) both;
          }

          .splash-tagline {
            text-align: center;
          }

          .splash-tagline-line {
            font-size: clamp(18px, 5.5vw, 26px);
            white-space: normal;
            text-align: center;
          }
        }

        /* ── Small-medium (521–768px): horizontal but scaled ── */
        @media (min-width: 521px) and (max-width: 768px) {
          .splash-inner { --logo-offset: 160px; }
          .splash-logo-img { width: clamp(150px, 22vw, 210px) !important; }
          .splash-logo-block { padding-bottom: 36px; }
          .splash-mask { bottom: 36px !important; }
          .splash-spacer { width: 24px; }
          .splash-divider-v { height: 64px; }
          .splash-learn { font-size: clamp(17px, 2.5vw, 26px) !important; }
          .splash-tagline-line { font-size: clamp(17px, 2.5vw, 26px); }
        }
      `}</style>

      <div className="splash-inner">

        {/* Logo block */}
        <div className="splash-logo-anim" style={{ flexShrink: 0 }}>
          <div className="splash-logo-block">

            {/* Logo image — z-index 3 (on top) */}
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

            {/* Opaque mask hides "Learn" while it slides through the logo */}
            <div className="splash-mask" style={{
              position: 'absolute',
              top: 0, left: 0, right: 0,
              bottom: 44,
              backgroundColor: '#0d1424',
              zIndex: 2,
            }} />

            {/* "Learn" slides down from behind the logo */}
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

        <div className="splash-spacer" />

        {/* Vertical divider (desktop / wide) */}
        <div className="splash-divider-v" />

        {/* Horizontal divider (mobile stack) */}
        <div className="splash-divider-h" />

        <div className="splash-spacer" />

        {/* Tagline */}
        <div className="splash-tagline" style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
          <div className="splash-tagline-line" style={{
            animation: 'text-wipe-1 2.2s cubic-bezier(0.22,1,0.36,1) both',
          }}>
            Dá um{' '}<span style={{ color: '#3b82f6', fontStyle: 'italic' }}>boost</span>
          </div>
          <div className="splash-tagline-line" style={{
            animation: 'text-wipe-2 2.2s cubic-bezier(0.22,1,0.36,1) both',
          }}>
            aos teus projetos!
          </div>
        </div>

      </div>
    </div>
  )
}
