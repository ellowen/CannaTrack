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
  const { user }   = useAuth()
  const { plants } = usePlants()
  const { todayTasks: tasks, completeTask } = useTasks()

  const [username, setUsername]         = useState('')
  const [streak, setStreak]             = useState(0)
  const [xp, setXp]                     = useState(0)
  const [overdueTasks, setOverdueTasks] = useState<ScheduledTask[]>([])
  const [archived, setArchived]         = useState<ArchivedPlant[]>([])
  const [historialOpen, setHistorialOpen] = useState(false)
  const [sheetTask, setSheetTask]       = useState<SheetTask | null>(null)
  const [refreshing, setRefreshing]     = useState(false)

  const today   = new Date()
  today.setHours(0, 0, 0, 0)
  const pending = tasks.filter((t: ScheduledTask) => !t.completed)
  const done    = tasks.filter((t: ScheduledTask) => t.completed)
  const allDone = tasks.length > 0 && pending.length === 0

  const levelInfo = getLevelInfo(xp)

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Buenos dias' : hour < 20 ? 'Buenas tardes' : 'Buenas noches'

  // Grupos por planta para multi-plant view
  const plantIdsWithTasks = [...new Set(pending.map((t: ScheduledTask) => t.plantId))]
  const multiPlant        = plantIdsWithTasks.length > 1
  const taskGroups        = plantIdsWithTasks.map((pid: string) => ({
    plant: plants.find((p) => p.id === pid),
    tasks: pending.filter((t: ScheduledTask) => t.plantId === pid),
  }))

  useEffect(() => {
    if (!user) return
    loadData()
  }, [user])

  async function loadData() {
    if (!user) return
    const todayStr = today.toISOString().split('T')[0]

    const [profileRes, overdueRes, archivedRes] = await Promise.all([
      supabase.from('profiles').select('username, streak_days, xp').eq('id', user.id).maybeSingle(),
      // Solo tareas vencidas de plantas activas
      supabase.from('scheduled_tasks')
        .select('*, plants!inner(status)')
        .eq('user_id', user.id)
        .eq('completed', false)
        .lt('scheduled_date', todayStr)
        .eq('plants.status', 'active')
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

  const totalUrgent = overdueTasks.length + pending.length

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0C1410' }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#52CC64" />}
      >

        {/* ── HEADER ─────────────────────────────────────────────── */}
        <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20, backgroundColor: '#0C1410' }}>
          {/* Fila superior: fecha + streak */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={{ color: '#3A5040', fontSize: 12, fontWeight: '600', textTransform: 'capitalize' }}>
              {format(new Date(), "EEEE d 'de' MMMM", { locale: es })}
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              {streak > 0 && (
                <View style={{
                  flexDirection: 'row', alignItems: 'center', gap: 5,
                  backgroundColor: streak >= 7 ? '#2A1800' : '#131D14',
                  borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5,
                  borderWidth: 1, borderColor: streak >= 7 ? '#5C3300' : '#1C2E1E',
                }}>
                  <Text style={{ fontSize: 13 }}>🔥</Text>
                  <Text style={{ color: streak >= 7 ? '#F59E0B' : '#E4F2E7', fontSize: 13, fontWeight: '900' }}>{streak}d</Text>
                </View>
              )}
              <TouchableOpacity
                onPress={() => router.push('/settings')}
                style={{ backgroundColor: '#131D14', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: '#1C2E1E' }}
              >
                <Text style={{ fontSize: 13 }}>⚙️</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Saludo */}
          <Text style={{ color: '#E4F2E7', fontSize: 24, fontWeight: '900', marginBottom: 8 }}>
            {greeting}, {username || 'Cultivador'} 👋
          </Text>

          {/* XP / nivel */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 14 }}>{levelInfo.current.emoji}</Text>
            <Text style={{ color: '#728C74', fontSize: 11, fontWeight: '700' }}>{levelInfo.current.name}</Text>
            {levelInfo.next && (
              <>
                <View style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: '#1C2E1E', overflow: 'hidden', maxWidth: 100 }}>
                  <View style={{ height: '100%', backgroundColor: '#7C3AED', borderRadius: 2, width: `${Math.round(levelInfo.progressToNext * 100)}%` }} />
                </View>
                <Text style={{ color: '#3A5040', fontSize: 10 }}>{levelInfo.next.name}</Text>
              </>
            )}
            <Text style={{ color: '#3A5040', fontSize: 10, marginLeft: 'auto' }}>{xp} XP</Text>
          </View>
        </View>

        {/* ── URGENCIAS (vencidas + hoy) ──────────────────────────── */}
        {plants.length > 0 && totalUrgent > 0 && (
          <View style={{ marginHorizontal: 16, marginBottom: 16 }}>

            {/* Vencidas */}
            {overdueTasks.length > 0 && (
              <View style={{ backgroundColor: '#180808', borderRadius: 16, borderWidth: 1, borderColor: '#3D1010', marginBottom: 10, overflow: 'hidden' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#3D1010' }}>
                  <Text style={{ fontSize: 12 }}>⚠️</Text>
                  <Text style={{ color: '#EF4444', fontSize: 11, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase', flex: 1 }}>
                    Vencidas · {overdueTasks.length}
                  </Text>
                </View>
                {overdueTasks.map((task: ScheduledTask, i: number) => {
                  const plantName = plants.find(p => p.id === task.plantId)?.name ?? '—'
                  return (
                    <View key={task.id} style={{
                      flexDirection: 'row', alignItems: 'center', gap: 10,
                      paddingHorizontal: 14, paddingVertical: 12,
                      borderTopWidth: i > 0 ? 1 : 0, borderTopColor: '#2A1010',
                    }}>
                      <Text style={{ fontSize: 18 }}>{TYPE_ICON[task.type] ?? '📌'}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: '#E4F2E7', fontSize: 13, fontWeight: '700' }}>{TYPE_LABEL[task.type]}</Text>
                        <Text style={{ color: '#EF4444', fontSize: 11, marginTop: 1 }}>
                          {format(new Date(task.scheduledDate), "d MMM", { locale: es })} · {plantName}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => openSheet(task)}
                        style={{ backgroundColor: '#2D0A0A', borderWidth: 1, borderColor: '#5A1515', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 }}
                      >
                        <Text style={{ color: '#EF4444', fontWeight: '800', fontSize: 12 }}>Hecho</Text>
                      </TouchableOpacity>
                    </View>
                  )
                })}
              </View>
            )}

            {/* Tareas de hoy */}
            {tasks.length > 0 && (
              <View style={{ backgroundColor: '#131D14', borderRadius: 16, borderWidth: 1, borderColor: '#1C2E1E', overflow: 'hidden' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#1C2E1E' }}>
                  <Text style={{ fontSize: 12 }}>⚡</Text>
                  <Text style={{ color: '#728C74', fontSize: 11, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase', flex: 1 }}>
                    {allDone ? 'Hoy · Todo listo' : `Hoy · ${pending.length} pendiente${pending.length > 1 ? 's' : ''}`}
                  </Text>
                  {done.length > 0 && (
                    <Text style={{ color: '#52CC64', fontSize: 11, fontWeight: '700' }}>{done.length} ✓</Text>
                  )}
                </View>

                {allDone ? (
                  <View style={{ padding: 24, alignItems: 'center' }}>
                    <Text style={{ fontSize: 32, marginBottom: 6 }}>🎉</Text>
                    <Text style={{ color: '#52CC64', fontSize: 14, fontWeight: '900' }}>Todo al dia!</Text>
                    <Text style={{ color: '#3A5040', fontSize: 12, marginTop: 3 }}>Buen trabajo por hoy</Text>
                  </View>
                ) : multiPlant ? (
                  taskGroups.map(({ plant: p, tasks: pts }: { plant: Plant | undefined; tasks: ScheduledTask[] }) => (
                    <View key={p?.id ?? 'unknown'}>
                      <TouchableOpacity
                        onPress={() => p && router.push(`/plants/${p.id}`)}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#0C1410' }}
                      >
                        <Text style={{ fontSize: 12 }}>🌿</Text>
                        <Text style={{ color: '#B8D4BC', fontSize: 12, fontWeight: '700', flex: 1 }}>{p?.name ?? '—'}</Text>
                        <Text style={{ color: '#3A5040', fontSize: 10 }}>{pts.length} tarea{pts.length > 1 ? 's' : ''} →</Text>
                      </TouchableOpacity>
                      {pts.map((task: ScheduledTask, i: number) => (
                        <View key={task.id} style={{
                          flexDirection: 'row', alignItems: 'center',
                          paddingHorizontal: 14, paddingVertical: 11,
                          borderTopWidth: 1, borderTopColor: '#1C2E1E',
                        }}>
                          <Text style={{ fontSize: 17, marginRight: 10 }}>{TYPE_ICON[task.type] ?? '📌'}</Text>
                          <Text style={{ color: '#E4F2E7', fontWeight: '600', fontSize: 13, flex: 1 }}>{TYPE_LABEL[task.type]}</Text>
                          <TouchableOpacity
                            onPress={() => openSheet(task)}
                            style={{ backgroundColor: '#0D2010', borderWidth: 1, borderColor: '#1A3D1E', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 }}
                          >
                            <Text style={{ color: '#52CC64', fontWeight: '800', fontSize: 12 }}>✓</Text>
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  ))
                ) : (
                  pending.map((task: ScheduledTask, i: number) => {
                    const plantName = plants.find(p => p.id === task.plantId)?.name ?? '—'
                    return (
                      <View key={task.id} style={{
                        flexDirection: 'row', alignItems: 'center',
                        paddingHorizontal: 14, paddingVertical: 13,
                        borderTopWidth: i > 0 ? 1 : 0, borderTopColor: '#1C2E1E',
                      }}>
                        <Text style={{ fontSize: 18, marginRight: 10 }}>{TYPE_ICON[task.type] ?? '📌'}</Text>
                        <TouchableOpacity
                          onPress={() => router.push(`/plants/${task.plantId}`)}
                          style={{ flex: 1 }}
                        >
                          <Text style={{ color: '#E4F2E7', fontWeight: '700', fontSize: 14 }}>{TYPE_LABEL[task.type]}</Text>
                          <Text style={{ color: '#728C74', fontSize: 11, marginTop: 1 }}>🌿 {plantName}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => openSheet(task)}
                          style={{ backgroundColor: '#0D2010', borderWidth: 1, borderColor: '#1A3D1E', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7 }}
                        >
                          <Text style={{ color: '#52CC64', fontWeight: '800', fontSize: 12 }}>Hecho ✓</Text>
                        </TouchableOpacity>
                      </View>
                    )
                  })
                )}
              </View>
            )}

            {/* Sin tareas hoy */}
            {tasks.length === 0 && overdueTasks.length === 0 && (
              <View style={{ backgroundColor: '#131D14', borderRadius: 16, borderWidth: 1, borderColor: '#1C2E1E', padding: 20, alignItems: 'center' }}>
                <Text style={{ color: '#3A5040', fontSize: 13 }}>Sin tareas para hoy 🌿</Text>
              </View>
            )}
          </View>
        )}

        {/* Sin urgencias y sin plantas */}
        {plants.length === 0 && tasks.length === 0 && overdueTasks.length === 0 && (
          <View style={{ marginHorizontal: 16, marginBottom: 16, backgroundColor: '#131D14', borderRadius: 16, borderWidth: 1, borderColor: '#1C2E1E', padding: 20, alignItems: 'center' }}>
            <Text style={{ color: '#3A5040', fontSize: 13 }}>Sin tareas para hoy 🌿</Text>
          </View>
        )}

        {/* ── PLANTAS ACTIVAS ──────────────────────────────────────── */}
        <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <Text style={{ color: '#728C74', fontSize: 11, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase' }}>
              Plantas · {plants.length}
            </Text>
            <TouchableOpacity onPress={() => router.push('/plants/new')}>
              <Text style={{ color: '#52CC64', fontSize: 13, fontWeight: '700' }}>+ Nueva</Text>
            </TouchableOpacity>
          </View>

          {plants.length === 0 ? (
            <TouchableOpacity
              onPress={() => router.push('/onboarding')}
              style={{ backgroundColor: '#131D14', borderRadius: 20, borderWidth: 2, borderColor: '#52CC64', borderStyle: 'dashed', padding: 36, alignItems: 'center' }}
            >
              <Text style={{ fontSize: 44, marginBottom: 10 }}>🌱</Text>
              <Text style={{ color: '#E4F2E7', fontWeight: '900', fontSize: 16 }}>Crear primera planta</Text>
              <Text style={{ color: '#3A5040', fontSize: 12, marginTop: 4, textAlign: 'center' }}>
                Configuramos tu calendario de cultivo
              </Text>
              <View style={{ marginTop: 14, backgroundColor: '#52CC64', borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10 }}>
                <Text style={{ color: '#0C1410', fontWeight: '800', fontSize: 14 }}>Empezar →</Text>
              </View>
            </TouchableOpacity>
          ) : (
            <View style={{ gap: 10 }}>
              {plants.map(plant => {
                const plantPending = pending.filter((t: ScheduledTask) => t.plantId === plant.id).length
                const plantOverdue = overdueTasks.filter((t: ScheduledTask) => t.plantId === plant.id).length
                const isFlora      = !!plant.floraStartDate
                const daysSinceStart = differenceInDays(new Date(), plant.startDate)
                const phaseDay     = isFlora && plant.floraStartDate
                  ? differenceInDays(new Date(), plant.floraStartDate) + 1
                  : daysSinceStart + 1

                return (
                  <TouchableOpacity
                    key={plant.id}
                    onPress={() => router.push(`/plants/${plant.id}`)}
                    activeOpacity={0.85}
                    style={{
                      backgroundColor: '#131D14',
                      borderRadius: 18,
                      borderWidth: 1,
                      borderColor: plantOverdue > 0 ? '#3D1010' : '#1C2E1E',
                      padding: 16,
                    }}
                  >
                    {/* Fila principal */}
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 }}>
                      <View style={{ flex: 1 }}>
                        {/* Badges */}
                        <View style={{ flexDirection: 'row', gap: 6, marginBottom: 6 }}>
                          <View style={{ backgroundColor: '#0D2010', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 }}>
                            <Text style={{ color: '#52CC64', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 }}>
                              {plant.geneticType === 'autoflower' ? 'AUTO' : plant.geneticType === 'regular' ? 'REG' : 'FEM'}
                            </Text>
                          </View>
                          <View style={{ backgroundColor: isFlora ? '#1A0E00' : '#0D2010', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 }}>
                            <Text style={{ color: isFlora ? '#F59E0B' : '#52CC64', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 }}>
                              {isFlora ? 'FLORA' : 'VEGE'}
                            </Text>
                          </View>
                        </View>
                        <Text style={{ color: '#E4F2E7', fontSize: 18, fontWeight: '900' }}>{plant.name}</Text>
                        <Text style={{ color: '#728C74', fontSize: 12, marginTop: 2 }}>{plant.genetics}</Text>
                      </View>
                      {/* Dia de fase */}
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{ color: '#E4F2E7', fontSize: 22, fontWeight: '900', lineHeight: 24 }}>D{phaseDay}</Text>
                        <Text style={{ color: '#3A5040', fontSize: 10, fontWeight: '600' }}>
                          {isFlora ? 'FLORA' : 'VEGE'}
                        </Text>
                      </View>
                    </View>

                    {/* Fila inferior: stats + status chips */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ color: '#3A5040', fontSize: 11 }}>
                        📅 {format(plant.startDate, 'd MMM', { locale: es })}
                      </Text>
                      <Text style={{ color: '#3A5040', fontSize: 11 }}>
                        🪴 {plant.potCount}×{plant.potVolumeLiters}L
                      </Text>
                      <View style={{ flex: 1 }} />
                      {plantOverdue > 0 && (
                        <View style={{ backgroundColor: '#2A0808', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: '#5A1515' }}>
                          <Text style={{ color: '#EF4444', fontSize: 11, fontWeight: '800' }}>⚠️ {plantOverdue} vencida{plantOverdue > 1 ? 's' : ''}</Text>
                        </View>
                      )}
                      {plantPending > 0 && plantOverdue === 0 && (
                        <View style={{ backgroundColor: '#0D2010', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: '#1C3A20' }}>
                          <Text style={{ color: '#52CC64', fontSize: 11, fontWeight: '700' }}>⚡ {plantPending} hoy</Text>
                        </View>
                      )}
                      {plantPending === 0 && plantOverdue === 0 && (
                        <View style={{ backgroundColor: '#0D2010', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                          <Text style={{ color: '#3A5040', fontSize: 11, fontWeight: '600' }}>✓ Al dia</Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                )
              })}
            </View>
          )}
        </View>

        {/* ── HISTORIAL ────────────────────────────────────────────── */}
        {archived.length > 0 && (
          <View style={{ paddingHorizontal: 16, marginBottom: 20 }}>
            <TouchableOpacity
              onPress={() => setHistorialOpen(v => !v)}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: historialOpen ? 10 : 0 }}
            >
              <Text style={{ color: '#728C74', fontSize: 11, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase' }}>
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
                      activeOpacity={0.8}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#131D14', borderRadius: 14, borderWidth: 1, borderColor: '#1C2E1E', paddingHorizontal: 14, paddingVertical: 12 }}
                    >
                      <Text style={{ fontSize: 20 }}>{isHarvested ? '✂️' : '🗑️'}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: '#728C74', fontSize: 13, fontWeight: '700' }}>{p.name}</Text>
                        <Text style={{ color: '#3A5040', fontSize: 11, marginTop: 1 }}>{p.genetics} · {growDays}d</Text>
                      </View>
                      <View style={{
                        borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
                        backgroundColor: isHarvested ? '#0D2010' : '#1A0808',
                        borderWidth: 1,
                        borderColor: isHarvested ? '#1A3D1E' : '#3D1010',
                      }}>
                        <Text style={{ color: isHarvested ? '#52CC64' : '#EF4444', fontSize: 9, fontWeight: '800' }}>
                          {isHarvested ? 'COSECHADA' : 'DESCARTADA'}
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
