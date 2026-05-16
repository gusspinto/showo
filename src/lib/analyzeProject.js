import { supabase } from './supabase'

export async function analyzeProject(projectData) {
  const { data, error } = await supabase.functions.invoke('analyze-project', {
    body: { data: projectData },
  })
  if (error) throw error
  return data
}
