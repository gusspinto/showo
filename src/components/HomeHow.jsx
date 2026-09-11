/* Bloco da home que mostra o que a Showo é hoje: um diário por projeto, não
   uma ficha que se preenche uma vez. À esquerda a ideia; à direita um diário
   a sério com commits do GitHub lá dentro (a integração vista em uso, não um
   logótipo numa parede). O visual é ilustrativo — aria-hidden. */

const GITHUB = (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.5-1.4-1.3-1.8-1.3-1.8-1.1-.7 0-.7 0-.7 1.2 0 1.9 1.2 1.9 1.2 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.7-1.6-2.7-.3-5.5-1.3-5.5-6 0-1.2.5-2.3 1.3-3.1-.2-.4-.6-1.6 0-3.2 0 0 1-.3 3.4 1.2a11.5 11.5 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.6 1.6.2 2.8 0 3.2.9.8 1.3 1.9 1.3 3.2 0 4.6-2.8 5.6-5.5 5.9.5.3.9 1 .9 2.2v3.3c0 .3.1.7.8.6A12 12 0 0 0 12 .3z"/>
  </svg>
)

const NOTE = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 20h9"/>
    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>
  </svg>
)

const TAGS = [
  'Diário de projeto',
  'Sincroniza o GitHub',
  'Importa PDF e slides',
  'Publica no LinkedIn',
]

const ENTRIES = [
  { kind: 'gh',   text: 'fix: mapa não centrava no evento selecionado', meta: 'GitHub · há 2 dias' },
  { kind: 'gh',   text: 'feat: filtro de eventos por distrito', meta: 'GitHub · há 4 dias' },
  { kind: 'note', text: 'Testei com 5 utilizadores. O onboarding está longo demais.', meta: 'Nota · há 1 semana' },
]

export default function HomeHow() {
  return (
    <section className="home-hw" id="como-funciona" aria-labelledby="home-hw-title">
      <div className="home-hw-inner">
        <div className="home-hw-copy">
          <h2 id="home-hw-title" className="home-hw-title">
            O projeto conta-se <span className="home-gradient-word">enquanto acontece</span>
          </h2>
          <p className="home-hw-lead">
            Cada avanço fica no diário do projeto, e os commits do GitHub entram
            sozinhos. A página monta-se com ele, pronta a partilhar num link.
          </p>
          <ul className="home-hw-tags">
            {TAGS.map(t => (
              <li key={t} className="home-hw-tag">{t}</li>
            ))}
          </ul>
        </div>

        <div className="home-hw-visual" aria-hidden="true">
          <div className="home-hw-diary">
            <div className="home-hw-diary-head">
              <span className="home-hw-diary-name">Diário · Vroom.pt</span>
              <span className="home-hw-diary-score">Score 74</span>
            </div>
            <ul className="home-hw-diary-list">
              {ENTRIES.map((e, i) => (
                <li key={i} className="home-hw-entry">
                  <span className={`home-hw-entry-mark home-hw-entry-mark--${e.kind}`}>
                    {e.kind === 'gh' ? GITHUB : NOTE}
                  </span>
                  <span className="home-hw-entry-body">
                    <span className={`home-hw-entry-text${e.kind === 'gh' ? ' is-code' : ''}`}>
                      {e.text}
                    </span>
                    <span className="home-hw-entry-meta">{e.meta}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
