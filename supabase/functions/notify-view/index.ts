import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { checkRateLimit, getCorsHeaders, getAuthUser } from '../_shared/rateLimit.ts'

const VALID_TYPES = ['PROJECT_VIEW', 'COMPANY_VIEW']
const VALID_ROLES = ['empresa', 'recrutador', 'estudante', 'outro', '']

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const user = await getAuthUser(req)
  if (!user) {
    return new Response(JSON.stringify({ ok: false, error: 'auth' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const allowed = await checkRateLimit(req, 'notify-view', 30)
  if (!allowed) {
    return new Response(JSON.stringify({ ok: false }), {
      status: 429,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const { project_slug, type, city: rawCity, visitor_role: rawRole } = await req.json()
    const city = typeof rawCity === 'string' ? rawCity.slice(0, 100).replace(/[<>"'&]/g, '') : ''
    const visitor_role = VALID_ROLES.includes(rawRole) ? rawRole : ''

    if (typeof project_slug !== 'string' || !/^[a-z0-9_-]{1,100}$/i.test(project_slug)) {
      return new Response(JSON.stringify({ ok: false }), { status: 400, headers: corsHeaders })
    }
    if (!VALID_TYPES.includes(type)) {
      return new Response(JSON.stringify({ ok: false }), { status: 400, headers: corsHeaders })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Get project owner and name
    const { data: project } = await supabase
      .from('projects')
      .select('user_id, name')
      .eq('slug', project_slug)
      .single()

    if (!project?.user_id) return new Response(JSON.stringify({ ok: false }), { headers: corsHeaders })

    const user_id = project.user_id
    const projectName = project.name || 'o teu projeto'
    const now = new Date()

    // Dedup window: 1h for PROJECT_VIEW, 24h for COMPANY_VIEW
    const windowMs = type === 'COMPANY_VIEW' ? 24 * 60 * 60 * 1000 : 60 * 60 * 1000
    const since = new Date(now.getTime() - windowMs).toISOString()

    const { data: existing } = await supabase
      .from('notifications')
      .select('id')
      .eq('user_id', user_id)
      .eq('project_slug', project_slug)
      .eq('type', type)
      .gte('created_at', since)
      .limit(1)

    if (existing && existing.length > 0) {
      return new Response(JSON.stringify({ ok: true, skipped: true }), { headers: corsHeaders })
    }

    // Build message based on visitor role
    let message: string
    const location = city && city !== 'Portugal' ? `de ${city.slice(0, 50)}` : 'de Portugal'

    if (type === 'COMPANY_VIEW') {
      if (visitor_role === 'empresa') {
        message = `Uma empresa ${location} viu o teu projeto '${projectName}' — ficou mais de 30s a explorar. 👀`
      } else if (visitor_role === 'recrutador') {
        message = `Um recrutador ${location} viu o teu projeto '${projectName}' — ficou mais de 30s a explorar. 👀`
      } else {
        message = `Alguém ${location} viu o teu projeto '${projectName}' — ficou mais de 30s a explorar. 👀`
      }
    } else {
      // PROJECT_VIEW
      if (visitor_role === 'empresa') {
        message = `Uma empresa ${location} viu o teu projeto '${projectName}' há pouco. 👀`
      } else if (visitor_role === 'recrutador') {
        message = `Um recrutador ${location} viu o teu projeto '${projectName}' há pouco. 👀`
      } else {
        message = `Alguém ${location} viu o teu projeto '${projectName}' há pouco. 👀`
      }
    }

    await supabase.from('notifications').insert({
      user_id,
      type,
      message,
      project_slug,
      read: false,
    })

    return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders })
  } catch (e) {
    console.error(e)
    return new Response(JSON.stringify({ ok: false }), { status: 500, headers: corsHeaders })
  }
})
