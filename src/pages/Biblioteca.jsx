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
   ficheiro + nome + descrição breve). Um espaço só, sem condicionar
   nenhum dos dois caminhos, mas com pesos visuais opostos: adicionados
   é o portefólio — tiles com preview, com destaque; criados ainda
   estão em construção — lista compacta, sem destaque nenhum. Criados
   podem aparecer no Explorar e pedir ajuda a melhorar; adicionados
   formam o portefólio, mostrado por opção do user no perfil (isso
   ainda não está construído). */

function fileIconFor(type) {
  if (type?.startsWith('image/')) return ImageIcon
  return FileText
}

/* Cor por tipo de ficheiro, à Google Drive — não é decoração, é a pista
   visual que substitui a preview real quando não há uma (só imagens têm
   preview de verdade; PDF/Word/PowerPoint mostram-se por cor+etiqueta). */
const FILE_TYPE_STYLE = {
  'application/pdf': { color: '#e05a4e', label: 'PDF' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { color: '#3b6fd6', label: 'DOC' },
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': { color: '#e08a2e', label: 'PPT' },
  'text/plain': { color: '#8a8f98', label: 'TXT' },
  'text/markdown': { color: '#8a8f98', label: 'MD' },
}
function fileTypeStyle(type) {
  return FILE_TYPE_STYLE[type] || { color: '#8a8f98', label: 'FICHEIRO' }
}

function previewUrlFor(item) {
  const url = item._signedFileUrl
  const type = item.library_file_type
  if (!url) return null
  if (type?.startsWith('image/') || type === 'application/pdf') return url
  return null
}

async function signLibraryUrls(items) {
  const toSign = []
  for (const it of items) {
    if (it.entry_kind !== 'library') continue
    if (it.library_file_url && !it.library_file_url.startsWith('http')) toSign.push(it.library_file_url)
    if (it.library_thumb_url && !it.library_thumb_url.startsWith('http')) toSign.push(it.library_thumb_url)
  }
  if (!toSign.length) return items
  const { data: signed } = await supabase.storage.from('library-files').createSignedUrls(toSign, 900)
  const urlMap = {}
  if (signed) signed.forEach(s => { if (s.signedUrl) urlMap[s.path] = s.signedUrl })
  return items.map(it => {
    if (it.entry_kind !== 'library') return it
    return {
      ...it,
      _signedFileUrl: urlMap[it.library_file_url] || it.library_file_url,
      _signedThumbUrl: urlMap[it.library_thumb_url] || it.library_thumb_url,
    }
  })
}

function prettyDate(iso) {
  try {
    return new Date(iso).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch { return '' }
}

/* Item da Biblioteca (entry_kind='library') — o portefólio, o que mais
   se quer mostrar. Tile com preview de verdade quando é imagem; para o
   resto (PDF/Word/PowerPoint), um cartão colorido por tipo à Drive —
   ainda mais reconhecível que um ícone cinzento genérico. */
function LibAddedTile({ item, onOpen, onDelete, removing }) {
  const isImage = item.library_file_type?.startsWith('image/')
  const previewSrc = isImage ? (item._signedFileUrl || item.library_file_url) : (item._signedThumbUrl || item.library_thumb_url)
  const ft = fileTypeStyle(item.library_file_type)

  return (
    <div className="lib-tile">
      <button type="button" className="lib-tile-main" onClick={() => onOpen(item)}>
        <span
          className="lib-tile-cover"
          style={!previewSrc ? { background: `color-mix(in srgb, ${ft.color} 16%, var(--color-bg-alt))` } : undefined}
        >
          {previewSrc ? (
            <img src={previewSrc} alt="" loading="lazy" />
          ) : (
            <span className="lib-tile-filetype" style={{ color: ft.color }}>
              <FileText size={30} />
              <span className="lib-tile-filetype-label">{ft.label}</span>
            </span>
          )}
        </span>
        <span className="lib-tile-footer">
          <span className="lib-tile-text">
            <span className="lib-tile-name">{item.name}</span>
            {item.library_description && <span className="lib-tile-area">{item.library_description}</span>}
          </span>
        </span>
      </button>
      <span
        role="button"
        tabIndex={0}
        className="lib-tile-delete"
        onClick={e => { e.stopPropagation(); if (removing !== item.id) onDelete(item.id) }}
        onKeyDown={e => { if ((e.key === 'Enter' || e.key === ' ') && removing !== item.id) { e.stopPropagation(); onDelete(item.id) } }}
        aria-label="Remover"
        aria-disabled={removing === item.id}
      >
        <Trash size={14} />
      </span>
    </div>
  )
}

/* Projeto "criado" (entry_kind='full') — ainda em construção, por isso
   sem o destaque todo: linha compacta, não tile. */
function LibBuildingRow({ item, onOpen, onDelete, removing }) {
  return (
    <button type="button" className="lib-row is-clickable" onClick={() => onOpen(item)}>
      <span className={`lib-row-icon${item.cover_url ? ' has-thumb' : ''}`}>
        {item.cover_url ? <img src={item.cover_url} alt="" loading="lazy" /> : <Folder size={16} />}
      </span>
      <div className="lib-row-body">
        <span className="lib-row-name">{item.name}</span>
        {item.area && <span className="lib-row-desc">{item.area}</span>}
      </div>
      {item.score > 0 && <span className="lib-row-date">{item.score}</span>}
      <span className="lib-row-hint" aria-hidden="true"><ExternalLink size={14} /></span>
      <span
        role="button"
        tabIndex={0}
        className="lib-row-delete"
        onClick={e => { e.stopPropagation(); if (removing !== item.id) onDelete(item.id) }}
        onKeyDown={e => { if ((e.key === 'Enter' || e.key === ' ') && removing !== item.id) { e.stopPropagation(); onDelete(item.id) } }}
        aria-label="Remover"
        aria-disabled={removing === item.id}
      >
        <Trash size={14} />
      </span>
    </button>
  )
}

export default function Biblioteca() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [items, setItems] = useState(null)
  const [removing, setRemoving] = useState(null)
  const [viewing, setViewing] = useState(null)
  const [confirmingDelete, setConfirmingDelete] = useState(null)

  useEffect(() => {
    if (!viewing && !confirmingDelete) return
    const onKey = e => { if (e.key === 'Escape') { setViewing(null); setConfirmingDelete(null) } }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [viewing, confirmingDelete])

  useEffect(() => {
    if (!user) return
    let cancelled = false
    supabase
      .from('projects')
      .select('id, name, slug, entry_kind, area, score, ai_tagline, cover_url, library_description, library_file_url, library_file_name, library_file_type, library_thumb_url, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(async ({ data }) => {
        if (cancelled) return
        const withUrls = await signLibraryUrls(data ?? [])
        if (!cancelled) setItems(withUrls)
      })
    return () => { cancelled = true }
  }, [user])

  // A thumbnail de um item "adicionado" gera-se em segundo plano (ver
  // generateLibraryThumbnail em NewProject.jsx) — sem isto, só aparecia
  // depois de recarregar a página à mão. Ouve o próprio UPDATE da linha
  // e troca o cartão colorido pela preview a sério assim que chega.
  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel(`biblioteca-${user.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'projects', filter: `user_id=eq.${user.id}` }, async payload => {
        const [signed] = await signLibraryUrls([payload.new])
        setItems(prev => prev?.map(i => (i.id === signed.id ? { ...i, ...signed } : i)) ?? prev)
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'projects', filter: `user_id=eq.${user.id}` }, async payload => {
        const [signed] = await signLibraryUrls([payload.new])
        setItems(prev => (prev?.some(i => i.id === signed.id) ? prev : [signed, ...(prev ?? [])]))
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [user])

  function handleDelete(id) {
    setConfirmingDelete(id)
  }

  async function confirmDelete() {
    const id = confirmingDelete
    setConfirmingDelete(null)
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
          <div className="lib-tile-grid">
            {[0, 1, 2].map(i => <div key={i} className="lib-tile-main lib-tile--skeleton" />)}
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
                ver com destaque. Tile com preview, à Drive. */}
            {added.length > 0 && (
              <div className="lib-section">
                <h2 className="lib-section-title">Adicionados</h2>
                <div className="lib-tile-grid">
                  {added.map(item => (
                    <LibAddedTile key={item.id} item={item} removing={removing} onDelete={handleDelete}
                      onOpen={it => it.library_file_url && setViewing(it)} />
                  ))}
                </div>
              </div>
            )}

            {/* "A criar" — ainda em construção, por isso sem o destaque
                todo: linha compacta, não tile. */}
            {building.length > 0 && (
              <div className="lib-section">
                <h2 className="lib-section-title">A criar</h2>
                <div className="lib-added-list">
                  {building.map(item => (
                    <LibBuildingRow key={item.id} item={item} removing={removing} onDelete={handleDelete}
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
                <a className="lib-card-btn" href={viewing._signedFileUrl || viewing.library_file_url} target="_blank" rel="noopener noreferrer" aria-label="Abrir noutra aba">
                  <ExternalLink size={16} />
                </a>
                <button className="lib-card-btn" onClick={() => setViewing(null)} aria-label="Fechar">
                  <X size={17} />
                </button>
              </div>
            </div>
            <div className="lib-viewer-body">
              {viewing.library_file_type?.startsWith('image/') ? (
                <img src={viewing._signedFileUrl || viewing.library_file_url} alt={viewing.name} className="lib-viewer-img" />
              ) : (
                <iframe title={viewing.name} src={previewUrlFor(viewing)} className="lib-viewer-frame" />
              )}
            </div>
          </div>
        </div>
      )}

      {confirmingDelete && (
        <div className="lib-confirm-backdrop" onClick={() => setConfirmingDelete(null)}>
          <div className="lib-confirm" onClick={e => e.stopPropagation()}>
            <p className="lib-confirm-text">Remover este item da biblioteca? Não é possível desfazer.</p>
            <div className="lib-confirm-actions">
              <button className="lib-confirm-btn" onClick={() => setConfirmingDelete(null)}>Cancelar</button>
              <button className="lib-confirm-btn danger" onClick={confirmDelete}>Remover</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
