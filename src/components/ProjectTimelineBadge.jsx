// Resumo compacto do Percurso, para o topo da página — um recrutador não
// devia ter de descer até ao fundo (onde o card completo do Percurso vive,
// a seguir aos comentários) só para saber se o projeto é consistente ou
// se já está concluído. Faz a sua própria chamada leve (get_project_timeline
// já se protege sozinho por timeline_public) em vez de duplicar o estado
// do ProjectTimeline — os dois só coexistem na mesma página public.
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { FireIcon as Fire } from '@solar-icons/react/bold/fire'
import { CheckCircleIcon as Check } from '@solar-icons/react/bold/check-circle'

export default function ProjectTimelineBadge({ project }) {
  const [tl, setTl] = useState(undefined)

  useEffect(() => {
    if (!project.timeline_public) { setTl(null); return }
    let cancelled = false
    supabase.rpc('get_project_timeline', { p_project_id: project.id }).then(({ data }) => {
      if (!cancelled) setTl(data ?? null)
    })
    return () => { cancelled = true }
  }, [project.id, project.timeline_public])

  const finished = !!project.project_finished_on
  const activeWeeks = tl?.active_weeks || 0
  // Nada a dizer: nem concluído, nem consistência que valha a pena mostrar.
  if (!finished && activeWeeks < 3) return null

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '0 0 16px' }}>
      {finished && (
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '5px 12px', borderRadius: 999,
          background: 'var(--color-success-subtle)', color: 'var(--color-success)',
          fontSize: 12, fontWeight: 700,
        }}>
          <Check size={13} /> Projeto concluído
        </span>
      )}
      {activeWeeks >= 3 && (
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '5px 12px', borderRadius: 999,
          background: 'var(--color-warning-subtle)', color: 'var(--color-warning)',
          fontSize: 12, fontWeight: 700,
        }}>
          <Fire size={13} /> {activeWeeks} semanas de acompanhamento
        </span>
      )}
    </div>
  )
}
