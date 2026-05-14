import Anthropic from 'npm:@anthropic-ai/sdk@0.36.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { project } = await req.json()
    const client = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') ?? '' })

    const prompt = `És um coach de apresentações para estudantes portugueses que vão defender o seu projeto (PAP ou trabalho escolar) em frente a um júri.

Com base neste projeto, gera notas de orador para cada secção da apresentação e perguntas prováveis do júri.

PROJETO:
Nome: ${project.name || ''}
Objetivo: ${project.goal || ''}
Problema: ${project.problem || ''}
Solução: ${project.solution || ''}
Funcionalidades: ${project.features || ''}
Tecnologias: ${project.technologies || ''}
Público-alvo: ${project.target_audience || ''}
Desafios: ${project.challenges || ''}
Resultados: ${project.results || ''}
Aprendizagens: ${project.learnings || ''}

Devolve APENAS este JSON (sem markdown):
{
  "slide_notes": {
    "cover": "O que dizer na introdução (2-3 frases naturais, tom confiante)",
    "problem": "Como apresentar o problema de forma envolvente",
    "solution": "Como explicar a solução de forma clara",
    "features": "Como apresentar as funcionalidades sem se perder",
    "technologies": "Como falar das tecnologias sem parecer decorado",
    "results": "Como apresentar resultados com impacto",
    "learnings": "Como partilhar aprendizagens de forma genuína",
    "closing": "Como terminar com impacto e abrir para perguntas"
  },
  "jury_questions": [
    { "q": "Pergunta provável do júri", "a": "Sugestão de resposta concisa e honesta" },
    { "q": "...", "a": "..." },
    { "q": "...", "a": "..." },
    { "q": "...", "a": "..." },
    { "q": "...", "a": "..." }
  ],
  "tip": "Um conselho específico para esta apresentação em particular (1 frase)"
}`

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1200,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = (message.content[0] as { type: string; text: string }).text.trim()
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('Resposta inválida')
    const notes = JSON.parse(jsonMatch[0])

    return new Response(JSON.stringify(notes), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ slide_notes: {}, jury_questions: [], tip: '' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
