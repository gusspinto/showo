import { useRef, useState } from 'react'
import { CheckCircleIcon as Check } from '@solar-icons/react/bold/check-circle'
import { CloseIcon as X } from '@solar-icons/react/bold/close'
import { InfoCircleIcon as Info } from '@solar-icons/react/bold/info-circle'

const BORDER = {
  error: '#f43f5e',
  info: 'var(--color-text)',
  success: 'var(--color-success)',
}

function ToastIcon({ type, color }) {
  const size = 13
  if (type === 'error') return <X size={size} color={color} />
  if (type === 'info')  return <Info size={size} color={color} />
  return <Check size={size} color={color} />
}

const ICON_BG = {
  error: 'rgba(244,63,94,0.15)',
  info: 'var(--color-surface-hover)',
  success: 'var(--color-success-subtle)',
}

export function Toast({ message, type = 'success', visible }) {
  const border = BORDER[type] ?? BORDER.success
  const iconBg = ICON_BG[type] ?? ICON_BG.success

  return (
    <div style={{
      position: 'fixed', bottom: 28, right: 28,
      transform: `translateY(${visible ? 0 : 120}px)`,
      opacity: visible ? 1 : 0,
      background: 'var(--color-surface)',
      border: `1px solid ${border}40`,
      borderLeft: `3px solid ${border}`,
      borderRadius: 12,
      padding: '12px 18px',
      color: 'var(--color-text)',
      fontSize: 14, fontWeight: 600,
      zIndex: 3000,
      transition: 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.25s',
      maxWidth: 340,
      boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
      pointerEvents: 'none',
      fontFamily: 'inherit',
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <div style={{
        width: 24, height: 24, borderRadius: 6, flexShrink: 0,
        background: iconBg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: border,
      }}>
        <ToastIcon type={type} color={border} />
      </div>
      <span>{message}</span>
    </div>
  )
}

export function useToast() {
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' })
  const timer = useRef(null)

  function show(message, type = 'success') {
    clearTimeout(timer.current)
    setToast({ visible: true, message, type })
    timer.current = setTimeout(() => setToast(t => ({ ...t, visible: false })), 3000)
  }

  return { toast, show }
}
