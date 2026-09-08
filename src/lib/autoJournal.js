import { supabase } from './supabase'

/* ══════════════════════════════════════════════════════════════════════════
   REGISTO AUTOMÁTICO NO DIÁRIO
   ──────────────────────────────────────────────────────────────────────────
   No Strava o registo é automático — o GPS regista a corrida por ti. Na
   Showo o equivalente é o diário, mas exige escrever à mão, e é por isso
   que estava praticamente vazio. Isto fecha essa lacuna: a app regista
   sozinha o que a pessoa já faz, sem lhe pedir esforço nenhum.

   Duas regras que mantêm isto útil em vez de ruidoso:

   1. Só regista TRANSIÇÕES reais — uma secção que passa de vazia/fraca a
      preenchida. Guardar o mesmo campo dez vezes seguidas não gera dez
      entradas.
   2. Nunca se faz passar por texto do aluno. Vai com kind='auto' e em
      linguagem neutra, porque o generate-report escreve o relatório de PAP
      na primeira pessoa a partir do diário — uma frase do sistema disfarçada
      de reflexão do próprio acabaria no relatório dele como se fosse dele.
   ══════════════════════════════════════════════════════════════════════════ */

const FIELD_LABELS = {
  problem: 'o problema que o projeto resolve',
  solution: 'a solução desenvolvida',
  target_audience: 'o público-alvo',
  features: 'as funcionalidades',
  technologies: 'as tecnologias usadas',
  challenges: 'os desafios encontrados',
  results: 'os resultados obtidos',
  learnings: 'as aprendizagens',
  goal: 'o objetivo do projeto',
  cover_url: 'a capa do projeto',
}

/** Considera-se preenchido a partir daqui — evita registar "a" ou "asd". */
const MIN_LEN = 60

export function isMeaningfulField(field) {
  return Object.prototype.hasOwnProperty.call(FIELD_LABELS, field)
}

/**
 * Regista no diário que uma secção passou a estar preenchida.
 * Silencioso por design: se falhar, o utilizador não perde nada do que fez.
 *
 * @param {Object} opts
 * @param {string} opts.projectId
 * @param {string} opts.userId
 * @param {string} opts.field      chave do campo (ex: 'results')
 * @param {string} opts.before     valor anterior
 * @param {string} opts.after      valor novo
 */
export async function logFieldFilled({ projectId, userId, field, before, after }) {
  if (!projectId || !userId || !isMeaningfulField(field)) return

  const prev = String(before ?? '').trim()
  const next = String(after ?? '').trim()

  // Capa é um link: basta passar a existir. Os restantes exigem texto real.
  const wasEmpty = field === 'cover_url' ? !prev : prev.length < MIN_LEN
  const isFilled = field === 'cover_url' ? !!next : next.length >= MIN_LEN
  if (!wasEmpty || !isFilled) return

  const content = field === 'cover_url'
    ? 'Capa do projeto adicionada.'
    : `Secção preenchida: ${FIELD_LABELS[field]}.`

  try {
    // Não repete a mesma entrada automática no mesmo dia — se a pessoa
    // reescrever o campo várias vezes, continua a ser um só acontecimento.
    const since = new Date(); since.setHours(0, 0, 0, 0)
    const { data: existing } = await supabase
      .from('project_journal_entries')
      .select('id')
      .eq('project_id', projectId)
      .eq('kind', 'auto')
      .eq('content', content)
      .gte('created_at', since.toISOString())
      .limit(1)

    if (existing?.length) return

    await supabase.from('project_journal_entries').insert({
      project_id: projectId,
      user_id: userId,
      kind: 'auto',
      content,
    })
  } catch {
    /* registo automático nunca deve estragar um save do utilizador */
  }
}

/** Versão para vários campos de uma vez (ex: o editor completo). */
export async function logFieldsFilled({ projectId, userId, before = {}, after = {} }) {
  const fields = Object.keys(FIELD_LABELS).filter(f => before[f] !== after[f])
  for (const field of fields) {
    await logFieldFilled({ projectId, userId, field, before: before[field], after: after[field] })
  }
}
