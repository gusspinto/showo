import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const LIMIT_PER_HOUR = 10

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
    return true // fail open — don't block on infra error
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
