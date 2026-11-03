import { StarIcon as Star } from '@solar-icons/react/bold/star'

/* Notificação in-app para quando um projeto é destacado numa semana nova.
   Diferente do popup único (featured_popup_seen_at, só dispara a primeira
   vez na vida da conta): esta faixa volta a aparecer em CADA semana nova de
   destaque, comparando featured_weeks.week_start com profiles.featured_week_seen.
   Pedido explícito do Gustavo: alavanca de retenção in-app, sem ser email. */

export default function FeaturedWeekBanner({ projectName, onDismiss }) {
  return (
    <section className="sdb-panel featured-week-bar" style={{ position: 'relative', borderColor: 'var(--color-accent-subtle)' }}>
      <style>{`
        @keyframes featured-week-fade {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .featured-week-bar { animation: featured-week-fade 0.4s ease-out backwards; }
        .featured-week-bar-row { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
        .featured-week-bar-cta { flex-shrink: 0; margin-left: auto; }
        @media (prefers-reduced-motion: reduce) {
          .featured-week-bar { animation: none; }
        }
      `}</style>

      <div className="featured-week-bar-row" style={{ paddingRight: 8 }}>
        <span style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--color-accent-subtle)', color: 'var(--color-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Star size={18} />
        </span>

        <div style={{ minWidth: 0, flex: '1 1 260px' }}>
          <p style={{ margin: '0 0 2px', fontSize: 13.5, fontWeight: 700, color: 'var(--color-text)', fontFamily: 'var(--font-heading)', lineHeight: 1.3 }}>
            O teu projeto {projectName} está em destaque esta semana
          </p>
          <p style={{ margin: 0, fontSize: 11.5, color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
            Mais pessoas vão ver este projeto no Explorar nos próximos dias.
          </p>
        </div>

        <button
          onClick={onDismiss}
          className="featured-week-bar-cta"
          style={{ fontSize: 12.5, fontWeight: 700, padding: '8px 16px', borderRadius: 100, border: 'none', background: 'var(--color-accent)', color: '#fff', cursor: 'pointer', fontFamily: 'inherit', transition: 'opacity 0.15s', whiteSpace: 'nowrap' }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          Fixe
        </button>
      </div>
    </section>
  )
}
