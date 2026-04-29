import { Modal, View, Text, TouchableOpacity, ScrollView } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'

interface Props {
  visible: boolean
  onClose: () => void
  feature?: string
}

const PRO_FEATURES = [
  { icon: '🌿', label: 'Plantas ilimitadas' },
  { icon: '📋', label: 'Todas las tablas nutricionales' },
  { icon: '🤖', label: 'Diagnostico IA por foto' },
  { icon: '📊', label: 'Estadisticas avanzadas' },
  { icon: '📥', label: 'Exportar historial' },
]

export default function PaywallModal({ visible, onClose, feature }: Props) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' }}>
        <LinearGradient
          colors={['#1A1040', '#0D0820', '#080E09']}
          style={{ borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingBottom: 40, borderTopWidth: 1, borderTopColor: 'rgba(167,139,250,0.2)' }}
        >
          {/* Handle */}
          <View style={{ alignItems: 'center', paddingTop: 14, marginBottom: 4 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(167,139,250,0.25)' }} />
          </View>

          {/* Close */}
          <TouchableOpacity
            onPress={onClose}
            style={{ position: 'absolute', top: 18, right: 20, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.07)', alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ color: '#728C74', fontSize: 16, fontWeight: '600' }}>x</Text>
          </TouchableOpacity>

          <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 8 }} showsVerticalScrollIndicator={false}>

            {/* Icon + Badge */}
            <View style={{ alignItems: 'center', marginBottom: 22 }}>
              <LinearGradient
                colors={['#2D1B69', '#1A0F40']}
                style={{ width: 80, height: 80, borderRadius: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(167,139,250,0.4)', marginBottom: 16 }}
              >
                <Text style={{ fontSize: 40 }}>👑</Text>
              </LinearGradient>
              <LinearGradient
                colors={['#7C3AED', '#5B21B6']}
                style={{ borderRadius: 10, paddingHorizontal: 12, paddingVertical: 4, marginBottom: 14 }}
              >
                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '900', letterSpacing: 1.5 }}>PLAN PRO</Text>
              </LinearGradient>
              <Text style={{ color: '#E4F2E7', fontSize: 22, fontWeight: '900', textAlign: 'center', letterSpacing: -0.3 }}>
                {feature ? `${feature} es Pro` : 'Pasate a Pro'}
              </Text>
              <Text style={{ color: '#6D4FB0', fontSize: 14, marginTop: 6, textAlign: 'center', lineHeight: 20 }}>
                Desbloquea el potencial completo{'\n'}de tu cultivo
              </Text>
            </View>

            {/* Feature list */}
            <LinearGradient
              colors={['#130D26', '#0D0820']}
              style={{ borderRadius: 20, borderWidth: 1, borderColor: 'rgba(139,92,246,0.2)', padding: 16, marginBottom: 22, gap: 12 }}
            >
              {PRO_FEATURES.map(f => (
                <View key={f.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(139,92,246,0.12)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(139,92,246,0.2)' }}>
                    <Text style={{ fontSize: 18 }}>{f.icon}</Text>
                  </View>
                  <Text style={{ color: '#C4B5FD', fontSize: 14, fontWeight: '600', flex: 1 }}>{f.label}</Text>
                  <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(139,92,246,0.25)', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: '#A78BFA', fontSize: 11, fontWeight: '900' }}>v</Text>
                  </View>
                </View>
              ))}
            </LinearGradient>

            {/* Price */}
            <View style={{ alignItems: 'center', marginBottom: 18 }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2 }}>
                <Text style={{ color: '#728C74', fontSize: 18, fontWeight: '700', marginBottom: 4 }}>USD</Text>
                <Text style={{ color: '#E4F2E7', fontSize: 48, fontWeight: '900', lineHeight: 52, letterSpacing: -2 }}>5</Text>
                <Text style={{ color: '#728C74', fontSize: 16, fontWeight: '600', marginBottom: 8 }}>/mes</Text>
              </View>
              <Text style={{ color: '#3A5040', fontSize: 12, marginTop: 2 }}>Cancela cuando quieras</Text>
            </View>

            {/* CTA */}
            <TouchableOpacity activeOpacity={0.85}>
              <LinearGradient
                colors={['#7C3AED', '#5B21B6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ borderRadius: 20, paddingVertical: 20, alignItems: 'center' }}
              >
                <Text style={{ color: '#fff', fontWeight: '900', fontSize: 17, letterSpacing: 0.3 }}>Activar Pro -&gt;</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity onPress={onClose} style={{ paddingVertical: 14, alignItems: 'center' }}>
              <Text style={{ color: '#3A5040', fontSize: 14, fontWeight: '600' }}>Ahora no</Text>
            </TouchableOpacity>

          </ScrollView>
        </LinearGradient>
      </View>
    </Modal>
  )
}
