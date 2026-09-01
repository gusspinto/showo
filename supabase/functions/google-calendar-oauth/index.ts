// ============================================================================
// google-calendar-oauth — handles the OAuth2 flow for Google Calendar sync.
//
// Modes (all via ?action=...):
//   ?action=start   → returns { url } to redirect the user to Google's consent
//   ?action=callback → Google redirects here with ?code=...; we exchange for
//                       tokens and save to google_calendar_tokens, then push
//                       any existing Showo events into the user's calendar
//   ?action=sync    → refreshes and pushes all Showo events into Google
//   ?action=disconnect → deletes tokens
//
// Required env vars:
//   GOOGLE_OAUTH_CLIENT_ID
//   GOOGLE_OAUTH_CLIENT_SECRET
//   GOOGLE_OAUTH_REDIRECT_URI  (e.g. https://showo.pt/oauth/google-calendar)
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders } from '../_shared/rateLimit.ts'

let _cors: Record<string, string> = {}

const SCOPES = 'https://www.googleapis.com/auth/calendar.events'

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ..._cors, 'Content-Type': 'application/json' },
  })
}

async function getUser(req: Request) {
  const jwt = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!jwt) return null
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { data: { user } } = await sb.auth.getUser(jwt)
  return user
}

async function refreshAccessToken(refreshToken: string) {
  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: Deno.env.get('GOOGLE_OAUTH_CLIENT_ID')!,
      client_secret: Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET')!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })
  return await resp.json()
}

async function getValidAccessToken(sb: any, userId: string) {
  const { data: row } = await sb
    .from('google_calendar_tokens')
    .select('access_token, refresh_token, expires_at')
    .eq('user_id', userId)
    .maybeSingle()
  if (!row) return null
  if (new Date(row.expires_at) > new Date(Date.now() + 60_000)) return row.access_token
  const refreshed = await refreshAccessToken(row.refresh_token)
  if (!refreshed.access_token) return null
  await sb.from('google_calendar_tokens').update({
    access_token: refreshed.access_token,
    expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
  }).eq('user_id', userId)
  return refreshed.access_token
}

async function pushShowoEvents(sb: any, userId: string, accessToken: string) {
  const [{ data: reminders }, { data: memberships }, { data: projects }] = await Promise.all([
    sb.from('personal_reminders').select('id, title, reminder_date, notes').eq('user_id', userId).eq('done', false),
    sb.from('class_members').select('class_id').eq('user_id', userId),
    sb.from('projects').select('id, name, slug, defense_date').eq('user_id', userId).not('defense_date', 'is', null),
  ])

  const classIds = (memberships ?? []).map((m: any) => m.class_id)
  let tasks: any[] = []
  if (classIds.length) {
    const { data: taskRows } = await sb
      .from('class_tasks')
      .select('id, title, description, due_date, classes(name)')
      .in('class_id', classIds)
      .not('due_date', 'is', null)
    const { data: completed } = await sb
      .from('class_task_completions')
      .select('task_id')
      .eq('user_id', userId)
    const done = new Set((completed ?? []).map((c: any) => c.task_id))
    tasks = (taskRows ?? []).filter(t => !done.has(t.id))
  }

  const events: Array<{ id: string; summary: string; date: string; description?: string }> = []
  ;(reminders ?? []).forEach((r: any) =>
    events.push({ id: `showo-reminder-${r.id}`, summary: r.title, date: r.reminder_date, description: r.notes ?? 'Lembrete Showo' }))
  tasks.forEach(t =>
    events.push({ id: `showo-task-${t.id}`, summary: t.title, date: t.due_date, description: `Turma: ${t.classes?.name ?? ''}${t.description ? '\n' + t.description : ''}` }))
  ;(projects ?? []).forEach((p: any) =>
    events.push({ id: `showo-defense-${p.id}`, summary: `Defesa: ${p.name}`, date: p.defense_date, description: `https://showo.pt/projeto/${p.slug}` }))

  // Push each event — Google Calendar events API doesn't support arbitrary
  // client-side IDs on insert, so we import via PATCH-by-iCalUID which requires
  // a two-step: import with iCalUID, else Google dedupes on iCalUID match.
  const results = await Promise.allSettled(events.map(async ev => {
    const body = {
      summary: ev.summary,
      description: ev.description,
      start: { date: ev.date },
      end: { date: ev.date },
      iCalUID: `${ev.id}@showo.pt`,
      source: { title: 'Showo', url: 'https://showo.pt' },
    }
    return fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events/import', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  }))

  return { pushed: results.filter(r => r.status === 'fulfilled').length, total: events.length }
}

Deno.serve(async (req) => {
  _cors = { ...getCorsHeaders(req), 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' }
  if (req.method === 'OPTIONS') return new Response('ok', { headers: _cors })

  const url = new URL(req.url)
  const action = url.searchParams.get('action')

  const clientId = Deno.env.get('GOOGLE_OAUTH_CLIENT_ID')
  const clientSecret = Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET')
  const redirectUri = Deno.env.get('GOOGLE_OAUTH_REDIRECT_URI')
  if (!clientId || !clientSecret || !redirectUri) {
    return json({ error: 'Google OAuth env vars not configured' }, 500)
  }

  // ── start ───────────────────────────────────────────────────────────────
  if (action === 'start') {
    const user = await getUser(req)
    if (!user) return json({ error: 'unauthorized' }, 401)
    const state = crypto.randomUUID()
    const consent = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    consent.searchParams.set('client_id', clientId)
    consent.searchParams.set('redirect_uri', redirectUri)
    consent.searchParams.set('response_type', 'code')
    consent.searchParams.set('scope', SCOPES)
    consent.searchParams.set('access_type', 'offline')
    consent.searchParams.set('prompt', 'consent')
    consent.searchParams.set('state', `${user.id}:${state}`)
    return json({ url: consent.toString() })
  }

  // ── callback ────────────────────────────────────────────────────────────
  if (action === 'callback') {
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')
    if (!code || !state) return json({ error: 'missing code/state' }, 400)
    const userId = state.split(':')[0]
    if (!userId) return json({ error: 'invalid state' }, 400)

    const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code, client_id: clientId, client_secret: clientSecret,
        redirect_uri: redirectUri, grant_type: 'authorization_code',
      }),
    })
    const tokens = await tokenResp.json()
    if (!tokens.access_token || !tokens.refresh_token) {
      return json({ error: 'token exchange failed', details: tokens }, 400)
    }

    const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    await sb.from('google_calendar_tokens').upsert({
      user_id: userId,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    }, { onConflict: 'user_id' })

    const result = await pushShowoEvents(sb, userId, tokens.access_token)
    return json({ ok: true, ...result })
  }

  // ── sync (manual re-push) ───────────────────────────────────────────────
  if (action === 'sync') {
    const user = await getUser(req)
    if (!user) return json({ error: 'unauthorized' }, 401)
    const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const token = await getValidAccessToken(sb, user.id)
    if (!token) return json({ error: 'not connected' }, 400)
    const result = await pushShowoEvents(sb, user.id, token)
    return json({ ok: true, ...result })
  }

  // ── disconnect ──────────────────────────────────────────────────────────
  if (action === 'disconnect') {
    const user = await getUser(req)
    if (!user) return json({ error: 'unauthorized' }, 401)
    const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    await sb.from('google_calendar_tokens').delete().eq('user_id', user.id)
    return json({ ok: true })
  }

  return json({ error: 'unknown action' }, 400)
})
