import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Navbar } from '../components/Navbar'
import { PlanGateModal, AiUsageBadge } from '../components/PlanGate'
import { chatGlobalCoach } from '../lib/chatGlobalCoach'
import { chatProjectCoach } from '../lib/chatProjectCoach'
import { renderMd } from '../lib/renderMd'
import { BotIcon as Bot } from '@solar-icons/react/bold/bot'
import { AltArrowDownIcon as ChevronDown } from '@solar-icons/react/bold/alt-arrow-down'
import { PlaneIcon as Send } from '@solar-icons/react/bold/plane'
import { ClipboardListIcon as HistoryIcon } from '@solar-icons/react/bold/clipboard-list'
import { CloseIcon as X } from '@solar-icons/react/bold/close'
import { useIsMobile } from '../lib/useIsMobile'

const C = {
  bg: 'var(--color-bg)', card: 'var(--color-surface)', border: 'var(--color-border)',
  blue: 'var(--color-primary)', muted: 'var(--color-text-secondary)', text: 'var(--color-text)',
}

function groupBySession(rows) {
  const map = new Map()
  for (const m of rows) {
    const sid = m.session_id || 'default'
    if (!map.has(sid)) map.set(sid, [])
    map.get(sid).push(m)
  }
  return Array.from(map.entries())
    .map(([id, msgs]) => ({ id, msgs, lastAt: msgs[msgs.length - 1]?.created_at }))
    .sort((a, b) => (a.lastAt < b.lastAt ? 1 : -1))
}

function sessionPreview(msgs) {
  const firstUser = msgs.find(m => m.role === 'user')
  const text = firstUser ? firstUser.content.slice(0, 48) + (firstUser.content.length > 48 ? '...' : '') : 'Conversa sem mensagens'
  const date = msgs[0]?.created_at ? new Date(msgs[0].created_at).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' }) : ''
  return { text, date }
}

export default function Coach() {
  const navigate = useNavigate()
  const { user, profile, checkGate, consumeAI } = useAuth()
  const isMobile = useIsMobile()

  const [myProjects, setMyProjects] = useState([])
  const [pickerOpen, setPickerOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  // Grupos "Por projeto" fecham por omissão — só o grupo do projeto ativo
  // começa aberto. Clicar no nome do projeto (com a seta) abre/fecha; sem
  // isto, uma sessão listada por baixo do nome do projeto parecia solta,
  // sem deixar claro a que projeto pertencia.
  const [expandedProjects, setExpandedProjects] = useState(new Set())
  function toggleProjectExpanded(id) {
    setExpandedProjects(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }
  // Projeto sobre o qual se está a falar agora (null = conversa geral).
  // Guarda a linha completa do projeto (não só id/name/slug) porque o
  // project-coach precisa do objetivo/problema/solução/etc. para dar
  // respostas com contexto real, não genéricas.
  const [activeProject, setActiveProject] = useState(null)

  const [messages, setMessages] = useState([])
  const [sessionId, setSessionId] = useState(null)
  const [allGlobalMsgs, setAllGlobalMsgs] = useState([])
  const [projectCoachMsgs, setProjectCoachMsgs] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [gateMsg, setGateMsg] = useState(null)
  const bottomRef = useRef(null)

  useEffect(() => {
    if (!user) { navigate('/login'); return }
  }, [user])

  useEffect(() => {
    if (!user) return
    supabase.from('projects').select('id, name, slug').eq('user_id', user.id).order('created_at', { ascending: false })
      .then(({ data }) => setMyProjects(data || []))
  }, [user])

  // Histórico da conversa "geral" (persistido, continua entre visitas).
  // Mesmo padrão de sessões do coach dentro do projeto: agrupado por
  // session_id, "Nova conversa" não apaga nada, só começa uma sessão nova.
  useEffect(() => {
    if (!user) return
    supabase.from('global_coach_messages').select('role, content, session_id, created_at').eq('user_id', user.id)
      .order('created_at', { ascending: true }).limit(500)
      .then(({ data }) => {
        if (!data?.length) return
        setAllGlobalMsgs(data)
        const savedSid = localStorage.getItem('global_coach_session')
        if (savedSid === 'new') return
        const lastSid = savedSid || data[data.length - 1]?.session_id
        const sessionMsgs = data.filter(m => m.session_id === lastSid)
        setMessages(sessionMsgs.map(m => ({ role: m.role, content: m.content })))
        setSessionId(lastSid)
      })
  }, [user])

  // Histórico do coach de cada projeto (só para listar no painel — a
  // conversa em si continua a abrir-se dentro do próprio projeto).
  useEffect(() => {
    if (!user || !myProjects.length) return
    supabase.from('coach_messages').select('project_id, role, content, session_id, created_at')
      .in('project_id', myProjects.map(p => p.id)).eq('user_id', user.id)
      .order('created_at', { ascending: true }).limit(1000)
      .then(({ data }) => setProjectCoachMsgs(data || []))
  }, [user, myProjects])

  const globalSessions = useMemo(() => groupBySession(allGlobalMsgs), [allGlobalMsgs])

  const projectSessions = useMemo(() => {
    const byProject = new Map()
    for (const m of projectCoachMsgs) {
      if (!byProject.has(m.project_id)) byProject.set(m.project_id, [])
      byProject.get(m.project_id).push(m)
    }
    const result = new Map()
    for (const [pid, rows] of byProject) result.set(pid, groupBySession(rows))
    return result
  }, [projectCoachMsgs])

  function openGlobalSession(sess) {
    setMessages(sess.msgs.map(m => ({ role: m.role, content: m.content })))
    setSessionId(sess.id)
    localStorage.setItem('global_coach_session', sess.id)
    setHistoryOpen(false)
  }

  // Carrega o contexto completo do projeto (campos do score, não só
  // id/name/slug) para o project-coach poder dar respostas específicas.
  async function loadFullProject(project) {
    const { data } = await supabase.from('projects').select('*').eq('id', project.id).single()
    return data || project
  }

  async function selectProject(project) {
    setPickerOpen(false)
    const full = await loadFullProject(project)
    setActiveProject(full)
    const rows = projectCoachMsgs.filter(m => m.project_id === project.id)
    const savedSid = localStorage.getItem(`coach_session_${project.id}`)
    const sid = savedSid && savedSid !== 'new' ? savedSid : rows[rows.length - 1]?.session_id
    if (sid) {
      setMessages(rows.filter(m => m.session_id === sid).map(m => ({ role: m.role, content: m.content })))
      setSessionId(sid)
    } else {
      setMessages([])
      setSessionId(null)
    }
  }

  function selectGeral() {
    setPickerOpen(false)
    setActiveProject(null)
    const savedSid = localStorage.getItem('global_coach_session')
    const sid = savedSid && savedSid !== 'new' ? savedSid : allGlobalMsgs[allGlobalMsgs.length - 1]?.session_id
    if (sid) {
      setMessages(allGlobalMsgs.filter(m => m.session_id === sid).map(m => ({ role: m.role, content: m.content })))
      setSessionId(sid)
    } else {
      setMessages([])
      setSessionId(null)
    }
  }

  async function openProjectSession(project, sess) {
    setHistoryOpen(false)
    const full = await loadFullProject(project)
    setActiveProject(full)
    setMessages(sess.msgs.map(m => ({ role: m.role, content: m.content })))
    setSessionId(sess.id)
    localStorage.setItem(`coach_session_${project.id}`, sess.id)
  }

  // Nova conversa dentro do contexto atual (geral ou do projeto ativo).
  function newConversation() {
    setMessages([])
    setSessionId(null)
    if (activeProject) localStorage.setItem(`coach_session_${activeProject.id}`, 'new')
    else localStorage.setItem('global_coach_session', 'new')
    setHistoryOpen(false)
  }

  // Botão dedicado do painel de histórico: sai sempre para a conversa geral.
  function newGeneralConversation() {
    setActiveProject(null)
    setMessages([])
    setSessionId(null)
    localStorage.setItem('global_coach_session', 'new')
    setHistoryOpen(false)
  }

  const greeting = useMemo(() => {
    const name = profile?.full_name?.split(' ')[0] || ''
    if (activeProject) return `Olá${name ? `, ${name}` : ''}! Estamos a falar sobre o projeto "${activeProject.name}". Pergunta-me o que quiseres sobre ele.`
    return myProjects.length === 0
      ? `Olá${name ? `, ${name}` : ''}! Ainda não tens nenhum projeto criado. Posso ajudar-te a escolher um tema, pensar numa ideia, ou qualquer dúvida que tenhas antes de começares.`
      : `Olá${name ? `, ${name}` : ''}! Esta é a conversa geral, não ligada a nenhum projeto específico. Se quiseres falar sobre um dos teus projetos em concreto, escolhe-o no seletor em cima.`
  }, [profile, myProjects, activeProject])

  const suggestions = useMemo(() => {
    if (activeProject) return ['O que está mais fraco no meu projeto?', 'Como me preparo para a defesa?', 'Escreve-me um texto para a secção de resultados.']
    return myProjects.length === 0
      ? ['Preciso de ideias para a minha PAP', 'Como estruturo um projeto do zero?', 'Que tecnologias devo usar?']
      : ['Como melhoro o meu portefólio?', 'Como me preparo para a defesa?', 'O que devo fazer a seguir?']
  }, [myProjects, activeProject])

  async function send(e) {
    e?.preventDefault()
    const msg = input.trim()
    if (!msg || loading) return
    const gate = checkGate('coach')
    if (!gate.allowed) { setGateMsg(gate.message); return }

    const next = [...messages, { role: 'user', content: msg }]
    setMessages(next)
    setInput('')
    setLoading(true)
    try {
      const reply = activeProject
        ? await chatProjectCoach({ project: activeProject, messages, message: msg })
        : await chatGlobalCoach({ messages, message: msg })
      consumeAI('coach')
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
      const sid = sessionId || crypto.randomUUID()
      const now = new Date().toISOString()
      if (activeProject) {
        if (!sessionId) { setSessionId(sid); localStorage.setItem(`coach_session_${activeProject.id}`, sid) }
        setProjectCoachMsgs(prev => [...prev, { project_id: activeProject.id, role: 'user', content: msg, session_id: sid, created_at: now }, { project_id: activeProject.id, role: 'assistant', content: reply, session_id: sid, created_at: now }])
        supabase.from('coach_messages').insert([
          { project_id: activeProject.id, user_id: user.id, role: 'user', content: msg, session_id: sid },
          { project_id: activeProject.id, user_id: user.id, role: 'assistant', content: reply, session_id: sid },
        ]).then(({ error }) => { if (error) console.error('[coach_messages]', error.message) })
      } else {
        if (!sessionId) { setSessionId(sid); localStorage.setItem('global_coach_session', sid) }
        setAllGlobalMsgs(prev => [...prev, { role: 'user', content: msg, session_id: sid, created_at: now }, { role: 'assistant', content: reply, session_id: sid, created_at: now }])
        supabase.from('global_coach_messages').insert([
          { user_id: user.id, role: 'user', content: msg, session_id: sid },
          { user_id: user.id, role: 'assistant', content: reply, session_id: sid },
        ]).then(({ error }) => { if (error) console.error('[global_coach_messages]', error.message) })
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Ocorreu um erro. Tenta novamente.' }])
    }
    setLoading(false)
  }

  if (!user) return null

  const isEmpty = messages.length === 0
  const hasHistory = globalSessions.length > 0 || projectSessions.size > 0

  const picker = myProjects.length > 0 && (
    <div style={{ position: 'relative', minWidth: 0, flex: isMobile ? 1 : undefined }}>
      <button
        onClick={() => setPickerOpen(v => !v)}
        style={{ display: 'flex', alignItems: 'center', gap: 6, width: isMobile ? '100%' : undefined, maxWidth: isMobile ? undefined : 160, background: 'var(--color-bg-alt)', border: `1px solid ${C.border}`, borderRadius: 9, padding: '8px 12px', color: C.text, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activeProject ? activeProject.name : 'Geral'}</span>
        <ChevronDown size={14} style={{ flexShrink: 0, marginLeft: isMobile ? 'auto' : 0 }} />
      </button>
      {pickerOpen && (
        <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, width: 240, background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.2)', zIndex: 20, maxHeight: 320, overflowY: 'auto', padding: '6px 0' }}>
          <button
            onClick={selectGeral}
            style={{ display: 'block', width: '100%', textAlign: 'left', background: !activeProject ? 'var(--color-primary-subtle)' : 'none', border: 'none', padding: '9px 14px', fontSize: 13, fontWeight: 600, color: !activeProject ? 'var(--color-primary)' : C.text, cursor: 'pointer', fontFamily: 'inherit' }}
          >Geral (sem projeto)</button>
          <div style={{ padding: '10px 14px 7px', fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Falar sobre um projeto</div>
          {myProjects.map(p => (
            <button
              key={p.id}
              onClick={() => selectProject(p)}
              style={{ display: 'block', width: '100%', textAlign: 'left', background: activeProject?.id === p.id ? 'var(--color-primary-subtle)' : 'none', border: 'none', padding: '9px 14px', fontSize: 13, color: activeProject?.id === p.id ? 'var(--color-primary)' : C.text, fontWeight: activeProject?.id === p.id ? 600 : 400, cursor: 'pointer', fontFamily: 'inherit', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              onMouseEnter={e => { if (activeProject?.id !== p.id) e.currentTarget.style.background = 'var(--color-bg-alt)' }}
              onMouseLeave={e => { if (activeProject?.id !== p.id) e.currentTarget.style.background = 'transparent' }}
            >{p.name}</button>
          ))}
        </div>
      )}
    </div>
  )

  const inputBar = (
    <form onSubmit={send} style={{ display: 'flex', gap: 8, alignItems: 'center', width: '100%' }}>
      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
        placeholder="Pergunta o que quiseres..."
        disabled={loading}
        autoFocus
        style={{ flex: 1, minWidth: 0, background: 'var(--color-bg-alt)', border: `1px solid ${C.border}`, borderRadius: 10, padding: '12px 14px', fontSize: 13, color: C.text, fontFamily: 'inherit', outline: 'none', opacity: loading ? 0.6 : 1 }}
      />
      <button
        type="submit"
        disabled={!input.trim() || loading}
        title="Enviar"
        style={{
          flexShrink: 0, width: 42, height: 42,
          background: input.trim() && !loading ? C.blue : 'transparent',
          border: `1px solid ${input.trim() && !loading ? C.blue : C.border}`,
          borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: input.trim() && !loading ? '#fff' : C.muted,
          cursor: input.trim() && !loading ? 'pointer' : 'default',
        }}
      ><Send size={16} /></button>
    </form>
  )

  const historyPanel = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '14px 14px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Conversas</span>
        <button
          className="coach-history-close"
          onClick={() => setHistoryOpen(false)}
          style={{ display: 'none', background: 'none', border: 'none', cursor: 'pointer', color: C.muted, padding: 4 }}
        ><X size={16} /></button>
      </div>
      <div style={{ padding: '0 10px 10px', flexShrink: 0 }}>
        <button
          onClick={newGeneralConversation}
          style={{ display: 'flex', alignItems: 'center', gap: 7, width: '100%', background: 'var(--color-primary-subtle)', border: '1px solid var(--color-primary-subtle)', borderRadius: 9, padding: '9px 12px', color: 'var(--color-primary)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
          Nova conversa (geral)
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 10px 14px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em', padding: '8px 4px 6px' }}>Geral</div>
        {globalSessions.length === 0 && <div style={{ fontSize: 12, color: C.muted, padding: '4px 4px 10px' }}>Sem conversas ainda.</div>}
        {globalSessions.map(sess => {
          const { text, date } = sessionPreview(sess.msgs)
          const active = sess.id === sessionId
          return (
            <button
              key={sess.id}
              onClick={() => openGlobalSession(sess)}
              style={{ display: 'block', width: '100%', textAlign: 'left', background: active ? 'var(--color-primary-subtle)' : 'transparent', border: 'none', borderRadius: 8, padding: '8px 10px', marginBottom: 2, cursor: 'pointer', fontFamily: 'inherit' }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--color-bg-alt)' }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
            >
              <div style={{ fontSize: 12.5, color: active ? 'var(--color-primary)' : C.text, fontWeight: active ? 700 : 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{text}</div>
              <div style={{ fontSize: 10.5, color: C.muted, marginTop: 1 }}>{date}</div>
            </button>
          )
        })}

        {/* Só projetos com conversa real — listar todos, a maioria vazios,
            era o que tornava isto confuso. */}
        {myProjects.filter(p => (projectSessions.get(p.id) || []).length > 0).length > 0 && (
          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em', padding: '16px 4px 6px' }}>Por projeto</div>
        )}
        {myProjects.filter(p => (projectSessions.get(p.id) || []).length > 0).map(p => {
          const sessions = projectSessions.get(p.id) || []
          const expanded = expandedProjects.has(p.id) || activeProject?.id === p.id
          return (
            <div key={p.id} style={{ marginBottom: 10 }}>
              <button
                onClick={() => toggleProjectExpanded(p.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '5px 8px 5px 4px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', borderRadius: 6 }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--color-bg-alt)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <ChevronDown size={12} color={C.muted} style={{ flexShrink: 0, transition: 'transform 0.15s', transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)' }} />
                <span style={{ fontSize: 11.5, color: C.text, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left' }}>{p.name}</span>
              </button>
              {expanded && sessions.map(sess => {
                const { text, date } = sessionPreview(sess.msgs)
                const active = activeProject?.id === p.id && sess.id === sessionId
                return (
                  <button
                    key={sess.id}
                    onClick={() => openProjectSession(p, sess)}
                    style={{ display: 'block', width: '100%', textAlign: 'left', background: active ? 'var(--color-primary-subtle)' : 'transparent', border: 'none', borderRadius: 8, padding: '7px 10px 7px 21px', marginBottom: 2, cursor: 'pointer', fontFamily: 'inherit' }}
                    onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--color-bg-alt)' }}
                    onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
                  >
                    <div style={{ fontSize: 12, color: active ? 'var(--color-primary)' : C.text, fontWeight: active ? 700 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{text}</div>
                    <div style={{ fontSize: 10.5, color: C.muted, marginTop: 1 }}>{date}</div>
                  </button>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: 'inherit' }}>
      <Navbar />
      <div className="page-content" style={{ padding: 0 }}>
        <div style={{ display: 'flex', height: 'calc(100dvh - 70px)' }}>

          {/* Painel de histórico (docked no desktop, overlay no mobile) */}
          <div
            className={`coach-history-panel${historyOpen ? ' coach-history-open' : ''}`}
            style={{
              width: 272, flexShrink: 0,
              background: 'linear-gradient(165deg, var(--color-bg-alt), var(--color-bg))',
              borderRadius: '0 22px 22px 0',
              boxShadow: '10px 0 28px -18px rgba(0,0,0,0.45)',
            }}
          >
            {historyPanel}
          </div>
          {historyOpen && <div className="coach-history-backdrop" onClick={() => setHistoryOpen(false)} />}

          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            <div style={{ maxWidth: 760, width: '100%', margin: '0 auto', padding: '0 clamp(16px,3vw,24px)', display: 'flex', flexDirection: 'column', flex: 1, boxSizing: 'border-box', minHeight: 0 }}>

              {/* Header: duas versões, não uma só espremida.
                  Desktop: ícone + "Coach IA"/legenda à esquerda, badge +
                  nova conversa + seletor à direita — como sempre foi.
                  Mobile: nada de "Coach IA" repetido (já se sabe onde se
                  está) nem ícone a ocupar espaço — pedido do Gustavo depois
                  de ver o título a sobrepor-se ao badge num ecrã estreito.
                  Fica o seletor de projeto a esticar (é o controlo que
                  interessa, já identifica o contexto sozinho — "Geral" ou
                  o nome do projeto) e o badge/nova conversa compactos ao
                  lado, tudo numa linha só. */}
              {isMobile ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '16px 0' }}>
                  <button
                    className="coach-history-toggle"
                    onClick={() => setHistoryOpen(true)}
                    title="Conversas"
                    style={{ display: 'none', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, minHeight: 0, background: 'var(--color-bg-alt)', border: `1px solid ${C.border}`, borderRadius: 9, color: C.muted, cursor: 'pointer', flexShrink: 0 }}
                  ><HistoryIcon size={16} /></button>
                  {picker || (
                    <div style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {activeProject ? activeProject.name : 'Geral'}
                    </div>
                  )}
                  <AiUsageBadge feature="coach" compact style={{ flexShrink: 0 }} />
                  {!isEmpty && (
                    <button
                      onClick={newConversation}
                      title="Nova conversa"
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, minHeight: 0, background: 'var(--color-bg-alt)', border: `1px solid ${C.border}`, borderRadius: 9, color: C.muted, cursor: 'pointer', flexShrink: 0 }}
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
                    </button>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 'clamp(16px,3vw,24px) 0 16px', flexShrink: 0 }}>
                  <button
                    className="coach-history-toggle"
                    onClick={() => setHistoryOpen(true)}
                    title="Conversas"
                    style={{ display: 'none', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, minHeight: 0, background: 'var(--color-bg-alt)', border: `1px solid ${C.border}`, borderRadius: 9, color: C.muted, cursor: 'pointer', flexShrink: 0 }}
                  ><HistoryIcon size={16} /></button>
                  <div style={{ width: 38, height: 38, borderRadius: 11, background: 'var(--color-primary-subtle)', border: '1px solid var(--color-primary-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Bot size={19} color="var(--color-primary)" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 17, fontWeight: 700, color: C.text }}>Coach IA</div>
                    <div style={{ fontSize: 12, color: C.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activeProject ? `A falar sobre: ${activeProject.name}` : 'Conselho sobre o teu percurso'}</div>
                  </div>
                  <AiUsageBadge feature="coach" />
                  {!isEmpty && (
                    <button
                      onClick={newConversation}
                      title="Nova conversa"
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, minHeight: 0, background: 'var(--color-bg-alt)', border: `1px solid ${C.border}`, borderRadius: 9, color: C.muted, cursor: 'pointer' }}
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
                    </button>
                  )}
                  {picker}
                </div>
              )}

              {isEmpty ? (
                // Sem mensagens ainda: tudo centrado a meio do ecrã (como o
                // ecrã de "nova conversa" do ChatGPT/Claude), em vez de deixar
                // um vazio enorme entre a saudação e a caixa lá em baixo.
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, paddingBottom: '10vh' }}>
                  <div style={{ width: 52, height: 52, borderRadius: 15, background: 'var(--color-primary-subtle)', border: '1px solid var(--color-primary-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Bot size={26} color="var(--color-primary)" />
                  </div>
                  <p style={{ margin: 0, maxWidth: 440, textAlign: 'center', fontSize: 14, color: C.muted, lineHeight: 1.6 }}>{greeting}</p>
                  <div style={{ width: '100%', maxWidth: 480 }}>{inputBar}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', maxWidth: 480 }}>
                    {suggestions.map(q => (
                      <button
                        key={q}
                        onClick={() => setInput(q)}
                        style={{ background: 'var(--color-bg-alt)', border: `1px solid ${C.border}`, borderRadius: 100, padding: '7px 14px', fontSize: 12, color: C.muted, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-primary-subtle)'; e.currentTarget.style.color = C.text }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.muted }}
                      >{q}</button>
                    ))}
                  </div>
                  {hasHistory && (
                    <button
                      className="coach-history-toggle-empty"
                      onClick={() => setHistoryOpen(true)}
                      style={{ display: 'none', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: C.muted, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}
                    ><HistoryIcon size={13} /> Ver conversas anteriores</button>
                  )}
                </div>
              ) : (
                <>
                  {/* Messages */}
                  <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 16 }}>
                    {messages.map((m, i) => (
                      <div key={i} style={{
                        alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                        maxWidth: '87%',
                        background: m.role === 'user' ? 'var(--color-primary)' : 'var(--color-bg-alt)',
                        border: m.role === 'user' ? 'none' : `1px solid ${C.border}`,
                        borderRadius: m.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                        padding: '10px 14px', fontSize: 13,
                        color: m.role === 'user' ? '#fff' : C.text,
                        lineHeight: 1.6,
                        whiteSpace: m.role === 'user' ? 'pre-wrap' : undefined,
                      }}>{m.role === 'assistant' ? renderMd(m.content) : m.content}</div>
                    ))}
                    {loading && (
                      <div style={{ alignSelf: 'flex-start', background: 'var(--color-bg-alt)', border: `1px solid ${C.border}`, borderRadius: '14px 14px 14px 4px', padding: '10px 16px', display: 'flex', gap: 5, alignItems: 'center' }}>
                        {[0, 1, 2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: C.muted, animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />)}
                      </div>
                    )}
                    <div ref={bottomRef} />
                  </div>

                  {/* Input */}
                  <div style={{ padding: '10px 0 16px', borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>{inputBar}</div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {gateMsg && <PlanGateModal message={gateMsg} onClose={() => setGateMsg(null)} />}

      <style>{`
        @keyframes bounce { 0%,60%,100% { transform: translateY(0); opacity: 0.4; } 30% { transform: translateY(-4px); opacity: 1; } }
        @media (max-width: 860px) {
          .coach-history-toggle, .coach-history-toggle-empty { display: flex !important; }
          .coach-history-panel {
            position: fixed; top: 0; bottom: 0; left: 0; width: 280px !important;
            z-index: 300; transform: translateX(-100%); transition: transform 0.2s ease-out;
          }
          .coach-history-open { transform: translateX(0); }
          .coach-history-close { display: flex !important; }
          .coach-history-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 299; }
        }
      `}</style>
    </div>
  )
}
