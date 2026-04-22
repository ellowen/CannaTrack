import { useState, useEffect } from 'react'
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { usePlants } from '@/hooks/usePlants'
import { useTodayTasks } from '@/hooks/useTasks'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { awardXP, XP_VALUES } from '@/lib/xp'
import { CompleteTaskSheet } from '@/components/CompleteTaskSheet'

const TYPE_COLOR: Record<string, string> = {
  nutrition: '#22C55E', irrigation: '#3B82F6',
  observation: '#F59E0B', foliar: '#A855F7', harvest: '#EF4444',
}
const TYPE_LABEL: Record<string, string> = {
  nutrition: 'Nutricion', irrigation: 'Riego',
  observation: 'Observacion', foliar: 'Foliar', harvest: 'Cosecha',
}

export default function HomeScreen() {
  const { user } = useAuth()
  const { plants, loading: loadingPlants, refetch: refetchPlants } = usePlants()
  const { tasks, completeTask, refetch: refetchTasks } = useTodayTasks()
  const [username, setUsername]         = useState<string>('')
  const [streak, setStreak]             = useState(0)
  const [harvested, setHarvested]       = useState<{ id: string; name: string; genetics: string }[]>([])
  const [sheetTask, setSheetTask]       = useState<{ id: string; type: string; week: number; cycle: string } | null>(null)
  const pending = tasks.filter(t => !t.completed)
  const today = new Date()

  useEffect(() => {
    if (!user) return
    supabase.from('profiles').select('username, streak_days').eq('id', user.id).single()
      .then(({ data }) => {
        setUsername(data?.username ?? user.email?.split('@')[0] ?? 'Cultivador')
        setStreak(data?.streak_days ?? 0)
      })
    supabase.from('plants').select('id, name, genetics').eq('user_id', user.id).eq('status', 'harvested').order('created_at', { ascending: false }).limit(5)
      .then(({ data }) => setHarvested(data ?? []))
  }, [user])

  const greeting = () => {
    const h = today.getHours()
    if (h < 12) return 'Buenos dias'
    if (h < 20) return 'Buenas tardes'
    return 'Buenas noches'
  }

  async function handleComplete(taskId: string, notes?: string, ec?: number, ph?: number) {
    await completeTask(taskId, notes)
    if ((ec != null || ph != null) && user) {
      const plantId = tasks.find(t => t.id === taskId)?.plantId
      await supabase.from('measurements').insert({
        user_id: user.id, plant_id: plantId ?? null,
        ec: ec ?? null, ph: ph ?? null,
        notes: notes?.trim() || null,
      })
      void awardXP(user.id, XP_VALUES.COMPLETE_WITH_MEASUREMENT)
    }
    setSheetTask(null)
  }

  function onRefresh() {
    refetchPlants()
    refetchTasks()
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0C1410' }}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={loadingPlants} onRefresh={onRefresh} tintColor="#52CC64" />}
      >
        {/* Header */}
        <View style={{ marginBottom: 24 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
            <Text style={{ color: '#728C74', fontSize: 13, textTransform: 'capitalize' }}>
              {format(today, "EEEE d 'de' MMMM", { locale: es })}
            </Text>
            {streak > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#1A0E00', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: '#3D2200' }}>
                <Text style={{ fontSize: 13 }}>🔥</Text>
                <Text style={{ color: '#F59E0B', fontSize: 12, fontWeight: '800' }}>{streak}</Text>
              </View>
            )}
          </View>
          <Text style={{ color: '#E4F2E7', fontSize: 26, fontWeight: '900' }}>
            {greeting()}, {username || 'Cultivador'}
          </Text>
        </View>

        {/* Tareas de hoy */}
        {tasks.length > 0 && (
          <View style={{ marginBottom: 24 }}>
            <Text style={{ color: '#728C74', fontSize: 11, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 }}>
              {pending.length > 0 ? `⚡ HOY · ${pending.length} PENDIENTES` : '⚡ HOY · TODO LISTO'}
            </Text>
            <View style={{ backgroundColor: '#131D14', borderRadius: 20, borderWidth: 1, borderColor: '#1C2E1E', overflow: 'hidden' }}>
              {tasks.map((task, i) => {
                const plantName = plants.find(p => p.id === task.plantId)?.name ?? '—'
                return (
                  <View key={task.id} style={{
                    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                    paddingHorizontal: 16, paddingVertical: 14,
                    borderTopWidth: i > 0 ? 1 : 0, borderTopColor: '#1C2E1E',
                    opacity: task.completed ? 0.45 : 1,
                  }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: TYPE_COLOR[task.type] ?? '#9CA3AF' }} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: '#E4F2E7', fontWeight: '700', fontSize: 14, textDecorationLine: task.completed ? 'line-through' : 'none' }}>
                          {TYPE_LABEL[task.type] ?? task.type}
                        </Text>
                        <Text style={{ color: '#728C74', fontSize: 12, marginTop: 1 }}>🌿 {plantName}</Text>
                      </View>
                    </View>
                    {!task.completed && (
                      <TouchableOpacity
                        onPress={() => setSheetTask({ id: task.id, type: task.type, week: task.week, cycle: task.cycle })}
                        style={{ backgroundColor: '#0D2010', borderWidth: 1, borderColor: '#1A3D1E', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 7 }}
                      >
                        <Text style={{ color: '#52CC64', fontWeight: '700', fontSize: 12 }}>Hecho ✓</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )
              })}
            </View>
          </View>
        )}

        {/* Stats */}
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 24 }}>
          {[
            { label: 'Plantas', value: plants.length, emoji: '🌱' },
            { label: 'Tareas hoy', value: tasks.length, emoji: '⚡' },
          ].map(s => (
            <View key={s.label} style={{ flex: 1, backgroundColor: '#131D14', borderRadius: 20, borderWidth: 1, borderColor: '#1C2E1E', padding: 16, alignItems: 'center' }}>
              <Text style={{ fontSize: 22 }}>{s.emoji}</Text>
              <Text style={{ color: '#E4F2E7', fontSize: 24, fontWeight: '900', marginTop: 4 }}>{s.value}</Text>
              <Text style={{ color: '#3A5040', fontSize: 11, fontWeight: '600', marginTop: 2 }}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Plantas */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <Text style={{ color: '#728C74', fontSize: 11, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' }}>
            PLANTAS · {plants.length}
          </Text>
          <TouchableOpacity onPress={() => router.push('/plants/new')}>
            <Text style={{ color: '#52CC64', fontSize: 13, fontWeight: '700' }}>+ Nueva</Text>
          </TouchableOpacity>
        </View>

        {plants.length === 0 ? (
          <TouchableOpacity
            onPress={() => router.push('/onboarding')}
            style={{ backgroundColor: '#131D14', borderRadius: 20, borderWidth: 2, borderColor: '#52CC64', borderStyle: 'dashed', padding: 40, alignItems: 'center' }}
          >
            <Text style={{ fontSize: 48, marginBottom: 12 }}>🌱</Text>
            <Text style={{ color: '#E4F2E7', fontWeight: '900', fontSize: 17 }}>Crear primera planta</Text>
            <Text style={{ color: '#728C74', fontSize: 13, marginTop: 6, textAlign: 'center', lineHeight: 18 }}>
              Te guiamos paso a paso para configurar{'\n'}tu calendario de cultivo
            </Text>
            <View style={{ marginTop: 16, backgroundColor: '#52CC64', borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10 }}>
              <Text style={{ color: '#0C1410', fontWeight: '800', fontSize: 14 }}>Empezar →</Text>
            </View>
          </TouchableOpacity>
        ) : (
          <View style={{ gap: 12 }}>
            {plants.map(plant => (
              <TouchableOpacity
                key={plant.id}
                onPress={() => router.push(`/plants/${plant.id}`)}
                style={{ backgroundColor: '#131D14', borderRadius: 20, borderWidth: 1, borderColor: '#1C2E1E', overflow: 'hidden' }}
                activeOpacity={0.85}
              >
                <View style={{ backgroundColor: '#1A3D1E', padding: 16 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <View style={{ backgroundColor: '#0D2010', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                      <Text style={{ color: '#52CC64', fontSize: 10, fontWeight: '800' }}>
                        {plant.geneticType === 'autoflower' ? 'AUTO' : plant.geneticType === 'feminized' ? 'FEM' : 'REG'}
                      </Text>
                    </View>
                    <Text style={{ color: '#6DC278', fontSize: 11, fontWeight: '600' }}>{plant.status.toUpperCase()}</Text>
                  </View>
                  <Text style={{ color: '#E4F2E7', fontSize: 20, fontWeight: '900' }}>{plant.name}</Text>
                  <Text style={{ color: '#6DC278', fontSize: 13, marginTop: 2 }}>{plant.genetics}</Text>
                </View>
                <View style={{ padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Text style={{ color: '#728C74', fontSize: 12 }}>
                    📅 {format(plant.startDate, 'd MMM yyyy', { locale: es })}
                  </Text>
                  <Text style={{ color: '#728C74', fontSize: 12 }}>
                    {plant.location === 'indoor' ? '🏠 Indoor' : '☀️ Outdoor'}
                  </Text>
                  <Text style={{ color: '#728C74', fontSize: 12 }}>
                    🪴 {plant.potCount} × {plant.potVolumeLiters}L
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
        {/* Cosechas */}
        {harvested.length > 0 && (
          <View style={{ marginTop: 8 }}>
            <Text style={{ color: '#728C74', fontSize: 11, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12 }}>
              ✂️ COSECHADAS · {harvested.length}
            </Text>
            <View style={{ backgroundColor: '#131D14', borderRadius: 20, borderWidth: 1, borderColor: '#1C2E1E', overflow: 'hidden' }}>
              {harvested.map((p, i) => (
                <View key={p.id} style={{
                  flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12,
                  borderTopWidth: i > 0 ? 1 : 0, borderTopColor: '#1C2E1E', opacity: 0.6,
                }}>
                  <Text style={{ fontSize: 16, marginRight: 10 }}>✂️</Text>
                  <View>
                    <Text style={{ color: '#E4F2E7', fontSize: 13, fontWeight: '700' }}>{p.name}</Text>
                    <Text style={{ color: '#728C74', fontSize: 11, marginTop: 1 }}>{p.genetics}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

      </ScrollView>
      <CompleteTaskSheet
        visible={!!sheetTask}
        task={sheetTask}
        onClose={() => setSheetTask(null)}
        onComplete={handleComplete}
      />
    </SafeAreaView>
  )
}
