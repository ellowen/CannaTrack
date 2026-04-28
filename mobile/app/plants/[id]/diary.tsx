import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator,
  Image, TextInput, FlatList, Modal, Dimensions, KeyboardAvoidingView, Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { BackIcon } from '@/components/icons/AppIcons'
import { router, useLocalSearchParams } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { differenceInDays } from 'date-fns'
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
  logDate: string
}

type WeekLogRow = {
  id: string
  week_label: string
  notes: string | null
  photo_url: string | null
  log_date: string
}

function calcWeekLabel(startDate: Date, logDate: Date, floraStartDate: Date | null): string {
  if (floraStartDate) {
    const daysInFlora = differenceInDays(logDate, floraStartDate)
    if (daysInFlora >= 0) {
      const week = Math.max(1, Math.ceil((daysInFlora + 1) / 7))
      return `Semana F${week}`
    }
  }
  const days = differenceInDays(logDate, startDate)
  const week = Math.max(1, Math.ceil((days + 1) / 7))
  return `Semana V${week}`
}

function rowToLog(row: WeekLogRow): WeekLog {
  return {
    id:        row.id,
    weekKey:   row.week_label ?? '',
    weekLabel: row.week_label ?? '',
    notes:     row.notes ?? '',
    photoUrl:  row.photo_url ?? null,
    logDate:   row.log_date ?? '',
  }
}

function weekLabelColor(label: string): string {
  if (label.includes('F')) return '#F59E0B'
  return '#52CC64'
}

// ---------------------------------------------------------------------------
// Sheet modal
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
  const [notes, setNotes]     = useState('')
  const [photoUri, setPhotoUri] = useState<string | null>(null)
  const [saving, setSaving]   = useState(false)

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
      let finalPhotoUrl: string | null = existing?.photoUrl ?? null
      const isNewPhoto = photoUri && photoUri !== existing?.photoUrl
      if (isNewPhoto && photoUri) {
        finalPhotoUrl = await uploadPhoto(photoUri)
        awardXP(userId, XP_VALUES.UPLOAD_PHOTO)
      }

      if (existing) {
        const { data, error } = await supabase
          .from('week_logs')
          .update({ notes: notes.trim() || null, photo_url: finalPhotoUrl })
          .eq('id', existing.id)
          .select()
          .maybeSingle()
        if (error) throw error
        onSaved(rowToLog(data as WeekLogRow))
      } else {
        const today = new Date()
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
          .maybeSingle()
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
      'Esta accion no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase.from('week_logs').delete().eq('id', existing.id)
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

  const accentColor = weekLabelColor(weekLabel)
  const isFlora = weekLabel.includes('F')
  const canSave = !saving && (!!notes.trim() || !!photoUri)

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, justifyContent: 'flex-end' }}>
        <TouchableOpacity
          style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.65)' }}
          activeOpacity={1}
          onPress={onClose}
        />
        <LinearGradient
          colors={isFlora ? ['#1A1200', '#0E0900', '#080E09'] : ['#0E1A0F', '#080E09']}
          style={{ borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, borderColor: isFlora ? '#2A1E00' : '#1C2E1E', maxHeight: '92%' }}
        >
          {/* Handle */}
          <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 2 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: isFlora ? '#3A2800' : '#1C2E1E' }} />
          </View>

          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: isFlora ? '#2A1E00' : '#1C2E1E' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: accentColor }} />
              <Text style={{ color: accentColor, fontWeight: '900', fontSize: 16 }}>{weekLabel}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#728C74', fontSize: 16 }}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={{ padding: 20 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

            {/* Photo */}
            {photoUri ? (
              <TouchableOpacity onPress={pickImage} activeOpacity={0.9} style={{ marginBottom: 12 }}>
                <Image source={{ uri: photoUri }} style={{ width: '100%', height: 220, borderRadius: 16 }} />
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.6)']}
                  style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 64, borderBottomLeftRadius: 16, borderBottomRightRadius: 16, justifyContent: 'flex-end', paddingHorizontal: 12, paddingBottom: 10 }}
                >
                  <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '600' }}>Toca para cambiar</Text>
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={pickImage}
                style={{ borderRadius: 16, borderWidth: 1.5, borderColor: isFlora ? '#3A2800' : '#1C3A20', borderStyle: 'dashed', padding: 28, alignItems: 'center', marginBottom: 14, backgroundColor: isFlora ? 'rgba(245,158,11,0.04)' : 'rgba(82,204,100,0.04)' }}
              >
                <Text style={{ fontSize: 32, marginBottom: 8 }}>📷</Text>
                <Text style={{ color: accentColor, fontWeight: '700', fontSize: 14 }}>Agregar foto</Text>
                <Text style={{ color: '#3A5040', fontSize: 11, marginTop: 3 }}>JPG, cuadrada, max 5MB</Text>
              </TouchableOpacity>
            )}

            {/* Notes */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{ color: '#728C74', fontSize: 11, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8 }}>Notas</Text>
              <TextInput
                style={{ backgroundColor: 'rgba(0,0,0,0.3)', borderWidth: 1, borderColor: '#1C2E1E', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, color: '#E4F2E7', fontSize: 14, minHeight: 110, textAlignVertical: 'top' }}
                placeholder="Que observas esta semana? Altura, aromas, color de hojas..."
                placeholderTextColor="#2D4030"
                value={notes}
                onChangeText={setNotes}
                multiline
              />
            </View>

            {/* Save */}
            <TouchableOpacity onPress={handleSave} disabled={!canSave} activeOpacity={0.85} style={{ borderRadius: 14, overflow: 'hidden', marginBottom: 10 }}>
              <LinearGradient
                colors={isFlora ? ['#D97706', '#B45309'] : ['#52CC64', '#3DAA50']}
                style={{ paddingVertical: 15, alignItems: 'center', opacity: canSave ? 1 : 0.35 }}
              >
                {saving
                  ? <ActivityIndicator color={isFlora ? '#1A1200' : '#0C1410'} size="small" />
                  : <Text style={{ color: isFlora ? '#1A0F00' : '#0C1410', fontWeight: '900', fontSize: 15 }}>
                      {existing ? 'Guardar cambios' : 'Guardar entrada'}
                    </Text>
                }
              </LinearGradient>
            </TouchableOpacity>

            {existing && (
              <TouchableOpacity onPress={confirmDelete} style={{ paddingVertical: 14, alignItems: 'center', marginBottom: 6 }}>
                <Text style={{ color: '#EF4444', fontWeight: '700', fontSize: 13 }}>Eliminar entrada</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity onPress={onClose} style={{ paddingVertical: 12, alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ color: '#3A5040', fontSize: 13 }}>Cancelar</Text>
            </TouchableOpacity>

          </ScrollView>
        </LinearGradient>
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

  const [logs, setLogs]               = useState<WeekLog[]>([])
  const [plantName, setPlantName]     = useState('')
  const [startDate, setStartDate]     = useState<Date | null>(null)
  const [floraStartDate, setFloraStartDate] = useState<Date | null>(null)
  const [loading, setLoading]         = useState(true)
  const [lightboxLog, setLightboxLog] = useState<WeekLog | null>(null)
  const [sheetVisible, setSheetVisible]     = useState(false)
  const [sheetEditing, setSheetEditing]     = useState<WeekLog | null>(null)
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
        .select('name, start_date, flora_start_date')
        .eq('id', id)
        .maybeSingle()
      if (plant) {
        setPlantName(plant.name as string)
        setStartDate(new Date(plant.start_date as string))
        setFloraStartDate(plant.flora_start_date ? new Date(plant.flora_start_date as string) : null)
      }
      await loadLogs()
      setLoading(false)
    }
    init()
  }, [id, user])

  function openNewSheet() {
    const label = startDate
      ? calcWeekLabel(startDate, new Date(), floraStartDate)
      : 'Semana V1'
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
  const isFlora = !!floraStartDate

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#080E09', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#52CC64" size="large" />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#080E09' }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <LinearGradient
          colors={isFlora ? ['#1A1000', '#100900', '#080E09'] : ['#0A1A0B', '#060E07', '#080E09']}
          style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' }}
            >
              <BackIcon size={20} color={isFlora ? '#F59E0B' : '#52CC64'} />
            </TouchableOpacity>
            <View style={{
              borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4,
              backgroundColor: isFlora ? 'rgba(245,158,11,0.12)' : 'rgba(82,204,100,0.12)',
              borderWidth: 1, borderColor: isFlora ? 'rgba(245,158,11,0.25)' : 'rgba(82,204,100,0.25)',
            }}>
              <Text style={{ color: isFlora ? '#F59E0B' : '#52CC64', fontSize: 11, fontWeight: '800', letterSpacing: 1 }}>
                {isFlora ? 'FLORA' : 'VEGE'}
              </Text>
            </View>
          </View>

          <Text style={{ color: '#E4F2E7', fontSize: 28, fontWeight: '900', letterSpacing: -0.5 }}>Diario</Text>
          {plantName ? (
            <Text style={{ color: isFlora ? '#B45309' : '#3DAA50', fontSize: 13, marginTop: 3, opacity: 0.9 }}>{plantName}</Text>
          ) : null}

          {/* Stats row */}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
            <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, borderWidth: 1, borderColor: isFlora ? '#2A1E00' : '#1C2E1E', padding: 12, alignItems: 'center' }}>
              <Text style={{ color: '#E4F2E7', fontSize: 22, fontWeight: '900' }}>{logs.length}</Text>
              <Text style={{ color: '#3A5040', fontSize: 10, fontWeight: '600', marginTop: 1 }}>entradas</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, borderWidth: 1, borderColor: isFlora ? '#2A1E00' : '#1C2E1E', padding: 12, alignItems: 'center' }}>
              <Text style={{ color: '#E4F2E7', fontSize: 22, fontWeight: '900' }}>{photosLogs.length}</Text>
              <Text style={{ color: '#3A5040', fontSize: 10, fontWeight: '600', marginTop: 1 }}>fotos</Text>
            </View>
            <TouchableOpacity
              onPress={openNewSheet}
              activeOpacity={0.85}
              style={{ flex: 1, borderRadius: 14, overflow: 'hidden' }}
            >
              <LinearGradient
                colors={isFlora ? ['#D97706', '#B45309'] : ['#52CC64', '#3DAA50']}
                style={{ flex: 1, padding: 12, alignItems: 'center', justifyContent: 'center' }}
              >
                <Text style={{ color: isFlora ? '#1A0F00' : '#0C1410', fontSize: 22, fontWeight: '900', lineHeight: 26 }}>+</Text>
                <Text style={{ color: isFlora ? '#1A0F00' : '#0C1410', fontSize: 10, fontWeight: '800', marginTop: 1 }}>nueva</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <View style={{ paddingHorizontal: 16, paddingTop: 8, gap: 20 }}>

          {/* Galeria de fotos */}
          {photosLogs.length > 0 && (
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <View style={{ width: 4, height: 14, borderRadius: 2, backgroundColor: isFlora ? '#F59E0B' : '#52CC64' }} />
                <Text style={{ color: '#728C74', fontSize: 11, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' }}>
                  Galeria ({photosLogs.length})
                </Text>
              </View>
              <LinearGradient
                colors={['#131A10', '#0C1009']}
                style={{ borderRadius: 20, borderWidth: 1, borderColor: '#1C2E1E', padding: 12 }}
              >
                <FlatList
                  data={photosLogs}
                  keyExtractor={item => item.id}
                  numColumns={3}
                  scrollEnabled={false}
                  columnWrapperStyle={{ gap: 6 }}
                  ItemSeparatorComponent={() => <View style={{ height: 6 }} />}
                  renderItem={({ item }) => (
                    <TouchableOpacity onPress={() => setLightboxLog(item)} activeOpacity={0.85} style={{ position: 'relative' }}>
                      <Image
                        source={{ uri: item.photoUrl! }}
                        style={{ width: PHOTO_SIZE, height: PHOTO_SIZE, borderRadius: 10 }}
                      />
                      {/* Week badge overlay */}
                      <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.75)']}
                        style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 36, borderBottomLeftRadius: 10, borderBottomRightRadius: 10, justifyContent: 'flex-end', paddingHorizontal: 5, paddingBottom: 5 }}
                      >
                        <Text style={{ color: weekLabelColor(item.weekLabel), fontSize: 9, fontWeight: '800' }}>
                          {item.weekLabel.replace('Semana ', '')}
                        </Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  )}
                />
              </LinearGradient>
            </View>
          )}

          {/* Historial */}
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <View style={{ width: 4, height: 14, borderRadius: 2, backgroundColor: '#728C74' }} />
              <Text style={{ color: '#728C74', fontSize: 11, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' }}>
                Historial ({logs.length})
              </Text>
            </View>

            {logs.length === 0 ? (
              <LinearGradient
                colors={['#0D1A0F', '#080E09']}
                style={{ borderRadius: 20, borderWidth: 1, borderColor: '#1C2E1E', borderStyle: 'dashed', padding: 48, alignItems: 'center' }}
              >
                <Text style={{ fontSize: 44, marginBottom: 14 }}>📖</Text>
                <Text style={{ color: '#E8F5EA', fontWeight: '900', fontSize: 16 }}>Sin entradas todavia</Text>
                <Text style={{ color: '#3D6642', fontSize: 13, marginTop: 6, textAlign: 'center', lineHeight: 20 }}>
                  Registra notas y fotos{'\n'}para seguir la evolucion
                </Text>
              </LinearGradient>
            ) : (
              logs.map((log, i) => {
                const accent = weekLabelColor(log.weekLabel)
                const isFloraEntry = log.weekLabel.includes('F')
                return (
                  <LinearGradient
                    key={log.id}
                    colors={['#131A10', '#0C1009']}
                    style={{ borderRadius: 20, borderWidth: 1, borderColor: '#1C2E1E', overflow: 'hidden', marginBottom: i < logs.length - 1 ? 12 : 0 }}
                  >
                    {/* Left accent */}
                    <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, backgroundColor: accent, opacity: 0.7 }} />

                    <View style={{ paddingLeft: 16, paddingRight: 14, paddingVertical: 14 }}>
                      {/* Row: badge + edit */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: log.photoUrl || log.notes ? 12 : 0 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <View style={{
                            backgroundColor: isFloraEntry ? 'rgba(245,158,11,0.12)' : 'rgba(82,204,100,0.12)',
                            borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4,
                            borderWidth: 1, borderColor: isFloraEntry ? 'rgba(245,158,11,0.25)' : 'rgba(82,204,100,0.2)',
                          }}>
                            <Text style={{ color: accent, fontSize: 12, fontWeight: '800' }}>{log.weekLabel}</Text>
                          </View>
                          {log.logDate ? (
                            <Text style={{ color: '#3A5040', fontSize: 11 }}>
                              {log.logDate}
                            </Text>
                          ) : null}
                        </View>
                        <TouchableOpacity
                          onPress={() => openEditSheet(log)}
                          style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <Text style={{ fontSize: 14 }}>✏️</Text>
                        </TouchableOpacity>
                      </View>

                      {log.photoUrl ? (
                        <TouchableOpacity onPress={() => setLightboxLog(log)} activeOpacity={0.88} style={{ marginBottom: log.notes ? 10 : 0 }}>
                          <Image source={{ uri: log.photoUrl }} style={{ width: '100%', height: 200, borderRadius: 14 }} />
                        </TouchableOpacity>
                      ) : null}

                      {log.notes ? (
                        <Text style={{ color: '#8AAF8E', fontSize: 13, lineHeight: 20 }}>{log.notes}</Text>
                      ) : null}
                    </View>
                  </LinearGradient>
                )
              })
            )}
          </View>

        </View>
      </ScrollView>

      {/* Lightbox */}
      <Modal visible={!!lightboxLog} transparent animationType="fade" onRequestClose={() => setLightboxLog(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.96)', justifyContent: 'center', alignItems: 'center' }}>
          {/* Close */}
          <TouchableOpacity
            onPress={() => setLightboxLog(null)}
            style={{ position: 'absolute', top: 54, left: 20, zIndex: 10, width: 40, height: 40, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ color: 'white', fontSize: 18, fontWeight: '700' }}>✕</Text>
          </TouchableOpacity>

          {/* Edit */}
          <TouchableOpacity
            onPress={() => {
              const log = lightboxLog
              setLightboxLog(null)
              if (log) openEditSheet(log)
            }}
            style={{ position: 'absolute', top: 54, right: 20, zIndex: 10, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}
          >
            <Text style={{ fontSize: 14 }}>✏️</Text>
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600' }}>Editar</Text>
          </TouchableOpacity>

          {lightboxLog?.photoUrl ? (
            <Image
              source={{ uri: lightboxLog.photoUrl }}
              style={{ width: screenWidth, height: screenWidth }}
              resizeMode="contain"
            />
          ) : null}

          {lightboxLog?.weekLabel ? (
            <View style={{ marginTop: 20, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: weekLabelColor(lightboxLog.weekLabel) }} />
              <Text style={{ color: weekLabelColor(lightboxLog.weekLabel), fontSize: 13, fontWeight: '700' }}>
                {lightboxLog.weekLabel}
              </Text>
              {lightboxLog.notes ? (
                <Text style={{ color: '#728C74', fontSize: 13 }}>· {lightboxLog.notes.slice(0, 60)}{lightboxLog.notes.length > 60 ? '...' : ''}</Text>
              ) : null}
            </View>
          ) : null}
        </View>
      </Modal>

      {/* Sheet */}
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
