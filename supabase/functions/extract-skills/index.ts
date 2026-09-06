// Lê um projeto (campos + diário) e devolve as competências e tecnologias
// que o trabalho demonstra. Corre no publish; o resultado fica em
// projects.ai_skill_suggestions à espera de o aluno confirmar.
//
// POST { projectId } ou { project }  →  { skills: [], technologies: [] }

import Anthropic from 'npm:@anthropic-ai/sdk@0.36.3'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { checkRateLimit, getAuthUser, getCorsHeaders } from '../_shared/rateLimit.ts'

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  const user = await getAuthUser(req)
  if (!user) return json({ error: 'Autenticação necessária.' }, 401)

  if (!(await checkRateLimit(req, 'extract-skills'))) {
    return json({ skills: [], technologies: [] }, 429)
  }

  try {
    const body = await req.json()
    const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    let project = body.project
    if (!project && body.projectId) {
      const { data } = await sb
        .from('projects')
        .select('id, user_id, name, area, goal, problem, solution, target_audience, features, technologies, challenges, results, learnings, library_description')
        .eq('id', body.projectId)
        .single()
      project = data
    }
    if (!project) return json({ error: 'Projeto não encontrado.' }, 404)
    if (project.user_id && project.user_id !== user.id) return json({ error: 'Sem permissão.' }, 403)

    let diaryBlock = ''
    if (project.id) {
      const { data: entries } = await sb
        .from('project_journal_entries')
        .select('kind, content, created_at')
        .eq('project_id', project.id)
        .order('created_at', { ascending: false })
        .limit(20)
      if (entries?.length) {
        diaryBlock = '\n\nDIÁRIO:\n' + entries.reverse()
          .map((e: { kind: string; content: string }) => `(${e.kind}) ${String(e.content).slice(0, 300)}`)
          .join('\n')
      }
    }

    const f = (v: unknown) => String(v ?? '').trim().slice(0, 1500)
    const prompt = `Este é o trabalho de um estudante português. Lê tudo e devolve o que o trabalho DEMONSTRA — não o que seria bom ter, só o que está mesmo lá.

NOME: ${f(project.name)}
ÁREA: ${f(project.area)}
OBJETIVO: ${f(project.goal)}
PROBLEMA: ${f(project.problem)}
SOLUÇÃO: ${f(project.solution)}
FUNCIONALIDADES: ${f(project.features)}
TECNOLOGIAS (texto livre do aluno): ${f(project.technologies)}
DESAFIOS: ${f(project.challenges)}
RESULTADOS: ${f(project.results)}
APRENDIZAGENS: ${f(project.learnings)}
${f(project.library_description) ? 'DESCRIÇÃO: ' + f(project.library_description) : ''}${diaryBlock}

Devolve APENAS este JSON:
{
  "technologies": ["linguagens, frameworks, ferramentas concretas e nomeáveis — ex: JavaScript, React, Figma, PostgreSQL, Unity. 0 a 8. Só o que está mesmo no trabalho."],
  "skills": ["competências mais amplas demonstradas — ex: Investigação de utilizadores, Modelação 3D, Copywriting, Gestão de projeto, Análise de dados. 3 a 8. Diferentes de uma tecnologia."]
}
Português de Portugal. Sem duplicar entre as duas listas. Sem inventar.`

    const client = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') ?? '' })
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }],
    })
    const raw = (message.content[0] as { type: string; text: string }).text
    const m = raw.match(/\{[\s\S]*\}/)
    const parsed = m ? JSON.parse(m[0]) : {}

    const clean = (arr: unknown, max: number) =>
      Array.isArray(arr)
        ? [...new Set(arr.map((s: unknown) => String(s).trim()).filter(Boolean))].slice(0, max)
        : []
    const result = {
      technologies: clean(parsed.technologies, 8),
      skills: clean(parsed.skills, 8),
    }

    if (project.id && project.user_id && (result.skills.length || result.technologies.length)) {
      await sb.from('project_skill_suggestions').upsert({
        project_id: project.id,
        user_id: project.user_id,
        skills: result.skills,
        technologies: result.technologies,
        generated_at: new Date().toISOString(),
      }, { onConflict: 'project_id' })
    }

    return json(result)
  } catch (err) {
    console.error('[extract-skills]', err)
    return json({ skills: [], technologies: [] }, 500)
  }
})
