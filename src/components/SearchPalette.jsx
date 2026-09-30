import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { MagnifierIcon as Search } from '@solar-icons/react/outline/magnifier'
import { CloseIcon as X } from '@solar-icons/react/bold/close'
import { UserIcon as User } from '@solar-icons/react/bold/user'
import { LayersIcon as Layers } from '@solar-icons/react/bold/layers'
import { AltArrowRightIcon as ChevronRight } from '@solar-icons/react/bold/alt-arrow-right'
import { PlusIcon as Plus } from './icons/PlusIcon'
import { CompassIcon as Compass } from '@solar-icons/react/bold/compass'
import { LibraryIcon } from '@solar-icons/react/bold/library'
import './SearchPalette.css'

/* ══════════════════════════════════════════════════════════════════════════
   SearchPalette — estilo Spotlight/Cmd-K. Pesquisa projetos e pessoas
   públicos. Aberto pelo ícone de lupa na sidebar (só aluno, ver Navbar.jsx).
   ══════════════════════════════════════════════════════════════════════════ */

// Atalhos do estado vazio — antes de escrever nada. Ligam a pesquisa a sítios
// que já fazem a mesma coisa de outra forma (Explorar) em vez de duplicar.
const SHORTCUTS = [
  { icon: Plus, color: 'var(--color-primary)', title: 'Criar projeto', desc: 'Começa um projeto novo do zero', path: '/novo' },
  { icon: Compass, color: 'var(--color-accent)', title: 'Explorar', desc: 'Descobre projetos e pessoas', path: '/explorar' },
  { icon: LibraryIcon, color: 'var(--color-warning)', title: 'Biblioteca', desc: 'Os teus projetos e rascunhos', path: '/biblioteca' },
]

const CATEGORIES = [
  { key: 'projects', label: 'Projetos', icon: Layers },
  { key: 'people', label: 'Pessoas', icon: User },
]

export function SearchPalette({ onClose }) {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [active, setActive] = useState(() => new Set(['projects', 'people']))
  const [projects, setProjects] = useState([])
  const [people, setPeople] = useState([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const query = q.trim()
  const hasQuery = query.length >= 2

  useEffect(() => {
    if (!hasQuery) { setProjects([]); setPeople([]); setLoading(false); return }
    setLoading(true)
    let cancelled = false
    const t = setTimeout(async () => {
      const [projRes, peopleRes] = await Promise.all([
        active.has('projects')
          ? supabase.from('projects')
              .select('id, name, slug, area, cover_url, creator_name')
              .or('visibility.eq.public,visibility.is.null')
              .neq('entry_kind', 'library')
              .is('parent_project_id', null)
              .ilike('name', `%${query}%`)
              .order('score', { ascending: false })
              .limit(6)
          : Promise.resolve({ data: [] }),
        active.has('people')
          ? supabase.from('profiles')
              .select('id, username, full_name, avatar_url, role')
              .is('banned_at', null)
              .not('username', 'is', null)
              .or(`full_name.ilike.%${query}%,username.ilike.%${query}%`)
              .limit(6)
          : Promise.resolve({ data: [] }),
      ])
      if (cancelled) return
      setProjects(projRes.data || [])
      setPeople(peopleRes.data || [])
      setLoading(false)
    }, 250)
    return () => { cancelled = true; clearTimeout(t) }
  }, [query, hasQuery, active])

  function toggleCategory(key) {
    setActive(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      // Nunca ficar com as duas desligadas — sem categoria nenhuma a
      // pesquisa não devolveria nada, o que parece um bug, não um filtro.
      if (next.size === 0) return prev
      return next
    })
  }

  const hasResults = projects.length > 0 || people.length > 0

  function go(path) {
    navigate(path)
    onClose()
  }

  return (
    <div className="search-palette-overlay" onMouseDown={onClose}>
      <div className="search-palette" onMouseDown={e => e.stopPropagation()}>
        <div className="search-palette-input-row">
          <Search size={18} />
          <input
            ref={inputRef}
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Pesquisar projetos, pessoas…"
          />
          <button className="search-palette-close" onClick={onClose} aria-label="Fechar">
            <X size={16} />
          </button>
        </div>

        <div className="search-palette-cats">
          {CATEGORIES.map(c => (
            <button
              key={c.key}
              className={`search-palette-cat${active.has(c.key) ? ' is-active' : ''}`}
              onClick={() => toggleCategory(c.key)}
            >
              <c.icon size={13} /> {c.label}
            </button>
          ))}
        </div>

        <div className="search-palette-body">
          {!hasQuery && (
            <div className="search-palette-section">
              <span className="search-palette-label">Atalhos</span>
              {SHORTCUTS.map(s => (
                <button key={s.path} className="search-palette-row" onClick={() => go(s.path)}>
                  <div className="search-palette-shortcut-icon" style={{ color: s.color, background: `color-mix(in srgb, ${s.color} 16%, transparent)` }}>
                    <s.icon size={17} />
                  </div>
                  <span className="search-palette-row-text">
                    <span className="search-palette-row-title">{s.title}</span>
                    <span className="search-palette-row-sub">{s.desc}</span>
                  </span>
                  <ChevronRight size={15} className="search-palette-row-chevron" />
                </button>
              ))}
            </div>
          )}

          {hasQuery && loading && <div className="search-palette-hint">A procurar…</div>}

          {hasQuery && !loading && !hasResults && (
            <div className="search-palette-hint">Sem resultados para "{query}".</div>
          )}

          {hasQuery && !loading && active.has('projects') && projects.length > 0 && (
            <div className="search-palette-section">
              <span className="search-palette-label">Projetos</span>
              {projects.map(p => (
                <button key={p.id} className="search-palette-row" onClick={() => go(`/projeto/${p.slug}`)}>
                  {p.cover_url
                    ? <img src={p.cover_url} alt="" className="search-palette-thumb" />
                    : <div className="search-palette-thumb search-palette-thumb-fb"><Layers size={14} /></div>}
                  <span className="search-palette-row-text">
                    <span className="search-palette-row-title">{p.name}</span>
                    <span className="search-palette-row-sub">{p.creator_name || p.area || 'Projeto'}</span>
                  </span>
                  <ChevronRight size={15} className="search-palette-row-chevron" />
                </button>
              ))}
            </div>
          )}

          {hasQuery && !loading && active.has('people') && people.length > 0 && (
            <div className="search-palette-section">
              <span className="search-palette-label">Pessoas</span>
              {people.map(p => (
                <button key={p.id} className="search-palette-row" onClick={() => go(`/u/${p.username}`)}>
                  {p.avatar_url
                    ? <img src={p.avatar_url} alt="" className="search-palette-avatar" />
                    : <div className="search-palette-avatar search-palette-avatar-fb">{(p.full_name || p.username || '?')[0].toUpperCase()}</div>}
                  <span className="search-palette-row-text">
                    <span className="search-palette-row-title">{p.full_name || p.username}</span>
                    <span className="search-palette-row-sub">@{p.username}</span>
                  </span>
                  <ChevronRight size={15} className="search-palette-row-chevron" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
