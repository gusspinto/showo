import { supabase } from './supabase'

export async function chatGlobalCoach({ messages, message, profile }) {
  const { data, error } = await supabase.functions.invoke('global-coach', {
    body: {
      messages,
      message,
      profile: profile ? { occupation: profile.occupation, organization_id: profile.organization_id } : undefined,
    },
  })
  if (error) throw error
  if (!data?.reply) throw new Error('Sem resposta. Tenta novamente.')
  return data.reply
}
