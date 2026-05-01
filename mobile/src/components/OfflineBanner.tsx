/**
 * Banner no invasivo que aparece en la parte superior cuando no hay internet.
 * Usa useNetworkStatus de network.ts que ya hace polling cada 30s.
 */
import { useEffect, useRef } from 'react'
import { View, Text, Animated } from 'react-native'
import { useNetworkStatus } from '@/lib/network'

export function OfflineBanner() {
  const { isOnline } = useNetworkStatus()
  const translateY   = useRef(new Animated.Value(-48)).current
  const opacity      = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateY, {
        toValue:         isOnline ? -48 : 0,
        useNativeDriver: true,
        tension:         80,
        friction:        10,
      }),
      Animated.timing(opacity, {
        toValue:         isOnline ? 0 : 1,
        duration:        200,
        useNativeDriver: true,
      }),
    ]).start()
  }, [isOnline])

  return (
    <Animated.View
      style={{
        position:        'absolute',
        top:             0,
        left:            0,
        right:           0,
        zIndex:          999,
        transform:       [{ translateY }],
        opacity,
        pointerEvents:   'none',
      }}
    >
      <View style={{
        backgroundColor: '#1A0E00',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(245,158,11,0.3)',
        paddingVertical:   10,
        paddingHorizontal: 16,
        flexDirection:     'row',
        alignItems:        'center',
        gap:               8,
      }}>
        <Text style={{ fontSize: 14 }}>📡</Text>
        <Text style={{ color: '#F59E0B', fontSize: 13, fontWeight: '700', flex: 1 }}>
          Sin conexion — los cambios se guardaran cuando vuelva internet
        </Text>
      </View>
    </Animated.View>
  )
}
