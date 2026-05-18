export function calculateScore(project) {
  let total = 0

  const val = (key) => String(project[key] || '').trim()
  const len = (key) => val(key).length

  if (val('name')) total += 5
  if (val('area')) total += 5

  if (len('problem') >= 100) total += 15
  else if (len('problem') >= 60) total += 6

  if (len('solution') >= 100) total += 15
  else if (len('solution') >= 60) total += 6

  if (len('target_audience') >= 50) total += 10

  if (len('features') >= 100) total += 10
  else if (len('features') >= 60) total += 4

  if (val('technologies')) total += 8

  if (len('challenges') >= 50) total += 8

  if (len('results') >= 80) total += 12
  else if (len('results') >= 50) total += 5

  if (len('learnings') >= 80) total += 12
  else if (len('learnings') >= 50) total += 5

  return { score: total }
}
