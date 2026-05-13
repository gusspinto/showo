import { supabase } from './supabase'
import { calculateScore } from './score'

function generateToken() {
  return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10)
}

function generateSlug(name) {
  return (
    name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') +
    '-' +
    Math.random().toString(36).slice(2, 7)
  )
}

export async function saveProject(formData, aiResult, userId = null) {
  const slug = generateSlug(formData.name)
  const isPap = formData.is_pap || formData.project_type === 'pap'
  const { score } = calculateScore(formData)
  const edit_token = generateToken()

  const payload = {
    user_id: userId || null,
    name: formData.name,
    area: formData.area,
    goal: formData.goal,
    problem: formData.problem,
    solution: formData.solution,
    target_audience: formData.target_audience,
    features: formData.features,
    technologies: formData.technologies,
    challenges: formData.challenges,
    results: formData.results,
    learnings: formData.learnings,
    cover_url: formData.cover_url || null,
    linkedin_url: formData.linkedin_url || null,
    github_url: formData.github_url || null,
    portfolio_url: formData.portfolio_url || null,
    slug,
    edit_token,
    ai_tagline: aiResult.tagline ?? null,
    ai_description: aiResult.description ?? null,
    ai_highlights: aiResult.highlights ?? null,
    school_year: formData.school_year || null,
    course: formData.course || null,
    school: formData.school || null,
    creator_name: formData.creator_name || null,
    is_pap: isPap || false,
    pap_supervisor: formData.pap_supervisor || null,
    pap_date: formData.pap_date || null,
    project_type: formData.project_type || null,
    score,
  }

  const { data, error } = await supabase.from('projects').insert([payload]).select().single()

  if (error) {
    if (error.code === '23505') {
      const retryPayload = { ...payload, slug: generateSlug(formData.name) }
      const { data: retryData, error: retryError } = await supabase
        .from('projects')
        .insert([retryPayload])
        .select()
        .single()
      if (retryError) throw retryError
      return retryData
    }
    throw error
  }

  return data
}
