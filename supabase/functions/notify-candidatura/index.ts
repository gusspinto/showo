import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ALLOWED_ORIGINS = ['https://showo.pt', 'https://www.showo.pt', 'https://showo.vercel.app']

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') ?? ''
  const allow = ALLOWED_ORIGINS.includes(origin) || origin.startsWith('http://localhost')
    ? origin
    : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
}

async function checkRateLimit(req: Request, fnName: string, limit = 20): Promise<boolean> {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )
  const { data, error } = await supabase.rpc('check_fn_rate_limit', { p_key: `${ip}:${fnName}`, p_limit: limit })
  if (error) {
    console.error('[rateLimit] check failed:', error.message)
    return false
  }
  return data === true
}

/* ══════════════════════════════════════════════════════════════════════════
   Avisa por email quem publicou a vaga (e sempre o Gustavo em CC) quando
   alguém se candidata. Recebe só o candidatura_id — tudo o resto (vaga,
   recrutador, candidato) vem da BD com service role, nunca do cliente, para
   não dar a ninguém forma de mandar emails falsos sobre candidaturas que
   não existem ou não são delas.
   ══════════════════════════════════════════════════════════════════════════ */

const FROM = 'Showo <hello@showo.pt>'
const GUSTAVO_EMAIL = 'guspintobusiness@gmail.com'

function buildHtml(vagaTitulo: string, candidateName: string, candidateEmail: string | null, message: string | null) {
  return `
  <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:40px 20px;">
    <img src="https://showo.pt/icon.png" alt="Showo" width="80" style="display:block;margin:0 auto 28px;" />
    <h2 style="text-align:center;font-size:18px;font-weight:600;color:#1a1a1a;margin:0 0 8px;">Nova candidatura</h2>
    <p style="text-align:center;font-size:14px;color:#666;line-height:1.6;margin:0 0 4px;">${candidateName} candidatou-se à vaga <strong>${vagaTitulo}</strong>.</p>
    ${candidateEmail ? `<p style="text-align:center;font-size:13px;color:#4a93f9;margin:0 0 20px;"><a href="mailto:${candidateEmail}" style="color:#4a93f9;text-decoration:none;">${candidateEmail}</a></p>` : '<div style="margin:0 0 16px;"></div>'}
    ${message ? `<div style="background:#f6f6f8;border-radius:8px;padding:16px 18px;margin:0 0 24px;font-size:13px;color:#333;line-height:1.6;white-space:pre-wrap;">${message}</div>` : ''}
    <table border="0" cellspacing="0" cellpadding="0" align="center" style="margin:0 auto;">
      <tr>
        <td align="center" style="background:#4a93f9;border-radius:8px;">
          <a href="https://showo.pt/vagas" target="_blank" style="display:inline-block;padding:12px 36px;font-family:Arial,sans-serif;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;">Ver candidatura</a>
        </td>
      </tr>
    </table>
    ${candidateEmail ? `<p style="text-align:center;font-size:11px;color:#aaa;margin:20px 0 0;">Responde a este email para falares diretamente com ${candidateName}.</p>` : ''}
  </div>`
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const allowed = await checkRateLimit(req, 'notify-candidatura', 20)
  if (!allowed) {
    return new Response(JSON.stringify({ ok: false }), { status: 429, headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: corsHeaders })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )
    const { data: { user } } = await userClient.auth.getUser()
    if (!user) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: corsHeaders })
    }

    const { candidatura_id } = await req.json()
    if (typeof candidatura_id !== 'string') {
      return new Response(JSON.stringify({ error: 'missing candidatura_id' }), { status: 400, headers: corsHeaders })
    }

    const { data: candidatura } = await supabase
      .from('candidaturas')
      .select('id, vaga_id, student_id, message')
      .eq('id', candidatura_id)
      .single()

    // Só quem fez a candidatura pode disparar o email sobre ela — evita que
    // alguém mande IDs ao calhas para gerar notificações falsas.
    if (!candidatura || candidatura.student_id !== user.id) {
      return new Response(JSON.stringify({ error: 'not_found' }), { status: 404, headers: corsHeaders })
    }

    const { data: vaga } = await supabase
      .from('vagas')
      .select('titulo, recruiter_id')
      .eq('id', candidatura.vaga_id)
      .single()
    if (!vaga) {
      return new Response(JSON.stringify({ error: 'vaga_not_found' }), { status: 404, headers: corsHeaders })
    }

    const { data: candidateProfile } = await supabase
      .from('profiles')
      .select('full_name, username')
      .eq('id', candidatura.student_id)
      .single()
    const candidateName = candidateProfile?.full_name || candidateProfile?.username || 'Alguém no Showo'

    const { data: candidateAuth } = await supabase.auth.admin.getUserById(candidatura.student_id)
    const candidateEmail = candidateAuth?.user?.email ?? null

    const { data: recruiterAuth } = await supabase.auth.admin.getUserById(vaga.recruiter_id)
    const recruiterEmail = recruiterAuth?.user?.email

    const resendKey = Deno.env.get('RESEND_API_KEY')
    if (!resendKey) throw new Error('RESEND_API_KEY not configured')

    // Recrutador em "to" quando existe email real e é diferente do Gustavo
    // (a conta sistémica das vagas importadas pode não ter email útil, ou
    // pode já ser literalmente ele); nesses casos manda só para ele, sem
    // duplicar o endereço em to+cc.
    const to = recruiterEmail && recruiterEmail !== GUSTAVO_EMAIL ? [recruiterEmail] : [GUSTAVO_EMAIL]
    const cc = recruiterEmail && recruiterEmail !== GUSTAVO_EMAIL ? [GUSTAVO_EMAIL] : undefined

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM,
        to,
        cc,
        reply_to: candidateEmail ?? undefined,
        subject: `Nova candidatura: ${vaga.titulo}`,
        html: buildHtml(vaga.titulo, candidateName, candidateEmail, candidatura.message),
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('Resend error:', err)
      return new Response(JSON.stringify({ error: 'email_failed' }), { status: 502, headers: corsHeaders })
    }

    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e) {
    console.error('[notify-candidatura]', e)
    return new Response(JSON.stringify({ error: 'internal' }), { status: 500, headers: corsHeaders })
  }
})
