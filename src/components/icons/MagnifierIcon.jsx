import { forwardRef } from 'react'

/* Lupa desenhada à mão. A do Solar Icons (bold ou outline) não lia como
   uma lupa a bem dizer, o Gustavo achou. Anel grosso (um único path, dois
   círculos com fill-rule evenodd a abrir o buraco do meio) + cabo reto com
   ponta arredondada a sair do canto inferior direito do anel, só
   currentColor. A espessura do anel (2.4) e do cabo (2.4) é igual de
   propósito, para os dois lerem como o mesmo traço, à imagem dos ícones
   feitos à mão do resto da app (PlusIcon).

   Terceira passagem (pedido do Gustavo): lente um pouco maior (r 8.4→8.8)
   e um traço curto dentro do vidro, a simular o reflexo de uma lente de
   verdade, mais fino e mais curto do que o anel/cabo para não competir
   com eles, outro detalhe que a versão da biblioteca não tinha.

   Mesma API (prop size + passthrough), para não obrigar a mexer em nenhum
   sítio que já usa <Search />. */
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
        d="M18.8 10A8.8 8.8 0 1 0 1.2 10A8.8 8.8 0 1 0 18.8 10ZM16.4 10A6.4 6.4 0 1 0 3.6 10A6.4 6.4 0 1 0 16.4 10Z"
        fill="currentColor"
      />
      <path d="M7.1 5.9Q5.6 6.9 5.6 8.6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <line x1="16.3" y1="16.3" x2="22.3" y2="22.3" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  )
})
MagnifierIcon.displayName = 'MagnifierIcon'
