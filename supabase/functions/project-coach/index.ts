import Anthropic from 'npm:@anthropic-ai/sdk@0.36.3'
import { checkRateLimit, getAuthUser, clip } from '../_shared/rateLimit.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://showo.pt',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SYSTEM = (p: Record<string, string>) => `És um assistente de coaching para estudantes portugueses que estão a desenvolver projetos académicos — PAPs, estágios, projetos universitários e pessoais.

O teu papel é GUIAR, não fazer pelo estudante. Nunca escrevas conteúdo completo para eles substituíres um campo. Em vez disso, faz perguntas específicas, aponta o que está vago, sugere direcções concretas, e celebra o progresso.

CONTEXTO DO PROJETO:
━━━━━━━━━━━━━━━━━━━━
Nome: ${clip(p.name) || '(sem nome)'}
Tipo: ${clip(p.project_type) || '(não especificado)'}
Área: ${clip(p.area) || '(não especificada)'}

Objetivo: ${clip(p.goal) || '(vazio)'}
Problema: ${clip(p.problem) || '(vazio)'}
Solução: ${clip(p.solution) || '(vazio)'}
Público-alvo: ${clip(p.target_audience) || '(vazio)'}
Funcionalidades: ${clip(p.features) || '(vazio)'}
Tecnologias: ${clip(p.technologies) || '(vazio)'}
Desafios: ${clip(p.challenges) || '(vazio)'}
Resultados: ${clip(p.results) || '(vazio)'}
Aprendizagens: ${clip(p.learnings) || '(vazio)'}
━━━━━━━━━━━━━━━━━━━━

REGRAS:
- Responde sempre em português de Portugal.
- Sê direto e conciso. Máximo 3 parágrafos por resposta.
- Quando um campo está vazio, pergunta sobre esse campo especificamente.
- Quando um campo está presente mas vago, cita o que o estudante escreveu e explica exatamente o que falta.
- Usa linguagem acessível para estudantes do ensino secundário/superior.
- Nunca inventes informação sobre o projeto — baseia-te só no que está escrito acima.
- Se o estudante pedir que escrevas o texto por ele, recusa educadamente e ajuda-o a pensar no que quer dizer.`

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const allowed = await checkRateLimit(req, 'project-coach', 30)
  if (!allowed) {
    return new Response(JSON.stringify({ error: 'Demasiados pedidos. Tenta mais tarde.' }), {
      status: 429,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Coach requires authenticated user
  const user = await getAuthUser(req)
  if (!user) {
    return new Response(JSON.stringify({ error: 'Não autenticado.' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const { project, messages = [], message } = await req.json()

    if (!message?.trim()) {
      return new Response(JSON.stringify({ error: 'Mensagem vazia.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const client = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') ?? '' })

    // Build history (max 20 turns to cap tokens)
    const history = (messages as { role: string; content: string }[])
      .slice(-20)
      .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      system: SYSTEM(project ?? {}),
      messages: [...history, { role: 'user', content: message.trim() }],
    })

    const reply = response.content[0]?.type === 'text' ? response.content[0].text : ''

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[project-coach]', err)
    return new Response(JSON.stringify({ error: 'Erro interno. Tenta novamente.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
