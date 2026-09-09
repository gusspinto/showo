// How "filled in" a project is, 0-100, from the fields a teacher cares about.
// Lived as an identical copy in Dashboard.jsx and TurmaPage.jsx — one home now
// so the two teacher views can't drift apart.
export function projectCompletude(p) {
  if (!p) return 0
  const checks = [
    !!(p.goal || p.problem),
    !!p.solution,
    !!p.technologies,
    !!p.features,
    !!p.results,
    !!(p.linkedin_url || p.github_url || p.portfolio_url),
    !!p.cover_url,
  ]
  return Math.round((checks.filter(Boolean).length / checks.length) * 100)
}
