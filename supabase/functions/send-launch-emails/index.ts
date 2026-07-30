import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://showo.pt',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const FROM = 'Showo <hello@showo.pt>'
const SUBJECT = 'O Showo já está disponível 🚀'

function buildHtml() {
  return `
  <div style="background:#03060d;padding:48px 24px;font-family:-apple-system,Helvetica,Arial,sans-serif;">
    <div style="max-width:480px;margin:0 auto;text-align:center;">
      <p style="margin:0 0 28px;color:#1b78f7;font-weight:700;font-size:20px;letter-spacing:-0.01em;">showo</p>
      <h1 style="margin:0 0 16px;color:#eef2f8;font-size:26px;line-height:1.3;">
        Já está disponível.
      </h1>
      <p style="margin:0 0 32px;color:#9fb0c8;font-size:15px;line-height:1.6;">
        O Showo transforma o teu projeto final num portefólio profissional —
        com IA a escrever a tua história, e um link para mostrares a quem importa.
      </p>
      <a href="https://showo.pt" style="display:inline-block;background:#1b78f7;color:#fff;
        text-decoration:none;font-weight:600;font-size:15px;padding:14px 32px;border-radius:10px;">
        Criar a minha página
      </a>
      <p style="margin:32px 0 0;color:#5b6473;font-size:13px;">showo.pt</p>
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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: pending, error } = await supabase
      .from('waitlist_signups')
      .select('id, email')
      .is('notified_at', null)

    if (error) throw error
    if (!pending || pending.length === 0) {
      return new Response(JSON.stringify({ ok: true, sent: 0 }), { headers: corsHeaders })
    }

    const html = buildHtml()
    let sent = 0
    const errors: string[] = []

    // Resend's batch endpoint accepts up to 100 emails per request
    for (let i = 0; i < pending.length; i += 100) {
      const chunk = pending.slice(i, i + 100)
      const payload = chunk.map((row) => ({
        from: FROM,
        to: row.email,
        subject: SUBJECT,
        html,
      }))

      const res = await fetch('https://api.resend.com/emails/batch', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        errors.push(await res.text())
        continue
      }

      const ids = chunk.map((row) => row.id)
      await supabase
        .from('waitlist_signups')
        .update({ notified_at: new Date().toISOString() })
        .in('id', ids)

      sent += chunk.length
    }

    return new Response(JSON.stringify({ ok: errors.length === 0, sent, errors }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error(e)
    return new Response(JSON.stringify({ error: 'Erro interno.' }), { status: 500, headers: corsHeaders })
  }
})
