import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/* ══════════════════════════════════════════════════════════════════════════
   VIGIA das sequências de email por cron. Criado 2026-11-12 depois de a
   send-onboarding-sequence ter ficado parada 9 dias sem ninguém notar
   (verify_jwt=true a bloquear a chamada do cron ao nível da plataforma,
   antes de o código correr; pg_cron reportava "succeeded" na mesma, isso
   só confirma o POST, não a execução real). Pedido explícito do Gustavo:
   garantir que isto nunca mais acontece, nesta ou em qualquer outra
   sequência, e ser avisado se acontecer.

   Correndo uma vez por dia, verifica se cada sequência monitorizada teve
   pelo menos um envio dentro da janela esperada. Se alguma estiver calada
   para além do esperado, manda um email de alerta para ADMIN_EMAILS (o
   mesmo padrão já usado em pick-project-candidates).

   Isto NÃO prova que a lógica de negócio está certa (uma sequência pode
   estar a correr e a enviar 0 emails legitimamente, porque não há
   ninguém elegível nessa semana), só prova que a função está viva e a
   gravar linhas em email_sends. É deliberadamente simples: não exige
   alterar nenhuma das outras ~15 edge functions de email, só lê o que
   elas já escrevem em email_sends.
   ══════════════════════════════════════════════════════════════════════════ */

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://showo.pt',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const FROM = 'Showo <hello@showo.pt>'
// gustavo@showo.pt fez bounce no teste ao vivo desta function (2026-11-12,
// confirmado via Resend list-emails: status "bounced"), por isso o email
// pessoal do Gustavo substitui-o aqui. Nunca assumir que um endereço
// "óbvio" chega a sério sem confirmar entrega real.
const ADMIN_EMAILS = ['brunosilva.smd@gmail.com', 'guspintobusiness@gmail.com']

type Monitor = {
  label: string
  // 'like' faz match com LIKE 'prefix%' (para agrupar onboarding_day1..14),
  // 'eq' faz match exato.
  match: { type: 'like' | 'eq'; value: string }
  maxGapHours: number
}

// Janelas generosas (2-3x o período do cron) para não disparar falsos
// alarmes por uma semana legitimamente sem ninguém elegível.
const MONITORS: Monitor[] = [
  { label: 'Onboarding (qualquer dia 1-14)', match: { type: 'like', value: 'onboarding_day%' }, maxGapHours: 36 },
  { label: 'Weekly check-in', match: { type: 'eq', value: 'weekly_checkin' }, maxGapHours: 24 * 10 },
  { label: 'Weekly recap', match: { type: 'eq', value: 'weekly_recap' }, maxGapHours: 24 * 10 },
  { label: 'Project activation nudge', match: { type: 'eq', value: 'project_activation_nudge' }, maxGapHours: 24 * 6 },
  { label: 'Saturday nudge', match: { type: 'eq', value: 'saturday_nudge' }, maxGapHours: 24 * 10 },
  { label: 'Diary return nudge', match: { type: 'eq', value: 'diary_return_nudge' }, maxGapHours: 24 * 10 },
  { label: 'Coach return nudge', match: { type: 'eq', value: 'coach_return_nudge' }, maxGapHours: 24 * 10 },
  { label: 'Limit return nudge', match: { type: 'eq', value: 'limit_return_nudge' }, maxGapHours: 24 * 10 },
  { label: 'Featured notification', match: { type: 'eq', value: 'featured_notification' }, maxGapHours: 24 * 10 },
  { label: 'Continuous cycle', match: { type: 'like', value: 'continuous_cycle_%' }, maxGapHours: 24 * 10 },
]

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

    const now = Date.now()
    const problems: { label: string; lastSent: string | null; gapHours: number | null }[] = []

    for (const m of MONITORS) {
      let query = supabase.from('email_sends').select('created_at').order('created_at', { ascending: false }).limit(1)
      query = m.match.type === 'like' ? query.like('email_type', m.match.value) : query.eq('email_type', m.match.value)
      const { data, error } = await query
      if (error) throw error

      const lastSent = data?.[0]?.created_at ?? null
      const gapHours = lastSent ? (now - new Date(lastSent).getTime()) / 3600000 : null

      if (gapHours === null || gapHours > m.maxGapHours) {
        problems.push({ label: m.label, lastSent, gapHours: gapHours !== null ? Math.round(gapHours) : null })
      }
    }

    if (problems.length > 0) {
      const rows = problems.map(p =>
        `<tr><td style="padding:6px 10px;border-bottom:1px solid #333;color:#f0f0f0;">${p.label}</td><td style="padding:6px 10px;border-bottom:1px solid #333;color:#888;">${p.lastSent ? `há ${p.gapHours}h (${p.lastSent})` : 'nunca'}</td></tr>`
      ).join('')
      const html = `
<table role="presentation" width="100%" bgcolor="#080808" style="background:#080808;"><tr><td style="padding:32px;font-family:-apple-system,Helvetica,Arial,sans-serif;">
  <h2 style="color:#F5493B;margin:0 0 16px;">Sequências de email paradas</h2>
  <p style="color:#888;margin:0 0 16px;">O vigia (check-cron-health) encontrou ${problems.length} sequência(s) sem envios dentro da janela esperada. Confirmar se é falta de gente elegível ou um bug (verify_jwt, crash, etc.).</p>
  <table role="presentation" width="100%" style="border-collapse:collapse;"><tr><td style="padding:6px 10px;color:#555;font-size:12px;">SEQUÊNCIA</td><td style="padding:6px 10px;color:#555;font-size:12px;">ÚLTIMO ENVIO</td></tr>${rows}</table>
</td></tr></table>`

      for (const to of ADMIN_EMAILS) {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ from: FROM, to, subject: `Showo: ${problems.length} sequência(s) de email parada(s)`, html }),
        })
      }
    }

    return new Response(JSON.stringify({ ok: true, checked: MONITORS.length, problems }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error(e)
    return new Response(JSON.stringify({ error: 'Erro interno.' }), { status: 500, headers: corsHeaders })
  }
})
