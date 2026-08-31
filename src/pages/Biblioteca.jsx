import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Navbar } from '../components/Navbar'
import { PlusIcon as Plus } from '../components/icons/PlusIcon'
import { DocumentTextIcon as FileText } from '@solar-icons/react/bold/document-text'
import { GalleryIcon as ImageIcon } from '@solar-icons/react/bold/gallery'
import { TrashBinTrashIcon as Trash } from '@solar-icons/react/bold/trash-bin-trash'
import { DownloadIcon as Download } from '@solar-icons/react/bold/download'
import { LibraryIcon } from '@solar-icons/react/bold/library'
import './Biblioteca.css'

/* Biblioteca — onde vivem os projetos "adicionados" (upload direto, sem
   virarem a ficha completa de sempre). "Criar do 0" continua a gerar a
   página estruturada normal em /projeto/:slug; isto aqui é o espaço mais
   leve, tipo portefólio, para quem só quer mostrar o que já tem feito. */

function fileIconFor(type) {
  if (type?.startsWith('image/')) return ImageIcon
  return FileText
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
              return (
                <a
                  key={item.id}
                  className={`lib-card${item.library_file_url ? ' is-clickable' : ''}`}
                  href={item.library_file_url || undefined}
                  target={item.library_file_url ? '_blank' : undefined}
                  rel={item.library_file_url ? 'noopener noreferrer' : undefined}
                  onClick={e => { if (!item.library_file_url) e.preventDefault() }}
                >
                  <span className="lib-card-icon"><Icon size={20} /></span>
                  <div className="lib-card-body">
                    <span className="lib-card-name">{item.name}</span>
                    {item.library_description && (
                      <span className="lib-card-desc">{item.library_description}</span>
                    )}
                    <span className="lib-card-meta">{prettyDate(item.created_at)}</span>
                  </div>
                  <div className="lib-card-actions">
                    {item.library_file_url && (
                      <span className="lib-card-hint" aria-hidden="true"><Download size={15} /></span>
                    )}
                    <button
                      className="lib-card-btn danger"
                      onClick={e => { e.preventDefault(); e.stopPropagation(); handleDelete(item.id) }}
                      disabled={removing === item.id}
                      aria-label="Remover"
                    >
                      <Trash size={15} />
                    </button>
                  </div>
                </a>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
