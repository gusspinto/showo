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

  const result = data as { allowed: boolean; remaining: number; limit: number; used: number }

  // This is the call that consumed the last unit for this feature this month —
  // fire the exhaustion email in the background, never block the caller on it.
  if (result.allowed && result.remaining === 0) {
    notifyLimitExhausted(supabase, userId, feature).catch(e => console.error('[planLimit] notify failed:', e))
  }

  return result
}

const FEATURE_LABELS_PT: Record<string, string> = {
  createProject: 'Criar projeto com IA',
  interviewProject: 'Entrevista guiada',
  coach: 'Coach IA',
  defense: 'Defesa IA',
  diaryReport: 'Relatório do projeto',
  narrative: 'Narrativa IA',
  analyzeProject: 'Análise de projeto',
  defenseTraining: 'Treino de defesa',
  coverLetter: 'Carta de apresentação',
  exportPptx: 'Exportar PowerPoint',
}

const UPGRADE_TARGET: Record<string, { name: string; blurb: string } | null> = {
  free: { name: 'Plus', blurb: 'Com o Plus tens muito mais IA por mês e continuas exatamente de onde paraste.' },
  school: null,
  plus: { name: 'Pro', blurb: 'Com o Pro tens o dobro (ou mais) de cada feature e projetos ilimitados.' },
  pro: null,
}

// Best-effort email telling the student a feature just ran out this month.
// Only fires for plans with a self-serve upgrade path (free, plus) — never
// blocks or throws into the caller, this is a side-channel nudge.
async function notifyLimitExhausted(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  userId: string,
  feature: string
) {
  const resendKey = Deno.env.get('RESEND_API_KEY')
  if (!resendKey) return

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, plan, role, organization_id')
    .eq('id', userId)
    .single()
  if (!profile) return

  let planId = profile.plan ?? 'free'
  if (profile.role === 'professor') return // pro, no upsell
  if (profile.organization_id) planId = 'school'
  if (planId === 'build') planId = 'plus'
  if (planId === 'launch') planId = 'pro'

  const target = UPGRADE_TARGET[planId]
  if (!target) return

  const { data: userRes } = await supabase.auth.admin.getUserById(userId)
  const email = userRes?.user?.email
  if (!email) return

  const featureLabel = FEATURE_LABELS_PT[feature] ?? feature
  const name = profile.full_name?.split(' ')[0] || 'olá'

  const html = `
  <div style="font-family:Arial,sans-serif;max-width:460px;margin:0 auto;padding:40px 20px;">
    <img src="https://showo.pt/icon.png" alt="Showo" width="100" style="display:block;margin:0 auto 32px;" />
    <h2 style="text-align:center;font-size:18px;font-weight:600;color:#1a1a1a;margin:0 0 8px;">Olá, ${name}</h2>
    <p style="text-align:center;font-size:14px;color:#666;line-height:1.6;margin:0 0 12px;">Esgotaste o <strong>${featureLabel}</strong> este mês.</p>
    <p style="text-align:center;font-size:14px;color:#666;line-height:1.6;margin:0 0 28px;">${target.blurb}</p>
    <table border="0" cellspacing="0" cellpadding="0" align="center" style="margin:0 auto 28px;">
      <tr>
        <td align="center" style="background:#4a93f9;border-radius:8px;">
          <a href="https://showo.pt/pricing" target="_blank" style="display:inline-block;padding:12px 36px;font-family:Arial,sans-serif;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;">Ver o plano ${target.name}</a>
        </td>
      </tr>
    </table>
    <p style="text-align:center;font-size:11px;color:#aaa;margin:0;">O limite renova no início do próximo mês. Precisas de ajuda? Responde a este email.</p>
  </div>`

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'Showo <hello@showo.pt>',
      to: email,
      subject: `${featureLabel} esgotou este mês`,
      html,
    }),
  })
  if (!res.ok) console.error('[planLimit] Resend error:', await res.text())
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
