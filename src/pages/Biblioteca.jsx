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

/* Ícones inline — evita mais um import de pacote só para dois glifos. */
function CheckIcon({ on }) {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      {on
        ? <path d="M13.5 4.5 6.5 11.5 3 8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        : <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.6" />}
    </svg>
  )
}
function GripIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <circle cx="5.5" cy="3.5" r="1.4" /><circle cx="10.5" cy="3.5" r="1.4" />
      <circle cx="5.5" cy="8" r="1.4" /><circle cx="10.5" cy="8" r="1.4" />
      <circle cx="5.5" cy="12.5" r="1.4" /><circle cx="10.5" cy="12.5" r="1.4" />
    </svg>
  )
}

/* Linha reordenável do painel "No teu perfil". A ordem e o layout de cada
   item definem-se aqui; o interruptor liga/desliga está no próprio card. */
function ProfileRow({ item, onDragStart, onDragOver, onDrop, onDragEnd, dragging, onSetLayout, onRemove }) {
  const thumb =
    item.cover_url ||
    item.library_thumb_url ||
    (item.library_file_type?.startsWith('image/') ? item.library_file_url : null)
  return (
    <li
      className={`lib-pf-item${dragging ? ' is-dragging' : ''}`}
      draggable
      onDragStart={e => onDragStart(e, item.id)}
      onDragOver={e => onDragOver(e, item.id)}
      onDrop={e => onDrop(e, item.id)}
      onDragEnd={onDragEnd}
    >
      <span className="lib-pf-grip" aria-hidden="true"><GripIcon /></span>
      <span className={`lib-pf-thumb${thumb ? ' has-img' : ''}`}>
        {thumb ? <img src={thumb} alt="" loading="lazy" /> : <span>{(item.name || '?')[0].toUpperCase()}</span>}
      </span>
      <span className="lib-pf-name">{item.name}</span>
      <span className="lib-seg" role="group" aria-label="Layout no perfil">
        <button
          type="button"
          className={`lib-seg-btn${(item.profile_layout || 'tile') === 'tile' ? ' is-on' : ''}`}
          onClick={() => onSetLayout(item, 'tile')}
        >Capa</button>
        <button
          type="button"
          className={`lib-seg-btn${item.profile_layout === 'row' ? ' is-on' : ''}`}
          onClick={() => onSetLayout(item, 'row')}
        >Linha</button>
      </span>
      <button type="button" className="lib-pf-remove" onClick={() => onRemove(item)} aria-label="Tirar do perfil">
        <X size={14} />
      </button>
    </li>
  )
}

/* Item da Biblioteca (entry_kind='library') — o portefólio, o que mais
   se quer mostrar. Tile com preview de verdade quando é imagem; para o
   resto (PDF/Word/PowerPoint), um cartão colorido por tipo à Drive —
   ainda mais reconhecível que um ícone cinzento genérico. */
function LibAddedTile({ item, onOpen, onDelete, removing, editing, onTogglePin }) {
  const isImage = item.library_file_type?.startsWith('image/')
  const previewSrc = isImage ? item.library_file_url : item.library_thumb_url
  const ft = fileTypeStyle(item.library_file_type)

  return (
    <div className={`lib-tile${editing ? ' is-editing' : ''}`}>
      {editing && (
        <button
          type="button"
          className={`lib-pin${item.profile_featured ? ' is-on' : ''}`}
          onClick={() => onTogglePin(item)}
        >
          <CheckIcon on={item.profile_featured} />
          {item.profile_featured ? 'No perfil' : 'Mostrar no perfil'}
        </button>
      )}
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
function LibBuildingRow({ item, onOpen, onDelete, removing, editing, onTogglePin }) {
  return (
    <button type="button" className="lib-row is-clickable" onClick={() => onOpen(item)}>
      {editing && (
        <span
          role="button"
          tabIndex={0}
          className={`lib-pin lib-pin--inline${item.profile_featured ? ' is-on' : ''}`}
          onClick={e => { e.stopPropagation(); onTogglePin(item) }}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); onTogglePin(item) } }}
        >
          <CheckIcon on={item.profile_featured} />
          {item.profile_featured ? 'No perfil' : 'Mostrar no perfil'}
        </span>
      )}
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
  const [editing, setEditing] = useState(false)
  const [dragId, setDragId] = useState(null)

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
      .select('id, name, slug, entry_kind, area, score, ai_tagline, cover_url, library_description, library_file_url, library_file_name, library_file_type, library_thumb_url, profile_featured, profile_featured_order, profile_layout, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => { if (!cancelled) setItems(data ?? []) })
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
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'projects', filter: `user_id=eq.${user.id}` }, payload => {
        setItems(prev => prev?.map(i => (i.id === payload.new.id ? { ...i, ...payload.new } : i)) ?? prev)
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'projects', filter: `user_id=eq.${user.id}` }, payload => {
        setItems(prev => (prev?.some(i => i.id === payload.new.id) ? prev : [payload.new, ...(prev ?? [])]))
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

  async function patchItem(id, patch) {
    setItems(prev => prev.map(i => (i.id === id ? { ...i, ...patch } : i)))
    await supabase.from('projects').update(patch).eq('id', id).eq('user_id', user.id)
  }

  function togglePin(item) {
    if (item.profile_featured) {
      patchItem(item.id, { profile_featured: false, profile_featured_order: null })
    } else {
      const maxOrder = (items ?? [])
        .filter(i => i.profile_featured)
        .reduce((m, i) => Math.max(m, i.profile_featured_order ?? 0), 0)
      patchItem(item.id, {
        profile_featured: true,
        profile_featured_order: maxOrder + 1,
        profile_layout: item.profile_layout || 'tile',
      })
    }
  }

  function setLayout(item, layout) {
    if ((item.profile_layout || 'tile') === layout) return
    patchItem(item.id, { profile_layout: layout })
  }

  async function reorderProfile(fromId, toId) {
    if (fromId === toId) return
    const ordered = [...featured]
    const from = ordered.findIndex(i => i.id === fromId)
    const to = ordered.findIndex(i => i.id === toId)
    if (from < 0 || to < 0) return
    const [moved] = ordered.splice(from, 1)
    ordered.splice(to, 0, moved)
    const orderById = new Map(ordered.map((o, idx) => [o.id, idx + 1]))
    setItems(prev => prev.map(i => (orderById.has(i.id) ? { ...i, profile_featured_order: orderById.get(i.id) } : i)))
    await Promise.all(
      ordered.map((o, idx) =>
        supabase.from('projects').update({ profile_featured_order: idx + 1 }).eq('id', o.id).eq('user_id', user.id),
      ),
    )
  }

  const added = items?.filter(i => i.entry_kind === 'library') ?? []
  const building = items?.filter(i => i.entry_kind === 'full') ?? []
  const featured = (items ?? [])
    .filter(i => i.profile_featured)
    .sort((a, b) => (a.profile_featured_order ?? 99) - (b.profile_featured_order ?? 99))

  return (
    <div className="min-h-screen bg-page font-body">
      <Navbar />
      <div className="page-content">
        <div className="lib-header">
          <h1 className="lib-title">Biblioteca</h1>
          <div className="lib-header-actions">
            {items?.length > 0 && (
              <button
                className={`lib-edit-btn${editing ? ' is-on' : ''}`}
                onClick={() => { setEditing(e => !e); setDragId(null) }}
              >
                {editing ? 'Concluir' : 'Organizar'}
              </button>
            )}
            <button className="lib-add-btn" onClick={() => navigate('/novo')}>
              <Plus size={15} /> Novo projeto
            </button>
          </div>
        </div>

        {editing && (
          <div className="lib-profile-panel">
            <div className="lib-profile-panel-head">
              <h2 className="lib-section-title" style={{ margin: 0 }}>No teu perfil</h2>
              <span className="lib-profile-panel-hint">
                Liga <strong>Mostrar no perfil</strong> num item para o pôr aqui. Arrasta para ordenar; escolhe o layout de cada um.
              </span>
            </div>
            {featured.length === 0 ? (
              <p className="lib-pf-empty">Ainda não escolheste nada para mostrar no perfil.</p>
            ) : (
              <ul className="lib-pf-list">
                {featured.map(item => (
                  <ProfileRow
                    key={item.id}
                    item={item}
                    dragging={dragId === item.id}
                    onDragStart={(e, id) => { setDragId(id); e.dataTransfer.effectAllowed = 'move' }}
                    onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move' }}
                    onDrop={(e, id) => { e.preventDefault(); if (dragId) reorderProfile(dragId, id); setDragId(null) }}
                    onDragEnd={() => setDragId(null)}
                    onSetLayout={setLayout}
                    onRemove={togglePin}
                  />
                ))}
              </ul>
            )}
          </div>
        )}

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
                      editing={editing} onTogglePin={togglePin}
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
                      editing={editing} onTogglePin={togglePin}
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
