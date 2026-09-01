import { supabase } from './supabase'

const TIMEOUT_MS = 90_000 // 90 s — Claude can take 40-60s on complex projects

export async function analyzeProject(projectData) {
  let timeoutId

  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(
      () => reject(new Error('A análise demorou demasiado. Tenta novamente.')),
      TIMEOUT_MS,
    )
  })

  const invokePromise = supabase.functions
    .invoke('analyze-project', { body: { data: projectData } })
    .then(({ data, error }) => {
      if (error) throw new Error(error?.message || error?.context?.body || JSON.stringify(error))
      if (!data) throw new Error('Sem resposta da IA. Verifica a tua ligação.')
      if (data.error) throw new Error(data.error)
      return data
    })

  try {
    return await Promise.race([invokePromise, timeoutPromise])
  } finally {
    clearTimeout(timeoutId)
  }
}
