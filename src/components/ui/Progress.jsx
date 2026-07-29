export function ProgressBar({ value = 0, max = 100, color, size = 'md', label, style }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  const heights = { sm: 4, md: 6, lg: 8 }
  const h = heights[size]

  const barColor = color || (
    pct >= 80 ? 'var(--color-success)' :
    pct >= 50 ? 'var(--color-primary)' :
    pct >= 25 ? 'var(--color-warning)' :
    'var(--color-text-tertiary)'
  )

  return (
    <div style={style}>
      {label && (
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          marginBottom: 'var(--sp-1)',
          fontSize: 'var(--text-xs)',
          color: 'var(--color-text-secondary)',
        }}>
          <span style={{ fontWeight: 600 }}>{label}</span>
          <span style={{ fontWeight: 700, color: barColor }}>{Math.round(pct)}%</span>
        </div>
      )}
      <div style={{
        height: h, borderRadius: 'var(--radius-full)',
        background: 'var(--color-border)',
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%', borderRadius: 'var(--radius-full)',
          background: barColor,
          width: `${pct}%`,
          transition: 'width 0.4s var(--ease-out)',
        }} />
      </div>
    </div>
  )
}

export function ProgressRing({ value = 0, size = 48, strokeWidth = 4, color, children }) {
  const r = (size - strokeWidth) / 2
  const circ = 2 * Math.PI * r
  const pct = Math.min(100, Math.max(0, value))
  const dash = (pct / 100) * circ

  const ringColor = color || (
    pct >= 80 ? 'var(--color-success)' :
    pct >= 50 ? 'var(--color-primary)' :
    pct >= 25 ? 'var(--color-warning)' :
    'var(--color-text-tertiary)'
  )

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', display: 'block' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none"
          stroke="var(--color-border)" strokeWidth={strokeWidth} />
        <circle cx={size/2} cy={size/2} r={r} fill="none"
          stroke={ringColor} strokeWidth={strokeWidth}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.4s var(--ease-out)' }}
        />
      </svg>
      {children && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {children}
        </div>
      )}
    </div>
  )
}
