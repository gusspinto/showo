import { ArrowUpRight, Plus, CalendarClock, Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { KIND_BY_ID, JOURNAL_KINDS, timeAgoLabel, suggestNextKind } from '../../lib/journal'

const TYPE_LABEL = {
  pap: 'PAP',
  internship: 'Estágio',
  group: 'Trabalho de grupo',
  personal: 'Projeto pessoal',
  competition: 'Competição',
  presentation: 'Apresentação',
}

/* Os quatro tipos que o aluno usa no dia-a-dia. Os restantes ficam no
   compositor — atalhos a mais deixam de ser atalhos. */
const QUICK_KINDS = ['progresso', 'dificuldade', 'decisao', 'resultado']

function projectTypeLabel(project) {
  if (project.is_pap) return 'PAP'
  return TYPE_LABEL[project.project_type] || 'Projeto'
}

function DeadlineChip({ defenseDate }) {
  if (!defenseDate) return null
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const target = new Date(defenseDate + 'T00:00:00')
  const days = Math.ceil((target - today) / 86400000)
  if (days < 0) return null

  const label = days === 0 ? 'é hoje' : days === 1 ? 'é amanhã' : `faltam ${days} dias`
  return (
    <span className={`sdb-deadline${days <= 7 ? ' is-close' : ''}`}>
      <CalendarClock size={12} />
      Defesa {target.toLocaleDateString('pt-PT', { day: 'numeric', month: 'long' })} — {label}
    </span>
  )
}

export default function ProjectPulse({
  project, entries, coverage, loading,
  onLog, onOpenReport, onOpenJournal, onOpen, onEdit, onDelete,
}) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  if (loading) {
    return (
      <section className="sdb-panel sdb-panel--brand sdb-pulse">
        <div className="skel skel-line" style={{ width: 120, height: 10, marginBottom: 14, background: 'rgba(255,255,255,0.25)' }} />
        <div className="skel skel-line" style={{ width: '55%', height: 22, marginBottom: 18, background: 'rgba(255,255,255,0.25)' }} />
        <div className="skel skel-line" style={{ width: '100%', height: 60, background: 'rgba(255,255,255,0.15)' }} />
      </section>
    )
  }

  const recent = entries.slice(0, 3)
  const lastEntry = entries[0]
  const next = suggestNextKind(coverage)

  return (
    <section className="sdb-panel sdb-panel--brand sdb-pulse">
      {/* ── Identificação ── */}
      <header className="sdb-pulse-head">
        <div className="sdb-pulse-id">
          <span className="sdb-pulse-type">{projectTypeLabel(project)}</span>
          <h2 className="sdb-pulse-name" title={project.name}>{project.name}</h2>
          <div className="sdb-pulse-meta">
            {project.area && <span>{project.area}</span>}
            <DeadlineChip defenseDate={project.defense_date} />
          </div>
        </div>
        <div className="sdb-pulse-head-actions">
          {confirmDelete ? (
            <>
              <button className="sdb-pulse-danger-confirm" onClick={() => { onDelete?.(); setConfirmDelete(false) }}>
                Apagar
              </button>
              <button className="sdb-icon-btn" onClick={() => setConfirmDelete(false)} title="Cancelar">
                ✕
              </button>
            </>
          ) : (
            <>
              {onDelete && (
                <button className="sdb-icon-btn sdb-icon-btn--danger" onClick={() => setConfirmDelete(true)} title="Apagar projeto" aria-label="Apagar projeto">
                  <Trash2 size={14} />
                </button>
              )}
              <button className="sdb-icon-btn" onClick={onEdit} title="Editar projeto" aria-label="Editar projeto">
                <Pencil size={15} />
              </button>
              <button className="sdb-icon-btn" onClick={onOpen} title="Abrir página do projeto" aria-label="Abrir página do projeto">
                <ArrowUpRight size={16} />
              </button>
            </>
          )}
        </div>
      </header>

      {/* ── Diário ── */}
      <div className="sdb-journal">
        <div className="sdb-journal-head">
          <span className="sdb-eyebrow sdb-eyebrow--on">Diário do projeto</span>
          {lastEntry && (
            <button className="sdb-linkbtn" onClick={onOpenJournal}>
              {entries.length} entrada{entries.length !== 1 ? 's' : ''} · última {timeAgoLabel(lastEntry.created_at)}
            </button>
          )}
        </div>

        {recent.length === 0 ? (
          <div className="sdb-journal-empty">
            <p>Ainda sem registos. Escreve uma linha — cada entrada alimenta o relatório.</p>
          </div>
        ) : (
          <ul className="sdb-journal-list">
            {recent.map(e => {
              const kind = KIND_BY_ID[e.kind] ?? KIND_BY_ID.nota
              const Icon = kind.icon
              return (
                <li key={e.id} className="sdb-journal-item">
                  <span className="sdb-journal-icon"><Icon size={13} /></span>
                  <div className="sdb-journal-body">
                    <p className="sdb-journal-text">{e.content}</p>
                    <span className="sdb-journal-when">{kind.label} · {timeAgoLabel(e.created_at)}</span>
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        {/* Atalhos de registo — o gesto que traz o aluno de volta */}
        <div className="sdb-quicklog">
          {QUICK_KINDS.map(id => {
            const k = KIND_BY_ID[id]
            const Icon = k.icon
            const suggested = next?.kind?.id === id
            return (
              <button
                key={id}
                className={`sdb-quicklog-btn${suggested ? ' is-suggested' : ''}`}
                onClick={() => onLog(id)}
                title={suggested ? `Ainda falta matéria em ${next.section.label}` : k.prompt}
              >
                <Icon size={13} />
                {k.short}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Ações ── */}
      <footer className="sdb-pulse-foot">
        <button className="sdb-btn sdb-btn--onbrand" onClick={() => onLog(next?.kind?.id || 'progresso')}>
          <Plus size={15} /> Registar entrada
        </button>
      </footer>
    </section>
  )
}

export function ProjectPulseEmpty({ onCreate }) {
  return (
    <section className="sdb-panel sdb-panel--brand sdb-pulse sdb-pulse--empty">
      <div className="sdb-pulse-empty-body">
        <h2 className="sdb-pulse-empty-heading">Pronto para começar?</h2>
        <footer className="sdb-pulse-foot">
          <button className="sdb-btn sdb-btn--onbrand" onClick={onCreate}>
            <Plus size={15} /> Criar projeto
          </button>
        </footer>
      </div>
    </section>
  )
}
