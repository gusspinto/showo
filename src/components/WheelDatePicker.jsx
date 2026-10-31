import { useEffect, useRef, useState, useCallback } from 'react'

const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

function daysInMonth(month, year) {
  return new Date(year, month, 0).getDate()
}

function clampDate(day, month, year, minYear, maxYear) {
  const y = Math.min(maxYear, Math.max(minYear, year))
  const m = Math.min(12, Math.max(1, month))
  const d = Math.min(daysInMonth(m, y), Math.max(1, day))
  return { day: d, month: m, year: y }
}

function toDateStr({ day, month, year }) {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function parseDateStr(value) {
  if (!value) return null
  const [y, m, d] = value.split('-').map(Number)
  if (!y || !m || !d) return null
  return { day: d, month: m, year: y }
}

/* Uma coluna de "rolo" — scroll nativo com scroll-snap, sem biblioteca
   nenhuma. O valor selecionado é sempre o que fica centrado atrás da faixa
   do meio; o próprio scroll-snap do browser trata do "encaixar" ao soltar.
   Além do scroll, cada linha também é clicável e seleciona-se logo — o
   scroll com a roda do rato por vezes anda pouco de mais por tick e o
   "mandatory" devolve à posição de origem, parecendo que não faz nada;
   clicar funciona sempre, scroll ou toque continuam a funcionar em paralelo. */
export function WheelColumn({ items, selectedIndex, onSettle, width, itemHeight, visibleRows, fontSize }) {
  const ref = useRef(null)
  const settleTimer = useRef(null)
  const programmatic = useRef(false)
  const mounted = useRef(false)
  const pad = (itemHeight * (visibleRows - 1)) / 2

  useEffect(() => {
    const el = ref.current
    if (!el) return
    programmatic.current = true
    el.scrollTo({ top: selectedIndex * itemHeight, behavior: mounted.current ? 'smooth' : 'auto' })
    mounted.current = true
    const id = setTimeout(() => { programmatic.current = false }, 300)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIndex, items.length])

  function handleScroll() {
    if (programmatic.current) return
    clearTimeout(settleTimer.current)
    settleTimer.current = setTimeout(() => {
      const el = ref.current
      if (!el) return
      const idx = Math.round(el.scrollTop / itemHeight)
      const clamped = Math.min(items.length - 1, Math.max(0, idx))
      el.scrollTo({ top: clamped * itemHeight, behavior: 'smooth' })
      if (clamped !== selectedIndex) onSettle(clamped)
    }, 120)
  }

  return (
    <div
      ref={ref}
      onScroll={handleScroll}
      style={{
        height: itemHeight * visibleRows,
        width,
        boxSizing: 'border-box',
        overflowY: 'scroll',
        scrollSnapType: 'y mandatory',
        scrollbarWidth: 'none',
        WebkitOverflowScrolling: 'touch',
        padding: `${pad}px 0`,
      }}
      className="wheel-date-col"
    >
      {items.map((label, i) => (
        <div
          key={i}
          onClick={() => {
            if (i === selectedIndex) return
            const el = ref.current
            if (el) { programmatic.current = true; el.scrollTo({ top: i * itemHeight, behavior: 'smooth' }) }
            onSettle(i)
          }}
          style={{
            height: itemHeight, scrollSnapAlign: 'center',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize, fontWeight: i === selectedIndex ? 700 : 500,
            color: i === selectedIndex ? 'var(--color-text)' : 'var(--color-text-tertiary)',
            fontVariantNumeric: 'tabular-nums', cursor: 'pointer',
            transition: 'color 0.15s, font-weight 0.15s',
          }}
        >
          {label}
        </div>
      ))}
    </div>
  )
}

/* Picker de data por rolos, à iOS — dia / mês / ano, cada um o seu scroll
   com snap (e clicável, para o rato no desktop). Pedido do Gustavo para a
   data de defesa deixar de ser um input nativo "aborrecido" (e, nalguns
   browsers mobile, literalmente em branco). O ano é limitado
   ([minYear, maxYear]) porque uma defesa não faz sentido fora dessa janela;
   os dias ajustam-se ao mês/ano (fevereiro bissexto incluído) via
   daysInMonth, nunca mostrando "31 de fevereiro".
   `compact` encolhe tudo (linhas mais baixas, menos visíveis, texto menor)
   para caber no cartão estreito da sidebar, sem ser outro componente. */
export default function WheelDatePicker({ value, onChange, minYear, maxYear, compact = false }) {
  const itemHeight = compact ? 30 : 40
  const visibleRows = compact ? 3 : 5
  const fontSize = compact ? 13 : 17
  const today = new Date()
  const fallback = clampDate(today.getDate(), today.getMonth() + 1, today.getFullYear(), minYear, maxYear)
  const [date, setDate] = useState(() => parseDateStr(value) || fallback)

  // Sem valor (ex: depois de "Limpar data"), os rolos voltam a mostrar o
  // dia de hoje — nunca ficam parados na última escolha, que já não
  // corresponde a nada guardado.
  useEffect(() => {
    const parsed = parseDateStr(value)
    const now = new Date()
    setDate(parsed
      ? clampDate(parsed.day, parsed.month, parsed.year, minYear, maxYear)
      : clampDate(now.getDate(), now.getMonth() + 1, now.getFullYear(), minYear, maxYear))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  const commit = useCallback((next) => {
    const clamped = clampDate(next.day, next.month, next.year, minYear, maxYear)
    setDate(clamped)
    onChange(toDateStr(clamped))
  }, [onChange, minYear, maxYear])

  const years = []
  for (let y = minYear; y <= maxYear; y++) years.push(y)
  const months = MONTH_LABELS
  const dayCount = daysInMonth(date.month, date.year)
  const days = Array.from({ length: dayCount }, (_, i) => i + 1)

  return (
    <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', userSelect: 'none' }}>
      {/* Faixa central, atrás das três colunas — a pista visual de "é aqui
          que o valor escolhido fica", igual à do iOS. */}
      <div style={{
        position: 'absolute', top: '50%', left: 0, right: 0, transform: 'translateY(-50%)',
        height: itemHeight, borderTop: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)',
        background: 'var(--color-primary-subtle)', pointerEvents: 'none', borderRadius: 8,
      }} />
      <WheelColumn
        items={days.map(String)}
        selectedIndex={date.day - 1}
        onSettle={i => commit({ ...date, day: i + 1 })}
        width={compact ? 42 : 56}
        itemHeight={itemHeight} visibleRows={visibleRows} fontSize={fontSize}
      />
      <WheelColumn
        items={months}
        selectedIndex={date.month - 1}
        onSettle={i => commit({ ...date, month: i + 1 })}
        width={compact ? 48 : 64}
        itemHeight={itemHeight} visibleRows={visibleRows} fontSize={fontSize}
      />
      <WheelColumn
        items={years.map(String)}
        selectedIndex={date.year - minYear}
        onSettle={i => commit({ ...date, year: years[i] })}
        width={compact ? 56 : 72}
        itemHeight={itemHeight} visibleRows={visibleRows} fontSize={fontSize}
      />
    </div>
  )
}
