import { useRef, useState } from 'react'

const BORDER = {
  error: '#f43f5e',
  info: '#3b82f6',
  success: '#22c55e',
}

const ICON = {
  error: '✕',
  info: 'ℹ',
  success: '✓',
}

const ICON_BG = {
  error: 'rgba(244,63,94,0.15)',
  info: 'rgba(59,130,246,0.15)',
  success: 'rgba(34,197,94,0.15)',
}

export function Toast({ message, type = 'success', visible }) {
  const border = BORDER[type] ?? BORDER.success
  const icon = ICON[type] ?? ICON.success
  const iconBg = ICON_BG[type] ?? ICON_BG.success

  return (
    <div style={{
      position: 'fixed', bottom: 28, right: 28,
      transform: `translateY(${visible ? 0 : 120}px)`,
      opacity: visible ? 1 : 0,
      background: '#111c32',
      border: `1px solid ${border}40`,
      borderLeft: `3px solid ${border}`,
      borderRadius: 12,
      padding: '12px 18px',
      color: '#e8f2ff',
      fontSize: 14, fontWeight: 600,
      zIndex: 3000,
      transition: 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.25s',
      maxWidth: 340,
      boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
      pointerEvents: 'none',
      fontFamily: 'Inter, system-ui, sans-serif',
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <div style={{
        width: 24, height: 24, borderRadius: 6, flexShrink: 0,
        background: iconBg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 12, fontWeight: 700, color: border,
      }}>
        {icon}
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
