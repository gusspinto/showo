import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Navbar } from '../components/Navbar'
import {
  LayoutDashboard, FolderOpen, BookOpen, Palette, User, Compass,
  Users2, MessageSquare, Swords, Star, Plus, Pin, ChevronRight,
  CheckCircle2, Zap, Target, TrendingUp, ArrowRight, AlignLeft,
  Quote, Image, BarChart2, Video, Layers, FileText, CalendarClock,
  Pencil, Trash2, ArrowUpRight, GraduationCap, Trophy, Eye, Lock,
  Sparkles, Globe, Settings,
} from 'lucide-react'
import './AprendeAUsar.css'

// ── Sections index ──────────────────────────────────────────────────────────
const SECTIONS = [
  { id: 'dashboard',   label: 'Dashboard',          Icon: LayoutDashboard,  color: '#1b78f7' },
  { id: 'projetos',    label: 'Projetos',            Icon: FolderOpen,       color: '#10b981' },
  { id: 'diario',      label: 'Diário de Projeto',   Icon: BookOpen,         color: '#f59e0b' },
  { id: 'preview',     label: 'Preview & Templates', Icon: Palette,          color: '#a78bfa' },
  { id: 'perfil',      label: 'Perfil Público',      Icon: User,             color: '#ec4899' },
  { id: 'explorar',    label: 'Explorar',            Icon: Compass,          color: '#06b6d4' },
  { id: 'turmas',      label: 'Turmas',              Icon: Users2,           color: '#f97316' },
  { id: 'mensagens',   label: 'Mensagens',           Icon: MessageSquare,    color: '#8b5cf6' },
  { id: 'missoes',     label: 'Missões',             Icon: Swords,           color: '#ef4444' },
  { id: 'score',       label: 'Sistema de Score',    Icon: Star,             color: '#d97706' },
]

// ── Mini mockup components ──────────────────────────────────────────────────
function MockupShell({ children, label }) {
  return (
    <div className="atu-mockup">
      <div className="atu-mockup-bar">
        <span className="atu-mockup-dot" style={{ background: '#ef4444' }} />
        <span className="atu-mockup-dot" style={{ background: '#f59e0b' }} />
        <span className="atu-mockup-dot" style={{ background: '#22c55e' }} />
        {label && <span className="atu-mockup-label">{label}</span>}
      </div>
      <div className="atu-mockup-body">{children}</div>
    </div>
  )
}

function MockupDashboard() {
  return (
    <MockupShell label="Dashboard">
      <div style={{ display: 'flex', gap: 6 }}>
        <div style={{ width: 44, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {['#1b78f7', '#10b981', '#f59e0b', '#a78bfa'].map((c, i) => (
            <div key={i} style={{ height: 28, borderRadius: 5, background: i === 0 ? c + '22' : 'var(--color-bg-alt)', border: i === 0 ? `1px solid ${c}44` : '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: i === 0 ? c : 'var(--color-border)' }} />
            </div>
          ))}
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
          <div style={{ height: 54, borderRadius: 6, background: 'rgba(27,120,247,0.12)', border: '1px solid rgba(27,120,247,0.22)', padding: '6px 8px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <div style={{ width: 28, height: 5, borderRadius: 2, background: 'rgba(255,255,255,0.6)' }} />
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              <div style={{ height: 14, width: 38, borderRadius: 4, background: '#1b78f7' }} />
              <div style={{ height: 14, width: 30, borderRadius: 4, background: 'rgba(27,120,247,0.3)', border: '1px solid rgba(27,120,247,0.4)' }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 5 }}>
            <div style={{ flex: 1, height: 38, borderRadius: 6, background: 'var(--color-glass)', border: '1px solid var(--color-glass-border)', padding: '5px 6px', display: 'flex', flexDirection: 'column', gap: 3 }}>
              <div style={{ width: 20, height: 3, borderRadius: 2, background: 'var(--color-text-tertiary)' }} />
              <div style={{ width: '70%', height: 4, borderRadius: 2, background: 'var(--color-text)' }} />
            </div>
            <div style={{ flex: 1, height: 38, borderRadius: 6, background: 'var(--color-glass)', border: '1px solid var(--color-glass-border)', padding: '5px 6px', display: 'flex', flexDirection: 'column', gap: 3 }}>
              <div style={{ width: 20, height: 3, borderRadius: 2, background: 'var(--color-text-tertiary)' }} />
              <div style={{ width: '55%', height: 4, borderRadius: 2, background: 'var(--color-text)' }} />
            </div>
          </div>
        </div>
      </div>
    </MockupShell>
  )
}

function MockupPinnedCard() {
  return (
    <MockupShell label="Projeto fixado">
      <div style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid var(--color-glass-border)' }}>
        <div style={{ height: 24, background: 'linear-gradient(90deg, rgba(27,120,247,0.4), rgba(27,120,247,0.1))', display: 'flex', alignItems: 'center', padding: '0 8px', gap: 5 }}>
          <div style={{ fontSize: 7, fontWeight: 700, color: '#fff', background: 'rgba(255,255,255,0.15)', borderRadius: 3, padding: '1px 4px' }}>PAP</div>
          <Pin size={8} color="rgba(255,255,255,0.8)" fill="rgba(255,255,255,0.8)" style={{ marginLeft: 'auto' }} />
          <Pencil size={8} color="rgba(255,255,255,0.7)" />
          <Trash2 size={8} color="rgba(255,255,255,0.5)" />
        </div>
        <div style={{ background: 'var(--color-glass)', padding: '8px 8px 8px', display: 'flex', flexDirection: 'column', gap: 5 }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <div style={{ flex: 1, height: 7, borderRadius: 3, background: 'var(--color-text)', opacity: 0.7 }} />
            <div style={{ fontSize: 9, fontWeight: 900, color: 'var(--color-primary)', lineHeight: 1 }}>82</div>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <div style={{ height: 14, flex: 1, borderRadius: 4, background: '#1b78f7', opacity: 0.9 }} />
            <div style={{ height: 14, flex: 1, borderRadius: 4, background: 'transparent', border: '1px solid var(--color-border)' }} />
            <div style={{ height: 14, flex: 1, borderRadius: 4, background: 'transparent', border: '1px solid var(--color-border)' }} />
          </div>
        </div>
      </div>
    </MockupShell>
  )
}

function MockupDiary() {
  const kinds = [
    { label: 'Progresso', c: '#1b78f7' },
    { label: 'Dificuldade', c: '#ef4444' },
    { label: 'Decisão', c: '#f59e0b' },
    { label: 'Resultado', c: '#10b981' },
  ]
  return (
    <MockupShell label="Diário de Projeto">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {kinds.map(k => (
          <div key={k.label} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 6px', borderRadius: 5, background: k.c + '12', border: `1px solid ${k.c}28` }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: k.c, flexShrink: 0 }} />
            <div style={{ fontSize: 8, fontWeight: 700, color: k.c }}>{k.label}</div>
            <div style={{ flex: 1, height: 3, borderRadius: 2, background: k.c + '44' }} />
          </div>
        ))}
      </div>
    </MockupShell>
  )
}

function MockupPreview() {
  return (
    <MockupShell label="Editor de Preview">
      <div style={{ display: 'flex', gap: 6, height: 90 }}>
        <div style={{ width: 56, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
          {['Estilo', 'Blocos', 'Templates'].map((t, i) => (
            <div key={t} style={{ height: i === 2 ? 22 : 18, borderRadius: 4, background: i === 2 ? 'var(--color-primary-subtle)' : 'var(--color-bg-alt)', border: i === 2 ? '1px solid var(--color-primary-muted)' : '1px solid var(--color-border)', display: 'flex', alignItems: 'center', padding: '0 5px', fontSize: 7, fontWeight: 700, color: i === 2 ? 'var(--color-primary)' : 'var(--color-text-secondary)' }}>
              {t}
            </div>
          ))}
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {[
            { label: 'Midnight Tech', bg: '#030508', ac: '#1b78f7' },
            { label: 'Cosmic', bg: '#160b2a', ac: '#7c3aed' },
            { label: 'Forest', bg: '#081408', ac: '#0d9488' },
          ].map(tpl => (
            <div key={tpl.label} style={{ display: 'flex', gap: 4, borderRadius: 4, overflow: 'hidden', border: '1px solid var(--color-border)' }}>
              <div style={{ width: 18, background: tpl.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, padding: '3px 2px' }}>
                <div style={{ width: 10, height: 2, borderRadius: 1, background: tpl.ac }} />
                <div style={{ width: 12, height: 3, borderRadius: 1, background: 'rgba(255,255,255,0.6)' }} />
              </div>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '0 4px', fontSize: 7, fontWeight: 700, color: 'var(--color-text)' }}>{tpl.label}</div>
            </div>
          ))}
        </div>
      </div>
    </MockupShell>
  )
}

function MockupProfile() {
  return (
    <MockupShell label="Perfil Público">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--color-primary-subtle)', border: '2px solid var(--color-primary-muted)', flexShrink: 0 }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <div style={{ width: 60, height: 5, borderRadius: 2, background: 'var(--color-text)', opacity: 0.7 }} />
            <div style={{ width: 40, height: 3, borderRadius: 2, background: 'var(--color-text-tertiary)' }} />
          </div>
        </div>
        <div>
          <div style={{ fontSize: 7, fontWeight: 700, color: '#f59e0b', marginBottom: 4 }}>⭐ Em destaque</div>
          <div style={{ display: 'flex', gap: 4 }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ flex: 1, height: 32, borderRadius: 5, background: 'var(--color-glass)', border: '1px solid rgba(245,158,11,0.28)' }} />
            ))}
          </div>
        </div>
      </div>
    </MockupShell>
  )
}

function MockupScore() {
  const bars = [
    { label: 'Projeto', pct: 80, c: '#1b78f7' },
    { label: 'Apresentação', pct: 60, c: '#a78bfa' },
    { label: 'Diário', pct: 90, c: '#10b981' },
    { label: 'Conteúdo', pct: 70, c: '#f59e0b' },
    { label: 'Validação', pct: 40, c: '#ec4899' },
  ]
  return (
    <MockupShell label="Score do projeto">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {bars.map(b => (
          <div key={b.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ fontSize: 7, color: 'var(--color-text-secondary)', width: 48, flexShrink: 0 }}>{b.label}</div>
            <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'var(--color-bg-alt)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${b.pct}%`, borderRadius: 2, background: b.c }} />
            </div>
          </div>
        ))}
      </div>
    </MockupShell>
  )
}

// ── Section component ───────────────────────────────────────────────────────
function Section({ id, icon: Icon, color, title, subtitle, children }) {
  return (
    <section id={id} className="atu-section">
      <div className="atu-section-head">
        <div className="atu-section-icon" style={{ background: color + '18', border: `1px solid ${color}30` }}>
          <Icon size={18} color={color} />
        </div>
        <div>
          <h2 className="atu-section-title">{title}</h2>
          {subtitle && <p className="atu-section-subtitle">{subtitle}</p>}
        </div>
      </div>
      {children}
    </section>
  )
}

function Tip({ children }) {
  return (
    <div className="atu-tip">
      <Sparkles size={13} color="#f59e0b" />
      <span>{children}</span>
    </div>
  )
}

function Steps({ items }) {
  return (
    <ol className="atu-steps">
      {items.map((item, i) => (
        <li key={i} className="atu-step">
          <span className="atu-step-num">{i + 1}</span>
          <span>{item}</span>
        </li>
      ))}
    </ol>
  )
}

function Tags({ items }) {
  return (
    <div className="atu-tags">
      {items.map(({ label, color: c }) => (
        <span key={label} className="atu-tag" style={{ background: c + '18', color: c, border: `1px solid ${c}30` }}>{label}</span>
      ))}
    </div>
  )
}

function InfoCard({ icon: Icon, color, title, body }) {
  return (
    <div className="atu-info-card">
      <div className="atu-info-icon" style={{ background: color + '15', border: `1px solid ${color}25` }}>
        <Icon size={14} color={color} />
      </div>
      <div>
        <div className="atu-info-title">{title}</div>
        <div className="atu-info-body">{body}</div>
      </div>
    </div>
  )
}

// ── Main page ───────────────────────────────────────────────────────────────
export default function AprendeAUsar() {
  const navigate = useNavigate()
  const [activeSection, setActiveSection] = useState('dashboard')
  const contentRef = useRef(null)

  useEffect(() => {
    const el = contentRef.current
    if (!el) return
    function onScroll() {
      const sectionEls = SECTIONS.map(s => document.getElementById(s.id)).filter(Boolean)
      let current = SECTIONS[0].id
      for (const sec of sectionEls) {
        if (sec.getBoundingClientRect().top <= 100) current = sec.id
      }
      setActiveSection(current)
    }
    el.addEventListener('scroll', onScroll)
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  function scrollTo(id) {
    const el = document.getElementById(id)
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setActiveSection(id)
  }

  return (
    <div className="atu-root">
      <Navbar />
      <div className="atu-layout">

        {/* ── Left sidebar index ── */}
        <aside className="atu-sidebar">
          <div className="atu-sidebar-header">
            <div className="atu-sidebar-title">Guia da plataforma</div>
            <div className="atu-sidebar-sub">Aprende a usar todas as funcionalidades</div>
          </div>
          <nav className="atu-sidebar-nav">
            {SECTIONS.map(({ id, label, Icon, color }) => (
              <button
                key={id}
                className={`atu-nav-btn${activeSection === id ? ' active' : ''}`}
                onClick={() => scrollTo(id)}
                style={activeSection === id ? { color, background: color + '12', borderColor: color + '30' } : {}}
              >
                <span className="atu-nav-icon" style={activeSection === id ? { background: color + '20' } : {}}>
                  <Icon size={14} color={activeSection === id ? color : undefined} />
                </span>
                <span>{label}</span>
                {activeSection === id && <ChevronRight size={12} style={{ marginLeft: 'auto' }} />}
              </button>
            ))}
          </nav>
        </aside>

        {/* ── Content ── */}
        <main className="atu-content" ref={contentRef}>

          <div className="atu-hero">
            <h1 className="atu-hero-title">Aprende a usar o Showo</h1>
            <p className="atu-hero-desc">Tudo o que precisas de saber para tirar o máximo partido da plataforma — da dashboard ao perfil público.</p>
          </div>

          {/* ── DASHBOARD ── */}
          <Section id="dashboard" icon={LayoutDashboard} color="#1b78f7" title="Dashboard" subtitle="O centro de controlo dos teus projetos">
            <div className="atu-two-col">
              <div>
                <p className="atu-text">A dashboard é o sítio onde acompanhas o estado dos teus projetos ativos. É a primeira coisa que vês ao entrar na plataforma.</p>
                <h3 className="atu-h3">O que encontras na dashboard</h3>
                <div className="atu-info-grid">
                  <InfoCard icon={LayoutDashboard} color="#1b78f7" title="Project Pulse" body="O teu projeto principal em destaque azul. Mostra as últimas entradas do diário e dá acesso rápido a Registar e ao Diário." />
                  <InfoCard icon={Pin} color="#60a5fa" title="Projetos fixados" body="Podes fixar até 2 projetos na dashboard. Aparecem como cards grandes com acesso rápido a todas as ações." />
                  <InfoCard icon={BarChart2} color="#10b981" title="Atividade recente" body="Resumo visual das entradas do diário nos últimos dias." />
                  <InfoCard icon={CalendarClock} color="#f59e0b" title="Recap semanal" body="No fim de cada semana recebes um resumo automático do que fizeste." />
                </div>
                <h3 className="atu-h3">Projetos fixados na dashboard</h3>
                <p className="atu-text">Podes fixar até 2 projetos para teres acesso rápido a partir da dashboard. Para fixar um projeto, vai à lista do teu portfólio e clica no ícone 📌 ao lado de cada projeto.</p>
                <Tip>O projeto em destaque (Project Pulse) é sempre o mais recente. Se fixares esse projeto, o card azul desaparece — o projeto fixado substitui-o.</Tip>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <MockupDashboard />
                <MockupPinnedCard />
              </div>
            </div>
          </Section>

          {/* ── PROJETOS ── */}
          <Section id="projetos" icon={FolderOpen} color="#10b981" title="Projetos" subtitle="Criar, editar e gerir os teus projetos">
            <div className="atu-two-col">
              <div>
                <p className="atu-text">Cada projeto na plataforma tem uma página pública com o teu trabalho. Podes personalizar tudo: nome, área, descrição, imagem de capa, tecnologias e muito mais.</p>
                <h3 className="atu-h3">Criar um projeto</h3>
                <Steps items={[
                  'Clica em "Criar projeto" na sidebar ou no botão (+) da dashboard.',
                  'Escolhe o nome e o tipo de projeto (PAP, Estágio, Pessoal...).',
                  'Adiciona a área de trabalho e uma breve descrição.',
                  'O projeto fica publicado com a tua página pública acessível por link.',
                ]} />
                <h3 className="atu-h3">Tipos de projeto</h3>
                <Tags items={[
                  { label: 'PAP', color: '#1b78f7' },
                  { label: 'Estágio', color: '#10b981' },
                  { label: 'Trabalho de grupo', color: '#f59e0b' },
                  { label: 'Projeto pessoal', color: '#a78bfa' },
                  { label: 'Competição', color: '#ef4444' },
                  { label: 'Apresentação', color: '#06b6d4' },
                ]} />
                <h3 className="atu-h3">Editar o projeto</h3>
                <p className="atu-text">Acede à edição pelo botão ✏️ de qualquer lugar onde o projeto apareça. Podes preencher os campos de conteúdo (problema, solução, tecnologias, resultados...) — cada campo preenchido aumenta o teu score.</p>
                <Tip>Quanto mais campos preencheres, maior o score do projeto. Os campos de Resultados e Aprendizagens valem mais pontos.</Tip>
              </div>
              <div>
                <MockupShell label="Lista de projetos">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {[{ name: 'App de Gestão', score: 82, pinned: true }, { name: 'Site do Grupo', score: 61, pinned: false }, { name: 'Jogo Educativo', score: 45, pinned: false }].map((p, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 7px', borderRadius: 6, background: 'var(--color-glass)', border: '1px solid var(--color-glass-border)' }}>
                        <div style={{ flex: 1, fontSize: 8, fontWeight: 700, color: 'var(--color-text)' }}>{p.name}</div>
                        <div style={{ fontSize: 8, fontWeight: 900, color: 'var(--color-primary)' }}>{p.score}</div>
                        <Pin size={9} color={p.pinned ? '#60a5fa' : 'var(--color-text-tertiary)'} fill={p.pinned ? '#60a5fa' : 'none'} />
                        <Pencil size={9} color="var(--color-text-tertiary)" />
                        <Trash2 size={9} color="var(--color-text-tertiary)" />
                      </div>
                    ))}
                  </div>
                </MockupShell>
              </div>
            </div>
          </Section>

          {/* ── DIÁRIO ── */}
          <Section id="diario" icon={BookOpen} color="#f59e0b" title="Diário de Projeto" subtitle="Regista o processo do teu projeto dia a dia">
            <div className="atu-two-col">
              <div>
                <p className="atu-text">O Diário é onde documentas tudo o que acontece no teu projeto: o que fizeste, o que aprendeste, que decisões tomaste, que dificuldades encontraste.</p>
                <p className="atu-text">Cada entrada é um registo datado que fica associado ao projeto. No final, o conjunto das entradas é o teu portfólio de processo.</p>
                <h3 className="atu-h3">Tipos de registo</h3>
                <div className="atu-info-grid">
                  <InfoCard icon={TrendingUp} color="#1b78f7" title="Progresso" body="O que fizeste hoje. Avanços, tarefas concluídas, features implementadas." />
                  <InfoCard icon={Target} color="#ef4444" title="Dificuldade" body="Obstáculos encontrados, bugs, bloqueios — e como tentaste resolver." />
                  <InfoCard icon={Zap} color="#f59e0b" title="Decisão" body="Escolhas importantes que fizeste no projeto e o raciocínio por trás delas." />
                  <InfoCard icon={CheckCircle2} color="#10b981" title="Resultado" body="Conquistas, marcos alcançados, outputs concretos do projeto." />
                  <InfoCard icon={Eye} color="#a78bfa" title="Reflexão" body="O que aprendeste, o que farias diferente, insights sobre o processo." />
                  <InfoCard icon={GraduationCap} color="#06b6d4" title="Reunião" body="Encontros com o orientador, feedback recebido, notas de reunião." />
                </div>
                <h3 className="atu-h3">Como registar uma entrada</h3>
                <Steps items={[
                  'Na dashboard, clica em "Registar" no Project Pulse ou num projeto fixado.',
                  'Escolhe o tipo de registo (Progresso, Dificuldade, Decisão...).',
                  'Escreve a entrada — podes ser breve ou detalhado.',
                  'Clica em Guardar. A entrada fica no Diário do projeto.',
                ]} />
                <Tip>Registar com regularidade (mesmo que brevemente) vale pontos no score e mostra evolução ao longo do tempo.</Tip>
                <h3 className="atu-h3">Ver o Diário</h3>
                <p className="atu-text">Acedes ao diário completo clicando em "Diário" no Project Pulse, num projeto fixado, ou navegando para <strong>/projeto/[slug]/diario</strong>. Podes filtrar por tipo de entrada, ver a cronologia completa e editar entradas antigas.</p>
              </div>
              <div>
                <MockupDiary />
                <div style={{ marginTop: 12 }}>
                  <MockupShell label="Composição de entrada">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ display: 'flex', gap: 3 }}>
                        {['Progresso', 'Dificuldade', 'Decisão'].map((k, i) => (
                          <div key={k} style={{ flex: 1, height: 14, borderRadius: 4, fontSize: 6, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', background: i === 0 ? '#1b78f714' : 'var(--color-bg-alt)', border: i === 0 ? '1px solid #1b78f733' : '1px solid var(--color-border)', color: i === 0 ? '#1b78f7' : 'var(--color-text-secondary)' }}>{k}</div>
                        ))}
                      </div>
                      <div style={{ height: 32, borderRadius: 5, background: 'var(--color-bg-alt)', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', padding: '0 6px' }}>
                        <div style={{ width: '70%', height: 3, borderRadius: 2, background: 'var(--color-text-tertiary)' }} />
                      </div>
                      <div style={{ height: 16, borderRadius: 4, background: '#1b78f7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ width: 30, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.8)' }} />
                      </div>
                    </div>
                  </MockupShell>
                </div>
              </div>
            </div>
          </Section>

          {/* ── PREVIEW & TEMPLATES ── */}
          <Section id="preview" icon={Palette} color="#a78bfa" title="Preview & Templates" subtitle="Personaliza a apresentação pública do teu projeto">
            <div className="atu-two-col">
              <div>
                <p className="atu-text">A preview é a página pública do teu projeto — o que qualquer pessoa vê ao visitar o teu link. Podes personalizar completamente a aparência e adicionar conteúdo extra através de blocos.</p>
                <h3 className="atu-h3">Editor de preview</h3>
                <p className="atu-text">Para editar a preview, abre o teu projeto e clica em "Editar apresentação". O editor tem três tabs:</p>
                <div className="atu-info-grid">
                  <InfoCard icon={Palette} color="#a78bfa" title="Estilo" body="Cor de destaque, fundo, tipografia, alinhamento do título, tamanho do hero, modo claro/escuro." />
                  <InfoCard icon={AlignLeft} color="#06b6d4" title="Blocos" body="Adiciona conteúdo extra: notas, citações, imagens, vídeos, métricas, botões CTA, links e mais." />
                  <InfoCard icon={Layers} color="#10b981" title="Templates" body="Aplica um template completo: visual + layout + blocos iniciais. Podes modificar tudo depois." />
                </div>
                <h3 className="atu-h3">Tipos de blocos</h3>
                <Tags items={[
                  { label: 'Nota', color: '#1b78f7' },
                  { label: 'Citação', color: '#a78bfa' },
                  { label: 'Destaque', color: '#f59e0b' },
                  { label: 'Título', color: '#10b981' },
                  { label: 'Métrica', color: '#ec4899' },
                  { label: 'Estatísticas', color: '#06b6d4' },
                  { label: 'Imagem', color: '#f97316' },
                  { label: 'Galeria', color: '#8b5cf6' },
                  { label: 'Vídeo', color: '#ef4444' },
                  { label: 'Card', color: '#d97706' },
                  { label: 'Botão CTA', color: '#1b78f7' },
                  { label: 'Link', color: '#10b981' },
                  { label: 'Divisor', color: '#6b7280' },
                ]} />
                <h3 className="atu-h3">Templates</h3>
                <p className="atu-text">Os templates aplicam de uma vez o estilo visual completo <strong>e</strong> os blocos base da página. Há templates para diferentes estilos: técnico, editorial, minimalista, expressivo. Podes modificar tudo depois de aplicar.</p>
                <Tip>Se já tens blocos, o Showo pede confirmação antes de os substituir ao aplicar um template.</Tip>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <MockupPreview />
                <MockupShell label="Bloco de citação">
                  <div style={{ borderLeft: '3px solid #a78bfa', paddingLeft: 8, display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <Quote size={10} color="#a78bfa" />
                    <div style={{ height: 3, width: '90%', borderRadius: 2, background: 'var(--color-text)', opacity: 0.5 }} />
                    <div style={{ height: 3, width: '70%', borderRadius: 2, background: 'var(--color-text)', opacity: 0.5 }} />
                    <div style={{ height: 3, width: '80%', borderRadius: 2, background: 'var(--color-text)', opacity: 0.5 }} />
                  </div>
                </MockupShell>
              </div>
            </div>
          </Section>

          {/* ── PERFIL ── */}
          <Section id="perfil" icon={User} color="#ec4899" title="Perfil Público" subtitle="A tua página de portfólio para o mundo ver">
            <div className="atu-two-col">
              <div>
                <p className="atu-text">O teu perfil público (<strong>/u/username</strong>) é a tua página de portfólio. Qualquer pessoa — recrutadores, professores, outras escolas — pode visitar e ver os teus projetos.</p>
                <h3 className="atu-h3">Projetos em destaque</h3>
                <p className="atu-text">Podes destacar até 3 projetos no teu perfil. Estes aparecem no topo com um visual especial (borda âmbar). Para destacar um projeto, clica na estrela ⭐ na lista do teu portfólio.</p>
                <div className="atu-info-grid">
                  <InfoCard icon={Star} color="#f59e0b" title="Em destaque no perfil" body="Até 3 projetos com borda âmbar no topo do perfil. Usas a estrela ⭐ para escolher." />
                  <InfoCard icon={Pin} color="#60a5fa" title="Fixado na dashboard" body="Diferente do destaque do perfil — o 📌 é só para a tua dashboard, não aparece no perfil público." />
                </div>
                <h3 className="atu-h3">O que aparece no perfil</h3>
                <Steps items={[
                  'Foto de perfil, nome, bio e escola.',
                  'Projetos em destaque (até 3, escolhidos por ti).',
                  'Todos os outros projetos públicos ordenados por score.',
                  'Score médio, área principal, tecnologias usadas.',
                ]} />
                <h3 className="atu-h3">Completar o perfil</h3>
                <p className="atu-text">Vai a Definições para completar o teu perfil: foto, bio, links (LinkedIn, GitHub, portfólio). Um perfil completo é mais apelativo para quem visita.</p>
                <Tip>O teu perfil é público por defeito. Podes ver como ele aparece aos outros clicando em "Ver perfil" nas definições.</Tip>
              </div>
              <div>
                <MockupProfile />
              </div>
            </div>
          </Section>

          {/* ── EXPLORAR ── */}
          <Section id="explorar" icon={Compass} color="#06b6d4" title="Explorar" subtitle="Descobre projetos de outros alunos">
            <div className="atu-two-col">
              <div>
                <p className="atu-text">A página Explorar é uma galeria pública com projetos de alunos de toda a plataforma. Podes descobrir trabalhos de outras escolas e cursos, filtrar por área e encontrar inspiração.</p>
                <h3 className="atu-h3">Filtros disponíveis</h3>
                <Tags items={[
                  { label: 'Área / curso', color: '#06b6d4' },
                  { label: 'Score mínimo', color: '#1b78f7' },
                  { label: 'Ordenação', color: '#10b981' },
                  { label: 'Tipo de projeto', color: '#f59e0b' },
                ]} />
                <h3 className="atu-h3">Projetos em destaque</h3>
                <p className="atu-text">A plataforma destaca automaticamente os projetos mais bem avaliados e mais completos através de um algoritmo que analisa score, diário, apresentação e validação.</p>
                <Tip>Se o teu projeto tem um bom score e o diário atualizado, maior a probabilidade de aparecer em destaque no Explorar.</Tip>
              </div>
              <div>
                <MockupShell label="Galeria de projetos">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
                    {[
                      { name: 'App IoT', score: 88, c: '#1b78f7' },
                      { name: 'Plataforma Web', score: 79, c: '#10b981' },
                      { name: 'Jogo Unity', score: 72, c: '#a78bfa' },
                      { name: 'API REST', score: 65, c: '#f59e0b' },
                    ].map((p, i) => (
                      <div key={i} style={{ borderRadius: 6, overflow: 'hidden', border: '1px solid var(--color-border)' }}>
                        <div style={{ height: 28, background: `${p.c}18` }} />
                        <div style={{ padding: '4px 5px' }}>
                          <div style={{ fontSize: 7, fontWeight: 700, color: 'var(--color-text)', marginBottom: 2 }}>{p.name}</div>
                          <div style={{ fontSize: 7, color: p.c, fontWeight: 900 }}>{p.score}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </MockupShell>
              </div>
            </div>
          </Section>

          {/* ── TURMAS ── */}
          <Section id="turmas" icon={Users2} color="#f97316" title="Turmas" subtitle="O sistema de turmas para professores e alunos">
            <div className="atu-two-col">
              <div>
                <p className="atu-text">As turmas ligam alunos e professores. Um professor cria uma turma e partilha o código de entrada. Os alunos entram com esse código e ficam associados à turma.</p>
                <h3 className="atu-h3">Para alunos</h3>
                <Steps items={[
                  'O teu professor partilha o código da turma.',
                  'Vai a Turmas → Entrar numa turma.',
                  'Insere o código e confirma.',
                  'Podes ver os projetos dos colegas e receber feedback do professor.',
                ]} />
                <h3 className="atu-h3">Para professores</h3>
                <Steps items={[
                  'Cria uma turma com o nome e ano letivo.',
                  'Partilha o código gerado com os alunos.',
                  'Acompanha os projetos de cada aluno, dá feedback e avalia.',
                  'Podes ver o progresso de toda a turma num painel único.',
                ]} />
                <Tip>O professor pode comentar diretamente na página do projeto com feedback estruturado por critérios.</Tip>
              </div>
              <div>
                <MockupShell label="Painel de turma">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <div style={{ fontSize: 8, fontWeight: 700, color: 'var(--color-text-secondary)', borderBottom: '1px solid var(--color-border)', paddingBottom: 4, marginBottom: 2 }}>Turma 12º CT — 2024/25</div>
                    {['Ana Ferreira', 'João Silva', 'Maria Costa'].map((name, i) => (
                      <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 5px', borderRadius: 5, background: 'var(--color-glass)', border: '1px solid var(--color-glass-border)' }}>
                        <div style={{ width: 16, height: 16, borderRadius: '50%', background: ['#1b78f7', '#10b981', '#f59e0b'][i] + '30', flexShrink: 0 }} />
                        <div style={{ flex: 1, fontSize: 7, fontWeight: 600, color: 'var(--color-text)' }}>{name}</div>
                        <div style={{ fontSize: 7, fontWeight: 900, color: 'var(--color-primary)' }}>{[82, 71, 65][i]}</div>
                        <ArrowUpRight size={8} color="var(--color-text-tertiary)" />
                      </div>
                    ))}
                  </div>
                </MockupShell>
              </div>
            </div>
          </Section>

          {/* ── MENSAGENS ── */}
          <Section id="mensagens" icon={MessageSquare} color="#8b5cf6" title="Mensagens" subtitle="Comunica diretamente com outros utilizadores">
            <div className="atu-two-col">
              <div>
                <p className="atu-text">As mensagens permitem comunicar com outros alunos, professores ou recrutadores diretamente na plataforma.</p>
                <h3 className="atu-h3">Como enviar uma mensagem</h3>
                <Steps items={[
                  'Acede à secção Mensagens na sidebar.',
                  'Clica em "Nova conversa" e pesquisa pelo nome do utilizador.',
                  'Escreve a mensagem e envia.',
                  'Podes ver as conversas ativas e as não lidas na lista.',
                ]} />
                <h3 className="atu-h3">Notificações</h3>
                <p className="atu-text">Quando tens mensagens não lidas, aparece um badge com o número na sidebar. Também recebes uma notificação no sino 🔔.</p>
              </div>
              <div>
                <MockupShell label="Mensagens">
                  <div style={{ display: 'flex', gap: 5, height: 80 }}>
                    <div style={{ width: 50, display: 'flex', flexDirection: 'column', gap: 3 }}>
                      {['João', 'Prof. Mota', 'Maria'].map((n, i) => (
                        <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 4px', borderRadius: 4, background: i === 0 ? 'var(--color-primary-subtle)' : 'var(--color-bg-alt)', border: `1px solid ${i === 0 ? 'var(--color-primary-muted)' : 'var(--color-border)'}` }}>
                          <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--color-border)', flexShrink: 0 }} />
                          <div style={{ fontSize: 6, fontWeight: 600, color: 'var(--color-text)' }}>{n}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div style={{ alignSelf: 'flex-end', maxWidth: '80%', padding: '4px 6px', borderRadius: '7px 7px 2px 7px', background: 'var(--color-primary)', fontSize: 6, color: '#fff' }}>Olá, sobre o projeto...</div>
                      <div style={{ alignSelf: 'flex-start', maxWidth: '80%', padding: '4px 6px', borderRadius: '7px 7px 7px 2px', background: 'var(--color-glass)', border: '1px solid var(--color-glass-border)', fontSize: 6, color: 'var(--color-text)' }}>Claro, posso ajudar!</div>
                    </div>
                  </div>
                </MockupShell>
              </div>
            </div>
          </Section>

          {/* ── MISSÕES ── */}
          <Section id="missoes" icon={Swords} color="#ef4444" title="Missões" subtitle="Desafios que ajudam a evoluir o teu portfólio">
            <div className="atu-two-col">
              <div>
                <p className="atu-text">As missões são desafios que te guiam a completar o teu portfólio. Cada missão completada dá XP e ajuda a melhorar o score dos teus projetos.</p>
                <h3 className="atu-h3">Como funcionam</h3>
                <p className="atu-text">Algumas missões completam-se automaticamente (ex: "Cria o teu primeiro projeto"). Outras requerem ação explícita (ex: "Adiciona uma tecnologia ao projeto"). Quando uma missão estiver completada, aparece com um ✓ verde.</p>
                <h3 className="atu-h3">Exemplos de missões</h3>
                <div className="atu-info-grid">
                  <InfoCard icon={FolderOpen} color="#1b78f7" title="Primeiro projeto" body="Cria o teu primeiro projeto na plataforma. +20 XP" />
                  <InfoCard icon={User} color="#f59e0b" title="Perfil completo" body="Preenche o teu perfil com foto, bio e escola. +15 XP" />
                  <InfoCard icon={Target} color="#10b981" title="Score 60+" body="Alcança um score de 60 ou mais num projeto. +25 XP" />
                  <InfoCard icon={BookOpen} color="#a78bfa" title="Diário ativo" body="Faz 5 entradas no diário de qualquer projeto. +20 XP" />
                  <InfoCard icon={Globe} color="#06b6d4" title="Projeto público" body="Torna um projeto visível a toda a plataforma. +10 XP" />
                  <InfoCard icon={Star} color="#ec4899" title="Projeto em destaque" body="Coloca um projeto em destaque no teu perfil. +10 XP" />
                </div>
                <Tip>Completa as missões por ordem — as mais simples desbloqueiam as seguintes.</Tip>
              </div>
              <div>
                <MockupShell label="Lista de missões">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {[
                      { label: 'Primeiro projeto', xp: 20, done: true, c: '#1b78f7' },
                      { label: 'Perfil completo', xp: 15, done: true, c: '#f59e0b' },
                      { label: 'Score 60+', xp: 25, done: false, c: '#10b981' },
                      { label: 'Diário ativo', xp: 20, done: false, c: '#a78bfa' },
                    ].map(m => (
                      <div key={m.label} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 7px', borderRadius: 6, background: m.done ? m.c + '10' : 'var(--color-glass)', border: `1px solid ${m.done ? m.c + '30' : 'var(--color-glass-border)'}`, opacity: m.done ? 1 : 0.85 }}>
                        <div style={{ width: 14, height: 14, borderRadius: '50%', background: m.done ? m.c : 'var(--color-bg-alt)', border: `2px solid ${m.c}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {m.done && <CheckCircle2 size={8} color="#fff" />}
                        </div>
                        <div style={{ flex: 1, fontSize: 7, fontWeight: 700, color: 'var(--color-text)', textDecoration: m.done ? 'line-through' : 'none', opacity: m.done ? 0.6 : 1 }}>{m.label}</div>
                        <div style={{ fontSize: 7, fontWeight: 700, color: m.c }}>+{m.xp} XP</div>
                      </div>
                    ))}
                  </div>
                </MockupShell>
              </div>
            </div>
          </Section>

          {/* ── SCORE ── */}
          <Section id="score" icon={Star} color="#d97706" title="Sistema de Score" subtitle="Como é calculado o score dos teus projetos">
            <div className="atu-two-col">
              <div>
                <p className="atu-text">Cada projeto tem um score de 0 a 100 que reflete a qualidade e completude do teu trabalho. O score é calculado automaticamente com base em vários critérios.</p>
                <h3 className="atu-h3">Componentes do score</h3>
                <div className="atu-info-grid">
                  <InfoCard icon={FolderOpen} color="#1b78f7" title="Projeto (30%)" body="Campos preenchidos: nome, área, descrição, tipo, escola, colaboradores." />
                  <InfoCard icon={Palette} color="#a78bfa" title="Apresentação (20%)" body="Capa, blocos de conteúdo na preview, estilo personalizado, tagline gerada por IA." />
                  <InfoCard icon={BookOpen} color="#f59e0b" title="Diário (25%)" body="Número e regularidade das entradas no diário de projeto." />
                  <InfoCard icon={FileText} color="#10b981" title="Conteúdo (15%)" body="Campos aprofundados: problema, solução, tecnologias, resultados, aprendizagens." />
                  <InfoCard icon={Trophy} color="#ec4899" title="Validação (10%)" body="Score do professor, número de visualizações, likes." />
                </div>
                <h3 className="atu-h3">Como aumentar o score</h3>
                <Steps items={[
                  'Preenche todos os campos do projeto no editor.',
                  'Escreve entradas no diário regularmente.',
                  'Personaliza a preview com capa, blocos e estilo.',
                  'Completa os campos de Resultados e Aprendizagens (valem mais).',
                  'Partilha o link do projeto para ganhar visualizações.',
                ]} />
                <Tip>O campo "Resultados" e o campo "Aprendizagens" têm peso extra no score de conteúdo. Escreve pelo menos 80 caracteres em cada um.</Tip>
              </div>
              <div>
                <MockupScore />
                <div style={{ marginTop: 12 }}>
                  <MockupShell label="Score no perfil">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(27,120,247,0.1)', border: '3px solid #1b78f7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <span style={{ fontSize: 9, fontWeight: 900, color: '#1b78f7' }}>82</span>
                        </div>
                        <div>
                          <div style={{ fontSize: 7, fontWeight: 700, color: 'var(--color-text)' }}>App de Gestão</div>
                          <div style={{ fontSize: 6, color: 'var(--color-text-secondary)' }}>Informática · 2024/25</div>
                        </div>
                      </div>
                    </div>
                  </MockupShell>
                </div>
              </div>
            </div>
          </Section>

          <div className="atu-footer">
            <div className="atu-footer-inner">
              <Sparkles size={16} color="#f59e0b" />
              <span>Tens dúvidas ou encontraste algo que não funciona?</span>
              <button className="atu-footer-btn" onClick={() => navigate('/mensagens')}>
                Fala connosco <ArrowRight size={13} />
              </button>
            </div>
          </div>

        </main>
      </div>
    </div>
  )
}
