import { useEffect, useRef, useState } from 'react'
import './HomeHow.css'

// Tempo de cada passo no modo automático (ms). A barra do passo ativo enche-se nesse tempo.
const STEP_MS = 5000

/* O que é o Showo, contado pelo percurso do utilizador: cria ou adiciona um
   projeto, a IA leva-o secção a secção, cada passo fica registado e tudo acaba
   num portefólio pronto a partilhar. Quatro passos, cada um com um mockup, e as
   cores do ícone da marca. Visuais ilustrativos: aria-hidden. Hover (com rato),
   clique e teclado escolhem o passo. */

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
const UPLOAD = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 15V4"/><path d="m7 9 5-5 5 5"/><path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/></svg>
)
const CHECK = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>
)

// Percurso do utilizador. Cores do ícone da marca: azul, vermelho, amarelo e verde.
const STEPS = [
  {
    id: 'criar',
    short: 'Criar',
    color: '#2478f0',
    title: 'Crias ou adicionas um projeto',
    desc: 'Começas do zero ou trazes um trabalho que já fizeste, escolar ou de trabalho.',
  },
  {
    id: 'desenvolver',
    short: 'Desenvolver',
    color: '#db4a3d',
    title: 'A IA leva-te secção a secção',
    desc: 'Problema, solução, processo e resultados. Sabes sempre o que falta.',
  },
  {
    id: 'registar',
    short: 'Registar',
    color: '#cc9a1e',
    title: 'Registas o caminho',
    desc: 'Cada avanço fica no diário, com os commits do GitHub e as tuas notas.',
  },
  {
    id: 'apresentar',
    short: 'Partilhar',
    color: '#16A34A',
    title: 'Tudo fica num só sítio',
    desc: 'Guardado como num drive, mas pensado para mostrar: um portefólio pronto a partilhar com um link.',
  },
]

function Mockup({ id }) {
  if (id === 'criar') {
    // Réplica do ecrã real de criação: enviar ficheiros ou descrever o trabalho.
    return (
      <div className="hw3-mock hw3-mock--new">
        <p className="hw3-new-title">Cria o teu <span className="home-gradient-word">trabalho</span></p>
        <div className="hw3-new-card">
          <div className="hw3-drop">
            <span className="hw3-drop-icon">{UPLOAD}</span>
            <span className="hw3-drop-name">Escolher ficheiros</span>
            <span className="hw3-drop-sub">PDF, Word, PowerPoint ou imagens</span>
          </div>
          <div className="hw3-new-btn">{SPARK}<span>Analisar e criar página</span></div>
        </div>
        <div className="hw3-divider"><span>ou</span></div>
        <div className="hw3-new-alt">Descrever o que estou a fazer</div>
      </div>
    )
  }
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
  // Perfil fictício, com a mesma estrutura do perfil real: banner, foto, nome,
  // frase, atividade e projetos.
  const heat = [0,1,0,2,0,0,3,1,0,0,2,0,1,0, 0,0,1,0,0,2,0,1,0,0,0,3,0,1]
  return (
    <div className="hw3-mock hw3-mock--profile">
      <div className="hw3-pf-banner" />
      <div className="hw3-pf-body">
        <div className="hw3-pf-avatar">IC</div>
        <div className="hw3-pf-name">Inês Carvalho <span className="hw3-pf-role">Designer</span></div>
        <div className="hw3-pf-headline">Estudante de Design, Porto</div>
        <div className="hw3-pf-heat" aria-hidden="true">
          {heat.map((lvl, i) => <span key={i} className={`hw3-pf-cell l${lvl}`} />)}
        </div>
        <div className="hw3-pf-projects">
          <div className="hw3-pf-project">
            <span className="hw3-pf-thumb hw3-pf-thumb--blue" />
            <span className="hw3-pf-ptext"><span className="hw3-pf-pname">Mobilidade Escolar</span><span className="hw3-pf-pmeta">Projeto Final</span></span>
            <span className="hw3-pf-score">74</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function HomeHow() {
  const [active, setActive] = useState(0)
  const [inView, setInView] = useState(false)
  const [hovering, setHovering] = useState(false)
  const sectionRef = useRef(null)
  const current = STEPS[active]
  const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const playing = inView && !hovering && !reduced

  // Só avança quando a secção está à vista.
  useEffect(() => {
    const el = sectionRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const obs = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.35 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  // Passo automático: troca de passo ao fim de STEP_MS. Mudar de passo (clique ou
  // automático) reinicia o temporizador, por isso a barra e o passo andam juntos.
  useEffect(() => {
    if (!playing) return
    const t = setTimeout(() => setActive(a => (a + 1) % STEPS.length), STEP_MS)
    return () => clearTimeout(t)
  }, [active, playing])

  return (
    <section ref={sectionRef} className="hw3" id="como-funciona" aria-labelledby="hw3-title">
      <div className="hw3-inner">
        <header className="hw3-head">
          <p className="hw3-eyebrow">O que é o Showo</p>
          <h2 id="hw3-title" className="hw3-title">
            Todos os teus trabalhos, <span className="home-gradient-word">num só portefólio</span>
          </h2>
          <p className="hw3-lead">
            Um portefólio fácil para guardar tudo o que fazes, na escola ou no trabalho. Como um drive, mas pensado para mostrar.
          </p>
        </header>

        <div className="hw3-panel" onMouseEnter={() => setHovering(true)} onMouseLeave={() => setHovering(false)}>
          <div className="hw3-frame" aria-hidden="true" style={{ '--frame': current.color }}>
            <div className="hw3-canvas" key={current.id}>
              <Mockup id={current.id} />
            </div>
          </div>

          <ol className="hw3-list">
            {STEPS.map((s, i) => {
              const isActive = i === active
              return (
                <li key={s.id} className={`hw3-item${isActive ? ' is-active' : ''}`} style={{ '--tone': s.color }}>
                  <button
                    type="button"
                    className="hw3-item-btn"
                    aria-pressed={isActive}
                    onClick={() => setActive(i)}
                  >
                    <span className="hw3-item-title">{s.title}</span>
                    {isActive && <span className="hw3-item-desc">{s.desc}</span>}
                  </button>
                  {/* Preenchimento da própria barra lateral do passo ativo. */}
                  {isActive && !reduced && (
                    <span
                      key={`${active}-${playing}`}
                      className={`hw3-progress-fill${playing ? '' : ' is-paused'}`}
                      style={{ animationDuration: `${STEP_MS}ms` }}
                      aria-hidden="true"
                    />
                  )}
                </li>
              )
            })}
          </ol>

          {/* Telemóvel: os passos viram pills, com a barra a encher-se por baixo da ativa. */}
          <div className="hw3-pills" role="group" aria-label="Passos">
            {STEPS.map((s, i) => {
              const isActive = i === active
              return (
                <button
                  key={s.id}
                  type="button"
                  className={`hw3-pill${isActive ? ' is-active' : ''}`}
                  aria-pressed={isActive}
                  onClick={() => setActive(i)}
                >
                  <span className="hw3-pill-label">{s.short}</span>
                  {isActive && !reduced && (
                    <span
                      key={`${active}-${playing}`}
                      className={`hw3-pill-fill${playing ? '' : ' is-paused'}`}
                      style={{ animationDuration: `${STEP_MS}ms` }}
                      aria-hidden="true"
                    />
                  )}
                </button>
              )
            })}
          </div>
          <p className="hw3-pills-desc">{current.desc}</p>
        </div>
      </div>
    </section>
  )
}
