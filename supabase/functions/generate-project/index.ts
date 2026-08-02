import Anthropic from 'npm:@anthropic-ai/sdk@0.36.3'
import { checkRateLimit, getAuthUser, clip, getCorsHeaders } from '../_shared/rateLimit.ts'

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const user = await getAuthUser(req)
  if (!user) {
    return new Response(JSON.stringify({ error: 'Autenticação necessária.' }), {
      status: 401,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  const allowed = await checkRateLimit(req, 'generate-project')
  if (!allowed) {
    return new Response(JSON.stringify({ error: 'Demasiados pedidos. Tenta mais tarde.' }), {
      status: 429,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  try {
    const body = await req.json()
    const projectData = body.data ?? body

    const client = new Anthropic({
      apiKey: Deno.env.get('ANTHROPIC_API_KEY') ?? '',
    })

    const prompt = `És um mestre de storytelling e pitch writer.
Um estudante português do ensino profissional acabou de descrever o seu projeto.
O teu trabalho é transformar o que ele descreveu em algo que o faça sentir visto e orgulhoso — como se alguém finalmente percebeu o que ele construiu.

DADOS DO PROJETO:
- Nome: ${clip(projectData.name, 200)}
- Área: ${clip(projectData.area, 200)}
- Objetivo: ${clip(projectData.goal)}
- Problema que resolve: ${clip(projectData.problem)}
- Solução: ${clip(projectData.solution)}
- Público-alvo: ${clip(projectData.target_audience)}
- Funcionalidades: ${clip(projectData.features)}
- Tecnologias: ${clip(projectData.technologies, 500)}
- Desafios: ${clip(projectData.challenges)}
- Resultados: ${clip(projectData.results)}
- Aprendizagens: ${clip(projectData.learnings)}

Gera exatamente este JSON (sem mais nada, só o JSON válido):
{
  "tagline": "<uma frase poderosa. Não uma descrição — uma declaração. Algo que este estudante colocaria orgulhoso no CV. Máximo 12 palavras. Em PT-PT.>",
  "historia": [
    "<Parágrafo 1: O problema que este estudante viu e decidiu resolver. Faz sentir real e humano. 3-4 frases. Em PT-PT.>",
    "<Parágrafo 2: O que ele construiu e a jornada de o construir. Honra o esforço. 3-4 frases. Em PT-PT.>",
    "<Parágrafo 3: O que este projeto diz sobre quem este estudante é e para onde vai. 3-4 frases. Em PT-PT.>"
  ],
  "highlights": [
    "<destaque 1: conquista ou ponto forte específico do projeto, 1 frase em PT-PT>",
    "<destaque 2: impacto técnico ou inovação, 1 frase em PT-PT>",
    "<destaque 3: resultado ou aprendizagem relevante, 1 frase em PT-PT>"
  ]
}

Regras absolutas:
- Nunca uses linguagem corporativa fria
- Nunca uses clichês como "solução inovadora" ou "abordagem revolucionária"
- Escreve como um mentor orgulhoso que acredita genuinamente neste estudante
- Sê específico ao projeto dele — nunca genérico
- Sempre em Português de Portugal (PT-PT)`

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 900,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = (message.content[0] as { type: string; text: string }).text.trim()

    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('Resposta inválida da IA')

    const result = JSON.parse(jsonMatch[0])

    if (Array.isArray(result.historia)) {
      result.description = result.historia.join('\n\n')
    }

    return new Response(JSON.stringify(result), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error(err)
    return new Response(
      JSON.stringify({ error: 'Erro ao gerar conteúdo.' }),
      { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } }
    )
  }
})
