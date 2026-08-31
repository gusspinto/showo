import { useState, useEffect } from 'react'
import { CopyIcon as Copy } from '@solar-icons/react/bold/copy'
import { CheckCircleIcon as Check } from '@solar-icons/react/bold/check-circle'
import { SquareArrowRightUpIcon as ExternalLink } from '@solar-icons/react/bold/square-arrow-right-up'
import { LinkIcon as LinkIcon } from '@solar-icons/react/bold/link'
import { RefreshCircleIcon as RefreshCw } from '@solar-icons/react/bold/refresh-circle'
import { supabase } from '../../lib/supabase'
import { Modal, Button } from '../ui'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL

export default function CalendarSyncModal({ userId, icsToken, onClose, onTokenRotated }) {
  const [copied, setCopied] = useState(false)
  const [rotating, setRotating] = useState(false)
  const [googleConnected, setGoogleConnected] = useState(null)
  const [googleBusy, setGoogleBusy] = useState(false)
  const [syncMsg, setSyncMsg] = useState('')
  const [localToken, setLocalToken] = useState(icsToken || null)

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
    setGoogleBusy(true); setSyncMsg('')
    try {
      const { data: sess } = await supabase.auth.getSession()
      const jwt = sess?.session?.access_token
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/google-calendar-oauth?action=start`, {
        headers: { 'Authorization': `Bearer ${jwt}` },
      })
      const { url, error } = await resp.json()
      if (error) { setSyncMsg(error); return }
      window.location.href = url
    } catch {
      setSyncMsg('Não foi possível ligar. Tenta novamente.')
    } finally {
      setGoogleBusy(false)
    }
  }

  async function syncGoogle() {
    setGoogleBusy(true); setSyncMsg('')
    try {
      const { data: sess } = await supabase.auth.getSession()
      const jwt = sess?.session?.access_token
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/google-calendar-oauth?action=sync`, {
        method: 'POST', headers: { 'Authorization': `Bearer ${jwt}` },
      })
      const j = await resp.json()
      if (j.ok) setSyncMsg(`${j.pushed}/${j.total} eventos sincronizados.`)
      else setSyncMsg(j.error || 'Falhou.')
    } catch {
      setSyncMsg('Não foi possível sincronizar. Tenta novamente.')
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
    <Modal onClose={onClose} title="Sincronizar calendário">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>

        {/* Google Calendar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 'var(--sp-3)',
          padding: 'var(--sp-3) var(--sp-4)',
          background: 'var(--color-bg)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text)' }}>
              Google Calendar
            </div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', marginTop: 2 }}>
              {googleConnected === null ? 'A verificar…' : googleConnected ? 'Ligado' : 'Não ligado'}
            </div>
          </div>
          {googleConnected ? (
            <div style={{ display: 'flex', gap: 'var(--sp-2)', flexShrink: 0 }}>
              <Button size="sm" variant="secondary" icon={<RefreshCw size={12} />} onClick={syncGoogle} disabled={googleBusy}>Sync</Button>
              <Button size="sm" variant="ghost" onClick={disconnectGoogle} disabled={googleBusy}>Desligar</Button>
            </div>
          ) : (
            <Button size="sm" onClick={connectGoogle} disabled={googleBusy}>Ligar</Button>
          )}
        </div>
        {syncMsg && (
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', margin: '-8px 0 0' }}>{syncMsg}</p>
        )}

        {/* ICS / outros calendários */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
          <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text)' }}>
            Apple Calendar · Outlook
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 'var(--sp-2)',
            padding: 'var(--sp-2) var(--sp-3)',
            background: 'var(--color-bg)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
          }}>
            <LinkIcon size={12} color="var(--color-text-tertiary)" style={{ flexShrink: 0 }} />
            <code style={{
              flex: 1, fontSize: 11, color: 'var(--color-text-secondary)',
              fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{localToken ? icsUrl : 'A gerar…'}</code>
            <Button size="sm" variant={copied ? 'ghost' : 'secondary'}
              icon={copied ? <Check size={11} /> : <Copy size={11} />}
              onClick={copyLink}
              disabled={!localToken}
              style={copied ? { color: 'var(--color-success)' } : undefined}>
              {copied ? 'Copiado' : 'Copiar'}
            </Button>
          </div>
          <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
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

      </div>
    </Modal>
  )
}
