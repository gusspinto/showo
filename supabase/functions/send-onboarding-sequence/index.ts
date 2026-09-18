import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/* ══════════════════════════════════════════════════════════════════════════
   SEQUÊNCIA DE ONBOARDING — dias 1 a 4/5 (o dia 0 já é o send-welcome-email
   existente, imediato no signup, não repetido aqui).

   Só processa profiles com onboarding_sequence_step NOT NULL — a coluna
   fica NULL por omissão para quem já tinha conta antes desta feature
   (ver migração 165), só handle_new_user matricula com step=0 a partir de
   agora. Corre uma vez por dia via pg_cron; cada passo espera o número de
   dias correspondente desde created_at antes de disparar.

   step 0 → dia 1 (>=1 dia de conta)
   step 1 → dia 2 (>=2 dias)
   step 2 → dia 3 (>=3 dias)
   step 3 → dia 4/5, só se has_project && plano == 'free' (>=4 dias) — se a
            condição não bater a essa altura, fecha a sequência sem enviar,
            não fica à espera indefinidamente de alguém que talvez nunca
            cumpra a condição.
   step 4 → sequência terminada, nunca mais reprocessado.

   Modo de teste: { test_user_id, force_step } no corpo, igual ao padrão já
   usado no send-weekly-checkin, para conseguir ver cada email a sério antes
   de isto correr contra gente real.
   ══════════════════════════════════════════════════════════════════════════ */

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
  return `<tr><td style="padding:0 0 40px;"><a href="${href}" style="display:inline-block;background:#2B7EF5;color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 24px;border-radius:10px;">${esc(label)}</a></td></tr>`
}

function buildDay1(firstName: string | undefined, unsubscribeUrl: string) {
  const subject = 'A diferença entre isto e abrir o ChatGPT outra vez'
  const html = wrapEmail(
    greeting(firstName) +
    headline('Já reparaste que o ChatGPT começa sempre do zero?') +
    paragraph('Sempre que abres o ChatGPT para falar do teu projeto, tens de explicar tudo outra vez.') +
    paragraph('No Showo a IA lê o diário do projeto antes de responder. Continuas a mesma conversa, com contexto acumulado desde o primeiro dia.', true) +
    cta(`${APP}/dashboard`, 'Analisar o meu projeto'),
    'Dia 1 de 5',
    unsubscribeUrl,
  )
  return { subject, html }
}

function buildDay2(firstName: string | undefined, unsubscribeUrl: string) {
  const subject = 'O teu GitHub também pode contar a história'
  const html = wrapEmail(
    greeting(firstName) +
    headline('O teu GitHub também pode contar a história') +
    paragraph('Liga o repositório e os commits entram sozinhos no diário do projeto, ao lado das tuas notas.') +
    paragraph('Quando o portfólio estiver pronto, publicas direto no LinkedIn, sem exportar nada à mão.', true) +
    cta(`${APP}/dashboard`, 'Ligar o GitHub ao meu projeto'),
    'Dia 2 de 5',
    unsubscribeUrl,
  )
  return { subject, html }
}

function buildDay3(firstName: string | undefined, unsubscribeUrl: string) {
  const subject = 'Não inventamos números só para parecer impressionante'
  const quote = (text: string, author: string) =>
    `<tr><td style="padding:0 0 20px;"><table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0"><tr><td style="border-left:2px solid #2B7EF5;padding-left:16px;color:#cccccc;font-size:15px;line-height:1.6;font-style:italic;">"${text}"<div style="margin-top:8px;color:#888888;font-size:13px;font-style:normal;">${author}</div></td></tr></table></td></tr>`
  const html = wrapEmail(
    greeting(firstName) +
    headline('Não vamos inventar números só para parecer impressionante') +
    paragraph('Preferimos mostrar o que quem já usa o Showo disse, com o nome deles:') +
    quote('Para alguém que fez PAP e queria usá-la para exposição, esta app é um gamechanger para estudantes na mesma situação.', 'Rafael Matos, Estudante de Engenharia Informática da Universidade de Aveiro') +
    quote('Na minha opinião, um dos pontos mais fortes da plataforma é a Defesa. A organização e preparação torna tudo mais interativo e envolvente.', 'Rita Sousa, Estudante na Escola Profissional Bento de Jesus Caraça') +
    cta(`${APP}/dashboard`, 'Ver o meu dashboard'),
    'Dia 3 de 5',
    unsubscribeUrl,
  )
  return { subject, html }
}

function buildDay45(firstName: string | undefined, unsubscribeUrl: string) {
  const subject = 'Já criaste o teu projeto. Sabias que o plano Grátis tem só 1 análise por mês?'
  const html = wrapEmail(
    greeting(firstName) +
    headline('Já deste o primeiro passo, o teu projeto está criado. Boa.') +
    paragraph('O plano Grátis inclui 1 análise de IA por mês, 3 projetos, e 10 mensagens de Coach IA. Chega para começar, mas sentes o limite depressa se usares a sério.') +
    paragraph('O Plus dá 10 análises por mês, 15 projetos, 100 mensagens de Coach, e recap semanal automático.', true) +
    cta(`${APP}/pricing`, 'Ver planos'),
    'Dia 4/5',
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
        if (!testUserId && (p.onboarding_sequence_step == null || p.onboarding_sequence_step >= 4)) continue

        const step = forceStep ?? p.onboarding_sequence_step ?? 0
        const daysSinceSignup = p.created_at ? Math.floor((now.getTime() - new Date(p.created_at).getTime()) / 86400000) : 0
        const daysNeeded = step + 1 // step 0 → dia 1 (>=1 dia), step 3 → dia 4/5 (>=4 dias)
        if (!testUserId && daysSinceSignup < daysNeeded) continue

        const email = emailById.get(p.id)
        if (!email) continue
        const firstName = p.full_name?.split(' ')[0]
        const unsubSig = await signUserId(p.id, cronSecret)
        const unsubscribeUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/onboarding-unsubscribe?u=${p.id}&sig=${unsubSig}`

        let built: { subject: string; html: string } | null = null
        let emailType = ''

        if (step === 0) { built = buildDay1(firstName, unsubscribeUrl); emailType = 'onboarding_day1' }
        else if (step === 1) { built = buildDay2(firstName, unsubscribeUrl); emailType = 'onboarding_day2' }
        else if (step === 2) { built = buildDay3(firstName, unsubscribeUrl); emailType = 'onboarding_day3' }
        else if (step === 3) {
          let organizationPlan: string | undefined
          if (p.organization_id) {
            const { data: org } = await supabase
              .from('organizations')
              .select('plan')
              .eq('id', p.organization_id)
              .maybeSingle()
            organizationPlan = org?.plan
          }
          const planId = resolvePlanId(p, organizationPlan)
          const { count: projectCount } = await supabase
            .from('projects')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', p.id)
            .eq('entry_kind', 'full')
          const hasProject = (projectCount ?? 0) > 0
          if (hasProject && planId === 'free') {
            built = buildDay45(firstName, unsubscribeUrl)
            emailType = 'onboarding_day4_5'
          }
          // condição não bate: fecha a sequência sem enviar, não repete.
        }

        if (built) {
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
        } else {
          closed++
        }

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
