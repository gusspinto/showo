import { forwardRef } from 'react'

/* Marca Showo monocromática — dois quadrados arredondados sobrepostos (um
   vazado, um cheio), tudo em currentColor para poder ser tingida. O
   logo-mark.png é a cores e não se consegue re-colorir; esta versão serve
   sítios onde a marca aparece numa única cor (ex: o badge de plano). */
export const ShowoMark = forwardRef(({ size = 14, style, ...props }, ref) => {
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
      {/* dois quadrados sólidos sobrepostos — a marca Showo. O de trás fica
          a meia opacidade para se ver a sobreposição mesmo a 13px. */}
      <rect x="8" y="2.5" width="13.5" height="13.5" rx="3.4" fill="currentColor" opacity="0.45" />
      <rect x="2.5" y="8" width="13.5" height="13.5" rx="3.4" fill="currentColor" />
    </svg>
  )
})
ShowoMark.displayName = 'ShowoMark'
