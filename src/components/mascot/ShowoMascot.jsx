import { useEffect, useRef, useState } from 'react'

/* Mascote do Showo, traço exato desenhado pelo Gustavo (Canva, vetorizado
   com autotracer.org). Os paths abaixo são os pontos originais do ficheiro
   exportado, apenas recortados à área da mascote, sem redesenho à mão: 3
   formas em sequência a seguir a ordem das cores da marca (azul, vermelho,
   dourado), vermelho e dourado com pupila preta, azul sem olho (virou mão,
   ver prop `waving` abaixo).

   A sombra suave sob as pupilas do ficheiro original foi deixada de fora,
   não existe sombra em mais nenhum sítio da app (visual plano), por
   consistência.

   Prop `colored`: false usa cinza neutro nos 3 círculos (ex: item da
   sidebar fora da página do Coach), true usa as cores da marca.

   Prop `loading`: pulsa os 3 círculos em sequência (azul, vermelho,
   dourado), reaproveitando a ideia original do Gustavo de "3 pontos a
   carregar" como indicador de "a pensar" do Coach, em vez do indicador
   genérico de 3 bolinhas cinzentas que estava lá antes.

   Prop `waving`: o círculo azul (o único sem pupila) virou uma mão, ideia
   do Gustavo para aproveitar essa forma "parada". Roda à volta do pulso
   (o bico na base da mão, único ponto que fica fixo) num pequeno vaivém,
   3 acenos e depois pausa, antes de repetir.

   Pupilas com `style.transition` no transform para um seguimento do rato
   mais suave e natural (antes saltava de frame a frame sem suavização). */

const BLUE = '#1b77f4'
const RED = '#d34040'
const GOLD = '#f6a900'

const HAND_BLUE = 'M645 1076C641.435 1063.88 633.053 1052.23 627.258 1041C613.996 1015.3 600.179 989.861 587.247 964C573.45 936.41 557.133 909.991 534 889.171C495.046 854.112 428.676 831.554 385 872.09C377.85 878.727 371.904 886.477 367.17 895C360.745 906.567 356.772 919.008 354.424 932C348.166 966.637 353.228 1003.51 366.452 1036C374.897 1056.74 386.49 1076.14 396.742 1096C407.927 1117.67 418.601 1139.76 430.576 1161C433.334 1165.89 435.54 1171.07 438.262 1175.98C439.354 1177.95 440.573 1180.19 443.105 1180.29C448.541 1180.5 456.41 1174.61 461 1172C472.718 1165.35 484.948 1159.27 497 1153.25C525.261 1139.11 552.923 1123.75 581 1109.26C602.28 1098.27 624.323 1088.07 645 1076z'
const CIRCLE_RED = 'M883 806.424C868.821 808.287 854.861 809.899 841 813.745C819.797 819.628 799.773 830.664 782 843.428C768.608 853.046 757.263 864.365 746.753 877C683.008 953.636 691.278 1072.38 763 1140.96C807.085 1183.12 867.397 1199.56 927 1191.72C953.957 1188.17 981.595 1177.87 1004 1162.41C1018.5 1152.41 1032.1 1141.35 1043.71 1128C1078.44 1088.09 1094.53 1035.52 1090.91 983C1086.33 916.488 1043.11 855.526 984 825.969C961.085 814.512 936.4 808.66 911 806.911C901.713 806.271 892.317 805.201 883 806.424z'
const CIRCLE_GOLD = 'M1357 765.424C1339.46 767.728 1322.25 768.596 1305 773.289C1269.98 782.815 1236.96 800.817 1210 825.17C1188.11 844.944 1171.56 868.189 1157.69 894C1120.91 962.463 1125.71 1051.25 1163.87 1118C1182.62 1150.78 1210.16 1178.79 1242 1198.95C1291.05 1230.01 1349.06 1239.79 1406 1231.71C1482.13 1220.92 1548.51 1167.8 1580.88 1099C1597.96 1062.7 1604.66 1020.92 1601.91 981C1595 880.66 1518.63 793.44 1421 771.349C1406.68 768.11 1392.62 766.601 1378 765.961C1370.9 765.65 1364.15 764.486 1357 765.424z'
const PUPIL_RED = 'M883 882.518C862.552 886.886 851.01 911.891 845.589 930C832.174 974.821 831.912 1023.03 844.86 1068C851.185 1089.97 867.058 1123.22 895 1117.62C914.032 1113.81 925.002 1090.36 930.946 1074C947.29 1029.02 945.425 976.362 932.421 931C926.361 909.857 909.976 876.754 883 882.518z'
const PUPIL_GOLD = 'M1362 882.468C1342.94 886.064 1333.5 907.068 1326.72 923C1321.35 935.623 1318.68 949.484 1316.73 963C1311.68 998.063 1313.57 1033.93 1323.58 1068C1329.92 1089.59 1345.41 1122.51 1373 1117.67C1392.27 1114.29 1403.01 1091.3 1409.19 1075C1426.16 1030.19 1424.36 976.36 1411.14 931C1404.95 909.752 1388.85 877.401 1362 882.468z'

// Centro aproximado de cada pupila no espaço do path original, usado como
// ponto de ancoragem para o piscar (scaleY) e o seguir-o-rato (translate).
const PUPIL_RED_CENTER = { x: 888.4, y: 994.3 }
const PUPIL_GOLD_CENTER = { x: 1361, y: 989.3 }

// Ponto fixo (o "pulso") à volta do qual a mão roda ao acenar.
const HAND_PIVOT = { x: 450, y: 1178 }

export default function ShowoMascot({ size = 96, className, style, animated = true, colored = true, loading = false, waving = false }) {
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

  const handStyle = waving
    ? { transformOrigin: `${HAND_PIVOT.x}px ${HAND_PIVOT.y}px`, animation: 'showoMascotWave 4s ease-in-out infinite' }
    : circleStyle(0)

  return (
    <svg
      ref={rootRef}
      className={className}
      style={style}
      width={size}
      height={size * (505.304 / 1286.494)}
      viewBox="333.166 749.486 1286.494 505.304"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {loading && (
        <style>{`@keyframes showoMascotPulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.22); } }`}</style>
      )}
      {waving && (
        <style>{`@keyframes showoMascotWave {
          0% { transform: rotate(0deg); }
          5% { transform: rotate(16deg); }
          10% { transform: rotate(-10deg); }
          15% { transform: rotate(16deg); }
          20% { transform: rotate(-10deg); }
          25% { transform: rotate(16deg); }
          32%, 100% { transform: rotate(0deg); }
        }`}</style>
      )}
      <path d={HAND_BLUE} fill={blue} style={handStyle} />
      <path d={CIRCLE_RED} fill={red} style={circleStyle(0.15)} />
      <path d={CIRCLE_GOLD} fill={gold} style={circleStyle(0.3)} />

      <path d={PUPIL_RED} fill="#000000" transform={pupilTransform(PUPIL_RED_CENTER)} style={pupilStyle} />
      <path d={PUPIL_GOLD} fill="#000000" transform={pupilTransform(PUPIL_GOLD_CENTER)} style={pupilStyle} />
    </svg>
  )
}
