import { startOfDay } from './journal'

export function daysUntil(dateStr) {
  if (!dateStr) return null
  return Math.ceil((new Date(dateStr + 'T00:00:00') - startOfDay(new Date())) / 86400000)
}

/* Qual é "o projeto" do aluno neste momento: a PAP ganha sempre, depois quem
   tem defesa mais próxima, depois o mais recente. Partilhado entre o
   Dashboard (projeto em foco dos painéis) e a Navbar (atalho do Diário na
   sidebar), para as duas nunca escolherem projetos diferentes. */
export function pickFocusProject(projects) {
  if (!projects?.length) return null
  const rank = p => {
    let r = 0
    if (p.is_pap || p.project_type === 'pap') r += 100
    const d = daysUntil(p.defense_date)
    if (d != null && d >= 0) r += 50 - Math.min(49, d / 4)
    return r
  }
  return [...projects].sort((a, b) => {
    const diff = rank(b) - rank(a)
    if (diff !== 0) return diff
    return new Date(b.created_at) - new Date(a.created_at)
  })[0]
}
