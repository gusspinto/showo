// ============================================================================
// ics-feed — serves an .ics calendar feed for a Showo user, authenticated by
// their ics_token in the URL. This lets Google Calendar, Apple Calendar or
// Outlook SUBSCRIBE (not download) — the feed updates automatically as the
// user adds reminders or the teacher sets new tasks.
//
// URL shape:  /functions/v1/ics-feed?token=<hex>
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CAL_HEADERS = {
  'Content-Type': 'text/calendar; charset=utf-8',
  'Content-Disposition': 'inline; filename="showo.ics"',
  'Access-Control-Allow-Origin': '*',
  'Cache-Control': 'public, max-age=300',
}

function pad(n: number) { return n < 10 ? '0' + n : String(n) }
function dateOnly(d: Date) {
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`
}
function nowStamp() {
  const d = new Date()
  return `${dateOnly(d)}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
}
function esc(s: string) {
  return (s ?? '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}

Deno.serve(async (req) => {
  const url = new URL(req.url)
  const token = url.searchParams.get('token')
  if (!token || !/^[a-f0-9]{20,64}$/i.test(token)) {
    return new Response('Missing or invalid token', { status: 400 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // Look up the user by their ICS token
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('ics_token', token)
    .maybeSingle()

  if (!profile) return new Response('Unknown token', { status: 404 })

  const uid = profile.id

  // ── Gather events ──────────────────────────────────────────────────────
  // 1. Personal reminders
  const { data: reminders } = await supabase
    .from('personal_reminders')
    .select('id, title, reminder_date, notes, done')
    .eq('user_id', uid)
    .eq('done', false)

  // 2. Class tasks (from turmas the student is in)
  const { data: memberships } = await supabase
    .from('class_members')
    .select('class_id')
    .eq('user_id', uid)

  const classIds = (memberships ?? []).map(m => m.class_id)

  let tasks: any[] = []
  if (classIds.length) {
    const { data: taskRows } = await supabase
      .from('class_tasks')
      .select('id, title, description, due_date, classes(name)')
      .in('class_id', classIds)
      .not('due_date', 'is', null)

    // Filter out ones the student already completed
    const { data: completed } = await supabase
      .from('class_task_completions')
      .select('task_id')
      .eq('user_id', uid)
    const done = new Set((completed ?? []).map(c => c.task_id))
    tasks = (taskRows ?? []).filter(t => !done.has(t.id))
  }

  // 3. Project defenses
  const { data: projects } = await supabase
    .from('projects')
    .select('id, name, slug, defense_date')
    .eq('user_id', uid)
    .not('defense_date', 'is', null)

  // ── Build the ICS body ─────────────────────────────────────────────────
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Showo//Student Calendar//PT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Showo — os teus prazos',
    'X-WR-TIMEZONE:Europe/Lisbon',
  ]

  const stamp = nowStamp()

  function addEvent(uid: string, dateStr: string, summary: string, description?: string) {
    if (!dateStr) return
    const d = new Date(dateStr + 'T00:00:00Z')
    const dtStart = dateOnly(d)
    const next = new Date(d); next.setUTCDate(next.getUTCDate() + 1)
    const dtEnd = dateOnly(next)
    lines.push(
      'BEGIN:VEVENT',
      `UID:${uid}@showo.pt`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${dtStart}`,
      `DTEND;VALUE=DATE:${dtEnd}`,
      `SUMMARY:${esc(summary)}`,
    )
    if (description) lines.push(`DESCRIPTION:${esc(description)}`)
    lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc(summary)}`, 'TRIGGER:-P1D', 'END:VALARM')
    lines.push('END:VEVENT')
  }

  ;(reminders ?? []).forEach(r =>
    addEvent(`reminder-${r.id}`, r.reminder_date, r.title, r.notes || 'Lembrete Showo')
  )
  tasks.forEach(t =>
    addEvent(`task-${t.id}`, t.due_date, t.title, `Tarefa — ${t.classes?.name ?? 'Turma'}${t.description ? ' — ' + t.description : ''}`)
  )
  ;(projects ?? []).forEach(p =>
    addEvent(`defense-${p.id}`, p.defense_date, `Defesa: ${p.name}`, `showo.pt/projeto/${p.slug}`)
  )

  lines.push('END:VCALENDAR')

  return new Response(lines.join('\r\n'), { headers: CAL_HEADERS })
})
