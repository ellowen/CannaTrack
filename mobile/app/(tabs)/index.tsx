import { useState, useEffect } from 'react'
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { format, differenceInDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { usePlants } from '@/hooks/usePlants'
import { useTasks } from '@/hooks/useTasks'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { completeTaskInSupabase } from '@/lib/sync'
import { awardXP, recordDailyActivity, XP_VALUES } from '@/lib/xp'
import { getLevelInfo } from '@shared/lib/gamification'
import { CompleteTaskSheet, type SheetTask } from '@/components/CompleteTaskSheet'
import type { ScheduledTask, Plant } from '@shared/types/plant'

const TYPE_ICON: Record<string, string> = {
  nutrition: '🍃', irrigation: '💧',
  observation: '🔍', foliar: '🌫️', harvest: '✂️',
}
const TYPE_LABEL: Record<string, string> = {
  nutrition: 'Nutricion', irrigation: 'Riego',
  observation: 'Observacion', foliar: 'Foliar', harvest: 'Cosecha',
}

type ArchivedPlant = { id: string; name: string; genetics: string; status: string; startDate: Date }

export default function HomeScreen() {
  const { user }  = useAuth()
  const { plants } = usePlants()
  const { todayTasks: tasks, completeTask } = useTasks()

  const [username, setUsername]       = useState('')
  const [streak, setStreak]           = useState(0)
  const [xp, setXp]                   = useState(0)
  const [overdueTasks, setOverdueTasks] = useState<ScheduledTask[]>([])
  const [archived, setArchived]       = useState<ArchivedPlant[]>([])
  const [historialOpen, setHistorialOpen] = useState(false)
  const [sheetTask, setSheetTask]     = useState<SheetTask | null>(null)
  const [refreshing, setRefreshing]   = useState(false)

  const today    = new Date()
  today.setHours(0, 0, 0, 0)
  const pending  = tasks.filter((t: ScheduledTask) => !t.completed)
  const done     = tasks.filter((t: ScheduledTask) => t.completed)
  const allDone  = tasks.length > 0 && pending.length === 0

  const levelInfo = getLevelInfo(xp)

  // Grupos por planta (multi-plant view)
  const plantIdsWithTasks = [...new Set(pending.map((t: ScheduledTask) => t.plantId))]
  const multiPlant        = plantIdsWithTasks.length > 1
  const taskGroups        = plantIdsWithTasks.map((pid: string) => ({
    plant: plants.find((p) => p.id === pid),
    tasks: pending.filter((t: ScheduledTask) => t.plantId === pid),
  }))

  const longestGrowDays = plants.length > 0
    ? Math.max(...plants.map(p => differenceInDays(new Date(), p.startDate)))
    : 0
  const harvestedCount = archived.filter(p => p.status === 'harvested').length

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Buenos dias' : hour < 20 ? 'Buenas tardes' : 'Buenas noches'

  useEffect(() => {
    if (!user) return
    loadData()
  }, [user])

  async function loadData() {
    if (!user) return
    const todayStr = today.toISOString().split('T')[0]

    const [profileRes, overdueRes, archivedRes] = await Promise.all([
      supabase.from('profiles').select('username, streak_days, xp').eq('id', user.id).single(),
      supabase.from('scheduled_tasks')
        .select('*')
        .eq('user_id', user.id)
        .eq('completed', false)
        .lt('scheduled_date', todayStr)
        .order('scheduled_date'),
      supabase.from('plants')
        .select('id, name, genetics, status, start_date')
        .eq('user_id', user.id)
        .in('status', ['harvested', 'discarded'])
        .order('created_at', { ascending: false }),
    ])

    if (profileRes.data) {
      setUsername(profileRes.data.username ?? user.email?.split('@')[0] ?? 'Cultivador')
      setStreak(profileRes.data.streak_days ?? 0)
      setXp(profileRes.data.xp ?? 0)
    }

    setOverdueTasks((overdueRes.data ?? []).map(rowToTask))
    setArchived((archivedRes.data ?? []).map(r => ({
      id:        r.id as string,
      name:      r.name as string,
      genetics:  r.genetics as string,
      status:    r.status as string,
      startDate: new Date(r.start_date as string),
    })))
  }

  async function handleComplete(taskId: string, notes?: string, ec?: number, ph?: number) {
    const task = [...tasks, ...overdueTasks].find(t => t.id === taskId)
    await completeTask(taskId, notes)

    // Sincronizar con Supabase (sin bloquear)
    completeTaskInSupabase(taskId, notes).catch((err) =>
      console.error('Error sincronizando tarea completada:', err)
    )

    if (task && (ec != null || ph != null) && user) {
      await supabase.from('measurements').insert({
        user_id: user.id, plant_id: task.plantId ?? null,
        ec: ec ?? null, ph: ph ?? null, notes: notes?.trim() || null,
      })
      void awardXP(user.id, XP_VALUES.COMPLETE_WITH_MEASUREMENT)
    } else if (user) {
      void awardXP(user.id, XP_VALUES.COMPLETE_TASK)
    }
    if (user) void recordDailyActivity(user.id)
    // Remove from overdue if it was overdue
    setOverdueTasks(prev => prev.filter(t => t.id !== taskId))
    setSheetTask(null)
  }

  async function onRefresh() {
    setRefreshing(true)
    await loadData()
    setRefreshing(false)
  }

  function openSheet(task: ScheduledTask) {
    const p = plants.find(pl => pl.id === task.plantId)
    setSheetTask({
      id: task.id, type: task.type, week: task.week, cycle: task.cycle,
      products: task.products, ecMin: task.ecMin, ecMax: task.ecMax,
      phMin: task.phMin, phMax: task.phMax,
      potCount: p?.potCount, potVolumeLiters: p?.potVolumeLiters,
    })
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0C1410' }}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#52CC64" />}
      >

        {/* Header */}
        <View style={{ marginBottom: 24 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text style={{ color: '#728C74', fontSize: 12, textTransform: 'capitalize' }}>
              {format(new Date(), "EEEE d 'de' MMMM", { locale: es })}
            </Text>
            {streak > 0 && (
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 4,
                backgroundColor: streak >= 7 ? '#1A0E00' : '#131D14',
                borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5,
                borderWidth: 1, borderColor: streak >= 7 ? '#3D2200' : '#1C2E1E',
              }}>
                <Text style={{ fontSize: 13 }}>🔥</Text>
                <View>
                  <Text style={{ color: streak >= 7 ? '#F59E0B' : '#E4F2E7', fontSize: 14, fontWeight: '900', lineHeight: 15 }}>{streak}</Text>
                  <Text style={{ color: '#3A5040', fontSize: 8, fontWeight: '700', lineHeight: 10 }}>
                    {streak === 1 ? 'DIA' : 'DIAS'}
                  </Text>
                </View>
              </View>
            )}
          </View>
          <Text style={{ color: '#E4F2E7', fontSize: 26, fontWeight: '900' }}>
            {greeting}, {username || 'Cultivador'}
          </Text>
          {/* Level mini */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
            <Text style={{ fontSize: 14 }}>{levelInfo.current.emoji}</Text>
            <Text style={{ color: '#728C74', fontSize: 11, fontWeight: '600' }}>{levelInfo.current.name}</Text>
            {levelInfo.next && (
              <>
                <View style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: '#1C2E1E', overflow: 'hidden', maxWidth: 80 }}>
                  <View style={{ height: '100%', backgroundColor: '#7C3AED', borderRadius: 2, width: `${Math.round(levelInfo.progressToNext * 100)}%` }} />
                </View>
                <Text style={{ color: '#3A5040', fontSize: 10 }}>{levelInfo.next.name}</Text>
              </>
            )}
          </View>
        </View>

        {/* Tareas vencidas */}
        {plants.length > 0 && overdueTasks.length > 0 && (
          <View style={{ marginBottom: 20 }}>
            <Text style={{ color: '#EF4444', fontSize: 11, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 }}>
              ⚠️ VENCIDAS · {overdueTasks.length}
            </Text>
            <View style={{ backgroundColor: '#131D14', borderRadius: 16, borderWidth: 1, borderColor: '#4B1515', overflow: 'hidden' }}>
              {overdueTasks.map((task: ScheduledTask, i: number) => {
                const plantName = plants.find(p => p.id === task.plantId)?.name ?? '—'
                return (
                  <View key={task.id} style={{
                    flexDirection: 'row', alignItems: 'center', gap: 12,
                    paddingHorizontal: 14, paddingVertical: 13,
                    borderTopWidth: i > 0 ? 1 : 0, borderTopColor: '#2A1010',
                  }}>
                    <TouchableOpacity
                      onPress={() => router.push(`/plants/${task.plantId}`)}
                      style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}
                    >
                      <Text style={{ fontSize: 20 }}>{TYPE_ICON[task.type] ?? '📌'}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: '#E4F2E7', fontSize: 13, fontWeight: '600' }}>{TYPE_LABEL[task.type] ?? task.type}</Text>
                        <Text style={{ color: '#EF4444', fontSize: 11, marginTop: 1 }}>
                          {format(new Date(task.scheduledDate), "d MMM", { locale: es })} · {plantName}
                        </Text>
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => openSheet(task)}
                      style={{ backgroundColor: '#2A0A0A', borderWidth: 1, borderColor: '#4B1515', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 }}
                    >
                      <Text style={{ color: '#EF4444', fontWeight: '700', fontSize: 12 }}>Hecho</Text>
                    </TouchableOpacity>
                  </View>
                )
              })}
            </View>
          </View>
        )}

        {/* Tareas de hoy */}
        {plants.length > 0 && tasks.length > 0 && (
          <View style={{ marginBottom: 24 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <Text style={{ color: '#728C74', fontSize: 11, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' }}>
                {pending.length > 0 ? `⚡ HOY · ${pending.length} PENDIENTE${pending.length > 1 ? 'S' : ''}` : '⚡ HOY · TODO LISTO'}
              </Text>
              {done.length > 0 && pending.length > 0 && (
                <Text style={{ color: '#52CC64', fontSize: 11, fontWeight: '700' }}>{done.length} ✓</Text>
              )}
            </View>

            {allDone ? (
              <View style={{ backgroundColor: '#131D14', borderRadius: 20, borderWidth: 1, borderColor: '#1C2E1E', padding: 28, alignItems: 'center' }}>
                <Text style={{ fontSize: 36, marginBottom: 8 }}>🎉</Text>
                <Text style={{ color: '#52CC64', fontSize: 15, fontWeight: '900' }}>Todo al dia!</Text>
                <Text style={{ color: '#728C74', fontSize: 12, marginTop: 4 }}>Buen trabajo por hoy</Text>
              </View>
            ) : multiPlant ? (
              /* Vista agrupada por planta */
              <View style={{ gap: 10 }}>
                {taskGroups.map(({ plant: p, tasks: pts }: { plant: Plant | undefined; tasks: ScheduledTask[] }) => (
                  <View key={p?.id ?? 'unknown'} style={{ backgroundColor: '#131D14', borderRadius: 18, borderWidth: 1, borderColor: '#1C2E1E', overflow: 'hidden' }}>
                    <TouchableOpacity
                      onPress={() => p && router.push(`/plants/${p.id}`)}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: '#0C1410', borderBottomWidth: 1, borderBottomColor: '#1C2E1E' }}
                    >
                      <Text style={{ fontSize: 13 }}>🌿</Text>
                      <Text style={{ color: '#B8D4BC', fontSize: 12, fontWeight: '700', flex: 1 }}>{p?.name ?? '—'}</Text>
                      <Text style={{ color: '#3A5040', fontSize: 10 }}>{pts.length} tarea{pts.length > 1 ? 's' : ''} →</Text>
                    </TouchableOpacity>
                    {pts.map((task: ScheduledTask, i: number) => (
                      <View key={task.id} style={{
                        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                        paddingHorizontal: 14, paddingVertical: 12,
                        borderTopWidth: i > 0 ? 1 : 0, borderTopColor: '#1C2E1E',
                      }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                          <Text style={{ fontSize: 18 }}>{TYPE_ICON[task.type] ?? '📌'}</Text>
                          <Text style={{ color: '#E4F2E7', fontWeight: '600', fontSize: 13 }}>
                            {TYPE_LABEL[task.type] ?? task.type}
                          </Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => openSheet(task)}
                          style={{ backgroundColor: '#0D2010', borderWidth: 1, borderColor: '#1A3D1E', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 }}
                        >
                          <Text style={{ color: '#52CC64', fontWeight: '700', fontSize: 12 }}>Hecho ✓</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            ) : (
              /* Vista plana — 1 sola planta */
              <View style={{ backgroundColor: '#131D14', borderRadius: 20, borderWidth: 1, borderColor: '#1C2E1E', overflow: 'hidden' }}>
                {pending.map((task: ScheduledTask, i: number) => {
                  const plantName = plants.find(p => p.id === task.plantId)?.name ?? '—'
                  return (
                    <View key={task.id} style={{
                      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                      paddingHorizontal: 16, paddingVertical: 14,
                      borderTopWidth: i > 0 ? 1 : 0, borderTopColor: '#1C2E1E',
                    }}>
                      <TouchableOpacity
                        onPress={() => router.push(`/plants/${task.plantId}`)}
                        style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}
                      >
                        <Text style={{ fontSize: 20 }}>{TYPE_ICON[task.type] ?? '📌'}</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: '#E4F2E7', fontWeight: '700', fontSize: 14 }}>
                            {TYPE_LABEL[task.type] ?? task.type}
                          </Text>
                          <Text style={{ color: '#728C74', fontSize: 12, marginTop: 1 }}>🌿 {plantName}</Text>
                        </View>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => openSheet(task)}
                        style={{ backgroundColor: '#0D2010', borderWidth: 1, borderColor: '#1A3D1E', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 7 }}
                      >
                        <Text style={{ color: '#52CC64', fontWeight: '700', fontSize: 12 }}>Hecho ✓</Text>
                      </TouchableOpacity>
                    </View>
                  )
                })}
                {done.length > 0 && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#0C1410', borderTopWidth: 1, borderTopColor: '#1C2E1E' }}>
                    <Text style={{ fontSize: 14 }}>✅</Text>
                    <Text style={{ color: '#728C74', fontSize: 12 }}>
                      {done.length} completada{done.length > 1 ? 's' : ''}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {/* Stats — 3 items */}
        {plants.length > 0 && (
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 24 }}>
            {[
              { emoji: '🌱', value: plants.length, label: plants.length === 1 ? 'Planta activa' : 'Plantas activas' },
              { emoji: '⚡', value: pending.length, label: pending.length === 1 ? 'Tarea hoy' : 'Tareas hoy' },
              longestGrowDays > 0
                ? { emoji: '📅', value: longestGrowDays, label: 'Dias de grow' }
                : { emoji: '🏆', value: harvestedCount, label: harvestedCount === 1 ? 'Cosecha' : 'Cosechas' },
            ].map(s => (
              <View key={s.label} style={{ flex: 1, backgroundColor: '#131D14', borderRadius: 16, borderWidth: 1, borderColor: '#1C2E1E', padding: 12, alignItems: 'center' }}>
                <Text style={{ fontSize: 18 }}>{s.emoji}</Text>
                <Text style={{ color: '#E4F2E7', fontSize: 22, fontWeight: '900', marginTop: 3 }}>{s.value}</Text>
                <Text style={{ color: '#3A5040', fontSize: 10, fontWeight: '600', marginTop: 2, textAlign: 'center' }}>{s.label}</Text>
              </View>
            ))}
          </View>
        )}

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
                    <Text style={{ color: '#6DC278', fontSize: 11, fontWeight: '600' }}>{plant.floraStartDate ? 'FLORA' : 'VEGE'}</Text>
                  </View>
                  <Text style={{ color: '#E4F2E7', fontSize: 20, fontWeight: '900' }}>{plant.name}</Text>
                  <Text style={{ color: '#6DC278', fontSize: 13, marginTop: 2 }}>{plant.genetics}</Text>
                </View>
                <View style={{ padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Text style={{ color: '#728C74', fontSize: 12 }}>
                    📅 {format(plant.startDate, 'd MMM yyyy', { locale: es })}
                  </Text>
                  <Text style={{ color: '#728C74', fontSize: 12 }}>
                    {plant.location === 'indoor' ? '🏠' : '☀️'} {differenceInDays(new Date(), plant.startDate)}d
                  </Text>
                  <Text style={{ color: '#728C74', fontSize: 12 }}>
                    🪴 {plant.potCount}×{plant.potVolumeLiters}L
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Historial colapsable */}
        {archived.length > 0 && (
          <View style={{ marginTop: 24 }}>
            <TouchableOpacity
              onPress={() => setHistorialOpen(v => !v)}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}
            >
              <Text style={{ color: '#728C74', fontSize: 11, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' }}>
                Historial · {archived.length}
              </Text>
              <Text style={{ color: '#3A5040', fontSize: 12 }}>{historialOpen ? '▲' : '▼'}</Text>
            </TouchableOpacity>

            {historialOpen && (
              <View style={{ gap: 8 }}>
                {archived.map(p => {
                  const isHarvested = p.status === 'harvested'
                  const growDays    = differenceInDays(new Date(), p.startDate)
                  return (
                    <TouchableOpacity
                      key={p.id}
                      onPress={() => router.push(`/plants/${p.id}`)}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#131D14', borderRadius: 16, borderWidth: 1, borderColor: '#1C2E1E', paddingHorizontal: 14, paddingVertical: 12 }}
                      activeOpacity={0.8}
                    >
                      <Text style={{ fontSize: 22 }}>{isHarvested ? '✂️' : '🗑️'}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: '#B8D4BC', fontSize: 13, fontWeight: '700' }}>{p.name}</Text>
                        <Text style={{ color: '#3A5040', fontSize: 11, marginTop: 1 }}>{p.genetics}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <View style={{
                          borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3,
                          borderWidth: 1,
                          backgroundColor: isHarvested ? '#0D2010' : '#1A0A0A',
                          borderColor: isHarvested ? '#1A3D1E' : '#2A1010',
                        }}>
                          <Text style={{ color: isHarvested ? '#52CC64' : '#EF4444', fontSize: 9, fontWeight: '800' }}>
                            {isHarvested ? 'Cosechada' : 'Descartada'}
                          </Text>
                        </View>
                        <Text style={{ color: '#3A5040', fontSize: 10, marginTop: 3 }}>
                          {growDays}d · {format(p.startDate, "d MMM yyyy", { locale: es })}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  )
                })}
              </View>
            )}
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
