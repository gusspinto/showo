export const PLANS = {
  school: {
    id: 'school',
    name: 'Escola Plus',
    maxProjects: 10,
    ai: {
      createProject: 15,
      interviewProject: 15,
      coach: 150,
      defense: 15,
      defenseTraining: 10,
      diaryReport: 5,
      narrative: 15,
      analyzeProject: 15,
      coverLetter: 0,
      exportPptx: 20,
      generateImage: 0,
    },
    career: {
      internshipPage: false,
      maxApplicationsPerMonth: 0,
      weeklyRecap: true,
      cleanLink: false,
      githubSync: true,
    },
    files: { maxProjectMB: 250, maxAccountMB: 2560 },
  },
  school_pro: {
    id: 'school_pro',
    name: 'Escola Pro',
    maxProjects: 30,
    ai: {
      createProject: 30,
      interviewProject: 30,
      // Mesma correção do Pro (ver 231): estava em 300, margem negativa.
      coach: 80,
      defense: 25,
      defenseTraining: 25,
      diaryReport: 10,
      narrative: 25,
      analyzeProject: 25,
      coverLetter: 25,
      exportPptx: Infinity,
      generateImage: 15,
    },
    career: {
      internshipPage: true,
      maxApplicationsPerMonth: Infinity,
      weeklyRecap: true,
      cleanLink: true,
      githubSync: true,
    },
    files: { maxProjectMB: 1024, maxAccountMB: 5120 },
  },
  free: {
    id: 'free',
    name: 'Grátis',
    maxProjects: 2,
    ai: {
      createProject: 3,
      interviewProject: 3,
      coach: 10,
      defense: 1,
      defenseTraining: 0,
      diaryReport: 1,
      narrative: 1,
      analyzeProject: 1,
      coverLetter: 0,
      exportPptx: 3,
      generateImage: 0,
    },
    career: {
      internshipPage: false,
      maxApplicationsPerMonth: 0,
      weeklyRecap: false,
      cleanLink: false,
      githubSync: false,
    },
    files: { maxProjectMB: 0, maxAccountMB: 0 },
  },
  plus: {
    id: 'plus',
    name: 'Plus',
    priceLabel: '€8,99',
    priceLabelDiscounted: '€4,49',
    priceLabelAnnual: '€89,90',
    // Mesmo cupão SHOWO_ONBOARDING_2026 (-50%), aplicado ao anual também
    // (create-annual-checkout). €89,90/2 = €44,95. Antes disto, o anual
    // mostrava o preço riscado errado (mensal×12, sem ligação nenhuma ao
    // cupão) e o preço cheio como se já fosse o preço com desconto.
    priceLabelAnnualDiscounted: '€44,95',
    period: '/mês',
    maxProjects: 15,
    ai: {
      createProject: 15,
      interviewProject: 15,
      // Baixado de 100 para 30 (2026-11-03): no pior caso de custo real por
      // mensagem já visto ($0,068), 100 mensagens sozinhas quase esgotavam
      // toda a margem do preço do Plus. 30 fecha ~79% de margem no caso
      // médio e ~55% no pior caso, e é 3x o limite do Grátis (10), proporção
      // que se vende melhor do que um salto pequeno.
      coach: 30,
      defense: 10,
      defenseTraining: 5,
      diaryReport: 5,
      narrative: 10,
      analyzeProject: 10,
      coverLetter: 5,
      exportPptx: 15,
      // Imagens (capas de projeto): limite calculado com margem real a
      // ~$0,011/imagem (GPT Image, tier baixo). Ver migração 230.
      generateImage: 5,
    },
    career: {
      internshipPage: true,
      maxApplicationsPerMonth: 3,
      weeklyRecap: true,
      cleanLink: false,
      githubSync: true,
    },
    files: { maxProjectMB: 250, maxAccountMB: 3840 },
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    priceLabel: '€17,99',
    priceLabelDiscounted: '€8,99',
    priceLabelAnnual: '€179,90',
    // €179,90/2 = €89,95.
    priceLabelAnnualDiscounted: '€89,95',
    period: '/mês',
    maxProjects: Infinity,
    ai: {
      createProject: 30,
      interviewProject: 30,
      // Baixado de 300 para 80, depois para 50 (2026-11-03). O cupão
      // SHOWO_ONBOARDING_2026 (-50%, primeiros 6 meses) baixa o preço real
      // do Pro para ~€9, e nesse preço 80 dava margem negativa no pior caso
      // de custo real por mensagem já visto ($0,068). A 50, o pior caso com
      // desconto fecha em ~0% (nem lucro nem prejuízo), nunca negativo, e
      // sem desconto fica bem acima disso. Progressão 10 (Grátis) / 30
      // (Plus) / 50 (Pro) também vende melhor do que 10/30/40.
      coach: 50,
      defense: 25,
      defenseTraining: 25,
      diaryReport: 10,
      narrative: 25,
      analyzeProject: 25,
      coverLetter: 25,
      exportPptx: Infinity,
      generateImage: 15,
    },
    career: {
      internshipPage: true,
      maxApplicationsPerMonth: Infinity,
      weeklyRecap: true,
      cleanLink: true,
      githubSync: true,
    },
    files: { maxProjectMB: 1024, maxAccountMB: 5120 },
  },
}

// Alias old plan IDs to new ones
const PLAN_ALIASES = { build: 'plus', launch: 'pro' }

export function getPlan(planId) {
  const resolved = PLAN_ALIASES[planId] || planId
  return PLANS[resolved] ?? PLANS.free
}

// Single source of truth for "which plan does this profile actually have".
// Professor override and school-account override both live here so every
// caller (AuthContext, Admin, anywhere else) agrees — duplicating this logic
// inline is how the admin plan-count stat went stale after the Plus/Pro rename.
// `organization_plan` is the organization's own plan tier ('plus' | 'pro'),
// which the caller has to fetch and attach separately — profiles don't carry
// it directly. Missing/unrecognized org plan defaults to the Plus tier.
export function resolvePlanId(profile) {
  if (!profile) return 'free'
  if (profile.role === 'professor') return 'pro'
  if (profile.organization_id) {
    const orgPlan = PLAN_ALIASES[profile.organization_plan] || profile.organization_plan
    return orgPlan === 'pro' ? 'school_pro' : 'school'
  }
  return PLAN_ALIASES[profile.plan] || profile.plan || 'free'
}

// Próximo tier pago a partir do plano atual, para o pop-up de upgrade dentro da app
// (PlanGate) mostrar um CTA direto em vez de mandar para /pricing. Devolve null quando
// não há upgrade self-serve a oferecer: quem já está no Pro, e o Grátis/tudo o resto cai
// no default 'plus'. As contas de escola (school/school_pro) nunca chamam isto — são
// vendidas à instituição, nunca self-serve, e o PlanGateModal trata isso à parte.
const NEXT_PAID_PLAN = { free: 'plus', plus: 'pro' }

export function nextPaidPlan(planId) {
  const resolved = PLAN_ALIASES[planId] || planId
  const nextId = NEXT_PAID_PLAN[resolved]
  return nextId ? PLANS[nextId] : null
}

// O primeiro plano pago que desbloqueia mesmo esta feature, a partir do plano
// atual — "próximo tier" nem sempre chega: o link limpo só existe no Pro, por
// exemplo, por isso quem está no Grátis não pode ser mandado só para o Plus.
// Usado pelos cartões de upsell de features booleanas (career/ficheiros), que
// nomeiam o plano certo em vez de assumir sempre o seguinte.
const SELF_SERVE_TIERS = ['free', 'plus', 'pro']
export function planThatUnlocks(feature, planId) {
  const resolved = PLAN_ALIASES[planId] || planId
  const current = SELF_SERVE_TIERS.indexOf(resolved)
  const start = current === -1 ? 0 : current + 1
  for (let i = start; i < SELF_SERVE_TIERS.length; i++) {
    const p = PLANS[SELF_SERVE_TIERS[i]]
    const unlocked = p.career?.[feature] === true
      || (feature === 'projectFiles' && (p.files?.maxProjectMB ?? 0) > 0)
    if (unlocked) return p
  }
  return null
}

// Visão geral do que o próximo plano desbloqueia, para preencher o pop-up de
// upgrade com benefícios concretos em vez de espaço vazio ao lado dos botões
// (pedido do Gustavo, o utilizador "não consegue perceber os benefícios reais").
// Dados reais dos planos, não uma lista inventada, só o que de facto melhora.
//
// `from`/`to`/`suffix` em vez de uma string já formatada ("2 → 15"): o
// pop-up (PlanGate.jsx) estava a desenhar isto como texto solto a flutuar,
// sem nada a segurar visualmente, pedido do Gustavo para ficar com mais
// cuidado. Com os valores separados, o "antes" pode ficar pequeno/riscado e
// o "depois" em destaque, como já acontece no preço anual. `icon` é só uma
// chave (string), não um componente: este ficheiro não sabe de React, quem
// usa é que resolve para o ícone.
export function planHighlights(fromPlanId, toPlan) {
  const from = getPlan(fromPlanId)
  if (!toPlan) return []
  const fmt = (n) => (n === Infinity ? 'ilimitado' : n)
  const items = []

  if (toPlan.maxProjects > from.maxProjects) {
    items.push({ label: 'Projetos', icon: 'projects', from: fmt(from.maxProjects), to: fmt(toPlan.maxProjects) })
  }
  if (toPlan.ai.coach > from.ai.coach) {
    items.push({ label: 'Coach IA', icon: 'coach', from: fmt(from.ai.coach), to: fmt(toPlan.ai.coach), suffix: '/mês' })
  }
  if (toPlan.career.weeklyRecap && !from.career.weeklyRecap) {
    items.push({ label: 'Recap semanal automático', icon: 'recap', to: 'incluído' })
  }
  if (toPlan.career.internshipPage && !from.career.internshipPage) {
    items.push({ label: 'Vagas de estágio', icon: 'internships', to: 'incluído' })
  }
  if (toPlan.career.cleanLink && !from.career.cleanLink) {
    items.push({ label: 'Link limpo, sem /u/...', icon: 'link', to: 'incluído' })
  }
  if (toPlan.ai.exportPptx > from.ai.exportPptx) {
    items.push({ label: 'Exportar PowerPoint', icon: 'export', from: fmt(from.ai.exportPptx), to: fmt(toPlan.ai.exportPptx), suffix: '/mês' })
  }
  // Era 4, reduzido no pop-up de upgrade, pedido do Gustavo para ficar
  // mais simples: só os 3 benefícios mais fortes, não a lista toda.
  return items.slice(0, 3)
}

// Texto da promoção de lançamento (código SHOWO50, aplicado automaticamente
// no checkout via ONBOARDING_DISCOUNT_CODE). Uma só fonte de verdade para a
// Pricing e o pop-up de upgrade não desalinharem a data ou o desconto.
export const ONBOARDING_DISCOUNT_NOTE = '-50% nos primeiros 6 meses · código válido até 18 dez'

// Mesma nota para o anual, que é pagamento único (não faz sentido falar em
// "primeiros 6 meses" para uma só cobrança). Gustavo apontou que o anual
// nunca aplicava este desconto, nem no preço mostrado nem no checkout real
// (create-annual-checkout só tinha allow_promotion_codes, a pessoa tinha de
// escrever o código à mão, 0 resgates confirmados no Stripe).
export const ANNUAL_ONBOARDING_DISCOUNT_NOTE = '-50% no primeiro ano · código válido até 18 dez'

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
  generateImage: 'Gerar imagens',
}

export const PLAN_GATE_MESSAGES = {
  maxProjects: (plan) => ({
    title: 'Limite de projetos atingido',
    body: plan === 'school' || plan === 'school_pro'
      ? `A conta escolar permite até ${getPlan(plan).maxProjects} projetos. Fala com o teu professor sobre o plano da escola.`
      : plan === 'free'
        ? 'Já tens 2 projetos, o máximo do plano Grátis. Com o Plus tens 15 projetos e muito mais IA.'
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
    body: plan === 'free'
      ? 'Já usaste as 10 mensagens do Coach este mês. Com o Plus tens 30 por mês, continua exatamente de onde paraste.'
      : `Chegaste ao limite de mensagens do Coach este mês no plano ${getPlan(plan).name}. Faz upgrade para teres mais.`,
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
      ? 'A carta de apresentação com IA está disponível a partir do plano Plus (ou Escola Pro).'
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
    title: 'Vagas de estágio',
    body: 'Vê e candidata-te a vagas publicadas por empresas parceiras. Disponível a partir do Plus.',
  }),
  vagaApplication: (plan) => ({
    title: 'Limite de candidaturas atingido',
    body: plan === 'plus'
      ? 'Já usaste as 3 candidaturas deste mês no plano Plus. Com o Pro tens candidaturas ilimitadas.'
      : `Chegaste ao limite de candidaturas este mês no plano ${getPlan(plan).name}. Faz upgrade para teres mais.`,
  }),
  cleanLink: () => ({
    title: 'Link limpo',
    body: 'Escolhe o teu próprio link, sem código aleatório.',
  }),
  githubSync: () => ({
    title: 'Sincronização com o GitHub',
    body: 'O diário atualiza-se sozinho a cada push.',
  }),
  projectFiles: () => ({
    title: 'Ficheiros do projeto',
    body: 'Anexa PDFs, Word, PowerPoint ou imagens como prova.',
  }),
  generateImage: (plan) => ({
    title: 'Gerar imagens com IA',
    body: plan === 'free' || plan === 'school'
      ? 'Gerar imagens com IA está disponível a partir do plano Plus (5 por mês).'
      : `Já usaste as imagens deste mês no plano ${getPlan(plan).name}. Faz upgrade para teres mais.`,
  }),
}
