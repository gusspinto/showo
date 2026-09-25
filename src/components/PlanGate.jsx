import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { CloseIcon as X } from '@solar-icons/react/bold/close'
import { LockKeyholeIcon as Lock } from '@solar-icons/react/bold/lock-keyhole'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { getPlan, nextPaidPlan, upgradeGain } from '../lib/plans'
import { TESTIMONIALS } from './TestimonialsMarquee'

// Mesmo testemunho da Pricing/Home, sem inventar nada — só escolhido para
// soar relevante à feature que bloqueou a pessoa. Fora dos casos abaixo,
// cai no primeiro da lista partilhada.
const FEATURE_TESTIMONIAL_NAME = {
  defense: 'Rita Sousa',
  defenseTraining: 'Rita Sousa',
  exportPptx: 'Rita Sousa',
}
function pickTestimonial(feature) {
  const wanted = FEATURE_TESTIMONIAL_NAME[feature]
  return TESTIMONIALS.find(t => t.name === wanted) || TESTIMONIALS[0]
}

// Marca do plano ao lado do nome — a marca Showo na cor do plano
// (grátis não tem badge). Imagens em /public: plus.png, pro.png, escola.png.
const PLAN_BADGES = {
  plus:       { src: '/plus.png',   label: 'Plus',   color: '#D6453B' },
  pro:        { src: '/pro.png',    label: 'Pro',    color: '#C49A20' },
  school:     { src: '/escola.png', label: 'Escola', color: 'var(--color-primary)' },
  school_pro: { src: '/escola.png', label: 'Escola', color: 'var(--color-primary)' },
}

const C = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 9999, padding: '24px', overflowY: 'auto',
  },
  modal: {
    position: 'relative', background: 'var(--color-surface)', border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-xl)', overflow: 'hidden',
    maxWidth: '460px', width: '100%', display: 'flex', flexDirection: 'column',
    boxShadow: 'var(--shadow-xl)', margin: 'auto',
  },
  closeBtn: {
    position: 'absolute', top: '16px', right: '16px', zIndex: 1,
    display: 'flex', color: 'var(--color-text-secondary)',
    background: 'none', border: 'none', cursor: 'pointer', padding: '4px', lineHeight: 0,
  },
  // Cabeçalho com o brilho da marca por trás do badge do plano — o mesmo gradiente
  // reservado para a ação mais importante de cada ecrã (ver tokens.css).
  hero: {
    position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center',
    gap: '14px', padding: '44px 36px 28px', textAlign: 'center',
    background: 'radial-gradient(120% 100% at 50% -10%, var(--color-primary-subtle) 0%, transparent 65%)',
  },
  badgeGlow: {
    width: '76px', height: '76px', borderRadius: 'var(--radius-lg)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'var(--brand-gradient)', boxShadow: '0 10px 32px rgba(43,126,245,0.32)',
  },
  eyebrow: {
    fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase',
    color: 'var(--color-warning)', background: 'var(--color-warning-subtle)',
    padding: '4px 10px', borderRadius: 'var(--radius-full)',
  },
  title: { margin: 0, fontSize: '1.4rem', fontWeight: 700, color: 'var(--color-text)', fontFamily: 'var(--font-heading)', lineHeight: 1.28 },
  msg:   { margin: 0, fontSize: '0.92rem', color: 'var(--color-text-secondary)', lineHeight: 1.55, maxWidth: '340px' },
  body: { display: 'flex', flexDirection: 'column', gap: '18px', padding: '0 32px 32px' },
  upsell: {
    display: 'flex', flexDirection: 'column',
    background: 'var(--color-bg)', border: '1.5px solid var(--color-primary)',
    borderRadius: 'var(--radius-lg)', overflow: 'hidden',
  },
  upsellRibbon: {
    fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.03em', textTransform: 'uppercase',
    color: '#fff', background: 'var(--color-primary)', padding: '6px 18px', textAlign: 'center',
  },
  upsellInner: { display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px 20px' },
  upsellHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' },
  upsellName: { fontSize: '1rem', fontWeight: 700, color: 'var(--color-text)', fontFamily: 'var(--font-heading)' },
  upsellPrice: { fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-text)' },
  upsellPeriod: { fontWeight: 500, fontSize: '0.8rem', color: 'var(--color-text-secondary)' },
  upsellGain: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    fontSize: '0.86rem', color: 'var(--color-text-secondary)',
    borderTop: '1px solid var(--color-border)', paddingTop: '12px',
  },
  upsellGainValue: { color: 'var(--color-primary)', fontWeight: 700 },
  errorText: { margin: 0, fontSize: '0.78rem', color: 'var(--color-error)' },
  // Cartão de prova social próprio, não uma linha ao lado — é o que faz o pop-up
  // passar confiança, não só um preço a pedir dinheiro.
  testimonial: {
    display: 'flex', flexDirection: 'column', gap: '10px',
    background: 'var(--color-surface-alt, var(--color-bg))', border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)', padding: '18px 20px',
  },
  testimonialQuote: { margin: 0, fontSize: '0.86rem', color: 'var(--color-text)', lineHeight: 1.5, fontStyle: 'italic' },
  testimonialFooter: { display: 'flex', alignItems: 'center', gap: '10px' },
  testimonialPhoto: { width: '36px', height: '36px', borderRadius: 'var(--radius-full)', objectFit: 'cover', flexShrink: 0 },
  testimonialName: { fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-text)' },
  testimonialRole: {
    fontSize: '0.74rem', color: 'var(--color-text-secondary)',
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '280px',
  },
  ctaPrimary: {
    width: '100%', padding: '15px 18px', borderRadius: 'var(--radius-full)', border: 'none',
    background: 'var(--color-primary)', color: '#fff',
    fontWeight: 700, fontSize: '0.96rem', cursor: 'pointer', fontFamily: 'var(--font-body)',
    transition: 'background var(--duration-fast) var(--ease-out)',
  },
  ctaSecondary: {
    width: '100%', padding: '15px 18px', borderRadius: 'var(--radius-full)',
    border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--color-text)',
    fontWeight: 600, fontSize: '0.96rem', cursor: 'pointer', fontFamily: 'var(--font-body)',
  },
  dismiss: {
    background: 'none', border: 'none', cursor: 'pointer', padding: '4px', alignSelf: 'center',
    fontSize: '0.82rem', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)', textDecoration: 'underline',
  },
  trust: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
    margin: 0, fontSize: '0.76rem', color: 'var(--color-text-tertiary)', textAlign: 'center',
  },
  // Usados só pelo ConfirmUseModal abaixo — modal simples e compacto, à parte do
  // tratamento maior do PlanGateModal (que tem hero/body com o próprio padding).
  confirmModal: {
    background: 'var(--color-surface)', border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-xl)', padding: '28px 26px',
    maxWidth: '360px', width: '100%', display: 'flex', flexDirection: 'column', gap: '14px',
  },
  confirmTitle: { margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--color-text)', fontFamily: 'var(--font-heading)' },
  confirmMsg: { margin: 0, fontSize: '0.86rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 },
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
  const location = useLocation()
  const { planId } = useAuth()
  const [loading, setLoading] = useState(false)
  const [checkoutError, setCheckoutError] = useState('')

  const title = typeof message === 'object' ? message?.title : 'Limite do plano atingido'
  const body  = typeof message === 'object' ? message?.body  : message
  const feature = typeof message === 'object' ? message?.feature : null

  // Próximo tier pago a partir do plano atual. Vem null para quem já está no Pro e para
  // contas de escola/professor (essas nunca são self-serve) — nesses casos não há CTA de
  // pagamento nenhum, só a mensagem e fechar.
  const upgrade = nextPaidPlan(planId)
  const gain = upgrade && feature ? upgradeGain(feature, planId, upgrade) : null
  const testimonial = upgrade ? pickTestimonial(feature) : null

  async function handleUpgrade() {
    if (!upgrade) return
    setLoading(true)
    setCheckoutError('')
    try {
      const returnPath = `${location.pathname}${location.search}`
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { plan: upgrade.id, returnPath },
      })
      if (error || !data?.url) { setCheckoutError('Erro ao iniciar pagamento. Tenta novamente.'); return }
      window.location.href = data.url
    } catch {
      setCheckoutError('Erro ao iniciar pagamento. Tenta novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={C.overlay} onClick={onClose}>
      <div style={C.modal} onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="icon-btn-ghost" style={C.closeBtn} aria-label="Fechar">
          <X size={20} />
        </button>

        <div style={C.hero}>
          {upgrade ? (
            <div style={C.badgeGlow}>
              <img src={PLAN_BADGES[upgrade.id]?.src} alt="" width={28} height={28} style={{ objectFit: 'contain' }} />
            </div>
          ) : (
            <span style={C.eyebrow}>Limite atingido</span>
          )}
          <p style={C.title}>{title}</p>
          <p style={C.msg}>{body}</p>
        </div>

        <div style={C.body}>
          {/* Sem upgrade a oferecer (Pro, ou conta de escola/professor — nunca self-serve):
              fica só a mensagem e fechar, sem qualquer CTA de pagamento. */}
          {upgrade && (
            <div style={C.upsell}>
              <div style={C.upsellRibbon}>Desbloqueia já com o {upgrade.name}</div>
              <div style={C.upsellInner}>
                <div style={C.upsellHead}>
                  <span style={C.upsellName}>{upgrade.name}</span>
                  <span style={C.upsellPrice}>{upgrade.priceLabel}<span style={C.upsellPeriod}>{upgrade.period}</span></span>
                </div>
                {gain && (
                  <div style={C.upsellGain}>
                    <span>{gain.label}</span>
                    <span style={C.upsellGainValue}>{gain.value}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {testimonial && (
            <div style={C.testimonial}>
              <p style={C.testimonialQuote}>“{testimonial.quote}”</p>
              <div style={C.testimonialFooter}>
                <img src={testimonial.photo} alt="" style={C.testimonialPhoto} />
                <div>
                  <div style={C.testimonialName}>{testimonial.name}</div>
                  <div style={C.testimonialRole}>{testimonial.role}</div>
                </div>
              </div>
            </div>
          )}

          {checkoutError && <p style={C.errorText}>{checkoutError}</p>}

          {upgrade ? (
            <>
              <button style={C.ctaPrimary} disabled={loading} onClick={handleUpgrade}>
                {loading ? 'A abrir…' : `Passar a ${upgrade.name} agora`}
              </button>
              <p style={C.trust}><Lock size={11} />Pagamento seguro via Stripe. Cancela quando quiseres.</p>
              <button style={C.dismiss} onClick={onClose}>Agora não</button>
            </>
          ) : (
            <div style={{ display: 'flex', gap: '10px' }}>
              <button style={{ ...C.ctaSecondary, width: 'auto', flex: 1 }} onClick={onClose}>Fechar</button>
              <button style={{ ...C.ctaPrimary, width: 'auto', flex: 1 }} onClick={() => { onClose(); navigate('/pricing') }}>Ver planos</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Shows remaining AI uses: "2/10 restantes" or "Ilimitado"
export function AiUsageBadge({ feature, style, compact }) {
  const { user, planId, aiUsage } = useAuth()
  // Sem sessão não há limites de plano para mostrar — o utilizador ainda nem tem conta.
  if (!user) return null
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
      <div style={C.confirmModal} onClick={e => e.stopPropagation()}>
        <p style={C.confirmTitle}>Usar {label}?</p>
        <p style={C.confirmMsg}>
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

//   showLabel  — mostra também o nome do plano ao lado da marca
export function PlanBadge({ style, showLabel = false, size = 14 }) {
  const { planId } = useAuth()
  // A BD pode ter os IDs antigos (build/launch) ou os novos (plus/pro).
  const resolved = planId === 'build' ? 'plus' : planId === 'launch' ? 'pro' : planId
  const badge = PLAN_BADGES[resolved]
  if (!badge) return null

  return (
    <span title={`Plano ${badge.label}`} aria-label={`Plano ${badge.label}`} style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, flexShrink: 0, ...style,
    }}>
      <img src={badge.src} alt="" width={size} height={size} style={{ objectFit: 'contain', display: 'block' }} />
      {showLabel && (
        <span style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.02em', color: badge.color }}>
          {badge.label}
        </span>
      )}
    </span>
  )
}
