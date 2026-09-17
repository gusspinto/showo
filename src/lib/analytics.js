import posthog from 'posthog-js'

// Inert until VITE_POSTHOG_KEY is set — create a project at posthog.com
// (EU cloud by default, relevant for GDPR) and add the key to .env / Vercel
// env vars to activate.
export const analyticsEnabled = !!import.meta.env.VITE_POSTHOG_KEY

export function initAnalytics() {
  if (!analyticsEnabled) return
  posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
    api_host: import.meta.env.VITE_POSTHOG_HOST || 'https://eu.i.posthog.com',
    capture_pageview: false, // we send $pageview manually on route change (SPA)
    person_profiles: 'identified_only',
  })
}

export function trackPageview(path) {
  if (!analyticsEnabled) return
  posthog.capture('$pageview', { $current_url: path })
}

// Funil de registo → primeiro projeto. Funciona também para visitantes sem
// conta (distinct_id anónimo do PostHog) — ao contrário de funnel_events na
// base de dados, que exige auth.uid() e por isso não serve para medir onde
// se perde gente ANTES de ter conta, que é exatamente o troço que falta ver
// desde que /novo passou a aceitar visitantes sem sessão.
export function trackEvent(name, props = {}) {
  if (!analyticsEnabled) return
  posthog.capture(name, props)
}

export function identifyUser(user, profile) {
  if (!analyticsEnabled || !user) return
  const props = {
    email: user.email,
    name: profile?.full_name,
    role: profile?.role,
  }
  // Diagnóstico temporário: confirmar no console se o identify dispara e
  // com que dados, antes de assumir que o problema é do lado do PostHog.
  console.debug('[analytics] identify', user.id, props)
  posthog.identify(user.id, props)
}

export function resetAnalytics() {
  if (!analyticsEnabled) return
  posthog.reset()
}
