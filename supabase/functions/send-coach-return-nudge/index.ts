import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/* ══════════════════════════════════════════════════════════════════════════
   LEMBRETE DE REGRESSO AO COACH IA, decidido a partir da análise de uso de
   2026-10-23 (docs/analise-uso-features-ia-2026-10-23.md): 95% dos users do
   Coach por projeto e 100% dos users do Coach geral abrem uma única sessão
   na vida e nunca voltam. Não é problema de qualidade da IA (as respostas
   são boas), é falta de gatilho a trazer a pessoa de volta.

   Este cron corre 1x por dia, encontra quem teve EXATAMENTE 1 sessão
   (projeto OU geral, nunca as duas ao mesmo tempo) há 3-21 dias e nunca
   recebeu este lembrete, e manda um email que cita a própria pergunta que
   a pessoa fez, para ser concreto em vez de genérico ("da última vez
   falámos sobre X" bate muito mais forte que "volta a usar o Coach").

   Envia uma única vez por sempre (coach_nudge_sent_at), não é recorrente
   como o ciclo contínuo, isto é um empurrão pontual, não uma campanha.

   Modo de teste: { test_user_id } no corpo, mesmo padrão das outras
   sequências de email.
   ══════════════════════════════════════════════════════════════════════════ */

const MIN_DAYS_IDLE = 3
const MAX_DAYS_IDLE = 21

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
function quoteBlock(text: string) {
  return `<tr><td style="padding:0 0 24px;"><table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%"><tr><td style="border-left:3px solid #2B7EF5;padding:4px 0 4px 14px;color:#cccccc;font-size:15px;line-height:1.5;font-style:italic;">"${esc(text)}"</td></tr></table></td></tr>`
}
function cta(href: string, label: string) {
  return `<tr><td style="padding:0 0 24px;"><a href="${href}" style="display:inline-block;background:#2B7EF5;color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 24px;border-radius:10px;">${esc(label)}</a></td></tr>`
}

function truncate(s: string, max: number) {
  const clean = s.trim().replace(/\s+/g, ' ')
  return clean.length > max ? clean.slice(0, max - 1).trimEnd() + '…' : clean
}

type Row = { user_id: string; session_id: string; created_at: string; role: string; content: string; project_id?: string | null }

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
    const minCutoff = new Date(now.getTime() - MIN_DAYS_IDLE * 86400000)
    const maxCutoff = new Date(now.getTime() - MAX_DAYS_IDLE * 86400000)

    // Puxa tudo (volume pequeno, ~1000 linhas ao todo) e agrupa em memória,
    // mais simples e robusto do que replicar a agregação em SQL via filtros
    // do cliente JS do Supabase.
    const [{ data: projectRows }, { data: globalRows }] = await Promise.all([
      supabase.from('coach_messages').select('user_id, session_id, created_at, role, content, project_id').order('created_at'),
      supabase.from('global_coach_messages').select('user_id, session_id, created_at, role, content').order('created_at'),
    ])

    function pickCandidates(rows: Row[] | null) {
      const byUser = new Map<string, Row[]>()
      for (const r of rows ?? []) {
        if (!byUser.has(r.user_id)) byUser.set(r.user_id, [])
        byUser.get(r.user_id)!.push(r)
      }
      const out: { userId: string; firstUserMsg: Row; lastAt: Date; projectId?: string | null }[] = []
      for (const [userId, msgs] of byUser) {
        const sessions = new Set(msgs.map(m => m.session_id))
        if (sessions.size !== 1) continue // só users com exatamente 1 sessão na vida
        const lastAt = new Date(Math.max(...msgs.map(m => new Date(m.created_at).getTime())))
        if (!(lastAt <= minCutoff && lastAt >= maxCutoff)) continue
        const firstUserMsg = msgs.find(m => m.role === 'user')
        if (!firstUserMsg) continue
        out.push({ userId, firstUserMsg, lastAt, projectId: firstUserMsg.project_id ?? null })
      }
      return out
    }

    const projectCandidates = pickCandidates(projectRows as Row[])
    const globalOnlyCandidates = pickCandidates(globalRows as Row[])
      .filter(c => !projectCandidates.some(pc => pc.userId === c.userId)) // prioriza o do projeto se tiver as duas

    const allCandidates = testUserId
      ? [...projectCandidates, ...globalOnlyCandidates].filter(c => c.userId === testUserId)
      : [...projectCandidates, ...globalOnlyCandidates]

    if (!allCandidates.length) {
      return new Response(JSON.stringify({ ok: true, candidates: 0, sent: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

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

    let sent = 0
    const errors: string[] = []

    for (const c of allCandidates) {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, coach_nudge_sent_at, coach_nudge_opted_out, onboarding_sequence_step, onboarding_opted_out')
          .eq('id', c.userId)
          .maybeSingle()
        if (!testUserId) {
          if (!profile || profile.coach_nudge_sent_at || profile.coach_nudge_opted_out) continue
          // Quem está a meio do onboarding já recebe 1 email por dia dessa
          // sequência. Confirmado contra a BD em 2026-10-31 que isto
          // estava a empilhar com este nudge no mesmo dia ("parece spam").
          if (profile.onboarding_sequence_step != null && profile.onboarding_sequence_step < 14 && !profile.onboarding_opted_out) continue
        }

        const email = emailById.get(c.userId)
        if (!email) continue
        const firstName = profile?.full_name?.split(' ')[0]

        let ctaHref = `${APP}/dashboard`
        let ctaLabel = 'Voltar ao Showo'
        if (c.projectId) {
          const { data: project } = await supabase.from('projects').select('slug').eq('id', c.projectId).maybeSingle()
          if (project?.slug) { ctaHref = `${APP}/projeto/${project.slug}`; ctaLabel = 'Continuar o projeto' }
        }

        const unsubSig = await signUserId(c.userId, cronSecret)
        const unsubscribeUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/coach-nudge-unsubscribe?u=${c.userId}&sig=${unsubSig}`
        const quoted = truncate(c.firstUserMsg.content, 140)

        const html = wrapEmail(
          greeting(firstName) +
          headline('Ficámos a meio de uma conversa') +
          paragraph('Da última vez que falámos com o Coach IA, foi isto que perguntaste:') +
          quoteBlock(quoted) +
          paragraph('Continua exatamente onde ficaste, o Coach lembra-se do contexto do teu projeto.', true) +
          cta(ctaHref, ctaLabel),
          unsubscribeUrl,
        )

        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: FROM,
            to: email,
            subject: 'Ficámos a meio de uma conversa',
            html,
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
            user_id: c.userId,
            email_type: 'coach_return_nudge',
            resend_id: resendId,
            to_email: email,
          })
        }
        sent++

        if (!testUserId) {
          await supabase.from('profiles').update({ coach_nudge_sent_at: now.toISOString() }).eq('id', c.userId)
        }
      } catch (e) {
        console.error('[send-coach-return-nudge] failed for', c.userId, e)
        errors.push(String(e))
      }
    }

    return new Response(JSON.stringify({ ok: errors.length === 0, candidates: allCandidates.length, sent, errors }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error(e)
    return new Response(JSON.stringify({ error: 'Erro interno.' }), { status: 500, headers: corsHeaders })
  }
})
