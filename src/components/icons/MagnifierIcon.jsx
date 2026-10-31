import { forwardRef } from 'react'

/* Lupa desenhada à mão. A do Solar Icons (bold ou outline) não lia como
   uma lupa a bem dizer, o Gustavo achou. Anel grosso (um único path, dois
   círculos com fill-rule evenodd a abrir o buraco do meio) + cabo reto
   grosso com ponta arredondada a sair do canto inferior direito do anel,
   só currentColor. Mesma API (prop size + passthrough) dos outros ícones
   do pack e dos feitos à mão (PlusIcon), para não obrigar a mexer em
   nenhum sítio que já usa <Search />. */
export const MagnifierIcon = forwardRef(({ size = 24, style, ...props }, ref) => {
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
        fillRule="evenodd"
        clipRule="evenodd"
        d="M17.4 10A7.4 7.4 0 1 0 2.6 10A7.4 7.4 0 1 0 17.4 10ZM14.6 10A4.6 4.6 0 1 0 5.4 10A4.6 4.6 0 1 0 14.6 10Z"
        fill="currentColor"
      />
      <line x1="15.2" y1="15.2" x2="20.9" y2="20.9" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" />
    </svg>
  )
})
MagnifierIcon.displayName = 'MagnifierIcon'
