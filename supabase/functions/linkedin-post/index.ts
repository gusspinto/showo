import Anthropic from 'npm:@anthropic-ai/sdk@0.36.3'
import { checkRateLimit, getAuthUser, clip, getCorsHeaders, PTPT_RULES, logAiCost } from '../_shared/rateLimit.ts'

/* ══════════════════════════════════════════════════════════════════════════
   GERADOR DE POST PARA O LINKEDIN
   ──────────────────────────────────────────────────────────────────────────
   Duas entradas, um gerador. O objetivo (reunião com o Hugo): transformar o
   trabalho que já está na Showo num post de progresso em 1ª pessoa, para
   quem faz o projeto e para os recrutadores que passam pelo LinkedIn.

   mode='weekly'  — a partir dos registos do diário de UMA semana. Só faz
                    sentido quando a semana teve substância (o cliente faz
                    esse gate; aqui só recusamos se vier vazio).
   mode='project' — a partir dos campos de um projeto acabado de publicar.

   Sem contador de plano na BD por agora: rate limit por IP chega para a v1.
   Se ganhar tração, mete-se metered como as outras features de IA.
   ══════════════════════════════════════════════════════════════════════════ */

const KIND_LABEL: Record<string, string> = {
  progresso: 'Progresso', dificuldade: 'Dificuldade', decisao: 'Decisão',
  pesquisa: 'Pesquisa', ideia: 'Ideia', resultado: 'Resultado', nota: 'Nota',
  auto: 'Commit',
}

function weeklyPrompt(p: any): string {
  const entries = (Array.isArray(p.entries) ? p.entries : [])
    .slice(0, 20)
    .map((e: any) => `- [${KIND_LABEL[e.kind] ?? e.kind}] ${clip(e.text, 280)}`)
    .join('\n')

  return `Escreve um post de LinkedIn, em 1ª pessoa, sobre o que um estudante avançou esta semana no projeto dele.

PROJETO: ${clip(p.projectName, 120)}
LINK (obrigatório no fim do post, sozinho numa linha): ${clip(p.projectUrl, 300)}
NÚMEROS DA SEMANA: ${Number(p.entryCount) || 0} registos no diário, ${Number(p.activeDays) || 0} dias diferentes${p.streak > 1 ? `, ${p.streak} semanas seguidas a registar` : ''}

O QUE ELE REGISTOU ESTA SEMANA (usa SÓ isto, não inventes nada):
${entries || '(sem registos)'}
${p.reflection ? `\nO QUE ELE ACHOU QUE CORREU MELHOR: ${clip(p.reflection, 400)}` : ''}

REGRAS:
- 1ª pessoa ("esta semana", "consegui", "percebi"). Nunca 3ª pessoa.
- 60 a 130 palavras. Curto. 2 a 4 parágrafos pequenos, sem bullets.
- Concreto: nomeia o que ele fez de facto (o ecrã X, a decisão Y, o teste Z). Se a semana foi fraca, diz menos, não encha.
- Sem "aprendi imenso", "foi um desafio enorme", "estou muito feliz por partilhar". Soa a uma pessoa a construir uma coisa, não a um anúncio.
- Zero hashtags. Zero emojis.
- Acaba com uma linha só com o LINK, sem texto à volta.

Devolve APENAS este JSON (sem markdown, sem nada antes ou depois):
{ "text": "o post completo, com quebras de linha reais (\\n)" }
${PTPT_RULES}`
}

function projectPrompt(p: any): string {
  const highlights = (Array.isArray(p.highlights) ? p.highlights : [])
    .slice(0, 4).map((h: string) => `- ${clip(h, 240)}`).join('\n')

  return `Escreve um post de LinkedIn, em 1ª pessoa, de alguém que acabou de publicar um projeto no portfólio.

PROJETO: ${clip(p.projectName, 120)}
LINK (obrigatório no fim, sozinho numa linha): ${clip(p.projectUrl, 300)}
O QUE É: ${clip(p.tagline || p.goal, 300)}
PROBLEMA QUE RESOLVE: ${clip(p.problem, 400)}
SOLUÇÃO: ${clip(p.solution, 400)}
TECNOLOGIAS: ${clip(p.technologies, 200)}
${highlights ? `RECONHECIMENTO (frases escritas sobre o projeto):\n${highlights}` : ''}

REGRAS:
- 1ª pessoa ("publiquei", "construí", "o que quis resolver foi").
- 60 a 130 palavras. 2 a 4 parágrafos pequenos, sem bullets.
- Diz o que é o projeto e que problema resolve, em concreto. Menciona 1 ou 2 tecnologias de forma natural, não como lista.
- Sem "tenho o prazer de anunciar", "aprendi imenso", "foi um desafio enorme". Soa a uma pessoa real a mostrar o que fez.
- Zero hashtags. Zero emojis.
- Acaba com uma linha só com o LINK.

Devolve APENAS este JSON (sem markdown):
{ "text": "o post completo, com quebras de linha reais (\\n)" }
${PTPT_RULES}`
}

function extractText(raw: string): string {
  // O modelo devolve JSON, mas às vezes com markdown à volta ou aspas
  // esquisitas. Tenta o JSON primeiro; se falhar, usa o corpo em cru.
  const cleaned = raw.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim()
  try {
    const obj = JSON.parse(cleaned.replace(/[""]/g, '"').replace(/['']/g, "'"))
    if (obj && typeof obj.text === 'string') return obj.text.trim()
  } catch { /* cai para baixo */ }
  const m = cleaned.match(/"text"\s*:\s*"([\s\S]*?)"\s*}/)
  if (m) return m[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').trim()
  return cleaned
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const user = await getAuthUser(req)
  if (!user) {
    return new Response(JSON.stringify({ error: 'Autenticação necessária.' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const allowed = await checkRateLimit(req, 'linkedin-post', 15)
  if (!allowed) {
    return new Response(JSON.stringify({ error: 'Demasiados pedidos. Tenta daqui a pouco.' }), {
      status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const body = await req.json()
    const mode = body?.mode === 'project' ? 'project' : 'weekly'

    if (!body?.projectName || !body?.projectUrl) {
      return new Response(JSON.stringify({ error: 'Faltam dados do projeto.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    if (mode === 'weekly' && !(Array.isArray(body.entries) && body.entries.length)) {
      return new Response(JSON.stringify({ error: 'Não há registos suficientes esta semana para escrever um post.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const client = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') ?? '' })
    const prompt = mode === 'project' ? projectPrompt(body) : weeklyPrompt(body)

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 700,
      messages: [{ role: 'user', content: prompt }],
    })
    logAiCost('linkedinPost', 'claude-sonnet-4-6', message.usage, user.id)

    const raw = (message.content[0] as { type: string; text: string }).text
    let text = extractText(raw)

    // Garante o link no fim, mesmo que o modelo o esqueça.
    if (!text.includes(body.projectUrl)) {
      text = `${text.trim()}\n\n${body.projectUrl}`
    }

    return new Response(JSON.stringify({ text }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[linkedin-post]', err)
    return new Response(JSON.stringify({ error: 'Não foi possível gerar o post. Tenta outra vez.' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
