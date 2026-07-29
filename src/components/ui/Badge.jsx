const presets = {
  default:  { bg: 'var(--color-badge-bg)', color: 'var(--color-badge-text)' },
  primary:  { bg: 'var(--color-primary-subtle)', color: 'var(--color-primary)' },
  success:  { bg: 'var(--color-success-subtle)', color: 'var(--color-success)' },
  warning:  { bg: 'var(--color-warning-subtle)', color: 'var(--color-warning)' },
  error:    { bg: 'var(--color-error-subtle)', color: 'var(--color-error)' },
  info:     { bg: 'var(--color-info-subtle)', color: 'var(--color-info)' },
  accent:   { bg: 'var(--color-accent-subtle)', color: 'var(--color-accent)' },
}

export default function Badge({ children, variant = 'default', dot, size = 'sm', style }) {
  const p = presets[variant] || presets.default
  const isSmall = size === 'sm'

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      background: p.bg,
      color: p.color,
      fontSize: isSmall ? 'var(--text-2xs)' : 'var(--text-xs)',
      fontWeight: 700,
      padding: isSmall ? '2px 8px' : '3px 10px',
      borderRadius: 'var(--radius-full)',
      letterSpacing: '0.02em',
      lineHeight: 1.4,
      whiteSpace: 'nowrap',
      ...style,
    }}>
      {dot && (
        <span style={{
          width: 6, height: 6, borderRadius: '50%',
          background: p.color, flexShrink: 0,
        }} />
      )}
      {children}
    </span>
  )
}
