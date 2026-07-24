import Anthropic from 'npm:@anthropic-ai/sdk@0.36.3'
import { checkRateLimit } from '../_shared/rateLimit.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const TYPE_CONTEXT: Record<string, string> = {
  pap: 'PAP (Projeto de Aptidão Profissional) — projeto final de curso profissional, com orientador, defesa perante júri, e muita pressão académica.',
  internship: 'Estágio — experiência profissional real numa empresa, com projetos, aprendizagens e impacto mensurável.',
  group: 'Trabalho de grupo — projeto colaborativo com equipa, divisão de tarefas e dinâmica de equipa.',
  personal: 'Projeto pessoal — criado por iniciativa própria, por paixão ou para aprender algo novo.',
  competition: 'Competição — projeto criado para ganhar, com resultados e classificação reais.',
}

const TYPE_FIELDS: Record<string, string[]> = {
  pap:         ['name', 'school_course', 'supervisor', 'technologies', 'problem', 'solution', 'results', 'learnings'],
  internship:  ['name', 'company', 'technologies', 'problem', 'solution', 'results', 'learnings'],
  group:       ['name', 'team', 'technologies', 'problem', 'solution', 'challenges', 'results'],
  personal:    ['name', 'technologies', 'problem', 'solution', 'features', 'results', 'learnings'],
  competition: ['name', 'competition_name', 'team', 'technologies', 'solution', 'results', 'learnings'],
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const allowed = await checkRateLimit(req, 'interview-project')
  if (!allowed) {
    return new Response(JSON.stringify({ error: 'Demasiados pedidos. Tenta mais tarde.' }), {
      status: 429,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const { description, projectType } = await req.json()
    const client = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') ?? '' })

    const typeCtx = TYPE_CONTEXT[projectType] ?? 'Projeto de estudante.'
    const fields  = (TYPE_FIELDS[projectType] ?? TYPE_FIELDS.personal).join(', ')
    const safeDesc = String(description ?? '').trim().slice(0, 1000)

    const prompt = `És um assistente ultra-inteligente que faz entrevistas rápidas a estudantes para criar o perfil do projeto deles. Usas Português de Portugal (PT-PT) fluente e natural. Nunca usas palavras difíceis ou jargão desnecessário.

O estudante descreveu o projeto assim:
"${safeDesc || '(sem descrição)'}"

Tipo de projeto: ${typeCtx}
Campos que precisas de recolher: ${fields}

Gera EXATAMENTE este JSON (sem markdown, sem texto extra):
{
  "understanding": "<1-2 frases que mostram que percebeste o projeto — menciona o que o estudante disse de mais específico, com entusiasmo genuíno>",
  "questions": [
    {
      "id": "<field_name>",
      "label": "<nome curto do campo, 2-3 palavras max>",
      "question": "<pergunta natural, direta, como se fosses um mentor experiente — sem 'por favor' nem formalidades excessivas>",
      "field": "<nome do campo do projeto: name | school | course | pap_supervisor | technologies | problem | solution | features | target_audience | challenges | results | learnings>",
      "placeholder": "<exemplo realista do que seria uma boa resposta, 5-10 palavras>",
      "suggestions": ["<sugestão 1 específica ao projeto>", "<sugestão 2>", "<sugestão 3 opcional>"]
    }
  ]
}

REGRAS CRÍTICAS:
- Máximo 6 perguntas, mínimo 5
- NÃO perguntes o que já está claramente na descrição — usa isso como contexto, não volta a perguntar
- Cada pergunta deve ser diferente das outras — sem sobreposições
- O campo "name" tem de pedir um TÍTULO CURTO (1-4 palavras, estilo marca/app) — nunca uma frase ou descrição. Ex: "Que nome darias ao projeto? Pensa num nome curto, tipo marca — como 'StudyFor' ou 'TaskFlow'."
- Para o campo "name", OBRIGATORIAMENTE gera 2-3 sugestões de nomes criativos e curtos baseados na descrição do estudante. Analisa a descrição e inventa nomes que soem a app/marca/projeto real (ex: se o estudante descreveu "uma app para ajudar a estudar", sugere ["StudyBuddy", "FocusApp", "LearnFlow"]). Isto é CRÍTICO porque muitos estudantes não sabem que nome dar e acabam por escrever frases longas como nome
- Suggestions dos outros campos devem ser específicas ao projeto descrito, não genéricas
- Para o campo "technologies": sugere tecnologias relevantes à descrição. Se o estudante claramente não é técnico (ex: projeto de gestão, marketing, design sem código), substitui esta pergunta por "ferramentas" (ex: Canva, Excel, Figma) em vez de tecnologia de programação
- Para PAP: inclui obrigatoriamente escola/curso e orientador
- Para estágio: inclui obrigatoriamente empresa e o que aprendeu
- Para competição: inclui obrigatoriamente nome da competição e resultado/classificação
- O campo "field" deve mapear para campos reais do projeto
- "school" e "course" podem ser combinados numa só pergunta com field="school"
- "pap_supervisor" → field="pap_supervisor"
- Suggestions podem estar vazias ([]) se não houver sugestões óbvias
- TOM HUMANO: escreve cada "question" como um colega curioso perguntaria, nunca como um formulário. Evita jargão técnico nas perguntas em si (mesmo que o campo seja técnico) — explica em palavras simples o que queres saber
- Para estudantes que parecem ter pouca certeza ou pouco conteúdo na descrição (descrição curta, vaga ou genérica), adapta as perguntas para serem mais guiadas e concretas: em vez de "Que tecnologias usaste?" pergunta algo como "O que usaste para construir isto — apps, programas, materiais? Não tens de saber o nome técnico, descreve por palavras tuas." O objetivo é nunca deixar o estudante sem saber o que responder`

    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1200,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = (msg.content[0] as { type: string; text: string }).text.trim()
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('Invalid response')
    const result = JSON.parse(jsonMatch[0])

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({
      understanding: 'Ótimo! Vou fazer-te algumas perguntas rápidas para criar o teu perfil de projeto.',
      questions: [
        { id: 'name', label: 'Nome', question: 'Que nome darias ao teu projeto? Pensa num nome curto, tipo marca — como "StudyFor" ou "TaskFlow".', field: 'name', placeholder: 'ex: TaskFlow, EduApp...', suggestions: [] },
        { id: 'technologies', label: 'Tecnologias', question: 'Que tecnologias usaste?', field: 'technologies', placeholder: 'ex: React, Python, Firebase...', suggestions: ['React', 'Flutter', 'Node.js'] },
        { id: 'problem', label: 'Problema', question: 'Que problema resolve?', field: 'problem', placeholder: 'O problema que identificaste...', suggestions: [] },
        { id: 'solution', label: 'Solução', question: 'Como resolveste esse problema?', field: 'solution', placeholder: 'A tua abordagem...', suggestions: [] },
        { id: 'results', label: 'Resultados', question: 'Que resultados ou impacto conseguiste?', field: 'results', placeholder: 'O que mudou graças ao teu projeto...', suggestions: [] },
        { id: 'learnings', label: 'Aprendizagens', question: 'O que aprendeste de mais valioso?', field: 'learnings', placeholder: 'A maior lição...', suggestions: [] },
      ],
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
