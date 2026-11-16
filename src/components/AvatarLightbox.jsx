import { useRef, useState, useEffect, useId } from 'react'
import { createPortal } from 'react-dom'
import { CloseIcon as X } from '@solar-icons/react/bold/close'
import { CameraIcon as Camera } from '@solar-icons/react/bold/camera'
import { TrashBin2Icon as Trash } from '@solar-icons/react/bold/trash-bin-2'
import { supabase } from '../lib/supabase'
import { CropModal } from './CropModal'

// AvatarLightbox — clicar na própria foto (perfil pessoal ou logo de
// empresa) amplia-a centrada no ecrã, com "Mudar de foto"/"Remover foto"
// para quem é dono. Visitantes só veem a foto ampliada, sem esses botões.
// Reaproveita o mesmo upload (bucket "avatars", coluna profiles.avatar_url)
// que já existia em Settings.jsx, só com outro ponto de entrada.
//
// Props:
//   userId     id do dono da foto (path do storage e linha a atualizar)
//   imageUrl   avatar_url atual, ou null/'' se ainda não há foto
//   name       usado para a inicial de fallback quando não há foto
//   bg         cor de fundo do fallback
//   shape      'circle' (perfil pessoal) ou 'square' (logo de empresa)
//   isOwner    mostra os botões de editar só quando true
//   onUploaded(url)  chamado com o novo avatar_url depois de guardar
//   onRemoved()      chamado depois de remover a foto
//   onClose()        fecha o lightbox
export function AvatarLightbox({ userId, imageUrl, name, bg, fallbackColor = '#fff', shape = 'circle', isOwner, onUploaded, onRemoved, onClose }) {
  const fileRef = useRef(null)
  const closeBtnRef = useRef(null)
  const titleId = useId()
  const [cropFile, setCropFile] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    closeBtnRef.current?.focus()
    const onKeyDown = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { setError('A imagem não pode ter mais de 10 MB.'); return }
    setCropFile(file)
    if (e.target) e.target.value = ''
  }

  async function handleCropConfirm(blob) {
    setCropFile(null)
    setBusy(true); setError('')
    const path = `${userId}/avatar.webp`
    const { error: upErr } = await supabase.storage.from('avatars').upload(path, blob, { upsert: true, contentType: 'image/webp' })
    if (upErr) { setError('Erro ao carregar imagem.'); setBusy(false); return }
    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
    const bustedUrl = `${publicUrl}?t=${Date.now()}`
    await supabase.from('profiles').update({ avatar_url: bustedUrl }).eq('id', userId)
    setBusy(false)
    onUploaded(bustedUrl)
  }

  async function handleRemove() {
    setBusy(true); setError('')
    await supabase.from('profiles').update({ avatar_url: null }).eq('id', userId)
    setBusy(false)
    onRemoved()
  }

  const radius = shape === 'circle' ? '50%' : 'var(--radius-lg)'

  return createPortal(
    <div
      role="dialog" aria-modal="true" aria-labelledby={titleId}
      style={{ position: 'fixed', inset: 0, zIndex: 9900, background: 'rgba(0,0,0,0.82)',
               display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
               gap: 20, padding: 24 }}
      onClick={onClose}
    >
      <span id={titleId} style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)' }}>
        {name ? `Foto de ${name}` : 'Foto de perfil'}
      </span>
      <button ref={closeBtnRef} type="button" onClick={onClose} aria-label="Fechar"
        style={{ position: 'absolute', top: 16, right: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                 width: 38, height: 38, borderRadius: 'var(--radius-md)', border: '1px solid rgba(255,255,255,0.18)',
                 background: 'rgba(255,255,255,0.08)', color: '#fff', cursor: 'pointer' }}>
        <X size={17} />
      </button>

      <div style={{ width: 'min(280px, 70vw)', height: 'min(280px, 70vw)', borderRadius: radius, overflow: 'hidden',
                    flexShrink: 0, boxShadow: '0 24px 70px rgba(0,0,0,0.55)' }}
        onClick={e => e.stopPropagation()}>
        {imageUrl ? (
          <img src={imageUrl} alt={name || 'Foto'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', background: bg || 'var(--color-surface-hover)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 72, fontWeight: 400, fontFamily: 'var(--font-heading)', color: fallbackColor }}>
            {(name || '?')[0].toUpperCase()}
          </div>
        )}
      </div>

      {isOwner && (
        <div onClick={e => e.stopPropagation()} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" onClick={() => fileRef.current?.click()} disabled={busy}
              style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#fff', border: 'none',
                       borderRadius: 'var(--radius-md)', padding: '10px 18px', color: '#000', fontSize: 13, fontWeight: 700,
                       cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1, fontFamily: 'inherit' }}>
              <Camera size={14} /> {busy ? 'A guardar…' : 'Mudar de foto'}
            </button>
            {imageUrl && (
              <button type="button" onClick={handleRemove} disabled={busy}
                style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'rgba(255,255,255,0.08)',
                         border: '1px solid rgba(255,255,255,0.18)', borderRadius: 'var(--radius-md)', padding: '10px 18px',
                         color: '#fff', fontSize: 13, fontWeight: 600, cursor: busy ? 'default' : 'pointer',
                         opacity: busy ? 0.6 : 1, fontFamily: 'inherit' }}>
                <Trash size={14} /> Remover foto
              </button>
            )}
          </div>
          {error && <p style={{ margin: 0, fontSize: 12, color: 'var(--color-error)' }}>{error}</p>}
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={handleFileChange} />
        </div>
      )}

      {cropFile && (
        <CropModal
          file={cropFile}
          circular={shape === 'circle'}
          aspectRatio={shape === 'square' ? 1 : undefined}
          onConfirm={handleCropConfirm}
          onCancel={() => setCropFile(null)}
        />
      )}
    </div>,
    document.body
  )
}

export default AvatarLightbox
