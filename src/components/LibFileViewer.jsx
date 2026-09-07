import { useEffect, useRef, useState } from 'react'
import { CloseIcon as X } from '@solar-icons/react/bold/close'
import { DownloadIcon as Download } from '@solar-icons/react/bold/download'
import { Pen2Icon as Pencil } from '@solar-icons/react/bold/pen-2'
import { CheckCircleIcon as Check } from '@solar-icons/react/bold/check-circle'
import PdfViewer from './PdfViewer'
import { officeToPdfBlob, persistLibraryPdf } from '../lib/officeToPdf'
import './LibFileViewer.css'

const OFFICE_TYPES = new Set([
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
])

/* Abre um ficheiro da Biblioteca DENTRO da app: imagem, PDF e texto
   renderizam-se aqui; Word/PowerPoint abrem no visualizador da Microsoft
   (ou no PDF já convertido, se existir). Usado na Biblioteca e no perfil
   público. */
export default function LibFileViewer({ item, onClose, onRename }) {
  const [renaming, setRenaming] = useState(false)
  const [nameDraft, setNameDraft] = useState(item?.name || '')

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') { renaming ? setRenaming(false) : onClose() } }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose, renaming])

  function saveName() {
    const v = nameDraft.trim()
    setRenaming(false)
    if (v && v !== item.name) onRename(v)
  }

  const url = item?._signedFileUrl
  const type = item?.library_file_type || ''
  const isImage = type.startsWith('image/')
  const isPdf = type === 'application/pdf'
  const isText = type === 'text/plain' || type === 'text/markdown'
  const isOffice = OFFICE_TYPES.has(type)

  return (
    <div className="lfv-backdrop" onClick={onClose}>
      <div className="lfv" onClick={e => e.stopPropagation()}>
        <div className="lfv-head">
          {renaming ? (
            <input
              className="lfv-title-input"
              value={nameDraft}
              autoFocus
              maxLength={120}
              onChange={e => setNameDraft(e.target.value)}
              onBlur={saveName}
              onKeyDown={e => { if (e.key === 'Enter') saveName() }}
            />
          ) : (
            <span className="lfv-title">{item?.name}</span>
          )}
          <div className="lfv-actions">
            {onRename && !renaming && (
              <button className="lfv-btn" onClick={() => { setNameDraft(item.name || ''); setRenaming(true) }} aria-label="Mudar o nome">
                <Pencil size={15} />
              </button>
            )}
            {renaming && (
              <button className="lfv-btn" onClick={saveName} aria-label="Guardar nome">
                <Check size={16} />
              </button>
            )}
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
          ) : isOffice ? (
            item._signedPdfUrl
              ? <PdfViewer url={item._signedPdfUrl} />
              : <OfficeEmbed item={item} />
          ) : (
            <div className="lfv-msg lfv-nopreview">
              <p>Este tipo de ficheiro ainda não abre dentro da app.</p>
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

/* Office sem PDF guardado: o visualizador da Microsoft (view.officeapps.live.com)
   abre .docx/.pptx a partir do URL assinado, sem conversão nem Gotenberg.
   Funciona para qualquer visitante e para ficheiros grandes; os PowerPoints
   com imagens que rebentavam o Gotenberg abrem aqui na mesma. Se falhar
   (raro), fica o caminho antigo: converter para PDF ou transferir. */
function OfficeEmbed({ item }) {
  const [mode, setMode] = useState('embed') // embed | convert
  const src = item?._signedFileUrl
    ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(item._signedFileUrl)}`
    : null

  if (mode === 'convert') return <OfficeViewer item={item} />
  if (!src) return <div className="lfv-msg">Não foi possível carregar o ficheiro.</div>

  return (
    <div className="lfv-office">
      <iframe className="lfv-office-frame" src={src} title={item?.name} />
      <div className="lfv-office-foot">
        Não aparece?
        <button type="button" onClick={() => setMode('convert')}>Converter para PDF</button>
        <a href={item._signedFileUrl} target="_blank" rel="noopener noreferrer">Transferir</a>
      </div>
    </div>
  )
}

/* Office sem PDF guardado ainda: converte na hora (office-thumbnail →
   Gotenberg) e mostra. Se for o dono, guarda o resultado para as próximas
   vezes e para os visitantes do perfil. Visitante anónimo → a função exige
   sessão, falha, cai na transferência. */
function OfficeViewer({ item }) {
  const [state, setState] = useState('converting')
  const [pdfUrl, setPdfUrl] = useState(null)
  const [errMsg, setErrMsg] = useState('')
  const [attempt, setAttempt] = useState(0)
  const objUrlRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    async function run() {
      setState('converting')
      try {
        const blob = await officeToPdfBlob(
          item._signedFileUrl,
          item.library_file_name || item.name,
          item.library_file_type,
        )
        if (cancelled) return
        objUrlRef.current = URL.createObjectURL(blob)
        setPdfUrl(objUrlRef.current)
        setState('ready')
        persistLibraryPdf(item, blob).catch(() => {})
      } catch (err) {
        console.error('[OfficeViewer]', err)
        if (!cancelled) {
          setErrMsg(err?.message?.includes('demasiado grande')
            ? err.message
            : 'O conversor de PowerPoint/Word está a arrancar ou indisponível. Tenta daqui a um minuto.')
          setState('error')
        }
      }
    }
    run()
    return () => {
      cancelled = true
      if (objUrlRef.current) { URL.revokeObjectURL(objUrlRef.current); objUrlRef.current = null }
    }
  }, [item, attempt])

  if (state === 'converting') return <div className="lfv-msg">A preparar pré-visualização… (pode demorar até um minuto na primeira vez)</div>
  if (state === 'error') return (
    <div className="lfv-msg lfv-nopreview">
      <p>{errMsg}</p>
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        {!errMsg.includes('demasiado grande') && (
          <button className="lfv-download" onClick={() => setAttempt(a => a + 1)}>Tentar de novo</button>
        )}
        <a className="lfv-download" href={item._signedFileUrl} target="_blank" rel="noopener noreferrer" style={{ background: 'transparent', border: '1px solid var(--color-border)' }}>Transferir ficheiro</a>
      </div>
    </div>
  )
  return <PdfViewer url={pdfUrl} />
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
