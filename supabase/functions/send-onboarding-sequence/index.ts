import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/* ══════════════════════════════════════════════════════════════════════════
   SEQUÊNCIA DE ONBOARDING, ciclo de 14 dias (dia 0 já é o send-welcome-email
   existente, imediato no signup, não repetido aqui).

   Reescrita depois da reunião com o Maia (mentor, Savvy Growth) de
   2026-10-19: 800 leads novos, conversão baixa. Antes disto a sequência
   tinha só 4/5 passos, sem desconto nem urgência, só educação de feature.
   Pedido explícito: 14 dias, diário, desconto de 50%, urgência crescente
   ("faltam X dias"). Mantém o que já estava validado (dias 1-3, fork
   hasProject/sem projeto, testemunhos reais no dia 3) e acrescenta os
   dias 4 a 14 novos, cada um com um ângulo diferente.

   Só processa profiles com onboarding_sequence_step NOT NULL. A coluna
   fica NULL por omissão para quem já tinha conta antes desta feature (ver
   migração 165), só handle_new_user matricula com step=0. Corre uma vez
   por dia via pg_cron (já configurado, 10h), cada passo espera o número
   de dias correspondente desde created_at antes de disparar.

   step 0  → dia 1  (>=1 dia de conta)
   ...
   step 13 → dia 14 (>=14 dias), último email do ciclo, oferta termina
   step 14 → sequência terminada, nunca mais reprocessado. Quem chega aqui
             sem converter passa a receber só o ciclo contínuo semanal
             (send-weekly-recap e afins), não mais onboarding.

   O código de desconto vem de ONBOARDING_DISCOUNT_CODE (secret do projeto),
   não hardcoded aqui. Confirmar com o Gustavo que o cupão de 50% já
   existe no Stripe com este código antes de ligar isto a leads reais.

   Modo de teste: { test_user_id, force_step } no corpo, igual ao padrão já
   usado no send-weekly-checkin, para conseguir ver cada email a sério
   antes de isto correr contra gente real.
   ══════════════════════════════════════════════════════════════════════════ */

const TOTAL_DAYS = 14

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://showo.pt',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const FROM = 'Showo <hello@showo.pt>'
const APP = 'https://showo.pt'

function esc(v: unknown) {
  return String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
}

async function signUserId(userId: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sigBuf = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(userId))
  return Array.from(new Uint8Array(sigBuf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

// Alias do resolvePlanId em src/lib/plans.js — mantém a mesma regra aqui,
// já que esta função corre no servidor e não pode importar código do
// frontend diretamente. organizationPlan vem de uma query à parte à tabela
// organizations (profiles NÃO tem essa coluna, confirmado ao vivo: a
// primeira versão desta função tentava profiles.organization_plan e dava
// "column does not exist").
const PLAN_ALIASES: Record<string, string> = { build: 'plus', launch: 'pro' }
function resolvePlanId(profile: { role?: string; organization_id?: string; plan?: string }, organizationPlan?: string): string {
  if (profile.role === 'professor') return 'pro'
  if (profile.organization_id) {
    const orgPlan = PLAN_ALIASES[organizationPlan ?? ''] || organizationPlan
    return orgPlan === 'pro' ? 'school_pro' : 'school'
  }
  return PLAN_ALIASES[profile.plan ?? ''] || profile.plan || 'free'
}

function wrapEmail(bodyRows: string, footerNote: string, unsubscribeUrl: string) {
  return `
<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="#080808" style="background:#080808;">
  <tr>
    <td align="center" bgcolor="#080808" style="background:#080808;padding:48px 24px;font-family:-apple-system,Helvetica,Arial,sans-serif;">
      <table role="presentation" width="440" border="0" cellpadding="0" cellspacing="0" style="max-width:440px;width:100%;text-align:left;">
        <tr><td style="padding:0 0 28px;"><img src="https://showo.pt/icon.png" alt="Showo" width="32" height="32" style="display:block;border:0;" /></td></tr>
        ${bodyRows}
        <tr><td style="font-size:11px;color:#555555;">Showo &middot; <a href="${APP}" style="color:#555555;">showo.pt</a> &middot; ${footerNote} &middot; <a href="${esc(unsubscribeUrl)}" style="color:#555555;">cancelar estes emails</a></td></tr>
      </table>
    </td>
  </tr>
</table>`
}

function row(html: string) {
  return `<tr><td style="padding:0 0 16px;">${html}</td></tr>`
}

function greeting(firstName?: string) {
  return firstName ? row(`<span style="color:#888888;font-size:16px;line-height:1.4;">${esc(firstName)},</span>`) : ''
}

function headline(text: string) {
  return `<tr><td style="padding:0 0 24px;color:#f0f0f0;font-size:28px;line-height:1.25;font-weight:800;letter-spacing:-0.01em;">${text}</td></tr>`
}

function paragraph(text: string, last = false) {
  return `<tr><td style="padding:0 0 ${last ? '32' : '10'}px;color:#888888;font-size:16px;line-height:1.5;">${text}</td></tr>`
}

function cta(href: string, label: string) {
  return `<tr><td style="padding:0 0 24px;"><a href="${href}" style="display:inline-block;background:#2B7EF5;color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 24px;border-radius:10px;">${esc(label)}</a></td></tr>`
}

function quote(text: string, author: string) {
  return `<tr><td style="padding:0 0 20px;"><table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0"><tr><td style="border-left:2px solid #2B7EF5;padding-left:16px;color:#cccccc;font-size:15px;line-height:1.6;font-style:italic;">"${text}"<div style="margin-top:8px;color:#888888;font-size:13px;font-style:normal;">${author}</div></td></tr></table></td></tr>`
}

// Faixa de urgência, mesma em todos os dias, só muda o texto conforme
// quanto falta. Últimos 3 dias ficam vermelhos (mais intensos), o resto
// azul (consistente com a marca, não grita artificialmente desde o dia 1).
function urgencyBand(diaAtual: number, code: string) {
  const diasRestantes = TOTAL_DAYS - diaAtual
  const urgente = diasRestantes <= 2
  const texto = diasRestantes <= 0
    ? 'Último dia, o desconto termina hoje à meia-noite.'
    : diasRestantes === 1
      ? 'Resta 1 dia de desconto.'
      : `Restam ${diasRestantes} dias de desconto.`
  const color = urgente ? '#F5493B' : '#2B7EF5'
  return `<tr><td style="padding:0 0 20px;"><table role="presentation" border="0" cellpadding="0" cellspacing="0"><tr><td style="background:${color}1a;border:1px solid ${color}40;border-radius:8px;padding:8px 12px;color:${color};font-size:12.5px;font-weight:700;">${esc(texto)} 50% com o código ${esc(code)}.</td></tr></table></td></tr>`
}

type Built = { subject: string; html: string }
type DayBuilderCtx = {
  firstName?: string
  unsubscribeUrl: string
  hasProject: boolean
  code: string
  dia: number
}

function buildDay1({ firstName, unsubscribeUrl, hasProject, code, dia }: DayBuilderCtx): Built {
  if (!hasProject) {
    const subject = 'O teu primeiro projeto demora 2 minutos a criar'
    return {
      subject,
      html: wrapEmail(
        greeting(firstName) +
        urgencyBand(dia, code) +
        headline('Ainda não criaste o teu primeiro projeto') +
        paragraph('Não precisa de estar pronto nem perfeito. Sobe um PDF, um PowerPoint, ou descreve em duas frases o que já fizeste, a IA trata do resto.') +
        paragraph('A partir daí, a IA já lê o diário do projeto antes de responder, sem teres de explicar tudo outra vez sempre que perguntas algo.') +
        paragraph(`Já agora: tens 50% de desconto no Plus durante os primeiros 6 meses com o código ${esc(code)}, quando quiseres avançar.`, true) +
        cta(`${APP}/novo`, 'Começar agora, 2 minutos'),
        `Dia ${dia} de ${TOTAL_DAYS}`,
        unsubscribeUrl,
      ),
    }
  }
  const subject = 'A diferença entre isto e abrir o ChatGPT outra vez'
  return {
    subject,
    html: wrapEmail(
      greeting(firstName) +
      urgencyBand(dia, code) +
      headline('Já reparaste que o ChatGPT começa sempre do zero?') +
      paragraph('Sempre que abres o ChatGPT para falar do teu projeto, tens de explicar tudo outra vez.') +
      paragraph('No Showo a IA lê o diário do projeto antes de responder. Continuas a mesma conversa, com contexto acumulado desde o primeiro dia.') +
      paragraph(`Já agora: tens 50% de desconto no Plus durante os primeiros 6 meses com o código ${esc(code)}, quando quiseres avançar.`, true) +
      cta(`${APP}/dashboard`, 'Continuar a conversa com a IA'),
      `Dia ${dia} de ${TOTAL_DAYS}`,
      unsubscribeUrl,
    ),
  }
}

function buildDay2({ firstName, unsubscribeUrl, hasProject, code, dia }: DayBuilderCtx): Built {
  if (!hasProject) {
    const subject = 'Não sabes o que mostrar? Nem precisa de estar acabado'
    return {
      subject,
      html: wrapEmail(
        greeting(firstName) +
        urgencyBand(dia, code) +
        headline('"Não tenho nada digno de mostrar" é a dúvida mais comum') +
        paragraph('PAP a meio, estágio em curso, um projeto pessoal, até trabalho de faculdade. Não precisa de estar pronto nem de ser impressionante, o que interessa é mostrar o processo real, não só o resultado final.') +
        paragraph('Sobe o que já tens e a IA ajuda a organizar isso numa página que faz sentido.') +
        paragraph(`Já agora: tens 50% de desconto no Plus durante os primeiros 6 meses com o código ${esc(code)}, quando quiseres avançar.`, true) +
        cta(`${APP}/novo`, 'Ver o meu projeto em 2 minutos'),
        `Dia ${dia} de ${TOTAL_DAYS}`,
        unsubscribeUrl,
      ),
    }
  }
  const subject = 'O teu GitHub também pode contar a história'
  return {
    subject,
    html: wrapEmail(
      greeting(firstName) +
      urgencyBand(dia, code) +
      headline('O teu GitHub também pode contar a história') +
      paragraph('Liga o repositório e os commits entram sozinhos no diário do projeto, ao lado das tuas notas.') +
      paragraph('Quando o portfólio estiver pronto, publicas direto no LinkedIn, sem exportar nada à mão.') +
      paragraph(`Já agora: tens 50% de desconto no Plus durante os primeiros 6 meses com o código ${esc(code)}, quando quiseres avançar.`, true) +
      cta(`${APP}/dashboard`, 'Ligar o GitHub ao meu projeto'),
      `Dia ${dia} de ${TOTAL_DAYS}`,
      unsubscribeUrl,
    ),
  }
}

function buildDay3({ firstName, unsubscribeUrl, hasProject, code, dia }: DayBuilderCtx): Built {
  const subject = 'Não inventamos números só para parecer impressionante'
  return {
    subject,
    html: wrapEmail(
      greeting(firstName) +
      urgencyBand(dia, code) +
      headline('Não vamos inventar números só para parecer impressionante') +
      paragraph('Preferimos mostrar o que quem já usa o Showo disse, com o nome deles:') +
      quote('Para alguém que fez PAP e queria usá-la para exposição, esta app é um gamechanger para estudantes na mesma situação.', 'Rafael Matos, Estudante de Engenharia Informática da Universidade de Aveiro') +
      quote('Na minha opinião, um dos pontos mais fortes da plataforma é a Defesa. A organização e preparação torna tudo mais interativo e envolvente.', 'Rita Sousa, Estudante na Escola Profissional Bento de Jesus Caraça') +
      paragraph(`Já agora: tens 50% de desconto no Plus durante os primeiros 6 meses com o código ${esc(code)}, quando quiseres avançar.`, true) +
      (hasProject ? cta(`${APP}/dashboard`, 'Quero o mesmo resultado') : cta(`${APP}/novo`, 'Quero começar agora')),
      `Dia ${dia} de ${TOTAL_DAYS}`,
      unsubscribeUrl,
    ),
  }
}

function buildDay4({ firstName, unsubscribeUrl, code, dia }: DayBuilderCtx): Built {
  const subject = 'O plano Grátis tem só 1 análise de IA por mês'
  return {
    subject,
    html: wrapEmail(
      greeting(firstName) +
      urgencyBand(dia, code) +
      headline('Já deste o primeiro passo. O teu projeto está criado.') +
      paragraph('O plano Grátis inclui 1 análise de IA por mês, 3 projetos, e 10 mensagens de Coach IA. Chega para começar, mas sentes o limite depressa se usares a sério.') +
      paragraph(`O Plus dá 10 análises por mês, 15 projetos, 100 mensagens de Coach, e recap semanal automático. Com o código ${esc(code)}, metade do preço durante os primeiros 6 meses.`, true) +
      cta(`${APP}/pricing`, 'Desbloquear 10x mais análises'),
      `Dia ${dia} de ${TOTAL_DAYS}`,
      unsubscribeUrl,
    ),
  }
}

function buildDay5({ firstName, unsubscribeUrl, code, dia }: DayBuilderCtx): Built {
  const subject = 'Toda a segunda, um email pronto a partilhar no LinkedIn'
  return {
    subject,
    html: wrapEmail(
      greeting(firstName) +
      urgencyBand(dia, code) +
      headline('O recap semanal mostra a tua consistência a quem conta') +
      paragraph('Toda a segunda, um resumo automático do que fizeste na semana: quantos registos, quantos dias ativo, e um excerto real do teu diário.') +
      paragraph('A partir dele, geras um post pronto para o LinkedIn, para professores e recrutadores verem o processo, não só o resultado final.') +
      paragraph(`É uma feature do Plus. Com o código ${esc(code)}, tens 50% de desconto durante os primeiros 6 meses.`, true) +
      cta(`${APP}/pricing`, 'Ver como funciona o recap'),
      `Dia ${dia} de ${TOTAL_DAYS}`,
      unsubscribeUrl,
    ),
  }
}

function buildDay6({ firstName, unsubscribeUrl, code, dia }: DayBuilderCtx): Built {
  const subject = '10 mensagens por mês esgotam depressa'
  return {
    subject,
    html: wrapEmail(
      greeting(firstName) +
      urgencyBand(dia, code) +
      headline('10 mensagens de Coach IA por mês esgotam depressa') +
      paragraph('Cada pergunta ao Coach, cada revisão de texto, cada dúvida sobre o projeto conta para o limite mensal do plano Grátis.') +
      paragraph('No Plus são 100 por mês, dez vezes mais espaço para usares a IA como apoio real ao longo do projeto, não só nos primeiros dias.') +
      paragraph(`Com o código ${esc(code)}, tens 50% de desconto durante os primeiros 6 meses.`, true) +
      cta(`${APP}/pricing`, 'Passar a 100 mensagens por mês'),
      `Dia ${dia} de ${TOTAL_DAYS}`,
      unsubscribeUrl,
    ),
  }
}

function buildDay7({ firstName, unsubscribeUrl, code, dia }: DayBuilderCtx): Built {
  const subject = 'Estás a meio do prazo do desconto'
  return {
    subject,
    html: wrapEmail(
      greeting(firstName) +
      urgencyBand(dia, code) +
      headline('Estás a meio do prazo do desconto de 50%') +
      paragraph('Daqui a 7 dias o código deixa de ser válido. Se já sabes que vais querer usar o Showo a sério, agora é a altura mais barata para decidir.') +
      paragraph(`Código ${esc(code)}, 50% durante os primeiros 6 meses, aplica-se no checkout.`, true) +
      cta(`${APP}/pricing`, 'Usar o desconto agora'),
      `Dia ${dia} de ${TOTAL_DAYS}`,
      unsubscribeUrl,
    ),
  }
}

function buildDay8({ firstName, unsubscribeUrl, code, dia }: DayBuilderCtx): Built {
  const subject = 'As vagas de estágio também vivem dentro do Showo'
  return {
    subject,
    html: wrapEmail(
      greeting(firstName) +
      urgencyBand(dia, code) +
      headline('As vagas de estágio também vivem dentro do Showo') +
      paragraph('Para além do portfólio, há uma lista de vagas reais de estágio. Candidatas-te direto, com o teu perfil Showo como prova do que já fizeste.') +
      paragraph('É uma das razões pelas quais quem está à procura de estágio ou primeiro emprego fica no plano pago, não só pelo portfólio.') +
      paragraph(`Com o código ${esc(code)}, tens 50% de desconto durante os primeiros 6 meses.`, true) +
      cta(`${APP}/vagas`, 'Ver as vagas abertas'),
      `Dia ${dia} de ${TOTAL_DAYS}`,
      unsubscribeUrl,
    ),
  }
}

function buildDay9({ firstName, unsubscribeUrl, code, dia }: DayBuilderCtx): Built {
  const subject = 'Quanto custa por dia, a sério'
  return {
    subject,
    html: wrapEmail(
      greeting(firstName) +
      urgencyBand(dia, code) +
      headline('Quanto custa isto por dia, a sério?') +
      paragraph(`Com o código ${esc(code)}, o Plus fica a metade do preço durante 6 meses, menos do que um café por semana.`) +
      paragraph('Não é um gasto, é tempo que deixas de perder a reexplicar o projeto do zero a cada conversa com IA.', true) +
      cta(`${APP}/pricing`, 'Ver o preço com desconto'),
      `Dia ${dia} de ${TOTAL_DAYS}`,
      unsubscribeUrl,
    ),
  }
}

function buildDay10({ firstName, unsubscribeUrl, code, dia }: DayBuilderCtx): Built {
  const subject = 'A preparação da defesa, feita com meses de antecedência'
  return {
    subject,
    html: wrapEmail(
      greeting(firstName) +
      urgencyBand(dia, code) +
      headline('A defesa não começa a preparar-se na véspera') +
      paragraph('O Showo gera perguntas prováveis do júri a partir do teu diário real, e sugere respostas baseadas no que decidiste e porquê, desde o início do projeto.') +
      paragraph('Quem chega à defesa já com isto trabalhado nota a diferença, não é um resumo feito às pressas na última semana.') +
      paragraph(`Com o código ${esc(code)}, tens 50% de desconto durante os primeiros 6 meses.`, true) +
      cta(`${APP}/pricing`, 'Ver a preparação de defesa'),
      `Dia ${dia} de ${TOTAL_DAYS}`,
      unsubscribeUrl,
    ),
  }
}

function buildDay11({ firstName, unsubscribeUrl, code, dia }: DayBuilderCtx): Built {
  const subject = 'O que professores e recrutadores veem quando olham para o teu perfil'
  return {
    subject,
    html: wrapEmail(
      greeting(firstName) +
      urgencyBand(dia, code) +
      headline('O que professores e recrutadores veem no teu perfil') +
      quote('Era esta a ferramenta que me faltava para os meus estudos. Bastante alinhado com as necessidades dos alunos.', 'Maria Eduarda, Estudante da Computação e Engenharia de Software, Natixis') +
      paragraph('Um link, um portfólio organizado, com a consistência do teu trabalho ao longo do tempo, não só um PDF estático.') +
      paragraph(`Com o código ${esc(code)}, tens 50% de desconto durante os primeiros 6 meses.`, true) +
      cta(`${APP}/pricing`, 'Melhorar o meu perfil'),
      `Dia ${dia} de ${TOTAL_DAYS}`,
      unsubscribeUrl,
    ),
  }
}

function buildDay12({ firstName, unsubscribeUrl, code, dia }: DayBuilderCtx): Built {
  const subject = 'Faltam 2 dias para o desconto acabar'
  return {
    subject,
    html: wrapEmail(
      greeting(firstName) +
      urgencyBand(dia, code) +
      headline('Faltam 2 dias para o código deixar de valer') +
      paragraph(`${esc(code)} dá 50% durante 6 meses no Plus. Depois de amanhã, o preço volta ao normal.`) +
      paragraph('Se estavas à espera do momento certo, é este.', true) +
      cta(`${APP}/pricing`, 'Usar o desconto antes que acabe'),
      `Dia ${dia} de ${TOTAL_DAYS}`,
      unsubscribeUrl,
    ),
  }
}

function buildDay13({ firstName, unsubscribeUrl, code, dia }: DayBuilderCtx): Built {
  const subject = 'Última chamada: o desconto acaba amanhã'
  return {
    subject,
    html: wrapEmail(
      greeting(firstName) +
      urgencyBand(dia, code) +
      headline('O desconto acaba amanhã') +
      paragraph(`Amanhã à meia-noite o código ${esc(code)} deixa de funcionar. É a última oportunidade de entrar no Plus a metade do preço.`, true) +
      cta(`${APP}/pricing`, 'Garantir o desconto hoje'),
      `Dia ${dia} de ${TOTAL_DAYS}`,
      unsubscribeUrl,
    ),
  }
}

function buildDay14({ firstName, unsubscribeUrl, code, dia }: DayBuilderCtx): Built {
  const subject = 'Hoje é o último dia do desconto'
  return {
    subject,
    html: wrapEmail(
      greeting(firstName) +
      urgencyBand(dia, code) +
      headline('Hoje é o último dia') +
      paragraph(`Depois de hoje o código ${esc(code)} deixa de ser válido. Se vais usar o Showo a sério, não há melhor altura do que agora.`, true) +
      cta(`${APP}/pricing`, 'Usar o desconto antes que feche'),
      `Dia ${dia} de ${TOTAL_DAYS}`,
      unsubscribeUrl,
    ),
  }
}

const DAY_BUILDERS: Array<(ctx: DayBuilderCtx) => Built> = [
  buildDay1, buildDay2, buildDay3, buildDay4, buildDay5, buildDay6, buildDay7,
  buildDay8, buildDay9, buildDay10, buildDay11, buildDay12, buildDay13, buildDay14,
]

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const cronSecret = Deno.env.get('CRON_SECRET')
    const provided = req.headers.get('x-cron-secret')
    if (!cronSecret || provided !== cronSecret) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: corsHeaders })
    }

    const resendKey = Deno.env.get('RESEND_API_KEY')
    if (!resendKey) throw new Error('RESEND_API_KEY not configured')

    // Confirmar com o Gustavo que este código existe mesmo no Stripe como
    // cupão de 50% antes de ligar isto a leads reais. Sem o secret
    // configurado, a função recusa-se a correr (falha alto, não manda
    // emails prometendo um desconto que pode não existir).
    const discountCode = Deno.env.get('ONBOARDING_DISCOUNT_CODE')
    if (!discountCode) throw new Error('ONBOARDING_DISCOUNT_CODE not configured')

    let testUserId: string | null = null
    let forceStep: number | null = null
    try {
      const body = await req.json()
      if (typeof body?.test_user_id === 'string') testUserId = body.test_user_id
      if (typeof body?.force_step === 'number') forceStep = body.force_step
    } catch { /* corpo vazio é normal na chamada do cron */ }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const emailById = new Map<string, string>()
    {
      let page = 1
      for (;;) {
        const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 })
        if (error) throw error
        for (const u of data.users) if (u.email) emailById.set(u.id, u.email)
        if (data.users.length < 200) break
        page++
      }
    }

    const PROFILE_COLS = 'id, full_name, role, organization_id, plan, created_at, onboarding_sequence_step, onboarding_opted_out'
    let profilesQuery = supabase.from('profiles').select(PROFILE_COLS).not('onboarding_sequence_step', 'is', null)
    if (testUserId) profilesQuery = supabase.from('profiles').select(PROFILE_COLS).eq('id', testUserId)

    const { data: profiles, error: profErr } = await profilesQuery
    if (profErr) throw profErr

    const now = new Date()
    let sent = 0
    let closed = 0
    const errors: string[] = []

    for (const p of (profiles ?? [])) {
      try {
        if (!testUserId && p.onboarding_opted_out) continue
        if (!testUserId && (p.onboarding_sequence_step == null || p.onboarding_sequence_step >= TOTAL_DAYS)) continue

        const step = forceStep ?? p.onboarding_sequence_step ?? 0
        if (step < 0 || step >= TOTAL_DAYS) { closed++; continue }

        const daysSinceSignup = p.created_at ? Math.floor((now.getTime() - new Date(p.created_at).getTime()) / 86400000) : 0
        const daysNeeded = step + 1 // step 0 → dia 1 (>=1 dia), step 13 → dia 14 (>=14 dias)
        if (!testUserId && daysSinceSignup < daysNeeded) continue

        const email = emailById.get(p.id)
        if (!email) continue
        const firstName = p.full_name?.split(' ')[0]
        const unsubSig = await signUserId(p.id, cronSecret)
        const unsubscribeUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/onboarding-unsubscribe?u=${p.id}&sig=${unsubSig}`

        // hasProject é usado nos primeiros 3 dias, para escolher a variante
        // de copy certa (já validado: falar como se houvesse projeto para
        // quem não tem nenhum matava o clique).
        const { count: projectCount } = await supabase
          .from('projects')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', p.id)
          .eq('entry_kind', 'full')
        const hasProject = (projectCount ?? 0) > 0

        const builder = DAY_BUILDERS[step]
        const built = builder({ firstName, unsubscribeUrl, hasProject, code: discountCode, dia: step + 1 })
        const emailType = `onboarding_day${step + 1}`

        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: FROM,
            to: email,
            subject: built.subject,
            html: built.html,
            headers: {
              'List-Unsubscribe': `<${unsubscribeUrl}>`,
              'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
            },
          }),
        })
        if (!res.ok) { errors.push(await res.text()); continue }

        const { id: resendId } = await res.json()
        if (resendId) {
          await supabase.from('email_sends').insert({
            user_id: p.id,
            email_type: emailType,
            resend_id: resendId,
            to_email: email,
          })
        }
        sent++

        if (!testUserId) {
          await supabase.from('profiles')
            .update({ onboarding_sequence_step: step + 1, onboarding_sequence_sent_at: now.toISOString() })
            .eq('id', p.id)
        }
      } catch (e) {
        console.error('[send-onboarding-sequence] failed for', p.id, e)
        errors.push(String(e))
      }
    }

    return new Response(JSON.stringify({ ok: errors.length === 0, candidates: (profiles ?? []).length, sent, closed, errors }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error(e)
    return new Response(JSON.stringify({ error: 'Erro interno.' }), { status: 500, headers: corsHeaders })
  }
})
