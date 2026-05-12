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
    const projectData = await req.json()

    const client = new Anthropic({
      apiKey: Deno.env.get('ANTHROPIC_API_KEY') ?? '',
    })

    const prompt = `És um assistente especializado em comunicação de projetos tecnológicos e de inovação para estudantes universitários e programadores.

Analisa os dados deste projeto e gera conteúdo profissional em Português de Portugal (PT-PT).

DADOS DO PROJETO:
- Nome: ${projectData.name ?? 'N/A'}
- Área: ${projectData.area ?? 'N/A'}
- Objetivo: ${projectData.goal ?? 'N/A'}
- Problema que resolve: ${projectData.problem ?? 'N/A'}
- Solução: ${projectData.solution ?? 'N/A'}
- Público-alvo: ${projectData.target_audience ?? 'N/A'}
- Funcionalidades: ${projectData.features ?? 'N/A'}
- Tecnologias: ${projectData.technologies ?? 'N/A'}
- Desafios: ${projectData.challenges ?? 'N/A'}
- Resultados: ${projectData.results ?? 'N/A'}
- Aprendizagens: ${projectData.learnings ?? 'N/A'}

Gera exatamente este JSON (sem mais nada, só o JSON):
{
  "tagline": "<frase impactante e curta, máximo 12 palavras, que capta a essência do projeto>",
  "description": "<parágrafo de 3-4 frases que descreve o projeto de forma apelativa para recrutadores e investidores, em PT-PT>",
  "highlights": [
    "<destaque 1: conquista ou ponto forte específico do projeto, 1 frase>",
    "<destaque 2: impacto técnico ou inovação, 1 frase>",
    "<destaque 3: resultado ou aprendizagem relevante, 1 frase>"
  ]
}`

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = (message.content[0] as { type: string; text: string }).text.trim()

    // Extract JSON even if the model wraps it in markdown
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('Resposta inválida da IA')

    const result = JSON.parse(jsonMatch[0])

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error(err)
    return new Response(
      JSON.stringify({ error: 'Erro ao gerar conteúdo', details: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
