// Protótipo da mecânica do dia + caixas de recompensa — /recompensa
// Página de teste isolada: estado só em localStorage, nada ligado à app real.
// Serve para ver a ideia a funcionar antes de a construir a sério.
import { useState, useEffect } from 'react'
import { Navbar } from '../components/Navbar'
import { DAILY_STEPS, BOX_SOURCES, REWARD_POOL, RARITY_COLOR, dropChance, drawReward } from '../lib/rewards'
import { PlusIcon as Plus } from '../components/icons/PlusIcon'
import { RefreshCircleIcon as Restart } from '@solar-icons/react/bold/refresh-circle'
import { AltArrowDownIcon as ChevronDown } from '@solar-icons/react/bold/alt-arrow-down'
import { CheckCircleIcon as Check } from '@solar-icons/react/bold/check-circle'
import { RecordCircleIcon as Circle } from '@solar-icons/react/bold/record-circle'

const LS_KEY = 'showo_reward_lab'
const EMPTY = {
  boxes: [],
  inv: { xp: 0, aiCredits: {}, streakFreeze: 0, boosts: 0, badges: [] },
  day: { partilhar: false, mostrar: false, registar: false, done: false, streak: 0 },
}

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(LS_KEY) || '{}')
    return { ...EMPTY, ...s, inv: { ...EMPTY.inv, ...s.inv }, day: { ...EMPTY.day, ...s.day } }
  } catch { return { ...EMPTY } }
}
const save = s => { try { localStorage.setItem(LS_KEY, JSON.stringify(s)) } catch { /* ignore */ } }

export default function RecompensaLab() {
  const [state, setState] = useState(load)
  const [open, setOpen] = useState(null)   // null | 'shaking' | reward object
  const [showPool, setShowPool] = useState(false)

  useEffect(() => { save(state) }, [state])

  const { boxes, inv, day } = state
  const allSteps = DAILY_STEPS.every(s => day[s.id])

  function toggleStep(id) {
    setState(s => ({ ...s, day: { ...s.day, [id]: !s.day[id] } }))
  }

  function concludeDay() {
    if (!allSteps || day.done) return
    setState(s => ({
      ...s,
      day: { ...s.day, done: true, streak: s.day.streak + 1 },
      boxes: [...s.boxes, { source: 'daily', key: rk() }],
    }))
  }

  function newDay() {
    setState(s => ({ ...s, day: { partilhar: false, mostrar: false, registar: false, done: false, streak: s.day.streak } }))
  }

  function grantBox(source) {
    setState(s => ({ ...s, boxes: [...s.boxes, { source, key: rk() }] }))
  }

  function openNext() {
    if (!boxes.length || open) return
    setOpen('shaking')
    setTimeout(() => {
      const reward = drawReward(inv.badges.map(b => 'badge_' + b))
      setOpen(reward)
      setState(s => {
        const iv = { ...s.inv, aiCredits: { ...s.inv.aiCredits } }
        if (reward.type === 'xp') iv.xp += reward.value
        else if (reward.type === 'ai_credit') iv.aiCredits[reward.value] = (iv.aiCredits[reward.value] || 0) + 1
        else if (reward.type === 'streak_freeze') iv.streakFreeze += reward.value
        else if (reward.type === 'explore_boost') iv.boosts += 1
        else if (reward.type === 'badge') iv.badges = [...new Set([...s.inv.badges, reward.value])]
        return { ...s, inv: iv, boxes: s.boxes.slice(1) }
      })
    }, 650)
  }

  function reset() { setState({ ...EMPTY }); setOpen(null) }

  const aiTotal = Object.values(inv.aiCredits).reduce((a, b) => a + b, 0)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      <Navbar />
      <style>{`
        @keyframes rl-shake { 0%,100%{transform:translateX(0) rotate(0)} 25%{transform:translateX(-3px) rotate(-2deg)} 50%{transform:translateX(3px) rotate(2deg)} 75%{transform:translateX(-2px) rotate(-1deg)} }
        @keyframes rl-pop { from{opacity:0;transform:scale(0.92)} to{opacity:1;transform:scale(1)} }
        .rl-box-shake { animation: rl-shake 0.16s linear infinite; }
        .rl-reveal { animation: rl-pop 0.28s cubic-bezier(0.22,1,0.36,1); }
      `}</style>

      <div className="page-content" style={{ maxWidth: 680, margin: '0 auto', paddingTop: 40, paddingBottom: 80 }}>

        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 4 }}>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 400, fontFamily: 'var(--font-heading)', letterSpacing: '-0.4px', color: 'var(--color-text)' }}>Recompensas</h1>
          <button onClick={reset} style={btnGhost}><Restart size={13} /> Repor tudo</button>
        </div>
        <p style={{ margin: '0 0 32px', fontSize: 13, color: 'var(--color-text-tertiary)' }}>
          Protótipo. Estado só neste browser, nada ligado à app.
        </p>

        {/* ── O teu dia ── */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
          <p style={{ ...labelStyle, margin: 0 }}>O teu dia</p>
          {day.streak > 0 && <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>· {day.streak} dia{day.streak !== 1 ? 's' : ''} seguido{day.streak !== 1 ? 's' : ''}</span>}
        </div>
        <div style={{ border: '1px solid var(--color-border)', borderRadius: 14, padding: 16, marginBottom: 32, background: 'var(--color-surface)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {DAILY_STEPS.map((s, i) => (
              <button key={s.id} onClick={() => toggleStep(s.id)} disabled={day.done}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 8px', background: 'transparent', border: 'none', cursor: day.done ? 'default' : 'pointer', textAlign: 'left', fontFamily: 'inherit', borderTop: i ? '1px solid var(--color-border)' : 'none' }}>
                {day[s.id]
                  ? <Check size={18} color="var(--color-success)" style={{ flexShrink: 0 }} />
                  : <Circle size={18} color="var(--color-text-tertiary)" style={{ flexShrink: 0 }} />}
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 13.5, fontWeight: 700, color: day[s.id] ? 'var(--color-text-secondary)' : 'var(--color-text)' }}>{s.label}</span>
                  <span style={{ display: 'block', fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 1 }}>{s.desc}</span>
                </span>
              </button>
            ))}
          </div>
          <div style={{ marginTop: 12 }}>
            {day.done ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, color: 'var(--color-success)', fontWeight: 600 }}>Dia concluído · ganhaste 1 caixa</span>
                <button onClick={newDay} style={btnGhost}>Simular dia seguinte</button>
              </div>
            ) : (
              <button onClick={concludeDay} disabled={!allSteps} style={{ ...btnPrimary, width: '100%', opacity: allSteps ? 1 : 0.45, cursor: allSteps ? 'pointer' : 'default' }}>
                Concluir o dia
              </button>
            )}
          </div>
        </div>

        {/* ── Ganhar caixa (outros gatilhos) ── */}
        <p style={labelStyle}>Outros gatilhos</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8, marginBottom: 32 }}>
          {Object.entries(BOX_SOURCES).filter(([id]) => id !== 'daily').map(([id, s]) => (
            <button key={id} onClick={() => grantBox(id)} style={sourceBtn}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 13, color: 'var(--color-text)' }}><Plus size={12} /> {s.label}</span>
              <span style={{ fontSize: 11.5, color: 'var(--color-text-tertiary)', marginTop: 3 }}>{s.desc}</span>
            </button>
          ))}
        </div>

        {/* ── Por abrir ── */}
        <p style={labelStyle}>Por abrir · {boxes.length}</p>
        <div style={{ border: '1px solid var(--color-border)', borderRadius: 16, padding: '36px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, marginBottom: 32, background: 'var(--color-surface)' }}>
          {open && typeof open === 'object' ? (
            <div className="rl-reveal" style={{ textAlign: 'center' }}>
              <div style={{ width: 64, height: 64, margin: '0 auto 14px', borderRadius: 16, border: `2px solid ${RARITY_COLOR[open.rarity]}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: RARITY_COLOR[open.rarity] }}>
                <BoxGlyph size={30} />
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: RARITY_COLOR[open.rarity] }}>{open.rarity}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text)', margin: '4px 0 2px', fontFamily: 'var(--font-heading)' }}>{open.label}</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>{typeLabel(open.type)}</div>
              <button onClick={() => setOpen(null)} style={{ ...btnPrimary, marginTop: 18 }}>
                {boxes.length ? `Continuar (${boxes.length} por abrir)` : 'Fechar'}
              </button>
            </div>
          ) : boxes.length ? (
            <>
              <button onClick={openNext} disabled={open === 'shaking'} className={open === 'shaking' ? 'rl-box-shake' : undefined}
                style={{ width: 96, height: 96, borderRadius: 20, cursor: open === 'shaking' ? 'default' : 'pointer', border: '1px solid var(--color-border-hover)', background: 'var(--color-bg-alt)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-secondary)', transition: 'transform 0.15s, border-color 0.15s' }}
                onMouseEnter={e => { if (open !== 'shaking') { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.borderColor = 'var(--color-text)' } }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.borderColor = 'var(--color-border-hover)' }}>
                <BoxGlyph size={44} />
              </button>
              <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                {open === 'shaking' ? 'A abrir…' : 'Toca para abrir'} · de {[...new Set(boxes.map(b => BOX_SOURCES[b.source]?.label))].join(', ')}
              </span>
            </>
          ) : (
            <span style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>Sem caixas. Conclui o dia ou usa um gatilho.</span>
          )}
        </div>

        {/* ── Inventário ── */}
        <p style={labelStyle}>Inventário</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 16 }}>
          <Stat label="XP" value={inv.xp} />
          <Stat label="Congeladores" value={inv.streakFreeze} />
          <Stat label="Créditos de IA" value={aiTotal} />
          <Stat label="Destaques" value={inv.boosts} />
          <Stat label="Distintivos" value={inv.badges.length} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32 }}>
          <InvRow label="Créditos de IA" empty={!aiTotal}>
            {Object.entries(inv.aiCredits).filter(([, n]) => n > 0).map(([k, n]) => <span key={k} style={chip}>{aiLabel(k)} ×{n}</span>)}
          </InvRow>
          <InvRow label="Distintivos" empty={!inv.badges.length}>
            {inv.badges.map(b => <span key={b} style={{ ...chip, borderColor: '#C49A20', color: '#C49A20' }}>{badgeLabel(b)}</span>)}
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
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '9px 14px', fontSize: 13, borderTop: i ? '1px solid var(--color-border)' : 'none' }}>
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
const rk = () => Math.random().toString(36).slice(2)

function BoxGlyph({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
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
      <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)', width: 140, flexShrink: 0 }}>{label}</span>
      {empty ? <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)', opacity: 0.6 }}>—</span>
        : <span style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>{children}</span>}
    </div>
  )
}
function typeLabel(t) {
  return { xp: 'Pontos de experiência', ai_credit: 'Crédito de IA', streak_freeze: 'Congelador de sequência',
    explore_boost: 'Destaque na Explorar', badge: 'Distintivo' }[t] || t
}
function aiLabel(k) { return { analyzeProject: 'Análise de projeto', defense: 'Defesa com IA', diaryReport: 'Relatório do diário' }[k] || k }
function badgeLabel(b) { return { early: 'Madrugador', steady: 'Constante', curious: 'Curioso' }[b] || b }

const labelStyle = { fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--color-text-secondary)', margin: '0 0 12px' }
const chip = { display: 'inline-flex', alignItems: 'center', gap: 4, border: '1px solid var(--color-border)', borderRadius: 999, padding: '3px 11px', fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)' }
const btnGhost = { display: 'inline-flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', color: 'var(--color-text-secondary)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', padding: 0 }
const btnPrimary = { background: 'var(--color-text)', color: 'var(--color-bg)', border: 'none', borderRadius: 9, padding: '10px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }
const sourceBtn = { display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left', border: '1px solid var(--color-border)', borderRadius: 10, padding: '11px 13px', background: 'var(--color-surface)', cursor: 'pointer', fontFamily: 'inherit' }
