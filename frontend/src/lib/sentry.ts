import * as Sentry from '@sentry/react'

const DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined
const ENV = (import.meta.env.MODE ?? 'development') as string

// Sin observabilidad de errores en produccion, un fallo silencioso
// (sync fallida, RPC rechazado, componente que crashea) no lo ve nadie
// del equipo salvo que el usuario lo reporte manualmente. Mismo patron
// que mobile/src/lib/sentry.ts para consistencia entre plataformas.
export function initSentry(): void {
  if (!DSN || ENV === 'development') return

  Sentry.init({
    dsn: DSN,
    environment: ENV,
    // Captura una fraccion de transacciones de performance para no
    // exceder el free tier. Ajustar segun uso real.
    tracesSampleRate: ENV === 'production' ? 0.2 : 1.0,
    // No enviar errores de red esperados (sin conexion, timeout) --
    // ruido conocido, no un bug a investigar.
    ignoreErrors: [
      'Network request failed',
      'Failed to fetch',
      'AbortError',
      'Load failed',
    ],
    // Redactar datos sensibles antes de enviar cualquier evento --
    // nunca tokens, cookies, ni el email del usuario en claro.
    beforeSend(event) {
      if (event.request?.cookies) delete event.request.cookies
      if (event.request?.headers?.Authorization) delete event.request.headers.Authorization
      if (event.user?.email) event.user.email = '[redacted]'
      return event
    },
  })
}

export { Sentry }
