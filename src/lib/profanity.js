/**
 * Profanity / content moderation module.
 * Applied globally to every user-submitted text field.
 */

/**
 * Normalize: lowercase, strip accents, leet-speak → letters, collapse separators.
 * Handles: "n1gger", "r3t4rd4do", "f0d4-te", etc.
 */
function normalize(str) {
  return str
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    // Leet-speak / obfuscation substitutions
    .replace(/0/g, 'o')
    .replace(/1/g, 'i')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/5/g, 's')
    .replace(/\$/g, 's')
    .replace(/@/g, 'a')
    .replace(/!/g, 'i')
    // Separators → single space
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Compact: remove ALL whitespace — catches "f o d a s e", "foda-se" → "fodase" */
function compact(str) {
  return normalize(str).replace(/\s/g, '')
}

// Patterns run against normalize(text)
const PATTERNS = [
  // PT phrases — more specific, check first
  /filho\s*da?\s*puta/,
  /filha\s*da?\s*puta/,
  /vai\s+(se\s+)?foder/,
  /vai\s+te\s+fod/,
  /toma(r)?\s+no\s+cu/,
  /que\s+te\s+fod/,        // "que te fodas", "que te foda"
  /mata(r)?\s+te/,          // "matar-te" threats
  /vou\s+te\s+mat/,

  // PT words / insults
  /\bfodas?\b/,             // foda, fodas
  /fod[ae]\s*te/,           // fode-te, foda-te, fode te
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
  /retardad[ao]/,           // retardado, retardada
  /mongol(oid[ae]?)?/,      // mongolóide
  /\bimbecil\b/,
  /\bcretino\b/,
  /\bidiota\b/,
  /\bburro\b/,
  /\bparvo\b/,
  /\btrouxa\b/,
  /\bescroto\b/,
  /\bestupido\b/,
  /\blixo\b/,               // "lixo humano"
  /\bescoria\b/,

  // Racial / hateful slurs — includes vowel-swap evasion
  /\bnigga(s)?\b/,
  /\bnigger(s)?\b/,
  /n[iouae]gg[ae]r/,        // fuzzy: niogger, nuggur, noggur, etc.
  /\bpreto\s*sujo\b/,
  /\bpreta\s*suja\b/,
  /\bgitano\b/,
  /\bciganada\b/,
  /\bgitanos\b/,
  /\bzionist[ao]\b/,        // hateful slurs

  // Hate speech / threats
  /morre(r)?/,               // "morre" standalone threats
  /suicid[ae]/,              // encouraging self-harm
  /\bkys\b/,                 // EN "kill yourself"
  /kill\s*your\s*self/,

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
  /\bfaggot(s)?\b/,
  /\bslut(s|ty)?\b/,
  /\bjizz\b/,
  /\bmotherfuck/,
  /\bsonofabitch\b/,
]

// Compact patterns — catches evasion via spaces/dashes/dots between letters
const COMPACT_PATTERNS = [
  /fodase/,
  /fodamse/,
  /fodate/,           // fode-te / foda-te spaced
  /quetefo/,          // "que te fo..." prefix
  /filhodaputa/,
  /filhadaputa/,
  /merda/,
  /caralho/,
  /porra/,
  /bosta/,
  /retardado/,
  /retardada/,
  /imbecil/,
  /nigger/,
  /nigga/,
  /mongol/,
  /matarate/,         // "mata-te"
  /killurself/,
  /killyourself/,
]

export function containsProfanity(text) {
  if (!text) return false
  const n = normalize(text)
  const c = compact(text)
  return PATTERNS.some(p => p.test(n)) || COMPACT_PATTERNS.some(p => p.test(c))
}

/**
 * Replace profanity with black blocks for display.
 * e.g. "que merda" → "que █████"
 */
export function censorText(text) {
  if (!text) return text
  let result = normalize(text)
  for (const p of PATTERNS) {
    result = result.replace(new RegExp(p.source, 'g'), m => '█'.repeat(m.length))
  }
  return result
}
