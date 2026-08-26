import { useEffect } from 'react'
import { X } from 'lucide-react'

export default function Modal({ children, onClose, title, subtitle, width = 440 }) {
  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleEsc)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 'var(--sp-4)',
      }}
    >
      <div style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-xl)',
        padding: 'var(--sp-6)',
        width: '100%',
        maxWidth: width,
        maxHeight: 'calc(100dvh - 48px)',
        overflowY: 'auto',
        boxShadow: 'var(--shadow-xl)',
      }}>
        {(title || onClose) && (
          <div style={{
            display: 'flex', alignItems: 'flex-start',
            justifyContent: 'space-between',
            marginBottom: 'var(--sp-5)',
          }}>
            <div>
              {title && (
                <h3 style={{
                  margin: 0, fontSize: 'var(--text-lg)',
                  fontWeight: 700, color: 'var(--color-text)',
                  fontFamily: 'var(--font-heading)',
                  letterSpacing: '-0.02em',
                }}>
                  {title}
                </h3>
              )}
              {subtitle && (
                <p style={{
                  margin: '4px 0 0', fontSize: 'var(--text-sm)',
                  color: 'var(--color-text-secondary)',
                }}>
                  {subtitle}
                </p>
              )}
            </div>
            {onClose && (
              <button
                onClick={onClose}
                style={{
                  background: 'transparent', border: 'none',
                  color: 'var(--color-text-tertiary)',
                  cursor: 'pointer', padding: 0, display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  width: 44, height: 44, flexShrink: 0,
                  borderRadius: 'var(--radius-sm)',
                  transition: 'color var(--duration-fast)',
                }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--color-text)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text-tertiary)'}
              >
                <X size={18} />
              </button>
            )}
          </div>
        )}
        {children}
      </div>
    </div>
  )
}

export function ModalActions({ children }) {
  return (
    <div style={{
      display: 'flex', gap: 'var(--sp-2)',
      justifyContent: 'flex-end',
      marginTop: 'var(--sp-5)',
    }}>
      {children}
    </div>
  )
}
