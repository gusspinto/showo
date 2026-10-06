import { useState } from 'react'
import './HomeHow.css'

/* O que é o Showo: ajuda a desenvolver e apresentar projetos, com IA a guiar o
   processo e um portefólio profissional no fim. Quatro momentos do percurso, cada
   um com um mockup. O quadro muda de cor com o pilar (as cores do ícone da marca).
   Visuais ilustrativos: aria-hidden. Hover (com rato), clique e teclado escolhem. */

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

// Cores do ícone da marca: azul, vermelho, amarelo e verde.
const PILLARS = [
  {
    id: 'desenvolver',
    color: '#2478f0',
    title: 'Desenvolver o projeto',
    desc: 'A IA guia-te secção a secção: problema, solução, processo e resultados. Sabes sempre o que falta.',
  },
  {
    id: 'registar',
    color: '#db4a3d',
    title: 'Registar o caminho',
    desc: 'Cada avanço fica no diário do projeto, com os commits do GitHub e as tuas notas.',
  },
  {
    id: 'guardar',
    color: '#cc9a1e',
    title: 'Guardar tudo num sítio',
    desc: 'Ficheiros, projetos e estados numa biblioteca. Escolhes o que fica privado e o que aparece no perfil.',
  },
  {
    id: 'apresentar',
    color: '#16A34A',
    title: 'Apresentar com um link',
    desc: 'Um portefólio profissional, pronto a partilhar com quem te quer conhecer.',
  },
]

function Mockup({ id }) {
  if (id === 'desenvolver') {
    return (
      <div className="hw3-mock hw3-mock--library">
        <div className="hw3-mock-head">
          <span className="hw3-mock-kicker">Projeto</span>
          <span className="hw3-mock-title">Mobilidade Escolar</span>
        </div>
        <div className="hw3-sections">
          <span className="hw3-section is-done">Problema</span>
          <span className="hw3-section is-done">Solução</span>
          <span className="hw3-section">Processo</span>
          <span className="hw3-section">Resultados</span>
        </div>
        <div className="hw3-ai-bubble">
          <span className="hw3-ai-icon">{SPARK}</span>
          <span className="hw3-ai-text">Faltam os resultados do teste com alunos.</span>
        </div>
      </div>
    )
  }
  if (id === 'registar') {
    return (
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
    )
  }
  if (id === 'guardar') {
    return (
      <div className="hw3-mock hw3-mock--library">
        <div className="hw3-mock-head">
          <span className="hw3-mock-kicker">Biblioteca</span>
          <span className="hw3-mock-title">3 itens</span>
        </div>
        <div className="hw3-files">
          <span className="hw3-file hw3-file--doc"><span className="hw3-file-type">DOC</span><span className="hw3-file-name">Relatório</span></span>
          <span className="hw3-file hw3-file--pdf"><span className="hw3-file-type">PDF</span><span className="hw3-file-name">Entrevista</span></span>
          <span className="hw3-file hw3-file--proj"><span className="hw3-file-type">PROJ</span><span className="hw3-file-name">Mobilidade</span></span>
        </div>
        <div className="hw3-chips">
          <span className="hw3-chip">No perfil</span>
          <span className="hw3-chip">Privado</span>
        </div>
      </div>
    )
  }
  return (
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
  )
}

export default function HomeHow() {
  const [active, setActive] = useState(0)
  const current = PILLARS[active]

  return (
    <section className="hw3" id="como-funciona" aria-labelledby="hw3-title">
      <div className="hw3-inner">
        <header className="hw3-head">
          <p className="hw3-eyebrow">O que é o Showo</p>
          <h2 id="hw3-title" className="hw3-title">
            Projetos que se tornam <span className="home-gradient-word">portefólio</span>
          </h2>
          <p className="hw3-lead">
            O Showo ajuda-te a desenvolver e apresentar os teus projetos. A IA guia o processo e transforma o resultado num portefólio profissional.
          </p>
        </header>

        <div className="hw3-panel">
          <div className="hw3-frame" aria-hidden="true" style={{ '--frame': current.color }}>
            <div className="hw3-canvas" key={current.id}>
              <Mockup id={current.id} />
            </div>
          </div>

          <ol className="hw3-list">
            {PILLARS.map((p, i) => {
              const isActive = i === active
              return (
                <li key={p.id} className={`hw3-item${isActive ? ' is-active' : ''}`} style={{ '--tone': p.color }}>
                  <button
                    type="button"
                    className="hw3-item-btn"
                    aria-pressed={isActive}
                    onClick={() => setActive(i)}
                    onMouseEnter={() => { if (window.matchMedia?.('(hover: hover)').matches) setActive(i) }}
                  >
                    <span className="hw3-item-title">{p.title}</span>
                    {isActive && <span className="hw3-item-desc">{p.desc}</span>}
                  </button>
                </li>
              )
            })}
          </ol>
        </div>
      </div>
    </section>
  )
}
