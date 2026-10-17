import { useState, useMemo, useEffect } from 'react'
import { getCountries, getCountryCallingCode, isValidPhoneNumber, parsePhoneNumberFromString } from 'libphonenumber-js'
import { Select } from './ui'

const DISPLAY_NAMES = typeof Intl.DisplayNames === 'function'
  ? new Intl.DisplayNames(['pt'], { type: 'region' })
  : null

function flagEmoji(iso) {
  return iso.toUpperCase().replace(/./g, c => String.fromCodePoint(127397 + c.charCodeAt(0)))
}

function countryName(iso) {
  return DISPLAY_NAMES?.of(iso) || iso
}

// PT primeiro (predefinido), depois Brasil e EUA (favoritos, pedido do
// Gustavo), só depois o resto por ordem alfabética.
const FAVORITES = ['PT', 'BR', 'US']
const COUNTRY_OPTIONS = (() => {
  const codes = getCountries()
  const rest = codes.filter(c => !FAVORITES.includes(c)).sort((a, b) => countryName(a).localeCompare(countryName(b), 'pt'))
  return [...FAVORITES, ...rest].map(iso => ({
    value: iso,
    label: `${flagEmoji(iso)} +${getCountryCallingCode(iso)} ${countryName(iso)}`,
  }))
})()

/* value/onChange trabalham sempre em E.164 completo (ex: "+351912345678").
   Aceita um número antigo sem indicativo (assume PT) só para pré-preencher
   o campo, nunca grava nesse formato outra vez. */
export default function PhoneInput({ value, onChange, autoFocus, inputClassName, inputStyle, wrapClassName, wrapStyle, selectStyle }) {
  const initial = useMemo(() => {
    if (!value) return { country: 'PT', national: '' }
    const parsed = parsePhoneNumberFromString(value, value.startsWith('+') ? undefined : 'PT')
    if (parsed) return { country: parsed.country || 'PT', national: parsed.nationalNumber }
    return { country: 'PT', national: value.replace(/\D/g, '') }
  }, [])

  const [country, setCountry] = useState(initial.country)
  const [national, setNational] = useState(initial.national)

  useEffect(() => {
    const digits = national.replace(/\D/g, '')
    if (!digits) { onChange(''); return }
    onChange(`+${getCountryCallingCode(country)}${digits}`)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [country, national])

  return (
    <div className={wrapClassName} style={{ display: 'flex', alignItems: 'stretch', ...wrapStyle }}>
      <Select
        value={country}
        onChange={setCountry}
        options={COUNTRY_OPTIONS}
        style={{ width: 210, flexShrink: 0 }}
        inputStyle={selectStyle}
      />
      <input
        type="tel"
        value={national}
        onChange={e => setNational(e.target.value)}
        placeholder="912 345 678"
        autoFocus={autoFocus}
        className={inputClassName}
        style={{ flex: 1, minWidth: 0, ...inputStyle }}
      />
    </div>
  )
}

export function isPhoneComplete(e164) {
  if (!e164) return false
  return isValidPhoneNumber(e164)
}
