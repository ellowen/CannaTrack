import { useState } from 'react'
import { View, Text, TouchableOpacity, ScrollView, Image, ActivityIndicator, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'

interface DiagnosisResult {
  summary: string
  issues: { name: string; severity: 'alta' | 'media' | 'baja'; description: string; solution: string }[]
  healthScore: number
  recommendations: string[]
}

const SEVERITY_COLOR = { alta: '#EF4444', media: '#F59E0B', baja: '#52CC64' }

export default function DiagnosisScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [imageUri, setImageUri]     = useState<string | null>(null)
  const [loading, setLoading]       = useState(false)
  const [result, setResult]         = useState<DiagnosisResult | null>(null)

  async function pickImage(fromCamera: boolean) {
    const picker = fromCamera
      ? ImagePicker.launchCameraAsync
      : ImagePicker.launchImageLibraryAsync

    const res = await picker({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
      base64: true,
    })

    if (!res.canceled && res.assets[0]) {
      setImageUri(res.assets[0].uri)
      setResult(null)
      if (res.assets[0].base64) {
        await analyze(res.assets[0].base64)
      }
    }
  }

  async function analyze(base64: string) {
    setLoading(true)
    try {
      // Llama a Supabase Edge Function que proxea Anthropic API
      const { createClient } = await import('@supabase/supabase-js')
      const { supabase } = await import('@/lib/supabase')

      const { data, error } = await supabase.functions.invoke('diagnose-plant', {
        body: { image: base64, plantId: id },
      })

      if (error) throw new Error(error.message)
      setResult(data as DiagnosisResult)
    } catch (e) {
      Alert.alert(
        'Error en diagnostico',
        e instanceof Error ? e.message : 'No se pudo conectar al servicio de diagnostico',
        [{ text: 'OK' }]
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0C1410' }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 80 }}>

        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={{ color: '#52CC64', fontSize: 28 }}>←</Text>
          </TouchableOpacity>
          <View style={{ marginLeft: 12 }}>
            <Text style={{ color: '#E4F2E7', fontSize: 22, fontWeight: '900' }}>Diagnostico IA</Text>
            <Text style={{ color: '#728C74', fontSize: 12 }}>Analisis visual por Claude</Text>
          </View>
        </View>

        {/* Foto seleccionada */}
        {imageUri ? (
          <View style={{ marginBottom: 16 }}>
            <Image
              source={{ uri: imageUri }}
              style={{ width: '100%', height: 240, borderRadius: 16, marginBottom: 12 }}
              resizeMode="cover"
            />
            {!loading && (
              <TouchableOpacity
                onPress={() => { setImageUri(null); setResult(null) }}
                style={{ alignItems: 'center', paddingVertical: 8 }}
              >
                <Text style={{ color: '#728C74', fontSize: 13 }}>Cambiar foto</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          /* Selector de foto */
          <View style={{ gap: 10, marginBottom: 24 }}>
            <TouchableOpacity
              onPress={() => pickImage(true)}
              style={{ backgroundColor: '#131D14', borderRadius: 20, borderWidth: 2, borderColor: '#52CC64', borderStyle: 'dashed', padding: 28, alignItems: 'center' }}
            >
              <Text style={{ fontSize: 40, marginBottom: 8 }}>📷</Text>
              <Text style={{ color: '#E4F2E7', fontWeight: '800', fontSize: 16 }}>Tomar foto</Text>
              <Text style={{ color: '#728C74', fontSize: 12, marginTop: 4, textAlign: 'center' }}>
                Foto clara de hojas o planta completa
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => pickImage(false)}
              style={{ backgroundColor: '#131D14', borderRadius: 16, borderWidth: 1, borderColor: '#1C2E1E', padding: 16, alignItems: 'center' }}
            >
              <Text style={{ color: '#52CC64', fontWeight: '700', fontSize: 14 }}>📂 Elegir de galeria</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Loading */}
        {loading && (
          <View style={{ backgroundColor: '#131D14', borderRadius: 20, borderWidth: 1, borderColor: '#1C2E1E', padding: 32, alignItems: 'center', marginBottom: 20 }}>
            <ActivityIndicator color="#52CC64" size="large" style={{ marginBottom: 16 }} />
            <Text style={{ color: '#E4F2E7', fontWeight: '800', fontSize: 15 }}>Analizando...</Text>
            <Text style={{ color: '#728C74', fontSize: 12, marginTop: 6, textAlign: 'center' }}>
              Claude esta revisando tu planta
            </Text>
          </View>
        )}

        {/* Resultado */}
        {result && !loading && (
          <View style={{ gap: 14 }}>

            {/* Puntuacion de salud */}
            <View style={{ backgroundColor: '#131D14', borderRadius: 20, borderWidth: 1, borderColor: '#1C2E1E', padding: 20 }}>
              <Text style={sectionLabel}>SALUD DETECTADA</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{
                  width: 64, height: 64, borderRadius: 32,
                  backgroundColor: result.healthScore >= 75 ? '#0D2010' : result.healthScore >= 45 ? '#1A1200' : '#1A0606',
                  borderWidth: 3,
                  borderColor: result.healthScore >= 75 ? '#52CC64' : result.healthScore >= 45 ? '#F59E0B' : '#EF4444',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Text style={{
                    color: result.healthScore >= 75 ? '#52CC64' : result.healthScore >= 45 ? '#F59E0B' : '#EF4444',
                    fontSize: 18, fontWeight: '900',
                  }}>
                    {result.healthScore}%
                  </Text>
                </View>
                <Text style={{ color: '#E4F2E7', fontSize: 14, flex: 1, lineHeight: 20 }}>{result.summary}</Text>
              </View>
            </View>

            {/* Problemas detectados */}
            {result.issues.length > 0 && (
              <View style={{ backgroundColor: '#131D14', borderRadius: 20, borderWidth: 1, borderColor: '#1C2E1E', overflow: 'hidden' }}>
                <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: '#1C2E1E' }}>
                  <Text style={sectionLabel}>PROBLEMAS DETECTADOS · {result.issues.length}</Text>
                </View>
                {result.issues.map((issue, i) => (
                  <View key={i} style={{ padding: 16, borderTopWidth: i > 0 ? 1 : 0, borderTopColor: '#1C2E1E' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: SEVERITY_COLOR[issue.severity] }} />
                      <Text style={{ color: '#E4F2E7', fontWeight: '800', fontSize: 14, flex: 1 }}>{issue.name}</Text>
                      <View style={{ backgroundColor: SEVERITY_COLOR[issue.severity] + '22', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                        <Text style={{ color: SEVERITY_COLOR[issue.severity], fontSize: 10, fontWeight: '800', textTransform: 'uppercase' }}>
                          {issue.severity}
                        </Text>
                      </View>
                    </View>
                    <Text style={{ color: '#728C74', fontSize: 13, lineHeight: 18, marginBottom: 8 }}>{issue.description}</Text>
                    <View style={{ backgroundColor: '#0D2010', borderRadius: 10, padding: 10 }}>
                      <Text style={{ color: '#52CC64', fontSize: 12, fontWeight: '700', marginBottom: 2 }}>SOLUCION</Text>
                      <Text style={{ color: '#E4F2E7', fontSize: 13, lineHeight: 18 }}>{issue.solution}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Recomendaciones */}
            {result.recommendations.length > 0 && (
              <View style={{ backgroundColor: '#131D14', borderRadius: 20, borderWidth: 1, borderColor: '#1C2E1E', padding: 16 }}>
                <Text style={sectionLabel}>RECOMENDACIONES</Text>
                {result.recommendations.map((r, i) => (
                  <View key={i} style={{ flexDirection: 'row', gap: 8, marginTop: i > 0 ? 10 : 0 }}>
                    <Text style={{ color: '#52CC64', fontSize: 14 }}>•</Text>
                    <Text style={{ color: '#728C74', fontSize: 13, lineHeight: 18, flex: 1 }}>{r}</Text>
                  </View>
                ))}
              </View>
            )}

          </View>
        )}

        {/* Tip inicial */}
        {!imageUri && !loading && (
          <View style={{ backgroundColor: '#0D2010', borderRadius: 16, padding: 16 }}>
            <Text style={{ color: '#52CC64', fontWeight: '700', fontSize: 12, marginBottom: 6 }}>💡 CONSEJOS PARA MEJOR DIAGNOSTICO</Text>
            {[
              'Foto con buena iluminacion, sin sombras',
              'Enfoca las hojas con posibles problemas',
              'Incluye hoja entera, no solo el problema',
              'Foto nitida, sin movimiento',
            ].map((tip, i) => (
              <Text key={i} style={{ color: '#728C74', fontSize: 12, lineHeight: 20 }}>• {tip}</Text>
            ))}
          </View>
        )}

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
