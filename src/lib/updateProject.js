import { supabase } from './supabase'
import { calculateScore } from './score'

// editToken must be provided for anonymous projects; omit for authenticated owners.
export async function updateProject(id, formData, editToken = null) {
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
    tags: formData.tags || [],
    visibility: formData.visibility || 'public',
    score,
  }

  if (editToken) {
    const { data, error } = await supabase.rpc('update_anon_project', {
      p_id: id,
      p_token: editToken,
      p_data: payload,
    })
    if (error) throw error
    return data
  }

  const { data, error } = await supabase
    .from('projects')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error

  // No publish, a IA relê o projeto e propõe competências/tecnologias.
  // Fica em ai_skill_suggestions à espera de o aluno confirmar. Fire-and-forget.
  if ((payload.visibility || 'public') === 'public') {
    supabase.functions.invoke('extract-skills', { body: { projectId: id } }).catch(() => {})
  }

  return data
}
