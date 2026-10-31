import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Modal, Button, SectionLabel } from '../ui'

function toISODate(d) {
  const p = n => n < 10 ? '0' + n : String(n)
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export default function AddReminderModal({ userId, initialDate, onClose, onCreated }) {
  const [title, setTitle] = useState('')
  // A data já vem escolhida de onde este modal é aberto (o "+" da grelha do
  // calendário ou o "+ Lembrete" do dia selecionado): não há mais um sítio
  // a abrir este modal sem já se saber o dia, por isso deixou de fazer
  // sentido pedir a data outra vez aqui dentro, pedido do Gustavo.
  const date = toISODate(initialDate || new Date())
  const dateLabel = new Date(date + 'T00:00:00')
    .toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' })
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true); setErr('')
    const { data, error } = await supabase
      .from('personal_reminders')
      .insert({ user_id: userId, title: title.trim(), reminder_date: date, notes: notes.trim() || null })
      .select().single()
    setSaving(false)
    if (error) { setErr('Não foi possível guardar.'); return }
    onCreated?.(data); onClose()
  }

  const inputStyle = {
    width: '100%', background: 'var(--color-input-bg)',
    border: '1px solid var(--color-input-border)',
    borderRadius: 'var(--radius-md)', padding: '10px 12px',
    color: 'var(--color-text)', fontSize: 'var(--text-base)',
    fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none',
  }

  return (
    <Modal onClose={onClose} title="Novo lembrete">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
        <p style={{ margin: '-4px 0 0', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', textTransform: 'capitalize' }}>
          {dateLabel}
        </p>
        <div>
          <SectionLabel>Título</SectionLabel>
          <input value={title} onChange={e => setTitle(e.target.value)} required autoFocus
            placeholder="Estudar para o teste de matemática" style={inputStyle} />
        </div>
        <div>
          <SectionLabel>Notas (opcional)</SectionLabel>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
            placeholder="Capítulos 4 e 5" style={{ ...inputStyle, resize: 'none', lineHeight: 1.5 }} />
        </div>
        {err && <p style={{ color: 'var(--color-error)', fontSize: 'var(--text-sm)', margin: 0 }}>{err}</p>}
        <Button type="submit" disabled={saving || !title.trim()} loading={saving} fullWidth>
          {saving ? 'A guardar…' : 'Adicionar'}
        </Button>
      </form>
    </Modal>
  )
}
