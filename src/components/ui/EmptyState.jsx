import Button from './Button'

export default function EmptyState({ icon, title, description, action, actionLabel, style }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      textAlign: 'center',
      padding: 'var(--sp-12) var(--sp-6)',
      ...style,
    }}>
      {icon && (
        <div style={{
          width: 56, height: 56, borderRadius: 'var(--radius-lg)',
          background: 'var(--color-surface-hover)',
          border: '1px solid var(--color-border-hover)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 'var(--sp-4)',
          color: 'var(--color-text)',
        }}>
          {icon}
        </div>
      )}
      {title && (
        <h3 style={{
          margin: '0 0 var(--sp-2)', fontSize: 'var(--text-md)',
          fontWeight: 700, color: 'var(--color-text)',
          fontFamily: 'var(--font-body)',
        }}>
          {title}
        </h3>
      )}
      {description && (
        <p style={{
          margin: 0, fontSize: 'var(--text-base)',
          color: 'var(--color-text-secondary)',
          lineHeight: 1.6, maxWidth: 360,
        }}>
          {description}
        </p>
      )}
      {action && actionLabel && (
        <div style={{ marginTop: 'var(--sp-5)' }}>
          <Button onClick={action} variant="primary">{actionLabel}</Button>
        </div>
      )}
    </div>
  )
}
