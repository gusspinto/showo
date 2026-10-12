import { supabase } from './supabase'

// Qualquer tipo de ficheiro é aceite (pedido explícito — não é só para
// projetos técnicos). A única exclusão é de executáveis, por segurança:
// isto é um bucket público, não queremos servir malware com o nosso domínio.
const BLOCKED_EXTENSIONS = ['exe', 'bat', 'cmd', 'sh', 'msi', 'dmg', 'apk', 'app', 'scr', 'com', 'jar']

function sanitizeFileName(name) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, '-')
}

export function isBlockedFile(file) {
  const ext = file.name.split('.').pop()?.toLowerCase()
  return BLOCKED_EXTENSIONS.includes(ext)
}

export async function listProjectFiles(projectId) {
  const { data, error } = await supabase
    .from('project_files')
    .select('id, file_url, file_name, file_type, size_bytes, visible, created_at')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function toggleFileVisibility(fileId, visible) {
  const { error } = await supabase.from('project_files').update({ visible }).eq('id', fileId)
  if (error) throw error
}

/** Soma em bytes de todos os ficheiros do utilizador (para a barra de quota da conta). */
export async function getAccountFilesUsage(userId) {
  const { data, error } = await supabase
    .from('project_files')
    .select('size_bytes')
    .eq('user_id', userId)
  if (error) throw error
  return (data || []).reduce((sum, r) => sum + (r.size_bytes || 0), 0)
}

/** Faz upload e regista na BD. O trigger do lado do servidor é quem decide mesmo
    se cabe na quota — isto só dá feedback amigável se rejeitar. */
export async function uploadProjectFile(project, userId, file) {
  if (isBlockedFile(file)) throw new Error('Este tipo de ficheiro não é permitido, por segurança.')

  const path = `${project.id}/${Date.now()}-${sanitizeFileName(file.name)}`
  const { error: upErr } = await supabase.storage.from('project-files').upload(path, file)
  if (upErr) throw new Error('Não foi possível enviar o ficheiro.')

  const { data: { publicUrl } } = supabase.storage.from('project-files').getPublicUrl(path)

  const { data, error } = await supabase
    .from('project_files')
    .insert({
      project_id: project.id,
      user_id: userId,
      file_url: publicUrl,
      file_name: file.name,
      file_type: file.type || null,
      size_bytes: file.size,
    })
    .select('id, file_url, file_name, file_type, size_bytes, visible, created_at')
    .single()

  if (error) {
    await supabase.storage.from('project-files').remove([path])
    if (error.message?.includes('project_files_project_limit_exceeded')) {
      throw new Error('Este projeto já atingiu o limite de espaço do teu plano.')
    }
    if (error.message?.includes('project_files_account_limit_exceeded')) {
      throw new Error('A tua conta já atingiu o limite total de espaço do teu plano.')
    }
    if (error.message?.includes('project_files_requires_paid_plan')) {
      throw new Error('Ficheiros do projeto é uma funcionalidade paga.')
    }
    throw new Error('Não foi possível guardar o ficheiro.')
  }

  return data
}

export async function deleteProjectFile(fileId, fileUrl) {
  const path = fileUrl.split('/project-files/')[1]
  if (path) await supabase.storage.from('project-files').remove([path])
  const { error } = await supabase.from('project_files').delete().eq('id', fileId)
  if (error) throw error
}

export function formatFileSize(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}
