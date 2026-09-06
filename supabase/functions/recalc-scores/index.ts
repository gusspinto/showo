// Admin-only one-off backfill: recomputes projects.score with the current
// scoring formula and persists rows whose stored score drifted.
//
// The app only rewrites a project's score when someone opens its page
// (ProjectPage) or edits it. Projects that predate a formula change and were
// never reopened keep a stale score, which the teacher dashboard and turma
// views read straight from the column. Run this once after deploying to bring
// every project in line.
//
//   curl -X POST '<url>/functions/v1/recalc-scores' \
//     -H "Authorization: Bearer <admin-user-jwt>"
//
// Pass { "dry_run": true } to only report what would change.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getAuthUser, getCorsHeaders } from '../_shared/rateLimit.ts'
import { calculateScore } from '../_shared/score.ts'

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  const user = await getAuthUser(req)
  if (!user) return json({ error: 'Autenticação necessária.' }, 401)

  const sb = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const { data: profile } = await sb.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return json({ error: 'Apenas administradores.' }, 403)

  let dryRun = false
  try {
    const body = await req.json()
    dryRun = !!body?.dry_run
  } catch { /* no body */ }

  const SCORE_FIELDS =
    'id, score, name, area, problem, solution, target_audience, features, technologies, challenges, results, learnings, cover_url, preview_blocks, preview_style, ai_tagline'

  const PAGE = 1000
  let from = 0
  let scanned = 0
  const changes: Array<{ id: string; from: number | null; to: number }> = []
  const failed: Array<{ id: string; error: string }> = []

  while (true) {
    const { data: projects, error } = await sb
      .from('projects')
      .select(SCORE_FIELDS)
      .order('created_at', { ascending: true })
      .range(from, from + PAGE - 1)
    if (error) return json({ error: error.message, scanned, changed: changes.length }, 500)
    if (!projects?.length) break

    const ids = projects.map(p => p.id)
    const { data: entries } = await sb
      .from('project_journal_entries')
      .select('project_id, created_at, kind')
      .in('project_id', ids)

    const byProject = new Map<string, Array<{ created_at: string; kind: string }>>()
    for (const e of entries || []) {
      const list = byProject.get(e.project_id) || []
      list.push({ created_at: e.created_at, kind: e.kind })
      byProject.set(e.project_id, list)
    }

    for (const p of projects) {
      scanned++
      const { score: fresh } = calculateScore(p, byProject.get(p.id) || [])
      const stored = p.score ?? null
      if (fresh === stored) continue
      changes.push({ id: p.id, from: stored, to: fresh })
      if (!dryRun) {
        const { error: upErr } = await sb.from('projects').update({ score: fresh }).eq('id', p.id)
        if (upErr) failed.push({ id: p.id, error: upErr.message })
      }
    }

    if (projects.length < PAGE) break
    from += PAGE
  }

  return json({
    dry_run: dryRun,
    scanned,
    changed: changes.length,
    updated: dryRun ? 0 : changes.length - failed.length,
    failed,
    sample: changes.slice(0, 50),
  })
})
