import { useState, useCallback, useRef } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  Alert, RefreshControl, TextInput,
} from 'react-native'
import Swipeable from 'react-native-gesture-handler/Swipeable'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { router, useFocusEffect } from 'expo-router'
import { format, differenceInDays, addDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { usePlants } from '@/hooks/usePlants'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import type { Plant } from '@shared/types/plant'

// pending tasks count per plant for today
type TaskMap = Record<string, number>
type FilterType = 'todas' | 'activas' | 'flora' | 'cosechadas' | 'descartadas'

const FILTERS: { key: FilterType; label: string; color: string; emptyIcon: string }[] = [
  { key: 'todas',      label: 'Todas',      color: '#52CC64', emptyIcon: '🌱' },
  { key: 'activas',    label: 'Vege',       color: '#52CC64', emptyIcon: '🌿' },
  { key: 'flora',      label: 'Flora',      color: '#F59E0B', emptyIcon: '🌸' },
  { key: 'cosechadas', label: 'Cosechadas', color: '#A78BFA', emptyIcon: '✂️' },
  { key: 'descartadas',label: 'Descartadas',color: '#EF4444', emptyIcon: '🗑️' },
]

export default function PlantsScreen() {
  const { user } = useAuth()
  const { plants } = usePlants()

  const [historyPlants, setHistoryPlants] = useState<Plant[]>([])
  const [todayTaskMap, setTodayTaskMap] = useState<TaskMap>({})
  const [refreshing, setRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<FilterType>('todas')

  const load = useCallback(async () => {
    if (!user) return
    const today0 = new Date(); today0.setHours(0, 0, 0, 0)
    const today1 = new Date(); today1.setHours(23, 59, 59, 999)

    const [{ data: hist }, { data: todayTasks }] = await Promise.all([
      supabase.from('plants').select('*').eq('user_id', user.id)
        .in('status', ['harvested', 'discarded']).order('created_at', { ascending: false }),
      supabase.from('scheduled_tasks').select('plant_id').eq('user_id', user.id)
        .eq('completed', false)
        .gte('scheduled_date', today0.toISOString().split('T')[0])
        .lte('scheduled_date', today0.toISOString().split('T')[0]),
    ])

    setHistoryPlants((hist ?? []).map(rowToPlant))

    const taskMap: TaskMap = {}
    for (const t of todayTasks ?? []) {
      taskMap[t.plant_id] = (taskMap[t.plant_id] ?? 0) + 1
    }
    setTodayTaskMap(taskMap)
  }, [user])

  useFocusEffect(load)

  async function onRefresh() {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  const q = searchQuery.toLowerCase().trim()
  const allPlants = [...plants, ...historyPlants]

  const counts: Record<FilterType, number> = {
    todas:       allPlants.length,
    activas:     plants.filter(p => !p.floraStartDate).length,
    flora:       plants.filter(p => !!p.floraStartDate).length,
    cosechadas:  historyPlants.filter(p => p.status === 'harvested').length,
    descartadas: historyPlants.filter(p => p.status === 'discarded').length,
  }

  const filteredPlants = allPlants.filter(p => {
    const matchSearch = !q || p.name.toLowerCase().includes(q) || p.genetics.toLowerCase().includes(q)
    if (!matchSearch) return false
    switch (activeFilter) {
      case 'activas':     return p.status === 'active' && !p.floraStartDate
      case 'flora':       return p.status === 'active' && !!p.floraStartDate
      case 'cosechadas':  return p.status === 'harvested'
      case 'descartadas': return p.status === 'discarded'
      default:            return true
    }
  })

  async function handleDeletePlant(plantId: string) {
    const { error } = await supabase.from('plants').update({ status: 'discarded' }).eq('id', plantId)
    if (error) { Alert.alert('Error', error.message); return }
    await load()
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#080E09' }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#52CC64" />}
      >
        {/* Header */}
        <LinearGradient colors={['#0F1F10', '#080E09']} style={{ paddingTop: 20, paddingBottom: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, paddingHorizontal: 20 }}>
            <View>
              <Text style={{ color: '#E8F5EA', fontSize: 28, fontWeight: '900', letterSpacing: -0.5 }}>Mis plantas</Text>
              <Text style={{ color: '#3A5040', fontSize: 12, marginTop: 2 }}>
                {counts.activas + counts.flora} activa{counts.activas + counts.flora !== 1 ? 's' : ''}
                {historyPlants.length > 0 ? ` · ${historyPlants.length} en historial` : ''}
              </Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/plants/new' as never)} activeOpacity={0.85} style={{ borderRadius: 14, overflow: 'hidden' }}>
              <LinearGradient colors={['#52CC64', '#3DAA50']} style={{ paddingHorizontal: 18, paddingVertical: 10 }}>
                <Text style={{ color: '#080E09', fontWeight: '900', fontSize: 13 }}>+ Nueva</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: '#1A3020', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11, marginHorizontal: 20, marginBottom: 14 }}>
            <Text style={{ color: '#2D4A30', marginRight: 8 }}>🔍</Text>
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Buscar planta..."
              placeholderTextColor="#2D4A30"
              style={{ flex: 1, color: '#E8F5EA', fontSize: 14 }}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Text style={{ color: '#3A5040', fontSize: 16 }}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Filter pills */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
            {FILTERS.map(f => {
              const isActive = activeFilter === f.key
              const count = counts[f.key]
              return (
                <TouchableOpacity key={f.key} onPress={() => setActiveFilter(f.key)} activeOpacity={0.8}>
                  {isActive ? (
                    <LinearGradient
                      colors={
                        f.key === 'flora'       ? ['rgba(245,158,11,0.25)', 'rgba(245,158,11,0.12)'] :
                        f.key === 'cosechadas'  ? ['rgba(167,139,250,0.25)', 'rgba(167,139,250,0.12)'] :
                        f.key === 'descartadas' ? ['rgba(239,68,68,0.2)', 'rgba(239,68,68,0.1)'] :
                        ['rgba(82,204,100,0.22)', 'rgba(82,204,100,0.1)']
                      }
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: f.color + '50' }}
                    >
                      <Text style={{ color: f.color, fontSize: 13, fontWeight: '800' }}>{f.label}</Text>
                      {count > 0 && (
                        <View style={{ backgroundColor: f.color + '30', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1 }}>
                          <Text style={{ color: f.color, fontSize: 11, fontWeight: '900' }}>{count}</Text>
                        </View>
                      )}
                    </LinearGradient>
                  ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: '#1A2A1A' }}>
                      <Text style={{ color: '#3A5040', fontSize: 13, fontWeight: '700' }}>{f.label}</Text>
                      {count > 0 && (
                        <Text style={{ color: '#2D4A30', fontSize: 11, fontWeight: '700' }}>{count}</Text>
                      )}
                    </View>
                  )}
                </TouchableOpacity>
              )
            })}
          </ScrollView>
        </LinearGradient>

        {/* Lista filtrada */}
        <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
          {filteredPlants.length === 0 ? (
            <TouchableOpacity
              onPress={activeFilter === 'todas' || activeFilter === 'activas' || activeFilter === 'flora' ? () => router.push('/plants/new' as never) : undefined}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#0D1A0F', '#080E09']}
                style={{ borderRadius: 22, padding: 48, alignItems: 'center', borderWidth: 1, borderColor: '#1A3020', borderStyle: 'dashed' }}
              >
                <Text style={{ fontSize: 48, marginBottom: 14 }}>
                  {FILTERS.find(f => f.key === activeFilter)?.emptyIcon ?? '🌱'}
                </Text>
                <Text style={{ color: '#E8F5EA', fontWeight: '900', fontSize: 17 }}>
                  {activeFilter === 'todas' ? 'Sin plantas' :
                   activeFilter === 'activas' ? 'Sin plantas en vege' :
                   activeFilter === 'flora' ? 'Sin plantas en flora' :
                   activeFilter === 'cosechadas' ? 'Sin cosechas aun' :
                   'Sin plantas descartadas'}
                </Text>
                {(activeFilter === 'todas' || activeFilter === 'activas') && (
                  <Text style={{ color: '#3D6642', fontSize: 13, marginTop: 6, textAlign: 'center', lineHeight: 20 }}>
                    Toca para crear tu primera planta
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            filteredPlants.map(plant =>
              plant.status === 'active' ? (
                <ActivePlantCard
                  key={plant.id}
                  plant={plant}
                  pendingToday={todayTaskMap[plant.id] ?? 0}
                  onDelete={() => {
                    Alert.alert(
                      'Descartar planta',
                      `¿Seguro que queres descartar "${plant.name}"?`,
                      [
                        { text: 'Cancelar', style: 'cancel' },
                        { text: 'Descartar', style: 'destructive', onPress: () => handleDeletePlant(plant.id) },
                      ]
                    )
                  }}
                />
              ) : (
                <HistoryPlantCard key={plant.id} plant={plant} />
              )
            )
          )}
        </View>
      </ScrollView>

    </SafeAreaView>
  )
}

// ─── Active Plant Card ──────────────────────────────────────────────────────

function ActivePlantCard({ plant, pendingToday, onDelete }: { plant: Plant; pendingToday: number; onDelete: () => void }) {
  const swipeRef = useRef<Swipeable>(null)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const isFlora = !!plant.floraStartDate
  const accentColor = isFlora ? '#F59E0B' : '#52CC64'
  const totalDays = differenceInDays(today, plant.startDate) + 1
  const phaseDay = isFlora && plant.floraStartDate
    ? differenceInDays(today, plant.floraStartDate) + 1
    : totalDays
  const phaseWeek = Math.ceil(phaseDay / 7)

  // Harvest estimate
  let daysToHarvest: number | null = null
  if (plant.geneticType === 'autoflower') {
    daysToHarvest = differenceInDays(addDays(plant.startDate, plant.autoFlowerTotalDays ?? 77), today)
  } else if (plant.floraStartDate) {
    daysToHarvest = differenceInDays(addDays(plant.floraStartDate, 56), today)
  }

  const gradientColors: [string, string, string] = isFlora
    ? ['#1A0E00', '#0E0800', '#080A09']
    : ['#0A1A0C', '#06100A', '#080A09']
  const borderColor = isFlora ? '#2D1800' : '#142214'
  const phaseIcon = isFlora ? '🌸' : '🌿'

  function renderRightActions() {
    return (
      <TouchableOpacity
        onPress={() => { swipeRef.current?.close(); onDelete() }}
        style={{ width: 76, marginBottom: 12, borderRadius: 20, overflow: 'hidden' }}
        activeOpacity={0.85}
      >
        <LinearGradient
          colors={['#3D0A0A', '#200505']}
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 }}
        >
          <Text style={{ fontSize: 22 }}>🗑️</Text>
          <Text style={{ color: '#EF4444', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 }}>DESCARTAR</Text>
        </LinearGradient>
      </TouchableOpacity>
    )
  }

  return (
    <Swipeable ref={swipeRef} renderRightActions={renderRightActions} overshootRight={false} friction={2}>
    <TouchableOpacity onPress={() => router.push(`/plants/${plant.id}`)} activeOpacity={0.85} style={{ marginBottom: 12 }}>
      <LinearGradient colors={gradientColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={{ borderRadius: 20, borderWidth: 1, borderColor, overflow: 'hidden' }}
      >
        {/* Left accent bar */}
        <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, backgroundColor: accentColor, borderTopLeftRadius: 20, borderBottomLeftRadius: 20 }} />

        <View style={{ padding: 16, paddingLeft: 18 }}>
          {/* Top row */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            {/* Icon */}
            <LinearGradient
              colors={isFlora ? ['#3D2000', '#1F1000'] : ['#1A3D1E', '#0D2010']}
              style={{ width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 12, borderWidth: 1, borderColor: isFlora ? '#5A3200' : '#2A5A2E' }}
            >
              <Text style={{ fontSize: 24 }}>{phaseIcon}</Text>
            </LinearGradient>

            {/* Name + chips */}
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#E8F5EA', fontSize: 18, fontWeight: '900', lineHeight: 20 }} numberOfLines={1}>{plant.name}</Text>
              <Text style={{ color: isFlora ? '#8A5A20' : '#4A7A50', fontSize: 12, marginTop: 2 }} numberOfLines={1}>{plant.genetics}</Text>
              <View style={{ flexDirection: 'row', gap: 5, marginTop: 7, flexWrap: 'wrap' }}>
                <View style={{ backgroundColor: isFlora ? 'rgba(245,158,11,0.15)' : 'rgba(82,204,100,0.12)', borderRadius: 5, paddingHorizontal: 7, paddingVertical: 2, borderWidth: 1, borderColor: isFlora ? 'rgba(245,158,11,0.25)' : 'rgba(82,204,100,0.2)' }}>
                  <Text style={{ color: accentColor, fontSize: 9, fontWeight: '900', letterSpacing: 0.8 }}>{isFlora ? 'FLORA' : 'VEGE'}</Text>
                </View>
                <View style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 5, paddingHorizontal: 7, paddingVertical: 2 }}>
                  <Text style={{ color: '#4A6A50', fontSize: 9, fontWeight: '700' }}>
                    {plant.geneticType === 'autoflower' ? 'AUTO' : plant.geneticType === 'feminized' ? 'FEM' : 'REG'}
                  </Text>
                </View>
                <View style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 5, paddingHorizontal: 7, paddingVertical: 2 }}>
                  <Text style={{ color: '#3A5040', fontSize: 9, fontWeight: '700' }}>
                    {plant.location === 'indoor' ? '🏠' : '☀️'} {plant.potCount}×{plant.potVolumeLiters}L
                  </Text>
                </View>
              </View>
            </View>

            {/* Day counter */}
            <View style={{ alignItems: 'flex-end', minWidth: 48 }}>
              <Text style={{ color: accentColor, fontSize: 28, fontWeight: '900', lineHeight: 30 }}>
                {isFlora ? `F${phaseWeek}` : `V${phaseWeek}`}
              </Text>
              <Text style={{ color: isFlora ? '#5A3000' : '#2A5A2E', fontSize: 11, fontWeight: '700' }}>D{phaseDay}</Text>
              <Text style={{ color: '#2A3A2C', fontSize: 9, marginTop: 2 }}>{totalDays}d total</Text>
            </View>
          </View>

          {/* Bottom stats bar */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: isFlora ? '#2D1800' : '#142214', gap: 8, flexWrap: 'wrap' }}>
            <Text style={{ color: isFlora ? '#5A3800' : '#2A5040', fontSize: 13 }}>
              📅 {format(plant.startDate, 'd MMM yyyy', { locale: es })}
            </Text>

            {daysToHarvest != null && daysToHarvest > 0 && (
              <View style={{ backgroundColor: daysToHarvest <= 14 ? 'rgba(192,132,252,0.12)' : isFlora ? 'rgba(245,158,11,0.1)' : 'rgba(82,204,100,0.08)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: daysToHarvest <= 14 ? 'rgba(192,132,252,0.25)' : 'rgba(245,158,11,0.15)' }}>
                <Text style={{ color: daysToHarvest <= 14 ? '#C084FC' : accentColor, fontSize: 10, fontWeight: '700' }}>
                  🌾 {daysToHarvest}d cosecha
                </Text>
              </View>
            )}
            {daysToHarvest != null && daysToHarvest <= 0 && (
              <View style={{ backgroundColor: 'rgba(239,68,68,0.12)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                <Text style={{ color: '#EF4444', fontSize: 10, fontWeight: '800' }}>⚡ Lista para cosechar</Text>
              </View>
            )}

            {pendingToday > 0 && (
              <View style={{ backgroundColor: 'rgba(82,204,100,0.12)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: 'rgba(82,204,100,0.2)', marginLeft: 'auto' }}>
                <Text style={{ color: '#52CC64', fontSize: 10, fontWeight: '800' }}>
                  {pendingToday} tarea{pendingToday > 1 ? 's' : ''} hoy
                </Text>
              </View>
            )}
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
    </Swipeable>
  )
}

// ─── History Plant Card ─────────────────────────────────────────────────────

function HistoryPlantCard({ plant }: { plant: Plant }) {
  const isHarvested = plant.status === 'harvested'
  const totalDays = differenceInDays(new Date(), plant.startDate)
  const accentColor = isHarvested ? '#F59E0B' : '#EF4444'
  const icon = isHarvested ? '✂️' : '🗑️'

  return (
    <TouchableOpacity onPress={() => router.push(`/plants/${plant.id}`)} activeOpacity={0.85} style={{ marginBottom: 10 }}>
      <LinearGradient
        colors={isHarvested ? ['#150E00', '#0E0800'] : ['#150505', '#0E0303']}
        style={{ borderRadius: 18, borderWidth: 1, borderColor: isHarvested ? '#2A1800' : '#2A0808', overflow: 'hidden' }}
      >
        {/* Left accent bar */}
        <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, backgroundColor: accentColor, opacity: 0.5, borderTopLeftRadius: 18, borderBottomLeftRadius: 18 }} />

        <View style={{ padding: 14, paddingLeft: 18, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: isHarvested ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.08)', borderWidth: 1, borderColor: isHarvested ? 'rgba(245,158,11,0.2)' : 'rgba(239,68,68,0.15)', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 20 }}>{icon}</Text>
          </View>

          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 }}>
              <Text style={{ color: '#B8B8B8', fontSize: 17, fontWeight: '800' }} numberOfLines={1}>{plant.name}</Text>
              <View style={{ backgroundColor: isHarvested ? 'rgba(245,158,11,0.12)' : 'rgba(239,68,68,0.1)', borderRadius: 5, paddingHorizontal: 6, paddingVertical: 1 }}>
                <Text style={{ color: accentColor, fontSize: 9, fontWeight: '900' }}>
                  {isHarvested ? 'COSECHADA' : 'DESCARTADA'}
                </Text>
              </View>
            </View>
            <Text style={{ color: '#555', fontSize: 13 }} numberOfLines={1}>{plant.genetics}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 5 }}>
              <Text style={{ color: '#3A3A3A', fontSize: 12 }}>
                📅 {format(plant.startDate, 'd MMM yy', { locale: es })}
              </Text>
              <Text style={{ color: '#3A3A3A', fontSize: 12 }}>
                {totalDays}d cultivada
              </Text>
              <Text style={{ color: '#3A3A3A', fontSize: 12 }}>
                {plant.geneticType === 'autoflower' ? 'AUTO' : plant.geneticType === 'feminized' ? 'FEM' : 'REG'}
              </Text>
            </View>
          </View>

          <Text style={{ color: '#3A3A3A', fontSize: 16 }}>›</Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  )
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
    autoFlowerTotalDays: (row.auto_flower_total_days as number) ?? 77,
    location:         (row.location as Plant['location']) ?? 'indoor',
    potCount:         (row.pot_count as number) ?? 1,
    potVolumeLiters:  (row.pot_volume_liters as number) ?? 11,
    nutritionTableId: (row.nutrition_table_id as string) ?? 'revegetar',
    availableProducts:(row.available_products as string[]) ?? [],
    status:           (row.status as Plant['status']) ?? 'active',
    notes:            (row.notes as string) ?? '',
  }
}
