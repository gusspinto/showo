import Anthropic from 'npm:@anthropic-ai/sdk@0.36.3'
import { checkRateLimit, getAuthUser, getCorsHeaders, checkPlanLimit } from '../_shared/rateLimit.ts'

const TYPE_LABELS: Record<string, string> = {
  school:   'Projeto de Escola',
  pap:      'PAP (Projeto de Aptidão Profissional)',
  personal: 'Projeto Pessoal',
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

  const planCheck = await checkPlanLimit(req, 'createProject', user.id)
  if (planCheck && !planCheck.allowed) {
    return new Response(JSON.stringify({ error: 'Limite do plano atingido.', remaining: 0, limit: planCheck.limit }), {
      status: 403, headers: { ...cors, 'Content-Type': 'application/json' },
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

    const prompt = `És um assistente que analisa descrições curtas de projetos de estudantes portugueses e infere campos de um formulário de portfólio.

O utilizador descreveu o seu projeto assim:
"${safeText}"

Tipo de projeto: ${typeLabel}

Com base nesta descrição, preenche os campos que conseguires inferir com confiança. Regras:
- Usa Português de Portugal (PT-PT): "utilizador" (não "usuário"), "ecrã" (não "tela").
- Escrita natural e fluida — não é uma lista de palavras-chave, é texto corrido para um portfólio.
- Nunca uses travessões (—) nem expressões genéricas como "de forma eficaz" ou "no âmbito de".
- Se não tiveres informação suficiente para um campo, deixa-o como string vazia "".
- "goal": 1-2 frases completas que explicam o propósito do projeto.
- "problem": o problema concreto identificado, em 1-2 frases.
- "solution": como o projeto resolve esse problema, em 1-2 frases.
- "features": lista de funcionalidades separadas por vírgula — apenas as que estão claramente na descrição.
- "technologies": ferramentas/linguagens/frameworks mencionadas, separadas por vírgula.
- "challenges": se houver indicação de dificuldades ou obstáculos na descrição, resume-os em 1 frase. Senão "".
- "results": se houver indicação de resultados, impacto ou utilizadores, resume em 1 frase. Senão "".

Devolve APENAS este JSON (sem markdown, sem explicações):
{
  "name": "<nome curto do projeto, se mencionado, senão \\"\\">",
  "area": "<área temática: ex: Saúde, Educação, Web, Mobile, IA, Gestão... senão \\"\\">",
  "goal": "<objetivo principal em 1-2 frases, senão \\"\\">",
  "problem": "<problema que resolve em 1-2 frases, senão \\"\\">",
  "solution": "<como resolve o problema em 1-2 frases, senão \\"\\">",
  "target_audience": "<público-alvo, se inferível, senão \\"\\">",
  "features": "<funcionalidades separadas por vírgula, senão \\"\\">",
  "technologies": "<tecnologias separadas por vírgula, senão \\"\\">",
  "challenges": "<dificuldades encontradas, se mencionadas, senão \\"\\">",
  "results": "<resultados ou impacto obtido, se mencionado, senão \\"\\">"
}`

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 700,
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
