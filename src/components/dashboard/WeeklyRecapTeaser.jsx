import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CloseIcon as X } from '@solar-icons/react/bold/close'
import { CalendarMarkIcon as CalendarMark } from '@solar-icons/react/bold/calendar-mark'

/* Teaser do recap semanal automático (feature "weeklyRecap", a partir do
   Plus) para quem está no Grátis — mostra um exemplo real do que a conta
   recebe por email todas as segundas (stat tiles de registos/dias ativos/
   tipo de trabalho, não uma redação gerada por IA: é isso que o recap
   realmente é, ver supabase/functions/send-weekly-recap).

   Usa o painel de marca (sdb-panel--brand, o mesmo gradiente azul do
   cartão "Experimenta o Plus"). Os números sobem de 0 até ao valor real
   e os cartões entram em cascata, uma vez, ao aparecer — "parece uma
   coisa viva a acontecer", em vez de texto estático só com boa cor. Uma
   única sequência ao montar, nunca em loop (ninguém quer isto a animar
   sem parar numa dashboard que se olha todos os dias). Respeita
   prefers-reduced-motion: mostra os valores finais de imediato.
   Só para B2C (isSchoolAccount já filtra antes de renderizar).
   Dispensável, guarda a escolha em localStorage. */

function useCountUp(target, { delay = 0, duration = 700 } = {}) {
  const [value, setValue] = useState(0)
  const reduced = useRef(typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches).current

  useEffect(() => {
    if (reduced) { setValue(target); return }
    let raf, start
    const timer = setTimeout(() => {
      function tick(ts) {
        if (!start) start = ts
        const p = Math.min(1, (ts - start) / duration)
        const eased = 1 - (1 - p) * (1 - p) // ease-out quad
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

function Stat({ target, label, delay }) {
  const value = useCountUp(target, { delay })
  return (
    <div className="recap-teaser-stat" style={{
      flex: 1, padding: '12px 8px', textAlign: 'center', borderRadius: 10,
      background: 'var(--on-fill)', border: '1px solid var(--on-line)',
      animationDelay: `${delay}ms`,
    }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--on)', lineHeight: 1, fontFamily: 'var(--font-heading)', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      <div style={{ fontSize: 10.5, color: 'var(--on-dim)', marginTop: 5, textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>{label}</div>
    </div>
  )
}

export default function WeeklyRecapTeaser({ userId, onDismiss }) {
  const navigate = useNavigate()
  const key = `showo_recap_teaser_dismissed_${userId}`

  function dismiss() {
    try { localStorage.setItem(key, '1') } catch { /* ignore */ }
    onDismiss()
  }

  return (
    <section className="sdb-panel sdb-panel--brand" style={{ position: 'relative' }}>
      <style>{`
        @keyframes recap-teaser-pop {
          from { opacity: 0; transform: translateY(6px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes recap-teaser-fade {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .recap-teaser-stat { animation: recap-teaser-pop 0.45s cubic-bezier(0.16,1,0.3,1) backwards; }
        .recap-teaser-quote { animation: recap-teaser-fade 0.5s ease-out 0.75s backwards; }
        @media (prefers-reduced-motion: reduce) {
          .recap-teaser-stat, .recap-teaser-quote { animation: none; }
        }
      `}</style>

      <button
        onClick={dismiss}
        aria-label="Dispensar"
        style={{ position: 'absolute', top: 14, right: 14, background: 'var(--on-fill)', border: 'none', borderRadius: 7, cursor: 'pointer', color: 'var(--on-dim)', padding: 5, display: 'flex' }}
      ><X size={14} /></button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, paddingRight: 28 }}>
        <span style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--on-fill)', border: '1px solid var(--on-line)', color: 'var(--on)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <CalendarMark size={16} />
        </span>
        <p style={{ margin: 0, fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--on)', fontFamily: 'var(--font-heading)', lineHeight: 1.3 }}>
          O que recebes todas as segundas a partir do Plus
        </p>
      </div>

      <p style={{ margin: '0 0 14px', fontSize: 'var(--text-sm)', color: 'var(--on-dim)', lineHeight: 1.55 }}>
        Um email automático com o que avançaste na semana, gerado a partir do diário — sem teres de escrever nada.
      </p>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--on)', background: 'var(--on-fill)', border: '1px solid var(--on-line)', padding: '2px 8px', borderRadius: 100, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Exemplo real</span>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <Stat target={5} label="registos" delay={0} />
        <Stat target={4} label="dias ativos" delay={120} />
        <Stat target={12} label="dias p/ defesa" delay={240} />
      </div>
      <p className="recap-teaser-quote" style={{ margin: '0 0 18px', fontSize: 12.5, color: 'var(--on-dim)', fontStyle: 'italic', lineHeight: 1.5, borderLeft: '2px solid var(--on-line)', paddingLeft: 10 }}>
        "Em DragBuild, registaste 5 entradas em 4 dias diferentes — sobretudo progresso, decisões."
      </p>

      <button
        onClick={() => navigate('/pricing')}
        style={{ fontSize: 13, fontWeight: 700, padding: '10px 20px', borderRadius: 100, border: 'none', background: '#fff', color: 'var(--color-primary-deep)', cursor: 'pointer', fontFamily: 'inherit', transition: 'opacity 0.15s' }}
        onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
        onMouseLeave={e => e.currentTarget.style.opacity = '1'}
      >
        Ver planos
      </button>
    </section>
  )
}
