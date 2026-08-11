import Anthropic from 'npm:@anthropic-ai/sdk@0.36.3'
import { checkRateLimit, getAuthUser, getCorsHeaders, checkPlanLimit } from '../_shared/rateLimit.ts'

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

  const allowed = await checkRateLimit(req, 'defense-notes')
  if (!allowed) {
    return new Response(JSON.stringify({ slide_notes: {}, jury_questions: [], tip: '' }), {
      status: 429,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const planCheck = await checkPlanLimit(req, 'defense', user.id)
  if (planCheck && !planCheck.allowed) {
    return new Response(JSON.stringify({ error: 'Limite do plano atingido.', remaining: 0, limit: planCheck.limit }), {
      status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const { project } = await req.json()
    const client = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') ?? '' })

    const f = (v: string | undefined | null) => (v?.trim() || '').slice(0, 2000)

    const prompt = `És um coach de apresentações experiente que prepara estudantes portugueses para defesas de PAP e projetos escolares perante júri. Conheces bem o contexto: júris de cursos profissionais e universitários em Portugal, professores que avaliam pela lógica do projeto, pelos fundamentos técnicos e pela capacidade de o estudante defender as suas escolhas.

PROJETO A PREPARAR:
━━━━━━━━━━━━━━━━━
Nome: ${f(project.name) || '(sem nome)'}
Objetivo: ${f(project.goal) || '(não preenchido)'}
Problema: ${f(project.problem) || '(não preenchido)'}
Solução: ${f(project.solution) || '(não preenchido)'}
Funcionalidades: ${f(project.features) || '(não preenchido)'}
Tecnologias: ${f(project.technologies) || '(não preenchido)'}
Público-alvo: ${f(project.target_audience) || '(não preenchido)'}
Desafios: ${f(project.challenges) || '(não preenchido)'}
Resultados: ${f(project.results) || '(não preenchido)'}
Aprendizagens: ${f(project.learnings) || '(não preenchido)'}
━━━━━━━━━━━━━━━━━

REGRAS CRÍTICAS — lê antes de gerar qualquer conteúdo:

1. ZERO FRASES GENÉRICAS. Nunca escrevas: "foi um desafio enorme", "aprendi muito", "foi muito importante para mim", "é fundamental", "de forma eficaz", "no âmbito de", "neste sentido". Cada frase deve ser específica a ESTE projeto. Nunca uses travessões (—) no texto gerado.

2. NOTAS DE ORADOR: Escreve o que o estudante vai DIZER EM VOZ ALTA — frases completas, naturais, que soam bem faladas. Não instruções do tipo "explica a solução" — escreve a frase em si. Usa o nome real do projeto e detalhes reais.

3. PONTOS-CHAVE: São os 3 factos/dados/argumentos que o júri TEM de ouvir. Se o projeto tem números, usa-os. Se tem tecnologias específicas, cita-as. Máx 10 palavras cada, direto ao assunto.

4. PERGUNTAS DO JÚRI: Devem ser derivadas do conteúdo REAL deste projeto. Um júri português pergunta tipicamente:
   - Porquê essa tecnologia/ferramenta e não outra?
   - O que mudaras se fizesses de novo?
   - Como testaste que a solução funciona?
   - Quem são os teus utilizadores e como reagiram?
   - Qual foi a parte mais difícil e como a resolveste?
   - Que resultados concretos conseguiste?
   Adapta as perguntas ao que está (ou falta) neste projeto específico. Se algo parecer fraco ou incompleto, é precisamente aí que o júri vai pressionar.

5. RESPOSTA ÀS PERGUNTAS: Honesta, concisa, sem bluff. Se o projeto não tem dados concretos, a resposta sugerida deve admiti-lo com elegância: "Ainda não temos dados formais, mas em testes informais com X utilizadores, o feedback foi Y."

Devolve APENAS este JSON (sem markdown):
{
  "slide_notes": {
    "cover": "<2-3 frases que o estudante diz ao abrir a apresentação — usa o nome do projeto e o que ele faz, tom confiante e direto>",
    "problem": "<como apresentar o problema — cita o que está no projeto, torna-o concreto e real para o júri>",
    "solution": "<como explicar a solução — referencia a tecnologia/abordagem real, explica a lógica por trás>",
    "features": "<como apresentar as funcionalidades — escolhe as 2-3 mais impactantes para destacar>",
    "technologies": "<como falar das tecnologias — explica por que foram escolhidas, não só o que são>",
    "results": "<como apresentar os resultados — se há números usa-os, se não há diz o que foi observado>",
    "learnings": "<como partilhar aprendizagens — específico, não 'aprendi muito' mas 'aprendi que X é diferente de Y'>",
    "closing": "<como fechar e abrir para perguntas — referencia o impacto real do projeto>"
  },
  "key_points": {
    "cover":        ["<facto/contexto específico>", "<o que o projeto faz em palavras simples>", "<porquê este projeto importa>"],
    "problem":      ["<dado ou observação concreta sobre o problema>", "<quem sofre com este problema>", "<dimensão do problema se aplicável>"],
    "solution":     ["<abordagem principal da solução>", "<diferenciador da solução>", "<tecnologia/método central>"],
    "features":     ["<funcionalidade mais impactante>", "<funcionalidade que resolve o problema principal>", "<algo que surpreende>"],
    "technologies": ["<tecnologia principal + porquê>", "<integração mais complexa>", "<decisão técnica relevante>"],
    "results":      ["<resultado mais concreto ou mensurável>", "<feedback real se houver>", "<o que o projeto conseguiu de facto>"],
    "learnings":    ["<aprendizagem técnica específica>", "<aprendizagem de processo/gestão>", "<o que faria diferente>"],
    "closing":      ["<impacto real ou potencial do projeto>", "<próximo passo natural>", "<convite à discussão>"]
  },
  "jury_questions": [
    { "q": "<pergunta específica sobre uma escolha técnica ou metodológica DESTE projeto>", "a": "<resposta honesta e concisa que demonstra domínio>" },
    { "q": "<pergunta sobre os resultados ou validação>", "a": "<resposta que quantifica ou contextualiza>"},
    { "q": "<pergunta sobre os desafios e como foram superados>", "a": "<resposta específica ao desafio real mencionado>"},
    { "q": "<pergunta que o júri faz quando quer pressionar uma fraqueza óbvia do projeto>", "a": "<resposta que reconhece e propõe melhoria>" },
    { "q": "<pergunta sobre as aprendizagens pessoais e profissionais>", "a": "<resposta concreta, não genérica>" },
    { "q": "<pergunta sobre o futuro ou escalabilidade do projeto>", "a": "<resposta realista e fundamentada>" }
  ],
  "tip": "<um conselho de apresentação ESPECÍFICO para este projeto — algo que este estudante deve fazer ou evitar dado o conteúdo concreto do projeto>"
}`

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2800,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = (message.content[0] as { type: string; text: string }).text.trim()
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('Resposta inválida')
    const notes = JSON.parse(jsonMatch[0])

    return new Response(JSON.stringify(notes), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ slide_notes: {}, jury_questions: [], tip: '' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
