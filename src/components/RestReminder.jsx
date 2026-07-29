import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'

const DISMISSED_KEY = 'showo_rest_dismissed'
const SNOOZE_KEY    = 'showo_rest_snooze_until'
const SNOOZE_MINS_KEY = 'showo_rest_snooze_mins'
const STANDBY_KEY   = 'showo_rest_standby'

const C = {
  bg:     'rgba(6,12,24,0.95)',
  card:   'var(--color-surface)',
  border: 'var(--color-border)',
  blue:   'var(--color-primary)',
  muted:  'var(--color-text-secondary)',
  text:   'var(--color-text)',
}

export default function RestReminder() {
  const { user, profile } = useAuth()
  const [phase, setPhase] = useState(null)   // null | 'first' | 'second'
  const [visible, setVisible] = useState(false)
  const [standby, setStandby] = useState(false)
  const [snoozeMins, setSnoozeMins] = useState(0)
  const timerRef = useRef(null)

  const firstName = user?.user_metadata?.full_name?.split(' ')[0]
    || user?.email?.split('@')[0] || ''

  useEffect(() => {
    if (!user) return
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

  return (
    <>
      {/* Backdrop */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9990,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        animation: 'fadeIn 0.2s ease',
      }} />

      {/* Card */}
      <div style={{
        position: 'fixed', zIndex: 9991,
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 'min(92vw, 420px)',
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 20,
        padding: '36px 32px',
        boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
        fontFamily: 'inherit',
        animation: 'slideUp 0.25s cubic-bezier(0.22,1,0.36,1)',
      }}>
        <h2 style={{
          color: C.text, fontSize: 20, fontWeight: 700,
          margin: '0 0 12px', letterSpacing: '-0.3px',
        }}>
          {isFirst
            ? 'Já passaram das 23h'
            : `Já passaram ${snoozeMins} minutos`}
        </h2>

        <p style={{
          color: C.muted, fontSize: 15, lineHeight: 1.65,
          margin: '0 0 28px',
        }}>
          {isFirst
            ? 'Descansa a cabeça. O que estudaste hoje fixa-se melhor a dormir.'
            : 'Conseguiste acabar? Amanhã continuas com mais energia.'}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            onClick={handleRest}
            style={{
              background: C.blue, border: 'none', borderRadius: 10,
              padding: '13px', color: '#fff', fontSize: 15, fontWeight: 600,
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
                background: 'transparent',
                border: `1px solid ${C.border}`,
                borderRadius: 10, padding: '13px',
                color: C.muted, fontSize: 14, fontWeight: 500,
                cursor: 'pointer', fontFamily: 'inherit', transition: 'color 0.15s, border-color 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = C.text; e.currentTarget.style.borderColor = '#2a4070' }}
              onMouseLeave={e => { e.currentTarget.style.color = C.muted; e.currentTarget.style.borderColor = C.border }}
            >
              Preciso de mais um bocado
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { opacity: 0; transform: translate(-50%, calc(-50% + 16px)) } to { opacity: 1; transform: translate(-50%, -50%) } }
      `}</style>
    </>
  )
}
