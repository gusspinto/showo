/* Personalização do perfil-portefólio. Guardado em profiles.profile_appearance
   (jsonb). Tudo opcional — {} = aspeto padrão do Showo.

   Shape:
     {
       accent:     '#2563eb',                     // cor de destaque
       font:       'moderno'|'editorial'|'geometrico'|'neutro',
       background: 'default'|'papel'|'quente'|'frio'|'escuro',
       cards:      'suave'|'plano'|'moldura',
       bannerUrl:  'https://…'                     // imagem de topo (bucket profile-banners)
     }
*/

export const ACCENT_SWATCHES = [
  '#2563eb', '#4f46e5', '#7c3aed', '#db2777',
  '#e11d48', '#ea580c', '#ca8a04', '#16a34a',
  '#0d9488', '#0f172a',
]

// Stacks a partir das fontes já carregadas no index.html.
export const FONTS = {
  moderno:    { label: 'Moderno',    heading: "'Montserrat', 'Inter', system-ui, sans-serif", body: "'Inter', system-ui, sans-serif" },
  editorial:  { label: 'Editorial',  heading: "'Playfair Display', Georgia, serif",            body: "'Inter', system-ui, sans-serif" },
  geometrico: { label: 'Geométrico', heading: "'Space Grotesk', 'Syne', system-ui, sans-serif", body: "'Space Grotesk', system-ui, sans-serif" },
  neutro:     { label: 'Neutro',     heading: "system-ui, -apple-system, 'Segoe UI', sans-serif", body: "system-ui, -apple-system, 'Segoe UI', sans-serif" },
}

// Cada fundo redefine os tokens globais dentro de .up-root — os filhos que
// usam var(--color-*) apanham a mudança sozinhos.
export const BACKGROUNDS = {
  default: { label: 'Padrão' },
  papel:   { label: 'Papel',  tokens: { '--color-bg': '#f6f3ec', '--color-surface': '#fffdf7', '--color-bg-alt': '#efeadd', '--color-border': '#e3dccb' } },
  quente:  { label: 'Quente', tokens: { '--color-bg': '#faf4f1', '--color-surface': '#fffefc', '--color-bg-alt': '#f3e8e2', '--color-border': '#ecdcd3' } },
  frio:    { label: 'Frio',   tokens: { '--color-bg': '#f1f5f9', '--color-surface': '#ffffff', '--color-bg-alt': '#e6edf4', '--color-border': '#dbe4ec' } },
  escuro:  { label: 'Escuro', tokens: {
    '--color-bg': '#0f1115', '--color-surface': '#171a21', '--color-bg-alt': '#1e222b',
    '--color-border': '#2a2f3a', '--color-border-hover': '#3a4150',
    '--color-text': '#e9eaee', '--color-text-secondary': '#a2a7b2', '--color-text-tertiary': '#7c828f',
    '--color-surface-hover': '#1e222b',
  } },
}

export const CARD_STYLES = {
  suave:   { label: 'Suave' },
  plano:   { label: 'Plano' },
  moldura: { label: 'Moldura' },
}

const FALLBACK_ACCENT = '#2563eb'

/* Converte o objeto guardado num style inline para pôr no wrapper .up-root. */
export function appearanceVars(a = {}) {
  const vars = {}
  const bg = BACKGROUNDS[a.background]
  if (bg?.tokens) Object.assign(vars, bg.tokens)

  const font = FONTS[a.font]
  if (font) {
    vars['--font-heading'] = font.heading
    vars['--font-body'] = font.body
    vars.fontFamily = font.body
  }

  vars['--up-accent'] = a.accent || FALLBACK_ACCENT
  return vars
}

export function appearanceClass(a = {}) {
  return `up-cards-${CARD_STYLES[a.cards] ? a.cards : 'suave'}`
}

export const DEFAULT_APPEARANCE = { accent: FALLBACK_ACCENT, font: 'moderno', background: 'default', cards: 'suave', bannerUrl: null }
