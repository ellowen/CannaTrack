import { useEffect, useState } from 'react'
import { AppState, type AppStateStatus } from 'react-native'
import { supabase } from './supabase'

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? ''

let networkListeners: ((isOnline: boolean) => void)[] = []
let currentOnlineState = true
let pollInterval: ReturnType<typeof setInterval> | null = null
let networkPollingPaused = false
let appStateSubscription: ReturnType<typeof import('react-native').AppState.addEventListener> | null = null

/**
 * Detecta si el dispositivo tiene conectividad.
 * Usa endpoint de Supabase con validacion de certificado HTTPS.
 */
export async function checkOnline(): Promise<boolean> {
  try {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token ?? ''
    const response = await Promise.race([
      fetch(`${SUPABASE_URL}/rest/v1/`, {
        method: 'HEAD',
        headers: { 'Authorization': 'Bearer ' + token },
      }),
      new Promise<Response>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), 2000)
      ),
    ])
    return response.ok
  } catch {
    return false
  }
}

/**
 * Registra listener para cambios de conectividad.
 * Devuelve unsubscribe function.
 */
export function onNetworkStateChange(
  callback: (isConnected: boolean) => void
): () => void {
  networkListeners.push(callback)

  // Iniciar polling si no está activo
  if (!pollInterval) {
    startNetworkPolling()
  }

  return () => {
    networkListeners = networkListeners.filter((cb) => cb !== callback)
    if (networkListeners.length === 0) {
      stopNetworkPolling()
    }
  }
}

/**
 * Convenience: registra listener específico para cuando vuelve online.
 */
export function onOnline(callback: () => void): () => void {
  return onNetworkStateChange((isConnected) => {
    if (isConnected) callback()
  })
}

/**
 * Convenience: registra listener específico para cuando se desconecta.
 */
export function onOffline(callback: () => void): () => void {
  return onNetworkStateChange((isConnected) => {
    if (!isConnected) callback()
  })
}

/**
 * Hook para monitorear el estado de conectividad.
 * Cuando vuelve online, automáticamente dispara sincronización.
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    // Verificar estado inicial
    checkOnline()
      .then((online) => {
        setIsOnline(online)
        currentOnlineState = online
      })
      .catch(() => {
        setIsOnline(false)
        currentOnlineState = false
      })

    // Escuchar cambios de conectividad
    const unsubscribe = onNetworkStateChange((connected) => {
      setIsOnline(connected)
      // Sync será disparado desde OfflineIndicator que tiene acceso a syncStore
    })

    return unsubscribe
  }, [])

  return { isOnline }
}

/**
 * Inicia polling para detectar cambios de conectividad (cada 30 segundos).
 * Se pausa cuando la app está en background para ahorrar batería.
 */
function startNetworkPolling() {
  // Usar 30 segundos en lugar de 5 (85% menos polling)
  pollInterval = setInterval(async () => {
    if (networkPollingPaused) return

    const online = await checkOnline()
    if (online !== currentOnlineState) {
      currentOnlineState = online
      networkListeners.forEach((cb) => cb(online))
    }
  }, 30000)

  // Pausar polling cuando app va a background
  if (!appStateSubscription) {
    appStateSubscription = AppState.addEventListener('change', handleAppStateChange)
  }
}

/**
 * Pausa el polling de red cuando la app entra en background.
 */
export function pauseNetworkPolling(): void {
  networkPollingPaused = true
}

/**
 * Reanuda el polling de red cuando la app vuelve a foreground.
 */
export function resumeNetworkPolling(): void {
  networkPollingPaused = false
}

/**
 * Maneja cambios de estado de la app (foreground/background).
 */
function handleAppStateChange(state: AppStateStatus): void {
  if (state === 'active') {
    resumeNetworkPolling()
  } else {
    pauseNetworkPolling()
  }
}

/**
 * Detiene el polling de conectividad.
 */
function stopNetworkPolling() {
  if (pollInterval) {
    clearInterval(pollInterval)
    pollInterval = null
  }

  if (appStateSubscription) {
    appStateSubscription.remove()
    appStateSubscription = null
  }
}
