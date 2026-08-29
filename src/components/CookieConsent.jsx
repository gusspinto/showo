import { useState } from 'react'
import { getConsent, setConsent } from '../lib/consent'
import { initAnalytics } from '../lib/analytics'
import { initErrorTracking } from '../lib/errorTracking'

export default function CookieConsent() {
  const [visible, setVisible] = useState(() => getConsent() === null)

  if (!visible) return null

  function accept() {
    setConsent('accepted')
    setVisible(false)
    initAnalytics()
    initErrorTracking()
  }

  function decline() {
    setConsent('declined')
    setVisible(false)
  }

  return (
    <div style={{
      position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)',
      zIndex: 99999, maxWidth: 480, width: 'calc(100% - 32px)',
      background: 'var(--color-surface)', border: '1px solid var(--color-border)',
      borderRadius: 14, padding: '16px 20px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      fontFamily: 'inherit',
    }}>
      <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--color-text)', lineHeight: 1.6 }}>
        Usamos cookies para estatísticas e deteção de erros. Nenhum cookie é usado para publicidade.{' '}
        <a href="/privacidade" style={{ color: 'var(--color-text)', textDecoration: 'underline', textUnderlineOffset: 2 }}>Saber mais</a>
      </p>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button
          onClick={decline}
          style={{
            background: 'transparent', border: '1px solid var(--color-border)',
            borderRadius: 8, padding: '8px 16px',
            color: 'var(--color-text-secondary)', fontSize: 13, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          Recusar
        </button>
        {/* Invertido, como o resto dos botões principais (herói, login,
            registo) — nada de azul a mais numa faixa que já é neutra. */}
        <button
          onClick={accept}
          style={{
            background: 'var(--color-text)', border: 'none',
            borderRadius: 8, padding: '8px 16px',
            color: 'var(--color-bg)', fontSize: 13, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          Aceitar
        </button>
      </div>
    </div>
  )
}
