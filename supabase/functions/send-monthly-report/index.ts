import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Anthropic from 'npm:@anthropic-ai/sdk@0.36.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const FROM = 'Showo <ola@showo.pt>'

function esc(v: string) {
  return v.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
}

function buildHtml(teacherName: string, monthLabel: string, stats: {
  totalClasses: number, totalStudents: number, submittedThisMonth: number, avgScore: number | null, mostActiveClass: string | null,
}, aiSummary: string) {
  const first = teacherName?.trim()?.split(' ')[0] || 'Professor'
  return `
  <div style="background:#03060d;padding:48px 24px;font-family:-apple-system,Helvetica,Arial,sans-serif;">
    <div style="max-width:520px;margin:0 auto;">
      <img src="https://showo.pt/icon_light.png" alt="Showo" width="32" height="32" style="display:block;margin:0 auto 24px;border:0;" />
      <h1 style="margin:0 0 6px;color:#eef2f8;font-size:22px;line-height:1.3;text-align:center;">
        Resumo de ${esc(monthLabel)}
      </h1>
      <p style="margin:0 0 28px;color:#9fb0c8;font-size:14px;text-align:center;">Olá ${esc(first)}, aqui está a atividade das tuas turmas.</p>

      <table role="presentation" width="100%" style="border-collapse:collapse;margin-bottom:24px;">
        <tr>
          <td style="width:50%;padding:14px;background:#0e1729;border:1px solid #1e3050;border-radius:10px 0 0 0;text-align:center;">
            <div style="font-size:24px;font-weight:700;color:#1b78f7;">${stats.submittedThisMonth}</div>
            <div style="font-size:11px;color:#7d93b0;margin-top:2px;">Projetos submetidos</div>
          </td>
          <td style="width:50%;padding:14px;background:#0e1729;border:1px solid #1e3050;border-left:none;border-radius:0 10px 0 0;text-align:center;">
            <div style="font-size:24px;font-weight:700;color:#f59e0b;">${stats.avgScore ?? '—'}</div>
            <div style="font-size:11px;color:#7d93b0;margin-top:2px;">Score médio</div>
          </td>
        </tr>
        <tr>
          <td style="width:50%;padding:14px;background:#0e1729;border:1px solid #1e3050;border-top:none;border-radius:0 0 0 10px;text-align:center;">
            <div style="font-size:24px;font-weight:700;color:#eef2f8;">${stats.totalStudents}</div>
            <div style="font-size:11px;color:#7d93b0;margin-top:2px;">Alunos</div>
          </td>
          <td style="width:50%;padding:14px;background:#0e1729;border:1px solid #1e3050;border-top:none;border-left:none;border-radius:0 0 10px 0;text-align:center;">
            <div style="font-size:24px;font-weight:700;color:#eef2f8;">${stats.totalClasses}</div>
            <div style="font-size:11px;color:#7d93b0;margin-top:2px;">Turmas</div>
          </td>
        </tr>
      </table>

      <div style="background:rgba(27,120,247,0.08);border:1px solid rgba(27,120,247,0.25);border-radius:10px;padding:18px 20px;margin-bottom:28px;">
        <p style="margin:0;color:#d5deee;font-size:14px;line-height:1.65;">${esc(aiSummary)}</p>
      </div>

      <div style="text-align:center;margin-bottom:28px;">
        <a href="https://showo.pt/dashboard" style="display:inline-block;background:#1b78f7;color:#fff;
          text-decoration:none;font-weight:600;font-size:14px;padding:12px 28px;border-radius:10px;">
          Ver dashboard
        </a>
      </div>

      <p style="margin:0;color:#5b6473;font-size:12px;text-align:center;line-height:1.6;">
        Podes desativar este relatório em Definições, a qualquer momento.<br />showo.pt
      </p>
    </div>
  </div>`
}

async function summarize(stats: {
  totalClasses: number, totalStudents: number, submittedThisMonth: number, avgScore: number | null, mostActiveClass: string | null,
}, monthLabel: string): Promise<string> {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) return `Em ${monthLabel}, as tuas turmas submeteram ${stats.submittedThisMonth} projeto${stats.submittedThisMonth === 1 ? '' : 's'}.`

  const client = new Anthropic({ apiKey })
  const prompt = `Escreve um parágrafo curto (2-3 frases, português de Portugal, tom encorajador e direto, sem markdown) para um professor sobre a atividade das turmas dele no Showo (plataforma de portefólios de projetos finais de curso) em ${monthLabel}.

Dados:
- Turmas: ${stats.totalClasses}
- Alunos: ${stats.totalStudents}
- Projetos submetidos este mês: ${stats.submittedThisMonth}
- Score médio dos projetos: ${stats.avgScore ?? 'sem dados'}
- Turma mais ativa: ${stats.mostActiveClass ?? 'sem dados'}

Se os números forem baixos ou zero, sugere uma ação concreta (ex: lembrar os alunos, criar uma tarefa). Se forem bons, reconhece o progresso. Não inventes números que não foram dados. Devolve só o parágrafo, sem título nem aspas.`

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }],
    })
    const text = (message.content[0] as { type: string; text: string }).text.trim()
    return text || `Em ${monthLabel}, as tuas turmas submeteram ${stats.submittedThisMonth} projeto${stats.submittedThisMonth === 1 ? '' : 's'}.`
  } catch (e) {
    console.error('[send-monthly-report] Anthropic call failed:', e)
    return `Em ${monthLabel}, as tuas turmas submeteram ${stats.submittedThisMonth} projeto${stats.submittedThisMonth === 1 ? '' : 's'}.`
  }
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

    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthLabel = monthStart.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })

    const { data: teachers, error: teachersErr } = await supabase
      .from('profiles')
      .select('id, full_name, monthly_report_sent_at')
      .eq('role', 'professor')
      .eq('monthly_report_opt_in', true)

    if (teachersErr) throw teachersErr

    const pending = (teachers || []).filter(t => !t.monthly_report_sent_at || new Date(t.monthly_report_sent_at) < monthStart)
    if (!pending.length) {
      return new Response(JSON.stringify({ ok: true, sent: 0 }), { headers: corsHeaders })
    }

    let sent = 0
    const errors: string[] = []

    for (const teacher of pending) {
      try {
        const { data: classes } = await supabase.from('classes').select('id, name').eq('teacher_id', teacher.id)
        if (!classes?.length) continue
        const classIds = classes.map(c => c.id)

        const [{ data: members }, { data: cp }] = await Promise.all([
          supabase.from('class_members').select('class_id, user_id').in('class_id', classIds),
          supabase.from('class_projects').select('class_id, project_id').in('class_id', classIds),
        ])

        const totalStudents = new Set((members || []).map(m => m.user_id)).size
        const projectIds = (cp || []).map(r => r.project_id)

        let submittedThisMonth = 0
        let avgScore: number | null = null
        let mostActiveClass: string | null = null

        if (projectIds.length) {
          const { data: projects } = await supabase.from('projects').select('id, score, created_at').in('id', projectIds)
          const projs = projects || []
          const thisMonthProjs = projs.filter(p => new Date(p.created_at) >= monthStart)
          submittedThisMonth = thisMonthProjs.length

          const scored = projs.filter(p => p.score != null)
          avgScore = scored.length ? Math.round(scored.reduce((s, p) => s + p.score, 0) / scored.length) : null

          const countsByClass: Record<string, number> = {}
          ;(cp || []).forEach(r => {
            const isThisMonth = thisMonthProjs.some(p => p.id === r.project_id)
            if (isThisMonth) countsByClass[r.class_id] = (countsByClass[r.class_id] || 0) + 1
          })
          const topClassId = Object.entries(countsByClass).sort((a, b) => b[1] - a[1])[0]?.[0]
          mostActiveClass = topClassId ? (classes.find(c => c.id === topClassId)?.name ?? null) : null
        }

        const stats = { totalClasses: classes.length, totalStudents, submittedThisMonth, avgScore, mostActiveClass }
        const aiSummary = await summarize(stats, monthLabel)

        const { data: authUser } = await supabase.auth.admin.getUserById(teacher.id)
        const email = authUser?.user?.email
        if (!email) continue

        const html = buildHtml(teacher.full_name || '', monthLabel, stats, aiSummary)
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: FROM,
            to: email,
            subject: `O teu resumo de ${monthLabel} no Showo`,
            html,
          }),
        })
        if (!res.ok) { errors.push(await res.text()); continue }

        await supabase.from('profiles').update({ monthly_report_sent_at: now.toISOString() }).eq('id', teacher.id)
        sent++
      } catch (e) {
        console.error('[send-monthly-report] failed for teacher', teacher.id, e)
        errors.push(String(e))
      }
    }

    return new Response(JSON.stringify({ ok: errors.length === 0, sent, errors }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error(e)
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders })
  }
})
