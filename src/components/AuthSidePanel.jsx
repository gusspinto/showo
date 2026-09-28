import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

// `note`: a linha de "o que acontece a seguir" (só faz sentido em /register,
// quem já tem conta não precisa que lhe expliquem o óbvio). Passada pelo
// chamador, nunca inventada aqui.
//
// O número de projetos vem da mesma RPC que a Home usa (get_total_project_count)
// — real, inclui privados, nunca um número inventado. Sem essa prova social
// concreta, este painel era só uma frase de marca a rodar; StudyFetch mostra
// sempre um número real ao lado do formulário de entrada/registo, e é essa a
// peça que faltava aqui.
export default function AuthSidePanel({ phrases, note }) {
  const [idx, setIdx] = useState(0)
  const [projectCount, setProjectCount] = useState(null)

  useEffect(() => {
    if (phrases.length < 2) return
    const id = setInterval(() => setIdx(i => (i + 1) % phrases.length), 4200)
    return () => clearInterval(id)
  }, [phrases.length])

  useEffect(() => {
    supabase.rpc('get_total_project_count').then(({ data }) => {
      if (data != null) setProjectCount(data)
    })
  }, [])

  const current = phrases[idx]

  return (
    <div className="auth-side">
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
        {projectCount != null && (
          <p className="auth-side-stat">
            <strong>{projectCount}+</strong> projetos já publicados por estudantes portugueses
          </p>
        )}
        {note && <p className="auth-side-note">{note}</p>}
      </div>
    </div>
  )
}
