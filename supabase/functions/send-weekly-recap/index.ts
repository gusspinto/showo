import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/* ══════════════════════════════════════════════════════════════════════════
   RECAP SEMANAL POR EMAIL, segundas, 06:00 UTC (reajustado na migração 217)
   ──────────────────────────────────────────────────────────────────────────
   O recap já existia dentro da app, mas só o via quem já lá estava. O email
   é o que traz de volta quem não está, o mesmo princípio que o Duolingo usa
   para as streaks: comunicação recorrente que mostra progresso real e dá um
   próximo passo concreto.

   Quem recebe: Plus, Pro e contas de escola, os mesmos três que a
   pricing page promete (Pricing.jsx, grupo "Mais" do Plus). Só o Grátis
   fica de fora.

   Regras que evitam que isto se torne spam:
     · Sem projetos → não enviamos. Não há progresso nenhum para resumir.
     · Semana parada, mas ativo recentemente → enviamos a variante curta, que
       reconhece a pausa e propõe uma coisa só.
     · Três semanas seguidas sem nada → paramos. Quem desistiu não quer um
       email semanal a dizer-lhe isso.
   Reutiliza o Resend e o padrão de x-cron-secret já usados em
   send-monthly-report e send-reminder-emails. Nada de infraestrutura nova.
   ══════════════════════════════════════════════════════════════════════════ */

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://showo.pt',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const FROM = 'Showo <hello@showo.pt>'
const APP = 'https://showo.pt'

const KIND_LABELS: Record<string, string> = {
  progresso:   'progresso',
  dificuldade: 'dificuldades',
  decisao:     'decisões',
  pesquisa:    'pesquisa',
  ideia:       'ideias',
  resultado:   'resultados',
  nota:        'notas',
}

// Rótulo no singular, para a legenda "X desta semana" por cima da citação.
const KIND_SINGULAR: Record<string, string> = {
  progresso:   'Progresso',
  dificuldade: 'Dificuldade',
  decisao:     'Decisão',
  pesquisa:    'Pesquisa',
  ideia:       'Ideia',
  resultado:   'Resultado',
  nota:        'Nota',
}

// Ordem de valor como prova de substância, não de frequência. Um resultado
// ou uma decisão dizem mais sobre o trabalho do que uma nota solta, mesmo
// que a nota seja o tipo mais comum na semana.
const KIND_PRIORITY = ['resultado', 'decisao', 'dificuldade', 'progresso', 'pesquisa', 'ideia', 'nota']

function esc(v: unknown) {
  return String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
}

function clip(text: string, max: number): string {
  const t = text.trim()
  return t.length > max ? t.slice(0, max).trim() + '…' : t
}

type JournalEntry = { kind: string; content: string | null; project_id: string }

/* Escolhe a entrada mais substancial da semana para citar, não a que soma
   mais vezes. Prioriza o projeto em foco; se não houver nada com texto lá,
   olha para o resto. Dentro de cada prioridade de tipo, fica com a mais
   longa (normalmente a mais desenvolvida). Devolve null quando não há
   nenhuma entrada com texto real; nesse caso o email cai para a versão
   antiga, por contagem. */
function pickHighlight(weekEntries: JournalEntry[], topProjectId: string | undefined): JournalEntry | null {
  const withText = (list: JournalEntry[]) => list.filter(e => (e.content ?? '').trim().length > 0)
  const inFocus = withText(weekEntries.filter(e => e.project_id === topProjectId))
  const pool = inFocus.length ? inFocus : withText(weekEntries)
  if (!pool.length) return null
  for (const kind of KIND_PRIORITY) {
    const match = pool.filter(e => e.kind === kind)
    if (match.length) return match.sort((a, b) => (b.content?.length ?? 0) - (a.content?.length ?? 0))[0]
  }
  return pool[0]
}

/** Segunda-feira 00:00 UTC da semana a que `d` pertence. */
function mondayOf(d: Date): Date {
  const m = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  const dow = (m.getUTCDay() + 6) % 7   // 0 = segunda
  m.setUTCDate(m.getUTCDate() - dow)
  return m
}

function dayLabel(d: Date) {
  return d.toLocaleDateString('pt-PT', { day: 'numeric', month: 'short', timeZone: 'UTC' }).replace('.', '')
}

type Stats = {
  entries: number
  activeDays: number
  kinds: string[]
  streak: number
  projectName: string | null
  daysToDefense: number | null
  tasksDue: number
  highlight: JournalEntry | null
}

/* ── Email ──
   Uma coluna, 480px, sem imagens além do logo: é lido no telemóvel, muitas
   vezes com imagens desligadas. Os números fazem o trabalho visual. */
function buildHtml(firstName: string, weekLabel: string, stats: Stats, quiet: boolean, showPost: boolean) {
  const stat = (value: string, label: string, color = '#eef2f8') => `
    <td style="width:33.33%;padding:14px 8px;background:#0e1729;border:1px solid #1e3050;text-align:center;">
      <div style="font-size:24px;font-weight:700;color:${color};line-height:1;">${esc(value)}</div>
      <div style="font-size:11px;color:#a3b4ce;margin-top:5px;">${esc(label)}</div>
    </td>`

  const headline = quiet
    ? 'A semana passada esteve parada'
    : `${stats.entries} ${stats.entries === 1 ? 'registo' : 'registos'} na semana passada`

  const defenseLine = stats.daysToDefense != null && stats.daysToDefense >= 0
    ? `Faltam <strong style="color:#eef2f8;">${stats.daysToDefense} dias</strong> para a defesa.`
    : ''

  const body = quiet
    ? `Não houve registos entre ${esc(weekLabel)}. Acontece, semanas de testes, semanas cheias.
       ${stats.daysToDefense != null && stats.daysToDefense >= 0
        ? `Ainda assim, faltam <strong style="color:#eef2f8;">${stats.daysToDefense} dias</strong> para a tua defesa.`
        : ''}
       Um registo de duas linhas hoje chega para a semana voltar a contar.`
    : stats.highlight
      // Com citação em destaque no topo, este parágrafo fica só para o
      // prazo da defesa, o resto já foi dito pela citação e pelos números.
      ? defenseLine
      // Sem nenhuma entrada com texto para citar (ex: só registos vazios
      // vindos do GitHub): cai para a versão antiga, por contagem.
      : `${stats.projectName ? `Em <strong style="color:#eef2f8;">${esc(stats.projectName)}</strong>, registaste` : 'Registaste'}
         ${stats.entries} ${stats.entries === 1 ? 'entrada' : 'entradas'} em ${stats.activeDays} ${stats.activeDays === 1 ? 'dia' : 'dias'} diferentes${
          stats.kinds.length ? `, sobretudo ${esc(stats.kinds.map(k => KIND_LABELS[k] ?? k).slice(0, 3).join(', '))}` : ''}.
         ${defenseLine}`

  return `
<div style="background:#03060d;padding:44px 20px;font-family:-apple-system,Helvetica,Arial,sans-serif;">
  <div style="max-width:480px;margin:0 auto;">
    <img src="${APP}/icon.png" alt="Showo" width="30" height="30" style="display:block;margin:0 auto 22px;border:0;" />

    <p style="margin:0 0 6px;color:#a3b4ce;font-size:12px;text-align:center;letter-spacing:0.08em;text-transform:uppercase;font-weight:700;">
      Recap · ${esc(weekLabel)}
    </p>
    <h1 style="margin:0 0 22px;color:#eef2f8;font-size:22px;line-height:1.3;text-align:center;font-weight:700;">
      ${esc(firstName)}, ${headline}
    </h1>
    <table role="presentation" width="100%" style="border-collapse:collapse;margin-bottom:22px;">
      <tr>
        ${stat(String(stats.entries), stats.entries === 1 ? 'registo' : 'registos')}
        ${stat(String(stats.activeDays), stats.activeDays === 1 ? 'dia ativo' : 'dias ativos')}
        ${stat(String(stats.streak), stats.streak === 1 ? 'semana seguida' : 'semanas seguidas', '#f0a500')}
      </tr>
    </table>

    ${!quiet && stats.highlight ? `
    <div style="border-left:3px solid #2a4275;padding:2px 0 2px 14px;margin:0 0 22px;">
      <p style="margin:0 0 3px;color:#93a4c0;font-size:11px;">${esc(KIND_SINGULAR[stats.highlight.kind] ?? stats.highlight.kind)}${stats.projectName ? ` em ${esc(stats.projectName)}` : ''}</p>
      <p style="margin:0;color:#c3cede;font-size:14px;line-height:1.6;">${esc(clip(stats.highlight.content ?? '', 180))}</p>
    </div>
    ` : ''}

    ${body.trim() ? `<p style="margin:0 0 22px;color:#c3cede;font-size:14px;line-height:1.7;">${body}</p>` : ''}

    ${stats.tasksDue > 0 ? `
    <div style="background:rgba(27,120,247,0.08);border:1px solid rgba(27,120,247,0.25);border-radius:10px;padding:14px 16px;margin-bottom:22px;">
      <p style="margin:0;color:#d5deee;font-size:13px;line-height:1.6;">
        Tens <strong style="color:#eef2f8;">${stats.tasksDue}</strong> ${stats.tasksDue === 1 ? 'tarefa de turma por entregar' : 'tarefas de turma por entregar'}.
      </p>
    </div>` : ''}

    ${showPost ? `
    <div style="background:#0e1729;border:1px solid #1e3050;border-radius:10px;padding:16px 18px;margin-bottom:22px;">
      <p style="margin:0 0 4px;color:#eef2f8;font-size:14px;font-weight:700;">Transforma a semana num post</p>
      <p style="margin:0 0 12px;color:#98a9c0;font-size:13px;line-height:1.6;">
        Uma semana com ${stats.entries} registos dá um bom post de progresso para o LinkedIn. O Showo escreve o rascunho, tu ajustas e publicas.
      </p>
      <a href="${APP}/post-semana" style="display:inline-block;background:rgba(255,255,255,0.08);color:#eef2f8;
        text-decoration:none;font-weight:700;font-size:13px;padding:9px 18px;border-radius:8px;border:1px solid #2a4275;">
        Gerar o post
      </a>
    </div>` : ''}

    <div style="text-align:center;margin-bottom:26px;">
      <a href="${APP}/dashboard" style="display:inline-block;background:#1b78f7;color:#fff;
        text-decoration:none;font-weight:700;font-size:14px;padding:13px 30px;border-radius:10px;">
        ${quiet ? 'Registar agora' : 'Ver o recap completo'}
      </a>
    </div>

    <p style="margin:0;text-align:center;font-size:11px;color:#4a607a;line-height:1.7;">
      Recebes isto porque tens o Recap semanal ativo.<br />
      <a href="${APP}/settings" style="color:#4a607a;">Desativar em Definições</a> · showo.pt
    </p>
  </div>
</div>`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const cronSecret = Deno.env.get('CRON_SECRET')
    if (!cronSecret || req.headers.get('x-cron-secret') !== cronSecret) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: corsHeaders })
    }

    const resendKey = Deno.env.get('RESEND_API_KEY')
    if (!resendKey) throw new Error('RESEND_API_KEY not configured')

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const now = new Date()
    const thisMonday = mondayOf(now)
    const lastMonday = new Date(thisMonday); lastMonday.setUTCDate(lastMonday.getUTCDate() - 7)
    const weekLabel = `${dayLabel(lastMonday)} – ${dayLabel(new Date(thisMonday.getTime() - 86400000))}`

    // Plus, Pro e contas de escola, a mesma fronteira que a pricing page
    // promete. Só o Grátis fica de fora. ('build'=Plus, 'launch'=Pro, ver
    // PLAN_ALIASES em src/lib/plans.js.)
    const { data: candidates, error: candErr } = await supabase
      .from('profiles')
      .select('id, full_name, plan, organization_id, weekly_recap_email_sent_at, onboarding_sequence_step, onboarding_opted_out')
      .eq('weekly_recap_email_opt_in', true)
      .or('plan.eq.build,plan.eq.launch,organization_id.not.is.null')

    if (candErr) throw candErr

    const pending = (candidates ?? []).filter(p => {
      if (!(!p.weekly_recap_email_sent_at || new Date(p.weekly_recap_email_sent_at) < thisMonday)) return false
      // Quem está a meio do onboarding já recebe 1 email por dia dessa
      // sequência. Confirmado contra a BD em 2026-10-31 que isto estava a
      // empilhar com o recap semanal no mesmo dia ("parece spam").
      if (p.onboarding_sequence_step != null && p.onboarding_sequence_step < 14 && !p.onboarding_opted_out) return false
      return true
    })
    if (!pending.length) {
      return new Response(JSON.stringify({ ok: true, sent: 0 }), { headers: corsHeaders })
    }

    let sent = 0, skipped = 0
    const errors: string[] = []

    for (const p of pending) {
      try {
        const { data: projects } = await supabase
          .from('projects')
          .select('id, name, defense_date, is_pap, project_type, created_at')
          .eq('user_id', p.id)

        // Sem projetos não há progresso nenhum para resumir.
        if (!projects?.length) { skipped++; continue }

        // 4 semanas de entradas: a última para o recap, as anteriores para a
        // streak e para saber se já vale a pena parar de enviar.
        const since = new Date(thisMonday); since.setUTCDate(since.getUTCDate() - 28)
        const { data: entries } = await supabase
          .from('project_journal_entries')
          .select('kind, content, created_at, project_id')
          .eq('user_id', p.id)
          .gte('created_at', since.toISOString())

        const all = entries ?? []
        const weekEntries = all.filter(e => {
          const t = new Date(e.created_at)
          return t >= lastMonday && t < thisMonday
        })

        // Três semanas seguidas sem nada: deixou de usar. Parar aqui.
        if (weekEntries.length === 0) {
          const twoBack = new Date(lastMonday); twoBack.setUTCDate(twoBack.getUTCDate() - 14)
          const recent = all.filter(e => new Date(e.created_at) >= twoBack)
          if (recent.length === 0) { skipped++; continue }
        }

        // Streak: semanas consecutivas, a contar da última fechada para trás.
        let streak = 0
        for (let w = 0; w < 4; w++) {
          const start = new Date(lastMonday); start.setUTCDate(start.getUTCDate() - w * 7)
          const end = new Date(start); end.setUTCDate(end.getUTCDate() + 7)
          const has = all.some(e => {
            const t = new Date(e.created_at)
            return t >= start && t < end
          })
          if (!has) break
          streak++
        }

        const activeDays = new Set(weekEntries.map(e => String(e.created_at).slice(0, 10))).size
        const kindCounts: Record<string, number> = {}
        weekEntries.forEach(e => { kindCounts[e.kind] = (kindCounts[e.kind] ?? 0) + 1 })
        const kinds = Object.entries(kindCounts).sort((a, b) => b[1] - a[1]).map(([k]) => k)

        // O projeto da semana é aquele onde ele mesmo trabalhou; sem registos,
        // cai para a PAP, que é o que tem prazo.
        const topProjectId = Object.entries(
          weekEntries.reduce((acc: Record<string, number>, e) => {
            acc[e.project_id] = (acc[e.project_id] ?? 0) + 1
            return acc
          }, {})
        ).sort((a, b) => b[1] - a[1])[0]?.[0]
        const focus = projects.find(pr => pr.id === topProjectId)
          ?? projects.find(pr => pr.is_pap || pr.project_type === 'pap')
          ?? projects[0]

        const daysToDefense = focus?.defense_date
          ? Math.ceil((new Date(focus.defense_date + 'T00:00:00Z').getTime() - now.getTime()) / 86400000)
          : null

        // Tarefas de turma por entregar, só relevante para quem tem turmas.
        let tasksDue = 0
        const { data: memberships } = await supabase
          .from('class_members').select('class_id').eq('user_id', p.id)
        const classIds = [...new Set((memberships ?? []).map(m => m.class_id))]
        if (classIds.length) {
          const { data: tasks } = await supabase
            .from('class_tasks').select('id').in('class_id', classIds)
          const taskIds = (tasks ?? []).map(t => t.id)
          if (taskIds.length) {
            const { data: done } = await supabase
              .from('class_task_completions').select('task_id').eq('user_id', p.id).in('task_id', taskIds)
            const doneIds = new Set((done ?? []).map(d => d.task_id))
            tasksDue = taskIds.filter(id => !doneIds.has(id)).length
          }
        }

        const stats: Stats = {
          entries: weekEntries.length,
          activeDays,
          kinds,
          streak,
          projectName: focus?.name ?? null,
          daysToDefense,
          tasksDue,
          highlight: pickHighlight(weekEntries, topProjectId),
        }

        const { data: authUser } = await supabase.auth.admin.getUserById(p.id)
        const email = authUser?.user?.email
        if (!email) { skipped++; continue }

        const firstName = (p.full_name ?? '').trim().split(' ')[0] || 'Olá'
        const quiet = weekEntries.length === 0
        // Semana com substância: vale a pena oferecer o post do LinkedIn.
        const showPost = weekEntries.length >= 3
        const subject = quiet
          ? 'A tua semana no Showo, vamos recomeçar?'
          : `${weekEntries.length} ${weekEntries.length === 1 ? 'registo' : 'registos'} na semana passada${streak > 1 ? ` · ${streak} semanas seguidas` : ''}`

        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: FROM,
            to: email,
            subject,
            html: buildHtml(firstName, weekLabel, stats, quiet, showPost),
          }),
        })
        if (!res.ok) { errors.push(await res.text()); continue }

        // Sem isto, não havia nenhuma prova auditável de um envio ter
        // mesmo acontecido, só o campo em profiles, que uma falha a meio
        // (ex: o update abaixo falhar) também deixava sem rasto nenhum.
        const { id: resendId } = await res.json()
        if (resendId) {
          await supabase.from('email_sends').insert({
            user_id: p.id,
            email_type: 'weekly_recap',
            resend_id: resendId,
            to_email: email,
          })
        }

        await supabase.from('profiles')
          .update({ weekly_recap_email_sent_at: now.toISOString() })
          .eq('id', p.id)
        sent++
      } catch (e) {
        console.error('[send-weekly-recap] failed for', p.id, e)
        errors.push(String(e))
      }
    }

    return new Response(JSON.stringify({ ok: errors.length === 0, sent, skipped, errors }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error(e)
    return new Response(JSON.stringify({ error: 'Erro interno.' }), { status: 500, headers: corsHeaders })
  }
})
