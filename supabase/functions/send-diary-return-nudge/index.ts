import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/* ══════════════════════════════════════════════════════════════════════════
   LEMBRETE DE REGRESSO AO DIÁRIO, decidido a partir da análise de 2026-10-31:
   de 712 contas com projeto criado, só 113 (16%) alguma vez escreveram no
   diário, e dessas, 105 (92%) escreveram a única entrada no MESMO dia em
   que criaram o projeto, nunca mais voltando. Não é um problema de manter
   uma sequência (send-streak-nudge nunca tem efeito, porque exige já ter
   escrito hoje para disparar), é a ausência total de qualquer convite para
   voltar depois do dia 0.

   Este cron corre 1x por semana, encontra quem tem pelo menos 1 entrada de
   diário manual (nunca a do GitHub sync, essa é passiva, não é hábito da
   pessoa) e cuja ÚLTIMA entrada foi há 2-9 dias, sem nenhuma mais recente.
   A janela de 7 dias de largura (2 a 9) cobre com folga o intervalo entre
   duas corridas semanais, sem deixar ninguém a meio por sorte do calendário.

   Envia uma única vez por sempre (diary_return_nudge_sent_at), é um
   empurrão pontual, não uma campanha recorrente, mesmo padrão do
   send-coach-return-nudge.

   Modo de teste: { test_user_id } no corpo, mesmo padrão das outras
   sequências de email.
   ══════════════════════════════════════════════════════════════════════════ */

const MIN_DAYS_SINCE_LAST_ENTRY = 2
const MAX_DAYS_SINCE_LAST_ENTRY = 9

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

function buildEmail(firstName: string | undefined, projectName: string, projectSlug: string, daysSince: number, unsubscribeUrl: string) {
  const subject = `O teu diário em "${projectName}" está parado há ${daysSince} dias`
  const html = wrapEmail(
    greeting(firstName) +
    headline(`O teu diário em "${esc(projectName)}" está parado há ${daysSince} dias`) +
    paragraph('Escreveste uma vez e ficou por aí. Não faz mal, mas é esse registo que alimenta o recap semanal, o score do projeto e as perguntas que preparamos para a tua defesa, sem ele, essas features não têm nada para trabalhar.') +
    paragraph('Não precisa de ser longo. Duas linhas sobre o que decidiste ou onde ficaste preso já contam.', true) +
    cta(`${APP}/projeto/${projectSlug}`, 'Escrever no diário agora'),
    unsubscribeUrl,
  )
  return { subject, html }
}

type EntryRow = { user_id: string; project_id: string; created_at: string }

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
    const minCutoff = new Date(now.getTime() - MIN_DAYS_SINCE_LAST_ENTRY * 86400000)
    const maxCutoff = new Date(now.getTime() - MAX_DAYS_SINCE_LAST_ENTRY * 86400000)

    // Só entradas manuais (nunca a do GitHub sync, que é passiva, não é a
    // pessoa a voltar ao diário por vontade própria). Volume pequeno hoje
    // (confirmado contra a BD: só 113 contas têm alguma entrada manual),
    // puxa tudo e agrupa em memória, mesmo padrão do send-coach-return-nudge.
    const { data: entryRows, error: entriesErr } = await supabase
      .from('project_journal_entries')
      .select('user_id, project_id, created_at, external_id')
      .order('created_at')
    if (entriesErr) throw entriesErr

    const manualRows = (entryRows ?? []).filter(
      (e: EntryRow & { external_id?: string | null }) => !e.external_id || !e.external_id.startsWith('gh:')
    )

    const lastByUser = new Map<string, EntryRow>()
    for (const e of manualRows as EntryRow[]) {
      const prev = lastByUser.get(e.user_id)
      if (!prev || new Date(e.created_at) > new Date(prev.created_at)) lastByUser.set(e.user_id, e)
    }

    const candidates = [...lastByUser.values()].filter(e => {
      if (testUserId) return e.user_id === testUserId
      const lastAt = new Date(e.created_at)
      return lastAt <= minCutoff && lastAt >= maxCutoff
    })

    if (!candidates.length) {
      return new Response(JSON.stringify({ ok: true, candidates: 0, sent: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const userIds = candidates.map(c => c.user_id)
    const { data: profiles, error: profErr } = await supabase
      .from('profiles')
      .select('id, full_name, diary_return_nudge_sent_at, diary_return_nudge_opted_out, onboarding_sequence_step, onboarding_opted_out')
      .in('id', userIds)
    if (profErr) throw profErr
    const profileById = new Map((profiles ?? []).map(p => [p.id, p]))

    const emailById = new Map<string, string>()
    {
      let page = 1
      for (;;) {
        const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 })
        if (error) throw error
        for (const u of data.users) if (userIds.includes(u.id) && u.email) emailById.set(u.id, u.email)
        if (data.users.length < 200) break
        page++
      }
    }

    let sent = 0
    let skipped = 0
    const errors: string[] = []

    for (const c of candidates) {
      try {
        const profile = profileById.get(c.user_id)
        if (!testUserId) {
          if (!profile || profile.diary_return_nudge_sent_at || profile.diary_return_nudge_opted_out) { skipped++; continue }
          // Quem está a meio do onboarding já recebe 1 email por dia dessa
          // sequência, mesma regra aplicada às outras campanhas em 2026-10-31.
          if (profile.onboarding_sequence_step != null && profile.onboarding_sequence_step < 14 && !profile.onboarding_opted_out) { skipped++; continue }
        }

        const email = emailById.get(c.user_id)
        if (!email) { skipped++; continue }

        const { data: project } = await supabase
          .from('projects')
          .select('name, slug')
          .eq('id', c.project_id)
          .maybeSingle()
        if (!project?.slug) { skipped++; continue }

        const firstName = profile?.full_name?.split(' ')[0]
        const daysSince = Math.floor((now.getTime() - new Date(c.created_at).getTime()) / 86400000)
        const unsubSig = await signUserId(c.user_id, cronSecret)
        const unsubscribeUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/diary-return-unsubscribe?u=${c.user_id}&sig=${unsubSig}`
        const built = buildEmail(firstName, project.name || 'o teu projeto', project.slug, daysSince, unsubscribeUrl)

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
            user_id: c.user_id,
            email_type: 'diary_return_nudge',
            resend_id: resendId,
            to_email: email,
          })
        }
        sent++

        if (!testUserId) {
          await supabase.from('profiles').update({ diary_return_nudge_sent_at: now.toISOString() }).eq('id', c.user_id)
        }
      } catch (e) {
        console.error('[send-diary-return-nudge] failed for', c.user_id, e)
        errors.push(String(e))
      }
    }

    return new Response(JSON.stringify({ ok: errors.length === 0, candidates: candidates.length, sent, skipped, errors }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error(e)
    return new Response(JSON.stringify({ error: 'Erro interno.' }), { status: 500, headers: corsHeaders })
  }
})
