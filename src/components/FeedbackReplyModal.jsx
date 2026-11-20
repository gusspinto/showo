import { Modal, Button } from './ui'

/* ══════════════════════════════════════════════════════════════════════════
   RESPOSTA A FEEDBACK: quando o Gustavo responde a um feedback enviado por
   alguém (feedback.admin_reply), aparece como popup a essa pessoa na
   próxima vez que usar a app. Dispara uma única vez (admin_reply_seen_at),
   marcada via RPC mark_feedback_reply_seen (ver AuthContext.jsx).
   ══════════════════════════════════════════════════════════════════════════ */

export default function FeedbackReplyModal({ reply, onClose }) {
  return (
    <Modal onClose={onClose} title="O Gustavo respondeu ao teu feedback">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)', alignItems: 'flex-start' }}>
        <p style={{ margin: 0, color: 'var(--color-text-secondary)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
          {reply}
        </p>
        <Button fullWidth onClick={onClose}>Entendido</Button>
      </div>
    </Modal>
  )
}
