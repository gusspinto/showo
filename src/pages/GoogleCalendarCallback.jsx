import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL

export default function GoogleCalendarCallback() {
  const navigate = useNavigate()
  const [status, setStatus] = useState('A ligar Google Calendar…')

  useEffect(() => {
    async function run() {
      const params = new URLSearchParams(window.location.search)
      const code = params.get('code')
      const state = params.get('state')
      if (!code || !state) { setStatus('Ligação cancelada.'); setTimeout(() => navigate('/dashboard'), 1500); return }

      const { data: sess } = await supabase.auth.getSession()
      const jwt = sess?.session?.access_token
      const resp = await fetch(
        `${SUPABASE_URL}/functions/v1/google-calendar-oauth?action=callback&code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`,
        { headers: jwt ? { 'Authorization': `Bearer ${jwt}` } : {} },
      )
      const j = await resp.json()
      if (j.ok) {
        setStatus(`Ligado! ${j.pushed}/${j.total} eventos sincronizados.`)
        setTimeout(() => navigate('/dashboard'), 1500)
      } else {
        setStatus(`Erro: ${j.error || 'desconhecido'}`)
        setTimeout(() => navigate('/dashboard'), 2500)
      }
    }
    run()
  }, [navigate])

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--color-bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'var(--color-text)', fontFamily: 'var(--font-body)',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 15, fontWeight: 600 }}>{status}</div>
      </div>
    </div>
  )
}
