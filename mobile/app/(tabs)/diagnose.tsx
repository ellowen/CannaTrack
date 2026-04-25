import { useState } from 'react'
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Image } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as ImagePicker from 'expo-image-picker'
import { usePlants } from '@/hooks/usePlants'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

type DiagnosisResult = {
  summary: string
  issues: string[]
  recommendations: string[]
  severity: 'ok' | 'warning' | 'critical'
}

export default function DiagnoseScreen() {
  const { user } = useAuth()
  const { plants } = usePlants()
  const [selectedPlantId, setSelectedPlantId] = useState<string | null>(null)
  const [photoUri, setPhotoUri] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<DiagnosisResult | null>(null)

  const activePlants = plants.filter(p => p.status === 'active')

  async function pickPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a la galeria para analizar fotos.')
      return
    }
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      base64: false,
    })
    if (!picked.canceled && picked.assets[0]) {
      setPhotoUri(picked.assets[0].uri)
      setResult(null)
    }
  }

  async function takePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a la camara.')
      return
    }
    const shot = await ImagePicker.launchCameraAsync({
      quality: 0.7,
      base64: false,
    })
    if (!shot.canceled && shot.assets[0]) {
      setPhotoUri(shot.assets[0].uri)
      setResult(null)
    }
  }

  async function analyze() {
    if (!photoUri || !selectedPlantId || !user) return
    setLoading(true)
    try {
      // Subir foto a Supabase Storage
      const fileName = `${user.id}/${selectedPlantId}/${Date.now()}.jpg`
      const response = await fetch(photoUri)
      const blob = await response.blob()
      const { error: uploadError } = await supabase.storage
        .from('plant-photos')
        .upload(fileName, blob, { contentType: 'image/jpeg', upsert: false })

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage.from('plant-photos').getPublicUrl(fileName)

      // Llamar Edge Function de diagnostico (Claude Vision)
      const { data, error } = await supabase.functions.invoke('diagnose-plant', {
        body: { imageUrl: urlData.publicUrl, plantId: selectedPlantId },
      })

      if (error) throw error
      setResult(data as DiagnosisResult)
    } catch (err) {
      Alert.alert('Error', 'No se pudo analizar la imagen. Intentalo de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const severityColor = { ok: '#52CC64', warning: '#F59E0B', critical: '#EF4444' }
  const severityLabel = { ok: 'Saludable', warning: 'Atencion requerida', critical: 'Problema grave' }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0C1410' }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        <Text style={{ color: '#728C74', fontSize: 11, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 }}>
          IA
        </Text>
        <Text style={{ color: '#E4F2E7', fontSize: 24, fontWeight: '900', marginBottom: 24 }}>
          Diagnostico
        </Text>

        {/* Seleccion de planta */}
        <Text style={{ color: '#728C74', fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>
          Planta
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
          {activePlants.length === 0 ? (
            <Text style={{ color: '#728C74', fontSize: 13 }}>No tenes plantas activas</Text>
          ) : (
            activePlants.map(p => (
              <TouchableOpacity
                key={p.id}
                onPress={() => setSelectedPlantId(p.id)}
                style={{
                  backgroundColor: selectedPlantId === p.id ? '#1A3D1E' : '#131D14',
                  borderWidth: 1,
                  borderColor: selectedPlantId === p.id ? '#52CC64' : '#1C2E1E',
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  marginRight: 8,
                }}
              >
                <Text style={{ color: selectedPlantId === p.id ? '#52CC64' : '#728C74', fontWeight: '700', fontSize: 13 }}>
                  {p.name}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>

        {/* Foto */}
        <Text style={{ color: '#728C74', fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>
          Foto
        </Text>
        {photoUri ? (
          <View style={{ marginBottom: 16 }}>
            <Image source={{ uri: photoUri }} style={{ width: '100%', height: 220, borderRadius: 16, marginBottom: 10 }} resizeMode="cover" />
            <TouchableOpacity onPress={() => { setPhotoUri(null); setResult(null) }}>
              <Text style={{ color: '#728C74', fontSize: 12, textAlign: 'center' }}>Cambiar foto</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
            <TouchableOpacity
              onPress={takePhoto}
              style={{ flex: 1, backgroundColor: '#131D14', borderWidth: 1, borderColor: '#1C2E1E', borderRadius: 16, padding: 20, alignItems: 'center' }}
            >
              <Text style={{ fontSize: 28, marginBottom: 6 }}>📷</Text>
              <Text style={{ color: '#E4F2E7', fontWeight: '700', fontSize: 13 }}>Camara</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={pickPhoto}
              style={{ flex: 1, backgroundColor: '#131D14', borderWidth: 1, borderColor: '#1C2E1E', borderRadius: 16, padding: 20, alignItems: 'center' }}
            >
              <Text style={{ fontSize: 28, marginBottom: 6 }}>🖼️</Text>
              <Text style={{ color: '#E4F2E7', fontWeight: '700', fontSize: 13 }}>Galeria</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Boton analizar */}
        <TouchableOpacity
          onPress={analyze}
          disabled={!photoUri || !selectedPlantId || loading}
          style={{
            backgroundColor: photoUri && selectedPlantId && !loading ? '#52CC64' : '#1C2E1E',
            borderRadius: 16,
            padding: 16,
            alignItems: 'center',
            marginBottom: 24,
          }}
        >
          {loading ? (
            <ActivityIndicator color="#0C1410" />
          ) : (
            <Text style={{ color: photoUri && selectedPlantId ? '#0C1410' : '#3A5040', fontWeight: '900', fontSize: 15 }}>
              Analizar con IA
            </Text>
          )}
        </TouchableOpacity>

        {/* Resultado */}
        {result && (
          <View style={{ backgroundColor: '#131D14', borderRadius: 20, borderWidth: 1, borderColor: '#1C2E1E', padding: 18 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: severityColor[result.severity], marginRight: 8 }} />
              <Text style={{ color: severityColor[result.severity], fontWeight: '900', fontSize: 15 }}>
                {severityLabel[result.severity]}
              </Text>
            </View>
            <Text style={{ color: '#E4F2E7', fontSize: 14, lineHeight: 20, marginBottom: 16 }}>
              {result.summary}
            </Text>
            {result.issues.length > 0 && (
              <>
                <Text style={{ color: '#F59E0B', fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>
                  Problemas detectados
                </Text>
                {result.issues.map((issue, i) => (
                  <Text key={i} style={{ color: '#E4F2E7', fontSize: 13, marginBottom: 4 }}>- {issue}</Text>
                ))}
              </>
            )}
            {result.recommendations.length > 0 && (
              <>
                <Text style={{ color: '#52CC64', fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginTop: 12, marginBottom: 8 }}>
                  Recomendaciones
                </Text>
                {result.recommendations.map((rec, i) => (
                  <Text key={i} style={{ color: '#E4F2E7', fontSize: 13, marginBottom: 4 }}>- {rec}</Text>
                ))}
              </>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
