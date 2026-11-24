import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GamepadIcon as Controller } from '@solar-icons/react/bold/gamepad'
import { CheckCircleIcon as CheckCircle } from '@solar-icons/react/bold/check-circle'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Navbar } from '../components/Navbar'
import './GtaGiveaway.css'

/* ══════════════════════════════════════════════════════════════════════════
   SORTEIO GTA VI: confirmação real de participação (24/11).
   Antes disto, o email dizia "já participas" só por ter um projeto
   publicado, sem clique nenhum. O Gustavo pediu um passo explícito, para
   dar a sensação real de participação e dar uma lista honesta de quem
   conta, em vez de assumir isso no dia de escolher o vencedor.
   Exige sessão iniciada (RLS/grant de gta_giveaway_entries não dá nada a
   anon) e pelo menos 1 projeto publicado, a mesma condição do email.
   ══════════════════════════════════════════════════════════════════════════ */

export default function GtaGiveaway() {
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const [status, setStatus] = useState('loading') // loading | needs_project | can_confirm | confirming | confirmed | error
  const [projectCount, setProjectCount] = useState(0)

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      // Login.jsx não suporta ?redirect=, navega sempre para /dashboard
      // depois de entrar. Mais simples pedir para voltar ao link do email.
      navigate('/login')
      return
    }

    let cancelled = false
    async function load() {
      const [{ count }, { data: entry }] = await Promise.all([
        supabase.from('projects').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('gta_giveaway_entries').select('id').eq('user_id', user.id).maybeSingle(),
      ])
      if (cancelled) return
      setProjectCount(count || 0)
      if (entry) setStatus('confirmed')
      else if ((count || 0) > 0) setStatus('can_confirm')
      else setStatus('needs_project')
    }
    load()
    return () => { cancelled = true }
  }, [user, authLoading, navigate])

  async function handleConfirm() {
    setStatus('confirming')
    const { error } = await supabase.from('gta_giveaway_entries').insert({ user_id: user.id })
    if (error) { setStatus('error'); return }
    setStatus('confirmed')
  }

  return (
    <div className="gta-page">
      <Navbar />
      <div className="gta-wrap">
        {status === 'loading' && <p className="gta-loading">A carregar…</p>}

        {status === 'needs_project' && (
          <div className="gta-card">
            <Controller size={32} className="gta-icon" />
            <h1 className="gta-title">Ainda não tens projeto publicado</h1>
            <p className="gta-sub">Publica o teu primeiro projeto para entrares no sorteio do GTA VI.</p>
            <button className="gta-button" onClick={() => navigate('/novo')}>Publicar o meu projeto</button>
          </div>
        )}

        {status === 'can_confirm' && (
          <div className="gta-card">
            <Controller size={32} className="gta-icon" />
            <h1 className="gta-title">Confirma a tua participação</h1>
            <p className="gta-sub">
              Já tens {projectCount === 1 ? 'um projeto publicado' : `${projectCount} projetos publicados`}, és elegível para o sorteio de um GTA VI.
              Falta só confirmares.
            </p>
            <button className="gta-button" onClick={handleConfirm}>Confirmar participação</button>
          </div>
        )}

        {status === 'confirming' && <p className="gta-loading">A confirmar…</p>}

        {status === 'confirmed' && (
          <div className="gta-card">
            <CheckCircle size={32} className="gta-icon gta-icon--done" />
            <h1 className="gta-title">Estás dentro.</h1>
            <p className="gta-sub">A tua participação no sorteio do GTA VI está confirmada. Boa sorte.</p>
            <button className="gta-button gta-button--ghost" onClick={() => navigate('/dashboard')}>Voltar ao painel</button>
          </div>
        )}

        {status === 'error' && (
          <div className="gta-card">
            <p className="gta-sub">Não foi possível confirmar agora. Tenta novamente.</p>
            <button className="gta-button" onClick={handleConfirm}>Tentar de novo</button>
          </div>
        )}
      </div>
    </div>
  )
}
