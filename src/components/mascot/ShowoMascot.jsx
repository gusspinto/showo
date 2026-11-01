import { useEffect, useRef, useState } from 'react'

/* Mascote do Showo, traço exato desenhado pelo Gustavo (Canva, vetorizado
   com autotracer.org). Os paths abaixo são os pontos originais do ficheiro
   exportado, apenas recortados à área da mascote, sem redesenho à mão: 3
   círculos em sequência (azul, vermelho, dourado, a seguir a ordem das
   cores da marca), o azul sem olho, vermelho e dourado com pupila preta.

   A sombra suave sob as pupilas do ficheiro original foi deixada de fora,
   não existe sombra em mais nenhum sítio da app (visual plano), por
   consistência.

   Prop `colored`: false usa cinza neutro nos 3 círculos (ex: item da
   sidebar fora da página do Coach), true usa as cores da marca.

   Prop `loading`: pulsa os 3 círculos em sequência (azul, vermelho,
   dourado), reaproveitando a ideia original do Gustavo de "3 pontos a
   carregar" como indicador de "a pensar" do Coach, em vez do indicador
   genérico de 3 bolinhas cinzentas que estava lá antes.

   Pupilas com `style.transition` no transform para um seguimento do rato
   mais suave e natural (antes saltava de frame a frame sem suavização). */

const BLUE = '#1b77f4'
const RED = '#d34040'
const GOLD = '#f6a900'

const CIRCLE_BLUE = 'M550 867.514C534.501 868.488 519.766 870.286 505 875.541C469.347 888.23 439.421 918.328 426.865 954C408.119 1007.26 424.256 1069.09 469 1104.33C482.676 1115.1 498.336 1122.67 515 1127.42C526.208 1130.62 539.286 1133.39 551 1132.79C566.549 1131.99 582.216 1130.18 597 1124.91C634.193 1111.64 664.088 1081.3 676.921 1044C701.537 972.458 660.554 892.044 587 872.151C575.332 868.995 562.112 866.753 550 867.514z'
const CIRCLE_RED = 'M888 806.424C874.146 808.243 860.605 808.987 847 812.745C807.403 823.683 772.136 846.843 746.449 879C696.319 941.756 691.509 1032.32 732.453 1101C746.888 1125.21 767.156 1144.95 790 1161.14C807.288 1173.4 827.505 1182.25 848 1187.52C871.621 1193.6 896.772 1195.61 921 1192.71C985.806 1184.96 1043.28 1145.69 1072.63 1087C1086.24 1059.78 1092.36 1029.24 1092.95 999C1094.66 909.885 1028.11 831.287 943 811.116C925.814 807.043 905.637 804.109 888 806.424z'
const CIRCLE_GOLD = 'M1337 765.424C1326.4 766.816 1315.59 766.589 1305 768.464C1258.34 776.727 1213.65 799.533 1180.09 833.089C1094.74 918.434 1088.56 1061.16 1167.3 1153C1184.67 1173.26 1205.8 1190.86 1229 1204.13C1276.53 1231.3 1331.3 1239.33 1385 1231.71C1498.78 1215.58 1585.95 1106.97 1580.96 993C1579.86 967.793 1575.57 942.824 1567.06 919C1540.83 845.593 1475.84 788.508 1400 771.349C1386.35 768.262 1372.91 766.863 1359 765.911C1351.61 765.404 1344.43 764.449 1337 765.424z'
const PUPIL_RED = 'M893 882.468C872.858 886.274 861.092 911.38 855.721 929C842.071 973.774 841.054 1024.09 855.026 1069C861.785 1090.73 877.124 1123.21 905 1117.62C923.902 1113.83 934.238 1091.06 940.388 1075C957.644 1029.93 955.062 976.708 942.512 931C936.62 909.542 919.672 877.427 893 882.468z'
const PUPIL_GOLD = 'M1341 882.468C1321.25 886.195 1311.21 908.298 1304.6 925C1295.63 947.685 1293 972.817 1293 997C1293 1021.49 1295.22 1045.46 1302.44 1069C1308.93 1090.2 1324.86 1123.06 1352 1117.62C1371.22 1113.77 1381.44 1091.32 1387.8 1075C1395.69 1054.73 1398.1 1032.51 1399.04 1011C1400.21 984.174 1397.69 957.935 1390.14 932C1384 910.904 1367.95 877.383 1341 882.468z'

// Centro aproximado de cada pupila no espaço do path original, usado como
// ponto de ancoragem para o piscar (scaleY) e o seguir-o-rato (translate).
const PUPIL_RED_CENTER = { x: 898.3, y: 994.4 }
const PUPIL_GOLD_CENTER = { x: 1346, y: 996.4 }

export default function ShowoMascot({ size = 96, className, style, animated = true, colored = true, loading = false }) {
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
        // Raio de movimento da pupila dentro do círculo: o círculo tem
        // ~197 unidades de raio e a pupila ~58x123, sobra mais espaço na
        // horizontal do que na vertical antes de a pupila sair do círculo.
        const maxOffsetX = 70
        const maxOffsetY = 34
        const scale = Math.min(1, dist / 220)
        setLook({ x: (dx / dist) * maxOffsetX * scale, y: (dy / dist) * maxOffsetY * scale })
      })
    }
    window.addEventListener('mousemove', onMove)
    return () => { window.removeEventListener('mousemove', onMove); if (raf) cancelAnimationFrame(raf) }
  }, [animated])

  // Durante o loading os círculos pulsam sozinhos, por isso o olhar/piscar
  // param (não faz sentido a pupila seguir o rato ao mesmo tempo que o
  // círculo está a crescer e encolher).
  const effectiveLook = loading ? { x: 0, y: 0 } : look
  const scaleY = !loading && blink ? 0.12 : 1

  function pupilTransform(center) {
    return `translate(${center.x + effectiveLook.x} ${center.y + effectiveLook.y}) scale(1 ${scaleY}) translate(${-center.x} ${-center.y})`
  }

  const blue = colored ? BLUE : 'var(--color-text-secondary)'
  const red = colored ? RED : 'var(--color-text-secondary)'
  const gold = colored ? GOLD : 'var(--color-text-secondary)'

  const pupilStyle = { transition: 'transform 0.16s cubic-bezier(0.22,1,0.36,1)' }

  function circleStyle(delay) {
    if (!loading) return undefined
    return {
      transformBox: 'fill-box',
      transformOrigin: 'center',
      animation: 'showoMascotPulse 1.05s ease-in-out infinite',
      animationDelay: `${delay}s`,
    }
  }

  return (
    <svg
      ref={rootRef}
      className={className}
      style={style}
      width={size}
      height={size * (519.881 / 1222.831)}
      viewBox="378.119 734.449 1222.831 519.881"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {loading && (
        <style>{`@keyframes showoMascotPulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.22); } }`}</style>
      )}
      <path d={CIRCLE_BLUE} fill={blue} style={circleStyle(0)} />
      <path d={CIRCLE_RED} fill={red} style={circleStyle(0.15)} />
      <path d={CIRCLE_GOLD} fill={gold} style={circleStyle(0.3)} />

      <path d={PUPIL_RED} fill="#000000" transform={pupilTransform(PUPIL_RED_CENTER)} style={pupilStyle} />
      <path d={PUPIL_GOLD} fill="#000000" transform={pupilTransform(PUPIL_GOLD_CENTER)} style={pupilStyle} />
    </svg>
  )
}
