import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/* ══════════════════════════════════════════════════════════════════════════
   AVISO "O TEU PROJETO ESTÁ EM DESTAQUE" — corre semanalmente, usa a mesma
   get_featured_projects() que já decide os destaques do Home e do Explorar
   (consistência do diário ao longo de 12 semanas), para o email nunca dizer
   uma coisa diferente do que a pessoa vê no site.

   Só notifica quem entrou de novo (ou voltou a entrar), não quem já foi
   avisado nos últimos 7 dias — sem isso, um projeto que se mantém em
   destaque durante semanas seguidas mandava o mesmo email todas as semanas.

   Modo de teste: { test_project_id } no corpo, para ver o email a sério
   antes de deixar isto correr contra gente real.
   ══════════════════════════════════════════════════════════════════════════ */

const FROM = 'Showo <hello@showo.pt>'
const APP = 'https://showo.pt'
const RENOTIFY_COOLDOWN_DAYS = 7

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

function buildHtml(opts: { firstName?: string; projectName: string; projectSlug: string; weeks: number; unsubscribeUrl: string }) {
  const { firstName, projectName, projectSlug, weeks, unsubscribeUrl } = opts
  return `
<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="#080808" style="background:#080808;">
  <tr>
    <td align="center" bgcolor="#080808" style="background:#080808;padding:48px 24px;font-family:-apple-system,Helvetica,Arial,sans-serif;">
      <table role="presentation" width="440" border="0" cellpadding="0" cellspacing="0" style="max-width:440px;width:100%;text-align:left;">
        <tr><td style="padding:0 0 28px;"><img src="https://showo.pt/icon.png" alt="Showo" width="32" height="32" style="display:block;border:0;" /></td></tr>
        ${firstName ? `<tr><td style="padding:0 0 16px;color:#888888;font-size:16px;line-height:1.4;">${esc(firstName)},</td></tr>` : ''}
        <tr><td style="padding:0 0 24px;color:#f0f0f0;font-size:28px;line-height:1.25;font-weight:800;letter-spacing:-0.01em;">${esc(projectName)} está em destaque agora mesmo. Parabéns.</td></tr>
        <tr><td style="padding:0 0 10px;color:#888888;font-size:16px;line-height:1.5;">${weeks >= 3 ? `Já leva ${weeks} semanas seguidas de acompanhamento real, e é isso que está a pôr o teu projeto à frente. É a primeira coisa que quem entra no Showo vê hoje.` : 'É a primeira coisa que quem entra no Showo vê hoje. Mais pessoas a ver o que construíste, sem teres de fazer nada extra.'}</td></tr>
        <tr><td style="padding:0 0 32px;color:#888888;font-size:16px;line-height:1.5;">Se continuares a atualizar o diário, ou criares outro projeto, aumentas as hipóteses de voltares a aparecer aqui, e de alguém reparar em ti por causa disso.</td></tr>
        <tr><td style="padding:0 0 40px;"><a href="${APP}/projeto/${projectSlug}" style="display:inline-block;background:#2B7EF5;color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 24px;border-radius:10px;">Ver o meu projeto em destaque</a></td></tr>
        <tr><td style="font-size:11px;color:#555555;">Showo &middot; <a href="${APP}" style="color:#555555;">showo.pt</a> &middot; <a href="${esc(unsubscribeUrl)}" style="color:#555555;">cancelar estes avisos</a></td></tr>
      </table>
    </td>
  </tr>
</table>`
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

    let testProjectId: string | null = null
    try {
      const body = await req.json()
      if (typeof body?.test_project_id === 'string') testProjectId = body.test_project_id
    } catch { /* corpo vazio é normal na chamada do cron */ }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Mesma função e mesmos parâmetros que o Home e o Explorar usam para
    // decidir "em destaque" — nunca inventa uma lista diferente.
    const { data: featured, error: featErr } = await supabase.rpc('get_featured_projects', { p_limit: 4, p_weeks: 12 })
    if (featErr) throw featErr

    const candidates = testProjectId
      ? (featured ?? []).filter((p: { id: string }) => p.id === testProjectId)
      : (featured ?? [])

    let sent = 0
    let skipped = 0
    const errors: string[] = []

    for (const proj of candidates) {
      try {
        const { data: row, error: rowErr } = await supabase
          .from('projects')
          .select('user_id, featured_notified_at')
          .eq('id', proj.id)
          .single()
        if (rowErr || !row?.user_id) continue

        const cooldownOk = !row.featured_notified_at ||
          new Date(row.featured_notified_at) < new Date(Date.now() - RENOTIFY_COOLDOWN_DAYS * 86400000)
        if (!testProjectId && !cooldownOk) { skipped++; continue }

        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, featured_notification_opted_out')
          .eq('id', row.user_id)
          .single()
        if (!testProjectId && profile?.featured_notification_opted_out) { skipped++; continue }

        const { data: userData, error: userErr } = await supabase.auth.admin.getUserById(row.user_id)
        if (userErr || !userData?.user?.email) continue

        const unsubSig = await signUserId(row.user_id, cronSecret)
        const unsubscribeUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/featured-unsubscribe?u=${row.user_id}&sig=${unsubSig}`

        const html = buildHtml({
          firstName: profile?.full_name?.split(' ')[0],
          projectName: proj.name,
          projectSlug: proj.slug,
          weeks: proj.manual_weeks ?? 0,
          unsubscribeUrl,
        })

        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: FROM,
            to: userData.user.email,
            subject: `O teu projeto ${proj.name} está em destaque`,
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
            user_id: row.user_id,
            email_type: 'featured_notification',
            resend_id: resendId,
            to_email: userData.user.email,
          })
        }

        if (!testProjectId) {
          await supabase.from('projects').update({ featured_notified_at: new Date().toISOString() }).eq('id', proj.id)
        }
        sent++
      } catch (e) {
        console.error('[send-featured-notification] failed for', proj.id, e)
        errors.push(String(e))
      }
    }

    return new Response(JSON.stringify({ ok: errors.length === 0, candidates: candidates.length, sent, skipped, errors }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error(e)
    return new Response(JSON.stringify({ error: 'Erro interno.' }), { status: 500 })
  }
})
