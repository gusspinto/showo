import { RefreshCircleIcon as CalendarSync } from '@solar-icons/react/bold/refresh-circle'
import MonthCalendar from './MonthCalendar'

/* A Agenda já foi duas listas em paralelo: a grelha do mês (com o painel do
   dia selecionado por baixo) e uma lista "Próximos" com os próximos 30 dias
   agrupados. As duas mostravam o mesmo lembrete de hoje ao mesmo tempo, em
   dois estilos diferentes, o Gustavo apanhou isto. Ficou só a grelha: os
   pontos de cor em cada dia já dizem à distância onde há alguma coisa, e o
   painel do dia selecionado (dentro do MonthCalendar) mostra o detalhe. */
export default function AgendaPanel({ events, onAddReminder, onSync, onEventClick }) {
  return (
    <section className="sdb-panel sdb-agenda">
      {/* O "+" genérico de lembrete saiu daqui: o "+" amarelo na própria
          grelha (dia selecionado e vazio) e o "+ Lembrete" do painel do dia
          (dia com eventos) já cobrem os dois casos, pedido do Gustavo. Sem
          ele a competir por espaço, o botão de sincronizar passa a pílula
          com texto, não só um ícone escondido no canto. */}
      <header className="sdb-panel-head">
        <span className="sdb-eyebrow">Agenda</span>
        <button className="sdb-sync-btn" onClick={onSync}>
          <CalendarSync size={14} /> Sincronizar
        </button>
      </header>

      <MonthCalendar
        events={events}
        onAddReminder={onAddReminder}
        onEventClick={onEventClick}
      />
    </section>
  )
}
