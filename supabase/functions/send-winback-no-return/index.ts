import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/* Envio pontual: avisa quem criou conta, nunca preencheu o telemóvel e
   nunca mais voltou (só entrou na própria sessão de registo). Não menciona
   o telemóvel, só convida a voltar a ver a app. Deduplicado via
   email_sends (email_type = 'winback_no_return'), nunca manda duas vezes
   ao mesmo utilizador. */

const FROM = 'Showo <hello@showo.pt>'
const SUBJECT = 'A tua conta no Showo continua aqui'
const EMAIL_TYPE = 'winback_no_return'

function buildHtml(name: string) {
  const displayName = name || ''
  return `
  <div style="font-family:Arial,sans-serif;max-width:460px;margin:0 auto;padding:40px 20px;">
    <img src="https://showo.pt/icon.png" alt="Showo" width="90" style="display:block;margin:0 auto 28px;" />
    <h2 style="text-align:center;font-size:18px;font-weight:600;color:#1a1a1a;margin:0 0 8px;">Olá${displayName ? ', ' + displayName : ''}</h2>
    <p style="text-align:center;font-size:14px;color:#666;line-height:1.6;margin:0 0 28px;">Criaste uma conta no Showo e ainda não voltaste a entrar. A tua conta continua lá, pronta para organizares o teu primeiro projeto e transformares o teu trabalho num portfólio profissional.</p>
    <table border="0" cellspacing="0" cellpadding="0" align="center" style="margin:0 auto 28px;">
      <tr>
        <td align="center" style="background:#4a93f9;border-radius:8px;">
          <a href="https://showo.pt/dashboard" target="_blank" style="display:inline-block;padding:12px 36px;font-family:Arial,sans-serif;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;">Abrir o Showo</a>
        </td>
      </tr>
    </table>
    <p style="text-align:center;font-size:11px;color:#aaa;margin:0;">Não queres receber mais emails como este? Responde a dizer.</p>
  </div>`
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

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

    const { data: candidates, error: qErr } = await supabase
      .from('profiles')
      .select('id, full_name, created_at')
      .or('phone.is.null,phone.eq.')
    if (qErr) throw qErr

    const results = { total_checked: 0, sent: 0, skipped_returned: 0, skipped_already_sent: 0, skipped_no_email: 0, failed: [] as { id: string, error: string }[] }

    for (const p of candidates ?? []) {
      const { data: authRes } = await supabase.auth.admin.getUserById(p.id)
      const user = authRes?.user
      if (!user) continue
      results.total_checked++

      const createdAt = new Date(user.created_at).getTime()
      const lastSignIn = user.last_sign_in_at ? new Date(user.last_sign_in_at).getTime() : createdAt
      if (lastSignIn - createdAt > 10 * 60 * 1000) { results.skipped_returned++; continue }

      const { data: already } = await supabase
        .from('email_sends')
        .select('id')
        .eq('user_id', p.id)
        .eq('email_type', EMAIL_TYPE)
        .limit(1)
      if (already && already.length > 0) { results.skipped_already_sent++; continue }

      const email = user.email
      if (!email) { results.skipped_no_email++; continue }

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: FROM, to: email, subject: SUBJECT, html: buildHtml(p.full_name?.split(' ')[0] || '') }),
      })

      if (res.ok) {
        const resendData = await res.json().catch(() => null)
        await supabase.from('email_sends').insert({ user_id: p.id, email_type: EMAIL_TYPE, resend_id: resendData?.id ?? null, to_email: email })
        results.sent++
      } else {
        const errText = await res.text()
        results.failed.push({ id: p.id, error: errText.slice(0, 200) })
      }

      await sleep(250)
    }

    return new Response(JSON.stringify(results), { headers: { 'Content-Type': 'application/json' } })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 })
  }
})
