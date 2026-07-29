import { useState } from 'react'

export default function Card({
  children, onClick, padding = 'md', hoverable, bordered = true, style, ...props
}) {
  const [hovered, setHovered] = useState(false)
  const isClickable = !!onClick || hoverable

  const paddings = {
    none: 0,
    sm: 'var(--sp-3)',
    md: 'var(--sp-4)',
    lg: 'var(--sp-6)',
  }

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered && isClickable ? 'var(--color-surface-hover)' : 'var(--color-surface)',
        border: bordered ? `1px solid ${hovered && isClickable ? 'var(--color-border-hover)' : 'var(--color-border)'}` : 'none',
        borderRadius: 'var(--radius-lg)',
        padding: paddings[padding],
        cursor: onClick ? 'pointer' : 'default',
        transition: `background var(--duration-fast), border-color var(--duration-fast)`,
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({ children, style }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 'var(--sp-3)',
      ...style,
    }}>
      {children}
    </div>
  )
}

export function CardTitle({ children, style }) {
  return (
    <h3 style={{
      margin: 0,
      fontSize: 'var(--text-md)',
      fontWeight: 700,
      color: 'var(--color-text)',
      fontFamily: 'var(--font-body)',
      letterSpacing: '-0.01em',
      ...style,
    }}>
      {children}
    </h3>
  )
}

export function SectionLabel({ children, style }) {
  return (
    <div style={{
      fontSize: 'var(--text-xs)',
      fontWeight: 700,
      color: 'var(--color-text-tertiary)',
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      marginBottom: 'var(--sp-3)',
      ...style,
    }}>
      {children}
    </div>
  )
}
