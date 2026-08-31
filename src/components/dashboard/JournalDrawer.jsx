import { useMemo, useState } from 'react'
import { AddCircleIcon as Plus } from '@solar-icons/react/bold/add-circle'
import { TrashBinMinimalisticIcon as Trash2 } from '@solar-icons/react/bold/trash-bin-minimalistic'
import { supabase } from '../../lib/supabase'
import { Modal, Button } from '../ui'
import { KIND_BY_ID, timeAgoLabel } from '../../lib/journal'

function monthKey(ts) {
  const d = new Date(ts)
  return d.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })
}

export default function JournalDrawer({ project, entries, onClose, onLog, onDeleted }) {
  const [pendingDelete, setPendingDelete] = useState(null)

  const groups = useMemo(() => {
    const map = new Map()
    entries.forEach(e => {
      const k = monthKey(e.created_at)
      if (!map.has(k)) map.set(k, [])
      map.get(k).push(e)
    })
    return [...map.entries()]
  }, [entries])

  async function remove(id) {
    setPendingDelete(null)
    onDeleted?.(id)
    await supabase.from('project_journal_entries').delete().eq('id', id)
  }

  return (
    <Modal
      onClose={onClose}
      width={600}
      title="Diário do projeto"
      subtitle={`${project.name} · ${entries.length} entrada${entries.length !== 1 ? 's' : ''}`}
    >
      <div className="sdb-drawer-top">
        <Button size="sm" icon={<Plus size={13} />} onClick={() => onLog('progresso')}>
          Nova entrada
        </Button>
      </div>

      {entries.length === 0 ? (
        <p className="sdb-drawer-empty">
          O diário está vazio. Cada entrada — um avanço, um problema, uma decisão —
          fica a construir o relatório por ti.
        </p>
      ) : (
        groups.map(([label, items]) => (
          <section key={label} className="sdb-drawer-group">
            <h4 className="sdb-drawer-month">{label}</h4>
            <ul className="sdb-drawer-list">
              {items.map(e => {
                const kind = KIND_BY_ID[e.kind] ?? KIND_BY_ID.nota
                const Icon = kind.icon
                return (
                  <li key={e.id} className="sdb-drawer-item">
                    <span className="sdb-drawer-icon"><Icon size={13} /></span>
                    <div className="sdb-drawer-body">
                      <div className="sdb-drawer-meta">
                        <strong>{kind.label}</strong>
                        <span>{timeAgoLabel(e.created_at)}</span>
                      </div>
                      <p className="sdb-drawer-text">{e.content}</p>
                    </div>
                    {pendingDelete === e.id ? (
                      <div className="sdb-drawer-confirm">
                        <button onClick={() => remove(e.id)}>Apagar</button>
                        <button onClick={() => setPendingDelete(null)}>Manter</button>
                      </div>
                    ) : (
                      <button className="sdb-icon-btn sdb-icon-btn--quiet"
                        onClick={() => setPendingDelete(e.id)}
                        title="Apagar entrada" aria-label="Apagar entrada">
                        <Trash2 size={13} />
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>
          </section>
        ))
      )}
    </Modal>
  )
}
