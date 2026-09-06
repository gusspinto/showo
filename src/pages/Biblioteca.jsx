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
import { Pen2Icon as Pencil } from '@solar-icons/react/bold/pen-2'
import { LibraryIcon } from '@solar-icons/react/bold/library'
import { ArrowRightUpIcon as ExternalLink } from '@solar-icons/react/bold/arrow-right-up'
import { fileTypeStyle, withSignedLibraryUrls } from '../lib/libraryFile'
import LibFileViewer from '../components/LibFileViewer'
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
/* Controlo de edição partilhado por tiles e linhas: liga/desliga "no perfil"
   e, quando ligado, escolhe o layout (Capa | Linha). */
function ProfileControls({ item, onTogglePin, onSetLayout }) {
  const on = item.profile_featured
  return (
    <div className="lib-edit-bar" onClick={e => e.stopPropagation()}>
      <button
        type="button"
        className={`lib-check${on ? ' is-on' : ''}`}
        onClick={() => onTogglePin(item)}
      >
        <CheckIcon on={on} />
        {on ? 'No perfil' : 'Mostrar no perfil'}
      </button>
      {on && (
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
      )}
    </div>
  )
}

/* Item da Biblioteca (entry_kind='library') — o portefólio, o que mais
   se quer mostrar. Tile com preview de verdade quando é imagem; para o
   resto (PDF/Word/PowerPoint), um cartão colorido por tipo à Drive —
   ainda mais reconhecível que um ícone cinzento genérico. */
function LibAddedTile({ item, onOpen, onDelete, removing, editing, onTogglePin, onSetLayout, renaming, onStartRename, onRename, onCancelRename }) {
  const isImage = item.library_file_type?.startsWith('image/')
  const previewSrc = isImage ? item._signedFileUrl : item._signedThumbUrl
  const ft = fileTypeStyle(item.library_file_type)
  const [draft, setDraft] = useState(item.name || '')

  useEffect(() => { if (renaming) setDraft(item.name || '') }, [renaming, item.name])

  function commitName() {
    const v = draft.trim()
    onCancelRename()
    if (v && v !== item.name) onRename(v)
  }

  return (
    <div className={`lib-tile${editing ? ' is-editing' : ''}${editing && item.profile_featured ? ' is-on' : ''}`}>
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
            {(() => {
              // skills/tech_stack só depois da migração 126 (acrescentar ao
              // .select() dos itens); até lá cai no library_skills de sempre.
              const tags = [...(item.skills || []), ...(item.tech_stack || [])]
              const shown = tags.length ? tags : (item.library_skills || [])
              return shown.length > 0 && (
                <span className="lib-tile-skills">
                  {shown.slice(0, 3).map(s => <span key={s} className="lib-tile-skill">{s}</span>)}
                </span>
              )
            })()}
          </span>
        </span>
      </button>

      {renaming && (
        <div className="lib-tile-rename">
          <input
            className="lib-tile-name-input"
            value={draft}
            autoFocus
            maxLength={120}
            onChange={e => setDraft(e.target.value)}
            onBlur={commitName}
            onKeyDown={e => {
              if (e.key === 'Enter') commitName()
              if (e.key === 'Escape') onCancelRename()
            }}
          />
        </div>
      )}

      {editing && <ProfileControls item={item} onTogglePin={onTogglePin} onSetLayout={onSetLayout} />}
      <div className="lib-tile-tools">
        <span
          role="button"
          tabIndex={0}
          className="lib-tile-tool"
          onClick={e => { e.stopPropagation(); onStartRename(item.id) }}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); onStartRename(item.id) } }}
          aria-label="Mudar o nome"
        >
          <Pencil size={13} />
        </span>
        <span
          role="button"
          tabIndex={0}
          className="lib-tile-tool lib-tile-tool--danger"
          onClick={e => { e.stopPropagation(); if (removing !== item.id) onDelete(item.id) }}
          onKeyDown={e => { if ((e.key === 'Enter' || e.key === ' ') && removing !== item.id) { e.stopPropagation(); onDelete(item.id) } }}
          aria-label="Remover"
          aria-disabled={removing === item.id}
        >
          <Trash size={13} />
        </span>
      </div>
    </div>
  )
}

/* Projeto "criado" (entry_kind='full') — ainda em construção, por isso
   sem o destaque todo: linha compacta, não tile. */
function LibBuildingRow({ item, onOpen, onDelete, removing, editing, onTogglePin, onSetLayout }) {
  return (
    <div className={`lib-row-wrap${editing && item.profile_featured ? ' is-on' : ''}`}>
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
      {editing && <ProfileControls item={item} onTogglePin={onTogglePin} onSetLayout={onSetLayout} />}
    </div>
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
  const [renamingId, setRenamingId] = useState(null)

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
      .select('id, user_id, name, slug, entry_kind, area, score, ai_tagline, cover_url, library_description, library_skills, library_file_url, library_file_name, library_file_type, library_thumb_url, library_pdf_url, profile_featured, profile_featured_order, profile_layout, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(async ({ data }) => {
        if (cancelled) return
        const withUrls = await withSignedLibraryUrls(data ?? [])
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
        const [signed] = await withSignedLibraryUrls([payload.new])
        setItems(prev => prev?.map(i => (i.id === signed.id ? { ...i, ...signed } : i)) ?? prev)
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'projects', filter: `user_id=eq.${user.id}` }, async payload => {
        const [signed] = await withSignedLibraryUrls([payload.new])
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

  const added = items?.filter(i => i.entry_kind === 'library') ?? []
  const building = items?.filter(i => i.entry_kind === 'full') ?? []
  const featuredCount = (items ?? []).filter(i => i.profile_featured).length

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
                onClick={() => setEditing(e => !e)}
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
          <p className="lib-edit-hint">
            Liga <strong>Mostrar no perfil</strong> nos itens que queres no teu perfil público
            {featuredCount > 0 && <> — <strong>{featuredCount}</strong> {featuredCount === 1 ? 'ativo' : 'ativos'}</>}.
            Escolhe <strong>Capa</strong> ou <strong>Linha</strong> para o formato de cada um.
          </p>
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
                      editing={editing} onTogglePin={togglePin} onSetLayout={setLayout}
                      renaming={renamingId === item.id}
                      onStartRename={setRenamingId}
                      onCancelRename={() => setRenamingId(null)}
                      onRename={name => patchItem(item.id, { name })}
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
                      editing={editing} onTogglePin={togglePin} onSetLayout={setLayout}
                      onOpen={it => navigate(`/projeto/${it.slug}`)} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {viewing && (
        <LibFileViewer
          item={viewing}
          onClose={() => setViewing(null)}
          onRename={name => {
            patchItem(viewing.id, { name })
            setViewing(v => (v ? { ...v, name } : v))
          }}
        />
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
