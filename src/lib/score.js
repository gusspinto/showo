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

  // Heuristic A: no letters at all — pure numbers, ?, *, +, etc.
  if (!/[a-zA-ZÀ-ɏ]/.test(str)) return true

  if (str.length < 8) return false  // rest needs enough text to judge

  const words = str.split(/\s+/).filter(w => w.length > 0)
  if (words.length === 0) return true

  // Heuristic 1: long unbroken strings (avg word length)
  const avgWordLen = words.reduce((s, w) => s + w.length, 0) / words.length
  if (avgWordLen > 20) return true

  // Heuristic 2: very low unique character ratio (repetitive/cyclic spam)
  const stripped = str.toLowerCase().replace(/\s/g, '')
  const uniqueRatio = new Set(stripped).size / stripped.length
  if (stripped.length > 20 && uniqueRatio < 0.12) return true

  // Heuristic 3: words with almost no vowels (consonant gibberish)
  // Covers words ≥ 6 letters — catches "sdfjsk", "qwrtpl" etc.
  // Skips short acronyms (css, npm, html < 6 chars) to avoid false positives
  const letterWords = words.map(w => w.replace(/[^a-zA-ZÀ-ɏ]/g, '')).filter(w => w.length >= 6)
  if (letterWords.length > 0) {
    const noVowelCount = letterWords.filter(w => {
      const vowels = (w.match(/[aeiouáéíóúàèìòùâêîôûãõ]/gi) || []).length
      return vowels / w.length < 0.10  // <10% vowels = consonant dump
    }).length
    if (noVowelCount / letterWords.length > 0.6) return true
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
