import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircleIcon as Check } from '@solar-icons/react/linear/check-circle'
import { CloseCircleIcon as CloseCircle } from '@solar-icons/react/linear/close-circle'
import { ArrowRightIcon as ArrowRight } from '@solar-icons/react/linear/arrow-right'
import { AltArrowDownIcon as ChevronDown } from '@solar-icons/react/linear/alt-arrow-down'
import { SquareAcademicCapIcon as GraduationCap } from '@solar-icons/react/linear/square-academic-cap'
import { InfoCircleIcon as InfoCircle } from '@solar-icons/react/linear/info-circle'
import { Navbar } from '../components/Navbar'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import TestimonialsMarquee from '../components/TestimonialsMarquee'
import './Pricing.css'

/* ══════════════════════════════════════════════════════════════════════════
   PLANOS
   ──────────────────────────────────────────────────────────────────────────
   Fui ver como o HighLevel e o Linear fazem a deles antes de mexer outra
   vez. Os dois seguem a mesma disciplina, sem excepção: o card tem no
   máximo 4-5 linhas, cada uma um substantivo e um número ("250 issues",
   "Unlimited Sub-Accounts"), zero frases a vender o benefício por dentro
   do card — isso fica para o título da página. Tudo o resto (o inventário
   completo) vive numa tabela à parte, não no card.

   Esta versão seguiu essa disciplina a sério: cada card mostra só as 4
   linhas mais fortes desse plano, sem parágrafos de texto lá dentro. A
   tabela de comparação, mais abaixo, é que tem a lista toda.

   E continua a valer a regra anterior: a Showo não é só para a escola —
   "PAP"/"sair da escola" não aparece nas frases principais. As features
   de escola continuam na lista, só não são a promessa de nenhum plano.
   ══════════════════════════════════════════════════════════════════════════ */

const PLANS = [
  {
    id: 'free',
    name: 'Grátis',
    price: '€0',
    positioning: 'Começa a provar que sabes fazer.',
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
          { label: 'Todas as outras ferramentas', value: 'para experimentar', subitems: ['Criar projeto', 'Entrevista guiada', 'Análise', 'Relatório', 'Pitch IA', 'Banca IA', 'Exportar PowerPoint'] },
        ],
      },
    ],
  },
  {
    id: 'plus',
    name: 'Plus',
    priceMonthly: '€8,99',
    priceAnnual: '€89,90',
    annualEquivalent: '€7,49/mês',
    period: '/mês',
    positioning: 'Não pares a meio do caminho.',
    weeklyNote: 'pouco mais de €2 por semana',
    cta: 'Começar com o Plus',
    ctaVariant: 'primary',
    popular: true,
    inherits: 'Grátis',
    database: 'plus',
    groups: [
      {
        label: 'Mais',
        items: [
          { label: '15 projetos' },
          { label: 'Provas do projeto', value: '250MB', tip: 'Anexa PDFs, Word, PowerPoint, imagens — qualquer ficheiro que prove o trabalho. Escolhes o que aparece na página pública.' },
          { label: 'Recap semanal por email' },
        ],
      },
      {
        label: 'IA',
        ai: true,
        items: [
          { label: 'Toda a IA', value: '5x mais', subitems: ['Coach', 'Criar projeto', 'Análise', 'Relatório', 'Pitch IA', 'Banca IA'] },
          { label: 'Treino de defesa e carta de apresentação', value: 'novo' },
        ],
      },
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    priceMonthly: '€17,99',
    priceAnnual: '€179,90',
    annualEquivalent: '€14,99/mês',
    period: '/mês',
    positioning: 'Chega à conversa com prova, não com promessas.',
    weeklyNote: 'pouco mais de €4 por semana',
    cta: 'Ir para Pro',
    ctaVariant: 'primary',
    inherits: 'Plus',
    career: true,
    groups: [
      {
        label: 'Mais',
        items: [
          { label: 'Projetos ilimitados' },
          { label: 'Provas do projeto', value: '1GB', tip: 'Anexa PDFs, Word, PowerPoint, imagens — qualquer ficheiro que prove o trabalho. Escolhes o que aparece na página pública.' },
          { label: 'Link à tua medida', tip: 'Tira o código aleatório do link do teu projeto e escolhe o teu próprio texto.' },
          { label: 'Vagas de estágio', tip: 'Vê e candidata-te a vagas publicadas por empresas parceiras, com o teu portfólio em vez de CV.' },
        ],
      },
      {
        label: 'IA',
        ai: true,
        items: [
          { label: 'Toda a IA', value: '2x+ o Plus', subitems: ['Coach', 'Criar projeto', 'Análise', 'Relatório', 'Pitch IA', 'Banca IA', 'Treino de defesa', 'Carta de apresentação'] },
          { label: 'Exportar PowerPoint', value: 'sem limite' },
        ],
      },
    ],
  },
]

/* Tabela comparativa — três cards lado a lado obrigam a decorar o que muda
   de um para o outro. Uma tabela deixa comparar linha a linha de relance.
   A conta escola fica fora: não é self-serve, é vendida à instituição. */
const COMPARE_ROWS = [
  { label: 'Provas do projeto', free: false, plus: '250MB', pro: '1GB' },
  { label: 'Projetos', free: '3', plus: '15', pro: 'Ilimitados' },
  { label: 'Coach IA', free: '10 msgs', plus: '100 msgs', pro: '300 msgs' },
  { label: 'Criar projeto com IA', free: '3x', plus: '15x', pro: '30x' },
  { label: 'Entrevista guiada', free: '3x', plus: '15x', pro: '30x' },
  { label: 'Análise de projeto', free: '1x', plus: '10x', pro: '25x' },
  { label: 'Relatório do projeto', free: '1x', plus: '5x', pro: '10x' },
  { label: 'Pitch IA', free: '1x', plus: '10x', pro: '25x' },
  { label: 'Banca IA', free: '1x', plus: '10x', pro: '25x' },
  { label: 'Treino de defesa', free: false, plus: '5x', pro: '25x' },
  { label: 'Carta de apresentação IA', free: false, plus: '5x', pro: '25x' },
  { label: 'Exportar PowerPoint', free: '3x', plus: '15x', pro: 'Ilimitado' },
  { label: 'Recap semanal por email', free: false, plus: true, pro: true },
  { label: 'Vagas de estágio', free: false, plus: false, pro: true },
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
  const [annual, setAnnual] = useState(false)
  const [openTip, setOpenTip] = useState(null) // "<planId>:<label>" do tooltip aberto, ou null

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
        body: { plan: plan.id, period: annual ? 'annual' : 'monthly' },
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
          <h1>Mostra o trabalho. Não contes sobre ele.</h1>
        </header>

        <div className="pricing-proof">
          <GraduationCap size={15} />
          {/* "Escolas profissionais" sozinho dizia a quem não anda na escola
              que isto não é para ele. Universidades entram porque há
              testemunhos reais de lá (Coimbra, Aveiro) — não se alarga mais
              do que isso sem haver quem o diga. */}
          <span>Já usado por alunos e professores em escolas e universidades portuguesas.</span>
        </div>

        <div className="pricing-period-toggle" role="group" aria-label="Periodicidade do pagamento">
          <button
            type="button"
            className={`pricing-period-btn${!annual ? ' is-active' : ''}`}
            onClick={() => setAnnual(false)}
          >
            Mensal
          </button>
          <button
            type="button"
            className={`pricing-period-btn${annual ? ' is-active' : ''}`}
            onClick={() => setAnnual(true)}
          >
            Anual <span className="pricing-period-badge">2 meses grátis</span>
          </button>
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
                  <span className="pricing-amount">
                    {annual && plan.priceAnnual ? plan.priceAnnual : plan.priceMonthly ?? plan.price}
                  </span>
                  {plan.period && <span className="pricing-period">{annual && plan.priceAnnual ? '/ano' : plan.period}</span>}
                </div>
                {annual && plan.annualEquivalent ? (
                  <p className="pricing-annual-note">equivale a {plan.annualEquivalent}</p>
                ) : plan.weeklyNote ? (
                  /* Ao dia os cêntimos não dizem nada a ninguém; à semana
                     já se compara com alguma coisa real. É a mesma conta,
                     não uma promessa nova. */
                  <p className="pricing-annual-note">{plan.weeklyNote}</p>
                ) : null}
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
                {/* Reduz o atrito de decidir pagar — facto real (já está na
                    FAQ), só posto onde é mais preciso: mesmo ao lado do
                    botão. Grátis não precisa, não há nada para cancelar. */}
                {plan.id !== 'free' && !isCurrent && !isDowngrade && (
                  <p className="pricing-cta-note">Cancela quando quiseres, sem letras miúdas.</p>
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
                      {group.items.map(item => {
                        const tipKey = `${plan.id}:${item.label}`
                        const tipOpen = openTip === tipKey
                        return (
                          <li key={item.label} className="pricing-item">
                            <Check size={14} className="pricing-check" />
                            <span className="pricing-item-body">
                              <span className="pricing-item-main">
                                <span className="pricing-item-label-wrap">
                                  <span className="pricing-item-label">{item.label}</span>
                                  {item.tip && !item.subitems && (
                                    <span className="pricing-tip-wrap">
                                      <button
                                        type="button"
                                        className="pricing-tip-btn"
                                        aria-label={`O que é: ${item.label}`}
                                        onClick={() => setOpenTip(tipOpen ? null : tipKey)}
                                      >
                                        <InfoCircle size={13} />
                                      </button>
                                      {tipOpen && (
                                        <span className="pricing-tip-pop" role="tooltip">
                                          {item.tip}
                                        </span>
                                      )}
                                    </span>
                                  )}
                                </span>
                                {item.value && <span className="pricing-item-value">{item.value}</span>}
                              </span>
                              {/* Em vez de esconder a lista de ferramentas atrás de um
                                  tooltip, mostra-a logo — uma marca que ninguém conhece
                                  ainda ganha mais em mostrar do que em resumir. */}
                              {item.subitems && (
                                <span className="pricing-subitems">
                                  {item.subitems.join(' · ')}
                                </span>
                              )}
                            </span>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            )
          })}
        </div>

        <p className="pricing-foot">
          Os números exatos de cada ferramenta estão na tabela mais abaixo.
          Muda ou cancela quando quiseres. Contas de escola têm acesso incluído para todos os alunos.
        </p>

        {/* ══════════════ A OBJEÇÃO QUE NINGUÉM ESCREVIA ══════════════
            "Porquê pagar se tenho IA grátis noutro lado?" é o primeiro
            pensamento de quem chega aqui. Resposta direta, um parágrafo
            normal — nada de três frases em espelho a dizer a mesma coisa
            de três maneiras diferentes, isso lê-se a léguas a texto de IA. */}
        <section className="pricing-section pricing-section--narrow">
          <h2 className="pricing-section-title">E porquê isto, se há IA grátis em todo o lado?</h2>
          <p className="pricing-why-text">
            Um chat esquece tudo assim que fechas a aba. Aqui o que escreveste sobre o
            projeto há três semanas continua lá, e a IA usa isso para te ajudar hoje — não
            começas do zero de cada vez. E no fim não ficas com uma conversa para mostrar a
            ninguém: ficas com uma página, com o trabalho, as provas e a evolução ao longo do
            tempo. O link que mandas a um cliente, a um professor ou a um recrutador.
          </p>
        </section>

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
