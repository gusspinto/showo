import { useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { CloseIcon as X } from '@solar-icons/react/bold/close'
import { GalleryIcon as ImageIcon } from '@solar-icons/react/bold/gallery'
import { TrashBinTrashIcon as Trash } from '@solar-icons/react/bold/trash-bin-trash'
import { ACCENT_SWATCHES, FONTS, BACKGROUNDS, CARD_STYLES, DEFAULT_APPEARANCE } from '../lib/profileAppearance'
import './ProfileCustomizer.css'

/* Painel de personalização do perfil, ao vivo. O preview acontece na própria
   página (o pai aplica `appearance` enquanto o painel está aberto); aqui só
   se editam os valores. */
export default function ProfileCustomizer({ appearance, onChange, onSave, onClose, saving, userId }) {
  const a = appearance || {}
  const fileRef = useRef(null)
  const [bannerBusy, setBannerBusy] = useState(false)
  const [bannerErr, setBannerErr] = useState(null)

  function set(patch) { onChange({ ...a, ...patch }) }

  async function pickBanner(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { setBannerErr('Máximo 5 MB.'); return }
    setBannerErr(null)
    setBannerBusy(true)
    try {
      const path = `${userId}/${Date.now()}.${file.name.split('.').pop()?.toLowerCase() || 'jpg'}`
      const { error } = await supabase.storage.from('profile-banners').upload(path, file, { contentType: file.type, upsert: true })
      if (error) throw error
      const { data: { publicUrl } } = supabase.storage.from('profile-banners').getPublicUrl(path)
      set({ bannerUrl: `${publicUrl}?v=${Date.now()}` })
    } catch (err) {
      setBannerErr('Falha ao carregar a imagem.')
      console.error(err)
    } finally {
      setBannerBusy(false)
    }
  }

  return (
    <>
      <div className="pc-scrim" onClick={onClose} />
      <aside className="pc-panel" role="dialog" aria-label="Personalizar perfil">
        <header className="pc-head">
          <span className="pc-title">Personalizar</span>
          <button className="pc-x" onClick={onClose} aria-label="Fechar"><X size={16} /></button>
        </header>

        <div className="pc-body">
          {/* Banner */}
          <section className="pc-group">
            <p className="pc-label">Imagem de topo</p>
            {a.bannerUrl ? (
              <div className="pc-banner-preview">
                <img src={a.bannerUrl} alt="" />
                <button className="pc-banner-remove" onClick={() => set({ bannerUrl: null })} aria-label="Remover imagem">
                  <Trash size={13} />
                </button>
              </div>
            ) : (
              <button className="pc-banner-add" onClick={() => fileRef.current?.click()} disabled={bannerBusy}>
                <ImageIcon size={16} />
                {bannerBusy ? 'A carregar…' : 'Carregar imagem'}
              </button>
            )}
            {a.bannerUrl && (
              <button className="pc-textbtn" onClick={() => fileRef.current?.click()} disabled={bannerBusy}>
                {bannerBusy ? 'A carregar…' : 'Trocar'}
              </button>
            )}
            {bannerErr && <p className="pc-err">{bannerErr}</p>}
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={pickBanner} />
          </section>

          {/* Accent */}
          <section className="pc-group">
            <p className="pc-label">Cor de destaque</p>
            <div className="pc-swatches">
              {ACCENT_SWATCHES.map(c => (
                <button
                  key={c}
                  className={`pc-swatch${(a.accent || DEFAULT_APPEARANCE.accent) === c ? ' is-on' : ''}`}
                  style={{ background: c }}
                  onClick={() => set({ accent: c })}
                  aria-label={c}
                />
              ))}
              <label className="pc-swatch pc-swatch--custom" title="Cor personalizada">
                <input type="color" value={a.accent || DEFAULT_APPEARANCE.accent} onChange={e => set({ accent: e.target.value })} />
              </label>
            </div>
          </section>

          {/* Tipografia */}
          <section className="pc-group">
            <p className="pc-label">Tipografia</p>
            <div className="pc-options">
              {Object.entries(FONTS).map(([key, f]) => (
                <button
                  key={key}
                  className={`pc-option${(a.font || DEFAULT_APPEARANCE.font) === key ? ' is-on' : ''}`}
                  style={{ fontFamily: f.heading }}
                  onClick={() => set({ font: key })}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </section>

          {/* Fundo */}
          <section className="pc-group">
            <p className="pc-label">Fundo</p>
            <div className="pc-options">
              {Object.entries(BACKGROUNDS).map(([key, b]) => (
                <button
                  key={key}
                  className={`pc-option${(a.background || DEFAULT_APPEARANCE.background) === key ? ' is-on' : ''}`}
                  onClick={() => set({ background: key })}
                >
                  <span className="pc-bg-dot" style={{ background: b.tokens?.['--color-bg'] || 'var(--color-bg)', borderColor: b.tokens?.['--color-border'] || 'var(--color-border)' }} />
                  {b.label}
                </button>
              ))}
            </div>
          </section>

          {/* Cards */}
          <section className="pc-group">
            <p className="pc-label">Estilo dos cards</p>
            <div className="pc-options">
              {Object.entries(CARD_STYLES).map(([key, c]) => (
                <button
                  key={key}
                  className={`pc-option${(a.cards || DEFAULT_APPEARANCE.cards) === key ? ' is-on' : ''}`}
                  onClick={() => set({ cards: key })}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </section>
        </div>

        <footer className="pc-foot">
          <button className="pc-reset" onClick={() => onChange({})} disabled={saving}>Repor</button>
          <button className="pc-save" onClick={onSave} disabled={saving || bannerBusy}>
            {saving ? 'A guardar…' : 'Guardar'}
          </button>
        </footer>
      </aside>
    </>
  )
}
