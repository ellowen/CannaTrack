import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator,
  Image, TextInput, FlatList, Modal, Dimensions, KeyboardAvoidingView, Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { differenceInDays, format } from 'date-fns'
import { es } from 'date-fns/locale'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { awardXP, XP_VALUES } from '@/lib/xp'

const { width: screenWidth } = Dimensions.get('window')
const PHOTO_SIZE = (screenWidth - 48) / 3

interface WeekLog {
  id: string
  weekKey: string
  weekLabel: string
  notes: string
  photoUrl: string | null
}

// Shape returned by Supabase
type WeekLogRow = {
  id: string
  week_label: string
  notes: string | null
  photo_url: string | null
  log_date: string
}

function calcWeekLabel(startDate: Date, logDate: Date): string {
  const days = differenceInDays(logDate, startDate)
  const week = Math.max(1, Math.ceil((days + 1) / 7))
  return `Semana V${week}`
}

function calcWeekKey(startDate: Date, logDate: Date): string {
  const days = differenceInDays(logDate, startDate)
  const week = Math.max(1, Math.ceil((days + 1) / 7))
  return `V${week}`
}

function rowToLog(row: WeekLogRow): WeekLog {
  return {
    id:        row.id,
    weekKey:   row.week_label ?? '',
    weekLabel: row.week_label ?? '',
    notes:     row.notes ?? '',
    photoUrl:  row.photo_url ?? null,
  }
}

// ---------------------------------------------------------------------------
// Edit / Create sheet modal
// ---------------------------------------------------------------------------
interface SheetProps {
  visible: boolean
  weekLabel: string
  existing: WeekLog | null
  plantId: string
  userId: string
  onSaved: (log: WeekLog) => void
  onDeleted: (id: string) => void
  onClose: () => void
}

function WeekLogSheet({ visible, weekLabel, existing, plantId, userId, onSaved, onDeleted, onClose }: SheetProps) {
  const [notes, setNotes]       = useState('')
  const [photoUri, setPhotoUri] = useState<string | null>(null)
  const [saving, setSaving]     = useState(false)

  // Sync form when sheet opens
  useEffect(() => {
    if (visible) {
      setNotes(existing?.notes ?? '')
      setPhotoUri(existing?.photoUrl ?? null)
    }
  }, [visible, existing])

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    })
    if (!result.canceled) setPhotoUri(result.assets[0].uri)
  }

  async function uploadPhoto(uri: string): Promise<string> {
    const response = await fetch(uri)
    const blob     = await response.blob()
    const fileName = `${userId}/${plantId}/${Date.now()}.jpg`
    const { error: uploadErr } = await supabase.storage
      .from('plant-photos')
      .upload(fileName, blob, { contentType: 'image/jpeg' })
    if (uploadErr) throw uploadErr
    return supabase.storage.from('plant-photos').getPublicUrl(fileName).data.publicUrl
  }

  async function handleSave() {
    if (!notes.trim() && !photoUri) return
    setSaving(true)
    try {
      // Determine final photo URL
      let finalPhotoUrl: string | null = existing?.photoUrl ?? null
      const isNewPhoto = photoUri && photoUri !== existing?.photoUrl
      if (isNewPhoto && photoUri) {
        finalPhotoUrl = await uploadPhoto(photoUri)
        awardXP(userId, XP_VALUES.UPLOAD_PHOTO)
      }

      if (existing) {
        // Update
        const { data, error } = await supabase
          .from('week_logs')
          .update({ notes: notes.trim() || null, photo_url: finalPhotoUrl })
          .eq('id', existing.id)
          .select()
          .single()
        if (error) throw error
        onSaved(rowToLog(data as WeekLogRow))
      } else {
        // Insert
        const today     = new Date()
        const { data, error } = await supabase
          .from('week_logs')
          .insert({
            plant_id:   plantId,
            user_id:    userId,
            week_label: weekLabel,
            log_date:   today.toISOString().split('T')[0],
            notes:      notes.trim() || null,
            photo_url:  finalPhotoUrl,
          })
          .select()
          .single()
        if (error) throw error
        onSaved(rowToLog(data as WeekLogRow))
      }
      onClose()
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  function confirmDelete() {
    if (!existing) return
    Alert.alert(
      'Eliminar entrada',
      '¿Seguro que queres eliminar esta entrada? Esta accion no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('week_logs')
                .delete()
                .eq('id', existing.id)
              if (error) throw error
              onDeleted(existing.id)
              onClose()
            } catch (e) {
              Alert.alert('Error', e instanceof Error ? e.message : 'Error al eliminar')
            }
          },
        },
      ]
    )
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, justifyContent: 'flex-end' }}
      >
        {/* Backdrop tap to dismiss */}
        <TouchableOpacity
          style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.6)' }}
          activeOpacity={1}
          onPress={onClose}
        />

        <View style={{ backgroundColor: '#131D14', borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, borderColor: '#1C2E1E', maxHeight: '90%' }}>
          {/* Handle */}
          <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: '#1C2E1E' }} />
          </View>

          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1C2E1E' }}>
            <Text style={{ color: '#52CC64', fontWeight: '800', fontSize: 15 }}>{weekLabel}</Text>
            <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
              <Text style={{ color: '#728C74', fontSize: 20 }}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={{ padding: 20 }} keyboardShouldPersistTaps="handled">
            {/* Photo preview + pick button */}
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={{ width: '100%', height: 200, borderRadius: 12, marginBottom: 12 }} />
            ) : null}
            <TouchableOpacity
              onPress={pickImage}
              style={{ backgroundColor: '#1A3D1E', borderWidth: 2, borderColor: '#2A5A2E', borderStyle: 'dashed', borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 12 }}
            >
              <Text style={{ color: '#52CC64', fontWeight: '700', fontSize: 14 }}>
                {photoUri ? 'Cambiar foto' : 'Agregar foto'}
              </Text>
            </TouchableOpacity>

            {/* Notes input */}
            <TextInput
              style={{ backgroundColor: '#0C1410', borderWidth: 1, borderColor: '#1C2E1E', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, color: '#E4F2E7', fontSize: 14, minHeight: 100, marginBottom: 16, textAlignVertical: 'top' }}
              placeholder="Notas de la semana..."
              placeholderTextColor="#3A5040"
              value={notes}
              onChangeText={setNotes}
              multiline
            />

            {/* Save */}
            <TouchableOpacity
              onPress={handleSave}
              disabled={saving || (!notes.trim() && !photoUri)}
              style={{ backgroundColor: '#52CC64', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginBottom: 10, opacity: (saving || (!notes.trim() && !photoUri)) ? 0.4 : 1 }}
            >
              {saving
                ? <ActivityIndicator color="#0C1410" size="small" />
                : <Text style={{ color: '#0C1410', fontWeight: '900', fontSize: 14 }}>
                    {existing ? 'Guardar cambios' : 'Guardar entrada'}
                  </Text>
              }
            </TouchableOpacity>

            {/* Delete (only when editing) */}
            {existing ? (
              <TouchableOpacity
                onPress={confirmDelete}
                style={{ borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginBottom: 10 }}
              >
                <Text style={{ color: '#FF4444', fontWeight: '700', fontSize: 14 }}>Eliminar entrada</Text>
              </TouchableOpacity>
            ) : null}

            {/* Cancel */}
            <TouchableOpacity
              onPress={onClose}
              style={{ paddingVertical: 12, alignItems: 'center', marginBottom: 8 }}
            >
              <Text style={{ color: '#728C74', fontSize: 14 }}>Cancelar</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------
export default function DiaryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { user } = useAuth()
  const [logs, setLogs]           = useState<WeekLog[]>([])
  const [plantName, setPlantName] = useState('')
  const [startDate, setStartDate] = useState<Date | null>(null)
  const [loading, setLoading]     = useState(true)

  // Lightbox state
  const [lightboxLog, setLightboxLog] = useState<WeekLog | null>(null)

  // Sheet state
  const [sheetVisible, setSheetVisible]   = useState(false)
  const [sheetEditing, setSheetEditing]   = useState<WeekLog | null>(null)
  const [sheetWeekLabel, setSheetWeekLabel] = useState('')

  const loadLogs = useCallback(async () => {
    if (!id || !user) return
    const { data } = await supabase
      .from('week_logs')
      .select('*')
      .eq('plant_id', id)
      .eq('user_id', user.id)
      .order('log_date', { ascending: false })
    setLogs((data ?? []).map((r: WeekLogRow) => rowToLog(r)))
  }, [id, user])

  useEffect(() => {
    async function init() {
      if (!id || !user) return
      const { data: plant } = await supabase
        .from('plants')
        .select('name, start_date')
        .eq('id', id)
        .single()
      if (plant) {
        setPlantName(plant.name as string)
        setStartDate(new Date(plant.start_date as string))
      }
      await loadLogs()
      setLoading(false)
    }
    init()
  }, [id, user])

  function openNewSheet() {
    const label = startDate ? calcWeekLabel(startDate, new Date()) : 'Semana V1'
    setSheetEditing(null)
    setSheetWeekLabel(label)
    setSheetVisible(true)
  }

  function openEditSheet(log: WeekLog) {
    setSheetEditing(log)
    setSheetWeekLabel(log.weekLabel)
    setSheetVisible(true)
  }

  function handleSheetSaved(updated: WeekLog) {
    setLogs(prev => {
      const idx = prev.findIndex(l => l.id === updated.id)
      if (idx !== -1) {
        const next = [...prev]
        next[idx] = updated
        return next
      }
      return [updated, ...prev]
    })
  }

  function handleSheetDeleted(deletedId: string) {
    setLogs(prev => prev.filter(l => l.id !== deletedId))
  }

  const photosLogs = logs.filter(l => l.photoUrl != null)

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

        {/* Galeria de fotos */}
        {photosLogs.length > 0 && (
          <View style={{ marginBottom: 20 }}>
            <Text style={{ color: '#728C74', fontSize: 11, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12 }}>
              FOTOS · {photosLogs.length} {photosLogs.length === 1 ? 'foto' : 'fotos'}
            </Text>
            <FlatList
              data={photosLogs}
              keyExtractor={item => item.id}
              numColumns={3}
              scrollEnabled={false}
              columnWrapperStyle={{ gap: 6 }}
              ItemSeparatorComponent={() => <View style={{ height: 6 }} />}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => setLightboxLog(item)}
                  activeOpacity={0.85}
                >
                  <Image
                    source={{ uri: item.photoUrl! }}
                    style={{ width: PHOTO_SIZE, height: PHOTO_SIZE, borderRadius: 8 }}
                  />
                </TouchableOpacity>
              )}
            />
          </View>
        )}

        {/* Historial */}
        <Text style={{ color: '#728C74', fontSize: 11, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12 }}>
          HISTORIAL · {logs.length} {logs.length === 1 ? 'entrada' : 'entradas'}
        </Text>

        {logs.length === 0 ? (
          <Text style={{ color: '#3A5040', textAlign: 'center', paddingVertical: 20, fontSize: 14 }}>
            Sin entradas todavia
          </Text>
        ) : (
          logs.map(log => (
            <View key={log.id} style={{ backgroundColor: '#131D14', borderRadius: 16, borderWidth: 1, borderColor: '#1C2E1E', padding: 12, marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={{ color: '#52CC64', fontWeight: '800', fontSize: 13 }}>{log.weekLabel}</Text>
                <TouchableOpacity
                  onPress={() => openEditSheet(log)}
                  style={{ padding: 4 }}
                >
                  <Text style={{ fontSize: 16 }}>✏️</Text>
                </TouchableOpacity>
              </View>
              {log.photoUrl ? (
                <TouchableOpacity
                  onPress={() => setLightboxLog(log)}
                  activeOpacity={0.85}
                >
                  <Image source={{ uri: log.photoUrl }} style={{ width: '100%', height: 180, borderRadius: 12, marginBottom: 8 }} />
                </TouchableOpacity>
              ) : null}
              {log.notes ? (
                <Text style={{ color: '#728C74', fontSize: 13, lineHeight: 18 }}>{log.notes}</Text>
              ) : null}
            </View>
          ))
        )}
      </ScrollView>

      {/* FAB — nueva entrada */}
      <TouchableOpacity
        onPress={openNewSheet}
        style={{
          position: 'absolute', bottom: 32, right: 24,
          width: 56, height: 56, borderRadius: 28,
          backgroundColor: '#52CC64',
          alignItems: 'center', justifyContent: 'center',
          shadowColor: '#52CC64', shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
          elevation: 8,
        }}
      >
        <Text style={{ color: '#0C1410', fontSize: 28, lineHeight: 32, fontWeight: '700' }}>+</Text>
      </TouchableOpacity>

      {/* Lightbox */}
      <Modal
        visible={!!lightboxLog}
        transparent
        animationType="fade"
        onRequestClose={() => setLightboxLog(null)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' }}>
          {/* Close button */}
          <TouchableOpacity
            onPress={() => setLightboxLog(null)}
            style={{ position: 'absolute', top: 50, left: 20, zIndex: 10 }}
          >
            <Text style={{ color: 'white', fontSize: 28 }}>✕</Text>
          </TouchableOpacity>

          {/* Edit button */}
          <TouchableOpacity
            onPress={() => {
              const log = lightboxLog
              setLightboxLog(null)
              if (log) openEditSheet(log)
            }}
            style={{ position: 'absolute', top: 50, right: 20, zIndex: 10, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 }}
          >
            <Text style={{ fontSize: 18 }}>✏️</Text>
          </TouchableOpacity>

          {lightboxLog?.photoUrl ? (
            <Image
              source={{ uri: lightboxLog.photoUrl }}
              style={{ width: screenWidth, height: screenWidth }}
              resizeMode="contain"
            />
          ) : null}
          {lightboxLog?.weekLabel ? (
            <Text style={{ color: '#728C74', fontSize: 13, marginTop: 16 }}>{lightboxLog.weekLabel}</Text>
          ) : null}
        </View>
      </Modal>

      {/* Edit / Create sheet */}
      {user && id ? (
        <WeekLogSheet
          visible={sheetVisible}
          weekLabel={sheetWeekLabel}
          existing={sheetEditing}
          plantId={id}
          userId={user.id}
          onSaved={handleSheetSaved}
          onDeleted={handleSheetDeleted}
          onClose={() => setSheetVisible(false)}
        />
      ) : null}
    </SafeAreaView>
  )
}
