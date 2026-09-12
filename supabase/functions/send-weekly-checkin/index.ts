import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/* ══════════════════════════════════════════════════════════════════════════
   CHECK-IN SEMANAL — para quem não entra há 3+ dias, só quando houve
   visitas reais para mostrar.
   ──────────────────────────────────────────────────────────────────────────
   Diferente do send-weekly-recap (que celebra progresso de quem já usa):
   este é para quem parou. Só dispara quando há um gancho verdadeiro — pelo
   menos uma visita real ao perfil ou a um projeto na última semana (tabela
   notifications, já alimentada por notify-view/notify-profile-view). Sem
   isso, "ninguém te viu" não é motivo nenhum para voltar, e enviar à mesma
   só ensina a ignorar o email.

   NÃO diz "um recrutador" nem "uma empresa" — quase toda a base são alunos
   (confirmado: 20/28 dos que preencheram ocupação são "Aluno / A estudar",
   só 1 é "Empreendedor(a)"), por isso essa alegação seria quase sempre
   falsa. Fica genérico ("X pessoas"), honesto ao que os dados mostram.

   CTA de baixa fricção: quem não tem projeto nenhum vai para /novo, cujo
   primeiro passo já é "carrega um ficheiro" (não uma folha em branco) —
   quem já tem projeto vai direto para ele, a continuar, não a recomeçar.

   ⚠️ Sem cron agendado de propósito — só é chamado manualmente enquanto
   isto está a ser testado. Ver comentário no fundo do ficheiro para como
   agendar, quando/se fizer sentido tornar isto recorrente.
   ══════════════════════════════════════════════════════════════════════════ */

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://showo.pt',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const FROM = 'Showo <hello@showo.pt>'
const APP = 'https://showo.pt'
const DORMANT_DAYS = 3
const RESEND_COOLDOWN_DAYS = 7
const VIEW_TYPES = ['PROFILE_VIEW', 'PROJECT_VIEW', 'COMPANY_VIEW']

function esc(v: unknown) {
  return String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
}

function buildHtml(views: number, opts: { projectName?: string; projectSlug?: string }) {
  const { projectName, projectSlug } = opts
  const line2 = projectSlug
    ? `Não voltas a mexer em <strong style="color:#eef2f8;">${esc(projectName)}</strong> há uns dias — quem passou por lá encontrou o que já tinhas.`
    : `Não encontraram nenhum projeto teu lá — a conta existe, mas está vazia.`
  const ctaHref = projectSlug ? `${APP}/projeto/${projectSlug}` : `${APP}/novo`
  const ctaLabel = projectSlug ? `Continuar ${projectName}` : 'Sobe um ficheiro (PDF, PPT, o que tiveres)'

  return `
<div style="background:#03060d;padding:48px 24px;font-family:-apple-system,Helvetica,Arial,sans-serif;">
  <div style="max-width:440px;margin:0 auto;">
    <img src="https://showo.pt/icon_light.png" alt="Showo" width="28" height="28"
      style="display:block;margin:0 0 32px;border:0;" />

    <p style="margin:0 0 20px;color:#eef2f8;font-size:16px;line-height:1.5;">
      ${views} ${views === 1 ? 'pessoa viu' : 'pessoas viram'} o teu ${projectSlug ? 'projeto' : 'perfil'} no Showo esta semana.
    </p>
    <p style="margin:0 0 32px;color:#9fb0c8;font-size:16px;line-height:1.5;">
      ${line2}
    </p>

    <a href="${ctaHref}" style="display:inline-block;background:#1b78f7;color:#fff;
      text-decoration:none;font-weight:600;font-size:14px;padding:12px 24px;border-radius:10px;">
      ${esc(ctaLabel)}
    </a>

    <p style="margin:40px 0 0;font-size:11px;color:#4a607a;">
      Showo · <a href="${APP}" style="color:#4a607a;">showo.pt</a>
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

    const now = new Date()
    const dormantSince = new Date(now.getTime() - DORMANT_DAYS * 86400000)
    const cooldownSince = new Date(now.getTime() - RESEND_COOLDOWN_DAYS * 86400000)
    const weekAgo = new Date(now.getTime() - 7 * 86400000)

    // auth.users não está exposto via PostgREST — vai-se buscar pela Admin
    // API, paginada (100 users hoje cabem numa página só, mas não assumir).
    const lastSignIn = new Map<string, string | null>()
    const emailById = new Map<string, string>()
    let page = 1
    for (;;) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 })
      if (error) throw error
      for (const u of data.users) {
        lastSignIn.set(u.id, u.last_sign_in_at)
        if (u.email) emailById.set(u.id, u.email)
      }
      if (data.users.length < 200) break
      page++
    }

    const { data: profiles, error: profErr } = await supabase
      .from('profiles')
      .select('id, full_name, role, weekly_checkin_email_sent_at')
      .neq('role', 'professor')

    if (profErr) throw profErr

    const dormant = (profiles ?? []).filter(p => {
      const last = lastSignIn.get(p.id)
      const isDormant = !last || new Date(last) < dormantSince
      const notCoolingDown = !p.weekly_checkin_email_sent_at || new Date(p.weekly_checkin_email_sent_at) < cooldownSince
      return isDormant && notCoolingDown && emailById.has(p.id)
    })

    let sent = 0, skipped = 0
    const errors: string[] = []

    for (const p of dormant) {
      try {
        const { count: views } = await supabase
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', p.id)
          .in('type', VIEW_TYPES)
          .gte('created_at', weekAgo.toISOString())

        // Sem visita nenhuma, não há gancho — enviar à mesma seria só ruído.
        if (!views) { skipped++; continue }

        const { data: projects } = await supabase
          .from('projects')
          .select('name, slug, created_at')
          .eq('user_id', p.id)
          .order('created_at', { ascending: true })
          .limit(1)

        const focus = projects?.[0]
        const email = emailById.get(p.id)!

        const subject = focus
          ? `${views} ${views === 1 ? 'pessoa viu' : 'pessoas viram'} o teu projeto esta semana`
          : `${views} ${views === 1 ? 'pessoa viu' : 'pessoas viram'} o teu perfil esta semana`

        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: FROM,
            to: email,
            subject,
            html: buildHtml(views, focus ? { projectName: focus.name, projectSlug: focus.slug } : {}),
          }),
        })
        if (!res.ok) { errors.push(await res.text()); continue }

        await supabase.from('profiles')
          .update({ weekly_checkin_email_sent_at: now.toISOString() })
          .eq('id', p.id)
        sent++
      } catch (e) {
        console.error('[send-weekly-checkin] failed for', p.id, e)
        errors.push(String(e))
      }
    }

    return new Response(JSON.stringify({ ok: errors.length === 0, candidates: dormant.length, sent, skipped, errors }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error(e)
    return new Response(JSON.stringify({ error: 'Erro interno.' }), { status: 500, headers: corsHeaders })
  }
})

/* ── Para agendar (só depois de decidirmos manter isto) ──
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
SELECT cron.schedule(
  'send-weekly-checkin',
  '0 9 * * 1',
  $$ select net.http_post(
    url := 'https://kctdlnqiomxypvesdify.supabase.co/functions/v1/send-weekly-checkin',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', 'REPLACE_WITH_CRON_SECRET'),
    body := '{}'::jsonb
  ); $$
);
*/
