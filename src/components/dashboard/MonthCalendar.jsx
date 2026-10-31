import { useState, useMemo } from 'react'
import { AltArrowLeftIcon as ChevronLeft } from '@solar-icons/react/bold/alt-arrow-left'
import { AltArrowRightIcon as ChevronRight } from '@solar-icons/react/bold/alt-arrow-right'
import { PlusIcon as Plus } from '../icons/PlusIcon'
import MonthYearPicker from './MonthYearPicker'

const WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

// Três cores, todas da família da marca (e do ícone do Showo): a defesa é
// vermelha, as tarefas azul, os lembretes pessoais o teal de apoio.
function eventTypeColor(type) {
  switch (type) {
    case 'defense':  return 'var(--color-error)'
    case 'task':     return 'var(--color-info)'
    case 'reminder': return 'var(--color-accent)'
    default:         return 'var(--color-primary)'
  }
}

// Alcance do rolo de mês/ano: 3 anos para trás, 5 para a frente, a partir
// do ano de hoje (não do mês em navegação), para o intervalo não andar a
// deslizar sozinho enquanto a pessoa navega com as setinhas.
const nowYear = new Date().getFullYear()
const PICKER_MIN_YEAR = nowYear - 3
const PICKER_MAX_YEAR = nowYear + 5

export default function MonthCalendar({ events = [], onAddReminder, onEventClick }) {
  const [cursor, setCursor] = useState(() => { const d = new Date(); d.setDate(1); return d })
  const [selectedDay, setSelectedDay] = useState(() => new Date().toDateString())
  const [pickerOpen, setPickerOpen] = useState(false)

  const monthGrid = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
    const last  = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0)
    const startOffset = (first.getDay() + 6) % 7 // Monday-first
    const days = []
    for (let i = 0; i < startOffset; i++) {
      const d = new Date(first); d.setDate(d.getDate() - (startOffset - i)); days.push({ date: d, outside: true })
    }
    for (let d = 1; d <= last.getDate(); d++) {
      days.push({ date: new Date(cursor.getFullYear(), cursor.getMonth(), d), outside: false })
    }
    while (days.length % 7 !== 0) {
      const last_ = days[days.length - 1].date; const next = new Date(last_); next.setDate(next.getDate() + 1)
      days.push({ date: next, outside: true })
    }
    return days
  }, [cursor])

  const eventsByDay = useMemo(() => {
    const map = {}
    events.forEach(e => {
      const key = new Date(e.date + 'T00:00:00').toDateString()
      if (!map[key]) map[key] = []
      map[key].push(e)
    })
    return map
  }, [events])

  const todayKey = new Date().toDateString()
  const selectedEvents = eventsByDay[selectedDay] || []
  const selectedDate = new Date(selectedDay)

  return (
    <div className="mcal">
      {/* Header: mês centrado entre as setas, ao estilo widget de calendário
          do iOS, título único em foco, sem botões de texto a competir com ele.
          Tocar no título abre o rolo de mês/ano (MonthYearPicker), para não
          ser preciso clicar várias vezes nas setinhas para ir longe. */}
      <div className="mcal-header">
        <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
          className="mcal-nav-btn" aria-label="Mês anterior"><ChevronLeft size={15} /></button>
        <button
          className={`mcal-title${pickerOpen ? ' is-open' : ''}`}
          onClick={() => setPickerOpen(v => !v)}
          aria-expanded={pickerOpen}
        >
          {MONTHS[cursor.getMonth()]} <span className="mcal-year">{cursor.getFullYear()}</span>
        </button>
        <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
          className="mcal-nav-btn" aria-label="Mês seguinte"><ChevronRight size={15} /></button>

        {pickerOpen && (
          <MonthYearPicker
            month={cursor.getMonth() + 1}
            year={cursor.getFullYear()}
            minYear={PICKER_MIN_YEAR}
            maxYear={PICKER_MAX_YEAR}
            onChange={(month, year) => setCursor(new Date(year, month - 1, 1))}
            onClose={() => setPickerOpen(false)}
          />
        )}
      </div>

      {/* Weekday labels */}
      <div className="mcal-weekdays">
        {WEEKDAYS.map((w, i) => <span key={i}>{w}</span>)}
      </div>

      {/* Day grid */}
      <div className="mcal-grid">
        {monthGrid.map(({ date, outside }, i) => {
          const key = date.toDateString()
          const dayEvents = eventsByDay[key] || []
          const isToday = key === todayKey
          const isSelected = key === selectedDay
          return (
            <button key={i} onClick={() => setSelectedDay(key)}
              className={`mcal-day${outside ? ' outside' : ''}${isToday ? ' today' : ''}${isSelected ? ' selected' : ''}`}>
              <span className="mcal-day-num">{date.getDate()}</span>
              {dayEvents.length > 0 && (
                <span className="mcal-dots">
                  {dayEvents.slice(0, 3).map((e, i) => (
                    <span key={i} className="mcal-dot" style={{ background: eventTypeColor(e.type) }} />
                  ))}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Selected day panel */}
      <div className="mcal-panel">
        <div className="mcal-panel-header">
          <span className="mcal-panel-date">
            {selectedDate.toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' })}
          </span>
          <button className="mcal-add-btn" onClick={() => onAddReminder?.(selectedDate)}>
            <Plus size={12} /> Lembrete
          </button>
        </div>
        {selectedEvents.length === 0 ? (
          <div className="mcal-empty">Sem eventos.</div>
        ) : (
          <div className="mcal-events">
            {selectedEvents.map((e, i) => (
              <div key={i} className="mcal-event" onClick={() => onEventClick?.(e)}>
                <span className="mcal-event-bar" style={{ background: eventTypeColor(e.type) }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="mcal-event-title">{e.title}</div>
                  {e.subtitle && <div className="mcal-event-sub">{e.subtitle}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
