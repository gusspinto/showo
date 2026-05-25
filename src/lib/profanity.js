/**
 * Profanity / content moderation module.
 * Applied globally to every user-submitted text field.
 */

/** Normalize: lowercase, strip accents, collapse separators → space */
function normalize(str) {
  return str
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Compact: remove ALL whitespace — catches "f o d a s e", "foda-se" → "fodase" */
function compact(str) {
  return normalize(str).replace(/\s/g, '')
}

// Patterns run against normalize(text) — word-boundary safe
const PATTERNS = [
  // PT phrases (check first, more specific)
  /filho\s*da?\s*puta/,
  /filha\s*da?\s*puta/,
  /vai\s+(se\s+)?foder/,
  /toma(r)?\s+no\s+cu/,

  // PT words
  /\bmerda\b/,
  /\bcaralho\b/,
  /\bporra\b/,
  /\bbosta\b/,
  /\bputa\b/,
  /\bputo\b/,
  /\bcabra\b/,
  /\bcabrao\b/,
  /\bfdp\b/,
  /\bfds\b/,
  /\bviado\b/,
  /\bcuzao\b/,
  /\bcu\b/,

  // Racial / hateful slurs
  /\bnigga(s)?\b/,
  /\bnigger(s)?\b/,

  // EN profanity
  /\bfuck(ing|ed|er|s)?\b/,
  /\bshit(ty)?\b/,
  /\bbitch(es|y)?\b/,
  /\bcunt\b/,
  /\bcock\b/,
  /\bdick\b/,
  /\basshole\b/,
  /\bwhore\b/,
  /\bbastard\b/,
]

// Compact patterns — catches evasion via spaces/dashes between letters
const COMPACT_PATTERNS = [
  /fodase/,
  /fodamse/,
  /filhodaputa/,
  /filhadaputa/,
  /merda/,
  /caralho/,
  /porra/,
  /bosta/,
]

export function containsProfanity(text) {
  if (!text) return false
  const n = normalize(text)
  const c = compact(text)
  return PATTERNS.some(p => p.test(n)) || COMPACT_PATTERNS.some(p => p.test(c))
}

/**
 * Replace profanity with black blocks for display.
 * e.g. "que merda de projeto" → "que █████ de projeto"
 */
export function censorText(text) {
  if (!text) return text
  let result = normalize(text)
  for (const p of PATTERNS) {
    result = result.replace(new RegExp(p.source, 'g'), m => '█'.repeat(m.length))
  }
  return result
}
