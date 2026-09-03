import { useLayoutEffect, useRef, useState } from 'react'
import './AreaChart.css'

/* Gráfico de área com curva suave (Catmull-Rom → bézier), preenchimento
   em gradiente e tooltip no hover. Inspirado no SparkLine do modo admin,
   mas ondulado e temável. Mede a própria largura para não distorcer.

   props:
     data        — [{ label, value, detail?, onClick? }]
     height      — altura em px (default 120)
     color       — cor da linha/área (default var(--color-primary))
     valueSuffix — texto a seguir ao valor no tooltip (ex: " projetos")
*/
export default function AreaChart({
  data = [],
  height = 120,
  color = 'var(--color-primary)',
  valueSuffix = '',
}) {
  const wrapRef = useRef(null)
  const [w, setW] = useState(320)
  const [hover, setHover] = useState(null)

  useLayoutEffect(() => {
    if (!wrapRef.current) return
    const el = wrapRef.current
    const update = () => setW(el.clientWidth || 320)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  if (data.length < 2) return null

  const padX = 12
  const padTop = 16
  const padBot = 22
  const usableW = Math.max(1, w - padX * 2)
  const usableH = height - padTop - padBot
  const max = Math.max(...data.map(d => d.value), 1)

  const pts = data.map((d, i) => ({
    x: padX + (i / (data.length - 1)) * usableW,
    y: padTop + usableH - (d.value / max) * usableH,
    ...d,
  }))

  const curve = (() => {
    let path = `M ${pts[0].x},${pts[0].y}`
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i]
      const p1 = pts[i]
      const p2 = pts[i + 1]
      const p3 = pts[i + 2] || p2
      const c1x = p1.x + (p2.x - p0.x) / 6
      const c1y = p1.y + (p2.y - p0.y) / 6
      const c2x = p2.x - (p3.x - p1.x) / 6
      const c2y = p2.y - (p3.y - p1.y) / 6
      path += ` C ${c1x},${c1y} ${c2x},${c2y} ${p2.x},${p2.y}`
    }
    return path
  })()

  const baseY = padTop + usableH
  const areaPath = `${curve} L ${pts[pts.length - 1].x},${baseY} L ${pts[0].x},${baseY} Z`
  const hitW = usableW / (data.length - 1)
  const gradId = 'ac-grad'

  return (
    <div className="ac" ref={wrapRef} style={{ height }} onMouseLeave={() => setHover(null)}>
      {hover !== null && (
        <ACTooltip x={Math.min(w - 54, Math.max(54, pts[hover].x))} y={pts[hover].y}>
          <strong>{pts[hover].label}</strong>
          <span>{pts[hover].value}{valueSuffix}{pts[hover].detail ? ` · ${pts[hover].detail}` : ''}</span>
        </ACTooltip>
      )}
      <svg width={w} height={height} style={{ display: 'block' }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.22" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill={`url(#${gradId})`} />
        <path d={curve} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {pts.map((p, i) => {
          const isHover = hover === i
          const isLast = i === pts.length - 1
          return (
            <g key={i}>
              <rect
                x={p.x - hitW / 2} y={0} width={hitW} height={height} fill="transparent"
                style={{ cursor: p.onClick ? 'pointer' : 'default' }}
                onMouseEnter={() => setHover(i)}
                onClick={() => p.onClick?.()}
              />
              {isHover && (
                <line x1={p.x} y1={padTop} x2={p.x} y2={baseY} stroke={color} strokeOpacity="0.3" strokeWidth="1" strokeDasharray="3,3" />
              )}
              {(isHover || isLast) && (
                <circle cx={p.x} cy={p.y} r={isHover ? 4.5 : 3.5} fill={color} stroke="var(--color-bg)" strokeWidth="2" />
              )}
              <text x={p.x} y={height - 6} textAnchor="middle" fontSize="10" fontWeight={isHover ? 700 : 400}
                fill={isHover ? 'var(--color-text)' : 'var(--color-text-tertiary)'}>
                {p.label}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

function ACTooltip({ x, y, children }) {
  return (
    <div className="ac-tip" style={{ left: x, top: Math.max(0, y - 10) }}>
      {children}
    </div>
  )
}
