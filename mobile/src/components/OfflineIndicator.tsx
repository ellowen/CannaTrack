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
  let bgColor = '#F59E0B' // syncing/pending (amber)
  if (isOffline) bgColor = '#EF4444' // offline (red)
  if (!isOffline && !isSyncing && pendingCount === 0) bgColor = '#10B981' // synced (green)

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
          <View>
            <Text
              style={{
                color: 'rgba(255, 255, 255, 0.85)',
                fontSize: 12,
                fontWeight: '400',
              }}
            >
              {isOffline
                ? 'Los cambios se guardarán cuando vuelva'
                : isSyncing
                  ? `Sincronizando ${pendingCount} cambios...`
                  : pendingCount > 0
                    ? `${pendingCount} cambios pendientes`
                    : 'Sincronizado'}
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
                Último: {lastSyncTime}
              </Text>
            )}
          </View>
        </View>

        {/* Indicador y botón */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 12 }}>
          {isSyncing ? (
            <>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={{ color: '#fff', fontSize: 11, fontWeight: '600' }}>
                {pendingCount}
              </Text>
            </>
          ) : !isOffline && hasPending ? (
            <>
              <Text
                style={{
                  color: '#fff',
                  fontSize: 20,
                  fontWeight: '600',
                }}
              >
                •
              </Text>
              <TouchableOpacity
                onPress={handleManualSync}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  borderRadius: 6,
                  borderWidth: 1,
                  borderColor: 'rgba(255, 255, 255, 0.4)',
                }}
              >
                <Text
                  style={{
                    color: '#fff',
                    fontSize: 11,
                    fontWeight: '600',
                  }}
                >
                  Ahora
                </Text>
              </TouchableOpacity>
            </>
          ) : !isOffline && !isSyncing ? (
            <Text
              style={{
                color: '#fff',
                fontSize: 16,
              }}
            >
              ✓
            </Text>
          ) : null}
        </View>
      </View>
    </Animated.View>
  )
}
