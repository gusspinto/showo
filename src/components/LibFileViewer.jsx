import { useEffect, useState } from 'react'
import { CloseIcon as X } from '@solar-icons/react/bold/close'
import { DownloadIcon as Download } from '@solar-icons/react/bold/download'
import PdfViewer from './PdfViewer'
import './LibFileViewer.css'

const OFFICE_TYPES = new Set([
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
])

/* Abre um ficheiro da Biblioteca DENTRO da app: imagem, PDF e texto
   renderizam-se aqui; Word/PowerPoint ainda não (fica para a conversão
   para PDF — fase 2). Usado na Biblioteca e no perfil público. */
export default function LibFileViewer({ item, onClose }) {
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const url = item?._signedFileUrl
  const type = item?.library_file_type || ''
  const isImage = type.startsWith('image/')
  const isPdf = type === 'application/pdf'
  const isText = type === 'text/plain' || type === 'text/markdown'

  return (
    <div className="lfv-backdrop" onClick={onClose}>
      <div className="lfv" onClick={e => e.stopPropagation()}>
        <div className="lfv-head">
          <span className="lfv-title">{item?.name}</span>
          <div className="lfv-actions">
            {url && (
              <a className="lfv-btn" href={url} target="_blank" rel="noopener noreferrer" aria-label="Transferir">
                <Download size={16} />
              </a>
            )}
            <button className="lfv-btn" onClick={onClose} aria-label="Fechar">
              <X size={17} />
            </button>
          </div>
        </div>

        <div className="lfv-body">
          {!url ? (
            <div className="lfv-msg">Não foi possível carregar o ficheiro.</div>
          ) : isImage ? (
            <img src={url} alt={item?.name} className="lfv-img" />
          ) : isPdf ? (
            <PdfViewer url={url} />
          ) : isText ? (
            <TextViewer url={url} />
          ) : (
            <div className="lfv-msg lfv-nopreview">
              <p>
                {OFFICE_TYPES.has(type)
                  ? 'Word e PowerPoint ainda não abrem dentro da app.'
                  : 'Este tipo de ficheiro ainda não abre dentro da app.'}
              </p>
              <a className="lfv-download" href={url} target="_blank" rel="noopener noreferrer">
                Transferir ficheiro
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function TextViewer({ url }) {
  const [text, setText] = useState(null)
  useEffect(() => {
    let cancelled = false
    fetch(url)
      .then(r => r.text())
      .then(t => { if (!cancelled) setText(t) })
      .catch(() => { if (!cancelled) setText('(não foi possível carregar o texto)') })
    return () => { cancelled = true }
  }, [url])
  return <pre className="lfv-text">{text ?? 'A carregar…'}</pre>
}
