import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/* ══════════════════════════════════════════════════════════════════════════
   O cron (a cada 5 minutos) só serve para verificar com frequência, o aviso
   em si só dispara para mensagens por ler há mais de 2 horas (DELAY_MINUTES),
   uma vez por conversa (não por mensagem), para não gerar spam em gente que
   ia responder dali a pouco pela própria app.
   Idempotente via notified_at: só agrupa mensagens ainda não notificadas.
   ══════════════════════════════════════════════════════════════════════════ */

const FROM = 'Showo <hello@showo.pt>'
const DELAY_MINUTES = 2 * 60

function buildHtml(senderName: string, preview: string, count: number) {
  const plural = count > 1 ? `${count} mensagens novas` : 'Uma mensagem nova'
  return `
  <div style="font-family:Arial,sans-serif;max-width:460px;margin:0 auto;padding:40px 20px;">
    <img src="https://showo.pt/icon.png" alt="Showo" width="80" style="display:block;margin:0 auto 28px;" />
    <h2 style="text-align:center;font-size:18px;font-weight:600;color:#1a1a1a;margin:0 0 8px;">${plural} de ${senderName}</h2>
    <p style="text-align:center;font-size:14px;color:#666;line-height:1.6;margin:0 0 24px;white-space:pre-wrap;">${preview}</p>
    <table border="0" cellspacing="0" cellpadding="0" align="center" style="margin:0 auto;">
      <tr>
        <td align="center" style="background:#4a93f9;border-radius:8px;">
          <a href="https://showo.pt/mensagens" target="_blank" style="display:inline-block;padding:12px 36px;font-family:Arial,sans-serif;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;">Responder no Showo</a>
        </td>
      </tr>
    </table>
  </div>`
}

Deno.serve(async (req) => {
  try {
    const cronSecret = Deno.env.get('CRON_SECRET')
    const provided = req.headers.get('x-cron-secret')
    if (!cronSecret || provided !== cronSecret) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 })
    }

    const resendKey = Deno.env.get('RESEND_API_KEY')
    if (!resendKey) throw new Error('RESEND_API_KEY not configured')

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const cutoff = new Date(Date.now() - DELAY_MINUTES * 60 * 1000).toISOString()

    const { data: pending, error: qErr } = await supabase
      .from('mensagens')
      .select('id, from_id, to_id, content, created_at')
      .is('read_at', null)
      .is('notified_at', null)
      .lte('created_at', cutoff)
      .order('created_at', { ascending: true })
    if (qErr) throw qErr
    if (!pending?.length) {
      return new Response(JSON.stringify({ ok: true, conversations: 0, sent: 0 }), { headers: { 'Content-Type': 'application/json' } })
    }

    // Agrupa por conversa (to_id + from_id): uma só mensagem por cada
    // remetente numa conversa, não uma por mensagem individual.
    const groups = new Map<string, typeof pending>()
    for (const m of pending) {
      const key = `${m.to_id}:${m.from_id}`
      const list = groups.get(key) ?? []
      list.push(m)
      groups.set(key, list)
    }

    let sent = 0
    const notifiedIds: string[] = []

    for (const [key, msgs] of groups) {
      const [toId, fromId] = key.split(':')

      const { data: toAuth } = await supabase.auth.admin.getUserById(toId)
      const toEmail = toAuth?.user?.email
      if (!toEmail) { notifiedIds.push(...msgs.map(m => m.id)); continue }

      const { data: fromProfile } = await supabase
        .from('profiles')
        .select('full_name, username')
        .eq('id', fromId)
        .single()
      const senderName = fromProfile?.full_name || fromProfile?.username || 'Alguém no Showo'

      const latest = msgs[msgs.length - 1]
      const preview = latest.content.length > 280 ? `${latest.content.slice(0, 280)}…` : latest.content

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: FROM,
          to: toEmail,
          subject: msgs.length > 1 ? `${msgs.length} mensagens novas de ${senderName}` : `Mensagem nova de ${senderName}`,
          html: buildHtml(senderName, preview, msgs.length),
        }),
      })

      if (res.ok) {
        sent++
        notifiedIds.push(...msgs.map(m => m.id))
      } else {
        console.error('[send-message-notifications] Resend error:', await res.text())
      }
    }

    if (notifiedIds.length) {
      await supabase.from('mensagens').update({ notified_at: new Date().toISOString() }).in('id', notifiedIds)
    }

    return new Response(JSON.stringify({ ok: true, conversations: groups.size, sent }), { headers: { 'Content-Type': 'application/json' } })
  } catch (e) {
    console.error('[send-message-notifications]', e)
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 })
  }
})
