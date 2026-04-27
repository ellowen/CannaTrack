import { useState, useEffect } from 'react'
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { format, differenceInDays, addDays } from 'date-fns'
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

type ProfileData = {
  username: string
  streak: number
  bestStreak: number
  xp: number
  harvestedCount: number
}

type UpcomingDay = { date: Date; count: number }

export default function HomeScreen() {
  const { user }   = useAuth()
  const { plants } = usePlants()
  const { todayTasks: tasks, completeTask } = useTasks()

  const [profile, setProfile]           = useState<ProfileData>({ username: '', streak: 0, bestStreak: 0, xp: 0, harvestedCount: 0 })
  const [overdueTasks, setOverdueTasks] = useState<ScheduledTask[]>([])
  const [upcomingDays, setUpcomingDays] = useState<UpcomingDay[]>([])
  const [sheetTask, setSheetTask]       = useState<SheetTask | null>(null)
  const [refreshing, setRefreshing]     = useState(false)

  const today   = new Date()
  today.setHours(0, 0, 0, 0)
  const pending = tasks.filter((t: ScheduledTask) => !t.completed)
  const done    = tasks.filter((t: ScheduledTask) => t.completed)
  const allDone = tasks.length > 0 && pending.length === 0

  const levelInfo   = getLevelInfo(profile.xp)
  const xpToNext    = levelInfo.next ? levelInfo.next.minXP - profile.xp : 0
  const hour        = new Date().getHours()
  const greeting    = hour < 12 ? 'Buenos dias' : hour < 20 ? 'Buenas tardes' : 'Buenas noches'
  const totalUrgent = overdueTasks.length + pending.length

  useEffect(() => {
    if (!user) return
    loadData()
  }, [user])

  async function loadData() {
    if (!user) return
    const todayStr    = today.toISOString().split('T')[0]
    const in7daysStr  = addDays(today, 7).toISOString().split('T')[0]

    const [profileRes, overdueRes, upcomingRes, harvestRes] = await Promise.all([
      supabase.from('profiles')
        .select('username, streak_days, best_streak, xp')
        .eq('id', user.id).maybeSingle(),
      supabase.from('scheduled_tasks')
        .select('*, plants!inner(status)')
        .eq('user_id', user.id)
        .eq('completed', false)
        .lt('scheduled_date', todayStr)
        .eq('plants.status', 'active')
        .order('scheduled_date'),
      supabase.from('scheduled_tasks')
        .select('scheduled_date')
        .eq('user_id', user.id)
        .eq('completed', false)
        .gt('scheduled_date', todayStr)
        .lte('scheduled_date', in7daysStr),
      supabase.from('plants')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'harvested'),
    ])

    if (profileRes.data) {
      setProfile({
        username:      profileRes.data.username ?? user.email?.split('@')[0] ?? 'Cultivador',
        streak:        profileRes.data.streak_days ?? 0,
        bestStreak:    profileRes.data.best_streak ?? 0,
        xp:            profileRes.data.xp ?? 0,
        harvestedCount: harvestRes.count ?? 0,
      })
    }

    setOverdueTasks((overdueRes.data ?? []).map(rowToTask))

    // Agrupar proximos 7 dias por fecha
    const countByDate: Record<string, number> = {}
    for (const row of (upcomingRes.data ?? [])) {
      const d = (row.scheduled_date as string).split('T')[0]
      countByDate[d] = (countByDate[d] ?? 0) + 1
    }
    const upcoming: UpcomingDay[] = Array.from({ length: 7 }, (_, i) => {
      const d    = addDays(today, i + 1)
      const key  = d.toISOString().split('T')[0]
      return { date: d, count: countByDate[key] ?? 0 }
    })
    setUpcomingDays(upcoming)
  }

  async function handleComplete(taskId: string, notes?: string, ec?: number, ph?: number) {
    const task = [...tasks, ...overdueTasks].find(t => t.id === taskId)
    await completeTask(taskId, notes)
    completeTaskInSupabase(taskId, notes).catch(console.error)
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0C1410' }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#52CC64" />}
      >

        {/* ── HEADER ─────────────────────────────────────────────── */}
        <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <Text style={{ color: '#3A5040', fontSize: 12, fontWeight: '600', textTransform: 'capitalize' }}>
              {format(new Date(), "EEEE d 'de' MMMM", { locale: es })}
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {profile.streak > 0 && (
                <View style={{
                  flexDirection: 'row', alignItems: 'center', gap: 4,
                  backgroundColor: profile.streak >= 7 ? '#2A1800' : '#131D14',
                  borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
                  borderWidth: 1, borderColor: profile.streak >= 7 ? '#5C3300' : '#1C2E1E',
                }}>
                  <Text style={{ fontSize: 12 }}>🔥</Text>
                  <Text style={{ color: profile.streak >= 7 ? '#F59E0B' : '#E4F2E7', fontSize: 13, fontWeight: '900' }}>
                    {profile.streak}d
                  </Text>
                </View>
              )}
              <TouchableOpacity
                onPress={() => router.push('/settings')}
                style={{ backgroundColor: '#131D14', borderRadius: 20, padding: 7, borderWidth: 1, borderColor: '#1C2E1E' }}
              >
                <Text style={{ fontSize: 13 }}>⚙️</Text>
              </TouchableOpacity>
            </View>
          </View>
          <Text style={{ color: '#E4F2E7', fontSize: 24, fontWeight: '900' }}>
            {greeting}, {profile.username || 'Cultivador'} 👋
          </Text>
        </View>

        {/* ── XP / NIVEL ─────────────────────────────────────────── */}
        <View style={{ marginHorizontal: 16, marginBottom: 16 }}>
          <TouchableOpacity
            onPress={() => router.push('/achievements')}
            activeOpacity={0.85}
            style={{
              backgroundColor: '#131D14', borderRadius: 18,
              borderWidth: 1, borderColor: '#1C2E1E', padding: 16,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontSize: 28, marginRight: 10 }}>{levelInfo.current.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#E4F2E7', fontSize: 16, fontWeight: '900' }}>{levelInfo.current.name}</Text>
                {levelInfo.next && (
                  <Text style={{ color: '#3A5040', fontSize: 11, marginTop: 1 }}>
                    {xpToNext} XP para {levelInfo.next.name}
                  </Text>
                )}
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ color: '#52CC64', fontSize: 20, fontWeight: '900' }}>{profile.xp}</Text>
                <Text style={{ color: '#3A5040', fontSize: 10, fontWeight: '700' }}>XP TOTAL</Text>
              </View>
            </View>

            {/* Barra de progreso XP */}
            {levelInfo.next && (
              <View style={{ height: 6, backgroundColor: '#1C2E1E', borderRadius: 3, overflow: 'hidden' }}>
                <View style={{
                  height: '100%', borderRadius: 3, backgroundColor: '#7C3AED',
                  width: `${Math.round(levelInfo.progressToNext * 100)}%`,
                }} />
              </View>
            )}

            {/* Stats compactos */}
            <View style={{ flexDirection: 'row', marginTop: 14, gap: 0 }}>
              {[
                { label: 'Racha', value: `${profile.streak}d`, sub: `Record: ${profile.bestStreak}d` },
                { label: 'Plantas', value: String(plants.length), sub: 'activas' },
                { label: 'Cosechas', value: String(profile.harvestedCount), sub: 'completadas' },
              ].map((s, i) => (
                <View key={s.label} style={{
                  flex: 1, alignItems: 'center',
                  borderLeftWidth: i > 0 ? 1 : 0, borderLeftColor: '#1C2E1E',
                  paddingVertical: 2,
                }}>
                  <Text style={{ color: '#E4F2E7', fontSize: 18, fontWeight: '900' }}>{s.value}</Text>
                  <Text style={{ color: '#728C74', fontSize: 10, fontWeight: '700' }}>{s.label}</Text>
                  <Text style={{ color: '#3A5040', fontSize: 9, marginTop: 1 }}>{s.sub}</Text>
                </View>
              ))}
            </View>

            <Text style={{ color: '#3A5040', fontSize: 10, textAlign: 'center', marginTop: 10 }}>
              Ver todos los logros →
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── AGENDA DE HOY ──────────────────────────────────────── */}
        <View style={{ marginHorizontal: 16, marginBottom: 16 }}>
          <Text style={{ color: '#728C74', fontSize: 11, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 }}>
            Agenda de hoy
          </Text>

          {/* Sin plantas activas */}
          {plants.length === 0 && (
            <TouchableOpacity
              onPress={() => router.push('/onboarding')}
              style={{ backgroundColor: '#131D14', borderRadius: 18, borderWidth: 2, borderColor: '#52CC64', borderStyle: 'dashed', padding: 32, alignItems: 'center' }}
            >
              <Text style={{ fontSize: 40, marginBottom: 8 }}>🌱</Text>
              <Text style={{ color: '#E4F2E7', fontWeight: '900', fontSize: 16 }}>Agregar primera planta</Text>
              <Text style={{ color: '#3A5040', fontSize: 12, marginTop: 4, textAlign: 'center' }}>
                Empieza a registrar tu cultivo
              </Text>
            </TouchableOpacity>
          )}

          {/* Tareas vencidas */}
          {overdueTasks.length > 0 && (
            <View style={{ backgroundColor: '#180A0A', borderRadius: 16, borderWidth: 1, borderColor: '#3D1010', marginBottom: 10, overflow: 'hidden' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#3D1010' }}>
                <Text style={{ color: '#EF4444', fontSize: 11, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase', flex: 1 }}>
                  ⚠️  {overdueTasks.length} Vencida{overdueTasks.length > 1 ? 's' : ''}
                </Text>
              </View>
              {overdueTasks.map((task, i) => {
                const plant = plants.find(p => p.id === task.plantId)
                return (
                  <View key={task.id} style={{
                    paddingHorizontal: 14, paddingVertical: 12,
                    borderTopWidth: i > 0 ? 1 : 0, borderTopColor: '#2A1010',
                  }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={{ fontSize: 18, marginRight: 10 }}>{TYPE_ICON[task.type]}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: '#E4F2E7', fontSize: 13, fontWeight: '700' }}>
                          {TYPE_LABEL[task.type]} — {plant?.name ?? '—'}
                        </Text>
                        <Text style={{ color: '#EF4444', fontSize: 11, marginTop: 1 }}>
                          Vencio el {format(new Date(task.scheduledDate), "d 'de' MMM", { locale: es })}
                          {task.week ? ` · Semana ${task.week}` : ''}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => openSheet(task)}
                        style={{ backgroundColor: '#2D0A0A', borderWidth: 1, borderColor: '#5A1515', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 }}
                      >
                        <Text style={{ color: '#EF4444', fontWeight: '800', fontSize: 12 }}>Hecho</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )
              })}
            </View>
          )}

          {/* Tareas de hoy */}
          {tasks.length > 0 && (
            <View style={{ backgroundColor: '#131D14', borderRadius: 16, borderWidth: 1, borderColor: allDone ? '#1A3D1E' : '#1C2E1E', overflow: 'hidden' }}>
              {/* Header con barra de progreso */}
              <View style={{ paddingHorizontal: 14, paddingTop: 12, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#1C2E1E' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={{ color: allDone ? '#52CC64' : '#E4F2E7', fontSize: 13, fontWeight: '800', flex: 1 }}>
                    {allDone ? '🎉 Todo al dia!' : `⚡ ${pending.length} pendiente${pending.length > 1 ? 's' : ''} hoy`}
                  </Text>
                  <Text style={{ color: '#3A5040', fontSize: 11 }}>
                    {done.length}/{tasks.length}
                  </Text>
                </View>
                {/* Barra de progreso del dia */}
                <View style={{ height: 4, backgroundColor: '#1C2E1E', borderRadius: 2, overflow: 'hidden' }}>
                  <View style={{
                    height: '100%', borderRadius: 2, backgroundColor: '#52CC64',
                    width: tasks.length > 0 ? `${Math.round((done.length / tasks.length) * 100)}%` : '0%',
                  }} />
                </View>
              </View>

              {allDone ? (
                <View style={{ padding: 28, alignItems: 'center' }}>
                  <Text style={{ fontSize: 40, marginBottom: 8 }}>✅</Text>
                  <Text style={{ color: '#52CC64', fontSize: 14, fontWeight: '900' }}>Excelente trabajo hoy!</Text>
                  <Text style={{ color: '#3A5040', fontSize: 12, marginTop: 4 }}>
                    Completaste {done.length} tarea{done.length > 1 ? 's' : ''}
                  </Text>
                </View>
              ) : (
                pending.map((task, i) => {
                  const plant = plants.find(p => p.id === task.plantId)
                  const isFlora = !!plant?.floraStartDate
                  const phaseDay = isFlora && plant?.floraStartDate
                    ? differenceInDays(today, plant.floraStartDate) + 1
                    : plant ? differenceInDays(today, plant.startDate) + 1 : 0

                  return (
                    <View key={task.id} style={{
                      paddingHorizontal: 14, paddingVertical: 14,
                      borderTopWidth: i > 0 ? 1 : 0, borderTopColor: '#1C2E1E',
                    }}>
                      {/* Fila principal */}
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                        <Text style={{ fontSize: 20, marginRight: 12, marginTop: 1 }}>{TYPE_ICON[task.type]}</Text>
                        <TouchableOpacity
                          onPress={() => router.push(`/plants/${task.plantId}`)}
                          style={{ flex: 1 }}
                        >
                          <Text style={{ color: '#E4F2E7', fontWeight: '800', fontSize: 14 }}>
                            {TYPE_LABEL[task.type]}
                          </Text>
                          <Text style={{ color: '#728C74', fontSize: 11, marginTop: 2 }}>
                            🌿 {plant?.name ?? '—'} · {isFlora ? 'Flora' : 'Vege'} D{phaseDay}
                            {task.week ? ` · S${task.week}` : ''}
                          </Text>
                          {/* Productos si los hay */}
                          {task.products && task.products.length > 0 && (
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                              {task.products.slice(0, 4).map((prod, pi) => (
                                <View key={pi} style={{ backgroundColor: '#0C1410', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1, borderColor: '#1C2E1E' }}>
                                  <Text style={{ color: '#728C74', fontSize: 10, fontWeight: '600' }}>
                                    {prod.name}
                                    {prod.minDose != null ? ` ${prod.minDose}${prod.maxDose && prod.maxDose !== prod.minDose ? `-${prod.maxDose}` : ''}ml/L` : ''}
                                  </Text>
                                </View>
                              ))}
                              {task.products.length > 4 && (
                                <View style={{ backgroundColor: '#0C1410', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1, borderColor: '#1C2E1E' }}>
                                  <Text style={{ color: '#3A5040', fontSize: 10 }}>+{task.products.length - 4}</Text>
                                </View>
                              )}
                            </View>
                          )}
                          {/* EC / PH */}
                          {(task.ecMin != null || task.phMin != null) && (
                            <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
                              {task.ecMin != null && (
                                <Text style={{ color: '#3D8B4E', fontSize: 10, fontWeight: '700' }}>
                                  EC {task.ecMin}{task.ecMax && task.ecMax !== task.ecMin ? `-${task.ecMax}` : ''}
                                </Text>
                              )}
                              {task.phMin != null && (
                                <Text style={{ color: '#3B82F6', fontSize: 10, fontWeight: '700' }}>
                                  PH {task.phMin}{task.phMax && task.phMax !== task.phMin ? `-${task.phMax}` : ''}
                                </Text>
                              )}
                            </View>
                          )}
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => openSheet(task)}
                          style={{ backgroundColor: '#0D2010', borderWidth: 1, borderColor: '#1A3D1E', borderRadius: 10, paddingHorizontal: 13, paddingVertical: 7, marginLeft: 8 }}
                        >
                          <Text style={{ color: '#52CC64', fontWeight: '800', fontSize: 12 }}>✓</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )
                })
              )}

              {/* Completadas del dia */}
              {done.length > 0 && !allDone && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: '#0C1410', borderTopWidth: 1, borderTopColor: '#1C2E1E' }}>
                  <Text style={{ fontSize: 12 }}>✅</Text>
                  <Text style={{ color: '#3A5040', fontSize: 12 }}>
                    {done.length} completada{done.length > 1 ? 's' : ''} hoy
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Sin tareas hoy, hay plantas */}
          {plants.length > 0 && tasks.length === 0 && overdueTasks.length === 0 && (
            <View style={{ backgroundColor: '#131D14', borderRadius: 16, borderWidth: 1, borderColor: '#1C2E1E', padding: 24, alignItems: 'center' }}>
              <Text style={{ fontSize: 32, marginBottom: 8 }}>🌿</Text>
              <Text style={{ color: '#52CC64', fontSize: 14, fontWeight: '800' }}>Dia libre!</Text>
              <Text style={{ color: '#3A5040', fontSize: 12, marginTop: 4 }}>Sin tareas programadas para hoy</Text>
            </View>
          )}
        </View>

        {/* ── PROXIMOS 7 DIAS ────────────────────────────────────── */}
        {plants.length > 0 && (
          <View style={{ marginHorizontal: 16, marginBottom: 16 }}>
            <Text style={{ color: '#728C74', fontSize: 11, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 }}>
              Proximos 7 dias
            </Text>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {upcomingDays.map((day, i) => {
                const hasTask = day.count > 0
                const isWeekend = day.date.getDay() === 0 || day.date.getDay() === 6
                return (
                  <TouchableOpacity
                    key={i}
                    onPress={() => router.push('/(tabs)/tasks')}
                    style={{
                      flex: 1, alignItems: 'center',
                      backgroundColor: hasTask ? '#0D2010' : '#131D14',
                      borderRadius: 12, paddingVertical: 10,
                      borderWidth: 1,
                      borderColor: hasTask ? '#1A3D1E' : '#1C2E1E',
                    }}
                  >
                    <Text style={{ color: isWeekend ? '#52CC64' : '#3A5040', fontSize: 9, fontWeight: '700', textTransform: 'uppercase' }}>
                      {format(day.date, 'EEE', { locale: es }).slice(0, 2)}
                    </Text>
                    <Text style={{ color: hasTask ? '#E4F2E7' : '#728C74', fontSize: 14, fontWeight: '900', marginTop: 3 }}>
                      {format(day.date, 'd')}
                    </Text>
                    {hasTask ? (
                      <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: '#52CC64', marginTop: 4 }} />
                    ) : (
                      <View style={{ width: 5, height: 5, marginTop: 4 }} />
                    )}
                    {hasTask && (
                      <Text style={{ color: '#52CC64', fontSize: 8, fontWeight: '700', marginTop: 1 }}>{day.count}</Text>
                    )}
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>
        )}

        {/* ── MIS PLANTAS (resumen compacto) ─────────────────────── */}
        {plants.length > 0 && (
          <View style={{ marginHorizontal: 16, marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <Text style={{ color: '#728C74', fontSize: 11, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase' }}>
                Mis plantas · {plants.length}
              </Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/plants')}>
                <Text style={{ color: '#52CC64', fontSize: 12, fontWeight: '700' }}>Ver todas →</Text>
              </TouchableOpacity>
            </View>
            <View style={{ backgroundColor: '#131D14', borderRadius: 16, borderWidth: 1, borderColor: '#1C2E1E', overflow: 'hidden' }}>
              {plants.map((plant: Plant, i: number) => {
                const isFlora    = !!plant.floraStartDate
                const phaseDay   = isFlora && plant.floraStartDate
                  ? differenceInDays(today, plant.floraStartDate) + 1
                  : differenceInDays(today, plant.startDate) + 1
                const plantPending = pending.filter(t => t.plantId === plant.id).length
                const plantOverdue = overdueTasks.filter(t => t.plantId === plant.id).length
                const weeksInPhase = Math.ceil(phaseDay / 7)
                return (
                  <TouchableOpacity
                    key={plant.id}
                    onPress={() => router.push(`/plants/${plant.id}`)}
                    activeOpacity={0.8}
                    style={{
                      flexDirection: 'row', alignItems: 'center', gap: 12,
                      paddingHorizontal: 14, paddingVertical: 13,
                      borderTopWidth: i > 0 ? 1 : 0, borderTopColor: '#1C2E1E',
                    }}
                  >
                    {/* Icono de fase */}
                    <View style={{
                      width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
                      backgroundColor: isFlora ? '#1A0E00' : '#0D2010',
                      borderWidth: 1, borderColor: isFlora ? '#5C3300' : '#1A3D1E',
                    }}>
                      <Text style={{ fontSize: 18 }}>{isFlora ? '🌸' : '🌿'}</Text>
                    </View>

                    {/* Info */}
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#E4F2E7', fontSize: 14, fontWeight: '800' }}>{plant.name}</Text>
                      <Text style={{ color: '#728C74', fontSize: 11, marginTop: 1 }}>
                        {isFlora ? 'Flora' : 'Vege'} · Semana {weeksInPhase} · Dia {phaseDay}
                      </Text>
                    </View>

                    {/* Estado */}
                    {plantOverdue > 0 ? (
                      <View style={{ backgroundColor: '#2A0808', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: '#5A1515' }}>
                        <Text style={{ color: '#EF4444', fontSize: 10, fontWeight: '800' }}>⚠️ {plantOverdue}</Text>
                      </View>
                    ) : plantPending > 0 ? (
                      <View style={{ backgroundColor: '#0D2010', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: '#1C3A20' }}>
                        <Text style={{ color: '#52CC64', fontSize: 10, fontWeight: '700' }}>⚡ {plantPending}</Text>
                      </View>
                    ) : (
                      <Text style={{ color: '#3A5040', fontSize: 11 }}>✓</Text>
                    )}

                    <Text style={{ color: '#3A5040', fontSize: 14 }}>›</Text>
                  </TouchableOpacity>
                )
              })}
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
