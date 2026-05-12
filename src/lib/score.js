export function calculateScore(project) {
  let total = 0

  const val = (key) => String(project[key] || '').trim()
  const len = (key) => val(key).length

  if (val('name')) total += 5
  if (val('area')) total += 5

  if (len('problem') > 100) total += 15
  else if (len('problem') > 50) total += 8
  else if (val('problem')) total += 3

  if (len('solution') > 100) total += 15
  else if (len('solution') > 50) total += 8
  else if (val('solution')) total += 3

  if (len('target_audience') > 50) total += 10
  else if (val('target_audience')) total += 5

  if (len('features') > 100) total += 10
  else if (len('features') > 50) total += 5
  else if (val('features')) total += 2

  if (val('technologies')) total += 8

  if (len('challenges') > 50) total += 8
  else if (val('challenges')) total += 4

  if (len('results') > 80) total += 12
  else if (len('results') > 40) total += 7
  else if (val('results')) total += 3

  if (len('learnings') > 80) total += 12
  else if (len('learnings') > 40) total += 7
  else if (val('learnings')) total += 3

  return { score: total }
}
