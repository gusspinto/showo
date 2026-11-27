import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/* ══════════════════════════════════════════════════════════════════════════
   CAMPANHA "GTA VI" (24/11). Envio único, não é cron. Público: todos os
   utilizadores com email real, excluindo contas internas (fundadores,
   is_admin) e quem já fez opt-out de campanhas.

   Mesmo padrão de segurança já estabelecido noutras funções de envio em
   massa (send-onboarding-sequence, send-campaign-storm, ver
   docs/licoes-aprendidas.md): lock contra execuções sobrepostas, limite por
   corrida, ordem estável (mais antigos primeiro), e dedup real via
   email_sends (quem já recebeu nunca recebe outra vez, mesmo correndo esta
   função várias vezes ao longo do dia para limpar o resto da lista).

   Modo de teste: { test_user_id } no corpo, para ver o email a sério antes
   de disparar contra a lista toda.

   26/11: link de "Ir ao meu painel" passou a ser um magic link
   (supabase.auth.admin.generateLink, type magiclink) em vez de um link
   simples para /dashboard. Motivo: 234 pessoas com projeto já publicado
   (um clique de distância de participar) abriram este email e só 2
   confirmaram. Quem abre o email no telemóvel pode não estar com sessão
   aberta nesse dispositivo/navegador, cai no ecrã de login, e desiste em
   vez de voltar a entrar. O magic link autentica diretamente e cai já
   em /dashboard, elimina esse atrito por completo. Falha a gerar o link
   para uma pessoa nunca bloqueia o envio: usa o link simples como
   fallback nesse caso isolado.
   ══════════════════════════════════════════════════════════════════════════ */

const FROM = 'Showo <hello@showo.pt>'
const APP = 'https://showo.pt'
const EMAIL_TYPE = 'campaign_gta_giveaway'
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
    console.error(`[gta-campaign] generateLink falhou para ${email}: ${error?.message ?? 'sem action_link'}`)
    return `${APP}/dashboard`
  }
  return data.properties.action_link
}

function buildHtml(opts: { unsubscribeUrl: string; entryCount: number; dashboardLink: string }) {
  const { unsubscribeUrl, entryCount, dashboardLink } = opts
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
        <tr><td style="padding:0 0 24px;color:#f0f0f0;font-size:28px;line-height:1.25;font-weight:800;letter-spacing:-0.01em;">Partilha 1 projeto e ganha um GTA VI</td></tr>
        <tr><td style="padding:0 0 24px;color:#888888;font-size:16px;line-height:1.5;">Mostrar o que fizeste já devia valer a pena por si só. Esta semana demos-te mais um motivo: quem publica o primeiro projeto no Showo entra automaticamente no sorteio.</td></tr>
        <tr><td style="padding:0 0 10px;color:#666666;font-size:11px;font-weight:700;letter-spacing:0.08em;">PASSOS A SEGUIR</td></tr>
        <tr><td style="padding:0 0 10px;color:#f0f0f0;font-size:16px;line-height:1.6;">&#8226;&nbsp; Publica o teu primeiro projeto (já tens um? passa a seguir)</td></tr>
        <tr><td style="padding:0 0 10px;color:#f0f0f0;font-size:16px;line-height:1.6;">&#8226;&nbsp; Abre o teu painel e clica em "Participar"</td></tr>
        <tr><td style="padding:0 0 28px;color:#f0f0f0;font-size:16px;line-height:1.6;">&#8226;&nbsp; Pronto, estás dentro</td></tr>
        <tr><td style="padding:0 0 28px;color:#f0f0f0;font-size:15px;line-height:1.6;font-weight:700;">${entryCount} pessoas já estão dentro. Quanto mais cedo entrares, menos concorrência tens.</td></tr>
        <tr><td style="padding:0 0 10px;color:#666666;font-size:11px;font-weight:700;letter-spacing:0.08em;">MAIS FORMAS DE GANHAR</td></tr>
        <tr><td style="padding:0 0 16px;color:#f0f0f0;font-size:16px;line-height:1.6;">&#8226;&nbsp; Não ganhaste o GTA? Mais 2 pessoas recebem 2 meses de Plus, só por terem participado</td></tr>
        <tr><td style="padding:0 0 28px;color:#f0f0f0;font-size:16px;line-height:1.6;">
          <span style="color:#5B9CFF;font-weight:800;text-transform:uppercase;letter-spacing:0.04em;font-size:12px;">GARANTIDO, SEM SORTEIO NENHUM</span><br/>
          <span style="font-weight:700;">Assina o Plus ou o anual esta semana e levas já 1 mês extra.</span>
        </td></tr>
        <tr><td style="padding:0 0 32px;color:#888888;font-size:16px;line-height:1.5;">O prémio é só o empurrão. O que levas a sério é um portefólio pronto a mostrar a quem decidir se confia em ti.</td></tr>
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
        console.error(`[gta-campaign] ${label}: HTTP ${res.status} (tentativa ${attempt}/3), a esperar ${wait}ms`)
        await sleep(wait)
      }
      if (res && !res.ok) console.error(`[gta-campaign] ${label}: falhou com HTTP ${res.status}`)
      return res!
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { count: entryCountRaw } = await supabase
      .from('gta_giveaway_entries')
      .select('id', { count: 'exact', head: true })
    const entryCount = entryCountRaw ?? 0

    let sent = 0
    let skipped = 0
    const errors: string[] = []

    if (testUserId) {
      const { data: userData, error: userErr } = await supabase.auth.admin.getUserById(testUserId)
      if (userErr || !userData?.user?.email) throw new Error('test_user_id inválido')

      const unsubSig = await signUserId(testUserId, cronSecret)
      const unsubscribeUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/campaign-unsubscribe?u=${testUserId}&sig=${unsubSig}`
      const dashboardLink = await buildDashboardLink(supabase, userData.user.email)
      const html = buildHtml({ unsubscribeUrl, entryCount, dashboardLink })

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: FROM,
          to: userData.user.email,
          subject: 'Ganha um GTA VI ao partilhares o teu projeto',
          html,
          headers: {
            'List-Unsubscribe': `<${unsubscribeUrl}>`,
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          },
        }),
      })
      if (!res.ok) errors.push(await res.text())
      else sent++

      return new Response(JSON.stringify({ ok: errors.length === 0, mode: 'test', sent, entryCount, errors }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Envio real: lock contra corridas sobrepostas (mesmo padrão de
    // send-onboarding-sequence, ver docs/licoes-aprendidas.md 2026-11-12).
    const { data: lockAcquired } = await supabase.rpc('try_acquire_function_lock', {
      p_name: 'send-campaign-gta-giveaway',
      p_stale_minutes: 8,
    })
    if (!lockAcquired) {
      return new Response(JSON.stringify({ ok: true, skipped_reason: 'already_running' }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    try {
      // Limite por corrida: a função pode ser invocada várias vezes para
      // limpar o resto da lista, sem repetir ninguém (dedup via
      // email_sends) e sem risco do WORKER_RESOURCE_LIMIT já visto noutras
      // campanhas com listas grandes de uma vez. Baixado de 100 para 40 em
      // 26/11 ao introduzir o magic link: cada envio passou a fazer 2
      // chamadas externas (generateLink + Resend) em vez de 1, a corrida
      // demora quase o dobro do tempo por pessoa.
      const MAX_SENT_PER_RUN = 40

      // 27/11: .limit(5000) não bastava. Além do limite de 1000 por
      // omissão do PostgREST (já documentado em 26/11), o próprio projeto
      // Supabase tem um "Max Rows" nas API settings que ignora em
      // silêncio qualquer .limit() maior passado pelo cliente, cortando
      // sempre nas primeiras ~1000 linhas (sem order by, numa ordem
      // arbitrária e instável entre chamadas). Com o cron a correr de
      // hora em hora e mais de 1000 linhas já enviadas, isto causou um
      // terceiro incidente de duplicados, pior que os dois anteriores
      // (35 pessoas com 12 emails cada). Paginação explícita com .range()
      // em blocos de 1000 é a única forma fiável de trazer tudo.
      const alreadySent = new Set<string>()
      for (let p = 0; ; p++) {
        const { data: chunk } = await supabase
          .from('email_sends')
          .select('user_id')
          .eq('email_type', EMAIL_TYPE)
          .range(p * 1000, p * 1000 + 999)
        for (const r of chunk ?? []) alreadySent.add(r.user_id)
        if (!chunk || chunk.length < 1000) break
      }

      let page = 1
      const perPage = 200
      outer: for (;;) {
        const { data: pageData, error: listErr } = await supabase.auth.admin.listUsers({ page, perPage })
        if (listErr) throw listErr
        if (!pageData?.users?.length) break

        const ids = pageData.users.map(u => u.id)
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, is_admin, marketing_campaign_opted_out, created_at')
          .in('id', ids)
        const profileMap = new Map((profiles ?? []).map(p => [p.id, p]))

        // Ordem estável (mais antigos primeiro), mesma lição do
        // send-onboarding-sequence: sem isto, o limite por corrida processa
        // sempre o mesmo subconjunto em vez de avançar pela lista.
        const sortedUsers = [...pageData.users].sort((a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

        for (const u of sortedUsers) {
          try {
            if (sent >= MAX_SENT_PER_RUN) break outer
            if (!u.email) continue
            if (INTERNAL_EMAILS.has(u.email)) { skipped++; continue }
            const profile = profileMap.get(u.id)
            if (profile?.is_admin) { skipped++; continue }
            if (profile?.marketing_campaign_opted_out) { skipped++; continue }
            if (alreadySent.has(u.id)) { skipped++; continue }

            const unsubSig = await signUserId(u.id, cronSecret)
            const unsubscribeUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/campaign-unsubscribe?u=${u.id}&sig=${unsubSig}`
            const dashboardLink = await buildDashboardLink(supabase, u.email)
            const html = buildHtml({ unsubscribeUrl, entryCount, dashboardLink })

            const res = await sendWithRetry({
              from: FROM,
              to: u.email,
              subject: 'Ganha um GTA VI ao partilhares o teu projeto',
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
                email_type: EMAIL_TYPE,
                resend_id: resendId,
                to_email: u.email,
              })
            }
            sent++
            await supabase.rpc('touch_function_lock', { p_name: 'send-campaign-gta-giveaway' })
          } catch (e) {
            errors.push(`${u.email ?? u.id}: ${String(e)}`)
          }
        }

        if (pageData.users.length < perPage) break
        page++
      }

      return new Response(JSON.stringify({ ok: errors.length === 0, mode: 'real', sent, skipped, entryCount, errors }), {
        headers: { 'Content-Type': 'application/json' },
      })
    } finally {
      await supabase.rpc('release_function_lock', { p_name: 'send-campaign-gta-giveaway' })
    }
  } catch (e) {
    console.error(e)
    return new Response(JSON.stringify({ error: 'Erro interno.', detail: String(e) }), { status: 500 })
  }
})
