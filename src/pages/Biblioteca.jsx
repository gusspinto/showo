import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Navbar } from '../components/Navbar'
import { PlusIcon as Plus } from '../components/icons/PlusIcon'
import { DocumentTextIcon as FileText } from '@solar-icons/react/bold/document-text'
import { GalleryIcon as ImageIcon } from '@solar-icons/react/bold/gallery'
import { FolderIcon as Folder } from '@solar-icons/react/bold/folder'
import { TrashBinTrashIcon as Trash } from '@solar-icons/react/bold/trash-bin-trash'
import { LibraryIcon } from '@solar-icons/react/bold/library'
import { CloseIcon as X } from '@solar-icons/react/bold/close'
import { ArrowRightUpIcon as ExternalLink } from '@solar-icons/react/bold/arrow-right-up'
import './Biblioteca.css'

/* Biblioteca — todos os projetos do user, "criados" (entry_kind='full',
   a ficha estruturada de sempre) e "adicionados" (entry_kind='library',
   ficheiro + nome + descrição breve), lado a lado na mesma lista. Um
   espaço só, sem condicionar nenhum dos dois caminhos — cada um continua
   com o seu próprio sentido: criados podem aparecer no Explorar e pedir
   ajuda a melhorar; adicionados formam o portefólio, mostrado por opção
   do user no perfil (isso ainda não está construído). */

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
      .select('id, name, slug, entry_kind, area, score, ai_tagline, cover_url, library_description, library_file_url, library_file_name, library_file_type, created_at')
      .eq('user_id', user.id)
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
            <Plus size={15} /> Novo projeto
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
            <p className="lib-empty-desc">Cria um projeto do zero ou adiciona algo que já tens feito.</p>
            <button className="lib-add-btn" onClick={() => navigate('/novo')}>
              <Plus size={15} /> Novo projeto
            </button>
          </div>
        ) : (
          <div className="lib-grid">
            {items.map(item => {
              const isFull = item.entry_kind === 'full'
              const isImage = !isFull && item.library_file_type?.startsWith('image/')
              const Icon = isFull ? Folder : fileIconFor(item.library_file_type)
              const thumbSrc = isImage ? item.library_file_url : (isFull ? item.cover_url : null)
              const desc = isFull ? item.ai_tagline || item.area : item.library_description
              const clickable = isFull || !!item.library_file_url
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`lib-card${clickable ? ' is-clickable' : ''}`}
                  onClick={() => { if (isFull) navigate(`/projeto/${item.slug}`); else if (item.library_file_url) setViewing(item) }}
                >
                  <span className={`lib-card-icon${thumbSrc ? ' has-thumb' : ''}`}>
                    {thumbSrc ? <img src={thumbSrc} alt="" loading="lazy" /> : <Icon size={20} />}
                  </span>
                  <div className="lib-card-body">
                    <span className="lib-card-name">{item.name}</span>
                    {desc && <span className="lib-card-desc">{desc}</span>}
                    <span className="lib-card-meta">
                      {isFull ? 'Criado' : 'Adicionado'} · {prettyDate(item.created_at)}
                    </span>
                  </div>
                  <div className="lib-card-actions">
                    {clickable && (
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
