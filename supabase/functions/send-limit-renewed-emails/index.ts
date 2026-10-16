import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/* ══════════════════════════════════════════════════════════════════════════
   Avisa, no início de cada mês, quem esgotou algum limite de IA no mês
   anterior e pode ter saído sem saber que voltaria a ter utilizações.
   Corre via pg_cron no dia 1, logo depois da meia-noite (dá tempo ao mês
   anterior ficar completo). O limite em si renova sozinho (é por mês de
   calendário em ai_usage, sem job nenhum a fazer reset) — isto só avisa
   quem pode ter desistido a pensar que tinha acabado para sempre.

   O mapa de limites aqui tem de ficar sincronizado com check_ai_limit()
   (Postgres) e PLANS em src/lib/plans.js — os três já duplicam os mesmos
   números, este é só mais um sítio com a mesma verdade.
   ══════════════════════════════════════════════════════════════════════════ */

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://showo.pt',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const FROM = 'Showo <hello@showo.pt>'
const EMAIL_TYPE = 'limit_renewed'

const LIMITS: Record<string, Record<string, number>> = {
  free:       { createProject: 3,  interviewProject: 3,  coach: 10,  defense: 1,  defenseTraining: 0,  diaryReport: 1,  narrative: 1,  analyzeProject: 1,  coverLetter: 0,  exportPptx: 3 },
  school:     { createProject: 15, interviewProject: 15, coach: 150, defense: 15, defenseTraining: 10, diaryReport: 5,  narrative: 15, analyzeProject: 15, coverLetter: 0,  exportPptx: 20 },
  school_pro: { createProject: 30, interviewProject: 30, coach: 300, defense: 25, defenseTraining: 25, diaryReport: 10, narrative: 25, analyzeProject: 25, coverLetter: 25, exportPptx: 999999 },
  plus:       { createProject: 15, interviewProject: 15, coach: 100, defense: 10, defenseTraining: 5,  diaryReport: 5,  narrative: 10, analyzeProject: 10, coverLetter: 5,  exportPptx: 15 },
  pro:        { createProject: 30, interviewProject: 30, coach: 300, defense: 25, defenseTraining: 25, diaryReport: 10, narrative: 25, analyzeProject: 25, coverLetter: 25, exportPptx: 999999 },
}

const FEATURE_LABELS_PT: Record<string, string> = {
  createProject: 'Criar projeto com IA',
  interviewProject: 'Entrevista guiada',
  coach: 'Coach IA',
  defense: 'Defesa IA',
  diaryReport: 'Relatório do projeto',
  narrative: 'Narrativa IA',
  analyzeProject: 'Análise de projeto',
  defenseTraining: 'Treino de defesa',
  coverLetter: 'Carta de apresentação',
  exportPptx: 'Exportar PowerPoint',
}

function resolvePlan(profile: { plan: string | null; role: string | null; organization_id: string | null }, orgPlan: string | null): string {
  let plan = profile.plan ?? 'free'
  if (plan === 'build') plan = 'plus'
  if (plan === 'launch') plan = 'pro'
  if (profile.role === 'professor') return 'pro'
  if (profile.organization_id) {
    let op = orgPlan ?? 'school'
    if (op === 'launch') op = 'pro'
    if (op === 'build') op = 'plus'
    return op === 'pro' ? 'school_pro' : 'school'
  }
  return plan
}

function buildHtml(firstName: string, features: string[]) {
  const list = features.map(f => FEATURE_LABELS_PT[f] ?? f).join(', ')
  return `
<div style="background:#03060d;padding:48px 24px;font-family:-apple-system,Helvetica,Arial,sans-serif;">
  <div style="max-width:480px;margin:0 auto;">
    <img src="https://showo.pt/icon.png" alt="Showo" width="32" height="32" style="display:block;margin:0 auto 24px;border:0;" />
    <h1 style="margin:0 0 8px;color:#eef2f8;font-size:20px;line-height:1.3;text-align:center;">As tuas utilizações de IA renovaram</h1>
    <p style="margin:0 0 28px;color:#9fb0c8;font-size:14px;text-align:center;line-height:1.6;">
      Olá${firstName ? `, ${firstName}` : ''}. No mês passado esgotaste ${list}. Isso não é permanente, o limite renova sempre no início do mês, e já está de volta.
    </p>
    <div style="text-align:center;margin-bottom:28px;">
      <a href="https://showo.pt/dashboard" style="display:inline-block;background:#1b78f7;color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 28px;border-radius:10px;">Voltar ao Showo</a>
    </div>
    <p style="margin:0;text-align:center;font-size:11px;color:#4a607a;">
      Showo · <a href="https://showo.pt" style="color:#4a607a;">showo.pt</a><br/>
      Não queres receber este tipo de aviso? Responde a este email a dizer.
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

    // Corre no dia 1 — "mês passado" é o mês civil anterior a hoje.
    const now = new Date()
    const lastMonthDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1))
    const lastMonth = `${lastMonthDate.getUTCFullYear()}-${String(lastMonthDate.getUTCMonth() + 1).padStart(2, '0')}`
    const thisMonth = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`

    const { data: usageRows, error: usageErr } = await supabase
      .from('ai_usage')
      .select('user_id, feature, used')
      .eq('month', lastMonth)
      .gt('used', 0)
    if (usageErr) throw usageErr
    if (!usageRows?.length) {
      return new Response(JSON.stringify({ ok: true, candidates: 0, sent: 0 }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const userIds = [...new Set(usageRows.map(r => r.user_id))]
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, plan, role, organization_id')
      .in('id', userIds)
    const profileMap = new Map((profiles ?? []).map(p => [p.id, p]))

    const orgIds = [...new Set((profiles ?? []).map(p => p.organization_id).filter(Boolean))]
    const { data: orgs } = orgIds.length
      ? await supabase.from('organizations').select('id, plan').in('id', orgIds)
      : { data: [] }
    const orgPlanMap = new Map((orgs ?? []).map(o => [o.id, o.plan]))

    // Por utilizador, as features onde used >= limit no mês passado.
    const maxedByUser = new Map<string, string[]>()
    for (const row of usageRows) {
      const profile = profileMap.get(row.user_id)
      if (!profile) continue
      const plan = resolvePlan(profile, orgPlanMap.get(profile.organization_id ?? '') ?? null)
      const limit = LIMITS[plan]?.[row.feature]
      if (limit === undefined || limit >= 999999) continue
      if (row.used >= limit) {
        const list = maxedByUser.get(row.user_id) ?? []
        list.push(row.feature)
        maxedByUser.set(row.user_id, list)
      }
    }

    let sent = 0
    const candidates = maxedByUser.size

    for (const [userId, features] of maxedByUser) {
      // Dedupe — nunca manda duas vezes o mesmo aviso no mesmo mês, mesmo
      // que o cron corra outra vez por engano.
      const { data: already } = await supabase
        .from('email_sends')
        .select('id')
        .eq('user_id', userId)
        .eq('email_type', EMAIL_TYPE)
        .gte('created_at', `${thisMonth}-01T00:00:00Z`)
        .limit(1)
      if (already && already.length > 0) continue

      const { data: authRes } = await supabase.auth.admin.getUserById(userId)
      const email = authRes?.user?.email
      if (!email) continue

      const profile = profileMap.get(userId)
      const firstName = profile?.full_name?.split(' ')[0] || ''

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: FROM,
          to: email,
          subject: 'As tuas utilizações de IA renovaram',
          html: buildHtml(firstName, features),
        }),
      })

      if (!res.ok) {
        console.error('[send-limit-renewed-emails] Resend error for', userId, await res.text())
        continue
      }

      const resendData = await res.json().catch(() => null)
      await supabase.from('email_sends').insert({
        user_id: userId,
        email_type: EMAIL_TYPE,
        resend_id: resendData?.id ?? null,
        to_email: email,
      })
      sent++
    }

    return new Response(JSON.stringify({ ok: true, lastMonth, candidates, sent }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('[send-limit-renewed-emails]', e)
    return new Response(JSON.stringify({ error: 'internal' }), { status: 500, headers: corsHeaders })
  }
})
