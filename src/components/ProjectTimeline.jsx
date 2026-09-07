// Timeline pública do projeto — a evolução ao longo do tempo.
// Visitante (quando timeline_public): resumo de consistência + strip de
// atividade semanal + marcos em lista vertical.
// Dono: o mesmo + toggle público, adicionar/editar/apagar marcos, sugerir
// marcos com IA.
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { CheckCircleIcon as Check } from '@solar-icons/react/bold/check-circle'
import { CloseIcon as X } from '@solar-icons/react/bold/close'
import { Pen2Icon as Pencil } from '@solar-icons/react/bold/pen-2'
import { TrashBinMinimalisticIcon as Trash } from '@solar-icons/react/bold/trash-bin-minimalistic'
import { StarsIcon as Sparkles } from '@solar-icons/react/bold/stars'
import { ClockCircleIcon as Route } from '@solar-icons/react/bold/clock-circle'
import { PlusIcon as Plus } from './icons/PlusIcon'
import './ProjectTimeline.css'

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const fmtMonthYear = d => { const x = new Date(d); return `${MONTHS[x.getMonth()]} ${x.getFullYear()}` }
const fmtDay = d => { const x = new Date(d + 'T00:00:00'); return `${x.getDate()} ${MONTHS[x.getMonth()]} ${x.getFullYear()}` }

function monthsBetween(a, b) {
  const d1 = new Date(a), d2 = new Date(b)
  return Math.max(0, (d2.getFullYear() - d1.getFullYear()) * 12 + d2.getMonth() - d1.getMonth())
}

function durationLabel(from) {
  const m = monthsBetween(from, new Date())
  if (m < 1) return 'há menos de um mês'
  if (m < 12) return `há ${m} ${m === 1 ? 'mês' : 'meses'}`
  const y = Math.floor(m / 12), r = m % 12
  return `há ${y} ${y === 1 ? 'ano' : 'anos'}${r ? ` e ${r} ${r === 1 ? 'mês' : 'meses'}` : ''}`
}

export default function ProjectTimeline({ project, isOwner }) {
  const [tl, setTl] = useState(undefined)          // undefined=loading, null=nada
  const [milestones, setMilestones] = useState([])
  const [isPublic, setIsPublic] = useState(!!project.timeline_public)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState(null)           // {id?, title, happened_on, note}
  const [suggestions, setSuggestions] = useState(null)
  const [loadingAI, setLoadingAI] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const [rpcRes, msRes] = await Promise.allSettled([
        supabase.rpc('get_project_timeline', { p_project_id: project.id }),
        supabase.from('project_milestones').select('id, title, note, happened_on').eq('project_id', project.id).order('happened_on'),
      ])
      if (cancelled) return
      if (rpcRes.status === 'fulfilled' && rpcRes.value.error) console.warn('[timeline] rpc:', rpcRes.value.error.message)
      setTl(rpcRes.status === 'fulfilled' ? (rpcRes.value.data ?? null) : null)
      setMilestones(msRes.status === 'fulfilled' ? (msRes.value.data ?? []) : [])
    }
    load()
    return () => { cancelled = true }
  }, [project.id])

  async function togglePublic() {
    const next = !isPublic
    setIsPublic(next)
    await supabase.from('projects').update({ timeline_public: next }).eq('id', project.id)
  }

  async function saveMilestone() {
    if (!form?.title.trim() || !form.happened_on) return
    setBusy(true)
    const row = { title: form.title.trim(), note: form.note?.trim() || null, happened_on: form.happened_on }
    if (form.id) {
      await supabase.from('project_milestones').update(row).eq('id', form.id)
      setMilestones(m => m.map(x => x.id === form.id ? { ...x, ...row } : x).sort(byDate))
    } else {
      const { data } = await supabase.from('project_milestones')
        .insert({ ...row, project_id: project.id, user_id: project.user_id }).select('id, title, note, happened_on').single()
      if (data) setMilestones(m => [...m, data].sort(byDate))
    }
    setBusy(false); setForm(null)
  }

  async function removeMilestone(id) {
    setMilestones(m => m.filter(x => x.id !== id))
    await supabase.from('project_milestones').delete().eq('id', id)
  }

  async function fetchSuggestions() {
    setLoadingAI(true)
    const { data } = await supabase.functions.invoke('suggest-milestones', { body: { projectId: project.id } })
    setLoadingAI(false)
    const existing = new Set(milestones.map(m => m.title.toLowerCase()))
    setSuggestions((data?.milestones || []).filter(s => !existing.has(s.title.toLowerCase())))
  }

  async function acceptSuggestion(s) {
    const { data } = await supabase.from('project_milestones')
      .insert({ project_id: project.id, user_id: project.user_id, title: s.title, note: s.note || null, happened_on: s.happened_on })
      .select('id, title, note, happened_on').single()
    if (data) setMilestones(m => [...m, data].sort(byDate))
    setSuggestions(prev => prev.filter(x => x !== s))
  }

  if (tl === undefined) return null
  const hasEntries = !!(tl && tl.entry_count > 0)
  const hasContent = milestones.length > 0 || hasEntries
  // Visitante: só quando o dono a tornou pública e há algo para mostrar.
  if (!isOwner && (!isPublic || !hasContent)) return null

  const startDate = tl?.first_entry || tl?.created_on
  const weekly = tl?.weekly || []
  const maxWeek = Math.max(1, ...weekly.map(w => w.count))
  const durMonths = startDate ? monthsBetween(startDate, new Date()) : 0

  const header = (
    <div className="ptl-card-head">
      <div className="ptl-card-head-main">
        <Route size={15} className="ptl-card-icon" />
        <span className="ptl-card-title">Percurso</span>
      </div>
      {isOwner && (
        <button className={`ptl-toggle${isPublic ? ' is-on' : ''}`} onClick={togglePublic}>
          <span className="ptl-toggle-dot" />
          {isPublic ? 'Visível no perfil' : 'Só tu vês'}
        </button>
      )}
    </div>
  )

  const ownerActions = isOwner && (
    <div className="ptl-actions">
      <button className="ptl-btn" onClick={() => setForm({ title: '', happened_on: new Date().toISOString().slice(0, 10), note: '' })}>
        <Plus size={13} /> Adicionar momento
      </button>
      {hasEntries && (
        <button className="ptl-btn ptl-btn--ai" onClick={fetchSuggestions} disabled={loadingAI}>
          <Sparkles size={13} /> {loadingAI ? 'A ler o diário…' : 'Sugerir com IA'}
        </button>
      )}
    </div>
  )

  // Dono, sem nada ainda — cartão de apresentação, não um parágrafo solto.
  if (isOwner && !hasContent) {
    return (
      <div className="ptl-card ptl-card--empty">
        {header}
        <p className="ptl-empty-text">
          Regista os momentos importantes do projeto. No perfil, mostram a um
          recrutador que trabalhaste nele ao longo do tempo.
        </p>
        {ownerActions}
        {form && <MilestoneForm form={form} setForm={setForm} onSave={saveMilestone} busy={busy} />}
        {suggestions && <Suggestions list={suggestions} onAccept={acceptSuggestion} onDismiss={s => setSuggestions(p => p.filter(x => x !== s))} />}
      </div>
    )
  }

  return (
    <div className="ptl-card">
      {header}

      {hasEntries && (
        <>
          <div className="ptl-stats">
            <div className="ptl-stat">
              <span className="ptl-stat-n">{tl.entry_count}</span>
              <span className="ptl-stat-l">registo{tl.entry_count !== 1 ? 's' : ''} no diário</span>
            </div>
            <div className="ptl-stat">
              <span className="ptl-stat-n">{tl.active_weeks}</span>
              <span className="ptl-stat-l">semana{tl.active_weeks !== 1 ? 's' : ''} ativas</span>
            </div>
            {startDate && (
              <div className="ptl-stat">
                <span className="ptl-stat-n">{durMonths < 1 ? '<1' : durMonths}</span>
                <span className="ptl-stat-l">{durMonths === 1 ? 'mês de trabalho' : 'meses de trabalho'}</span>
              </div>
            )}
          </div>

          {weekly.length > 1 && (
            <div className="ptl-chart">
              <div className="ptl-chart-bars" aria-hidden="true">
                {weekly.map(w => (
                  <span key={w.week} className="ptl-chart-bar" style={{ height: `${Math.max(6, (w.count / maxWeek) * 100)}%` }} title={`${w.count} na semana de ${fmtDay(w.week)}`} />
                ))}
              </div>
              <div className="ptl-chart-axis">
                <span>{startDate && fmtMonthYear(startDate)}</span>
                <span>agora</span>
              </div>
            </div>
          )}
        </>
      )}

      {ownerActions}

      {suggestions && <Suggestions list={suggestions} onAccept={acceptSuggestion} onDismiss={s => setSuggestions(p => p.filter(x => x !== s))} />}
      {form && <MilestoneForm form={form} setForm={setForm} onSave={saveMilestone} busy={busy} />}

      {milestones.length > 0 ? (
        <ol className="ptl-list">
          {milestones.map(m => (
            <li key={m.id} className="ptl-item">
              <span className="ptl-dot" />
              <div className="ptl-item-body">
                <span className="ptl-item-date">{fmtDay(m.happened_on)}</span>
                <span className="ptl-item-title">{m.title}</span>
                {m.note && <span className="ptl-item-note">{m.note}</span>}
              </div>
              {isOwner && (
                <div className="ptl-item-acts">
                  <button onClick={() => setForm({ id: m.id, title: m.title, happened_on: m.happened_on, note: m.note || '' })} title="Editar"><Pencil size={12} /></button>
                  <button onClick={() => removeMilestone(m.id)} title="Apagar"><Trash size={12} /></button>
                </div>
              )}
            </li>
          ))}
        </ol>
      ) : isOwner && (
        <p className="ptl-nomarks">Ainda sem momentos. Adiciona o primeiro ou deixa a IA sugerir a partir do diário.</p>
      )}
    </div>
  )
}

const byDate = (a, b) => (a.happened_on < b.happened_on ? -1 : 1)

function MilestoneForm({ form, setForm, onSave, busy }) {
  return (
    <div className="ptl-form">
      <input className="ptl-input" placeholder="O que aconteceu? (ex: primeira demo a funcionar)" maxLength={120}
        value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} autoFocus />
      <input className="ptl-input" type="date" value={form.happened_on}
        onChange={e => setForm(f => ({ ...f, happened_on: e.target.value }))} />
      <textarea className="ptl-input ptl-textarea" rows={2} placeholder="Uma frase de contexto (opcional)" maxLength={500}
        value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
      <div className="ptl-form-acts">
        <button className="ptl-btn" onClick={() => setForm(null)}>Cancelar</button>
        <button className="ptl-btn ptl-btn--primary" onClick={onSave} disabled={busy || !form.title.trim()}>
          {busy ? 'A guardar…' : form.id ? 'Guardar' : 'Adicionar'}
        </button>
      </div>
    </div>
  )
}

function Suggestions({ list, onAccept, onDismiss }) {
  if (list.length === 0) return <p className="ptl-nomarks">A IA não encontrou momentos novos no diário.</p>
  return (
    <div className="ptl-suggestions">
      <p className="ptl-suggestions-hint"><Sparkles size={12} /> Encontrei isto no teu diário. Aceita o que fizer sentido</p>
      {list.map((s, i) => (
        <div key={i} className="ptl-sugg">
          <div className="ptl-sugg-body">
            <span className="ptl-sugg-date">{fmtDay(s.happened_on)}</span>
            <span className="ptl-sugg-title">{s.title}</span>
            {s.note && <span className="ptl-sugg-note">{s.note}</span>}
          </div>
          <div className="ptl-sugg-acts">
            <button onClick={() => onAccept(s)} title="Adicionar"><Check size={14} /></button>
            <button onClick={() => onDismiss(s)} title="Dispensar"><X size={14} /></button>
          </div>
        </div>
      ))}
    </div>
  )
}
