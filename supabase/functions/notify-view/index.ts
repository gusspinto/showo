import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { project_slug, type, city, visitor_role } = await req.json()

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
    const location = city && city !== 'Portugal' ? `de ${city}` : 'de Portugal'

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
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders })
  }
})
