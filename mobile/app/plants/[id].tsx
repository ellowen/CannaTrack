import { useEffect, useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  Modal, KeyboardAvoidingView, Platform, TextInput,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import format from 'date-fns/format'
import differenceInDays from 'date-fns/differenceInDays'
import addDays from 'date-fns/addDays'
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
import type { Plant, ScheduledTask } from '@shared/types/plant'

const TYPE_COLOR: Record<string, string> = {
  nutrition: '#22C55E', irrigation: '#3B82F6',
  observation: '#F59E0B', foliar: '#A855F7', harvest: '#EF4444',
}
const TYPE_LABEL: Record<string, string> = {
  nutrition: 'Nutricion', irrigation: 'Riego',
  observation: 'Observacion', foliar: 'Foliar', harvest: 'Cosecha',
}

function todayAsYMD(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function PlantDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { user } = useAuth()
  const { tables } = useNutritionTables()
  const [plant, setPlant]       = useState<Plant | null>(null)
  const [tasks, setTasks]       = useState<ScheduledTask[]>([])
  const [loading, setLoading]   = useState(true)
  const [sheetTask, setSheetTask]         = useState<SheetTask | null>(null)
  const [harvestModal, setHarvestModal]   = useState(false)
  const [liters, setLiters]               = useState(0)
  const [floraDateModal, setFloraDateModal] = useState(false)
  const [floraDateInput, setFloraDateInput] = useState(todayAsYMD())
  const [floraError, setFloraError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const [{ data: p }, { data: t }] = await Promise.all([
        supabase.from('plants').select('*').eq('id', id).single(),
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
    setFloraDateInput(todayAsYMD())
    setFloraDateModal(true)
  }

  async function confirmFlora() {
    if (!plant) {
      console.error('[confirmFlora] No plant data')
      return
    }
    // Validate YYYY-MM-DD
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(floraDateInput)
    if (!match) {
      alert('Formato inválido. Use YYYY-MM-DD')
      return
    }
    const candidate = new Date(floraDateInput)
    if (isNaN(candidate.getTime())) {
      alert('Fecha inválida')
      return
    }

    console.log('[confirmFlora] Looking for table:', plant.nutritionTableId, 'Available tables:', tables.map(t => t.id))

    const table = tables.find(t => t.id === plant.nutritionTableId)
    if (!table) {
      console.error('[confirmFlora] Table not found:', plant.nutritionTableId)
      alert(`Tabla no encontrada: ${plant.nutritionTableId}\n\nTablas disponibles: ${tables.map(t => t.id).join(', ')}`)
      setFloraDateModal(false)
      return
    }

    try {
      setFloraError(null)
      const floraStartDate = candidate
      console.log('[confirmFlora] Starting flora with table:', table.id, 'date:', floraStartDate)
      const newTasks = startFloraPhase(plant, floraStartDate, table)

      await supabase.from('scheduled_tasks').delete().eq('plant_id', plant.id)
      if (newTasks.length > 0) {
        const { error: insertError } = await supabase.from('scheduled_tasks').insert(
          newTasks.map(t => ({
            plant_id:       plant.id,
            user_id:        user?.id,
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
          }))
        )
        if (insertError) throw insertError
      }
      const { error: updateError } = await supabase.from('plants').update({ flora_start_date: floraStartDate.toISOString().split('T')[0] }).eq('id', plant.id)
      if (updateError) throw updateError

      setPlant({ ...plant, floraStartDate })
      setTasks(newTasks)
      if (user) awardXP(user.id, XP_VALUES.START_FLORA)
      console.log('[confirmFlora] Success! Flora started')
      setFloraDateModal(false)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al iniciar floración'
      console.error('[confirmFlora] Error:', e)
      setFloraError(msg)
    }
  }

  async function handleHarvest() {
    if (!plant) return
    setHarvestModal(true)
  }

  async function confirmHarvest(grams?: number) {
    if (!plant) return
    const harvestNote = grams != null ? `Cosecha: ${grams}g` : null
    await supabase.from('plants').update({
      status: 'harvested',
      notes: harvestNote ?? plant.notes ?? null,
    }).eq('id', plant.id)
    if (user) void awardXP(user.id, XP_VALUES.HARVEST)
    router.replace('/(tabs)')
  }

  async function confirmDiscard() {
    if (!plant) return
    await supabase.from('plants').update({ status: 'discarded' }).eq('id', plant.id)
    router.replace('/(tabs)')
  }

  async function completeTask(taskId: string, notes?: string, ec?: number, ph?: number) {
    await supabase
      .from('scheduled_tasks')
      .update({ completed: true, completed_at: new Date().toISOString(), completion_notes: notes ?? null })
      .eq('id', taskId)
    setTasks(ts => ts.map(t => t.id === taskId ? { ...t, completed: true } : t))
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
  }

  if (loading) return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0C1410', alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color="#52CC64" size="large" />
    </SafeAreaView>
  )

  if (!plant) return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0C1410', alignItems: 'center', justifyContent: 'center' }}>
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

  // Fecha estimada de cosecha
  const isAutoflower = plant.geneticType === 'autoflower'
  let estimatedHarvest: Date | null = null
  if (isAutoflower) {
    estimatedHarvest = addDays(plant.startDate, plant.autoFlowerTotalDays ?? 77)
  } else if (plant.floraStartDate) {
    estimatedHarvest = addDays(plant.floraStartDate, 56)
  }
  const showHarvestChip = estimatedHarvest !== null
  const daysToHarvest = estimatedHarvest ? differenceInDays(estimatedHarvest, today) : null
  const harvestChipColor = daysToHarvest != null && daysToHarvest <= 14 ? '#C084FC' : '#6DC278'

  // Tarjeta de nutricion: tarea de nutricion mas cercana (hoy o proxima)
  const nutritionTask = tasks
    .filter(t => t.type === 'nutrition')
    .sort((a, b) => {
      const da = Math.abs(differenceInDays(new Date(a.scheduledDate), today))
      const db = Math.abs(differenceInDays(new Date(b.scheduledDate), today))
      return da - db
    })[0] ?? null

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0C1410' }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>

        {/* Header */}
        <View style={{ backgroundColor: '#1A3D1E', padding: 20, paddingTop: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={{ color: '#6DC278', fontSize: 26 }}>←</Text>
            </TouchableOpacity>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ backgroundColor: '#0D2010', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 }}>
                <Text style={{ color: '#52CC64', fontSize: 11, fontWeight: '800' }}>
                  {isFlora ? 'FLORA' : 'VEGE'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => router.push(`/plants/${id}/edit`)} style={{ backgroundColor: '#0D2010', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 }}>
                <Text style={{ color: '#52CC64', fontSize: 16 }}>⚙️</Text>
              </TouchableOpacity>
            </View>
          </View>
          <Text style={{ color: '#E4F2E7', fontSize: 28, fontWeight: '900' }}>{plant.name}</Text>
          <Text style={{ color: '#6DC278', fontSize: 14, marginTop: 2 }}>{plant.genetics}</Text>
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
            <Text style={{ color: '#6DC278', fontSize: 12 }}>📅 Dia {daysSinceStart}</Text>
            <Text style={{ color: '#6DC278', fontSize: 12 }}>
              {plant.location === 'indoor' ? '🏠 Indoor' : '☀️ Outdoor'}
            </Text>
            <Text style={{ color: '#6DC278', fontSize: 12 }}>🪴 {plant.potCount} × {plant.potVolumeLiters}L</Text>
            {showHarvestChip && estimatedHarvest && (
              <Text style={{ color: harvestChipColor, fontSize: 12 }}>
                🌾 Cosecha ~{format(estimatedHarvest, 'd MMM', { locale: es })}
              </Text>
            )}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: healthColor }} />
              <Text style={{ color: healthColor, fontSize: 12, fontWeight: '700' }}>Salud {health}%</Text>
            </View>
          </View>
        </View>

        <View style={{ padding: 16, gap: 20 }}>

          {/* Notas de la planta */}
          {plant.notes ? (
            <View style={{ backgroundColor: '#131D14', borderRadius: 14, borderWidth: 1, borderColor: '#1C2E1E', padding: 14, flexDirection: 'row', gap: 10 }}>
              <Text style={{ fontSize: 16 }}>📝</Text>
              <Text style={{ color: '#728C74', fontSize: 13, lineHeight: 19, flex: 1 }}>{plant.notes}</Text>
            </View>
          ) : null}

          {/* Tareas de hoy */}
          {todayTasks.length > 0 && (
            <View>
              <Text style={sectionLabel}>⚡ HOY</Text>
              <View style={card}>
                {todayTasks.map((task, i) => (
                  <View key={task.id} style={{
                    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                    paddingVertical: 12, paddingHorizontal: 14,
                    borderTopWidth: i > 0 ? 1 : 0, borderTopColor: '#1C2E1E',
                    opacity: task.completed ? 0.4 : 1,
                  }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: TYPE_COLOR[task.type] }} />
                      <View>
                        <Text style={{ color: '#E4F2E7', fontWeight: '700', fontSize: 14 }}>
                          {TYPE_LABEL[task.type]}
                        </Text>
                        <Text style={{ color: '#728C74', fontSize: 11, marginTop: 1 }}>
                          {task.cycle === 'vege' ? `V${task.week}` : `F${task.week}`} · {task.stage}
                        </Text>
                        {task.products?.length > 0 && (
                          <Text style={{ color: '#3A5040', fontSize: 11, marginTop: 2 }}>
                            {task.products.slice(0, 2).map((p: {name: string}) => p.name).join(' · ')}
                            {task.products.length > 2 ? ` +${task.products.length - 2}` : ''}
                          </Text>
                        )}
                      </View>
                    </View>
                    {!task.completed && (
                      <TouchableOpacity
                        onPress={() => setSheetTask({
                          id: task.id, type: task.type, week: task.week, cycle: task.cycle,
                          products: task.products, ecMin: task.ecMin, ecMax: task.ecMax,
                          phMin: task.phMin, phMax: task.phMax,
                          potCount: plant.potCount, potVolumeLiters: plant.potVolumeLiters,
                        })}
                        style={{ backgroundColor: '#0D2010', borderWidth: 1, borderColor: '#1A3D1E', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 7 }}
                      >
                        <Text style={{ color: '#52CC64', fontWeight: '700', fontSize: 12 }}>Hecho ✓</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Proximas tareas */}
          {upcoming.length > 0 && (
            <View>
              <Text style={sectionLabel}>PROXIMAS TAREAS</Text>
              <View style={card}>
                {upcoming.map((task, i) => (
                  <View key={task.id} style={{
                    flexDirection: 'row', alignItems: 'center', gap: 12,
                    paddingVertical: 12, paddingHorizontal: 14,
                    borderTopWidth: i > 0 ? 1 : 0, borderTopColor: '#1C2E1E',
                  }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: TYPE_COLOR[task.type] }} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#E4F2E7', fontWeight: '600', fontSize: 13 }}>
                        {TYPE_LABEL[task.type]}
                        <Text style={{ color: '#3A5040' }}> · {task.cycle === 'vege' ? `V${task.week}` : `F${task.week}`}</Text>
                      </Text>
                      <Text style={{ color: '#728C74', fontSize: 12, marginTop: 1, textTransform: 'capitalize' }}>
                        {format(new Date(task.scheduledDate), "EEEE d MMM", { locale: es })}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {todayTasks.length === 0 && upcoming.length === 0 && (
            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
              <Text style={{ fontSize: 32 }}>🌤️</Text>
              <Text style={{ color: '#728C74', marginTop: 8, fontSize: 14 }}>Sin tareas pendientes</Text>
            </View>
          )}

          {!plant.floraStartDate && plant.geneticType !== 'autoflower' && (
            <TouchableOpacity
              onPress={handleStartFlora}
              style={{ backgroundColor: '#A855F7', borderRadius: 16, paddingVertical: 16, alignItems: 'center' }}
            >
              <Text style={{ color: '#fff', fontWeight: '900', fontSize: 15 }}>🌸 Iniciar floración</Text>
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 3 }}>
                Recalcula el calendario desde hoy
              </Text>
            </TouchableOpacity>
          )}

          {/* Boton cosechar */}
          {(plant.floraStartDate || plant.geneticType === 'autoflower') && (
            <TouchableOpacity
              onPress={handleHarvest}
              style={{ backgroundColor: '#1A0A0A', borderRadius: 16, paddingVertical: 16, alignItems: 'center', borderWidth: 1, borderColor: '#4B1515' }}
            >
              <Text style={{ color: '#EF4444', fontWeight: '900', fontSize: 15 }}>🌾 Cosechar</Text>
              <Text style={{ color: 'rgba(239,68,68,0.6)', fontSize: 11, marginTop: 3 }}>
                Marca esta planta como cosechada
              </Text>
            </TouchableOpacity>
          )}

          {/* Nutricion de la semana */}
          {nutritionTask && (nutritionTask.products?.length > 0 || nutritionTask.ecMin) && (
            <View>
              <Text style={sectionLabel}>
                🧪 NUTRICION · {nutritionTask.cycle === 'vege' ? `V${nutritionTask.week}` : `F${nutritionTask.week}`}
              </Text>
              <View style={card}>
                {/* Header con EC/pH */}
                <View style={{
                  backgroundColor: nutritionTask.cycle === 'flora' ? '#1A0D2E' : '#0D2010',
                  paddingHorizontal: 14, paddingVertical: 12,
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontSize: 22 }}>{nutritionTask.cycle === 'flora' ? '🌸' : '🌿'}</Text>
                    <View>
                      <Text style={{
                        color: nutritionTask.cycle === 'flora' ? '#C084FC' : '#52CC64',
                        fontSize: 11, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase',
                      }}>
                        Semana {nutritionTask.cycle === 'vege' ? `V${nutritionTask.week}` : `F${nutritionTask.week}`}
                      </Text>
                      <Text style={{ color: '#728C74', fontSize: 10, marginTop: 1 }}>{nutritionTask.stage}</Text>
                    </View>
                  </View>
                  {nutritionTask.ecMin != null && (
                    <View style={{ backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, alignItems: 'flex-end' }}>
                      <Text style={{ color: '#E4F2E7', fontSize: 11, fontWeight: '800' }}>EC {nutritionTask.ecMin}–{nutritionTask.ecMax}</Text>
                      <Text style={{ color: '#728C74', fontSize: 10, marginTop: 1 }}>pH {nutritionTask.phMin}–{nutritionTask.phMax}</Text>
                    </View>
                  )}
                </View>

                {/* Calculadora de litros */}
                <View style={{
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                  paddingHorizontal: 14, paddingVertical: 10,
                  borderBottomWidth: 1, borderBottomColor: '#1C2E1E',
                  backgroundColor: '#0C1410',
                }}>
                  <Text style={{ color: '#728C74', fontSize: 12, fontWeight: '600' }}>Preparar para</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <TouchableOpacity
                      onPress={() => { const step = plant.potVolumeLiters ?? 11; setLiters(v => Math.max(step, parseFloat((v - step).toFixed(1)))) }}
                      style={{ width: 28, height: 28, borderRadius: 8, borderWidth: 1, borderColor: '#1C2E1E', backgroundColor: '#131D14', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Text style={{ color: '#E4F2E7', fontSize: 16, lineHeight: 18 }}>−</Text>
                    </TouchableOpacity>
                    <Text style={{ color: '#E4F2E7', fontSize: 15, fontWeight: '900', minWidth: 36, textAlign: 'center' }}>{liters}L</Text>
                    <TouchableOpacity
                      onPress={() => { const step = plant.potVolumeLiters ?? 11; setLiters(v => parseFloat((v + step).toFixed(1))) }}
                      style={{ width: 28, height: 28, borderRadius: 8, borderWidth: 1, borderColor: '#1C2E1E', backgroundColor: '#131D14', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Text style={{ color: '#E4F2E7', fontSize: 16, lineHeight: 18 }}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Productos con dosis calculadas */}
                {nutritionTask.products?.length > 0 ? (
                  nutritionTask.products.map((p: { name: string; minDose: number; maxDose: number; unit: string; line?: string }, i: number) => {
                    const totalMin = parseFloat((p.minDose * liters).toFixed(1))
                    const totalMax = parseFloat((p.maxDose * liters).toFixed(1))
                    const isFixed  = p.minDose === p.maxDose
                    const LINE_COLOR: Record<string, { bg: string; text: string }> = {
                      BIO:   { bg: '#14532D', text: '#4ADE80' },
                      ECO:   { bg: '#451A03', text: '#FB923C' },
                      LIFE:  { bg: '#1E3A5F', text: '#60A5FA' },
                      FUEL:  { bg: '#3B0764', text: '#C084FC' },
                      PRO:   { bg: '#431407', text: '#FB923C' },
                      MID:   { bg: '#4a0d2e', text: '#F472B6' },
                      BASIC: { bg: '#4c0519', text: '#FDA4AF' },
                    }
                    const lc = LINE_COLOR[p.line ?? ''] ?? { bg: '#1C2E1E', text: '#728C74' }
                    return (
                      <View key={i} style={{
                        flexDirection: 'row', alignItems: 'center', gap: 8,
                        paddingHorizontal: 14, paddingVertical: 12,
                        borderTopWidth: i > 0 ? 1 : 0, borderTopColor: '#1C2E1E',
                      }}>
                        {p.line && (
                          <View style={{ backgroundColor: lc.bg, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 }}>
                            <Text style={{ color: lc.text, fontSize: 9, fontWeight: '800' }}>{p.line}</Text>
                          </View>
                        )}
                        <Text style={{ color: '#B8D4BC', fontSize: 13, fontWeight: '600', flex: 1 }}>{p.name}</Text>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={{ color: '#E4F2E7', fontSize: 13, fontWeight: '900' }}>
                            {isFixed ? `${totalMax}` : `${totalMin}–${totalMax}`} {p.unit}
                          </Text>
                          <Text style={{ color: '#3A5040', fontSize: 10, marginTop: 1 }}>
                            {isFixed ? `${p.maxDose}` : `${p.minDose}–${p.maxDose}`} {p.unit}/L
                          </Text>
                        </View>
                      </View>
                    )
                  })
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 14 }}>
                    <Text style={{ fontSize: 18 }}>💧</Text>
                    <Text style={{ color: '#728C74', fontSize: 13 }}>Solo agua - semana de limpieza</Text>
                  </View>
                )}

                {/* Footer */}
                {nutritionTask.products?.length > 0 && (
                  <View style={{ paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#1C2E1E', flexDirection: 'row', justifyContent: 'space-between' }}>
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

          <View style={{ gap: 10 }}>
            <Text style={sectionLabel}>📱 ACCIONES RAPIDAS</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                onPress={() => router.push(`/plants/${id}/diary`)}
                style={{ flex: 1, backgroundColor: '#131D14', borderRadius: 12, borderWidth: 1, borderColor: '#1C2E1E', padding: 12, alignItems: 'center' }}
              >
                <Text style={{ fontSize: 20, marginBottom: 4 }}>📸</Text>
                <Text style={{ color: '#E4F2E7', fontSize: 11, fontWeight: '700' }}>Diario</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push(`/plants/${id}/measurements`)}
                style={{ flex: 1, backgroundColor: '#131D14', borderRadius: 12, borderWidth: 1, borderColor: '#1C2E1E', padding: 12, alignItems: 'center' }}
              >
                <Text style={{ fontSize: 20, marginBottom: 4 }}>📊</Text>
                <Text style={{ color: '#E4F2E7', fontSize: 11, fontWeight: '700' }}>Medida</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push(`/plants/${id}/timeline`)}
                style={{ flex: 1, backgroundColor: '#131D14', borderRadius: 12, borderWidth: 1, borderColor: '#1C2E1E', padding: 12, alignItems: 'center' }}
              >
                <Text style={{ fontSize: 20, marginBottom: 4 }}>📅</Text>
                <Text style={{ color: '#E4F2E7', fontSize: 11, fontWeight: '700' }}>Timeline</Text>
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

      {/* Modal: Iniciar floración */}
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
          <View style={{ backgroundColor: 'rgba(0,0,0,0.5)', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
          <View style={{
            backgroundColor: '#131D14',
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            borderWidth: 1,
            borderColor: '#1C2E1E',
            padding: 24,
            paddingBottom: Platform.OS === 'ios' ? 40 : 24,
          }}>
            {/* Handle */}
            <View style={{ width: 36, height: 4, backgroundColor: '#1C2E1E', borderRadius: 2, alignSelf: 'center', marginBottom: 20 }} />

            <Text style={{ color: '#E4F2E7', fontSize: 20, fontWeight: '900', marginBottom: 6 }}>
              Iniciar floracion
            </Text>
            <Text style={{ color: '#728C74', fontSize: 13, marginBottom: 24, lineHeight: 18 }}>
              El calendario se recalcula desde la fecha seleccionada
            </Text>

            {/* Input */}
            <Text style={{ color: '#6DC278', fontSize: 12, fontWeight: '700', marginBottom: 6 }}>
              Fecha de inicio
            </Text>
            <TextInput
              value={floraDateInput}
              onChangeText={setFloraDateInput}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#3A5040"
              keyboardType="numeric"
              style={{
                backgroundColor: '#0C1410',
                borderWidth: 1,
                borderColor: floraError ? '#EF4444' : '#1C2E1E',
                borderRadius: 12,
                paddingHorizontal: 14,
                paddingVertical: 12,
                color: '#E4F2E7',
                fontSize: 16,
                fontWeight: '600',
                marginBottom: 8,
              }}
            />
            {floraError ? (
              <Text style={{ color: '#EF4444', fontSize: 11, marginBottom: 20 }}>
                ❌ {floraError}
              </Text>
            ) : (
              <Text style={{ color: '#3A5040', fontSize: 11, marginBottom: 20 }}>
                Formato: AAAA-MM-DD (ej: 2025-04-15)
              </Text>
            )}

            {/* Warning */}
            <View style={{
              backgroundColor: '#1A0D00',
              borderWidth: 1,
              borderColor: '#3D2200',
              borderRadius: 10,
              paddingHorizontal: 12,
              paddingVertical: 10,
              marginBottom: 24,
            }}>
              <Text style={{ color: '#F59E0B', fontSize: 12 }}>
                ⚠️ Esta accion no se puede deshacer
              </Text>
            </View>

            {/* Buttons */}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                onPress={() => setFloraDateModal(false)}
                style={{
                  flex: 1,
                  backgroundColor: '#1C2E1E',
                  borderRadius: 14,
                  paddingVertical: 14,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#728C74', fontWeight: '700', fontSize: 14 }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={confirmFlora}
                style={{
                  flex: 2,
                  backgroundColor: '#A855F7',
                  borderRadius: 14,
                  paddingVertical: 14,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '900', fontSize: 14 }}>Confirmar floracion</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  )
}

const sectionLabel = {
  color: '#728C74' as const,
  fontSize: 11,
  fontWeight: '700' as const,
  letterSpacing: 1.5,
  textTransform: 'uppercase' as const,
  marginBottom: 8,
}

const card = {
  backgroundColor: '#131D14',
  borderRadius: 20,
  borderWidth: 1,
  borderColor: '#1C2E1E',
  overflow: 'hidden' as const,
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
