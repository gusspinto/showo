import { useState, useMemo } from 'react'
import { X, CheckCircle, Flame, Sparkles, BookOpen, ChevronRight } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { KIND_BY_ID, computeEngagementSignal, weekStartISO } from '../../lib/journal'

export function shouldShowRecap(userId) {
  const day = new Date().getDay() // 0=Dom, 5=Sex, 6=Sáb
  if (![0, 5, 6].includes(day)) return false
  const key = `showo_recap_${userId}_${weekStartISO()}`
  return !localStorage.getItem(key)
}

function weekLabel(weekStart) {
  const monday = new Date(weekStart + 'T00:00:00')
  const sunday = new Date(monday); sunday.setDate(sunday.getDate() + 6)
  const fmt = d => d.toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' }).replace('.', '')
  return `${fmt(monday)} – ${fmt(sunday)}`
}

/* ── Modal de preenchimento ── */
export default function WeeklyRecap({ userId, project, entries, streak, onClose, onSaved }) {
  const [reflection, setReflection] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedData, setSavedData] = useState(null) // null = formulário, object = ecrã de sucesso

  const weekStart = weekStartISO()

  const weekEntries = useMemo(() => {
    const monday = new Date(weekStart + 'T00:00:00')
    const nextMonday = new Date(monday); nextMonday.setDate(nextMonday.getDate() + 7)
    return entries.filter(e => {
      const d = new Date(e.created_at)
      return d >= monday && d < nextMonday
    })
  }, [entries, weekStart])

  const kindsUsed = useMemo(
    () => [...new Set(weekEntries.map(e => e.kind))],
    [weekEntries],
  )

  const engagement = useMemo(
    () => computeEngagementSignal(weekEntries),
    [weekEntries],
  )

  const activeDays = useMemo(
    () => new Set(weekEntries.map(e => e.created_at.slice(0, 10))).size,
    [weekEntries],
  )

  const engagementLabel = engagement >= 70 ? 'Alto' : engagement >= 40 ? 'Médio' : 'Baixo'
  const engagementColor = engagement >= 70 ? 'var(--color-success)' : engagement >= 40 ? 'var(--color-primary)' : 'var(--color-warning)'

  function dismiss() {
    localStorage.setItem(`showo_recap_${userId}_${weekStart}`, '1')
    onClose()
  }

  async function save() {
    setSaving(true)
    const recap = {
      user_id: userId,
      project_id: project?.id ?? null,
      week_start: weekStart,
      reflection: reflection.trim() || null,
      entry_count: weekEntries.length,
      kinds_used: kindsUsed,
      engagement_signal: engagement,
    }
    await supabase.from('weekly_recaps').upsert(recap, { onConflict: 'user_id,week_start' })
    setSaving(false)
    localStorage.setItem(`showo_recap_${userId}_${weekStart}`, '1')
    setSavedData(recap)
    onSaved?.(recap)
  }

  if (savedData) {
    return (
      <div className="recap-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
        <div className="recap-modal recap-modal--success" role="dialog" aria-modal="true">
          <button className="recap-close" onClick={onClose} aria-label="Fechar"><X size={16} /></button>

          <div className="recap-success-icon">
            <CheckCircle size={32} />
          </div>
          <h2 className="recap-success-title">Recap guardado!</h2>
          <p className="recap-success-sub">Semana de {weekLabel(weekStart)}</p>

          <div className="recap-success-stats">
            <div className="recap-success-stat">
              <span className="recap-success-stat-val">{savedData.entry_count}</span>
              <span className="recap-success-stat-lbl">registos</span>
            </div>
            <div className="recap-success-stat">
              <span className="recap-success-stat-val" style={{ color: engagementColor }}>{engagementLabel}</span>
              <span className="recap-success-stat-lbl">engagement</span>
            </div>
            <div className="recap-success-stat">
              <span className="recap-success-stat-val"><Flame size={15} style={{ display:'inline', marginRight:2 }} />{streak}</span>
              <span className="recap-success-stat-lbl">semanas seguidas</span>
            </div>
          </div>

          {savedData.reflection && (
            <blockquote className="recap-success-quote">
              "{savedData.reflection}"
            </blockquote>
          )}

          <p className="recap-success-note">
            {engagement >= 70
              ? 'Diário variado e consistente esta semana. O teu potencial subiu.'
              : engagement >= 40
              ? 'Bom ritmo. Espalhar mais os registos ao longo da semana sobe ainda mais.'
              : 'Um registo por sessão de trabalho é suficiente para manter o ritmo.'}
          </p>

          <p className="recap-success-hint">
            <BookOpen size={13} /> O recap fica visível na dashboard para acompanhares o teu progresso.
          </p>

          <button className="recap-btn recap-btn--primary" style={{ width: '100%', marginTop: 4 }} onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="recap-backdrop" onClick={e => { if (e.target === e.currentTarget) dismiss() }}>
      <div className="recap-modal" role="dialog" aria-modal="true" aria-label="Recap da semana">

        <button className="recap-close" onClick={dismiss} aria-label="Fechar recap">
          <X size={16} />
        </button>

        <header className="recap-header">
          <span className="recap-pill">Recap · {weekLabel(weekStart)}</span>
          <h2 className="recap-title">Como correu esta semana?</h2>
          {project && <p className="recap-subtitle">{project.name}</p>}
        </header>

        <div className="recap-stats">
          <div className="recap-stat">
            <span className="recap-stat-value">{weekEntries.length}</span>
            <span className="recap-stat-label">registo{weekEntries.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="recap-stat">
            <span className="recap-stat-value">{activeDays}</span>
            <span className="recap-stat-label">dia{activeDays !== 1 ? 's' : ''} ativo{activeDays !== 1 ? 's' : ''}</span>
          </div>
          <div className="recap-stat">
            <span className="recap-stat-value">
              <Flame size={15} style={{ display: 'inline', marginRight: 2 }} />{streak}
            </span>
            <span className="recap-stat-label">semanas seguidas</span>
          </div>
          <div className="recap-stat">
            <span className="recap-stat-value" style={{ color: engagementColor }}>{engagementLabel}</span>
            <span className="recap-stat-label">engagement</span>
          </div>
        </div>

        {kindsUsed.length > 0 && (
          <div className="recap-kinds">
            {kindsUsed.map(id => {
              const k = KIND_BY_ID[id]
              if (!k) return null
              const Icon = k.icon
              return (
                <span key={id} className="recap-kind-chip">
                  <Icon size={11} />{k.label}
                </span>
              )
            })}
          </div>
        )}

        <p className="recap-engagement-note">
          {weekEntries.length === 0
            ? 'Esta semana não registaste nada. Um registo curto agora ainda conta para a semana.'
            : engagement >= 70
            ? 'Diário variado e distribuído ao longo da semana — isso alimenta o teu potencial na plataforma.'
            : engagement >= 40
            ? 'Bom ritmo. Registar em dias diferentes e variar os tipos (decisões, dificuldades) sobe ainda mais.'
            : 'Poucos registos ou muito concentrados num dia. Uma linha por sessão de trabalho é o suficiente.'}
        </p>

        <div className="recap-reflection">
          <label className="recap-reflection-label" htmlFor="recap-reflection-input">
            O que correu melhor esta semana?
          </label>
          <textarea
            id="recap-reflection-input"
            className="recap-reflection-input"
            placeholder="Escreve uma linha — fica guardado e ajuda a acompanhar o teu progresso real."
            value={reflection}
            onChange={e => setReflection(e.target.value)}
            rows={3}
            maxLength={500}
          />
          <span className="recap-char-count">{reflection.length}/500</span>
        </div>

        <div className="recap-actions">
          <button className="recap-btn recap-btn--primary" onClick={save} disabled={saving}>
            {saving ? 'A guardar…' : 'Guardar recap'}
          </button>
          <button className="recap-btn recap-btn--quiet" onClick={dismiss}>
            Agora não
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Painel de histórico de recaps na dashboard ── */
export function RecapsPanel({ recaps }) {
  if (!recaps.length) return null

  /* barra de engagement: verde/azul/laranja com largura proporcional ao sinal */
  function engBar(signal) {
    const pct = signal ?? 0
    const color = pct >= 70 ? 'var(--color-success)' : pct >= 40 ? 'var(--color-primary)' : 'var(--color-warning)'
    return { pct, color }
  }

  return (
    <section className="sdb-panel sdb-o-recaps">
      {/* cabeçalho azul da marca */}
      <header className="rp-header">
        <div className="rp-header-left">
          <span className="rp-icon"><Sparkles size={14} /></span>
          <div>
            <div className="rp-title">Recaps semanais</div>
            <div className="rp-sub">{recaps.length} semana{recaps.length !== 1 ? 's' : ''} registadas</div>
          </div>
        </div>
      </header>

      <ul className="rp-list">
        {recaps.map(r => {
          const { pct, color } = engBar(r.engagement_signal)
          const engLabel = pct >= 70 ? 'Alto' : pct >= 40 ? 'Médio' : 'Baixo'
          return (
            <li key={r.id} className="rp-item">
              {/* barra lateral colorida por engagement */}
              <span className="rp-item-bar" style={{ background: color }} />

              <div className="rp-item-body">
                <div className="rp-item-top">
                  <span className="rp-item-week">{weekLabel(r.week_start)}</span>
                  <span className="rp-item-eng" style={{ color }}>{engLabel}</span>
                </div>

                {/* mini barra de progresso */}
                <div className="rp-item-track">
                  <span className="rp-item-fill" style={{ width: `${pct}%`, background: color }} />
                </div>

                <div className="rp-item-meta">
                  <span className="rp-item-chip">
                    <BookOpen size={10} /> {r.entry_count} registo{r.entry_count !== 1 ? 's' : ''}
                  </span>
                  {r.kinds_used?.length > 0 && (
                    <span className="rp-item-chip">
                      {r.kinds_used.length} tipo{r.kinds_used.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                {r.reflection && (
                  <p className="rp-item-quote">"{r.reflection}"</p>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
