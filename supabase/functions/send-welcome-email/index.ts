import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const FROM = 'Showo <hello@showo.pt>'
const SUBJECT = 'Bem-vindo ao Showo 🎓'

function buildHtml(name: string) {
  const displayName = name || 'futuro profissional'
  return `
  <div style="background:#03060d;padding:48px 24px;font-family:-apple-system,Helvetica,Arial,sans-serif;">
    <div style="max-width:480px;margin:0 auto;">
      <p style="margin:0 0 32px;color:#1b78f7;font-weight:700;font-size:20px;letter-spacing:-0.01em;text-align:center;">showo</p>

      <h1 style="margin:0 0 8px;color:#eef2f8;font-size:24px;line-height:1.3;">
        Olá, ${displayName} 👋
      </h1>
      <p style="margin:0 0 24px;color:#9fb0c8;font-size:15px;line-height:1.7;">
        A tua conta no Showo está criada. A partir de agora, tens um companheiro para te ajudar a desenvolver e apresentar o teu projeto final.
      </p>

      <div style="background:rgba(27,120,247,0.06);border:1px solid rgba(27,120,247,0.12);border-radius:12px;padding:20px 24px;margin:0 0 28px;">
        <p style="margin:0 0 12px;color:#eef2f8;font-size:14px;font-weight:600;">O que podes fazer agora:</p>
        <table cellpadding="0" cellspacing="0" border="0" style="width:100%;">
          <tr>
            <td style="padding:6px 0;color:#9fb0c8;font-size:14px;line-height:1.5;">
              <span style="color:#1b78f7;margin-right:8px;">→</span> Criar o teu projeto e organizar o progresso
            </td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#9fb0c8;font-size:14px;line-height:1.5;">
              <span style="color:#1b78f7;margin-right:8px;">→</span> Usar a IA para melhorar a comunicação do teu trabalho
            </td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#9fb0c8;font-size:14px;line-height:1.5;">
              <span style="color:#1b78f7;margin-right:8px;">→</span> Gerar um portefólio profissional com um link partilhável
            </td>
          </tr>
        </table>
      </div>

      <div style="text-align:center;margin:0 0 32px;">
        <a href="https://showo.pt" style="display:inline-block;background:#1b78f7;color:#fff;
          text-decoration:none;font-weight:600;font-size:15px;padding:14px 36px;border-radius:10px;">
          Abrir o Showo
        </a>
      </div>

      <p style="margin:0;color:#5b6473;font-size:13px;text-align:center;">
        Precisas de ajuda? Responde a este email.
      </p>
      <p style="margin:16px 0 0;color:#3a4250;font-size:12px;text-align:center;">showo.pt</p>
    </div>
  </div>`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: corsHeaders })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user } } = await userClient.auth.getUser()
    if (!user) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: corsHeaders })
    }

    const resendKey = Deno.env.get('RESEND_API_KEY')
    if (!resendKey) throw new Error('RESEND_API_KEY not configured')

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, welcome_email_sent')
      .eq('id', user.id)
      .single()

    if (profile?.welcome_email_sent) {
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const html = buildHtml(profile?.full_name || '')

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM,
        to: user.email,
        subject: SUBJECT,
        html,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('Resend error:', err)
      return new Response(JSON.stringify({ error: 'email_failed' }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    await supabase
      .from('profiles')
      .update({ welcome_email_sent: true })
      .eq('id', user.id)

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error(e)
    return new Response(JSON.stringify({ error: 'internal' }), {
      status: 500, headers: corsHeaders,
    })
  }
})
