import { useEffect, useRef, useState } from 'react'
import { CloseIcon as X } from '@solar-icons/react/bold/close'

// Mesmo logótipo do LinkedIn usado em PlanGate.jsx (LinkedInPostPreview),
// para o cartão e o popup falarem a mesma linguagem visual.
const LinkedInMark = ({ size = 17 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
    <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.55C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.72C24 .77 23.2 0 22.22 0z"/>
  </svg>
)

/* Teaser do recap semanal automático (feature "weeklyRecap", a partir do
   Plus), na coluna lateral por baixo da Agenda. O Gustavo pediu aqui, não na
   coluna principal: um cartão largo (linha com ícone+texto+botão lado a
   lado) ficava bem numa coluna larga, mas espremido nos ~300px da Agenda
   quebrava linha várias vezes e o botão ficava órfão. Por isso fica
   empilhado (ícone+título, depois números, depois botão largura toda), já
   pensado para esta largura, não adaptado de uma versão horizontal.

   A versão completa (email real + exemplo do post) vive só dentro do popup
   de upgrade (PlanGate.jsx, FeaturePreview feature="weeklyRecap"), aberto
   ao clicar aqui.

   Números sobem de 0 ao valor real ao aparecer, uma vez só, nunca em loop.
   Respeita prefers-reduced-motion. Só para B2C (isSchoolAccount já filtra
   antes de renderizar). Dispensável, guarda em localStorage. */

function useCountUp(target, { delay = 0, duration = 600 } = {}) {
  const [value, setValue] = useState(0)
  const reduced = useRef(typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches).current

  useEffect(() => {
    if (reduced) { setValue(target); return }
    let raf, start
    const timer = setTimeout(() => {
      function tick(ts) {
        if (!start) start = ts
        const p = Math.min(1, (ts - start) / duration)
        const eased = 1 - (1 - p) * (1 - p)
        setValue(Math.round(eased * target))
        if (p < 1) raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
    }, delay)
    return () => { clearTimeout(timer); if (raf) cancelAnimationFrame(raf) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target])

  return value
}

function Num({ target, delay, accent }) {
  const value = useCountUp(target, { delay })
  return <strong style={{ color: accent || 'var(--on)', fontVariantNumeric: 'tabular-nums' }}>{value}</strong>
}

export default function WeeklyRecapTeaser({ userId, onDismiss, onUpgrade }) {
  const key = `showo_recap_teaser_dismissed_${userId}`

  function dismiss() {
    try { localStorage.setItem(key, '1') } catch { /* ignore */ }
    onDismiss()
  }

  return (
    <section className="sdb-panel sdb-panel--brand recap-teaser-side" style={{ position: 'relative' }}>
      <style>{`
        @keyframes recap-teaser-fade {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .recap-teaser-side { animation: recap-teaser-fade 0.4s ease-out backwards; }
        @media (prefers-reduced-motion: reduce) {
          .recap-teaser-side { animation: none; }
        }
      `}</style>

      {/* width/height/minHeight explícitos: a regra global de mobile
          (button { min-height: 44px }) esticava este botão só-ícone para
          um retângulo alto e estreito à volta do X. */}
      <button
        onClick={dismiss}
        aria-label="Dispensar"
        style={{ position: 'absolute', top: 10, right: 10, width: 26, height: 26, minHeight: 26, background: 'var(--on-fill)', border: 'none', borderRadius: 7, cursor: 'pointer', color: 'var(--on-dim)', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}
      ><X size={12} /></button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, paddingRight: 24 }}>
        <span style={{ width: 30, height: 30, borderRadius: 9, background: '#0A66C2', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <LinkedInMark size={15} />
        </span>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--on)', fontFamily: 'var(--font-heading)', lineHeight: 1.3 }}>
          Mostra <span style={{ color: '#f0a500' }}>provas reais</span> da tua consistência
        </p>
      </div>

      <p style={{ margin: '0 0 14px', fontSize: 11, color: 'var(--on-dim)', lineHeight: 1.5 }}>
        <Num target={5} delay={0} /> registos · <Num target={4} delay={80} /> dias ativos · <Num target={3} delay={160} accent="#f0a500" />ª semana seguida, por email toda a segunda.
      </p>

      <button
        onClick={onUpgrade}
        style={{ width: '100%', fontSize: 12.5, fontWeight: 700, padding: '9px 16px', borderRadius: 100, border: 'none', background: '#fff', color: 'var(--color-primary-deep)', cursor: 'pointer', fontFamily: 'inherit', transition: 'opacity 0.15s' }}
        onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
        onMouseLeave={e => e.currentTarget.style.opacity = '1'}
      >
        Ver como
      </button>
    </section>
  )
}
