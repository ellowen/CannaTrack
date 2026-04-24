import { useEffect, useState } from 'react'

let networkListeners: ((isOnline: boolean) => void)[] = []
let currentOnlineState = true
let pollInterval: NodeJS.Timeout | null = null

/**
 * Detecta si el dispositivo tiene conectividad (fallback con fetch).
 * Intenta conectar a Google para verificar.
 */
export async function checkOnline(): Promise<boolean> {
  try {
    const response = await fetch('https://www.google.com/favicon.ico', {
      method: 'HEAD',
      cache: 'no-cache',
      mode: 'no-cors',
    })
    return response.ok || response.type === 'opaque'
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
 * Inicia polling para detectar cambios de conectividad (cada 5 segundos).
 */
function startNetworkPolling() {
  pollInterval = setInterval(async () => {
    const online = await checkOnline()
    if (online !== currentOnlineState) {
      currentOnlineState = online
      networkListeners.forEach((cb) => cb(online))
    }
  }, 5000)
}

/**
 * Detiene el polling de conectividad.
 */
function stopNetworkPolling() {
  if (pollInterval) {
    clearInterval(pollInterval)
    pollInterval = null
  }
}
