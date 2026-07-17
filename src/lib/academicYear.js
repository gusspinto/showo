// PT school years run Sept→June, so "current" flips over in September rather
// than January — a plain calendar year would mislabel most of the year.
export function getCurrentAcademicYear() {
  const now = new Date()
  const y = now.getFullYear()
  return now.getMonth() >= 8 ? `${y}/${y + 1}` : `${y - 1}/${y}`
}

// Newest first: one year ahead (for early setup) down through 3 past years.
export function academicYearOptions() {
  const startY = parseInt(getCurrentAcademicYear().split('/')[0], 10)
  const years = []
  for (let offset = 1; offset >= -3; offset--) {
    years.push(`${startY + offset}/${startY + offset + 1}`)
  }
  return years
}
