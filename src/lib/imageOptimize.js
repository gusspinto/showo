// Converte imagens para WebP no browser antes do upload para o Supabase
// Storage, para reduzir peso sem precisar de pipeline no servidor.
const MAX_DIMENSION = 2000 // não faz sentido guardar mais do que isto para capas/avatares
const QUALITY = 0.85

export async function toWebP(file, { maxDimension = MAX_DIMENSION, quality = QUALITY } = {}) {
  if (!file?.type?.startsWith('image/')) return file
  // SVG é vetorial, converter para WebP só perderia qualidade e escalabilidade.
  if (file.type === 'image/svg+xml') return file
  // GIF animado perderia a animação ao passar por canvas — mantém como está.
  if (file.type === 'image/gif') return file

  const bitmap = await createImageBitmap(file).catch(() => null)
  if (!bitmap) return file // formato que o browser não sabe decodificar — segue o ficheiro original

  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  canvas.getContext('2d').drawImage(bitmap, 0, 0, width, height)
  bitmap.close?.()

  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', quality))
  if (!blob) return file // browser sem suporte a encoder WebP — segue o ficheiro original

  const newName = file.name.replace(/\.[^.]+$/, '') + '.webp'
  return new File([blob], newName, { type: 'image/webp' })
}
