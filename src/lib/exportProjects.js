import { createClient } from '@supabase/supabase-js'
import { supabaseUrl, supabaseAnonKey, supabase } from './supabase'

// Verify that (email, password) belong to a real destination account
// without disrupting the current session — works whether the destination
// is a school account, a personal account, or anything else. Uses a
// separate supabase client with its own in-memory storage so no session
// cookies are touched.
export async function verifyDestinationAccount(email, password) {
  const tempClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storageKey: 'showo_export_verify_temp',
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })

  const { data, error } = await tempClient.auth.signInWithPassword({ email, password })
  if (error || !data?.user) {
    return { error: 'Email ou palavra-passe incorretos.' }
  }

  const userId = data.user.id
  await tempClient.auth.signOut()

  return { userId }
}

// Copy selected projects to the verified destination account — works in
// either direction (school → pessoal, pessoal → escola, ou qualquer conta
// para qualquer conta); a única regra é ter de provar acesso ao destino.
// Returns the RPC result object.
export async function exportProjects(projectIds, destUserId) {
  const { data, error } = await supabase.rpc('export_projects', {
    p_project_ids: projectIds,
    p_dest_user_id: destUserId,
  })
  if (error) return { error: error.message }
  return { result: data }
}
