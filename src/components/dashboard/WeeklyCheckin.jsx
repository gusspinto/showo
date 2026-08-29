import { useState, useEffect } from 'react'
import { X, PaperPlaneTilt as Send, ChatCircle as MessageCircle, Warning as AlertTriangle, Flame, ArrowBendUpLeft as Reply } from '@phosphor-icons/react'
import { supabase } from '../../lib/supabase'
import { weekStartISO } from '../../lib/journal'

export function shouldShowCheckin(userId) {
  const key = `showo_checkin_${userId}_${weekStartISO()}`
  return !localStorage.getItem(key)
}

function weekLabel(weekStart) {
  const monday = new Date(weekStart + 'T00:00:00')
  const sunday = new Date(monday); sunday.setDate(sunday.getDate() + 6)
  const fmt = d => d.toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' }).replace('.', '')
  return `${fmt(monday)} – ${fmt(sunday)}`
}

function prevWeekISO() {
  const d = new Date()
  d.setDate(d.getDate() - 7)
  const offset = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - offset)
  d.setHours(0, 0, 0, 0)
  return d.toISOString().slice(0, 10)
}

export default function WeeklyCheckin({ userId, project, streak, onClose, onSaved }) {
  const [progress, setProgress] = useState('')
  const [blockers, setBlockers] = useState('')
  const [question, setQuestion] = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [lastWeek, setLastWeek] = useState(null) // previous week's check-in

  const weekStart = weekStartISO()
  const canSave = progress.trim().length >= 5

  // Fetch last week's check-in for adaptive context
  useEffect(() => {
    supabase.from('weekly_checkins')
      .select('progress, blockers, question_for_prof, prof_reply, prof_reply_at')
      .eq('user_id', userId)
      .eq('week_start', prevWeekISO())
      .maybeSingle()
      .then(({ data }) => { if (data) setLastWeek(data) })
  }, [userId])

  async function save() {
    if (!canSave || saving) return
    setSaving(true)

    const row = {
      user_id: userId,
      project_id: project?.id ?? null,
      week_start: weekStart,
      progress: progress.trim() || null,
      blockers: blockers.trim() || null,
      question_for_prof: question.trim() || null,
    }

    await supabase.from('weekly_checkins').upsert(row, { onConflict: 'user_id,week_start' })

    // Also save as journal entries so it feeds the AI and report
    if (project?.id && progress.trim()) {
      await supabase.from('project_journal_entries').insert({
        project_id: project.id, user_id: userId,
        kind: 'progresso', content: progress.trim(),
      })
    }
    if (project?.id && blockers.trim()) {
      await supabase.from('project_journal_entries').insert({
        project_id: project.id, user_id: userId,
        kind: 'dificuldade', content: blockers.trim(),
      })
    }

    // Notify professors in the student's classes
    const { data: memberships } = await supabase
      .from('class_members').select('class_id').eq('user_id', userId)
    if (memberships?.length) {
      const classIds = memberships.map(m => m.class_id)
      const { data: classes } = await supabase
        .from('classes').select('teacher_id, name').in('id', classIds)
      const { data: profileRow } = await supabase
        .from('profiles').select('full_name').eq('id', userId).maybeSingle()
      const studentName = profileRow?.full_name || 'Um aluno'
      const teacherIds = [...new Set((classes || []).map(c => c.teacher_id).filter(Boolean))]
      await Promise.all(teacherIds.map(tid =>
        supabase.rpc('create_notification', {
          p_user_id: tid,
          p_type: 'CHECKIN_SUBMITTED',
          p_message: `${studentName} fez o check-in semanal.${question.trim() ? ' Tem uma pergunta para si.' : ''}`,
        })
      ))
    }

    setSaving(false)
    localStorage.setItem(`showo_checkin_${userId}_${weekStart}`, '1')
    setDone(true)
    onSaved?.(row)
  }

  function dismiss() {
    localStorage.setItem(`showo_checkin_${userId}_${weekStart}`, '1')
    onClose()
  }

  // Adaptive placeholders based on last week
  const progressPlaceholder = lastWeek?.blockers
    ? `Na semana passada estavas bloqueado em: "${lastWeek.blockers.slice(0, 60)}${lastWeek.blockers.length > 60 ? '...' : ''}" — conseguiste resolver?`
    : 'Avancei no design da app, fiz os mockups...'

  const progressLabel = lastWeek?.blockers
    ? 'Conseguiste avançar desde a semana passada?'
    : 'O que fizeste esta semana?'

  if (done) {
    return (
      <div className="checkin-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
        <div className="checkin-modal checkin-modal--done" role="dialog" aria-modal="true">
          <button className="checkin-close" onClick={onClose} aria-label="Fechar"><X size={16} /></button>
          <div className="checkin-done-icon">
            <Send size={24} />
          </div>
          <h2 className="checkin-done-title">Check-in guardado</h2>
          <p className="checkin-done-sub">Semana de {weekLabel(weekStart)}</p>
          {question.trim() && (
            <p className="checkin-done-note">A tua pergunta ficou visível para o professor.</p>
          )}
          {streak > 0 && (
            <div className="checkin-done-streak">
              <Flame size={14} /> {streak} {streak === 1 ? 'semana seguida' : 'semanas seguidas'}
            </div>
          )}
          <button className="checkin-btn checkin-btn--primary" style={{ width: '100%', marginTop: 12 }} onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="checkin-backdrop" onClick={e => { if (e.target === e.currentTarget) dismiss() }}>
      <div className="checkin-modal" role="dialog" aria-modal="true" aria-label="Check-in semanal">
        <button className="checkin-close" onClick={dismiss} aria-label="Fechar"><X size={16} /></button>

        <header className="checkin-header">
          <span className="checkin-pill">Check-in · {weekLabel(weekStart)}</span>
          <h2 className="checkin-title">Como vai o projeto?</h2>
          {project && <p className="checkin-subtitle">{project.name}</p>}
        </header>

        {/* Professor replied to last week's question */}
        {lastWeek?.prof_reply && (
          <div className="checkin-prof-reply">
            <div className="checkin-prof-reply-header">
              <Reply size={12} /> Resposta do professor à semana passada
            </div>
            {lastWeek.question_for_prof && (
              <p className="checkin-prof-reply-q">Tu: "{lastWeek.question_for_prof}"</p>
            )}
            <p className="checkin-prof-reply-text">{lastWeek.prof_reply}</p>
          </div>
        )}

        <div className="checkin-questions">
          <div className="checkin-q">
            <label className="checkin-label" htmlFor="checkin-progress">
              {progressLabel} <span className="checkin-required">*</span>
            </label>
            <textarea
              id="checkin-progress"
              className="checkin-input"
              placeholder={progressPlaceholder}
              value={progress}
              onChange={e => setProgress(e.target.value)}
              rows={3}
              maxLength={1000}
            />
          </div>

          <div className="checkin-q">
            <label className="checkin-label" htmlFor="checkin-blockers">
              <AlertTriangle size={12} /> Onde estás bloqueado?
            </label>
            <textarea
              id="checkin-blockers"
              className="checkin-input"
              placeholder="Não sei como ligar a API ao frontend..."
              value={blockers}
              onChange={e => setBlockers(e.target.value)}
              rows={2}
              maxLength={1000}
            />
          </div>

          <div className="checkin-q">
            <label className="checkin-label" htmlFor="checkin-question">
              <MessageCircle size={12} /> Tens pergunta para o professor?
            </label>
            <textarea
              id="checkin-question"
              className="checkin-input"
              placeholder="Professor, posso mudar o tema do projeto?"
              value={question}
              onChange={e => setQuestion(e.target.value)}
              rows={2}
              maxLength={1000}
            />
            {question.trim() && (
              <span className="checkin-hint">O professor vai ver esta pergunta no painel da turma.</span>
            )}
          </div>
        </div>

        <div className="checkin-actions">
          <button className="checkin-btn checkin-btn--primary" onClick={save} disabled={!canSave || saving}>
            {saving ? 'A guardar...' : 'Enviar check-in'}
          </button>
          <button className="checkin-btn checkin-btn--quiet" onClick={dismiss}>
            Agora não
          </button>
        </div>
      </div>
    </div>
  )
}
