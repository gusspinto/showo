export function calculateScore(project) {
  let total = 0
  const val = (key) => String(project[key] || '').trim()
  const len = (key) => val(key).length

  // Identity
  if (val('name'))       total += 4
  if (val('area'))       total += 3
  if (val('ai_tagline')) total += 4

  // AI description (historia joined as one block)
  const desc = len('ai_description')
  if (desc > 300)      total += 10
  else if (desc > 100) total += 5

  // Problem
  const prob = len('problem')
  if (prob > 300)      total += 10
  else if (prob > 100) total += 5

  // Solution
  const sol = len('solution')
  if (sol > 300)      total += 10
  else if (sol > 100) total += 5

  // Target audience
  const ta = len('target_audience')
  if (ta > 200)     total += 8
  else if (ta > 80) total += 5

  // Features
  const feat = len('features')
  if (feat > 400)      total += 10
  else if (feat > 150) total += 6

  // Technologies
  if (val('technologies')) total += 5

  // Challenges
  const chal = len('challenges')
  if (chal > 300)      total += 8
  else if (chal > 100) total += 5

  // Results
  const res = len('results')
  if (res > 300)      total += 10
  else if (res > 100) total += 6

  // Learnings
  const learn = len('learnings')
  if (learn > 300)      total += 8
  else if (learn > 100) total += 6

  // Cover image
  if (val('cover_url')) total += 8

  return { score: Math.min(total, 100) }
}
