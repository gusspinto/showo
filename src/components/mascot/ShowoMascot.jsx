import { useEffect, useRef, useState } from 'react'

/* Mascote do Showo, traço exato desenhado pelo Gustavo (Canva, vetorizado
   com autotracer.org). Os paths abaixo são os pontos originais do ficheiro
   exportado, apenas recortados à área da mascote, sem redesenho à mão:
   sobrancelhas, olho esquerdo (anel azul), olho direito (anel vermelho),
   ponte azul a ligar os dois, "nariz"/boca em `>` dourado.

   O interior dos olhos e a cor das sobrancelhas/pupilas usam os tokens de
   tema da app (--color-surface / --color-text) em vez da cor fixa do papel
   original (bege-acastanhado), para a mascote se misturar com o fundo da
   app tanto em modo claro como escuro.

   Pupilas isoladas em <g> próprio para animar (piscar + seguir o rato) sem
   alterar a forma do traço original. */

const BLUE = '#1b77f6'
const RED = '#d34040'
const GOLD = '#f6a900'

const EYEBROW_LEFT = 'M403 585L403 639C403 644.056 401.048 654.33 404.603 658.363C406.648 660.682 410.286 661.909 413 663.244C420.689 667.025 428.767 670.072 437 672.421C469.788 681.778 502.63 681.011 536 675.414C610.095 662.984 681.477 626.848 758 632.089C771.948 633.045 786.753 635.553 800 640.079C810.221 643.57 819.831 648.537 830 652L830 598C830 592.944 831.952 582.67 828.397 578.637C826.345 576.31 822.713 575.106 820 573.753C812.607 570.066 804.947 566.857 797 564.579C764.822 555.355 732.835 555.713 700 560.573C627.054 571.369 556.929 608.242 482 604.961C465.306 604.23 447.949 601.366 432 596.254C422.14 593.093 412.89 587.848 403 585z'
const EYEBROW_RIGHT = 'M1138 585L1138 639C1138 644.056 1136.05 654.329 1139.6 658.363C1141.65 660.69 1145.29 661.894 1148 663.247C1155.09 666.785 1162.38 669.673 1170 671.859C1199.82 680.41 1230.38 681.943 1261 676.92C1298 670.851 1333.9 660.611 1370 650.576C1399.85 642.275 1430.86 633.403 1462 632.039C1482.92 631.123 1504.7 631.848 1525 637.425C1532.44 639.469 1539.84 641.714 1547 644.604C1552.59 646.861 1558.04 649.941 1564 651L1564 599C1564 593.796 1566.04 583.038 1562.97 578.637C1561.28 576.209 1557.55 575.024 1555 573.753C1548.27 570.392 1541.23 567.272 1534 565.144C1505.12 556.649 1474.84 554.712 1445 558.87C1368.75 569.494 1295.94 606.895 1218 604.985C1200.35 604.553 1181.76 601.228 1165 595.645C1155.85 592.598 1147.2 587.651 1138 585z'
const RING_RED = 'M1149 1072L1149 706L1553 706L1553 1007L1553 1082C1553 1088.33 1553.04 1094.67 1553 1101C1552.98 1103.42 1553.27 1106.53 1551.4 1108.4C1549.53 1110.27 1546.42 1109.98 1544 1110L1529 1110L1467 1110L1217 1110C1217.24 1115.58 1220.15 1124.54 1216.97 1129.62C1215.29 1132.31 1211.65 1133.77 1209 1135.28C1203.95 1138.16 1198.99 1141.21 1194 1144.2C1174.08 1156.13 1153.92 1167.66 1134 1179.6C1126.96 1183.82 1115.35 1187.88 1111 1195C1130.65 1197.49 1150.19 1197 1170 1197L1249 1197L1495 1197L1550 1197C1579.8 1197 1609.27 1196.29 1628.1 1169C1640.86 1150.5 1640 1130.44 1640 1109L1640 1034L1640 792L1640 715C1640 702.104 1641.78 687.709 1639.54 675C1635.29 650.959 1618.64 629.776 1595 622.216C1584.98 619.012 1575.39 619 1565 619L1565 652C1555.45 649.248 1546.59 643.997 1537 641.026C1516.9 634.796 1495.05 631.499 1474 632.015C1392.93 634.001 1318.6 674.39 1238 679.911C1211.99 681.692 1185.27 678.5 1161 668.8C1154.58 666.236 1141.73 663.055 1138.03 656.787C1136.14 653.588 1137 648.562 1137 645L1137 619C1126.92 619 1117.77 619.105 1108 621.91C1101.9 623.66 1096.24 626.542 1091 630.093C1054.92 654.525 1062 698.222 1062 736L1062 774C1062 778.356 1060.59 785.793 1063.03 789.61C1066.29 794.717 1076.85 797.715 1082 800.8C1095.74 809.026 1109.25 818.151 1121 829.089C1124.39 832.242 1127.58 835.588 1130.99 838.714C1132.5 840.098 1134.94 841.727 1134.94 844.039C1134.94 846.426 1132.5 848.447 1130.99 849.996C1126.87 854.225 1122.2 857.855 1118 862.004C1105.6 874.252 1092.6 885.913 1080 897.961C1074.64 903.088 1067.62 907.643 1063.6 914C1059.4 920.665 1062 934.319 1062 942L1062 1012L1062 1033C1062.01 1035.56 1061.52 1038.99 1063.6 1040.91C1065.69 1042.83 1069.4 1043.6 1072 1044.58C1078.3 1046.93 1084.65 1049.14 1091 1051.34C1110.28 1058.04 1129.3 1066.62 1149 1072z'
const RING_RED_ACCENT = 'M1062 1094C1062 1117.1 1060.08 1139.26 1069 1161C1076.12 1158.94 1082.55 1154.46 1089 1150.86C1099.63 1144.93 1110.3 1139.05 1121 1133.23C1127.43 1129.74 1137.95 1126.21 1142 1120C1114.94 1113.74 1088.42 1102.6 1062 1094z'
const RING_BLUE = 'M938 887C948.494 885.45 958.201 880.833 969 880.089C1003.09 877.742 1035.33 893.33 1059 917C1067.47 911.04 1074.45 903.124 1082 896.089C1100.19 879.146 1117.73 860.69 1137 845C1125.04 828.022 1104.6 814.219 1087 803.601C1033.89 771.563 966.925 758.838 907 778C903.254 764.995 893.755 753.126 886.333 742C861.545 704.839 826.088 674.484 787 653.231C775.74 647.108 764.082 641.623 752 637.308C747.056 635.542 742.322 633.299 737 633.04C713.856 631.913 690.406 636.805 668 642.116C633.423 650.31 599.504 661.111 565 669.626C545.546 674.427 525.07 679.082 505 679.961C497.029 680.31 488.979 680 481 680C476.459 680 472.034 679.57 468 682.018C462.739 685.211 458.526 689.743 454 693.83C442.337 704.365 431.822 715.722 422 728C372.716 789.607 353.853 867.396 362.166 945C365.202 973.343 373.58 1001.05 385.139 1027C399.296 1058.79 419.417 1088.34 444.039 1112.96C537.734 1206.66 689.614 1223.69 802 1153.94C865.527 1114.51 912.821 1049.87 930.116 977C937.203 947.136 938 917.516 938 887z'
const INTERIOR_LEFT = 'M628 707.428C594.912 712.166 563.788 721.912 536 740.975C513.373 756.498 494.341 776.026 479.344 799C419.222 891.102 448.641 1020.98 542 1078.93C583.076 1104.43 632.389 1113.59 680 1106.73C708.463 1102.63 737.395 1092.24 761 1075.58C774.712 1065.9 787.539 1055.5 798.83 1043C836.082 1001.76 853.709 946.161 849.911 891C842.974 790.267 753.749 707 653 707C644.779 707 636.15 706.261 628 707.428z'
const INTERIOR_RIGHT = 'M1150 707L1150 957L1150 1034L1150 1058C1150 1061.72 1149.3 1066.28 1150.32 1069.89C1151.86 1075.38 1163.22 1077.37 1168 1079C1179.04 1082.76 1190.09 1086.68 1201 1090.81C1205.11 1092.36 1211.32 1093.35 1214.41 1096.65C1217.27 1099.69 1216.97 1105.13 1217 1109L1552 1109L1552 707L1150 707z'
const PUPIL_LEFT = 'M714 833.439C699.628 834.975 686.636 838.363 675 847.518C668.22 852.852 662.527 859.541 658.231 867C643.18 893.133 647.938 929.02 670.039 949.829C684.458 963.405 704.38 969.729 724 967.83C733.609 966.9 742.603 963.836 751 959.138C757.555 955.471 763.203 950.645 768.127 944.985C799.035 909.461 783.029 852.365 739 836.865C731.484 834.219 721.958 832.589 714 833.439z'
const PUPIL_RIGHT = 'M1416 833.439C1401.63 834.975 1388.64 838.363 1377 847.518C1370.22 852.852 1364.53 859.541 1360.23 867C1345.16 893.16 1349.91 928.991 1372.04 949.829C1386.46 963.405 1406.38 969.729 1426 967.83C1435.61 966.9 1444.6 963.836 1453 959.138C1459.56 955.471 1465.2 950.645 1470.13 944.985C1501.04 909.461 1485.03 852.365 1441 836.865C1433.48 834.219 1423.96 832.589 1416 833.439z'
const CHEVRON = 'M971 1008C971.275 1021.35 973.377 1034.67 973.961 1048C974.175 1052.9 972.786 1060.3 975.988 1064.49C978.39 1067.63 984.432 1068.48 988 1069.67L1019 1080C1046.94 1089.31 1074.9 1098.54 1103 1107.35C1115.82 1111.36 1128.66 1118.03 1142 1120C1133.14 1128.98 1117.98 1134.22 1107 1140.42C1080.47 1155.41 1053.71 1170.03 1027 1184.69L998 1200.69C994.385 1202.68 988.286 1204.75 986.032 1208.39C983.85 1211.91 985.95 1218.98 986.004 1223C986.193 1237.01 988.884 1251 989 1265C998.096 1261.08 1006.51 1255.27 1015 1250.2C1028.62 1242.07 1042.32 1234.05 1056 1226.01C1095.34 1202.9 1134.87 1180.07 1174 1156.6L1205 1138.2C1208.65 1136.02 1215.53 1133.7 1217.4 1129.62C1219.72 1124.55 1217.14 1113.48 1216.42 1108C1216.01 1104.81 1216.82 1100.33 1215.4 1097.42C1213.29 1093.12 1203.2 1091.43 1199 1090C1183.57 1084.73 1168.39 1078.74 1153 1073.34C1092.22 1052.04 1032.24 1027.93 971 1008z'

// Centro aproximado de cada pupila no espaço do path original, usado como
// ponto de ancoragem para o piscar (scaleY) e o seguir-o-rato (translate).
const PUPIL_LEFT_CENTER = { x: 713.7, y: 897.9 }
const PUPIL_RIGHT_CENTER = { x: 1415.7, y: 897.9 }

export default function ShowoMascot({ size = 96, className, style, animated = true, colored = true }) {
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
        const maxOffset = 14 // unidades do viewBox original (escala ~1100), raio pequeno
        const scale = Math.min(1, dist / 220)
        setLook({ x: (dx / dist) * maxOffset * scale, y: (dy / dist) * maxOffset * scale })
      })
    }
    window.addEventListener('mousemove', onMove)
    return () => { window.removeEventListener('mousemove', onMove); if (raf) cancelAnimationFrame(raf) }
  }, [animated])

  const scaleY = blink ? 0.12 : 1

  function pupilTransform(center) {
    return `translate(${center.x + look.x} ${center.y + look.y}) scale(1 ${scaleY}) translate(${-center.x} ${-center.y})`
  }

  // Cinza neutro quando não está colorido (ex: item da sidebar fora da página
  // do Coach), cores da marca quando colored=true (dentro do Coach, ou ativo).
  const ringBlue = colored ? BLUE : 'var(--color-text-secondary)'
  const ringRed = colored ? RED : 'var(--color-text-secondary)'
  const gold = colored ? GOLD : 'var(--color-text-secondary)'

  return (
    <svg
      ref={rootRef}
      className={className}
      style={style}
      width={size}
      height={size * (730.704 / 1309.557)}
      viewBox="343.853 544.296 1309.557 730.704"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Anéis dos olhos */}
      <path d={RING_BLUE} fill={ringBlue} />
      <path d={RING_RED} fill={ringRed} />
      <path d={RING_RED_ACCENT} fill={ringRed} />

      {/* Interior dos olhos: cor de superfície do tema, por cima dos anéis para abrir o buraco */}
      <path d={INTERIOR_LEFT} fill="var(--color-surface)" />
      <path d={INTERIOR_RIGHT} fill="var(--color-surface)" />

      {/* Sobrancelhas */}
      <path d={EYEBROW_LEFT} fill="var(--color-text)" />
      <path d={EYEBROW_RIGHT} fill="var(--color-text)" />

      {/* Nariz / boca em ">" */}
      <path d={CHEVRON} fill={gold} />

      {/* Pupilas, animadas */}
      <path d={PUPIL_LEFT} fill="var(--color-text)" transform={pupilTransform(PUPIL_LEFT_CENTER)} />
      <path d={PUPIL_RIGHT} fill="var(--color-text)" transform={pupilTransform(PUPIL_RIGHT_CENTER)} />
    </svg>
  )
}
