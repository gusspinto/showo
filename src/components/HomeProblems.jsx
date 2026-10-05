import { useEffect, useRef, useState } from 'react'
import './HomeProblems.css'

/* ══════════════════════════════════════════════════════════════════════════
   HomeProblems — "Problemas que resolvemos". Por público (abas), cada problema
   aparece como frase fria e, ao entrar no ecrã, desfaz-se e dá lugar à
   solução do Showo. Em telemóvel, tocar no cartão alterna os dois estados.
   Com prefers-reduced-motion não há transição: mostra-se a solução direta.
   ══════════════════════════════════════════════════════════════════════════ */

const AUDIENCES = [
  {
    id: 'prof',
    label: 'Professores',
    items: [
      {
        problem: 'Acompanhar trinta projetos de PAP em paralelo e não saber quem está a avançar.',
        solution: 'Cada aluno tem o projeto num único sítio, com progresso visível e o teu feedback junto dele.',
      },
      {
        problem: 'Validar um projeto só no fim, quando já não há tempo para corrigir.',
        solution: 'Acompanhas o projeto semana a semana e corriges a tempo, antes da entrega.',
      },
      {
        problem: 'Avaliar sem critérios comuns, com cada aluno a entregar num formato diferente.',
        solution: 'Um portefólio com a mesma estrutura para todos, pronto para validares e apresentares.',
      },
    ],
  },
  {
    id: 'stud',
    label: 'Estudantes',
    items: [
      {
        problem: 'Terminar a PAP e não ter nada organizado para mostrar numa entrevista.',
        solution: 'O trabalho fica num portefólio que se partilha com um único link.',
      },
      {
        problem: 'Esquecer o que fizeste no estágio até chegar a hora de escrever o currículo.',
        solution: 'Registas o progresso enquanto trabalhas, em poucos minutos por semana.',
      },
      {
        problem: 'Não saber explicar o valor do que fizeste.',
        solution: 'A IA ajuda-te a estruturar o problema, a solução e os resultados de cada projeto.',
      },
    ],
  },
  {
    id: 'free',
    label: 'Freelancers',
    items: [
      {
        problem: 'Ter trabalho real e nenhuma forma de o mostrar a um cliente.',
        solution: 'Cada projeto vira um caso com contexto, processo e resultado.',
      },
      {
        problem: 'Um currículo que não diz o que sabes fazer.',
        solution: 'Competências ligadas aos projetos que as provam, e não só uma lista.',
      },
      {
        problem: 'Clientes que pedem exemplos e acabas a enviar pastas de ficheiros.',
        solution: 'Um link único com os teus projetos e o perfil, pronto a enviar.',
      },
    ],
  },
]

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

function ProblemCard({ item, index }) {
  const ref = useRef(null)
  const [solved, setSolved] = useState(false)
  const [manual, setManual] = useState(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    // Só conta quando o cartão está na faixa central do ecrã, e só depois de
    // ficar lá um momento: o problema tem de se ler antes de se desfazer.
    let timer = null
    const obs = new IntersectionObserver(
      ([entry]) => {
        clearTimeout(timer)
        if (entry.isIntersecting) timer = setTimeout(() => setSolved(true), 900)
      },
      { threshold: 0, rootMargin: '-35% 0px -35% 0px' }
    )
    obs.observe(el)
    return () => { clearTimeout(timer); obs.disconnect() }
  }, [])

  // Toque/teclado: alterna. Depois de um toque manual, a visibilidade deixa de mandar.
  const isSolved = manual ?? solved
  const reduced = prefersReducedMotion()

  return (
    <button
      ref={ref}
      type="button"
      className={`hp-card${isSolved ? ' is-solved' : ''}${reduced ? ' is-reduced' : ''}`}
      style={{ '--hp-delay': `${index * 120}ms` }}
      aria-pressed={isSolved}
      onClick={() => setManual(!isSolved)}
    >
      <span className="hp-stage">
        <span className="hp-problem">
          <span className="hp-tag">Problema</span>
          <span className="hp-text">{item.problem}</span>
        </span>
        <span className="hp-solution" aria-hidden={!isSolved}>
          <span className="hp-tag hp-tag--solution">Com o Showo</span>
          <span className="hp-text">{item.solution}</span>
        </span>
      </span>
    </button>
  )
}

export default function HomeProblems() {
  const [activeId, setActiveId] = useState(AUDIENCES[0].id)
  const active = AUDIENCES.find(a => a.id === activeId)

  return (
    <section className="hp-section" aria-labelledby="hp-title">
      <div className="hp-inner">
        <h2 id="hp-title" className="hp-title">
          Problemas que <span className="hp-title-accent">resolvemos</span>
        </h2>

        <div className="hp-tabs" role="tablist" aria-label="Público">
          {AUDIENCES.map(a => (
            <button
              key={a.id}
              type="button"
              role="tab"
              id={`hp-tab-${a.id}`}
              aria-selected={a.id === activeId}
              aria-controls={`hp-panel-${a.id}`}
              className={`hp-tab${a.id === activeId ? ' is-active' : ''}`}
              onClick={() => setActiveId(a.id)}
            >
              {a.label}
            </button>
          ))}
        </div>

        <div
          key={active.id}
          role="tabpanel"
          id={`hp-panel-${active.id}`}
          aria-labelledby={`hp-tab-${active.id}`}
          className="hp-grid"
        >
          {active.items.map((item, i) => (
            <ProblemCard key={`${active.id}-${i}`} item={item} index={i} />
          ))}
        </div>
      </div>
    </section>
  )
}
