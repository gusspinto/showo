import { useState, useEffect } from 'react'
import BrandScene from './BrandScene'

// 28/09: teve por pouco tempo um número de projetos + uma frase de "o que
// acontece a seguir" (inspirado no ecrã de registo do StudyFetch). Feedback
// do Gustavo ao ver: texto a mais, a repetir o que a Home já diz mesmo antes
// de se chegar aqui. Volta a ser só a frase de marca a rodar — simples.
// 28/09 (2ª ronda): entra o BrandScene por trás — identidade própria com
// cartões de mini-projeto, em vez do painel escuro liso.
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
      <BrandScene />
      <div className="auth-side-content">
        <img src="/darkmode_icon_logo.png" alt="Showo" className="auth-side-mark" />
        <p className="auth-side-phrase" key={idx}>
          {current.lead}{' '}
          <span className="auth-side-highlight">
            {current.highlight.split('').map((ch, i) => (
              <span
                key={i}
                className="auth-side-letter"
                style={{ animationDelay: `${i * 0.035}s`, whiteSpace: ch === ' ' ? 'pre' : 'normal' }}
              >
                {ch === ' ' ? ' ' : ch}
              </span>
            ))}
          </span>
        </p>
      </div>
    </div>
  )
}
