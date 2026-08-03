import { useMemo, useState } from 'react'
import { Plus, CalendarSync, CalendarDays, ChevronDown } from 'lucide-react'
import MonthCalendar from './MonthCalendar'

const DOW = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D']

const TYPE_LABEL = { task: 'Tarefa', reminder: 'Lembrete', defense: 'Defesa' }

function toISO(d) {
  const p = n => (n < 10 ? '0' + n : String(n))
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

function dayLabel(iso, todayISO, tomorrowISO) {
  if (iso === todayISO) return 'Hoje'
  if (iso === tomorrowISO) return 'Amanhã'
  return new Date(iso + 'T00:00:00')
    .toLocaleDateString('pt-PT', { weekday: 'short', day: 'numeric', month: 'short' })
    .replace(/\./g, '')
}

export default function AgendaPanel({
  events, googleConnected, onAddReminder, onSync, onEventClick,
}) {
  const [showMonth, setShowMonth] = useState(
    () => localStorage.getItem('agenda-showMonth') !== 'false'
  )

  const today = new Date(); today.setHours(0, 0, 0, 0)
  const todayISO = toISO(today)
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowISO = toISO(tomorrow)

  /* Faixa de 7 dias a partir de hoje — dá o contexto da semana num relance,
     sem gastar a altura de uma grelha mensal numa coluna estreita. */
  const week = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today); d.setDate(d.getDate() + i)
      const iso = toISO(d)
      return {
        iso,
        day: d.getDate(),
        dow: DOW[(d.getDay() + 6) % 7],
        count: events.filter(e => e.date === iso).length,
        isToday: i === 0,
      }
    })
  }, [events, todayISO])

  /* Só o que ainda está à frente, e só até 30 dias — uma agenda que mostra
     coisas de daqui a três meses deixa de ser uma agenda. */
  const upcoming = useMemo(() => {
    const limit = new Date(today); limit.setDate(limit.getDate() + 30)
    const limitISO = toISO(limit)
    const list = events
      .filter(e => e.date >= todayISO && e.date <= limitISO)
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
    const groups = []
    list.forEach(e => {
      const last = groups[groups.length - 1]
      if (last && last.date === e.date) last.items.push(e)
      else groups.push({ date: e.date, items: [e] })
    })
    return groups
  }, [events, todayISO])

  const todayCount = events.filter(e => e.date === todayISO).length

  return (
    <section className="sdb-panel sdb-agenda">
      <header className="sdb-panel-head">
        <span className="sdb-eyebrow">Agenda</span>
        <div className="sdb-panel-head-actions">
          <button className="sdb-icon-btn sdb-icon-btn--quiet" onClick={() => onAddReminder()}
            title="Novo lembrete" aria-label="Novo lembrete"><Plus size={15} /></button>
          <button className="sdb-icon-btn sdb-icon-btn--quiet" onClick={onSync}
            title="Sincronizar calendário" aria-label="Sincronizar calendário"><CalendarSync size={15} /></button>
        </div>
      </header>

      <p className="sdb-agenda-today">
        {todayCount === 0
          ? 'Nada marcado para hoje.'
          : `${todayCount} ${todayCount === 1 ? 'coisa marcada' : 'coisas marcadas'} para hoje.`}
      </p>

      <div className="sdb-week">
        {week.map(d => (
          <div key={d.iso} className={`sdb-week-day${d.isToday ? ' is-today' : ''}`}>
            <span className="sdb-week-dow">{d.dow}</span>
            <span className="sdb-week-num">{d.day}</span>
            <span className="sdb-week-dots">
              {Array.from({ length: Math.min(d.count, 3) }).map((_, i) => (
                <span key={i} className="sdb-week-dot" />
              ))}
            </span>
          </div>
        ))}
      </div>

      {upcoming.length === 0 ? (
        <div className="sdb-agenda-empty">
          <p>Sem prazos nos próximos 30 dias.</p>
          <button className="sdb-linkbtn sdb-linkbtn--strong" onClick={onSync}>
            Sincronizar o teu calendário
          </button>
        </div>
      ) : (
        <ul className="sdb-agenda-list">
          {upcoming.slice(0, 4).map(group => (
            <li key={group.date} className="sdb-agenda-group">
              <span className={`sdb-agenda-date${group.date === todayISO ? ' is-today' : ''}`}>
                {dayLabel(group.date, todayISO, tomorrowISO)}
              </span>
              {group.items.map(e => (
                <button key={e.id} className={`sdb-agenda-item sdb-agenda-item--${e.type}`}
                  onClick={() => onEventClick?.(e)}>
                  <span className="sdb-agenda-bar" />
                  <span className="sdb-agenda-body">
                    <span className="sdb-agenda-title">{e.title}</span>
                    <span className="sdb-agenda-sub">
                      {TYPE_LABEL[e.type]}{e.subtitle ? ` · ${e.subtitle}` : ''}
                    </span>
                  </span>
                </button>
              ))}
            </li>
          ))}
        </ul>
      )}

      <button className={`sdb-agenda-toggle${showMonth ? ' is-open' : ''}`}
        onClick={() => setShowMonth(v => { const next = !v; localStorage.setItem('agenda-showMonth', String(next)); return next })}
        aria-expanded={showMonth}>
        <CalendarDays size={13} />
        {showMonth ? 'Fechar mês' : 'Ver o mês'}
        <ChevronDown size={13} className="sdb-agenda-chev" />
      </button>

      {showMonth && (
        <div className="sdb-agenda-month">
          <MonthCalendar
            events={events}
            onAddReminder={onAddReminder}
            onEventClick={onEventClick}
          />
        </div>
      )}

      {googleConnected === false && upcoming.length > 0 && (
        <p className="sdb-agenda-note">
          Ainda não está ligado ao Google ou Apple Calendar.
          {' '}<button className="sdb-linkbtn" onClick={onSync}>Ligar agora</button>
        </p>
      )}
    </section>
  )
}
