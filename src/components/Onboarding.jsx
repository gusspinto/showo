import { useState, useEffect } from 'react'
import { Edit3, Zap, Link } from 'lucide-react'

const STEPS = [
  {
    icon: <Edit3 size={32} color="#3b82f6" strokeWidth={2} />,
    title: 'Descreve o teu projeto',
    desc: 'Escreve umas palavras sobre o que estás a construir — a IA percebe o contexto sozinha.',
    preview: (
      <div style={{
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(59,130,246,0.15)',
        borderRadius: 10, padding: '12px 14px', marginTop: 14,
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <span style={{ fontSize: 12, color: '#7d93b0', flex: 1, lineHeight: 1.5 }}>
          "Aplicação para gerir horários de estudantes do ensino profissional..."
        </span>
        <div style={{
          width: 30, height: 30, borderRadius: 8, flexShrink: 0,
          background: 'linear-gradient(135deg,#3b82f6,#4f46e5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14,
        }}>→</div>
      </div>
    ),
  },
  {
    icon: <Zap size={32} color="#3b82f6" strokeWidth={2} />,
    title: 'A IA preenche tudo',
    desc: 'O Claude analisa a descrição e pré-preenche o objetivo, problema, solução, tecnologias e muito mais.',
    preview: (
      <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {['Objetivo', 'Problema', 'Solução', 'Tecnologias'].map((label, i) => (
          <div key={label} style={{
            background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.12)',
            borderRadius: 7, padding: '7px 11px',
            display: 'flex', alignItems: 'center', gap: 8,
            animation: `guide-fade-up 0.35s ${i * 0.08}s both`,
          }}>
            <span style={{ fontSize: 11, color: '#60a5fa', fontWeight: 700, minWidth: 74 }}>{label}</span>
            <div style={{ flex: 1, height: 5, background: 'rgba(59,130,246,0.12)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{
                height: '100%', background: 'linear-gradient(90deg,#3b82f6,#818cf8)',
                borderRadius: 3, width: `${[72, 58, 85, 64][i]}%`,
              }} />
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    icon: <Link size={32} color="#3b82f6" strokeWidth={2} />,
    title: 'A tua página profissional',
    desc: 'O resultado é uma página com design profissional, score, análise IA e link único para partilhares.',
    preview: (
      <div style={{
        marginTop: 14, background: 'rgba(13,20,36,0.8)',
        border: '1px solid rgba(59,130,246,0.15)', borderRadius: 10, overflow: 'hidden',
      }}>
        <div style={{ background: 'linear-gradient(135deg,rgba(59,130,246,0.12),rgba(79,70,229,0.08))', padding: '12px 14px' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#e8f2ff', marginBottom: 3 }}>Gestão de Horários</div>
          <div style={{ fontSize: 11, color: '#7d93b0' }}>João Silva · Desenvolvimento de Aplicações</div>
        </div>
        <div style={{ padding: '9px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            background: 'conic-gradient(#22c55e 306deg,#1e3050 0deg)',
            borderRadius: '50%', width: 30, height: 30, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{ background: '#0d1424', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 800, color: '#22c55e' }}>85</div>
          </div>
          <div style={{ flex: 1, fontSize: 11, color: '#7d93b0' }}>
            showo.app/projeto/<span style={{ color: '#60a5fa' }}>gestao-horarios</span>
          </div>
        </div>
      </div>
    ),
  },
]

export default function Onboarding({ onDone }) {
  const [step, setStep] = useState(0)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100)
    return () => clearTimeout(t)
  }, [])

  function handleDone() {
    localStorage.setItem('showo_seen_onboarding', '1')
    setVisible(false)
    setTimeout(onDone, 300)
  }

  function next() {
    if (step < STEPS.length - 1) setStep(s => s + 1)
    else handleDone()
  }

  const s = STEPS[step]
  const isLast = step === STEPS.length - 1

  return (
    <>
      <style>{`
        @keyframes guide-fade-up {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Backdrop — leve, deixa ver o fundo */}
      <div
        onClick={handleDone}
        style={{
          position: 'fixed', inset: 0, zIndex: 10000,
          background: 'rgba(0,0,0,0.45)',
          backdropFilter: 'blur(2px)',
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.3s',
        }}
      />

      {/* Card */}
      <div style={{
        position: 'fixed', zIndex: 10001,
        top: '50%', left: '50%',
        transform: `translate(-50%, ${visible ? '-50%' : '-46%'})`,
        opacity: visible ? 1 : 0,
        transition: 'all 0.35s cubic-bezier(0.34,1.56,0.64,1)',
        width: 'calc(100% - 40px)', maxWidth: 400,
        background: 'linear-gradient(160deg,#111c32,#0d1424)',
        border: '1px solid rgba(59,130,246,0.2)',
        borderRadius: 20,
        padding: '22px 22px 22px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}>

        {/* Header row: badge + fechar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 7,
            background: 'rgba(59,130,246,0.1)',
            border: '1px solid rgba(59,130,246,0.25)',
            borderRadius: 20, padding: '4px 10px 4px 7px',
          }}>
            <span style={{ fontSize: 13 }}>📖</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#60a5fa', letterSpacing: 0.2 }}>Guia rápido</span>
            <span style={{
              fontSize: 10, fontWeight: 700, color: '#3b82f6',
              background: 'rgba(59,130,246,0.15)', borderRadius: 10,
              padding: '1px 6px', marginLeft: 2,
            }}>{step + 1}/{STEPS.length}</span>
          </div>

          <button
            onClick={handleDone}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 8, padding: '5px 10px',
              color: '#7d93b0', cursor: 'pointer',
              fontSize: 12, fontFamily: 'inherit',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#e8f2ff' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#7d93b0' }}
          >
            <span style={{ fontSize: 14, lineHeight: 1 }}>✕</span>
            <span>Saltar guia</span>
          </button>
        </div>

        {/* Content */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 4 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12, flexShrink: 0,
            background: 'rgba(59,130,246,0.08)',
            border: '1px solid rgba(59,130,246,0.18)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {s.icon}
          </div>
          <div>
            <h2 style={{ margin: '0 0 5px', fontSize: 16, fontWeight: 800, color: '#e8f2ff', letterSpacing: '-0.2px' }}>
              {s.title}
            </h2>
            <p style={{ margin: 0, fontSize: 13, color: '#7d93b0', lineHeight: 1.6 }}>
              {s.desc}
            </p>
          </div>
        </div>

        {s.preview}

        {/* Footer: dots + botão */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 18, gap: 12 }}>
          <div style={{ display: 'flex', gap: 5 }}>
            {STEPS.map((_, i) => (
              <div
                key={i}
                onClick={() => setStep(i)}
                style={{
                  width: i === step ? 18 : 5, height: 5, borderRadius: 3,
                  background: i === step ? '#3b82f6' : '#1e3050',
                  transition: 'all 0.25s', cursor: 'pointer',
                }}
              />
            ))}
          </div>

          <button
            onClick={next}
            style={{
              padding: '9px 20px',
              background: 'linear-gradient(135deg,#3b82f6,#4f46e5)',
              border: 'none', borderRadius: 10,
              color: '#fff', fontSize: 13, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit',
              boxShadow: '0 4px 16px rgba(59,130,246,0.3)',
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            {isLast ? 'Começar →' : 'Próximo →'}
          </button>
        </div>
      </div>
    </>
  )
}
