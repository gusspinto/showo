import Anthropic from 'npm:@anthropic-ai/sdk@0.36.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { projects, studentName, company, sector, type } = await req.json()
    // type: 'internship' | 'job'

    const client = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') ?? '' })

    const projectSummaries = projects.map((p: any, i: number) =>
      `Projeto ${i+1}: ${p.name} — ${p.ai_tagline || p.goal || ''} (tecnologias: ${p.technologies || 'não especificado'})`
    ).join('\n')

    const prompt = `És um assistente que ajuda estudantes portugueses a escrever candidaturas de ${type === 'job' ? 'emprego' : 'estágio'} profissionais e autênticas.

ESTUDANTE: ${studentName}
EMPRESA/ORGANIZAÇÃO: ${company}
SETOR: ${sector || 'tecnologia'}
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
