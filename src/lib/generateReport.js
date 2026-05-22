import { supabase } from './supabase'

const TIMEOUT_MS = 55_000

export async function generateReport(project, type = 'pap') {
  let timeoutId

  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(
      () => reject(new Error('A geração demorou demasiado. Tenta novamente.')),
      TIMEOUT_MS,
    )
  })

  const invokePromise = supabase.functions
    .invoke('generate-report', { body: { project, type } })
    .then(({ data, error }) => {
      if (error) throw error
      if (!data) throw new Error('Sem resposta da IA.')
      return data
    })

  try {
    return await Promise.race([invokePromise, timeoutPromise])
  } finally {
    clearTimeout(timeoutId)
  }
}
