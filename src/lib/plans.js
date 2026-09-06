export const PLANS = {
  school: {
    id: 'school',
    name: 'Escola',
    maxProjects: 10,
    ai: {
      createProject: Infinity,
      interviewProject: Infinity,
      coach: Infinity,
      defense: Infinity,
      defenseTraining: Infinity,
      diaryReport: Infinity,
      narrative: Infinity,
      analyzeProject: Infinity,
      coverLetter: 0,
      exportPptx: Infinity,
    },
    career: {
      internshipPage: false,
      weeklyRecap: true,
    },
  },
  free: {
    id: 'free',
    name: 'Grátis',
    maxProjects: 5,
    ai: {
      createProject: 3,
      interviewProject: 3,
      coach: 15,
      defense: 1,
      defenseTraining: 0,
      diaryReport: 1,
      narrative: 1,
      analyzeProject: 1,
      coverLetter: 0,
      exportPptx: 3,
    },
    career: {
      internshipPage: false,
      weeklyRecap: false,
    },
  },
  plus: {
    id: 'plus',
    name: 'Plus',
    stripePriceId: typeof window !== 'undefined' && window.location?.hostname === 'localhost'
      ? 'price_1U3YjERzbl5ql7IdG7Yf5MhC'
      : 'price_1U3kJ92MED6Xa6YrWrLvrdXG',
    maxProjects: 15,
    ai: {
      createProject: 15,
      interviewProject: 15,
      coach: 100,
      defense: 10,
      defenseTraining: 5,
      diaryReport: 5,
      narrative: 10,
      analyzeProject: 10,
      coverLetter: 5,
      exportPptx: 15,
    },
    career: {
      internshipPage: false,
      weeklyRecap: true,
    },
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    stripePriceId: typeof window !== 'undefined' && window.location?.hostname === 'localhost'
      ? 'price_1U3YjvRzbl5ql7Id7uUcwFFD'
      : 'price_1U3kJA2MED6Xa6YrEQMfJ0q3',
    maxProjects: Infinity,
    ai: {
      createProject: 30,
      interviewProject: 30,
      coach: 300,
      defense: 25,
      defenseTraining: 25,
      diaryReport: 10,
      narrative: 25,
      analyzeProject: 25,
      coverLetter: 25,
      exportPptx: Infinity,
    },
    career: {
      internshipPage: true,
      weeklyRecap: true,
    },
  },
}

// Alias old plan IDs to new ones
const PLAN_ALIASES = { build: 'plus', launch: 'pro' }

export function getPlan(planId) {
  const resolved = PLAN_ALIASES[planId] || planId
  return PLANS[resolved] ?? PLANS.free
}

export function remainingUses(planId, feature, usageMap) {
  const limit = getPlan(planId).ai[feature]
  if (limit === Infinity) return Infinity
  if (limit === 0) return 0
  const used = usageMap?.[feature] ?? 0
  return Math.max(0, limit - used)
}

export function featureLimit(planId, feature) {
  return getPlan(planId).ai[feature] ?? 0
}

export function featureUsed(feature, usageMap) {
  return usageMap?.[feature] ?? 0
}

export const AI_FEATURE_LABELS = {
  createProject: 'Criar projeto com IA',
  interviewProject: 'Entrevista guiada',
  coach: 'Coach IA',
  defense: 'Defesa IA',
  diaryReport: 'Relatório do projeto',
  narrative: 'Narrativa IA',
  analyzeProject: 'Análise de projeto',
  defenseTraining: 'Treino de defesa',
  coverLetter: 'Carta de apresentação',
  exportPptx: 'Exportar PowerPoint',
}

export const PLAN_GATE_MESSAGES = {
  maxProjects: (plan) => ({
    title: 'Limite de projetos atingido',
    body: plan === 'school'
      ? `A conta escolar permite até ${getPlan(plan).maxProjects} projetos. Para projetos ilimitados, cria uma conta pessoal Pro.`
      : `O plano ${getPlan(plan).name} permite até ${getPlan(plan).maxProjects} projetos. Faz upgrade para teres mais.`,
  }),
  createProject: (plan) => ({
    title: 'Limite mensal atingido',
    body: `Já criaste o máximo de projetos com IA este mês no plano ${getPlan(plan).name}. Faz upgrade para criares mais.`,
  }),
  interviewProject: (plan) => ({
    title: 'Limite da entrevista guiada atingido',
    body: `Já usaste todas as entrevistas guiadas deste mês no plano ${getPlan(plan).name}. Faz upgrade para teres mais.`,
  }),
  coach: (plan) => ({
    title: 'Limite do Coach IA atingido',
    body: `Chegaste ao limite de mensagens do Coach este mês no plano ${getPlan(plan).name}. Com o Plus tens 100 mensagens por mês.`,
  }),
  defense: (plan) => ({
    title: 'Limite da Defesa IA atingido',
    body: `Já usaste a Defesa com IA este mês no plano ${getPlan(plan).name}. Com o Plus tens 10 por mês.`,
  }),
  diaryReport: (plan) => ({
    title: 'Limite do Relatório atingido',
    body: `Chegaste ao limite de relatórios este mês no plano ${getPlan(plan).name}. Com o Plus tens 5 por mês.`,
  }),
  narrative: (plan) => ({
    title: 'Limite da Narrativa IA atingido',
    body: `Já usaste a Narrativa IA este mês no plano ${getPlan(plan).name}. Com o Plus tens 10 por mês.`,
  }),
  analyzeProject: (plan) => ({
    title: 'Limite da Análise atingido',
    body: `Já usaste a Análise IA este mês no plano ${getPlan(plan).name}. Com o Plus tens 10 por mês.`,
  }),
  defenseTraining: (plan) => ({
    title: 'Treino de defesa',
    body: plan === 'free'
      ? 'O treino de defesa está disponível a partir do plano Plus.'
      : `Já usaste o treino de defesa este mês no plano ${getPlan(plan).name}. Faz upgrade para teres mais.`,
  }),
  coverLetter: (plan) => ({
    title: 'Carta de apresentação IA',
    body: plan === 'free' || plan === 'school'
      ? 'A carta de apresentação com IA está disponível a partir do plano Plus.'
      : `Já usaste as cartas de apresentação deste mês no plano ${getPlan(plan).name}. Faz upgrade para teres mais.`,
  }),
  exportPptx: (plan) => ({
    title: 'Limite de exportações PowerPoint',
    body: plan === 'free'
      ? 'Já exportaste os 3 PowerPoints deste mês no plano Grátis. Com o Plus tens 15 por mês.'
      : `Já usaste as exportações PPT deste mês no plano ${getPlan(plan).name}. Faz upgrade para teres mais.`,
  }),
  weeklyRecap: () => ({
    title: 'Recap semanal',
    body: 'Todas as segundas recebes um resumo do que fizeste na semana anterior. Disponível a partir do Plus.',
  }),
  internshipPage: () => ({
    title: 'Página de estágio',
    body: 'Uma página do teu portfólio organizada para recrutadores. Disponível no Pro.',
  }),
}
