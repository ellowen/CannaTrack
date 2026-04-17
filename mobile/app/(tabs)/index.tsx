import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { usePlants } from '@/hooks/usePlants'
import { useTodayTasks } from '@/hooks/useTasks'
import { useAuth } from '@/hooks/useAuth'

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
  const pending = tasks.filter(t => !t.completed)
  const today = new Date()

  const greeting = () => {
    const h = today.getHours()
    if (h < 12) return 'Buenos dias'
    if (h < 20) return 'Buenas tardes'
    return 'Buenas noches'
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
          <Text style={{ color: '#728C74', fontSize: 13, marginBottom: 2, textTransform: 'capitalize' }}>
            {format(today, "EEEE d 'de' MMMM", { locale: es })}
          </Text>
          <Text style={{ color: '#E4F2E7', fontSize: 26, fontWeight: '900' }}>
            {greeting()}, Cultivador
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
                        onPress={() => completeTask(task.id)}
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
            onPress={() => router.push('/plants/new')}
            style={{ backgroundColor: '#131D14', borderRadius: 20, borderWidth: 2, borderColor: '#1C2E1E', borderStyle: 'dashed', padding: 40, alignItems: 'center' }}
          >
            <Text style={{ fontSize: 32, marginBottom: 8 }}>🌱</Text>
            <Text style={{ color: '#E4F2E7', fontWeight: '700', fontSize: 15 }}>Agregar primera planta</Text>
            <Text style={{ color: '#3A5040', fontSize: 12, marginTop: 4 }}>El calendario se genera automaticamente</Text>
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
                    🪴 {plant.potsCount} × {plant.potLiters}L
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
