import { forwardRef } from 'react'

/* Folha desenhada à mão, canto dobrado — a mesma ideia de "ficheiro/página
   por preencher", não um ícone de biblioteca genérico, à imagem dos outros
   ícones feitos à mão da app (MagnifierIcon, PlusIcon). Duas linhas curtas
   dentro sugerem conteúdo sem desenhar texto a sério, mantêm a forma
   reconhecível como página mesmo em tamanhos pequenos. Só currentColor,
   para herdar a cor do badge que o envolve (dark/light tratam-se sozinhos). */
export const FileIcon = forwardRef(({ size = 24, style, ...props }, ref) => {
  const px = typeof size === 'number' ? `${size}px` : size
  return (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      width={px}
      height={px}
      style={style}
      {...props}
    >
      <path
        d="M6.5 3.5h7l4 4v12.2a.8.8 0 0 1-.8.8H6.5a.8.8 0 0 1-.8-.8V4.3a.8.8 0 0 1 .8-.8Z"
        stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"
      />
      <path d="M13.5 3.5v3.3a.7.7 0 0 0 .7.7h3.3" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <line x1="8.6" y1="13.4" x2="15.4" y2="13.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.6" />
      <line x1="8.6" y1="16.4" x2="13" y2="16.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.6" />
    </svg>
  )
})
FileIcon.displayName = 'FileIcon'
