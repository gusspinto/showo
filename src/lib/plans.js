export const PLANS = {
  // school plan = build features, assigned automatically to org accounts
  school: {
    id: 'school',
    name: 'Escola',
    maxProjects: 10,
    ai: {
      createProject: Infinity,
      interviewProject: Infinity,
      coach: Infinity,
      defense: Infinity,
      defenseTraining: 2,
      diaryReport: Infinity,
      narrative: Infinity,
      analyzeProject: Infinity,
      coverLetter: 0,
    },
    career: {
      internshipPage: false,
      weeklyRecap: true,
    },
  },
  free: {
    id: 'free',
    name: 'Grátis',
    maxProjects: 3,
    ai: {
      createProject: 2,
      interviewProject: 0,
      coach: 10,
      defense: 1,
      defenseTraining: 0,
      diaryReport: 1,
      narrative: 1,
      analyzeProject: 0,
      coverLetter: 0,
    },
    career: {
      internshipPage: false,
      weeklyRecap: false,
    },
  },
  build: {
    id: 'build',
    name: 'Build',
    maxProjects: 10,
    ai: {
      createProject: Infinity,
      interviewProject: Infinity,
      coach: Infinity,
      defense: Infinity,
      defenseTraining: 0,
      diaryReport: Infinity,
      narrative: Infinity,
      analyzeProject: Infinity,
      coverLetter: 0,
    },
    // Sem carreira, de propósito: o Build é para construir e organizar o
    // percurso escolar. Tudo o que aponta ao mercado de trabalho — recap
    // semanal, página de estágio, carta de apresentação — é o Launch.
    career: {
      internshipPage: false,
      weeklyRecap: false,
    },
  },
  launch: {
    id: 'launch',
    name: 'Launch',
    maxProjects: Infinity,
    ai: {
      createProject: Infinity,
      interviewProject: Infinity,
      coach: Infinity,
      defense: Infinity,
      defenseTraining: 0,
      diaryReport: Infinity,
      narrative: Infinity,
      analyzeProject: Infinity,
      coverLetter: Infinity,
    },
    career: {
      internshipPage: true,
      weeklyRecap: true,
    },
  },
}

export function getPlan(planId) {
  return PLANS[planId] ?? PLANS.free
}

// Returns remaining uses for a feature this month using server-side usage data.
// usageMap is { feature: usedCount } from get_ai_usage() RPC.
export function remainingUses(planId, feature, usageMap) {
  const limit = getPlan(planId).ai[feature]
  if (limit === Infinity) return Infinity
  if (limit === 0) return 0
  const used = usageMap?.[feature] ?? 0
  return Math.max(0, limit - used)
}

// Returns the monthly limit for a feature on a plan
export function featureLimit(planId, feature) {
  return getPlan(planId).ai[feature] ?? 0
}

// Returns the used count for a feature from usage map
export function featureUsed(feature, usageMap) {
  return usageMap?.[feature] ?? 0
}

export const AI_FEATURE_LABELS = {
  createProject: 'Criar projeto com IA',
  interviewProject: 'Entrevista guiada',
  coach: 'Coach IA',
  defense: 'Defesa IA',
  diaryReport: 'Relatório do diário',
  narrative: 'Narrativa IA',
  analyzeProject: 'Análise de projeto',
  defenseTraining: 'Treino de defesa',
  coverLetter: 'Carta de apresentação',
}

export const PLAN_GATE_MESSAGES = {
  maxProjects: (plan) => ({
    title: 'Limite de projetos atingido',
    body: plan === 'school'
      ? `A conta escolar permite até ${getPlan(plan).maxProjects} projetos. Para projetos ilimitados, cria uma conta pessoal Launch.`
      : `O plano ${getPlan(plan).name} permite até ${getPlan(plan).maxProjects} projetos. Com o Build tens até 10 — e no Launch são ilimitados.`,
  }),
  createProject: (plan) => ({
    title: 'Limite mensal atingido',
    body: `Já criaste o máximo de projetos com IA este mês no plano ${getPlan(plan).name}. Com o Build podes criar sem limites todos os meses.`,
  }),
  interviewProject: () => ({
    title: 'Entrevista guiada IA',
    body: 'A IA faz-te perguntas sobre o teu projeto e constrói o conteúdo a partir das tuas respostas — ideal quando não sabes por onde começar. Disponível no Build.',
  }),
  coach: (plan) => ({
    title: 'Limite do Coach IA atingido',
    body: `Chegaste ao limite de mensagens do Coach este mês no plano ${getPlan(plan).name}. Com o Build tens Coach ilimitado para melhorares o projeto sempre que quiseres.`,
  }),
  defense: (plan) => ({
    title: 'Limite da Defesa IA atingido',
    body: `Já usaste a Defesa com IA este mês no plano ${getPlan(plan).name}. Com o Build podes preparar a defesa sem limites — notas por slide, perguntas prováveis do júri, tudo.`,
  }),
  diaryReport: (plan) => ({
    title: 'Limite do Relatório IA atingido',
    body: `Chegaste ao limite de relatórios do diário este mês no plano ${getPlan(plan).name}. Com o Build a IA transforma o teu diário num relatório completo sempre que precisares.`,
  }),
  narrative: (plan) => ({
    title: 'Limite da Narrativa IA atingido',
    body: `Já usaste a Narrativa IA este mês no plano ${getPlan(plan).name}. Com o Build a IA reescreve a apresentação do teu projeto sem limites.`,
  }),
  analyzeProject: () => ({
    title: 'Análise completa de projeto',
    body: 'A IA revê o teu projeto secção a secção e diz-te exatamente o que melhorar para subir o score. Disponível no Build.',
  }),
  defenseTraining: () => ({
    title: 'Treino de defesa',
    body: 'Grava-te a apresentar o projeto e recebe feedback da IA sobre conteúdo, clareza e oratória. Disponível para contas de escola.',
  }),
  coverLetter: () => ({
    title: 'Carta de apresentação IA',
    body: 'A IA escreve uma carta de apresentação personalizada para cada vaga, usando os teus projetos reais como base. Disponível no Launch.',
  }),
  // checkGate('weeklyRecap') devolvia sempre message: undefined — a única
  // funcionalidade de carreira sem explicação nenhuma quando era bloqueada.
  weeklyRecap: () => ({
    title: 'Recap semanal',
    body: 'Todas as segundas recebes um resumo do que fizeste na semana anterior: o que avançou, o que ficou parado e o próximo passo. Chega por email e fica na app. Disponível no Launch.',
  }),
  internshipPage: () => ({
    title: 'Página de estágio',
    body: 'Uma página do teu portfolio organizada especificamente para recrutadores — projetos destacados, skills e contacto num só lugar. Disponível no Launch.',
  }),
}
