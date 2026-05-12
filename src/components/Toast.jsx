import { useRef, useState } from 'react'

export function Toast({ message, type = 'success', visible }) {
  const border = type === 'error' ? '#f87171' : type === 'info' ? '#3b82f6' : '#22c55e'
  const bg = type === 'error' ? '#1f0a0a' : type === 'info' ? '#0a0f1f' : '#0a1a0e'

  return (
    <div style={{
      position: 'fixed', bottom: 28, right: 28,
      transform: `translateY(${visible ? 0 : 120}px)`,
      opacity: visible ? 1 : 0,
      background: bg,
      border: `1px solid ${border}`,
      borderRadius: 12, padding: '13px 20px',
      color: '#fff', fontSize: 14, fontWeight: 600,
      zIndex: 3000,
      transition: 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.25s',
      maxWidth: 340,
      boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
      pointerEvents: 'none',
      fontFamily: 'system-ui, sans-serif',
    }}>
      {message}
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
