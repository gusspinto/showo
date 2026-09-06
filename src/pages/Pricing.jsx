import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircleIcon as Check } from '@solar-icons/react/bold/check-circle'
import { ArrowRightIcon as ArrowRight } from '@solar-icons/react/bold/arrow-right'
import { CaseIcon as Briefcase } from '@solar-icons/react/bold/case'
import { LetterIcon as Mail } from '@solar-icons/react/bold/letter'
import { DocumentTextIcon as FileText } from '@solar-icons/react/bold/document-text'
import { StarsIcon as Sparkles } from '@solar-icons/react/bold/stars'
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
       Build  → construir e organizar o percurso escolar
       Launch → preparar e lançar o aluno para a carreira
   Por isso cada plano só mostra o que ACRESCENTA ao anterior, e a Carreira
   tem um bloco próprio no Launch em vez de ser mais um visto numa lista.
   ══════════════════════════════════════════════════════════════════════════ */

const PLANS = [
  {
    id: 'free',
    name: 'Grátis',
    price: '€0',
    tagline: 'Vê como funciona.',
    positioning: 'Para experimentar com um projeto real.',
    cta: 'Começar grátis',
    ctaVariant: 'ghost',
    groups: [
      {
        label: 'Inclui',
        items: [
          { label: '5 projetos' },
          { label: 'Editor completo e página pública' },
          { label: 'Diário, agenda e lembretes' },
          { label: 'Certificado de projeto' },
        ],
      },
      {
        label: 'IA (limitada por mês)',
        items: [
          { label: 'Coach IA', value: '15 msgs' },
          { label: 'Criar projeto com IA', value: '3x' },
          { label: 'Análise IA', value: '1x' },
          { label: 'Relatório do projeto', value: '1x' },
          { label: 'Narrativa IA', value: '1x' },
          { label: 'Defesa IA', value: '1x' },
        ],
      },
    ],
  },
  {
    id: 'plus',
    name: 'Plus',
    price: '€4,99',
    period: '/mês',
    tagline: 'Tudo o que precisas.',
    positioning: 'Para quem está a fazer a PAP, estágio ou projetos da escola.',
    cta: 'Começar com o Plus',
    ctaVariant: 'primary',
    popular: true,
    inherits: 'Grátis',
    groups: [
      {
        label: 'Mais',
        items: [
          { label: '15 projetos' },
          { label: 'Coach IA', value: '100 msgs' },
          { label: 'Criar com IA', value: '15x' },
          { label: 'Análise IA', value: '10x' },
          { label: 'Relatório', value: '5x' },
          { label: 'Defesa IA', value: '10x' },
          { label: 'Treino de defesa', value: '5x' },
          { label: 'Carta de apresentação', value: '5x' },
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
    positioning: 'Para quem quer o máximo da plataforma e da carreira.',
    cta: 'Ir para Pro',
    ctaVariant: 'primary',
    inherits: 'Plus',
    career: true,
    groups: [
      {
        label: 'Mais',
        items: [
          { label: 'Projetos ilimitados' },
          { label: 'Coach IA', value: '300 msgs' },
          { label: 'Todas as features IA', value: '25x' },
          { label: 'Portfólio pro com link limpo' },
          { label: 'Página de estágio' },
        ],
      },
    ],
  },
]

/* A Carreira é a razão de existir do Launch, por isso é explicada, não
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

export default function Pricing() {
  const navigate = useNavigate()
  const { user, planId, profile, isSchoolAccount } = useAuth()
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

                {/* O bloco que justifica o salto de preço. */}
                {plan.career && (
                  <div className="pricing-career">
                    <div className="pricing-career-head">
                      <Sparkles size={13} className="pricing-career-head-icon" />
                      <span className="pricing-career-head-text">Carreira · só no Launch</span>
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
          Muda ou cancela quando quiseres. Contas de escola têm o Build incluído para todos os alunos.
        </p>
      </div>
    </div>
  )
}
