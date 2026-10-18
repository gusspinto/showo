import { supabase } from './supabase'

export async function chatGlobalCoach({ messages, message }) {
  const { data, error } = await supabase.functions.invoke('global-coach', {
    body: { messages, message },
  })
  if (error) throw error
  if (!data?.reply) throw new Error('Sem resposta. Tenta novamente.')
  return data.reply
}
