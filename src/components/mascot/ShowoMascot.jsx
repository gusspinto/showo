import { useEffect, useRef, useState } from 'react'

/* Mascote do Showo: a própria marca (favicon.png/icon.png, o "L" azul +
   barra vermelha + barra amarela à volta de um quadrado branco) com dois
   olhos lá dentro. Pedido do Gustavo: uma personagem "amigável" para a IA,
   em cima do ícone que já existe, não uma forma nova inventada do zero.

   Tudo SVG, sem nenhuma imagem: o ícone original não tinha ficheiro fonte
   (só PNG), por isso foi recriado aqui com dois retângulos + um traço em
   "L" (stroke com linecap/linejoin arredondados, é o que dá o canto
   superior esquerdo arredondado e a ponta direita da barra azul
   arredondada, sem precisar de desenhar arcos à mão). Proporções medidas
   a partir do favicon.png: moldura com ~18.5% da largura de espessura,
   janela branca ao centro com ~63% da largura.

   Olhos: duas elipses azul-marinho (--color-bg do Showo, #1C2333), para
   lerem como "olhos" em cima do quadrado branco em qualquer fundo.
   Piscam sozinhos de vez em quando (setInterval com intervalo aleatório) e
   seguem o rato num raio pequeno enquanto o mascote está visível, tudo
   com CSS/JS puro, sem bibliotecas de animação. */

const T = 4.43 // espessura da moldura (escala 0-24)
const FACE = T // janela branca começa em T, acaba em 24-T

export default function ShowoMascot({ size = 96, className, style, animated = true, monochrome = false, color }) {
  const rootRef = useRef(null)
  const [blink, setBlink] = useState(false)
  const [look, setLook] = useState({ x: 0, y: 0 })

  // Pisca sozinho: intervalo aleatório entre 2.5s e 6s, pisca dura 120ms.
  // Desligado quando animated=false (ex: item da sidebar, pedido do
  // Gustavo para ficar estático ali, a animação só faz sentido num sítio
  // em que se olha para o mascote, não numa lista de navegação).
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

  // Olhos seguem o rato, raio pequeno (não é um "olhar perdido" largo
  // demais), só quando o mascote está no ecrã, para não gastar trabalho à
  // toa numa página comprida. Também desligado quando animated=false.
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
        const maxOffset = 0.9 // unidades do viewBox 0-24
        const scale = Math.min(1, dist / 220)
        setLook({ x: (dx / dist) * maxOffset * scale, y: (dy / dist) * maxOffset * scale })
      })
    }
    window.addEventListener('mousemove', onMove)
    return () => { window.removeEventListener('mousemove', onMove); if (raf) cancelAnimationFrame(raf) }
  }, [animated])

  const eyeCx1 = 10.3 + look.x
  const eyeCx2 = 14.6 + look.x
  const eyeCy = 13.2 + look.y

  // monochrome: usado na sidebar (pedido do Gustavo), a moldura toda
  // numa cor só (neutra quando o Coach não está aberto, azul quando está),
  // em vez das 3 cores da marca. As 3 cores ficam só para os sítios onde o
  // mascote é mesmo o protagonista (cabeçalho do chat, ecrã vazio).
  const blue = monochrome ? color : 'var(--color-primary, #3B82F6)'
  const gold = monochrome ? color : '#D4A017'
  const red = monochrome ? color : '#D14D4D'

  return (
    <svg
      ref={rootRef}
      className={className}
      style={style}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Moldura azul: um único traço em "L", de baixo à esquerda até ao
          fim da barra de cima à direita. */}
      <path
        d={`M ${T / 2} ${24 - T} L ${T / 2} ${T / 2} L ${24 - T / 2} ${T / 2}`}
        stroke={blue}
        strokeWidth={T}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Barra amarela (direita) e vermelha (baixo), por cima da azul para
          cobrir as pontas arredondadas onde se encontram. */}
      <rect x={24 - T} y={T} width={T} height={24 - T} fill={gold} />
      <rect x={0} y={24 - T} width={24 - T} height={T} fill={red} />
      {/* Janela branca ao centro: a "cara". */}
      <rect x={FACE} y={FACE} width={24 - 2 * FACE} height={24 - 2 * FACE} fill="#fff" />

      {/* Olhos: escondidos (linha fina) a piscar, elipse normal o resto do
          tempo. */}
      <ellipse cx={eyeCx1} cy={eyeCy} rx={1.15} ry={blink ? 0.15 : 1.5} fill="#1C2333" />
      <ellipse cx={eyeCx2} cy={eyeCy} rx={1.15} ry={blink ? 0.15 : 1.5} fill="#1C2333" />
    </svg>
  )
}
