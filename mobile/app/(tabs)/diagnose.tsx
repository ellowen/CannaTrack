import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, ScrollView, Image, FlatList, ActivityIndicator, Alert, Dimensions } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '@/hooks/useAuth'
import { usePlants } from '@/hooks/usePlants'
import { supabase } from '@/lib/supabase'
import * as ImagePicker from 'expo-image-picker'
import * as ImageManipulator from 'expo-image-manipulator'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

type PhotoLog = {
  id: string
  plantId: string
  photoUrl: string
  week: number
  stage: string
  createdAt: Date
  notes?: string
}

export default function DiagnoseScreen() {
  const { user } = useAuth()
  const { plants } = usePlants()
  const [selectedPlantId, setSelectedPlantId] = useState<string | null>(null)
  const [photos, setPhotos] = useState<PhotoLog[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)

  const selectedPlant = selectedPlantId ? plants.find(p => p.id === selectedPlantId) : null

  useEffect(() => {
    if (selectedPlantId) {
      loadPhotos(selectedPlantId)
    }
  }, [selectedPlantId])

  async function loadPhotos(plantId: string) {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('week_logs')
        .select('id, plant_id, photo_url, week, stage, created_at, notes')
        .eq('plant_id', plantId)
        .not('photo_url', 'is', null)
        .order('created_at', { ascending: false })

      if (error) throw error

      const parsed = (data ?? []).map((p: any) => ({
        id: p.id,
        plantId: p.plant_id,
        photoUrl: p.photo_url,
        week: p.week,
        stage: p.stage,
        createdAt: new Date(p.created_at),
        notes: p.notes,
      }))
      setPhotos(parsed)
    } catch (error) {
      console.error('Error loading photos:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleTakePhoto() {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      })

      if (!result.canceled && selectedPlant) {
        await uploadPhoto(result.assets[0].uri, selectedPlant.id)
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo acceder a la cámara')
      console.error('Camera error:', error)
    }
  }

  async function handleSelectFromGallery() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      })

      if (!result.canceled && selectedPlant) {
        await uploadPhoto(result.assets[0].uri, selectedPlant.id)
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo acceder a la galería')
      console.error('Gallery error:', error)
    }
  }

  async function uploadPhoto(uri: string, plantId: string) {
    if (!user) return

    try {
      setUploading(true)

      // Compress image to max 1024x1024, 0.7 quality, JPEG format
      const compressed = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 1024, height: 1024 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
      )

      const filename = `${user.id}/${plantId}/${Date.now()}.jpg`

      // Convert URI to Blob using fetch
      const response = await fetch(compressed.uri)
      const blob = await response.blob()

      // Upload Blob to Supabase storage
      const { data, error: uploadError } = await supabase.storage
        .from('plant_photos')
        .upload(filename, blob, {
          contentType: 'image/jpeg',
          upsert: false,
        })

      if (uploadError) throw uploadError

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('plant_photos')
        .getPublicUrl(data.path)

      // Save to week_logs
      const { error: insertError } = await supabase
        .from('week_logs')
        .insert({
          user_id: user.id,
          plant_id: plantId,
          photo_url: urlData.publicUrl,
          week: selectedPlant?.floraStartDate ? Math.ceil((Date.now() - selectedPlant.floraStartDate.getTime()) / (7 * 24 * 60 * 60 * 1000)) : 0,
          stage: selectedPlant?.floraStartDate ? 'FLORA' : 'VEGE',
          notes: '',
        })

      if (insertError) throw insertError

      Alert.alert('Exito', 'Foto subida correctamente')
      loadPhotos(plantId)
    } catch (error) {
      Alert.alert('Error', 'No se pudo subir la foto')
      console.error('Upload error:', error)
    } finally {
      setUploading(false)
    }
  }

  if (plants.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0C1410', alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ alignItems: 'center', gap: 12 }}>
          <Text style={{ fontSize: 40 }}>📭</Text>
          <Text style={{ color: '#728C74', fontSize: 13 }}>Sin plantas activas</Text>
          <Text style={{ color: '#3A5040', fontSize: 12, maxWidth: 250, textAlign: 'center' }}>
            Crea tu primera planta para comenzar a documentar el crecimiento
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0C1410' }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>

        {/* Header */}
        <View style={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 20 }}>
          <Text style={{ color: '#E4F2E7', fontSize: 24, fontWeight: '900' }}>
            Diario Fotográfico
          </Text>
          <Text style={{ color: '#728C74', fontSize: 13, marginTop: 8, lineHeight: 18 }}>
            Documenta el crecimiento de tu planta semana a semana. Pronto: diagnóstico automático con IA.
          </Text>
        </View>

        {/* Plant Selector */}
        <View style={{ paddingHorizontal: 16, marginBottom: 20 }}>
          <Text style={sectionLabel}>Selecciona una planta</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: -12 }}>
            <View style={{ flexDirection: 'row', gap: 10, paddingBottom: 12 }}>
              {plants.map(plant => (
                <TouchableOpacity
                  key={plant.id}
                  onPress={() => setSelectedPlantId(plant.id)}
                  style={{
                    paddingVertical: 10,
                    paddingHorizontal: 14,
                    borderRadius: 10,
                    backgroundColor: selectedPlantId === plant.id ? '#52CC64' : '#131D14',
                    borderWidth: 1,
                    borderColor: selectedPlantId === plant.id ? '#52CC64' : '#1C2E1E',
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={{
                    color: selectedPlantId === plant.id ? '#0C1410' : '#E4F2E7',
                    fontSize: 13,
                    fontWeight: '700',
                  }}>
                    {plant.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {selectedPlant && (
          <>
            {/* Action Buttons */}
            <View style={{ paddingHorizontal: 16, gap: 10, marginBottom: 24 }}>
              <TouchableOpacity
                onPress={handleTakePhoto}
                disabled={uploading}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  paddingVertical: 16,
                  backgroundColor: uploading ? '#1C2E1E' : '#131D14',
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: '#1C2E1E',
                  opacity: uploading ? 0.5 : 1,
                }}
                activeOpacity={0.8}
              >
                {uploading ? (
                  <ActivityIndicator color="#52CC64" size="small" />
                ) : (
                  <>
                    <Text style={{ fontSize: 18 }}>📷</Text>
                    <Text style={{ color: '#E4F2E7', fontSize: 16, fontWeight: '700' }}>
                      Tomar foto
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSelectFromGallery}
                disabled={uploading}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  paddingVertical: 16,
                  backgroundColor: uploading ? '#1C2E1E' : '#131D14',
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: '#1C2E1E',
                  opacity: uploading ? 0.5 : 1,
                }}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 18 }}>🖼️</Text>
                <Text style={{ color: '#E4F2E7', fontSize: 16, fontWeight: '700' }}>
                  Galería
                </Text>
              </TouchableOpacity>
            </View>

            {/* Photo Gallery */}
            {loading ? (
              <View style={{ paddingHorizontal: 16, paddingVertical: 40, alignItems: 'center' }}>
                <ActivityIndicator color="#52CC64" size="large" />
              </View>
            ) : photos.length === 0 ? (
              <View style={{ paddingHorizontal: 16 }}>
                <View style={{
                  backgroundColor: '#131D14',
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: '#1C2E1E',
                  padding: 24,
                  alignItems: 'center',
                  gap: 12,
                }}>
                  <Text style={{ fontSize: 32 }}>📸</Text>
                  <Text style={{ color: '#728C74', fontSize: 13, textAlign: 'center' }}>
                    Sin fotos aún
                  </Text>
                  <Text style={{ color: '#3A5040', fontSize: 12, textAlign: 'center' }}>
                    Sube tu primera foto para documentar el crecimiento
                  </Text>
                </View>
              </View>
            ) : (
              <View style={{ paddingHorizontal: 16 }}>
                <Text style={sectionLabel}>Historial de fotos ({photos.length})</Text>
                <View style={{ gap: 12 }}>
                  {photos.map(photo => (
                    <View
                      key={photo.id}
                      style={{
                        backgroundColor: '#131D14',
                        borderRadius: 14,
                        borderWidth: 1,
                        borderColor: '#1C2E1E',
                        overflow: 'hidden',
                      }}
                    >
                      <Image
                        source={{ uri: photo.photoUrl }}
                        style={{ width: '100%', height: 200, backgroundColor: '#0C1410' }}
                      />
                      <View style={{ padding: 12, gap: 8 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                          <Text style={{ color: '#E4F2E7', fontSize: 13, fontWeight: '700' }}>
                            Semana {photo.week} · {photo.stage}
                          </Text>
                        </View>
                        <Text style={{ color: '#728C74', fontSize: 11 }}>
                          {format(photo.createdAt, "d MMM yyyy, HH:mm", { locale: es })}
                        </Text>
                        {photo.notes && (
                          <Text style={{ color: '#A78BFA', fontSize: 12, marginTop: 4 }}>
                            {photo.notes}
                          </Text>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </>
        )}

        {/* AI Diagnosis Coming Soon */}
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
              Diagnóstico por IA - Próximamente
            </Text>
            <Text style={{ color: '#8B5CF6', fontSize: 11, textAlign: 'center', lineHeight: 15 }}>
              Análisis automático de plagas, enfermedades y deficiencias nutricionales con Claude Vision
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
