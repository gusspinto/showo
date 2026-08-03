import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://showo.pt',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const FROM = 'Showo <hello@showo.pt>'

function esc(v: string) {
  return String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
}

function buildHtml(title: string, dateLabel: string, notes?: string) {
  return `
<div style="background:#03060d;padding:48px 24px;font-family:-apple-system,Helvetica,Arial,sans-serif;">
  <div style="max-width:480px;margin:0 auto;">
    <img src="https://showo.pt/icon_light.png" alt="Showo" width="32" height="32"
      style="display:block;margin:0 auto 24px;border:0;" />
    <h1 style="margin:0 0 8px;color:#eef2f8;font-size:20px;line-height:1.3;text-align:center;">
      Lembrete para amanhã
    </h1>
    <p style="margin:0 0 28px;color:#9fb0c8;font-size:14px;text-align:center;">${esc(dateLabel)}</p>

    <div style="background:#0e1729;border:1px solid #1e3050;border-radius:12px;padding:20px 22px;margin-bottom:28px;">
      <p style="margin:0 0 6px;font-size:16px;font-weight:600;color:#eef2f8;">${esc(title)}</p>
      ${notes ? `<p style="margin:0;font-size:13px;color:#9fb0c8;line-height:1.5;">${esc(notes)}</p>` : ''}
    </div>

    <div style="text-align:center;margin-bottom:28px;">
      <a href="https://showo.pt/dashboard" style="display:inline-block;background:#1b78f7;color:#fff;
        text-decoration:none;font-weight:600;font-size:14px;padding:12px 28px;border-radius:10px;">
        Ver agenda
      </a>
    </div>

    <p style="margin:0;text-align:center;font-size:11px;color:#4a607a;">
      Showo · <a href="https://showo.pt" style="color:#4a607a;">showo.pt</a>
    </p>
  </div>
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

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Find all reminders due tomorrow that haven't been emailed yet
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowISO = tomorrow.toISOString().slice(0, 10)

    const { data: reminders, error: remErr } = await supabase
      .from('personal_reminders')
      .select('id, user_id, title, reminder_date, notes')
      .eq('reminder_date', tomorrowISO)
      .eq('email_sent', false)
      .eq('done', false)

    if (remErr) throw remErr
    if (!reminders?.length) {
      return new Response(JSON.stringify({ ok: true, sent: 0 }), { headers: corsHeaders })
    }

    const dateLabel = tomorrow.toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' })

    let sent = 0
    const errors: string[] = []

    for (const reminder of reminders) {
      try {
        // Get user email from auth.users via admin API
        const { data: authUser, error: authErr } = await supabase.auth.admin.getUserById(reminder.user_id)
        if (authErr || !authUser?.user?.email) continue

        const html = buildHtml(reminder.title, dateLabel, reminder.notes || undefined)

        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: FROM,
            to: authUser.user.email,
            subject: `Lembrete amanhã: ${reminder.title}`,
            html,
          }),
        })

        if (!res.ok) {
          const body = await res.text()
          errors.push(`reminder ${reminder.id}: ${body}`)
          continue
        }

        // Mark as sent
        await supabase
          .from('personal_reminders')
          .update({ email_sent: true })
          .eq('id', reminder.id)

        sent++
      } catch (e) {
        errors.push(`reminder ${reminder.id}: ${String(e)}`)
      }
    }

    return new Response(JSON.stringify({ ok: true, sent, errors }), { headers: corsHeaders })
  } catch (err) {
    console.error('[send-reminder-emails]', err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders })
  }
})
