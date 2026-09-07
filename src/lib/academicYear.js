// PT school years run Sept→June, so "current" flips over in September rather
// than January — a plain calendar year would mislabel most of the year.
export function getCurrentAcademicYear() {
  const now = new Date()
  const y = now.getFullYear()
  return now.getMonth() >= 8 ? `${y}/${y + 1}` : `${y - 1}/${y}`
}

// Ano atual + o seguinte (para quem prepara a turma antes de setembro).
// Chega para criar/editar uma turma; o modal de edição junta na mesma o
// ano que a turma já tinha, se for outro.
export function academicYearOptions() {
  const startY = parseInt(getCurrentAcademicYear().split('/')[0], 10)
  return [`${startY}/${startY + 1}`, `${startY + 1}/${startY + 2}`]
}
