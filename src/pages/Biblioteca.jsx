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

/* Item da Biblioteca (entry_kind='library') — ficheiro + nome + descrição
   breve, sempre um card pequeno e utilitário. */
function LibCard({ item, onOpen, onDelete, removing }) {
  const isImage = item.library_file_type?.startsWith('image/')
  const Icon = fileIconFor(item.library_file_type)
  const clickable = !!item.library_file_url

  return (
    <button type="button" className={`lib-card${clickable ? ' is-clickable' : ''}`} onClick={() => onOpen(item)}>
      <span className={`lib-card-icon${isImage ? ' has-thumb' : ''}`}>
        {isImage ? <img src={item.library_file_url} alt="" loading="lazy" /> : <Icon size={20} />}
      </span>
      <div className="lib-card-body">
        <span className="lib-card-name">{item.name}</span>
        {item.library_description && <span className="lib-card-desc">{item.library_description}</span>}
        <span className="lib-card-meta">{prettyDate(item.created_at)}</span>
      </div>
      <div className="lib-card-actions">
        {clickable && <span className="lib-card-hint" aria-hidden="true"><ExternalLink size={15} /></span>}
        <span
          role="button"
          tabIndex={0}
          className="lib-card-btn danger"
          onClick={e => { e.stopPropagation(); if (removing !== item.id) onDelete(item.id) }}
          onKeyDown={e => { if ((e.key === 'Enter' || e.key === ' ') && removing !== item.id) { e.stopPropagation(); onDelete(item.id) } }}
          aria-label="Remover"
          aria-disabled={removing === item.id}
        >
          <Trash size={15} />
        </span>
      </div>
    </button>
  )
}

/* Projeto "criado" (entry_kind='full') — tem mais por trás (score, área,
   progresso) do que um item da Biblioteca, mas o pedido foi minimalista:
   capa se houver (num quadrado pequeno, não uma hero image), nome, área
   como etiqueta discreta e o score num número simples — nada de tagline
   nem parágrafos, isso fica para dentro do próprio projeto. */
function LibFullCard({ item, onOpen, onDelete, removing }) {
  return (
    <button type="button" className="lib-card lib-card--full is-clickable" onClick={() => onOpen(item)}>
      <span className={`lib-card-icon lib-card-icon--full${item.cover_url ? ' has-thumb' : ''}`}>
        {item.cover_url ? <img src={item.cover_url} alt="" loading="lazy" /> : <Folder size={20} />}
      </span>
      <div className="lib-card-body">
        <span className="lib-card-name">{item.name}</span>
        {item.area && <span className="lib-card-tag">{item.area}</span>}
      </div>
      <div className="lib-card-actions">
        {item.score > 0 && <span className="lib-card-score">{item.score}</span>}
        <span
          role="button"
          tabIndex={0}
          className="lib-card-btn danger"
          onClick={e => { e.stopPropagation(); if (removing !== item.id) onDelete(item.id) }}
          onKeyDown={e => { if ((e.key === 'Enter' || e.key === ' ') && removing !== item.id) { e.stopPropagation(); onDelete(item.id) } }}
          aria-label="Remover"
          aria-disabled={removing === item.id}
        >
          <Trash size={15} />
        </span>
      </div>
    </button>
  )
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

  const added = items?.filter(i => i.entry_kind === 'library') ?? []
  const building = items?.filter(i => i.entry_kind === 'full') ?? []

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
          <>
            {/* Adicionados primeiro — é o portefólio, o que faz sentido
                ver logo à chegada. "A criar" fica por baixo: é trabalho
                em curso, não a montra. */}
            {added.length > 0 && (
              <div className="lib-section">
                <h2 className="lib-section-title">Adicionados</h2>
                <div className="lib-grid">
                  {added.map(item => (
                    <LibCard key={item.id} item={item} removing={removing} onDelete={handleDelete}
                      onOpen={it => it.library_file_url && setViewing(it)} />
                  ))}
                </div>
              </div>
            )}

            {building.length > 0 && (
              <div className="lib-section">
                <h2 className="lib-section-title">A criar</h2>
                <div className="lib-grid">
                  {building.map(item => (
                    <LibFullCard key={item.id} item={item} removing={removing} onDelete={handleDelete}
                      onOpen={it => navigate(`/projeto/${it.slug}`)} />
                  ))}
                </div>
              </div>
            )}
          </>
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
