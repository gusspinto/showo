import { WhopCheckoutEmbed } from '@whop/checkout/react'
import { CloseCircleIcon as CloseCircle } from '@solar-icons/react/linear/close-circle'
import './WhopCheckoutModal.css'

// Modal de checkout embutido do Whop. sessionId vem do whop-create-checkout-session
// (criado no servidor para podermos anexar metadata.user_id, que o
// whop-webhook lê de volta para saber a quem atualizar profiles.plan).
export function WhopCheckoutModal({ sessionId, onClose, onComplete }) {
  return (
    <div className="whop-modal-overlay" onClick={onClose}>
      <div className="whop-modal" onClick={e => e.stopPropagation()}>
        <button type="button" className="whop-modal-close" onClick={onClose} aria-label="Fechar">
          <CloseCircle size={20} />
        </button>
        <WhopCheckoutEmbed
          sessionId={sessionId}
          theme="dark"
          onComplete={() => onComplete?.()}
        />
      </div>
    </div>
  )
}
