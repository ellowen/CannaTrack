import { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import { format, differenceInDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { supabase } from '@/lib/supabase'
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
  const [plant, setPlant]   = useState<Plant | null>(null)
  const [tasks, setTasks]   = useState<ScheduledTask[]>([])
  const [loading, setLoading] = useState(true)

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
  const isFlora = !!plant.floraStartDate

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
            </View>
          </View>
          <Text style={{ color: '#E4F2E7', fontSize: 28, fontWeight: '900' }}>{plant.name}</Text>
          <Text style={{ color: '#6DC278', fontSize: 14, marginTop: 2 }}>{plant.genetics}</Text>
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
            <Text style={{ color: '#6DC278', fontSize: 12 }}>📅 Dia {daysSinceStart}</Text>
            <Text style={{ color: '#6DC278', fontSize: 12 }}>
              {plant.location === 'indoor' ? '🏠 Indoor' : '☀️ Outdoor'}
            </Text>
            <Text style={{ color: '#6DC278', fontSize: 12 }}>🪴 {plant.potsCount} × {plant.potLiters}L</Text>
          </View>
        </View>

        <View style={{ padding: 16, gap: 20 }}>

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
                        onPress={() => completeTask(task.id)}
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
    potsCount:        (row.pot_count as number) ?? 1,
    potLiters:        (row.pot_volume_liters as number) ?? 11,
    nutritionTableId: (row.nutrition_table_id as string) ?? 'revegetar',
    availableProducts: (row.available_products as string[]) ?? [],
    status:           (row.status as Plant['status']) ?? 'active',
    notes:            (row.notes as string) ?? '',
    tasks:            [],
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
    stage:         (row.stage as string) ?? '',
    products:      (row.products as ScheduledTask['products']) ?? [],
    ecMin:         row.ec_min as number,
    ecMax:         row.ec_max as number,
    phMin:         row.ph_min as number,
    phMax:         row.ph_max as number,
    completed:     (row.completed as boolean) ?? false,
  }
}
