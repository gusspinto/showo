import { useEffect, useRef, useState } from 'react'
import { CloseIcon as X } from '@solar-icons/react/bold/close'

// Mesmo logótipo do LinkedIn usado em PlanGate.jsx (LinkedInPostPreview),
// para a faixa e o popup falarem a mesma linguagem visual.
const LinkedInMark = ({ size = 17 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
    <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.55C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.72C24 .77 23.2 0 22.22 0z"/>
  </svg>
)

/* Teaser do recap semanal automático (feature "weeklyRecap", a partir do
   Plus) para quem está no Grátis. Já teve uma versão grande (réplica do
   email + exemplo do post de LinkedIn, ~600px de altura), o Gustavo
   apontou que ocupava demasiado ecrã, escondia o resto do dashboard. A
   versão completa (email real + exemplo do post) agora vive só dentro do
   popup de upgrade (PlanGate.jsx, FeaturePreview feature="weeklyRecap"),
   aberto ao clicar aqui. Isto fica como uma faixa compacta: ícone,
   frase, números inline, botão, chama a atenção sem ocupar a tela.

   Números sobem de 0 ao valor real ao aparecer, uma vez só, nunca em
   loop. Respeita prefers-reduced-motion. Só para B2C (isSchoolAccount já
   filtra antes de renderizar). Dispensável, guarda em localStorage. */

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
    <section className="sdb-panel sdb-panel--brand recap-teaser-bar" style={{ position: 'relative' }}>
      <style>{`
        @keyframes recap-teaser-fade {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .recap-teaser-bar { animation: recap-teaser-fade 0.4s ease-out backwards; }
        .recap-teaser-bar-row {
          display: flex; align-items: center; gap: 14px; flex-wrap: wrap;
        }
        .recap-teaser-bar-cta { flex-shrink: 0; margin-left: auto; }
        @media (prefers-reduced-motion: reduce) {
          .recap-teaser-bar { animation: none; }
        }
        /* O botão herdava o min-height:44px global de toque mínimo
           (regra em index.css, correta para botões normais), o que o
           esticava na vertical para um retângulo alto em vez do quadrado
           pequeno pretendido, apontado pelo Gustavo. Tamanho fixo aqui
           resolve isso; a área de toque mantém-se grande, só que
           invisível, via ::before, em vez de esticar o botão visível. */
        .recap-teaser-dismiss {
          width: 21px; height: 21px; min-height: 0;
        }
        .recap-teaser-dismiss::before {
          content: ''; position: absolute; inset: -10px;
        }
      `}</style>

      <button
        onClick={dismiss}
        aria-label="Dispensar"
        className="recap-teaser-dismiss"
        style={{ position: 'absolute', top: 10, right: 10, background: 'var(--on-fill)', border: 'none', borderRadius: 7, cursor: 'pointer', color: 'var(--on-dim)', padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}
      ><X size={13} /></button>

      <div className="recap-teaser-bar-row" style={{ paddingRight: 24 }}>
        <span style={{ width: 36, height: 36, borderRadius: 10, background: '#0A66C2', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <LinkedInMark size={18} />
        </span>

        <div style={{ minWidth: 0, flex: '1 1 260px' }}>
          <p style={{ margin: '0 0 2px', fontSize: 13.5, fontWeight: 700, color: 'var(--on)', fontFamily: 'var(--font-heading)', lineHeight: 1.3 }}>
            Mostra <span style={{ color: '#f0a500' }}>provas reais</span> da tua consistência a professores e recrutadores
          </p>
          <p style={{ margin: 0, fontSize: 11.5, color: 'var(--on-dim)', lineHeight: 1.4 }}>
            <Num target={5} delay={0} /> registos · <Num target={4} delay={80} /> dias ativos · <Num target={3} delay={160} accent="#f0a500" />ª semana seguida, por email toda a segunda
          </p>
        </div>

        <button
          onClick={onUpgrade}
          className="recap-teaser-bar-cta"
          style={{ fontSize: 12.5, fontWeight: 700, padding: '8px 16px', borderRadius: 100, border: 'none', background: '#fff', color: 'var(--color-primary-deep)', cursor: 'pointer', fontFamily: 'inherit', transition: 'opacity 0.15s', whiteSpace: 'nowrap' }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          Ver como
        </button>
      </div>
    </section>
  )
}
