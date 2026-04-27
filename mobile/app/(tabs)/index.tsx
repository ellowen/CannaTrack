import { useState, useEffect } from 'react'
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
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
  username: string; streak: number; bestStreak: number
  xp: number; harvestedCount: number
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

  const today   = new Date(); today.setHours(0, 0, 0, 0)
  const pending = tasks.filter((t: ScheduledTask) => !t.completed)
  const done    = tasks.filter((t: ScheduledTask) => t.completed)
  const allDone = tasks.length > 0 && pending.length === 0
  const levelInfo = getLevelInfo(profile.xp)
  const xpToNext  = levelInfo.next ? levelInfo.next.minXP - profile.xp : 0
  const hour      = new Date().getHours()
  const greeting  = hour < 12 ? 'Buenos dias' : hour < 20 ? 'Buenas tardes' : 'Buenas noches'

  useEffect(() => { if (user) loadData() }, [user])

  async function loadData() {
    if (!user) return
    const todayStr   = today.toISOString().split('T')[0]
    const in7daysStr = addDays(today, 7).toISOString().split('T')[0]
    const [profileRes, overdueRes, upcomingRes, harvestRes] = await Promise.all([
      supabase.from('profiles').select('username, streak_days, best_streak, xp').eq('id', user.id).maybeSingle(),
      supabase.from('scheduled_tasks').select('*, plants!inner(status)').eq('user_id', user.id).eq('completed', false).lt('scheduled_date', todayStr).eq('plants.status', 'active').order('scheduled_date'),
      supabase.from('scheduled_tasks').select('scheduled_date').eq('user_id', user.id).eq('completed', false).gt('scheduled_date', todayStr).lte('scheduled_date', in7daysStr),
      supabase.from('plants').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'harvested'),
    ])
    if (profileRes.data) {
      setProfile({ username: profileRes.data.username ?? user.email?.split('@')[0] ?? 'Cultivador', streak: profileRes.data.streak_days ?? 0, bestStreak: profileRes.data.best_streak ?? 0, xp: profileRes.data.xp ?? 0, harvestedCount: harvestRes.count ?? 0 })
    }
    setOverdueTasks((overdueRes.data ?? []).map(rowToTask))
    const countByDate: Record<string, number> = {}
    for (const row of (upcomingRes.data ?? [])) {
      const d = (row.scheduled_date as string).split('T')[0]
      countByDate[d] = (countByDate[d] ?? 0) + 1
    }
    setUpcomingDays(Array.from({ length: 7 }, (_, i) => {
      const d = addDays(today, i + 1)
      return { date: d, count: countByDate[d.toISOString().split('T')[0]] ?? 0 }
    }))
  }

  async function handleComplete(taskId: string, notes?: string, ec?: number, ph?: number) {
    const task = [...tasks, ...overdueTasks].find(t => t.id === taskId)
    await completeTask(taskId, notes)
    completeTaskInSupabase(taskId, notes).catch(console.error)
    if (task && (ec != null || ph != null) && user) {
      await supabase.from('measurements').insert({ user_id: user.id, plant_id: task.plantId ?? null, ec: ec ?? null, ph: ph ?? null, notes: notes?.trim() || null })
      void awardXP(user.id, XP_VALUES.COMPLETE_WITH_MEASUREMENT)
    } else if (user) { void awardXP(user.id, XP_VALUES.COMPLETE_TASK) }
    if (user) void recordDailyActivity(user.id)
    setOverdueTasks(prev => prev.filter(t => t.id !== taskId))
    setSheetTask(null)
  }

  async function onRefresh() { setRefreshing(true); await loadData(); setRefreshing(false) }

  function openSheet(task: ScheduledTask) {
    const p = plants.find(pl => pl.id === task.plantId)
    setSheetTask({ id: task.id, type: task.type, week: task.week, cycle: task.cycle, products: task.products, ecMin: task.ecMin, ecMax: task.ecMax, phMin: task.phMin, phMax: task.phMax, potCount: p?.potCount, potVolumeLiters: p?.potVolumeLiters })
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#080E09' }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 110 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#52CC64" />}
      >

        {/* ══ HERO HEADER ══════════════════════════════════════════ */}
        <LinearGradient
          colors={['#0F1F10', '#080E09']}
          style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 24 }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <Text style={{ color: '#3D6642', fontSize: 12, fontWeight: '600', textTransform: 'capitalize' }}>
              {format(new Date(), "EEEE d 'de' MMMM", { locale: es })}
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {profile.streak > 0 && (
                <LinearGradient
                  colors={profile.streak >= 7 ? ['#3D1E00', '#1F0E00'] : ['#1A2E1C', '#0F1A10']}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: profile.streak >= 7 ? '#6B3800' : '#2A4A2E' }}
                >
                  <Text style={{ fontSize: 14 }}>🔥</Text>
                  <Text style={{ color: profile.streak >= 7 ? '#F59E0B' : '#52CC64', fontSize: 14, fontWeight: '900' }}>{profile.streak}d</Text>
                </LinearGradient>
              )}
              <TouchableOpacity
                onPress={() => router.push('/settings')}
                style={{ backgroundColor: '#1A2E1C', borderRadius: 20, padding: 8, borderWidth: 1, borderColor: '#2A4A2E' }}
              >
                <Text style={{ fontSize: 14 }}>⚙️</Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={{ color: '#E8F5EA', fontSize: 28, fontWeight: '900', letterSpacing: -0.5 }}>
            {greeting},
          </Text>
          <Text style={{ color: '#52CC64', fontSize: 28, fontWeight: '900', letterSpacing: -0.5, marginBottom: 0 }}>
            {profile.username || 'Cultivador'} 🌿
          </Text>
        </LinearGradient>

        {/* ══ TARJETA XP / NIVEL ═══════════════════════════════════ */}
        <View style={{ marginHorizontal: 16, marginBottom: 20 }}>
          <TouchableOpacity onPress={() => router.push('/achievements')} activeOpacity={0.9}>
            <LinearGradient
              colors={['#1A0D2E', '#0E0819', '#0F1A10']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={{ borderRadius: 24, padding: 20, borderWidth: 1, borderColor: '#2D1F4A' }}
            >
              {/* Nivel */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: '#2D1F4A', alignItems: 'center', justifyContent: 'center', marginRight: 14, borderWidth: 1, borderColor: '#4A2E7A' }}>
                  <Text style={{ fontSize: 28 }}>{levelInfo.current.emoji}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#C4A8F0', fontSize: 11, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' }}>Nivel actual</Text>
                  <Text style={{ color: '#F0E8FF', fontSize: 20, fontWeight: '900', marginTop: 2 }}>{levelInfo.current.name}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ color: '#A78BFA', fontSize: 28, fontWeight: '900', lineHeight: 30 }}>{profile.xp}</Text>
                  <Text style={{ color: '#6B46C1', fontSize: 10, fontWeight: '800', letterSpacing: 1 }}>XP TOTAL</Text>
                </View>
              </View>

              {/* Barra XP */}
              {levelInfo.next && (
                <View style={{ marginBottom: 16 }}>
                  <View style={{ height: 8, backgroundColor: '#1C1030', borderRadius: 4, overflow: 'hidden' }}>
                    <LinearGradient
                      colors={['#7C3AED', '#A855F7', '#C084FC']}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                      style={{ height: '100%', borderRadius: 4, width: `${Math.round(levelInfo.progressToNext * 100)}%` }}
                    />
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                    <Text style={{ color: '#6B46C1', fontSize: 10 }}>{levelInfo.current.name}</Text>
                    <Text style={{ color: '#6B46C1', fontSize: 10 }}>{xpToNext} XP para {levelInfo.next.name}</Text>
                  </View>
                </View>
              )}

              {/* Stats */}
              <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#2D1F4A', paddingTop: 14, gap: 0 }}>
                {[
                  { emoji: '🔥', value: `${profile.streak}d`, label: 'Racha', sub: `Record ${profile.bestStreak}d` },
                  { emoji: '🌱', value: String(plants.length), label: 'Activas', sub: 'plantas' },
                  { emoji: '✂️', value: String(profile.harvestedCount), label: 'Cosechas', sub: 'historico' },
                ].map((s, i) => (
                  <View key={s.label} style={{
                    flex: 1, alignItems: 'center',
                    borderLeftWidth: i > 0 ? 1 : 0, borderLeftColor: '#2D1F4A',
                  }}>
                    <Text style={{ fontSize: 16, marginBottom: 3 }}>{s.emoji}</Text>
                    <Text style={{ color: '#E8F5EA', fontSize: 20, fontWeight: '900' }}>{s.value}</Text>
                    <Text style={{ color: '#8B6FBE', fontSize: 10, fontWeight: '700' }}>{s.label}</Text>
                    <Text style={{ color: '#4A3870', fontSize: 9, marginTop: 1 }}>{s.sub}</Text>
                  </View>
                ))}
              </View>

              <Text style={{ color: '#4A3870', fontSize: 10, textAlign: 'center', marginTop: 12 }}>
                Toca para ver todos los logros ›
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* ══ AGENDA HOY ═══════════════════════════════════════════ */}
        <View style={{ marginHorizontal: 16, marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: '#1C2E1E' }} />
            <Text style={{ color: '#3D6642', fontSize: 10, fontWeight: '800', letterSpacing: 2, textTransform: 'uppercase', marginHorizontal: 10 }}>
              Agenda de hoy
            </Text>
            <View style={{ flex: 1, height: 1, backgroundColor: '#1C2E1E' }} />
          </View>

          {plants.length === 0 && (
            <TouchableOpacity onPress={() => router.push('/onboarding')} activeOpacity={0.85}>
              <LinearGradient
                colors={['#0D2010', '#080E09']}
                style={{ borderRadius: 22, padding: 36, alignItems: 'center', borderWidth: 2, borderColor: '#1A4A20', borderStyle: 'dashed' }}
              >
                <Text style={{ fontSize: 48, marginBottom: 12 }}>🌱</Text>
                <Text style={{ color: '#E8F5EA', fontWeight: '900', fontSize: 18 }}>Empeza a cultivar</Text>
                <Text style={{ color: '#3D6642', fontSize: 13, marginTop: 6, textAlign: 'center' }}>Crea tu primera planta</Text>
                <LinearGradient colors={['#52CC64', '#3DAA50']} style={{ marginTop: 16, borderRadius: 14, paddingHorizontal: 24, paddingVertical: 12 }}>
                  <Text style={{ color: '#080E09', fontWeight: '900', fontSize: 14 }}>Comenzar →</Text>
                </LinearGradient>
              </LinearGradient>
            </TouchableOpacity>
          )}

          {/* Vencidas */}
          {overdueTasks.length > 0 && (
            <View style={{ borderRadius: 20, overflow: 'hidden', marginBottom: 12, borderWidth: 1, borderColor: '#4A1515' }}>
              <LinearGradient colors={['#1F0808', '#120404']} style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <View style={{ backgroundColor: '#EF4444', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                    <Text style={{ color: '#fff', fontSize: 10, fontWeight: '900', letterSpacing: 1 }}>
                      ⚠️ {overdueTasks.length} VENCIDA{overdueTasks.length > 1 ? 'S' : ''}
                    </Text>
                  </View>
                </View>
              </LinearGradient>
              {overdueTasks.map((task, i) => {
                const plant = plants.find(p => p.id === task.plantId)
                return (
                  <View key={task.id} style={{
                    flexDirection: 'row', alignItems: 'center',
                    backgroundColor: '#0E0404', paddingHorizontal: 16, paddingVertical: 14,
                    borderTopWidth: i === 0 ? 1 : 1, borderTopColor: '#2A0808',
                  }}>
                    <Text style={{ fontSize: 22, marginRight: 12 }}>{TYPE_ICON[task.type]}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#F5C4C4', fontSize: 14, fontWeight: '800' }}>
                        {TYPE_LABEL[task.type]} — {plant?.name ?? '—'}
                      </Text>
                      <Text style={{ color: '#7A2A2A', fontSize: 11, marginTop: 2 }}>
                        Vencio el {format(new Date(task.scheduledDate), "d 'de' MMM", { locale: es })}
                        {task.week ? ` · S${task.week}` : ''}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => openSheet(task)}
                      style={{ borderRadius: 12, overflow: 'hidden' }}
                    >
                      <LinearGradient colors={['#C0392B', '#922B21']} style={{ paddingHorizontal: 14, paddingVertical: 8 }}>
                        <Text style={{ color: '#fff', fontWeight: '900', fontSize: 12 }}>Hecho</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                )
              })}
            </View>
          )}

          {/* Tareas de hoy */}
          {tasks.length > 0 && (
            <View style={{ borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: allDone ? '#2A5A30' : '#1E3020' }}>
              {/* Header con progreso */}
              <LinearGradient
                colors={allDone ? ['#0D2A10', '#091508'] : ['#112016', '#080E09']}
                style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12 }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                  <Text style={{ color: allDone ? '#52CC64' : '#E8F5EA', fontSize: 15, fontWeight: '900', flex: 1 }}>
                    {allDone ? '🎉 Todo al dia!' : `⚡ ${pending.length} pendiente${pending.length > 1 ? 's' : ''} hoy`}
                  </Text>
                  <View style={{ backgroundColor: '#0D2010', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: '#1A3D1E' }}>
                    <Text style={{ color: '#52CC64', fontSize: 12, fontWeight: '800' }}>{done.length}/{tasks.length}</Text>
                  </View>
                </View>
                <View style={{ height: 5, backgroundColor: '#0D1A0F', borderRadius: 3, overflow: 'hidden' }}>
                  <LinearGradient
                    colors={['#52CC64', '#3DAA50']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={{ height: '100%', borderRadius: 3, width: `${tasks.length > 0 ? Math.round((done.length / tasks.length) * 100) : 0}%` }}
                  />
                </View>
              </LinearGradient>

              {allDone ? (
                <LinearGradient colors={['#091508', '#0A1A0B']} style={{ padding: 32, alignItems: 'center' }}>
                  <Text style={{ fontSize: 48, marginBottom: 10 }}>✅</Text>
                  <Text style={{ color: '#52CC64', fontSize: 16, fontWeight: '900' }}>Excelente trabajo!</Text>
                  <Text style={{ color: '#3D6642', fontSize: 12, marginTop: 4 }}>{done.length} tarea{done.length > 1 ? 's' : ''} completada{done.length > 1 ? 's' : ''}</Text>
                </LinearGradient>
              ) : (
                pending.map((task, i) => {
                  const plant     = plants.find(p => p.id === task.plantId)
                  const isFlora   = !!plant?.floraStartDate
                  const phaseDay  = isFlora && plant?.floraStartDate
                    ? differenceInDays(today, plant.floraStartDate) + 1
                    : plant ? differenceInDays(today, plant.startDate) + 1 : 0
                  const typeColor = task.type === 'nutrition' ? '#22C55E' : task.type === 'irrigation' ? '#3B82F6' : task.type === 'foliar' ? '#A855F7' : '#F59E0B'

                  return (
                    <View key={task.id} style={{
                      backgroundColor: '#080E09',
                      borderTopWidth: 1, borderTopColor: '#0F1A10',
                    }}>
                      {/* Accent bar izquierdo */}
                      <View style={{ flexDirection: 'row' }}>
                        <View style={{ width: 3, backgroundColor: typeColor, borderRadius: 0 }} />
                        <View style={{ flex: 1, paddingHorizontal: 14, paddingVertical: 14 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                            <Text style={{ fontSize: 22, marginRight: 12 }}>{TYPE_ICON[task.type]}</Text>
                            <TouchableOpacity onPress={() => router.push(`/plants/${task.plantId}`)} style={{ flex: 1 }}>
                              <Text style={{ color: '#E8F5EA', fontWeight: '900', fontSize: 15 }}>{TYPE_LABEL[task.type]}</Text>
                              <Text style={{ color: '#4A7A50', fontSize: 12, marginTop: 2 }}>
                                {plant?.name ?? '—'} · {isFlora ? '🌸 Flora' : '🌿 Vege'} D{phaseDay}{task.week ? ` S${task.week}` : ''}
                              </Text>

                              {/* Productos */}
                              {task.products && task.products.length > 0 && (
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 8 }}>
                                  {task.products.slice(0, 4).map((prod, pi) => (
                                    <View key={pi} style={{ backgroundColor: '#0D1A0F', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: '#1A3020' }}>
                                      <Text style={{ color: '#6DAA78', fontSize: 10, fontWeight: '700' }}>
                                        {prod.name}{prod.minDose != null ? ` · ${prod.minDose}${prod.maxDose && prod.maxDose !== prod.minDose ? `-${prod.maxDose}` : ''}ml/L` : ''}
                                      </Text>
                                    </View>
                                  ))}
                                  {task.products.length > 4 && (
                                    <View style={{ backgroundColor: '#0D1A0F', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
                                      <Text style={{ color: '#3D6642', fontSize: 10 }}>+{task.products.length - 4} mas</Text>
                                    </View>
                                  )}
                                </View>
                              )}

                              {/* EC / PH chips */}
                              {(task.ecMin != null || task.phMin != null) && (
                                <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                                  {task.ecMin != null && (
                                    <LinearGradient colors={['#0A2010', '#091508']} style={{ borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: '#1A4020' }}>
                                      <Text style={{ color: '#52CC64', fontSize: 11, fontWeight: '800' }}>
                                        EC {task.ecMin}{task.ecMax && task.ecMax !== task.ecMin ? `-${task.ecMax}` : ''}
                                      </Text>
                                    </LinearGradient>
                                  )}
                                  {task.phMin != null && (
                                    <LinearGradient colors={['#0A1020', '#090810']} style={{ borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: '#1A2A50' }}>
                                      <Text style={{ color: '#60A5FA', fontSize: 11, fontWeight: '800' }}>
                                        PH {task.phMin}{task.phMax && task.phMax !== task.phMin ? `-${task.phMax}` : ''}
                                      </Text>
                                    </LinearGradient>
                                  )}
                                </View>
                              )}
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => openSheet(task)} style={{ marginLeft: 10, borderRadius: 12, overflow: 'hidden' }}>
                              <LinearGradient colors={['#1A4A20', '#0D2810']} style={{ paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: '#2A6A30' }}>
                                <Text style={{ color: '#52CC64', fontWeight: '900', fontSize: 14 }}>✓</Text>
                              </LinearGradient>
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    </View>
                  )
                })
              )}

              {done.length > 0 && !allDone && (
                <LinearGradient colors={['#060C07', '#080E09']} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#0F1A10' }}>
                  <Text style={{ fontSize: 13 }}>✅</Text>
                  <Text style={{ color: '#2D5A35', fontSize: 12, fontWeight: '600' }}>{done.length} completada{done.length > 1 ? 's' : ''} hoy</Text>
                </LinearGradient>
              )}
            </View>
          )}

          {plants.length > 0 && tasks.length === 0 && overdueTasks.length === 0 && (
            <LinearGradient colors={['#0D1A0F', '#080E09']} style={{ borderRadius: 20, padding: 28, alignItems: 'center', borderWidth: 1, borderColor: '#1A3020' }}>
              <Text style={{ fontSize: 36, marginBottom: 8 }}>🌿</Text>
              <Text style={{ color: '#52CC64', fontSize: 15, fontWeight: '900' }}>Dia libre!</Text>
              <Text style={{ color: '#3D6642', fontSize: 12, marginTop: 4 }}>Sin tareas para hoy</Text>
            </LinearGradient>
          )}
        </View>

        {/* ══ PROXIMOS 7 DIAS ══════════════════════════════════════ */}
        {plants.length > 0 && (
          <View style={{ marginHorizontal: 16, marginBottom: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: '#1C2E1E' }} />
              <Text style={{ color: '#3D6642', fontSize: 10, fontWeight: '800', letterSpacing: 2, textTransform: 'uppercase', marginHorizontal: 10 }}>
                Proximos 7 dias
              </Text>
              <View style={{ flex: 1, height: 1, backgroundColor: '#1C2E1E' }} />
            </View>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {upcomingDays.map((day, i) => {
                const hasTask = day.count > 0
                const isWeekend = day.date.getDay() === 0 || day.date.getDay() === 6
                return (
                  <TouchableOpacity key={i} onPress={() => router.push('/(tabs)/tasks')} style={{ flex: 1 }} activeOpacity={0.8}>
                    {hasTask ? (
                      <LinearGradient
                        colors={['#112016', '#090F0A']}
                        style={{ borderRadius: 14, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: '#1E3A22' }}
                      >
                        <Text style={{ color: isWeekend ? '#52CC64' : '#4A7A50', fontSize: 9, fontWeight: '800', textTransform: 'uppercase' }}>
                          {format(day.date, 'EEE', { locale: es }).slice(0, 2)}
                        </Text>
                        <Text style={{ color: '#E8F5EA', fontSize: 15, fontWeight: '900', marginTop: 3 }}>{format(day.date, 'd')}</Text>
                        <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: '#52CC64', marginTop: 4 }} />
                        <Text style={{ color: '#52CC64', fontSize: 8, fontWeight: '800', marginTop: 2 }}>{day.count}</Text>
                      </LinearGradient>
                    ) : (
                      <View style={{ borderRadius: 14, paddingVertical: 12, alignItems: 'center', backgroundColor: '#0C1410', borderWidth: 1, borderColor: '#141E15' }}>
                        <Text style={{ color: isWeekend ? '#2A5A30' : '#1E3020', fontSize: 9, fontWeight: '700', textTransform: 'uppercase' }}>
                          {format(day.date, 'EEE', { locale: es }).slice(0, 2)}
                        </Text>
                        <Text style={{ color: '#2A4A2E', fontSize: 15, fontWeight: '900', marginTop: 3 }}>{format(day.date, 'd')}</Text>
                        <View style={{ width: 5, height: 5, marginTop: 4 }} />
                        <View style={{ height: 10, marginTop: 2 }} />
                      </View>
                    )}
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>
        )}

        {/* ══ MIS PLANTAS ══════════════════════════════════════════ */}
        {plants.length > 0 && (
          <View style={{ marginHorizontal: 16, marginBottom: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: '#1C2E1E' }} />
              <Text style={{ color: '#3D6642', fontSize: 10, fontWeight: '800', letterSpacing: 2, textTransform: 'uppercase', marginHorizontal: 10 }}>
                Mis plantas
              </Text>
              <View style={{ flex: 1, height: 1, backgroundColor: '#1C2E1E' }} />
            </View>

            <View style={{ gap: 10 }}>
              {plants.map((plant: Plant) => {
                const isFlora    = !!plant.floraStartDate
                const phaseDay   = isFlora && plant.floraStartDate
                  ? differenceInDays(today, plant.floraStartDate) + 1
                  : differenceInDays(today, plant.startDate) + 1
                const weekNum    = Math.ceil(phaseDay / 7)
                const plantPending = pending.filter(t => t.plantId === plant.id).length
                const plantOverdue = overdueTasks.filter(t => t.plantId === plant.id).length

                return (
                  <TouchableOpacity key={plant.id} onPress={() => router.push(`/plants/${plant.id}`)} activeOpacity={0.85}>
                    <LinearGradient
                      colors={isFlora ? ['#1A0E00', '#0E0800', '#080A09'] : ['#0D1A0F', '#070D08', '#080A09']}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                      style={{ borderRadius: 20, borderWidth: 1, borderColor: isFlora ? '#3D2000' : '#162A18', overflow: 'hidden' }}
                    >
                      <View style={{ padding: 16 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                          {/* Fase badge */}
                          <View style={{ marginRight: 14 }}>
                            <LinearGradient
                              colors={isFlora ? ['#3D2000', '#1F1000'] : ['#1A3D1E', '#0D2010']}
                              style={{ width: 50, height: 50, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: isFlora ? '#6B3800' : '#2A5A2E' }}
                            >
                              <Text style={{ fontSize: 24 }}>{isFlora ? '🌸' : '🌿'}</Text>
                            </LinearGradient>
                          </View>
                          {/* Info */}
                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                              <View style={{ backgroundColor: isFlora ? '#3D2000' : '#1A3D1E', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 }}>
                                <Text style={{ color: isFlora ? '#F59E0B' : '#52CC64', fontSize: 9, fontWeight: '900', letterSpacing: 0.5 }}>
                                  {isFlora ? 'FLORA' : 'VEGE'}
                                </Text>
                              </View>
                              <View style={{ backgroundColor: '#0D1A10', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 }}>
                                <Text style={{ color: '#4A7A50', fontSize: 9, fontWeight: '700' }}>
                                  {plant.geneticType === 'autoflower' ? 'AUTO' : plant.geneticType === 'feminized' ? 'FEM' : 'REG'}
                                </Text>
                              </View>
                            </View>
                            <Text style={{ color: '#E8F5EA', fontSize: 17, fontWeight: '900' }}>{plant.name}</Text>
                            <Text style={{ color: isFlora ? '#A06020' : '#4A7A50', fontSize: 12, marginTop: 1 }}>{plant.genetics}</Text>
                          </View>
                          {/* Dia/Semana */}
                          <View style={{ alignItems: 'flex-end' }}>
                            <Text style={{ color: isFlora ? '#F59E0B' : '#52CC64', fontSize: 26, fontWeight: '900', lineHeight: 28 }}>D{phaseDay}</Text>
                            <Text style={{ color: isFlora ? '#6B3800' : '#2A5A2E', fontSize: 10, fontWeight: '700' }}>S{weekNum} {isFlora ? 'FLORA' : 'VEGE'}</Text>
                          </View>
                        </View>

                        {/* Footer */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: isFlora ? '#2D1800' : '#142214' }}>
                          <Text style={{ color: isFlora ? '#5A3010' : '#2A4A2E', fontSize: 11, flex: 1 }}>
                            📅 Desde {format(plant.startDate, "d MMM yyyy", { locale: es })} · 🪴 {plant.potCount}×{plant.potVolumeLiters}L
                          </Text>
                          {plantOverdue > 0 ? (
                            <LinearGradient colors={['#3D0A0A', '#200505']} style={{ borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: '#6A1515' }}>
                              <Text style={{ color: '#EF4444', fontSize: 11, fontWeight: '900' }}>⚠️ {plantOverdue} vencida{plantOverdue > 1 ? 's' : ''}</Text>
                            </LinearGradient>
                          ) : plantPending > 0 ? (
                            <LinearGradient colors={['#0D2A10', '#091508']} style={{ borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: '#1A4A1E' }}>
                              <Text style={{ color: '#52CC64', fontSize: 11, fontWeight: '800' }}>⚡ {plantPending} hoy</Text>
                            </LinearGradient>
                          ) : (
                            <View style={{ borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: '#0A1A0C', borderWidth: 1, borderColor: '#142214' }}>
                              <Text style={{ color: '#2A5A30', fontSize: 11, fontWeight: '700' }}>✓ Al dia</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
                )
              })}
              <TouchableOpacity onPress={() => router.push('/(tabs)/plants')} style={{ alignItems: 'center', paddingVertical: 10 }}>
                <Text style={{ color: '#3D6642', fontSize: 12, fontWeight: '700' }}>Ver historial de plantas →</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

      </ScrollView>

      <CompleteTaskSheet visible={!!sheetTask} task={sheetTask} onClose={() => setSheetTask(null)} onComplete={handleComplete} />
    </SafeAreaView>
  )
}

function rowToTask(row: Record<string, unknown>): ScheduledTask {
  return {
    id: row.id as string, plantId: row.plant_id as string, type: row.type as ScheduledTask['type'],
    scheduledDate: new Date(row.scheduled_date as string), cycle: row.cycle as ScheduledTask['cycle'],
    week: row.week as number, stage: (row.stage as ScheduledTask['stage']) ?? 'rooting',
    products: (row.products as ScheduledTask['products']) ?? [],
    ecMin: row.ec_min as number, ecMax: row.ec_max as number, phMin: row.ph_min as number, phMax: row.ph_max as number,
    completed: (row.completed as boolean) ?? false,
  }
}
