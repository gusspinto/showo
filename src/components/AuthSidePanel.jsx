import { useState, useEffect } from 'react'

export default function AuthSidePanel({ phrases }) {
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    if (phrases.length < 2) return
    const id = setInterval(() => setIdx(i => (i + 1) % phrases.length), 4200)
    return () => clearInterval(id)
  }, [phrases.length])

  const current = phrases[idx]

  return (
    <div className="auth-side">
      <style>{`
        @keyframes auth-aurora-pulse { 0%, 100% { opacity: 0.85; } 50% { opacity: 1; } }
        .auth-side-aurora { animation: auth-aurora-pulse 9s ease-in-out infinite; will-change: opacity; }
      `}</style>
      <div aria-hidden="true" className="auth-side-aurora" style={{
        position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
        background: `
          radial-gradient(48% 44% at 18% 14%, rgba(27,120,247,0.30) 0%, rgba(27,120,247,0) 70%),
          radial-gradient(42% 40% at 88% 30%, rgba(13,58,150,0.24) 0%, rgba(13,58,150,0) 70%),
          radial-gradient(40% 38% at 42% 92%, rgba(94,147,255,0.16) 0%, rgba(94,147,255,0) 70%)
        `,
      }} />
      <div className="auth-side-content">
        <img src="/icon_light.png" alt="Showo" className="auth-side-mark" />
        <p className="auth-side-phrase" key={idx}>
          {current.lead}{' '}
          <span className="auth-side-highlight">
            {current.highlight.split('').map((ch, i) => (
              <span
                key={i}
                className="auth-side-letter"
                style={{ animationDelay: `${i * 0.035}s`, whiteSpace: ch === ' ' ? 'pre' : 'normal' }}
              >
                {ch === ' ' ? ' ' : ch}
              </span>
            ))}
          </span>
        </p>
      </div>
    </div>
  )
}
