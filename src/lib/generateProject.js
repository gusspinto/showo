import { supabase } from './supabase'

export async function generateProject(projectData) {
  const { data, error } = await supabase.functions.invoke('generate-project', {
    body: { data: projectData },
  })

  if (error) throw error
  if (!data) throw new Error('A IA não devolveu resposta. Tenta novamente.')
  return data
}