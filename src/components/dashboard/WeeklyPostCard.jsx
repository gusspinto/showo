import { useState, useMemo } from 'react'
import { weekStartISO } from '../../lib/journal'
import LinkedInPostModal from '../LinkedInPostModal'
import Button from '../ui/Button'

const LinkedInMark = ({ size = 17 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
    <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.55C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.72C24 .77 23.2 0 22.22 0z"/>
  </svg>
)

/* Cartão "Post da semana" na dashboard.

   Aparece só quando a semana atual (segunda até agora) teve substância — 3+
   registos no diário do projeto em foco — e o projeto está público (senão o
   link do post não abre nada). É o par, dentro da app, do bloco que vai no
   email de segunda: mesma ideia, mesmo gate. */

const SUBSTANTIVE_MIN = 3

export default function WeeklyPostCard({ project, entries = [], streak = 0 }) {
  const [open, setOpen] = useState(false)

  const weekEntries = useMemo(() => {
    const monday = new Date(weekStartISO() + 'T00:00:00')
    return entries.filter(e => new Date(e.created_at) >= monday)
  }, [entries])

  const isPublic = !project?.visibility || project.visibility === 'public'
  if (!project || !isPublic || weekEntries.length < SUBSTANTIVE_MIN) return null

  const activeDays = new Set(weekEntries.map(e => e.created_at.slice(0, 10))).size

  const payload = {
    projectName: project.name,
    projectUrl: `${window.location.origin}/projeto/${project.slug}`,
    entryCount: weekEntries.length,
    activeDays,
    streak,
    entries: weekEntries.map(e => ({ kind: e.kind, text: e.content || '' })).filter(e => e.text),
  }

  return (
    <section className="sdb-panel">
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <span style={{
          flexShrink: 0, width: 34, height: 34, borderRadius: 'var(--radius-md)',
          background: 'var(--color-primary-subtle)', color: 'var(--color-primary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <LinkedInMark size={17} />
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{ margin: 0, fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>
            Post da semana
          </p>
          <p style={{ margin: '3px 0 0', fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', lineHeight: 1.55 }}>
            {weekEntries.length} registos em {project.name} esta semana. Transforma isso num post de progresso para o LinkedIn.
          </p>
          <Button size="sm" onClick={() => setOpen(true)} style={{ marginTop: 10 }}>
            Gerar post
          </Button>
        </div>
      </div>

      {open && (
        <LinkedInPostModal mode="weekly" payload={payload} onClose={() => setOpen(false)} />
      )}
    </section>
  )
}
