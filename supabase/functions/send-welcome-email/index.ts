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
  <div style="font-family:Arial,sans-serif;max-width:460px;margin:0 auto;padding:40px 20px;">
    <img src="https://showo.pt/icon.png" alt="Showo" width="100" style="display:block;margin:0 auto 32px;" />
    <h2 style="text-align:center;font-size:18px;font-weight:600;color:#1a1a1a;margin:0 0 8px;">Ola, ${displayName}!</h2>
    <p style="text-align:center;font-size:14px;color:#666;line-height:1.6;margin:0 0 28px;">A tua conta no Showo esta criada. Comeca a organizar o teu projeto e a mostrar o teu trabalho.</p>
    <table border="0" cellspacing="0" cellpadding="0" align="center" style="margin:0 auto 28px;">
      <tr>
        <td align="center" style="background:#4a93f9;border-radius:8px;">
          <a href="https://showo.pt/dashboard" target="_blank" style="display:inline-block;padding:12px 36px;font-family:Arial,sans-serif;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;">Abrir o Showo</a>
        </td>
      </tr>
    </table>
    <p style="text-align:center;font-size:11px;color:#aaa;margin:0;">Precisas de ajuda? Responde a este email.</p>
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
