const KEY = 'showo_cookie_consent'

export function getConsent() {
  return localStorage.getItem(KEY)
}

export function setConsent(value) {
  localStorage.setItem(KEY, value)
}

export function hasConsented() {
  return getConsent() === 'accepted'
}
