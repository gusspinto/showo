import { useState } from 'react'

const sizes = {
  sm: { padding: '6px 12px', fontSize: 'var(--text-sm)', gap: 4, minHeight: 32 },
  md: { padding: '8px 16px', fontSize: 'var(--text-base)', gap: 6, minHeight: 38 },
  lg: { padding: '12px 24px', fontSize: 'var(--text-md)', gap: 8, minHeight: 44 },
}

const variants = {
  primary: (h) => ({
    background: h ? 'var(--color-primary-hover)' : 'var(--color-primary)',
    color: '#fff',
    border: 'none',
    boxShadow: h ? 'var(--shadow-md)' : 'var(--shadow-sm)',
  }),
  secondary: (h) => ({
    background: h ? 'var(--color-surface-hover)' : 'var(--color-surface)',
    color: 'var(--color-text)',
    border: '1px solid var(--color-border)',
    boxShadow: 'none',
  }),
  ghost: (h) => ({
    background: h ? 'var(--color-sidebar-hover)' : 'transparent',
    color: h ? 'var(--color-text)' : 'var(--color-text-secondary)',
    border: '1px solid transparent',
    boxShadow: 'none',
  }),
  danger: (h) => ({
    background: h ? 'var(--color-error)' : 'var(--color-error-subtle)',
    color: h ? '#fff' : 'var(--color-error)',
    border: h ? 'none' : '1px solid rgba(212,64,64,0.2)',
    boxShadow: 'none',
  }),
  accent: (h) => ({
    background: h ? 'var(--color-accent-hover)' : 'var(--color-accent)',
    color: '#fff',
    border: 'none',
    boxShadow: h ? 'var(--shadow-md)' : 'var(--shadow-sm)',
  }),
}

export default function Button({
  children, onClick, variant = 'primary', size = 'md',
  disabled, loading, icon, iconRight, fullWidth, style, ...props
}) {
  const [hovered, setHovered] = useState(false)
  const s = sizes[size]
  const v = variants[variant](hovered && !disabled)

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...v,
        ...s,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: s.gap,
        borderRadius: 'var(--radius-md)',
        fontFamily: 'var(--font-body)',
        fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : loading ? 0.7 : 1,
        transition: `background var(--duration-fast), color var(--duration-fast), border-color var(--duration-fast), box-shadow var(--duration-fast), opacity var(--duration-fast)`,
        width: fullWidth ? '100%' : undefined,
        whiteSpace: 'nowrap',
        lineHeight: 1,
        ...style,
      }}
      {...props}
    >
      {loading ? (
        <span style={{ width: 14, height: 14, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite', flexShrink: 0 }} />
      ) : icon ? (
        <span style={{ display: 'flex', flexShrink: 0 }}>{icon}</span>
      ) : null}
      {children}
      {iconRight && <span style={{ display: 'flex', flexShrink: 0 }}>{iconRight}</span>}
    </button>
  )
}
