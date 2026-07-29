import { useNavigate } from 'react-router-dom'
import { PenLine, X } from 'lucide-react'

const C = {
  bg:     'var(--color-bg)',
  card:   'var(--color-surface)',
  border: 'var(--color-border)',
  borderBright: 'var(--color-border-hover)',
  blue:   'var(--color-primary)',
  text:   'var(--color-text)',
  muted:  'var(--color-text-secondary)',
  subtle: 'var(--color-text-tertiary)',
}

export default function CreateProjectModal({ onClose }) {
  const navigate = useNavigate()

  function go(path) {
    onClose()
    navigate(path)
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 3000,
        background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: C.card, border: `1px solid ${C.borderBright}`,
        borderRadius: 20, padding: '32px 28px', width: '100%', maxWidth: 440,
        boxShadow: '0 24px 64px rgba(0,0,0,0.7)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: C.text, letterSpacing: '-0.3px' }}>
              Criar projeto
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: C.muted }}>
              Mostra o que fizeste — preenche os campos ao teu ritmo
            </p>
          </div>
          <button
            onClick={onClose}
            className="icon-btn-ghost"
          >
            <X size={18} />
          </button>
        </div>

        <button
          onClick={() => go('/novo')}
          style={{
            display: 'flex', alignItems: 'center', gap: 16,
            background: 'linear-gradient(135deg, var(--color-primary-subtle), rgba(79,70,229,0.08))',
            border: '1px solid var(--color-primary-subtle)',
            borderRadius: 14, padding: '18px 20px',
            cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
            transition: 'all 0.15s', width: '100%',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'linear-gradient(135deg, var(--color-primary-subtle), rgba(79,70,229,0.14))'; e.currentTarget.style.borderColor = 'var(--color-primary-subtle)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'linear-gradient(135deg, var(--color-primary-subtle), rgba(79,70,229,0.08))'; e.currentTarget.style.borderColor = 'var(--color-primary-subtle)' }}
        >
          <div style={{
            width: 44, height: 44, borderRadius: 12, flexShrink: 0,
            background: 'var(--color-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 16px var(--color-primary-subtle)',
          }}>
            <PenLine size={22} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 3 }}>
              Começar projeto
            </div>
            <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5 }}>
              Preenche os campos e constrói o teu portfólio
            </div>
          </div>
        </button>
      </div>
    </div>
  )
}
