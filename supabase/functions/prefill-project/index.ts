import Anthropic from 'npm:@anthropic-ai/sdk@0.36.3'
import { checkRateLimit, getAuthUser, getCorsHeaders } from '../_shared/rateLimit.ts'

const TYPE_LABELS: Record<string, string> = {
  pap:         'PAP (Projeto de Aptidão Profissional)',
  internship:  'Projeto de Estágio',
  group:       'Trabalho de Grupo',
  personal:    'Projeto Pessoal',
  competition: 'Projeto de Competição',
}

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

  const allowed = await checkRateLimit(req, 'prefill-project')
  if (!allowed) {
    return new Response(JSON.stringify({ prefill: {} }), {
      status: 429,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  try {
    const { text, projectType } = await req.json()

    if (!text?.trim()) {
      return new Response(JSON.stringify({ prefill: {} }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const client = new Anthropic({
      apiKey: Deno.env.get('ANTHROPIC_API_KEY') ?? '',
    })

    const typeLabel = TYPE_LABELS[projectType] ?? 'Projeto'
    const safeText = String(text).trim().slice(0, 1000)

    const prompt = `És um assistente que analisa descrições curtas de projetos de estudantes portugueses e infere campos de um formulário.

O utilizador descreveu o seu projeto assim:
"${safeText}"

Tipo de projeto: ${typeLabel}

Com base nesta descrição, preenche os campos que conseguires inferir com confiança. Usa Português de Portugal (PT-PT). Se não tiveres informação suficiente para um campo, deixa-o como string vazia "".

Devolve APENAS este JSON (sem markdown, sem explicações):
{
  "name": "<nome do projeto, se mencionado ou óbvio, senão \\"\\">",
  "area": "<área tecnológica/temática: ex: Saúde, Educação, Web, Mobile, IA... senão \\"\\">",
  "goal": "<objetivo principal do projeto em 1-2 frases, senão \\"\\">",
  "problem": "<problema que o projeto resolve, senão \\"\\">",
  "solution": "<como resolve o problema, senão \\"\\">",
  "target_audience": "<público-alvo, se inferível, senão \\"\\">",
  "features": "<funcionalidades principais separadas por vírgula, se mencionadas, senão \\"\\">",
  "technologies": "<tecnologias mencionadas separadas por vírgula, senão \\"\\">"
}`

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = (message.content[0] as { type: string; text: string }).text.trim()
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('Resposta inválida')

    const prefill = JSON.parse(jsonMatch[0])

    return new Response(JSON.stringify({ prefill }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ prefill: {} }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
