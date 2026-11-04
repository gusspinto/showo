import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/* ══════════════════════════════════════════════════════════════════════════
   LEMBRETE DE REGRESSO A QUEM BATEU NUM LIMITE E NÃO VOLTOU, item 1 da
   checklist de growth (docs/checklist-growth-2026-11-04.md): quem bate num
   limite de IA é quem mais perto está de pagar, mas se nunca mais voltar
   perde-se esse momento. Este cron encontra quem esgotou alguma feature de
   IA este mês (ai_usage.used >= limit do plano) e cuja última atividade
   (auth.last_sign_in_at, o mesmo sinal que o Admin já usa) foi há 7-21
   dias, sem nunca ter recebido este lembrete.

   A janela de 7-21 dias (14 dias de margem) cobre com folga o intervalo
   entre duas corridas semanais, mesmo padrão do send-coach-return-nudge.

   Envia uma única vez por sempre (limit_nudge_sent_at), é um empurrão
   pontual, não uma campanha recorrente.

   Modo de teste: { test_user_id } no corpo, mesmo padrão das outras
   sequências de email.
   ══════════════════════════════════════════════════════════════════════════ */

const MIN_DAYS_IDLE = 7
const MAX_DAYS_IDLE = 21

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://showo.pt',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const FROM = 'Showo <hello@showo.pt>'
const APP = 'https://showo.pt'

const FEATURE_LABELS: Record<string, string> = {
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

// Mesmos limites do plano Grátis/Plus/Pro (src/lib/plans.js), só os que
// interessam para decidir se alguém "bateu num limite" este mês.
const LIMITS: Record<string, Record<string, number>> = {
  free: { createProject: 3, interviewProject: 3, coach: 10, defense: 1, diaryReport: 1, narrative: 1, analyzeProject: 1, exportPptx: 3 },
  plus: { createProject: 15, interviewProject: 15, coach: 30, defense: 10, defenseTraining: 5, diaryReport: 5, narrative: 10, analyzeProject: 10, coverLetter: 5, exportPptx: 15, generateImage: 5 },
  pro: { createProject: 30, interviewProject: 30, coach: 50, defense: 25, defenseTraining: 25, diaryReport: 10, narrative: 25, analyzeProject: 25, coverLetter: 25, generateImage: 15 },
}

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
        <tr><td style="font-size:11px;color:#555555;">Showo &middot; <a href="${APP}" style="color:#555555;">showo.pt</a> &middot; <a href="${esc(unsubscribeUrl)}" style="color:#555555;">cancelar este lembrete</a></td></tr>
      </table>
    </td>
  </tr>
</table>`
}

function row(html: string) { return `<tr><td style="padding:0 0 16px;">${html}</td></tr>` }
function greeting(firstName?: string) {
  return firstName ? row(`<span style="color:#888888;font-size:16px;line-height:1.4;">${esc(firstName)},</span>`) : ''
}
function headline(text: string) {
  return `<tr><td style="padding:0 0 20px;color:#f0f0f0;font-size:26px;line-height:1.3;font-weight:800;letter-spacing:-0.01em;">${text}</td></tr>`
}
function paragraph(text: string, last = false) {
  return `<tr><td style="padding:0 0 ${last ? '32' : '10'}px;color:#888888;font-size:16px;line-height:1.5;">${text}</td></tr>`
}
function cta(href: string, label: string) {
  return `<tr><td style="padding:0 0 24px;"><a href="${href}" style="display:inline-block;background:#2B7EF5;color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 24px;border-radius:10px;">${esc(label)}</a></td></tr>`
}

function buildEmail(firstName: string | undefined, featureLabel: string, unsubscribeUrl: string) {
  const subject = `Deixaste o ${featureLabel} a meio`
  const html = wrapEmail(
    greeting(firstName) +
    headline(`Deixaste o ${esc(featureLabel)} a meio`) +
    paragraph(`Esgotaste o limite deste mês em "${esc(featureLabel)}" e ainda não voltaste. O limite renova sozinho no início do próximo mês, mas se quiseres continuar agora, o Plus ou o Pro dão muito mais por mês.`) +
    paragraph('Não é só mais limite, é não perderes o fio ao que estavas a fazer.', true) +
    cta(`${APP}/pricing`, 'Ver planos'),
    unsubscribeUrl,
  )
  return { subject, html }
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

    let testUserId: string | null = null
    try {
      const body = await req.json()
      if (typeof body?.test_user_id === 'string') testUserId = body.test_user_id
    } catch { /* corpo vazio é normal na chamada do cron */ }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const now = new Date()
    const month = now.toISOString().slice(0, 7)

    // Quem esgotou alguma feature este mês, mesmo critério do card "Bateram
    // num limite" do Admin (ai_usage.used >= limite do plano).
    const { data: usageRows, error: usageErr } = await supabase
      .from('ai_usage')
      .select('user_id, feature, used')
      .eq('month', month)
    if (usageErr) throw usageErr

    const { data: profilesForPlan } = await supabase.from('profiles').select('id, plan')
    const planById = new Map((profilesForPlan ?? []).map(p => [p.id, p.plan === 'build' ? 'plus' : p.plan === 'launch' ? 'pro' : (p.plan || 'free')]))

    const hitLimitFeature = new Map<string, string>() // user_id -> primeira feature esgotada encontrada
    for (const row of usageRows ?? []) {
      if (hitLimitFeature.has(row.user_id)) continue
      const plan = planById.get(row.user_id) || 'free'
      const limit = LIMITS[plan]?.[row.feature]
      if (limit != null && limit > 0 && row.used >= limit) {
        hitLimitFeature.set(row.user_id, row.feature)
      }
    }

    if (!hitLimitFeature.size) {
      return new Response(JSON.stringify({ ok: true, candidates: 0, sent: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const minCutoff = new Date(now.getTime() - MIN_DAYS_IDLE * 86400000)
    const maxCutoff = new Date(now.getTime() - MAX_DAYS_IDLE * 86400000)

    const userIds = testUserId ? [testUserId] : [...hitLimitFeature.keys()]
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, limit_nudge_sent_at, limit_nudge_opted_out, onboarding_sequence_step, onboarding_opted_out')
      .in('id', userIds)
    const profileById = new Map((profiles ?? []).map(p => [p.id, p]))

    const emailById = new Map<string, string>()
    const lastSignInById = new Map<string, string | null>()
    {
      let page = 1
      for (;;) {
        const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 })
        if (error) throw error
        for (const u of data.users) {
          if (userIds.includes(u.id)) {
            if (u.email) emailById.set(u.id, u.email)
            lastSignInById.set(u.id, u.last_sign_in_at ?? null)
          }
        }
        if (data.users.length < 200) break
        page++
      }
    }

    let sent = 0
    let skipped = 0
    const errors: string[] = []

    for (const userId of userIds) {
      try {
        const feature = hitLimitFeature.get(userId)
        if (!feature) { skipped++; continue }

        const profile = profileById.get(userId)
        if (!testUserId) {
          if (!profile || profile.limit_nudge_sent_at || profile.limit_nudge_opted_out) { skipped++; continue }
          if (profile.onboarding_sequence_step != null && profile.onboarding_sequence_step < 14 && !profile.onboarding_opted_out) { skipped++; continue }

          const lastSignIn = lastSignInById.get(userId)
          if (!lastSignIn) { skipped++; continue }
          const lastAt = new Date(lastSignIn)
          if (!(lastAt <= minCutoff && lastAt >= maxCutoff)) { skipped++; continue }
        }

        const email = emailById.get(userId)
        if (!email) { skipped++; continue }

        const firstName = profile?.full_name?.split(' ')[0]
        const featureLabel = FEATURE_LABELS[feature] ?? feature
        const unsubSig = await signUserId(userId, cronSecret)
        const unsubscribeUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/limit-return-unsubscribe?u=${userId}&sig=${unsubSig}`
        const built = buildEmail(firstName, featureLabel, unsubscribeUrl)

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
            user_id: userId,
            email_type: 'limit_return_nudge',
            resend_id: resendId,
            to_email: email,
          })
        }
        sent++

        if (!testUserId) {
          await supabase.from('profiles').update({ limit_nudge_sent_at: now.toISOString() }).eq('id', userId)
        }
      } catch (e) {
        console.error('[send-limit-return-nudge] failed for', userId, e)
        errors.push(String(e))
      }
    }

    return new Response(JSON.stringify({ ok: errors.length === 0, candidates: userIds.length, sent, skipped, errors }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error(e)
    return new Response(JSON.stringify({ error: 'Erro interno.' }), { status: 500, headers: corsHeaders })
  }
})
