import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Navbar } from '../components/Navbar'
import { PlanGateModal, AiUsageBadge } from '../components/PlanGate'
import { chatGlobalCoach } from '../lib/chatGlobalCoach'
import { renderMd } from '../lib/renderMd'
import { BotIcon as Bot } from '@solar-icons/react/bold/bot'
import { AltArrowDownIcon as ChevronDown } from '@solar-icons/react/bold/alt-arrow-down'
import { PlaneIcon as Send } from '@solar-icons/react/bold/plane'

const C = {
  bg: 'var(--color-bg)', card: 'var(--color-surface)', border: 'var(--color-border)',
  blue: 'var(--color-primary)', muted: 'var(--color-text-secondary)', text: 'var(--color-text)',
}

export default function Coach() {
  const navigate = useNavigate()
  const { user, profile, checkGate, consumeAI } = useAuth()

  const [myProjects, setMyProjects] = useState([])
  const [picker, setPicker] = useState(false)

  const [messages, setMessages] = useState([])
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
  useEffect(() => {
    if (!user) return
    supabase.from('global_coach_messages').select('role, content').eq('user_id', user.id)
      .order('created_at', { ascending: true }).limit(100)
      .then(({ data }) => { if (data?.length) setMessages(data.map(m => ({ role: m.role, content: m.content }))) })
  }, [user])

  const greeting = useMemo(() => {
    const name = profile?.full_name?.split(' ')[0] || ''
    return myProjects.length === 0
      ? `Olá${name ? `, ${name}` : ''}! Ainda não tens nenhum projeto criado. Posso ajudar-te a escolher um tema, pensar numa ideia, ou qualquer dúvida que tenhas antes de começares.`
      : `Olá${name ? `, ${name}` : ''}! Esta é a conversa geral, não ligada a nenhum projeto específico. Se quiseres falar sobre um dos teus projetos em concreto, escolhe-o no seletor em cima.`
  }, [profile, myProjects])

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
      const reply = await chatGlobalCoach({ messages, message: msg })
      consumeAI('coach')
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
      supabase.from('global_coach_messages').insert([
        { user_id: user.id, role: 'user', content: msg },
        { user_id: user.id, role: 'assistant', content: reply },
      ]).then(({ error }) => { if (error) console.error('[global_coach_messages]', error.message) })
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Ocorreu um erro. Tenta novamente.' }])
    }
    setLoading(false)
  }

  if (!user) return null

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: 'inherit' }}>
      <Navbar />
      <div className="page-content" style={{ padding: 0 }}>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: 'clamp(16px,3vw,28px) clamp(12px,3vw,24px) 0', display: 'flex', flexDirection: 'column', height: 'calc(100dvh - 70px)', boxSizing: 'border-box' }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexShrink: 0 }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: 'var(--color-primary-subtle)', border: '1px solid var(--color-primary-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Bot size={19} color="var(--color-primary)" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 17, fontWeight: 700, color: C.text }}>Coach IA</div>
              <div style={{ fontSize: 12, color: C.muted, display: 'flex', alignItems: 'center', gap: 6 }}>
                Conselho sobre o teu percurso <AiUsageBadge feature="coach" compact />
              </div>
            </div>

            {/* Seletor: geral ou ir para o coach de um projeto específico */}
            {myProjects.length > 0 && (
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setPicker(v => !v)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--color-bg-alt)', border: `1px solid ${C.border}`, borderRadius: 9, padding: '8px 12px', color: C.text, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  Geral <ChevronDown size={14} />
                </button>
                {picker && (
                  <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, width: 240, background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.2)', zIndex: 20, maxHeight: 280, overflowY: 'auto', padding: '6px 0' }}>
                    <div style={{ padding: '7px 14px', fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Falar sobre um projeto</div>
                    {myProjects.map(p => (
                      <button
                        key={p.id}
                        onClick={() => navigate(`/projeto/${p.slug}?coach=1`)}
                        style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '9px 14px', fontSize: 13, color: C.text, cursor: 'pointer', fontFamily: 'inherit', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--color-bg-alt)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >{p.name}</button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 16 }}>
            {messages.length === 0 && (
              <div style={{ background: 'var(--color-primary-subtle)', border: '1px solid var(--color-primary-subtle)', borderRadius: 12, padding: '14px 16px', fontSize: 13, color: C.text, lineHeight: 1.6 }}>
                <span style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Coach IA</span>
                {greeting}
              </div>
            )}
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
          <form onSubmit={send} style={{ padding: '10px 0 16px', borderTop: `1px solid ${C.border}`, display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
              placeholder="Pergunta o que quiseres..."
              disabled={loading}
              autoFocus
              style={{ flex: 1, minWidth: 0, background: 'var(--color-bg-alt)', border: `1px solid ${C.border}`, borderRadius: 10, padding: '11px 14px', fontSize: 13, color: C.text, fontFamily: 'inherit', outline: 'none', opacity: loading ? 0.6 : 1 }}
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              title="Enviar"
              style={{
                flexShrink: 0, width: 40, height: 40,
                background: input.trim() && !loading ? C.blue : 'transparent',
                border: `1px solid ${input.trim() && !loading ? C.blue : C.border}`,
                borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: input.trim() && !loading ? '#fff' : C.muted,
                cursor: input.trim() && !loading ? 'pointer' : 'default',
              }}
            ><Send size={16} /></button>
          </form>
        </div>
      </div>

      {gateMsg && <PlanGateModal message={gateMsg} onClose={() => setGateMsg(null)} />}

      <style>{`@keyframes bounce { 0%,60%,100% { transform: translateY(0); opacity: 0.4; } 30% { transform: translateY(-4px); opacity: 1; } }`}</style>
    </div>
  )
}
