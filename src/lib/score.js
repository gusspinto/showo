/**
 * Detects if text looks like random keyboard mashing or spam.
 * Returns true if the text should NOT count toward the score.
 *
 * Heuristics:
 *  1. Average word length > 20 chars  (e.g. "dfgdfgdfgdfgdfgdfg...")
 *  2. Unique-character ratio < 12%    (e.g. "aaaaaaaaaaaaa" or "dfdfdfdfdfdf")
 *  3. Single word that's pure gibberish (no vowels in a long word)
 */
/**
 * Returns true if the text is non-empty but too short to be real content.
 * Used for description/textarea fields — NOT for short identifiers like project name.
 */
export function isTooShortForContent(text) {
  if (!text) return false
  const str = text.trim()
  return str.length > 0 && str.length < 20
}

export function looksLikeSpam(text) {
  if (!text) return false
  const str = text.trim()
  if (str.length === 0) return false

  // A: no letters at all — pure numbers, ?, *, +, etc.
  if (!/[a-zA-ZÀ-ɏ]/.test(str)) return true

  const words = str.split(/\s+/).filter(Boolean)

  // B: word with letters AND ≥2 embedded digits — e.g. "wuid238j28", "abc123def"
  for (const w of words) {
    if (/[a-zA-ZÀ-ɏ]/.test(w) && (w.match(/\d/g) || []).length >= 2) return true
  }

  // C: 4+ consecutive vowels — not found in real PT/EN words ("aeuiedah", "ooouuu")
  if (/[aeiouáéíóúàèìòùâêîôûãõ]{4,}/i.test(str)) return true

  // D: lowercase words ≥5 chars with zero vowels — consonant gibberish
  //    Uppercase excluded so HTML, HTTPS, JWT, SSL etc. are allowed
  const lowWords = words.filter(w => {
    const l = w.replace(/[^a-zA-ZÀ-ɏ]/g, '')
    return l.length >= 5 && l === l.toLowerCase()
  })
  if (lowWords.length > 0) {
    const hasVowel = w => !!(w.replace(/[^a-zA-ZÀ-ɏ]/g, '').match(/[aeiouáéíóúàèìòùâêîôûãõ]/gi) || []).length
    const noVowelLow = lowWords.filter(w => !hasVowel(w))
    if (noVowelLow.length / lowWords.length > 0.5) return true
  }

  if (str.length < 8) return false

  // 1: avg word length > 20 — long unbroken run
  const avgWordLen = words.reduce((s, w) => s + w.length, 0) / words.length
  if (avgWordLen > 20) return true

  // 2: very low unique character ratio — repetitive/cyclic mashing
  const stripped = str.toLowerCase().replace(/\s/g, '')
  if (stripped.length > 20 && new Set(stripped).size / stripped.length < 0.12) return true

  // 3: words ≥6 chars with no vowels (>60% of such words)
  const longLetterWords = words.map(w => w.replace(/[^a-zA-ZÀ-ɏ]/g, '')).filter(w => w.length >= 6)
  if (longLetterWords.length > 0) {
    const noVowelLong = longLetterWords.filter(w => !(w.match(/[aeiouáéíóúàèìòùâêîôûãõ]/gi) || []).length)
    if (noVowelLong.length / longLetterWords.length > 0.6) return true
  }

  return false
}

// Returns week key "YYYY-Www" for a given date string
function isoWeek(dateStr) {
  const d = new Date(dateStr)
  if (isNaN(d)) return null
  // ISO week: Thursday of the week determines the year
  const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  tmp.setUTCDate(tmp.getUTCDate() + 4 - (tmp.getUTCDay() || 7))
  const year = tmp.getUTCFullYear()
  const week = Math.ceil(((tmp - Date.UTC(year, 0, 1)) / 86400000 + 1) / 7)
  return `${year}-W${String(week).padStart(2, '0')}`
}

// Computes diary consistency score (0–30) from journal entry array.
// Requires real sustained usage — can't be gamed in one session.
export function calculateDiaryScore(entries = []) {
  if (!entries || entries.length === 0) return 0

  const valid = entries.filter(e => e.created_at)
  if (valid.length === 0) return 0

  const now = Date.now()
  const weeks = new Set(valid.map(e => isoWeek(e.created_at)).filter(Boolean))
  const kinds = new Set(valid.map(e => e.kind).filter(Boolean))
  const recentEntry = valid.find(e => now - new Date(e.created_at).getTime() < 14 * 24 * 3600 * 1000)

  const n = valid.length
  const w = weeks.size
  const k = kinds.size

  // Tier 1 — 5pts: any entry at all
  if (n < 1) return 0
  if (n < 5 || w < 3) return 5

  // Tier 2 — 12pts: ≥5 entries across ≥3 weeks
  if (n < 10 || w < 6) return 12

  // Tier 3 — 22pts: ≥10 entries, ≥6 weeks, recent activity
  if (!recentEntry) return 16   // inactive penalty
  if (n < 20 || w < 10) return 22

  // Tier 4 — 30pts: ≥20 entries, ≥10 weeks, recent, ≥2 kinds
  if (k >= 2) return 30
  return 26  // near-max but missing kind variety
}

export function calculateScore(project, journalEntries = []) {
  let total = 0

  const raw = (key) => String(project[key] || '').trim()
  const val = (key) => {
    const v = raw(key)
    return looksLikeSpam(v) ? '' : v
  }
  const len = (key) => val(key).length

  // ── Campos de texto — máx 60pts ──────────────────────────────────────────
  // Mínimos mais exigentes para garantir conteúdo real, não preenchimento rápido
  if (raw('name') && !looksLikeSpam(raw('name'))) total += 3
  if (raw('area') && !looksLikeSpam(raw('area'))) total += 2

  if (len('problem') >= 120)        total += 8
  if (len('solution') >= 120)       total += 8
  if (len('target_audience') >= 60) total += 5
  if (len('features') >= 120)       total += 5
  if (val('technologies'))           total += 4
  if (len('challenges') >= 60)      total += 5
  if (len('results') >= 100)        total += 8
  if (len('learnings') >= 100)      total += 8
  if (raw('cover_url'))              total += 4

  // ── Bónus de apresentação — máx 10pts ────────────────────────────────────
  // Recompensa quem constrói a preview — não basta preencher campos de texto
  const blocks = Array.isArray(project.preview_blocks) ? project.preview_blocks : []
  if (blocks.length >= 2) total += 4

  const style = project.preview_style || {}
  if (style.bg || style.accent || style.titleFont || style.cardStyle) total += 3

  if (project.ai_tagline && String(project.ai_tagline).trim()) total += 3

  // ── Diário — máx 30pts ───────────────────────────────────────────────────
  // Requer meses de uso real — não se consegue numa tarde
  total += calculateDiaryScore(journalEntries)

  return { score: Math.min(total, 100) }
}

/**
 * Calculates a user's "potential" score (0-100).
 * Designed to be hard to max out — requires multiple strong projects,
 * external validation, and a complete profile.
 *
 * @param {Object} opts
 * @param {Array}  opts.projects      - user's projects with score, teacher_score, views, project_type, class_projects
 * @param {Object} opts.profile       - user's profile object
 * @returns {{ potential: number, breakdown: Object }}
 */
export function calculatePotential({ projects = [], profile = {}, engagement = 0 }) {
  const p = projects.filter(Boolean)

  // ── 1. Quality (30pts) ──
  // Average score, but only projects ≥ 40 count. Having weak projects hurts.
  // Curve: diminishing returns — need avg ≥ 85 for full marks.
  const qualifying = p.filter(pr => (pr.score ?? 0) >= 40)
  let quality = 0
  if (qualifying.length > 0) {
    const avg = qualifying.reduce((s, pr) => s + (pr.score ?? 0), 0) / qualifying.length
    // Penalize if many projects are below threshold
    const qualifyRatio = p.length > 0 ? qualifying.length / p.length : 0
    const rawQ = (avg / 100) * qualifyRatio
    // Curve: sqrt to make the last points harder
    quality = Math.pow(rawQ, 0.7) * 30
  }

  // ── 2. Depth (20pts) ──
  // How many projects are truly complete (score ≥ 80).
  // 1 complete = 6pts, 2 = 12pts, 3 = 16pts, 4+ = 20pts (diminishing)
  const complete = p.filter(pr => (pr.score ?? 0) >= 80).length
  const depth = complete === 0 ? 0 : Math.min(20, 6 * Math.sqrt(complete) * (20 / (6 * 2)))

  // ── 3. Profile (15pts) ──
  // Each field is worth points but they're not equal.
  let prof = 0
  if (profile.avatar_url) prof += 3
  if (profile.bio && profile.bio.trim().length >= 30) prof += 3
  if (profile.skills && (Array.isArray(profile.skills) ? profile.skills.length >= 2 : profile.skills.trim())) prof += 3
  if (profile.area) prof += 2
  if (profile.linkedin_url) prof += 2
  if (profile.username) prof += 2

  // ── 4. Validation (20pts) ──
  // External signals the user can't fully control.
  let validation = 0
  // Teacher scores (0-20 scale) — need good grades
  const graded = p.filter(pr => pr.teacher_score != null)
  if (graded.length > 0) {
    const avgGrade = graded.reduce((s, pr) => s + pr.teacher_score, 0) / graded.length
    validation += (avgGrade / 20) * 10  // up to 10pts
  }
  // Views — social proof (logarithmic: 100 views = ~4pts, 1000 = ~6pts)
  const totalViews = p.reduce((s, pr) => s + (pr.views ?? 0), 0)
  if (totalViews > 0) validation += Math.min(6, Math.log10(totalViews + 1) * 2.5)
  // Projects in turmas — institutional engagement
  const inClass = p.filter(pr => pr.class_projects && pr.class_projects.length > 0).length
  validation += Math.min(4, inClass * 1.5)

  // ── 5. Consistency (15pts) ──
  // Rewards portfolio breadth — multiple projects, diverse types, and genuine
  // journal engagement (0-100 signal from computeEngagementSignal).
  let consistency = 0
  // Number of projects (diminishing: 1=3, 2=5.5, 3=7.5, 5+=8)
  if (p.length > 0) consistency += Math.min(8, 3 * Math.sqrt(p.length) * (8 / (3 * Math.sqrt(5))))
  // Diversity of project types (max 3)
  const types = new Set(p.map(pr => pr.project_type).filter(Boolean))
  consistency += Math.min(3, types.size * 1.5)
  // Journal engagement — up to 4pts; rewards alunos that use the diary genuinely
  consistency += Math.min(4, (engagement / 100) * 4)

  const total = Math.round(quality + depth + Math.min(prof, 15) + Math.min(validation, 20) + Math.min(consistency, 15))

  return {
    potential: Math.min(total, 100),
    breakdown: {
      quality: Math.round(quality),
      depth: Math.round(depth),
      profile: Math.min(Math.round(prof), 15),
      validation: Math.round(Math.min(validation, 20)),
      consistency: Math.round(Math.min(consistency, 15)),
    },
  }
}
