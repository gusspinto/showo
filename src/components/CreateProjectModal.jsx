import { useNavigate } from 'react-router-dom'
import { PenNewRoundIcon as PenLine } from '@solar-icons/react/bold/pen-new-round'
import Modal from './ui/Modal'

export default function CreateProjectModal({ onClose }) {
  const navigate = useNavigate()

  function go(path) {
    onClose()
    navigate(path)
  }

  return (
    <Modal onClose={onClose} title="Criar projeto" subtitle="Mostra o que fizeste. Preenche os campos ao teu ritmo.">
      <button
        onClick={() => go('/novo')}
        style={{
          display: 'flex', alignItems: 'center', gap: 'var(--sp-4)',
          background: 'var(--color-primary-subtle)',
          border: '1px solid var(--color-primary-muted)',
          borderRadius: 'var(--radius-lg)', padding: 'var(--sp-4) var(--sp-5)',
          cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
          transition: 'all 0.15s', width: '100%',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-primary)' }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-primary-muted)' }}
      >
        <div style={{
          width: 44, height: 44, borderRadius: 'var(--radius-md)', flexShrink: 0,
          background: 'var(--color-primary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <PenLine size={20} color="#fff" />
        </div>
        <div>
          <div style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--color-text)', marginBottom: 3 }}>
            Começar projeto
          </div>
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
            Preenche os campos e constrói o teu portfólio
          </div>
        </div>
      </button>
    </Modal>
  )
}
