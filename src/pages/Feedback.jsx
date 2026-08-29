import { useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { X, PaperPlaneTilt as Send, Image, CircleNotch as Loader2, Check } from '@phosphor-icons/react'
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
  const { user } = useAuth()

  const rawFrom = searchParams.get('from')
  const fromPath = rawFrom && rawFrom.startsWith('/') && !rawFrom.startsWith('//') ? rawFrom : null

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
      setStatus('done')
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
            <div className="fbp-done-icon"><Check size={22} /></div>
            <h1 className="fbp-done-title">Obrigado!</h1>
            <p className="fbp-done-sub">O teu feedback foi guardado.</p>
            <button className="fbp-submit" onClick={goBack}>Voltar</button>
          </div>
        ) : (
          <>
            <div className="fbp-head">
              <div>
                <h1 className="fbp-title">Reportar um problema</h1>
                <p className="fbp-sub">O que aconteceu? Qual o erro ou a página?</p>
              </div>
              <button className="fbp-close" onClick={goBack} aria-label="Cancelar">
                <X size={18} />
              </button>
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
                <button type="submit" className="fbp-submit" disabled={!message.trim() || status === 'sending'}>
                  {status === 'sending' ? (
                    <><Loader2 size={16} className="fbp-spin" /> A enviar…</>
                  ) : (
                    <><Send size={15} /> Enviar feedback</>
                  )}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
