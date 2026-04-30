import * as Sentry from '@sentry/react-native'

const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN
const ENV = process.env.EXPO_PUBLIC_APP_ENV ?? 'development'

export function initSentry() {
  // No inicializar sin DSN o en desarrollo
  if (!DSN || ENV === 'development') return

  Sentry.init({
    dsn: DSN,
    environment: ENV,
    // Captura el 20% de transacciones de performance en produccion
    // para no exceder el free tier. Ajustar segun uso real.
    tracesSampleRate: ENV === 'production' ? 0.2 : 1.0,
    // No enviar errores de red esperados (sin conexion, timeout)
    ignoreErrors: [
      'Network request failed',
      'Failed to fetch',
      'AbortError',
    ],
    // Redactar datos sensibles del usuario
    beforeSend(event) {
      if (event.request?.cookies) delete event.request.cookies
      if (event.user?.email) {
        event.user.email = '[redacted]'
      }
      return event
    },
  })
}

export { Sentry }
