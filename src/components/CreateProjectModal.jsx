import { useNavigate } from 'react-router-dom'
import { Sparkles, PenLine, X } from 'lucide-react'

const C = {
  bg:     'var(--c-bg)',
  card:   'var(--c-card)',
  border: 'var(--c-border)',
  borderBright: 'var(--c-border-bright)',
  blue:   '#1b78f7',
  text:   'var(--c-text)',
  muted:  'var(--c-muted)',
  subtle: 'var(--c-subtle)',
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
              Escolhe como queres começar
            </p>
          </div>
          <button
            onClick={onClose}
            className="icon-btn-ghost"
          >
            <X size={18} />
          </button>
        </div>

        {/* Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* IA option — primary */}
          <button
            onClick={() => go('/interview')}
            style={{
              display: 'flex', alignItems: 'center', gap: 16,
              background: 'linear-gradient(135deg, rgba(27,120,247,0.1), rgba(79,70,229,0.08))',
              border: '1px solid rgba(27,120,247,0.3)',
              borderRadius: 14, padding: '18px 20px',
              cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
              transition: 'all 0.15s', width: '100%',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(27,120,247,0.18), rgba(79,70,229,0.14))'; e.currentTarget.style.borderColor = 'rgba(27,120,247,0.5)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(27,120,247,0.1), rgba(79,70,229,0.08))'; e.currentTarget.style.borderColor = 'rgba(27,120,247,0.3)' }}
          >
            <div style={{
              width: 44, height: 44, borderRadius: 12, flexShrink: 0,
              background: '#1b78f7',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(27,120,247,0.35)',
            }}>
              <Sparkles size={22} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 3 }}>
                Criar com IA
              </div>
              <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5 }}>
                Responde a algumas perguntas e a IA constrói o teu projeto
              </div>
            </div>
          </button>

          {/* Manual option */}
          <button
            onClick={() => go('/novo')}
            style={{
              display: 'flex', alignItems: 'center', gap: 16,
              background: 'var(--c-bg-alt)',
              border: `1px solid ${C.border}`,
              borderRadius: 14, padding: '18px 20px',
              cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
              transition: 'all 0.15s', width: '100%',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--c-card-hover)'; e.currentTarget.style.borderColor = C.borderBright }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--c-bg-alt)'; e.currentTarget.style.borderColor = C.border }}
          >
            <div style={{
              width: 44, height: 44, borderRadius: 12, flexShrink: 0,
              background: 'var(--c-card-hover)', border: `1px solid ${C.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <PenLine size={20} color={C.muted} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 3 }}>
                Criar manualmente
              </div>
              <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5 }}>
                Preenche os campos diretamente ao teu ritmo
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}
