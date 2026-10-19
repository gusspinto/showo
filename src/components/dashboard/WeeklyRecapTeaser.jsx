import { useEffect, useRef, useState } from 'react'
import { CloseIcon as X } from '@solar-icons/react/bold/close'
import { LetterIcon as Mail } from '@solar-icons/react/bold/letter'
import { AltArrowDownIcon as ArrowDown } from '@solar-icons/react/bold/alt-arrow-down'
import { LikeIcon as ThumbUp } from '@solar-icons/react/bold/like'

const LinkedInMark = ({ size = 14 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
    <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.55C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.72C24 .77 23.2 0 22.22 0z"/>
  </svg>
)

/* Teaser do recap semanal automático (feature "weeklyRecap", a partir do
   Plus) para quem está no Grátis. Mostra dois ecrãs em sequência, cada um
   uma réplica fiel do que a conta recebe/produz a sério, não um cartão
   genérico com ícone e checklist. Decisão explícita (pergunta direta do
   Gustavo: isto é email, app ou plataforma?), com etiqueta em cada bloco,
   não deixada implícita no desenho:

   1. EMAIL. Os 3 números (registos, dias ativos, semanas seguidas) só
      existem por email hoje, confirmado no código: não há ecrã nenhum na
      app com este conteúdo (mesmo fundo quase preto, mesma eyebrow em
      maiúsculas, mesmo estilo de stat tile do email real, ver
      supabase/functions/send-weekly-recap), com cabeçalho de remetente
      para ler como um email aberto a sério.
   2. NA APP. O post de LinkedIn sai de um botão dentro da app
      (WeeklyPostCard, edge function linkedin-post), feature já existente.
      Mostrar só o email não respondia à pergunta real: o que se ganha com
      isto na prática é consistência visível a professores e recrutadores.
      Texto do post segue as regras reais do gerador: primeira pessoa,
      concreto, sem "aprendi imenso", zero emojis ou hashtags.

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

// Linha compacta de apoio por baixo da citação, números ainda a subir de 0
// (mantém a sensação de "coisa viva"), mas já não a liderar o cartão.
function CountUpLine({ entries, activeDays, streak }) {
  const e = useCountUp(entries, { delay: 0 })
  const d = useCountUp(activeDays, { delay: 100 })
  const s = useCountUp(streak, { delay: 200 })
  return (
    <span style={{ fontVariantNumeric: 'tabular-nums' }}>
      {e} {e === 1 ? 'registo' : 'registos'} · {d} {d === 1 ? 'dia ativo' : 'dias ativos'}
      {s > 1 && <> · <span style={{ color: '#f0a500', fontWeight: 700 }}>{s}ª semana seguida</span></>}
    </span>
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
        .recap-teaser-quote { animation: recap-teaser-fade 0.5s ease-out 1.25s backwards; }
        .recap-teaser-arrow { animation: recap-teaser-fade 0.4s ease-out 0.95s backwards; }
        .recap-teaser-post { animation: recap-teaser-window 0.5s cubic-bezier(0.16,1,0.3,1) 1.05s backwards; }
        @media (prefers-reduced-motion: reduce) {
          .recap-teaser-stat, .recap-teaser-quote, .recap-teaser-window, .recap-teaser-arrow, .recap-teaser-post { animation: none; }
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
          Mostra a tua consistência a professores e recrutadores, a partir do Plus
        </p>
      </div>

      {/* Etiqueta deliberada: o Gustavo perguntou diretamente se isto é
          email, app ou plataforma. Decidido e explícito, não deixado
          implícito no desenho: os 3 números só existem por email hoje,
          não há ecrã nenhum na app com este conteúdo (confirmado no
          código, send-weekly-recap é só email). */}
      <div className="recap-teaser-arrow" style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '14px 0 8px', paddingLeft: 2 }}>
        <span style={{ fontSize: 9.5, fontWeight: 800, color: 'var(--on)', background: 'var(--on-fill)', border: '1px solid var(--on-line)', padding: '3px 9px', borderRadius: 100, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Email · toda a segunda</span>
      </div>

      {/* Réplica do email real, não decoração: cabeçalho com remetente e
          assunto, para ler como um email mesmo aberto na caixa de entrada
          (mesmas cores e estrutura de send-weekly-recap). */}
      <div className="recap-teaser-window" style={{ background: '#03060d', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '14px 16px 16px', margin: '0 0 12px', boxShadow: '0 12px 28px rgba(0,0,0,0.35)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 12 }}>
          <span style={{ width: 24, height: 24, borderRadius: 7, background: '#1a60c8', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 11, fontWeight: 800 }}>S</span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: '#eef2f8' }}>Showo <span style={{ fontWeight: 400, color: '#5a6b85' }}>hello@showo.pt</span></div>
            <div style={{ fontSize: 10, color: '#5a6b85' }}>Para ti · segunda-feira, 08:00</div>
          </div>
        </div>
        <p style={{ margin: '0 0 4px', color: '#7d93b0', fontSize: 10, textAlign: 'center', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700 }}>
          Recap · 13 a 19 de outubro
        </p>
        {/* Lidera com a citação real do diário, não com um número. 3
            registos num dashboard não convence ninguém, uma frase
            concreta sobre o que foi feito convence. Mesma lógica do
            email real (pickHighlight em send-weekly-recap): escolhe a
            entrada mais substancial da semana, não a mais frequente. */}
        <p style={{ margin: '0 0 6px', color: '#7d93b0', fontSize: 10.5, textAlign: 'center', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 700 }}>
          Decisão desta semana · DragBuild
        </p>
        <p className="recap-teaser-stat" style={{ margin: '0 0 12px', color: '#eef2f8', fontSize: 16, lineHeight: 1.4, textAlign: 'center', fontWeight: 700, fontStyle: 'italic' }}>
          "Decidi simplificar o fluxo de arrastar componentes depois de testar com duas pessoas que acharam confuso."
        </p>
        <div className="recap-teaser-stat" style={{ animationDelay: '150ms', fontSize: 11.5, color: '#7d93b0', textAlign: 'center' }}>
          <CountUpLine entries={5} activeDays={4} streak={3} />
        </div>
      </div>

      <div className="recap-teaser-arrow" style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 10px', paddingLeft: 2 }}>
        <ArrowDown size={13} color="var(--on-dim)" />
        <span style={{ fontSize: 11, color: 'var(--on-dim)' }}>abres a app e um clique transforma a semana num post</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '0 0 8px', paddingLeft: 2 }}>
        <span style={{ fontSize: 9.5, fontWeight: 800, color: 'var(--on)', background: 'var(--on-fill)', border: '1px solid var(--on-line)', padding: '3px 9px', borderRadius: 100, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Na app · botão "Gerar post"</span>
      </div>

      {/* Mesma feature que já existe (WeeklyPostCard, edge function
          linkedin-post), o texto segue as regras reais do gerador:
          primeira pessoa, concreto, sem "aprendi imenso", zero emojis ou
          hashtags. Cartão claro de propósito, como um LinkedIn a sério
          teria, para contrastar com o email escuro e ler-se como um
          screenshot, não como decoração a condizer. */}
      <div className="recap-teaser-post" style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', margin: '0 0 14px', boxShadow: '0 12px 28px rgba(0,0,0,0.35)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span style={{ width: 28, height: 28, borderRadius: '50%', background: '#1a60c8', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 12, fontWeight: 800 }}>G</span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#1a1a1a' }}>A tua página</div>
            <div style={{ fontSize: 10, color: '#767676' }}>agora</div>
          </div>
          <span style={{ color: '#0A66C2', flexShrink: 0 }}><LinkedInMark size={16} /></span>
        </div>
        <p style={{ margin: 0, fontSize: 12, color: '#1a1a1a', lineHeight: 1.55 }}>
          Esta semana avancei o DragBuild: melhorei a explicação do problema que o projeto resolve e simplifiquei o fluxo de arrastar componentes, depois de testar com duas pessoas que acharam confuso.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 10, paddingTop: 8, borderTop: '1px solid #eee' }}>
          <ThumbUp size={13} color="#0A66C2" />
          <span style={{ fontSize: 10.5, color: '#767676' }}>Gostei · Comentar · Partilhar</span>
        </div>
      </div>

      <p className="recap-teaser-quote" style={{ margin: '0 0 16px', fontSize: 12, color: 'var(--on-dim)', lineHeight: 1.5 }}>
        Os dois são gerados sozinhos a partir do que já escreves no diário, sem trabalho extra nenhum. Não é texto inventado: são os teus registos e números reais, prontos para mostrar.
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
