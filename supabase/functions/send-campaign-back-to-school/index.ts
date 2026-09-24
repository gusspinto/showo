import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/* ══════════════════════════════════════════════════════════════════════════
   CAMPANHA "REGRESSO ÀS AULAS", só para quem tem occupation = "Aluno / A
   estudar" (98 utilizadores). Envio único, não é cron. Ângulo escolhido:
   mais-valia, porque vale a pena começar a documentar agora que as aulas
   recomeçaram, não como usar a ferramenta.

   Primeira de uma série de campanhas temáticas (a seguir: mais-valias,
   case studies), por isso o opt-out é genérico (marketing_campaign_opted_out),
   não específico deste envio.

   Modo de teste: { test_user_id } no corpo, para ver o email a sério antes
   de disparar contra os alunos todos.
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
        <tr><td style="padding:0 0 24px;color:#f0f0f0;font-size:28px;line-height:1.25;font-weight:800;letter-spacing:-0.01em;">A tua PAP ou projeto final vai dar trabalho de qualquer forma. Faz com que valha a pena depois.</td></tr>
        <tr><td style="padding:0 0 32px;color:#888888;font-size:16px;line-height:1.5;">No Showo, cada atualização fica um portfólio, com a IA a apontar o que está fraco antes de entregares, não depois. No fim do ano tens algo para mostrar, não só uma nota numa pauta.</td></tr>
        <tr><td style="padding:0 0 40px;"><a href="${APP}" style="display:inline-block;background:#2B7EF5;color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 24px;border-radius:10px;">Começar a documentar</a></td></tr>
        <tr><td style="font-size:11px;color:#555555;">Showo &middot; <a href="${APP}" style="color:#555555;">showo.pt</a> &middot; <a href="${esc(unsubscribeUrl)}" style="color:#555555;">cancelar emails de campanhas</a></td></tr>
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

    let testUserId: string | null = null
    let registeredBefore: Date | null = null
    try {
      const body = await req.json()
      if (typeof body?.test_user_id === 'string') testUserId = body.test_user_id
      // Só para reenvios: ignora quem se registou a partir desta data.
      if (typeof body?.registered_before === 'string' && !isNaN(Date.parse(body.registered_before))) {
        registeredBefore = new Date(body.registered_before)
      }
    } catch { /* corpo vazio é normal */ }

    const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

    // Um envio falhado deixava só uma linha na resposta HTTP do cron, que se
    // perde. Aqui tenta de novo em erros temporários (429/5xx), respeitando
    // Retry-After, e regista sempre o motivo nos logs da função.
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
        console.error(`[campaign] ${label}: HTTP ${res.status} (tentativa ${attempt}/3), a esperar ${wait}ms`)
        await sleep(wait)
      }
      if (res && !res.ok) console.error(`[campaign] ${label}: falhou com HTTP ${res.status}`)
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
          subject: 'A tua PAP fica com prova, não só com nota',
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

    // Envio real, só quem tem occupation = "Aluno / A estudar", uma vez por
    // pessoa: quem já tem linha em email_sends nunca volta a receber, por isso
    // voltar a correr a função só apanha quem ficou de fora.
    const { data: already } = await supabase
      .from('email_sends')
      .select('user_id')
      .eq('email_type', 'campaign_back_to_school')
    const alreadySent = new Set((already ?? []).map(r => r.user_id))

    let page = 1
    const perPage = 200
    for (;;) {
      const { data: pageData, error: listErr } = await supabase.auth.admin.listUsers({ page, perPage })
      if (listErr) throw listErr
      if (!pageData?.users?.length) break

      const ids = pageData.users.map(u => u.id)
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, occupation, marketing_campaign_opted_out')
        .in('id', ids)
      const profileMap = new Map((profiles ?? []).map(p => [p.id, p]))

      for (const u of pageData.users) {
        try {
          if (!u.email) continue
          const profile = profileMap.get(u.id)
          if (profile?.occupation !== 'Aluno / A estudar') { skipped++; continue }
          if (profile?.marketing_campaign_opted_out) { skipped++; continue }
          if (alreadySent.has(u.id)) { skipped++; continue }
          if (registeredBefore && new Date(u.created_at) >= registeredBefore) { skipped++; continue }

          const unsubSig = await signUserId(u.id, cronSecret)
          const unsubscribeUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/campaign-unsubscribe?u=${u.id}&sig=${unsubSig}`
          const html = buildHtml({ firstName: profile?.full_name?.split(' ')[0], unsubscribeUrl })

          const res = await sendWithRetry({
            from: FROM,
            to: u.email,
            subject: 'A tua PAP fica com prova, não só com nota',
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
              email_type: 'campaign_back_to_school',
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

    return new Response(JSON.stringify({ ok: errors.length === 0, mode: 'real', sent, skipped, errors }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error(e)
    return new Response(JSON.stringify({ error: 'Erro interno.', detail: String(e) }), { status: 500 })
  }
})
