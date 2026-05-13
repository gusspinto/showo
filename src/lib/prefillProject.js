import { supabase } from './supabase'

export async function prefillProject(text, projectType) {
  try {
    const { data, error } = await supabase.functions.invoke('prefill-project', {
      body: { text, projectType },
    })
    if (error) return {}
    return data?.prefill ?? {}
  } catch {
    return {}
  }
}
