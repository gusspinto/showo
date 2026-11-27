import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/* ══════════════════════════════════════════════════════════════════════════
   CAMPANHA "pedido de avaliação" (27/11). Envio único, não é cron por
   omissão (pode ser agendado depois, se fizer sentido repetir para novos
   elegíveis). Público: contas com pelo menos 1 projeto `full` com score
   >= 41 (mesmo critério do pop-up real em AuthContext.jsx) que nunca viram
   o pop-up (`review_popup_seen_at is null`), excluindo contas internas e
   quem já fez opt-out de campanhas.

   O pop-up (`ReviewPopupModal.jsx`) só dispara dentro da app, via
   AuthContext, e muita gente nunca passa pela dashboard (vai direto a
   /explorar, /mensagens, ou a um link de projeto). Esta campanha não
   constrói UI nova: manda um magic link para /dashboard, e ao autenticar
   aí o próprio useEffect do AuthContext detecta elegibilidade
   (review_popup_seen_at ainda null) e mostra o pop-up sozinho.

   Mesmo padrão de segurança das outras funções de envio em massa (ver
   docs/licoes-aprendidas.md): lock contra execuções sobrepostas, limite por
   corrida, ordem estável (mais antigos primeiro), dedup real via
   email_sends com .limit() explícito (nunca confiar no limite de 1000 por
   omissão do PostgREST).

   Modo de teste: { test_user_id } no corpo, para ver o email a sério antes
   de disparar contra a lista toda.
   ══════════════════════════════════════════════════════════════════════════ */

const FROM = 'Gustavo (Showo) <hello@showo.pt>'
const APP = 'https://showo.pt'
const EMAIL_TYPE = 'campaign_review_request'
const INTERNAL_EMAILS = new Set(['guspintobusiness@gmail.com', 'brunosilva.smd@gmail.com'])

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

async function buildDashboardLink(supabase: ReturnType<typeof createClient>, email: string): Promise<string> {
  const { data, error } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { redirectTo: `${APP}/dashboard` },
  })
  if (error || !data?.properties?.action_link) {
    console.error(`[review-request] generateLink falhou para ${email}: ${error?.message ?? 'sem action_link'}`)
    return `${APP}/dashboard`
  }
  return data.properties.action_link
}

function buildHtml(opts: { unsubscribeUrl: string; dashboardLink: string; firstName: string }) {
  const { unsubscribeUrl, dashboardLink, firstName } = opts
  return `
<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="#080808" style="background:#080808;">
  <tr>
    <td align="center" bgcolor="#080808" style="background:#080808;padding:48px 24px;font-family:-apple-system,Helvetica,Arial,sans-serif;">
      <table role="presentation" width="440" border="0" cellpadding="0" cellspacing="0" style="max-width:440px;width:100%;text-align:left;">
        <tr><td style="padding:0 0 28px;">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr>
            <td style="padding:0 8px 0 0;"><img src="${APP}/icon.png" alt="" width="28" height="28" style="display:block;border:0;" /></td>
            <td style="color:#f0f0f0;font-size:16px;font-weight:700;letter-spacing:-0.01em;">Showo</td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:0 0 24px;color:#f0f0f0;font-size:24px;line-height:1.3;font-weight:800;letter-spacing:-0.01em;">Posso pedir-te um favor, ${esc(firstName)}?</td></tr>
        <tr><td style="padding:0 0 20px;color:#888888;font-size:16px;line-height:1.55;">Sou eu, o Gustavo, o fundador do Showo. Somos uma equipa pequena a construir isto do zero.</td></tr>
        <tr><td style="padding:0 0 20px;color:#f0f0f0;font-size:16px;line-height:1.55;">Vi que o teu projeto já está a ficar com bom aspeto. A tua opinião sincera, boa ou má, ajuda-nos mesmo a decidir o que vem a seguir.</td></tr>
        <tr><td style="padding:0 0 32px;color:#f0f0f0;font-size:16px;line-height:1.55;">É só 1 minuto: entras no teu painel e aparece lá a pergunta.</td></tr>
        <tr><td style="padding:0 0 40px;"><a href="${esc(dashboardLink)}" style="display:inline-block;background:#2B7EF5;color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 24px;border-radius:10px;">Ir ao meu painel</a></td></tr>
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
    try {
      const body = await req.json()
      if (typeof body?.test_user_id === 'string') testUserId = body.test_user_id
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
        console.error(`[review-request] ${label}: HTTP ${res.status} (tentativa ${attempt}/3), a esperar ${wait}ms`)
        await sleep(wait)
      }
      if (res && !res.ok) console.error(`[review-request] ${label}: falhou com HTTP ${res.status}`)
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
      const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', testUserId).maybeSingle()

      const unsubSig = await signUserId(testUserId, cronSecret)
      const unsubscribeUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/campaign-unsubscribe?u=${testUserId}&sig=${unsubSig}`
      const dashboardLink = await buildDashboardLink(supabase, userData.user.email)
      const firstName = (profile?.full_name ?? '').split(' ')[0] || 'tu'
      const html = buildHtml({ unsubscribeUrl, dashboardLink, firstName })

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: FROM,
          to: userData.user.email,
          subject: 'Posso pedir-te um favor?',
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

    // Envio real: lock contra corridas sobrepostas (mesmo padrão de
    // send-onboarding-sequence/send-campaign-gta-giveaway, ver
    // docs/licoes-aprendidas.md).
    const { data: lockAcquired } = await supabase.rpc('try_acquire_function_lock', {
      p_name: 'send-review-request-email',
      p_stale_minutes: 8,
    })
    if (!lockAcquired) {
      return new Response(JSON.stringify({ ok: true, skipped_reason: 'already_running' }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    try {
      const MAX_SENT_PER_RUN = 40

      // Elegíveis: mesmo critério do pop-up real (AuthContext.jsx), nunca
      // viram, nunca ativaram opt-out de campanhas, nunca são contas
      // internas. Paginado explicitamente em blocos de 1000: o projeto
      // Supabase tem um "Max Rows" (API settings) que ignora em silêncio
      // qualquer .limit() maior passado pelo cliente, cortando sempre nas
      // primeiras ~1000 linhas (mais antigas, por causa do order by). Sem
      // paginação, os elegíveis mais recentes nunca eram vistos (ficavam
      // sempre "quase lá" sem nunca serem processados).
      const elegiveis: { id: string; full_name: string | null; created_at: string; is_admin: boolean; marketing_campaign_opted_out: boolean }[] = []
      for (let page = 0; ; page++) {
        const { data: chunk, error: eligErr } = await supabase
          .from('profiles')
          .select('id, full_name, created_at, is_admin, marketing_campaign_opted_out')
          .is('review_popup_seen_at', null)
          .order('created_at', { ascending: true })
          .range(page * 1000, page * 1000 + 999)
        if (eligErr) throw eligErr
        elegiveis.push(...(chunk ?? []))
        if (!chunk || chunk.length < 1000) break
      }

      // Buscar primeiro o conjunto pequeno (projetos com score alto), em
      // vez de um .in('user_id', ids) com ~1800 ids de profiles: isso
      // gera um URL demasiado grande e falha em silêncio (erro nunca
      // verificado), foi exatamente o que aconteceu na primeira corrida.
      const eligibleIds = new Set<string>()
      for (let page = 0; ; page++) {
        const { data: chunk, error: scoreErr } = await supabase
          .from('projects')
          .select('user_id')
          .gte('score', 41)
          .eq('entry_kind', 'full')
          .range(page * 1000, page * 1000 + 999)
        if (scoreErr) throw scoreErr
        for (const r of chunk ?? []) eligibleIds.add(r.user_id)
        if (!chunk || chunk.length < 1000) break
      }

      // Mesmo cuidado de paginação do bloco acima: o "Max Rows" do projeto
      // ignora .limit(5000), e esta é a query de dedup mais crítica de
      // todas (sem ela paginada, o mesmo incidente de envios duplicados
      // da GTA VI de 26/11 repetia-se aqui).
      const alreadySent = new Set<string>()
      for (let page = 0; ; page++) {
        const { data: chunk } = await supabase
          .from('email_sends')
          .select('user_id')
          .eq('email_type', EMAIL_TYPE)
          .range(page * 1000, page * 1000 + 999)
        for (const r of chunk ?? []) alreadySent.add(r.user_id)
        if (!chunk || chunk.length < 1000) break
      }

      for (const profile of elegiveis ?? []) {
        if (sent >= MAX_SENT_PER_RUN) break
        if (!eligibleIds.has(profile.id)) continue
        if (profile.is_admin) { skipped++; continue }
        if (profile.marketing_campaign_opted_out) { skipped++; continue }
        if (alreadySent.has(profile.id)) { skipped++; continue }

        const { data: userData, error: userErr } = await supabase.auth.admin.getUserById(profile.id)
        if (userErr || !userData?.user?.email) { skipped++; continue }
        const email = userData.user.email
        if (INTERNAL_EMAILS.has(email)) { skipped++; continue }

        try {
          const unsubSig = await signUserId(profile.id, cronSecret)
          const unsubscribeUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/campaign-unsubscribe?u=${profile.id}&sig=${unsubSig}`
          const dashboardLink = await buildDashboardLink(supabase, email)
          const firstName = (profile.full_name ?? '').split(' ')[0] || 'tu'
          const html = buildHtml({ unsubscribeUrl, dashboardLink, firstName })

          const res = await sendWithRetry({
            from: FROM,
            to: email,
            subject: 'Posso pedir-te um favor?',
            html,
            headers: {
              'List-Unsubscribe': `<${unsubscribeUrl}>`,
              'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
            },
          }, email)
          await sleep(600)
          if (!res.ok) { errors.push(`${email}: ${await res.text()}`); continue }

          const { id: resendId } = await res.json()
          if (resendId) {
            await supabase.from('email_sends').insert({
              user_id: profile.id,
              email_type: EMAIL_TYPE,
              resend_id: resendId,
              to_email: email,
            })
          }
          sent++
          await supabase.rpc('touch_function_lock', { p_name: 'send-review-request-email' })
        } catch (e) {
          errors.push(`${email}: ${String(e)}`)
        }
      }

      return new Response(JSON.stringify({ ok: errors.length === 0, mode: 'real', sent, skipped, errors }), {
        headers: { 'Content-Type': 'application/json' },
      })
    } finally {
      await supabase.rpc('release_function_lock', { p_name: 'send-review-request-email' })
    }
  } catch (e) {
    console.error(e)
    return new Response(JSON.stringify({ error: 'Erro interno.', detail: String(e) }), { status: 500 })
  }
})
