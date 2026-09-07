import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Button, Modal, ModalActions, SectionLabel, Select } from './ui'
import { academicYearOptions } from '../lib/academicYear'

export const GRADE_OPTIONS = [
  { value: '', label: 'Sem ano específico' },
  { value: '10', label: '10.º ano' },
  { value: '11', label: '11.º ano' },
  { value: '12', label: '12.º ano' },
]

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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <SectionLabel>Nome da turma *</SectionLabel>
            <input value={name} onChange={e => setName(e.target.value)} required placeholder="ex: Turma A, 11.º ano" className="dash-input" />
          </div>
          <div>
            <SectionLabel>Disciplina (opcional)</SectionLabel>
            <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="ex: Programação e Sistemas" className="dash-input" />
          </div>
          <div>
            <SectionLabel>Ano letivo</SectionLabel>
            <Select value={academicYear} onChange={setAcademicYear} placeholder="Seleciona..."
              options={academicYearOptions().map(y => ({ value: y, label: y }))} />
          </div>
          <div>
            <SectionLabel>Ano de escolaridade</SectionLabel>
            <Select value={gradeLevel} onChange={setGradeLevel} options={GRADE_OPTIONS} />
            <p style={{ margin: '6px 0 0', fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>
              Alunos de 11.º e 12.º passam a ver a secção de Estágios.
            </p>
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
