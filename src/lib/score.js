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
  if (str.length < 8) return false  // too short to judge

  const words = str.split(/\s+/).filter(w => w.length > 0)
  if (words.length === 0) return true

  // Heuristic 1: long unbroken strings (avg word length)
  const avgWordLen = words.reduce((s, w) => s + w.length, 0) / words.length
  if (avgWordLen > 20) return true

  // Heuristic 2: very low unique character ratio (repetitive/cyclic spam)
  const stripped = str.toLowerCase().replace(/\s/g, '')
  const uniqueRatio = new Set(stripped).size / stripped.length
  if (stripped.length > 20 && uniqueRatio < 0.12) return true

  // Heuristic 3: long word with almost no vowels (random consonant runs)
  const longWords = words.filter(w => w.length > 12)
  for (const w of longWords) {
    const vowels = (w.match(/[aeiouáéíóúàèìòùâêîôûãõ]/gi) || []).length
    if (vowels / w.length < 0.08) return true  // <8% vowels = gibberish
  }

  return false
}

export function calculateScore(project) {
  let total = 0

  const raw = (key) => String(project[key] || '').trim()
  const val = (key) => {
    const v = raw(key)
    return looksLikeSpam(v) ? '' : v
  }
  const len = (key) => val(key).length

  if (raw('name') && !looksLikeSpam(raw('name'))) total += 5
  if (raw('area') && !looksLikeSpam(raw('area'))) total += 5

  // Each threshold exactly matches the CHALLENGES definitions — no partial credit
  // so ScoreRing and earnedXP are always the same number.
  if (len('problem') >= 100)        total += 15
  if (len('solution') >= 100)       total += 15
  if (len('target_audience') >= 50) total += 10
  if (len('features') >= 100)       total += 10
  if (val('technologies'))           total += 8
  if (len('challenges') >= 50)      total += 8
  if (len('results') >= 80)         total += 12
  if (len('learnings') >= 80)       total += 12

  // Cover image (bonus — capped at 100 anyway)
  if (raw('cover_url')) total += 10

  return { score: Math.min(total, 100) }
}
