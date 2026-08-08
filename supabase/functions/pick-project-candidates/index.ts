import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const FROM    = 'Showo <hello@showo.pt>'
const SUBJECT = '🏆 Projeto do Mês — Os 5 candidatos de'
const ADMIN_EMAILS = ['brunosilva.smd@gmail.com', 'gustavo@showo.pt']

// ── Types ─────────────────────────────────────────────────────────────────────
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
  preview_blocks: unknown[] | null
  preview_style: Record<string, unknown> | null
  // content depth fields
  problem: string | null
  solution: string | null
  target_audience: string | null
  features: string | null
  technologies: string | null
  challenges: string | null
  results: string | null
  learnings: string | null
  // joined
  profile: { full_name: string | null; avatar_url: string | null; username: string | null } | null
  entries: { created_at: string; kind: string }[]
  likes: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function isoWeek(dateStr: string): string | null {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return null
  const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  tmp.setUTCDate(tmp.getUTCDate() + 4 - (tmp.getUTCDay() || 7))
  const year = tmp.getUTCFullYear()
  const week = Math.ceil(((tmp.getTime() - Date.UTC(year, 0, 1)) / 86400000 + 1) / 7)
  return `${year}-W${String(week).padStart(2, '0')}`
}

// Mirrors src/lib/score.js calculateDiaryScore()
function diaryScore(entries: { created_at: string; kind: string }[]): number {
  if (!entries?.length) return 0
  const valid = entries.filter(e => e.created_at)
  if (!valid.length) return 0
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

function isActiveRecent(entries: { created_at: string }[], days: number): boolean {
  const cutoff = Date.now() - days * 24 * 3600 * 1000
  return entries.some(e => new Date(e.created_at).getTime() > cutoff)
}

const CONTENT_FIELDS = [
  'problem', 'solution', 'target_audience', 'features',
  'technologies', 'challenges', 'results', 'learnings',
] as const

function sectionsFilled(p: ProjectRow): number {
  return CONTENT_FIELDS.filter(f => String(p[f] || '').trim().length >= 30).length
}

// Presentation quality score (0–20) — mirrors score.js bonus block
function presentationScore(p: ProjectRow): number {
  let pts = 0
  if (p.cover_url) pts += 3
  const blocks = Array.isArray(p.preview_blocks) ? p.preview_blocks : []
  if (blocks.length >= 2) pts += 5
  if (blocks.length >= 4) pts += 3
  const style = (p.preview_style || {}) as Record<string, unknown>
  if (style.bg || style.accent || style.titleFont || style.cardStyle) pts += 4
  if (p.ai_tagline?.trim()) pts += 5
  return Math.min(pts, 20)
}

// Content depth score (0–15) — rewards real completion + reflection
function contentDepthScore(p: ProjectRow): number {
  const filled = sectionsFilled(p)
  let pts = (filled / CONTENT_FIELDS.length) * 12
  // Bonus for results and learnings — signals project reached completion + reflection
  if (String(p.results || '').trim().length >= 80) pts += 1.5
  if (String(p.learnings || '').trim().length >= 80) pts += 1.5
  return Math.min(pts, 15)
}

// External validation score (0–10)
function validationScore(p: ProjectRow): number {
  let pts = 0
  if (p.teacher_score != null) pts += (p.teacher_score / 20) * 6
  pts += Math.min(3, Math.log10((p.views ?? 0) + 1) * 1.5)
  pts += Math.min(1, p.likes * 0.3)
  return Math.min(pts, 10)
}

// ── Composite score (0–100) ───────────────────────────────────────────────────
// 30% project score  + 20% presentation  + 25% diary  + 15% content depth  + 10% validation
function compositeScore(p: ProjectRow): number {
  const projectPts  = ((p.score ?? 0) / 100) * 30
  const presentPts  = (presentationScore(p) / 20) * 20
  const diaryPts    = (diaryScore(p.entries) / 30) * 25
  const contentPts  = (contentDepthScore(p) / 15) * 15
  const validPts    = (validationScore(p) / 10) * 10
  return Math.round(projectPts + presentPts + diaryPts + contentPts + validPts)
}

// ── Tier system ───────────────────────────────────────────────────────────────
// Each tier degrades criteria so there are always 5 candidates.
// Tier is purely a signal for admins — the actual ranking uses compositeScore.
interface Tier {
  name: string
  emoji: string
  note: string | null
  filter: (p: ProjectRow) => boolean
}

const TIERS: Tier[] = [
  {
    name: 'Ouro',
    emoji: '🥇',
    note: null,
    filter: (p) =>
      (p.score ?? 0) >= 60 &&
      diaryScore(p.entries) >= 12 &&
      isActiveRecent(p.entries, 30) &&
      presentationScore(p) >= 7 &&
      sectionsFilled(p) >= 5,
  },
  {
    name: 'Prata',
    emoji: '🥈',
    note: '⚠️ Mês fraco — nenhum projeto atingiu o padrão completo.',
    filter: (p) =>
      (p.score ?? 0) >= 40 &&
      diaryScore(p.entries) >= 5 &&
      presentationScore(p) >= 3 &&
      sectionsFilled(p) >= 3,
  },
  {
    name: 'Bronze',
    emoji: '🥉',
    note: '⚠️⚠️ Poucos projetos ativos — critérios reduzidos automaticamente.',
    filter: (p) =>
      (p.score ?? 0) >= 25 &&
      sectionsFilled(p) >= 2,
  },
  {
    name: 'Emergência',
    emoji: '🔴',
    note: '🔴 Sem projetos suficientes — escolha simbólica entre os disponíveis.',
    filter: (p) => (p.score ?? 0) > 0,
  },
]

function pickCandidates(projects: ProjectRow[]): { candidates: (ProjectRow & { composite: number })[]; tier: Tier } {
  const ranked = projects.map(p => ({ ...p, composite: compositeScore(p) }))

  for (const tier of TIERS) {
    const pool = ranked.filter(tier.filter).sort((a, b) => b.composite - a.composite)
    if (pool.length >= 5) return { candidates: pool.slice(0, 5), tier }
    // Last resort: return whatever we have (Emergency tier only)
    if (tier === TIERS[TIERS.length - 1] && pool.length > 0) {
      return { candidates: pool.slice(0, 5), tier }
    }
  }

  // Absolute fallback — return top 5 by composite regardless
  return {
    candidates: ranked.sort((a, b) => b.composite - a.composite).slice(0, 5),
    tier: TIERS[TIERS.length - 1],
  }
}

// ── Email HTML ────────────────────────────────────────────────────────────────
function buildEmail(
  candidates: (ProjectRow & { composite: number })[],
  tier: Tier,
  month: string,
  appUrl: string,
): string {
  const [y, m] = month.split('-')
  const monthLabel = new Date(+y, +m - 1, 1).toLocaleString('pt-PT', { month: 'long', year: 'numeric' })
  const medals = ['🥇', '🥈', '🥉', '4.', '5.']

  const rows = candidates.map((p, i) => {
    const name = p.profile?.full_name || p.creator_name || 'Estudante'
    const pickUrl = `${appUrl}/admin/pick-project?project_id=${p.id}&month=${month}`
    const diaryEntries = p.entries.length
    const diaryWeeks  = new Set(p.entries.map(e => isoWeek(e.created_at)).filter(Boolean)).size
    const lastEntry   = p.entries
      .map(e => new Date(e.created_at))
      .sort((a, b) => b.getTime() - a.getTime())[0]
    const lastEntryStr = lastEntry ? lastEntry.toLocaleDateString('pt-PT') : '—'

    const present = presentationScore(p)
    const depth   = sectionsFilled(p)

    // Presentation badges
    const blocks = Array.isArray(p.preview_blocks) ? p.preview_blocks : []
    const presentBadges = [
      p.cover_url            ? '📷 Capa'         : null,
      blocks.length >= 2     ? `🎨 ${blocks.length} blocos` : null,
      p.preview_style?.bg || p.preview_style?.accent ? '🎨 Estilo custom' : null,
      p.ai_tagline?.trim()   ? '✨ AI tagline'    : null,
    ].filter(Boolean).join(' · ') || '—'

    return `
      <div style="background:#0a111f;border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:20px 24px;margin:0 0 16px;">
        <div style="display:flex;align-items:center;gap:10px;margin:0 0 10px;">
          <span style="font-size:20px;">${medals[i]}</span>
          <div style="flex:1;min-width:0;">
            <div style="color:#eef2f8;font-size:16px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${p.name}</div>
            <div style="color:#6b8099;font-size:13px;">${name}${p.area ? ` · ${p.area}` : ''}</div>
          </div>
          <div style="text-align:right;flex-shrink:0;">
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
            <td style="padding:3px 0;color:#6b8099;font-size:12px;">Apresentação</td>
            <td style="padding:3px 0;color:#eef2f8;font-size:12px;font-weight:600;text-align:right;">${present}/20 — ${presentBadges}</td>
          </tr>
          <tr>
            <td style="padding:3px 0;color:#6b8099;font-size:12px;">Secções preenchidas</td>
            <td style="padding:3px 0;color:#eef2f8;font-size:12px;font-weight:600;text-align:right;">${depth} / 8</td>
          </tr>
          <tr>
            <td style="padding:3px 0;color:#6b8099;font-size:12px;">Diário</td>
            <td style="padding:3px 0;color:#eef2f8;font-size:12px;font-weight:600;text-align:right;">${diaryEntries} entradas · ${diaryWeeks} semanas · última ${lastEntryStr}</td>
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

  const tierBanner = tier.note ? `
    <div style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);border-radius:10px;padding:12px 16px;margin:0 0 24px;color:#fca5a5;font-size:13px;line-height:1.5;">
      ${tier.note}
    </div>
  ` : ''

  return `
    <div style="background:#03060d;padding:48px 24px;font-family:-apple-system,Helvetica,Arial,sans-serif;">
      <div style="max-width:580px;margin:0 auto;">
        <p style="margin:0 0 8px;color:#1b78f7;font-weight:700;font-size:18px;letter-spacing:-0.01em;">showo</p>
        <h1 style="margin:0 0 6px;color:#eef2f8;font-size:24px;font-weight:800;">🏆 Projeto do Mês</h1>
        <p style="margin:0 0 6px;color:#6b8099;font-size:14px;">${monthLabel} · Top 5 candidatos pelo algoritmo</p>
        <p style="margin:0 0 28px;">
          <span style="display:inline-block;padding:4px 10px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:6px;font-size:12px;color:#9fb0c8;">
            Tier ${tier.emoji} ${tier.name}
          </span>
        </p>

        ${tierBanner}

        <p style="margin:0 0 20px;color:#9fb0c8;font-size:14px;line-height:1.7;">
          O algoritmo avaliou qualidade da apresentação, profundidade do conteúdo, consistência do diário
          e validação externa. Clica em <strong style="color:#fbbf24;">Escolher este</strong> para definir o vencedor.
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

// ── Handler ───────────────────────────────────────────────────────────────────
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

    const now   = new Date()
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

    // Skip if winner already picked for this month
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

    // Fetch projects — include all fields needed for qualitative scoring
    const { data: projects, error: projErr } = await supabase
      .from('projects')
      .select(`
        id, name, slug, score, cover_url, views, teacher_score,
        user_id, creator_name, area, ai_tagline,
        preview_blocks, preview_style,
        problem, solution, target_audience, features,
        technologies, challenges, results, learnings,
        profiles!projects_user_id_fkey (full_name, avatar_url, username)
      `)
      .gt('score', 0)
      .order('score', { ascending: false })
      .limit(200)

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

    const { data: allLikes } = await supabase
      .from('project_likes')
      .select('project_id')
      .in('project_id', projectIds)

    const entriesByProject: Record<string, { created_at: string; kind: string }[]> = {}
    for (const e of (allEntries || [])) {
      if (!entriesByProject[e.project_id]) entriesByProject[e.project_id] = []
      entriesByProject[e.project_id].push({ created_at: e.created_at, kind: e.kind })
    }

    const likesByProject: Record<string, number> = {}
    for (const l of (allLikes || [])) {
      likesByProject[l.project_id] = (likesByProject[l.project_id] || 0) + 1
    }

    // Enrich projects with entries + likes
    const enriched = projects.map(p => ({
      ...p,
      profile: Array.isArray(p.profiles) ? (p.profiles[0] ?? null) : (p.profiles ?? null),
      entries: entriesByProject[p.id] || [],
      likes:   likesByProject[p.id]   || 0,
    })) as ProjectRow[]

    // Pick the best 5 via tiered algorithm
    const { candidates, tier } = pickCandidates(enriched)

    // Send email to all admins
    const [y, m2] = month.split('-')
    const monthLabel = new Date(+y, +m2 - 1, 1).toLocaleString('pt-PT', { month: 'long', year: 'numeric' })
    const html = buildEmail(candidates, tier, month, appUrl)

    for (const email of ADMIN_EMAILS) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: FROM,
          to: email,
          subject: `${SUBJECT} ${monthLabel} ${tier.emoji}`,
          html,
        }),
      })
    }

    return new Response(JSON.stringify({
      success: true,
      month,
      tier: tier.name,
      candidates: candidates.map(p => ({
        id:        p.id,
        name:      p.name,
        composite: p.composite,
        score:     p.score,
        presentation: presentationScore(p),
        sections:  sectionsFilled(p),
        diary:     diaryScore(p.entries),
      })),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('pick-project-candidates error:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
    })
  }
})
