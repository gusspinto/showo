export default function SplashScreen({ visible }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: '#0d1424',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: visible ? 1 : 0,
        transform: visible ? 'none' : 'translateY(-12px)',
        pointerEvents: visible ? 'all' : 'none',
        transition: 'opacity 0.65s cubic-bezier(0.4, 0, 0.2, 1), transform 0.65s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      <style>{`
        /*
         * Timeline (all animations share 1.9s duration, percentages control sequence):
         *
         * 0 – 18%  (~0.34s) : Logo fades in at offset (appears centered on screen)
         * 18 – 68% (~0.95s) : Logo slides left to final position
         * 52 – 70% (~0.34s) : Divider line grows vertically
         * 57 – 80% (~0.44s) : Text line 1 wipes in from right
         * 65 – 86% (~0.40s) : Text line 2 wipes in (staggered)
         * 86 – 100%         : All elements hold at final state
         */

        @keyframes logo-enter {
          0%   { opacity: 0; transform: translateX(210px) scale(0.94); }
          18%  { opacity: 1; transform: translateX(210px) scale(1); }
          68%  { opacity: 1; transform: translateX(0); }
          100% { opacity: 1; transform: translateX(0); }
        }

        @keyframes divider-grow {
          0%, 50%  { transform: scaleY(0); opacity: 0; }
          52%      { opacity: 1; }
          70%      { transform: scaleY(1); opacity: 1; }
          100%     { transform: scaleY(1); opacity: 1; }
        }

        @keyframes text-wipe-1 {
          0%, 55%  {
            opacity: 0;
            clip-path: inset(0 100% 0 0);
            transform: translateX(20px);
          }
          78% {
            opacity: 1;
            clip-path: inset(0 0% 0 0);
            transform: translateX(0);
          }
          100% {
            opacity: 1;
            clip-path: inset(0 0% 0 0);
            transform: translateX(0);
          }
        }

        @keyframes text-wipe-2 {
          0%, 63%  {
            opacity: 0;
            clip-path: inset(0 100% 0 0);
            transform: translateX(20px);
          }
          84% {
            opacity: 1;
            clip-path: inset(0 0% 0 0);
            transform: translateX(0);
          }
          100% {
            opacity: 1;
            clip-path: inset(0 0% 0 0);
            transform: translateX(0);
          }
        }

        @keyframes ambient-breathe {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%      { opacity: 0.6; transform: scale(1.08); }
        }
      `}</style>

      {/* Ambient radial glow */}
      <div style={{
        position: 'absolute',
        width: 700,
        height: 380,
        borderRadius: '50%',
        background: 'radial-gradient(ellipse, rgba(59,130,246,0.07) 0%, transparent 68%)',
        animation: 'ambient-breathe 4s ease-in-out infinite',
        pointerEvents: 'none',
      }} />

      {/* ── Main content row ── */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        display: 'flex',
        alignItems: 'center',
        gap: 0,
      }}>

        {/* Logo — starts offset right (centered on screen), slides left */}
        <img
          src="/logo.png"
          alt="Showo"
          draggable={false}
          style={{
            width: 'clamp(190px, 26vw, 280px)',
            userSelect: 'none',
            display: 'block',
            flexShrink: 0,
            animation: 'logo-enter 1.9s cubic-bezier(0.22, 1, 0.36, 1) both',
          }}
        />

        {/* Spacer between logo and divider */}
        <div style={{ width: 36, flexShrink: 0 }} />

        {/* Vertical divider — grows from centre */}
        <div style={{
          width: 1.5,
          height: 80,
          background: 'linear-gradient(to bottom, transparent 0%, rgba(255,255,255,0.22) 30%, rgba(255,255,255,0.22) 70%, transparent 100%)',
          flexShrink: 0,
          transformOrigin: 'center center',
          animation: 'divider-grow 1.9s cubic-bezier(0.22, 1, 0.36, 1) both',
        }} />

        {/* Spacer between divider and text */}
        <div style={{ width: 36, flexShrink: 0 }} />

        {/* Text block — lines wipe in sequentially */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          flexShrink: 0,
        }}>

          {/* Line 1: "Dá um boost" */}
          <div style={{
            fontSize: 'clamp(20px, 3vw, 32px)',
            fontWeight: 800,
            fontFamily: 'Inter, system-ui, sans-serif',
            color: '#e8f2ff',
            letterSpacing: '-0.4px',
            lineHeight: 1.25,
            whiteSpace: 'nowrap',
            animation: 'text-wipe-1 1.9s cubic-bezier(0.22, 1, 0.36, 1) both',
          }}>
            Dá um{' '}
            <span style={{
              color: '#3b82f6',
              fontStyle: 'italic',
            }}>
              boost
            </span>
          </div>

          {/* Line 2: "aos teus projetos!" */}
          <div style={{
            fontSize: 'clamp(20px, 3vw, 32px)',
            fontWeight: 800,
            fontFamily: 'Inter, system-ui, sans-serif',
            color: '#e8f2ff',
            letterSpacing: '-0.4px',
            lineHeight: 1.25,
            whiteSpace: 'nowrap',
            animation: 'text-wipe-2 1.9s cubic-bezier(0.22, 1, 0.36, 1) both',
          }}>
            aos teus projetos!
          </div>

        </div>
      </div>
    </div>
  )
}
