import { useEffect, useRef, useState } from 'react'
import './HomeHow.css'

/* "O que é o Showo" — um diário por projeto que se transforma em portfólio.
   Lado esquerdo: ideia em poucas palavras e três funcionalidades. Lado direito:
   uma linha do tempo do diário (commits, nota da IA, marco) com um anel de
   score e um cartão de portfólio sobreposto. O visual é ilustrativo: aria-hidden.
   Com prefers-reduced-motion aparece já no estado final. */

const GITHUB = (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.5-1.4-1.3-1.8-1.3-1.8-1.1-.7 0-.7 0-.7 1.2 0 1.9 1.2 1.9 1.2 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.7-1.6-2.7-.3-5.5-1.3-5.5-6 0-1.2.5-2.3 1.3-3.1-.2-.4-.6-1.6 0-3.2 0 0 1-.3 3.4 1.2a11.5 11.5 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.6 1.6.2 2.8 0 3.2.9.8 1.3 1.9 1.3 3.2 0 4.6-2.8 5.6-5.5 5.9.5.3.9 1 .9 2.2v3.3c0 .3.1.7.8.6A12 12 0 0 0 12 .3z"/>
  </svg>
)
const SPARK = (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l1.8 5.2L19 9l-5.2 1.8L12 16l-1.8-5.2L5 9l5.2-1.8L12 2zm7 11l.9 2.6L23 16.5l-3.1.9L19 20l-.9-2.6L15 16.5l3.1-.9L19 13z"/></svg>
)
const NOTE = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
)
const CHECK = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>
)

const FEATURES = [
  { icon: GITHUB, title: 'Sincroniza o GitHub', desc: 'Os commits entram sozinhos no diário.' },
  { icon: SPARK, title: 'A IA acompanha', desc: 'Lê o diário e sugere o que falta.' },
  { icon: CHECK, title: 'Portfólio pronto', desc: 'Partilhas um link com o trabalho feito.' },
]

const TIMELINE = [
  { kind: 'gh', tone: 'gh', title: 'fix: mapa não centrava no evento', meta: 'GitHub · há 2 dias', code: true },
  { kind: 'ai', tone: 'ai', title: 'Falta mostrar os resultados do teste.', meta: 'IA · há 3 dias' },
  { kind: 'note', tone: 'note', title: 'Testei com 5 utilizadores. Onboarding longo.', meta: 'Nota · há 1 semana' },
  { kind: 'done', tone: 'done', title: 'Secção de resultados publicada', meta: 'Portfólio · hoje' },
]

const ICON_FOR = { gh: GITHUB, ai: SPARK, note: NOTE, done: CHECK }

function useInView(threshold = 0.25) {
  const ref = useRef(null)
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') { setSeen(true); return }
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); obs.disconnect() } }, { threshold })
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return [ref, seen]
}

export default function HomeHow() {
  const [visRef, seen] = useInView()
  const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  return (
    <section className="hw2" id="como-funciona" aria-labelledby="hw2-title">
      <div className="hw2-inner">
        <div className="hw2-copy">
          <p className="hw2-eyebrow">O que é o Showo</p>
          <h2 id="hw2-title" className="hw2-title">
            Cada avanço fica <span className="home-gradient-word">registado</span>
          </h2>
          <p className="hw2-lead">Um diário por projeto que se transforma em portfólio.</p>

          <ul className="hw2-features">
            {FEATURES.map(f => (
              <li key={f.title} className="hw2-feature">
                <span className="hw2-feature-icon">{f.icon}</span>
                <span className="hw2-feature-body">
                  <span className="hw2-feature-title">{f.title}</span>
                  <span className="hw2-feature-desc">{f.desc}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className={`hw2-visual${seen ? ' is-in' : ''}${reduced ? ' is-reduced' : ''}`} ref={visRef} aria-hidden="true">
          <div className="hw2-diary">
            <div className="hw2-diary-head">
              <div>
                <span className="hw2-diary-kicker">Diário</span>
                <span className="hw2-diary-name">Vroom.pt</span>
              </div>
              <div className="hw2-ring" style={{ '--p': 74 }}>
                <span className="hw2-ring-num">74</span>
              </div>
            </div>

            <ol className="hw2-timeline">
              {TIMELINE.map((e, i) => (
                <li key={i} className={`hw2-step hw2-step--${e.tone}`} style={{ '--d': `${i * 140 + 120}ms` }}>
                  <span className="hw2-dot">{ICON_FOR[e.kind]}</span>
                  <span className="hw2-step-body">
                    <span className={`hw2-step-title${e.code ? ' is-code' : ''}`}>{e.title}</span>
                    <span className="hw2-step-meta">{e.meta}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>

          <div className="hw2-portfolio">
            <span className="hw2-portfolio-tag">Portfólio</span>
            <span className="hw2-portfolio-name">Vroom.pt</span>
            <span className="hw2-portfolio-bar"><span /></span>
            <span className="hw2-portfolio-meta">4 secções · publicado</span>
          </div>
        </div>
      </div>
    </section>
  )
}
