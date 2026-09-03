import Anthropic from 'npm:@anthropic-ai/sdk@0.36.3'
import { checkRateLimit, getAuthUser, clip, checkPlanLimit, getCorsHeaders, PTPT_RULES, repairJson } from '../_shared/rateLimit.ts'

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const user = await getAuthUser(req)
  if (!user) {
    return new Response(JSON.stringify({ error: 'Autenticação necessária.' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const allowed = await checkRateLimit(req, 'cover-letter', 5)
  if (!allowed) {
    return new Response(JSON.stringify({ error: 'Demasiados pedidos. Tenta mais tarde.' }), {
      status: 429,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const planCheck = await checkPlanLimit(req, 'coverLetter', user.id)
  if (planCheck && !planCheck.allowed) {
    return new Response(JSON.stringify({ error: 'Limite do plano atingido.', remaining: 0, limit: planCheck.limit }), {
      status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const { projects, studentName, company, sector, type } = await req.json()

    const client = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') ?? '' })

    const safeProjects = (Array.isArray(projects) ? projects.slice(0, 5) : [])
    const projectSummaries = safeProjects.map((p: any, i: number) =>
      `Projeto ${i+1}: ${clip(p.name, 100)} — ${clip(p.ai_tagline || p.goal, 200)} (tecnologias: ${clip(p.technologies, 200)})`
    ).join('\n')

    const prompt = `És um assistente que ajuda estudantes portugueses a escrever candidaturas de ${type === 'job' ? 'emprego' : 'estágio'} que soem autênticas e convencem um recrutador real.

ESTUDANTE: ${clip(studentName, 100)}
EMPRESA/ORGANIZAÇÃO: ${clip(company, 200)}
SETOR: ${clip(sector || 'não especificado', 100)}
TIPO: ${type === 'job' ? 'Emprego' : 'Estágio'}

PROJETOS DO ESTUDANTE (usa estes para contextualizar, menciona 1-2 de forma natural):
${projectSummaries}

REGRAS CRÍTICAS:
- Escreve em português europeu (PT-PT): "candidatura" (não "aplicação"), "estagiário" (não "estagiante"), "à vossa atenção" se necessário.
- Tom: jovem, direto e confiante — sem ser arrogante. Não usa frases corporativas vazias como "venho por este meio", "sou uma pessoa proativa e dinâmica", "tenho muito a oferecer". Soa a uma pessoa real.
- Saudação do email: "Olá," ou "Bom dia," seguido do nome da empresa (não "Caro/Cara" — é demasiado formal para candidaturas jovens).
- O assunto do email deve ser específico: inclui nome e tipo de candidatura. Ex: "Ana Costa — Candidatura a Estágio em Design".
- Menciona 1-2 projetos do estudante de forma natural, não como uma lista — integra-os na narrativa.
- Mensagem LinkedIn: sem saudação formal, vai direto ao ponto, máx 3 frases. Ex: "Olá [nome], vi uma vaga de estágio na [empresa] e fiquei muito curioso. Tenho um projeto de X que pode ser relevante — posso partilhar o meu portfólio?"
- Email: máx 140 palavras no corpo. LinkedIn: máx 70 palavras.
- Nunca uses travessões (—).
- highlight: identifica QUAL projeto do estudante é mais relevante para ESTA empresa/setor e diz porquê em 1 frase curta.

Devolve APENAS este JSON (sem markdown):
{
  "email_subject": "Assunto específico com nome do estudante e tipo de candidatura",
  "email_body": "Corpo completo do email com saudação, 2-3 parágrafos e despedida natural",
  "linkedin_message": "Mensagem direta para LinkedIn, sem saudação formal, máx 3 frases",
  "highlight": "1 frase: qual projeto e porque e o mais relevante para esta empresa"
}
${PTPT_RULES}`

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1200,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = (message.content[0] as { type: string; text: string }).text.trim()
    const result = repairJson(raw)

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
