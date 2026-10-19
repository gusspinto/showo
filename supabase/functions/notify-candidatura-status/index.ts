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
   Avisa o candidato por email quando o recrutador aceita ou recusa a
   candidatura dele (chamado a partir de /vagas e /pipeline). Recebe só o
   candidatura_id e o novo status, tudo o resto vem da BD com service role.
   Só o recrutador dono da vaga pode disparar isto.
   ══════════════════════════════════════════════════════════════════════════ */

const FROM = 'Showo <hello@showo.pt>'

function buildHtml(vagaTitulo: string, employerName: string, status: 'aceite' | 'recusada') {
  const isAceite = status === 'aceite'
  const title = isAceite ? 'A tua candidatura foi aceite' : 'Resposta à tua candidatura'
  const body = isAceite
    ? `Boas notícias: ${employerName} aceitou a tua candidatura a <strong>${vagaTitulo}</strong>. Vão entrar em contacto contigo diretamente, ou podes já responder a este email.`
    : `${employerName} decidiu não avançar com a tua candidatura a <strong>${vagaTitulo}</strong> desta vez. Não desanimes, continua a candidatar-te a outras vagas no Showo.`
  return `
  <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:40px 20px;">
    <img src="https://showo.pt/icon.png" alt="Showo" width="80" style="display:block;margin:0 auto 28px;" />
    <h2 style="text-align:center;font-size:18px;font-weight:600;color:#1a1a1a;margin:0 0 8px;">${title}</h2>
    <p style="text-align:center;font-size:14px;color:#666;line-height:1.6;margin:0 0 24px;">${body}</p>
    <table border="0" cellspacing="0" cellpadding="0" align="center" style="margin:0 auto;">
      <tr>
        <td align="center" style="background:#4a93f9;border-radius:8px;">
          <a href="https://showo.pt/vagas" target="_blank" style="display:inline-block;padding:12px 36px;font-family:Arial,sans-serif;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;">Ver no Showo</a>
        </td>
      </tr>
    </table>
  </div>`
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const allowed = await checkRateLimit(req, 'notify-candidatura-status', 30)
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

    const { candidatura_id, new_status } = await req.json()
    if (typeof candidatura_id !== 'string' || (new_status !== 'aceite' && new_status !== 'recusada')) {
      return new Response(JSON.stringify({ error: 'invalid_input' }), { status: 400, headers: corsHeaders })
    }

    const { data: candidatura } = await supabase
      .from('candidaturas')
      .select('id, vaga_id, student_id')
      .eq('id', candidatura_id)
      .single()
    if (!candidatura) {
      return new Response(JSON.stringify({ error: 'not_found' }), { status: 404, headers: corsHeaders })
    }

    const { data: vaga } = await supabase
      .from('vagas')
      .select('titulo, recruiter_id, employer_name')
      .eq('id', candidatura.vaga_id)
      .single()

    // Só o recrutador dono da vaga pode disparar o email de resposta.
    if (!vaga || vaga.recruiter_id !== user.id) {
      return new Response(JSON.stringify({ error: 'not_found' }), { status: 404, headers: corsHeaders })
    }

    const { data: candidateAuth } = await supabase.auth.admin.getUserById(candidatura.student_id)
    const candidateEmail = candidateAuth?.user?.email
    if (!candidateEmail) {
      return new Response(JSON.stringify({ ok: true, skipped: 'no_email' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { data: recruiterProfile } = await supabase
      .from('profiles')
      .select('company, full_name')
      .eq('id', vaga.recruiter_id)
      .single()
    const employerName = vaga.employer_name || recruiterProfile?.company || recruiterProfile?.full_name || 'A empresa'

    const resendKey = Deno.env.get('RESEND_API_KEY')
    if (!resendKey) throw new Error('RESEND_API_KEY not configured')

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM,
        to: [candidateEmail],
        subject: new_status === 'aceite' ? `A tua candidatura a ${vaga.titulo} foi aceite` : `Resposta à tua candidatura a ${vaga.titulo}`,
        html: buildHtml(vaga.titulo, employerName, new_status),
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('Resend error:', err)
      return new Response(JSON.stringify({ error: 'email_failed' }), { status: 502, headers: corsHeaders })
    }

    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e) {
    console.error('[notify-candidatura-status]', e)
    return new Response(JSON.stringify({ error: 'internal' }), { status: 500, headers: corsHeaders })
  }
})
