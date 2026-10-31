import { useEffect, useRef, useState } from 'react'

/* Mascote do Showo: uma "janela" desenhada à mão, não um retângulo
   geométrico perfeito. Dois traços soltos (um só de cima, outro que faz
   esquerda+baixo+direita) que não se tocam no canto superior direito: o
   espaço entre eles é de propósito, o mesmo "ar" que já existe no ícone
   original do Showo (favicon.png/icon.png), onde a moldura nunca fecha
   num quadrado perfeito. Pedido do Gustavo, depois de testar uma versão
   com as 3 cores da marca (moldura + janela branca) e preferir esta:
   mais simples, mais "desenhada à mão", uma cor só.

   Olhos: duas elipses cheias, sem pupila, mesma cor do traço. Piscam
   sozinhos de vez em quando e seguem o rato num raio pequeno, só quando
   animated=true (a sidebar pede animated=false, estático). */

const STROKE_W = 2.3

const PATH_SIDES = 'M4.3 4.8 C3.3 9 3.2 15.5 3.8 20 C9 20.9 16 20.8 20.3 20.1 C20.9 16.5 21 11.5 20.9 8.5'
const PATH_TOP = 'M5.4 3.6 C10 2.9 13.5 2.9 16.3 3.3'

export default function ShowoMascot({ size = 96, className, style, animated = true, color = 'var(--color-primary, #3B82F6)' }) {
  const rootRef = useRef(null)
  const [blink, setBlink] = useState(false)
  const [look, setLook] = useState({ x: 0, y: 0 })

  // Pisca sozinho: intervalo aleatório entre 2.5s e 6s, pisca dura 120ms.
  // Desligado quando animated=false (ex: item da sidebar, pedido do
  // Gustavo para ficar estático ali).
  useEffect(() => {
    if (!animated) return
    let timeout
    function scheduleBlink() {
      const delay = 2500 + Math.random() * 3500
      timeout = setTimeout(() => {
        setBlink(true)
        setTimeout(() => setBlink(false), 120)
        scheduleBlink()
      }, delay)
    }
    scheduleBlink()
    return () => clearTimeout(timeout)
  }, [animated])

  // Olhos seguem o rato, raio pequeno, só quando o mascote está no ecrã.
  useEffect(() => {
    if (!animated) return
    let raf = null
    function onMove(e) {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = null
        const el = rootRef.current
        if (!el) return
        const rect = el.getBoundingClientRect()
        if (rect.bottom < 0 || rect.top > window.innerHeight) return
        const cx = rect.left + rect.width / 2
        const cy = rect.top + rect.height / 2
        const dx = e.clientX - cx
        const dy = e.clientY - cy
        const dist = Math.hypot(dx, dy) || 1
        const maxOffset = 0.8 // unidades do viewBox
        const scale = Math.min(1, dist / 220)
        setLook({ x: (dx / dist) * maxOffset * scale, y: (dy / dist) * maxOffset * scale })
      })
    }
    window.addEventListener('mousemove', onMove)
    return () => { window.removeEventListener('mousemove', onMove); if (raf) cancelAnimationFrame(raf) }
  }, [animated])

  const eyeCx1 = 9.4 + look.x
  const eyeCx2 = 15 + look.x
  const eyeCy1 = 12.3 + look.y
  const eyeCy2 = 12.1 + look.y

  return (
    <svg
      ref={rootRef}
      className={className}
      style={style}
      width={size}
      height={size * (27 / 24)}
      viewBox="0 0 24 27"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d={PATH_SIDES} stroke={color} strokeWidth={STROKE_W} strokeLinecap="round" strokeLinejoin="round" />
      <path d={PATH_TOP} stroke={color} strokeWidth={STROKE_W} strokeLinecap="round" strokeLinejoin="round" />
      <ellipse cx={eyeCx1} cy={eyeCy1} rx={1.5} ry={blink ? 0.15 : 1.9} fill={color} />
      <ellipse cx={eyeCx2} cy={eyeCy2} rx={1.5} ry={blink ? 0.15 : 1.9} fill={color} />
    </svg>
  )
}
