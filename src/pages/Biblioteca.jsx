import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Navbar } from '../components/Navbar'
import { PlusIcon as Plus } from '../components/icons/PlusIcon'
import { DocumentTextIcon as FileText } from '@solar-icons/react/bold/document-text'
import { GalleryIcon as ImageIcon } from '@solar-icons/react/bold/gallery'
import { TrashBinTrashIcon as Trash } from '@solar-icons/react/bold/trash-bin-trash'
import { LibraryIcon } from '@solar-icons/react/bold/library'
import { CloseIcon as X } from '@solar-icons/react/bold/close'
import { ArrowRightUpIcon as ExternalLink } from '@solar-icons/react/bold/arrow-right-up'
import './Biblioteca.css'

/* Biblioteca — onde vivem os projetos "adicionados" (upload direto, sem
   virarem a ficha completa de sempre). "Criar do 0" continua a gerar a
   página estruturada normal em /projeto/:slug; isto aqui é o espaço mais
   leve, tipo portefólio, para quem só quer mostrar o que já tem feito. */

function fileIconFor(type) {
  if (type?.startsWith('image/')) return ImageIcon
  return FileText
}

/* Ficheiros que o próprio browser sabe mostrar num <iframe>/<img> direto.
   Word/PowerPoint não — passam pelo Google Docs Viewer, que só precisa
   de um URL público (o bucket já é público). */
function previewUrlFor(item) {
  const { library_file_url: url, library_file_type: type } = item
  if (!url) return null
  if (type?.startsWith('image/') || type === 'application/pdf') return url
  return `https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true`
}

function prettyDate(iso) {
  try {
    return new Date(iso).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch { return '' }
}

export default function Biblioteca() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [items, setItems] = useState(null)
  const [removing, setRemoving] = useState(null)
  const [viewing, setViewing] = useState(null)

  useEffect(() => {
    if (!viewing) return
    const onKey = e => { if (e.key === 'Escape') setViewing(null) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [viewing])

  useEffect(() => {
    if (!user) return
    let cancelled = false
    supabase
      .from('projects')
      .select('id, name, library_description, library_file_url, library_file_name, library_file_type, created_at')
      .eq('user_id', user.id)
      .eq('entry_kind', 'library')
      .order('created_at', { ascending: false })
      .then(({ data }) => { if (!cancelled) setItems(data ?? []) })
    return () => { cancelled = true }
  }, [user])

  async function handleDelete(id) {
    if (!window.confirm('Remover este item da biblioteca? Não é possível desfazer.')) return
    setRemoving(id)
    await supabase.from('projects').delete().eq('id', id).eq('user_id', user.id)
    setItems(prev => prev.filter(i => i.id !== id))
    setRemoving(null)
  }

  return (
    <div className="min-h-screen bg-page font-body">
      <Navbar />
      <div className="page-content">
        <div className="lib-header">
          <h1 className="lib-title">Biblioteca</h1>
          <button className="lib-add-btn" onClick={() => navigate('/novo')}>
            <Plus size={15} /> Adicionar
          </button>
        </div>

        {items === null ? (
          <div className="lib-grid">
            {[0, 1, 2].map(i => <div key={i} className="lib-card lib-card--skeleton" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="lib-empty">
            <span className="lib-empty-icon"><LibraryIcon size={26} /></span>
            <p className="lib-empty-title">Ainda não tens nada aqui.</p>
            <p className="lib-empty-desc">Envia um relatório, uma apresentação ou umas imagens do que já fizeste.</p>
            <button className="lib-add-btn" onClick={() => navigate('/novo')}>
              <Plus size={15} /> Adicionar
            </button>
          </div>
        ) : (
          <div className="lib-grid">
            {items.map(item => {
              const Icon = fileIconFor(item.library_file_type)
              const isImage = item.library_file_type?.startsWith('image/')
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`lib-card${item.library_file_url ? ' is-clickable' : ''}`}
                  onClick={() => item.library_file_url && setViewing(item)}
                >
                  <span className={`lib-card-icon${isImage ? ' has-thumb' : ''}`}>
                    {isImage ? <img src={item.library_file_url} alt="" loading="lazy" /> : <Icon size={20} />}
                  </span>
                  <div className="lib-card-body">
                    <span className="lib-card-name">{item.name}</span>
                    {item.library_description && (
                      <span className="lib-card-desc">{item.library_description}</span>
                    )}
                    <span className="lib-card-meta">{prettyDate(item.created_at)}</span>
                  </div>
                  <div className="lib-card-actions">
                    {item.library_file_url && (
                      <span className="lib-card-hint" aria-hidden="true"><ExternalLink size={15} /></span>
                    )}
                    <span
                      role="button"
                      tabIndex={0}
                      className="lib-card-btn danger"
                      onClick={e => { e.stopPropagation(); if (removing !== item.id) handleDelete(item.id) }}
                      onKeyDown={e => { if ((e.key === 'Enter' || e.key === ' ') && removing !== item.id) { e.stopPropagation(); handleDelete(item.id) } }}
                      aria-label="Remover"
                      aria-disabled={removing === item.id}
                    >
                      <Trash size={15} />
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {viewing && (
        <div className="lib-viewer-backdrop" onClick={() => setViewing(null)}>
          <div className="lib-viewer" onClick={e => e.stopPropagation()}>
            <div className="lib-viewer-head">
              <span className="lib-viewer-title">{viewing.name}</span>
              <div className="lib-viewer-actions">
                <a className="lib-card-btn" href={viewing.library_file_url} target="_blank" rel="noopener noreferrer" aria-label="Abrir noutra aba">
                  <ExternalLink size={16} />
                </a>
                <button className="lib-card-btn" onClick={() => setViewing(null)} aria-label="Fechar">
                  <X size={17} />
                </button>
              </div>
            </div>
            <div className="lib-viewer-body">
              {viewing.library_file_type?.startsWith('image/') ? (
                <img src={viewing.library_file_url} alt={viewing.name} className="lib-viewer-img" />
              ) : (
                <iframe title={viewing.name} src={previewUrlFor(viewing)} className="lib-viewer-frame" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
