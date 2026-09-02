import './StudentRoster.css'

const STATUS = {
  needs_review: { color: 'var(--color-primary)', label: 'À espera da tua revisão' },
  stalled:      { color: 'var(--color-error)',   label: 'Parado' },
  slowing:      { color: 'var(--color-warning)', label: 'Abrandou' },
  no_project:   { color: 'var(--color-text-tertiary)', label: 'Sem projeto' },
  on_track:     { color: 'var(--color-success)', label: 'Em dia' },
}

function Ring({ value, color }) {
  const r = 13
  const c = 2 * Math.PI * r
  const off = c * (1 - value / 100)
  return (
    <svg className="sr-ring" width="32" height="32" viewBox="0 0 32 32">
      <circle cx="16" cy="16" r={r} fill="none" stroke="var(--color-border)" strokeWidth="3" />
      <circle
        cx="16" cy="16" r={r} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={off} transform="rotate(-90 16 16)"
      />
      <text x="16" y="17" textAnchor="middle" dominantBaseline="middle" fontSize="9" fontWeight="700" fill="var(--color-text-secondary)">
        {value}
      </text>
    </svg>
  )
}

function Avatar({ url, name }) {
  if (url) return <img className="sr-avatar" src={url} alt="" />
  return <span className="sr-avatar sr-avatar--ph">{(name || '?')[0].toUpperCase()}</span>
}

function activityLabel(status, daysSince) {
  if (status === 'no_project') return 'ainda não entregou'
  if (daysSince == null) return ''
  if (daysSince <= 0) return 'mexeu hoje'
  if (daysSince === 1) return 'há 1 dia'
  if (daysSince < 7) return `há ${daysSince} dias`
  if (daysSince < 14) return `há ${Math.floor(daysSince / 7)} semana`
  return `há ${Math.floor(daysSince / 7)} semanas`
}

export default function StudentRoster({ students, showClass, onOpenProject }) {
  if (!students?.length) return null

  return (
    <div className="sr-grid">
      {students.map(s => {
        const st = STATUS[s.status] || STATUS.on_track
        const clickable = !!s.project
        return (
          <div
            key={s.user_id}
            className={`sr-card${clickable ? ' sr-card--click' : ''}`}
            onClick={clickable ? () => onOpenProject?.(s.project.slug) : undefined}
            role={clickable ? 'button' : undefined}
            tabIndex={clickable ? 0 : undefined}
            onKeyDown={clickable ? e => { if (e.key === 'Enter') onOpenProject?.(s.project.slug) } : undefined}
          >
            <div className="sr-top">
              <Avatar url={s.avatar_url} name={s.name} />
              <div className="sr-id">
                <div className="sr-name">{s.name}</div>
                <div className="sr-proj">
                  {s.project ? s.project.name : 'Sem projeto'}
                  {showClass && s.className ? ` · ${s.className}` : ''}
                </div>
              </div>
              {s.project && <Ring value={s.completude} color={st.color} />}
            </div>
            <div className="sr-foot">
              <span className="sr-dot" style={{ background: st.color }} />
              <span className="sr-status">{st.label}</span>
              <span className="sr-when">{activityLabel(s.status, s.daysSince)}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
