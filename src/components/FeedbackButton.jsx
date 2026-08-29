import { useState, useRef, useEffect } from 'react'
import { X, Send, Image, Loader2, Check } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

/* ══════════════════════════════════════════════════════════════════════════
   Já não tem botão flutuante próprio — vivia por cima do conteúdo em todos
   os ecrãs, e passou a ser uma entrada normal na sidebar/drawer (ícone de
   bug), como o resto da navegação. Este componente é agora só a folha/modal,
   controlada de fora: quem o monta decide quando abre e fecha.
   ══════════════════════════════════════════════════════════════════════════ */
export default function FeedbackButton({ open, onClose }) {
  const { user } = useAuth()
  const [message, setMessage] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [status, setStatus] = useState('idle') // idle | sending | done | error
  const fileRef = useRef(null)

  function handleImageChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  function removeImage() {
    setImageFile(null)
    setImagePreview(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  // Limpa o formulário sempre que a folha abre, para não mostrar o rascunho
  // ou o "Obrigado!" da vez anterior.
  useEffect(() => {
    if (!open) return
    setStatus('idle')
    setMessage('')
    removeImage()
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmit(e) {
    e.preventDefault()
    if (!message.trim() || status === 'sending') return
    setStatus('sending')

    try {
      let image_url = null

      if (imageFile) {
        const ext = imageFile.name.split('.').pop()
        const path = `${Date.now()}.${ext}`
        const { error: upErr } = await supabase.storage
          .from('feedback-images')
          .upload(path, imageFile, { upsert: false })
        if (!upErr) {
          const { data } = supabase.storage.from('feedback-images').getPublicUrl(path)
          image_url = data.publicUrl
        }
      }

      const { error } = await supabase.from('feedback').insert({
        message: message.trim(),
        page_url: window.location.pathname,
        image_url,
        user_id: user?.id ?? null,
      })

      if (error) throw error
      setStatus('done')
      setTimeout(() => onClose(), 1800)
    } catch {
      setStatus('error')
    }
  }

  return (
    <>
      <style>{`
        .fb-overlay {
          position: fixed; inset: 0; z-index: 491;
          background: rgba(0,0,0,0.45);
          backdrop-filter: blur(4px);
          -webkit-backdrop-filter: blur(4px);
          animation: fb-fade-in 0.18s ease both;
        }
        @keyframes fb-fade-in { from { opacity: 0; } to { opacity: 1; } }

        .fb-sheet {
          position: fixed; left: 0; right: 0; bottom: 0; z-index: 492;
          background: var(--color-surface);
          border-top: 1px solid var(--color-border);
          border-radius: 22px 22px 0 0;
          padding: 20px 20px max(24px, env(safe-area-inset-bottom, 24px));
          animation: fb-slide-up 0.28s cubic-bezier(0.22,1,0.36,1) both;
          box-shadow: 0 -8px 40px rgba(0,0,0,0.4);
          max-height: 85vh; overflow-y: auto;
        }
        @keyframes fb-slide-up {
          from { transform: translateY(100%); opacity: 0.8; }
          to   { transform: translateY(0);    opacity: 1; }
        }

        /* Desktop: modal centrado */
        @media (min-width: 601px) {
          .fb-sheet {
            left: 50%; right: auto; bottom: auto; top: 50%;
            transform: translate(-50%, -50%);
            width: 100%; max-width: 440px;
            border-radius: 18px;
            border: 1px solid var(--color-border);
            animation: fb-modal-in 0.22s cubic-bezier(0.22,1,0.36,1) both;
          }
          @keyframes fb-modal-in {
            from { opacity: 0; transform: translate(-50%, calc(-50% + 12px)); }
            to   { opacity: 1; transform: translate(-50%, -50%); }
          }
        }

        @media (max-width: 600px) {
          .fb-sheet { bottom: 0; border-radius: 22px 22px 0 0; }
        }

        .fb-textarea {
          width: 100%; box-sizing: border-box;
          background: var(--color-bg-alt); border: 1.5px solid var(--color-border);
          border-radius: 10px; color: var(--color-text); font-size: 14px;
          font-family: inherit; outline: none; resize: none;
          padding: 12px 14px; line-height: 1.6;
          transition: border-color 0.15s;
        }
        .fb-textarea:focus { border-color: var(--color-primary-subtle); }
        .fb-img-preview {
          position: relative; margin-top: 10px;
          border-radius: 10px; overflow: hidden;
          border: 1px solid var(--color-border);
        }
        .fb-img-preview img { width: 100%; max-height: 180px; object-fit: cover; display: block; }
        .fb-img-remove {
          position: absolute; top: 6px; right: 6px;
          background: rgba(0,0,0,0.55); border: none; border-radius: 50%;
          width: 26px; height: 26px; display: flex; align-items: center; justify-content: center;
          color: #fff; cursor: pointer;
        }
        .fb-submit {
          width: 100%; padding: 13px;
          background: var(--color-primary); border: none; border-radius: 10px;
          color: #fff; font-size: 14px; font-weight: 700;
          font-family: inherit; cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 7px;
          transition: opacity 0.15s;
          margin-top: 14px;
        }
        .fb-submit:disabled { opacity: 0.5; cursor: default; }
        .fb-submit:not(:disabled):hover { opacity: 0.88; }
        .fb-add-img {
          display: flex; align-items: center; gap: 7px;
          background: transparent; border: 1.5px dashed var(--color-border);
          border-radius: 10px; padding: 10px 14px;
          color: var(--color-text-secondary); font-size: 13px; font-weight: 600;
          font-family: inherit; cursor: pointer; width: 100%;
          margin-top: 10px; transition: border-color 0.15s, color 0.15s;
          box-sizing: border-box;
        }
        .fb-add-img:hover { border-color: var(--color-primary-subtle); color: var(--color-primary); }
        .fb-add-img svg { flex-shrink: 0; }
      `}</style>

      {/* Modal / Sheet */}
      {open && (
        <>
          <div className="fb-overlay" onClick={onClose} />
          <div className="fb-sheet">
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>
                  Dar feedback anónimo
                </div>
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>
                  O que aconteceu? Qual o erro ou a página?
                </div>
              </div>
              <button
                onClick={onClose}
                className="icon-btn-ghost"
              >
                <X size={18} />
              </button>
            </div>

            {status === 'done' ? (
              <div style={{ textAlign: 'center', padding: '32px 0 16px' }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--color-success-subtle)', border: '1px solid var(--color-success-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                  <Check size={22} color="var(--color-success)" />
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text)' }}>Obrigado!</div>
                <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 4 }}>O teu feedback foi guardado.</div>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <textarea
                  className="fb-textarea"
                  rows={4}
                  placeholder="Ex: O botão de guardar não funciona na página do projeto, ou a app ficou lenta ao carregar..."
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  autoFocus
                />

                {/* Image preview */}
                {imagePreview && (
                  <div className="fb-img-preview">
                    <img src={imagePreview} alt="Preview" />
                    <button type="button" className="fb-img-remove" onClick={removeImage}>
                      <X size={12} />
                    </button>
                  </div>
                )}

                {/* Add image button */}
                {!imagePreview && (
                  <button type="button" className="fb-add-img" onClick={() => fileRef.current?.click()}>
                    <Image size={15} />
                    Adicionar imagem (opcional)
                  </button>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleImageChange}
                />

                {status === 'error' && (
                  <p style={{ color: 'var(--color-error)', fontSize: 12, margin: '8px 0 0', fontWeight: 600 }}>
                    Erro ao enviar. Tenta novamente.
                  </p>
                )}

                <button
                  type="submit"
                  className="fb-submit"
                  disabled={!message.trim() || status === 'sending'}
                >
                  {status === 'sending' ? (
                    <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> A enviar...</>
                  ) : (
                    <><Send size={15} /> Enviar feedback</>
                  )}
                </button>
              </form>
            )}
          </div>
        </>
      )}
    </>
  )
}
