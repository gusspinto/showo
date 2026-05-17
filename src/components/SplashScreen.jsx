import { useState, useEffect } from 'react'

/*
  Phase 0 (0–1.4s)  → icon only, centred
  Phase 1 (1.4–2.5s)→ logo emerges right of icon
  Phase 2 (2.5s+)   → desktop: divider + slogan slide in beside logo
                       mobile:  slogan fades in below logo (column layout)
*/

export default function SplashScreen({ visible }) {
  const [phase, setPhase] = useState(0)

  useEffect(() => {
    if (!visible) {
      const t = setTimeout(() => setPhase(0), 800)
      return () => clearTimeout(t)
    }
    setPhase(0)
    const t1 = setTimeout(() => setPhase(1), 1400)
    const t2 = setTimeout(() => setPhase(2), 2500)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [visible])

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 999999,
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
        .sp-icon { height: 64px; width: auto; display: block; user-select: none; flex-shrink: 0; }
        .sp-logo { height: 44px; width: auto; display: block; user-select: none; flex-shrink: 0; }
        .sp-divider-bar { height: 72px; width: 1.5px; flex-shrink: 0; }

        /* Phase-driven classes (desktop: max-width slide) */
        .sp-logo-wrap {
          overflow: hidden; max-width: 0; opacity: 0; flex-shrink: 0;
          transition: max-width 0.75s ease-in-out, opacity 0.6s ease-in-out;
        }
        .sp-logo-wrap.sp-p1 { max-width: 400px; opacity: 1; }

        .sp-sep-wrap {
          overflow: hidden; max-width: 0; opacity: 0; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          transition: max-width 0.6s ease-in-out, opacity 0.5s ease-in-out;
        }
        .sp-sep-wrap.sp-p2 { max-width: 64px; opacity: 1; }

        .sp-slogan-wrap {
          overflow: hidden; max-width: 0; opacity: 0; flex-shrink: 0;
          transition: max-width 0.65s ease-in-out 0.15s, opacity 0.55s ease-in-out 0.2s;
        }
        .sp-slogan-wrap.sp-p2 { max-width: 500px; opacity: 1; }

        .sp-slogan {
          font-family: var(--font-heading); font-weight: 800;
          color: #e8f2ff; white-space: nowrap;
          letter-spacing: -0.3px; line-height: 1.3; padding-right: 4px;
          font-size: 22px;
        }

        /* Outer row */
        .sp-outer { display: flex; align-items: center; }

        /* ── Mobile: column layout ── */
        @media (max-width: 768px) {
          .sp-icon { height: 52px; }
          .sp-logo { height: 36px; }
          .sp-divider-bar { height: 58px; }
          .sp-slogan { font-size: 18px; }
        }

        @media (max-width: 520px) {
          .sp-icon { height: 40px; }
          .sp-logo { height: 28px; }
          .sp-divider-bar { height: 44px; }

          /* Column stacking */
          .sp-outer { flex-direction: column; gap: 0; align-items: center; }

          /* Hide the vertical (horizontal-layout) divider */
          .sp-sep-wrap { display: none !important; }

          /* Horizontal line separator — appears with the slogan */
          .sp-h-line {
            width: 0;
            height: 1px;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent);
            margin: 16px 0 0;
            transition: width 0.55s ease-in-out 0.05s;
            overflow: hidden;
          }
          .sp-h-line.sp-p2 { width: 160px; }

          /* Switch slogan to max-height animation (vertical reveal from line) */
          .sp-slogan-wrap {
            max-width: none !important;
            max-height: 0;
            width: 100%;
            overflow: hidden;
            transition: max-height 0.45s ease-in-out 0.3s, opacity 0.4s ease-in-out 0.35s !important;
          }
          .sp-slogan-wrap.sp-p2 {
            max-width: none !important;
            max-height: 80px !important;
            opacity: 1 !important;
          }

          /* Wrap + centre the text */
          .sp-slogan {
            font-size: 15px !important;
            white-space: normal !important;
            text-align: center;
            padding-top: 12px !important;
          }
        }
      `}</style>

      <div className="sp-outer">

        {/* Icon + Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
          <img src="/icon.png" alt="" draggable={false} className="sp-icon" />
          <div className={`sp-logo-wrap${phase >= 1 ? ' sp-p1' : ''}`}>
            <img src="/logo.png" alt="Showo" draggable={false} className="sp-logo" />
          </div>
        </div>

        {/* Divider (desktop/tablet only — hidden on mobile via CSS) */}
        <div className={`sp-sep-wrap${phase >= 2 ? ' sp-p2' : ''}`}>
          <div style={{ width: 28, flexShrink: 0 }} />
          <div
            className="sp-divider-bar"
            style={{
              background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.22) 30%, rgba(255,255,255,0.22) 70%, transparent)',
              transform: phase >= 2 ? 'scaleY(1)' : 'scaleY(0)',
              transformOrigin: 'center',
              transition: 'transform 0.55s ease-in-out 0.1s',
            }}
          />
          <div style={{ width: 28, flexShrink: 0 }} />
        </div>

        {/* Horizontal line — mobile only, appears as slogan triggers */}
        <div className={`sp-h-line${phase >= 2 ? ' sp-p2' : ''}`} />

        {/* Slogan */}
        <div className={`sp-slogan-wrap${phase >= 2 ? ' sp-p2' : ''}`}>
          <div className="sp-slogan">
            Dá um{' '}
            <span style={{ color: '#1b78f7' }}>boost</span>
            {' '}aos teus projetos!
          </div>
        </div>

      </div>
    </div>
  )
}
