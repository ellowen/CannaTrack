import { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import { format, differenceInDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { startFloraPhase } from '@shared/lib/nutrition-engine'
import { getCurrentWeek, getEstimatedHarvestDate } from '@shared/lib/nutrition-utils'
import { REVEGETAR_TABLE } from '@shared/data/revegetar-table'
import { colors, spacing, radius } from '@/constants/theme'
import type { Plant, ScheduledTask } from '@shared/types/plant'

const STAGE_LABELS: Record<string, string> = {
  rooting: 'Enraizamiento', growth: 'Crecimiento', preflower: 'Pre-Flora',
  stretch: 'Estiramiento', bulking: 'Engorde', ripening: 'Maduracion',
  flushing: 'Limpieza', harvested: 'Cosechada',
}

const TASK_COLOR: Record<string, string> = {
  nutrition: colors.task.nutrition, irrigation: colors.task.irrigation,
  observation: colors.task.observation, foliar: colors.task.foliar, harvest: colors.task.harvest,
}

const TASK_LABEL: Record<string, string> = {
  nutrition: 'Nutricion', irrigation: 'Riego',
  observation: 'Observacion', foliar: 'Foliar', harvest: 'Cosecha',
}

export default function PlantDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { user } = useAuth()
  const [plant, setPlant]       = useState<Plant | null>(null)
  const [tasks, setTasks]       = useState<ScheduledTask[]>([])
  const [loading, setLoading]   = useState(true)
  const [startingFlora, setStartingFlora] = useState(false)

  useEffect(() => {
    async function load() {
      const [{ data: p }, { data: t }] = await Promise.all([
        supabase.from('plants').select('*').eq('id', id).single(),
        supabase.from('scheduled_tasks').select('*').eq('plant_id', id).order('scheduled_date'),
      ])
      if (p) setPlant(rowToPlant(p))
      setTasks((t ?? []).map(rowToTask))
      setLoading(false)
    }
    load()
  }, [id])

  async function completeTask(taskId: string) {
    await supabase
      .from('scheduled_tasks')
      .update({ completed: true, completed_at: new Date().toISOString() })
      .eq('id', taskId)
    setTasks(ts => ts.map(t => t.id === taskId ? { ...t, completed: true } : t))
  }

  async function handleStartFlora() {
    if (!plant || !user) return
    Alert.alert(
      'Iniciar Floracion',
      'Esto regenera el calendario completo con las semanas de flora. Los datos existentes de tareas se reemplazaran.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Iniciar',
          style: 'default',
          onPress: async () => {
            setStartingFlora(true)
            try {
              const floraDate = new Date()
              const newTasks = startFloraPhase(plant, floraDate, REVEGETAR_TABLE)

              await supabase.from('scheduled_tasks').delete().eq('plant_id', plant.id)

              const { error: insertErr } = await supabase.from('scheduled_tasks').insert(
                newTasks.map(t => ({
                  user_id:        user.id,
                  plant_id:       plant.id,
                  type:           t.type,
                  scheduled_date: t.scheduledDate.toISOString(),
                  cycle:          t.cycle,
                  week:           t.week,
                  stage:          t.stage,
                  products:       t.products,
                  ec_min:         t.ecMin ?? null,
                  ec_max:         t.ecMax ?? null,
                  ph_min:         t.phMin ?? null,
                  ph_max:         t.phMax ?? null,
                  completed:      false,
                }))
              )
              if (insertErr) throw insertErr

              await supabase
                .from('plants')
                .update({ flora_start_date: floraDate.toISOString().split('T')[0] })
                .eq('id', plant.id)

              setPlant({ ...plant, floraStartDate: floraDate })
              setTasks(newTasks)
            } catch (e: unknown) {
              Alert.alert('Error', (e as Error)?.message ?? 'No se pudo iniciar la floracion')
            } finally {
              setStartingFlora(false)
            }
          },
        },
      ]
    )
  }

  if (loading) return (
    <SafeAreaView style={s.loadWrap}>
      <ActivityIndicator color={colors.brand.green} size="large" />
    </SafeAreaView>
  )

  if (!plant) return (
    <SafeAreaView style={s.loadWrap}>
      <Text style={{ color: colors.text.secondary }}>Planta no encontrada</Text>
    </SafeAreaView>
  )

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const todayTasks = tasks.filter(t => {
    const d = new Date(t.scheduledDate); d.setHours(0, 0, 0, 0)
    return d.getTime() === today.getTime()
  })
  const upcoming = tasks.filter(t => {
    const d = new Date(t.scheduledDate); d.setHours(0, 0, 0, 0)
    return d > today && !t.completed
  }).slice(0, 5)

  const daysSinceStart = differenceInDays(today, plant.startDate)
  const isFlora        = !!plant.floraStartDate
  const currentWeek    = getCurrentWeek(plant, today)
  const harvestDate    = getEstimatedHarvestDate(plant)
  const daysToHarvest  = harvestDate ? differenceInDays(harvestDate, today) : null

  const canStartFlora = plant.geneticType !== 'autoflower' && !plant.floraStartDate && plant.status === 'active'

  // Nutrition task for today (to show products in current week section)
  const todayNutrition = todayTasks.find(t => t.type === 'nutrition')

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg.primary }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>

        {/* Header */}
        <View style={s.header}>
          <View style={s.headerTop}>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={{ color: colors.text.green, fontSize: 26 }}>←</Text>
            </TouchableOpacity>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={[s.pill, { backgroundColor: colors.brand.greenBg }]}>
                <Text style={{ color: colors.brand.green, fontSize: 11, fontWeight: '800' }}>
                  {isFlora ? 'FLORA' : 'VEGE'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => router.push(`/plants/${id}/edit`)}
                style={[s.pill, { backgroundColor: colors.brand.greenBg }]}
              >
                <Text style={{ color: colors.brand.green, fontSize: 16 }}>⚙️</Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={s.plantName}>{plant.name}</Text>
          <Text style={{ color: colors.text.green, fontSize: 14, marginTop: 2 }}>{plant.genetics}</Text>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12 }}>
            <Text style={s.chip}>📅 Dia {daysSinceStart}</Text>
            {currentWeek && (
              <Text style={s.chip}>
                {currentWeek.cycle === 'vege' ? `🌿 V${currentWeek.week}` : `🌸 F${currentWeek.week}`}
                {' '}{STAGE_LABELS[currentWeek.stage] ?? currentWeek.stage}
              </Text>
            )}
            {daysToHarvest !== null && daysToHarvest > 0 && (
              <Text style={s.chip}>✂️ {daysToHarvest}d para cosecha</Text>
            )}
            <Text style={s.chip}>
              {plant.location === 'indoor' ? '🏠 Indoor' : '☀️ Outdoor'}
            </Text>
            <Text style={s.chip}>🪴 {plant.potCount} × {plant.potVolumeLiters ?? 11}L</Text>
          </View>
        </View>

        <View style={{ padding: spacing.md, gap: spacing.lg }}>

          {/* Iniciar Floracion */}
          {canStartFlora && (
            <TouchableOpacity
              onPress={handleStartFlora}
              disabled={startingFlora}
              style={s.floraBtn}
            >
              {startingFlora
                ? <ActivityIndicator color="#fff" size="small" />
                : <>
                    <Text style={{ fontSize: 20 }}>🌸</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Iniciar Floracion</Text>
                      <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 }}>
                        Regenera el calendario con semanas de flora
                      </Text>
                    </View>
                    <Text style={{ color: '#fff', fontSize: 18 }}>→</Text>
                  </>
              }
            </TouchableOpacity>
          )}

          {/* Semana nutricional actual */}
          {currentWeek && (todayNutrition || (currentWeek.stage === 'flushing')) && (
            <View>
              <Text style={s.sectionLabel}>ESTA SEMANA</Text>
              <View style={s.card}>
                <View style={{ padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border.default }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ color: colors.text.primary, fontWeight: '800', fontSize: 16 }}>
                      {currentWeek.cycle === 'vege' ? `Semana V${currentWeek.week}` : `Semana F${currentWeek.week}`}
                    </Text>
                    <Text style={{ color: colors.text.secondary, fontSize: 12 }}>
                      {STAGE_LABELS[currentWeek.stage]}
                    </Text>
                  </View>
                  {todayNutrition && (
                    <View style={{ flexDirection: 'row', gap: spacing.lg, marginTop: 8 }}>
                      {todayNutrition.ecMin != null && (
                        <Text style={{ color: colors.text.secondary, fontSize: 12 }}>
                          EC {todayNutrition.ecMin}–{todayNutrition.ecMax}
                        </Text>
                      )}
                      {todayNutrition.phMin != null && (
                        <Text style={{ color: colors.text.secondary, fontSize: 12 }}>
                          pH {todayNutrition.phMin}–{todayNutrition.phMax}
                        </Text>
                      )}
                    </View>
                  )}
                </View>
                {todayNutrition?.products && todayNutrition.products.length > 0 && (
                  <View>
                    {todayNutrition.products.map((p, i) => (
                      <View key={i} style={[s.productRow, { borderTopWidth: i > 0 ? 1 : 0, borderTopColor: colors.border.default }]}>
                        <View style={s.productDot} />
                        <Text style={{ color: colors.text.primary, flex: 1, fontSize: 13 }}>{p.name}</Text>
                        <Text style={{ color: colors.text.secondary, fontSize: 12 }}>
                          {p.minDose}–{p.maxDose} {p.unit}/L
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
                {currentWeek.stage === 'flushing' && !todayNutrition && (
                  <View style={{ padding: spacing.md }}>
                    <Text style={{ color: colors.text.secondary, fontSize: 13 }}>
                      💧 Solo agua — semana de limpieza
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Tareas de hoy */}
          {todayTasks.length > 0 && (
            <View>
              <Text style={s.sectionLabel}>⚡ HOY</Text>
              <View style={s.card}>
                {todayTasks.map((task, i) => (
                  <View key={task.id} style={[s.taskRow, { borderTopWidth: i > 0 ? 1 : 0, borderTopColor: colors.border.default, opacity: task.completed ? 0.4 : 1 }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: TASK_COLOR[task.type] }} />
                      <View>
                        <Text style={{ color: colors.text.primary, fontWeight: '700', fontSize: 14 }}>
                          {TASK_LABEL[task.type]}
                        </Text>
                        <Text style={{ color: colors.text.secondary, fontSize: 11, marginTop: 1 }}>
                          {task.cycle === 'vege' ? `V${task.week}` : `F${task.week}`} · {STAGE_LABELS[task.stage] ?? task.stage}
                        </Text>
                        {task.products?.length > 0 && (
                          <Text style={{ color: colors.text.muted, fontSize: 11, marginTop: 2 }}>
                            {task.products.slice(0, 2).map((p: { name: string }) => p.name).join(' · ')}
                            {task.products.length > 2 ? ` +${task.products.length - 2}` : ''}
                          </Text>
                        )}
                      </View>
                    </View>
                    {!task.completed && (
                      <TouchableOpacity
                        onPress={() => completeTask(task.id)}
                        style={s.doneBtn}
                      >
                        <Text style={{ color: colors.brand.green, fontWeight: '700', fontSize: 12 }}>Hecho ✓</Text>
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
              <Text style={s.sectionLabel}>PROXIMAS TAREAS</Text>
              <View style={s.card}>
                {upcoming.map((task, i) => (
                  <View key={task.id} style={[s.taskRow, { borderTopWidth: i > 0 ? 1 : 0, borderTopColor: colors.border.default }]}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: TASK_COLOR[task.type] }} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.text.primary, fontWeight: '600', fontSize: 13 }}>
                        {TASK_LABEL[task.type]}
                        <Text style={{ color: colors.text.muted }}> · {task.cycle === 'vege' ? `V${task.week}` : `F${task.week}`}</Text>
                      </Text>
                      <Text style={{ color: colors.text.secondary, fontSize: 12, marginTop: 1, textTransform: 'capitalize' }}>
                        {format(new Date(task.scheduledDate), 'EEEE d MMM', { locale: es })}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {todayTasks.length === 0 && upcoming.length === 0 && !canStartFlora && (
            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
              <Text style={{ fontSize: 32 }}>🌤️</Text>
              <Text style={{ color: colors.text.secondary, marginTop: 8, fontSize: 14 }}>Sin tareas pendientes</Text>
            </View>
          )}

          {/* Acciones rapidas */}
          <View style={{ gap: 12 }}>
            <Text style={s.sectionLabel}>ACCIONES RAPIDAS</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                onPress={() => router.push(`/plants/${id}/diary`)}
                style={s.quickAction}
              >
                <Text style={{ fontSize: 20, marginBottom: 4 }}>📸</Text>
                <Text style={{ color: colors.text.primary, fontSize: 11, fontWeight: '700' }}>Diario</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push(`/plants/${id}/measurements`)}
                style={s.quickAction}
              >
                <Text style={{ fontSize: 20, marginBottom: 4 }}>📊</Text>
                <Text style={{ color: colors.text.primary, fontSize: 11, fontWeight: '700' }}>Medicion</Text>
              </TouchableOpacity>
            </View>
          </View>

        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  loadWrap: { flex: 1, backgroundColor: '#0C1410', alignItems: 'center', justifyContent: 'center' },
  header: { backgroundColor: '#1A3D1E', padding: 20, paddingTop: 16 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  pill: { borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 4 },
  plantName: { color: colors.text.primary, fontSize: 28, fontWeight: '900' },
  chip: { color: colors.text.green, fontSize: 12 },
  sectionLabel: {
    color: colors.text.secondary, fontSize: 11, fontWeight: '700',
    letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8,
  },
  card: {
    backgroundColor: colors.bg.surface, borderRadius: radius.xl,
    borderWidth: 1, borderColor: colors.border.default, overflow: 'hidden',
  },
  taskRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 14 },
  productRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: spacing.md },
  productDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.brand.green },
  doneBtn: { backgroundColor: colors.brand.greenBg, borderWidth: 1, borderColor: '#1A3D1E', borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 7 },
  quickAction: { flex: 1, backgroundColor: colors.bg.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border.default, padding: 12, alignItems: 'center' },
  floraBtn: {
    backgroundColor: '#7C3AED', borderRadius: radius.lg, padding: spacing.md,
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
  },
})

function rowToPlant(row: Record<string, unknown>): Plant {
  return {
    id:                  row.id as string,
    name:                row.name as string,
    genetics:            row.genetics as string,
    geneticType:         row.genetic_type as Plant['geneticType'],
    sex:                 (row.sex as Plant['sex']) ?? 'unknown',
    startDate:           new Date(row.start_date as string),
    floraStartDate:      row.flora_start_date ? new Date(row.flora_start_date as string) : undefined,
    autoFlowerTotalDays: (row.auto_flower_total_days as number) ?? 75,
    location:            (row.location as Plant['location']) ?? 'indoor',
    potCount:            (row.pot_count as number) ?? 1,
    potVolumeLiters:     (row.pot_volume_liters as number) ?? 11,
    nutritionTableId:    (row.nutrition_table_id as string) ?? 'revegetar',
    availableProducts:   (row.available_products as string[]) ?? [],
    status:              (row.status as Plant['status']) ?? 'active',
    notes:               (row.notes as string) ?? '',
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
    stage:         row.stage as ScheduledTask['stage'],
    products:      (row.products as ScheduledTask['products']) ?? [],
    ecMin:         row.ec_min as number | undefined,
    ecMax:         row.ec_max as number | undefined,
    phMin:         row.ph_min as number | undefined,
    phMax:         row.ph_max as number | undefined,
    completed:     (row.completed as boolean) ?? false,
  }
}
