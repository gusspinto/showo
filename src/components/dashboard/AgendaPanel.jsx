import { useMemo } from 'react'
import { PlusIcon as Plus } from '../icons/PlusIcon'
import { RefreshCircleIcon as CalendarSync } from '@solar-icons/react/bold/refresh-circle'
import MonthCalendar from './MonthCalendar'

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
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const todayISO = toISO(today)
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowISO = toISO(tomorrow)

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

      <MonthCalendar
        events={events}
        onAddReminder={onAddReminder}
        onEventClick={onEventClick}
      />

      {upcoming.length > 0 && (
        <div className="sdb-agenda-upcoming">
          <span className="sdb-agenda-upcoming-label">Próximos</span>
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
        </div>
      )}

      {upcoming.length === 0 && googleConnected !== false && (
        <p className="sdb-agenda-note sdb-agenda-note--empty">Sem prazos nos próximos 30 dias.</p>
      )}

      {googleConnected === false && (
        <p className="sdb-agenda-note">
          Ainda não está ligado ao Google Calendar.
          {' '}<button className="sdb-linkbtn" onClick={onSync}>Ligar agora</button>
        </p>
      )}
    </section>
  )
}
