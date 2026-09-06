// Protótipo da mecânica de caixas de recompensa — /recompensa
// Página de teste isolada: estado só em localStorage, nada ligado à app real.
// Serve para ver a ideia a funcionar antes de a construir a sério.
import { useState, useEffect } from 'react'
import { Navbar } from '../components/Navbar'
import { BOX_SOURCES, REWARD_POOL, RARITY_COLOR, dropChance, drawReward } from '../lib/rewards'
import { FONTS } from '../lib/profileAppearance'
import { PlusIcon as Plus } from '../components/icons/PlusIcon'
import { CloseIcon as X } from '@solar-icons/react/bold/close'
import { RefreshCircleIcon as Restart } from '@solar-icons/react/bold/refresh-circle'
import { AltArrowDownIcon as ChevronDown } from '@solar-icons/react/bold/alt-arrow-down'

const LS_KEY = 'showo_reward_lab'

const EMPTY = { boxes: [], inv: { xp: 0, aiCredits: {}, streakFreeze: 0, unlocks: [], badges: [] } }

function load() {
  try { return { ...EMPTY, ...JSON.parse(localStorage.getItem(LS_KEY) || '{}') } }
  catch { return { ...EMPTY } }
}
function save(state) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(state)) } catch { /* ignore */ }
}

const REWARD_BY_ID = Object.fromEntries(REWARD_POOL.map(r => [r.id, r]))

export default function RecompensaLab() {
  const [state, setState] = useState(load)
  const [open, setOpen] = useState(null)   // null | 'shaking' | reward object
  const [showPool, setShowPool] = useState(false)

  useEffect(() => { save(state) }, [state])

  const { boxes, inv } = state

  function grantBox(source) {
    setState(s => ({ ...s, boxes: [...s.boxes, { source, at: Date.now(), key: Math.random().toString(36).slice(2) }] }))
  }

  function openNext() {
    if (!boxes.length || open) return
    setOpen('shaking')
    setTimeout(() => {
      const excluded = [...inv.unlocks, ...inv.badges.map(b => 'badge_' + b)]
      const reward = drawReward(excluded)
      setOpen(reward)
      setState(s => {
        const inv = { ...s.inv, aiCredits: { ...s.inv.aiCredits } }
        if (reward.type === 'xp') inv.xp += reward.value
        else if (reward.type === 'ai_credit') inv.aiCredits[reward.value] = (inv.aiCredits[reward.value] || 0) + 1
        else if (reward.type === 'streak_freeze') inv.streakFreeze += reward.value
        else if (reward.type === 'badge') inv.badges = [...new Set([...s.inv.badges, reward.value])]
        else inv.unlocks = [...new Set([...s.inv.unlocks, reward.id])]
        return { ...s, inv, boxes: s.boxes.slice(1) }
      })
    }, 650)
  }

  function reset() {
    setState({ ...EMPTY })
    setOpen(null)
  }

  const unlockedAccents = inv.unlocks.map(id => REWARD_BY_ID[id]).filter(r => r?.type === 'accent')
  const unlockedFonts   = inv.unlocks.map(id => REWARD_BY_ID[id]).filter(r => r?.type === 'font')
  const unlockedBanners = inv.unlocks.map(id => REWARD_BY_ID[id]).filter(r => r?.type === 'banner_pattern')

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      <Navbar />
      <style>{`
        @keyframes rl-shake { 0%,100%{transform:translateX(0) rotate(0)} 20%{transform:translateX(-3px) rotate(-2deg)} 40%{transform:translateX(3px) rotate(2deg)} 60%{transform:translateX(-2px) rotate(-1deg)} 80%{transform:translateX(2px) rotate(1deg)} }
        @keyframes rl-pop { from{opacity:0;transform:scale(0.9)} to{opacity:1;transform:scale(1)} }
        .rl-box-shake { animation: rl-shake 0.16s linear infinite; }
        .rl-reveal { animation: rl-pop 0.28s cubic-bezier(0.22,1,0.36,1); }
      `}</style>

      <div className="page-content" style={{ maxWidth: 720, margin: '0 auto', paddingTop: 40, paddingBottom: 80 }}>

        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 4 }}>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 400, fontFamily: 'var(--font-heading)', letterSpacing: '-0.4px', color: 'var(--color-text)' }}>
            Recompensas
          </h1>
          <button onClick={reset} style={btnGhost}><Restart size={13} /> Repor tudo</button>
        </div>
        <p style={{ margin: '0 0 32px', fontSize: 13, color: 'var(--color-text-tertiary)' }}>
          Protótipo. Estado só neste browser, nada ligado à app. Dá trigger às caixas que quiseres e abre-as.
        </p>

        {/* ── Ganhar caixa ── */}
        <p style={labelStyle}>Ganhar caixa</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 8, marginBottom: 32 }}>
          {Object.entries(BOX_SOURCES).map(([id, s]) => (
            <button key={id} onClick={() => grantBox(id)} style={sourceBtn}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 13, color: 'var(--color-text)' }}>
                <Plus size={12} /> {s.label}
              </span>
              <span style={{ fontSize: 11.5, color: 'var(--color-text-tertiary)', marginTop: 3 }}>{s.desc}</span>
            </button>
          ))}
        </div>

        {/* ── Por abrir ── */}
        <p style={labelStyle}>Por abrir · {boxes.length}</p>
        <div style={{
          border: '1px solid var(--color-border)', borderRadius: 16, padding: '36px 24px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, marginBottom: 32,
          background: 'var(--color-surface)',
        }}>
          {open && typeof open === 'object' ? (
            <div className="rl-reveal" style={{ textAlign: 'center' }}>
              <div style={{
                width: 64, height: 64, margin: '0 auto 14px', borderRadius: 16,
                border: `2px solid ${RARITY_COLOR[open.rarity]}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: RARITY_COLOR[open.rarity],
              }}>
                <BoxGlyph size={30} />
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: RARITY_COLOR[open.rarity] }}>
                {open.rarity}
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text)', margin: '4px 0 2px', fontFamily: 'var(--font-heading)' }}>
                {open.label}
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>{typeLabel(open.type)}</div>
              <button onClick={() => setOpen(null)} style={{ ...btnPrimary, marginTop: 18 }}>
                {boxes.length ? `Continuar (${boxes.length} por abrir)` : 'Fechar'}
              </button>
            </div>
          ) : boxes.length ? (
            <>
              <button
                onClick={openNext}
                disabled={open === 'shaking'}
                className={open === 'shaking' ? 'rl-box-shake' : undefined}
                style={{
                  width: 96, height: 96, borderRadius: 20, cursor: open === 'shaking' ? 'default' : 'pointer',
                  border: '1px solid var(--color-border-hover)', background: 'var(--color-bg-alt)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-secondary)',
                  transition: 'transform 0.15s, border-color 0.15s',
                }}
                onMouseEnter={e => { if (open !== 'shaking') { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.borderColor = 'var(--color-text)' } }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.borderColor = 'var(--color-border-hover)' }}
              >
                <BoxGlyph size={44} />
              </button>
              <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                {open === 'shaking' ? 'A abrir…' : 'Toca para abrir'} · vindas de {[...new Set(boxes.map(b => BOX_SOURCES[b.source]?.label))].join(', ')}
              </span>
            </>
          ) : (
            <span style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>Sem caixas. Ganha uma acima.</span>
          )}
        </div>

        {/* ── Inventário ── */}
        <p style={labelStyle}>Inventário</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 16 }}>
          <Stat label="XP" value={inv.xp} />
          <Stat label="Congeladores de sequência" value={inv.streakFreeze} />
          <Stat label="Créditos de IA" value={Object.values(inv.aiCredits).reduce((a, b) => a + b, 0)} />
          <Stat label="Distintivos" value={inv.badges.length} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32 }}>
          <InvRow label="Cores desbloqueadas" empty={!unlockedAccents.length}>
            {unlockedAccents.map(r => (
              <span key={r.id} title={r.label} style={{ width: 22, height: 22, borderRadius: '50%', background: r.value, border: '1px solid var(--color-border)' }} />
            ))}
          </InvRow>
          <InvRow label="Tipografias" empty={!unlockedFonts.length}>
            {unlockedFonts.map(r => (
              <span key={r.id} style={{ ...chip, fontFamily: FONTS[r.value]?.heading }}>{FONTS[r.value]?.label}</span>
            ))}
          </InvRow>
          <InvRow label="Padrões de banner" empty={!unlockedBanners.length}>
            {unlockedBanners.map(r => <span key={r.id} style={chip}>{r.label.replace('Padrão ', '').replace(/"/g, '')}</span>)}
          </InvRow>
          <InvRow label="Créditos de IA" empty={!Object.keys(inv.aiCredits).length}>
            {Object.entries(inv.aiCredits).map(([k, n]) => <span key={k} style={chip}>{aiLabel(k)} ×{n}</span>)}
          </InvRow>
          <InvRow label="Distintivos" empty={!inv.badges.length}>
            {inv.badges.map(b => <span key={b} style={{ ...chip, borderColor: '#C49A20', color: '#C49A20' }}>{b === 'early' ? 'Madrugador' : 'Constante'}</span>)}
          </InvRow>
        </div>

        {/* ── Pool ── */}
        <button onClick={() => setShowPool(v => !v)} style={{ ...btnGhost, marginBottom: showPool ? 12 : 0 }}>
          <ChevronDown size={13} style={{ transform: showPool ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
          Todas as recompensas ({REWARD_POOL.length})
        </button>
        {showPool && (
          <div style={{ border: '1px solid var(--color-border)', borderRadius: 12, overflow: 'hidden' }}>
            {REWARD_POOL.map((r, i) => (
              <div key={r.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                padding: '9px 14px', fontSize: 13,
                borderTop: i ? '1px solid var(--color-border)' : 'none',
              }}>
                <span style={{ color: 'var(--color-text)' }}>{r.label}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: RARITY_COLOR[r.rarity] }}>{r.rarity}</span>
                  <span style={{ color: 'var(--color-text-tertiary)', fontVariantNumeric: 'tabular-nums', minWidth: 44, textAlign: 'right' }}>{dropChance(r)}%</span>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* ── bits ── */

function BoxGlyph({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" stroke="currentColor" strokeWidth="1.6" strokelinejoin="round" />
      <path d="M4 7.5l8 4.5 8-4.5M12 12v9" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  )
}

function Stat({ label, value }) {
  return (
    <div style={{ border: '1px solid var(--color-border)', borderRadius: 10, padding: '12px 14px' }}>
      <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-heading)', color: 'var(--color-text)', letterSpacing: '-0.5px' }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 3 }}>{label}</div>
    </div>
  )
}

function InvRow({ label, empty, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 26 }}>
      <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)', width: 160, flexShrink: 0 }}>{label}</span>
      {empty ? <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)', opacity: 0.6 }}>—</span>
        : <span style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>{children}</span>}
    </div>
  )
}

function typeLabel(t) {
  return { xp: 'Pontos de experiência', accent: 'Cor de perfil', font: 'Tipografia de perfil',
    banner_pattern: 'Padrão de banner', ai_credit: 'Crédito de IA', streak_freeze: 'Congelador de sequência', badge: 'Distintivo' }[t] || t
}
function aiLabel(k) {
  return { analyzeProject: 'Análise de projeto', defense: 'Defesa com IA', diaryReport: 'Relatório do diário' }[k] || k
}

const labelStyle = { fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--color-text-secondary)', margin: '0 0 12px' }
const chip = { display: 'inline-flex', alignItems: 'center', gap: 4, border: '1px solid var(--color-border)', borderRadius: 999, padding: '3px 11px', fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)' }
const btnGhost = { display: 'inline-flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', color: 'var(--color-text-secondary)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', padding: 0 }
const btnPrimary = { background: 'var(--color-text)', color: 'var(--color-bg)', border: 'none', borderRadius: 9, padding: '9px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }
const sourceBtn = { display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left', border: '1px solid var(--color-border)', borderRadius: 10, padding: '11px 13px', background: 'var(--color-surface)', cursor: 'pointer', fontFamily: 'inherit' }
