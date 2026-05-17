import { useState, useEffect } from 'react'
import { Edit3, Zap, Link } from 'lucide-react'

const STEPS = [
  {
    icon: <Edit3 size={48} color="#3b82f6" />,
    title: 'Descreve o teu projeto',
    desc: 'Escreve umas palavras sobre o que estás a construir — a IA percebe o contexto sozinha.',
    preview: (
      <div style={{
        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(59,130,246,0.2)',
        borderRadius: 12, padding: '14px 16px', marginTop: 16,
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <span style={{ fontSize: 13, color: '#7d93b0', flex: 1 }}>
          "Aplicação para gerir horários de estudantes do ensino profissional..."
        </span>
        <div style={{
          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
          background: 'linear-gradient(135deg,#3b82f6,#4f46e5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18,
        }}>→</div>
      </div>
    ),
  },
  {
    icon: <Zap size={48} color="#3b82f6" />,
    title: 'A IA preenche tudo',
    desc: 'O Claude analisa a descrição e pré-preenche o objetivo, problema, solução, tecnologias e muito mais.',
    preview: (
      <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 7 }}>
        {['Objetivo', 'Problema', 'Solução', 'Tecnologias'].map((label, i) => (
          <div key={label} style={{
            background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)',
            borderRadius: 8, padding: '8px 12px',
            display: 'flex', alignItems: 'center', gap: 8,
            opacity: 1,
            animation: `fade-in-up 0.4s ${i * 0.1}s both`,
          }}>
            <span style={{ fontSize: 11, color: '#60a5fa', fontWeight: 700, minWidth: 80 }}>{label}</span>
            <div style={{ flex: 1, height: 6, background: 'rgba(59,130,246,0.15)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{
                height: '100%', background: 'linear-gradient(90deg,#3b82f6,#818cf8)',
                borderRadius: 3,
                width: `${[72, 58, 85, 64][i]}%`,
              }} />
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    icon: <Link size={48} color="#3b82f6" />,
    title: 'A tua página profissional',
    desc: 'O resultado é uma página com design profissional, score, análise IA e link único para partilhares com quem quiseres.',
    preview: (
      <div style={{
        marginTop: 16, background: 'rgba(13,20,36,0.8)',
        border: '1px solid rgba(59,130,246,0.2)', borderRadius: 12, overflow: 'hidden',
      }}>
        <div style={{ background: 'linear-gradient(135deg,rgba(59,130,246,0.15),rgba(79,70,229,0.1))', padding: '14px 16px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#e8f2ff', marginBottom: 4 }}>Gestão de Horários</div>
          <div style={{ fontSize: 11, color: '#7d93b0' }}>João Silva · Desenvolvimento de Aplicações</div>
        </div>
        <div style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            background: 'conic-gradient(#22c55e 306deg,#1e3050 0deg)',
            borderRadius: '50%', width: 34, height: 34, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{ background: '#0d1424', borderRadius: '50%', width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: '#22c55e' }}>85</div>
          </div>
          <div style={{ flex: 1, fontSize: 11, color: '#7d93b0' }}>showo.vercel.app/projeto/<span style={{ color: '#60a5fa' }}>gestao-horarios</span></div>
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
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Backdrop */}
      <div
        onClick={handleDone}
        style={{
          position: 'fixed', inset: 0, zIndex: 10000,
          background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.3s',
        }}
      />

      {/* Modal */}
      <div style={{
        position: 'fixed', zIndex: 10001,
        top: '50%', left: '50%',
        transform: `translate(-50%, ${visible ? '-50%' : '-46%'})`,
        opacity: visible ? 1 : 0,
        transition: 'all 0.35s cubic-bezier(0.34,1.56,0.64,1)',
        width: 'calc(100% - 48px)', maxWidth: 420,
        background: 'linear-gradient(160deg,#111c32,#0d1424)',
        border: '1px solid rgba(59,130,246,0.25)',
        borderRadius: 22,
        padding: '32px 28px 28px',
        boxShadow: '0 24px 80px rgba(0,0,0,0.7)',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}>
        {/* Skip */}
        <button
          onClick={handleDone}
          style={{
            position: 'absolute', top: 16, right: 16,
            background: 'none', border: 'none', color: '#3d5270',
            cursor: 'pointer', fontSize: 13, fontFamily: 'inherit',
          }}
        >saltar</button>

        {/* Step content */}
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <div style={{ marginBottom: 14, lineHeight: 1, display: 'flex', justifyContent: 'center' }}>{s.icon}</div>
          <h2 style={{ margin: '0 0 10px', fontSize: 21, fontWeight: 800, color: '#e8f2ff', letterSpacing: '-0.3px' }}>
            {s.title}
          </h2>
          <p style={{ margin: 0, fontSize: 14, color: '#7d93b0', lineHeight: 1.65 }}>
            {s.desc}
          </p>
        </div>

        {s.preview}

        {/* Dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, margin: '22px 0 20px' }}>
          {STEPS.map((_, i) => (
            <div
              key={i}
              onClick={() => setStep(i)}
              style={{
                width: i === step ? 20 : 6, height: 6, borderRadius: 3,
                background: i === step ? '#3b82f6' : '#1e3050',
                transition: 'all 0.25s', cursor: 'pointer',
              }}
            />
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={next}
          style={{
            width: '100%', padding: '13px',
            background: 'linear-gradient(135deg,#3b82f6,#4f46e5)',
            border: 'none', borderRadius: 12,
            color: '#fff', fontSize: 15, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit',
            boxShadow: '0 4px 20px rgba(59,130,246,0.35)',
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          {isLast ? 'Começar agora →' : 'Próximo →'}
        </button>
      </div>
    </>
  )
}
