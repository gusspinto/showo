import { useMemo } from 'react'
import { ArrowRightUpIcon as ArrowUpRight } from '@solar-icons/react/bold/arrow-right-up'
import { FlameIcon as Flame } from '@solar-icons/react/bold/flame'

/* ── Atividade ─────────────────────────────────────────────────────────────
   Era um gráfico de 12 semanas a ocupar o cartão inteiro, a maior parte
   vazia, com uma frase estranha ("mais registos que as anteriores" quando as
   anteriores eram zero). Simplificado para a mesma linguagem que já usamos
   nos popups (WeeklyCheckin, WeeklyRecap): o foguinho do streak + o que
   aconteceu esta semana, numa linha só — sem gráfico, sem comparação. */

export function ActivityPanel({ buckets, streak }) {
  const thisWeek = buckets[buckets.length - 1] || { entries: 0, tasks: 0 }
  const total = thisWeek.entries + thisWeek.tasks

  return (
    <section className="sdb-panel sdb-activity-mini">
      <span className="sdb-eyebrow">Atividade</span>
      <div className="sdb-activity-mini-row">
        <span className="sdb-activity-mini-count">
          {total > 0
            ? `${total} ${total === 1 ? 'registo' : 'registos'} esta semana`
            : 'Ainda nenhum registo esta semana'}
        </span>
        {streak > 0 && (
          <span className="sdb-activity-mini-streak">
            <Flame size={13} /> {streak} {streak === 1 ? 'semana seguida' : 'semanas seguidas'}
          </span>
        )}
      </div>
    </section>
  )
}

/* ── Progresso dos projetos ────────────────────────────────────────────────
   Responde a "em que ponto estão os meus projetos?". Uma barra por projeto,
   toda na cor da marca — a variação está no comprimento, não em cinco cores
   diferentes. */

export function ProjectProgressPanel({ projects, onOpen }) {
  const ranked = useMemo(
    () => [...projects].sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).slice(0, 5),
    [projects],
  )

  const scored = ranked.filter(p => p.score != null)
  const avg = scored.length
    ? Math.round(scored.reduce((s, p) => s + p.score, 0) / scored.length)
    : null

  return (
    <section className="sdb-panel sdb-chart">
      <header className="sdb-panel-head">
        <span className="sdb-eyebrow">Progresso dos projetos</span>
        {avg != null && <span className="sdb-chart-total">{avg}</span>}
      </header>
      <p className="sdb-chart-summary">
        {ranked.length === 0
          ? 'Cria um projeto para começares a ver o progresso aqui.'
          : avg == null
            ? 'Ainda sem análise. Preenche o projeto para receberes o score.'
            : `Média de ${avg} em 100 entre ${scored.length} projeto${scored.length !== 1 ? 's' : ''} analisado${scored.length !== 1 ? 's' : ''}.`}
      </p>

      {ranked.length > 0 && (
        <ul className="sdb-scorelist">
          {ranked.map(p => (
            <li key={p.id}>
              <button className="sdb-scorerow" onClick={() => onOpen(p)}>
                <span className="sdb-scorerow-name">{p.name}</span>
                <span className="sdb-scorerow-track">
                  <span className="sdb-scorerow-fill" style={{ width: `${p.score ?? 0}%` }} />
                </span>
                <span className="sdb-scorerow-value">{p.score ?? '—'}</span>
                <ArrowUpRight size={13} className="sdb-scorerow-go" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
