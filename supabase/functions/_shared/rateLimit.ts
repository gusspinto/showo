import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const LIMIT_PER_HOUR = 10

const ALLOWED_ORIGINS = ['https://showo.pt', 'https://www.showo.pt', 'https://showo.vercel.app']

export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') ?? ''
  const allow = ALLOWED_ORIGINS.includes(origin) || origin.startsWith('http://localhost')
    ? origin
    : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
}

export async function checkRateLimit(req: Request, fnName: string, limit = LIMIT_PER_HOUR): Promise<boolean> {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { data, error } = await supabase.rpc('check_fn_rate_limit', {
    p_key: `${ip}:${fnName}`,
    p_limit: limit,
  })

  if (error) {
    console.error('[rateLimit] check failed:', error.message)
    return false
  }

  return data === true
}

// Returns the authenticated Supabase user, or null for anon requests.
export async function getAuthUser(req: Request) {
  const jwt = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!jwt) return null

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { data: { user } } = await supabase.auth.getUser(jwt)
  return user ?? null
}

// Check plan-based AI limit. Returns { allowed, remaining, limit, used } or null on error.
// On success, usage is atomically incremented server-side.
export async function checkPlanLimit(
  req: Request,
  feature: string,
  userId: string
): Promise<{ allowed: boolean; remaining: number; limit: number; used: number } | null> {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { data, error } = await supabase.rpc('check_ai_limit', {
    p_user_id: userId,
    p_feature: feature,
  })

  if (error) {
    console.error('[planLimit] check failed:', error.message)
    return null
  }

  return data as { allowed: boolean; remaining: number; limit: number; used: number }
}

// Truncate a value to maxLen characters (prevents oversized prompts).
export function clip(v: unknown, maxLen = 4000): string {
  return String(v ?? '').slice(0, maxLen)
}

// Shared PT-PT anti-slop rules for all AI prompts
export const PTPT_RULES = `
LINGUA E ESTILO (aplica a TODO o texto que gerares):
- Portugues europeu (PT-PT) obrigatorio. Usa: "utilizador", "ecra", "aplicacao", "candidatura", "orientador". NUNCA uses: "usuario", "tela", "aplicativo", "aplicacao" (ptbr), "estagiante", "voce".
- Proibido: travessoes (—), reticencias (...) no meio de frases, exclamacoes excessivas.
- Proibido: "de forma eficaz", "no ambito de", "e fundamental", "neste sentido", "importa referir", "solucao inovadora", "abordagem revolucionaria", "aprendi muito", "foi muito importante", "um desafio enorme", "venho por este meio", "proativo e dinamico", "muito a oferecer", "mais-valia".
- Tom: direto, concreto, humano. Como um colega experiente, nao como um relatorio ou um assistente corporativo.
- Cada frase deve conter informacao especifica a ESTE projeto. Se uma frase funciona para qualquer projeto, reescreve-a.
- Prefere frases curtas. Maximo 2 subordinadas por frase.`

// Repair common JSON issues from LLM output
export function repairJson(raw: string): Record<string, unknown> {
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Resposta invalida da IA')

  let jsonStr = jsonMatch[0]
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/—/g, '-')
    .replace(/,\s*([}\]])/g, '$1')
    .replace(/\n/g, ' ')

  try {
    return JSON.parse(jsonStr)
  } catch (_e1) {
    jsonStr = jsonStr.replace(/[\x00-\x1F\x7F]/g, ' ')
    try {
      return JSON.parse(jsonStr)
    } catch (e2) {
      console.error('JSON repair failed:', e2, 'Raw:', raw.slice(0, 500))
      throw new Error('A IA gerou uma resposta invalida. Tenta novamente.')
    }
  }
}
