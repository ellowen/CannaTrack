/**
 * Detecta si el navegador tiene conectividad.
 * Usa navigator.onLine (web) — más robusto que hacer ping.
 */
export function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true
}

/**
 * Registra listener para cuando el navegador vuelve online.
 * Devuelve cleanup function.
 */
export function onOnline(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {}

  window.addEventListener('online', callback)
  return () => window.removeEventListener('online', callback)
}

/**
 * Registra listener para cuando el navegador se desconecta.
 * Devuelve cleanup function.
 */
export function onOffline(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {}

  window.addEventListener('offline', callback)
  return () => window.removeEventListener('offline', callback)
}
