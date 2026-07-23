import { supabase } from '../lib/supabase'

export async function claimAnonymousProjects(userId) {
  if (!userId) return []

  const tokens = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith('edit_token_')) {
      const slug = key.replace('edit_token_', '')
      const token = localStorage.getItem(key)
      if (slug && token) tokens.push({ slug, token, key })
    }
  }

  if (!tokens.length) return []

  const claimed = []
  for (const { slug, token, key } of tokens) {
    const { data, error } = await supabase
      .from('projects')
      .update({ user_id: userId })
      .eq('slug', slug)
      .eq('edit_token', token)
      .is('user_id', null)
      .select('slug')

    if (!error && data?.length) {
      claimed.push(slug)
      localStorage.removeItem(key)
    }
  }

  return claimed
}
