import { useState, useEffect, useRef } from 'react'
import { Navbar } from '../components/Navbar'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { PinIcon as Pin } from '@solar-icons/react/bold/pin'
import { Pen2Icon as Pencil } from '@solar-icons/react/bold/pen-2'
import { TrashBinMinimalisticIcon as Trash2 } from '@solar-icons/react/bold/trash-bin-minimalistic'
import { ArrowRightUpIcon as ArrowUpRight } from '@solar-icons/react/bold/arrow-right-up'
import { ArrowLeftIcon as ArrowLeft } from '@solar-icons/react/bold/arrow-left'
import { GraphNewUpIcon as TrendingUp } from '@solar-icons/react/bold/graph-new-up'
import { DangerTriangleIcon as AlertTriangle } from '@solar-icons/react/bold/danger-triangle'
import { BranchingPathsDownIcon as GitBranch } from '@solar-icons/react/bold/branching-paths-down'
import { MagnifierIcon as Search } from '@solar-icons/react/bold/magnifier'
import { LightbulbIcon as Lightbulb } from '@solar-icons/react/bold/lightbulb'
import { CheckCircleIcon as CheckCircle2 } from '@solar-icons/react/bold/check-circle'
import { NotebookMinimalisticIcon as StickyNote } from '@solar-icons/react/bold/notebook-minimalistic'
import { MagnifierZoomInIcon as ZoomIn } from '@solar-icons/react/bold/magnifier-zoom-in'
import { MagnifierZoomOutIcon as ZoomOut } from '@solar-icons/react/bold/magnifier-zoom-out'
import { RestartIcon as RotateCcw } from '@solar-icons/react/bold/restart'
import { ChatRoundLineIcon as Quote } from '@solar-icons/react/bold/chat-round-line'
import { PlaneIcon as Send } from '@solar-icons/react/bold/plane'
import { CheckCircleIcon as Check } from '@solar-icons/react/bold/check-circle'
import { RefreshCircleIcon as Loader2 } from '@solar-icons/react/bold/refresh-circle'
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
                <Pin size={7} color="rgba(255,255,255,0.7)" />
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
            <Pin size={8} color={p.pinned ? 'var(--color-primary)' : 'var(--color-text-tertiary)'} />
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

          <Section id="dashboard" title="Dashboard" subtitle="O centro de controlo do teu projeto e da tua rotina">
            <Lead>A dashboard é o teu painel principal. É aqui que vês o teu projeto em foco, o estado do teu portfólio, os teus registos recentes e o que ainda tens para avançar.</Lead>

            <H3>Projeto em foco e projetos fixados</H3>
            <Body>Na dashboard, o projeto mais relevante aparece em destaque e podes fixar até 2 projetos para os ter sempre acessíveis. Os cards fixados mostram o score, o estado do projeto e ações rápidas como editar, abrir a página pública ou registar uma nova entrada.</Body>

            <H3>Acompanhamento semanal</H3>
            <Body>Hoje a dashboard também mostra se tens continuidade no teu trabalho: streak semanal, atividade nos últimos dias, check-ins e recaps de progresso. Isto ajuda-te a perceber se o teu processo está consistente e se o projeto está em andamento.</Body>

            <H3>Lembretes, tarefas e feedback</H3>
            <Body>Além do portfólio, a dashboard centraliza lembretes pessoais, tarefas de turma, feedback do professor e eventos importantes como defesas e datas de entrega. O objetivo é manter toda a rotina num só sítio.</Body>

            <MkDashboard />
          </Section>

          <Section id="projetos" title="Projetos" subtitle="Criar, editar, publicar e gerir o teu portfólio">
            <Lead>Cada projeto tem o seu espaço próprio e pode evoluir desde o rascunho até ao estado público. Podes ter vários projetos, em formatos diferentes, e gerir cada um sem perder o contexto do teu processo.</Lead>

            <H3>Criar um projeto</H3>
            <Steps items={[
              'Abre a dashboard ou o menu de projetos.',
              'Clica em "Criar projeto" e escolhe o tipo e a área.',
              'Preenche os campos principais e define a visibilidade.',
              'Vai completando o projeto para aumentar o score e melhorar a apresentação.',
            ]} />

            <H3>Tipos de projeto</H3>
            <DefList items={[
              { term: 'PAP', def: 'Projeto de Aptidão Profissional, com campos específicos para apresentação, defesa e acompanhamento escolar.' },
              { term: 'Estágio', def: 'Projeto de estágio curricular ou profissional.' },
              { term: 'Trabalho de grupo', def: 'Projeto colaborativo com outros alunos ou equipas.' },
              { term: 'Projeto pessoal', def: 'Trabalho autónomo, fora do contexto escolar.' },
              { term: 'Competição', def: 'Projeto para hackathons, concursos ou eventos de inovação.' },
              { term: 'Apresentação', def: 'Trabalho de apresentação oral, escrita ou multimédia.' },
            ]} />

            <H3>Visibilidade</H3>
            <Body>O projeto pode estar em diferentes estados de visibilidade. Isto decide quem consegue ver a tua página pública e se ela aparece na galeria do Explorar.</Body>
            <DefList items={[
              { term: 'Público', def: 'O projeto aparece no Explorar e fica acessível no link público.' },
              { term: 'Só com link', def: 'Não aparece nas listagens, mas continua acessível para quem recebe o link.' },
              { term: 'Privado', def: 'Só tu consegues ver o projeto, mesmo com o link.' },
            ]} />

            <H3>Fixar e destacar</H3>
            <Body>Há dois mecanismos diferentes: o pino fixa um projeto na dashboard; a estrela destaca um projeto no perfil público. Ambos são úteis, mas servem objetivos diferentes e não têm de ser usados ao mesmo tempo.</Body>

            <MkProjectList />
          </Section>

          <Section id="diario" title="Diário de Projeto" subtitle="Regista o processo, as ideias e os avanços">
            <Lead>O diário do projeto é o teu registo de progresso. Serve para documentar avanços, dificuldades, decisões, pesquisas e momentos importantes ao longo do trabalho.</Lead>

            <H3>Registar uma entrada</H3>
            <Body>Podes escrever uma entrada diretamente da dashboard ou a partir do projeto em foco. Escolhes o tipo de registo, escreves o teu conteúdo e guardas. As entradas ajudam a manter o histórico do projeto e reforçam o score.</Body>

            <H3>Tipos de registo</H3>
            <DefList items={[
              { term: 'Progresso', def: 'O que avançaste, tarefas que concluiste e funcionalidades implementadas.' },
              { term: 'Dificuldade', def: 'Bloqueios, problemas, bugs e desafios que encontraste no processo.' },
              { term: 'Decisão', def: 'Escolhas importantes e o raciocínio por detrás delas.' },
              { term: 'Pesquisa', def: 'Aprendizagens, ideias ou materiais que descobriste durante o trabalho.' },
              { term: 'Ideia', def: 'Uma hipótese ou conceito que pode ou não ser incorporado no projeto.' },
              { term: 'Resultado', def: 'Marcos alcançados, entregas e sucessos concretos.' },
              { term: 'Nota', def: 'Qualquer informação importante que não queiras esquecer.' },
            ]} />

            <H3>Reforço da continuidade</H3>
            <Body>Na experiência atual, o diário também está ligado ao acompanhamento semanal e ao espírito de progresso. Registos consistentes ajudam a manter a rotina, a mostrar evolução e a acompanhar melhor os marcos do projeto.</Body>

            <H3>O Compositor</H3>
            <MkJournalComposer />

            <H3>O Canvas do Diário</H3>
            <Body>O Canvas funciona como um espaço visual livre. Podes criar cartões de Nota, Ideia e Destaque, movê-los, reorganizar o espaço e manter o teu processo visualmente organizado. Também é útil para resumir momentos importantes do projeto.</Body>

            <MkDiaryCanvas />
          </Section>

          <Section id="preview" title="Preview e Templates" subtitle="Como apresentar o teu projeto ao mundo">
            <Lead>A preview mostra a versão pública do teu projeto. É o ecrã em que decides como a página vai parecer, que blocos aparecem e como a história do trabalho é apresentada.</Lead>

            <H3>Abrir o editor</H3>
            <Body>Na página do projeto, a edição da preview está disponível a partir do botão de pincel ou do menu de gestão. O editor permite ajustar o estilo visual, reorganizar blocos e aplicar templates prontos.</Body>

            <DefList items={[
              { term: 'Estilo', def: 'Cor de destaque, fundo, tipografia, alinhamento e apresentação geral da página.' },
              { term: 'Blocos', def: 'Notas, citações, destaques, imagens, vídeos, métricas, botões, links e secções extra.' },
              { term: 'Templates', def: 'Aplicam um visual e uma estrutura base em poucos cliques.' },
              { term: 'Secções', def: 'Controlam a ordem e a visibilidade das partes automáticas do projeto.' },
            ]} />

            <H3>Templates</H3>
            <Body>Os templates são uma forma rápida de começar com um visual bem pensado. Se já existir conteúdo, a plataforma pede confirmação antes de substituir blocos ou layout.</Body>

            <MkPreviewEditor />

            <H3>Tipos de blocos</H3>
            <Body>Os blocos ajudam a contar a história do projeto: notas, citações, destaques, estatísticas, imagens, links, botões de ação e divisores. Podes editá-los em qualquer altura e rearranjá-los à medida que o projeto evolui.</Body>

            <MkBlocks />
          </Section>

          <Section id="perfil" title="Perfil Público" subtitle="O teu portfólio visível para outras pessoas">
            <Lead>O teu perfil público é a tua página de apresentação. Serve para mostrar quem és, o que fazes e quais os projetos que tens para partilhar com professores, recrutadores e outras pessoas.</Lead>

            <H3>Projetos em destaque</H3>
            <Body>Podes destacar até 3 projetos no perfil. Esses projetos aparecem primeiro, com destaque visual, antes dos restantes. A estrela no portfólio é a forma de controlar esse destaque.</Body>

            <H3>O que aparece no perfil</H3>
            <DefList items={[
              { term: 'Foto e dados', def: 'Foto de perfil, nome, bio, escola e curso.' },
              { term: 'Em destaque', def: 'Até 3 projetos selecionados por ti para aparecerem no topo.' },
              { term: 'Portfólio', def: 'Todos os projetos públicos, organizados por score ou relevância.' },
              { term: 'Links', def: 'Links para LinkedIn, GitHub, portfólio ou outras redes.' },
            ]} />

            <Body>É importante distinguir entre destaque no perfil e fixação na dashboard: o primeiro afeta a tua página pública, o segundo afeta o teu painel pessoal.</Body>

            <MkProfile />
          </Section>

          <Section id="explorar" title="Explorar" subtitle="Descobre projetos de outros alunos e inspira-te">
            <Lead>A página Explorar é uma galeria de projetos na plataforma. Aqui podes ver trabalhos de outras pessoas, pesquisar por área ou tema e descobrir exemplos que te ajudem a evoluir.</Lead>

            <H3>Projetos em destaque</H3>
            <Body>A plataforma destaca projetos com maior consistência, melhor apresentação e progresso mais sólido ao longo do tempo. Mesmo sem filtros, a galeria mostra trabalhos de maior qualidade e maior interesse para a comunidade.</Body>

            <MkExplore />
          </Section>

          <Section id="turmas" title="Turmas" subtitle="Acompanhar alunos e projetos em contexto escolar">
            <Lead>As turmas permitem conectar alunos e professores num mesmo espaço de acompanhamento. O professor consegue ver progresso, feedback e tarefas sem sair da plataforma.</Lead>

            <H3>Para alunos</H3>
            <Steps items={[
              'O professor partilha um código de turma.',
              'Entras em Turmas e introduces o código.',
              'Ficas ligado à turma e o professor passa a acompanhar o teu projeto.',
            ]} />

            <H3>Para professores</H3>
            <Steps items={[
              'Cria uma turma com nome, disciplina e ano letivo.',
              'Partilha o código com os alunos.',
              'Acompanha a evolução dos projetos, tarefas e feedback por critérios.',
            ]} />

            <Note>Na experiência atual, as turmas incluem também tarefas, feedback do professor e acompanhamento de progresso, não apenas o acesso ao projeto do aluno.</Note>

            <MkTurma />
          </Section>

          <Section id="mensagens" title="Mensagens e notificações" subtitle="Comunicação, feedback e acompanhamento">
            <Lead>O Showo integra comunicação direta com notificações e feedback do professor. Não é apenas chat: também tens alertas sobre progresso, comentários e atividades relevantes no teu projeto.</Lead>

            <H3>Enviar uma mensagem</H3>
            <Steps items={[
              'Abre Mensagens ou a área de notificações.',
              'Escolhe a conversa ou cria uma nova.',
              'Escreve a mensagem e envia.',
            ]} />

            <Body>As notificações aparecem quando recebes feedback, quando alguém interage contigo ou quando há algo que precisa da tua atenção. Mantêm a comunicação mais clara e menos dispersa.</Body>

            <MkMessages />
          </Section>

          <Section id="missoes" title="Missões" subtitle="Objetivos que te ajudam a evoluir o portfólio">
            <Lead>As missões são objetivos concretos que guiam o teu progresso. Cada conclusão adiciona valor ao teu portfólio e ajuda a tornar o processo mais estruturado.</Lead>

            <H3>Como funcionam</H3>
            <Body>Algumas missões completam-se automaticamente ao realizares ações como criar o primeiro projeto ou fazer o perfil completo. Outras estão ligadas ao teu progresso e ao projeto em si.</Body>

            <DefList items={[
              { term: 'Primeiro projeto (+20 XP)', def: 'Criar o primeiro projeto na plataforma.' },
              { term: 'Perfil completo (+15 XP)', def: 'Preencher o perfil com foto, bio e escola.' },
              { term: 'Score 60+ (+25 XP)', def: 'Atingir um score de 60 ou mais.' },
              { term: 'Diário ativo (+20 XP)', def: 'Registar atividade regular no diário.' },
              { term: 'Projeto público (+10 XP)', def: 'Tornar um projeto visível na plataforma.' },
              { term: 'Em destaque (+10 XP)', def: 'Destacar um projeto no perfil público.' },
            ]} />

            <MkMissions />
          </Section>

          <Section id="score" title="Sistema de Score" subtitle="Como é medido o progresso do projeto">
            <Lead>O score reflecte a qualidade e a completude do teu projeto. Atualiza conforme preenches campos, publicas conteúdo, registas no diário e recebes feedback.</Lead>

            <H3>Componentes do score</H3>
            <DefList items={[
              { term: 'Projeto (30%)', def: 'Completude dos campos principais do projeto: nome, área, tipo, descrição e componentes essenciais.' },
              { term: 'Apresentação (20%)', def: 'Capa, estilo visual, boa estrutura e apresentação da página pública.' },
              { term: 'Diário (25%)', def: 'Regularidade, profundidade e riqueza das entradas no processo.' },
              { term: 'Conteúdo (15%)', def: 'Qualidade das respostas, resultados e aprendizagens documentadas.' },
              { term: 'Validação (10%)', def: 'Feedback do professor, visualizações e validação do projeto.' },
            ]} />

            <H3>Como aumentar o score</H3>
            <Steps items={[
              'Completa os campos principais do projeto.',
              'Adiciona uma capa e estrutura a página pública bem.',
              'Escreve regularmente no diário.',
              'Melhora a preview com estilo e blocos.',
              'Inclui resultados, aprendizagens e contexto relevante.',
              'Pede feedback e partilha o projeto para ganhar visibilidade.',
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
