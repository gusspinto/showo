import { useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CloseIcon as X } from '@solar-icons/react/bold/close'
import { PlaneIcon as Send } from '@solar-icons/react/bold/plane'
import { GalleryWideIcon as Image } from '@solar-icons/react/bold/gallery-wide'
import { RefreshCircleIcon as Loader2 } from '@solar-icons/react/bold/refresh-circle'
import { BugIcon as Bug } from '@solar-icons/react/bold/bug'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Navbar } from '../components/Navbar'
import './Feedback.css'

/* ══════════════════════════════════════════════════════════════════════════
   FEEDBACK — página, não folha nem modal
   ──────────────────────────────────────────────────────────────────────────
   Era um botão flutuante que abria uma folha por cima do conteúdo. No
   telemóvel isso e o teclado nunca se davam bem: campo escondido, o layout
   a saltar assim que o teclado abria — um `position: fixed` a subir do fundo
   é exactamente o padrão que mais sofre com isso. Uma página normal segue o
   fluxo do documento, e o teclado empurra-a sem drama.

   Duas coisas que a folha tinha de borla e a página tem de resolver
   explicitamente:
     · De onde veio — a folha sabia sempre (window.location.pathname no
       momento do envio). Aqui a origem chega por ?from=, e é isso que fica
       gravado como page_url — a página onde o problema foi visto, não
       "/feedback", que não diz nada a quem for ler o feedback depois.
     · Sair sem enviar — "Cancelar" volta para a origem, não só um "X".
   ══════════════════════════════════════════════════════════════════════════ */

export default function Feedback() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user, profile } = useAuth()
  const firstName = profile?.full_name?.trim().split(/\s+/)[0] || null

  const rawFrom = searchParams.get('from')
  const fromPath = rawFrom && rawFrom.startsWith('/') && !rawFrom.startsWith('//') ? rawFrom : null

  const [message, setMessage] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [status, setStatus] = useState('idle') // idle | sending | launching | done | error
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

  function goBack() {
    navigate(fromPath ?? -1)
  }

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
        page_url: fromPath ?? '/feedback',
        image_url,
        user_id: user?.id ?? null,
      })

      if (error) throw error
      // Pequeno easter egg: o avião "voa" antes de aparecer o agradecimento
      // — só quem envia feedback vê isto.
      setStatus('launching')
      setTimeout(() => setStatus('done'), 820)
    } catch {
      setStatus('error')
    }
  }

  return (
    <div className="fbp-page">
      <Navbar />
      <div className="fbp-wrap">
        {status === 'done' ? (
          <div className="fbp-done">
            <div className="fbp-done-bug" aria-hidden="true">
              <span className="fbp-done-bug-burst" />
              <Bug size={26} className="fbp-done-bug-icon" />
            </div>
            <h1 className="fbp-done-title">Obrigado pelo feedback{firstName ? `, ${firstName}` : ''}!</h1>
            <p className="fbp-done-sub">Mais um bug esmagado. A tua ajuda fica registada.</p>
            <button className="fbp-submit" onClick={goBack}>Voltar</button>
          </div>
        ) : (
          <>
            <div className="fbp-head">
              <h1 className="fbp-title">Reportar um problema</h1>
              <p className="fbp-sub">O que aconteceu? Qual o erro ou a página?</p>
            </div>

            <form onSubmit={handleSubmit} className="fbp-form">
              <textarea
                className="fbp-textarea"
                rows={6}
                placeholder="Ex: O botão de guardar não funciona na página do projeto, ou a app ficou lenta ao carregar..."
                value={message}
                onChange={e => setMessage(e.target.value)}
                autoFocus
              />

              {imagePreview && (
                <div className="fbp-img-preview">
                  <img src={imagePreview} alt="Pré-visualização" />
                  <button type="button" className="fbp-img-remove" onClick={removeImage}>
                    <X size={12} />
                  </button>
                </div>
              )}

              {!imagePreview && (
                <button type="button" className="fbp-add-img" onClick={() => fileRef.current?.click()}>
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
                <p className="fbp-error">Erro ao enviar. Tenta novamente.</p>
              )}

              <div className="fbp-actions">
                <button type="button" className="fbp-cancel" onClick={goBack}>Cancelar</button>
                <button
                  type="submit"
                  className={`fbp-submit${status === 'launching' ? ' fbp-submit--launch' : ''}`}
                  disabled={!message.trim() || status === 'sending' || status === 'launching'}
                >
                  {status === 'sending' ? (
                    <><Loader2 size={16} className="fbp-spin" /> A enviar…</>
                  ) : status === 'launching' ? (
                    <>
                      <span className="fbp-plane-fly" aria-hidden="true">
                        <svg viewBox="0 0 24 24" width="16" height="16">
                          <path d="M2 11 21 3 15 21 11 13 2 11Z" fill="url(#fbp-plane-grad)" />
                        </svg>
                      </span>
                      Enviado
                    </>
                  ) : (
                    <><Send size={15} /> Enviar feedback</>
                  )}
                </button>
              </div>
            </form>

            {/* Gradiente para o avião de papel do easter egg — svg de 0x0, só as defs */}
            <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
              <defs>
                <linearGradient id="fbp-plane-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#2478f0" />
                  <stop offset="55%" stopColor="#db4a3d" />
                  <stop offset="100%" stopColor="#cc9a1e" />
                </linearGradient>
              </defs>
            </svg>
          </>
        )}
      </div>
    </div>
  )
}
