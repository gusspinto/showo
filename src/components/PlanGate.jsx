import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const C = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 9999, padding: '24px',
  },
  modal: {
    background: 'var(--color-surface)', border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-xl)', padding: '32px 28px',
    maxWidth: '380px', width: '100%', display: 'flex', flexDirection: 'column', gap: '16px',
  },
  title: { margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--color-text)', fontFamily: 'var(--font-heading)' },
  msg:   { margin: 0, fontSize: '0.88rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 },
  actions: { display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' },
  btn: (primary) => ({
    padding: '9px 18px', borderRadius: 'var(--radius-md)', border: primary ? 'none' : '1px solid var(--color-border)',
    background: primary ? 'var(--color-primary)' : 'transparent',
    color: primary ? '#fff' : 'var(--color-text)',
    fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'var(--font-body)',
  }),
}

export function PlanGateModal({ message, onClose }) {
  const navigate = useNavigate()
  const title = typeof message === 'object' ? message?.title : 'Limite do plano atingido'
  const body  = typeof message === 'object' ? message?.body  : message
  return (
    <div style={C.overlay} onClick={onClose}>
      <div style={C.modal} onClick={e => e.stopPropagation()}>
        <p style={C.title}>{title}</p>
        <p style={C.msg}>{body}</p>
        <div style={C.actions}>
          <button style={C.btn(false)} onClick={onClose}>Fechar</button>
          <button style={C.btn(true)} onClick={() => { onClose(); navigate('/pricing') }}>Ver planos</button>
        </div>
      </div>
    </div>
  )
}

// Inline badge showing current plan
export function PlanBadge({ style }) {
  const { planId } = useAuth()
  if (!planId || planId === 'free') return null
  const colors = { build: '#2B7EF5', launch: '#C49A20' }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 10px', borderRadius: '100px',
      fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.04em',
      background: colors[planId] + '22', color: colors[planId],
      border: `1px solid ${colors[planId]}44`,
      ...style,
    }}>
      {planId === 'build' ? 'Build' : 'Launch'}
    </span>
  )
}
