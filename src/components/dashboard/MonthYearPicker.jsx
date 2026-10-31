import { WheelColumn } from '../WheelDatePicker'
import useIsMobile from '../../lib/useIsMobile'

const MONTHS_FULL = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

/* Rolo de mês/ano, aberto ao tocar no título do calendário, mesma peça do
   WheelDatePicker (data da defesa nos projetos PAP): scroll nativo com
   scroll-snap, arrasta-se no telemóvel e roda-se com a roda do rato no
   desktop, tal como lá. Poupa cliques repetidos nas setinhas para navegar
   vários meses de uma vez. Em mobile o texto e as linhas ficam maiores
   (pedido do Gustavo: pouco impacto no espaço, mas lê-se muito melhor com
   o dedo a tocar, em vez do rato a apontar com precisão). */
export default function MonthYearPicker({ month, year, minYear, maxYear, onChange, onClose }) {
  const isMobile = useIsMobile()
  const itemHeight = isMobile ? 40 : 34
  const fontSize = isMobile ? 17 : 14.5
  const visibleRows = 5
  const years = []
  for (let y = minYear; y <= maxYear; y++) years.push(y)
  // Se as setinhas já tiverem levado para um ano fora do alcance do rolo
  // (ex: antes de nowYear, que já não está nos anos listados), não deixa
  // o índice ficar negativo, prende ao extremo mais próximo.
  const yearIndex = Math.min(years.length - 1, Math.max(0, year - minYear))

  return (
    <>
      <div className="mcal-picker-backdrop" onClick={onClose} />
      <div className="mcal-picker" role="dialog" aria-label="Escolher mês e ano">
        <div className="mcal-picker-band" style={{ height: itemHeight }} />
        <WheelColumn
          items={MONTHS_FULL}
          selectedIndex={month - 1}
          onSettle={i => onChange(i + 1, year)}
          width={isMobile ? 150 : 132}
          itemHeight={itemHeight} visibleRows={visibleRows} fontSize={fontSize}
        />
        <WheelColumn
          items={years.map(String)}
          selectedIndex={yearIndex}
          onSettle={i => onChange(month, years[i])}
          width={isMobile ? 74 : 66}
          itemHeight={itemHeight} visibleRows={visibleRows} fontSize={fontSize}
        />
      </div>
    </>
  )
}
