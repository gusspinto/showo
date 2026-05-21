import { useState, useEffect } from 'react'

/*
  Phase 0 (0–1.4s)  → icon scales + fades in
  Phase 1 (1.4–2.5s)→ logo slides in from left
  Phase 2 (2.5s+)   → divider + slogan reveal
*/

export default function SplashScreen({ visible }) {
  const [phase, setPhase] = useState(0)
  const [iconIn, setIconIn] = useState(false)

  useEffect(() => {
    if (!visible) {
      const t = setTimeout(() => { setPhase(0); setIconIn(false) }, 800)
      return () => clearTimeout(t)
    }
    setPhase(0)
    setIconIn(false)
    const t0 = setTimeout(() => setIconIn(true),  80)
    const t1 = setTimeout(() => setPhase(1), 1400)
    const t2 = setTimeout(() => setPhase(2), 2500)
    return () => { clearTimeout(t0); clearTimeout(t1); clearTimeout(t2) }
  }, [visible])

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 999999,
      backgroundColor: '#060c18',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      opacity: visible ? 1 : 0,
      transform: visible ? 'none' : 'translateY(-10px)',
      pointerEvents: visible ? 'all' : 'none',
      transition: 'opacity 0.65s cubic-bezier(0.4,0,0.2,1), transform 0.65s cubic-bezier(0.4,0,0.2,1)',
      overflow: 'hidden',
      padding: '0 24px',
    }}>
      <style>{`
        @keyframes sp-icon-glow {
          0%, 100% { filter: drop-shadow(0 0 12px rgba(27,120,247,0.0)); }
          50%       { filter: drop-shadow(0 0 22px rgba(27,120,247,0.35)); }
        }

        .sp-icon {
          height: 64px; width: auto; display: block; user-select: none; flex-shrink: 0;
          opacity: 0; transform: scale(0.78);
          transition: opacity 0.55s cubic-bezier(0.34,1.36,0.64,1),
                      transform 0.55s cubic-bezier(0.34,1.36,0.64,1);
        }
        .sp-icon.sp-in {
          opacity: 1; transform: scale(1);
          animation: sp-icon-glow 3s ease-in-out 0.6s infinite;
        }

        .sp-logo { height: 44px; width: auto; display: block; user-select: none; flex-shrink: 0; }
        .sp-divider-bar { height: 72px; width: 1.5px; flex-shrink: 0; }

        .sp-logo-wrap {
          flex-shrink: 0; overflow: hidden; width: 0;
          opacity: 0; transform: translateX(-8px);
          transition: opacity 0.55s cubic-bezier(0.25,0.46,0.45,0.94),
                      transform 0.55s cubic-bezier(0.25,0.46,0.45,0.94);
        }
        .sp-logo-wrap.sp-p1 { width: auto; opacity: 1; transform: translateX(0); }

        .sp-sep-wrap {
          overflow: hidden; max-width: 0; opacity: 0; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          transition: max-width 0.55s cubic-bezier(0.25,0.46,0.45,0.94),
                      opacity    0.45s cubic-bezier(0.25,0.46,0.45,0.94);
        }
        .sp-sep-wrap.sp-p2 { max-width: 64px; opacity: 1; }

        .sp-slogan-wrap {
          overflow: hidden; max-width: 0; opacity: 0; flex-shrink: 0;
          transition: max-width 0.6s cubic-bezier(0.25,0.46,0.45,0.94) 0.12s,
                      opacity   0.5s  cubic-bezier(0.25,0.46,0.45,0.94) 0.18s;
        }
        .sp-slogan-wrap.sp-p2 { max-width: 500px; opacity: 1; }

        .sp-slogan {
          font-family: var(--font-heading); font-weight: 400;
          color: rgba(232,242,255,0.72); white-space: nowrap;
          letter-spacing: 0px; line-height: 1; padding-right: 4px;
          font-size: 16px;
        }

        .sp-outer { display: flex; align-items: center; }
        .sp-slogan-wrap { display: flex !important; align-items: center !important; }

        @media (max-width: 768px) {
          .sp-icon  { height: 52px; }
          .sp-logo  { height: 36px; }
          .sp-divider-bar { height: 58px; }
          .sp-slogan { font-size: 15px; }
        }

        @media (max-width: 520px) {
          .sp-icon { height: 42px; }
          .sp-logo { height: 30px; }

          .sp-outer { flex-direction: column; gap: 0; align-items: center; }
          .sp-sep-wrap { display: none !important; }

          .sp-h-line {
            width: 0; height: 1px;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent);
            margin: 18px 0 0;
            transition: width 0.5s cubic-bezier(0.25,0.46,0.45,0.94) 0.05s;
          }
          .sp-h-line.sp-p2 { width: 140px; }

          .sp-slogan-wrap {
            max-width: none !important; max-height: 0; width: 100%; overflow: hidden;
            transition: max-height 0.4s cubic-bezier(0.25,0.46,0.45,0.94) 0.28s,
                        opacity    0.38s cubic-bezier(0.25,0.46,0.45,0.94) 0.32s !important;
          }
          .sp-slogan-wrap.sp-p2 {
            max-width: none !important; max-height: 80px !important; opacity: 1 !important;
          }
          .sp-slogan {
            font-size: 13px !important; white-space: normal !important;
            text-align: center; padding-top: 14px !important; padding-right: 0 !important;
            color: rgba(232,242,255,0.45) !important;
          }
        }
      `}</style>

      <div className="sp-outer">

        {/* Icon */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
          <img src="/icon.png" alt="" draggable={false} className={`sp-icon${iconIn ? ' sp-in' : ''}`} />
          <div className={`sp-logo-wrap${phase >= 1 ? ' sp-p1' : ''}`}>
            <img src="/logo.png" alt="Showo" draggable={false} className="sp-logo" />
          </div>
        </div>

        {/* Divider */}
        <div className={`sp-sep-wrap${phase >= 2 ? ' sp-p2' : ''}`}>
          <div style={{ width: 28, flexShrink: 0 }} />
          <div className="sp-divider-bar" style={{
            background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.18) 30%, rgba(255,255,255,0.18) 70%, transparent)',
            transform: phase >= 2 ? 'scaleY(1)' : 'scaleY(0)',
            transformOrigin: 'center',
            transition: 'transform 0.5s cubic-bezier(0.25,0.46,0.45,0.94) 0.08s',
          }} />
          <div style={{ width: 28, flexShrink: 0 }} />
        </div>

        {/* Mobile horizontal line */}
        <div className={`sp-h-line${phase >= 2 ? ' sp-p2' : ''}`} />

        {/* Slogan */}
        <div className={`sp-slogan-wrap${phase >= 2 ? ' sp-p2' : ''}`}>
          <div className="sp-slogan">
            Os teus projetos,{' '}
            <span style={{ color: '#1b78f7', fontWeight: 800 }}>apresentados a sério.</span>
          </div>
        </div>

      </div>
    </div>
  )
}
