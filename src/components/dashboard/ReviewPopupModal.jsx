import { useState } from 'react'
import { StarIcon as Star } from '@solar-icons/react/bold/star'
import { Modal, Button, Input } from '../ui'
import { supabase } from '../../lib/supabase'

/* ══════════════════════════════════════════════════════════════════════════
   POP-UP DE AVALIAÇÃO: recolher testemunhos reais (checklist de growth,
   docs/checklist-growth-2026-11-04.md, sugestão do Savvy Growth). Dispara
   uma única vez por conta (profiles.review_popup_seen_at), quando algum
   projeto já tem score >= 71, para pedir no momento em que a pessoa já viu
   o produto a dar resultado. Guarda em public.testimonials, curado depois
   pelo admin (approved_for_marketing) antes de ser usado em Stories/marketing.
   consent_public é a resposta explícita da checkbox, não dá à conta
   automaticamente permissão: a curadoria do admin continua por cima disso.
   ══════════════════════════════════════════════════════════════════════════ */

export default function ReviewPopupModal({ userId, projectId, onClose }) {
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [message, setMessage] = useState('')
  const [consentPublic, setConsentPublic] = useState(false)
  const [status, setStatus] = useState('idle') // idle | sending | done | error

  async function handleSubmit() {
    if (!rating || status === 'sending') return
    setStatus('sending')
    const { error } = await supabase.from('testimonials').insert({
      user_id: userId,
      project_id: projectId,
      rating,
      message: message.trim() || null,
      consent_public: consentPublic,
    })
    if (error) { setStatus('error'); return }
    setStatus('done')
    setTimeout(onClose, 1400)
  }

  return (
    <Modal onClose={onClose} title="Posso pedir-te um favor?">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)', alignItems: 'flex-start' }}>
        {status === 'done' ? (
          <p style={{ margin: 0 }}>Obrigado a sério. Leio tudo o que escreves aqui.</p>
        ) : (
          <>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 700, lineHeight: 1.35 }}>
              Sou eu, o Gustavo, o fundador do Showo.
            </p>
            <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>
              Somos uma equipa pequena a construir isto do zero.<br />
              Vi que o teu projeto está a ficar com bom aspeto.<br />
              A tua opinião sincera, boa ou má, ajuda-nos mesmo a decidir o que vem a seguir.
            </p>

            <div style={{ display: 'flex', gap: 4 }}>
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  onMouseEnter={() => setHoverRating(n)}
                  onMouseLeave={() => setHoverRating(0)}
                  aria-label={`${n} estrelas`}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
                >
                  <Star
                    size={28}
                    style={{
                      color: (hoverRating || rating) >= n ? '#f59e0b' : 'var(--color-text-tertiary)',
                      opacity: (hoverRating || rating) >= n ? 1 : 0.4,
                    }}
                  />
                </button>
              ))}
            </div>

            <Input
              type="textarea"
              rows={3}
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="O que gostaste, o que te chateou, o que mudavas."
              style={{ width: '100%' }}
            />

            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: 'var(--color-text-secondary)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={consentPublic}
                onChange={e => setConsentPublic(e.target.checked)}
                style={{ marginTop: 2, cursor: 'pointer' }}
              />
              Podes usar isto como testemunho, para mostrar a outras pessoas o que o Showo faz de verdade.
            </label>

            {status === 'error' && (
              <p style={{ margin: 0, color: 'var(--color-error)', fontSize: 13 }}>Erro ao enviar. Tenta de novo.</p>
            )}

            <Button fullWidth onClick={handleSubmit} disabled={!rating || status === 'sending'}>
              {status === 'sending' ? 'A enviar...' : 'Enviar'}
            </Button>
          </>
        )}
      </div>
    </Modal>
  )
}
