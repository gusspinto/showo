import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircleIcon as Check } from '@solar-icons/react/bold/check-circle'
import { CloseCircleIcon as CloseCircle } from '@solar-icons/react/bold/close-circle'
import { ArrowRightIcon as ArrowRight } from '@solar-icons/react/bold/arrow-right'
import { CaseIcon as Briefcase } from '@solar-icons/react/bold/case'
import { LetterIcon as Mail } from '@solar-icons/react/bold/letter'
import { DocumentTextIcon as FileText } from '@solar-icons/react/bold/document-text'
import { StarsIcon as Sparkles } from '@solar-icons/react/bold/stars'
import { AltArrowDownIcon as ChevronDown } from '@solar-icons/react/bold/alt-arrow-down'
import { SquareAcademicCapIcon as GraduationCap } from '@solar-icons/react/bold/square-academic-cap'
import { DatabaseIcon as Database } from '@solar-icons/react/bold/database'
import { CodeIcon as Code } from '@solar-icons/react/bold/code'
import { GlobeIcon as Globe } from '@solar-icons/react/bold/globe'
import { Navbar } from '../components/Navbar'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
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
    positioning: 'Para experimentar com um projeto real, sem cartão.',
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
        label: 'IA (limitada por mês)',
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
    positioning: 'Para quem está a fazer a PAP, estágio ou projetos da escola.',
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
          { label: 'Recap semanal' },
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
          { label: 'Coach IA', value: '300 msgs' },
          { label: 'Todas as features IA', value: '25x' },
          { label: 'Exportar PowerPoint', value: 'ilimitado' },
          { label: 'Portfólio pro com link limpo' },
          { label: 'Página de estágio' },
        ],
      },
    ],
  },
]

/* A base de dados é a razão principal para pagar — não "mais IA" (quase
   ninguém bate nos limites de IA, confirmado no uso real), mas "o projeto
   passa a ser um produto a sério". Por isso é explicada como a Carreira,
   não só mais uma linha na lista. */
const DATABASE_FEATURES = [
  {
    Icon: Database,
    title: 'Base de dados a sério',
    desc: 'Desenha tabelas no editor, sem escrever código nenhum, e o projeto ganha uma base de dados própria, isolada, com os teus dados.',
  },
  {
    Icon: Code,
    title: 'API automática',
    desc: 'Cada tabela ganha um endereço e uma chave próprios. Funciona de fora da Showo, em curl, Postman ou no teu próprio site, como uma aplicação real.',
  },
  {
    Icon: Globe,
    title: 'Mostra a quem quiseres',
    desc: 'Cada tabela escolhes se é pública ou privada. Um recrutador pode testar a tua API sem precisar de conta nenhuma.',
  },
]

/* A Carreira é a razão de existir do Pro, por isso é explicada, não
   listada. Cada linha diz o que a funcionalidade FAZ pelo aluno. */
const CAREER_FEATURES = [
  {
    Icon: Briefcase,
    title: 'Página de estágio',
    desc: 'O teu portfólio reorganizado para quem contrata: projetos em destaque, competências e contacto num link só.',
  },
  {
    Icon: Mail,
    title: 'Recap semanal',
    desc: 'Todas as segundas, um resumo do que avançou e do que ficou parado, na app e por email, para não perderes o ritmo entre entregas.',
  },
  {
    Icon: FileText,
    title: 'Carta de apresentação IA',
    desc: 'Uma carta escrita para cada vaga a partir dos teus projetos reais, não de um modelo genérico.',
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

/* Testemunhos reais de alunos que já usam a plataforma — texto e autoria
   tal como foram dados pelos próprios, com foto (pedida por eles) em
   public/testimonials/. */
const TESTIMONIALS = [
  {
    quote: 'A vida universitária ficou mais leve com a qualidade e desenvolvimento desta plataforma. Não há desculpas agora para não concluir desafios académicos!',
    name: 'Sara Silva',
    role: 'Finalista na Faculdade de Direito da Universidade de Coimbra',
    photo: '/testimonials/sara-silva.jpg',
  },
  {
    quote: 'Era esta a ferramenta que me faltava para os meus estudos. Bastante alinhado com as necessidades dos alunos.',
    name: 'Maria Eduarda',
    role: 'Estudante de Engenharia da Computação e Engenharia de Software — Natixis',
    photo: '/testimonials/maria-eduarda.jpg',
  },
  {
    quote: 'Para alguém que fez PAP e queria usá-la para exposição, esta app é um gamechanger para estudantes na mesma situação.',
    name: 'Rafael Matos',
    role: 'Estudante de Engenharia Informática da Universidade de Aveiro',
    photo: '/testimonials/rafael-matos.jpg',
  },
  {
    quote: 'Parabéns pela plataforma! Acho que é algo necessário e inovador.',
    name: 'Martim Gonçalves',
    role: 'Estudante de Multimédia da Universidade da Maia e Videógrafo/Fotógrafo',
    photo: '/testimonials/martim-goncalves.jpg',
  },
  {
    quote: 'Na minha opinião, um dos pontos mais fortes da plataforma é a Defesa. A organização e preparação torna tudo mais interativo e envolvente.',
    name: 'Rita Sousa',
    role: 'Estudante na Escola Profissional Bento de Jesus Caraça',
    photo: '/testimonials/rita-sousa.jpg',
  },
  {
    quote: 'Uma ideia bastante interessante e bem estruturada, que permite aos alunos criar portfólios e valorizar os seus projetos e competências.',
    name: 'Duarte Leal',
    role: 'Estudante na Escola Profissional Bento de Jesus Caraça',
    photo: '/testimonials/duarte-leal.jpg',
  },
  {
    quote: 'Gostei da ideia da plataforma. O design é apelativo e faz querer explorar mais. Acho que vai ajudar bastante a quem tem projetos e ideias, tanto a nível escolar como profissional.',
    name: 'Rafael Carvalho',
    role: 'Estudante no Instituto Superior Politécnico Gaya',
    photo: '/testimonials/rafael-carvalho.jpg',
  },
]

function TestimonialCard({ quote, name, role, photo }) {
  return (
    <figure className="pricing-testimonial-card">
      <blockquote className="pricing-testimonial-quote">“{quote}”</blockquote>
      <figcaption className="pricing-testimonial-author">
        <img className="pricing-testimonial-avatar" src={photo} alt="" width="34" height="34" loading="lazy" />
        <span>
          <strong>{name}</strong>
          <span className="pricing-testimonial-role">{role}</span>
        </span>
      </figcaption>
    </figure>
  )
}

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
  if (value === true) return <Check size={16} className="pricing-cmp-yes" />
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
          <span>Já em uso em escolas profissionais portuguesas, com professores de PAP e estágio a acompanhar o processo em tempo real.</span>
        </div>

        <div className="pricing-grid">
          {PLANS.map(plan => {
            const isCurrent = user && plan.id === planId
            return (
              <div key={plan.id} className={`pricing-card${plan.popular ? ' is-popular' : ''}${plan.career ? ' is-career' : ''}`}>
                {plan.popular && <span className="pricing-flag"><span className="pricing-flag-text">Mais escolhido</span></span>}
                {plan.career && <span className="pricing-flag pricing-flag--career">Carreira</span>}

                <div className="pricing-card-head">
                  <h2 className="pricing-name">{plan.name}</h2>
                  <div className="pricing-price">
                    <span className="pricing-amount">{plan.price}</span>
                    {plan.period && <span className="pricing-period">{plan.period}</span>}
                  </div>
                  <p className="pricing-tagline">{plan.tagline}</p>
                  <p className="pricing-positioning">{plan.positioning}</p>
                </div>

                {isCurrent ? (
                  <div className="pricing-current"><Check size={15} /> Plano atual</div>
                ) : (
                  <button
                    className={`pricing-cta pricing-cta--${plan.ctaVariant}`}
                    onClick={() => handleCta(plan)}
                    disabled={loading === plan.id}
                  >
                    {loading === plan.id ? 'A redirecionar…' : <>{plan.cta} <ArrowRight size={15} /></>}
                  </button>
                )}

                {/* "Tudo do X, mais…" em vez de repetir a mesma lista três
                    vezes: o que interessa é a diferença, não o inventário. */}
                {plan.inherits && (
                  <p className="pricing-inherits">Tudo do <strong>{plan.inherits}</strong>, mais:</p>
                )}

                {plan.groups.map(group => (
                  <div key={group.label} className="pricing-group">
                    {!plan.inherits && <span className="pricing-group-label">{group.label}</span>}
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

                {/* A razão principal para pagar: o projeto deixa de ser só
                    teórico e passa a ter dados e uma API a sério. */}
                {plan.database && (
                  <div className="pricing-career">
                    <div className="pricing-career-head">
                      <Database size={13} className="pricing-career-head-icon" />
                      <span className="pricing-career-head-text">Produto real · desde o Plus</span>
                    </div>
                    <ul className="pricing-career-list">
                      {DATABASE_FEATURES.map(({ Icon, title, desc }) => (
                        <li key={title}>
                          <span className="pricing-career-icon"><Icon size={15} /></span>
                          <span>
                            <strong>{title}</strong>
                            <span className="pricing-career-desc">{desc}</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* O bloco que justifica o salto de preço. */}
                {plan.career && (
                  <div className="pricing-career">
                    <div className="pricing-career-head">
                      <Sparkles size={13} className="pricing-career-head-icon" />
                      <span className="pricing-career-head-text">Carreira · só no Pro</span>
                    </div>
                    <ul className="pricing-career-list">
                      {CAREER_FEATURES.map(({ Icon, title, desc }) => (
                        <li key={title}>
                          <span className="pricing-career-icon"><Icon size={15} /></span>
                          <span>
                            <strong>{title}</strong>
                            <span className="pricing-career-desc">{desc}</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
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
          {/* Lista duplicada para o loop ficar contínuo: ao deslizar -50%,
              a "cauda" que sai por um lado é idêntica à que entra pelo
              outro, sem salto visível. Pausa ao passar o rato, para dar
              para ler sem perseguir o texto. */}
          <div className="pricing-testimonials-marquee">
            <div className="pricing-testimonials-track">
              {[...TESTIMONIALS, ...TESTIMONIALS].map((t, i) => (
                <TestimonialCard key={`${t.name}-${i}`} {...t} />
              ))}
            </div>
          </div>
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
