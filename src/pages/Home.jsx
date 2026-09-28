import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { ArrowRightIcon as ArrowRight } from '@solar-icons/react/bold/arrow-right'
import { CupStarIcon as Trophy } from '@solar-icons/react/bold/cup-star'
import { EyeIcon as Eye } from '@solar-icons/react/bold/eye'
import { FireIcon as Fire } from '@solar-icons/react/bold/fire'
import { Navbar } from '../components/Navbar'
import { supabase } from '../lib/supabase'
import BrandScene from '../components/BrandScene'
import HomeHow from '../components/HomeHow'
import TestimonialsMarquee from '../components/TestimonialsMarquee'
import { useAuth } from '../context/AuthContext'
import { getAreaColor } from '../lib/areaColor'
import { trackEvent } from '../lib/analytics'
import './Home.css'

const TITLE_FONT_CSS = {
  croogla:  'Croogla, sans-serif',
  syne:     'Syne, sans-serif',
  playfair: '"Playfair Display", serif',
  space:    '"Space Grotesk", sans-serif',
  fredoka:  '"Fredoka One", cursive',
  inter:    'Inter, sans-serif',
}

const AREA_COLORS = {
  'Tecnologias de Informação': 'var(--color-primary)',
  'Design':                    'var(--color-accent)',
  'Marketing':                 'var(--color-warning)',
  'Gestão':                    'var(--color-success)',
  'Saúde':                     'var(--color-error)',
  'Engenharia':                'var(--color-info)',
}

function Reveal({ children, className, id }) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect() } },
      { threshold: 0.15, rootMargin: '0px 0px -60px 0px' }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return (
    <div ref={ref} id={id} className={`reveal-on-scroll${visible ? ' is-visible' : ''}${className ? ` ${className}` : ''}`}>
      {children}
    </div>
  )
}

function ProjectSkeleton() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="skel skel-card">
          <div className="skel-cover" />
          <div className="flex-col gap-2 p-4">
            <div className="skel-line w-40 h-sm" />
            <div className="skel-line w-80 h-lg" />
            <div className="skel-line w-full" />
            <div className="skel-line w-60" />
          </div>
        </div>
      ))}
    </>
  )
}

export default function Home() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const [projects, setProjects] = useState([])
  const [projectsLoading, setProjectsLoading] = useState(true)
  const [projectCount, setProjectCount] = useState(null)
  const [animatedCount, setAnimatedCount] = useState(0)
  const [projectOfMonth, setProjectOfMonth] = useState(null)

  useEffect(() => {
    const currentMonth = new Date().toISOString().slice(0, 7) // "2026-08"
    supabase
      .from('project_of_month')
      .select(`month, note, project:project_id (id, name, slug, area, ai_tagline, score, cover_url, preview_style, user_id, creator_name)`)
      .eq('month', currentMonth)
      .maybeSingle()
      .then(({ data }) => {
        if (!data?.project) return
        // Fetch owner profile
        supabase.from('profiles').select('full_name, username, avatar_url').eq('id', data.project.user_id).maybeSingle()
          .then(({ data: profile }) => {
            setProjectOfMonth({ ...data, profile: profile || null })
          })
      })
  }, [])

  useEffect(() => {
    async function load() {
      // Ordenado por consistência (semanas com registo no diário, últimas 12
      // semanas) antes do score — quem acompanha o projeto ao longo do tempo
      // fica à frente de quem o fez tudo numa noite. Score continua a
      // desempatar e a preencher quando ninguém tem atividade recente, por
      // isso a secção nunca fica vazia.
      const { data } = await supabase.rpc('get_featured_projects', { p_limit: 6, p_weeks: 12 })
      if (data) setProjects(data)
      setProjectsLoading(false)

      // Total real (inclui privados) via RPC — desde a RLS 163, uma query
      // direta a esta tabela como anon só via visibility=public/null,
      // deixaria de contar os privados. A função devolve só o número.
      const { data: totalCount } = await supabase.rpc('get_total_project_count')
      if (totalCount != null) setProjectCount(totalCount)
    }
    load()
  }, [])

  useEffect(() => {
    if (projectCount == null) return
    let raf
    const duration = 1100
    const start = performance.now()
    function tick(now) {
      const progress = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setAnimatedCount(Math.round(eased * projectCount))
      if (progress < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [projectCount])

  /* Suporte genérico para /#id — o hambúrguer já não aponta para cá (passou
     a linkar /aprende, a página a sério, não este scroll), mas a secção
     "Como funciona" mantém o id, e qualquer link futuro que aponte para
     /#como-funciona continua a funcionar sem precisar de mexer aqui outra
     vez. Depende de location.hash, não só do mount, porque quem já está na
     home não remonta a página — só muda o hash. */
  useEffect(() => {
    if (!location.hash) return
    const el = document.getElementById(location.hash.slice(1))
    if (el) requestAnimationFrame(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }, [location.hash])

  return (
    <div className="min-h-screen bg-page font-body">
      <Navbar hideSidebar />

      {/* ── home-content: envolve tudo o que não é a barra de navegação.
          No telemóvel vira flex-column com order, e a ordem visual deixa de
          ser a ordem do DOM: "o que é" → "como funciona" → prova → última
          ação. No desktop fica igual a hoje — nenhuma order é aplicada fora
          da media query de mobile. ── */}
      <div className="home-content">

      {/* ══ Hero ══ */}
      <div className="home-hero">

        <div className="home-hero-grid">
          {/* Left — copy */}
          <div className="home-hero-copy">
            <BrandScene opacity={0.85} />
            <div className="home-hero-copy-content">
            {/* 28/09: "Mostra o que construíste" ficou vago a mais — sem
                dizer para quem nem o que se ganha, não dava para ninguém
                pensar "é isto que preciso". Volta a tagline que já vivia
                só no <title> (index.html) e nunca tinha aparecido na
                própria página, com uma linha concreta por baixo: quem vê
                o resultado (professor, recrutador, cliente), não só "o
                trabalho". O subtítulo tinha saído de propósito antes — a
                explicação estava só no "Como funciona" — mas isso fica
                scroll abaixo, longe do primeiro ecrã que decide se a
                pessoa fica. 28/09 (2ª ronda): o Gustavo achou o título um
                "label gigante" — mantém-se o texto (é concreto, diz o que
                se ganha), mas mais pequeno e com menos peso, para ler como
                título e não como slogan a gritar. */}
            <h1 className="home-hero-h1">
              Do projeto<br />à oportunidade.
            </h1>
            <p className="home-hero-sub">
              Transforma os teus projetos num portefólio profissional — PAP, trabalhos de curso ou o que estiveres a construir agora — e mostra-o a quem decide.
            </p>

            <div className="home-hero-stats">
              <span className="home-hero-stats-number">
                {projectCount == null ? '—' : animatedCount}
              </span>
              <span className="home-hero-stats-label">
                projetos criados<br />por estudantes portugueses
              </span>
            </div>
            </div>
          </div>

          {/* ── Arranque ── 28/09: já não faz login/registo aqui dentro (ver
              histórico do ficheiro). 28/09 (2ª ronda, feedback do Gustavo):
              o segundo botão ia direto para /register — mas ir primeiro
              para /login (mesmo para quem ainda não tem conta) é mais
              natural: a pessoa vê o ecrã de entrar, percebe "ah, ainda não
              tenho conta" e só aí segue para criar uma — Login.jsx já tem
              o link "Regista-te". "Criar conta" fica como texto pequeno
              por baixo, para quem já sabe que quer registar-se direto. */}
          <div className="home-hero-start">
            <button
              type="button"
              className="home-start-cta"
              onClick={() => { trackEvent('home_create_clicked'); navigate('/novo') }}
            >
              Começar a criar <ArrowRight size={18} />
            </button>
            <button
              type="button"
              className="home-start-cta-secondary"
              onClick={() => { trackEvent('home_login_clicked'); navigate('/login') }}
            >
              Entrar
            </button>

            <p className="home-start-login">
              Ainda não tens conta? <Link to="/register">Criar conta</Link>
            </p>

            <p className="home-start-privacy">
              Ao continuares, aceitas a{' '}
              <button type="button" onClick={() => navigate('/privacidade')}>Política de Privacidade</button>.
            </p>
          </div>
        </div>
      </div>

      {/* ══ Como funciona (logo a seguir ao hero, antes de qualquer prova social —
          quem chega do vídeo/anúncio precisa de perceber o que é isto antes de
          ver projetos ou testemunhos) ══ */}
      <Reveal className="home-how-reveal">
        <HomeHow />
      </Reveal>

      {/* ══ Testemunhos (a seguir ao "como funciona", antes dos projetos) ══ */}
      <Reveal className="home-section home-testimonials-section">
        <div className="home-section-inner">
          <h2 className="home-section-title home-testimonials-title">Quem já usa</h2>
          <TestimonialsMarquee />
        </div>
      </Reveal>

      {/* ══ Projeto do Mês ══ */}
      {projectOfMonth && (() => {
        const p = projectOfMonth.project
        const profile = projectOfMonth.profile
        const monthLabel = (() => {
          const [y, m] = projectOfMonth.month.split('-')
          return new Date(+y, +m - 1, 1).toLocaleString('pt-PT', { month: 'long', year: 'numeric' })
        })()
        const displayName = profile?.full_name || p.creator_name || 'Estudante'
        const avatar = profile?.avatar_url
        return (
          <Reveal className="home-pom-wrap">
            <div className="home-pom-inner">
              <div
                className="home-pom-card"
                onClick={() => navigate(`/projeto/${p.slug}`)}
                style={{ cursor: 'pointer' }}
              >
                {/* Background cover or gradient */}
                <div className="home-pom-bg">
                  {p.cover_url
                    ? <img src={p.cover_url} alt="" className="home-pom-cover-img" />
                    : <div className="home-pom-cover-gradient" style={{ background: AREA_COLORS[p.area] || 'var(--color-primary)' }} />
                  }
                  <div className="home-pom-overlay" />
                </div>

                {/* Content */}
                <div className="home-pom-content">
                  {/* Badge */}
                  <div className="home-pom-badge">
                    <Trophy size={13} />
                    Projeto do mês · {monthLabel}
                  </div>

                  {/* Title */}
                  <h2 className="home-pom-title" style={{
                    fontFamily: p.preview_style?.titleFont ? TITLE_FONT_CSS[p.preview_style.titleFont] : undefined,
                    textTransform: p.preview_style?.titleStyle === 'caps' ? 'uppercase' : undefined,
                  }}>
                    {p.name}
                  </h2>

                  {/* Tagline */}
                  {p.ai_tagline && (
                    <p className="home-pom-tagline">{p.ai_tagline}</p>
                  )}

                  {/* Author row */}
                  <div className="home-pom-author">
                    {avatar
                      ? <img src={avatar} alt="" className="home-pom-avatar" />
                      : <div className="home-pom-avatar home-pom-avatar-fallback">{displayName[0]?.toUpperCase()}</div>
                    }
                    <div>
                      <div className="home-pom-author-name">{displayName}</div>
                      {p.area && <div className="home-pom-author-area">{p.area}</div>}
                    </div>
                  </div>

                  {/* CTA */}
                  <div className="home-pom-footer">
                    <button className="home-pom-cta" onClick={e => { e.stopPropagation(); navigate(`/projeto/${p.slug}`) }}>
                      Ver projeto <ArrowRight size={14} />
                    </button>
                  </div>

                  {/* Optional admin note */}
                  {projectOfMonth.note && (
                    <p className="home-pom-note">"{projectOfMonth.note}"</p>
                  )}
                </div>
              </div>
            </div>
          </Reveal>
        )
      })()}

      {/* ══ Projects ══ */}
      <Reveal className="home-section">
        <div className="home-section-inner">
          <div className="home-section-header">
            <h2 className="home-section-title">Projetos em <span className="home-gradient-word">destaque</span></h2>
            <button onClick={() => navigate('/explorar')} className="home-explore-link">
              Ver todos <ArrowRight size={14} />
            </button>
          </div>

          <div className="home-projects-grid">
            {projectsLoading ? <ProjectSkeleton /> : projects.map(p => (
              <div key={p.id} className="home-project-card" onClick={() => navigate(`/projeto/${p.slug}`)}>
                <div
                  className="home-card-cover"
                  style={{
                    height: p.cover_url ? 120 : 72,
                    background: p.cover_url ? undefined : getAreaColor(p.area),
                    padding: p.cover_url ? 0 : '0 16px',
                  }}
                >
                  {p.cover_url ? (
                    <>
                      <img src={p.cover_url} alt="" />
                      <div className="home-card-cover-gradient" />
                    </>
                  ) : (
                    <span className="home-card-cover-letter">
                      {p.name?.[0]?.toUpperCase() || '?'}
                    </span>
                  )}
                </div>

                <div className="home-card-body">
                  <div className="home-card-meta">
                    {p.creator_name || 'Estudante'}{p.area ? ` · ${p.area}` : ''}
                  </div>
                  <h3 className="home-card-name" style={{
                    ...(p.preview_style?.titleFont ? { fontFamily: TITLE_FONT_CSS[p.preview_style.titleFont] } : {}),
                    ...(p.preview_style?.titleStyle === 'caps' ? { textTransform: 'uppercase', letterSpacing: '0.04em' } : {}),
                  }}>{p.name}</h3>
                  {p.ai_tagline && <p className="home-card-tagline">{p.ai_tagline}</p>}
                  <div className="home-card-footer">
                    {p.views != null && (
                      <div className="home-card-views"><Eye size={12} /> {p.views}</div>
                    )}
                    {p.manual_weeks >= 3 && (
                      <div className="home-card-streak"><Fire size={12} /> {p.manual_weeks} semanas seguidas</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Sem cartão — só o botão, direto a seguir aos projetos. Nenhuma
              frase a introduzi-lo; o herói já não usa nenhuma, esta é a
              mesma lógica. */}
          {!user && (
            <button className="home-cta-btn" onClick={() => navigate('/novo')}>
              Começa a criar <ArrowRight size={15} />
            </button>
          )}
        </div>
      </Reveal>

      {/* ══ Footer ══ */}
      <div className="home-footer">
        <button onClick={() => navigate('/termos')}>Termos de utilização</button>
        <button onClick={() => navigate('/privacidade')}>Política de privacidade</button>
      </div>
      </div>
    </div>
  )
}
