import { useState, useEffect } from 'react'
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
// Ordena a lista toda a começar pelo testemunho mais relevante à feature —
// os outros seguem-se, para o carrossel ter por onde rodar em vez de mostrar
// sempre o mesmo. Nenhum é inventado, são os mesmos da Pricing/Home.
function orderTestimonials(feature) {
  const wanted = FEATURE_TESTIMONIAL_NAME[feature]
  const i = TESTIMONIALS.findIndex(t => t.name === wanted)
  if (i <= 0) return TESTIMONIALS
  return [TESTIMONIALS[i], ...TESTIMONIALS.slice(0, i), ...TESTIMONIALS.slice(i + 1)]
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
    width: '100%', display: 'flex', flexDirection: 'column',
    boxShadow: 'var(--shadow-xl)', margin: 'auto',
  },
  closeBtn: {
    position: 'absolute', top: '20px', right: '20px', zIndex: 1,
    display: 'flex', color: 'var(--color-text-secondary)',
    background: 'none', border: 'none', cursor: 'pointer', padding: '4px', lineHeight: 0,
  },
  // Cabeçalho simples, sem ícone nem gradiente.
  hero: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    gap: '12px', padding: 'var(--sp-8) var(--sp-8) var(--sp-2)', textAlign: 'center',
  },
  // Mesmo tratamento do .sdb-eyebrow do Dashboard (StudentDashboard.css) —
  // maiúsculas com letter-spacing É a convenção desta app para rótulos
  // pequenos ("RESUMO", "COMPLETUDE"...), não um "tell" genérico aqui.
  eyebrow: {
    fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em',
    color: 'var(--color-warning)', background: 'var(--color-warning-subtle)',
    padding: '5px 12px', borderRadius: 'var(--radius-full)',
  },
  title: { margin: 0, fontSize: '1.6rem', fontWeight: 700, color: 'var(--color-text)', fontFamily: 'var(--font-heading)', lineHeight: 1.25 },
  // Mesmo título, mas encostado à esquerda em cima dos botões — não centrado
  // como cabeçalho, é a versão que fica quando há upgrade a oferecer.
  titleRight: { margin: '0 0 4px', fontSize: '1.3rem', fontWeight: 700, color: 'var(--color-text)', fontFamily: 'var(--font-heading)', lineHeight: 1.25 },
  msg:   { margin: 0, fontSize: '0.98rem', color: 'var(--color-text-secondary)', lineHeight: 1.6, maxWidth: '420px' },
  body: { display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)', padding: 'var(--sp-8)' },
  // .sdb-panel--tint do Dashboard — o bloco de apoio à marca, tinta subtil,
  // não uma faixa azul cheia. É o mesmo painel que o resto da app usa para
  // "isto é importante mas não é O botão principal".
  upsell: {
    display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)',
    background: 'var(--color-primary-subtle)', border: '1px solid var(--color-primary-muted)',
    borderRadius: 'var(--radius-lg)', padding: 'var(--sp-5)',
  },
  upsellHead: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '8px' },
  upsellName: { fontSize: '1.15rem', fontWeight: 700, color: 'var(--color-text)', fontFamily: 'var(--font-heading)' },
  upsellPrice: { fontSize: '1.3rem', fontWeight: 700, color: 'var(--color-text)' },
  upsellPeriod: { fontWeight: 500, fontSize: '0.8rem', color: 'var(--color-text-secondary)' },
  upsellGain: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    fontSize: '0.88rem', color: 'var(--color-text-secondary)',
    borderTop: '1px solid var(--color-primary-muted)', paddingTop: 'var(--sp-3)',
  },
  upsellGainValue: { color: 'var(--color-primary)', fontWeight: 700 },
  errorText: { margin: 0, fontSize: '0.78rem', color: 'var(--color-error)' },
  // .sdb-panel simples — mesmo cartão neutro que qualquer painel do
  // Dashboard, só para o testemunho não se confundir visualmente com o
  // bloco do preço (que é o único a usar a tinta da marca).
  testimonial: {
    display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)',
    background: 'var(--color-surface)', border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)', padding: 'var(--sp-5)',
  },
  testimonialQuote: { margin: 0, fontSize: '0.95rem', color: 'var(--color-text)', lineHeight: 1.55, minHeight: '4.6em' },
  testimonialFooter: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' },
  testimonialPerson: { display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 },
  testimonialPhoto: { width: '36px', height: '36px', borderRadius: 'var(--radius-full)', objectFit: 'cover', flexShrink: 0 },
  testimonialName: { fontSize: '0.84rem', fontWeight: 700, color: 'var(--color-text)' },
  testimonialRole: {
    fontSize: '0.75rem', color: 'var(--color-text-secondary)',
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '260px',
  },
  testimonialDots: { display: 'flex', gap: '5px', flexShrink: 0 },
  testimonialDot: (active) => ({
    width: active ? '14px' : '5px', height: '5px', borderRadius: '3px',
    background: active ? 'var(--color-primary)' : 'var(--color-border)',
    transition: 'width 0.25s ease, background 0.25s ease',
  }),
  // Invertido (var(--color-text)/var(--color-bg)), não azul — o mesmo botão
  // "cheio" que a Home, o Login e o Registo já usam. O azul fica reservado
  // à faixa do plano em cima, não ao botão de ação.
  ctaPrimary: {
    width: '100%', padding: '15px 18px', borderRadius: 'var(--radius-full)', border: 'none',
    background: 'var(--color-text)', color: 'var(--color-bg)',
    fontWeight: 700, fontSize: '0.96rem', cursor: 'pointer', fontFamily: 'var(--font-body)',
    transition: 'opacity var(--duration-fast) var(--ease-out), transform 0.1s var(--ease-out)',
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
  const [askingParents, setAskingParents] = useState(false)
  const [checkoutError, setCheckoutError] = useState('')

  const title = typeof message === 'object' ? message?.title : 'Limite do plano atingido'
  const body  = typeof message === 'object' ? message?.body  : message
  const feature = typeof message === 'object' ? message?.feature : null

  // Próximo tier pago a partir do plano atual. Vem null para quem já está no Pro e para
  // contas de escola/professor (essas nunca são self-serve) — nesses casos não há CTA de
  // pagamento nenhum, só a mensagem e fechar.
  const upgrade = nextPaidPlan(planId)
  const gain = upgrade && feature ? upgradeGain(feature, planId, upgrade) : null

  // Carrossel de testemunhos, a começar no mais relevante à feature que
  // bloqueou a pessoa — pedido do Gustavo depois de ver o pop-up do
  // StudyFetch, onde os testemunhos mudam sozinhos em vez de ficar um só
  // fixo a olhar para a pessoa.
  const orderedTestimonials = orderTestimonials(feature)
  const [tIdx, setTIdx] = useState(0)
  useEffect(() => {
    if (!upgrade || orderedTestimonials.length < 2) return
    const id = setInterval(() => setTIdx(i => (i + 1) % orderedTestimonials.length), 5000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [upgrade, orderedTestimonials.length])
  const testimonial = upgrade ? orderedTestimonials[tIdx] : null

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

  // Muita gente deste público (alunos PAP) não tem cartão próprio — em vez
  // de bloquear a compra, dá um caminho para pedir a quem tem. Usa a mesma
  // sessão de checkout do Stripe (o link funciona para quem o abrir, não
  // precisa de sessão do Showo), só muda o canal: WhatsApp com mensagem
  // pronta, em vez de redirecionar logo o próprio browser.
  async function handleAskParents() {
    if (!upgrade) return
    // Aberto já, síncrono com o clique — se esperasse pelo fetch antes de
    // abrir, o Safari (e por vezes o Chrome) trata a nova aba como popup
    // não pedido pelo utilizador e bloqueia-a em silêncio, sem erro nenhum
    // visível. Só se muda o destino depois de o link estar pronto.
    const win = window.open('', '_blank')
    setAskingParents(true)
    setCheckoutError('')
    try {
      const returnPath = `${location.pathname}${location.search}`
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { plan: upgrade.id, returnPath },
      })
      if (error || !data?.url) {
        win?.close()
        setCheckoutError('Erro ao preparar o pedido. Tenta novamente.')
        return
      }
      // Segunda tentativa depois do Gustavo apontar que continuava a soar a
      // burla — "ajudas-me a pagar?" e explicar que é "direto pelo Stripe"
      // não é como ninguém fala mesmo. O mais curto e direto possível.
      const msg = `Olá! Podes pagar isto por mim? É para o Showo, o portefólio que ando a fazer: ${data.url}`
      const waUrl = `https://wa.me/?text=${encodeURIComponent(msg)}`
      if (win) win.location.href = waUrl
      else window.open(waUrl, '_blank')
    } catch {
      win?.close()
      setCheckoutError('Erro ao preparar o pedido. Tenta novamente.')
    } finally {
      setAskingParents(false)
    }
  }

  return (
    <div style={C.overlay} onClick={onClose}>
      <div style={C.modal} className="plan-gate-modal" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="icon-btn-ghost" style={C.closeBtn} aria-label="Fechar">
          <X size={20} />
        </button>

        {/* Com upgrade a oferecer, o título muda de sítio: em vez de cabeçalho
            centrado a abrir o modal, fica logo em cima dos botões de ação, no
            sítio onde a pessoa está mesmo a decidir o que fazer a seguir.
            Ideia do Gustavo — faz mais sentido o "porquê" estar colado ao
            "o que fazer", não separado no topo. */}
        {!upgrade && (
          <div style={C.hero}>
            <span style={C.eyebrow}>Limite atingido</span>
            <p style={C.title}>{title}</p>
            <p style={C.msg}>{body}</p>
          </div>
        )}

        {upgrade ? (
          <div style={C.body}>
            <div className="plan-gate-columns">
              <div className="plan-gate-col-left">
                <div style={C.upsell}>
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

                {testimonial && (
                  <div style={C.testimonial}>
                    <p style={C.testimonialQuote} key={tIdx} className="plan-gate-fade">“{testimonial.quote}”</p>
                    <div style={C.testimonialFooter}>
                      <div style={C.testimonialPerson}>
                        <img src={testimonial.photo} alt="" style={C.testimonialPhoto} />
                        <div style={{ minWidth: 0 }}>
                          <div style={C.testimonialName}>{testimonial.name}</div>
                          <div style={C.testimonialRole}>{testimonial.role}</div>
                        </div>
                      </div>
                      {orderedTestimonials.length > 1 && (
                        <div style={C.testimonialDots}>
                          {orderedTestimonials.map((_, i) => <span key={i} style={C.testimonialDot(i === tIdx)} />)}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="plan-gate-col-right">
                <p style={C.titleRight}>{title}</p>
                {checkoutError && <p style={C.errorText}>{checkoutError}</p>}
                {/* margin-top:auto empurra só este grupo (botões + confiança +
                    sair) para o fundo da coluna — o título fica preso ao
                    topo, junto ao cartão do preço à esquerda. Pedido do
                    Gustavo depois de ver os botões a meio da coluna. */}
                <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <button style={C.ctaPrimary} className="plan-gate-cta-primary" disabled={loading || askingParents} onClick={handleUpgrade}>
                      {loading ? 'A abrir…' : `Passar a ${upgrade.name} agora`}
                    </button>
                    <button style={C.ctaSecondary} disabled={loading || askingParents} onClick={handleAskParents}>
                      {askingParents ? 'A preparar…' : 'Pedir aos pais para pagar'}
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '20px', alignItems: 'center' }}>
                    <p style={C.trust}><Lock size={11} />Pagamento seguro via Stripe. Cancela quando quiseres.</p>
                    <button style={C.dismiss} onClick={onClose}>Agora não</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div style={C.body}>
            {checkoutError && <p style={C.errorText}>{checkoutError}</p>}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button style={{ ...C.ctaSecondary, width: 'auto', flex: 1 }} onClick={onClose}>Fechar</button>
              <button style={{ ...C.ctaPrimary, width: 'auto', flex: 1 }} className="plan-gate-cta-primary" onClick={() => { onClose(); navigate('/pricing') }}>Ver planos</button>
            </div>
          </div>
        )}
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
