import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const FROM    = 'Showo <hello@showo.pt>'
const SUBJECT = '🏆 Projeto do Mês — Os 5 candidatos de'

// Admin emails that receive the digest
const ADMIN_EMAILS = ['brunosilva.smd@gmail.com', 'gustavo@showo.pt']

// ─────────────────────────────────────────────────────────────────────────────
// Diary scoring — mirrors src/lib/score.js calculateDiaryScore()
// ─────────────────────────────────────────────────────────────────────────────
function isoWeek(dateStr: string): string | null {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return null
  const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  tmp.setUTCDate(tmp.getUTCDate() + 4 - (tmp.getUTCDay() || 7))
  const year = tmp.getUTCFullYear()
  const week = Math.ceil(((tmp.getTime() - Date.UTC(year, 0, 1)) / 86400000 + 1) / 7)
  return `${year}-W${String(week).padStart(2, '0')}`
}

function diaryScore(entries: { created_at: string; kind: string }[]): number {
  if (!entries || entries.length === 0) return 0
  const valid = entries.filter(e => e.created_at)
  if (valid.length === 0) return 0

  const now = Date.now()
  const weeks = new Set(valid.map(e => isoWeek(e.created_at)).filter(Boolean))
  const kinds = new Set(valid.map(e => e.kind).filter(Boolean))
  const recent = valid.some(e => now - new Date(e.created_at).getTime() < 14 * 24 * 3600 * 1000)

  const n = valid.length
  const w = weeks.size
  const k = kinds.size

  if (n < 1) return 0
  if (n < 5 || w < 3) return 5
  if (n < 10 || w < 6) return 12
  if (!recent) return 16
  if (n < 20 || w < 10) return 22
  if (k >= 2) return 30
  return 26
}

// ─────────────────────────────────────────────────────────────────────────────
// Composite ranking (0–100)
// ─────────────────────────────────────────────────────────────────────────────
interface ProjectRow {
  id: string
  name: string
  slug: string
  score: number | null
  cover_url: string | null
  views: number | null
  teacher_score: number | null
  user_id: string
  creator_name: string | null
  area: string | null
  ai_tagline: string | null
  profile: { full_name: string | null; avatar_url: string | null; username: string | null } | null
  entries: { created_at: string; kind: string }[]
  likes: number
}

function compositeScore(p: ProjectRow): number {
  // 35% — project score
  const projectPts = ((p.score ?? 0) / 100) * 35

  // 30% — diary consistency
  const diaryPts = (diaryScore(p.entries) / 30) * 30

  // 20% — external validation
  let validationPts = 0
  if (p.teacher_score != null) {
    validationPts += (p.teacher_score / 20) * 12  // up to 12pts
  }
  const totalViews = p.views ?? 0
  validationPts += Math.min(5, Math.log10(totalViews + 1) * 2)  // up to 5pts
  validationPts += Math.min(3, p.likes * 0.5)                   // up to 3pts
  validationPts = Math.min(validationPts, 20)

  // 15% — profile completeness
  let profPts = 0
  if (p.profile?.avatar_url)  profPts += 5
  if (p.profile?.full_name)   profPts += 5
  if (p.profile?.username)    profPts += 5
  profPts = Math.min(profPts, 15)

  return Math.round(projectPts + diaryPts + validationPts + profPts)
}

// ─────────────────────────────────────────────────────────────────────────────
// Email HTML
// ─────────────────────────────────────────────────────────────────────────────
function buildEmail(candidates: (ProjectRow & { composite: number })[], month: string, appUrl: string): string {
  const [y, m] = month.split('-')
  const monthLabel = new Date(+y, +m - 1, 1).toLocaleString('pt-PT', { month: 'long', year: 'numeric' })

  const rows = candidates.map((p, i) => {
    const name = p.profile?.full_name || p.creator_name || 'Estudante'
    const pickUrl = `${appUrl}/admin/pick-project?project_id=${p.id}&month=${month}`
    const diaryEntries = p.entries.length
    const diaryWeeks = new Set(p.entries.map(e => isoWeek(e.created_at)).filter(Boolean)).size
    const recentEntry = p.entries
      .map(e => new Date(e.created_at))
      .sort((a, b) => b.getTime() - a.getTime())[0]
    const lastEntry = recentEntry ? recentEntry.toLocaleDateString('pt-PT') : '—'
    const medals = ['🥇', '🥈', '🥉', '4.', '5.']

    return `
      <div style="background:#0a111f;border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:20px 24px;margin:0 0 16px;">
        <div style="display:flex;align-items:center;gap:10px;margin:0 0 10px;">
          <span style="font-size:20px;">${medals[i]}</span>
          <div>
            <div style="color:#eef2f8;font-size:16px;font-weight:700;">${p.name}</div>
            <div style="color:#6b8099;font-size:13px;">${name}${p.area ? ` · ${p.area}` : ''}</div>
          </div>
          <div style="margin-left:auto;text-align:right;">
            <div style="font-size:22px;font-weight:800;color:#fbbf24;line-height:1;">${p.composite}</div>
            <div style="font-size:10px;color:#6b8099;">ranking</div>
          </div>
        </div>

        ${p.ai_tagline ? `<p style="margin:0 0 12px;color:#9fb0c8;font-size:13px;font-style:italic;line-height:1.5;">"${p.ai_tagline}"</p>` : ''}

        <table cellpadding="0" cellspacing="0" border="0" style="width:100%;margin:0 0 14px;">
          <tr>
            <td style="padding:3px 0;color:#6b8099;font-size:12px;">Score do projeto</td>
            <td style="padding:3px 0;color:#eef2f8;font-size:12px;font-weight:600;text-align:right;">${p.score ?? '—'} pts</td>
          </tr>
          <tr>
            <td style="padding:3px 0;color:#6b8099;font-size:12px;">Entradas no diário</td>
            <td style="padding:3px 0;color:#eef2f8;font-size:12px;font-weight:600;text-align:right;">${diaryEntries} em ${diaryWeeks} semanas</td>
          </tr>
          <tr>
            <td style="padding:3px 0;color:#6b8099;font-size:12px;">Última entrada</td>
            <td style="padding:3px 0;color:#eef2f8;font-size:12px;font-weight:600;text-align:right;">${lastEntry}</td>
          </tr>
          ${p.teacher_score != null ? `<tr>
            <td style="padding:3px 0;color:#6b8099;font-size:12px;">Nota do professor</td>
            <td style="padding:3px 0;color:#eef2f8;font-size:12px;font-weight:600;text-align:right;">${p.teacher_score}/20</td>
          </tr>` : ''}
          <tr>
            <td style="padding:3px 0;color:#6b8099;font-size:12px;">Visualizações</td>
            <td style="padding:3px 0;color:#eef2f8;font-size:12px;font-weight:600;text-align:right;">${p.views ?? 0}</td>
          </tr>
        </table>

        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <a href="${appUrl}/projeto/${p.slug}" style="display:inline-block;padding:8px 16px;background:rgba(27,120,247,0.12);border:1px solid rgba(27,120,247,0.25);color:#1b78f7;border-radius:8px;font-size:13px;font-weight:600;text-decoration:none;">Ver projeto →</a>
          <a href="${pickUrl}" style="display:inline-block;padding:8px 16px;background:#fbbf24;color:#09101f;border-radius:8px;font-size:13px;font-weight:700;text-decoration:none;">🏆 Escolher este</a>
        </div>
      </div>
    `
  }).join('')

  return `
    <div style="background:#03060d;padding:48px 24px;font-family:-apple-system,Helvetica,Arial,sans-serif;">
      <div style="max-width:560px;margin:0 auto;">
        <p style="margin:0 0 8px;color:#1b78f7;font-weight:700;font-size:18px;letter-spacing:-0.01em;">showo</p>
        <h1 style="margin:0 0 6px;color:#eef2f8;font-size:24px;font-weight:800;">🏆 Projeto do Mês</h1>
        <p style="margin:0 0 32px;color:#6b8099;font-size:14px;">${monthLabel} · Top 5 candidatos pelo algoritmo</p>

        <p style="margin:0 0 20px;color:#9fb0c8;font-size:14px;line-height:1.7;">
          O algoritmo analisou todos os projetos ativos com base em score, consistência do diário,
          validação do professor e engagement. Aqui estão os 5 mais fortes este mês.
          Clica em <strong style="color:#fbbf24;">Escolher este</strong> para definir o vencedor.
        </p>

        ${rows}

        <p style="margin:24px 0 0;color:#3d5166;font-size:12px;line-height:1.6;text-align:center;">
          Este email foi gerado automaticamente pelo Showo no final do mês.<br/>
          Só vocês recebem este email.
        </p>
      </div>
    </div>
  `
}

// ─────────────────────────────────────────────────────────────────────────────
// Handler
// ─────────────────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const resendKey = Deno.env.get('RESEND_API_KEY')
    if (!resendKey) throw new Error('RESEND_API_KEY not configured')

    const appUrl = Deno.env.get('APP_URL') || 'https://showo.pt'

    // Current month "2026-08"
    const now = new Date()
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

    // Check if winner already picked for this month
    const { data: existing } = await supabase
      .from('project_of_month')
      .select('id')
      .eq('month', month)
      .maybeSingle()

    if (existing) {
      return new Response(JSON.stringify({ skipped: true, reason: 'Winner already picked for this month' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Fetch all projects with score > 0, plus likes count
    const { data: projects, error: projErr } = await supabase
      .from('projects')
      .select(`
        id, name, slug, score, cover_url, views, teacher_score,
        user_id, creator_name, area, ai_tagline,
        profiles!projects_user_id_fkey (full_name, avatar_url, username)
      `)
      .gt('score', 0)
      .order('score', { ascending: false })
      .limit(100)

    if (projErr || !projects?.length) {
      return new Response(JSON.stringify({ error: 'No projects found', detail: projErr }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
      })
    }

    // Fetch journal entries for all projects
    const projectIds = projects.map(p => p.id)
    const { data: allEntries } = await supabase
      .from('project_journal_entries')
      .select('project_id, created_at, kind')
      .in('project_id', projectIds)

    // Fetch likes counts
    const { data: allLikes } = await supabase
      .from('project_likes')
      .select('project_id')
      .in('project_id', projectIds)

    // Build entry map and likes map
    const entriesByProject: Record<string, { created_at: string; kind: string }[]> = {}
    for (const e of (allEntries || [])) {
      if (!entriesByProject[e.project_id]) entriesByProject[e.project_id] = []
      entriesByProject[e.project_id].push({ created_at: e.created_at, kind: e.kind })
    }

    const likesByProject: Record<string, number> = {}
    for (const l of (allLikes || [])) {
      likesByProject[l.project_id] = (likesByProject[l.project_id] || 0) + 1
    }

    // Enrich and rank
    const enriched = projects.map(p => ({
      ...p,
      profile: Array.isArray(p.profiles) ? p.profiles[0] ?? null : (p.profiles ?? null),
      entries: entriesByProject[p.id] || [],
      likes: likesByProject[p.id] || 0,
    })) as ProjectRow[]

    const ranked = enriched
      .map(p => ({ ...p, composite: compositeScore(p) }))
      .sort((a, b) => b.composite - a.composite)
      .slice(0, 5)

    // Send email to all admins
    const html = buildEmail(ranked, month, appUrl)
    const [y, m2] = month.split('-')
    const monthLabel = new Date(+y, +m2 - 1, 1).toLocaleString('pt-PT', { month: 'long', year: 'numeric' })

    for (const email of ADMIN_EMAILS) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: FROM,
          to: email,
          subject: `${SUBJECT} ${monthLabel}`,
          html,
        }),
      })
    }

    return new Response(JSON.stringify({ success: true, month, candidates: ranked.map(p => ({ id: p.id, name: p.name, composite: p.composite })) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('pick-project-candidates error:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
    })
  }
})
