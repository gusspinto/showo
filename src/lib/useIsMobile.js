import { useState, useEffect } from 'react'

// ── Single source of truth for "are we on a phone-sized screen?" ──────────────
// Before this hook, the app disagreed with itself: the CSS shell switched
// sidebar↔bottom-nav at 600px, Mensagens used 600, ProjectPage used 760, and
// Dashboard read window.innerWidth inline (which never updates on rotate). That
// mismatch is what left the 600–760px band half-broken. Components should import
// MOBILE_BP so every breakpoint traces back here.
//
// 600px matches the CSS shell (see index.css / Navbar.jsx @media 600). A few
// dense two-column layouts genuinely need more room and can pass their own
// breakpoint (e.g. useIsMobile(760)) — the point is the number is explicit and
// listens for resize/rotate, not that everyone uses the same value.

export const MOBILE_BP = 600

// SSR-safe initial read; falls back to "desktop" when window is absent.
function query(bp) {
  if (typeof window === 'undefined') return false
  return window.matchMedia(`(max-width: ${bp}px)`).matches
}

export function useIsMobile(bp = MOBILE_BP) {
  const [isMobile, setIsMobile] = useState(() => query(bp))

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${bp}px)`)
    const onChange = (e) => setIsMobile(e.matches)
    // Sync once in case the width changed between first render and effect.
    setIsMobile(mql.matches)
    // addEventListener('change') is the modern API; addListener is the Safari<14 fallback.
    if (mql.addEventListener) mql.addEventListener('change', onChange)
    else mql.addListener(onChange)
    return () => {
      if (mql.removeEventListener) mql.removeEventListener('change', onChange)
      else mql.removeListener(onChange)
    }
  }, [bp])

  return isMobile
}

export default useIsMobile
