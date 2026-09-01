/* Pista visual por tipo de ficheiro, à Google Drive — substitui a preview
   real quando não há uma (só imagens e PDFs com thumbnail têm preview de
   verdade). Partilhado entre a Biblioteca e o perfil. */
export const FILE_TYPE_STYLE = {
  'application/pdf': { color: '#e05a4e', label: 'PDF' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { color: '#3b6fd6', label: 'DOC' },
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': { color: '#e08a2e', label: 'PPT' },
  'text/plain': { color: '#8a8f98', label: 'TXT' },
  'text/markdown': { color: '#8a8f98', label: 'MD' },
}

export function fileTypeStyle(type) {
  return FILE_TYPE_STYLE[type] || { color: '#8a8f98', label: 'FICHEIRO' }
}
