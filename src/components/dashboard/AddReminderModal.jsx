import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Modal, Button, SectionLabel } from '../ui'

function toISODate(d) {
  const p = n => n < 10 ? '0' + n : String(n)
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export default function AddReminderModal({ userId, initialDate, onClose, onCreated }) {
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(toISODate(initialDate || new Date()))
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
    <Modal onClose={onClose} title="Novo lembrete" subtitle="Aparece no teu calendário e sincroniza para o Google/Apple.">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
        <div>
          <SectionLabel>Título</SectionLabel>
          <input value={title} onChange={e => setTitle(e.target.value)} required autoFocus
            placeholder="Estudar para o teste de matemática" style={inputStyle} />
        </div>
        <div>
          <SectionLabel>Data</SectionLabel>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} required style={inputStyle} />
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
