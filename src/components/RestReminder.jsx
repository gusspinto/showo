import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'

const DISMISSED_KEY = 'showo_rest_dismissed'
const SNOOZE_KEY    = 'showo_rest_snooze_until'
const SNOOZE_MINS_KEY = 'showo_rest_snooze_mins'

const C = {
  bg:     'rgba(6,12,24,0.95)',
  card:   'var(--c-card)',
  border: 'var(--c-border)',
  blue:   '#1b78f7',
  muted:  'var(--c-muted)',
  text:   'var(--c-text)',
}

export default function RestReminder() {
  const { user } = useAuth()
  const [phase, setPhase] = useState(null)   // null | 'first' | 'second'
  const [visible, setVisible] = useState(false)
  const [snoozeMins, setSnoozeMins] = useState(0)
  const timerRef = useRef(null)

  useEffect(() => {
    if (!user) return
    check()
    const id = setInterval(check, 60_000)
    return () => { clearInterval(id); clearTimeout(timerRef.current) }
  }, [user])

  function check() {
    const h = new Date().getHours()
    if (h < 23) return

    // Already dismissed today
    if (localStorage.getItem(DISMISSED_KEY) === new Date().toDateString()) return

    // Snoozed?
    const snoozeUntil = localStorage.getItem(SNOOZE_KEY)
    if (snoozeUntil) {
      if (Date.now() < parseInt(snoozeUntil)) return
      // Snooze expired → second popup
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
    localStorage.removeItem(SNOOZE_KEY)
    localStorage.removeItem(SNOOZE_MINS_KEY)
    setVisible(false)
  }

  function handleKeepWorking() {
    // Random 25–40 min snooze
    const mins = Math.floor(Math.random() * 16) + 25
    localStorage.setItem(SNOOZE_KEY, String(Date.now() + mins * 60_000))
    localStorage.setItem(SNOOZE_MINS_KEY, String(mins))
    setVisible(false)
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
            ? 'O cérebro também precisa de descanso. O que aprendes hoje consolida-se enquanto dormes — não enquanto scrollas.'
            : 'Conseguiste acabar? O projeto continua aqui amanhã. Vai descansar.'}
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
              Tenho que acabar este trabalho
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
