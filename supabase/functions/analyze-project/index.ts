import Anthropic from 'npm:@anthropic-ai/sdk@0.36.3'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { checkRateLimit, getAuthUser, getCorsHeaders, checkPlanLimit, PTPT_RULES, repairJson } from '../_shared/rateLimit.ts'

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const user = await getAuthUser(req)
  if (!user) {
    return new Response(JSON.stringify({ error: 'Autenticação necessária.' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const allowed = await checkRateLimit(req, 'analyze-project')
  if (!allowed) {
    return new Response(JSON.stringify({ error: 'Demasiados pedidos. Tenta mais tarde.' }), {
      status: 429,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const planCheck = await checkPlanLimit(req, 'analyzeProject', user.id)
  if (planCheck && !planCheck.allowed) {
    return new Response(JSON.stringify({ error: 'Limite do plano atingido.', remaining: 0, limit: planCheck.limit }), {
      status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const { data: project } = await req.json()
    const client = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') ?? '' })

    // Fetch diary entries for richer context
    let diaryBlock = ''
    if (project?.id) {
      const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
      const { data: entries } = await sb
        .from('project_journal_entries')
        .select('kind, content, created_at')
        .eq('project_id', project.id)
        .order('created_at', { ascending: false })
        .limit(30)
      if (entries?.length) {
        const lines = entries.reverse().map((e: { kind: string; content: string; created_at: string }) =>
          `[${e.created_at?.slice(0, 10)}] (${e.kind}) ${e.content.slice(0, 500)}`
        ).join('\n')
        diaryBlock = `\n\nDIÁRIO DO PROJETO (entradas recentes do estudante, por ordem cronológica):\n━━━━━━━━━━━━━━━━━━━━━━\n${lines}\n━━━━━━━━━━━━━━━━━━━━━━\nUsa o diário para contexto adicional na avaliação: o estudante pode ter feito trabalho real que ainda não está refletido nos campos acima. Considera o diário ao avaliar a profundidade do projeto.`
      }
    }

    // Fetch teacher feedback
    let feedbackBlock = ''
    if (project?.id) {
      const sb2 = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
      const { data: fb } = await sb2
        .from('teacher_feedback')
        .select('field_key, comment, status')
        .eq('project_id', project.id)
      if (fb?.length) {
        const lines = fb.map((f: { field_key: string; comment: string; status: string }) =>
          `- [${f.field_key}] ${f.status === 'resolved' ? '(resolvido)' : '(pendente)'}: ${(f.comment || '').slice(0, 300)}`
        ).join('\n')
        feedbackBlock = `\n\nFEEDBACK DO PROFESSOR:\n━━━━━━━━━━━━━━━━━━━━━━\n${lines}\n━━━━━━━━━━━━━━━━━━━━━━\nO professor já deu feedback. Tem isto em conta na avaliação: secções com feedback pendente devem ser avaliadas considerando o que o professor apontou.`
      }
    }

    // Fetch defense AI data for cross-context
    let defenseBlock = ''
    if (project?.id) {
      const sb3 = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
      const { data: proj } = await sb3.from('projects').select('defense_ai_data').eq('id', project.id).single()
      if (proj?.defense_ai_data?.tip) {
        const d = proj.defense_ai_data
        const qs = (d.jury_questions || []).map((q: { q: string }) => q.q).filter(Boolean).join('; ')
        defenseBlock = `\n\nDEFESA IA (gerada anteriormente):\n━━━━━━━━━━━━━━━━━━━━━━\nConselho: ${d.tip}\nPerguntas do júri previstas: ${qs.slice(0, 800)}\n━━━━━━━━━━━━━━━━━━━━━━\nConsidera o que a preparação da defesa identificou ao avaliar o projeto.`
      }
    }

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
━━━━━━━━━━━━━━━━━━━━━━${diaryBlock}${feedbackBlock}${defenseBlock}

CRITÉRIOS DE AVALIAÇÃO:
- "forte": conteúdo específico, claro, com exemplos ou números concretos. Impressiona um júri.
- "médio": conteúdo presente mas genérico, vago, ou demasiado curto para ser convincente.
- "fraco": vazio, uma frase só, ou informação que não diz nada de útil.

REGRAS:
1. Cita partes do que o estudante escreveu (usa aspas)
2. O "tip" deve ser uma acao concreta em 1 frase curta. Maximo 25 palavras. Diz O QUE escrever, nao expliques porquê.
3. Se o campo tiver 1-2 palavras, considera FRACO
4. Para campos vazios: feedback = "Este campo esta vazio." e tip = o que escrever
5. Usa PT-PT natural, direto, sem formalidades. Nao uses travessoes no texto
6. O "overall" nomeia os 1-2 campos mais fracos e o que falta
7. O "score" e um numero inteiro de 1 a 10. Se rigoroso: campos vazios pesam muito, projeccoes sem validacao real pesam, campos fortes com dados concretos sobem a nota
8. O "score_hint" identifica o campo com maior gap e o que acrescentar em 1 frase
9. Se conciso: cada feedback em 1-2 frases curtas
10. Para "technologies": avalia se o estudante justificou as escolhas E se mencionou custos ou comparou alternativas. Se so listou nomes sem justificacao, e "medio". Se incluiu custos e razoes de escolha, e "forte".

Responde APENAS com JSON valido. NAO uses markdown, NAO uses blocos de codigo com crases, NAO incluas texto antes ou depois do JSON.

O JSON tem esta estrutura: um objeto com "overall" (string), "score" (numero inteiro 1-10), "score_hint" (string), e "sections" (objeto com 9 chaves: goal, problem, solution, target_audience, features, technologies, challenges, results, learnings - cada uma com "rating" que e "fraco" ou "medio" ou "forte", "feedback" string, e "tip" string).
${PTPT_RULES}`

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = (message.content[0] as { type: string; text: string }).text.trim()
    const parsed = repairJson(raw)

    return new Response(JSON.stringify(parsed), {
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
