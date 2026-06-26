import { useState, useEffect } from 'react'

export default function AuthSidePanel({ phrases, step, totalSteps }) {
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    if (phrases.length < 2) return
    const id = setInterval(() => setIdx(i => (i + 1) % phrases.length), 4200)
    return () => clearInterval(id)
  }, [phrases.length])

  const current = phrases[idx]

  return (
    <div className="auth-side">
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

      {totalSteps > 1 && (
        <div className="auth-side-progress">
          <div className="auth-side-progress-track">
            <div
              className="auth-side-progress-fill"
              style={{ width: `${(step / totalSteps) * 100}%` }}
            />
          </div>
          <span className="auth-side-progress-label">{step}/{totalSteps}</span>
        </div>
      )}
    </div>
  )
}
