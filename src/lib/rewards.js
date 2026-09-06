// Conjunto de recompensas e sorteio das caixas. Partilhado entre o
// protótipo (/recompensa) e, mais tarde, a app a sério.
//
// Regra de ouro: caixas NUNCA se compram nem se sorteiam a dinheiro. Só se
// ganham a trabalhar. Na UI chamamos "recompensa", não "loot box".

// De onde vêm as caixas — os comportamentos que queremos incentivar.
export const BOX_SOURCES = {
  daily:           { label: 'Caixa diária',            desc: 'Abres a app e registas algo hoje' },
  diary_streak:    { label: 'Sequência do diário',     desc: '3 dias seguidos com registo' },
  publish:         { label: 'Projeto publicado',       desc: 'Publicaste um projeto' },
  skill_review:    { label: 'Competências confirmadas', desc: 'Revistes as sugestões da IA' },
  mission:         { label: 'Missão concluída',        desc: 'Terminaste uma missão' },
  score_milestone: { label: 'Marco de score',          desc: 'Chegaste a 60 / 80 / 100 num projeto' },
}

// As recompensas possíveis. `weight` é a probabilidade relativa.
// Tipos:
//   xp            — soma XP
//   accent        — desbloqueia uma cor de accent no ProfileCustomizer
//   font          — desbloqueia uma tipografia
//   banner_pattern— desbloqueia um padrão de banner
//   ai_credit     — 1 uso grátis de uma feature de IA
//   streak_freeze — não perde a sequência se falhar um dia
//   badge         — distintivo no perfil
export const REWARD_POOL = [
  { id: 'xp_15',   type: 'xp', label: '+15 XP',  value: 15, weight: 26, rarity: 'comum' },
  { id: 'xp_40',   type: 'xp', label: '+40 XP',  value: 40, weight: 10, rarity: 'incomum' },
  { id: 'xp_100',  type: 'xp', label: '+100 XP', value: 100, weight: 3, rarity: 'raro' },

  { id: 'accent_sunset',  type: 'accent', label: 'Cor "Pôr do sol"',  value: '#f97316', weight: 7, rarity: 'incomum' },
  { id: 'accent_forest',  type: 'accent', label: 'Cor "Floresta"',    value: '#15803d', weight: 7, rarity: 'incomum' },
  { id: 'accent_grape',   type: 'accent', label: 'Cor "Uva"',         value: '#7e22ce', weight: 7, rarity: 'incomum' },
  { id: 'accent_gold',    type: 'accent', label: 'Cor "Ouro"',        value: '#C49A20', weight: 3, rarity: 'raro' },

  { id: 'font_editorial',  type: 'font', label: 'Tipografia "Editorial"',  value: 'editorial',  weight: 5, rarity: 'raro' },
  { id: 'font_geometrico', type: 'font', label: 'Tipografia "Geométrico"', value: 'geometrico', weight: 5, rarity: 'raro' },

  { id: 'banner_grid',  type: 'banner_pattern', label: 'Padrão "Grelha"',   value: 'grid',  weight: 5, rarity: 'raro' },
  { id: 'banner_dots',  type: 'banner_pattern', label: 'Padrão "Pontos"',   value: 'dots',  weight: 5, rarity: 'raro' },
  { id: 'banner_waves', type: 'banner_pattern', label: 'Padrão "Ondas"',    value: 'waves', weight: 3, rarity: 'raro' },

  { id: 'ai_analyze', type: 'ai_credit', label: '1 Análise de projeto grátis', value: 'analyzeProject', weight: 9,  rarity: 'incomum' },
  { id: 'ai_defense', type: 'ai_credit', label: '1 Defesa com IA grátis',       value: 'defense',        weight: 7,  rarity: 'incomum' },
  { id: 'ai_report',  type: 'ai_credit', label: '1 Relatório do diário grátis', value: 'diaryReport',    weight: 7,  rarity: 'incomum' },

  { id: 'streak_freeze', type: 'streak_freeze', label: 'Congelador de sequência', value: 1, weight: 12, rarity: 'comum' },

  { id: 'badge_early',   type: 'badge', label: 'Distintivo "Madrugador"',  value: 'early',   weight: 2, rarity: 'raro' },
  { id: 'badge_steady',  type: 'badge', label: 'Distintivo "Constante"',   value: 'steady',  weight: 2, rarity: 'raro' },
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

// Sorteia uma recompensa. `exclude` = ids já desbloqueados de cosméticos
// (não vale a pena repetir uma cor que já tens — cai em XP nesse caso).
export function drawReward(exclude = []) {
  const pool = REWARD_POOL.filter(r => {
    if (['accent', 'font', 'banner_pattern', 'badge'].includes(r.type)) {
      return !exclude.includes(r.id)
    }
    return true
  })
  const w = pool.reduce((s, r) => s + r.weight, 0)
  let roll = Math.random() * w
  for (const r of pool) {
    roll -= r.weight
    if (roll <= 0) return r
  }
  return pool[pool.length - 1]
}
