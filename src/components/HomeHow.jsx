import { useEffect, useRef, useState } from 'react'
import './HomeHow.css'

/* Visão geral do Showo em quatro pilares: Registar (diário), Guardar (biblioteca),
   Ligar (IA) e Mostrar (portfólio). Cada pilar tem um mockup ilustrativo, por isso
   os visuais são aria-hidden; o texto de cada pilar é uma linha. Com
   prefers-reduced-motion os mockups aparecem já no estado final. */

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

const PILLARS = [
  { id: 'registar', label: 'Registar', line: 'Cada avanço fica no diário do projeto.' },
  { id: 'guardar', label: 'Guardar', line: 'Ficheiros, projetos e estados num só sítio.' },
  { id: 'ligar', label: 'Ligar', line: 'A IA lê o que fizeste e diz o que falta.' },
  { id: 'mostrar', label: 'Mostrar', line: 'Um portfólio pronto a partilhar com um link.' },
]

function useInView(threshold = 0.2) {
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

function Pillar({ p, index, children }) {
  const [ref, seen] = useInView()
  return (
    <article ref={ref} className={`hw3-card hw3-card--${p.id}${seen ? ' is-in' : ''}`} style={{ '--d': `${index * 120}ms` }}>
      <div className="hw3-stage" aria-hidden="true">{children}</div>
      <div className="hw3-caption">
        <span className="hw3-label">{p.label}</span>
        <p className="hw3-line">{p.line}</p>
      </div>
    </article>
  )
}

export default function HomeHow() {
  return (
    <section className="hw3" id="como-funciona" aria-labelledby="hw3-title">
      <div className="hw3-inner">
        <header className="hw3-head">
          <p className="hw3-eyebrow">O que é o Showo</p>
          <h2 id="hw3-title" className="hw3-title">
            Um sítio para <span className="home-gradient-word">tudo o que fazes</span>
          </h2>
        </header>

        <div className="hw3-grid">
          {/* Registar — diário do projeto, com entradas de GitHub e notas */}
          <Pillar p={PILLARS[0]} index={0}>
            <div className="hw3-mock hw3-mock--diary">
              <div className="hw3-mock-head">
                <span className="hw3-mock-kicker">Diário</span>
                <span className="hw3-mock-title">Mobilidade Escolar</span>
              </div>
              <div className="hw3-entry">
                <span className="hw3-dot hw3-dot--ink">{GITHUB}</span>
                <span className="hw3-entry-body"><span className="hw3-code">feat: cálculo de rotas</span><span className="hw3-meta">GitHub · há 2 dias</span></span>
              </div>
              <div className="hw3-entry">
                <span className="hw3-dot hw3-dot--amber">{NOTE}</span>
                <span className="hw3-entry-body"><span className="hw3-text">Testei com 5 alunos.</span><span className="hw3-meta">Nota · há 1 semana</span></span>
              </div>
            </div>
          </Pillar>

          {/* Guardar — biblioteca em grelha, com estados */}
          <Pillar p={PILLARS[1]} index={1}>
            <div className="hw3-mock hw3-mock--library">
              <div className="hw3-mock-head">
                <span className="hw3-mock-kicker">Biblioteca</span>
                <span className="hw3-mock-title">3 itens</span>
              </div>
              <div className="hw3-files">
                <span className="hw3-file hw3-file--doc"><span className="hw3-file-type">DOC</span><span className="hw3-file-name">Relatório PAP</span></span>
                <span className="hw3-file hw3-file--pdf"><span className="hw3-file-type">PDF</span><span className="hw3-file-name">Entrevista</span></span>
                <span className="hw3-file hw3-file--proj"><span className="hw3-file-type">PROJ</span><span className="hw3-file-name">Mobilidade</span></span>
              </div>
              <div className="hw3-chips">
                <span className="hw3-chip">No perfil</span>
                <span className="hw3-chip">Privado</span>
              </div>
            </div>
          </Pillar>

          {/* Ligar — sugestão da IA com confirmação */}
          <Pillar p={PILLARS[2]} index={2}>
            <div className="hw3-mock hw3-mock--ai">
              <div className="hw3-ai-bubble">
                <span className="hw3-ai-icon">{SPARK}</span>
                <span className="hw3-ai-text">Falta mostrar os resultados do teste.</span>
              </div>
              <div className="hw3-ai-actions">
                <span className="hw3-btn hw3-btn--solid">Adicionar ao perfil</span>
                <span className="hw3-btn">Ignorar</span>
              </div>
              <div className="hw3-ai-bar"><span /></div>
            </div>
          </Pillar>

          {/* Mostrar — portfólio com score e link */}
          <Pillar p={PILLARS[3]} index={3}>
            <div className="hw3-mock hw3-mock--portfolio">
              <div className="hw3-cover" />
              <div className="hw3-port-body">
                <span className="hw3-port-name">Mobilidade Escolar</span>
                <div className="hw3-port-row">
                  <span className="hw3-score">74</span>
                  <span className="hw3-link">{CHECK}showo.pt/u/bruno</span>
                </div>
              </div>
            </div>
          </Pillar>
        </div>
      </div>
    </section>
  )
}
