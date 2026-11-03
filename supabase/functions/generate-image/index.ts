import { checkRateLimit, getAuthUser, getCorsHeaders, checkPlanLimit } from '../_shared/rateLimit.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/* ══════════════════════════════════════════════════════════════════════════
   GERAÇÃO DE IMAGENS (capas de projeto, etc.)
   ──────────────────────────────────────────────────────────────────────────
   Pedido depois de uma pessoa perguntar ao Coach IA se pagando o Plus
   desbloqueava criar imagens (não desbloqueava, o Coach é texto). Limite de
   5/mês no Plus, 0 no Grátis, 15 no Pro (ver migração 230, contas de margem
   feitas com o Gustavo). Usa GPT Image (tier baixo), não DALL-E 3, que já
   foi descontinuado pela OpenAI.
   ══════════════════════════════════════════════════════════════════════════ */

const OPENAI_IMAGE_PRICE_USD = 0.011 // GPT Image, tier baixo, 1024x1024. Estimativa de mercado, confirmar contra a fatura real da OpenAI depois do primeiro mês de uso.

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const user = await getAuthUser(req)
  if (!user) {
    return new Response(JSON.stringify({ error: 'Autenticação necessária.' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const allowed = await checkRateLimit(req, 'generate-image', 10)
  if (!allowed) {
    return new Response(JSON.stringify({ error: 'Demasiados pedidos. Tenta mais tarde.' }), {
      status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const planCheck = await checkPlanLimit(req, 'generateImage', user.id)
  if (planCheck && !planCheck.allowed) {
    return new Response(JSON.stringify({ error: 'Limite do plano atingido.', remaining: 0, limit: planCheck.limit }), {
      status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const openaiKey = Deno.env.get('OPENAI_API_KEY')
  if (!openaiKey) {
    console.error('[generate-image] OPENAI_API_KEY not configured')
    return new Response(JSON.stringify({ error: 'Geração de imagens ainda não está disponível.' }), {
      status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const { prompt } = await req.json()
    const safePrompt = String(prompt ?? '').trim().slice(0, 1000)
    if (!safePrompt) {
      return new Response(JSON.stringify({ error: 'Descreve o que queres na imagem.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const res = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-image-1-mini',
        prompt: safePrompt,
        size: '1024x1024',
        quality: 'low',
        n: 1,
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error('[generate-image] OpenAI error:', res.status, errText.slice(0, 500))
      return new Response(JSON.stringify({ error: 'Não foi possível gerar a imagem. Tenta novamente.' }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const data = await res.json()
    const b64 = data?.data?.[0]?.b64_json
    if (!b64) {
      console.error('[generate-image] resposta sem imagem:', JSON.stringify(data).slice(0, 300))
      return new Response(JSON.stringify({ error: 'A IA não devolveu uma imagem. Tenta novamente.' }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Custo real: a API devolve tokens quando disponiveis, caso contrario
    // cai na estimativa de mercado (ver OPENAI_IMAGE_PRICE_USD acima).
    const costUsd = typeof data?.usage?.total_tokens === 'number'
      ? null // modelo de imagem nao usa preco por token igual ao texto, nao inventar um numero a partir disto
      : OPENAI_IMAGE_PRICE_USD

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    await supabase.from('ai_costs').insert({
      user_id: user.id,
      feature: 'generateImage',
      model: 'gpt-image-1-mini',
      input_tokens: 0,
      output_tokens: 0,
      cost_usd: costUsd,
    })

    return new Response(JSON.stringify({ image_b64: b64 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[generate-image]', err)
    return new Response(JSON.stringify({ error: 'Erro interno. Tenta novamente.' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
