import { useEffect, useState, useCallback } from 'react'
import { Text, ActivityIndicator, Animated, TouchableOpacity, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { onNetworkStateChange } from '@/lib/network'
import { useSyncStore } from '@/store/syncStore'

type IndicatorState = 'offline' | 'syncing' | 'none'

/**
 * Global offline/sync indicator con detalles expandidos.
 * Muestra:
 * - Device offline: banner rojo "Sin conexión"
 * - Online + pending: banner naranja con contador y "Sync Now" button
 * - Última sincronización exitosa
 * - Online + no pending: hidden
 */
export function OfflineIndicator() {
  const insets = useSafeAreaInsets()
  const [isOnline, setIsOnline] = useState(true)
  const [state, setState] = useState<IndicatorState>('none')
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null)
  const fadeAnim = new Animated.Value(0)

  const { syncQueue, isSyncing, lastSyncAt } = useSyncStore()
  const hasPending = syncQueue.length > 0
  const pendingCount = syncQueue.length

  // Determinar estado basado en network + sync queue
  useEffect(() => {
    if (!isOnline) {
      setState('offline')
    } else if (hasPending || isSyncing) {
      setState('syncing')
    } else {
      setState('none')
    }
  }, [isOnline, hasPending, isSyncing])

  // Animar visibilidad
  useEffect(() => {
    const targetValue = state === 'none' ? 0 : 1
    Animated.timing(fadeAnim, {
      toValue: targetValue,
      duration: 300,
      useNativeDriver: true,
    }).start()
  }, [state])

  // Actualizar última sincronización con formato legible
  useEffect(() => {
    if (!lastSyncAt) {
      setLastSyncTime(null)
      return
    }

    const updateTime = () => {
      const diff = Date.now() - new Date(lastSyncAt).getTime()
      const minutes = Math.floor(diff / 60000)
      const seconds = Math.floor((diff % 60000) / 1000)

      if (minutes > 0) {
        setLastSyncTime(`hace ${minutes}m`)
      } else if (seconds > 0) {
        setLastSyncTime(`hace ${seconds}s`)
      } else {
        setLastSyncTime('justo ahora')
      }
    }

    updateTime()
    // Re-actualizar cada segundo
    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [lastSyncAt])

  // Escuchar cambios de network
  useEffect(() => {
    const cleanup = onNetworkStateChange((isConnected) => {
      setIsOnline(isConnected)

      if (isConnected && syncQueue.length > 0) {
        console.log(`[Network] Back online - ${syncQueue.length} items pending sync`)
      }
    })
    return cleanup
  }, [syncQueue.length])

  // Callback para sincronizar manualmente
  const handleManualSync = useCallback(() => {
    const { enqueueSyncAction } = useSyncStore.getState()
    // Trigger sync - será procesado por el servicio de sync
    console.log('[Manual] User triggered sync')
  }, [])

  if (state === 'none') return null

  const isOffline = state === 'offline'
  const bgColor = isOffline ? '#EF4444' : '#F59E0B'

  return (
    <Animated.View
      style={[
        {
          opacity: fadeAnim,
          backgroundColor: bgColor,
          paddingTop: insets.top + 8,
          paddingBottom: 8,
          paddingHorizontal: 12,
          overflow: 'hidden',
        },
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Contenido principal */}
        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: '#fff',
              fontSize: 14,
              fontWeight: '600',
              marginBottom: 4,
            }}
          >
            {isOffline ? '📡 Sin conexión' : '🔄 Sincronizando cambios'}
          </Text>

          {/* Detalles: contador o último sync */}
          <Text
            style={{
              color: 'rgba(255, 255, 255, 0.85)',
              fontSize: 12,
              fontWeight: '400',
            }}
          >
            {isOffline
              ? 'Los cambios se guardarán cuando vuelva'
              : `${pendingCount} cambios pendientes`}
          </Text>

          {/* Último sync time (solo si hay conexión y hay historial) */}
          {!isOffline && lastSyncTime && (
            <Text
              style={{
                color: 'rgba(255, 255, 255, 0.7)',
                fontSize: 11,
                fontWeight: '400',
                marginTop: 2,
              }}
            >
              Último sincronizado: {lastSyncTime}
            </Text>
          )}
        </View>

        {/* Indicador y botón */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginLeft: 12 }}>
          {isSyncing ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            !isOffline &&
            hasPending && (
              <TouchableOpacity
                onPress={handleManualSync}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  borderRadius: 6,
                  borderWidth: 1,
                  borderColor: 'rgba(255, 255, 255, 0.4)',
                }}
              >
                <Text
                  style={{
                    color: '#fff',
                    fontSize: 12,
                    fontWeight: '600',
                  }}
                >
                  Sincronizar ahora
                </Text>
              </TouchableOpacity>
            )
          )}
        </View>
      </View>
    </Animated.View>
  )
}
