import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Button, Modal, ModalActions, SectionLabel, Select } from './ui'
import { academicYearOptions } from '../lib/academicYear'

const GRADE_SEGMENTS = [
  { value: '', label: '—' },
  { value: '10', label: '10.º' },
  { value: '11', label: '11.º' },
  { value: '12', label: '12.º' },
]

const segWrap = {
  display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
  border: '1px solid var(--color-border)', borderRadius: 8, overflow: 'hidden',
}
const segBtn = {
  padding: '9px 0', border: 'none', borderLeft: '1px solid var(--color-border)',
  background: 'var(--color-bg)', color: 'var(--color-text-secondary)',
  fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
  transition: 'background 0.12s, color 0.12s',
}
const segBtnOn = { background: 'var(--color-primary)', color: '#fff' }

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

// Modal partilhado — usado na dashboard do professor e na página de Turmas.
export default function CreateTurmaModal({ onClose, onCreated, user, profile }) {
  const [name, setName] = useState('')
  const [subject, setSubject] = useState('')
  const [academicYear, setAcademicYear] = useState('')
  const [gradeLevel, setGradeLevel] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  async function handleCreate(e) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    setErr('')
    const code = generateCode()
    const teacherName = profile?.full_name || user?.user_metadata?.full_name || ''
    const { data, error } = await supabase.from('classes')
      .insert({ name: name.trim(), subject: subject.trim() || null, code, teacher_id: user.id, teacher_name: teacherName, academic_year: academicYear || null })
      .select().single()
    if (error) {
      setSaving(false)
      setErr(error.message?.includes('row-level security')
        ? 'Só contas de professor podem criar turmas.'
        : 'Não foi possível criar a turma. Tenta de novo.')
      return
    }
    if (data && gradeLevel) {
      await supabase.from('classes').update({ grade_level: gradeLevel }).eq('id', data.id)
      data.grade_level = gradeLevel
    }
    setSaving(false)
    if (data) onCreated(data)
    onClose()
  }

  return (
    <Modal onClose={onClose} title="Nova turma">
      <form onSubmit={handleCreate}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <SectionLabel>Nome da turma</SectionLabel>
            <input value={name} onChange={e => setName(e.target.value)} required placeholder="ex: Turma A, 11.º ano" className="dash-input" autoFocus />
          </div>
          <div>
            <SectionLabel>Disciplina</SectionLabel>
            <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="ex: Programação e Sistemas" className="dash-input" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <SectionLabel>Ano letivo</SectionLabel>
              <Select value={academicYear} onChange={setAcademicYear} placeholder="Seleciona"
                options={academicYearOptions().map(y => ({ value: y, label: y }))} />
            </div>
            <div>
              <SectionLabel>Ano de escolaridade</SectionLabel>
              <div role="radiogroup" aria-label="Ano de escolaridade" style={segWrap}>
                {GRADE_SEGMENTS.map((g, i) => (
                  <button key={g.value} type="button" role="radio" aria-checked={gradeLevel === g.value}
                    onClick={() => setGradeLevel(g.value)}
                    style={{ ...segBtn, borderLeft: i ? '1px solid var(--color-border)' : 'none', ...(gradeLevel === g.value ? segBtnOn : null) }}>
                    {g.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {err && <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: 'var(--color-error)' }}>{err}</p>}
        </div>
        <ModalActions>
          <Button type="submit" disabled={!name.trim() || saving} loading={saving} fullWidth>
            {saving ? 'A criar…' : 'Criar turma'}
          </Button>
        </ModalActions>
      </form>
    </Modal>
  )
}
