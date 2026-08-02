import { useMemo } from 'react'
import { ArrowUpRight } from 'lucide-react'

/* ── Atividade ─────────────────────────────────────────────────────────────
   Responde a "tenho estado a trabalhar nisto?". Duas séries reais: entradas
   do diário e tarefas concluídas. Nada de métricas decorativas. */

export function ActivityPanel({ buckets }) {
  const totals = useMemo(() => {
    const half = Math.floor(buckets.length / 2)
    const sum = arr => arr.reduce((s, b) => s + b.entries + b.tasks, 0)
    const recent = sum(buckets.slice(half))
    const before = sum(buckets.slice(0, half))
    return { all: recent + before, recent, before, delta: recent - before }
  }, [buckets])

  const max = Math.max(1, ...buckets.map(b => b.entries + b.tasks))

  const summary = totals.all === 0
    ? 'Ainda sem atividade registada. As entradas do diário e as tarefas concluídas aparecem aqui.'
    : totals.delta > 0
      ? `Mais ${totals.delta} ${totals.delta === 1 ? 'registo' : 'registos'} nas últimas semanas do que no período anterior.`
      : totals.delta < 0
        ? `Menos ${Math.abs(totals.delta)} ${Math.abs(totals.delta) === 1 ? 'registo' : 'registos'} do que no período anterior. Um registo curto chega para retomar o ritmo.`
        : 'Ritmo constante entre as últimas semanas e as anteriores.'

  return (
    <section className="sdb-panel sdb-chart">
      <header className="sdb-panel-head">
        <span className="sdb-eyebrow">Atividade</span>
        <span className="sdb-chart-total">{totals.all}</span>
      </header>
      <p className="sdb-chart-summary">{summary}</p>

      <div className="sdb-bars" role="img" aria-label="Atividade das últimas 12 semanas">
        {buckets.map((b, i) => {
          const total = b.entries + b.tasks
          const h = total === 0 ? 0 : Math.max(6, (total / max) * 100)
          const entriesShare = total === 0 ? 0 : (b.entries / total) * 100
          return (
            <div key={i} className="sdb-bar-slot"
              title={`Semana de ${b.label} — ${b.entries} registo${b.entries !== 1 ? 's' : ''}, ${b.tasks} tarefa${b.tasks !== 1 ? 's' : ''}`}>
              <div className="sdb-bar-track">
                {total === 0
                  ? <span className="sdb-bar-nil" />
                  : (
                    <span className="sdb-bar-fill" style={{ height: `${h}%` }}>
                      <span className="sdb-bar-seg sdb-bar-seg--entries" style={{ height: `${entriesShare}%` }} />
                      <span className="sdb-bar-seg sdb-bar-seg--tasks" style={{ height: `${100 - entriesShare}%` }} />
                    </span>
                  )}
              </div>
              <span className="sdb-bar-label">{i % 2 === 0 ? b.label : ''}</span>
            </div>
          )
        })}
      </div>

      <div className="sdb-legend">
        <span><i className="sdb-swatch sdb-swatch--entries" /> Diário</span>
        <span><i className="sdb-swatch sdb-swatch--tasks" /> Tarefas concluídas</span>
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
