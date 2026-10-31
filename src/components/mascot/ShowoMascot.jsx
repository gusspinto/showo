import { useEffect, useRef, useState } from 'react'

/* Mascote do Showo, versão "óculos": dois olhos de formas diferentes (um
   círculo azul, um quadrado arredondado dourado) ligados por uma pequena
   ponte azul, com uma boca vermelha por baixo. As 3 cores da marca
   presentes, cada uma com o seu papel (não a competir pelo mesmo espaço
   como as versões anteriores tentaram). Desenhado pelo Gustavo, replicado
   aqui com fidelidade depois de várias direções descartadas (moldura de 3
   cores, blob com mordida, pilha de cartões, etc.).

   Pupila do círculo e do quadrado usam a mesma cor do respetivo anel, o
   interior de ambos é escuro (cor de superfície, não transparente, para
   funcionar em qualquer fundo da app).

   Pisca sozinho de vez em quando (as pupilas encolhem na vertical) e
   seguem o rato num raio pequeno, só quando animated=true (a sidebar pede
   animated=false, estático). */

const BLUE = '#3B82F6'
const GOLD = '#D4A017'
const RED = '#D14D4D'
const DARK = '#1c2430'

export default function ShowoMascot({ size = 96, className, style, animated = true }) {
  const rootRef = useRef(null)
  const [blink, setBlink] = useState(false)
  const [look, setLook] = useState({ x: 0, y: 0 })

  // Pisca sozinho: intervalo aleatório entre 2.5s e 6s, pisca dura 120ms.
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

  // Pupilas seguem o rato, raio pequeno, só quando o mascote está no ecrã.
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
        const maxOffset = 0.5 // unidades do viewBox, raio pequeno (as pupilas já são pequenas)
        const scale = Math.min(1, dist / 220)
        setLook({ x: (dx / dist) * maxOffset * scale, y: (dy / dist) * maxOffset * scale })
      })
    }
    window.addEventListener('mousemove', onMove)
    return () => { window.removeEventListener('mousemove', onMove); if (raf) cancelAnimationFrame(raf) }
  }, [animated])

  const pupilRy = blink ? 0.2 : 1.7

  return (
    <svg
      ref={rootRef}
      className={className}
      style={style}
      width={size}
      height={size * (24 / 32)}
      viewBox="0 0 32 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Olho esquerdo: círculo azul */}
      <circle cx="7.5" cy="9.5" r="6.3" fill={DARK} stroke={BLUE} strokeWidth="3" />
      <ellipse cx={7.5 + look.x} cy={9.5 + look.y} rx={1.7} ry={pupilRy} fill={BLUE} />

      {/* Olho direito: quadrado arredondado dourado */}
      <rect x="17.5" y="3.2" width="12.5" height="12.5" rx="4" fill={DARK} stroke={GOLD} strokeWidth="3" />
      <ellipse cx={23.7 + look.x} cy={9.4 + look.y} rx={1.7} ry={pupilRy} fill={GOLD} />

      {/* Ponte: liga os dois olhos, por cima de ambos para nunca ficar tapada */}
      <path d="M13.5 8.3 C15.5 8 16.8 9 17.5 10.3" fill="none" stroke={BLUE} strokeWidth="2.6" strokeLinecap="round" />

      {/* Boca */}
      <rect x="12.5" y="20" width="8" height="2.1" rx="1.05" fill={RED} />
    </svg>
  )
}
