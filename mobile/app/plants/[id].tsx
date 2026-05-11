import { useEffect, useState, useRef } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert,
  Modal, KeyboardAvoidingView, Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { BackIcon } from '@/components/icons/AppIcons'
import { router, useLocalSearchParams } from 'expo-router'
import DateTimePicker from '@react-native-community/datetimepicker'
import { format, differenceInDays, addDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { awardXP, recordDailyActivity, XP_VALUES } from '@/lib/xp'
import { startFloraPhase } from '@shared/lib/nutrition-engine'
import { useNutritionTables } from '@/hooks/useNutritionTables'
import type { NutritionTable } from '@shared/types/plant'
import { calculatePlantHealth } from '@shared/lib/gamification'
import { CompleteTaskSheet, type SheetTask } from '@/components/CompleteTaskSheet'
import { HarvestSheet } from '@/components/HarvestSheet'
import { cancelPlantNotifications, scheduleTaskNotificationsForPlant } from '@/lib/notifications'
import { maybeRequestRating } from '@/lib/rating'
import { sharePlantCard } from '@/lib/share'
import { exportPlantHistory } from '@/lib/export'
import { track } from '@/lib/analytics'
import { usePlan } from '@/hooks/usePlan'
import { enqueueSyncAction } from '@/lib/syncQueue'
import { usePlantStore } from '@/store/plantStore'
import type { Plant, ScheduledTask } from '@shared/types/plant'

const TYPE_COLOR: Record<string, string> = {
  nutrition: '#22C55E', irrigation: '#3B82F6',
  observation: '#F59E0B', foliar: '#A855F7', harvest: '#EF4444',
}
const TYPE_LABEL: Record<string, string> = {
  nutrition: 'Nutricion', irrigation: 'Riego',
  observation: 'Observacion', foliar: 'Foliar', harvest: 'Cosecha',
}

export default function PlantDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { user } = useAuth()
  const { isPro } = usePlan()
  const { tables } = useNutritionTables()
  const updateStoreP = usePlantStore(s => s.updatePlant)
  const [exporting, setExporting] = useState(false)
  const [sharing,   setSharing]   = useState(false)
  const shareCardRef = useRef(null)
  const [plant, setPlant]       = useState<Plant | null>(null)
  const [tasks, setTasks]       = useState<ScheduledTask[]>([])
  const [loading, setLoading]   = useState(true)
  const [sheetTask, setSheetTask]         = useState<SheetTask | null>(null)
  const [harvestModal, setHarvestModal]   = useState(false)
  const [liters, setLiters]               = useState(0)
  const [floraDateModal, setFloraDateModal] = useState(false)
  const [floraDate, setFloraDate]           = useState(new Date())
  const [floraError, setFloraError]         = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const [{ data: p }, { data: t }] = await Promise.all([
        supabase.from('plants').select('*').eq('id', id).maybeSingle(),
        supabase.from('scheduled_tasks').select('*').eq('plant_id', id).order('scheduled_date'),
      ])
      if (p) {
        const plant = rowToPlant(p)
        setPlant(plant)
        setLiters((plant.potCount ?? 1) * (plant.potVolumeLiters ?? 11))
      }
      setTasks((t ?? []).map(rowToTask))
      setLoading(false)
    }
    load()
  }, [id])

  function handleStartFlora() {
    if (!plant) return
    setFloraDate(new Date())
    setFloraDateModal(true)
  }

  async function confirmFlora() {
    if (!plant) return
    const table = tables.find(t => t.id === plant.nutritionTableId)
    if (!table) {
      alert(`Tabla no encontrada: ${plant.nutritionTableId}`)
      setFloraDateModal(false)
      return
    }

    try {
      setFloraError(null)
      const floraStartDate = floraDate
      const newTasks = startFloraPhase(plant, floraStartDate, table)

      // Operacion atomica via RPC — DELETE + INSERT + UPDATE en una sola transaccion
      const { error: rpcError } = await supabase.rpc('start_flora_phase', {
        p_plant_id:         plant.id,
        p_user_id:          user?.id,
        p_flora_start_date: floraStartDate.toISOString().split('T')[0],
        p_tasks: newTasks.map(t => ({
          type:           t.type,
          scheduled_date: t.scheduledDate.toISOString().split('T')[0],
          cycle:          t.cycle,
          week:           t.week,
          stage:          t.stage,
          products:       t.products,
          ec_min:         t.ecMin ?? null,
          ec_max:         t.ecMax ?? null,
          ph_min:         t.phMin ?? null,
          ph_max:         t.phMax ?? null,
        })),
      })
      if (rpcError) throw rpcError

      const updatedPlant = { ...plant, floraStartDate }
      setPlant(updatedPlant)
      setTasks(newTasks)
      if (user) awardXP(user.id, XP_VALUES.START_FLORA)
      track('flora_phase_started', { plant_id: plant.id, genetic_type: plant.geneticType })
      void scheduleTaskNotificationsForPlant(updatedPlant, newTasks)
      setFloraDateModal(false)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al iniciar floracion'
      setFloraError(msg)
    }
  }

  async function confirmHarvest(grams?: number) {
    if (!plant) return
    const harvestNote = grams != null ? `Cosecha: ${grams}g` : null
    await supabase.from('plants').update({
      status: 'harvested',
      notes: harvestNote ?? plant.notes ?? null,
    }).eq('id', plant.id)
    updateStoreP(plant.id, { status: 'harvested' })
    void cancelPlantNotifications(plant.id)
    if (user) void awardXP(user.id, XP_VALUES.HARVEST)
    router.replace('/(tabs)')
  }

  async function confirmDiscard() {
    if (!plant) return
    await supabase.from('plants').update({ status: 'discarded' }).eq('id', plant.id)
    updateStoreP(plant.id, { status: 'discarded' })
    void cancelPlantNotifications(plant.id)
    router.replace('/(tabs)')
  }

  async function completeTask(taskId: string, notes?: string, ec?: number, ph?: number) {
    // Actualizar estado local primero (offline-first)
    setTasks(ts => ts.map(t => t.id === taskId ? { ...t, completed: true } : t))

    // Intentar escritura directa; si falla (offline) encolar para sync posterior (H-03)
    const { error: completeError } = await supabase
      .from('scheduled_tasks')
      .update({ completed: true, completed_at: new Date().toISOString(), completion_notes: notes ?? null })
      .eq('id', taskId)
    if (completeError) {
      enqueueSyncAction('completeTask', { taskId, notes })
    }
    if (user) {
      if (ec != null || ph != null) {
        await supabase.from('measurements').insert({
          user_id: user.id, plant_id: id,
          ec: ec ?? null, ph: ph ?? null,
          notes: notes?.trim() || null,
        })
        void awardXP(user.id, XP_VALUES.COMPLETE_WITH_MEASUREMENT)
      } else {
        void awardXP(user.id, XP_VALUES.COMPLETE_TASK)
      }
      void recordDailyActivity(user.id)
    }
    setSheetTask(null)
    // Rearmar notificaciones de la planta con el task recien completado excluido
    if (plant) {
      const updatedTasks = tasks.map(t => t.id === taskId ? { ...t, completed: true } : t)
      void scheduleTaskNotificationsForPlant(plant, updatedTasks)
    }
    // Rating prompt despues de N tareas completadas (fire and forget)
    void maybeRequestRating()
  }

  async function handleShare() {
    if (!plant) return
    setSharing(true)
    try {
      await sharePlantCard(shareCardRef, plant)
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo compartir')
    } finally {
      setSharing(false)
    }
  }

  async function handleExport() {
    if (!plant || !user) return
    if (!isPro) {
      Alert.alert('Feature Pro', 'La exportacion de historial esta disponible en el plan Pro.', [
        { text: 'Ver planes', onPress: () => router.push('/(tabs)/profile' as never) },
        { text: 'Cancelar' },
      ])
      return
    }
    track('export_started', { plant_id: plant.id })
    setExporting(true)
    try {
      const [{ data: weekLogs }, { data: diagnoses }] = await Promise.all([
        supabase.from('week_logs').select('log_date, week_label, notes, photo_url').eq('plant_id', plant.id).order('log_date'),
        supabase.from('diagnosis_logs').select('created_at, health_score, summary, issues').eq('plant_id', plant.id).order('created_at'),
      ])
      await exportPlantHistory({
        plant,
        tasks,
        weekLogs: (weekLogs ?? []).map((l: { log_date: string; week_label: string | null; notes: string | null; photo_url: string | null }) => ({
          date:      l.log_date,
          weekLabel: l.week_label ?? '',
          notes:     l.notes ?? '',
          photoUrl:  l.photo_url,
        })),
        diagnoses: (diagnoses ?? []).map((d: { created_at: string; health_score: number; summary: string | null; issues: unknown }) => ({
          date:        d.created_at.split('T')[0],
          healthScore: d.health_score,
          summary:     d.summary ?? '',
          issues:      Array.isArray(d.issues) ? (d.issues as { name: string }[]).map(i => i.name).join('; ') : '',
        })),
      })
      track('export_completed', { plant_id: plant.id })
    } catch (e) {
      track('export_error', { plant_id: plant.id, error: e instanceof Error ? e.message : 'unknown' })
      Alert.alert('Error al exportar', e instanceof Error ? e.message : 'Intenta de nuevo')
    } finally {
      setExporting(false)
    }
  }

  if (loading) return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#080E09', alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color="#52CC64" size="large" />
    </SafeAreaView>
  )

  if (!plant) return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#080E09', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#728C74' }}>Planta no encontrada</Text>
    </SafeAreaView>
  )

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayTasks = tasks.filter(t => {
    const d = new Date(t.scheduledDate)
    d.setHours(0, 0, 0, 0)
    return d.getTime() === today.getTime()
  })
  const upcoming = tasks.filter(t => {
    const d = new Date(t.scheduledDate)
    d.setHours(0, 0, 0, 0)
    return d > today && !t.completed
  }).slice(0, 5)

  const daysSinceStart = differenceInDays(today, plant.startDate)
  const isFlora  = !!plant.floraStartDate
  const health   = calculatePlantHealth(tasks)
  const healthColor = health >= 75 ? '#52CC64' : health >= 45 ? '#F59E0B' : '#EF4444'

  // Phase theming
  const phaseAccent = isFlora ? '#F59E0B' : '#52CC64'
  const headerGradient: [string, string, string] = isFlora
    ? ['#1A1000', '#100900', '#080E09']
    : ['#0A1A0B', '#060E07', '#080E09']

  // Phase day/week
  let phaseDay = 0
  let phaseLabel = ''
  if (isFlora && plant.floraStartDate) {
    phaseDay = differenceInDays(today, plant.floraStartDate) + 1
    const week = Math.ceil(phaseDay / 7)
    phaseLabel = `F${week} · D${phaseDay}`
  } else {
    phaseDay = daysSinceStart + 1
    const week = Math.ceil(phaseDay / 7)
    phaseLabel = `V${week} · D${phaseDay}`
  }

  const isAutoflower = plant.geneticType === 'autoflower'
  let estimatedHarvest: Date | null = null
  if (isAutoflower) {
    estimatedHarvest = addDays(plant.startDate, plant.autoFlowerTotalDays ?? 77)
  } else if (plant.floraStartDate) {
    estimatedHarvest = addDays(plant.floraStartDate, 56)
  }
  const daysToHarvest = estimatedHarvest ? differenceInDays(estimatedHarvest, today) : null
  const harvestChipColor = daysToHarvest != null && daysToHarvest <= 14 ? '#C084FC' : '#6DC278'

  const nutritionTask = tasks
    .filter(t => t.type === 'nutrition')
    .sort((a, b) => {
      const da = Math.abs(differenceInDays(new Date(a.scheduledDate), today))
      const db = Math.abs(differenceInDays(new Date(b.scheduledDate), today))
      return da - db
    })[0] ?? null

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#080E09' }}>
      {/* ShareCard — off-screen, capturada por react-native-view-shot */}
      <View
        ref={shareCardRef}
        style={{ position: 'absolute', left: -2000, top: 0, width: 360 }}
        collapsable={false}
      >
        <LinearGradient
          colors={isFlora ? ['#1A1200', '#0C0800'] : ['#0C1A0E', '#060E07']}
          style={{ padding: 28, borderRadius: 20 }}
        >
          <Text style={{ color: '#6D8C74', fontSize: 11, fontWeight: '700', letterSpacing: 2, marginBottom: 12 }}>
            CANNATRACK
          </Text>
          <Text style={{ color: '#E4F2E7', fontSize: 26, fontWeight: '900', marginBottom: 4 }}>
            {plant.name}
          </Text>
          <Text style={{ color: '#6D8C74', fontSize: 14, marginBottom: 20 }}>
            {plant.genetics} · {plant.geneticType === 'autoflower' ? 'Autofloreciente' : plant.geneticType === 'feminized' ? 'Feminizada' : 'Regular'}
          </Text>
          <View style={{ flexDirection: 'row', gap: 20, marginBottom: 24 }}>
            <View>
              <Text style={{ color: '#3A5C3E', fontSize: 11, fontWeight: '700', letterSpacing: 1 }}>DIA</Text>
              <Text style={{ color: phaseAccent, fontSize: 32, fontWeight: '900' }}>{daysSinceStart}</Text>
            </View>
            <View>
              <Text style={{ color: '#3A5C3E', fontSize: 11, fontWeight: '700', letterSpacing: 1 }}>SALUD</Text>
              <Text style={{ color: healthColor, fontSize: 32, fontWeight: '900' }}>{health}%</Text>
            </View>
            <View>
              <Text style={{ color: '#3A5C3E', fontSize: 11, fontWeight: '700', letterSpacing: 1 }}>ETAPA</Text>
              <Text style={{ color: phaseAccent, fontSize: 20, fontWeight: '900', marginTop: 6 }}>{isFlora ? 'FLORA' : 'VEGE'}</Text>
            </View>
          </View>
          <Text style={{ color: '#2C3E2E', fontSize: 11, textAlign: 'right' }}>
            {format(new Date(), 'dd MMM yyyy', { locale: es })} · cannatrack.app
          </Text>
        </LinearGradient>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>

        {/* Header */}
        <LinearGradient colors={headerGradient} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
          style={{ padding: 20, paddingTop: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <TouchableOpacity
              onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
              style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' }}
            >
              <BackIcon size={20} color={phaseAccent} />
            </TouchableOpacity>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{
                borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4,
                backgroundColor: isFlora ? 'rgba(245,158,11,0.15)' : 'rgba(82,204,100,0.15)',
                borderWidth: 1, borderColor: isFlora ? 'rgba(245,158,11,0.3)' : 'rgba(82,204,100,0.3)',
              }}>
                <Text style={{ color: phaseAccent, fontSize: 11, fontWeight: '800', letterSpacing: 1 }}>
                  {isFlora ? 'FLORA' : 'VEGE'}
                </Text>
              </View>
            </View>
          </View>

          <Text style={{ color: '#E4F2E7', fontSize: 30, fontWeight: '900', letterSpacing: -0.5 }}>{plant.name}</Text>
          <Text style={{ color: phaseAccent, fontSize: 14, marginTop: 3, opacity: 0.8 }}>{plant.genetics}</Text>

          {/* Chips row */}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
            <View style={{ backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 }}>
              <Text style={{ color: phaseAccent, fontSize: 12, fontWeight: '700' }}>{phaseLabel}</Text>
            </View>
            <View style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 }}>
              <Text style={{ color: '#728C74', fontSize: 12 }}>
                {plant.location === 'indoor' ? '🏠 Indoor' : '☀️ Outdoor'}
              </Text>
            </View>
            <View style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 }}>
              <Text style={{ color: '#728C74', fontSize: 12 }}>🪴 {plant.potCount}x{plant.potVolumeLiters}L</Text>
            </View>
            {estimatedHarvest && (
              <View style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 }}>
                <Text style={{ color: harvestChipColor, fontSize: 12 }}>
                  🌾 {daysToHarvest != null && daysToHarvest > 0 ? `${daysToHarvest}d para cosecha` : format(estimatedHarvest, 'd MMM', { locale: es })}
                </Text>
              </View>
            )}
          </View>

          {/* Health bar */}
          <View style={{ marginTop: 14 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
              <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '700', letterSpacing: 1 }}>SALUD</Text>
              <Text style={{ color: healthColor, fontSize: 12, fontWeight: '800' }}>{health}%</Text>
            </View>
            <View style={{ height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
              <View style={{ height: '100%', borderRadius: 2, backgroundColor: healthColor, width: `${health}%` }} />
            </View>
          </View>
        </LinearGradient>

        <View style={{ padding: 16, gap: 20 }}>

          {/* Notas */}
          {plant.notes ? (
            <LinearGradient colors={['#131A0F', '#0C1009']} style={{ borderRadius: 14, borderWidth: 1, borderColor: '#1C2E1E', padding: 14, flexDirection: 'row', gap: 10 }}>
              <Text style={{ fontSize: 16 }}>📝</Text>
              <Text style={{ color: '#728C74', fontSize: 13, lineHeight: 19, flex: 1 }}>{plant.notes}</Text>
            </LinearGradient>
          ) : null}

          {/* Tareas de hoy */}
          {todayTasks.length > 0 && (
            <View>
              <Text style={sectionLabel}>⚡ HOY</Text>
              <LinearGradient colors={['#131A10', '#0C1009']} style={{ borderRadius: 20, borderWidth: 1, borderColor: '#1E3020', overflow: 'hidden' }}>
                {todayTasks.map((task, i) => (
                  <View key={task.id} style={{
                    flexDirection: 'row', alignItems: 'center',
                    borderTopWidth: i > 0 ? 1 : 0, borderTopColor: '#182018',
                    opacity: task.completed ? 0.4 : 1,
                  }}>
                    {/* Left accent bar */}
                    <View style={{ width: 3, alignSelf: 'stretch', backgroundColor: TYPE_COLOR[task.type] }} />
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 13, paddingHorizontal: 14 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: '#E4F2E7', fontWeight: '700', fontSize: 16 }}>
                          {TYPE_LABEL[task.type]}
                        </Text>
                        <Text style={{ color: '#728C74', fontSize: 13, marginTop: 2 }}>
                          {task.cycle === 'vege' ? `V${task.week}` : `F${task.week}`} · {task.stage}
                        </Text>
                        {task.products?.length > 0 && (
                          <View style={{ flexDirection: 'row', gap: 4, marginTop: 5, flexWrap: 'wrap' }}>
                            {task.products.slice(0, 3).map((p: {name: string}, idx: number) => (
                              <View key={idx} style={{ backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
                                <Text style={{ color: '#4A7A54', fontSize: 12, fontWeight: '600' }}>{p.name}</Text>
                              </View>
                            ))}
                            {task.products.length > 3 && (
                              <Text style={{ color: '#3A5040', fontSize: 10, alignSelf: 'center' }}>+{task.products.length - 3}</Text>
                            )}
                          </View>
                        )}
                      </View>
                      {!task.completed && (
                        <TouchableOpacity
                          onPress={() => setSheetTask({
                            id: task.id, type: task.type, week: task.week, cycle: task.cycle,
                            products: task.products, ecMin: task.ecMin, ecMax: task.ecMax,
                            phMin: task.phMin, phMax: task.phMax,
                            potCount: plant.potCount, potVolumeLiters: plant.potVolumeLiters,
                          })}
                          style={{ backgroundColor: 'rgba(82,204,100,0.12)', borderWidth: 1, borderColor: 'rgba(82,204,100,0.25)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 7, marginLeft: 10 }}
                        >
                          <Text style={{ color: '#52CC64', fontWeight: '700', fontSize: 12 }}>Hecho ✓</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                ))}
              </LinearGradient>
            </View>
          )}

          {/* Proximas tareas */}
          {upcoming.length > 0 && (
            <View>
              <Text style={sectionLabel}>PROXIMAS TAREAS</Text>
              <LinearGradient colors={['#131A10', '#0C1009']} style={{ borderRadius: 20, borderWidth: 1, borderColor: '#1E3020', overflow: 'hidden' }}>
                {upcoming.map((task, i) => (
                  <View key={task.id} style={{
                    flexDirection: 'row', alignItems: 'center',
                    borderTopWidth: i > 0 ? 1 : 0, borderTopColor: '#182018',
                  }}>
                    <View style={{ width: 3, alignSelf: 'stretch', backgroundColor: TYPE_COLOR[task.type], opacity: 0.5 }} />
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: '#B8D4BC', fontWeight: '600', fontSize: 13 }}>
                          {TYPE_LABEL[task.type]}
                          <Text style={{ color: '#3A5040' }}> · {task.cycle === 'vege' ? `V${task.week}` : `F${task.week}`}</Text>
                        </Text>
                        <Text style={{ color: '#728C74', fontSize: 12, marginTop: 2, textTransform: 'capitalize' }}>
                          {format(new Date(task.scheduledDate), "EEEE d MMM", { locale: es })}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </LinearGradient>
            </View>
          )}

          {todayTasks.length === 0 && upcoming.length === 0 && (
            <LinearGradient colors={['#131A10', '#0C1009']} style={{ alignItems: 'center', paddingVertical: 40, borderRadius: 20, borderWidth: 1, borderColor: '#1C2E1E' }}>
              <Text style={{ fontSize: 32 }}>🌤️</Text>
              <Text style={{ color: '#728C74', marginTop: 8, fontSize: 14 }}>Sin tareas pendientes</Text>
            </LinearGradient>
          )}

          {/* Iniciar floracion */}
          {!plant.floraStartDate && (
            <TouchableOpacity onPress={handleStartFlora} activeOpacity={0.85}>
              <LinearGradient
                colors={['#6D28D9', '#4C1D95']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={{ borderRadius: 18, paddingVertical: 18, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(139,92,246,0.4)' }}
              >
                <Text style={{ color: '#fff', fontWeight: '900', fontSize: 16 }}>🌸 Iniciar floracion</Text>
                <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, marginTop: 4 }}>
                  Recalcula el calendario desde hoy
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          )}

          {/* Cosechar */}
          {(plant.floraStartDate || plant.geneticType === 'autoflower') && (
            <TouchableOpacity onPress={() => setHarvestModal(true)} activeOpacity={0.85}>
              <LinearGradient
                colors={['#1A0505', '#100303']}
                style={{ borderRadius: 18, paddingVertical: 18, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)' }}
              >
                <Text style={{ color: '#EF4444', fontWeight: '900', fontSize: 16 }}>🌾 Cosechar</Text>
                <Text style={{ color: 'rgba(239,68,68,0.5)', fontSize: 11, marginTop: 4 }}>
                  Marca esta planta como cosechada
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          )}

          {/* Plan CUSTOM: mostrar productos propios con dosis de la fase actual */}
          {plant.nutritionTableId === 'custom' && (plant.customProducts?.length ?? 0) > 0 && (
            <View>
              <Text style={sectionLabel}>
                🧪 MIS PRODUCTOS · {isFlora ? 'FLORA' : 'VEGE'}
              </Text>
              <View style={{ backgroundColor: '#0E1510', borderRadius: 20, borderWidth: 1, borderColor: '#1C2E1E', overflow: 'hidden' }}>
                {/* Litros stepper */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#1C2E1E' }}>
                  <Text style={{ color: '#728C74', fontSize: 13, fontWeight: '600' }}>Preparar para</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)', borderWidth: 1, borderColor: '#1C2E1E', borderRadius: 12, overflow: 'hidden' }}>
                    <TouchableOpacity onPress={() => setLiters(v => Math.max(1, v - 1))} style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRightWidth: 1, borderRightColor: '#1C2E1E' }}>
                      <Text style={{ color: liters <= 1 ? '#2D4A30' : '#52CC64', fontSize: 20, fontWeight: '700', lineHeight: 22 }}>−</Text>
                    </TouchableOpacity>
                    <Text style={{ color: '#E4F2E7', fontSize: 15, fontWeight: '900', minWidth: 48, textAlign: 'center' }}>{liters}L</Text>
                    <TouchableOpacity onPress={() => setLiters(v => v + 1)} style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderLeftWidth: 1, borderLeftColor: '#1C2E1E' }}>
                      <Text style={{ color: '#52CC64', fontSize: 20, fontWeight: '700', lineHeight: 22 }}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                {plant.customProducts!
                  .filter(p => {
                    const ph = (p as { phases?: string }).phases ?? 'both'
                    if (isFlora) return ph === 'flora' || ph === 'both'
                    return ph === 'vege' || ph === 'both'
                  })
                  .map((p, i) => {
                    const cp = p as { name: string; unit: string; phases?: string; vegeMin?: number; vegeMax?: number; floraMin?: number; floraMax?: number; minDose?: number; maxDose?: number }
                    const dMin = isFlora ? (cp.floraMin ?? cp.minDose ?? 0) : (cp.vegeMin ?? cp.minDose ?? 0)
                    const dMax = isFlora ? (cp.floraMax ?? cp.maxDose ?? 0) : (cp.vegeMax ?? cp.maxDose ?? 0)
                    const totalMin = parseFloat((dMin * liters).toFixed(1))
                    const totalMax = parseFloat((dMax * liters).toFixed(1))
                    const isFixed  = dMin === dMax
                    return (
                      <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 13, borderTopWidth: i > 0 ? 1 : 0, borderTopColor: '#1C2E1E' }}>
                        <View style={{ backgroundColor: isFlora ? 'rgba(245,158,11,0.12)' : 'rgba(82,204,100,0.1)', borderRadius: 5, paddingHorizontal: 7, paddingVertical: 3 }}>
                          <Text style={{ color: isFlora ? '#F59E0B' : '#52CC64', fontSize: 10, fontWeight: '800' }}>{isFlora ? 'FLORA' : 'VEGE'}</Text>
                        </View>
                        <Text style={{ color: '#B8D4BC', fontSize: 14, fontWeight: '600', flex: 1 }}>{cp.name}</Text>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={{ color: '#E4F2E7', fontSize: 15, fontWeight: '900' }}>
                            {isFixed ? `${totalMax}` : `${totalMin}–${totalMax}`} {cp.unit}
                          </Text>
                          <Text style={{ color: '#3A5040', fontSize: 12, marginTop: 1 }}>
                            {isFixed ? `${dMax}` : `${dMin}–${dMax}`} {cp.unit}/L
                          </Text>
                        </View>
                      </View>
                    )
                  })}
                <View style={{ paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#1C2E1E' }}>
                  <Text style={{ color: '#3A5040', fontSize: 11 }}>
                    {plant.potCount > 1 ? `${plant.potCount} macetas · ${liters}L total` : `${liters}L`}
                    {' · '}Plan personalizado
                  </Text>
                </View>
              </View>
            </View>
          )}

          {plant.nutritionTableId === 'custom' && (plant.customProducts?.length ?? 0) === 0 && (
            <LinearGradient
              colors={['rgba(124,58,237,0.08)', 'rgba(91,33,182,0.04)']}
              style={{ borderRadius: 18, borderWidth: 1, borderColor: 'rgba(139,92,246,0.2)', padding: 20, alignItems: 'center', gap: 8 }}
            >
              <Text style={{ fontSize: 28 }}>✨</Text>
              <Text style={{ color: '#A78BFA', fontSize: 14, fontWeight: '700' }}>Plan personalizado</Text>
              <Text style={{ color: '#6A4A9A', fontSize: 13, textAlign: 'center', lineHeight: 19 }}>
                Agrega tus productos en Editar planta con dosis separadas por VEGE y FLORA.
              </Text>
            </LinearGradient>
          )}

          {/* Nutricion de la semana (tablas oficiales) */}
          {plant.nutritionTableId !== 'custom' && nutritionTask && (nutritionTask.products?.length > 0 || nutritionTask.ecMin) && (
            <View>
              <Text style={sectionLabel}>
                🧪 NUTRICION · {nutritionTask.cycle === 'vege' ? `V${nutritionTask.week}` : `F${nutritionTask.week}`}
              </Text>
              <View style={{ backgroundColor: '#0E1510', borderRadius: 20, borderWidth: 1, borderColor: '#1C2E1E', overflow: 'hidden' }}>
                {/* Header EC/PH */}
                <LinearGradient
                  colors={nutritionTask.cycle === 'flora'
                    ? ['#1A0D2E', '#110820']
                    : ['#0D2010', '#081508']}
                  style={{ paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Text style={{ fontSize: 24 }}>{nutritionTask.cycle === 'flora' ? '🌸' : '🌿'}</Text>
                    <View>
                      <Text style={{
                        color: nutritionTask.cycle === 'flora' ? '#C084FC' : '#52CC64',
                        fontSize: 12, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase',
                      }}>
                        Semana {nutritionTask.cycle === 'vege' ? `V${nutritionTask.week}` : `F${nutritionTask.week}`}
                      </Text>
                      <Text style={{ color: '#728C74', fontSize: 12, marginTop: 2 }}>{nutritionTask.stage}</Text>
                    </View>
                  </View>
                  {nutritionTask.ecMin != null && (
                    <View style={{ backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, alignItems: 'flex-end' }}>
                      <Text style={{ color: '#E4F2E7', fontSize: 12, fontWeight: '800' }}>EC {nutritionTask.ecMin}–{nutritionTask.ecMax}</Text>
                      <Text style={{ color: '#728C74', fontSize: 10, marginTop: 1 }}>pH {nutritionTask.phMin}–{nutritionTask.phMax}</Text>
                    </View>
                  )}
                </LinearGradient>

                {/* Calculadora de litros */}
                <View style={{
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                  paddingHorizontal: 16, paddingVertical: 10,
                  borderBottomWidth: 1, borderBottomColor: '#1C2E1E',
                }}>
                  <Text style={{ color: '#728C74', fontSize: 12, fontWeight: '600' }}>Preparar para</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)', borderWidth: 1, borderColor: '#1C2E1E', borderRadius: 12, overflow: 'hidden' }}>
                    <TouchableOpacity
                      onPress={() => setLiters(v => Math.max(1, v - 1))}
                      style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRightWidth: 1, borderRightColor: '#1C2E1E' }}
                    >
                      <Text style={{ color: liters <= 1 ? '#2D4A30' : '#52CC64', fontSize: 20, fontWeight: '700', lineHeight: 22 }}>−</Text>
                    </TouchableOpacity>
                    <Text style={{ color: '#E4F2E7', fontSize: 15, fontWeight: '900', minWidth: 48, textAlign: 'center' }}>{liters}L</Text>
                    <TouchableOpacity
                      onPress={() => setLiters(v => v + 1)}
                      style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderLeftWidth: 1, borderLeftColor: '#1C2E1E' }}
                    >
                      <Text style={{ color: '#52CC64', fontSize: 20, fontWeight: '700', lineHeight: 22 }}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Productos */}
                {nutritionTask.products?.length > 0 ? (
                  nutritionTask.products.map((p: { name: string; minDose: number; maxDose: number; unit: string; line?: string }, i: number) => {
                    const totalMin = parseFloat((p.minDose * liters).toFixed(1))
                    const totalMax = parseFloat((p.maxDose * liters).toFixed(1))
                    const isFixed  = p.minDose === p.maxDose
                    const LINE_COLOR: Record<string, { bg: string; text: string }> = {
                      BIO:   { bg: 'rgba(20,83,45,0.7)',  text: '#4ADE80' },
                      ECO:   { bg: 'rgba(69,26,3,0.7)',   text: '#FB923C' },
                      LIFE:  { bg: 'rgba(30,58,95,0.7)',  text: '#60A5FA' },
                      FUEL:  { bg: 'rgba(59,7,100,0.7)', text: '#C084FC' },
                      PRO:   { bg: 'rgba(67,20,7,0.7)',  text: '#FB923C' },
                      MID:   { bg: 'rgba(74,13,46,0.7)', text: '#F472B6' },
                      BASIC: { bg: 'rgba(76,5,25,0.7)',  text: '#FDA4AF' },
                    }
                    const lc = LINE_COLOR[p.line ?? ''] ?? { bg: 'rgba(28,46,30,0.7)', text: '#728C74' }
                    return (
                      <View key={i} style={{
                        flexDirection: 'row', alignItems: 'center', gap: 10,
                        paddingHorizontal: 16, paddingVertical: 13,
                        borderTopWidth: i > 0 ? 1 : 0, borderTopColor: '#1C2E1E',
                      }}>
                        {p.line && (
                          <View style={{ backgroundColor: lc.bg, borderRadius: 5, paddingHorizontal: 6, paddingVertical: 3 }}>
                            <Text style={{ color: lc.text, fontSize: 9, fontWeight: '800' }}>{p.line}</Text>
                          </View>
                        )}
                        <Text style={{ color: '#B8D4BC', fontSize: 14, fontWeight: '600', flex: 1 }}>{p.name}</Text>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={{ color: '#E4F2E7', fontSize: 15, fontWeight: '900' }}>
                            {isFixed ? `${totalMax}` : `${totalMin}–${totalMax}`} {p.unit}
                          </Text>
                          <Text style={{ color: '#3A5040', fontSize: 12, marginTop: 1 }}>
                            {isFixed ? `${p.maxDose}` : `${p.minDose}–${p.maxDose}`} {p.unit}/L
                          </Text>
                        </View>
                      </View>
                    )
                  })
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 16 }}>
                    <Text style={{ fontSize: 18 }}>💧</Text>
                    <Text style={{ color: '#728C74', fontSize: 15 }}>Solo agua - semana de limpieza</Text>
                  </View>
                )}

                {/* Productos propios suplementarios (tabla oficial activa) */}
                {(plant.customProducts?.length ?? 0) > 0 && plant.customProducts!
                  .filter(p => {
                    const ph = (p as { phases?: string }).phases ?? 'both'
                    if (isFlora) return ph === 'flora' || ph === 'both'
                    return ph === 'vege' || ph === 'both'
                  })
                  .map((p, i) => {
                  const dMin = isFlora ? ((p as {floraMin?: number}).floraMin ?? (p as {minDose?: number}).minDose ?? 0) : ((p as {vegeMin?: number}).vegeMin ?? (p as {minDose?: number}).minDose ?? 0)
                  const dMax = isFlora ? ((p as {floraMax?: number}).floraMax ?? (p as {maxDose?: number}).maxDose ?? 0) : ((p as {vegeMax?: number}).vegeMax ?? (p as {maxDose?: number}).maxDose ?? 0)
                  const totalMin = parseFloat((dMin * liters).toFixed(1))
                  const totalMax = parseFloat((dMax * liters).toFixed(1))
                  const isFixed  = dMin === dMax
                  return (
                    <View key={`custom-${i}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 13, borderTopWidth: 1, borderTopColor: '#1C2E1E' }}>
                      <View style={{ backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 5, paddingHorizontal: 6, paddingVertical: 3 }}>
                        <Text style={{ color: '#728C74', fontSize: 10, fontWeight: '800' }}>PROPIO</Text>
                      </View>
                      <Text style={{ color: '#B8D4BC', fontSize: 14, fontWeight: '600', flex: 1 }}>{p.name}</Text>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{ color: '#E4F2E7', fontSize: 15, fontWeight: '900' }}>
                          {isFixed ? `${totalMax}` : `${totalMin}–${totalMax}`} {p.unit}
                        </Text>
                        <Text style={{ color: '#3A5040', fontSize: 12, marginTop: 1 }}>
                          {isFixed ? `${dMax}` : `${dMin}–${dMax}`} {p.unit}/L
                        </Text>
                      </View>
                    </View>
                  )
                })}

                {/* Footer */}
                {nutritionTask.products?.length > 0 && (
                  <View style={{ paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#1C2E1E', flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ color: '#3A5040', fontSize: 10 }}>
                      {liters !== (plant.potCount ?? 1) * (plant.potVolumeLiters ?? 11)
                        ? `Calculado para ${liters}L`
                        : plant.potCount > 1
                          ? `${plant.potCount} macetas · ${liters}L total`
                          : `${liters}L por maceta`}
                    </Text>
                    {nutritionTask.ecMin != null && (
                      <Text style={{ color: '#3A5040', fontSize: 10 }}>
                        EC {nutritionTask.ecMin}–{nutritionTask.ecMax} · pH {nutritionTask.phMin}–{nutritionTask.phMax}
                      </Text>
                    )}
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Acciones rapidas */}
          <View>
            <Text style={sectionLabel}>ACCIONES RAPIDAS</Text>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              {[
                { icon: '📸', label: 'Diario',   route: `/plants/${id}/diary`,        pro: false, color: '#52CC64' },
                { icon: '📊', label: 'Medidas',  route: `/plants/${id}/measurements`, pro: false, color: '#52CC64' },
                { icon: '📅', label: 'Timeline', route: `/plants/${id}/timeline`,     pro: false, color: '#52CC64' },
              ].map(action => (
                <TouchableOpacity
                  key={action.label}
                  onPress={() => router.push(action.route as never)}
                  activeOpacity={0.8}
                  style={{ flex: 1, minWidth: '30%' }}
                >
                  <LinearGradient
                    colors={['#141E15', '#0C1009']}
                    style={{ borderRadius: 14, borderWidth: 1, borderColor: '#1C2E1E', padding: 14, alignItems: 'center' }}
                  >
                    <Text style={{ fontSize: 22, marginBottom: 6 }}>{action.icon}</Text>
                    <Text style={{ color: '#B8D4BC', fontSize: 13, fontWeight: '700' }}>{action.label}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              ))}

              {/* Diagnostico IA — Pro */}
              <TouchableOpacity
                onPress={() => router.push(`/plants/${id}/diagnosis` as never)}
                activeOpacity={0.8}
                style={{ flex: 1, minWidth: '30%' }}
              >
                <LinearGradient
                  colors={['#160F2A', '#0E0820']}
                  style={{ borderRadius: 14, borderWidth: 1, borderColor: 'rgba(167,139,250,0.25)', padding: 14, alignItems: 'center' }}
                >
                  <Text style={{ fontSize: 22, marginBottom: 6 }}>🤖</Text>
                  <Text style={{ color: '#A78BFA', fontSize: 13, fontWeight: '700' }}>IA</Text>
                  <View style={{ marginTop: 4, backgroundColor: 'rgba(167,139,250,0.15)', borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: 'rgba(167,139,250,0.25)' }}>
                    <Text style={{ color: '#A78BFA', fontSize: 9, fontWeight: '900', letterSpacing: 0.8 }}>PRO</Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>

              {/* Exportar — Pro */}
              <TouchableOpacity onPress={handleExport} disabled={exporting} activeOpacity={0.8} style={{ flex: 1, minWidth: '30%' }}>
                <LinearGradient
                  colors={['#160F2A', '#0E0820']}
                  style={{ borderRadius: 14, borderWidth: 1, borderColor: 'rgba(167,139,250,0.25)', padding: 14, alignItems: 'center' }}
                >
                  {exporting
                    ? <ActivityIndicator color="#A78BFA" size="small" style={{ marginBottom: 6 }} />
                    : <Text style={{ fontSize: 22, marginBottom: 6 }}>📤</Text>
                  }
                  <Text style={{ color: '#A78BFA', fontSize: 13, fontWeight: '700' }}>Exportar</Text>
                  <View style={{ marginTop: 4, backgroundColor: 'rgba(167,139,250,0.15)', borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: 'rgba(167,139,250,0.25)' }}>
                    <Text style={{ color: '#A78BFA', fontSize: 9, fontWeight: '900', letterSpacing: 0.8 }}>PRO</Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>

              {/* Compartir */}
              <TouchableOpacity onPress={handleShare} disabled={sharing} activeOpacity={0.8} style={{ flex: 1, minWidth: '30%' }}>
                <LinearGradient
                  colors={['#141E15', '#0C1009']}
                  style={{ borderRadius: 14, borderWidth: 1, borderColor: '#1C2E1E', padding: 14, alignItems: 'center' }}
                >
                  {sharing
                    ? <ActivityIndicator color="#52CC64" size="small" style={{ marginBottom: 6 }} />
                    : <Text style={{ fontSize: 22, marginBottom: 6 }}>🔗</Text>
                  }
                  <Text style={{ color: '#B8D4BC', fontSize: 13, fontWeight: '700' }}>Compartir</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>

          {/* Zona de peligro */}
          <View style={{ borderTopWidth: 1, borderTopColor: '#1A1A1A', paddingTop: 20 }}>
            <Text style={{ color: '#728C74', fontSize: 13, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 }}>
              Zona de peligro
            </Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {/* Descartar (always available) */}
              {plant.status === 'active' && (
                <TouchableOpacity
                  onPress={() => {
                    Alert.alert(
                      'Descartar planta',
                      `¿Seguro que queres descartar "${plant.name}"? Esta accion no se puede deshacer.`,
                      [
                        { text: 'Cancelar', style: 'cancel' },
                        { text: 'Descartar', style: 'destructive', onPress: confirmDiscard },
                      ]
                    )
                  }}
                  activeOpacity={0.85}
                  style={{ flex: 1 }}
                >
                  <LinearGradient
                    colors={['#180505', '#100303']}
                    style={{ borderRadius: 14, paddingVertical: 13, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)' }}
                  >
                    <Text style={{ fontSize: 18, marginBottom: 3 }}>🗑️</Text>
                    <Text style={{ color: '#EF4444', fontWeight: '700', fontSize: 12 }}>Descartar</Text>
                    <Text style={{ color: 'rgba(239,68,68,0.4)', fontSize: 11, marginTop: 2 }}>Murio / no sirve</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}

              {/* Editar */}
              <TouchableOpacity
                onPress={() => router.push(`/plants/${id}/edit`)}
                activeOpacity={0.85}
                style={{ flex: 1 }}
              >
                <LinearGradient
                  colors={['#141E15', '#0C1009']}
                  style={{ borderRadius: 14, paddingVertical: 13, alignItems: 'center', borderWidth: 1, borderColor: '#1C2E1E' }}
                >
                  <Text style={{ fontSize: 18, marginBottom: 3 }}>⚙️</Text>
                  <Text style={{ color: '#728C74', fontWeight: '700', fontSize: 12 }}>Editar</Text>
                  <Text style={{ color: '#3A5040', fontSize: 11, marginTop: 2 }}>Nombre, macetas...</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>

        </View>
      </ScrollView>

      <HarvestSheet
        visible={harvestModal}
        plant={plant}
        onClose={() => setHarvestModal(false)}
        onHarvest={confirmHarvest}
        onDiscard={confirmDiscard}
      />

      <CompleteTaskSheet
        visible={!!sheetTask}
        task={sheetTask}
        onClose={() => setSheetTask(null)}
        onComplete={completeTask}
      />

      {/* Modal: Iniciar floracion */}
      <Modal
        visible={floraDateModal}
        transparent
        animationType="slide"
        onRequestClose={() => setFloraDateModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1, justifyContent: 'flex-end' }}
        >
          <View style={{ backgroundColor: 'rgba(0,0,0,0.6)', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
          <LinearGradient
            colors={['#1A1030', '#100A20', '#0C0A14']}
            style={{
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              borderWidth: 1,
              borderColor: 'rgba(139,92,246,0.25)',
              padding: 24,
              paddingBottom: Platform.OS === 'ios' ? 44 : 24,
            }}
          >
            <View style={{ width: 36, height: 4, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2, alignSelf: 'center', marginBottom: 24 }} />

            <Text style={{ color: '#E4F2E7', fontSize: 22, fontWeight: '900', marginBottom: 6 }}>
              Iniciar floracion 🌸
            </Text>
            <Text style={{ color: '#728C74', fontSize: 13, marginBottom: 24, lineHeight: 18 }}>
              El calendario se recalcula desde la fecha seleccionada
            </Text>

            <Text style={{ color: '#A78BFA', fontSize: 12, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 10 }}>
              Fecha de inicio de flora
            </Text>

            {/* Date picker display */}
            <TouchableOpacity
              activeOpacity={0.85}
              style={{
                backgroundColor: 'rgba(139,92,246,0.08)',
                borderWidth: 1,
                borderColor: 'rgba(139,92,246,0.3)',
                borderRadius: 16,
                paddingHorizontal: 18,
                paddingVertical: 16,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 14,
              }}
            >
              <Text style={{ color: '#E4F2E7', fontSize: 17, fontWeight: '700' }}>
                {floraDate.toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}
              </Text>
              <Text style={{ fontSize: 20 }}>📅</Text>
            </TouchableOpacity>

            <DateTimePicker
              value={floraDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(_: unknown, d?: Date) => { if (d) setFloraDate(d) }}
              maximumDate={new Date()}
              style={{ marginBottom: 8 }}
            />

            {floraError && (
              <Text style={{ color: '#EF4444', fontSize: 12, marginBottom: 10 }}>❌ {floraError}</Text>
            )}

            <View style={{
              backgroundColor: 'rgba(245,158,11,0.08)',
              borderWidth: 1,
              borderColor: 'rgba(245,158,11,0.2)',
              borderRadius: 12,
              paddingHorizontal: 14,
              paddingVertical: 10,
              marginBottom: 24,
            }}>
              <Text style={{ color: '#F59E0B', fontSize: 12 }}>⚠️ Esta accion regenera el calendario desde cero</Text>
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                onPress={() => setFloraDateModal(false)}
                style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 16, paddingVertical: 15, alignItems: 'center' }}
              >
                <Text style={{ color: '#728C74', fontWeight: '700', fontSize: 14 }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={confirmFlora} activeOpacity={0.85} style={{ flex: 2 }}>
                <LinearGradient
                  colors={['#7C3AED', '#5B21B6']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={{ borderRadius: 16, paddingVertical: 15, alignItems: 'center' }}
                >
                  <Text style={{ color: '#fff', fontWeight: '900', fontSize: 14 }}>Confirmar floracion</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  )
}

const sectionLabel = {
  color: '#728C74' as const,
  fontSize: 13,
  fontWeight: '700' as const,
  letterSpacing: 1.5,
  textTransform: 'uppercase' as const,
  marginBottom: 8,
}

function rowToPlant(row: Record<string, unknown>): Plant {
  return {
    id:               row.id as string,
    name:             row.name as string,
    genetics:         row.genetics as string,
    geneticType:      row.genetic_type as Plant['geneticType'],
    sex:              (row.sex as Plant['sex']) ?? 'unknown',
    startDate:        new Date(row.start_date as string),
    floraStartDate:   row.flora_start_date ? new Date(row.flora_start_date as string) : undefined,
    location:         (row.location as Plant['location']) ?? 'indoor',
    potCount:         (row.pot_count as number) ?? 1,
    potVolumeLiters:  (row.pot_volume_liters as number) ?? 11,
    nutritionTableId: (row.nutrition_table_id as string) ?? 'revegetar',
    availableProducts: (row.available_products as string[]) ?? [],
    customProducts:   Array.isArray(row.custom_products) ? row.custom_products as Plant['customProducts'] : [],
    status:           (row.status as Plant['status']) ?? 'active',
    notes:            (row.notes as string) ?? '',
    autoFlowerTotalDays: row.auto_flower_total_days != null ? (row.auto_flower_total_days as number) : undefined,
  }
}

function rowToTask(row: Record<string, unknown>): ScheduledTask {
  return {
    id:            row.id as string,
    plantId:       row.plant_id as string,
    type:          row.type as ScheduledTask['type'],
    scheduledDate: new Date(row.scheduled_date as string),
    cycle:         row.cycle as ScheduledTask['cycle'],
    week:          row.week as number,
    stage:         (row.stage as ScheduledTask['stage']) ?? 'rooting',
    products:      (row.products as ScheduledTask['products']) ?? [],
    ecMin:         row.ec_min as number,
    ecMax:         row.ec_max as number,
    phMin:         row.ph_min as number,
    phMax:         row.ph_max as number,
    completed:     (row.completed as boolean) ?? false,
  }
}
