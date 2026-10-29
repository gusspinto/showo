import { useNavigate } from 'react-router-dom'
import { Modal, Button } from '../ui'
import { FireIcon as Fire } from '@solar-icons/react/bold/fire'

export default function FeaturedSpotlightModal({ project, onClose }) {
  const navigate = useNavigate()

  return (
    <Modal onClose={onClose} title="O teu projeto está em destaque">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#f59e0b', fontWeight: 600 }}>
          <Fire size={18} /> Em destaque esta semana
        </div>
        <p style={{ margin: 0 }}>
          O teu projeto <strong>{project.name}</strong> está em destaque no Explorar e na
          página inicial agora mesmo. Parabéns, continua assim.
        </p>
        <Button fullWidth onClick={() => { onClose(); navigate(`/projeto/${project.slug}`) }}>
          Ver o meu projeto em destaque
        </Button>
      </div>
    </Modal>
  )
}
