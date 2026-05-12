import { supabase } from './supabase'
import { calculateScore } from './score'

export async function updateProject(id, formData) {
  const { score } = calculateScore(formData)
  const isPap = formData.is_pap || formData.project_type === 'pap'

  const payload = {
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

  const { data, error } = await supabase
    .from('projects')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}
