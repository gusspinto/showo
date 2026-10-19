import { useNavigate } from 'react-router-dom'
import { CloseIcon as X } from '@solar-icons/react/bold/close'
import { CalendarMarkIcon as CalendarMark } from '@solar-icons/react/bold/calendar-mark'

/* Teaser do recap semanal automático (feature "weeklyRecap", a partir do
   Plus) para quem está no Grátis — mostra um exemplo real do que a conta
   recebe por email todas as segundas (stat tiles de registos/dias ativos/
   tipo de trabalho, não uma redação gerada por IA: é isso que o recap
   realmente é, ver supabase/functions/send-weekly-recap).

   Só para B2C (isSchoolAccount já filtra antes de renderizar) — escola
   tem o seu próprio canal (Navbar, painel "Turma"). Objetivo: a pessoa
   vê o que está a perder sem ter de ler um email que nunca abre (0
   opens medidos nalguns lotes), mesmo sítio onde já clica "Experimenta
   o Plus". Dispensável, guarda a escolha em localStorage. */

const STAT = (value, label) => (
  <div style={{ flex: 1, padding: '10px 6px', background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 8, textAlign: 'center' }}>
    <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-text)', lineHeight: 1 }}>{value}</div>
    <div style={{ fontSize: 10, color: 'var(--color-text-secondary)', marginTop: 4 }}>{label}</div>
  </div>
)

export default function WeeklyRecapTeaser({ userId, onDismiss }) {
  const navigate = useNavigate()
  const key = `showo_recap_teaser_dismissed_${userId}`

  function dismiss() {
    try { localStorage.setItem(key, '1') } catch { /* ignore */ }
    onDismiss()
  }

  return (
    <section className="sdb-panel sdb-panel--tint" style={{ position: 'relative' }}>
      <button
        onClick={dismiss}
        aria-label="Dispensar"
        style={{ position: 'absolute', top: 10, right: 10, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', padding: 4, display: 'flex' }}
      ><X size={14} /></button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ width: 26, height: 26, borderRadius: 8, background: 'var(--color-primary-subtle)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <CalendarMark size={14} />
        </span>
        <p style={{ margin: 0, fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>
          O que recebes todas as segundas a partir do Plus
        </p>
      </div>

      <p style={{ margin: '0 0 12px', fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', lineHeight: 1.55 }}>
        Um email automático com o que avançaste na semana, gerado a partir do diário — sem teres de escrever nada. Exemplo real:
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        {STAT('5', 'registos')}
        {STAT('4', 'dias ativos')}
        {STAT('12', 'dias p/ defesa')}
      </div>
      <p style={{ margin: '0 0 14px', fontSize: 11, color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>
        "Em DragBuild, registaste 5 entradas em 4 dias diferentes — sobretudo progresso, decisões." · exemplo
      </p>

      <button
        onClick={() => navigate('/pricing')}
        style={{ fontSize: 13, fontWeight: 700, padding: '9px 16px', borderRadius: 8, border: 'none', background: 'var(--color-primary)', color: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}
      >
        Ver planos
      </button>
    </section>
  )
}
