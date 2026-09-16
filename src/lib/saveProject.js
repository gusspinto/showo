import { supabase } from './supabase'
import { calculateScore } from './score'
import { hasPlaceholder } from './textQuality'

// Campos de texto que a IA escreve (no /novo ou na entrevista) e que podem
// ficar com o modelo por preencher — "[período]", "[X]%" — sem que o dono
// tenha reparado. Nunca gravamos isso: o campo fica vazio em vez de ir
// para uma página pública com parênteses, e o dono é avisado a seguir.
const TEXT_FIELDS = ['goal', 'problem', 'solution', 'target_audience', 'features', 'technologies', 'challenges', 'results', 'learnings']

function generateToken() {
  return crypto.randomUUID().replace(/-/g, '')
}

function generateSlug(name) {
  const suffix = crypto.randomUUID().split('-')[0]
  return (
    name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') +
    '-' +
    suffix
  )
}

export async function saveProject(formData, aiResult, userId, opts = {}) {
  if (!userId) throw new Error('saveProject requires an authenticated userId')
  const slug = generateSlug(formData.name)
  const isPap = formData.is_pap || formData.project_type === 'pap'
  const edit_token = generateToken()

  const clearedFields = []
  const cleaned = { ...formData }
  for (const key of TEXT_FIELDS) {
    if (hasPlaceholder(cleaned[key])) {
      clearedFields.push(key)
      cleaned[key] = ''
    }
  }

  const { score } = calculateScore(cleaned)

  const payload = {
    user_id: userId,
    // Definido já no insert (não num update a seguir) para o trigger de
    // limite de projetos ver que é um anexo e não o contar.
    parent_project_id: opts.parentProjectId || null,
    name: formData.name,
    area: formData.area,
    goal: cleaned.goal,
    problem: cleaned.problem,
    solution: cleaned.solution,
    target_audience: cleaned.target_audience,
    features: cleaned.features,
    technologies: cleaned.technologies,
    challenges: cleaned.challenges,
    results: cleaned.results,
    learnings: cleaned.learnings,
    cover_url: formData.cover_url || null,
    linkedin_url: formData.linkedin_url || null,
    github_url: formData.github_url || null,
    portfolio_url: formData.portfolio_url || null,
    slug,
    edit_token,
    ai_tagline: aiResult.tagline ?? null,
    ai_description: Array.isArray(aiResult.historia)
      ? aiResult.historia.join('\n\n')
      : (aiResult.description ?? null),
    ai_highlights: aiResult.highlights ?? null,
    school_year: formData.school_year || null,
    course: formData.course || null,
    school: formData.school || null,
    creator_name: formData.creator_name || null,
    is_pap: isPap || false,
    pap_supervisor: formData.pap_supervisor || null,
    pap_date: formData.pap_date || null,
    project_type: formData.project_type || null,
    tags: formData.tags || [],
    score,
  }

  let { data, error } = await supabase.from('projects').insert([payload]).select().single()

  if (error) {
    if (error.code === '23505') {
      const retryPayload = { ...payload, slug: generateSlug(formData.name), edit_token: generateToken() }
      const { data: retryData, error: retryError } = await supabase
        .from('projects')
        .insert([retryPayload])
        .select()
        .single()
      if (retryError) throw retryError
      data = retryData
    } else {
      throw error
    }
  }

  // IA lê o projeto e propõe competências/tecnologias para o aluno confirmar.
  if (data?.id) {
    supabase.functions.invoke('extract-skills', { body: { projectId: data.id } }).catch(() => {})
  }

  // Não persistido — só para o ecrã seguinte poder avisar "limpámos X, Y"
  // sem ter de repetir a verificação de placeholder.
  return { ...data, _clearedFields: clearedFields }
}
