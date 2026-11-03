import { CloseIcon as X } from '@solar-icons/react/bold/close'
import { Book2Icon as BookOpen } from '@solar-icons/react/bold/book-2'

/* Faixa que lembra de escrever no diário quando a última entrada real (não
   "auto", essas são geradas pela plataforma, não escritas pela pessoa) tem
   mais de 7 dias. Pedido explícito do Gustavo: in-app, nunca por email,
   porque os emails já foram tentados e não resolveram o problema de 92% dos
   utilizadores só escreverem no dia de criação do projeto (achado desta
   sessão). Mesmo padrão visual do LimitNudgeBanner, dispensa diária. */

export default function DiaryNudgeBanner({ projectName, daysSince, onDismiss, onWrite }) {
  function dismiss() {
    try { localStorage.setItem(`showo_diary_remind_${new Date().toISOString().slice(0, 10)}`, '1') } catch { /* ignore */ }
    onDismiss()
  }

  return (
    <section className="sdb-panel diary-nudge-bar" style={{ position: 'relative', borderColor: 'var(--color-accent-subtle)' }}>
      <style>{`
        @keyframes diary-nudge-fade {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .diary-nudge-bar { animation: diary-nudge-fade 0.4s ease-out backwards; }
        .diary-nudge-bar-row { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
        .diary-nudge-bar-cta { flex-shrink: 0; margin-left: auto; }
        @media (prefers-reduced-motion: reduce) {
          .diary-nudge-bar { animation: none; }
        }
      `}</style>

      <button
        onClick={dismiss}
        aria-label="Dispensar"
        style={{ position: 'absolute', top: 10, right: 10, background: 'var(--color-bg-alt)', border: 'none', borderRadius: 7, cursor: 'pointer', color: 'var(--color-text-secondary)', padding: 4, display: 'flex', zIndex: 1 }}
      ><X size={13} /></button>

      <div className="diary-nudge-bar-row" style={{ paddingRight: 24 }}>
        <span style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--color-accent-subtle)', color: 'var(--color-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <BookOpen size={18} />
        </span>

        <div style={{ minWidth: 0, flex: '1 1 260px' }}>
          <p style={{ margin: '0 0 2px', fontSize: 13.5, fontWeight: 700, color: 'var(--color-text)', fontFamily: 'var(--font-heading)', lineHeight: 1.3 }}>
            Já não escreves no diário do {projectName} há {daysSince} dias
          </p>
          <p style={{ margin: 0, fontSize: 11.5, color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
            O que mudou desde a última vez? Um apontamento curto já conta.
          </p>
        </div>

        <button
          onClick={onWrite}
          className="diary-nudge-bar-cta"
          style={{ fontSize: 12.5, fontWeight: 700, padding: '8px 16px', borderRadius: 100, border: 'none', background: 'var(--color-accent)', color: '#fff', cursor: 'pointer', fontFamily: 'inherit', transition: 'opacity 0.15s', whiteSpace: 'nowrap' }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          Escrever agora
        </button>
      </div>
    </section>
  )
}
