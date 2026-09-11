// Heatmap de atividade estilo GitHub — usado tanto no Percurso do projeto
// (ProjectTimeline.jsx) como no agregado do perfil (UserProfile.jsx).
// Partilhado para não duplicar a aritmética de datas, que é fácil de
// desalinhar por fuso horário (ver comentário em mondayOfUTC).

// Segunda-feira (em UTC) da semana que contém `ms` — mesma convenção do
// date_trunc('week', ...) do Postgres, que é quem agrupa os dados no
// servidor. Tudo em UTC de propósito: misturar aritmética de datas local
// com toISOString() (que converte para UTC) desalinhava a semana em ±1
// dia consoante o fuso do browser, e as contagens nunca batiam certo com
// as chaves que o servidor devolve.
export function mondayOfUTC(ms) {
  const d = new Date(ms)
  const day = (d.getUTCDay() + 6) % 7 // 0=segunda … 6=domingo
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day)
}

export const toISODate = ms => new Date(ms).toISOString().slice(0, 10)
export const WEEK_MS = 7 * 24 * 60 * 60 * 1000

/** Janela fixa das últimas `numWeeks` semanas, com as semanas sem nenhum
 * registo preenchidas a 0 — como o heatmap do GitHub, um hiato de
 * inatividade é tão visível quanto uma semana cheia. `weekly` só tem as
 * semanas com atividade (é o que o servidor devolve). */
export function weeksWindow(weekly, numWeeks) {
  const byWeek = new Map((weekly || []).map(w => [w.week, w.count]))
  const endMs = mondayOfUTC(Date.now())
  const startMs = mondayOfUTC(Date.now() - numWeeks * WEEK_MS)
  const out = []
  for (let t = startMs; t <= endMs; t += WEEK_MS) {
    const key = toISODate(t)
    out.push({ week: key, count: byWeek.get(key) || 0 })
  }
  return out
}
