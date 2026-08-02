import { useState, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { Modal, Button } from '../ui'
import { JOURNAL_KINDS, KIND_BY_ID, REPORT_SECTIONS } from '../../lib/journal'

/* Que secções do relatório é que este tipo de entrada alimenta — mostrado ao
   aluno enquanto escreve, para que registar não pareça burocracia mas sim
   trabalho que já conta para a entrega. */
function sectionsFedBy(kind) {
  return REPORT_SECTIONS.filter(s => s.kinds.includes(kind)).map(s => s.label)
}

export default function JournalComposer({
  userId, project, initialKind = 'progresso', onClose, onCreated,
}) {
  const [kind, setKind] = useState(initialKind)
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const active = KIND_BY_ID[kind] ?? KIND_BY_ID.progresso
  const feeds = useMemo(() => sectionsFedBy(kind), [kind])
  const tooShort = content.trim().length < 10

  async function handleSubmit(e) {
    e.preventDefault()
    if (tooShort || saving) return
    setSaving(true); setError('')

    const { data, error: err } = await supabase
      .from('project_journal_entries')
      .insert({ project_id: project.id, user_id: userId, kind, content: content.trim() })
      .select()
      .single()

    setSaving(false)
    if (err) { setError('Não foi possível guardar. Tenta outra vez.'); return }
    onCreated?.(data)
    onClose()
  }

  return (
    <Modal
      onClose={onClose}
      width={520}
      title="Registar no diário"
      subtitle={project?.name}
    >
      <form onSubmit={handleSubmit}>
        <div className="sdb-kind-picker" role="radiogroup" aria-label="Tipo de registo">
          {JOURNAL_KINDS.map(k => {
            const Icon = k.icon
            const on = k.id === kind
            return (
              <button
                key={k.id}
                type="button"
                role="radio"
                aria-checked={on}
                className={`sdb-kind-chip${on ? ' is-on' : ''}`}
                onClick={() => setKind(k.id)}
              >
                <Icon size={13} />
                {k.short}
              </button>
            )
          })}
        </div>

        <label className="sdb-composer-prompt" htmlFor="sdb-journal-input">
          {active.prompt}
        </label>
        <textarea
          id="sdb-journal-input"
          className="sdb-composer-input"
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder={active.placeholder}
          rows={5}
          maxLength={4000}
          autoFocus
        />

        <div className="sdb-composer-foot">
          {feeds.length > 0 ? (
            <span className="sdb-composer-feeds">
              Vai alimentar o relatório em <strong>{feeds.join(' e ')}</strong>
            </span>
          ) : (
            <span className="sdb-composer-feeds">Fica guardado no histórico do projeto</span>
          )}
          <span className="sdb-composer-count">{content.trim().length}</span>
        </div>

        {error && <p className="sdb-form-error">{error}</p>}

        <div className="sdb-composer-actions">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={tooShort || saving} loading={saving}>
            {saving ? 'A guardar…' : 'Guardar entrada'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
