import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

// Shared shell for the Privacy Policy and Terms pages: readable single column,
// app theme, accessible without login.
export default function LegalLayout({ title, updated, intro, children }) {
  const navigate = useNavigate()
  return (
    <div style={{ minHeight: '100dvh', background: 'var(--color-bg)', color: 'var(--color-text)', fontFamily: 'var(--font-body)' }}>
      <header style={{
        position: 'sticky', top: 0, zIndex: 10,
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 20px', height: 60,
        background: 'var(--color-bg)', borderBottom: '1px solid var(--color-border)',
        backdropFilter: 'blur(12px)',
      }}>
        <button
          onClick={() => navigate(-1)}
          aria-label="Voltar"
          style={{ background: 'transparent', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer', width: 36, height: 36, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', WebkitTapHighlightColor: 'transparent' }}
        >
          <ArrowLeft size={20} />
        </button>
        <Link to="/" style={{ display: 'flex', alignItems: 'center' }}>
          <img src="/icon_logo.png" alt="Showo" style={{ height: 24, width: 'auto', objectFit: 'contain' }} />
        </Link>
      </header>

      <main style={{ maxWidth: 760, margin: '0 auto', padding: '34px 20px 90px' }} className="legal-body">
        <h1 style={{ fontSize: 'clamp(26px, 5vw, 36px)', fontWeight: 800, letterSpacing: '-0.6px', margin: '0 0 6px', fontFamily: 'var(--font-heading)' }}>{title}</h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 13, margin: '0 0 24px' }}>Última atualização: {updated}</p>

        {intro && (
          <p style={{ fontSize: 16, lineHeight: 1.7, color: 'var(--color-text)', margin: '0 0 8px' }}>{intro}</p>
        )}

        {children}
      </main>

      <style>{`
        .legal-body h2 { font-size: 19px; font-weight: 800; letter-spacing: -0.3px; margin: 34px 0 10px; font-family: var(--font-heading); color: var(--color-text); }
        .legal-body h3 { font-size: 15px; font-weight: 700; margin: 20px 0 6px; color: var(--color-text); }
        .legal-body p { font-size: 15px; line-height: 1.7; color: var(--color-text-secondary); margin: 0 0 12px; }
        .legal-body ul { margin: 0 0 14px; padding-left: 20px; display: flex; flex-direction: column; gap: 7px; }
        .legal-body li { font-size: 15px; line-height: 1.6; color: var(--color-text-secondary); }
        .legal-body li strong, .legal-body p strong { color: var(--color-text); font-weight: 600; }
        .legal-body a { color: var(--color-primary); }
      `}</style>
    </div>
  )
}
