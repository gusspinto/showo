import { useLayoutEffect, useRef, useState } from 'react'
import './SegmentedTabs.css'

/* Controlo de segmento com pill deslizante — o único widget da app para
   "trocar de secção dentro do ecrã atual". Usado no Explorar (Projetos /
   Pessoas), na dashboard do professor (Progresso / A rever), na página do
   projeto (Projeto / Melhorar / Partilha e o painel de workspace) e no
   editor de projeto (Tipo / Redes / Imagem / Base de dados / Avançado) —
   antes cada um tinha a sua própria versão deste mesmo controlo.

   A pill mede a posição real do botão ativo (via ref), em vez de assumir
   colunas iguais — é o que permite ao mesmo componente servir tabs de
   largura fixa (Explorar) e tabs de conteúdo variável com badges
   (EditProject), sem cada sítio ter de calcular a matemática do slide à
   mão outra vez. */
export default function SegmentedTabs({ value, onChange, options, className = '', size = 'md' }) {
  const wrapRef = useRef(null)
  const btnRefs = useRef({})
  const [pillRect, setPillRect] = useState(null)

  const activeIdx = Math.max(0, options.findIndex(o => o.id === value))
  const activeOpt = options[activeIdx] || {}

  useLayoutEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return
    function measure() {
      const btn = btnRefs.current[value]
      if (!wrap || !btn) return
      const wrapBox = wrap.getBoundingClientRect()
      const btnBox = btn.getBoundingClientRect()
      setPillRect({ left: btnBox.left - wrapBox.left, width: btnBox.width })
    }
    measure()
    // Um listener só de "resize" da window não apanha o painel a mudar de
    // tamanho por si (abrir/fechar, sidebar a recolher, animação de
    // entrada a assentar) — nesses casos a pill ficava presa numa medição
    // antiga, larga demais, tapando os botões todos com a cor ativa.
    // ResizeObserver reage a qualquer mudança de tamanho do próprio
    // elemento, seja qual for a causa.
    const ro = new ResizeObserver(measure)
    ro.observe(wrap)
    return () => ro.disconnect()
  }, [value, options.length, size])

  return (
    <div ref={wrapRef} className={`seg-wrap seg-wrap--${size}${className ? ` ${className}` : ''}`} role="tablist">
      {pillRect && (
        <div
          className="seg-pill"
          style={{
            left: pillRect.left, width: pillRect.width,
            background: activeOpt.pillColor || undefined,
          }}
        />
      )}
      {options.map(o => (
        <button
          key={o.id}
          ref={el => { btnRefs.current[o.id] = el }}
          type="button"
          role="tab"
          aria-selected={o.id === value}
          data-tour={o.dataTour || undefined}
          onClick={() => onChange(o.id)}
          className={`seg-btn${o.id === value ? ' active' : ''}${o.className ? ` ${o.className}` : ''}`}
          style={o.id === value && o.activeColor ? { color: o.activeColor } : undefined}
        >
          {o.icon && <span className="seg-icon">{o.icon}</span>}
          <span className="seg-label">{o.label}</span>
          {o.badge}
        </button>
      ))}
    </div>
  )
}
