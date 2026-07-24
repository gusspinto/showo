import { supabase } from './supabase'

export async function chatProjectCoach({ project, messages, message }) {
  const { data, error } = await supabase.functions.invoke('project-coach', {
    body: { project, messages, message },
  })
  if (error) throw error
  if (!data?.reply) throw new Error('Sem resposta. Tenta novamente.')
  return data.reply
}
