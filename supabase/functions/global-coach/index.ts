import Anthropic from 'npm:@anthropic-ai/sdk@0.36.3'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Versão "geral" do Coach IA, acessível a partir da sidebar (não de dentro
// de um projeto específico). Mesmo quota do plano (feature 'coach'),
// mesma IA, mas sem contexto de nenhum projeto em concreto — para quem
// ainda nem criou projeto, ou quer conselho que não é sobre um projeto só.
// Helpers inline (em vez de importar de ../_shared/rateLimit.ts) porque o
// bundler do deploy_edge_function não resolve imports relativos entre
// funções — já visto antes com notify-candidatura.

const ALLOWED_ORIGINS = ['https://showo.pt', 'https://www.showo.pt', 'https://showo.vercel.app']

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') ?? ''
  const allow = ALLOWED_ORIGINS.includes(origin) || origin.startsWith('http://localhost')
    ? origin
    : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
}

async function checkRateLimit(req: Request, fnName: string, limit = 10): Promise<boolean> {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? req.headers.get('x-real-ip') ?? 'unknown'
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { data, error } = await supabase.rpc('check_fn_rate_limit', { p_key: `${ip}:${fnName}`, p_limit: limit })
  if (error) { console.error('[rateLimit] check failed:', error.message); return false }
  return data === true
}

async function getAuthUser(req: Request) {
  const jwt = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!jwt) return null
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { data: { user } } = await supabase.auth.getUser(jwt)
  return user ?? null
}

const UPGRADE_TARGET: Record<string, { name: string; blurb: string } | null> = {
  free: { name: 'Plus', blurb: 'Com o Plus tens muito mais IA por mês e continuas exatamente de onde paraste.' },
  school: null,
  plus: { name: 'Pro', blurb: 'Com o Pro tens o dobro (ou mais) de cada feature e projetos ilimitados.' },
  pro: null,
}

// deno-lint-ignore no-explicit-any
async function notifyLimitExhausted(supabase: any, userId: string, feature: string) {
  const resendKey = Deno.env.get('RESEND_API_KEY')
  if (!resendKey) return
  const { data: profile } = await supabase.from('profiles').select('full_name, plan, role, organization_id').eq('id', userId).single()
  if (!profile) return
  let planId = profile.plan ?? 'free'
  if (profile.role === 'professor') return
  if (profile.organization_id) planId = 'school'
  if (planId === 'build') planId = 'plus'
  if (planId === 'launch') planId = 'pro'
  const target = UPGRADE_TARGET[planId]
  if (!target) return
  const { data: userRes } = await supabase.auth.admin.getUserById(userId)
  const email = userRes?.user?.email
  if (!email) return
  const name = profile.full_name?.split(' ')[0] || 'olá'
  const html = `
  <div style="font-family:Arial,sans-serif;max-width:460px;margin:0 auto;padding:40px 20px;">
    <img src="https://showo.pt/icon.png" alt="Showo" width="100" style="display:block;margin:0 auto 32px;" />
    <h2 style="text-align:center;font-size:18px;font-weight:600;color:#1a1a1a;margin:0 0 8px;">Olá, ${name}</h2>
    <p style="text-align:center;font-size:14px;color:#666;line-height:1.6;margin:0 0 12px;">Esgotaste o <strong>Coach IA</strong> este mês.</p>
    <p style="text-align:center;font-size:14px;color:#666;line-height:1.6;margin:0 0 28px;">${target.blurb}</p>
    <table border="0" cellspacing="0" cellpadding="0" align="center" style="margin:0 auto 28px;">
      <tr><td align="center" style="background:#4a93f9;border-radius:8px;"><a href="https://showo.pt/pricing" target="_blank" style="display:inline-block;padding:12px 36px;font-family:Arial,sans-serif;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;">Ver o plano ${target.name}</a></td></tr>
    </table>
    <p style="text-align:center;font-size:11px;color:#aaa;margin:0;">O limite renova no início do próximo mês. Precisas de ajuda? Responde a este email.</p>
  </div>`
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: 'Showo <hello@showo.pt>', to: email, subject: 'Coach IA esgotou este mês', html }),
  })
  if (!res.ok) console.error('[planLimit] Resend error:', await res.text())
}

async function checkPlanLimit(feature: string, userId: string): Promise<{ allowed: boolean; remaining: number; limit: number; used: number } | null> {
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { data, error } = await supabase.rpc('check_ai_limit', { p_user_id: userId, p_feature: feature })
  if (error) { console.error('[planLimit] check failed:', error.message); return null }
  const result = data as { allowed: boolean; remaining: number; limit: number; used: number }
  if (result.allowed && result.remaining === 0) {
    notifyLimitExhausted(supabase, userId, feature).catch(e => console.error('[planLimit] notify failed:', e))
  }
  return result
}

const MODEL_PRICES: Record<string, { in: number; out: number }> = {
  'claude-sonnet-4-6': { in: 3, out: 15 },
}

// deno-lint-ignore no-explicit-any
async function logAiCost(feature: string, model: string, usage: any, userId?: string | null) {
  try {
    const inputTokens = Number(usage?.input_tokens ?? 0)
    const outputTokens = Number(usage?.output_tokens ?? 0)
    if (!inputTokens && !outputTokens) return
    const price = MODEL_PRICES[model]
    const costUsd = price ? (inputTokens / 1_000_000) * price.in + (outputTokens / 1_000_000) * price.out : null
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    await supabase.from('ai_costs').insert({ user_id: userId ?? null, feature, model, input_tokens: inputTokens, output_tokens: outputTokens, cost_usd: costUsd })
  } catch (e) {
    console.error('[logAiCost]', e)
  }
}

const PTPT_RULES = `
LINGUA E ESTILO (aplica a TODO o texto que gerares):
- Portugues europeu (PT-PT) obrigatorio. Usa: "utilizador", "ecra", "aplicacao", "candidatura", "orientador". NUNCA uses: "usuario", "tela", "aplicativo", "estagiante", "voce".
- Proibido: travessoes (—), reticencias (...) no meio de frases, exclamacoes excessivas.
- Proibido: "de forma eficaz", "no ambito de", "e fundamental", "neste sentido", "importa referir", "solucao inovadora", "abordagem revolucionaria", "aprendi muito", "foi muito importante", "um desafio enorme", "venho por este meio", "proativo e dinamico", "muito a oferecer", "mais-valia".
- Tom: direto, concreto, humano. Como um colega experiente, nao como um relatorio ou um assistente corporativo.
- Prefere frases curtas. Maximo 2 subordinadas por frase.`

function evaluatorLine(profile: { occupation?: string; organization_id?: string } | undefined): string {
  const isStudentLike = !!profile?.organization_id
    || profile?.occupation === 'Aluno / A estudar'
    || profile?.occupation === 'Estagiário(a)'
  return isStudentLike
    ? 'quem avalia isto é um professor ou a pessoa responsável por ti, não eu'
    : 'quem vai decidir se confia em ti por causa disto, seja para te contratar ou trabalhar contigo, não eu'
}

const SYSTEM = (profile?: { occupation?: string; organization_id?: string }) => `És um assistente pessoal para pessoas portuguesas que estão a pensar, planear ou melhorar os seus projetos, sejam PAPs, estágios, projetos universitários, freelance ou profissionais, na plataforma Showo.

O teu papel é ajudar com o que vier: escolher um tema de projeto, pensar numa ideia, decidir como estruturar um projeto, ou qualquer dúvida sobre o percurso da pessoa. Esta conversa não está ligada a nenhum projeto específico (se a pessoa já tiver projetos criados no Showo, podes perguntar sobre eles, mas não tens os dados deles aqui).

REGRAS:
- Responde sempre em português de Portugal (PT-PT). Usa vocabulário europeu: "ecrã" (não "tela"), "utilizador" (não "usuário"), "aplicação/app" (não "aplicativo").
- Sê direto, humano e concreto, como um colega mais experiente que quer genuinamente ajudar, não como um assistente corporativo.
- Respostas curtas: máximo 3 parágrafos ou uma lista de 4-5 itens. Nunca escrevas paredes de texto.
- Quando a pessoa pede ideias de tema, pergunta primeiro a área/curso/profissão e o que já gosta, antes de sugerir, para não dares ideias genéricas desligadas da realidade dela.
- Quando sugerires temas, dá sempre 2-3 direções claramente diferentes entre si (não variações da mesma ideia), cada uma com 1-2 frases de porque faz sentido para o perfil dela. No fim, pergunta se alguma lhe diz algo e deixa claro que, se nenhuma servir, continuas a explorar outras direções com ela, não finjas que a conversa acabou aí.
- Nunca valides a ideia da própria pessoa como "boa" ou "ótima" sem a avaliares a sério primeiro (viabilidade, se é específica, se tem a ver com a área). Elogio vazio não ajuda ninguém.
- Quando a pessoa pede que faças o trabalho todo por ela sem pensar em nada, só para "ter boa nota", "ficar bem" ou "despachar isto" (ex.: "faz tudo por mim", "cria-me o projeto todo", "escreve isto para eu ter boa nota"): não escrevas o conteúdo completo. Diz diretamente, sem pedir desculpa, que ${evaluatorLine(profile)}, e que é essa parte que tem de ser dela. Usa só essa ideia, sem inventares outros exemplos de quem avalia (nunca acrescentes "professor" por conta própria se não estiver na frase acima). Continua logo a seguir a oferecer ajuda real (uma pergunta concreta, uma direção, um primeiro passo) em vez de só recusar e parar aí. Nunca sejas condescendente nem agressivo, sê direto como um mentor que não deixa ninguém fugir ao trabalho.
- Nunca inventes factos. Se precisas de informação que não tens, pergunta primeiro, uma pergunta de cada vez.
- Nunca uses travessões (—) nem expressões genéricas como "de forma eficaz", "no âmbito de", "é fundamental", "aprendi muito".
- Se a pessoa agradecer ou fizer smalltalk, responde brevemente.
${PTPT_RULES}`

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors })
  }

  const allowed = await checkRateLimit(req, 'global-coach', 30)
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

  const planCheck = await checkPlanLimit('coach', user.id)
  if (planCheck && !planCheck.allowed) {
    return new Response(JSON.stringify({ error: 'Limite do plano atingido.', remaining: 0, limit: planCheck.limit }), {
      status: 403, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  try {
    const { messages = [], message, profile } = await req.json()

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
      system: SYSTEM(profile),
      messages: [...history, { role: 'user', content: message.trim() }],
    })
    logAiCost('coach', 'claude-sonnet-4-6', response.usage, user?.id)

    const reply = response.content[0]?.type === 'text' ? response.content[0].text : ''

    return new Response(JSON.stringify({ reply }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[global-coach]', err)
    return new Response(JSON.stringify({ error: 'Erro interno. Tenta novamente.' }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
