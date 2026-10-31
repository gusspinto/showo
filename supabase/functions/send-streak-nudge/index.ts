import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/* ══════════════════════════════════════════════════════════════════════════
   PAUSADO em 2026-10-31 (migração 220, cron.unschedule), a pedido do
   Gustavo: nunca disparou em 30 dias, e o maior streak de diário de
   qualquer utilizador real (fora de contas de teste) em toda a história da
   plataforma foi 2 dias, o limiar mínimo aqui é 5. Código e função ficam,
   só o cron foi desligado. Candidato a reativar se o send-diary-return-nudge
   conseguir trazer gente de volta ao diário com regularidade suficiente.

   NUDGE DE STREAK DIÁRIA — todos os dias, 19:00 UTC
   ──────────────────────────────────────────────────────────────────────────
   O recap semanal (send-weekly-recap) já existia; isto é o par diário, pedido
   depois de se perceber que o sync do GitHub cria entradas de diário sozinho
   (um commit = uma entrada), sem o aluno ter de lá ir manualmente. Quando
   isso dá dias seguidos de atividade, vale a pena avisar — é prova de
   consistência que vale a pena mostrar lá fora.

   Só processa quem teve pelo menos uma entrada de diário HOJE (UTC) — sem
   isso não há streak nova para anunciar, e poupa varrer todos os users.
   Streak = dias consecutivos (UTC) com ≥1 entrada em qualquer projeto,
   terminando hoje.

   Envia só ao cruzar um marco (5, 10, 15, 20, 25, 30...) e só uma vez por
   marco por utilizador — dedupe via email_sends (email_type = streak_<N>),
   mesmo padrão de send-featured-notification.
   ══════════════════════════════════════════════════════════════════════════ */

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://showo.pt',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const FROM = 'Showo <hello@showo.pt>'
const APP = 'https://showo.pt'
const MILESTONES = [5, 10, 15, 20, 25, 30, 40, 50, 75, 100]
const LOOKBACK_DAYS = 120 // suficiente para qualquer streak realista, sem varrer tudo

function esc(v: unknown) {
  return String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
}

function utcDateStr(d: Date) {
  return d.toISOString().slice(0, 10)
}

/** Dias consecutivos (UTC) com ≥1 entrada, terminando hoje. `days` é o conjunto de datas 'YYYY-MM-DD' com entrada. */
function computeStreak(days: Set<string>, today: Date): number {
  let streak = 0
  const cursor = new Date(today)
  while (days.has(utcDateStr(cursor))) {
    streak++
    cursor.setUTCDate(cursor.getUTCDate() - 1)
  }
  return streak
}

function buildHtml(firstName: string, streak: number, projectName: string, projectUrl: string, linkedInUrl: string) {
  return `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#0a0f1a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0f1a;padding:32px 16px;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;">
        <tr><td style="padding-bottom:20px;">
          <span style="font-size:15px;font-weight:700;color:#eef2f8;">Showo</span>
        </td></tr>
        <tr><td style="background:#0e1729;border:1px solid #1e3050;border-radius:12px;padding:28px 24px;">
          <p style="margin:0 0 6px;font-size:13px;color:#7d93b0;">Olá ${esc(firstName)},</p>
          <p style="margin:0 0 18px;font-size:22px;font-weight:700;color:#eef2f8;line-height:1.3;">
            🔥 ${streak} dias seguidos em ${esc(projectName)}
          </p>
          <p style="margin:0 0 22px;font-size:13.5px;color:#b8c4d6;line-height:1.6;">
            Isto é o tipo de consistência que vale a pena mostrar lá fora — recrutadores e professores
            veem mais rápido um padrão do que um texto.
          </p>
          <a href="${esc(linkedInUrl)}" style="display:inline-block;background:#3b82f6;color:#fff;text-decoration:none;font-size:13px;font-weight:700;padding:11px 20px;border-radius:8px;margin-right:8px;">
            Partilhar no LinkedIn
          </a>
          <a href="${esc(projectUrl)}" style="display:inline-block;background:transparent;border:1px solid #1e3050;color:#b8c4d6;text-decoration:none;font-size:13px;font-weight:700;padding:11px 20px;border-radius:8px;">
            Ver projeto
          </a>
          <p style="margin:18px 0 0;font-size:11.5px;color:#5a6b85;line-height:1.5;">
            Queres um texto já escrito a partir do teu diário em vez de partilhares só o link?
            Abre o projeto no Showo e usa "Gerar post" no painel.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const cronSecret = Deno.env.get('CRON_SECRET')
    if (!cronSecret || req.headers.get('x-cron-secret') !== cronSecret) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: corsHeaders })
    }

    const resendKey = Deno.env.get('RESEND_API_KEY')
    if (!resendKey) throw new Error('RESEND_API_KEY not configured')

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const now = new Date()
    const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
    const since = new Date(todayStart); since.setUTCDate(since.getUTCDate() - LOOKBACK_DAYS)

    // Só quem teve entrada HOJE — sem isso não há streak nova a anunciar.
    const { data: todayRows, error: todayErr } = await supabase
      .from('project_journal_entries')
      .select('user_id')
      .gte('created_at', todayStart.toISOString())
    if (todayErr) throw todayErr

    const activeUserIds = [...new Set((todayRows ?? []).map(r => r.user_id).filter(Boolean))]
    if (!activeUserIds.length) {
      return new Response(JSON.stringify({ ok: true, sent: 0, checked: 0 }), { headers: corsHeaders })
    }

    let sent = 0, skipped = 0
    const errors: string[] = []

    for (const userId of activeUserIds) {
      try {
        const { data: entries } = await supabase
          .from('project_journal_entries')
          .select('created_at, project_id')
          .eq('user_id', userId)
          .gte('created_at', since.toISOString())

        const days = new Set((entries ?? []).map(e => String(e.created_at).slice(0, 10)))
        const streak = computeStreak(days, todayStart)

        const milestone = [...MILESTONES].reverse().find(m => streak >= m)
        if (!milestone) { skipped++; continue }

        const emailType = `streak_${milestone}`
        const { data: already } = await supabase
          .from('email_sends')
          .select('id')
          .eq('user_id', userId)
          .eq('email_type', emailType)
          .limit(1)
        if (already?.length) { skipped++; continue }

        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, onboarding_sequence_step, onboarding_opted_out')
          .eq('id', userId)
          .maybeSingle()

        // Quem está a meio do onboarding já recebe 1 email por dia dessa
        // sequência (send-onboarding-sequence). Confirmado contra a BD em
        // 2026-10-31 que isto estava a empilhar com este nudge no mesmo
        // dia ("parece spam"). Mesma regra do send-saturday-nudge.
        if (profile?.onboarding_sequence_step != null && profile.onboarding_sequence_step < 14 && !profile.onboarding_opted_out) {
          skipped++; continue
        }

        // Projeto mais ativo no período, para dar nome e link ao email.
        const countByProject: Record<string, number> = {}
        ;(entries ?? []).forEach(e => { countByProject[e.project_id] = (countByProject[e.project_id] ?? 0) + 1 })
        const topProjectId = Object.entries(countByProject).sort((a, b) => b[1] - a[1])[0]?.[0]
        if (!topProjectId) { skipped++; continue }

        const { data: project } = await supabase
          .from('projects')
          .select('name, slug, visibility')
          .eq('id', topProjectId)
          .maybeSingle()
        if (!project || (project.visibility && project.visibility !== 'public')) { skipped++; continue }

        const { data: authUser } = await supabase.auth.admin.getUserById(userId)
        const email = authUser?.user?.email
        if (!email) { skipped++; continue }

        const projectUrl = `${APP}/projeto/${project.slug}`
        const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(projectUrl)}`
        const firstName = (profile?.full_name ?? '').trim().split(' ')[0] || 'Olá'

        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: FROM,
            to: email,
            subject: `🔥 ${streak} dias seguidos em ${project.name}`,
            html: buildHtml(firstName, streak, project.name, projectUrl, linkedInUrl),
          }),
        })
        if (!res.ok) { errors.push(await res.text()); continue }

        const resendData = await res.json().catch(() => ({}))
        await supabase.from('email_sends').insert({
          user_id: userId,
          email_type: emailType,
          resend_id: resendData?.id ?? '',
          to_email: email,
        })
        sent++
      } catch (e) {
        console.error('[send-streak-nudge] failed for', userId, e)
        errors.push(String(e))
      }
    }

    return new Response(JSON.stringify({ ok: errors.length === 0, sent, skipped, checked: activeUserIds.length, errors }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error(e)
    return new Response(JSON.stringify({ error: 'Erro interno.' }), { status: 500, headers: corsHeaders })
  }
})
