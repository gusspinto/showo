import Anthropic from 'npm:@anthropic-ai/sdk@0.36.3'
import { checkRateLimit } from '../_shared/rateLimit.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const allowed = await checkRateLimit(req, 'analyze-project')
  if (!allowed) {
    return new Response(JSON.stringify({ error: 'Demasiados pedidos. Tenta mais tarde.' }), {
      status: 429,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const { data: project } = await req.json()
    const client = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') ?? '' })

    const f = (v: string | undefined | null) => (v?.trim() || '').slice(0, 3000)
    const hasContent = (v: string | undefined | null) => (v?.trim()?.length ?? 0) > 10

    const prompt = `És um mentor sénior especializado em avaliar projetos de estudantes portugueses — PAPs, estágios, projetos universitários e pessoais. Tens 20 anos de experiência em júris de avaliação no sistema de ensino português.

Sabes que os júris avaliam sobretudo: clareza do problema, lógica da solução, evidência de execução real (resultados, tecnologias concretas, utilizadores) e capacidade de reflexão (desafios e aprendizagens). Um projeto com campos vagos ou genéricos não convence um júri, mesmo que o trabalho feito seja bom.

O teu objetivo é dar feedback HONESTO, ESPECÍFICO e ACIONÁVEL. Nunca sejas vago. Cita o que o estudante escreveu e diz exatamente o que falta ou o que está bem.

PROJETO A AVALIAR:
━━━━━━━━━━━━━━━━━━━━━━
Nome: ${f(project.name) || '(sem nome)'}
Tipo: ${f(project.project_type) || '(não especificado)'}
Área: ${f(project.area) || '(não especificada)'}

OBJETIVO: ${f(project.goal) || '(vazio)'}

PROBLEMA: ${f(project.problem) || '(vazio)'}

SOLUÇÃO: ${f(project.solution) || '(vazio)'}

PÚBLICO-ALVO: ${f(project.target_audience) || '(vazio)'}

FUNCIONALIDADES: ${f(project.features) || '(vazio)'}

TECNOLOGIAS: ${f(project.technologies) || '(vazio)'}

DESAFIOS: ${f(project.challenges) || '(vazio)'}

RESULTADOS: ${f(project.results) || '(vazio)'}

APRENDIZAGENS: ${f(project.learnings) || '(vazio)'}
━━━━━━━━━━━━━━━━━━━━━━

CRITÉRIOS DE AVALIAÇÃO:
- "forte": conteúdo específico, claro, com exemplos ou números concretos. Impressiona um júri.
- "médio": conteúdo presente mas genérico, vago, ou demasiado curto para ser convincente.
- "fraco": vazio, uma frase só, ou informação que não diz nada de útil.

REGRAS CRÍTICAS:
1. Cita literalmente partes do que o estudante escreveu no feedback (usa aspas)
2. O "tip" deve ser uma ação concreta e específica — nunca "podes melhorar" sem dizer COMO. Ex mau: "Adiciona mais detalhes". Ex bom: "Acrescenta quantos utilizadores testaram a app e o que disseram — mesmo que seja 'testei com 3 colegas e conseguiram X sem ajuda'."
3. Se o campo tiver 1-2 palavras como "a" ou "teste", considera FRACO e diz isso claramente
4. Para campos vazios: feedback = "Este campo está vazio." e tip = o que escrever especificamente naquele campo dado o contexto do projeto
5. Usa PT-PT natural, direto, sem formalidades nem elogios vazios
6. O "overall" nomeia especificamente os 1-2 campos mais fracos e diz o que falta — não é um elogio de encorajamento
7. O "score_hint" identifica o campo com MAIOR gap entre o que está e o que poderia estar, e diz exatamente o que acrescentar — 1 frase curta e direta
8. Para o campo "challenges": um júri quer ver que o estudante enfrentou dificuldades reais e as resolveu. Se o campo estiver vazio ou genérico, é sempre um ponto fraco porque parece que o projeto foi fácil demais ou que o estudante não refletiu.
9. Para o campo "results": sem resultados concretos (números, testes, utilizadores, feedback real) o projeto parece incompleto. Mesmo "testei com 5 pessoas" é melhor que nada.

Responde APENAS com este JSON (sem markdown, sem texto extra):
{
  "overall": "<nomeia os 2 campos mais fracos e o que falta — 2 frases honestas, sem elogios de encorajamento>",
  "score_hint": "<campo com maior potencial de melhoria + o que escrever lá — 1 frase, muito específica>",
  "sections": {
    "goal":            { "rating": "fraco|médio|forte", "feedback": "<cita o conteúdo com aspas e diz o que falta ou confirma o que está bem>", "tip": "<ação concreta — o quê, não só como>" },
    "problem":         { "rating": "...", "feedback": "...", "tip": "..." },
    "solution":        { "rating": "...", "feedback": "...", "tip": "..." },
    "target_audience": { "rating": "...", "feedback": "...", "tip": "..." },
    "features":        { "rating": "...", "feedback": "...", "tip": "..." },
    "technologies":    { "rating": "...", "feedback": "...", "tip": "..." },
    "challenges":      { "rating": "...", "feedback": "...", "tip": "..." },
    "results":         { "rating": "...", "feedback": "...", "tip": "..." },
    "learnings":       { "rating": "...", "feedback": "...", "tip": "..." }
  }
}`

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1800,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = (message.content[0] as { type: string; text: string }).text.trim()
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('Resposta inválida da IA')

    return new Response(jsonMatch[0], {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
