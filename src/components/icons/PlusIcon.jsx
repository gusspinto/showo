import { forwardRef } from 'react'

/* "+" desenhado à mão. O add-circle do Solar Icons tinha um círculo a
   mais — chocava com os badges circulares que já usamos à volta dele
   (o próprio botão de criar, por exemplo). O add simples do mesmo
   pack resolvia isso mas os traços ficavam finos demais para se
   perceber bem em botões pequenos. Duas barras grossas, currentColor,
   e a mesma API (prop size + passthrough) dos ícones do Solar, para
   não obrigar a mexer em nenhum dos sítios que já usam <Plus />. */
export const PlusIcon = forwardRef(({ size = 24, style, ...props }, ref) => {
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
      <rect x="10.2" y="3" width="3.6" height="18" rx="1.8" fill="currentColor" />
      <rect x="3" y="10.2" width="18" height="3.6" rx="1.8" fill="currentColor" />
    </svg>
  )
})
PlusIcon.displayName = 'PlusIcon'
