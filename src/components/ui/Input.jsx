import { useState, useId } from 'react'

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

export function Select({ label, value, onChange, options, required, disabled, error, style, ...props }) {
  const [focused, setFocused] = useState(false)
  const id = useId()

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
      <select
        id={id}
        value={value}
        onChange={onChange}
        required={required}
        disabled={disabled}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
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
          cursor: 'pointer',
          transition: 'border-color var(--duration-normal)',
        }}
        {...props}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {error && (
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-error)' }}>{error}</span>
      )}
    </div>
  )
}
