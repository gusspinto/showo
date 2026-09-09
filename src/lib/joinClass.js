import { supabase } from './supabase'

// Single source of truth for "entrar numa turma pelo código". Four screens
// used to each call join_class with their own, drifting error handling (one
// still checked for an error code the RPC stopped raising three migrations
// ago). join_class is RETURNS TABLE, so the RPC resolves to an array.
//
// Returns { ok, turma, error }:
//   ok:true  → turma = { id, name, code, teacher_name, verified }
//              verified:false means the row couldn't be confirmed after insert
//   ok:false → error = a ready-to-show Portuguese string
export async function joinClassByCode(rawCode) {
  const code = (rawCode || '').trim().toUpperCase()
  if (!code) return { ok: false, error: 'Escreve o código da turma.' }

  const { data: rows, error } = await supabase.rpc('join_class', { p_code: code })
  const turma = Array.isArray(rows) ? rows[0] : rows

  if (error || !turma) {
    const m = (error?.message || '').toLowerCase()
    if (m.includes('school_mismatch'))
      return { ok: false, error: 'Esta turma é de outra escola. Só podes entrar em turmas da tua escola.' }
    if (m.includes('not authenticated'))
      return { ok: false, error: 'Precisas de ter sessão iniciada para entrar numa turma.' }
    if (m && !m.includes('class_not_found'))
      return { ok: false, error: 'Não foi possível entrar na turma. Tenta de novo.' }
    return { ok: false, error: 'Código inválido. Verifica com o teu professor.' }
  }

  return { ok: true, turma }
}
