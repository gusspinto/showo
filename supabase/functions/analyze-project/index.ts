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

    const client = new Anthropic({
      apiKey: Deno.env.get('ANTHROPIC_API_KEY') ?? '',
    })

    const field = (v: string | undefined | null) => v?.trim() || 'Não preenchido'

    const prompt = `És um coach especializado em ajudar estudantes portugueses a melhorar os seus projetos PAP e apresentações finais.

Analisa este projeto e dá feedback específico, honesto e construtivo em português de Portugal (PT-PT).

DADOS DO PROJETO:
- Nome: ${field(project.name)}
- Área: ${field(project.area)}
- Objetivo: ${field(project.goal)}
- Problema: ${field(project.problem)}
- Solução: ${field(project.solution)}
- Público-alvo: ${field(project.target_audience)}
- Funcionalidades: ${field(project.features)}
- Tecnologias: ${field(project.technologies)}
- Desafios: ${field(project.challenges)}
- Resultados: ${field(project.results)}
- Aprendizagens: ${field(project.learnings)}

Regras de avaliação:
- "fraco": campo vazio, muito curto (<40 chars) ou demasiado vago
- "médio": preenchido mas poderia ser mais específico ou impactante
- "forte": claro, específico, com impacto ou exemplos concretos

Responde APENAS com este JSON (sem markdown, sem texto extra):
{
  "overall": "<resumo geral em 1-2 frases sobre o ponto em que o projeto está>",
  "score_hint": "<o que faria o score subir mais rápido, em 1 frase>",
  "sections": {
    "goal":            { "rating": "fraco|médio|forte", "feedback": "<o que está bem ou mal, 1 frase>", "tip": "<sugestão concreta de melhoria, começando por um verbo, 1 frase>" },
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
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1200,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = (message.content[0] as { type: string; text: string }).text.trim()
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('Resposta inválida da IA')

    const result = JSON.parse(jsonMatch[0])

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
