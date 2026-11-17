/* "Marca" do perfil-portefólio — guardada em profiles.profile_appearance
   (jsonb). Deliberadamente pequena: uma cor de destaque e uma tipografia,
   escolhidas uma vez. NÃO é um editor de tema por-superfície (fundo, dark
   mode, estilo de card foram retirados de propósito — fragmentavam a
   identidade entre perfil e páginas de projeto).

   Shape:
     {
       accent:    '#2563eb',
       font:      'moderno'|'editorial'|'geometrico'|'neutro',
       bannerUrl: 'https://…'   // imagem de topo (bucket profile-banners)
     }
*/

export const ACCENT_SWATCHES = [
  '#2563eb', '#4f46e5', '#7c3aed', '#db2777',
  '#e11d48', '#ea580c', '#ca8a04', '#16a34a',
  '#0d9488', '#0f172a',
]

// Stacks a partir das fontes já carregadas no index.html.
export const FONTS = {
  moderno:    { label: 'Moderno',    heading: "'Montserrat', 'Inter', system-ui, sans-serif",     body: "'Inter', system-ui, sans-serif" },
  editorial:  { label: 'Editorial',  heading: "'Playfair Display', Georgia, serif",                body: "'Inter', system-ui, sans-serif" },
  geometrico: { label: 'Geométrico', heading: "'Space Grotesk', 'Syne', system-ui, sans-serif",   body: "'Space Grotesk', system-ui, sans-serif" },
  neutro:     { label: 'Neutro',     heading: "system-ui, -apple-system, 'Segoe UI', sans-serif",  body: "system-ui, -apple-system, 'Segoe UI', sans-serif" },
}

// Só usado como ponto de partida da roda de cor personalizada, nunca como
// cor por omissão de um perfil (ver appearanceVars): sem cor escolhida, o
// perfil fica neutro, sem atmosfera nenhuma, para a cor continuar a ser um
// sinal de "isto foi personalizado", não o estado em que todos nascem.
export const DEFAULT_ACCENT = '#2563eb'

/* style inline para o wrapper .up-root, só accent e tipografia. Sem
   --up-accent quando não há cor escolhida (ver UserProfile.css: os
   fallbacks de wash/sombra resolvem para "sem tinta nenhuma" nesse caso). */
export function appearanceVars(a = {}) {
  const vars = {}
  if (a.accent) vars['--up-accent'] = a.accent
  const font = FONTS[a.font]
  if (font) {
    vars['--up-font-heading'] = font.heading
    vars['--up-font-body'] = font.body
  }
  return vars
}
