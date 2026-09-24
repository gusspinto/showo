/* Pequenas conversões de cor para o seletor personalizado — hex <-> HSV.
   Sem dependências, só o suficiente para desenhar o quadrado de
   saturação/brilho e a barra de matiz. */

export function hexToRgb(hex) {
  const m = hex.replace('#', '').match(/^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i)
  if (!m) return { r: 0, g: 0, b: 0 }
  return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) }
}

export function rgbToHex(r, g, b) {
  const c = n => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')
  return `#${c(r)}${c(g)}${c(b)}`
}

export function rgbToHsv(r, g, b) {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const d = max - min
  let h = 0
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h *= 60
    if (h < 0) h += 360
  }
  const s = max === 0 ? 0 : d / max
  const v = max
  return { h, s: s * 100, v: v * 100 }
}

export function hsvToRgb(h, s, v) {
  s /= 100; v /= 100
  const c = v * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = v - c
  let r = 0, g = 0, b = 0
  if (h < 60) { r = c; g = x; b = 0 }
  else if (h < 120) { r = x; g = c; b = 0 }
  else if (h < 180) { r = 0; g = c; b = x }
  else if (h < 240) { r = 0; g = x; b = c }
  else if (h < 300) { r = x; g = 0; b = c }
  else { r = c; g = 0; b = x }
  return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 }
}

export function hexToHsv(hex) {
  const { r, g, b } = hexToRgb(hex)
  return rgbToHsv(r, g, b)
}

export function hsvToHex(h, s, v) {
  const { r, g, b } = hsvToRgb(h, s, v)
  return rgbToHex(r, g, b)
}

export function isValidHex(v) {
  return /^#?[0-9a-f]{6}$/i.test(v)
}

/* Luminância percebida — decide se o texto por cima de um fundo escolhido
   pela pessoa tem de ser escuro ou claro. O 0.6 é o ponto onde os amarelos
   e os beges deixam de aguentar texto branco. */
export function isLightHex(hex) {
  const { r, g, b } = hexToRgb(hex)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6
}

/* Uma cor só não faz um hero: as paletas escolhidas à mão são sempre um par
   com profundidade. Isto reconstrói esse par a partir de um hex qualquer —
   uma âncora mais escura e um segundo tom com a matiz rodada, que é o que dá
   o degradê em vez de um bloco de cor chapado. */
export function accentGradientFromHex(hex) {
  const { h, s, v } = hexToHsv(hex)
  const clamp = n => Math.max(0, Math.min(100, n))
  return {
    c1: hsvToHex(h, clamp(s * 1.05), clamp(v * 0.55)),
    c2: hsvToHex((h + 24) % 360, clamp(s * 0.92), clamp(v * 0.8)),
  }
}

// Contraste WCAG entre duas cores — usado para saber se um texto fica
// legível sobre um fundo, não só se o fundo é "claro" (isLightHex acima é
// mais grosseiro, pensado só para escolher branco/preto).
function relativeLuminance(hex) {
  const { r, g, b } = hexToRgb(hex)
  const chan = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 }
  return 0.2126 * chan(r) + 0.7152 * chan(g) + 0.0722 * chan(b)
}

export function contrastRatio(hexA, hexB) {
  const lA = relativeLuminance(hexA)
  const lB = relativeLuminance(hexB)
  const [light, dark] = lA > lB ? [lA, lB] : [lB, lA]
  return (light + 0.05) / (dark + 0.05)
}

// As paletas de destaque escolhem tons escuros de propósito (para as legendas
// e o brilho por trás do hero) e o seletor de cor livre não impede escolhas
// escuras — nenhum dos dois casos verificava se sobrava contraste quando essa
// mesma cor era reaproveitada como cor do texto do título. Em vez de mudar as
// paletas ou bloquear o seletor, clareia só a cor final usada no título,
// mantendo a mesma matiz, até ter contraste suficiente contra o fundo.
export function ensureReadable(hex, bgHex, minRatio = 4.5) {
  if (!isValidHex(hex) || !isValidHex(bgHex)) return hex
  if (contrastRatio(hex, bgHex) >= minRatio) return hex
  const { h, s } = hexToHsv(hex)
  for (let v = 10; v <= 100; v += 5) {
    const candidate = hsvToHex(h, s, v)
    if (contrastRatio(candidate, bgHex) >= minRatio) return candidate
  }
  return hsvToHex(h, s, 100)
}
