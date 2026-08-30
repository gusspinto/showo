import { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { CloseIcon as X } from '@solar-icons/react/bold/close'

const DISMISSED_KEY = 'showo_rest_dismissed'
const SNOOZE_KEY    = 'showo_rest_snooze_until'
const SNOOZE_MINS_KEY = 'showo_rest_snooze_mins'
const STANDBY_KEY   = 'showo_rest_standby'

// Ecrãs de autenticação/entrada — mesmo com sessão ativa (ex: separador
// aberto no /register a seguir a um login noutro separador), não faz
// sentido interromper aqui com "vai dormir": a pessoa ainda não está a
// usar a app, está a entrar/sair dela.
const AUTH_PATHS = new Set(['/login', '/register', '/recuperar-password', '/welcome'])

const C = {
  bg:     'rgba(6,12,24,0.95)',
  card:   'var(--color-surface)',
  border: 'var(--color-border)',
  blue:   'var(--color-text)',
  muted:  'var(--color-text-secondary)',
  text:   'var(--color-text)',
}

export default function RestReminder() {
  const { user, profile } = useAuth()
  const location = useLocation()
  const isAuthPath = AUTH_PATHS.has(location.pathname)
  const [phase, setPhase] = useState(null)   // null | 'first' | 'second'
  const [visible, setVisible] = useState(false)
  const [standby, setStandby] = useState(false)
  const [snoozeMins, setSnoozeMins] = useState(0)
  const timerRef = useRef(null)

  const firstName = user?.user_metadata?.full_name?.split(' ')[0]
    || user?.email?.split('@')[0] || ''

  useEffect(() => {
    if (!user) return
    if (isAuthPath) return
    // Skip for teachers
    if (profile?.role === 'professor') return

    // Check if standby was active
    if (localStorage.getItem(STANDBY_KEY) === new Date().toDateString()) {
      const h = new Date().getHours()
      if (h >= 23 || h < 6) {
        setStandby(true)
        return
      } else {
        localStorage.removeItem(STANDBY_KEY)
      }
    }

    check()
    const id = setInterval(check, 60_000)
    return () => { clearInterval(id); clearTimeout(timerRef.current) }
  }, [user, profile?.role])

  function check() {
    const h = new Date().getHours()
    if (h < 23) return

    if (localStorage.getItem(DISMISSED_KEY) === new Date().toDateString()) return

    const snoozeUntil = localStorage.getItem(SNOOZE_KEY)
    if (snoozeUntil) {
      if (Date.now() < parseInt(snoozeUntil)) return
      localStorage.removeItem(SNOOZE_KEY)
      const mins = parseInt(localStorage.getItem(SNOOZE_MINS_KEY) ?? '30')
      setSnoozeMins(mins)
      setPhase('second')
      setVisible(true)
      return
    }

    setPhase('first')
    setVisible(true)
  }

  function handleRest() {
    localStorage.setItem(DISMISSED_KEY, new Date().toDateString())
    localStorage.setItem(STANDBY_KEY, new Date().toDateString())
    localStorage.removeItem(SNOOZE_KEY)
    localStorage.removeItem(SNOOZE_MINS_KEY)
    setVisible(false)
    setStandby(true)
  }

  function handleKeepWorking() {
    const mins = Math.floor(Math.random() * 16) + 25
    localStorage.setItem(SNOOZE_KEY, String(Date.now() + mins * 60_000))
    localStorage.setItem(SNOOZE_MINS_KEY, String(mins))
    setVisible(false)
  }

  function exitStandby() {
    localStorage.removeItem(STANDBY_KEY)
    setStandby(false)
  }

  if (isAuthPath) return null

  // Standby screen
  if (standby) {
    return (
      <div
        onClick={exitStandby}
        style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: '#050a14',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
          animation: 'standbyIn 0.6s ease',
        }}
      >
        <div style={{
          fontSize: 'clamp(28px, 5vw, 42px)',
          fontWeight: 400,
          fontFamily: 'var(--font-heading)',
          color: 'var(--color-text)',
          letterSpacing: '-1px',
          marginBottom: 8,
          opacity: 0.9,
        }}>
          Até amanhã, {firstName}.
        </div>
        <div style={{
          fontSize: 13, color: 'var(--color-text-secondary)', opacity: 0.5,
          marginTop: 24,
        }}>
          toca para voltar
        </div>

        <style>{`
          @keyframes standbyIn {
            from { opacity: 0 }
            to { opacity: 1 }
          }
        `}</style>
      </div>
    )
  }

  if (!visible || !phase) return null

  const isFirst = phase === 'first'

  // Já não é um modal a bloquear o ecrã todo — é um cartão discreto num
  // canto, com um X para fechar. Continua a interromper (não desaparece
  // sozinho), mas não impede de continuar a usar a app por baixo.
  return (
    <>
      <div className="rest-reminder-card" style={{
        position: 'fixed', zIndex: 9991,
        width: 'min(92vw, 340px)',
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 16,
        padding: '18px 18px 18px',
        boxShadow: '0 12px 40px rgba(0,0,0,0.35)',
        fontFamily: 'inherit',
        animation: 'restReminderIn 0.3s cubic-bezier(0.22,1,0.36,1)',
      }}>
        <button
          onClick={handleKeepWorking}
          aria-label="Fechar"
          style={{
            position: 'absolute', top: 10, right: 10,
            width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'transparent', border: 'none', borderRadius: 7,
            color: C.muted, cursor: 'pointer', padding: 0,
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-surface-hover)'; e.currentTarget.style.color = C.text }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = C.muted }}
        >
          <X size={13} />
        </button>

        <h2 style={{
          color: C.text, fontSize: 16, fontWeight: 700,
          margin: '0 24px 8px 0', letterSpacing: '-0.2px',
        }}>
          {isFirst
            ? 'Já passaram das 23h'
            : `Já passaram ${snoozeMins} minutos`}
        </h2>

        <p style={{
          color: C.muted, fontSize: 13.5, lineHeight: 1.55,
          margin: '0 0 16px',
        }}>
          {isFirst
            ? 'Descansa a cabeça. O que estudaste hoje fixa-se melhor a dormir.'
            : 'Conseguiste acabar? Amanhã continuas com mais energia.'}
        </p>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleRest}
            style={{
              flex: 1, background: C.blue, border: 'none', borderRadius: 9,
              padding: '10px', color: 'var(--color-bg)', fontSize: 13.5, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit', transition: 'opacity 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            {isFirst ? 'Boa noite' : 'Vou descansar'}
          </button>

          {isFirst && (
            <button
              onClick={handleKeepWorking}
              style={{
                flex: 1, background: 'transparent',
                border: `1px solid ${C.border}`,
                borderRadius: 9, padding: '10px',
                color: C.muted, fontSize: 13, fontWeight: 500,
                cursor: 'pointer', fontFamily: 'inherit', transition: 'color 0.15s, border-color 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = C.text; e.currentTarget.style.borderColor = 'var(--color-border-hover)' }}
              onMouseLeave={e => { e.currentTarget.style.color = C.muted; e.currentTarget.style.borderColor = C.border }}
            >
              Mais um bocado
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes restReminderIn {
          from { opacity: 0; transform: translateY(-10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .rest-reminder-card {
          top: 20px;
          right: 20px;
        }
        @media (max-width: 600px) {
          .rest-reminder-card {
            top: auto;
            right: 12px;
            left: 12px;
            bottom: calc(12px + env(safe-area-inset-bottom, 0px));
            width: auto;
          }
          @keyframes restReminderIn {
            from { opacity: 0; transform: translateY(10px); }
            to   { opacity: 1; transform: translateY(0); }
          }
        }
      `}</style>
    </>
  )
}
