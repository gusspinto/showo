import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/* ══════════════════════════════════════════════════════════════════════════
   CHECK-IN SEMANAL — para quem não entra há 2+ dias.
   ──────────────────────────────────────────────────────────────────────────
   Diferente do send-weekly-recap (que celebra progresso de quem já usa):
   este é para quem parou. Quatro variantes reais, conforme o que é
   verdadeiro para cada pessoa — nunca finge uma visita que não aconteceu:
     1. tem projeto + teve visita real esta semana → mostra o número
     2. tem projeto + sem visita → foca em continuar, sem falar de visitas
     3. sem projeto + teve visita real → "a conta existe, viram e não
        encontraram nada"
     4. sem projeto + sem visita → nudge simples para começar

   NÃO diz "um recrutador" nem "uma empresa" — quase toda a base são alunos
   (confirmado: 20/28 dos que preencheram ocupação são "Aluno / A estudar",
   só 1 é "Empreendedor(a)"), por isso essa alegação seria quase sempre
   falsa. Fica genérico ("X pessoas"), honesto ao que os dados mostram.

   CTA de baixa fricção: quem não tem projeto nenhum vai para /novo, cujo
   primeiro passo já é "carrega um ficheiro" (não uma folha em branco) —
   quem já tem projeto vai direto para ele, a continuar, não a recomeçar.

   Corre sozinho via pg_cron toda segunda-feira às 9h UTC (job
   "send-weekly-checkin" — ver select * from cron.job). Tem opt-out (link
   no rodapé do email, checkin-unsubscribe/) e limite de MAX_CONSECUTIVE_SENDS
   tentativas seguidas sem a pessoa voltar, para nunca virar spam permanente.
   ══════════════════════════════════════════════════════════════════════════ */

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://showo.pt',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const FROM = 'Showo <hello@showo.pt>'
const APP = 'https://showo.pt'
const DORMANT_DAYS = 2
const RESEND_COOLDOWN_DAYS = 14
const VIEW_TYPES = ['PROFILE_VIEW', 'PROJECT_VIEW', 'COMPANY_VIEW']

function esc(v: unknown) {
  return String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
}

const MAX_CONSECUTIVE_SENDS = 4

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

// Variantes de copy por segmento, uma por tentativa (índice = streak antes
// deste envio). Com MAX_CONSECUTIVE_SENDS=4, ninguém recebe o mesmo texto
// duas vezes na mesma sequência — cada tentativa soa diferente da anterior,
// mesmo que o gancho de fundo (número real, ou falta dele) seja o mesmo.
const HEADLINE_PROJECT_NO_HOOK = (name: string) => [
  `Ainda não voltaste ao teu projeto ${name}`,
  `${name} continua exatamente como o deixaste`,
  `Falta pouco para voltares a ${name}`,
  `${name} está à espera que voltes`,
]
const HEADLINE_NO_PROJECT_NO_HOOK = (age: string) => [
  age ? `A tua conta existe ${age}. Continua vazia.` : 'A tua conta ainda está vazia.',
  age ? `Já ${age} sem nenhum projeto na conta.` : 'A tua conta ainda está vazia.',
  age ? `${age.replace('há ', '')} de conta, zero projetos.` : 'A tua conta ainda está vazia.',
  age ? `Continua tudo por fazer, ${age}.` : 'A tua conta ainda está vazia.',
]

const LINE2A_PROJECT_HOOK = [
  `O teu trabalho já está a chegar a pessoas, <strong style="color:#f0f0f0;">mesmo sem teres feito nada esta semana</strong>.`,
  `Estás a ser visto <strong style="color:#f0f0f0;">sem fazeres nada para isso</strong>.`,
  `O projeto continua a receber visitas, <strong style="color:#f0f0f0;">mesmo parado</strong>.`,
  `Isto não para de acontecer, <strong style="color:#f0f0f0;">mesmo sem novidades tuas</strong>.`,
]
const LINE2A_NO_PROJECT_HOOK = [
  `Já há gente a aparecer, <strong style="color:#f0f0f0;">só falta teres alguma coisa para mostrar</strong>.`,
  `Passaram pelo teu perfil e <strong style="color:#f0f0f0;">não encontraram nada</strong>.`,
  `O teu perfil continua a atrair gente, <strong style="color:#f0f0f0;">mesmo vazio</strong>.`,
  `Continuam a aparecer visitas, <strong style="color:#f0f0f0;">e continua tudo por preencher</strong>.`,
]
const LINE2A_PROJECT_NO_HOOK = [
  `Não é preciso ser muito, <strong style="color:#f0f0f0;">só continuar de onde ficaste</strong>.`,
  `Ficou exatamente onde o deixaste, <strong style="color:#f0f0f0;">pronto para continuares</strong>.`,
  `Não precisa de ser hoje um dia grande, <strong style="color:#f0f0f0;">só um passo</strong>.`,
  `Continua tudo à espera, <strong style="color:#f0f0f0;">tal como ficou</strong>.`,
]
const LINE2A_NO_PROJECT_NO_HOOK = [
  `Quanto mais tempo passa, <strong style="color:#f0f0f0;">mais difícil fica de começar</strong>.`,
  `A conta está pronta, <strong style="color:#f0f0f0;">só falta o primeiro projeto</strong>.`,
  `É mais rápido começar <strong style="color:#f0f0f0;">do que continuar a adiar</strong>.`,
  `Continua tudo por criar, <strong style="color:#f0f0f0;">exatamente como no primeiro dia</strong>.`,
]

const LINE2B_PROJECT_HOOK = (name: string) => [
  `Imagina o que acontece quando voltares a mexer em <strong style="color:#f0f0f0;">${name}</strong>. <strong style="color:#2B7EF5;">Dá-lhes mais para ver.</strong>`,
  `Volta a mexer em <strong style="color:#f0f0f0;">${name}</strong> enquanto ainda há gente a passar por lá. <strong style="color:#2B7EF5;">Continua agora.</strong>`,
  `Quem vir <strong style="color:#f0f0f0;">${name}</strong> agora vê a mesma versão de sempre. <strong style="color:#2B7EF5;">Muda isso.</strong>`,
  `<strong style="color:#f0f0f0;">${name}</strong> merece um update. <strong style="color:#2B7EF5;">Continua agora.</strong>`,
]
const LINE2B_NO_PROJECT_HOOK = [
  `O primeiro projeto não precisa de estar perfeito, <strong style="color:#f0f0f0;">precisa de existir</strong>. <strong style="color:#2B7EF5;">Começa agora.</strong>`,
  `Um ficheiro que já tenhas feito já chega para começar. <strong style="color:#2B7EF5;">Começa agora.</strong>`,
  `Não precisas de um plano perfeito, <strong style="color:#f0f0f0;">só de um primeiro passo</strong>. <strong style="color:#2B7EF5;">Começa agora.</strong>`,
  `Quem passar da próxima vez já podia encontrar alguma coisa. <strong style="color:#2B7EF5;">Começa agora.</strong>`,
]
const LINE2B_PROJECT_NO_HOOK = [
  `Cada dia parado é um dia a menos para mostrar progresso real. <strong style="color:#2B7EF5;">Continua agora.</strong>`,
  `Continuar agora é mais fácil do que recomeçar depois. <strong style="color:#2B7EF5;">Continua agora.</strong>`,
  `Um pequeno update já conta. <strong style="color:#2B7EF5;">Continua agora.</strong>`,
  `Não precisa de ser muito, só de não ficar mais um dia igual. <strong style="color:#2B7EF5;">Continua agora.</strong>`,
]
const LINE2B_NO_PROJECT_NO_HOOK = [
  `Só precisas de um ficheiro, mesmo a meio. <strong style="color:#2B7EF5;">Começa agora.</strong>`,
  `Não precisa de estar completo, precisa de existir. <strong style="color:#2B7EF5;">Começa agora.</strong>`,
  `Um PDF ou umas fotos já chegam para começar. <strong style="color:#2B7EF5;">Começa agora.</strong>`,
  `Não há maneira errada de começar. <strong style="color:#2B7EF5;">Começa agora.</strong>`,
]

function buildHtml(views: number, opts: { projectName?: string; projectSlug?: string; firstName?: string; daysSinceSignup?: number; unsubscribeUrl?: string; variantIndex?: number }) {
  const { projectName, projectSlug, firstName, daysSinceSignup, unsubscribeUrl, variantIndex } = opts
  const hasHook = views > 0
  const people = views === 1 ? 'pessoa viu' : 'pessoas viram'
  const accountAge = daysSinceSignup && daysSinceSignup > 0 ? `há ${daysSinceSignup} ${daysSinceSignup === 1 ? 'dia' : 'dias'}` : ''
  const i = variantIndex ?? 0
  const pick = <T,>(arr: T[]) => arr[i % arr.length]

  // Bloco de topo: número real em destaque quando há visita, ou uma frase
  // de peso equivalente quando não há — nunca um "0" a puxar para baixo.
  // Sem projeto e sem visita, usa a idade real da conta em vez de uma
  // frase genérica — é o único dado concreto que ainda sobra para pesar.
  const heroBlock = hasHook
    ? `<tr>
        <td style="padding:0 0 2px;color:#2B7EF5;font-size:56px;line-height:1;font-weight:800;letter-spacing:-0.02em;">
          ${views}
        </td>
      </tr>
      <tr>
        <td style="padding:0 0 24px;color:#888888;font-size:13px;line-height:1.4;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">
          ${people} o teu ${projectSlug ? 'projeto' : 'perfil'} esta semana
        </td>
      </tr>`
    : `<tr>
        <td style="padding:0 0 24px;color:#f0f0f0;font-size:28px;line-height:1.25;font-weight:800;letter-spacing:-0.01em;">
          ${projectSlug ? pick(HEADLINE_PROJECT_NO_HOOK(esc(projectName))) : pick(HEADLINE_NO_PROJECT_NO_HOOK(accountAge))}
        </td>
      </tr>`

  const line2a = hasHook
    ? pick(projectSlug ? LINE2A_PROJECT_HOOK : LINE2A_NO_PROJECT_HOOK)
    : pick(projectSlug ? LINE2A_PROJECT_NO_HOOK : LINE2A_NO_PROJECT_NO_HOOK)

  const line2b = hasHook
    ? pick(projectSlug ? LINE2B_PROJECT_HOOK(esc(projectName)) : LINE2B_NO_PROJECT_HOOK)
    : pick(projectSlug ? LINE2B_PROJECT_NO_HOOK : LINE2B_NO_PROJECT_NO_HOOK)

  const ctaHref = projectSlug ? `${APP}/projeto/${projectSlug}` : `${APP}/novo`
  const ctaLabel = projectSlug ? `Voltar ao projeto ${projectName}` : 'Começar agora (PDF, PPT, o que tiveres)'

  return `
<div style="background:#080808;padding:48px 24px;font-family:-apple-system,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center">
        <table role="presentation" width="440" border="0" cellpadding="0" cellspacing="0" style="max-width:440px;width:100%;text-align:left;">
          <tr>
            <td style="padding:0 0 28px;">
              <img src="https://showo.pt/icon.png" alt="Showo" width="32" height="32"
                style="display:block;border:0;" />
            </td>
          </tr>
          ${firstName ? `<tr>
            <td style="padding:0 0 16px;color:#888888;font-size:16px;line-height:1.4;">
              ${esc(firstName)},
            </td>
          </tr>` : ''}
          ${heroBlock}
          <tr>
            <td style="padding:0 0 10px;color:#888888;font-size:16px;line-height:1.5;">
              ${line2a}
            </td>
          </tr>
          <tr>
            <td style="padding:0 0 32px;color:#888888;font-size:16px;line-height:1.5;">
              ${line2b}
            </td>
          </tr>
          <tr>
            <td style="padding:0 0 40px;">
              <a href="${ctaHref}" style="display:inline-block;background:#2B7EF5;color:#fff;
                text-decoration:none;font-weight:600;font-size:14px;padding:12px 24px;border-radius:10px;">
                ${esc(ctaLabel)}
              </a>
            </td>
          </tr>
          <tr>
            <td style="font-size:11px;color:#555555;">
              Showo · <a href="${APP}" style="color:#555555;">showo.pt</a>${unsubscribeUrl ? ` · <a href="${esc(unsubscribeUrl)}" style="color:#555555;">cancelar estes emails</a>` : ''}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</div>`
}

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

    // Modo de teste: manda { test_user_id: "<uuid>" } no corpo para processar
    // só essa conta, ignorando os filtros de "não entra há 2 dias" e de
    // arrefecimento — útil para ver o email a sério antes de deixar isto
    // correr contra toda a gente.
    let testUserId: string | null = null
    let forceNoProject = false
    let forceNoViews = false
    try {
      const body = await req.json()
      if (typeof body?.test_user_id === 'string') testUserId = body.test_user_id
      // Só para testar as variantes "sem projeto" / "sem visita" com uma
      // conta que já tem projeto/visitas a sério — nunca têm efeito sem
      // test_user_id também presente.
      if (body?.force_no_project === true) forceNoProject = true
      if (body?.force_no_views === true) forceNoViews = true
    } catch { /* corpo vazio é normal na chamada do cron */ }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const now = new Date()
    const dormantSince = new Date(now.getTime() - DORMANT_DAYS * 86400000)
    const cooldownSince = new Date(now.getTime() - RESEND_COOLDOWN_DAYS * 86400000)
    const weekAgo = new Date(now.getTime() - 7 * 86400000)

    // auth.users não está exposto via PostgREST — vai-se buscar pela Admin
    // API, paginada (100 users hoje cabem numa página só, mas não assumir).
    const lastSignIn = new Map<string, string | null>()
    const emailById = new Map<string, string>()
    let page = 1
    for (;;) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 })
      if (error) throw error
      for (const u of data.users) {
        lastSignIn.set(u.id, u.last_sign_in_at)
        if (u.email) emailById.set(u.id, u.email)
      }
      if (data.users.length < 200) break
      page++
    }

    const PROFILE_COLS = 'id, full_name, role, weekly_checkin_email_sent_at, created_at, weekly_checkin_opted_out, weekly_checkin_streak'
    let profilesQuery = supabase
      .from('profiles')
      .select(PROFILE_COLS)
      .neq('role', 'professor')
    if (testUserId) profilesQuery = supabase.from('profiles').select(PROFILE_COLS).eq('id', testUserId)

    const { data: profiles, error: profErr } = await profilesQuery

    if (profErr) throw profErr

    const dormant = (profiles ?? []).filter(p => {
      if (testUserId) return p.id === testUserId
      if (p.weekly_checkin_opted_out) return false
      const last = lastSignIn.get(p.id)
      const isDormant = !last || new Date(last) < dormantSince
      const notCoolingDown = !p.weekly_checkin_email_sent_at || new Date(p.weekly_checkin_email_sent_at) < cooldownSince
      return isDormant && notCoolingDown && emailById.has(p.id)
    })

    let sent = 0
    const errors: string[] = []

    for (const p of dormant) {
      try {
        // Se entrou desde o último envio, o streak zera — está a começar
        // um novo período de ausência, não a continuar o anterior.
        const lastSignInIso = lastSignIn.get(p.id)
        const cameBackSinceLastSend = !!(p.weekly_checkin_email_sent_at && lastSignInIso &&
          new Date(lastSignInIso) > new Date(p.weekly_checkin_email_sent_at))
        const currentStreak = cameBackSinceLastSend ? 0 : (p.weekly_checkin_streak ?? 0)

        // Depois de N tentativas seguidas sem a pessoa voltar, para de
        // mandar — continuar seria só ruído para quem já não vai voltar.
        if (!testUserId && currentStreak >= MAX_CONSECUTIVE_SENDS) continue

        let views = 0
        if (!(testUserId && forceNoViews)) {
          const { count: viewsRaw } = await supabase
            .from('notifications')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', p.id)
            .in('type', VIEW_TYPES)
            .gte('created_at', weekAgo.toISOString())
          views = viewsRaw ?? 0
        }

        const { data: projects } = testUserId && forceNoProject
          ? { data: [] as { name: string; slug: string; created_at: string }[] }
          : await supabase
              .from('projects')
              .select('name, slug, created_at')
              .eq('user_id', p.id)
              .order('created_at', { ascending: true })
              .limit(1)

        const focus = projects?.[0]
        const email = emailById.get(p.id)!
        const firstName = p.full_name?.split(' ')[0]
        const daysSinceSignup = p.created_at
          ? Math.floor((now.getTime() - new Date(p.created_at).getTime()) / 86400000)
          : undefined

        const hasHook = views > 0
        const subjPick = <T,>(arr: T[]) => arr[currentStreak % arr.length]
        const subject = focus
          ? (hasHook
              ? `Ainda não voltaste ao projeto ${focus.name}. ${views} ${views === 1 ? 'pessoa já viu' : 'pessoas já viram'}.`
              : subjPick([
                  `Ainda não voltaste ao projeto ${focus.name}.`,
                  `${focus.name} continua igual à última vez.`,
                  `Falta pouco para voltares a ${focus.name}.`,
                  `${focus.name} está à espera que voltes.`,
                ]))
          : (hasHook
              ? `O teu perfil está vazio. ${views} ${views === 1 ? 'pessoa já passou' : 'pessoas já passaram'} por lá.`
              : (daysSinceSignup && daysSinceSignup > 0
                  ? subjPick([
                      `A tua conta existe há ${daysSinceSignup} ${daysSinceSignup === 1 ? 'dia' : 'dias'}. Continua vazia.`,
                      `Já ${daysSinceSignup} ${daysSinceSignup === 1 ? 'dia' : 'dias'} sem nenhum projeto.`,
                      `${daysSinceSignup} ${daysSinceSignup === 1 ? 'dia' : 'dias'} de conta, zero projetos.`,
                      `Continua tudo por fazer há ${daysSinceSignup} ${daysSinceSignup === 1 ? 'dia' : 'dias'}.`,
                    ])
                  : `A tua conta no Showo continua vazia.`))

        const unsubSig = await signUserId(p.id, cronSecret)
        const unsubscribeUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/checkin-unsubscribe?u=${p.id}&sig=${unsubSig}`

        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: FROM,
            to: email,
            subject,
            html: buildHtml(views, {
              ...(focus ? { projectName: focus.name, projectSlug: focus.slug } : {}),
              firstName,
              daysSinceSignup,
              unsubscribeUrl,
              variantIndex: currentStreak,
            }),
            // Marca como "importante" — não garante notificação nem entrega
            // na Primary, é só um sinal que alguns clientes de email mostram.
            headers: { Importance: 'high', 'X-Priority': '1' },
          }),
        })
        if (!res.ok) { errors.push(await res.text()); continue }

        const { id: resendId } = await res.json()
        if (resendId) {
          await supabase.from('email_sends').insert({
            user_id: p.id,
            email_type: 'weekly_checkin',
            resend_id: resendId,
            to_email: email,
          })
        }

        await supabase.from('profiles')
          .update({ weekly_checkin_email_sent_at: now.toISOString(), weekly_checkin_streak: currentStreak + 1 })
          .eq('id', p.id)
        sent++
      } catch (e) {
        console.error('[send-weekly-checkin] failed for', p.id, e)
        errors.push(String(e))
      }
    }

    return new Response(JSON.stringify({ ok: errors.length === 0, candidates: dormant.length, sent, errors }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error(e)
    return new Response(JSON.stringify({ error: 'Erro interno.' }), { status: 500, headers: corsHeaders })
  }
})

/* ── Já agendado (migração 147) ── cron.job "send-weekly-checkin", toda
   segunda 9h UTC. Para pausar: select cron.unschedule('send-weekly-checkin'). */
