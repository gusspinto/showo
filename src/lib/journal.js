import { GraphNewUpIcon as TrendingUp } from '@solar-icons/react/bold/graph-new-up'
import { DangerTriangleIcon as AlertTriangle } from '@solar-icons/react/bold/danger-triangle'
import { BranchingPathsDownIcon as GitBranch } from '@solar-icons/react/bold/branching-paths-down'
import { MagnifierIcon as Search } from '@solar-icons/react/bold/magnifier'
import { LightbulbIcon as Lightbulb } from '@solar-icons/react/bold/lightbulb'
import { CheckCircleIcon as CheckCircle2 } from '@solar-icons/react/bold/check-circle'
import { NotebookMinimalisticIcon as StickyNote } from '@solar-icons/react/bold/notebook-minimalistic'

/* ══════════════════════════════════════════════════════════════════════════
   DIÁRIO DO PROJETO
   O aluno regista o trabalho à medida que o faz. Cada tipo de entrada
   alimenta secções diferentes do relatório final — é isso que permite
   mostrar-lhe, com honestidade, quanto do relatório já está coberto.
   ══════════════════════════════════════════════════════════════════════════ */

export const JOURNAL_KINDS = [
  {
    id: 'progresso',
    label: 'Progresso',
    short: 'Progresso',
    icon: TrendingUp,
    prompt: 'O que avançaste desde a última vez?',
    placeholder: 'Terminei o ecrã de login e liguei-o à base de dados.',
  },
  {
    id: 'dificuldade',
    label: 'Dificuldade',
    short: 'Dificuldade',
    icon: AlertTriangle,
    prompt: 'Onde ficaste preso?',
    placeholder: 'A API devolve erro 401 e ainda não percebi porquê.',
  },
  {
    id: 'decisao',
    label: 'Decisão',
    short: 'Decisão',
    icon: GitBranch,
    prompt: 'O que decidiste, e porquê?',
    placeholder: 'Troquei o MySQL por Supabase para não gerir servidor.',
  },
  {
    id: 'pesquisa',
    label: 'Pesquisa',
    short: 'Pesquisa',
    icon: Search,
    prompt: 'O que pesquisaste ou aprendeste?',
    placeholder: 'Li a documentação de RLS e percebi como proteger as tabelas.',
  },
  {
    id: 'ideia',
    label: 'Ideia',
    short: 'Ideia',
    icon: Lightbulb,
    prompt: 'Que ideia te ocorreu?',
    placeholder: 'Podia haver notificações quando o professor comenta.',
  },
  {
    id: 'resultado',
    label: 'Resultado',
    short: 'Resultado',
    icon: CheckCircle2,
    prompt: 'O que já funciona ou está entregue?',
    placeholder: 'Testei com 5 colegas — todos conseguiram criar conta.',
  },
  {
    id: 'nota',
    label: 'Nota',
    short: 'Nota',
    icon: StickyNote,
    prompt: 'Alguma coisa que não queiras esquecer.',
    placeholder: 'O professor pediu para acrescentar bibliografia.',
  },
]

export const KIND_BY_ID = Object.fromEntries(JOURNAL_KINDS.map(k => [k.id, k]))

/* ── Secções do relatório ──────────────────────────────────────────────────
   Os ids correspondem exatamente às chaves devolvidas pela edge function
   `generate-report`, para que a cobertura mostrada aqui seja a mesma coisa que
   o relatório vai conter. Cada secção pode ser alimentada por campos do
   projeto (o formulário) OU por entradas do diário. */

export const REPORT_SECTIONS = [
  { id: 'resumo',          label: 'Resumo',         fields: ['goal', 'problem'],                     kinds: [] },
  { id: 'introducao',      label: 'Introdução',     fields: ['goal', 'target_audience'],             kinds: [] },
  { id: 'problema',        label: 'Problema',       fields: ['problem'],                             kinds: [] },
  { id: 'solucao',         label: 'Solução',        fields: ['solution'],                            kinds: ['decisao'] },
  { id: 'desenvolvimento', label: 'Desenvolvimento',fields: ['features', 'technologies'],            kinds: ['progresso', 'pesquisa'] },
  { id: 'resultados',      label: 'Resultados',     fields: ['results'],                             kinds: ['resultado'] },
  { id: 'reflexao',        label: 'Reflexão',       fields: ['challenges', 'learnings'],             kinds: ['dificuldade', 'ideia'] },
  { id: 'conclusao',       label: 'Conclusão',      fields: ['learnings', 'results'],                kinds: ['resultado'] },
]

const MIN_FIELD_CHARS = 40

function fieldHasContent(project, key) {
  const v = project?.[key]
  return typeof v === 'string' && v.trim().length >= MIN_FIELD_CHARS
}

/**
 * Quanto do relatório já tem matéria — a partir dos campos do projeto e das
 * entradas do diário. Devolve também o que falta, para podermos dizer ao aluno
 * exatamente qual é o próximo passo em vez de lhe mostrar só uma percentagem.
 */
export function computeReportCoverage(project, entries = []) {
  const kindsPresent = new Set(entries.map(e => e.kind))

  const sections = REPORT_SECTIONS.map(section => {
    const fromForm    = section.fields.some(f => fieldHasContent(project, f))
    const fromJournal = section.kinds.some(k => kindsPresent.has(k))
    return { ...section, covered: fromForm || fromJournal, fromForm, fromJournal }
  })

  const covered = sections.filter(s => s.covered).length
  return {
    sections,
    covered,
    total: sections.length,
    pct: Math.round((covered / sections.length) * 100),
    missing: sections.filter(s => !s.covered),
  }
}

/**
 * O tipo de entrada que mais desbloqueia agora: o primeiro tipo do diário que
 * cobre uma secção ainda vazia. É isto que transforma o diário num ciclo — o
 * aluno volta e a plataforma já sabe o que lhe pedir a seguir.
 */
export function suggestNextKind(coverage) {
  for (const section of coverage.missing) {
    const kind = section.kinds[0]
    if (kind) return { kind: KIND_BY_ID[kind], section }
  }
  return null
}

/* ── Ritmo ─────────────────────────────────────────────────────────────── */

export function startOfDay(d) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

export function daysBetween(a, b) {
  return Math.round((startOfDay(a) - startOfDay(b)) / 86400000)
}

/**
 * Semanas consecutivas (a contar desta) com pelo menos uma entrada. Mede
 * constância sem castigar quem não escreve todos os dias — uma PAP faz-se ao
 * longo de meses, não em sessões diárias.
 */
export function computeWeekStreak(entries = []) {
  if (!entries.length) return 0
  const weekKey = d => {
    const x = startOfDay(d)
    x.setDate(x.getDate() - ((x.getDay() + 6) % 7)) // segunda-feira
    return x.getTime()
  }
  const weeks = new Set(entries.map(e => weekKey(new Date(e.created_at))))
  const thisWeek = weekKey(new Date())
  const WEEK = 7 * 86400000

  let streak = 0
  let cursor = weeks.has(thisWeek) ? thisWeek : thisWeek - WEEK
  while (weeks.has(cursor)) {
    streak++
    cursor -= WEEK
  }
  return streak
}

/** Buckets semanais de atividade, do mais antigo para o mais recente. */
export function buildWeeklyActivity({ entries = [], completions = [], weeks = 12 }) {
  const monday = d => {
    const x = startOfDay(d)
    x.setDate(x.getDate() - ((x.getDay() + 6) % 7))
    return x
  }
  const thisMonday = monday(new Date())

  const buckets = []
  for (let i = weeks - 1; i >= 0; i--) {
    const start = new Date(thisMonday)
    start.setDate(start.getDate() - i * 7)
    const end = new Date(start)
    end.setDate(end.getDate() + 7)
    buckets.push({
      start,
      end,
      label: start.toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' }).replace('.', ''),
      entries: 0,
      tasks: 0,
    })
  }

  const put = (ts, key) => {
    const d = new Date(ts)
    const b = buckets.find(b => d >= b.start && d < b.end)
    if (b) b[key]++
  }
  entries.forEach(e => put(e.created_at, 'entries'))
  completions.forEach(c => put(c.completed_at, 'tasks'))

  return buckets
}

/* ── Sinal de engagement do diário ────────────────────────────────────── */

/**
 * Analisa as entradas do diário e devolve um sinal 0-100 que estima se o
 * aluno usa o diário de forma genuína (variado, espalhado, com conteúdo real)
 * ou mecânica (tudo num dia, um só tipo, textos curtíssimos).
 *
 * Os quatro eixos têm pesos diferentes: a distribuição temporal é o sinal
 * mais difícil de falsificar, por isso pesa mais.
 */
export function computeEngagementSignal(entries = []) {
  if (!entries.length) return 0

  // Eixo 1 — distribuição temporal (max 35)
  // Todas as entradas num único dia = 0; 4+ dias distintos = 35.
  const days = new Set(entries.map(e => e.created_at.slice(0, 10)))
  const dayScore = Math.min(35, (days.size - 1) * 10)

  // Eixo 2 — variedade de tipos (max 25)
  // 1 tipo = 8, 2 = 16, 3+ = 25.
  const kinds = new Set(entries.map(e => e.kind))
  const kindScore = Math.min(25, kinds.size * 9)

  // Eixo 3 — volume consistente (max 30)
  // Cada entrada conta 5pts; mais de 6 num único dia deixa de pontuar.
  // Penaliza "rafadas" de registos feitos todos ao mesmo tempo.
  const byDay = {}
  entries.forEach(e => {
    const d = e.created_at.slice(0, 10)
    byDay[d] = (byDay[d] || 0) + 1
  })
  const countableEntries = Object.values(byDay).reduce((sum, n) => sum + Math.min(n, 3), 0)
  const countScore = Math.min(30, countableEntries * 6)

  // Eixo 4 — qualidade do conteúdo (max 10)
  // Média de caracteres por entrada: <40 = 0, 40-100 = 5, >100 = 10.
  const avgLen = entries.reduce((s, e) => s + (e.content || '').length, 0) / entries.length
  const lenScore = avgLen >= 100 ? 10 : avgLen >= 40 ? 5 : 0

  return Math.min(100, Math.round(dayScore + kindScore + countScore + lenScore))
}

/** Monday ISO string (YYYY-MM-DD) for the week that contains `date`. */
export function weekStartISO(date = new Date()) {
  const d = new Date(date)
  const offset = (d.getDay() + 6) % 7  // Mon=0
  d.setDate(d.getDate() - offset)
  d.setHours(0, 0, 0, 0)
  return d.toISOString().slice(0, 10)
}

/* ── Etiquetas de tempo ────────────────────────────────────────────────── */

export function timeAgoLabel(ts) {
  if (!ts) return ''
  const diff = (Date.now() - new Date(ts)) / 1000
  if (diff < 60) return 'agora mesmo'
  if (diff < 3600) return `há ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `há ${Math.floor(diff / 3600)}h`
  const days = Math.floor(diff / 86400)
  if (days === 1) return 'ontem'
  if (days < 7) return `há ${days} dias`
  if (days < 30) return `há ${Math.floor(days / 7)} semana${days >= 14 ? 's' : ''}`
  return new Date(ts).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' })
}
