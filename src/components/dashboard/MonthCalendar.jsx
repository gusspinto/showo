import { useState, useMemo } from 'react'
import { AltArrowLeftIcon as ChevronLeft } from '@solar-icons/react/bold/alt-arrow-left'
import { AltArrowRightIcon as ChevronRight } from '@solar-icons/react/bold/alt-arrow-right'
import { PlusIcon as Plus } from '../icons/PlusIcon'
import MonthYearPicker from './MonthYearPicker'

const WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

function toISO(d) {
  const p = n => (n < 10 ? '0' + n : String(n))
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

// Três cores, todas da família da marca (e do ícone do Showo): a defesa é
// vermelha, as tarefas azul, os lembretes pessoais o teal de apoio. O teal
// do resto do site (--color-accent, #1a8a7a) é escuro de mais para um ponto
// de 4px em cima de um círculo escuro, quase não se via, por isso o ponto e
// a barrinha do calendário usam este teal mais claro só aqui, sem mexer no
// token global (usado em sítios bem mais visíveis, onde já tem contraste).
const REMINDER_DOT_COLOR = '#2dd4bf'
function eventTypeColor(type) {
  switch (type) {
    case 'defense':  return 'var(--color-error)'
    case 'task':     return 'var(--color-info)'
    case 'reminder': return REMINDER_DOT_COLOR
    default:         return 'var(--color-primary)'
  }
}

// Fundo da linha do evento por urgência (dias até à data), pedido do
// Gustavo: mais de 10 dias fica azul (longe), até 10 dias amarelo (a
// aproximar-se), até 5 dias vermelho (urgente). A cor do tipo de evento
// (eventTypeColor) continua só na barrinha à esquerda, não aqui.
function urgencyBg(dateStr, todayISO) {
  const days = Math.round((new Date(dateStr + 'T00:00:00') - new Date(todayISO + 'T00:00:00')) / 86400000)
  if (days <= 5) return 'var(--color-error-subtle)'
  if (days <= 10) return 'var(--color-warning-subtle)'
  return 'var(--color-primary-subtle)'
}

// Alcance do rolo de mês/ano: do ano de hoje até 5 à frente, sem anos para
// trás, pedido do Gustavo (é uma agenda para planear o que vem a seguir, não
// para consultar anos já passados). A partir do ano de hoje, não do mês em
// navegação, para o intervalo não andar a deslizar sozinho enquanto a
// pessoa navega com as setinhas.
const nowYear = new Date().getFullYear()
const PICKER_MIN_YEAR = nowYear
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
  const todayISO = toISO(new Date())
  const selectedEvents = eventsByDay[selectedDay] || []
  const selectedDate = new Date(selectedDay)

  return (
    <div className="mcal">
      {/* Header: mês centrado entre as setas, ao estilo widget de calendário
          do iOS, título único em foco, sem botões de texto a competir com ele.
          Tocar no título abre o rolo de mês/ano (MonthYearPicker), para não
          ser preciso clicar várias vezes nas setinhas para ir longe. Enquanto
          o rolo está aberto, as setinhas desaparecem (não fazem sentido com
          o rolo também a mudar o mês) e a grelha por baixo fica desfocada,
          para o foco ficar só no rolo. */}
      <div className="mcal-header">
        <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
          className={`mcal-nav-btn${pickerOpen ? ' is-hidden' : ''}`} tabIndex={pickerOpen ? -1 : 0}
          aria-label="Mês anterior"><ChevronLeft size={15} /></button>
        <button
          className={`mcal-title${pickerOpen ? ' is-open' : ''}`}
          onClick={() => setPickerOpen(v => !v)}
          aria-expanded={pickerOpen}
        >
          {MONTHS[cursor.getMonth()]} <span className="mcal-year">{cursor.getFullYear()}</span>
        </button>
        <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
          className={`mcal-nav-btn${pickerOpen ? ' is-hidden' : ''}`} tabIndex={pickerOpen ? -1 : 0}
          aria-label="Mês seguinte"><ChevronRight size={15} /></button>

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

      <div className={`mcal-body${pickerOpen ? ' is-blurred' : ''}`} aria-hidden={pickerOpen}>
        {/* Weekday labels */}
        <div className="mcal-weekdays">
          {WEEKDAYS.map((w, i) => <span key={i}>{w}</span>)}
        </div>

        {/* Day grid. Um dia já selecionado e sem eventos troca o número por
            um "+" amarelo: um atalho para adicionar lembrete sem ter de
            encontrar o botão lá em baixo, pedido do Gustavo. O primeiro
            toque seleciona o dia (como sempre); como já está selecionado e
            vazio, o segundo toque no mesmo círculo já é "adicionar". */}
        <div className="mcal-grid">
          {monthGrid.map(({ date, outside }, i) => {
            const key = date.toDateString()
            const dayEvents = eventsByDay[key] || []
            const isToday = key === todayKey
            const isSelected = key === selectedDay
            const isAddShortcut = isSelected && dayEvents.length === 0
            return (
              <button key={i} tabIndex={pickerOpen ? -1 : 0}
                onClick={() => isAddShortcut ? onAddReminder?.(date) : setSelectedDay(key)}
                aria-label={isAddShortcut ? `Adicionar lembrete, ${date.getDate()}` : undefined}
                className={`mcal-day${outside ? ' outside' : ''}${isToday ? ' today' : ''}${isSelected ? ' selected' : ''}${isAddShortcut ? ' is-add' : ''}`}>
                {isAddShortcut ? (
                  <Plus size={13} className="mcal-day-add" />
                ) : (
                  <span className="mcal-day-num">{date.getDate()}</span>
                )}
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
      </div>

      {/* Painel do dia selecionado: só aparece quando há mesmo alguma coisa
          marcada. Sem eventos, o "+" amarelo na própria grelha já resolve
          adicionar um lembrete, por isso o cabeçalho "Sábado, 31 de
          Outubro" + botão "+ Lembrete" + "Sem eventos." era três formas de
          dizer a mesma coisa vazia, pedido do Gustavo para tirar. O botão
          "+ Lembrete" também saiu daqui (não fazia sentido com o atalho da
          grelha já ali ao lado); em troca, cada linha agora abre para
          editar/remover ao clicar (onEventClick), o que faltava por
          completo antes. */}
      {selectedEvents.length > 0 && (
        <div className="mcal-panel">
          <span className="mcal-panel-date">
            {selectedDate.toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' })}
          </span>
          <div className="mcal-events">
            {selectedEvents.map((e, i) => (
              <button key={i} className="mcal-event" onClick={() => onEventClick?.(e)}
                style={{ background: urgencyBg(e.date, todayISO) }}>
                <div className="mcal-event-title">{e.title}</div>
                {e.subtitle && <div className="mcal-event-sub">{e.subtitle}</div>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
