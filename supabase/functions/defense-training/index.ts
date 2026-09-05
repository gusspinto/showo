import Anthropic from 'npm:@anthropic-ai/sdk@0.36.3'
import { checkRateLimit, getAuthUser, getCorsHeaders, checkPlanLimit, PTPT_RULES, clip } from '../_shared/rateLimit.ts'

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const user = await getAuthUser(req)
  if (!user) {
    return new Response(JSON.stringify({ error: 'Autenticação necessária.' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const allowed = await checkRateLimit(req, 'defense-training', 5)
  if (!allowed) {
    return new Response(JSON.stringify({ error: 'Demasiados pedidos. Tenta novamente mais tarde.' }), {
      status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const planCheck = await checkPlanLimit(req, 'defenseTraining', user.id)
  if (planCheck && !planCheck.allowed) {
    return new Response(JSON.stringify({ error: 'Limite de treinos atingido.', remaining: 0, limit: planCheck.limit }), {
      status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const { transcript, project, durationSeconds } = await req.json()

    if (!transcript || transcript.trim().length < 50) {
      return new Response(JSON.stringify({ error: 'Transcrição demasiado curta. Tenta apresentar pelo menos 1 minuto.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const client = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') ?? '' })

    const sections = ['problem', 'solution', 'features', 'technologies', 'results', 'learnings']
    const projectContext = sections
      .filter(s => project?.[s])
      .map(s => `${s}: ${clip(project[s], 500)}`)
      .join('\n')

    const msg = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [{
        role: 'user',
        content: `Analisa esta apresentacao oral de um estudante portugues que está a treinar a defesa do seu projeto (PAP).

PROJETO DO ESTUDANTE:
Nome: ${clip(project?.name, 200)}
${projectContext}

TRANSCRICAO DA APRESENTACAO (${Math.round((durationSeconds || 0) / 60)} minutos):
${clip(transcript, 8000)}

${PTPT_RULES}

Dá feedback estruturado em JSON com EXATAMENTE estes campos:
{
  "score": <0-100, avaliacao geral>,
  "duration_feedback": "<comentario sobre o tempo — se foi curto, adequado ou longo para uma defesa PAP de 15-20 min>",
  "content_coverage": {
    "covered": ["<seccoes do projeto que o aluno mencionou>"],
    "missing": ["<seccoes importantes que faltaram>"],
    "comment": "<nota geral sobre cobertura de conteudo>"
  },
  "clarity": {
    "score": <0-100>,
    "strengths": ["<pontos fortes da comunicacao>"],
    "improvements": ["<sugestoes concretas para melhorar clareza>"]
  },
  "filler_words": {
    "detected": ["<palavras de preenchimento detetadas: tipo, basicamente, pronto, etc.>"],
    "comment": "<nota sobre frequencia e impacto>"
  },
  "structure": {
    "score": <0-100>,
    "comment": "<a apresentacao teve introducao, desenvolvimento e conclusao claros?>"
  },
  "top_tips": ["<3 dicas concretas e acionaveis para a proxima tentativa>"]
}

Responde APENAS com o JSON, sem texto antes ou depois.`,
      }],
    })

    const raw = msg.content[0].type === 'text' ? msg.content[0].text : ''
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return new Response(JSON.stringify({ error: 'Erro ao processar feedback.' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let feedback
    try {
      feedback = JSON.parse(jsonMatch[0])
    } catch {
      return new Response(JSON.stringify({ error: 'Erro ao processar feedback.' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify(feedback), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[defense-training]', err)
    return new Response(JSON.stringify({ error: 'Erro interno.' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
