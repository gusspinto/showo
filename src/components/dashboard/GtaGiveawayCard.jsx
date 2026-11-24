import { useEffect, useState } from 'react'
import { CloseIcon as X } from '@solar-icons/react/bold/close'
import { supabase } from '../../lib/supabase'
import { resolvePlanId, getPlan } from '../../lib/plans'
import { Card, CardTitle, Button } from '../ui'

/* Cartão de participação no sorteio do GTA VI (campanha 24/11), no
   dashboard, não um pop-up nem uma página à parte, com a tipografia e os
   componentes normais da plataforma (Card/CardTitle/Button), sem ícone
   decorativo grande. Pedido do Gustavo: antes disto o email dizia "já
   participas" só por ter projeto publicado, sem clique nenhum, não dava
   a sensação real de participação, e não repetia o briefing do email
   (o que se ganha com cada ação). Agora há um clique explícito que grava
   em public.gta_giveaway_entries, com o plano atual da pessoa
   (resolvePlanId) à data da confirmação.

   Enquadramento legal (DL 422/89): a entrada no sorteio é só por mérito
   (publicar um projeto), nunca por pagamento, por isso o texto nunca diz
   "paga para teres mais chances". O benefício de assinar é sempre
   apresentado como garantido e à parte do sorteio, não como mais
   probabilidade de ganhar. */

const BRIEFING = [
  'Publicas o teu primeiro projeto: entras automaticamente no sorteio do GTA VI, de graça.',
  'O sorteio tem o GTA VI para 1 pessoa, e 2 meses de Plus grátis para mais 2 pessoas, todos só por participarem.',
  'Se assinares o Plus ou o anual esta semana, ganhas já 1 mês extra garantido, sem depender de sorteio nenhum.',
]

export default function GtaGiveawayCard({ userId, profile, projectCount }) {
  const [status, setStatus] = useState('loading') // loading | needs_project | can_confirm | confirming | confirmed | error
  const [dismissed, setDismissed] = useState(false)

  const key = `showo_gta_dismissed_${userId}`

  useEffect(() => {
    try { if (localStorage.getItem(key) === '1') setDismissed(true) } catch { /* ignore */ }
  }, [key])

  useEffect(() => {
    if (!userId || projectCount == null) return
    let cancelled = false
    supabase.from('gta_giveaway_entries').select('id').eq('user_id', userId).maybeSingle()
      .then(({ data }) => {
        if (cancelled) return
        if (data) setStatus('confirmed')
        else if (projectCount > 0) setStatus('can_confirm')
        else setStatus('needs_project')
      })
    return () => { cancelled = true }
  }, [userId, projectCount])

  async function handleConfirm() {
    setStatus('confirming')
    const { error } = await supabase.from('gta_giveaway_entries').insert({
      user_id: userId,
      plan_at_entry: resolvePlanId(profile),
    })
    if (error) { setStatus('error'); return }
    setStatus('confirmed')
  }

  function dismiss() {
    try { localStorage.setItem(key, '1') } catch { /* ignore */ }
    setDismissed(true)
  }

  if (dismissed || status === 'loading') return null

  const planLabel = getPlan(resolvePlanId(profile))?.name

  return (
    <Card padding="md" style={{ position: 'relative', marginBottom: 'var(--sp-4)' }}>
      {status !== 'confirmed' && (
        <button
          onClick={dismiss}
          aria-label="Dispensar"
          style={{ position: 'absolute', top: 10, right: 10, width: 26, height: 26, minHeight: 26, background: 'transparent', border: 'none', borderRadius: 7, cursor: 'pointer', color: 'var(--color-text-tertiary)', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        ><X size={13} /></button>
      )}

      <CardTitle style={{ marginBottom: 10, paddingRight: 24 }}>
        {status === 'confirmed' ? 'Estás dentro do sorteio do GTA VI' : 'Participa no sorteio de um GTA VI'}
      </CardTitle>

      {status !== 'confirmed' && (
        <ul style={{ margin: '0 0 14px', padding: '0 0 0 18px', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
          {BRIEFING.map((line, i) => <li key={i} style={{ marginBottom: 4 }}>{line}</li>)}
        </ul>
      )}

      {status === 'needs_project' && (
        <Button size="sm" onClick={() => { window.location.href = '/novo' }}>Publicar o meu projeto</Button>
      )}

      {status === 'can_confirm' && (
        <>
          <p style={{ margin: '0 0 12px', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
            Já tens projeto publicado, és elegível. Falta só confirmares{planLabel ? ` (plano ${planLabel})` : ''}.
          </p>
          <Button size="sm" onClick={handleConfirm}>Participar</Button>
        </>
      )}

      {status === 'confirming' && (
        <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>A confirmar…</p>
      )}

      {status === 'confirmed' && (
        <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
          Boa sorte. Avisamos por email quem ganha. Se ainda não assinaste o Plus ou o anual esta semana, continuas a tempo de garantir o mês extra.
        </p>
      )}

      {status === 'error' && (
        <>
          <p style={{ margin: '0 0 10px', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>Não foi possível confirmar agora.</p>
          <Button size="sm" onClick={handleConfirm}>Tentar de novo</Button>
        </>
      )}
    </Card>
  )
}
