import { useState } from 'react'
import { View, Text, TouchableOpacity, Modal, Alert, ActivityIndicator } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { purchasePro, restorePurchases } from '@/lib/purchases'
import { track } from '@/lib/analytics'
import { usePlan } from '@/hooks/usePlan'

interface Props {
  visible: boolean
  onClose: () => void
}

const FEATURES = [
  { icon: '🌿', text: 'Plantas ilimitadas' },
  { icon: '🤖', text: '30 diagnosticos IA por mes' },
  { icon: '📊', text: 'Todas las tablas nutricionales' },
  { icon: '📸', text: 'Historial fotografico completo' },
  { icon: '📤', text: 'Exportar historial (proximamente)' },
]

export default function PaywallModal({ visible, onClose }: Props) {
  const { refetch } = usePlan()
  const [loading, setLoading]     = useState(false)
  const [restoring, setRestoring] = useState(false)

  // Track when modal becomes visible
  if (visible) track('paywall_shown')

  async function handlePurchase() {
    track('paywall_purchase_started')
    setLoading(true)
    const result = await purchasePro()
    setLoading(false)
    if (result.success) {
      track('paywall_purchase_completed')
      await refetch()
      Alert.alert('Plan Pro activado', 'Bienvenido a CannaTrack Pro.', [{ text: 'Empezar', onPress: onClose }])
    } else if (result.error) {
      track('paywall_purchase_error', { error: result.error })
      Alert.alert('No se pudo completar', result.error)
    }
  }

  async function handleRestore() {
    track('paywall_restore_started')
    setRestoring(true)
    const result = await restorePurchases()
    setRestoring(false)
    if (result.isPro) {
      track('paywall_restore_completed', { restored: true })
      await refetch()
      Alert.alert('Compra restaurada', 'Tu plan Pro fue restaurado.', [{ text: 'Continuar', onPress: onClose }])
    } else if (result.error) {
      Alert.alert('Error', result.error)
    } else {
      track('paywall_restore_completed', { restored: false })
      Alert.alert('Sin compras previas', 'No encontramos ninguna compra de Pro en tu cuenta.')
    }
  }

  return (
    <Modal visible={visible} animationType='slide' transparent presentationStyle='overFullScreen'>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' }}>
        <LinearGradient
          colors={['#1A1040', '#120C30', '#0D0820']}
          style={{ borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, borderColor: 'rgba(167,139,250,0.3)', paddingBottom: 40 }}
        >
          <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(167,139,250,0.3)' }} />
          </View>
          <View style={{ alignItems: 'center', paddingVertical: 20, paddingHorizontal: 24 }}>
            <LinearGradient
              colors={['#7C3AED', '#5B21B6']}
              style={{ width: 72, height: 72, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}
            >
              <Text style={{ fontSize: 36 }}>👑</Text>
            </LinearGradient>
            <Text style={{ color: '#E4F2E7', fontSize: 24, fontWeight: '900', letterSpacing: -0.5 }}>CannaTrack Pro</Text>
            <Text style={{ color: '#6D4FB0', fontSize: 14, marginTop: 6, textAlign: 'center', lineHeight: 20 }}>
              Todo lo que necesitas para el cultivo perfecto
            </Text>
          </View>
          <View style={{ paddingHorizontal: 24, gap: 10, marginBottom: 24 }}>
            {FEATURES.map((f, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(124,58,237,0.15)', borderWidth: 1, borderColor: 'rgba(167,139,250,0.2)', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 18 }}>{f.icon}</Text>
                </View>
                <Text style={{ color: '#C4B5FD', fontSize: 14, fontWeight: '600' }}>{f.text}</Text>
              </View>
            ))}
          </View>
          <View style={{ paddingHorizontal: 24, gap: 12 }}>
            <TouchableOpacity onPress={handlePurchase} disabled={loading || restoring} activeOpacity={0.85}>
              <LinearGradient
                colors={loading ? ['#3D2080', '#2A1560'] : ['#7C3AED', '#5B21B6']}
                style={{ borderRadius: 16, paddingVertical: 16, alignItems: 'center', gap: 4 }}
              >
                {loading ? <ActivityIndicator color='#E4F2E7' /> : (
                  <>
                    <Text style={{ color: '#E4F2E7', fontWeight: '900', fontSize: 16 }}>Activar Pro - USD 5/mes</Text>
                    <Text style={{ color: 'rgba(228,242,231,0.5)', fontSize: 11 }}>Cancela cuando quieras</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity onPress={handleRestore} disabled={loading || restoring} activeOpacity={0.7}
                style={{ flex: 1, paddingVertical: 12, borderRadius: 14, backgroundColor: 'rgba(167,139,250,0.08)', borderWidth: 1, borderColor: 'rgba(167,139,250,0.2)', alignItems: 'center' }}>
                {restoring ? <ActivityIndicator color='#A78BFA' size='small' /> : (
                  <Text style={{ color: '#A78BFA', fontSize: 13, fontWeight: '700' }}>Restaurar compra</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} disabled={loading || restoring} activeOpacity={0.7}
                style={{ flex: 1, paddingVertical: 12, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: '#1C2E1E', alignItems: 'center' }}>
                <Text style={{ color: '#4A6A50', fontSize: 13, fontWeight: '700' }}>Ahora no</Text>
              </TouchableOpacity>
            </View>
            <Text style={{ color: '#3A2860', fontSize: 11, textAlign: 'center', lineHeight: 16 }}>
              Al suscribirte aceptas los Terminos de Servicio y la Politica de Privacidad.
            </Text>
          </View>
        </LinearGradient>
      </View>
    </Modal>
  )
}
