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

// Truncate a value to maxLen characters (prevents oversized prompts).
export function clip(v: unknown, maxLen = 4000): string {
  return String(v ?? '').slice(0, maxLen)
}
