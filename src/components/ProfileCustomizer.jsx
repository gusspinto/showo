import { useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { CloseIcon as X } from '@solar-icons/react/bold/close'
import { GalleryIcon as ImageIcon } from '@solar-icons/react/bold/gallery'
import { TrashBinTrashIcon as Trash } from '@solar-icons/react/bold/trash-bin-trash'
import { ACCENT_SWATCHES, FONTS, DEFAULT_ACCENT } from '../lib/profileAppearance'
import ColorPicker from './ColorPicker'
import './ProfileCustomizer.css'

const HEADLINE_MAX = 90

/* Painel de identidade do perfil-portefólio, ao vivo. O preview acontece na
   própria página (o pai aplica os valores enquanto o painel está aberto).
   Só duas coisas de marca — cor e tipografia — mais o headline e o banner. */
export default function ProfileCustomizer({
  appearance, onChange, headline, onHeadlineChange, onSave, onClose, saving, userId,
}) {
  const a = appearance || {}
  const fileRef = useRef(null)
  const [bannerBusy, setBannerBusy] = useState(false)
  const [bannerErr, setBannerErr] = useState(null)
  const [pickerOpen, setPickerOpen] = useState(false)

  function set(patch) { onChange({ ...a, ...patch }) }

  async function pickBanner(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { setBannerErr('Máximo 5 MB.'); return }
    setBannerErr(null)
    setBannerBusy(true)
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
      const path = `${userId}/${Date.now()}.${ext}`
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
          <span className="pc-title">Identidade do perfil</span>
          <button className="pc-x" onClick={onClose} aria-label="Fechar"><X size={16} /></button>
        </header>

        <div className="pc-body">
          {/* Banner */}
          <section className="pc-group">
            <p className="pc-label">Imagem de topo</p>
            {a.bannerUrl ? (
              <>
                <div className="pc-banner-preview">
                  <img src={a.bannerUrl} alt="" style={{ objectPosition: `50% ${a.bannerPosition ?? 50}%` }} />
                  <button className="pc-banner-remove" onClick={() => set({ bannerUrl: null, bannerPosition: null })} aria-label="Remover imagem">
                    <Trash size={13} />
                  </button>
                </div>
                <div className="pc-banner-position">
                  <span className="pc-banner-position-label">Posição da imagem</span>
                  <input
                    type="range" min="0" max="100"
                    value={a.bannerPosition ?? 50}
                    onChange={e => set({ bannerPosition: Number(e.target.value) })}
                  />
                </div>
                <button className="pc-textbtn" onClick={() => fileRef.current?.click()} disabled={bannerBusy}>
                  {bannerBusy ? 'A carregar…' : 'Trocar'}
                </button>
              </>
            ) : (
              <button className="pc-banner-add" onClick={() => fileRef.current?.click()} disabled={bannerBusy}>
                <ImageIcon size={16} />
                {bannerBusy ? 'A carregar…' : 'Carregar imagem'}
              </button>
            )}
            {bannerErr && <p className="pc-err">{bannerErr}</p>}
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={pickBanner} />
          </section>

          {/* Headline */}
          <section className="pc-group">
            <p className="pc-label">Frase de topo</p>
            <textarea
              className="pc-headline-input"
              rows={2}
              maxLength={HEADLINE_MAX}
              placeholder="Ex.: Designer de interação a fazer coisas que ninguém pediu"
              value={headline || ''}
              onChange={e => onHeadlineChange(e.target.value)}
            />
            <p className="pc-hint">{(headline || '').length}/{HEADLINE_MAX} — aparece por baixo do teu nome</p>
          </section>

          {/* Accent */}
          <section className="pc-group">
            <p className="pc-label">Cor</p>
            <div className="pc-swatches">
              {ACCENT_SWATCHES.map(c => (
                <button
                  key={c}
                  className={`pc-swatch${(a.accent || DEFAULT_ACCENT) === c ? ' is-on' : ''}`}
                  style={{ background: c }}
                  onClick={() => set({ accent: c })}
                  aria-label={c}
                />
              ))}
              <div className="pc-swatch-custom-wrap">
                <button
                  type="button"
                  className="pc-swatch pc-swatch--custom"
                  title="Cor personalizada"
                  onClick={() => setPickerOpen(o => !o)}
                  aria-label="Escolher cor personalizada"
                />
                {pickerOpen && (
                  <ColorPicker
                    value={a.accent || DEFAULT_ACCENT}
                    onChange={c => set({ accent: c })}
                    onClose={() => setPickerOpen(false)}
                  />
                )}
              </div>
            </div>
          </section>

          {/* Tipografia */}
          <section className="pc-group">
            <p className="pc-label">Tipografia</p>
            <div className="pc-options">
              {Object.entries(FONTS).map(([key, f]) => (
                <button
                  key={key}
                  className={`pc-option${(a.font || 'moderno') === key ? ' is-on' : ''}`}
                  style={{ fontFamily: f.heading }}
                  onClick={() => set({ font: key })}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </section>
        </div>

        <footer className="pc-foot">
          <button className="pc-reset" onClick={() => { onChange({ bannerUrl: a.bannerUrl || null }); }} disabled={saving}>
            Repor cor e fonte
          </button>
          <button className="pc-save" onClick={onSave} disabled={saving || bannerBusy}>
            {saving ? 'A guardar…' : 'Guardar'}
          </button>
        </footer>
      </aside>
    </>
  )
}
