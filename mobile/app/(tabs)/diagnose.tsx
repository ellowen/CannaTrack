import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, ScrollView, Image, ActivityIndicator, Alert, Dimensions } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { useAuth } from '@/hooks/useAuth'
import { usePlants } from '@/hooks/usePlants'
import { supabase } from '@/lib/supabase'
import * as ImagePicker from 'expo-image-picker'
import * as ImageManipulator from 'expo-image-manipulator'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Plant } from '@shared/types/plant'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const PHOTO_GRID_SIZE = (SCREEN_WIDTH - 48) / 2

type PhotoLog = {
  id: string
  plantId: string
  photoUrl: string
  weekLabel: string
  stage: string
  createdAt: Date
  notes?: string
}

type WeekLogRow = {
  id: string
  plant_id: string
  photo_url: string
  week?: number | null
  stage?: string | null
  created_at: string
  notes: string | null
  week_label?: string | null
}

export default function DiagnoseScreen() {
  const { user } = useAuth()
  const { plants } = usePlants()
  const [selectedPlantId, setSelectedPlantId] = useState<string | null>(null)
  const [photos, setPhotos]     = useState<PhotoLog[]>([])
  const [loading, setLoading]   = useState(false)
  const [uploading, setUploading] = useState(false)

  const activePlants = plants.filter(p => p.status === 'active')
  const selectedPlant = selectedPlantId ? activePlants.find(p => p.id === selectedPlantId) : null

  // Auto-select first plant
  useEffect(() => {
    if (activePlants.length > 0 && !selectedPlantId) {
      setSelectedPlantId(activePlants[0].id)
    }
  }, [activePlants.length])

  useEffect(() => {
    if (selectedPlantId) loadPhotos(selectedPlantId)
  }, [selectedPlantId])

  async function loadPhotos(plantId: string) {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('week_logs')
        .select('id, plant_id, photo_url, week, stage, created_at, notes, week_label')
        .eq('plant_id', plantId)
        .not('photo_url', 'is', null)
        .order('created_at', { ascending: false })
      if (error) throw error
      setPhotos((data ?? []).map((p: WeekLogRow) => ({
        id:        p.id,
        plantId:   p.plant_id,
        photoUrl:  p.photo_url,
        weekLabel: p.week_label ?? (p.week ? `Semana ${p.week}` : ''),
        stage:     p.stage ?? '',
        createdAt: new Date(p.created_at),
        notes:     p.notes ?? undefined,
      })))
    } catch (e) {
      console.error('Error loading photos:', e)
    } finally {
      setLoading(false)
    }
  }

  async function handlePickPhoto(source: 'camera' | 'gallery') {
    if (!selectedPlant || !user) return
    try {
      const result = source === 'camera'
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [4, 3], quality: 0.8 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [4, 3], quality: 0.8 })
      if (!result.canceled) {
        await uploadPhoto(result.assets[0].uri, selectedPlant)
      }
    } catch (e) {
      Alert.alert('Error', source === 'camera' ? 'No se pudo acceder a la camara' : 'No se pudo acceder a la galeria')
    }
  }

  async function uploadPhoto(uri: string, plant: Plant) {
    if (!user) return
    setUploading(true)
    try {
      const compressed = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 1024, height: 1024 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
      )
      const filename = `${user.id}/${plant.id}/${Date.now()}.jpg`
      const response = await fetch(compressed.uri)
      const blob = await response.blob()
      const { data, error: uploadError } = await supabase.storage
        .from('plant_photos')
        .upload(filename, blob, { contentType: 'image/jpeg', upsert: false })
      if (uploadError) throw uploadError
      const { data: urlData } = supabase.storage.from('plant_photos').getPublicUrl(data.path)
      const isFlora = !!plant.floraStartDate
      const weekNum = isFlora && plant.floraStartDate
        ? Math.max(1, Math.ceil((Date.now() - plant.floraStartDate.getTime()) / (7 * 24 * 60 * 60 * 1000)))
        : Math.max(1, Math.ceil((Date.now() - plant.startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)))
      const weekLabel = `Semana ${isFlora ? 'F' : 'V'}${weekNum}`
      await supabase.from('week_logs').insert({
        user_id:    user.id,
        plant_id:   plant.id,
        photo_url:  urlData.publicUrl,
        week_label: weekLabel,
        week:       weekNum,
        stage:      isFlora ? 'FLORA' : 'VEGE',
        log_date:   new Date().toISOString().split('T')[0],
        notes:      '',
      })
      await loadPhotos(plant.id)
    } catch (e) {
      Alert.alert('Error', 'No se pudo subir la foto')
      console.error('Upload error:', e)
    } finally {
      setUploading(false)
    }
  }

  if (activePlants.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#080E09', alignItems: 'center', justifyContent: 'center' }}>
        <LinearGradient colors={['#0D0A1A', '#080E09']} style={{ borderRadius: 24, borderWidth: 1, borderColor: '#1A1530', padding: 40, alignItems: 'center', marginHorizontal: 32 }}>
          <Text style={{ fontSize: 48, marginBottom: 14 }}>📷</Text>
          <Text style={{ color: '#E4F2E7', fontWeight: '900', fontSize: 17, textAlign: 'center' }}>Sin plantas activas</Text>
          <Text style={{ color: '#4A3070', fontSize: 13, marginTop: 8, textAlign: 'center', lineHeight: 20 }}>
            Crea una planta para{'\n'}empezar a documentar
          </Text>
        </LinearGradient>
      </SafeAreaView>
    )
  }

  const isFlora = !!selectedPlant?.floraStartDate

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#080E09' }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <LinearGradient
          colors={['#150D28', '#0D0820', '#080E09']}
          style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24, borderBottomWidth: 1, borderBottomColor: 'rgba(139,92,246,0.1)' }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <View style={{ backgroundColor: 'rgba(167,139,250,0.12)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(167,139,250,0.25)' }}>
              <Text style={{ color: '#A78BFA', fontSize: 13, fontWeight: '800', letterSpacing: 1 }}>FOTOS</Text>
            </View>
          </View>
          <Text style={{ color: '#E4F2E7', fontSize: 28, fontWeight: '900', letterSpacing: -0.5 }}>Diario visual</Text>
          <Text style={{ color: '#6D4FB0', fontSize: 13, marginTop: 4, lineHeight: 18 }}>
            Documenta el crecimiento semana a semana
          </Text>
        </LinearGradient>

        <View style={{ paddingHorizontal: 16, paddingTop: 16, gap: 20 }}>

          {/* Plant selector */}
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <View style={{ width: 4, height: 14, borderRadius: 2, backgroundColor: '#A78BFA' }} />
              <Text style={{ color: '#728C74', fontSize: 13, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' }}>
                Planta
              </Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -4 }}>
              <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 4 }}>
                {activePlants.map(plant => {
                  const isSelected = selectedPlantId === plant.id
                  const pFlora = !!plant.floraStartDate
                  return (
                    <TouchableOpacity
                      key={plant.id}
                      onPress={() => setSelectedPlantId(plant.id)}
                      activeOpacity={0.8}
                    >
                      {isSelected ? (
                        <LinearGradient
                          colors={pFlora ? ['#D97706', '#B45309'] : ['#7C3AED', '#5B21B6']}
                          style={{ borderRadius: 12, paddingVertical: 9, paddingHorizontal: 14 }}
                        >
                          <Text style={{ color: '#fff', fontWeight: '900', fontSize: 13 }}>{plant.name}</Text>
                          <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, marginTop: 1 }}>
                            {pFlora ? 'FLORA' : 'VEGE'}
                          </Text>
                        </LinearGradient>
                      ) : (
                        <View style={{ borderRadius: 12, paddingVertical: 9, paddingHorizontal: 14, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: '#1C2E1E' }}>
                          <Text style={{ color: '#8AAF8E', fontWeight: '700', fontSize: 13 }}>{plant.name}</Text>
                          <Text style={{ color: '#3A5040', fontSize: 12, marginTop: 1 }}>
                            {pFlora ? 'FLORA' : 'VEGE'}
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  )
                })}
              </View>
            </ScrollView>
          </View>

          {/* Upload buttons */}
          {selectedPlant && (
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                onPress={() => handlePickPhoto('camera')}
                disabled={uploading}
                activeOpacity={0.85}
                style={{ flex: 1 }}
              >
                <LinearGradient
                  colors={uploading ? ['#110D1E', '#0D0A18'] : ['#1A1030', '#100A22']}
                  style={{ borderRadius: 18, borderWidth: 1, borderColor: uploading ? '#1A1530' : 'rgba(167,139,250,0.3)', paddingVertical: 20, paddingHorizontal: 14, alignItems: 'center', gap: 8, opacity: uploading ? 0.5 : 1 }}
                >
                  {uploading
                    ? <ActivityIndicator color="#A78BFA" size="large" />
                    : <>
                        <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: 'rgba(167,139,250,0.15)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(167,139,250,0.2)' }}>
                          <Text style={{ fontSize: 24 }}>📷</Text>
                        </View>
                        <Text style={{ color: '#E4F2E7', fontWeight: '900', fontSize: 15 }}>Camara</Text>
                        <Text style={{ color: '#6D4FB0', fontSize: 12, textAlign: 'center' }}>Foto nueva</Text>
                      </>
                  }
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handlePickPhoto('gallery')}
                disabled={uploading}
                activeOpacity={0.85}
                style={{ flex: 1 }}
              >
                <LinearGradient
                  colors={uploading ? ['#110D1E', '#0D0A18'] : ['#1A1030', '#100A22']}
                  style={{ borderRadius: 18, borderWidth: 1, borderColor: uploading ? '#1A1530' : 'rgba(167,139,250,0.3)', paddingVertical: 20, paddingHorizontal: 14, alignItems: 'center', gap: 8, opacity: uploading ? 0.5 : 1 }}
                >
                  <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: 'rgba(167,139,250,0.15)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(167,139,250,0.2)' }}>
                    <Text style={{ fontSize: 24 }}>🖼️</Text>
                  </View>
                  <Text style={{ color: '#E4F2E7', fontWeight: '900', fontSize: 15 }}>Galeria</Text>
                  <Text style={{ color: '#6D4FB0', fontSize: 12, textAlign: 'center' }}>Desde el rol</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}

          {/* Photo grid */}
          {selectedPlant && (
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <View style={{ width: 4, height: 14, borderRadius: 2, backgroundColor: '#728C74' }} />
                <Text style={{ color: '#728C74', fontSize: 13, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' }}>
                  Fotos ({photos.length})
                </Text>
              </View>

              {loading ? (
                <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                  <ActivityIndicator color="#A78BFA" size="large" />
                </View>
              ) : photos.length === 0 ? (
                <LinearGradient
                  colors={['#0D0A1A', '#080E09']}
                  style={{ borderRadius: 20, borderWidth: 1, borderColor: '#1A1530', borderStyle: 'dashed', padding: 48, alignItems: 'center' }}
                >
                  <Text style={{ fontSize: 44, marginBottom: 14 }}>📸</Text>
                  <Text style={{ color: '#E8E4F5', fontWeight: '900', fontSize: 16 }}>Sin fotos todavia</Text>
                  <Text style={{ color: '#4A3070', fontSize: 13, marginTop: 6, textAlign: 'center', lineHeight: 20 }}>
                    Sube tu primera foto{'\n'}para documentar el crecimiento
                  </Text>
                </LinearGradient>
              ) : (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {photos.map(photo => {
                    const isFloraPhoto = photo.weekLabel.includes('F')
                    const labelColor = isFloraPhoto ? '#F59E0B' : '#52CC64'
                    return (
                      <View key={photo.id} style={{ width: PHOTO_GRID_SIZE, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#1C2E1E' }}>
                        <Image
                          source={{ uri: photo.photoUrl }}
                          style={{ width: PHOTO_GRID_SIZE, height: PHOTO_GRID_SIZE, backgroundColor: '#0C1009' }}
                          resizeMode="cover"
                        />
                        {/* Overlay */}
                        <LinearGradient
                          colors={['transparent', 'rgba(0,0,0,0.8)']}
                          style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 10 }}
                        >
                          {photo.weekLabel ? (
                            <Text style={{ color: labelColor, fontSize: 11, fontWeight: '800' }}>{photo.weekLabel}</Text>
                          ) : null}
                          <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, marginTop: 1 }}>
                            {format(photo.createdAt, "d MMM", { locale: es })}
                          </Text>
                        </LinearGradient>
                      </View>
                    )
                  })}
                </View>
              )}
            </View>
          )}

          {/* AI coming soon */}
          <LinearGradient
            colors={['#150D28', '#100A20']}
            style={{ borderRadius: 20, borderWidth: 1, borderColor: 'rgba(139,92,246,0.25)', padding: 20 }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(139,92,246,0.15)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(139,92,246,0.25)' }}>
                <Text style={{ fontSize: 20 }}>🤖</Text>
              </View>
              <View>
                <Text style={{ color: '#A78BFA', fontWeight: '900', fontSize: 15 }}>Diagnostico por IA</Text>
                <View style={{ backgroundColor: 'rgba(167,139,250,0.15)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, marginTop: 3, alignSelf: 'flex-start' }}>
                  <Text style={{ color: '#A78BFA', fontSize: 11, fontWeight: '800', letterSpacing: 0.8 }}>PROXIMO</Text>
                </View>
              </View>
            </View>
            <Text style={{ color: '#6D4FB0', fontSize: 13, lineHeight: 19 }}>
              Analisis automatico de plagas, enfermedades y deficiencias nutricionales con vision IA. Sube una foto y obtene un diagnostico en segundos.
            </Text>
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 14, flexWrap: 'wrap' }}>
              {['Plagas 🪲', 'Hongos 🍄', 'Deficiencias 🌿', 'pH stress 💧'].map(tag => (
                <View key={tag} style={{ backgroundColor: 'rgba(139,92,246,0.1)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(139,92,246,0.15)' }}>
                  <Text style={{ color: '#7C3AED', fontSize: 11, fontWeight: '600' }}>{tag}</Text>
                </View>
              ))}
            </View>
          </LinearGradient>

        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
