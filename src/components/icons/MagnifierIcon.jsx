import { forwardRef } from 'react'

/* Lupa desenhada à mão. A do Solar Icons (bold ou outline) não lia como
   uma lupa a bem dizer, o Gustavo achou. Anel grosso (um único path, dois
   círculos com fill-rule evenodd a abrir o buraco do meio) + cabo reto com
   ponta arredondada a sair do canto inferior direito do anel, só
   currentColor. Segunda passagem, lente maior e cabo mais fino do que a
   primeira versão (pedido do Gustavo): a espessura do anel (2.4) e do cabo
   (2.4) ficou igual de propósito, para os dois lerem como o mesmo traço, à
   imagem dos ícones feitos à mão do resto da app (PlusIcon). Mesma API
   (prop size + passthrough), para não obrigar a mexer em nenhum sítio que
   já usa <Search />. */
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
        d="M18.4 10A8.4 8.4 0 1 0 1.6 10A8.4 8.4 0 1 0 18.4 10ZM16 10A6 6 0 1 0 4 10A6 6 0 1 0 16 10Z"
        fill="currentColor"
      />
      <line x1="16" y1="16" x2="22" y2="22" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  )
})
MagnifierIcon.displayName = 'MagnifierIcon'
