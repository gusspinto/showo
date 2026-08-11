import Anthropic from 'npm:@anthropic-ai/sdk@0.36.3'
import { checkRateLimit, getAuthUser, clip, checkPlanLimit } from '../_shared/rateLimit.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://showo.pt',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
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

    const prompt = `És um assistente que ajuda estudantes portugueses a escrever candidaturas de ${type === 'job' ? 'emprego' : 'estágio'} profissionais e autênticas.

ESTUDANTE: ${clip(studentName, 100)}
EMPRESA/ORGANIZAÇÃO: ${clip(company, 200)}
SETOR: ${clip(sector || 'tecnologia', 100)}
TIPO: ${type === 'job' ? 'Emprego' : 'Estágio'}

PROJETOS DO ESTUDANTE:
${projectSummaries}

Gera uma candidatura autêntica, em português de Portugal, que:
- Soe a um jovem real (não a um robô corporativo)
- Mencione projetos específicos de forma natural
- Mostre entusiasmo genuíno pela empresa
- Seja concisa (email: máx 150 palavras, LinkedIn: máx 80 palavras)

Devolve APENAS este JSON (sem markdown):
{
  "email_subject": "Assunto do email (direto e específico)",
  "email_body": "Corpo do email completo com saudação e despedida",
  "linkedin_message": "Mensagem curta para LinkedIn (1º contacto com recrutador)",
  "highlight": "O projeto mais relevante para esta candidatura e porquê (1 frase)"
}`

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = (message.content[0] as { type: string; text: string }).text.trim()
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('Resposta inválida')

    return new Response(jsonMatch[0], {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
