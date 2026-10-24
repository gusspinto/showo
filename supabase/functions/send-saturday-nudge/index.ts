import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/* ══════════════════════════════════════════════════════════════════════════
   CAMPANHA DE SÁBADO. Pedido do Gustavo em 2026-10-24: aproveitar o dia sem
   aulas/reuniões para empurrar quem tem o projeto por completar a mexer
   nele. Corre todos os sábados.

   Audiência: utilizadores com pelo menos um projeto entry_kind='full', sem
   nenhum registo no diário (project_journal_entries) nas últimas 48h (ou
   nunca registaram nada), e sem marketing_campaign_opted_out. Mesma lista
   de cancelamento que as outras campanhas de marketing (campaign-unsubscribe),
   não é um opt-out novo só para isto.

   Projeto escolhido por utilizador: mesmo critério do pickFocusProject
   (src/lib/focusProject.js): PAP primeiro, depois defesa mais próxima,
   depois mais recente. Para nunca divergir do que a pessoa já vê em foco
   no Dashboard/sidebar.

   saturday_nudge_sent_at evita reenviar ao mesmo utilizador se o cron
   correr mais que uma vez na mesma semana (guarda 6 dias de folga).

   Modo de teste: { test_user_id } no corpo, mesmo padrão das outras.
   ══════════════════════════════════════════════════════════════════════════ */

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

// Mesmo critério do src/lib/focusProject.js, duplicado aqui porque a
// função Deno não tem acesso direto ao bundle do frontend. Mudar um sem
// mudar o outro desalinha o que esta campanha mostra do que a pessoa já
// vê em foco no Dashboard, por isso qualquer alteração ao critério tem de
// ser feita nos dois sítios.
function daysUntil(dateStr: string | null) {
  if (!dateStr) return null
  const d = new Date(dateStr + 'T00:00:00')
  const today = new Date(); today.setHours(0, 0, 0, 0)
  return Math.ceil((d.getTime() - today.getTime()) / 86400000)
}
function pickFocusProject(projects: any[]) {
  if (!projects?.length) return null
  const rank = (p: any) => {
    let r = 0
    if (p.is_pap || p.project_type === 'pap') r += 100
    const d = daysUntil(p.defense_date)
    if (d != null && d >= 0) r += 50 - Math.min(49, d / 4)
    return r
  }
  return [...projects].sort((a, b) => {
    const diff = rank(b) - rank(a)
    if (diff !== 0) return diff
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })[0]
}

// Visual: casa com o resto dos emails do Showo (fundo escuro, mesma
// tipografia), mas com um headline a sério e o número em destaque. O
// rascunho anterior tinha tudo no mesmo cinzento, sem nada a sobressair.
function wrapEmail(bodyRows: string, listUnsubscribeUrl: string) {
  return `
<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="#080808" style="background:#080808;">
  <tr>
    <td align="center" bgcolor="#080808" style="background:#080808;padding:48px 24px;font-family:-apple-system,Helvetica,Arial,sans-serif;">
      <table role="presentation" width="440" border="0" cellpadding="0" cellspacing="0" style="max-width:440px;width:100%;text-align:left;">
        <tr><td style="padding:0 0 28px;"><img src="https://showo.pt/icon.png" alt="Showo" width="32" height="32" style="display:block;border:0;" /></td></tr>
        ${bodyRows}
        <tr><td style="font-size:11px;color:#555555;">Showo &middot; <a href="${APP}" style="color:#555555;">showo.pt</a> &middot; <a href="${esc(listUnsubscribeUrl)}" style="color:#555555;">cancelar estes emails</a></td></tr>
      </table>
    </td>
  </tr>
</table>`
}
function row(html: string) { return `<tr><td style="padding:0 0 16px;">${html}</td></tr>` }
function greeting(firstName?: string) {
  return firstName ? row(`<span style="color:#888888;font-size:16px;line-height:1.4;">${esc(firstName)},</span>`) : ''
}
function headline(html: string) {
  return `<tr><td style="padding:0 0 20px;color:#f0f0f0;font-size:26px;line-height:1.3;font-weight:800;letter-spacing:-0.01em;">${html}</td></tr>`
}
function paragraph(text: string, last = false) {
  return `<tr><td style="padding:0 0 ${last ? '32' : '14'}px;color:#888888;font-size:16px;line-height:1.5;">${text}</td></tr>`
}
function cta(href: string, label: string) {
  return `<tr><td style="padding:0 0 24px;"><a href="${href}" style="display:inline-block;background:#2B7EF5;color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 24px;border-radius:10px;">${esc(label)}</a></td></tr>`
}

// A capa (quando existe) é literalmente "o que os outros veem" de que o
// email fala, por isso mostrá-la aqui, não só descrevê-la por palavras,
// dá à frase do headline uma prova visual imediata. Quando não há capa,
// a secção fica de fora, mostrar um placeholder genérico seria mentir
// sobre o que a pessoa realmente tem.
function coverImage(coverUrl: string | null) {
  if (!coverUrl) return ''
  return `<tr><td style="padding:0 0 20px;"><img src="${esc(coverUrl)}" alt="Capa do projeto" width="440" style="display:block;width:100%;max-width:440px;height:auto;border-radius:12px;border:1px solid #1e1e1e;" /></td></tr>`
}

function buildEmail(firstName: string | undefined, projectName: string, score: number, slug: string, coverUrl: string | null, unsubscribeUrl: string) {
  const subject = `O que é que as pessoas veem quando abrem o "${projectName}"?`
  const html = wrapEmail(
    greeting(firstName) +
    headline(`Hoje não há desculpa de tempo.`) +
    paragraph('Sem aulas, sem reunião, sem o "não tenho tempo" que funciona os outros seis dias da semana.') +
    coverImage(coverUrl) +
    paragraph(`O "${esc(projectName)}" está em <strong style="color:#f0f0f0;">${score}/100</strong>. Esse número é o que falta para o que os outros veem quando abrem o teu projeto estar à altura do que tu realmente fizeste: completar a descrição, pôr uma capa, acrescentar uma secção, escrever o que já fizeste no diário, ou mudar o estilo visual do projeto, cores, tipo de letra, layout dos cartões, que a maior parte das pessoas nem sabe que dá para mexer.`) +
    paragraph('Em menos de 20 minutos, dás um salto a todos esses pontos.', true) +
    cta(`${APP}/editar/${slug}`, 'Melhorar o meu projeto'),
    unsubscribeUrl,
  )
  return { subject, html }
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

    let testUserId: string | null = null
    try {
      const body = await req.json()
      if (typeof body?.test_user_id === 'string') testUserId = body.test_user_id
    } catch { /* corpo vazio é normal na chamada do cron */ }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: projects, error: projErr } = await supabase
      .from('projects')
      .select('id, name, slug, user_id, score, cover_url, is_pap, project_type, defense_date, created_at')
      .eq('entry_kind', 'full')
    if (projErr) throw projErr
    if (!projects?.length) return new Response(JSON.stringify({ ok: true, candidates: 0, sent: 0 }), { headers: corsHeaders })

    const byUser = new Map<string, any[]>()
    for (const p of projects) {
      if (!byUser.has(p.user_id)) byUser.set(p.user_id, [])
      byUser.get(p.user_id)!.push(p)
    }

    const userIds = testUserId ? [testUserId] : [...byUser.keys()]

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, marketing_campaign_opted_out, saturday_nudge_sent_at')
      .in('id', userIds)
    const profileById = new Map((profiles ?? []).map(p => [p.id, p]))

    const cutoff48h = new Date(Date.now() - 48 * 3600000).toISOString()
    const { data: recentEntries } = await supabase
      .from('project_journal_entries')
      .select('user_id')
      .gte('created_at', cutoff48h)
      .in('user_id', userIds)
    const activeUserIds = new Set((recentEntries ?? []).map(e => e.user_id))

    const sixDaysAgo = new Date(Date.now() - 6 * 24 * 3600000).toISOString()
    const candidates = userIds.filter(uid => {
      if (testUserId) return true
      const profile = profileById.get(uid)
      if (!profile || profile.marketing_campaign_opted_out) return false
      if (profile.saturday_nudge_sent_at && profile.saturday_nudge_sent_at > sixDaysAgo) return false
      if (activeUserIds.has(uid)) return false
      return true
    })

    if (candidates.length === 0) {
      return new Response(JSON.stringify({ ok: true, candidates: 0, sent: 0 }), { headers: corsHeaders })
    }

    const emailById = new Map<string, string>()
    {
      let page = 1
      for (;;) {
        const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 })
        if (error) throw error
        for (const u of data.users) if (candidates.includes(u.id) && u.email) emailById.set(u.id, u.email)
        if (data.users.length < 200) break
        page++
      }
    }

    let sent = 0
    const errors: string[] = []

    for (const uid of candidates) {
      try {
        const email = emailById.get(uid)
        if (!email) continue
        const project = pickFocusProject(byUser.get(uid) || [])
        if (!project) continue

        const firstName = profileById.get(uid)?.full_name?.split(' ')[0]
        const score = typeof project.score === 'number' ? project.score : 0
        const unsubSig = await signUserId(uid, cronSecret)
        const unsubscribeUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/campaign-unsubscribe?u=${uid}&sig=${unsubSig}`
        const built = buildEmail(firstName, project.name || 'o teu projeto', score, project.slug, project.cover_url || null, unsubscribeUrl)

        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: FROM,
            to: email,
            subject: built.subject,
            html: built.html,
            // RFC 8058: cabeçalho que os clientes de email (Gmail incluído)
            // usam para mostrar o botão nativo de cancelar subscrição.
            // Ajuda a sinalizar que isto não é spam, mas não garante sair
            // da aba Promoções, essa decisão é do algoritmo do Gmail.
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
            user_id: uid,
            email_type: 'saturday_nudge',
            resend_id: resendId,
            to_email: email,
          })
        }
        sent++

        if (!testUserId) {
          await supabase.from('profiles')
            .update({ saturday_nudge_sent_at: new Date().toISOString() })
            .eq('id', uid)
        }
      } catch (e) {
        console.error('[send-saturday-nudge] failed for', uid, e)
        errors.push(String(e))
      }
    }

    return new Response(JSON.stringify({ ok: errors.length === 0, candidates: candidates.length, sent, errors }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error(e)
    return new Response(JSON.stringify({ error: 'Erro interno.' }), { status: 500, headers: corsHeaders })
  }
})
