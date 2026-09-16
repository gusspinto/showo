import { TargetIcon as Target } from '@solar-icons/react/bold/target'
import { LightbulbIcon as Lightbulb } from '@solar-icons/react/bold/lightbulb'
import { UsersGroupRoundedIcon as Users } from '@solar-icons/react/bold/users-group-rounded'
import { SettingsIcon as Settings } from '@solar-icons/react/bold/settings'
import { SettingsMinimalisticIcon as Wrench } from '@solar-icons/react/bold/settings-minimalistic'
import { PanoramaIcon as Mountain } from '@solar-icons/react/bold/panorama'
import { GraphNewUpIcon as TrendingUp } from '@solar-icons/react/bold/graph-new-up'
import { BrainIcon as Brain } from '@solar-icons/react/bold/brain'
import { getProjectField } from './projectFields'

// threshold/scoreGain vêm agora de projectFields.js — antes tinham números
// próprios (100/100/50/100/1/50/80/80) que não coincidiam com os do score
// (120/120/60/120/1/60/100/100), por isso uma missão podia ficar "completa"
// sem dar nenhum ponto de score real. Só title/description/icon ficam aqui,
// que são específicos da apresentação da missão.
export const CHALLENGES = [
  {
    id: 'problem',
    icon: Target,
    title: 'Apresenta o problema',
    description: 'Descreve o problema que o teu projeto resolve.',
    field: 'problem',
  },
  {
    id: 'solution',
    icon: Lightbulb,
    title: 'Descreve a solução',
    description: 'Explica a tua solução.',
    field: 'solution',
  },
  {
    id: 'target_audience',
    icon: Users,
    title: 'Define o teu público',
    description: 'Descreve quem vai usar o teu projeto.',
    field: 'target_audience',
  },
  {
    id: 'features',
    icon: Settings,
    title: 'Lista as funcionalidades',
    description: 'Descreve as funcionalidades principais.',
    field: 'features',
  },
  {
    id: 'technologies',
    icon: Wrench,
    title: 'Mostra as tecnologias',
    description: 'Menciona as tecnologias utilizadas no projeto.',
    field: 'technologies',
  },
  {
    id: 'challenges',
    icon: Mountain,
    title: 'Documenta os desafios',
    description: 'Partilha os desafios que enfrentaste.',
    field: 'challenges',
  },
  {
    id: 'results',
    icon: TrendingUp,
    title: 'Prova os resultados',
    description: 'Mostra os resultados alcançados.',
    field: 'results',
  },
  {
    id: 'learnings',
    icon: Brain,
    title: 'Reflete sobre o aprendizado',
    description: 'Partilha o que aprendeste.',
    field: 'learnings',
  },
].map(c => {
  const f = getProjectField(c.field)
  return { ...c, fieldLabel: f.label, threshold: f.minLen, scoreGain: f.scoreGain }
})

export function getChallengeStatus(challenge, project) {
  const val = String(project[challenge.field] || '').trim()
  return val.length >= challenge.threshold ? 'completed' : 'available'
}

