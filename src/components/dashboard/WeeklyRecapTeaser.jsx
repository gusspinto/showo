import { LetterIcon as Mail } from '@solar-icons/react/bold/letter'
import { CloseIcon as X } from '@solar-icons/react/bold/close'

/* Teaser do recap semanal automático (feature "weeklyRecap", a partir do
   Plus) para quem está no Grátis, na coluna lateral por baixo da Agenda.

   Terceira versão. A primeira (réplica do email + mockup de post de
   LinkedIn, animada) era boa ideia mas grande demais: ocupava a largura
   toda da coluna principal e empurrava o resto do dashboard. A segunda
   (uma linha só, ícone+frase+CTA) ficou demasiado compacta — perdeu o que
   dava substância à ideia, os números concretos do email real. Esta fica a
   meio: cabe na largura da Agenda, mas mantém os três números (eram o que
   respondia "o que ganho com isto na prática?") como chips pequenos, sem
   os mockups de janela/post nem as animações da primeira versão. */
export default function WeeklyRecapTeaser({ userId, onDismiss, onUpgrade }) {
  const key = `showo_recap_teaser_dismissed_${userId}`

  function dismiss() {
    try { localStorage.setItem(key, '1') } catch { /* ignore */ }
    onDismiss()
  }

  return (
    <section className="sdb-panel sdb-panel--brand recap-teaser-mini">
      <button onClick={dismiss} aria-label="Dispensar" className="recap-teaser-mini-close">
        <X size={12} />
      </button>

      <div className="recap-teaser-mini-head">
        <span className="recap-teaser-mini-icon"><Mail size={15} /></span>
        <p className="recap-teaser-mini-title">Mostra a tua consistência, a partir do Plus</p>
      </div>

      <p className="recap-teaser-mini-sub">
        Um recap semanal por email, com estes números — pronto a virar post de LinkedIn.
      </p>

      <div className="recap-teaser-mini-stats">
        <div className="recap-teaser-mini-stat">
          <span className="recap-teaser-mini-stat-num">5</span>
          <span className="recap-teaser-mini-stat-label">registos</span>
        </div>
        <div className="recap-teaser-mini-stat">
          <span className="recap-teaser-mini-stat-num">4</span>
          <span className="recap-teaser-mini-stat-label">dias ativos</span>
        </div>
        <div className="recap-teaser-mini-stat">
          <span className="recap-teaser-mini-stat-num recap-teaser-mini-stat-num--accent">3</span>
          <span className="recap-teaser-mini-stat-label">semanas seguidas</span>
        </div>
      </div>

      <button onClick={onUpgrade} className="recap-teaser-mini-cta">Ver planos</button>
    </section>
  )
}
