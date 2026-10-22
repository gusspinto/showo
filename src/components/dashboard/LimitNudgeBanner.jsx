import { CloseIcon as X } from '@solar-icons/react/bold/close'
import { DangerTriangleIcon as AlertTriangle } from '@solar-icons/react/bold/danger-triangle'
import { AI_FEATURE_LABELS } from '../../lib/plans'

/* Faixa visível para o aviso de limite quase esgotado (>=70% usado), plano
   grátis. O evento nudge_shown já existia e disparava corretamente, mas não
   havia nenhum elemento na página a mostrar isto à pessoa, só ficava
   registado para o funil do Admin ver. Modelada em WeeklyRecapTeaser.jsx,
   mesmo padrão de faixa compacta e dispensável. Dispensa por mês, volta a
   aparecer se o sinal persistir no mês seguinte. */

export default function LimitNudgeBanner({ userId, feature, used, limit, onDismiss, onUpgrade }) {
  const key = `showo_nudge_banner_dismissed_${userId}_${new Date().toISOString().slice(0, 7)}`
  const label = AI_FEATURE_LABELS[feature] || feature

  function dismiss() {
    try { localStorage.setItem(key, '1') } catch { /* ignore */ }
    onDismiss()
  }

  return (
    <section className="sdb-panel limit-nudge-bar" style={{ position: 'relative', borderColor: 'var(--color-warning-subtle)' }}>
      <style>{`
        @keyframes limit-nudge-fade {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .limit-nudge-bar { animation: limit-nudge-fade 0.4s ease-out backwards; }
        .limit-nudge-bar-row {
          display: flex; align-items: center; gap: 14px; flex-wrap: wrap;
        }
        .limit-nudge-bar-cta { flex-shrink: 0; margin-left: auto; }
        @media (prefers-reduced-motion: reduce) {
          .limit-nudge-bar { animation: none; }
        }
      `}</style>

      <button
        onClick={dismiss}
        aria-label="Dispensar"
        style={{ position: 'absolute', top: 10, right: 10, background: 'var(--color-bg-alt)', border: 'none', borderRadius: 7, cursor: 'pointer', color: 'var(--color-text-secondary)', padding: 4, display: 'flex', zIndex: 1 }}
      ><X size={13} /></button>

      <div className="limit-nudge-bar-row" style={{ paddingRight: 24 }}>
        <span style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--color-warning-subtle)', color: 'var(--color-warning)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <AlertTriangle size={18} />
        </span>

        <div style={{ minWidth: 0, flex: '1 1 260px' }}>
          <p style={{ margin: '0 0 2px', fontSize: 13.5, fontWeight: 700, color: 'var(--color-text)', fontFamily: 'var(--font-heading)', lineHeight: 1.3 }}>
            Estás quase a esgotar <span style={{ color: 'var(--color-warning)' }}>{label}</span> este mês
          </p>
          <p style={{ margin: 0, fontSize: 11.5, color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
            Usaste {used} de {limit}. O limite renova só no início do próximo mês.
          </p>
        </div>

        <button
          onClick={onUpgrade}
          className="limit-nudge-bar-cta"
          style={{ fontSize: 12.5, fontWeight: 700, padding: '8px 16px', borderRadius: 100, border: 'none', background: 'var(--color-warning)', color: '#fff', cursor: 'pointer', fontFamily: 'inherit', transition: 'opacity 0.15s', whiteSpace: 'nowrap' }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          Ver planos
        </button>
      </div>
    </section>
  )
}
