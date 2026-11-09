import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/* ══════════════════════════════════════════════════════════════════════════
   AVISO DE ATIVAÇÃO PÓS-CRIAÇÃO. Decidido depois da análise de funil desta
   sessão: 78% das pessoas criam o projeto e nunca voltam, só 9 projetos em
   toda a BD têm 3+ secções (a definição de ativação do CLAUDE.md). Nem a
   sequência de onboarding (conta-dias desde o registo) nem o ciclo contínuo
   (semanal, pós-onboarding) apanham isto bem: quem já passou o onboarding,
   ou tem conta antiga, pode criar um projeto novo e ficar incompleto sem
   ninguém nunca lhe dizer nada.

   Relógio próprio, terceiro e distinto dos outros dois: conta HORAS desde
   que o PROJETO (não a conta) foi criado, não dias nem semanas. Por isso é
   uma função à parte, não misturada no ciclo contínuo nem no onboarding.
   Mesmo raciocínio que já levou a send-continuous-cycle a ser separada de
   send-onboarding-sequence.

   Audiência: projetos entry_kind='full', criados há 24-100h, com menos de 3
   itens em preview_blocks, ainda sem activation_nudge_sent_at (migração
   205). Um email por projeto, nunca repete. Aplica-se a todos os planos,
   ativação não depende de pagar.

   Corre 3x por semana via pg_cron (segunda, quarta, sexta), reduzido de
   diário em 2026-10-31 a pedido do Gustavo (reduzir o número de crons que
   verificam todos os dias). A janela alargou de 24-48h para 24-100h para
   cobrir com folga o maior intervalo entre corridas (sexta a segunda, 3
   dias) sem perder ninguém a meio.

   Modo de teste: { test_project_id } no corpo, mesmo padrão das outras
   sequências.
   ══════════════════════════════════════════════════════════════════════════ */

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://showo.pt',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const FROM = 'Showo <hello@showo.pt>'
const APP = 'https://showo.pt'

function esc(v: unknown) {
  return String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
}

async function signUserId(userId: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sigBuf = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(userId))
  return Array.from(new Uint8Array(sigBuf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

function wrapEmail(bodyRows: string, unsubscribeUrl: string) {
  return `
<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="#080808" style="background:#080808;">
  <tr>
    <td align="center" bgcolor="#080808" style="background:#080808;padding:48px 24px;font-family:-apple-system,Helvetica,Arial,sans-serif;">
      <table role="presentation" width="440" border="0" cellpadding="0" cellspacing="0" style="max-width:440px;width:100%;text-align:left;">
        <tr><td style="padding:0 0 28px;"><img src="https://showo.pt/icon.png" alt="Showo" width="32" height="32" style="display:block;border:0;" /></td></tr>
        ${bodyRows}
        <tr><td style="font-size:11px;color:#555555;">Showo &middot; <a href="${APP}" style="color:#555555;">showo.pt</a> &middot; <a href="${esc(unsubscribeUrl)}" style="color:#555555;">cancelar estes emails</a></td></tr>
      </table>
    </td>
  </tr>
</table>`
}

function row(html: string) {
  return `<tr><td style="padding:0 0 16px;">${html}</td></tr>`
}

function greeting(firstName?: string) {
  return firstName ? row(`<span style="color:#888888;font-size:16px;line-height:1.4;">${esc(firstName)},</span>`) : ''
}

function headline(text: string) {
  return `<tr><td style="padding:0 0 24px;color:#f0f0f0;font-size:28px;line-height:1.25;font-weight:800;letter-spacing:-0.01em;">${text}</td></tr>`
}

function paragraph(text: string, last = false) {
  return `<tr><td style="padding:0 0 ${last ? '32' : '10'}px;color:#888888;font-size:16px;line-height:1.5;">${text}</td></tr>`
}

function cta(href: string, label: string) {
  return `<tr><td style="padding:0 0 24px;"><a href="${href}" style="display:inline-block;background:#2B7EF5;color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 24px;border-radius:10px;">${esc(label)}</a></td></tr>`
}

// daysToDefense vem de projects.defense_date quando preenchida e ainda no
// futuro (só ~15% dos projetos têm isto, confirmado contra a BD antes de
// construir). Quando existe, é o gancho de urgência mais forte que temos,
// porque é o prazo real da própria pessoa, não um desconto inventado por
// nós, a mesma distinção que já nos obrigou a tirar a falsa data limite
// dos emails de onboarding. Quando não existe, cai no aviso genérico.
function buildEmail(firstName: string | undefined, projectName: string, sectionsCount: number, slug: string, unsubscribeUrl: string, daysToDefense: number | null) {
  const missing = 3 - sectionsCount

  if (daysToDefense !== null) {
    // Subject mantém a data (precisa de ser claro a abrir), mas o corpo
    // usa forma causal: o resultado depende do que a pessoa fizer agora,
    // não é só reportar uma contagem decrescente.
    const prazo = daysToDefense === 0
      ? 'é hoje'
      : daysToDefense === 1
        ? 'é amanhã'
        : `é daqui a ${daysToDefense} dias`
    const janela = daysToDefense === 0
      ? 'hoje'
      : daysToDefense === 1
        ? 'amanhã'
        : `nos próximos ${daysToDefense} dias`
    const subject = `A tua defesa ${prazo}, e "${projectName}" ainda não está pronto`
    return {
      subject,
      html: wrapEmail(
        greeting(firstName) +
        headline(`O que fizeres ${janela} decide a tua defesa`) +
        paragraph(sectionsCount === 0
          ? `"${projectName}" ainda não tem nenhuma secção preenchida. Quem avaliar o teu trabalho vai ver isto antes de te ver a ti.`
          : `Faltam ${missing} secç${missing === 1 ? 'ão' : 'ões'} para o projeto estar pronto a mostrar ao júri, e o tempo está a encurtar.`) +
        paragraph('Não precisa de estar perfeito, precisa de estar lá antes do dia marcado.', true) +
        cta(`${APP}/editar/${slug}`, 'Completar antes da defesa'),
        unsubscribeUrl,
      ),
    }
  }

  const subject = sectionsCount === 0
    ? `"${projectName}" está criado, falta a parte que conta`
    : `Faltam ${missing} secç${missing === 1 ? 'ão' : 'ões'} para "${projectName}" ficar pronto a mostrar`
  const body = sectionsCount === 0
    ? 'Criaste o projeto mas ainda não tem nenhuma secção preenchida. Sem isso, quem vir o link não percebe o que fizeste.'
    : `Já tens ${sectionsCount} de 3 secções. Falta pouco para teres algo que vale a pena partilhar com um professor, recrutador, ou guardar para ti.`
  return {
    subject,
    html: wrapEmail(
      greeting(firstName) +
      headline(sectionsCount === 0 ? 'Falta a parte que conta' : 'Estás quase lá') +
      paragraph(body) +
      paragraph('O problema que resolveste, as decisões que tomaste, os resultados. Não precisa de estar perfeito, precisa de existir.', true) +
      cta(`${APP}/editar/${slug}`, 'Completar o projeto'),
      unsubscribeUrl,
    ),
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

    let testProjectId: string | null = null
    try {
      const body = await req.json()
      if (typeof body?.test_project_id === 'string') testProjectId = body.test_project_id
    } catch { /* corpo vazio é normal na chamada do cron */ }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    let projectsQuery = supabase
      .from('projects')
      .select('id, name, slug, user_id, preview_blocks, created_at, entry_kind, activation_nudge_sent_at, defense_date')
      .eq('entry_kind', 'full')
      .is('activation_nudge_sent_at', null)
      .lte('created_at', new Date(Date.now() - 24 * 3600000).toISOString())
      .gte('created_at', new Date(Date.now() - 100 * 3600000).toISOString())
    if (testProjectId) {
      projectsQuery = supabase
        .from('projects')
        .select('id, name, slug, user_id, preview_blocks, created_at, entry_kind, activation_nudge_sent_at, defense_date')
        .eq('id', testProjectId)
    }

    const { data: projects, error: projErr } = await projectsQuery
    if (projErr) throw projErr

    const incompleteRaw = (projects ?? []).filter(
      p => !Array.isArray(p.preview_blocks) || p.preview_blocks.length < 3
    )

    if (incompleteRaw.length === 0) {
      return new Response(JSON.stringify({ ok: true, candidates: 0, sent: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const userIds = [...new Set(incompleteRaw.map(p => p.user_id))]
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, activation_nudge_opted_out, onboarding_sequence_step, onboarding_opted_out')
      .in('id', userIds)
    const profileById = new Map((profiles ?? []).map(p => [p.id, p]))
    // Quem está a meio da sequência de onboarding já recebe 1 email por dia
    // dessa sequência (send-onboarding-sequence). Empilhar este por cima,
    // no mesmo dia, foi confirmado contra a BD em 2026-10-31 a acontecer de
    // facto (queixa real de "parece spam"). Mesma regra que o
    // send-saturday-nudge e o send-continuous-cycle já aplicam.
    const inActiveOnboarding = (prof: { onboarding_sequence_step?: number | null; onboarding_opted_out?: boolean } | undefined) =>
      !!prof && prof.onboarding_sequence_step != null && prof.onboarding_sequence_step < 14 && !prof.onboarding_opted_out
    const incomplete = testProjectId
      ? incompleteRaw
      : incompleteRaw.filter(p => {
          const prof = profileById.get(p.user_id)
          return !prof?.activation_nudge_opted_out && !inActiveOnboarding(prof)
        })
    const nameById = new Map((profiles ?? []).map(p => [p.id, p.full_name]))

    const emailById = new Map<string, string>()
    {
      let page = 1
      for (;;) {
        const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 })
        if (error) throw error
        for (const u of data.users) if (userIds.includes(u.id) && u.email) emailById.set(u.id, u.email)
        if (data.users.length < 200) break
        page++
      }
    }

    let sent = 0
    const errors: string[] = []

    for (const p of incomplete) {
      try {
        const email = emailById.get(p.user_id)
        if (!email) continue
        const firstName = nameById.get(p.user_id)?.split(' ')[0]
        const sectionsCount = Array.isArray(p.preview_blocks) ? p.preview_blocks.length : 0
        const unsubSig = await signUserId(p.user_id, cronSecret)
        const unsubscribeUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/project-activation-unsubscribe?u=${p.user_id}&sig=${unsubSig}`
        const daysToDefense = p.defense_date
          ? Math.max(0, Math.ceil((new Date(p.defense_date).getTime() - Date.now()) / 86400000))
          : null
        const hasFutureDefense = p.defense_date && new Date(p.defense_date).getTime() > Date.now()
        const built = buildEmail(firstName, p.name || 'o teu projeto', sectionsCount, p.slug, unsubscribeUrl, hasFutureDefense ? daysToDefense : null)

        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ from: FROM, to: email, subject: built.subject, html: built.html }),
        })
        if (!res.ok) { errors.push(await res.text()); continue }

        const { id: resendId } = await res.json()
        if (resendId) {
          await supabase.from('email_sends').insert({
            user_id: p.user_id,
            email_type: 'project_activation_nudge',
            resend_id: resendId,
            to_email: email,
          })
        }
        sent++

        if (!testProjectId) {
          await supabase.from('projects')
            .update({ activation_nudge_sent_at: new Date().toISOString() })
            .eq('id', p.id)
        }
      } catch (e) {
        console.error('[send-project-activation-nudge] failed for', p.id, e)
        errors.push(String(e))
      }
    }

    return new Response(JSON.stringify({ ok: errors.length === 0, candidates: incomplete.length, sent, errors }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error(e)
    return new Response(JSON.stringify({ error: 'Erro interno.' }), { status: 500, headers: corsHeaders })
  }
})
