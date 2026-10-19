import { CloseIcon as X } from '@solar-icons/react/bold/close'

/* Teaser do recap semanal automático (feature "weeklyRecap", a partir do
   Plus) para quem está no Grátis, na coluna lateral por baixo da Agenda.

   Quarta versão, depois de revisão com as skills de UI do projeto:
   - Tirado o ícone de envelope num quadrado roxo: não acrescentava
     informação (a palavra "email" já está no texto) e é o padrão de
     ícone+caixa genérico que o Gustavo já tinha apontado como "AI slop"
     noutro sítio deste mesmo ficheiro.
   - "a partir do Plus" saiu de dentro da frase (onde partia a linha de
     forma estranha, "Plus" sozinho numa linha) e passou a selo próprio,
     reaproveitando `.sdb-eyebrow`/`.sdb-eyebrow--on`, já usado no resto do
     dashboard (ex.: "AGENDA", "TAREFAS"): não é um estilo novo.
   - Os três chips de número perdem o contorno a mais (fundo já basta para
     separar do cartão à volta) e o botão de fechar ganha área de toque
     maior (estava demasiado pequeno para um alvo de toque confortável).

   Histórico: a primeira versão (réplica do email + mockup de post de
   LinkedIn, animada) ocupava a largura toda da coluna principal. A
   segunda (uma linha só) cortou a mais, perdeu os números concretos,
   que são o que respondia "o que ganho com isto na prática?". Esta
   mantém esses números, só revista visualmente. */
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

      <span className="sdb-eyebrow sdb-eyebrow--on recap-teaser-mini-eyebrow">A partir do Plus</span>
      <p className="recap-teaser-mini-title">Mostra a tua consistência</p>
      <p className="recap-teaser-mini-sub">
        Um recap semanal por email, com estes números, pronto a virar post de LinkedIn.
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
