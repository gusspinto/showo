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
import { VerifiedCheckIcon as VerifiedCheck } from '@solar-icons/react/bold/verified-check'
import SegmentedTabs from '../components/SegmentedTabs'

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
  const [activeTab, setActiveTab] = useState('vagas')
  // Stats reais, nunca inventados: vagas publicadas é lifetime (todas, não
  // só as abertas), candidaturas recebidas só se calcula para o dono da
  // página (não há garantia de que um visitante público possa ler
  // candidaturas de outra pessoa, e não é suposto poder).
  const [stats, setStats] = useState({ totalVagas: 0, totalCandidaturas: null })

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
    const PROFILE_FIELDS = 'id, full_name, username, avatar_url, role, bio, company, company_role, company_website, linkedin_url, looking_for, company_description, company_location, company_industry, company_size, company_verified, created_at'
    const { data } = isUUID
      ? await supabase.from('profiles').select(PROFILE_FIELDS).eq('id', username).single()
      : await supabase.from('profiles').select(PROFILE_FIELDS).eq('username', username).single()

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

    // Vagas publicadas (lifetime, não só as abertas) é um número honesto
    // de mostrar a toda a gente. Candidaturas recebidas é informação do
    // negócio da própria empresa, só calculada para quem está a ver a
    // própria página.
    const { count: totalVagas } = await supabase
      .from('vagas')
      .select('id', { count: 'exact', head: true })
      .eq('recruiter_id', data.id)

    let totalCandidaturas = null
    if (user?.id === data.id) {
      const { data: allVagaIds } = await supabase.from('vagas').select('id').eq('recruiter_id', data.id)
      if (allVagaIds?.length) {
        const { count } = await supabase
          .from('candidaturas')
          .select('id', { count: 'exact', head: true })
          .in('vaga_id', allVagaIds.map(v => v.id))
        totalCandidaturas = count ?? 0
      } else {
        totalCandidaturas = 0
      }
    }
    setStats({ totalVagas: totalVagas ?? 0, totalCandidaturas })

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
  const name = company.company || company.full_name || 'Empresa'

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: 'inherit' }}>
      <Navbar />
      <div className="page-content">

        {/* ── Hero ──
            Centrado, como um cartão de perfil, em vez de avatar à esquerda
            e tudo o resto espalhado à direita (isso é que fazia o botão
            "Contactar" ficar mal colocado no mobile, a competir com o nome
            pelo mesmo espaço). Ações ficam sempre numa linha própria depois
            da bio, nunca espremidas ao lado do nome. Neutro: nada de cor
            especial por tipo de conta, só o selo de verificado (quando um
            admin confirmou a empresa a sério) e o azul nas ações reais. */}
        <div style={{ ...C.glassStyle, background: C.glass, border: `1px solid ${C.glassBorder}`, borderRadius: 'var(--radius-lg)', padding: 'clamp(24px,5vw,40px)', marginBottom: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          {/* Logo/Avatar centrado, com o selo sobreposto no canto. */}
          <div style={{ position: 'relative', marginBottom: 16 }}>
            {company.avatar_url ? (
              <img src={company.avatar_url} alt={name} className="ep-hero-logo" style={{ width: 96, height: 96, borderRadius: 'var(--radius-lg)', objectFit: 'cover', border: `2px solid ${C.border}` }} />
            ) : (
              <div className="ep-hero-logo" style={{ width: 96, height: 96, borderRadius: 'var(--radius-lg)', background: 'var(--color-surface-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 38, fontWeight: 400, fontFamily: 'var(--font-heading)', color: C.text, border: `2px solid ${C.border}` }}>
                {name[0].toUpperCase()}
              </div>
            )}
            {company.company_verified && (
              <div title="Empresa verificada" style={{ position: 'absolute', bottom: -4, right: -4, background: C.bg, borderRadius: 'var(--radius-full)', padding: 2, display: 'flex' }}>
                <VerifiedCheck size={22} color={C.blue} />
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            <h1 style={{ margin: 0, fontSize: 'clamp(20px,3vw,28px)', fontWeight: 400, color: C.text, letterSpacing: '-0.6px', fontFamily: 'var(--font-heading)' }}>{name}</h1>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: C.muted, background: 'var(--color-surface-hover)', padding: '3px 10px', borderRadius: 'var(--radius-full)', whiteSpace: 'nowrap' }}>
              {tipo.label}
            </span>
          </div>
          {company.company_role && (
            <p style={{ margin: '4px 0 0', fontSize: 14, color: C.muted }}>{company.company_role}</p>
          )}

          {/* Meta: pills reais (fundo + contorno), como o resto da app,
              em vez de só texto com um ícone ao lado. */}
          <div className="ep-meta" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14, justifyContent: 'center' }}>
            {company.company_location && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 600, color: C.muted, background: 'var(--color-surface-hover)', border: `1px solid ${C.border}`, borderRadius: 'var(--radius-full)', padding: '5px 12px' }}>
                <MapPin size={12} /> {company.company_location}
              </span>
            )}
            {company.company_industry && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 600, color: C.muted, background: 'var(--color-surface-hover)', border: `1px solid ${C.border}`, borderRadius: 'var(--radius-full)', padding: '5px 12px' }}>
                <Briefcase size={12} /> {company.company_industry}
              </span>
            )}
            {company.company_size && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 600, color: C.muted, background: 'var(--color-surface-hover)', border: `1px solid ${C.border}`, borderRadius: 'var(--radius-full)', padding: '5px 12px' }}>
                <Users size={12} /> {company.company_size} pessoas
              </span>
            )}
            {company.company_website && (
              <a href={company.company_website.startsWith('http') ? company.company_website : `https://${company.company_website}`}
                target="_blank" rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 600, color: C.blue, background: 'var(--color-primary-subtle)', border: '1px solid transparent', borderRadius: 'var(--radius-full)', padding: '5px 12px', textDecoration: 'none' }}>
                <Globe size={12} /> Website <ExternalLink size={11} />
              </a>
            )}
            {company.linkedin_url && (
              <a href={company.linkedin_url} target="_blank" rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 600, color: C.blue, background: 'var(--color-primary-subtle)', border: '1px solid transparent', borderRadius: 'var(--radius-full)', padding: '5px 12px', textDecoration: 'none' }}>
                <Link size={12} /> LinkedIn <ExternalLink size={11} />
              </a>
            )}
          </div>

          {(company.company_description || company.bio) && (
            <p style={{ margin: '18px 0 0', fontSize: 15, color: C.text, lineHeight: 1.7, maxWidth: 560, borderTop: `1px solid ${C.border}`, paddingTop: 18 }}>
              {company.company_description || company.bio}
            </p>
          )}

          {/* Ações: linha própria, sempre centrada, nunca a competir com o
              nome pelo mesmo espaço (era isso que ficava mal no mobile). */}
          <div className="ep-hero-actions" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginTop: 20 }}>
            {isOwnPage ? (
              <button onClick={() => navigate('/settings')}
                style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 'var(--radius-full)', padding: '10px 18px', color: C.muted, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'border-color 0.15s, color 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-border-hover)'; e.currentTarget.style.color = C.text }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.muted }}>
                <Settings size={14} /> Editar
              </button>
            ) : user ? (
              <button onClick={() => navigate(`/mensagens?to=${company.id}`)}
                style={{ display: 'flex', alignItems: 'center', gap: 7, background: C.blue, border: 'none', borderRadius: 'var(--radius-full)', padding: '10px 18px', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 2px 10px var(--color-primary-subtle)' }}>
                <MessageSquare size={14} /> Contactar
              </button>
            ) : null}
          </div>

          {/* Stats: números reais, nunca inventados. Vagas publicadas é
              clicável e salta para a tab, o "interativo" que faz sentido
              aqui sem fabricar um conceito de seguidores que não existe. */}
          <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap', justifyContent: 'center', width: '100%', marginTop: 24, paddingTop: 20, borderTop: `1px solid ${C.border}` }}>
            <button onClick={() => setActiveTab('vagas')}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
              <span style={{ fontSize: 20, fontWeight: 700, color: C.text }}>{stats.totalVagas}</span>
              <span style={{ fontSize: 11.5, color: C.muted }}>Vagas publicadas</span>
            </button>
            {stats.totalCandidaturas !== null && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <span style={{ fontSize: 20, fontWeight: 700, color: C.text }}>{stats.totalCandidaturas}</span>
                <span style={{ fontSize: 11.5, color: C.muted }}>Candidaturas recebidas</span>
              </div>
            )}
            {company.created_at && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <span style={{ fontSize: 20, fontWeight: 700, color: C.text }}>{new Date(company.created_at).toLocaleDateString('pt-PT', { month: 'short', year: 'numeric' })}</span>
                <span style={{ fontSize: 11.5, color: C.muted }}>Membro desde</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Secções por pílulas, como o resto da app (SegmentedTabs já
            usado em Vagas/Explorar/EditProject), em vez do cartão da
            sidebar a aparecer sempre por baixo sem seleção nenhuma. "Sobre"
            aparece sempre, para toda e qualquer empresa, não só quando já
            preencheu "o que procuram": não é um extra condicional. */}
        <div style={{ marginBottom: 20 }}>
          <SegmentedTabs
            value={activeTab}
            onChange={setActiveTab}
            size="compact"
            options={[
              { id: 'vagas', label: `Vagas (${vagas.length})` },
              { id: 'sobre', label: 'Sobre' },
            ]}
          />
        </div>

        {activeTab === 'vagas' ? (
          vagas.length === 0 ? (
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
                // O cartão aqui é sempre um resumo (sem requisitos, skills
                // ou descrição completa): o clique abre a vaga a sério em
                // /vagas, que já sabe destacar e dar scroll até ao card
                // certo via ?v=<id> (mesmo mecanismo da vaga partilhada).
                return (
                  <div key={v.id} role="button" tabIndex={0} onClick={() => navigate(`/vagas?v=${v.id}`)}
                    onKeyDown={e => { if (e.key === 'Enter') navigate(`/vagas?v=${v.id}`) }}
                    style={{ ...C.glassStyle, background: C.glass, border: `1px solid ${C.glassBorder}`, borderRadius: 'var(--radius-lg)', padding: '18px 20px', transition: 'border-color 0.15s', display: 'flex', flexDirection: 'column', gap: 10, cursor: 'pointer' }}
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
                        <button onClick={e => { e.stopPropagation(); navigate(`/vagas?v=${v.id}`) }}
                          style={{ background: C.blue, border: 'none', borderRadius: 'var(--radius-full)', padding: '10px 18px', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 2px 10px var(--color-primary-subtle)' }}>
                          Candidatar
                        </button>
                      ) : !user ? (
                        <button onClick={e => { e.stopPropagation(); navigate('/login') }}
                          style={{ background: C.blue, border: 'none', borderRadius: 'var(--radius-full)', padding: '10px 18px', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                          Entrar para candidatar
                        </button>
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>
          )
        ) : (
          <div style={{ ...C.glassStyle, background: C.glass, border: `1px solid ${C.glassBorder}`, borderRadius: 12, padding: '20px 20px 22px', display: 'flex', flexDirection: 'column', gap: 20 }}>
            {(company.company_description || company.bio) ? (
              <p style={{ margin: 0, fontSize: 14, color: C.text, lineHeight: 1.7 }}>{company.company_description || company.bio}</p>
            ) : (
              <p style={{ margin: 0, fontSize: 14, color: C.subtle, lineHeight: 1.7 }}>Ainda sem descrição.</p>
            )}
            {company.looking_for && (
              <div>
                <h3 style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 700, color: C.text }}>O que procuram</h3>
                <p style={{ margin: 0, fontSize: 14, color: C.muted, lineHeight: 1.7 }}>{company.looking_for}</p>
              </div>
            )}
          </div>
        )}

        {/* "O que é o Showo", para quem chega aqui de um link de vaga
            partilhado (WhatsApp, LinkedIn, etc.) sem nunca ter ouvido
            falar da plataforma. Fica fora das tabs porque não é conteúdo
            da empresa, é sobre a própria app. */}
        {!user && (
          <div style={{ ...C.glassStyle, background: C.glass, border: `1px solid ${C.glassBorder}`, borderRadius: 12, padding: '20px', marginTop: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ minWidth: 220 }}>
              <h3 style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 700, color: C.text }}>O que é o Showo</h3>
              <p style={{ margin: 0, fontSize: 13, color: C.muted, lineHeight: 1.6 }}>
                Uma plataforma onde qualquer pessoa, com ou sem experiência, mostra os projetos que já fez, com IA a ajudar a transformá-los num portefólio a sério.
              </p>
            </div>
            <button onClick={() => navigate('/register')}
              style={{ flexShrink: 0, background: C.blue, border: 'none', borderRadius: 'var(--radius-full)', padding: '10px 20px', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              Criar conta grátis
            </button>
          </div>
        )}

      </div>

      <style>{`
        @media (max-width: 480px) {
          .ep-hero-logo { width: 72px !important; height: 72px !important; }
        }
      `}</style>
    </div>
  )
}
