import { CloseIcon as X } from '@solar-icons/react/bold/close'
import './ProfileCustomizer.css'

const SIZES = ['1–10', '11–50', '51–200', '201–500', '500+']

/* Painel de edição do perfil de empresa, ao vivo, mesmo conceito do
   ProfileCustomizer.jsx dos alunos (preview na própria página enquanto o
   painel está aberto, o pai aplica os valores). Sem banner/cor/tipografia
   porque a empresa não tem essa personalização visual, só os dados que
   antes viviam nas tabs "Empresa" e "Recrutamento" da Settings, separados
   da própria página pública que mostram, o que não fazia sentido. */
export default function CompanyCustomizer({
  company, onCompanyChange,
  companyRole, onCompanyRoleChange,
  companyDescription, onCompanyDescriptionChange,
  companyLocation, onCompanyLocationChange,
  companyIndustry, onCompanyIndustryChange,
  companySize, onCompanySizeChange,
  companyWebsite, onCompanyWebsiteChange,
  linkedinUrl, onLinkedinUrlChange,
  lookingFor, onLookingForChange,
  error, onSave, onClose, saving,
}) {
  return (
    <>
      <div className="pc-scrim" onClick={onClose} />
      <aside className="pc-panel" role="dialog" aria-label="Editar perfil da empresa">
        <header className="pc-head">
          <span className="pc-title">Editar perfil</span>
          <button className="pc-x" onClick={onClose} aria-label="Fechar"><X size={16} /></button>
        </header>

        <div className="pc-body">
          <section className="pc-group">
            <p className="pc-label">Nome da empresa</p>
            <input className="pc-headline-input" type="text" maxLength={80} placeholder="Ex: Google, NOS, Altice..."
              value={company || ''} onChange={e => onCompanyChange(e.target.value)} />
          </section>

          <section className="pc-group">
            <p className="pc-label">O teu cargo</p>
            <input className="pc-headline-input" type="text" maxLength={80} placeholder="Ex: Talent Acquisition, HR Manager, CEO..."
              value={companyRole || ''} onChange={e => onCompanyRoleChange(e.target.value)} />
          </section>

          <section className="pc-group">
            <p className="pc-label">Sobre a empresa</p>
            <textarea className="pc-headline-input" rows={4} maxLength={600} placeholder="Descreve a empresa, a cultura, os projetos, o ambiente de trabalho..."
              value={companyDescription || ''} onChange={e => onCompanyDescriptionChange(e.target.value)} />
          </section>

          <section className="pc-group">
            <p className="pc-label">Localização</p>
            <input className="pc-headline-input" type="text" maxLength={80} placeholder="Ex: Lisboa, Porto, Remote..."
              value={companyLocation || ''} onChange={e => onCompanyLocationChange(e.target.value)} />
          </section>

          <section className="pc-group">
            <p className="pc-label">Setor / Indústria</p>
            <input className="pc-headline-input" type="text" maxLength={80} placeholder="Ex: Tecnologia, Saúde..."
              value={companyIndustry || ''} onChange={e => onCompanyIndustryChange(e.target.value)} />
          </section>

          <section className="pc-group">
            <p className="pc-label">Dimensão da empresa</p>
            <div className="pc-options">
              {SIZES.map(s => (
                <button key={s} type="button" className={`pc-option${companySize === s ? ' is-on' : ''}`}
                  onClick={() => onCompanySizeChange(s)}>
                  {s}
                </button>
              ))}
            </div>
          </section>

          <section className="pc-group">
            <p className="pc-label">Website</p>
            <input className="pc-headline-input" type="text" placeholder="https://empresa.com"
              value={companyWebsite || ''} onChange={e => onCompanyWebsiteChange(e.target.value)} />
          </section>

          <section className="pc-group">
            <p className="pc-label">LinkedIn</p>
            <input className="pc-headline-input" type="text" placeholder="https://linkedin.com/company/..."
              value={linkedinUrl || ''} onChange={e => onLinkedinUrlChange(e.target.value)} />
          </section>

          <p className="pc-subhead">Recrutamento</p>

          <section className="pc-group">
            <p className="pc-label">O que procuras</p>
            <textarea className="pc-headline-input" rows={3} maxLength={500} placeholder="Ex: Procuro estagiários de Engenharia Informática com projetos na área de mobile ou web..."
              value={lookingFor || ''} onChange={e => onLookingForChange(e.target.value)} />
          </section>
        </div>

        {error && <p className="pc-err pc-err--foot">{error}</p>}
        <footer className="pc-foot">
          <button className="pc-save" style={{ flex: 1 }} onClick={onSave} disabled={saving}>
            {saving ? 'A guardar…' : 'Guardar'}
          </button>
        </footer>
      </aside>
    </>
  )
}
