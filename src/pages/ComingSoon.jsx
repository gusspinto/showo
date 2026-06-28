export default function ComingSoon() {
  return (
    <div style={{
      position: 'relative', minHeight: '100vh', background: '#03060d',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 40, overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(620px 660px at 50% 44%, rgba(18,60,140,0.18) 0%, rgba(18,60,140,0.05) 45%, rgba(3,6,13,0) 70%)',
      }} />

      <img
        src="/icon.png"
        alt=""
        style={{ width: 38, opacity: 0.5, filter: 'drop-shadow(0 0 18px rgba(27,120,247,0.3))' }}
      />

      <img
        src="/logo.png"
        alt="Showo"
        style={{ width: 168, opacity: 0.95, filter: 'drop-shadow(0 0 28px rgba(27,120,247,0.2))' }}
      />

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
        <p style={{
          margin: 0, fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 11,
          letterSpacing: '0.32em', color: 'rgba(125,147,176,0.5)', textTransform: 'uppercase',
        }}>
          Em breve
        </p>
        <div style={{ width: 22, height: 1, background: 'rgba(125,147,176,0.25)' }} />
        <p style={{
          margin: 0, fontFamily: 'var(--font-body)', fontWeight: 400, fontSize: 14,
          letterSpacing: '0.14em', color: 'rgba(214,224,238,0.62)',
        }}>
          1 de julho
        </p>
      </div>
    </div>
  )
}
