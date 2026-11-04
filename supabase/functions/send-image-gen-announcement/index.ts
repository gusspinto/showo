import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/* ══════════════════════════════════════════════════════════════════════════
   ANÚNCIO DA FEATURE "GERADOR IA" (geração de imagens, migração 234/generate-
   image). Pedido do Gustavo: envio a todos, exceto quem já usou a feature
   este mês (não faz sentido anunciar algo que a pessoa já descobriu).

   Teste de horário embutido: a lista é dividida 50/50 por hash do user_id
   (par vai para o grupo A, ímpar para o grupo B), cada metade recebe a
   chamada com { group: 'a' | 'b' }, disparadas em horas diferentes (10h vs
   21h de Lisboa, 2026-11-04) para comparar open rate real via email_sends
   (email_type 'image_gen_announcement_a'/'_b', opened_at vem do
   resend-webhook).

   Opt-out genérico (marketing_campaign_opted_out), mesmo padrão do
   send-campaign-back-to-school: envio único, não é cron recorrente.

   Modo de teste: { test_user_id } no corpo, mesmo padrão das outras campanhas.
   ══════════════════════════════════════════════════════════════════════════ */

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

function buildHtml(opts: { firstName?: string; unsubscribeUrl: string }) {
  const { firstName, unsubscribeUrl } = opts
  return `
<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="#080808" style="background:#080808;">
  <tr>
    <td align="center" bgcolor="#080808" style="background:#080808;padding:48px 24px;font-family:-apple-system,Helvetica,Arial,sans-serif;">
      <table role="presentation" width="440" border="0" cellpadding="0" cellspacing="0" style="max-width:440px;width:100%;text-align:left;">
        <tr><td style="padding:0 0 28px;"><img src="https://showo.pt/icon.png" alt="Showo" width="32" height="32" style="display:block;border:0;" /></td></tr>
        ${firstName ? `<tr><td style="padding:0 0 16px;color:#888888;font-size:16px;line-height:1.4;">${esc(firstName)},</td></tr>` : ''}
        <tr><td style="padding:0 0 18px;color:#f0f0f0;font-size:28px;line-height:1.25;font-weight:800;letter-spacing:-0.01em;">Pediram imagens com IA.<br/>Nós cumprimos.</td></tr>
        <tr><td style="padding:0 0 10px;color:#cccccc;font-size:17px;line-height:1.5;font-weight:600;">Descreves a imagem. A IA gera na hora.</td></tr>
        <tr><td style="padding:0 0 28px;color:#999999;font-size:15px;line-height:1.6;">Capa do projeto, imagem para a defesa, o visual que falta num relatório. Tu descreves, ela aparece.</td></tr>
        <tr><td style="padding:0 0 6px;color:#f0f0f0;font-size:13px;font-weight:700;letter-spacing:0.3px;text-transform:uppercase;">Como usar</td></tr>
        <tr><td style="padding:0 0 2px;color:#aaaaaa;font-size:15px;line-height:1.7;">1&nbsp;&nbsp;Separador "Gerador IA" na barra lateral</td></tr>
        <tr><td style="padding:0 0 2px;color:#aaaaaa;font-size:15px;line-height:1.7;">2&nbsp;&nbsp;Escreves o que queres ver</td></tr>
        <tr><td style="padding:0 0 24px;color:#aaaaaa;font-size:15px;line-height:1.7;">3&nbsp;&nbsp;Carregas em gerar</td></tr>
        <tr><td style="padding:0 0 28px;color:#555555;font-size:13px;">5 imagens/mês no Plus &middot; 15/mês no Pro</td></tr>
        <tr><td style="padding:0 0 24px;"><a href="${APP}/gerador-ia" style="display:inline-block;background:#2B7EF5;color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 24px;border-radius:10px;">Experimentar agora</a></td></tr>
        <tr><td style="font-size:11px;color:#555555;">Showo &middot; <a href="${APP}" style="color:#555555;">showo.pt</a> &middot; <a href="${esc(unsubscribeUrl)}" style="color:#555555;">cancelar emails de campanhas</a></td></tr>
      </table>
    </td>
  </tr>
</table>`
}

const SUBJECT = 'Pediram imagens com IA. Nós cumprimos.'

Deno.serve(async (req) => {
  try {
    const cronSecret = Deno.env.get('CRON_SECRET')
    const provided = req.headers.get('x-cron-secret')
    if (!cronSecret || provided !== cronSecret) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 })
    }

    const resendKey = Deno.env.get('RESEND_API_KEY')
    if (!resendKey) throw new Error('RESEND_API_KEY not configured')

    let testUserId: string | null = null
    let group: 'a' | 'b' | null = null
    try {
      const body = await req.json()
      if (typeof body?.test_user_id === 'string') testUserId = body.test_user_id
      if (body?.group === 'a' || body?.group === 'b') group = body.group
    } catch { /* corpo vazio é normal */ }

    const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

    async function sendWithRetry(payload: unknown, label: string): Promise<Response> {
      let res: Response | null = null
      for (let attempt = 1; attempt <= 3; attempt++) {
        res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (res.ok || (res.status !== 429 && res.status < 500)) break
        const wait = Number(res.headers.get('retry-after')) * 1000 || attempt * 1500
        console.error(`[image-gen-announcement] ${label}: HTTP ${res.status} (tentativa ${attempt}/3), a esperar ${wait}ms`)
        await sleep(wait)
      }
      if (res && !res.ok) console.error(`[image-gen-announcement] ${label}: falhou com HTTP ${res.status}`)
      return res!
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    let sent = 0
    let skipped = 0
    const errors: string[] = []

    if (testUserId) {
      const { data: userData, error: userErr } = await supabase.auth.admin.getUserById(testUserId)
      if (userErr || !userData?.user?.email) throw new Error('test_user_id inválido')
      const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', testUserId).single()

      const unsubSig = await signUserId(testUserId, cronSecret)
      const unsubscribeUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/campaign-unsubscribe?u=${testUserId}&sig=${unsubSig}`
      const html = buildHtml({ firstName: profile?.full_name?.split(' ')[0], unsubscribeUrl })

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: FROM,
          to: userData.user.email,
          subject: SUBJECT,
          html,
          headers: {
            'List-Unsubscribe': `<${unsubscribeUrl}>`,
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          },
        }),
      })
      if (!res.ok) errors.push(await res.text())
      else sent++

      return new Response(JSON.stringify({ ok: errors.length === 0, mode: 'test', sent, errors }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (!group) {
      return new Response(JSON.stringify({ error: 'falta group (a|b) no corpo, ou test_user_id' }), { status: 400 })
    }
    const emailType = `image_gen_announcement_${group}`

    // Quem já recebeu (qualquer uma das metades) ou já usou a feature este
    // mês não entra, em nenhuma das duas corridas (grupo A e grupo B correm
    // em separado, mas partilham estas duas exclusões).
    const { data: alreadySentRows } = await supabase
      .from('email_sends')
      .select('user_id')
      .in('email_type', ['image_gen_announcement_a', 'image_gen_announcement_b'])
    const alreadySent = new Set((alreadySentRows ?? []).map(r => r.user_id))

    const month = new Date().toISOString().slice(0, 7)
    const { data: usageRows } = await supabase
      .from('ai_usage')
      .select('user_id')
      .eq('feature', 'generateImage')
      .eq('month', month)
      .gt('used', 0)
    const alreadyUsedFeature = new Set((usageRows ?? []).map(r => r.user_id))

    let page = 1
    const perPage = 200
    for (;;) {
      const { data: pageData, error: listErr } = await supabase.auth.admin.listUsers({ page, perPage })
      if (listErr) throw listErr
      if (!pageData?.users?.length) break

      const ids = pageData.users.map(u => u.id)
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, marketing_campaign_opted_out')
        .in('id', ids)
      const profileMap = new Map((profiles ?? []).map(p => [p.id, p]))

      for (const u of pageData.users) {
        try {
          if (!u.email) continue
          // Split 50/50 determinístico pelo último carácter hex do UUID
          // (0-7 = grupo A, 8-f = grupo B), estável entre as duas corridas.
          const lastHexChar = u.id.replace(/-/g, '').slice(-1)
          const userGroup = parseInt(lastHexChar, 16) < 8 ? 'a' : 'b'
          if (userGroup !== group) { skipped++; continue }

          const profile = profileMap.get(u.id)
          if (profile?.marketing_campaign_opted_out) { skipped++; continue }
          if (alreadySent.has(u.id)) { skipped++; continue }
          if (alreadyUsedFeature.has(u.id)) { skipped++; continue }

          const unsubSig = await signUserId(u.id, cronSecret)
          const unsubscribeUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/campaign-unsubscribe?u=${u.id}&sig=${unsubSig}`
          const html = buildHtml({ firstName: profile?.full_name?.split(' ')[0], unsubscribeUrl })

          const res = await sendWithRetry({
            from: FROM,
            to: u.email,
            subject: SUBJECT,
            html,
            headers: {
              'List-Unsubscribe': `<${unsubscribeUrl}>`,
              'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
            },
          }, u.email)
          await sleep(600)
          if (!res.ok) { errors.push(`${u.email}: ${await res.text()}`); continue }

          const { id: resendId } = await res.json()
          if (resendId) {
            await supabase.from('email_sends').insert({
              user_id: u.id,
              email_type: emailType,
              resend_id: resendId,
              to_email: u.email,
            })
          }
          sent++
        } catch (e) {
          errors.push(`${u.email ?? u.id}: ${String(e)}`)
        }
      }

      if (pageData.users.length < perPage) break
      page++
    }

    return new Response(JSON.stringify({ ok: errors.length === 0, mode: 'real', group, sent, skipped, errors }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error(e)
    return new Response(JSON.stringify({ error: 'Erro interno.', detail: String(e) }), { status: 500 })
  }
})
