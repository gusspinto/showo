import { useEffect, useRef } from 'react'

// 28/09: identidade visual própria para os fundos escuros da app (painel de
// /login e /register, hero da home, backdrop do onboarding) — em vez de
// ilustração à mão genérica (inspirado no StudyFetch, mas sem copiar o
// estilo deles, que não encaixa no público mais sério do Showo: professores
// a validar, PAP, recrutadores). Usa o próprio produto como motivo: cartões
// de mini-projeto, a mesma coisa que qualquer utilizador cria no Showo.
const CARDS = [
  { top: '8%',  left: '58%', rot: -6,  depth: 0.35, delay: '0s',   size: 128, tag: 'PAP' },
  { top: '46%', left: '74%', rot: 4,   depth: 0.55, delay: '0.9s', size: 112, tag: 'Estágio' },
  { top: '68%', left: '52%', rot: -3,  depth: 0.25, delay: '1.6s', size: 122, tag: 'Portefólio' },
  { top: '14%', left: '82%', rot: 8,   depth: 0.45, delay: '0.4s', size: 100, tag: 'Projeto' },
  { top: '80%', left: '78%', rot: -8,  depth: 0.6,  delay: '2.1s', size: 108, tag: 'Design' },
  { top: '32%', left: '90%', rot: 3,   depth: 0.3,  delay: '1.2s', size: 96,  tag: 'Curso' },
]

export default function BrandScene({ density = 6, opacity = 1, className = '' }) {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (!window.matchMedia('(hover: hover)').matches) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let raf = null
    function onMove(e) {
      const rect = el.getBoundingClientRect()
      const mx = ((e.clientX - rect.left) / rect.width - 0.5) * 2
      const my = ((e.clientY - rect.top) / rect.height - 0.5) * 2
      if (raf) cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        el.style.setProperty('--mx', `${(-mx * 14).toFixed(1)}px`)
        el.style.setProperty('--my', `${(-my * 14).toFixed(1)}px`)
      })
    }
    function onLeave() {
      el.style.setProperty('--mx', '0px')
      el.style.setProperty('--my', '0px')
    }
    el.addEventListener('mousemove', onMove)
    el.addEventListener('mouseleave', onLeave)
    return () => {
      el.removeEventListener('mousemove', onMove)
      el.removeEventListener('mouseleave', onLeave)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <div ref={ref} className={`brand-scene ${className}`} aria-hidden="true">
      <style>{`
        .brand-scene {
          position: absolute; inset: 0; overflow: hidden;
          pointer-events: auto;
        }
        .brand-card {
          position: absolute;
          transform: translate(calc(var(--mx,0px) * var(--depth,0.3)), calc(var(--my,0px) * var(--depth,0.3))) rotate(var(--rot,0deg));
          transition: transform 0.5s cubic-bezier(0.2,0.8,0.2,1);
          opacity: 0;
          animation: brand-card-in 0.8s cubic-bezier(0.16,1,0.3,1) both;
          animation-delay: var(--delay, 0s);
        }
        .brand-card-float {
          animation: brand-float 7s ease-in-out infinite;
          animation-delay: var(--delay, 0s);
        }
        .brand-card-cover {
          border-radius: 12px 12px 0 0;
          background: linear-gradient(135deg, var(--color-primary, #3B82F6) 0%, rgba(59,130,246,0.18) 100%);
        }
        .brand-card-body {
          background: rgba(255,255,255,0.045);
          border: 1px solid rgba(255,255,255,0.09);
          border-top: none;
          border-radius: 0 0 12px 12px;
          padding: 10px 12px 12px;
        }
        .brand-card-tag {
          display: inline-block;
          font-size: 10px; font-weight: 700; letter-spacing: 0.3px;
          color: #8ab6fb; background: rgba(59,130,246,0.16);
          padding: 3px 8px; border-radius: 20px; margin-bottom: 7px;
          font-family: inherit;
        }
        .brand-card-lines span {
          display: block; height: 6px; border-radius: 3px;
          background: rgba(255,255,255,0.14); margin-top: 5px;
        }
        .brand-card-lines span:first-child { width: 72%; }
        .brand-card-lines span:nth-child(2) { width: 44%; }
        @keyframes brand-card-in {
          from { opacity: 0; transform: translate(calc(var(--mx,0px) * var(--depth,0.3)), calc(var(--my,0px) * var(--depth,0.3))) rotate(calc(var(--rot,0deg) * 2.4)) scale(0.82); }
          to   { opacity: 1; }
        }
        @keyframes brand-float {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-9px); }
        }
        @media (prefers-reduced-motion: reduce) {
          .brand-card { animation: brand-card-fade-in 0.3s ease both; }
          .brand-card-float { animation: none; }
          @keyframes brand-card-fade-in { from { opacity: 0; } to { opacity: 1; } }
        }
        @media (max-width: 860px) {
          .brand-scene { display: none; }
        }
      `}</style>
      {CARDS.slice(0, density).map((c, i) => (
        <div
          key={i}
          className="brand-card"
          style={{
            top: c.top, left: c.left, width: c.size,
            '--depth': c.depth, '--delay': c.delay, '--rot': `${c.rot}deg`,
            opacity,
          }}
        >
          <div className="brand-card-float">
            <div className="brand-card-cover" style={{ height: c.size * 0.5 }} />
            <div className="brand-card-body">
              <span className="brand-card-tag">{c.tag}</span>
              <div className="brand-card-lines"><span /><span /></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
