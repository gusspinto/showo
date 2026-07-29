import { Navbar } from '../Navbar'

export default function PageLayout({ children, wide, style }) {
  return (
    <>
      <Navbar />
      <div
        className={wide ? 'page-content-wide' : 'page-content'}
        style={style}
      >
        {children}
      </div>
    </>
  )
}

export function PageHeader({ title, subtitle, actions, style }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 'var(--sp-4)',
      marginBottom: 'var(--sp-8)',
      flexWrap: 'wrap',
      ...style,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        {title && (
          <h1 style={{
            margin: 0,
            fontSize: 'var(--text-2xl)',
            fontWeight: 400,
            fontFamily: 'var(--font-display)',
            color: 'var(--color-text)',
            letterSpacing: '-0.02em',
            lineHeight: 1.2,
          }}>
            {title}
          </h1>
        )}
        {subtitle && (
          <p style={{
            margin: 'var(--sp-2) 0 0',
            fontSize: 'var(--text-base)',
            color: 'var(--color-text-secondary)',
            lineHeight: 1.5,
          }}>
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div style={{ display: 'flex', gap: 'var(--sp-2)', flexShrink: 0 }}>
          {actions}
        </div>
      )}
    </div>
  )
}
