import { useState, useEffect } from 'react'
import { CopyIcon as Copy } from '@solar-icons/react/bold/copy'
import { CheckCircleIcon as Check } from '@solar-icons/react/bold/check-circle'
import { SquareArrowRightUpIcon as ExternalLink } from '@solar-icons/react/bold/square-arrow-right-up'
import { LinkIcon as LinkIcon } from '@solar-icons/react/bold/link'
import { RefreshCircleIcon as RefreshCw } from '@solar-icons/react/bold/refresh-circle'
import { AltArrowDownIcon as ChevronDown } from '@solar-icons/react/bold/alt-arrow-down'
import { supabase } from '../../lib/supabase'
import { Modal, Button, Badge } from '../ui'
import './CalendarSyncModal.css'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL

/* Marca oficial do Google (as quatro cores fixas) — é a única forma correta
   de identificar o serviço, e é o mesmo mark que aparece no ecrã de
   consentimento OAuth para onde este botão leva. */
function GoogleMark({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#4285F4" d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"/>
      <path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"/>
      <path fill="#FBBC05" d="M11.69 28.18A13.98 13.98 0 0 1 10.95 24c0-1.45.25-2.86.74-4.18v-5.7H4.34A21.99 21.99 0 0 0 2 24c0 3.55.85 6.91 2.34 9.88l7.35-5.7z"/>
      <path fill="#EA4335" d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"/>
    </svg>
  )
}

export default function CalendarSyncModal({ userId, icsToken, onClose, onTokenRotated }) {
  const [copied, setCopied] = useState(false)
  const [rotating, setRotating] = useState(false)
  const [googleConnected, setGoogleConnected] = useState(null)
  const [googleBusy, setGoogleBusy] = useState(false)
  const [syncMsg, setSyncMsg] = useState('')
  const [syncFailed, setSyncFailed] = useState(false)
  const [localToken, setLocalToken] = useState(icsToken || null)
  const [otherOpen, setOtherOpen] = useState(false)

  useEffect(() => {
    if (!localToken) {
      setRotating(true)
      supabase.rpc('rotate_ics_token').then(({ data }) => {
        setRotating(false)
        if (data) { setLocalToken(data); onTokenRotated?.(data) }
      })
    }
  }, []) // eslint-disable-line

  useEffect(() => {
    supabase.from('google_calendar_tokens').select('connected_at').eq('user_id', userId).maybeSingle()
      .then(({ data }) => setGoogleConnected(!!data))
  }, [userId])

  const icsUrl = `${SUPABASE_URL}/functions/v1/ics-feed?token=${localToken || ''}`
  const webcalUrl = icsUrl.replace(/^https?:/, 'webcal:')

  async function copyLink() {
    await navigator.clipboard.writeText(icsUrl)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  async function rotateToken() {
    setRotating(true)
    try {
      const { data } = await supabase.rpc('rotate_ics_token')
      if (data) { setLocalToken(data); onTokenRotated?.(data) }
    } catch {}
    setRotating(false)
  }

  async function connectGoogle() {
    setGoogleBusy(true); setSyncMsg(''); setSyncFailed(false)
    try {
      const { data: sess } = await supabase.auth.getSession()
      const jwt = sess?.session?.access_token
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/google-calendar-oauth?action=start`, {
        headers: { 'Authorization': `Bearer ${jwt}` },
      })
      const { url, error } = await resp.json()
      if (error) { setSyncMsg(error); setSyncFailed(true); return }
      window.location.href = url
    } catch {
      setSyncMsg('Não foi possível ligar. Tenta novamente.'); setSyncFailed(true)
    } finally {
      setGoogleBusy(false)
    }
  }

  async function syncGoogle() {
    setGoogleBusy(true); setSyncMsg(''); setSyncFailed(false)
    try {
      const { data: sess } = await supabase.auth.getSession()
      const jwt = sess?.session?.access_token
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/google-calendar-oauth?action=sync`, {
        method: 'POST', headers: { 'Authorization': `Bearer ${jwt}` },
      })
      const j = await resp.json()
      if (j.ok && j.failed > 0) { setSyncMsg(`${j.pushed}/${j.total} sincronizados, ${j.failed} falharam.`); setSyncFailed(true) }
      else if (j.ok && j.total === 0) setSyncMsg('Não há eventos para sincronizar.')
      else if (j.ok) setSyncMsg(`${j.pushed}/${j.total} eventos sincronizados.`)
      else { setSyncMsg(j.error || 'Falhou.'); setSyncFailed(true) }
    } catch {
      setSyncMsg('Não foi possível sincronizar. Tenta novamente.'); setSyncFailed(true)
    } finally {
      setGoogleBusy(false)
    }
  }

  async function disconnectGoogle() {
    if (!confirm('Desligar Google Calendar? Os eventos já sincronizados ficam.')) return
    setGoogleBusy(true)
    try {
      const { data: sess } = await supabase.auth.getSession()
      const jwt = sess?.session?.access_token
      await fetch(`${SUPABASE_URL}/functions/v1/google-calendar-oauth?action=disconnect`, {
        method: 'POST', headers: { 'Authorization': `Bearer ${jwt}` },
      })
      setGoogleConnected(false); setSyncMsg('')
    } catch {
      setSyncMsg('Não foi possível desligar. Tenta novamente.')
    } finally {
      setGoogleBusy(false)
    }
  }

  return (
    <Modal onClose={onClose} title="Sincronizar calendário" subtitle="Os teus prazos e lembretes, sempre atualizados no calendário que já usas.">
      <div className="cal-sync">

        {/* Google Calendar — a opção principal, com destaque real */}
        <div className={`cal-sync-card${googleConnected ? ' is-connected' : ''}`}>
          <div className="cal-sync-card-head">
            <span className="cal-sync-mark"><GoogleMark /></span>
            <div className="cal-sync-card-info">
              <span className="cal-sync-card-title">Google Calendar</span>
              {googleConnected === null ? (
                <span className="cal-sync-card-status">A verificar…</span>
              ) : googleConnected ? (
                <Badge variant="success" dot>Ligado</Badge>
              ) : (
                <span className="cal-sync-card-status">Não ligado</span>
              )}
            </div>
          </div>

          {googleConnected ? (
            <div className="cal-sync-card-actions">
              <Button size="sm" variant="secondary" icon={<RefreshCw size={12} />} onClick={syncGoogle} disabled={googleBusy}>
                Sincronizar agora
              </Button>
              <Button size="sm" variant="ghost" onClick={disconnectGoogle} disabled={googleBusy}>
                Desligar
              </Button>
            </div>
          ) : (
            <Button size="sm" variant="accent" onClick={connectGoogle} disabled={googleBusy} loading={googleBusy} fullWidth>
              Ligar ao Google Calendar
            </Button>
          )}

          {syncMsg && (
            <p className={`cal-sync-msg${syncFailed ? ' is-error' : ''}`}>{syncMsg}</p>
          )}
        </div>

        {/* Apple Calendar / Outlook via ICS — disponível mas discreto */}
        <button
          type="button"
          className="cal-sync-other-toggle"
          onClick={() => setOtherOpen(v => !v)}
          aria-expanded={otherOpen}
        >
          <span>Outros calendários (Apple, Outlook…)</span>
          <ChevronDown size={13} className={`cal-sync-other-chev${otherOpen ? ' is-open' : ''}`} />
        </button>

        {otherOpen && (
          <div className="cal-sync-other-body">
            <p className="cal-sync-other-hint">
              Qualquer app que suporte assinar calendários por link (Apple Calendar, Outlook, etc.) pode usar este link.
            </p>
            <div className="cal-sync-link-row">
              <LinkIcon size={12} className="cal-sync-link-icon" />
              <code className="cal-sync-link-code">{localToken ? icsUrl : 'A gerar…'}</code>
              <Button size="sm" variant={copied ? 'ghost' : 'secondary'}
                icon={copied ? <Check size={11} /> : <Copy size={11} />}
                onClick={copyLink}
                disabled={!localToken}
                style={copied ? { color: 'var(--color-success)' } : undefined}>
                {copied ? 'Copiado' : 'Copiar'}
              </Button>
            </div>
            <div className="cal-sync-other-actions">
              <a href={webcalUrl} style={{ flex: 1 }}>
                <Button size="sm" variant="secondary" fullWidth icon={<ExternalLink size={12} />}>
                  Abrir no Calendário
                </Button>
              </a>
              <Button size="sm" variant="ghost" onClick={rotateToken} disabled={rotating}
                icon={<RefreshCw size={12} />}>
                {rotating ? '…' : 'Novo link'}
              </Button>
            </div>
          </div>
        )}

      </div>
    </Modal>
  )
}
