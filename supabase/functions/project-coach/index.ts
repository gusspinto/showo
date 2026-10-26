import Anthropic from 'npm:@anthropic-ai/sdk@0.36.3'
import { checkRateLimit, getAuthUser, clip, getCorsHeaders, checkPlanLimit, PTPT_RULES, logAiCost } from '../_shared/rateLimit.ts'

function evaluatorLine(profile: { occupation?: string; organization_id?: string } | undefined): string {
  const isStudentLike = !!profile?.organization_id
    || profile?.occupation === 'Aluno / A estudar'
    || profile?.occupation === 'Estagiário(a)'
  return isStudentLike
    ? 'quem avalia isto é um professor ou a pessoa responsável por ti, não eu'
    : 'quem vai decidir se confia em ti por causa disto, seja para te contratar ou trabalhar contigo, não eu'
}

const SYSTEM = (p: Record<string, string>, profile?: { occupation?: string; organization_id?: string }) => `És um assistente pessoal para pessoas portuguesas que estão a documentar e melhorar os seus projetos, sejam PAPs, estágios, projetos universitários, freelance ou profissionais, na plataforma Showo.

O teu papel é ajudar a pessoa a ter a melhor página de portfólio possível. Isso inclui dar feedback, sugerir melhorias, e quando pedido, escrever ou reformular texto para campos do projeto. Não inventas informação, usas o que a pessoa já tem e perguntas para completar o que falta.

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
- Sê direto, humano e concreto, como um colega mais experiente que quer genuinamente ajudar, não como um assistente corporativo.
- Respostas curtas: máximo 3 parágrafos ou uma lista de 4-5 itens. Nunca escrevas paredes de texto.
- Quando um campo está vazio, pergunta de forma específica sobre esse campo e cita o nome do projeto para provar que estás contextualizado.
- Quando um campo está presente mas vago, cita o que a pessoa escreveu (entre aspas) e diz exatamente o que falta ou o que tornaria o texto mais forte.
- Quando a pessoa pede ajuda genuína a escrever ou melhorar um campo (ex.: "ajuda-me a escrever isto", "melhora este texto", "reformula isto"): escreve uma proposta completa, pronta a colar, num bloco de código markdown. Diz que pode ajustar à sua voz. A proposta deve ser específica ao projeto, nunca genérica.
- Quando a pessoa pede que faças o trabalho todo por ela sem pensar em nada, só para "ter boa nota", "ficar bem" ou "despachar isto" (ex.: "faz tudo por mim", "cria-me o projeto todo", "escreve isto para eu ter boa nota"): não escrevas o conteúdo completo. Diz diretamente, sem pedir desculpa, que ${evaluatorLine(profile)}, e que é essa parte que tem de ser dela. Usa só essa ideia, sem inventares outros exemplos de quem avalia (nunca acrescentes "professor" por conta própria se não estiver na frase acima). Continua logo a seguir a oferecer ajuda real (uma pergunta concreta, uma estrutura, um primeiro rascunho curto para ela continuar) em vez de só recusar e parar aí. Nunca sejas condescendente nem agressivo, sê direto como um mentor que não deixa ninguém fugir ao trabalho.
- Para sugestões de melhorias usa listas com - e **negrito** para destacar o essencial.
- Nunca inventes factos sobre o projeto. Se precisas de informação que não está acima, pergunta primeiro, uma pergunta de cada vez.
- Nunca uses travessões (—) nem expressões genéricas como "de forma eficaz", "no âmbito de", "é fundamental", "aprendi muito".
- Se a pessoa agradecer ou fizer smalltalk, responde brevemente e redireciona para o projeto.
${PTPT_RULES}`

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
    const { project, messages = [], message, profile } = await req.json()

    // Use diary entries sent from frontend (avoids a DB query per message)
    let diaryBlock = ''
    const entries = Array.isArray(project?.journal) ? project.journal.filter((e: { content?: string }) => e.content) : []
    if (entries.length) {
      const sorted = entries.sort((a: { created_at: string }, b: { created_at: string }) => a.created_at < b.created_at ? -1 : 1).slice(-30)
      const lines = sorted.map((e: { kind: string; content: string; created_at: string }) =>
        `[${e.created_at?.slice(0, 10)}] (${e.kind}) ${(e.content || '').slice(0, 500)}`
      ).join('\n')
      diaryBlock = `\n\nDIÁRIO DO PROJETO (entradas recentes, por ordem cronológica):\n━━━━━━━━━━━━━━━━━━━━\n${lines}\n━━━━━━━━━━━━━━━━━━━━\nUsa o diário para entender a evolução real do projeto: decisões tomadas, dificuldades encontradas, progresso feito. Isto dá-te contexto que os campos acima não captam.\n\nAs entradas com (auto) foram geradas pela plataforma quando o aluno preencheu uma secção — servem só para saberes quando as coisas aconteceram. Não são palavras dele: não as cites nem as trates como reflexão do aluno.`
    }

    // Use teacher feedback sent from frontend
    let feedbackBlock = ''
    const fb = Array.isArray(project?.teacher_feedback) ? project.teacher_feedback.filter((f: { comment?: string }) => f.comment) : []
    if (fb.length) {
      const lines = fb.map((f: { field_key: string; comment: string; status: string }) =>
        `- [${f.field_key}] ${f.status === 'resolved' ? '(resolvido)' : '(pendente)'}: ${(f.comment || '').slice(0, 300)}`
      ).join('\n')
      feedbackBlock = `\n\nFEEDBACK DO PROFESSOR:\n━━━━━━━━━━━━━━━━━━━━\n${lines}\n━━━━━━━━━━━━━━━━━━━━\nO professor já deu feedback sobre secções específicas. Ajuda o estudante a resolver os pontos pendentes. Não repitas o mesmo feedback que o professor já deu.`
    }

    // Use previous defense AI data if available
    let defenseBlock = ''
    if (project?.defense_ai_data?.tip) {
      const d = project.defense_ai_data
      const tips = [d.tip, ...(d.jury_questions || []).map((q: { q: string }) => q.q)].filter(Boolean).join('; ')
      defenseBlock = `\n\nDEFESA IA (gerada anteriormente):\n━━━━━━━━━━━━━━━━━━━━\nConselho: ${d.tip}\nPerguntas do júri previstas: ${tips.slice(0, 800)}\n━━━━━━━━━━━━━━━━━━━━\nTem em conta o que a preparação da defesa já identificou.`
    }

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
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      system: SYSTEM(project ?? {}, profile) + diaryBlock + feedbackBlock + defenseBlock,
      messages: [...history, { role: 'user', content: message.trim() }],
    })
    logAiCost('coach', 'claude-sonnet-4-6', response.usage, user?.id)

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
