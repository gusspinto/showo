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
    // offsetLeft/offsetWidth (relativos ao .seg-wrap, que é position:relative
    // e por isso o offsetParent do botão) — não getBoundingClientRect. O
    // rect dá a posição visível, já descontado o scroll atual; mas o "left"
    // de position:absolute é relativo à tela toda da zona com scroll, não à
    // parte visível. Num separador scrollado, isso subtraía o scroll a
    // mais: a pílula branca saía desalinhada do próprio texto do botão
    // ativo (ficava a léguas de onde devia, não só "não perfeitamente
    // centrada"). offsetLeft é sempre relativo ao conteúdo todo, nunca à
    // posição do scroll — por isso não tem este problema.
    function measure() {
      const btn = btnRefs.current[value]
      if (!btn) return
      setPillRect({ left: btn.offsetLeft, width: btn.offsetWidth })
    }
    measure()
    // Nas variantes com scroll horizontal (--compact, quando os labels não
    // cabem todos), isto contava com o browser desviar a barra sozinho ao
    // focar o botão clicado — funciona com teclado/rato no desktop, mas um
    // toque no telemóvel não dá o mesmo "scroll into view" (focus-visible
    // só por teclado em muitos browsers móveis). O separador ativo podia
    // ficar escolhido mas fora da vista, a meio ou cortado na borda.
    // scrollIntoView explícito funciona nos dois casos.
    const btn = btnRefs.current[value]
    if (btn) btn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
    // Um listener só de "resize" da window não apanha o painel a mudar de
    // tamanho por si (abrir/fechar, sidebar a recolher, animação de
    // entrada a assentar) — nesses casos a pill ficava presa numa medição
    // antiga, larga demais, tapando os botões todos com a cor ativa.
    // ResizeObserver reage a qualquer mudança de tamanho do próprio
    // elemento, seja qual for a causa.
    const ro = new ResizeObserver(measure)
    ro.observe(wrap)
    // Remedir também no scroll (seja do scrollIntoView acima ou de um
    // arrasto manual) para a pill nunca ficar presa numa posição antiga.
    wrap.addEventListener('scroll', measure, { passive: true })
    return () => { ro.disconnect(); wrap.removeEventListener('scroll', measure) }
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
