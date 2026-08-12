import { useState, useId, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'

export default function Input({
  label, type = 'text', value, onChange, placeholder,
  required, disabled, error, hint, rows,
  style, inputStyle, ...props
}) {
  const [focused, setFocused] = useState(false)
  const id = useId()
  const isTextarea = type === 'textarea' || rows

  const fieldStyle = {
    width: '100%',
    background: 'var(--color-input-bg)',
    border: `1.5px solid ${error ? 'var(--color-error)' : focused ? 'var(--color-input-focus)' : 'var(--color-input-border)'}`,
    borderRadius: 'var(--radius-md)',
    padding: '10px 14px',
    color: 'var(--color-text)',
    fontSize: 'var(--text-base)',
    fontFamily: 'var(--font-body)',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color var(--duration-normal), box-shadow var(--duration-normal)',
    boxShadow: focused ? `0 0 0 3px ${error ? 'var(--color-error-subtle)' : 'var(--color-primary-subtle)'}` : 'none',
    resize: isTextarea ? 'vertical' : undefined,
    minHeight: isTextarea ? 100 : undefined,
    opacity: disabled ? 0.5 : 1,
    ...inputStyle,
  }

  const Field = isTextarea ? 'textarea' : 'input'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-1)', ...style }}>
      {label && (
        <label htmlFor={id} style={{
          fontSize: 'var(--text-sm)',
          fontWeight: 600,
          color: 'var(--color-text-secondary)',
          letterSpacing: '0.02em',
        }}>
          {label}{required && <span style={{ color: 'var(--color-error)', marginLeft: 2 }}>*</span>}
        </label>
      )}
      <Field
        id={id}
        type={isTextarea ? undefined : type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        rows={rows}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={fieldStyle}
        {...props}
      />
      {(error || hint) && (
        <span style={{
          fontSize: 'var(--text-xs)',
          color: error ? 'var(--color-error)' : 'var(--color-text-tertiary)',
          lineHeight: 1.4,
        }}>
          {error || hint}
        </span>
      )}
    </div>
  )
}

export function Select({ label, value, onChange, options = [], placeholder = 'Seleciona...', required, disabled, error, style, inputStyle, className }) {
  const [open, setOpen] = useState(false)
  const [focused, setFocused] = useState(false)
  const ref = useRef(null)
  const id = useId()

  const normalized = options.map(o => typeof o === 'string' ? { value: o, label: o } : o)
  const current = normalized.find(o => o.value === value)

  useEffect(() => {
    if (!open) return
    function handle(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  const triggerStyle = {
    width: '100%',
    background: 'var(--color-input-bg)',
    border: `1.5px solid ${error ? 'var(--color-error)' : focused || open ? 'var(--color-input-focus)' : 'var(--color-input-border)'}`,
    borderRadius: 'var(--radius-md)',
    padding: '10px 36px 10px 14px',
    color: current ? 'var(--color-text)' : 'var(--color-text-tertiary)',
    fontSize: 'var(--text-base)',
    fontFamily: 'var(--font-body)',
    outline: 'none',
    boxSizing: 'border-box',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    textAlign: 'left',
    boxShadow: (focused || open) ? `0 0 0 3px ${error ? 'var(--color-error-subtle)' : 'var(--color-primary-subtle)'}` : 'none',
    transition: 'border-color var(--duration-normal), box-shadow var(--duration-normal)',
    display: 'block',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    position: 'relative',
    ...inputStyle,
  }

  return (
    <div ref={ref} style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 'var(--sp-1)', ...style }} className={className}>
      {label && (
        <label htmlFor={id} style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text-secondary)', letterSpacing: '0.02em' }}>
          {label}{required && <span style={{ color: 'var(--color-error)', marginLeft: 2 }}>*</span>}
        </label>
      )}
      <div style={{ position: 'relative' }}>
        <button
          id={id}
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setOpen(o => !o)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={e => { if (e.key === 'Escape') setOpen(false) }}
          aria-expanded={open}
          aria-haspopup="listbox"
          style={triggerStyle}
        >
          {current?.label ?? placeholder}
        </button>
        <ChevronDown size={15} style={{ position: 'absolute', right: 12, top: '50%', transform: `translateY(-50%) rotate(${open ? 180 : 0}deg)`, transition: 'transform 0.15s', color: 'var(--color-text-secondary)', pointerEvents: 'none' }} />
      </div>
      {open && (
        <div role="listbox" style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: 'var(--color-surface)', border: '1.5px solid var(--color-input-border)', borderRadius: 'var(--radius-md)', boxShadow: '0 8px 24px rgba(0,0,0,0.2)', zIndex: 9999, maxHeight: 240, overflowY: 'auto', padding: '4px 0' }}>
          {normalized.map(o => (
            <div
              key={o.value}
              role="option"
              aria-selected={o.value === value}
              onMouseDown={e => { e.preventDefault(); onChange(o.value); setOpen(false) }}
              style={{ padding: '9px 14px', cursor: 'pointer', fontSize: 'var(--text-base)', color: 'var(--color-text)', background: o.value === value ? 'var(--color-primary-subtle)' : 'transparent', fontWeight: o.value === value ? 600 : 400 }}
              onMouseEnter={e => { if (o.value !== value) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
              onMouseLeave={e => { e.currentTarget.style.background = o.value === value ? 'var(--color-primary-subtle)' : 'transparent' }}
            >
              {o.label}
            </div>
          ))}
        </div>
      )}
      {error && <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-error)' }}>{error}</span>}
    </div>
  )
}
