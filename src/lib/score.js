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
