import * as Sentry from '@sentry/react'

// Inert until VITE_SENTRY_DSN is set — create a project at sentry.io and add
// the DSN to .env / Vercel env vars to activate.
export const errorTrackingEnabled = !!import.meta.env.VITE_SENTRY_DSN

export function initErrorTracking() {
  if (!errorTrackingEnabled) return
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0.1,
  })
}

export function captureError(error, extra) {
  if (!errorTrackingEnabled) return
  Sentry.captureException(error, { extra })
}
