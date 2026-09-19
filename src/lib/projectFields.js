// Fonte única dos limiares de "campo bem preenchido" por secção do projeto.
// Antes havia três tabelas diferentes (score.js, challenges.js, e
// PROFILE_SCORE_FIELDS dentro de ProjectPage.jsx) com números que não
// concordavam — por isso um projeto podia mostrar "8/8 missões completas"
// e um score bem abaixo de 100, sem nenhuma explicação para quem o vê.
// Os valores vêm de score.js (era a versão com mais peso: afeta
// certificado, ranking e ordenação da Home), e score.js/challenges.js/
// ProjectPage.jsx passam todos a ler daqui.
//
// scoreGain = pontos de score que este campo desbloqueia ao atingir minLen.
export const PROJECT_FIELDS = [
  { key: 'problem',         label: 'Problema',       minLen: 120, scoreGain: 8 },
  { key: 'solution',        label: 'Solução',        minLen: 120, scoreGain: 8 },
  { key: 'target_audience', label: 'Público-alvo',   minLen: 60,  scoreGain: 5 },
  { key: 'features',        label: 'Funcionalidades', minLen: 120, scoreGain: 5 },
  { key: 'technologies',    label: 'Tecnologias',    minLen: 1,   scoreGain: 4 },
  { key: 'challenges',      label: 'Desafios',       minLen: 60,  scoreGain: 5 },
  { key: 'results',         label: 'Resultados',     minLen: 100, scoreGain: 8 },
  { key: 'learnings',       label: 'Aprendizagens',  minLen: 100, scoreGain: 8 },
]

export function getProjectField(key) {
  return PROJECT_FIELDS.find(f => f.key === key)
}
