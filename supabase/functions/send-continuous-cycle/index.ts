import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/* ══════════════════════════════════════════════════════════════════════════
   CICLO CONTÍNUO SEMANAL, decidido na reunião com o Maia (Savvy Growth,
   2026-10-19): quem termina os 14 dias de onboarding (send-onboarding-sequence)
   sem comprar não pode cair no silêncio. Em vez de um ciclo com fim, este
   corre para sempre, 1 email por semana, 4 ângulos diferentes em loop
   (análises IA/limites, Coach IA, vagas, preparação de defesa), até a
   pessoa comprar (sai da lista sozinha, filtro de plan='free' na query) ou
   se desinscrever.

   Não está dentro de send-onboarding-sequence porque os dois relógios são
   diferentes: onboarding conta DIAS desde o registo e tem fim (14), este
   conta SEMANAS desde que saiu do onboarding e não tem fim.

   Audiência: onboarding_sequence_step >= 14 (terminou o ciclo anterior),
   plan='free' (ainda não comprou), continuous_cycle_opted_out=false, e
   cooldown de 6 dias desde o último envio (continuous_cycle_sent_at).

   Corre 1x por semana via pg_cron, à quinta às 10h, longe da segunda
   (recap semanal) e do cron diário de onboarding, para não parecer spam.

   Modo de teste: { test_user_id, force_step } no corpo, mesmo padrão das
   outras sequências.
   ══════════════════════════════════════════════════════════════════════════ */

const CYCLE_LENGTH = 4
const COOLDOWN_DAYS = 6

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

function wrapEmail(bodyRows: string, unsubscribeUrl: string) {
  return `
<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="#080808" style="background:#080808;">
  <tr>
    <td align="center" bgcolor="#080808" style="background:#080808;padding:48px 24px;font-family:-apple-system,Helvetica,Arial,sans-serif;">
      <table role="presentation" width="440" border="0" cellpadding="0" cellspacing="0" style="max-width:440px;width:100%;text-align:left;">
        <tr><td style="padding:0 0 28px;"><img src="https://showo.pt/icon.png" alt="Showo" width="32" height="32" style="display:block;border:0;" /></td></tr>
        ${bodyRows}
        <tr><td style="font-size:11px;color:#555555;">Showo &middot; <a href="${APP}" style="color:#555555;">showo.pt</a> &middot; <a href="${esc(unsubscribeUrl)}" style="color:#555555;">cancelar estes emails</a></td></tr>
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

// Mesmo princípio do urgencyBand do onboarding: quando a pessoa tem um
// projeto com defense_date real no futuro, usa-se esse prazo em vez da
// oferta genérica, é urgência verdadeira, não fabricada por nós.
function offerBand(code: string, daysToDefense: number | null) {
  if (daysToDefense !== null) {
    const prazo = daysToDefense === 0
      ? 'é hoje'
      : daysToDefense === 1
        ? 'é amanhã'
        : `é daqui a ${daysToDefense} dias`
    const color = daysToDefense <= 14 ? '#F5493B' : '#2B7EF5'
    return `<tr><td style="padding:0 0 20px;"><table role="presentation" border="0" cellpadding="0" cellspacing="0"><tr><td style="background:${color}1a;border:1px solid ${color}40;border-radius:8px;padding:8px 12px;color:${color};font-size:12.5px;font-weight:700;">A tua defesa ${prazo}. 50% com o código ${esc(code)} enquanto preparas.</td></tr></table></td></tr>`
  }
  return `<tr><td style="padding:0 0 20px;"><table role="presentation" border="0" cellpadding="0" cellspacing="0"><tr><td style="background:#2B7EF51a;border:1px solid #2B7EF540;border-radius:8px;padding:8px 12px;color:#2B7EF5;font-size:12.5px;font-weight:700;">Oferta de lançamento até dezembro: 50% com o código ${esc(code)}.</td></tr></table></td></tr>`
}

type Built = { subject: string; html: string }

// 4 ângulos em loop, mesmo conteúdo de fundo dos dias 4/6/8/10 do
// onboarding, mas reescrito para não ser cópia literal (repetir a frase
// exata de outro email já foi um erro corrigido nesta sequência).
function buildWeek0({ firstName, unsubscribeUrl, code, daysToDefense }: { firstName?: string; unsubscribeUrl: string; code: string; daysToDefense: number | null }): Built {
  return {
    subject: 'Ainda no plano Grátis? Eis o que estás a perder',
    html: wrapEmail(
      greeting(firstName) +
      offerBand(code, daysToDefense) +
      headline('1 análise de IA por mês chega para experimentar, não para usar a sério') +
      paragraph('O plano Grátis existe para testares o Showo sem compromisso. Mas se já estás a usar o projeto a sério, 1 análise por mês esgota-se rápido.') +
      paragraph(`No Plus são 10 análises por mês, 15 projetos, e 100 mensagens de Coach IA, a 4,49€/mês com o código ${esc(code)}, em vez de 8,99€.`, true) +
      cta(`${APP}/pricing`, 'Ver o plano Plus'),
      unsubscribeUrl,
    ),
  }
}

function buildWeek1({ firstName, unsubscribeUrl, code, daysToDefense }: { firstName?: string; unsubscribeUrl: string; code: string; daysToDefense: number | null }): Built {
  return {
    subject: '100 mensagens por mês. 10 vezes mais espaço para pensar em voz alta',
    html: wrapEmail(
      greeting(firstName) +
      offerBand(code, daysToDefense) +
      headline('10 mensagens de Coach IA por mês não dão muito espaço') +
      paragraph('Cada dúvida sobre o projeto, cada revisão de texto, conta para esse limite. No Plus são 100 por mês, dez vezes mais apoio ao longo do tempo, não só nos primeiros dias.') +
      paragraph(`Com o código ${esc(code)}, 4,49€/mês em vez de 8,99€, durante os primeiros 6 meses.`, true) +
      cta(`${APP}/pricing`, 'Passar a 100 mensagens por mês'),
      unsubscribeUrl,
    ),
  }
}

function buildWeek2({ firstName, unsubscribeUrl, code, daysToDefense }: { firstName?: string; unsubscribeUrl: string; code: string; daysToDefense: number | null }): Built {
  return {
    subject: 'Enquanto procuras emprego, as vagas estão aqui dentro',
    html: wrapEmail(
      greeting(firstName) +
      offerBand(code, daysToDefense) +
      headline('Há vagas reais de estágio e primeiro emprego aqui dentro') +
      paragraph('Candidatas-te direto, com o teu perfil Showo como prova do que já fizeste. É uma das razões pelas quais quem está à procura de trabalho fica no plano pago, não só pelo portefólio.') +
      paragraph(`${esc(code)} dá 50% no Plus durante os primeiros 6 meses.`, true) +
      cta(`${APP}/vagas`, 'Ver as vagas abertas'),
      unsubscribeUrl,
    ),
  }
}

function buildWeek3({ firstName, unsubscribeUrl, code, daysToDefense }: { firstName?: string; unsubscribeUrl: string; code: string; daysToDefense: number | null }): Built {
  return {
    subject: 'Quem prepara a defesa cedo, nota a diferença',
    html: wrapEmail(
      greeting(firstName) +
      offerBand(code, daysToDefense) +
      headline('Quem prepara a defesa com meses de antecedência nota a diferença') +
      paragraph('O Showo gera perguntas prováveis do júri a partir do teu diário real, com respostas baseadas no que decidiste e porquê, desde o início do projeto. Não é um resumo feito às pressas na última semana.') +
      paragraph(`Esta e as outras features do Plus ficam a 4,49€/mês com o código ${esc(code)}, durante os primeiros 6 meses.`, true) +
      cta(`${APP}/pricing`, 'Ver a preparação de defesa'),
      unsubscribeUrl,
    ),
  }
}

const WEEK_BUILDERS: Array<(ctx: { firstName?: string; unsubscribeUrl: string; code: string; daysToDefense: number | null }) => Built> = [
  buildWeek0, buildWeek1, buildWeek2, buildWeek3,
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

    const PROFILE_COLS = 'id, full_name, plan, onboarding_sequence_step, continuous_cycle_step, continuous_cycle_sent_at, continuous_cycle_opted_out'
    let profilesQuery = supabase.from('profiles').select(PROFILE_COLS)
      .gte('onboarding_sequence_step', 14)
      .eq('plan', 'free')
      .eq('continuous_cycle_opted_out', false)
    if (testUserId) profilesQuery = supabase.from('profiles').select(PROFILE_COLS).eq('id', testUserId)

    const { data: profiles, error: profErr } = await profilesQuery
    if (profErr) throw profErr

    const now = new Date()
    const cooldownSince = new Date(now.getTime() - COOLDOWN_DAYS * 86400000)
    let sent = 0
    const errors: string[] = []

    for (const p of (profiles ?? [])) {
      try {
        if (!testUserId) {
          const notCoolingDown = !p.continuous_cycle_sent_at || new Date(p.continuous_cycle_sent_at) < cooldownSince
          if (!notCoolingDown) continue
        }

        const stepCounter = forceStep ?? p.continuous_cycle_step ?? 0
        const weekIdx = ((stepCounter % CYCLE_LENGTH) + CYCLE_LENGTH) % CYCLE_LENGTH

        const email = emailById.get(p.id)
        if (!email) continue
        const firstName = p.full_name?.split(' ')[0]
        const unsubSig = await signUserId(p.id, cronSecret)
        const unsubscribeUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/continuous-cycle-unsubscribe?u=${p.id}&sig=${unsubSig}`

        // Prazo real de defesa (ver offerBand), mesma lógica do onboarding:
        // fica com a defense_date futura mais próxima entre os projetos.
        const { data: projectRows } = await supabase
          .from('projects')
          .select('defense_date')
          .eq('user_id', p.id)
          .eq('entry_kind', 'full')
        const futureDefenses = (projectRows ?? [])
          .map(r => r.defense_date ? new Date(r.defense_date).getTime() : null)
          .filter((t): t is number => t !== null && t > Date.now())
        const daysToDefense = futureDefenses.length
          ? Math.max(0, Math.ceil((Math.min(...futureDefenses) - Date.now()) / 86400000))
          : null

        const builder = WEEK_BUILDERS[weekIdx]
        const built = builder({ firstName, unsubscribeUrl, code: discountCode, daysToDefense })
        const emailType = `continuous_cycle_week${weekIdx + 1}`

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
            .update({ continuous_cycle_step: stepCounter + 1, continuous_cycle_sent_at: now.toISOString() })
            .eq('id', p.id)
        }
      } catch (e) {
        console.error('[send-continuous-cycle] failed for', p.id, e)
        errors.push(String(e))
      }
    }

    return new Response(JSON.stringify({ ok: errors.length === 0, candidates: (profiles ?? []).length, sent, errors }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error(e)
    return new Response(JSON.stringify({ error: 'Erro interno.' }), { status: 500, headers: corsHeaders })
  }
})
