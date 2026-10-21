import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useLocation } from 'react-router-dom'
import { CloseIcon as X } from '@solar-icons/react/bold/close'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { getPlan, nextPaidPlan, planHighlights } from '../lib/plans'

const LinkedInMark = ({ size = 14 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
    <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.55C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.72C24 .77 23.2 0 22.22 0z"/>
  </svg>
)

// Preview real do que se recebe, pedido do Gustavo depois do teaser do
// recap semanal ("eles têm de ter uma preview do que vai realmente ver se
// comprarem"). Em vez de um ícone genérico, mostra uma réplica fiel de uma
// das telas reais que a feature desbloqueia, com o mesmo texto e estrutura
// que o utilizador vai mesmo ver, não uma promessa abstrata. Mapeia cada
// feature de gate para a preview mais relevante; o que não tem mapa
// específico cai no Coach IA, a feature paga mais universal de todas.
const FEATURE_PREVIEW_KIND = {
  coach: 'coach',
  weeklyRecap: 'recap',
  internshipPage: 'vagas',
  vagaApplication: 'vagas',
  defense: 'defense',
  defenseTraining: 'defense',
}

function CoachPreview() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ alignSelf: 'flex-start', maxWidth: '85%', background: 'var(--color-bg-alt)', border: '1px solid var(--color-border)', borderRadius: '12px 12px 12px 4px', padding: '9px 12px', fontSize: 12.5, color: 'var(--color-text)', lineHeight: 1.5 }}>
        Faltam exemplos concretos na secção de resultados. Queres que escreva um rascunho?
      </div>
      <div style={{ alignSelf: 'flex-end', maxWidth: '70%', background: 'var(--color-primary)', borderRadius: '12px 12px 4px 12px', padding: '9px 12px', fontSize: 12.5, color: '#fff' }}>
        sim, por favor
      </div>
      <div style={{ alignSelf: 'flex-start', maxWidth: '85%', background: 'var(--color-bg-alt)', border: '1px solid var(--color-border)', borderRadius: '12px 12px 12px 4px', padding: '9px 12px', fontSize: 12.5, color: 'var(--color-text)', lineHeight: 1.5 }}>
        Pronto. Já tens um texto específico ao teu projeto, pronto a colar.
      </div>
    </div>
  )
}

function VagasPreview() {
  return (
    <div style={{ background: 'var(--color-bg-alt)', border: '1px solid var(--color-border)', borderRadius: 10, padding: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ width: 26, height: 26, borderRadius: 7, background: 'var(--color-primary-subtle)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 11, fontWeight: 800 }}>T</span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--color-text)' }}>Estágio em Marketing Digital</div>
          <div style={{ fontSize: 10.5, color: 'var(--color-text-secondary)' }}>TechCorp · Porto</div>
        </div>
      </div>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10.5, fontWeight: 700, color: 'var(--color-success)', background: 'var(--color-success-subtle)', padding: '3px 8px', borderRadius: 100 }}>
        ✓ Candidatura enviada
      </div>
    </div>
  )
}

function DefensePreview() {
  return (
    <div style={{ background: 'var(--color-bg-alt)', border: '1px solid var(--color-border)', borderRadius: 10, padding: 12 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Pergunta provável do júri</div>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--color-text)', marginBottom: 8 }}>"Porque escolheste esta solução e não outra?"</div>
      <div style={{ fontSize: 11.5, color: 'var(--color-text-secondary)', lineHeight: 1.5, borderLeft: '2px solid var(--color-primary-muted)', paddingLeft: 8 }}>
        Resposta sugerida, baseada no teu diário: menciona a alternativa que consideraste e o critério que decidiu.
      </div>
    </div>
  )
}

// Só o post de LinkedIn, pedido do Gustavo depois de ver o pop-up com
// email + números + citação + prazo, tudo junto: "muita informação e
// principalmente não compreensível". Um cartão só, a coisa mais concreta
// e reconhecível que a feature desbloqueia, sem repetir a mesma frase de
// exemplo em duas molduras diferentes.
function RecapPreview() {
  const { profile } = useAuth()
  const name = profile?.full_name || 'O teu nome'
  const initial = profile?.full_name ? profile.full_name.trim()[0].toUpperCase() : 'S'
  return (
    <div>
      {/* padding-right para nunca ficar por baixo do X de fechar, que é
          posicionado absoluto no canto do modal; margin-top para abrir
          distância clara da mesma zona (pedido do Gustavo: "ainda está em
          cima", depois de ver o rótulo perto de mais do botão). */}
      <p style={{ margin: '22px 26px 10px 0', fontSize: 9, fontWeight: 800, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        Post de LinkedIn pronto a publicar
      </p>
      <div style={{ background: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '12px 13px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 9 }}>
          <span style={{ width: 32, height: 32, borderRadius: '50%', background: '#1a60c8', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 13, fontWeight: 800 }}>{initial}</span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: '#1a1a1a' }}>{name}</div>
            <div style={{ fontSize: 10.5, color: '#5a5a5a' }}>via Showo · agora</div>
          </div>
          <span style={{ marginLeft: 'auto', color: '#0A66C2', flexShrink: 0, display: 'flex' }}><LinkedInMark size={16} /></span>
        </div>
        <p style={{ margin: 0, color: '#1a1a1a', fontSize: 12.5, lineHeight: 1.5 }}>
          Decidi simplificar o fluxo do DragBuild depois de testar com duas pessoas que acharam confuso.
        </p>
      </div>
    </div>
  )
}

function FeaturePreview({ feature }) {
  const kind = FEATURE_PREVIEW_KIND[feature] || 'coach'
  const label = {
    coach: 'Preview real do Coach IA',
    vagas: 'Preview real das vagas de estágio',
    defense: 'Preview real da preparação de defesa',
  }[kind]
  return (
    <div className="plan-gate-fade">
      {/* O recap não repete o rótulo aqui: a RecapPreview já tem o seu
          próprio, "o email que recebes, toda a segunda", que já diz o
          suficiente sem duplicar a ideia de "preview real" duas vezes. */}
      {label && <p style={{ margin: '0 0 10px', fontSize: 10.5, fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>}
      {kind === 'coach' && <CoachPreview />}
      {kind === 'vagas' && <VagasPreview />}
      {kind === 'defense' && <DefensePreview />}
      {kind === 'recap' && <RecapPreview />}
    </div>
  )
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
    backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
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
  // Mesmo título, mas encostado à esquerda, logo acima do cartão de preço
  // (pedido do Gustavo: "o que ganhas" mesmo em cima de "quanto custa"),
  // não centrado como cabeçalho, versão que fica quando há upgrade a
  // oferecer.
  titleRight: { margin: 'var(--sp-2) 0 10px', fontSize: '1.3rem', fontWeight: 700, color: 'var(--color-text)', fontFamily: 'var(--font-heading)', lineHeight: 1.25 },
  // Preenche o espaço entre o título e os botões com benefícios reais
  // (planHighlights, dados dos planos), em vez de ficar vazio no desktop
  // enquanto a coluna da esquerda, mais alta, não chega ao fundo.
  highlights: { display: 'flex', flexDirection: 'column', gap: '10px', margin: 'var(--sp-2) 0' },
  highlightItem: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '10px', fontSize: '0.88rem' },
  highlightLabel: { color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '7px' },
  highlightCheck: { color: 'var(--color-success)', fontWeight: 800, flexShrink: 0 },
  highlightValue: { color: 'var(--color-primary)', fontWeight: 700, whiteSpace: 'nowrap' },
  msg:   { margin: 0, fontSize: '0.98rem', color: 'var(--color-text-secondary)', lineHeight: 1.6, maxWidth: '420px' },
  body: { display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)', padding: 'var(--sp-6) var(--sp-8)' },
  // Um cartão só para "o que ganhas" (benefícios + periodicidade + preço),
  // em vez de três blocos soltos com ritmos diferentes (lista nua, pílulas
  // soltas, cartão tintado) — pedido do Gustavo.
  benefitsCard: {
    display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)',
    background: 'var(--color-bg-alt)', border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)', padding: 'var(--sp-5)',
  },
  upsellDivider: { height: 1, background: 'var(--color-border)' },
  periodToggle: {
    display: 'flex', gap: '3px', width: 'fit-content',
    background: 'var(--color-bg)', border: '1px solid var(--color-border)',
    padding: '3px', borderRadius: 'var(--radius-full)',
  },
  periodBtn: (active) => ({
    display: 'flex', alignItems: 'center', gap: '5px',
    padding: '5px 10px', border: 'none', borderRadius: 'var(--radius-full)',
    background: active ? 'var(--color-surface)' : 'transparent',
    color: active ? 'var(--color-text)' : 'var(--color-text-secondary)',
    fontWeight: 700, fontSize: '0.72rem', cursor: 'pointer', fontFamily: 'var(--font-body)',
    boxShadow: active ? 'var(--shadow-sm, 0 1px 2px rgba(0,0,0,0.06))' : 'none',
  }),
  periodBadge: {
    padding: '1px 6px', borderRadius: 'var(--radius-full)',
    backgroundImage: 'var(--brand-gradient)', color: '#fff',
    fontSize: '9px', fontWeight: 800, letterSpacing: '0.01em',
  },
  upsellHead: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '8px' },
  upsellName: { fontSize: '1.15rem', fontWeight: 700, color: 'var(--color-text)', fontFamily: 'var(--font-heading)' },
  upsellPrice: { fontSize: '1.3rem', fontWeight: 700, color: 'var(--color-text)' },
  upsellPeriod: { fontWeight: 500, fontSize: '0.8rem', color: 'var(--color-text-secondary)' },
  errorText: { margin: 0, fontSize: '0.78rem', color: 'var(--color-error)' },
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
    margin: 0, fontSize: '0.68rem', color: 'var(--color-text-tertiary)', textAlign: 'center',
    whiteSpace: 'nowrap',
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

export function PlanGateModal({ message, onClose, forcedPlan }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { planId, logFunnelEvent } = useAuth()
  const [loading, setLoading] = useState(false)
  const [askingParents, setAskingParents] = useState(false)
  const [checkoutError, setCheckoutError] = useState('')
  const [annual, setAnnual] = useState(false)

  // Mesma regra dos outros pop-ups (Modal.jsx, ShareStoryModal) — sem isto o
  // body continua a fazer scroll por trás no mobile enquanto o modal parece
  // fixo, dando a sensação de estar bugado.
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const title = typeof message === 'object' ? message?.title : 'Limite do plano atingido'
  const body  = typeof message === 'object' ? message?.body  : message
  const feature = typeof message === 'object' ? message?.feature : null

  // Próximo tier pago a partir do plano atual. Vem null para quem já está no Pro e para
  // contas de escola/professor (essas nunca são self-serve) — nesses casos não há CTA de
  // pagamento nenhum, só a mensagem e fechar. `forcedPlan` sobrepõe-se quando o chamador já
  // sabe que o "próximo tier" não chega (ex: link limpo só existe no Pro, não no Plus).
  const upgrade = forcedPlan || nextPaidPlan(planId)
  // O cartão de preço deixou de ter a linha "Recap semanal: incluído" (gain,
  // pedido do Gustavo, repetia a lista de benefícios ao lado). Sem exclude
  // aqui, essa feature volta a aparecer, mas só na lista, não duplicada.
  const highlights = upgrade ? planHighlights(planId, upgrade) : []

  // Registo do funil: quando alguém vê mesmo o pop-up de upgrade (não o nudge
  // leve do Dashboard, que já tinha isto). Só regista quando há oferta de
  // upgrade a mostrar — sem `upgrade` é só a mensagem de limite sem CTA.
  useEffect(() => {
    if (!upgrade) return
    logFunnelEvent('gate_shown', feature)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleUpgrade() {
    if (!upgrade) return
    setLoading(true)
    setCheckoutError('')
    try {
      const returnPath = `${location.pathname}${location.search}`
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { plan: upgrade.id, period: annual ? 'annual' : 'monthly', returnPath },
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
        body: { plan: upgrade.id, period: annual ? 'annual' : 'monthly', returnPath },
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

  return createPortal(
    <div style={C.overlay} onClick={onClose}>
      <div style={C.modal} className="plan-gate-modal" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="icon-btn-ghost plan-gate-close" style={C.closeBtn} aria-label="Fechar">
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
              {/* Bloco próprio (não dentro da coluna de botões) para poder
                  ficar em cima de tudo em mobile e, no desktop, mudar de
                  posição via grid-area para o topo da coluna dos botões —
                  sem duplicar JSX para cada tamanho de ecrã. */}
              {/* Só a preview (FeaturePreview) fica na coluna da direita. Título,
                  lista de benefícios e preço ficam todos juntos à esquerda,
                  "o que ganhas" inteiro mesmo em cima de "quanto custa", não
                  partido a meio entre as duas colunas. Testemunho tirado
                  daqui: o popup já tem uma prova concreta (a preview da
                  feature, à direita), um segundo bloco de confiança por
                  baixo só repetia a decisão com mais scroll, sem acrescentar
                  nada que ajudasse a decidir mais depressa. */}
              <div className="plan-gate-title-block">
                <FeaturePreview feature={feature} />
              </div>

              <div className="plan-gate-col-left">
                <p style={C.titleRight}>{title}</p>
                {/* Um cartão só, não lista solta + pílulas soltas + cartão de
                    preço, cada um com o seu próprio ritmo visual (pedido do
                    Gustavo: "esta estranha"). O destaque (preço) continua
                    separado por dentro do mesmo cartão, não por fora. */}
                <div style={C.benefitsCard}>
                  {highlights.length > 0 && (
                    <ul style={{ ...C.highlights, listStyle: 'none', padding: 0, margin: 0 }}>
                      {highlights.map(h => (
                        <li key={h.label} style={C.highlightItem}>
                          <span style={C.highlightLabel}><span style={C.highlightCheck}>✓</span>{h.label}</span>
                          <span style={C.highlightValue}>{h.value}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div style={C.upsellDivider} />
                  {upgrade.priceLabelAnnual && (
                    <div style={C.periodToggle} role="group" aria-label="Periodicidade do pagamento">
                      <button type="button" style={C.periodBtn(!annual)} onClick={() => setAnnual(false)}>Mensal</button>
                      <button type="button" style={C.periodBtn(annual)} onClick={() => setAnnual(true)}>
                        Anual <span style={C.periodBadge}>2 meses grátis</span>
                      </button>
                    </div>
                  )}
                  <div style={C.upsellHead}>
                    <span style={C.upsellName}>{upgrade.name}</span>
                    <span style={C.upsellPrice}>
                      {annual && upgrade.priceLabelAnnual ? upgrade.priceLabelAnnual : upgrade.priceLabel}
                      <span style={C.upsellPeriod}>{annual && upgrade.priceLabelAnnual ? '/ano' : upgrade.period}</span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="plan-gate-col-right">
                {checkoutError && <p style={C.errorText}>{checkoutError}</p>}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <button style={C.ctaPrimary} className="plan-gate-cta-primary" disabled={loading || askingParents} onClick={handleUpgrade}>
                    {loading ? 'A abrir…' : `Passar a ${upgrade.name} agora`}
                  </button>
                  <button style={C.ctaSecondary} disabled={loading || askingParents} onClick={handleAskParents}>
                    {askingParents ? 'A preparar…' : 'Pedir aos pais para pagar'}
                  </button>
                </div>
                {/* "Agora não" a mais — já há o X a fechar o modal no canto
                    superior, ter os dois é repetir a mesma ação duas vezes. */}
                <p style={{ ...C.trust, marginTop: '20px' }}>Pagamento seguro via Stripe. Cancela quando quiseres.</p>
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
    </div>,
    document.body
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
  // Sem isto, ninguém percebe que o número volta a subir sozinho no mês
  // seguinte — parecia um limite para sempre, só o email de esgotamento
  // (que muita gente nunca lê) dizia "este mês".
  const title = 'Renova no dia 1 de cada mês'
  if (compact) {
    return (
      <span title={title} style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        fontSize: '0.72rem', fontWeight: 600, color,
        ...style,
      }}>
        {remaining}/{limit} este mês
      </span>
    )
  }
  return (
    <span title={title} style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontSize: '0.8rem', fontWeight: 700,
      color, background: bg, border: `1px solid ${border}`,
      padding: '5px 12px', borderRadius: '100px',
      ...style,
    }}>
      {remaining}/{limit} restantes este mês
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
