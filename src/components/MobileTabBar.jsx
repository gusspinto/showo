import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Home, Compass, Plus, MessageSquare, AlignJustify,
  GraduationCap, Users2, LogIn,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useSchoolMode } from '../context/SchoolModeContext'
import './MobileTabBar.css'

/* ══════════════════════════════════════════════════════════════════════════
   BOTTOM TAB BAR — a navegação primária no telemóvel
   ──────────────────────────────────────────────────────────────────────────
   Antes disto, tudo o que existia no telemóvel era um hambúrguer no canto
   superior esquerdo. A app inteira estava escondida atrás de um toque: quem
   chegava do TikTok via uma página, um menu fechado, e zero pistas de que
   existisse mais alguma coisa. Descoberta nenhuma, ação principal invisível.

   Regras deste componente:
     · No máximo 5 destinos. Se não cabe aqui, é secundário e vai para "Menu".
     · O centro é sempre a ação principal (criar), nunca um destino.
     · Os destinos mudam com o CONTEXTO (pessoal vs escola), não com a página.
     · Visitantes anónimos também a vêem: para eles a ação principal é criar o
       primeiro projeto, que é exatamente aquilo que os traz do TikTok.
   ══════════════════════════════════════════════════════════════════════════ */

function tabsFor({ user, isTeacher, isRecruiter, isSchoolMode, hasSchool }) {
  if (!user) {
    return [
      { id: 'home',     label: 'Início',   icon: Home,    to: '/' },
      { id: 'explorar', label: 'Explorar', icon: Compass, to: '/explorar' },
      { id: 'criar',    label: 'Criar',    icon: Plus,    to: '/novo', primary: true },
      { id: 'entrar',   label: 'Entrar',   icon: LogIn,   to: '/login' },
    ]
  }
  if (isRecruiter) {
    return [
      { id: 'home',      label: 'Início',    icon: Home,          to: '/dashboard' },
      { id: 'explorar',  label: 'Explorar',  icon: Compass,       to: '/explorar' },
      { id: 'mensagens', label: 'Mensagens', icon: MessageSquare, to: '/mensagens', badge: 'msgs' },
      { id: 'menu',      label: 'Menu',      icon: AlignJustify,  action: 'menu' },
    ]
  }
  if (isTeacher) {
    return [
      { id: 'home',      label: 'Início',    icon: Home,          to: '/dashboard' },
      { id: 'turmas',    label: 'Turmas',    icon: Users2,        to: '/turmas' },
      { id: 'explorar',  label: 'Explorar',  icon: Compass,       to: '/explorar' },
      { id: 'mensagens', label: 'Mensagens', icon: MessageSquare, to: '/mensagens', badge: 'msgs' },
      { id: 'menu',      label: 'Menu',      icon: AlignJustify,  action: 'menu' },
    ]
  }
  // Aluno. Em modo escola, "Explorar" (descoberta pública) cede o lugar à
  // turma: é o que ele vem cá fazer quando está em contexto escolar.
  const second = isSchoolMode && hasSchool
    ? { id: 'escola',   label: 'Escola',   icon: GraduationCap, to: '/turmas' }
    : { id: 'explorar', label: 'Explorar', icon: Compass,       to: '/explorar' }
  return [
    { id: 'home',      label: 'Início',    icon: Home,          to: '/dashboard' },
    second,
    { id: 'criar',     label: 'Criar',     icon: Plus,          to: '/novo', primary: true },
    { id: 'mensagens', label: 'Mensagens', icon: MessageSquare, to: '/mensagens', badge: 'msgs' },
    { id: 'menu',      label: 'Menu',      icon: AlignJustify,  action: 'menu' },
  ]
}

export default function MobileTabBar({ onOpenMenu, unreadMsgs = 0, hidden = false }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, profile } = useAuth()
  const { isSchoolMode, hasSchool } = useSchoolMode()

  const isTeacher   = profile?.role === 'professor'
  const isRecruiter = profile?.role === 'recrutador' || profile?.role === 'empresa'
  const tabs = tabsFor({ user, isTeacher, isRecruiter, isSchoolMode, hasSchool })

  // Reserva a altura da barra no fim do documento, home indicator incluído,
  // para nenhuma página ter de saber que a barra existe.
  useEffect(() => {
    document.body.classList.toggle('has-tabbar', !hidden)
    return () => document.body.classList.remove('has-tabbar')
  }, [hidden])

  if (hidden) return null

  function isActive(tab) {
    if (!tab.to) return false
    if (tab.to === '/') return location.pathname === '/' || location.pathname === '/home'
    return location.pathname === tab.to || location.pathname.startsWith(tab.to + '/')
  }

  return (
    <nav className="mtb" aria-label="Navegação principal">
      {tabs.map(tab => {
        const Icon = tab.icon
        const active = isActive(tab)
        const showBadge = tab.badge === 'msgs' && unreadMsgs > 0

        if (tab.primary) {
          return (
            <button
              key={tab.id}
              className="mtb-item mtb-item--primary"
              onClick={() => navigate(tab.to)}
              aria-label={tab.label}
            >
              <span className="mtb-fab"><Icon size={22} strokeWidth={2.4} /></span>
              <span className="mtb-label">{tab.label}</span>
            </button>
          )
        }

        return (
          <button
            key={tab.id}
            className={`mtb-item${active ? ' is-active' : ''}`}
            onClick={() => (tab.action === 'menu' ? onOpenMenu?.() : navigate(tab.to))}
            aria-current={active ? 'page' : undefined}
          >
            <span className="mtb-icon">
              <Icon size={21} strokeWidth={active ? 2.4 : 1.9} />
              {showBadge && <span className="mtb-badge">{unreadMsgs > 9 ? '9+' : unreadMsgs}</span>}
            </span>
            <span className="mtb-label">{tab.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
