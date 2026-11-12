import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Navbar } from '../components/Navbar'
import { MapPointIcon as MapPin } from '@solar-icons/react/bold/map-point'
import { GlobeIcon as Globe } from '@solar-icons/react/bold/globe'
import { UsersGroupRoundedIcon as Users } from '@solar-icons/react/bold/users-group-rounded'
import { CaseIcon as Briefcase } from '@solar-icons/react/bold/case'
import { ChatRoundLineIcon as MessageSquare } from '@solar-icons/react/bold/chat-round-line'
import { SquareArrowRightUpIcon as ExternalLink } from '@solar-icons/react/bold/square-arrow-right-up'
import { Buildings2Icon as Building2 } from '@solar-icons/react/bold/buildings-2'
import { LinkIcon as Link } from '@solar-icons/react/bold/link'
import { ArrowLeftIcon as ArrowLeft } from '@solar-icons/react/bold/arrow-left'
import { SettingsIcon as Settings } from '@solar-icons/react/bold/settings'

const C = {
  bg:     'var(--color-bg)',
  card:   'var(--color-surface)',
  border: 'var(--color-border)',
  blue:   'var(--color-primary)',
  muted:  'var(--color-text-secondary)',
  text:   'var(--color-text)',
  subtle: 'var(--color-text-tertiary)',
  glass: 'var(--color-glass)', glassBorder: 'var(--color-glass-border)',
  glassStyle: { backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' },
}

const TIPO_INFO = {
  recrutador: { label: 'Recrutador',  color: 'var(--color-accent)', bg: 'var(--color-accent-subtle)' },
  empresa:    { label: 'Empresa',     color: 'var(--color-warning)', bg: 'var(--color-warning-subtle)' },
}

const STATUS_INFO = {
  pendente:  { label: 'Candidatado', color: 'var(--color-warning)', bg: 'var(--color-warning-subtle)' },
  aceite:    { label: 'Aceite',      color: 'var(--color-success)', bg: 'var(--color-success-subtle)'  },
  rejeitado: { label: 'Rejeitado',   color: 'var(--color-error)', bg: 'var(--color-error-subtle)'  },
}

function timeAgo(ts) {
  const diff = (Date.now() - new Date(ts)) / 1000
  if (diff < 86400)  return 'hoje'
  if (diff < 604800) return `há ${Math.floor(diff / 86400)} dias`
  return new Date(ts).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function EmpresaPage() {
  const { username } = useParams()
  const navigate  = useNavigate()
  const { user, profile: myProfile } = useAuth()

  const [company, setCompany]   = useState(null)
  const [vagas, setVagas]       = useState([])
  const [applied, setApplied]   = useState({}) // vagaId → candidatura
  const [loading, setLoading]   = useState(true)
  const [notFound, setNotFound] = useState(false)

  // Por id, não por username do URL: funciona tanto para /empresa/:username
  // como para o fallback por UUID (ex: links antigos sem username).
  const isOwnPage = !!user?.id && user.id === company?.id
  const myRole = myProfile?.role
  const isStudent = myRole === 'aluno' || myRole === 'professor' || !myRole

  useEffect(() => { loadPage() }, [username])

  async function loadPage() {
    setLoading(true)

    // Mesmo fallback do UserProfile.jsx: a maioria dos links já usa
    // username, mas alguns sítios ainda só têm o id à mão (ex: sem
    // username definido ainda).
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(username)
    const { data } = isUUID
      ? await supabase.from('profiles').select('id, full_name, username, avatar_url, role, bio, company, company_role, company_website, linkedin_url, looking_for, company_description, company_location, company_industry, company_size').eq('id', username).single()
      : await supabase.from('profiles').select('id, full_name, username, avatar_url, role, bio, company, company_role, company_website, linkedin_url, looking_for, company_description, company_location, company_industry, company_size').eq('username', username).single()

    if (!data || (data.role !== 'recrutador' && data.role !== 'empresa')) {
      setNotFound(true)
      setLoading(false)
      return
    }

    setCompany(data)

    const { data: vagasData } = await supabase
      .from('vagas')
      .select('*')
      .eq('recruiter_id', data.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    setVagas(vagasData ?? [])

    // Check if logged-in student has applied to any of these vagas
    if (user && isStudent && vagasData?.length) {
      const { data: cands } = await supabase
        .from('candidaturas')
        .select('vaga_id, status')
        .eq('student_id', user.id)
        .in('vaga_id', vagasData.map(v => v.id))

      const map = {}
      cands?.forEach(c => { map[c.vaga_id] = c })
      setApplied(map)
    }

    setLoading(false)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: C.bg }}>
      <Navbar />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 'calc(100dvh - 62px)' }}>
        <style>{`@keyframes ep-sh{0%{background-position:-300px 0}100%{background-position:300px 0}}`}</style>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          {[140, 90, 120].map((w, i) => (
            <div key={i} style={{ height: i === 0 ? 14 : 9, width: w, borderRadius: 6, background: 'linear-gradient(90deg,var(--color-bg-alt) 25%,var(--color-surface-hover) 50%,var(--color-bg-alt) 75%)', backgroundSize: '300px 100%', animation: `ep-sh 1.5s ease-in-out infinite ${i*0.12}s` }} />
          ))}
        </div>
      </div>
    </div>
  )

  if (notFound) return (
    <div style={{ minHeight: '100vh', background: C.bg }}>
      <Navbar />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 'calc(100dvh - 62px)', gap: 12, textAlign: 'center', padding: 32 }}>
        <Building2 size={40} color={C.muted} style={{ opacity: 0.4 }} />
        <p style={{ color: C.muted, fontSize: 15, fontWeight: 600, margin: 0 }}>Empresa não encontrada</p>
        <button onClick={() => navigate(-1)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 16px', color: C.muted, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          <ArrowLeft size={14} /> Voltar
        </button>
      </div>
    </div>
  )

  const tipo = TIPO_INFO[company.role] ?? TIPO_INFO.recrutador
  const accentColor = company.role === 'empresa' ? 'var(--color-warning)' : 'var(--color-accent)'
  const name = company.company || company.full_name || 'Empresa'

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: 'inherit' }}>
      <Navbar />
      <div className="page-content">

        {/* ── Hero ── */}
        <div style={{ ...C.glassStyle, background: C.glass, border: `1px solid ${C.glassBorder}`, borderRadius: 12, padding: 'clamp(20px,4vw,36px)', marginBottom: 20 }}>
          <div className="ep-hero" style={{ display: 'flex', alignItems: 'flex-start', gap: 20, flexWrap: 'wrap' }}>
            {/* Logo/Avatar */}
            <div style={{ flexShrink: 0 }}>
              {company.avatar_url ? (
                <img src={company.avatar_url} alt={name} className="ep-hero-logo" style={{ width: 88, height: 88, borderRadius: 14, objectFit: 'cover', border: `2px solid ${C.border}` }} />
              ) : (
                <div className="ep-hero-logo" style={{ width: 88, height: 88, borderRadius: 14, background: accentColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, fontWeight: 400, fontFamily: 'var(--font-heading)', color: '#fff', border: `2px solid ${C.border}` }}>
                  {name[0].toUpperCase()}
                </div>
              )}
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
                <h1 style={{ margin: 0, fontSize: 'clamp(20px,3vw,28px)', fontWeight: 400, color: C.text, letterSpacing: '-0.6px', fontFamily: 'var(--font-heading)' }}>{name}</h1>
                <span style={{ fontSize: 11, fontWeight: 700, color: tipo.color }}>
                  {tipo.label}
                </span>
              </div>

              {company.company_role && (
                <p style={{ margin: '0 0 10px', fontSize: 14, color: C.muted }}>{company.company_role}</p>
              )}

              {/* Meta */}
              <div className="ep-meta" style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
                {company.company_location && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: C.muted }}>
                    <MapPin size={13} /> {company.company_location}
                  </span>
                )}
                {company.company_industry && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: C.muted }}>
                    <Briefcase size={13} /> {company.company_industry}
                  </span>
                )}
                {company.company_size && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: C.muted }}>
                    <Users size={13} /> {company.company_size} pessoas
                  </span>
                )}
                {company.company_website && (
                  <a href={company.company_website.startsWith('http') ? company.company_website : `https://${company.company_website}`}
                    target="_blank" rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: C.blue, textDecoration: 'none' }}>
                    <Globe size={13} /> Website <ExternalLink size={11} />
                  </a>
                )}
                {company.linkedin_url && (
                  <a href={company.linkedin_url} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: C.blue, textDecoration: 'none' }}>
                    <Link size={13} /> LinkedIn <ExternalLink size={11} />
                  </a>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="ep-hero-actions" style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
              {isOwnPage ? (
                <button onClick={() => navigate('/settings')}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 8, padding: '9px 16px', color: C.muted, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'border-color 0.15s, color 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-border-hover)'; e.currentTarget.style.color = C.text }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.muted }}>
                  <Settings size={14} /> Editar
                </button>
              ) : user ? (
                <button onClick={() => navigate(`/mensagens?to=${company.id}`)}
                  style={{ display: 'flex', alignItems: 'center', gap: 7, background: C.blue, border: 'none', borderRadius: 8, padding: '9px 18px', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 2px 8px var(--color-primary-subtle)' }}>
                  <MessageSquare size={14} /> Contactar
                </button>
              ) : null}
            </div>
          </div>

          {/* Description / bio */}
          {(company.company_description || company.bio) && (
            <p style={{ margin: '20px 0 0', fontSize: 15, color: C.text, lineHeight: 1.7, maxWidth: 680, borderTop: `1px solid ${C.border}`, paddingTop: 18 }}>
              {company.company_description || company.bio}
            </p>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,300px)', gap: 20, alignItems: 'start' }} className="empresa-grid">

          {/* ── Vagas abertas ── */}
          <div>
            <h2 style={{ color: C.text, fontSize: 18, fontWeight: 400, margin: '0 0 14px', letterSpacing: '-0.4px', fontFamily: 'var(--font-heading)' }}>
              Vagas abertas <span style={{ fontSize: 13, fontWeight: 600, color: C.muted, marginLeft: 6, fontFamily: 'var(--font-body)' }}>({vagas.length})</span>
            </h2>

            {vagas.length === 0 ? (
              <div style={{ ...C.glassStyle, background: C.glass, border: `1px solid ${C.glassBorder}`, borderRadius: 12, padding: '40px 24px', textAlign: 'center' }}>
                <Briefcase size={32} color={C.muted} style={{ opacity: 0.4, marginBottom: 10 }} />
                <p style={{ color: C.muted, fontSize: 14, margin: 0 }}>Sem vagas abertas de momento</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {vagas.map(v => {
                  const cand = applied[v.id]
                  const st   = cand ? STATUS_INFO[cand.status] ?? STATUS_INFO.pendente : null
                  // Mesma hierarquia do cartão público de Vagas.jsx: título
                  // em destaque e uma única linha de meta com "·" a separar
                  // factos, em vez de um ícone por linha. Sem logo aqui,
                  // porque a empresa é sempre a mesma desta página, já
                  // visível no hero acima.
                  const metaParts = []
                  if (v.localizacao && v.localizacao.trim().toLowerCase() !== 'remoto') metaParts.push(v.localizacao)
                  if (v.is_remote) metaParts.push('Remoto')
                  return (
                    <div key={v.id} style={{ ...C.glassStyle, background: C.glass, border: `1px solid ${C.glassBorder}`, borderRadius: 'var(--radius-lg)', padding: '18px 20px', transition: 'border-color 0.15s', display: 'flex', flexDirection: 'column', gap: 10 }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--color-border-hover)'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                        <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: C.text, lineHeight: 1.3, fontFamily: 'var(--font-heading)' }}>{v.titulo}</h3>
                        {v.tipo && (
                          <span style={{ fontSize: 10.5, fontWeight: 700, color: C.blue, background: 'var(--color-primary-subtle)', padding: '3px 9px', borderRadius: 'var(--radius-full)', whiteSpace: 'nowrap', flexShrink: 0 }}>{v.tipo}</span>
                        )}
                      </div>

                      {(metaParts.length > 0 || v.created_at) && (
                        <p style={{ margin: 0, fontSize: 12.5, color: C.muted, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          {metaParts.map((part, i) => (
                            <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              {i > 0 && <span style={{ color: C.subtle }}>·</span>}
                              {part}
                            </span>
                          ))}
                          {v.created_at && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              {metaParts.length > 0 && <span style={{ color: C.subtle }}>·</span>}
                              {timeAgo(v.created_at)}
                            </span>
                          )}
                        </p>
                      )}

                      {v.descricao && (
                        <p style={{ margin: 0, fontSize: 13, color: C.muted, lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {v.descricao}
                        </p>
                      )}

                      <div style={{ marginTop: 4 }}>
                        {st ? (
                          <span style={{ fontSize: 13, fontWeight: 700, color: st.color, background: st.bg, borderRadius: 'var(--radius-full)', padding: '10px 14px', display: 'inline-block' }}>
                            {st.label}
                          </span>
                        ) : user && isStudent ? (
                          <button onClick={() => navigate('/vagas')}
                            style={{ background: C.blue, border: 'none', borderRadius: 'var(--radius-full)', padding: '10px 18px', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 2px 10px var(--color-primary-subtle)' }}>
                            Candidatar
                          </button>
                        ) : !user ? (
                          <button onClick={() => navigate('/login')}
                            style={{ background: C.blue, border: 'none', borderRadius: 'var(--radius-full)', padding: '10px 18px', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                            Entrar para candidatar
                          </button>
                        ) : null}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* ── Sidebar: O que procuram ── */}
          <div>
            {company.looking_for && (
              <div style={{ ...C.glassStyle, background: C.glass, border: `1px solid ${C.glassBorder}`, borderRadius: 12, padding: '20px 20px 22px', marginBottom: 14 }}>
                <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: C.text }}>O que procuram</h3>
                <p style={{ margin: 0, fontSize: 13, color: C.muted, lineHeight: 1.7 }}>{company.looking_for}</p>
              </div>
            )}

            {/* "O que é o Showo", para quem chega aqui de um link de vaga
                partilhado (WhatsApp, LinkedIn, etc.) sem nunca ter ouvido
                falar da plataforma. Antes disto, havia aqui um cartão
                "Recrutador" a repetir a própria empresa (link morto, sem
                sentido, apontava para a mesma conta que já está a ver). */}
            <div style={{ ...C.glassStyle, background: C.glass, border: `1px solid ${C.glassBorder}`, borderRadius: 12, padding: '20px' }}>
              <h3 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 700, color: C.text }}>O que é o Showo</h3>
              <p style={{ margin: '0 0 14px', fontSize: 13, color: C.muted, lineHeight: 1.6 }}>
                Uma plataforma onde qualquer pessoa, com ou sem experiência, mostra os projetos que já fez, com IA a ajudar a transformá-los num portefólio a sério.
              </p>
              {!user && (
                <button onClick={() => navigate('/register')}
                  style={{ width: '100%', background: C.blue, border: 'none', borderRadius: 8, padding: '10px 16px', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Criar conta grátis
                </button>
              )}
            </div>
          </div>
        </div>

      </div>

      <style>{`
        @media (max-width: 720px) {
          .empresa-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 600px) {
          .ep-hero { flex-direction: column !important; align-items: flex-start !important; gap: 16px !important; }
          .ep-hero-actions { flex-wrap: wrap !important; gap: 8px !important; }
          .ep-meta { flex-wrap: wrap !important; gap: 8px !important; }
        }
        @media (max-width: 480px) {
          .ep-hero-logo { width: 60px !important; height: 60px !important; }
        }
      `}</style>
    </div>
  )
}
