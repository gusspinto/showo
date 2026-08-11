import Anthropic from 'npm:@anthropic-ai/sdk@0.36.3'
import { checkRateLimit, getAuthUser, clip, getCorsHeaders, checkPlanLimit } from '../_shared/rateLimit.ts'

const SYSTEM = (p: Record<string, string>) => `És um assistente pessoal para estudantes portugueses que estão a documentar e melhorar os seus projetos académicos — PAPs, estágios, projetos universitários e pessoais — na plataforma Showo.

O teu papel é ajudar o estudante a ter a melhor página de portfólio possível. Isso inclui dar feedback, sugerir melhorias, e quando pedido, escrever ou reformular texto para campos do projeto. Não inventas informação — usas o que o estudante já tem e perguntas para completar o que falta.

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
- Responde sempre em português de Portugal (PT-PT). Usa vocabulário europeu: "ecrã" (não "tela"), "utilizador" (não "usuário"), "aplicação/app" (não "aplicativo").
- Sê direto, humano e concreto — como um colega mais experiente que quer genuinamente ajudar, não como um assistente corporativo.
- Respostas curtas: máximo 3 parágrafos ou uma lista de 4-5 itens. Nunca escrevas paredes de texto.
- Quando um campo está vazio, pergunta de forma específica sobre esse campo — cita o nome do projeto para provar que estás contextualizado.
- Quando um campo está presente mas vago, cita o que o estudante escreveu (entre aspas) e diz exatamente o que falta ou o que tornaria o texto mais forte.
- Quando o estudante pede que escrevas texto para um campo: escreve uma proposta completa, pronta a colar, num bloco de código markdown. Diz que pode ajustar à sua voz. A proposta deve ser específica ao projeto — nunca genérica.
- Para sugestões de melhorias usa listas com - e **negrito** para destacar o essencial.
- Nunca inventes factos sobre o projeto. Se precisas de informação que não está acima, pergunta primeiro — uma pergunta de cada vez.
- Nunca uses travessões (—) nem expressões genéricas como "de forma eficaz", "no âmbito de", "é fundamental", "aprendi muito".
- Se o estudante agradecer ou fizer smalltalk, responde brevemente e redireciona para o projeto.`

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors })
  }

  const allowed = await checkRateLimit(req, 'project-coach', 30)
  if (!allowed) {
    return new Response(JSON.stringify({ error: 'Demasiados pedidos. Tenta mais tarde.' }), {
      status: 429,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  const user = await getAuthUser(req)
  if (!user) {
    return new Response(JSON.stringify({ error: 'Não autenticado.' }), {
      status: 401,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  const planCheck = await checkPlanLimit(req, 'coach', user.id)
  if (planCheck && !planCheck.allowed) {
    return new Response(JSON.stringify({ error: 'Limite do plano atingido.', remaining: 0, limit: planCheck.limit }), {
      status: 403, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  try {
    const { project, messages = [], message } = await req.json()

    if (!message?.trim()) {
      return new Response(JSON.stringify({ error: 'Mensagem vazia.' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const client = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') ?? '' })

    const history = (messages as { role: string; content: string }[])
      .slice(-20)
      .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 900,
      system: SYSTEM(project ?? {}),
      messages: [...history, { role: 'user', content: message.trim() }],
    })

    const reply = response.content[0]?.type === 'text' ? response.content[0].text : ''

    return new Response(JSON.stringify({ reply }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[project-coach]', err)
    return new Response(JSON.stringify({ error: 'Erro interno. Tenta novamente.' }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
