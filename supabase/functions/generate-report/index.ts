import Anthropic from 'npm:@anthropic-ai/sdk@0.36.3'
import { checkRateLimit, getAuthUser } from '../_shared/rateLimit.ts'

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

  const allowed = await checkRateLimit(req, 'generate-report', 5)
  if (!allowed) {
    return new Response(JSON.stringify({ error: 'Demasiados pedidos. Tenta mais tarde.' }), {
      status: 429,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const { project, type } = await req.json()
    const client = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') ?? '' })

    const isPap = type === 'pap'
    const f = (v: string | undefined | null) => (v?.trim() || '(não preenchido)').slice(0, 3000)

    const prompt = `És um redator especializado em relatórios académicos portugueses. Vais gerar um rascunho completo de ${isPap ? 'relatório de PAP (Projeto e Apresentação Profissional)' : 'relatório de estágio'} com base nos dados de um projeto de um aluno.

O rascunho deve estar em português europeu, ser formal mas natural, e ter a estrutura típica exigida pelas escolas profissionais portuguesas.

DADOS DO PROJETO:
━━━━━━━━━━━━━━━━
Nome do projeto: ${f(project.name)}
Tipo: ${f(project.project_type)}
Área: ${f(project.area)}
Escola: ${f(project.school)}
Curso: ${f(project.course)}
Criador: ${f(project.creator_name)}

OBJETIVO GERAL: ${f(project.goal)}
PROBLEMA QUE RESOLVE: ${f(project.problem)}
SOLUÇÃO DESENVOLVIDA: ${f(project.solution)}
PÚBLICO-ALVO: ${f(project.target_audience)}
FUNCIONALIDADES: ${f(project.features)}
TECNOLOGIAS UTILIZADAS: ${f(project.technologies)}
DESAFIOS ENCONTRADOS: ${f(project.challenges)}
RESULTADOS OBTIDOS: ${f(project.results)}
APRENDIZAGENS: ${f(project.learnings)}
━━━━━━━━━━━━━━━━

Gera um rascunho estruturado com as seguintes secções. Cada secção deve ter 2-4 parágrafos fluidos e bem redigidos, baseados nos dados fornecidos. Quando os dados forem vagos, expande com linguagem académica apropriada mas mantém-te fiel ao que o aluno escreveu.

Devolve APENAS este JSON (sem markdown, sem \`\`\`, só o objeto):
{
  "resumo": "Parágrafo de resumo executivo (3-4 frases)",
  "introducao": "Secção de introdução com contexto e motivação (2-3 parágrafos)",
  "problema": "Secção de identificação e análise do problema (2-3 parágrafos)",
  "solucao": "Secção de descrição da solução e metodologia (2-3 parágrafos)",
  "desenvolvimento": "Secção de desenvolvimento técnico e funcionalidades (2-3 parágrafos)",
  "resultados": "Secção de resultados e validação (2-3 parágrafos)",
  "reflexao": "Secção de reflexão crítica e aprendizagens (2 parágrafos)",
  "conclusao": "Secção de conclusão (1-2 parágrafos)",
  "word_count": 800
}`

    const message = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text.trim() : ''
    let report
    try {
      report = JSON.parse(text)
    } catch {
      const match = text.match(/\{[\s\S]*\}/)
      report = match ? JSON.parse(match[0]) : { error: 'Erro ao processar resposta da IA' }
    }

    return new Response(JSON.stringify(report), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: 'Erro interno. Tenta novamente.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
