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

export function identifyUser(user, profile) {
  if (!analyticsEnabled || !user) return
  posthog.identify(user.id, { email: user.email, role: profile?.role })
}

export function resetAnalytics() {
  if (!analyticsEnabled) return
  posthog.reset()
}
