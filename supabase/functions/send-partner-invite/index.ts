import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { checkRateLimit, getAuthUser } from '../_shared/rateLimit.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const FROM = 'Showo <ola@showo.pt>'

function esc(v: string) {
  return v.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
}

function buildHtml(companyName: string, teacherName: string, schoolName: string | null, inviteUrl: string) {
  const from = teacherName ? esc(teacherName) : 'Um professor'
  const school = schoolName ? ` (${esc(schoolName)})` : ''
  return `
  <div style="background:#03060d;padding:48px 24px;font-family:-apple-system,Helvetica,Arial,sans-serif;">
    <div style="max-width:480px;margin:0 auto;text-align:center;">
      <p style="margin:0 0 28px;color:#1b78f7;font-weight:700;font-size:20px;letter-spacing:-0.01em;">showo</p>
      <h1 style="margin:0 0 16px;color:#eef2f8;font-size:24px;line-height:1.3;">
        ${from}${school} adicionou a ${esc(companyName)} como parceira de estágio
      </h1>
      <p style="margin:0 0 32px;color:#9fb0c8;font-size:15px;line-height:1.6;">
        No Showo, os alunos constroem um portefólio com os projetos finais do curso.
        Crie uma conta gratuita para ver os alunos que o professor já assinalou como
        interessados em estagiar convosco.
      </p>
      <a href="${esc(inviteUrl)}" style="display:inline-block;background:#1b78f7;color:#fff;
        text-decoration:none;font-weight:600;font-size:15px;padding:14px 32px;border-radius:10px;">
        Ver alunos interessados
      </a>
      <p style="margin:32px 0 0;color:#5b6473;font-size:13px;">showo.pt</p>
    </div>
  </div>`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const user = await getAuthUser(req)
  if (!user) {
    return new Response(JSON.stringify({ error: 'Autenticação necessária.' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const allowed = await checkRateLimit(req, 'send-partner-invite', 20)
  if (!allowed) {
    return new Response(JSON.stringify({ error: 'Demasiados pedidos. Tenta mais tarde.' }), {
      status: 429,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const { company_id, invite_url } = await req.json()
    if (!company_id || !invite_url) {
      return new Response(JSON.stringify({ error: 'company_id e invite_url são obrigatórios.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const resendKey = Deno.env.get('RESEND_API_KEY')
    if (!resendKey) throw new Error('RESEND_API_KEY not configured')

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // service_role bypasses RLS, so ownership is checked explicitly here —
    // this is the only thing standing between "any logged-in user" and
    // "spam an arbitrary contact_email with a working invite link".
    const { data: company, error: companyErr } = await supabase
      .from('partner_companies')
      .select('id, name, teacher_id, contact_email')
      .eq('id', company_id)
      .single()

    if (companyErr || !company) {
      return new Response(JSON.stringify({ error: 'Empresa não encontrada.' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    if (company.teacher_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Não autorizado.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    if (!company.contact_email) {
      return new Response(JSON.stringify({ error: 'Esta empresa não tem email de contacto definido.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: teacherProfile } = await supabase
      .from('profiles')
      .select('full_name, school')
      .eq('id', user.id)
      .single()

    const html = buildHtml(company.name, teacherProfile?.full_name ?? '', teacherProfile?.school ?? null, invite_url)

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM,
        to: company.contact_email,
        subject: `${teacherProfile?.full_name ?? 'Um professor'} adicionou-vos como parceiros de estágio no Showo`,
        html,
      }),
    })

    if (!res.ok) {
      const text = await res.text()
      return new Response(JSON.stringify({ error: 'Falha ao enviar email.', details: text }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    await supabase
      .from('partner_companies')
      .update({ invited_at: new Date().toISOString() })
      .eq('id', company_id)

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error(e)
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: corsHeaders,
    })
  }
})
