import { useState, useEffect, useCallback } from 'react'
import { View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Image, TextInput } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { differenceInDays } from 'date-fns'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { awardXP, XP_VALUES } from '@/lib/xp'

interface DiaryLog {
  id: string
  weekLabel: string
  logDate: Date
  notes: string
  photoUrl: string | null
}

function calcWeekLabel(startDate: Date, logDate: Date): string {
  const days = differenceInDays(logDate, startDate)
  const week = Math.max(1, Math.ceil((days + 1) / 7))
  return `Semana ${week}`
}

function rowToLog(row: Record<string, unknown>): DiaryLog {
  return {
    id:        row.id as string,
    weekLabel: row.week_label as string,
    logDate:   new Date(row.log_date as string),
    notes:     (row.notes as string) ?? '',
    photoUrl:  (row.photo_url as string) ?? null,
  }
}

export default function DiaryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { user } = useAuth()
  const [logs, setLogs]             = useState<DiaryLog[]>([])
  const [plantName, setPlantName]   = useState('')
  const [startDate, setStartDate]   = useState<Date | null>(null)
  const [loading, setLoading]       = useState(true)
  const [newNotes, setNewNotes]     = useState('')
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [uploading, setUploading]   = useState(false)

  const loadLogs = useCallback(async () => {
    if (!id || !user) return
    const { data } = await supabase
      .from('week_logs')
      .select('*')
      .eq('plant_id', id)
      .eq('user_id', user.id)
      .order('log_date', { ascending: false })
    setLogs((data ?? []).map(rowToLog))
  }, [id, user])

  useEffect(() => {
    async function init() {
      if (!id || !user) return
      const [{ data: plant }] = await Promise.all([
        supabase.from('plants').select('name, start_date').eq('id', id).single(),
      ])
      if (plant) {
        setPlantName(plant.name)
        setStartDate(new Date(plant.start_date))
      }
      await loadLogs()
      setLoading(false)
    }
    init()
  }, [id, user])

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    })
    if (!result.canceled) setSelectedImage(result.assets[0].uri)
  }

  async function handleSaveLog() {
    if (!id || !user || (!newNotes.trim() && !selectedImage)) return
    setUploading(true)
    try {
      let photoUrl: string | null = null
      if (selectedImage) {
        const response  = await fetch(selectedImage)
        const blob      = await response.blob()
        const fileName  = `${user.id}/${id}/${Date.now()}.jpg`
        const { error: uploadErr } = await supabase.storage
          .from('plant-photos')
          .upload(fileName, blob, { contentType: 'image/jpeg' })
        if (uploadErr) throw uploadErr
        photoUrl = supabase.storage.from('plant-photos').getPublicUrl(fileName).data.publicUrl
      }

      const today      = new Date()
      const weekLabel  = startDate ? calcWeekLabel(startDate, today) : 'Semana 1'

      await supabase.from('week_logs').insert({
        plant_id:   id,
        user_id:    user.id,
        week_label: weekLabel,
        log_date:   today.toISOString().split('T')[0],
        notes:      newNotes.trim() || null,
        photo_url:  photoUrl,
      })

      setNewNotes('')
      setSelectedImage(null)
      if (photoUrl) awardXP(user.id, XP_VALUES.UPLOAD_PHOTO)
      await loadLogs()
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setUploading(false)
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0C1410', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#52CC64" size="large" />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0C1410' }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>

        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={{ color: '#52CC64', fontSize: 28 }}>←</Text>
          </TouchableOpacity>
          <View style={{ marginLeft: 12 }}>
            <Text style={{ color: '#E4F2E7', fontSize: 22, fontWeight: '900' }}>Diario</Text>
            {plantName ? <Text style={{ color: '#728C74', fontSize: 12 }}>{plantName}</Text> : null}
          </View>
        </View>

        {/* Nueva entrada */}
        <View style={{ backgroundColor: '#131D14', borderRadius: 20, borderWidth: 1, borderColor: '#1C2E1E', padding: 16, marginBottom: 20 }}>
          {selectedImage && (
            <Image source={{ uri: selectedImage }} style={{ width: '100%', height: 200, borderRadius: 12, marginBottom: 12 }} />
          )}
          <TouchableOpacity
            onPress={pickImage}
            style={{ backgroundColor: '#1A3D1E', borderWidth: 2, borderColor: '#2A5A2E', borderStyle: 'dashed', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 12 }}
          >
            <Text style={{ color: '#52CC64', fontSize: 24 }}>📸</Text>
            <Text style={{ color: '#52CC64', fontWeight: '700', fontSize: 14, marginTop: 4 }}>
              {selectedImage ? 'Cambiar foto' : 'Agregar foto'}
            </Text>
          </TouchableOpacity>
          <TextInput
            style={{ backgroundColor: '#0C1410', borderWidth: 1, borderColor: '#1C2E1E', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, color: '#E4F2E7', fontSize: 14, minHeight: 100, marginBottom: 12, textAlignVertical: 'top' }}
            placeholder="Notas de la semana..."
            placeholderTextColor="#3A5040"
            value={newNotes}
            onChangeText={setNewNotes}
            multiline
          />
          {startDate && (
            <Text style={{ color: '#3A5040', fontSize: 11, marginBottom: 10, textAlign: 'center' }}>
              Se guardará en {calcWeekLabel(startDate, new Date())}
            </Text>
          )}
          <TouchableOpacity
            onPress={handleSaveLog}
            disabled={uploading}
            style={{ backgroundColor: '#52CC64', borderRadius: 12, paddingVertical: 12, alignItems: 'center', opacity: uploading ? 0.4 : 1 }}
          >
            {uploading
              ? <ActivityIndicator color="white" size="small" />
              : <Text style={{ color: '#0C1410', fontWeight: '900', fontSize: 14 }}>Guardar entrada →</Text>
            }
          </TouchableOpacity>
        </View>

        {/* Historial */}
        <Text style={{ color: '#728C74', fontSize: 11, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12 }}>
          HISTORIAL · {logs.length} {logs.length === 1 ? 'entrada' : 'entradas'}
        </Text>

        {logs.length === 0 ? (
          <Text style={{ color: '#3A5040', textAlign: 'center', paddingVertical: 20, fontSize: 14 }}>
            Sin entradas todavía
          </Text>
        ) : (
          logs.map(log => (
            <View key={log.id} style={{ backgroundColor: '#131D14', borderRadius: 16, borderWidth: 1, borderColor: '#1C2E1E', padding: 12, marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ color: '#52CC64', fontWeight: '800', fontSize: 13 }}>{log.weekLabel}</Text>
                <Text style={{ color: '#728C74', fontSize: 12 }}>
                  {format(log.logDate, "d MMM yyyy", { locale: es })}
                </Text>
              </View>
              {log.photoUrl ? (
                <Image source={{ uri: log.photoUrl }} style={{ width: '100%', height: 180, borderRadius: 12, marginBottom: 8 }} />
              ) : null}
              {log.notes ? (
                <Text style={{ color: '#728C74', fontSize: 13, lineHeight: 18 }}>{log.notes}</Text>
              ) : null}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
