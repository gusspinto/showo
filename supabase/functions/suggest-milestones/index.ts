// Lê o diário de um projeto e sugere marcos para a timeline pública.
// O aluno revê, edita e escolhe quais adicionar.
//
// POST { projectId }  →  { milestones: [{ title, note, happened_on }] }

import Anthropic from 'npm:@anthropic-ai/sdk@0.36.3'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { checkRateLimit, getAuthUser, getCorsHeaders } from '../_shared/rateLimit.ts'

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const json = (b: unknown, s = 200) =>
    new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  const user = await getAuthUser(req)
  if (!user) return json({ error: 'Autenticação necessária.' }, 401)
  if (!(await checkRateLimit(req, 'suggest-milestones'))) return json({ milestones: [] }, 429)

  try {
    const { projectId } = await req.json()
    const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    const { data: project } = await sb
      .from('projects')
      .select('id, user_id, name, goal, problem, solution, created_at')
      .eq('id', projectId)
      .single()
    if (!project) return json({ error: 'Projeto não encontrado.' }, 404)
    if (project.user_id !== user.id) return json({ error: 'Sem permissão.' }, 403)

    const { data: entries } = await sb
      .from('project_journal_entries')
      .select('kind, content, created_at')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })
      .limit(120)

    if (!entries?.length) return json({ milestones: [] })

    const lines = entries.map((e: { kind: string; content: string; created_at: string }) =>
      `[${e.created_at.slice(0, 10)}] (${e.kind}) ${String(e.content).slice(0, 400)}`,
    ).join('\n')

    const prompt = `Este é o diário de um projeto de um estudante português ("${project.name}"), por ordem cronológica. Começou em ${String(project.created_at).slice(0, 10)}.

${lines}

Escolhe 3 a 6 MARCOS reais deste percurso — momentos que mostram evolução a um recrutador (mudança de abordagem, primeira versão a funcionar, primeiro utilizador a testar, problema grande resolvido, decisão importante). Nada de "comecei o projeto" ou "escrevi no diário".

Para cada marco: um título curto (máx 8 palavras), a data (a do registo onde acontece, YYYY-MM-DD), e uma nota de 1 frase específica. Português de Portugal, sem inventar o que não está no diário.

Devolve APENAS: {"milestones":[{"title":"","happened_on":"YYYY-MM-DD","note":""}]}`

    const client = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') ?? '' })
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }],
    })
    const raw = (message.content[0] as { type: string; text: string }).text
    const m = raw.match(/\{[\s\S]*\}/)
    const parsed = m ? JSON.parse(m[0]) : {}
    const milestones = Array.isArray(parsed.milestones)
      ? parsed.milestones
          .filter((x: { title?: string; happened_on?: string }) => x?.title && /^\d{4}-\d{2}-\d{2}$/.test(x.happened_on || ''))
          .slice(0, 6)
          .map((x: { title: string; happened_on: string; note?: string }) => ({
            title: String(x.title).slice(0, 120),
            happened_on: x.happened_on,
            note: x.note ? String(x.note).slice(0, 500) : null,
          }))
      : []

    return json({ milestones })
  } catch (err) {
    console.error('[suggest-milestones]', err)
    return json({ milestones: [] }, 500)
  }
})
