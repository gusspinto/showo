import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircleIcon as Check } from '@solar-icons/react/linear/check-circle'
import { CloseCircleIcon as CloseCircle } from '@solar-icons/react/linear/close-circle'
import { ArrowRightIcon as ArrowRight } from '@solar-icons/react/linear/arrow-right'
import { AltArrowDownIcon as ChevronDown } from '@solar-icons/react/linear/alt-arrow-down'
import { SquareAcademicCapIcon as GraduationCap } from '@solar-icons/react/linear/square-academic-cap'
import { Navbar } from '../components/Navbar'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import TestimonialsMarquee from '../components/TestimonialsMarquee'
import './Pricing.css'

/* ══════════════════════════════════════════════════════════════════════════
   PLANOS
   ──────────────────────────────────────────────────────────────────────────
   A versão anterior listava as mesmas seis linhas de "Base" nos três planos e
   punha carreira no Build. Resultado: três colunas quase idênticas, e nenhuma
   razão legível para pagar mais nove euros em vez de cinco.

   A distinção passa a ser uma frase, e a página inteira obedece-lhe:
       Grátis → vê como funciona
       Plus   → constrói e organiza o percurso escolar sem ficares bloqueado
       Pro    → prepara e lança a carreira a seguir à escola
   Por isso cada plano só mostra o que ACRESCENTA ao anterior, e a Carreira
   tem um bloco próprio no Pro em vez de ser mais um visto numa lista.
   ══════════════════════════════════════════════════════════════════════════ */

const PLANS = [
  {
    id: 'free',
    name: 'Grátis',
    price: '€0',
    tagline: 'Vê como funciona.',
    positioning: 'Para começar um projeto a sério e ver se a plataforma é para ti.',
    cta: 'Começar grátis',
    ctaVariant: 'ghost',
    groups: [
      {
        label: 'Inclui',
        items: [
          { label: '3 projetos' },
          { label: 'Editor completo e página pública' },
          { label: 'Diário, agenda e lembretes' },
          { label: 'Certificado de projeto' },
        ],
      },
      {
        label: 'IA',
        ai: true,
        items: [
          { label: 'Coach IA', value: '10 msgs' },
          { label: 'Criar projeto com IA', value: '3x' },
          { label: 'Entrevista guiada', value: '3x' },
          { label: 'Análise IA', value: '1x' },
          { label: 'Relatório do projeto', value: '1x' },
          { label: 'Narrativa IA', value: '1x' },
          { label: 'Defesa IA', value: '1x' },
          { label: 'Exportar PowerPoint', value: '3x' },
        ],
      },
    ],
  },
  {
    id: 'plus',
    name: 'Plus',
    price: '€4,99',
    period: '/mês',
    tagline: 'Nunca fiques bloqueado a meio da PAP.',
    positioning: 'Para levares um projeto a sério até ao fim, seja PAP, estágio ou algo teu.',
    cta: 'Começar com o Plus',
    ctaVariant: 'primary',
    popular: true,
    inherits: 'Grátis',
    database: 'plus',
    groups: [
      {
        label: 'Mais',
        items: [
          { label: 'Base de dados + API do projeto', value: '2 tabelas' },
          { label: '15 projetos' },
          { label: 'Recap semanal' },
        ],
      },
      {
        label: 'IA',
        ai: true,
        items: [
          { label: 'Coach IA', value: '100 msgs' },
          { label: 'Criar com IA', value: '15x' },
          { label: 'Entrevista guiada', value: '15x' },
          { label: 'Análise IA', value: '10x' },
          { label: 'Relatório', value: '5x' },
          { label: 'Narrativa IA', value: '10x' },
          { label: 'Defesa IA', value: '10x' },
          { label: 'Treino de defesa', value: '5x' },
          { label: 'Carta de apresentação', value: '5x' },
          { label: 'Exportar PowerPoint', value: '15x' },
        ],
      },
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '€9,99',
    period: '/mês',
    tagline: 'Sem limites, sem preocupações.',
    positioning: 'Para quem quer o máximo da plataforma e da carreira a seguir.',
    cta: 'Ir para Pro',
    ctaVariant: 'primary',
    inherits: 'Plus',
    career: true,
    groups: [
      {
        label: 'Mais',
        items: [
          { label: 'Base de dados + API do projeto', value: '8 tabelas' },
          { label: 'Projetos ilimitados' },
          { label: 'Portfólio pro com link limpo' },
          { label: 'Página de estágio' },
        ],
      },
      {
        label: 'IA',
        ai: true,
        items: [
          { label: 'Coach IA', value: '300 msgs' },
          { label: 'Todas as features IA', value: '25x' },
          { label: 'Exportar PowerPoint', value: 'ilimitado' },
        ],
      },
    ],
  },
]

/* Tabela comparativa — três cards lado a lado obrigam a decorar o que muda
   de um para o outro. Uma tabela deixa comparar linha a linha de relance.
   A conta escola fica fora: não é self-serve, é vendida à instituição. */
const COMPARE_ROWS = [
  { label: 'Base de dados + API do projeto', free: false, plus: '2 tabelas', pro: '8 tabelas' },
  { label: 'Projetos', free: '3', plus: '15', pro: 'Ilimitados' },
  { label: 'Coach IA', free: '10 msgs', plus: '100 msgs', pro: '300 msgs' },
  { label: 'Criar projeto com IA', free: '3x', plus: '15x', pro: '30x' },
  { label: 'Entrevista guiada', free: '3x', plus: '15x', pro: '30x' },
  { label: 'Análise de projeto', free: '1x', plus: '10x', pro: '25x' },
  { label: 'Relatório do projeto', free: '1x', plus: '5x', pro: '10x' },
  { label: 'Narrativa IA', free: '1x', plus: '10x', pro: '25x' },
  { label: 'Defesa IA', free: '1x', plus: '10x', pro: '25x' },
  { label: 'Treino de defesa', free: false, plus: '5x', pro: '25x' },
  { label: 'Carta de apresentação IA', free: false, plus: '5x', pro: '25x' },
  { label: 'Exportar PowerPoint', free: '3x', plus: '15x', pro: 'Ilimitado' },
  { label: 'Recap semanal por email', free: false, plus: true, pro: true },
  { label: 'Página de estágio', free: false, plus: false, pro: true },
  { label: 'Todo o mês renova os limites', free: true, plus: true, pro: true },
]

const FAQ = [
  {
    q: 'O que acontece quando esgoto os limites de um mês?',
    a: 'As gerações com IA dessa funcionalidade ficam bloqueadas até ao início do mês seguinte, quando renovam sozinhas. O resto da plataforma continua disponível sem limite: editor, portfólio, diário e agenda.',
  },
  {
    q: 'Posso cancelar quando quiser?',
    a: 'Sim, nas definições da conta, a qualquer momento. Continuas com acesso ao plano até ao fim do período já pago, sem penalização nenhuma.',
  },
  {
    q: 'A minha escola paga por mim?',
    a: 'Se a tua escola tiver conta institucional na Showo, és promovido automaticamente assim que entras na turma com o código dela. Não pagas nada.',
  },
  {
    q: 'Podem pagar por mim?',
    a: 'Sim. O checkout aceita qualquer cartão, não precisa de estar em teu nome.',
  },
  {
    q: 'Os meus projetos ficam visíveis publicamente?',
    a: 'Cada projeto tem a sua própria página pública, com um link que só partilhas se quiseres, seja a recrutadores, professores ou ao júri de defesa. Nunca aparece em motores de busca a não ser que sejas tu a partilhar o link.',
  },
]

function ComparisonCell({ value }) {
  if (value === false) return <CloseCircle size={16} className="pricing-cmp-no" />
  if (value === true) return <Check size={14} className="pricing-cmp-yes" />
  return <span>{value}</span>
}

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div className={`pricing-faq-item${open ? ' is-open' : ''}`}>
      <button className="pricing-faq-q" onClick={() => setOpen(o => !o)} aria-expanded={open}>
        <span>{q}</span>
        <ChevronDown size={16} className="pricing-faq-chevron" />
      </button>
      <div className="pricing-faq-a-wrap">
        <div className="pricing-faq-a-clip">
          <p className="pricing-faq-a">{a}</p>
        </div>
      </div>
    </div>
  )
}

const PLAN_ORDER = { free: 0, plus: 1, pro: 2 }

export default function Pricing() {
  const navigate = useNavigate()
  const { user, planId, profile, isSchoolAccount, logFunnelEvent } = useAuth()
  const [loading, setLoading] = useState(null)

  const isTeacher = profile?.role === 'professor'
  if (user && (isTeacher || isSchoolAccount)) {
    navigate('/dashboard', { replace: true })
    return null
  }
  const [error, setError] = useState('')

  if (user && profile?.role === 'professor') {
    navigate('/dashboard', { replace: true })
    return null
  }

  async function handleCta(plan) {
    if (!user) { navigate('/register'); return }
    if (plan.id === 'free') { navigate('/dashboard'); return }
    if (plan.id === planId) return
    logFunnelEvent('checkout_started', plan.id)
    setLoading(plan.id)
    setError('')
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('create-checkout', {
        body: { plan: plan.id },
      })
      if (fnErr || !data?.url) { setError('Erro ao iniciar pagamento. Tenta novamente.'); return }
      window.location.href = data.url
    } catch {
      setError('Erro ao iniciar pagamento. Tenta novamente.')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="pricing-page">
      <Navbar />
      <div className="pricing-container">
        {error && <div className="pricing-toast">{error}</div>}

        <header className="pricing-header">
          <h1>Constrói agora. Lança quando estiveres pronto.</h1>
        </header>

        <div className="pricing-proof">
          <GraduationCap size={15} />
          <span>Já usado por alunos e professores em escolas profissionais portuguesas.</span>
        </div>

        <div className="pricing-grid">
          {PLANS.map(plan => {
            const isCurrent = user && plan.id === planId
            const isDowngrade = user && !isCurrent && PLAN_ORDER[plan.id] < PLAN_ORDER[planId || 'free']
            return (
              <div key={plan.id} className={`pricing-card${plan.popular ? ' is-popular' : ''}${plan.career ? ' is-career' : ''}`}>
                {plan.popular && <span className="pricing-flag"><span className="pricing-flag-text">Mais escolhido</span></span>}
                {plan.career && <span className="pricing-flag pricing-flag--career">Carreira</span>}

                <div className="pricing-card-head">
                  <h2 className="pricing-name">{plan.name}</h2>
                  <p className="pricing-tagline">{plan.positioning}</p>
                </div>

                <div className="pricing-price">
                  <span className="pricing-amount">{plan.price}</span>
                  {plan.period && <span className="pricing-period">{plan.period}</span>}
                </div>
                {isCurrent ? (
                  <div className="pricing-current"><Check size={14} /> Plano atual</div>
                ) : isDowngrade ? (
                  <button className="pricing-cta pricing-cta--ghost" onClick={() => navigate('/settings')}>
                    Gerir subscrição
                  </button>
                ) : (
                  <button
                    className={`pricing-cta pricing-cta--${plan.ctaVariant}`}
                    onClick={() => handleCta(plan)}
                    disabled={loading === plan.id}
                  >
                    {loading === plan.id ? 'A redirecionar…' : <>{plan.cta} <ArrowRight size={14} /></>}
                  </button>
                )}

                {/* "Tudo do X, mais…" em vez de repetir a mesma lista três
                    vezes: o que interessa é a diferença, não o inventário. */}
                {plan.inherits && (
                  <p className="pricing-inherits">Tudo do <strong>{plan.inherits}</strong>, mais:</p>
                )}

                {plan.groups.map(group => (
                  <div key={group.label} className="pricing-group">
                    {group.ai ? (
                      <span className="pricing-group-label">
                        <span className="pricing-ai-badge">IA</span> limitada por mês
                      </span>
                    ) : !plan.inherits && (
                      <span className="pricing-group-label">{group.label}</span>
                    )}
                    <ul className="pricing-list">
                      {group.items.map(item => (
                        <li key={item.label} className="pricing-item">
                          <Check size={14} className="pricing-check" />
                          <span className="pricing-item-label">{item.label}</span>
                          {item.value && <span className="pricing-item-value">{item.value}</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )
          })}
        </div>

        <p className="pricing-foot">
          Muda ou cancela quando quiseres. Contas de escola têm acesso incluído para todos os alunos.
        </p>

        {/* ══════════════ TESTEMUNHOS ══════════════ */}
        <section className="pricing-section">
          <h2 className="pricing-section-title">Quem já usa</h2>
          <TestimonialsMarquee />
        </section>

        {/* ══════════════ TABELA COMPARATIVA ══════════════ */}
        <section className="pricing-section">
          <h2 className="pricing-section-title">Compara linha a linha</h2>
          <div className="pricing-cmp-wrap">
            <table className="pricing-cmp">
              <thead>
                <tr>
                  <th></th>
                  <th>Grátis</th>
                  <th className="pricing-cmp-highlight">Plus</th>
                  <th>Pro</th>
                </tr>
              </thead>
              <tbody>
                {COMPARE_ROWS.map(row => (
                  <tr key={row.label}>
                    <th scope="row">{row.label}</th>
                    <td><ComparisonCell value={row.free} /></td>
                    <td className="pricing-cmp-highlight"><ComparisonCell value={row.plus} /></td>
                    <td><ComparisonCell value={row.pro} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ══════════════ FAQ ══════════════ */}
        <section className="pricing-section pricing-section--narrow">
          <h2 className="pricing-section-title">Perguntas frequentes</h2>
          <div className="pricing-faq">
            {FAQ.map(item => <FaqItem key={item.q} {...item} />)}
          </div>
        </section>
      </div>
    </div>
  )
}
