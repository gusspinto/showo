import './SegmentedTabs.css'

/* Controlo de segmento com pill deslizante. Usado no Explorar
   (Projetos / Pessoas) e na dashboard do professor (Progresso / A rever). */
export default function SegmentedTabs({ value, onChange, options, className = '' }) {
  const activeIdx = Math.max(0, options.findIndex(o => o.id === value))
  const n = options.length

  return (
    <div className={`seg-wrap${className ? ` ${className}` : ''}`} role="tablist">
      <div
        className="seg-pill"
        style={{
          width: `calc((100% - 8px) / ${n})`,
          transform: `translateX(calc(${activeIdx} * 100%))`,
        }}
      />
      {options.map(o => (
        <button
          key={o.id}
          type="button"
          role="tab"
          aria-selected={o.id === value}
          onClick={() => onChange(o.id)}
          className={`seg-btn${o.id === value ? ' active' : ''}`}
        >
          {o.icon}
          <span className="seg-label">{o.label}</span>
        </button>
      ))}
    </div>
  )
}
