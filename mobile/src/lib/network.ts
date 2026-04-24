import NetInfo from '@react-native-community/netinfo'

/**
 * Detecta si el dispositivo tiene conectividad.
 * Usa @react-native-community/netinfo.
 */
export async function isOnline(): Promise<boolean> {
  const state = await NetInfo.fetch()
  return state.isConnected ?? false
}

/**
 * Registra listener para cambios de conectividad.
 * Devuelve unsubscribe function.
 */
export function onNetworkStateChange(
  callback: (isConnected: boolean) => void
): () => void {
  const unsubscribe = NetInfo.addEventListener((state) => {
    callback(state.isConnected ?? false)
  })

  return unsubscribe
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
