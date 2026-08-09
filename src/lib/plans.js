export const PLANS = {
  free: {
    id: 'free',
    name: 'Grátis',
    maxProjects: 3,
    ai: {
      createProject: 2,      // uses/month
      interviewProject: 0,   // not available
      coach: 10,             // messages/month
      defense: 1,            // uses/month
      diaryReport: 1,        // uses/month
      narrative: 1,          // uses/month
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
  launch: {
    id: 'launch',
    name: 'Launch',
    maxProjects: Infinity,
    ai: {
      createProject: Infinity,
      interviewProject: Infinity,
      coach: Infinity,
      defense: Infinity,
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

// Returns the plan object for a given plan id (defaults to free)
export function getPlan(planId) {
  return PLANS[planId] ?? PLANS.free
}

// Keys used to track monthly AI usage in localStorage / DB
// Format: `ai_usage_${userId}_${feature}_${YYYY-MM}`
export function usageKey(userId, feature) {
  const month = new Date().toISOString().slice(0, 7) // "2026-08"
  return `ai_usage_${userId}_${feature}_${month}`
}

// Returns remaining uses for a feature this month.
// Returns Infinity when unlimited, 0 when exhausted, n when limited.
export function remainingUses(planId, feature, userId) {
  const limit = getPlan(planId).ai[feature]
  if (limit === Infinity) return Infinity
  if (limit === 0) return 0
  const used = parseInt(localStorage.getItem(usageKey(userId, feature)) ?? '0', 10)
  return Math.max(0, limit - used)
}

// Call this after a successful AI action to record usage.
export function recordUse(planId, feature, userId) {
  const limit = getPlan(planId).ai[feature]
  if (limit === Infinity || limit === 0) return
  const key = usageKey(userId, feature)
  const used = parseInt(localStorage.getItem(key) ?? '0', 10)
  localStorage.setItem(key, String(used + 1))
}

export const PLAN_GATE_MESSAGES = {
  maxProjects: (plan) => ({
    title: 'Limite de projetos atingido',
    body: `O plano ${getPlan(plan).name} permite até ${getPlan(plan).maxProjects} projetos. Com o Build tens até 10 — e no Launch são ilimitados.`,
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
  coverLetter: () => ({
    title: 'Carta de apresentação IA',
    body: 'A IA escreve uma carta de apresentação personalizada para cada vaga, usando os teus projetos reais como base. Disponível no Launch.',
  }),
  internshipPage: () => ({
    title: 'Página de estágio',
    body: 'Uma página do teu portfolio organizada especificamente para recrutadores — projetos destacados, skills e contacto num só lugar. Disponível no Launch.',
  }),
}
