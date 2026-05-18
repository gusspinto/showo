import Anthropic from 'npm:@anthropic-ai/sdk@0.36.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { data: project } = await req.json()
    const client = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') ?? '' })

    const f = (v: string | undefined | null) => v?.trim() || ''
    const hasContent = (v: string | undefined | null) => (v?.trim()?.length ?? 0) > 10

    const prompt = `És um mentor sénior especializado em avaliar projetos de estudantes portugueses — PAPs, estágios, projetos universitários e pessoais. Tens 20 anos de experiência em júris de avaliação.

O teu objetivo é dar feedback HONESTO, ESPECÍFICO e ACIONÁVEL. Nunca sejas vago. Cita o que o estudante escreveu e diz exatamente o que falta ou o que está bem.

PROJETO A AVALIAR:
━━━━━━━━━━━━━━━━━━━━━━
Nome: ${f(project.name) || '(sem nome)'}
Tipo: ${f(project.project_type) || '(não especificado)'}
Área: ${f(project.area) || '(não especificada)'}

OBJETIVO: ${f(project.goal) || '(vazio)'}

PROBLEMA: ${f(project.problem) || '(vazio)'}

SOLUÇÃO: ${f(project.solution) || '(vazio)'}

PÚBLICO-ALVO: ${f(project.target_audience) || '(vazio)'}

FUNCIONALIDADES: ${f(project.features) || '(vazio)'}

TECNOLOGIAS: ${f(project.technologies) || '(vazio)'}

DESAFIOS: ${f(project.challenges) || '(vazio)'}

RESULTADOS: ${f(project.results) || '(vazio)'}

APRENDIZAGENS: ${f(project.learnings) || '(vazio)'}
━━━━━━━━━━━━━━━━━━━━━━

CRITÉRIOS DE AVALIAÇÃO:
- "forte": conteúdo específico, claro, com exemplos ou números concretos. Impressiona um júri.
- "médio": conteúdo presente mas genérico, vago, ou demasiado curto para ser convincente.
- "fraco": vazio, uma frase só, ou informação que não diz nada de útil.

REGRAS CRÍTICAS:
1. Cita literalmente partes do que o estudante escreveu no feedback (usa aspas)
2. O "tip" deve ser uma ação concreta e específica — nunca "podes melhorar" sem dizer COMO
3. Se o campo tiver 1-2 palavras como "a" ou "teste", considera FRACO e diz isso claramente
4. Para campos vazios: feedback = "Este campo está vazio" e tip = o que escrever especificamente
5. Usa PT-PT natural, sem formalidades excessivas
6. O "overall" deve ser uma avaliação honesta do estado real do projeto, não elogios vazios
7. O "score_hint" deve identificar o campo que, se melhorado, mais impacto terá no score

Responde APENAS com este JSON (sem markdown, sem texto extra):
{
  "overall": "<avaliação honesta em 2 frases — o que está bem e o que falta mesmo>",
  "score_hint": "<campo específico + o que escrever lá para subir mais pontos, 1 frase>",
  "sections": {
    "goal":            { "rating": "fraco|médio|forte", "feedback": "<cita o conteúdo e diz o que falta ou está bem>", "tip": "<ação concreta e específica>" },
    "problem":         { "rating": "...", "feedback": "...", "tip": "..." },
    "solution":        { "rating": "...", "feedback": "...", "tip": "..." },
    "target_audience": { "rating": "...", "feedback": "...", "tip": "..." },
    "features":        { "rating": "...", "feedback": "...", "tip": "..." },
    "technologies":    { "rating": "...", "feedback": "...", "tip": "..." },
    "results":         { "rating": "...", "feedback": "...", "tip": "..." },
    "learnings":       { "rating": "...", "feedback": "...", "tip": "..." }
  }
}`

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1800,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = (message.content[0] as { type: string; text: string }).text.trim()
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('Resposta inválida da IA')

    return new Response(jsonMatch[0], {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
