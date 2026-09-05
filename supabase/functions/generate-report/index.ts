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

  const allowed = await checkRateLimit(req, 'generate-report', 5)
  if (!allowed) {
    return new Response(JSON.stringify({ error: 'Demasiados pedidos. Tenta mais tarde.' }), {
      status: 429,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const planCheck = await checkPlanLimit(req, 'diaryReport', user.id)
  if (planCheck && !planCheck.allowed) {
    return new Response(JSON.stringify({ error: 'Limite do plano atingido.', remaining: 0, limit: planCheck.limit }), {
      status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const { project, type, journal, teacher_feedback } = await req.json()
    const client = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') ?? '' })

    const isPap = type === 'pap'
    const f = (v: string | undefined | null) => (v?.trim() || '(não preenchido)').slice(0, 3000)

    // O diário do projeto: o registo que o aluno foi fazendo ao longo do tempo.
    // É o que separa um relatório genérico de um relatório com percurso — traz
    // datas, decisões e obstáculos reais que o formulário não capta.
    const KIND_LABEL: Record<string, string> = {
      progresso: 'Progresso', dificuldade: 'Dificuldade', decisao: 'Decisão',
      pesquisa: 'Pesquisa', ideia: 'Ideia', resultado: 'Resultado', nota: 'Nota',
    }
    const entries = Array.isArray(journal) ? journal.slice(0, 120) : []
    const journalBlock = entries.length === 0
      ? '(o aluno ainda não registou entradas no diário)'
      : entries
          .slice()
          .sort((a, b) => String(a.date).localeCompare(String(b.date)))
          .map((e) => {
            const when = new Date(e.date).toLocaleDateString('pt-PT', {
              day: 'numeric', month: 'long', year: 'numeric',
            })
            return `[${when}] ${KIND_LABEL[e.kind] ?? 'Nota'}: ${String(e.content ?? '').slice(0, 800)}`
          })
          .join('\n')

    const prompt = `És um redator especializado em relatórios académicos portugueses. Vais gerar um rascunho completo de ${isPap ? 'relatório de PAP (Projeto de Aptidão Profissional)' : 'relatório de estágio'} com base nos dados de um projeto de um aluno.

REGRAS DE ESCRITA:
- Português europeu (PT-PT): "utilizador" (não "usuário"), "ecrã" (não "tela"), "aplicação" (não "aplicativo").
- Tom formal mas natural — como um aluno que sabe escrever, não como um relatório gerado por IA.
- Sem travessões (—). Sem expressões genéricas: "de forma eficaz", "no âmbito de", "neste sentido", "é de salientar", "foi um desafio enorme".
- Cada parágrafo deve conter informação real e específica deste projeto — nunca enche com frases vazias.
- Escreve na primeira pessoa do singular ("desenvolvi", "identifiquei", "aprendi") para PAP; primeira pessoa do plural ("desenvolvemos") para projetos de grupo.
- NUNCA inventes factos, datas, números ou resultados que não estejam nos dados — se algo não foi registado, generaliza com cuidado.

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

DIÁRIO DO PROJETO (registos cronológicos do aluno — usa como fonte principal do percurso):
━━━━━━━━━━━━━━━━
${journalBlock}
━━━━━━━━━━━━━━━━

O diário é ouro: tem decisões reais, dificuldades reais e a voz do aluno. Usa-o para:
- Mostrar a evolução cronológica do projeto ("numa fase inicial", "após os primeiros testes", "no final do desenvolvimento").
- Mencionar decisões concretas e o raciocínio por trás delas.
- Referir dificuldades reais e como foram superadas.
- Dar vida ao relatório com detalhe que o formulário não captura.
Se o diário estiver vazio, baseia-te apenas nos campos do formulário e escreve de forma mais geral.
${(() => {
  const fb = Array.isArray(teacher_feedback) ? teacher_feedback.filter((f: { comment?: string }) => f.comment) : []
  if (!fb.length) return ''
  const lines = fb.map((f: { field_key: string; comment: string; status: string }) =>
    `- [${f.field_key}] ${f.status === 'resolved' ? '(resolvido)' : '(pendente)'}: ${(f.comment || '').slice(0, 300)}`
  ).join('\n')
  return `\nFEEDBACK DO PROFESSOR:\n━━━━━━━━━━━━━━━━\n${lines}\n━━━━━━━━━━━━━━━━\nO professor deu feedback sobre o projeto. Usa os pontos resolvidos como evidência de iteração e melhoria no relatório.\n`
})()}
Cada secção deve ter 2-4 parágrafos fluidos. Qualidade > quantidade — é melhor um parágrafo sólido do que dois com enchimento.

Devolve APENAS este JSON (sem markdown, sem \`\`\`, só o objeto):
{
  "resumo": "Resumo executivo: o que é o projeto, o que resolve e o principal resultado — 3-4 frases específicas",
  "introducao": "Introdução com contexto, motivação pessoal/académica e estrutura do relatório — 2-3 parágrafos",
  "problema": "Identificação e análise do problema: quem sofre com ele, porquê existe, como foi identificado — 2-3 parágrafos",
  "solucao": "Descrição da solução e metodologia: abordagem escolhida, porquê esta e não outra, como foi planeada — 2-3 parágrafos",
  "desenvolvimento": "Desenvolvimento: tecnologias usadas e porquê, funcionalidades construídas, decisões técnicas relevantes do diário — 2-3 parágrafos",
  "resultados": "Resultados e validação: o que foi concretamente alcançado, testes, feedback ou impacto real — 2-3 parágrafos",
  "reflexao": "Reflexão crítica: o que correu bem, o que faria diferente, aprendizagens específicas técnicas e pessoais — 2 parágrafos",
  "conclusao": "Conclusão: síntese do percurso, valor do projeto e perspetivas futuras — 1-2 parágrafos",
  "word_count": 900
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
