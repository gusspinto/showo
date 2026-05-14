import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Navbar } from '../components/Navbar'

const C = {
  bg: '#0d1424',
  bgAlt: '#0a1018',
  card: '#111c32',
  cardHover: '#152030',
  border: '#1e3050',
  borderBright: '#2a4275',
  blue: '#3b82f6',
  blueHover: '#2563eb',
  blueSoft: 'rgba(59,130,246,0.08)',
  text: '#e8f2ff',
  muted: '#7d93b0',
  subtle: '#3d5270',
  green: '#22c55e',
  greenSoft: 'rgba(34,197,94,0.08)',
  red: '#f87171',
  redSoft: 'rgba(248,113,113,0.08)',
  redBorder: 'rgba(248,113,113,0.25)',
  yellow: '#eab308',
  yellowSoft: 'rgba(234,179,8,0.08)',
  purple: '#a855f7',
  purpleSoft: 'rgba(168,85,247,0.08)',
  orange: '#f97316',
}

function StatCard({ icon, label, value, color = C.blue, sub }) {
  return (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`,
      borderRadius: 16, padding: '22px 24px',
      display: 'flex', alignItems: 'flex-start', gap: 16,
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 12, flexShrink: 0,
        background: color + '18', border: `1px solid ${color}30`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 20,
      }}>{icon}</div>
      <div>
        <div style={{ fontSize: 26, fontWeight: 800, color, letterSpacing: '-0.5px', lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 13, color: C.muted, fontWeight: 500, marginTop: 4 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: C.subtle, marginTop: 3 }}>{sub}</div>}
      </div>
    </div>
  )
}

function Badge({ children, color = C.blue, bg }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 5,
      background: bg || color + '18', border: `1px solid ${color}35`, color,
    }}>{children}</span>
  )
}

function Avatar({ name, color = 'linear-gradient(135deg,#3b82f6,#4f46e5)', size = 32 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: color, display: 'flex', alignItems: 'center',
      justifyContent: 'center', fontSize: size * 0.4,
      fontWeight: 700, color: '#fff',
    }}>{(name || '?')[0].toUpperCase()}</div>
  )
}

function ConfirmModal({ title, body, onConfirm, onCancel, danger = true }) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      }}
      onClick={e => e.target === e.currentTarget && onCancel()}
    >
      <div style={{
        background: C.card, border: `1px solid ${danger ? C.redBorder : C.borderBright}`,
        borderRadius: 18, padding: '28px 32px', maxWidth: 420, width: '100%',
        boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
      }}>
        <div style={{ fontSize: 28, marginBottom: 12, textAlign: 'center' }}>{danger ? '⚠️' : '❓'}</div>
        <h3 style={{ margin: '0 0 10px', fontSize: 17, fontWeight: 700, color: C.text, textAlign: 'center' }}>{title}</h3>
        <p style={{ margin: '0 0 24px', fontSize: 14, color: C.muted, textAlign: 'center', lineHeight: 1.6 }}>{body}</p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onCancel}
            style={{ flex: 1, background: 'transparent', border: `1px solid ${C.border}`, color: C.muted, borderRadius: 8, padding: '10px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
          >Cancelar</button>
          <button
            onClick={onConfirm}
            style={{ flex: 1, background: danger ? '#7f1d1d' : C.blue, border: `1px solid ${danger ? C.redBorder : 'transparent'}`, color: danger ? C.red : '#fff', borderRadius: 8, padding: '10px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
          >{danger ? 'Eliminar' : 'Confirmar'}</button>
        </div>
      </div>
    </div>
  )
}

// ─── OVERVIEW TAB ───────────────────────────────────────────
function OverviewTab({ users, projects }) {
  const totalUsers = users.length
  const totalProjects = projects.length
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  const newThisWeek = projects.filter(p => new Date(p.created_at) > weekAgo).length
  const newUsersWeek = users.filter(u => new Date(u.created_at) > weekAgo).length
  const scores = projects.filter(p => p.score > 0).map(p => p.score)
  const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0
  const admins = users.filter(u => u.is_admin).length

  const recentProjects = [...projects]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 8)

  const recentUsers = [...users]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 6)

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
        <StatCard icon="👤" label="Total de utilizadores" value={totalUsers} color={C.blue} sub={`+${newUsersWeek} esta semana`} />
        <StatCard icon="📁" label="Total de projetos" value={totalProjects} color={C.green} sub={`+${newThisWeek} esta semana`} />
        <StatCard icon="⭐" label="Score médio" value={avgScore} color={C.yellow} sub="nos projetos com score" />
        <StatCard icon="🛡️" label="Administradores" value={admins} color={C.purple} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Recent projects */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: '20px 22px' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 12, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 1 }}>Projetos recentes</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {recentProjects.map(p => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: C.bgAlt, border: `1px solid ${C.border}`, overflow: 'hidden', flexShrink: 0 }}>
                  {p.cover_url
                    ? <img src={p.cover_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>📁</div>
                  }
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: C.subtle }}>{p.creator_name || '—'}</div>
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.blue }}>{p.score || 0}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent users */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: '20px 22px' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 12, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 1 }}>Utilizadores recentes</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {recentUsers.map(u => (
              <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Avatar name={u.full_name || u.username} color={u.is_admin ? 'linear-gradient(135deg,#a855f7,#7c3aed)' : 'linear-gradient(135deg,#3b82f6,#4f46e5)'} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{u.full_name || u.username || 'Sem nome'}</div>
                  <div style={{ fontSize: 11, color: C.subtle }}>{u.email || '—'}</div>
                </div>
                {u.is_admin && <Badge color={C.purple}>Admin</Badge>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── USERS TAB ──────────────────────────────────────────────
function UsersTab({ users, projects, onToggleAdmin, onDeleteUser }) {
  const [search, setSearch] = useState('')
  const [confirm, setConfirm] = useState(null)

  const projectCount = {}
  projects.forEach(p => { if (p.user_id) projectCount[p.user_id] = (projectCount[p.user_id] || 0) + 1 })

  const filtered = users.filter(u => {
    const q = search.toLowerCase()
    return (
      (u.full_name || '').toLowerCase().includes(q) ||
      (u.username || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q)
    )
  })

  return (
    <div>
      {confirm && (
        <ConfirmModal
          title={confirm.type === 'delete' ? 'Eliminar utilizador?' : confirm.type === 'makeAdmin' ? 'Tornar administrador?' : 'Revogar administrador?'}
          body={confirm.type === 'delete'
            ? `Vais eliminar permanentemente a conta de "${confirm.user.full_name || confirm.user.username}". Esta ação não pode ser desfeita.`
            : confirm.type === 'makeAdmin'
            ? `"${confirm.user.full_name || confirm.user.username}" terá acesso total ao painel de administração.`
            : `Revogar os privilégios de admin de "${confirm.user.full_name || confirm.user.username}"?`
          }
          danger={confirm.type === 'delete'}
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            if (confirm.type === 'delete') onDeleteUser(confirm.user.id)
            else onToggleAdmin(confirm.user.id, confirm.type === 'makeAdmin')
            setConfirm(null)
          }}
        />
      )}

      <div style={{ marginBottom: 16 }}>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="🔍  Pesquisar por nome, username ou email…"
          style={{
            width: '100%', background: C.card, border: `1px solid ${C.border}`,
            borderRadius: 10, padding: '10px 14px', color: C.text, fontSize: 14,
            outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
          }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', color: C.muted, padding: '40px 0', fontSize: 14 }}>Nenhum utilizador encontrado</div>
        )}
        {filtered.map(u => {
          const name = u.full_name || u.username || 'Sem nome'
          const pCount = projectCount[u.id] || 0
          const joined = u.created_at ? new Date(u.created_at).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
          return (
            <div key={u.id} style={{
              background: C.card, border: `1px solid ${u.banned_at ? C.redBorder : C.border}`,
              borderRadius: 12, padding: '14px 16px',
              display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
            }}>
              <Avatar
                name={name}
                color={u.is_admin ? 'linear-gradient(135deg,#a855f7,#7c3aed)' : 'linear-gradient(135deg,#3b82f6,#4f46e5)'}
                size={38}
              />
              <div style={{ flex: 1, minWidth: 180 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', marginBottom: 3 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{name}</span>
                  {u.username && <span style={{ fontSize: 12, color: C.subtle }}>@{u.username}</span>}
                  {u.is_admin && <Badge color={C.purple}>🛡️ Admin</Badge>}
                  {u.banned_at && <Badge color={C.red}>Banido</Badge>}
                </div>
                <div style={{ fontSize: 12, color: C.muted }}>{u.email || '—'}</div>
              </div>
              <div style={{ display: 'flex', gap: 20, alignItems: 'center', fontSize: 12, color: C.subtle }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{pCount}</div>
                  <div>projeto{pCount !== 1 ? 's' : ''}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontWeight: 600, color: C.muted }}>{joined}</div>
                  <div>registo</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                {u.is_admin ? (
                  <button
                    onClick={() => setConfirm({ type: 'revokeAdmin', user: u })}
                    style={{ background: C.purpleSoft, border: `1px solid ${C.purple}30`, color: C.purple, borderRadius: 7, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                  >Revogar Admin</button>
                ) : (
                  <button
                    onClick={() => setConfirm({ type: 'makeAdmin', user: u })}
                    style={{ background: C.purpleSoft, border: `1px solid ${C.purple}30`, color: C.purple, borderRadius: 7, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                  >Tornar Admin</button>
                )}
                <button
                  onClick={() => setConfirm({ type: 'delete', user: u })}
                  style={{ background: C.redSoft, border: `1px solid ${C.redBorder}`, color: C.red, borderRadius: 7, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                >Eliminar</button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── PROJECTS TAB ───────────────────────────────────────────
function ProjectsTab({ projects, users, onDeleteProject }) {
  const [search, setSearch] = useState('')
  const [confirm, setConfirm] = useState(null)

  const userMap = {}
  users.forEach(u => { userMap[u.id] = u })

  const filtered = projects.filter(p => {
    const q = search.toLowerCase()
    return (
      (p.name || '').toLowerCase().includes(q) ||
      (p.creator_name || '').toLowerCase().includes(q) ||
      (p.area || '').toLowerCase().includes(q)
    )
  })

  const scoreColor = s => s >= 80 ? C.green : s >= 50 ? C.yellow : s >= 20 ? C.orange : C.subtle

  return (
    <div>
      {confirm && (
        <ConfirmModal
          title="Eliminar projeto?"
          body={`Vais eliminar permanentemente o projeto "${confirm.name}". Esta ação não pode ser desfeita.`}
          danger
          onCancel={() => setConfirm(null)}
          onConfirm={() => { onDeleteProject(confirm.id); setConfirm(null) }}
        />
      )}

      <div style={{ marginBottom: 16 }}>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="🔍  Pesquisar por nome, criador ou área…"
          style={{
            width: '100%', background: C.card, border: `1px solid ${C.border}`,
            borderRadius: 10, padding: '10px 14px', color: C.text, fontSize: 14,
            outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
          }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', color: C.muted, padding: '40px 0', fontSize: 14 }}>Nenhum projeto encontrado</div>
        )}
        {filtered.map(p => {
          const created = p.created_at ? new Date(p.created_at).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
          const creator = p.creator_name || userMap[p.user_id]?.full_name || userMap[p.user_id]?.username || 'Anónimo'
          return (
            <div key={p.id} style={{
              background: C.card, border: `1px solid ${C.border}`,
              borderRadius: 12, padding: '12px 16px',
              display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
            }}>
              {/* Thumbnail */}
              <div style={{ width: 48, height: 36, borderRadius: 6, background: C.bgAlt, border: `1px solid ${C.border}`, overflow: 'hidden', flexShrink: 0 }}>
                {p.cover_url
                  ? <img src={p.cover_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>📁</div>
                }
              </div>
              {/* Info */}
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 2 }}>{p.name}</div>
                <div style={{ fontSize: 12, color: C.subtle, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <span>👤 {creator}</span>
                  {p.area && <span>📌 {p.area}</span>}
                  <span>📅 {created}</span>
                </div>
              </div>
              {/* Score */}
              <div style={{ textAlign: 'center', flexShrink: 0 }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: scoreColor(p.score || 0) }}>{p.score || 0}</div>
                <div style={{ fontSize: 10, color: C.subtle, textTransform: 'uppercase', letterSpacing: 0.5 }}>score</div>
              </div>
              {/* Actions */}
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <a
                  href={`/projeto/${p.slug}`} target="_blank" rel="noopener noreferrer"
                  style={{ background: C.blueSoft, border: `1px solid ${C.blue}30`, color: C.blue, borderRadius: 7, padding: '6px 12px', fontSize: 12, fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
                >Ver</a>
                <button
                  onClick={() => setConfirm({ id: p.id, name: p.name })}
                  style={{ background: C.redSoft, border: `1px solid ${C.redBorder}`, color: C.red, borderRadius: 7, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                >Eliminar</button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── MAIN COMPONENT ─────────────────────────────────────────
export default function Admin() {
  const navigate = useNavigate()
  const { user, isAdmin, loading: authLoading } = useAuth()
  const [tab, setTab] = useState('overview')
  const [users, setUsers] = useState([])
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')

  // Guard
  useEffect(() => {
    if (!authLoading && !isAdmin) navigate('/', { replace: true })
  }, [authLoading, isAdmin, navigate])

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 3500)
  }

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [profilesRes, projectsRes, emailsRes] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('projects').select('*').order('created_at', { ascending: false }),
        supabase.rpc('admin_get_users'),
      ])

      const emailMap = {}
      if (emailsRes.data) {
        emailsRes.data.forEach(e => { emailMap[e.id] = e.email })
      }

      const enrichedProfiles = (profilesRes.data || []).map(p => ({
        ...p,
        email: emailMap[p.id] || p.email || null,
      }))

      setUsers(enrichedProfiles)
      setProjects(projectsRes.data || [])
    } catch (err) {
      console.error('Admin load error', err)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (isAdmin) loadData()
  }, [isAdmin, loadData])

  async function handleToggleAdmin(userId, makeAdmin) {
    const { error } = await supabase
      .from('profiles')
      .update({ is_admin: makeAdmin })
      .eq('id', userId)
    if (error) { showToast('❌ Erro ao atualizar permissões'); return }
    showToast(makeAdmin ? '✅ Utilizador é agora administrador' : '✅ Privilégios revogados')
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_admin: makeAdmin } : u))
  }

  async function handleDeleteUser(userId) {
    const { error } = await supabase.rpc('admin_delete_user', { target_user_id: userId })
    if (error) { showToast('❌ Erro ao eliminar utilizador: ' + error.message); return }
    showToast('✅ Utilizador eliminado')
    setUsers(prev => prev.filter(u => u.id !== userId))
    setProjects(prev => prev.filter(p => p.user_id !== userId))
  }

  async function handleDeleteProject(projectId) {
    const { error } = await supabase.from('projects').delete().eq('id', projectId)
    if (error) { showToast('❌ Erro ao eliminar projeto: ' + error.message); return }
    showToast('✅ Projeto eliminado')
    setProjects(prev => prev.filter(p => p.id !== projectId))
  }

  if (authLoading || (!isAdmin && !authLoading)) return null

  const tabs = [
    { id: 'overview', label: '📊 Visão geral' },
    { id: 'users',    label: `👤 Utilizadores (${users.length})` },
    { id: 'projects', label: `📁 Projetos (${projects.length})` },
  ]

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: 'Inter, system-ui, sans-serif' }}>
      <Navbar>
        <div style={{ fontSize: 12, color: C.purple, fontWeight: 700, background: C.purpleSoft, border: `1px solid ${C.purple}30`, borderRadius: 6, padding: '4px 10px' }}>
          🛡️ Admin
        </div>
      </Navbar>

      {/* Toast */}
      <div style={{
        position: 'fixed', bottom: 28, left: '50%', transform: `translateX(-50%) translateY(${toast ? 0 : 80}px)`,
        opacity: toast ? 1 : 0, transition: 'all 0.35s cubic-bezier(0.34,1.56,0.64,1)',
        background: '#111c32', border: `1px solid ${C.borderBright}`, borderRadius: 12,
        padding: '12px 24px', fontSize: 14, fontWeight: 600, color: C.text,
        zIndex: 3000, pointerEvents: 'none', whiteSpace: 'nowrap',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      }}>{toast}</div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px 80px' }}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 6 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: 'linear-gradient(135deg,#a855f7,#7c3aed)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, boxShadow: '0 4px 16px rgba(168,85,247,0.3)',
            }}>🛡️</div>
            <div>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, letterSpacing: '-0.3px' }}>Painel de Administração</h1>
              <p style={{ margin: 0, fontSize: 13, color: C.muted }}>Gestão completa de utilizadores e projetos</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 4, width: 'fit-content' }}>
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                background: tab === t.id ? C.blue : 'transparent',
                color: tab === t.id ? '#fff' : C.muted,
                border: 'none', borderRadius: 8,
                padding: '8px 18px', fontSize: 13, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit',
                transition: 'all 0.15s',
              }}
            >{t.label}</button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '80px 0', gap: 14 }}>
            <div style={{ width: 36, height: 36, border: `3px solid ${C.border}`, borderTop: `3px solid ${C.blue}`, borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <span style={{ color: C.muted }}>A carregar dados…</span>
          </div>
        ) : (
          <>
            {tab === 'overview' && <OverviewTab users={users} projects={projects} />}
            {tab === 'users' && (
              <UsersTab
                users={users}
                projects={projects}
                onToggleAdmin={handleToggleAdmin}
                onDeleteUser={handleDeleteUser}
              />
            )}
            {tab === 'projects' && (
              <ProjectsTab
                projects={projects}
                users={users}
                onDeleteProject={handleDeleteProject}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}
