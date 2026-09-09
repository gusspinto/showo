import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { checkRateLimit, getCorsHeaders } from '../_shared/rateLimit.ts'

// "Someone viewed your portfolio" — the profile-page counterpart of notify-view.
// The running total lives on profiles.views (bumped client-side via the
// increment_profile_views RPC); this function only handles the notification,
// deduped to at most one per hour per owner.
const VALID_ROLES = ['empresa', 'recrutador', 'estudante', 'professor', 'outro', '']

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const origin = req.headers.get('origin') ?? ''
  const validOrigin =
    origin === 'https://showo.pt' || origin === 'https://www.showo.pt' || origin.startsWith('http://localhost')
  if (!validOrigin) {
    return new Response(JSON.stringify({ ok: false }), { status: 403, headers: corsHeaders })
  }

  const allowed = await checkRateLimit(req, 'notify-profile-view', 10)
  if (!allowed) {
    return new Response(JSON.stringify({ ok: false }), {
      status: 429,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const { profile_id, city: rawCity, visitor_role: rawRole } = await req.json()
    const city = typeof rawCity === 'string' ? rawCity.slice(0, 100).replace(/[<>"'&]/g, '') : ''
    const visitor_role = VALID_ROLES.includes(rawRole) ? rawRole : ''

    if (typeof profile_id !== 'string' ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(profile_id)) {
      return new Response(JSON.stringify({ ok: false }), { status: 400, headers: corsHeaders })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // The owner must exist and have a public username (no point notifying about
    // a profile that can't be visited).
    const { data: owner } = await supabase
      .from('profiles')
      .select('id, username')
      .eq('id', profile_id)
      .single()

    if (!owner?.id || !owner.username) {
      return new Response(JSON.stringify({ ok: false }), { headers: corsHeaders })
    }

    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { data: existing } = await supabase
      .from('notifications')
      .select('id')
      .eq('user_id', owner.id)
      .eq('type', 'PROFILE_VIEW')
      .gte('created_at', since)
      .limit(1)

    if (existing && existing.length > 0) {
      return new Response(JSON.stringify({ ok: true, skipped: true }), { headers: corsHeaders })
    }

    const location = city && city !== 'Portugal' ? `de ${city.slice(0, 50)}` : 'de Portugal'
    let message: string
    if (visitor_role === 'empresa') {
      message = `Uma empresa ${location} viu o teu portfólio há pouco.`
    } else if (visitor_role === 'recrutador') {
      message = `Um recrutador ${location} viu o teu portfólio há pouco.`
    } else {
      message = `Alguém ${location} viu o teu portfólio há pouco.`
    }

    await supabase.from('notifications').insert({
      user_id: owner.id,
      type: 'PROFILE_VIEW',
      message,
      project_slug: null,
      read: false,
    })

    return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders })
  } catch (e) {
    console.error(e)
    return new Response(JSON.stringify({ ok: false }), { status: 500, headers: corsHeaders })
  }
})
