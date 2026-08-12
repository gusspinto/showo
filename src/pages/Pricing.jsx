import { useNavigate } from 'react-router-dom'
import { Navbar } from '../components/Navbar'
import { Check } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useState } from 'react'
import { supabase } from '../lib/supabase'
import './Pricing.css'

const PLANS = [
  {
    id: 'free',
    name: 'Grátis',
    price: '€0',
    tagline: 'Começa a construir.',
    cta: 'Começar grátis',
    ctaVariant: 'ghost',
    features: [
      { label: 'Projetos', value: '3' },
      { label: 'Editor completo', value: true },
      { label: 'Diário, agenda e lembretes', value: true },
      { label: 'Calendar sync', value: true },
      { label: 'Candidatar-se a vagas', value: true },
      { label: 'Certificado de projeto', value: true },
    ],
    ai: [
      { label: 'Score IA', value: 'Sempre' },
      { label: 'Criar projeto com IA', value: '2x/mês' },
      { label: 'Coach IA', value: '10 msgs/mês' },
      { label: 'Defesa com IA', value: '1x/mês' },
      { label: 'Relatório IA do diário', value: '1x/mês' },
      { label: 'Narrativa IA', value: '1x/mês' },
    ],
  },
  {
    id: 'build',
    name: 'Build',
    price: '€4,99',
    period: '/mês',
    tagline: 'Cria sem limites.',
    cta: 'Desbloquear a IA',
    ctaVariant: 'primary',
    popular: true,
    features: [
      { label: 'Projetos', value: '10' },
      { label: 'Editor completo', value: true },
      { label: 'Diário, agenda e lembretes', value: true },
      { label: 'Calendar sync', value: true },
      { label: 'Candidatar-se a vagas', value: true },
      { label: 'Certificado de projeto', value: true },
    ],
    ai: [
      { label: 'Score IA', value: 'Sempre' },
      { label: 'Criar projeto com IA', value: 'Ilimitado' },
      { label: 'Entrevista guiada IA', value: 'Ilimitado' },
      { label: 'Coach IA', value: 'Ilimitado' },
      { label: 'Defesa com IA', value: 'Ilimitado' },
      { label: 'Relatório IA do diário', value: 'Ilimitado' },
      { label: 'Narrativa IA', value: 'Ilimitado' },
      { label: 'Análise completa de projeto', value: true },
    ],
    career: [
      { label: 'Recap semanal', value: true },
    ],
  },
  {
    id: 'launch',
    name: 'Launch',
    price: '€9,99',
    period: '/mês',
    tagline: 'Entra no mercado.',
    cta: 'Preparar o meu futuro',
    ctaVariant: 'primary',
    features: [
      { label: 'Projetos', value: 'Ilimitados' },
      { label: 'Editor completo', value: true },
      { label: 'Diário, agenda e lembretes', value: true },
      { label: 'Calendar sync', value: true },
      { label: 'Candidatar-se a vagas', value: true },
      { label: 'Certificado de projeto', value: true },
    ],
    ai: [
      { label: 'Score IA', value: 'Sempre' },
      { label: 'Criar projeto com IA', value: 'Ilimitado' },
      { label: 'Entrevista guiada IA', value: 'Ilimitado' },
      { label: 'Coach IA', value: 'Ilimitado' },
      { label: 'Defesa com IA', value: 'Ilimitado' },
      { label: 'Relatório IA do diário', value: 'Ilimitado' },
      { label: 'Narrativa IA', value: 'Ilimitado' },
      { label: 'Análise completa de projeto', value: true },
      { label: 'Carta de apresentação IA', value: true },
    ],
    career: [
      { label: 'Página de estágio', value: true },
      { label: 'Recap semanal', value: true },
      { label: 'Suporte prioritário', value: true },
    ],
  },
]

function FeatureRow({ label, value }) {
  return (
    <li className="pricing-feature-item">
      <span className="pricing-feature-label">{label}</span>
      {value === true
        ? <Check size={14} className="pricing-check" />
        : <span className="pricing-value-text">{value}</span>
      }
    </li>
  )
}

export default function Pricing() {
  const navigate = useNavigate()
  const { user, planId } = useAuth()
  const [loading, setLoading] = useState(null)
  const [error, setError] = useState('')

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
        {error && (
          <div className="pricing-toast" style={{ background: 'var(--color-error)' }}>
            {error}
          </div>
        )}

        <div className="pricing-header">
          <h1>Escolhe o teu plano</h1>
          <p>Começa grátis. Muda quando precisares de mais.</p>
        </div>

        <div className="pricing-grid">
          {PLANS.map(plan => (
            <div key={plan.id} className={`pricing-card${plan.popular ? ' pricing-card--popular' : ''}`}>
              {plan.popular && <div className="pricing-badge">Mais popular</div>}

              <div className="pricing-card-header">
                <h2 className="pricing-plan-name">{plan.name}</h2>
                <div className="pricing-price">
                  <span className="pricing-amount">{plan.price}</span>
                  {plan.period && <span className="pricing-period">{plan.period}</span>}
                </div>
                <p className="pricing-tagline">{plan.tagline}</p>
              </div>

              <button
                className={`pricing-cta pricing-cta--${plan.ctaVariant}`}
                onClick={() => handleCta(plan)}
                disabled={loading === plan.id || (user && plan.id === planId)}
              >
                {loading === plan.id ? 'A redirecionar…' : user && plan.id === planId ? 'Plano atual' : plan.cta}
              </button>

              <div className="pricing-section">
                <span className="pricing-section-label">Base</span>
                <ul className="pricing-feature-list">
                  {plan.features.map(f => <FeatureRow key={f.label} {...f} />)}
                </ul>
              </div>

              <div className="pricing-section pricing-section--ai">
                <span className="pricing-section-label">IA</span>
                <ul className="pricing-feature-list">
                  {plan.ai.map(f => <FeatureRow key={f.label} {...f} />)}
                </ul>
              </div>

              {plan.career && (
                <div className="pricing-section">
                  <span className="pricing-section-label">Carreira</span>
                  <ul className="pricing-feature-list">
                    {plan.career.map(f => <FeatureRow key={f.label} {...f} />)}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
