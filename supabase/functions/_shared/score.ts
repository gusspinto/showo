// Deno port of src/lib/score.js — keep in sync with that file, which is the
// source of truth for the scoring formula used across the app.
// Only the pieces needed to recompute a project's `score` are ported here.

export function looksLikeSpam(text: string | null | undefined): boolean {
  if (!text) return false
  const str = String(text).trim()
  if (str.length === 0) return false

  if (!/[a-zA-ZÀ-ɏ]/.test(str)) return true

  const words = str.split(/\s+/).filter(Boolean)

  for (const w of words) {
    if (w.length >= 8 && /[a-zA-ZÀ-ɏ]/.test(w) && (w.match(/\d/g) || []).length >= 4) return true
  }

  if (/[aeiouáéíóúàèìòùâêîôûãõ]{4,}/i.test(str)) return true

  const lowWords = words.filter(w => {
    const l = w.replace(/[^a-zA-ZÀ-ɏ]/g, '')
    return l.length >= 5 && l === l.toLowerCase()
  })
  if (lowWords.length > 0) {
    const hasVowel = (w: string) => !!(w.replace(/[^a-zA-ZÀ-ɏ]/g, '').match(/[aeiouáéíóúàèìòùâêîôûãõ]/gi) || []).length
    const noVowelLow = lowWords.filter(w => !hasVowel(w))
    if (noVowelLow.length / lowWords.length > 0.5) return true
  }

  if (str.length < 8) return false

  const avgWordLen = words.reduce((s, w) => s + w.length, 0) / words.length
  if (avgWordLen > 20) return true

  const stripped = str.toLowerCase().replace(/\s/g, '')
  if (stripped.length > 20 && new Set(stripped).size / stripped.length < 0.12) return true

  const longLetterWords = words.map(w => w.replace(/[^a-zA-ZÀ-ɏ]/g, '')).filter(w => w.length >= 6)
  if (longLetterWords.length > 0) {
    const noVowelLong = longLetterWords.filter(w => !(w.match(/[aeiouáéíóúàèìòùâêîôûãõ]/gi) || []).length)
    if (noVowelLong.length / longLetterWords.length > 0.6) return true
  }

  return false
}

function isoWeek(dateStr: string): string | null {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return null
  const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  tmp.setUTCDate(tmp.getUTCDate() + 4 - (tmp.getUTCDay() || 7))
  const year = tmp.getUTCFullYear()
  const week = Math.ceil(((tmp.getTime() - Date.UTC(year, 0, 1)) / 86400000 + 1) / 7)
  return `${year}-W${String(week).padStart(2, '0')}`
}

export function calculateDiaryScore(entries: Array<{ created_at?: string; kind?: string }> = []): number {
  if (!entries || entries.length === 0) return 0

  const valid = entries.filter(e => e.created_at)
  if (valid.length === 0) return 0

  const now = Date.now()
  const weeks = new Set(valid.map(e => isoWeek(e.created_at!)).filter(Boolean))
  const kinds = new Set(valid.map(e => e.kind).filter(Boolean))
  const recentEntry = valid.find(e => now - new Date(e.created_at!).getTime() < 14 * 24 * 3600 * 1000)

  const n = valid.length
  const w = weeks.size
  const k = kinds.size

  if (n < 1) return 0
  if (n < 5 || w < 3) return 5
  if (n < 10 || w < 6) return 12
  if (!recentEntry) return 16
  if (n < 20 || w < 10) return 22
  if (k >= 2) return 30
  return 26
}

type ProjectLike = Record<string, unknown>

export function calculateScore(
  project: ProjectLike,
  journalEntries: Array<{ created_at?: string; kind?: string }> = [],
): { score: number } {
  let total = 0

  const raw = (key: string) => String(project[key] || '').trim()
  const val = (key: string) => {
    const v = raw(key)
    return looksLikeSpam(v) ? '' : v
  }
  const len = (key: string) => val(key).length

  if (raw('name') && !looksLikeSpam(raw('name'))) total += 3
  if (raw('area') && !looksLikeSpam(raw('area'))) total += 2

  if (len('problem') >= 120) total += 8
  if (len('solution') >= 120) total += 8
  if (len('target_audience') >= 60) total += 5
  if (len('features') >= 120) total += 5
  if (val('technologies')) total += 4
  if (len('challenges') >= 60) total += 5
  if (len('results') >= 100) total += 8
  if (len('learnings') >= 100) total += 8
  if (raw('cover_url')) total += 4

  const blocks = Array.isArray(project.preview_blocks) ? project.preview_blocks : []
  if (blocks.length >= 2) total += 4

  const style = (project.preview_style || {}) as Record<string, unknown>
  if (style.bg || style.accent || style.titleFont || style.cardStyle) total += 3

  if (project.ai_tagline && String(project.ai_tagline).trim()) total += 3

  total += calculateDiaryScore(journalEntries)

  return { score: Math.min(total, 100) }
}
