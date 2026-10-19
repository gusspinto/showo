import { useEffect, useRef, useState } from 'react'
import { CloseIcon as X } from '@solar-icons/react/bold/close'
import { LetterIcon as Mail } from '@solar-icons/react/bold/letter'

/* Teaser do recap semanal automático (feature "weeklyRecap", a partir do
   Plus) para quem está no Grátis. Em vez de um cartão azul genérico com
   ícone+checklist (o padrão "AI slop" que o Gustavo apontou — bonito mas
   sem nada concreto), isto mostra uma réplica fiel do email real que a
   conta recebe toda a segunda: mesmo fundo quase-preto, mesma eyebrow em
   maiúsculas, mesmo estilo de stat tile (#0e1729/#1e3050), ver
   supabase/functions/send-weekly-recap. É uma janela de email dentro do
   cartão de marca, não um cartão a mais — a pessoa vê literalmente o que
   vai cair na caixa de entrada dela, não uma promessa abstrata.

   Números sobem de 0 ao valor real ao aparecer, uma vez só, nunca em
   loop. Respeita prefers-reduced-motion. Só para B2C (isSchoolAccount já
   filtra antes de renderizar). Dispensável, guarda em localStorage. */

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

function EmailStat({ target, label, delay, accent }) {
  const value = useCountUp(target, { delay })
  return (
    <div className="recap-teaser-stat" style={{
      flex: 1, padding: '12px 6px', textAlign: 'center', borderRadius: 8,
      background: '#0e1729', border: '1px solid #1e3050', animationDelay: `${delay}ms`,
    }}>
      <div style={{ fontSize: 21, fontWeight: 700, color: accent || '#eef2f8', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      <div style={{ fontSize: 9.5, color: '#7d93b0', marginTop: 5 }}>{label}</div>
    </div>
  )
}

export default function WeeklyRecapTeaser({ userId, onDismiss, onUpgrade }) {
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
        @keyframes recap-teaser-window {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .recap-teaser-window { animation: recap-teaser-window 0.5s cubic-bezier(0.16,1,0.3,1) backwards; }
        .recap-teaser-stat { animation: recap-teaser-pop 0.45s cubic-bezier(0.16,1,0.3,1) backwards; }
        .recap-teaser-quote { animation: recap-teaser-fade 0.5s ease-out 0.85s backwards; }
        @media (prefers-reduced-motion: reduce) {
          .recap-teaser-stat, .recap-teaser-quote, .recap-teaser-window { animation: none; }
        }
      `}</style>

      <button
        onClick={dismiss}
        aria-label="Dispensar"
        style={{ position: 'absolute', top: 14, right: 14, background: 'var(--on-fill)', border: 'none', borderRadius: 7, cursor: 'pointer', color: 'var(--on-dim)', padding: 5, display: 'flex', zIndex: 1 }}
      ><X size={14} /></button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, paddingRight: 28 }}>
        <span style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--on-fill)', border: '1px solid var(--on-line)', color: 'var(--on)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Mail size={16} />
        </span>
        <p style={{ margin: 0, fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--on)', fontFamily: 'var(--font-heading)', lineHeight: 1.3 }}>
          Isto cai na tua caixa de entrada toda a segunda, a partir do Plus
        </p>
      </div>

      {/* Réplica do email real — não é decoração, é literalmente o que a
          conta recebe (mesmas cores e estrutura de send-weekly-recap). */}
      <div className="recap-teaser-window" style={{ background: '#03060d', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '14px 16px 16px', margin: '14px 0 12px', boxShadow: '0 12px 28px rgba(0,0,0,0.35)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#ff5f57' }} />
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#febc2e' }} />
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#28c840' }} />
          <span style={{ fontSize: 10, color: '#5a6b85', marginLeft: 4 }}>hello@showo.pt · segunda-feira, 08:00</span>
        </div>
        <p style={{ margin: '0 0 4px', color: '#7d93b0', fontSize: 10, textAlign: 'center', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700 }}>
          Recap · 13 – 19 out
        </p>
        <p style={{ margin: '0 0 14px', color: '#eef2f8', fontSize: 16, lineHeight: 1.3, textAlign: 'center', fontWeight: 700 }}>
          5 registos na semana passada
        </p>
        <div style={{ display: 'flex', gap: 7 }}>
          <EmailStat target={5} label="registos" delay={0} />
          <EmailStat target={4} label="dias ativos" delay={120} />
          <EmailStat target={3} label="semanas seguidas" delay={240} accent="#f0a500" />
        </div>
      </div>

      <p className="recap-teaser-quote" style={{ margin: '0 0 16px', fontSize: 12, color: 'var(--on-dim)', lineHeight: 1.5 }}>
        Gerado sozinho a partir do que já escreves no diário — zero esforço extra, e não é texto inventado por IA: são os teus números reais.
      </p>

      <button
        onClick={onUpgrade}
        style={{ fontSize: 13, fontWeight: 700, padding: '10px 20px', borderRadius: 100, border: 'none', background: '#fff', color: 'var(--color-primary-deep)', cursor: 'pointer', fontFamily: 'inherit', transition: 'opacity 0.15s' }}
        onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
        onMouseLeave={e => e.currentTarget.style.opacity = '1'}
      >
        Ver planos
      </button>
    </section>
  )
}
