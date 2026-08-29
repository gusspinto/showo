import { Target, Lightbulb, Users, Gear as Settings, Wrench, Mountains as Mountain, TrendUp as TrendingUp, Brain } from '@phosphor-icons/react'

// scoreGain = pontos máximos de score que esta missão desbloqueia (ao atingir o threshold)
export const CHALLENGES = [
  {
    id: 'problem',
    icon: Target,
    title: 'Apresenta o problema',
    description: 'Descreve o problema que o teu projeto resolve com pelo menos 100 caracteres.',
    scoreGain: 15,
    field: 'problem',
    fieldLabel: 'Problema',
    threshold: 100,
  },
  {
    id: 'solution',
    icon: Lightbulb,
    title: 'Descreve a solução',
    description: 'Explica a tua solução com pelo menos 100 caracteres.',
    scoreGain: 15,
    field: 'solution',
    fieldLabel: 'Solução',
    threshold: 100,
  },
  {
    id: 'target_audience',
    icon: Users,
    title: 'Define o teu público',
    description: 'Descreve quem vai usar o teu projeto com pelo menos 50 caracteres.',
    scoreGain: 10,
    field: 'target_audience',
    fieldLabel: 'Público-alvo',
    threshold: 50,
  },
  {
    id: 'features',
    icon: Settings,
    title: 'Lista as funcionalidades',
    description: 'Descreve as funcionalidades principais com pelo menos 100 caracteres.',
    scoreGain: 10,
    field: 'features',
    fieldLabel: 'Funcionalidades',
    threshold: 100,
  },
  {
    id: 'technologies',
    icon: Wrench,
    title: 'Mostra as tecnologias',
    description: 'Menciona as tecnologias utilizadas no projeto.',
    scoreGain: 8,
    field: 'technologies',
    fieldLabel: 'Tecnologias',
    threshold: 1,
  },
  {
    id: 'challenges',
    icon: Mountain,
    title: 'Documenta os desafios',
    description: 'Partilha os desafios que enfrentaste com pelo menos 50 caracteres.',
    scoreGain: 8,
    field: 'challenges',
    fieldLabel: 'Desafios',
    threshold: 50,
  },
  {
    id: 'results',
    icon: TrendingUp,
    title: 'Prova os resultados',
    description: 'Mostra os resultados alcançados com pelo menos 80 caracteres.',
    scoreGain: 12,
    field: 'results',
    fieldLabel: 'Resultados',
    threshold: 80,
  },
  {
    id: 'learnings',
    icon: Brain,
    title: 'Reflete sobre o aprendizado',
    description: 'Partilha o que aprendeste com pelo menos 80 caracteres.',
    scoreGain: 12,
    field: 'learnings',
    fieldLabel: 'Aprendizagens',
    threshold: 80,
  },
]

export function getChallengeStatus(challenge, project) {
  const val = String(project[challenge.field] || '').trim()
  return val.length >= challenge.threshold ? 'completed' : 'available'
}

