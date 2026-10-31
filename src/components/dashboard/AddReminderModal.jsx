import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Modal, Button, SectionLabel } from '../ui'

function toISODate(d) {
  const p = n => n < 10 ? '0' + n : String(n)
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/* Serve para criar e para editar um lembrete, o mesmo formulário com um
   `editing` a mais: sem ele é "Novo lembrete" (insert); com ele é "Editar
   lembrete", pré-preenchido, com "Guardar" (update) e "Remover" (delete).
   Antes só dava para criar, e clicar num lembrete já marcado não fazia
   nada, o Gustavo pediu as duas pontas. */
export default function AddReminderModal({ userId, initialDate, editing, onClose, onCreated, onSaved, onDeleted }) {
  const [title, setTitle] = useState(editing?.title || '')
  const [notes, setNotes] = useState(editing?.notes || '')
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [err, setErr] = useState('')

  // A data já vem escolhida de onde este modal é aberto (o "+" da grelha do
  // calendário ou um lembrete já marcado nessa data): não há mais um sítio
  // a abrir este modal sem já se saber o dia, por isso não é editável aqui.
  const date = editing ? editing.reminder_date : toISODate(initialDate || new Date())
  const dateLabel = new Date(date + 'T00:00:00')
    .toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' })

  async function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true); setErr('')
    if (editing) {
      const { data, error } = await supabase
        .from('personal_reminders')
        .update({ title: title.trim(), notes: notes.trim() || null })
        .eq('id', editing.id).eq('user_id', userId)
        .select().single()
      setSaving(false)
      if (error) { setErr('Não foi possível guardar.'); return }
      onSaved?.(data); onClose()
      return
    }
    const { data, error } = await supabase
      .from('personal_reminders')
      .insert({ user_id: userId, title: title.trim(), reminder_date: date, notes: notes.trim() || null })
      .select().single()
    setSaving(false)
    if (error) { setErr('Não foi possível guardar.'); return }
    onCreated?.(data); onClose()
  }

  async function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return }
    setDeleting(true); setErr('')
    const { error } = await supabase.from('personal_reminders').delete().eq('id', editing.id).eq('user_id', userId)
    setDeleting(false)
    if (error) { setErr('Não foi possível remover.'); return }
    onDeleted?.(editing.id); onClose()
  }

  const inputStyle = {
    width: '100%', background: 'var(--color-input-bg)',
    border: '1px solid var(--color-input-border)',
    borderRadius: 'var(--radius-md)', padding: '10px 12px',
    color: 'var(--color-text)', fontSize: 'var(--text-base)',
    fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none',
  }

  return (
    <Modal onClose={onClose} title={editing ? 'Editar lembrete' : 'Novo lembrete'}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
        <p style={{ margin: '-4px 0 0', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', textTransform: 'capitalize' }}>
          {dateLabel}
        </p>
        <div>
          <SectionLabel>Título</SectionLabel>
          <input value={title} onChange={e => setTitle(e.target.value)} required autoFocus
            placeholder="Terminar a próxima secção do projeto" style={inputStyle} />
        </div>
        <div>
          <SectionLabel>Notas (opcional)</SectionLabel>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
            placeholder="O que falta fazer" style={{ ...inputStyle, resize: 'none', lineHeight: 1.5 }} />
        </div>
        {err && <p style={{ color: 'var(--color-error)', fontSize: 'var(--text-sm)', margin: 0 }}>{err}</p>}
        <Button type="submit" disabled={saving || !title.trim()} loading={saving} fullWidth>
          {saving ? 'A guardar…' : editing ? 'Guardar' : 'Adicionar'}
        </Button>
        {editing && (
          <Button type="button" variant="danger" fullWidth disabled={deleting} loading={deleting}
            onClick={handleDelete}>
            {confirmDelete ? 'Confirmar remoção' : 'Remover lembrete'}
          </Button>
        )}
      </form>
    </Modal>
  )
}
