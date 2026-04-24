import { useState } from 'react'
import { View, Text, TouchableOpacity, ScrollView, Image } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

type Diagnosis = {
  id: string
  date: Date
  photoUrl?: string
  report?: string
}

export default function DiagnoseScreen() {
  const [lastDiagnosis, setLastDiagnosis] = useState<Diagnosis | null>(null)

  const handleTakePhoto = () => {
    // TODO: Week 5 - Camera access implementation
    console.log('Take photo - Week 5 implementation')
  }

  const handleSelectFromGallery = () => {
    // TODO: Week 5 - Photo library implementation
    console.log('Select from gallery - Week 5 implementation')
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0C1410' }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>

        {/* Header */}
        <View style={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 20 }}>
          <Text style={{ color: '#E4F2E7', fontSize: 24, fontWeight: '900' }}>
            Diagnóstico por IA
          </Text>
          <Text style={{ color: '#728C74', fontSize: 13, marginTop: 8, lineHeight: 18 }}>
            Sube una foto de tu planta para obtener un diagnóstico automático de plagas, enfermedades y deficiencias nutricionales.
          </Text>
          <Text style={{ color: '#A78BFA', fontSize: 12, marginTop: 4, fontWeight: '600' }}>
            (Semana 5: integración con Claude Vision API)
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={{ paddingHorizontal: 16, gap: 10 }}>
          <TouchableOpacity
            onPress={handleTakePhoto}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              paddingVertical: 16,
              backgroundColor: '#131D14',
              borderRadius: 12,
              borderWidth: 1,
              borderColor: '#1C2E1E',
            }}
            activeOpacity={0.8}
          >
            <Text style={{ fontSize: 18 }}>📷</Text>
            <Text style={{ color: '#E4F2E7', fontSize: 16, fontWeight: '700' }}>
              Tomar foto
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSelectFromGallery}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              paddingVertical: 16,
              backgroundColor: '#131D14',
              borderRadius: 12,
              borderWidth: 1,
              borderColor: '#1C2E1E',
            }}
            activeOpacity={0.8}
          >
            <Text style={{ fontSize: 18 }}>🖼️</Text>
            <Text style={{ color: '#E4F2E7', fontSize: 16, fontWeight: '700' }}>
              Galería
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            disabled
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              paddingVertical: 16,
              backgroundColor: '#131D14',
              borderRadius: 12,
              borderWidth: 1,
              borderColor: '#1C2E1E',
              opacity: 0.5,
            }}
          >
            <Text style={{ fontSize: 18 }}>✨</Text>
            <Text style={{ color: '#728C74', fontSize: 16, fontWeight: '700' }}>
              Diagnóstico automático
            </Text>
          </TouchableOpacity>
        </View>

        {/* Last Diagnosis */}
        {lastDiagnosis ? (
          <View style={{ paddingHorizontal: 16, marginTop: 24 }}>
            <Text style={sectionLabel}>Último diagnóstico</Text>
            <View style={{
              backgroundColor: '#131D14',
              borderRadius: 14,
              borderWidth: 1,
              borderColor: '#1C2E1E',
              padding: 14,
              gap: 12,
            }}>
              <Text style={{ color: '#728C74', fontSize: 12, fontWeight: '600' }}>
                {lastDiagnosis.date.toLocaleDateString('es-AR')}
              </Text>

              {lastDiagnosis.photoUrl && (
                <Image
                  source={{ uri: lastDiagnosis.photoUrl }}
                  style={{ width: '100%', height: 180, borderRadius: 10, backgroundColor: '#0C1410' }}
                />
              )}

              {lastDiagnosis.report && (
                <View>
                  <Text style={{ color: '#E4F2E7', fontSize: 12, lineHeight: 16 }}>
                    {lastDiagnosis.report}
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  backgroundColor: 'rgba(139,92,246,0.1)',
                  borderRadius: 8,
                  alignItems: 'center',
                  marginTop: 8,
                }}
                activeOpacity={0.7}
              >
                <Text style={{ color: '#8B5CF6', fontSize: 13, fontWeight: '700' }}>
                  Ver detalle completo
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={{ paddingHorizontal: 16, marginTop: 32 }}>
            <View style={{
              backgroundColor: '#131D14',
              borderRadius: 14,
              borderWidth: 1,
              borderColor: '#1C2E1E',
              padding: 24,
              alignItems: 'center',
              gap: 12,
            }}>
              <Text style={{ fontSize: 32 }}>📭</Text>
              <Text style={{ color: '#728C74', fontSize: 13, textAlign: 'center' }}>
                Sin diagnósticos aún
              </Text>
              <Text style={{ color: '#3A5040', fontSize: 12, textAlign: 'center' }}>
                Sube tu primera foto para comenzar
              </Text>
            </View>
          </View>
        )}

        {/* Coming Soon Footer */}
        <View style={{ paddingHorizontal: 16, marginTop: 32, paddingBottom: 20 }}>
          <View style={{
            backgroundColor: 'rgba(139,92,246,0.1)',
            borderRadius: 12,
            borderWidth: 1,
            borderColor: 'rgba(139,92,246,0.2)',
            padding: 16,
            alignItems: 'center',
            gap: 8,
          }}>
            <Text style={{ fontSize: 20 }}>🚀</Text>
            <Text style={{ color: '#A78BFA', fontSize: 12, fontWeight: '700', textAlign: 'center' }}>
              Coming Soon
            </Text>
            <Text style={{ color: '#8B5CF6', fontSize: 11, textAlign: 'center', lineHeight: 15 }}>
              Esta feature estará disponible en Semana 5 con integración completa de cámara y IA
            </Text>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  )
}

const sectionLabel = {
  color: '#728C74' as const,
  fontSize: 11,
  fontWeight: '700' as const,
  letterSpacing: 1.5,
  textTransform: 'uppercase' as const,
  marginBottom: 12,
}
