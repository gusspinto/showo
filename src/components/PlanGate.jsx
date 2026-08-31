import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getPlan } from '../lib/plans'

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
    background: primary ? 'var(--color-text)' : 'transparent',
    color: primary ? 'var(--color-bg)' : 'var(--color-text)',
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

// Shows remaining AI uses: "2/10 restantes" or "Ilimitado"
export function AiUsageBadge({ feature, style, compact }) {
  const { planId, aiUsage } = useAuth()
  const plan = getPlan(planId)
  const limit = plan.ai[feature]
  if (limit === undefined) return null
  if (limit === 0) return null
  if (limit === Infinity) return null
  const used = aiUsage?.[feature] ?? 0
  const remaining = Math.max(0, limit - used)
  const isLow = remaining <= Math.ceil(limit * 0.25)
  const color = remaining === 0 ? 'var(--color-error)' : isLow ? 'var(--color-warning)' : 'var(--color-text-secondary)'
  const bg = remaining === 0 ? 'rgba(239,68,68,0.1)' : isLow ? 'rgba(251,191,36,0.1)' : 'rgba(148,163,184,0.1)'
  const border = remaining === 0 ? 'rgba(239,68,68,0.25)' : isLow ? 'rgba(251,191,36,0.25)' : 'rgba(148,163,184,0.15)'
  if (compact) {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        fontSize: '0.72rem', fontWeight: 600, color,
        ...style,
      }}>
        {remaining}/{limit} restantes
      </span>
    )
  }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontSize: '0.8rem', fontWeight: 700,
      color, background: bg, border: `1px solid ${border}`,
      padding: '5px 12px', borderRadius: '100px',
      ...style,
    }}>
      {remaining}/{limit} restantes
    </span>
  )
}

// Confirmation modal before consuming a limited AI use
export function ConfirmUseModal({ feature, remaining, limit, onConfirm, onCancel }) {
  const labels = {
    defense: 'Preparação de Defesa',
    diaryReport: 'Relatório do Diário',
    narrative: 'Narrativa IA',
    createProject: 'Criar Projeto com IA',
    coach: 'Coach IA',
  }
  const label = labels[feature] || feature
  return (
    <div style={C.overlay} onClick={onCancel}>
      <div style={C.modal} onClick={e => e.stopPropagation()}>
        <p style={C.title}>Usar {label}?</p>
        <p style={C.msg}>
          Tens apenas <strong>{remaining}</strong> de {limit} utilização{limit !== 1 ? 'ões' : ''} restante{remaining !== 1 ? 's' : ''} este mês no teu plano.
          {remaining === 1 && ' Esta é a tua última vez este mês.'}
        </p>
        <div style={C.actions}>
          <button style={C.btn(false)} onClick={onCancel}>Cancelar</button>
          <button style={C.btn(true)} onClick={onConfirm}>Usar agora</button>
        </div>
      </div>
    </div>
  )
}

// Inline badge showing current plan
export function PlanBadge({ style }) {
  const { planId } = useAuth()
  if (!planId || planId === 'free') return null
  const colors  = { build: '#2B7EF5', launch: '#C49A20', school: '#2B7EF5' }
  const labels  = { build: 'Build', launch: 'Launch', school: 'Escola' }
  const color   = colors[planId] ?? '#2B7EF5'
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 10px', borderRadius: '100px',
      fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.04em',
      background: color + '22', color,
      border: `1px solid ${color}44`,
      ...style,
    }}>
      {labels[planId] ?? planId}
    </span>
  )
}
