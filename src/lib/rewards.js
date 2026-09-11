// Conjunto de recompensas e sorteio das caixas. Partilhado entre o
// protótipo (/recompensa) e, mais tarde, a app a sério.
//
// Regra de ouro: caixas NUNCA se compram nem se sorteiam a dinheiro. Só se
// ganham a trabalhar. Na UI chamamos "recompensa", não "loot box".

// O ritual diário — 3 passos pequenos. Fazer os 3 = "concluir o dia" = 1 caixa.
export const DAILY_STEPS = [
  { id: 'partilhar', label: 'Partilhar',  desc: 'Partilhaste o teu perfil ou um projeto' },
  { id: 'mostrar',   label: 'Mostrar',    desc: 'Adicionaste ou atualizaste algo no portfólio' },
  { id: 'registar',  label: 'Registar',   desc: 'Escreveste no diário de um projeto' },
]

// De onde vêm as caixas — os comportamentos que queremos incentivar.
export const BOX_SOURCES = {
  daily:           { label: 'Dia concluído',           desc: 'Fizeste os 3 passos do dia' },
  diary_streak:    { label: 'Sequência de dias',       desc: '3 dias seguidos concluídos' },
  publish:         { label: 'Projeto publicado',       desc: 'Publicaste um projeto' },
  skill_review:    { label: 'Competências confirmadas', desc: 'Revistes as sugestões da IA' },
  mission:         { label: 'Missão concluída',        desc: 'Terminaste uma missão' },
  score_milestone: { label: 'Marco de score',          desc: 'Chegaste a 60 / 80 / 100 num projeto' },
}

// As recompensas possíveis. `weight` é a probabilidade relativa.
//
// NADA que afete a qualidade do portfólio entra aqui. As cores, tipografias
// e o layout do perfil são de graça desde o início — a customização pesa
// demasiado na parte "portefólio" para ficar atrás de um sorteio.
// As recompensas são só extras: XP, créditos de IA, utilidades e distintivos.
//
// Tipos:
//   xp            — soma XP
//   ai_credit     — 1 uso grátis de uma feature de IA
//   streak_freeze — não perde a sequência se falhar um dia
//   explore_boost — o projeto fica em destaque na Explorar durante 48h
//   badge         — distintivo no perfil (não desbloqueia nada, é só estatuto)
export const REWARD_POOL = [
  { id: 'xp_15',   type: 'xp', label: '+15 XP',  value: 15,  weight: 30, rarity: 'comum' },
  { id: 'xp_40',   type: 'xp', label: '+40 XP',  value: 40,  weight: 14, rarity: 'incomum' },
  { id: 'xp_120',  type: 'xp', label: '+120 XP', value: 120, weight: 4,  rarity: 'raro' },

  { id: 'ai_analyze', type: 'ai_credit', label: '1 Análise de projeto grátis', value: 'analyzeProject', weight: 10, rarity: 'incomum' },
  { id: 'ai_defense', type: 'ai_credit', label: '1 Defesa com IA grátis',       value: 'defense',        weight: 8,  rarity: 'incomum' },
  { id: 'ai_report',  type: 'ai_credit', label: '1 Relatório do diário grátis', value: 'diaryReport',    weight: 8,  rarity: 'incomum' },

  { id: 'streak_freeze', type: 'streak_freeze', label: 'Congelador de sequência', value: 1, weight: 14, rarity: 'comum' },

  { id: 'boost_48h', type: 'explore_boost', label: 'Destaque na Explorar · 48h', value: 48, weight: 6, rarity: 'raro' },

  { id: 'badge_early',  type: 'badge', label: 'Distintivo "Madrugador"', value: 'early',  weight: 2, rarity: 'raro' },
  { id: 'badge_steady', type: 'badge', label: 'Distintivo "Constante"',  value: 'steady', weight: 2, rarity: 'raro' },
  { id: 'badge_curious', type: 'badge', label: 'Distintivo "Curioso"',   value: 'curious', weight: 2, rarity: 'raro' },
]

export const RARITY_COLOR = {
  comum:   'var(--color-text-secondary)',
  incomum: 'var(--color-primary)',
  raro:    '#C49A20',
}

const totalWeight = REWARD_POOL.reduce((s, r) => s + r.weight, 0)

// Probabilidade de cair (%) — para mostrar no protótipo.
export function dropChance(reward) {
  return Math.round((reward.weight / totalWeight) * 1000) / 10
}

// Sorteia uma recompensa. `exclude` = ids de distintivos já ganhos (não se
// repetem — cai noutra coisa nesse caso).
export function drawReward(exclude = []) {
  const pool = REWARD_POOL.filter(r => r.type !== 'badge' || !exclude.includes(r.id))
  const w = pool.reduce((s, r) => s + r.weight, 0)
  let roll = Math.random() * w
  for (const r of pool) {
    roll -= r.weight
    if (roll <= 0) return r
  }
  return pool[pool.length - 1]
}
