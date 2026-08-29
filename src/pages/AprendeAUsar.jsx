import { useState, useEffect, useRef } from 'react'
import { Navbar } from '../components/Navbar'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { PushPin as Pin, PencilSimple as Pencil, Trash as Trash2, ArrowUpRight, ArrowLeft, TrendUp as TrendingUp, Warning as AlertTriangle, GitBranch, MagnifyingGlass as Search, Lightbulb, CheckCircle as CheckCircle2, NotePencil as StickyNote, MagnifyingGlassPlus as ZoomIn, MagnifyingGlassMinus as ZoomOut, ArrowCounterClockwise as RotateCcw, Quotes as Quote, PaperPlaneTilt as Send, Check, CircleNotch as Loader2 } from '@phosphor-icons/react'
import './AprendeAUsar.css'

const SECTIONS = [
  { id: 'dashboard',   label: 'Dashboard' },
  { id: 'projetos',    label: 'Projetos' },
  { id: 'diario',      label: 'Diário de Projeto' },
  { id: 'preview',     label: 'Preview e Templates' },
  { id: 'perfil',      label: 'Perfil Público' },
  { id: 'explorar',    label: 'Explorar' },
  { id: 'turmas',      label: 'Turmas' },
  { id: 'mensagens',   label: 'Mensagens' },
  { id: 'missoes',     label: 'Missões' },
  { id: 'score',       label: 'Sistema de Score' },
]

// ── Mockup shell ──────────────────────────────────────────────────────────────
function Mockup({ label, children, dark }) {
  return (
    <figure className={`atu-mockup${dark ? ' atu-mockup--dark' : ''}`}>
      <div className="atu-mockup-bar" style={dark ? { background: 'rgba(8,14,28,0.95)', borderColor: 'rgba(255,255,255,0.07)' } : {}}>
        <span className="atu-mockup-dot" />
        <span className="atu-mockup-dot" />
        <span className="atu-mockup-dot" />
        {label && <span className="atu-mockup-label" style={dark ? { color: '#475569' } : {}}>{label}</span>}
      </div>
      <div className="atu-mockup-body">{children}</div>
    </figure>
  )
}

// ── Mockups ───────────────────────────────────────────────────────────────────
function MkDashboard() {
  return (
    <Mockup label="showo: Dashboard">
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ width: 38, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
          {[1,2,3,4].map(i => (
            <div key={i} style={{ height: 22, borderRadius: 6, background: i === 1 ? 'var(--color-primary-subtle)' : 'var(--color-bg-alt)', border: i === 1 ? '1px solid var(--color-primary-muted)' : '1px solid var(--color-border)' }} />
          ))}
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {/* Pinned card */}
          <div style={{ borderRadius: 9, overflow: 'hidden', border: '1px solid var(--color-glass-border)' }}>
            <div style={{ height: 22, background: 'linear-gradient(90deg, rgba(27,120,247,0.28), rgba(27,120,247,0.06))', display: 'flex', alignItems: 'center', padding: '0 8px', gap: 4 }}>
              <div style={{ fontSize: 6, fontWeight: 700, color: 'rgba(255,255,255,0.85)', background: 'rgba(255,255,255,0.1)', borderRadius: 3, padding: '1px 4px' }}>Pessoal</div>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 3 }}>
                <Pin size={7} color="rgba(255,255,255,0.7)" weight="fill" />
                <Pencil size={7} color="rgba(255,255,255,0.5)" />
                <Trash2 size={7} color="rgba(255,255,255,0.4)" />
              </div>
            </div>
            <div style={{ background: 'var(--color-glass)', padding: '7px 9px', display: 'flex', flexDirection: 'column', gap: 5 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{ flex: 1, height: 5, borderRadius: 2, background: 'var(--color-text)', opacity: 0.6 }} />
                <div style={{ fontSize: 9, fontWeight: 900, color: 'var(--color-primary)' }}>74</div>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <div style={{ height: 14, flex: 1, borderRadius: 4, background: 'var(--color-primary)' }} />
                <div style={{ height: 14, flex: 1, borderRadius: 4, border: '1px solid var(--color-border)' }} />
                <div style={{ height: 14, flex: 1, borderRadius: 4, border: '1px solid var(--color-border)' }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Mockup>
  )
}

function MkProjectList() {
  return (
    <Mockup label="showo:Os meus projetos">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {[
          { name: 'App de Gestão de Stock', score: 82, pinned: true, star: true },
          { name: 'Site Institucional (Grupo)', score: 61, pinned: false, star: false },
          { name: 'Jogo Educativo Unity', score: 44, pinned: true, star: false },
        ].map((p, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 9px', borderRadius: 7, background: 'var(--color-glass)', border: '1px solid var(--color-glass-border)' }}>
            <div style={{ flex: 1, fontSize: 8, fontWeight: 600, color: 'var(--color-text)' }}>{p.name}</div>
            <Pin size={8} color={p.pinned ? 'var(--color-primary)' : 'var(--color-text-tertiary)'} weight={p.pinned ? 'fill' : 'regular'} />
            <div style={{ fontSize: 8, color: p.star ? '#f59e0b' : 'var(--color-text-tertiary)' }}>★</div>
            <div style={{ fontSize: 9, fontWeight: 900, color: 'var(--color-primary)', minWidth: 20, textAlign: 'right' }}>{p.score}</div>
          </div>
        ))}
      </div>
    </Mockup>
  )
}

function MkJournalComposer() {
  const kinds = [
    { id: 'progresso', label: 'Progresso', Icon: TrendingUp },
    { id: 'dificuldade', label: 'Dificuldade', Icon: AlertTriangle },
    { id: 'decisao', label: 'Decisão', Icon: GitBranch },
    { id: 'pesquisa', label: 'Pesquisa', Icon: Search },
    { id: 'ideia', label: 'Ideia', Icon: Lightbulb },
    { id: 'resultado', label: 'Resultado', Icon: CheckCircle2 },
    { id: 'nota', label: 'Nota', Icon: StickyNote },
  ]
  return (
    <Mockup label="Registar no diário">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* Modal header */}
        <div style={{ paddingBottom: 8, borderBottom: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{ height: 6, width: 100, borderRadius: 2, background: 'var(--color-text)', opacity: 0.7 }} />
          <div style={{ height: 4, width: 70, borderRadius: 2, background: 'var(--color-text-tertiary)' }} />
        </div>
        {/* Kind chips */}
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {kinds.map((k, i) => (
            <div key={k.id} style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '3px 7px', borderRadius: 99, background: i === 0 ? 'var(--color-primary-subtle)' : 'var(--color-bg-alt)', border: i === 0 ? '1px solid var(--color-primary-muted)' : '1px solid var(--color-border)', fontSize: 7, fontWeight: 700, color: i === 0 ? 'var(--color-primary)' : 'var(--color-text-tertiary)' }}>
              <k.Icon size={7} />
              {k.label}
            </div>
          ))}
        </div>
        {/* Prompt */}
        <div style={{ fontSize: 8, fontWeight: 600, color: 'var(--color-text-secondary)' }}>O que avançaste desde a última vez?</div>
        {/* Textarea */}
        <div style={{ height: 36, borderRadius: 7, background: 'var(--color-bg-alt)', border: '1px solid var(--color-border)', padding: '6px 8px', display: 'flex', alignItems: 'flex-start' }}>
          <div style={{ width: '72%', height: 3, borderRadius: 2, background: 'var(--color-text-tertiary)', opacity: 0.5 }} />
        </div>
        {/* Submit */}
        <div style={{ alignSelf: 'flex-end', height: 20, width: 68, borderRadius: 6, background: 'var(--color-primary)' }} />
      </div>
    </Mockup>
  )
}

function MkDiaryCanvas() {
  // Accurate representation of the real DiaryCanvas
  const cards = [
    { type: 'note', x: 14, y: 28, w: 100, h: 68, label: 'Nota', lines: ['Implementei o login', 'com Google OAuth.', 'Funciona em staging.'] },
    { type: 'idea', x: 128, y: 14, w: 96, h: 60, label: 'Ideia', lines: ['Notificações quando', 'professor comenta'] },
    { type: 'highlight', x: 52, y: 106, w: 120, h: 50, label: 'Destaque', lines: ['MVP entregue!', 'Testado com 5 colegas.'] },
  ]
  const cardColors = { note: '#0f1623', idea: '#0d1733', highlight: '#1a1200' }
  const accentColors = { note: '#475569', idea: '#3b82f6', highlight: '#f59e0b' }
  const textColors = { note: '#94a3b8', idea: '#93c5fd', highlight: '#fbbf24' }

  return (
    <Mockup label="showo:Diário" dark>
      {/* Toolbar */}
      <div style={{ height: 30, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, paddingBottom: 8, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ width: 22, height: 22, borderRadius: 6, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ArrowLeft size={9} color="#94a3b8" />
        </div>
        <div style={{ height: 4, width: 60, borderRadius: 2, background: 'rgba(255,255,255,0.25)' }} />
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
          {[{ label: 'Nota', cls: 'note' }, { label: 'Ideia', cls: 'idea' }, { label: 'Destaque', cls: 'highlight' }].map(b => (
            <div key={b.label} style={{ padding: '2px 7px', borderRadius: 5, background: { note: 'rgba(100,116,139,0.12)', idea: 'rgba(59,130,246,0.1)', highlight: 'rgba(245,158,11,0.1)' }[b.cls], border: `1px solid ${{ note: 'rgba(100,116,139,0.2)', idea: 'rgba(59,130,246,0.2)', highlight: 'rgba(245,158,11,0.2)' }[b.cls]}`, fontSize: 7, fontWeight: 600, color: { note: '#94a3b8', idea: '#60a5fa', highlight: '#fbbf24' }[b.cls] }}>
              {b.label}
            </div>
          ))}
          {/* Zoom controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 6, padding: '2px 3px' }}>
            <ZoomOut size={8} color="#64748b" />
            <span style={{ fontSize: 7, color: '#475569', fontWeight: 700, padding: '0 4px' }}>100%</span>
            <ZoomIn size={8} color="#64748b" />
          </div>
        </div>
      </div>
      {/* Canvas area */}
      <div style={{ position: 'relative', height: 168, borderRadius: 6, overflow: 'hidden', background: '#030810', backgroundImage: 'radial-gradient(circle, #1e2a3e 1px, transparent 1px)', backgroundSize: '14px 14px' }}>
        {cards.map(c => (
          <div key={c.type} style={{ position: 'absolute', left: c.x, top: c.y, width: c.w, height: c.h, background: cardColors[c.type], border: '1px solid rgba(255,255,255,0.07)', borderRadius: 7, overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.5)' }}>
            {/* accent line */}
            <div style={{ height: 2.5, background: accentColors[c.type] }} />
            <div style={{ padding: '5px 7px', display: 'flex', flexDirection: 'column', gap: 3 }}>
              <div style={{ fontSize: 6.5, fontWeight: 700, color: textColors[c.type] }}>{c.label}</div>
              {c.lines.map((l, i) => (
                <div key={i} style={{ fontSize: 6.5, color: 'rgba(255,255,255,0.45)', lineHeight: 1.3 }}>{l}</div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Mockup>
  )
}

function MkPreviewEditor() {
  return (
    <Mockup label="showo:Editor de apresentação">
      <div style={{ display: 'flex', gap: 8, height: 108 }}>
        {/* Tab sidebar */}
        <div style={{ width: 62, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
          {['Estilo', 'Blocos', 'Templates', 'Secções'].map((t, i) => (
            <div key={t} style={{ padding: '5px 7px', borderRadius: 6, fontSize: 7, fontWeight: i === 2 ? 700 : 500, background: i === 2 ? 'var(--color-primary-subtle)' : 'transparent', border: 'none', color: i === 2 ? 'var(--color-primary)' : 'var(--color-text-tertiary)' }}>{t}</div>
          ))}
        </div>
        <div style={{ width: 1, background: 'var(--color-border)', flexShrink: 0 }} />
        {/* Template list */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, overflow: 'hidden' }}>
          <div style={{ fontSize: 7, fontWeight: 700, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Templates completos</div>
          {[
            { name: 'Midnight Tech', bg: '#030508', ac: '#1b78f7' },
            { name: 'Editorial', bg: '#f5f0e8', ac: '#475569', light: true },
            { name: 'Cosmic', bg: '#160b2a', ac: '#7c3aed' },
          ].map(tpl => (
            <div key={tpl.name} style={{ display: 'flex', borderRadius: 6, overflow: 'hidden', border: '1px solid var(--color-border)' }}>
              <div style={{ width: 28, background: tpl.bg, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', gap: 2, padding: '5px 6px' }}>
                <div style={{ width: 14, height: 2, borderRadius: 1, background: tpl.ac }} />
                <div style={{ width: 16, height: 3.5, borderRadius: 1, background: tpl.light ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.65)' }} />
              </div>
              <div style={{ flex: 1, padding: '0 7px', display: 'flex', alignItems: 'center', fontSize: 7.5, fontWeight: 600, color: 'var(--color-text)' }}>{tpl.name}</div>
            </div>
          ))}
        </div>
      </div>
    </Mockup>
  )
}

function MkBlocks() {
  return (
    <Mockup label="Blocos de conteúdo">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {/* Citação */}
        <div style={{ borderLeft: '2px solid var(--color-primary)', paddingLeft: 9 }}>
          <Quote size={9} color="var(--color-primary)" style={{ display: 'block', marginBottom: 4 }} />
          <div style={{ height: 3, width: '88%', borderRadius: 2, background: 'var(--color-text)', opacity: 0.5, marginBottom: 3 }} />
          <div style={{ height: 3, width: '65%', borderRadius: 2, background: 'var(--color-text)', opacity: 0.35 }} />
        </div>
        {/* Destaque / callout */}
        <div style={{ borderRadius: 6, background: 'rgba(27,120,247,0.08)', border: '1px solid rgba(27,120,247,0.2)', padding: '6px 9px' }}>
          <div style={{ height: 3.5, width: '72%', borderRadius: 2, background: 'var(--color-primary)', opacity: 0.65 }} />
        </div>
        {/* Stats */}
        <div style={{ display: 'flex', gap: 5 }}>
          {[1,2,3].map(i => (
            <div key={i} style={{ flex: 1, borderRadius: 6, border: '1px solid var(--color-border)', padding: '5px 6px', display: 'flex', flexDirection: 'column', gap: 3 }}>
              <div style={{ height: 9, width: 22, borderRadius: 2, background: 'var(--color-text)', opacity: 0.65 }} />
              <div style={{ height: 3, width: 28, borderRadius: 2, background: 'var(--color-text-tertiary)' }} />
            </div>
          ))}
        </div>
      </div>
    </Mockup>
  )
}

function MkProfile() {
  return (
    <Mockup label="showo:/u/username">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--color-primary-subtle)', border: '2px solid var(--color-primary-muted)', flexShrink: 0 }} />
          <div>
            <div style={{ width: 72, height: 6, borderRadius: 3, background: 'var(--color-text)', opacity: 0.7, marginBottom: 4 }} />
            <div style={{ width: 50, height: 4, borderRadius: 2, background: 'var(--color-text-tertiary)' }} />
          </div>
        </div>
        <div>
          <div style={{ fontSize: 7, fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>Em destaque</div>
          <div style={{ display: 'flex', gap: 5 }}>
            {[1,2,3].map(i => (
              <div key={i} style={{ flex: 1, height: 38, borderRadius: 6, background: 'var(--color-glass)', border: '1px solid rgba(245,158,11,0.25)' }} />
            ))}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 7, fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Portfólio</div>
          {[82, 66, 51].map(s => (
            <div key={s} style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '5px 0', borderBottom: '1px solid var(--color-border)' }}>
              <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'var(--color-text)', opacity: 0.5 }} />
              <div style={{ fontSize: 8, fontWeight: 900, color: 'var(--color-primary)' }}>{s}</div>
            </div>
          ))}
        </div>
      </div>
    </Mockup>
  )
}

function MkExplore() {
  return (
    <Mockup label="showo:Explorar">
      <div style={{ marginBottom: 8, display: 'flex', gap: 5 }}>
        <div style={{ flex: 1, height: 22, borderRadius: 6, background: 'var(--color-bg-alt)', border: '1px solid var(--color-border)' }} />
        <div style={{ height: 22, width: 22, borderRadius: 6, background: 'var(--color-bg-alt)', border: '1px solid var(--color-border)' }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        {['App IoT para Estufas', 'Plataforma de Tutoria', 'Jogo Unity 2D', 'API REST: Gestão'].map((name, i) => (
          <div key={name} style={{ borderRadius: 7, overflow: 'hidden', border: '1px solid var(--color-border)' }}>
            <div style={{ height: 30, background: 'var(--color-bg-alt)' }} />
            <div style={{ padding: '5px 7px' }}>
              <div style={{ fontSize: 7.5, fontWeight: 600, color: 'var(--color-text)', marginBottom: 3, lineHeight: 1.3 }}>{name}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 7, color: 'var(--color-text-tertiary)' }}>Informática</div>
                <div style={{ fontSize: 8, fontWeight: 900, color: 'var(--color-primary)' }}>{[88, 79, 72, 65][i]}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Mockup>
  )
}

function MkTurma() {
  return (
    <Mockup label="showo:Turma 12º CT">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 7, borderBottom: '1px solid var(--color-border)' }}>
          <div style={{ height: 5, width: 90, borderRadius: 2, background: 'var(--color-text)', opacity: 0.6 }} />
          <div style={{ fontSize: 7, color: 'var(--color-text-tertiary)' }}>24 alunos</div>
        </div>
        {[{ name: 'Ana Ferreira', proj: 'PAP', score: 82 }, { name: 'João Silva', proj: 'Projeto pessoal', score: 71 }, { name: 'Maria Costa', proj: 'Estágio', score: 65 }].map(s => (
          <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '4px 0' }}>
            <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--color-bg-alt)', border: '1px solid var(--color-border)', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 8, fontWeight: 600, color: 'var(--color-text)' }}>{s.name}</div>
              <div style={{ fontSize: 7, color: 'var(--color-text-tertiary)' }}>{s.proj}</div>
            </div>
            <div style={{ fontSize: 9, fontWeight: 900, color: 'var(--color-primary)' }}>{s.score}</div>
            <ArrowUpRight size={9} color="var(--color-text-tertiary)" />
          </div>
        ))}
      </div>
    </Mockup>
  )
}

function MkMessages() {
  return (
    <Mockup label="showo:Mensagens">
      <div style={{ display: 'flex', gap: 8, height: 100 }}>
        <div style={{ width: 56, display: 'flex', flexDirection: 'column', gap: 3, borderRight: '1px solid var(--color-border)', paddingRight: 7 }}>
          {[{ n: 'João S.', unread: true }, { n: 'Prof. Mota', unread: false }, { n: 'Maria C.', unread: false }].map(c => (
            <div key={c.n} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 5px', borderRadius: 6, background: c.unread ? 'var(--color-primary-subtle)' : 'transparent', border: `1px solid ${c.unread ? 'var(--color-primary-muted)' : 'transparent'}` }}>
              <div style={{ width: 16, height: 16, borderRadius: '50%', background: 'var(--color-bg-alt)', border: '1px solid var(--color-border)', flexShrink: 0 }} />
              <div style={{ fontSize: 7, color: c.unread ? 'var(--color-primary)' : 'var(--color-text-secondary)', fontWeight: c.unread ? 700 : 400 }}>{c.n}</div>
            </div>
          ))}
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5, justifyContent: 'flex-end' }}>
          <div style={{ alignSelf: 'flex-end', padding: '4px 8px', borderRadius: '8px 8px 2px 8px', background: 'var(--color-primary)', fontSize: 7, color: '#fff', maxWidth: '85%' }}>Sobre o projeto...</div>
          <div style={{ alignSelf: 'flex-start', padding: '4px 8px', borderRadius: '8px 8px 8px 2px', background: 'var(--color-glass)', border: '1px solid var(--color-glass-border)', fontSize: 7, color: 'var(--color-text)', maxWidth: '85%' }}>Claro, quando é a entrega?</div>
          <div style={{ height: 18, borderRadius: 6, background: 'var(--color-bg-alt)', border: '1px solid var(--color-border)' }} />
        </div>
      </div>
    </Mockup>
  )
}

function MkMissions() {
  return (
    <Mockup label="showo:Missões">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {[
          { label: 'Primeiro projeto', xp: 20, done: true },
          { label: 'Perfil completo', xp: 15, done: true },
          { label: 'Score 60+', xp: 25, done: false },
          { label: 'Diário ativo', xp: 20, done: false },
          { label: 'Projeto público', xp: 10, done: false },
        ].map(m => (
          <div key={m.label} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: '1px solid var(--color-border)' }}>
            <div style={{ width: 15, height: 15, borderRadius: '50%', border: `1.5px solid ${m.done ? 'var(--color-success)' : 'var(--color-border)'}`, background: m.done ? 'var(--color-success)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {m.done && <CheckCircle2 size={8} color="#fff" strokeWidth={3} />}
            </div>
            <div style={{ flex: 1, fontSize: 8, color: 'var(--color-text)', opacity: m.done ? 0.45 : 1, textDecoration: m.done ? 'line-through' : 'none' }}>{m.label}</div>
            <div style={{ fontSize: 8, fontWeight: 700, color: 'var(--color-text-tertiary)' }}>+{m.xp} XP</div>
          </div>
        ))}
      </div>
    </Mockup>
  )
}

function MkScore() {
  const bars = [
    { label: 'Projeto', pct: 80, weight: '30%' },
    { label: 'Apresentação', pct: 60, weight: '20%' },
    { label: 'Diário', pct: 90, weight: '25%' },
    { label: 'Conteúdo', pct: 70, weight: '15%' },
    { label: 'Validação', pct: 40, weight: '10%' },
  ]
  return (
    <Mockup label="Score: decomposição">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {bars.map(b => (
          <div key={b.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 55, flexShrink: 0, fontSize: 7.5, color: 'var(--color-text-secondary)' }}>{b.label}</div>
            <div style={{ flex: 1, height: 5, borderRadius: 3, background: 'var(--color-bg-alt)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${b.pct}%`, borderRadius: 3, background: 'var(--color-primary)', opacity: 0.72 }} />
            </div>
            <div style={{ width: 26, flexShrink: 0, fontSize: 7.5, color: 'var(--color-text-tertiary)', textAlign: 'right' }}>{b.weight}</div>
          </div>
        ))}
      </div>
    </Mockup>
  )
}

// ── Text helpers ──────────────────────────────────────────────────────────────
function Lead({ children }) { return <p className="atu-lead">{children}</p> }
function Body({ children }) { return <p className="atu-body">{children}</p> }
function H3({ children }) { return <h3 className="atu-h3">{children}</h3> }
function Note({ children }) { return <p className="atu-note">{children}</p> }

function Steps({ items }) {
  return (
    <ol className="atu-steps">
      {items.map((item, i) => (
        <li key={i}><span className="atu-step-num">{i + 1}</span><span>{item}</span></li>
      ))}
    </ol>
  )
}

function DefList({ items }) {
  return (
    <dl className="atu-dl">
      {items.map(({ term, def }) => (
        <div key={term} className="atu-dl-row">
          <dt>{term}</dt>
          <dd>{def}</dd>
        </div>
      ))}
    </dl>
  )
}

function Section({ id, title, subtitle, children }) {
  return (
    <section id={id} className="atu-section">
      <div className="atu-section-head">
        <h2 className="atu-section-title">{title}</h2>
        {subtitle && <p className="atu-section-subtitle">{subtitle}</p>}
      </div>
      {children}
    </section>
  )
}

// ── Inline feedback form ──────────────────────────────────────────────────────
function FeedbackForm() {
  const { user } = useAuth()
  const [msg, setMsg] = useState('')
  const [status, setStatus] = useState('idle')

  async function submit(e) {
    e.preventDefault()
    if (!msg.trim() || status === 'sending') return
    setStatus('sending')
    try {
      const { error } = await supabase.from('feedback').insert({ message: msg.trim(), page_url: '/aprende', user_id: user?.id ?? null })
      if (error) throw error
      setStatus('done')
    } catch {
      setStatus('error')
    }
  }

  if (status === 'done') return (
    <div className="atu-feedback-done">
      <Check size={15} />
      Obrigado, recebemos o teu feedback.
    </div>
  )

  return (
    <form className="atu-feedback-form" onSubmit={submit}>
      <textarea
        className="atu-feedback-ta"
        rows={3}
        placeholder="Algo que não percebeste, uma secção que está errada, ou algo que devíamos acrescentar..."
        value={msg}
        onChange={e => setMsg(e.target.value)}
      />
      {status === 'error' && <p style={{ fontSize: 12, color: 'var(--color-error)', margin: '4px 0 0' }}>Não foi possível enviar. Tenta outra vez.</p>}
      <button type="submit" className="atu-feedback-btn" disabled={!msg.trim() || status === 'sending'}>
        {status === 'sending' ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> A enviar...</> : <><Send size={13} /> Enviar</>}
      </button>
    </form>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function AprendeAUsar() {
  const [activeSection, setActiveSection] = useState('dashboard')

  useEffect(() => {
    const roots = SECTIONS.map(s => document.getElementById(s.id)).filter(Boolean)
    const obs = new IntersectionObserver(
      entries => { for (const e of entries) { if (e.isIntersecting) setActiveSection(e.target.id) } },
      { rootMargin: '-20% 0px -70% 0px', threshold: 0 }
    )
    roots.forEach(el => obs.observe(el))
    return () => obs.disconnect()
  }, [])

  function scrollTo(id) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="atu-root">
      <Navbar />

      <div className="atu-mobile-tabs">
        {SECTIONS.map(({ id, label }) => (
          <button
            key={id}
            className={`atu-mobile-tab${activeSection === id ? ' active' : ''}`}
            onClick={() => scrollTo(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="atu-layout">

        <aside className="atu-sidebar">
          <div className="atu-sidebar-intro">Índice</div>
          <nav className="atu-sidebar-nav">
            {SECTIONS.map(({ id, label }) => (
              <button key={id} className={`atu-nav-btn${activeSection === id ? ' active' : ''}`} onClick={() => scrollTo(id)}>
                {label}
              </button>
            ))}
          </nav>
        </aside>

        <main className="atu-content">

          <header className="atu-hero">
            <h1 className="atu-hero-title">Aprende a usar o Showo</h1>
            <p className="atu-hero-desc">Um guia a todas as funcionalidades da plataforma.</p>
          </header>

          <Section id="dashboard" title="Dashboard" subtitle="O centro de controlo dos teus projetos">
            <Lead>A dashboard é o primeiro ecrã que vês ao entrar na plataforma. É onde acompanhas os teus projetos, registas entradas no diário e vês o progresso geral.</Lead>

            <H3>Projetos fixados</H3>
            <Body>Podes fixar até 2 projetos na dashboard com o ícone de pino na lista do portfólio. O card fixado mostra o score, a data de defesa (se for PAP), e três ações diretas: Registar, para adicionar uma entrada no diário; Diário, para ver o historial; e Ver, para abrir a página pública. Se não tiveres nenhum projeto fixado manualmente, o projeto mais recente aparece automaticamente.</Body>

            <H3>Atividade e agenda</H3>
            <Body>A coluna da direita mostra a atividade dos últimos 7 dias, a streak de semanas consecutivas com registos, e a agenda com eventos e lembretes ligados às datas de defesa.</Body>

            <MkDashboard />
          </Section>

          <Section id="projetos" title="Projetos" subtitle="Criar, editar e gerir o teu portfólio">
            <Lead>Cada projeto tem uma página pública. Podes ter quantos projetos quiseres, desde PAP a trabalhos de grupo ou projetos pessoais.</Lead>

            <H3>Criar um projeto</H3>
            <Steps items={[
              'Clica em "Criar projeto" na sidebar.',
              'Escolhe o nome, tipo e área do projeto.',
              'O projeto fica criado e a página pública fica acessível por link.',
              'Preenche os campos no editor para aumentar o score.',
            ]} />

            <H3>Tipos de projeto</H3>
            <DefList items={[
              { term: 'PAP', def: 'Projeto de Aptidão Profissional, com campos específicos como orientador e data de defesa.' },
              { term: 'Estágio', def: 'Projeto de estágio curricular ou profissional.' },
              { term: 'Trabalho de grupo', def: 'Projeto colaborativo com outros alunos.' },
              { term: 'Projeto pessoal', def: 'Trabalho autónomo fora do contexto escolar.' },
              { term: 'Competição', def: 'Participação em hackathons ou concursos.' },
              { term: 'Apresentação', def: 'Trabalho de apresentação oral ou escrito.' },
            ]} />

            <H3>Visibilidade</H3>
            <Body>Cada projeto tem uma opção de visibilidade que defines no editor, na tab Tipo. Tens três opções:</Body>
            <DefList items={[
              { term: 'Público', def: 'O projeto aparece no Explorar, na Home e é acessível pelo link direto.' },
              { term: 'Só com link', def: 'O projeto não aparece em nenhuma listagem, mas qualquer pessoa com o link consegue vê-lo.' },
              { term: 'Privado', def: 'O projeto só é visível por ti. Ninguém mais consegue aceder, mesmo com o link.' },
            ]} />

            <H3>Fixar e destacar</H3>
            <Body>O pino fixa um projeto na dashboard (máximo 2). A estrela destaca um projeto no perfil público (máximo 3). São dois sistemas completamente independentes.</Body>

            <MkProjectList />
          </Section>

          <Section id="diario" title="Diário de Projeto" subtitle="Documenta o processo do teu trabalho">
            <Lead>O Diário tem duas partes. O Compositor, acessível a partir da dashboard, é onde adicionas entradas rápidas. O Canvas do Diário é um espaço visual livre, com cartões que podes mover e organizar à tua vontade.</Lead>

            <H3>Registar uma entrada a partir da dashboard</H3>
            <Body>Clica em "Registar" num projeto fixado na dashboard. Escolhes o tipo de registo, escreves o conteúdo e guardas. A entrada fica associada ao projeto e aparece no Canvas do Diário.</Body>

            <H3>Tipos de registo</H3>
            <DefList items={[
              { term: 'Progresso', def: 'O que fizeste: avanços, tarefas concluídas, funcionalidades implementadas.' },
              { term: 'Dificuldade', def: 'Obstáculos, bugs e bloqueios que encontraste, e como tentaste resolver.' },
              { term: 'Decisão', def: 'Escolhas importantes que fizeste no projeto e o raciocínio por trás delas.' },
              { term: 'Pesquisa', def: 'Algo que pesquisaste ou aprendeste durante o processo.' },
              { term: 'Ideia', def: 'Uma ideia que tiveste e que pode ou não avançar para o projeto.' },
              { term: 'Resultado', def: 'Conquistas, marcos alcançados e outputs concretos.' },
              { term: 'Nota', def: 'Qualquer coisa que não queiras esquecer.' },
            ]} />

            <H3>O Compositor</H3>
            <MkJournalComposer />

            <H3>O Canvas do Diário</H3>
            <Body>O Canvas é um espaço de trabalho livre e infinito que abre em ecrã completo. Podes adicionar três tipos de cartões: Nota, para registos livres; Ideia, para ideias a explorar; e Destaque, para momentos importantes. Cada cartão pode ser arrastado, redimensionado e editado diretamente. Usas o scroll ou os botões de zoom para navegar.</Body>

            <MkDiaryCanvas />
          </Section>

          <Section id="preview" title="Preview e Templates" subtitle="A apresentação pública do teu projeto">
            <Lead>A preview é o que qualquer pessoa vê quando visita o link do teu projeto. Podes personalizar completamente a aparência e adicionar blocos de conteúdo extra.</Lead>

            <H3>Abrir o editor</H3>
            <Body>Na página do projeto, clica no ícone de pincel no canto superior direito para entrar em modo de preview. No desktop, o painel de edição abre à direita. No mobile, aparece uma sheet em baixo. Toca no pincel para expandir ou fechar o painel.</Body>

            <DefList items={[
              { term: 'Estilo', def: 'Cor de destaque, fundo, tipografia, alinhamento do título, tamanho do hero e modo claro ou escuro.' },
              { term: 'Blocos', def: 'Conteúdo extra que aparece na página: notas, citações, destaques, imagens, vídeos, métricas, botões e links.' },
              { term: 'Templates', def: 'Aplica o estilo visual e os blocos base de uma vez. Podes modificar tudo depois.' },
              { term: 'Secções', def: 'Controla a ordem e visibilidade das secções automáticas geradas a partir dos campos do projeto.' },
            ]} />

            <H3>Templates</H3>
            <Body>Ao aplicar um template escolhes de uma vez o visual e os blocos iniciais. Se já tiveres blocos, a plataforma pede confirmação antes de os substituir. O template ativo fica marcado na lista.</Body>

            <MkPreviewEditor />

            <H3>Tipos de blocos</H3>
            <Body>Os blocos adicionam conteúdo livre à página: Nota, Título, Destaque, Citação, Métrica, Estatísticas, Imagem, Galeria, Vídeo, Card, Botão CTA, Link e Divisor. Podes reordená-los e editá-los a qualquer momento.</Body>

            <MkBlocks />
          </Section>

          <Section id="perfil" title="Perfil Público" subtitle="A tua página de portfólio">
            <Lead>O teu perfil em /u/username é visível a toda a gente, incluindo recrutadores, professores e outras escolas.</Lead>

            <H3>Projetos em destaque</H3>
            <Body>Podes destacar até 3 projetos no teu perfil com a estrela na lista do portfólio. Aparecem no topo com uma borda âmbar, antes dos restantes projetos.</Body>

            <H3>O que aparece no perfil</H3>
            <DefList items={[
              { term: 'Foto e dados', def: 'Foto de perfil, nome, bio, escola e curso.' },
              { term: 'Em destaque', def: 'Até 3 projetos escolhidos por ti, com destaque visual no topo.' },
              { term: 'Portfólio', def: 'Todos os projetos públicos ordenados por score.' },
              { term: 'Links', def: 'LinkedIn, GitHub e portfólio, definidos nas Definições.' },
            ]} />

            <Body>Podes completar o teu perfil nas Definições: foto, bio e links sociais. Um perfil preenchido é mais apelativo para quem visita.</Body>

            <MkProfile />
          </Section>

          <Section id="explorar" title="Explorar" subtitle="Descobre trabalhos de outros alunos">
            <Lead>A página Explorar é uma galeria com projetos de alunos de toda a plataforma. Podes filtrar por área, tipo e ordenar por score ou data.</Lead>

            <H3>Destaque automático</H3>
            <Body>A plataforma destaca automaticamente os projetos mais completos e bem avaliados. O algoritmo analisa score, qualidade do diário, apresentação visual e validação externa. Um projeto mais completo tem maior visibilidade no Explorar.</Body>

            <MkExplore />
          </Section>

          <Section id="turmas" title="Turmas" subtitle="A ligação entre alunos e professores">
            <Lead>As turmas permitem que professores acompanhem os projetos dos seus alunos diretamente na plataforma.</Lead>

            <H3>Para alunos</H3>
            <Steps items={[
              'O teu professor partilha um código de turma.',
              'Vai a Turmas e entra com o código.',
              'Ficas ligado à turma e o professor passa a ver os teus projetos.',
            ]} />

            <H3>Para professores</H3>
            <Steps items={[
              'Cria uma turma com nome e ano letivo.',
              'Partilha o código com os alunos.',
              'Acompanha os projetos de cada aluno e dá feedback estruturado.',
            ]} />

            <Note>O professor pode comentar diretamente na página do projeto com feedback por critérios. Esse feedback conta para o score do projeto.</Note>

            <MkTurma />
          </Section>

          <Section id="mensagens" title="Mensagens" subtitle="Comunicação direta na plataforma">
            <Lead>As mensagens permitem falar com outros alunos, professores ou recrutadores sem sair do Showo.</Lead>

            <H3>Enviar uma mensagem</H3>
            <Steps items={[
              'Clica em Mensagens na sidebar.',
              'Clica em "Nova conversa" e pesquisa o utilizador pelo nome.',
              'Escreve a mensagem e envia.',
            ]} />

            <Body>Mensagens por ler aparecem com um badge numérico na sidebar. Clica no sino para ver todas as notificações da plataforma.</Body>

            <MkMessages />
          </Section>

          <Section id="missoes" title="Missões" subtitle="Desafios que guiam a evolução do teu portfólio">
            <Lead>As missões são objetivos concretos que te ajudam a construir um portfólio mais completo. Cada missão completada dá XP.</Lead>

            <H3>Como funcionam</H3>
            <Body>Algumas missões completam-se automaticamente quando realizas uma ação, como criar o primeiro projeto. Outras precisam de ser ativas na página de Missões. Quando concluída, a missão fica marcada com um visto.</Body>

            <DefList items={[
              { term: 'Primeiro projeto (+20 XP)', def: 'Criar o primeiro projeto na plataforma.' },
              { term: 'Perfil completo (+15 XP)', def: 'Preencher o perfil com foto, bio e escola.' },
              { term: 'Score 60+ (+25 XP)', def: 'Alcançar um score de 60 ou mais num projeto.' },
              { term: 'Diário ativo (+20 XP)', def: 'Escrever 5 entradas no diário de um projeto.' },
              { term: 'Projeto público (+10 XP)', def: 'Tornar um projeto visível na plataforma.' },
              { term: 'Em destaque (+10 XP)', def: 'Colocar um projeto em destaque no perfil.' },
            ]} />

            <MkMissions />
          </Section>

          <Section id="score" title="Sistema de Score" subtitle="Como é calculado o score de cada projeto">
            <Lead>O score vai de 0 a 100 e reflete a qualidade e completude do projeto. Atualiza automaticamente sempre que editas o projeto ou adicionas entradas ao diário.</Lead>

            <H3>Componentes do score</H3>
            <DefList items={[
              { term: 'Projeto (30%)', def: 'Completude dos campos básicos: nome, área, tipo, escola, colaboradores e descrição.' },
              { term: 'Apresentação (20%)', def: 'Capa, blocos de conteúdo na preview, estilo personalizado e tagline gerada por IA.' },
              { term: 'Diário (25%)', def: 'Número e regularidade das entradas no diário.' },
              { term: 'Conteúdo (15%)', def: 'Profundidade dos campos: problema, solução, tecnologias, resultados e aprendizagens.' },
              { term: 'Validação (10%)', def: 'Score do professor, visualizações e gostos.' },
            ]} />

            <H3>Como aumentar o score</H3>
            <Steps items={[
              'Preenche todos os campos no editor do projeto.',
              'Adiciona uma imagem de capa.',
              'Escreve regularmente no diário.',
              'Personaliza a preview com estilo e blocos.',
              'Escreve pelo menos 80 caracteres nos campos de Resultados e Aprendizagens, que valem pontos extra.',
              'Partilha o link do projeto para ganhar visualizações.',
            ]} />

            <MkScore />
          </Section>

          <div className="atu-footer-block">
            <h3 className="atu-footer-title">Algo está errado neste guia?</h3>
            <p className="atu-footer-desc">Se encontraste um erro, algo desatualizado ou uma funcionalidade que não está explicada, conta-nos aqui.</p>
            <FeedbackForm />
          </div>

        </main>
      </div>
    </div>
  )
}
