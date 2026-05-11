import { useState, useEffect } from 'react'
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { format, differenceInDays, addDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { usePlants } from '@/hooks/usePlants'
import { usePlantStore } from '@/store/plantStore'
import { useTasks } from '@/hooks/useTasks'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { completeTaskInSupabase, loadPlantsFromSupabase } from '@/lib/sync'
import { awardXP, recordDailyActivity, XP_VALUES } from '@/lib/xp'
import { getLevelInfo } from '@shared/lib/gamification'
import { CompleteTaskSheet, type SheetTask } from '@/components/CompleteTaskSheet'
import {
  LogoMark, GearIcon, ProgressRing,
  DropIcon, FlaskIcon, EyeIcon, ScissorsIcon, SprayIcon,
} from '@/components/icons/AppIcons'
import type { ScheduledTask, Plant } from '@shared/types/plant'

// ─── Type colors & labels ─────────────────────────────────────────────────────
const TYPE_COLOR: Record<string, string> = {
  nutrition: '#22C55E', irrigation: '#3B82F6',
  observation: '#F59E0B', foliar: '#A855F7', harvest: '#EF4444',
}
const TYPE_LABEL: Record<string, string> = {
  nutrition: 'Nutricion', irrigation: 'Riego',
  observation: 'Observacion', foliar: 'Foliar', harvest: 'Cosecha',
}

function TaskTypeIcon({ type, size = 22 }: { type: string; size?: number }) {
  if (type === 'irrigation')  return <DropIcon size={size} color="#3B82F6" />
  if (type === 'nutrition')   return <FlaskIcon size={size} color="#22C55E" />
  if (type === 'observation') return <EyeIcon size={size} color="#F59E0B" />
  if (type === 'foliar')      return <SprayIcon size={size} color="#A855F7" />
  if (type === 'harvest')     return <ScissorsIcon size={size} color="#EF4444" />
  return <FlaskIcon size={size} color="#52CC64" />
}

type ProfileData = {
  username: string; streak: number; bestStreak: number
  xp: number; harvestedCount: number
}
type UpcomingDay = { date: Date; count: number }

export default function HomeScreen() {
  const { user }   = useAuth()
  const { plants } = usePlants()
  const setPlants = usePlantStore(s => s.setPlants)
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
  const xpToNext  = levelInfo.next ? levelInfo.next.xpRequired - profile.xp : 0
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

  async function onRefresh() {
    setRefreshing(true)
    await Promise.all([
      loadData(),
      // Recargar plantas del store desde Supabase (pull-to-refresh actualiza plantas nuevas)
      user ? loadPlantsFromSupabase(user.id).then(setPlants).catch(console.error) : Promise.resolve(),
    ])
    setRefreshing(false)
  }

  async function handleCompleteAll() {
    if (pending.length === 0) return
    await Promise.all(
      pending.map(task =>
        handleComplete(task.id).catch(console.error)
      )
    )
  }

  function openSheet(task: ScheduledTask) {
    const p = plants.find(pl => pl.id === task.plantId)
    setSheetTask({ id: task.id, type: task.type, week: task.week, cycle: task.cycle, products: task.products, ecMin: task.ecMin, ecMax: task.ecMax, phMin: task.phMin, phMax: task.phMax, potCount: p?.potCount, potVolumeLiters: p?.potVolumeLiters })
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#080E09' }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#52CC64" />}
        showsVerticalScrollIndicator={false}
      >

        {/* ══ HEADER COMPACTO ══════════════════════════════════════ */}
        <LinearGradient
          colors={['#0F1F10', '#080E09']}
          style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            {/* Logo + nombre */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <LogoMark size={42} primaryColor="#52CC64" secondaryColor="#3DAA50" />
              <View>
                <Text style={{ color: '#E8F5EA', fontSize: 20, fontWeight: '900', letterSpacing: -0.4 }}>CannaTrack</Text>
                <Text style={{ color: '#3D6642', fontSize: 13, fontWeight: '600', textTransform: 'capitalize' }}>
                  {format(new Date(), "EEE d 'de' MMM", { locale: es })}
                </Text>
              </View>
            </View>

            {/* Streak + gear */}
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              {profile.streak > 0 && (
                <LinearGradient
                  colors={profile.streak >= 7 ? ['#3D1E00', '#1F0E00'] : ['#1A2E1C', '#0F1A10']}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: profile.streak >= 7 ? '#6B3800' : '#2A4A2E' }}
                >
                  <Text style={{ fontSize: 14 }}>🔥</Text>
                  <Text style={{ color: profile.streak >= 7 ? '#F59E0B' : '#52CC64', fontSize: 14, fontWeight: '900' }}>{profile.streak}d</Text>
                </LinearGradient>
              )}
              <TouchableOpacity
                onPress={() => router.push('/settings')}
                style={{ width: 38, height: 38, backgroundColor: '#1A2E1C', borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#2A4A2E' }}
              >
                <GearIcon size={19} color="#3D6642" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Greeting */}
          <View style={{ marginTop: 18 }}>
            <Text style={{ color: '#728C74', fontSize: 14, fontWeight: '600' }}>{greeting}</Text>
            <Text style={{ color: '#E8F5EA', fontSize: 28, fontWeight: '900', letterSpacing: -0.5, marginTop: 2 }}>
              {profile.username || 'Cultivador'}
            </Text>
          </View>

          {/* XP strip - compact, inline */}
          {levelInfo.next && (
            <TouchableOpacity onPress={() => router.push('/achievements')} activeOpacity={0.8}>
              <View style={{ marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(139,92,246,0.08)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(139,92,246,0.18)', paddingHorizontal: 14, paddingVertical: 10 }}>
                <Text style={{ fontSize: 16 }}>{levelInfo.current.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                    <Text style={{ color: '#A78BFA', fontSize: 13, fontWeight: '700' }}>{levelInfo.current.name}</Text>
                    <Text style={{ color: '#6B46C1', fontSize: 12, fontWeight: '700' }}>{xpToNext} XP para {levelInfo.next.name}</Text>
                  </View>
                  <View style={{ height: 4, backgroundColor: 'rgba(139,92,246,0.15)', borderRadius: 2, overflow: 'hidden' }}>
                    <LinearGradient
                      colors={['#7C3AED', '#A855F7', '#C084FC']}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                      style={{ height: '100%', borderRadius: 2, width: `${Math.round(levelInfo.progressToNext * 100)}%` }}
                    />
                  </View>
                </View>
                <Text style={{ color: '#4A3870', fontSize: 12 }}>›</Text>
              </View>
            </TouchableOpacity>
          )}
        </LinearGradient>

        <View style={{ paddingHorizontal: 16, gap: 16 }}>

          {/* ══ ALERTA VENCIDAS ══════════════════════════════════════ */}
          {overdueTasks.length > 0 && (
            <LinearGradient
              colors={['#2A0808', '#1A0404']}
              style={{ borderRadius: 18, borderWidth: 1, borderColor: '#4A1515', overflow: 'hidden' }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12 }}>
                <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(239,68,68,0.15)', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 18 }}>⚠️</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#EF4444', fontSize: 15, fontWeight: '900' }}>
                    {overdueTasks.length} tarea{overdueTasks.length > 1 ? 's' : ''} vencida{overdueTasks.length > 1 ? 's' : ''}
                  </Text>
                  <Text style={{ color: '#7A2A2A', fontSize: 13, marginTop: 2 }}>
                    {overdueTasks.map(t => plants.find(p => p.id === t.plantId)?.name).filter(Boolean).join(', ')}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => openSheet(overdueTasks[0])}
                  style={{ borderRadius: 12, overflow: 'hidden' }}
                >
                  <LinearGradient colors={['#C0392B', '#922B21']} style={{ paddingHorizontal: 14, paddingVertical: 9 }}>
                    <Text style={{ color: '#fff', fontWeight: '900', fontSize: 13 }}>Resolver</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
              {overdueTasks.length > 1 && (
                <View style={{ paddingHorizontal: 16, paddingBottom: 12, gap: 6 }}>
                  {overdueTasks.slice(1).map(task => {
                    const plant = plants.find(p => p.id === task.plantId)
                    return (
                      <TouchableOpacity key={task.id} onPress={() => openSheet(task)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9 }}>
                        <TaskTypeIcon type={task.type} size={16} />
                        <Text style={{ color: '#C47070', fontSize: 13, flex: 1, fontWeight: '600' }}>
                          {TYPE_LABEL[task.type]} — {plant?.name ?? '—'}
                        </Text>
                        <Text style={{ color: '#7A2A2A', fontSize: 12 }}>Marcar hecho</Text>
                      </TouchableOpacity>
                    )
                  })}
                </View>
              )}
            </LinearGradient>
          )}

          {/* ══ HERO: QUE HACER HOY ══════════════════════════════════ */}
          {plants.length === 0 ? (
            /* Estado vacio: sin plantas */
            <TouchableOpacity onPress={() => router.push('/(tabs)/plants')} activeOpacity={0.85}>
              <LinearGradient
                colors={['#0D2010', '#080E09']}
                style={{ borderRadius: 24, padding: 40, alignItems: 'center', borderWidth: 1.5, borderColor: '#1A4A20', borderStyle: 'dashed' }}
              >
                <LogoMark size={72} primaryColor="#52CC64" secondaryColor="#3DAA50" />
                <Text style={{ color: '#E8F5EA', fontWeight: '900', fontSize: 20, marginTop: 18 }}>Empeza a cultivar</Text>
                <Text style={{ color: '#3D6642', fontSize: 15, marginTop: 8, textAlign: 'center', lineHeight: 22 }}>
                  Crea tu primera planta{'\n'}para empezar a seguirla
                </Text>
                <LinearGradient colors={['#52CC64', '#3DAA50']} style={{ marginTop: 22, borderRadius: 16, paddingHorizontal: 28, paddingVertical: 14 }}>
                  <Text style={{ color: '#080E09', fontWeight: '900', fontSize: 16 }}>Nueva planta →</Text>
                </LinearGradient>
              </LinearGradient>
            </TouchableOpacity>
          ) : tasks.length === 0 && overdueTasks.length === 0 ? (
            /* Sin tareas hoy */
            <LinearGradient
              colors={['#0D2010', '#080E09']}
              style={{ borderRadius: 24, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: '#1A3020' }}
            >
              <View style={{ width: 80, height: 80, position: 'relative', alignItems: 'center', justifyContent: 'center' }}>
                <ProgressRing done={1} total={1} size={80} color="#52CC64" />
                <View style={{ position: 'absolute' }}>
                  <Text style={{ fontSize: 28 }}>🌿</Text>
                </View>
              </View>
              <Text style={{ color: '#52CC64', fontSize: 22, fontWeight: '900', marginTop: 14 }}>Dia libre!</Text>
              <Text style={{ color: '#3D6642', fontSize: 15, marginTop: 6 }}>Sin tareas programadas hoy</Text>
            </LinearGradient>
          ) : allDone ? (
            /* Todas completadas */
            <LinearGradient
              colors={['#0A2010', '#060E08']}
              style={{ borderRadius: 24, padding: 28, alignItems: 'center', borderWidth: 1, borderColor: '#1A4A20' }}
            >
              <View style={{ width: 90, height: 90, position: 'relative', alignItems: 'center', justifyContent: 'center' }}>
                <ProgressRing done={done.length} total={tasks.length} size={90} color="#52CC64" />
                <View style={{ position: 'absolute', alignItems: 'center' }}>
                  <Text style={{ color: '#52CC64', fontSize: 22, fontWeight: '900', lineHeight: 24 }}>{done.length}</Text>
                  <Text style={{ color: '#3D6642', fontSize: 10, fontWeight: '700' }}>listas</Text>
                </View>
              </View>
              <Text style={{ color: '#52CC64', fontSize: 22, fontWeight: '900', marginTop: 14 }}>Todo al dia!</Text>
              <Text style={{ color: '#3D6642', fontSize: 15, marginTop: 6 }}>
                {done.length} tarea{done.length > 1 ? 's' : ''} completada{done.length > 1 ? 's' : ''} hoy
              </Text>
            </LinearGradient>
          ) : (
            /* Tareas pendientes — hero */
            <View>
              {/* Cabecera del bloque con anillo de progreso */}
              <LinearGradient
                colors={['#0F1F10', '#080E09']}
                style={{ borderRadius: 24, borderWidth: 1, borderColor: '#1C3020', overflow: 'hidden', marginBottom: 3 }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 18, gap: 18 }}>
                  {/* Ring */}
                  <View style={{ position: 'relative', alignItems: 'center', justifyContent: 'center', width: 76, height: 76 }}>
                    <ProgressRing done={done.length} total={tasks.length} size={76} color="#52CC64" />
                    <View style={{ position: 'absolute', alignItems: 'center' }}>
                      <Text style={{ color: '#E8F5EA', fontSize: 20, fontWeight: '900', lineHeight: 22 }}>{pending.length}</Text>
                      <Text style={{ color: '#3D6642', fontSize: 10, fontWeight: '700' }}>pendiente{pending.length > 1 ? 's' : ''}</Text>
                    </View>
                  </View>

                  {/* Text */}
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text style={{ color: '#E8F5EA', fontSize: 24, fontWeight: '900', lineHeight: 26 }}>
                        Para hacer hoy
                      </Text>
                      {pending.length > 1 && (
                        <TouchableOpacity onPress={handleCompleteAll} activeOpacity={0.8} style={{ borderRadius: 10, overflow: 'hidden' }}>
                          <LinearGradient colors={['#1A4A20', '#0D2810']} style={{ paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: '#2A6A30' }}>
                            <Text style={{ color: '#52CC64', fontWeight: '900', fontSize: 13 }}>✓ Todo</Text>
                          </LinearGradient>
                        </TouchableOpacity>
                      )}
                    </View>
                    <Text style={{ color: '#3D6642', fontSize: 14, marginTop: 4 }}>
                      {done.length > 0
                        ? `${done.length} de ${tasks.length} completada${done.length > 1 ? 's' : ''}`
                        : `${tasks.length} tarea${tasks.length > 1 ? 's' : ''} programada${tasks.length > 1 ? 's' : ''}`
                      }
                    </Text>
                    {/* Mini progress bar */}
                    <View style={{ marginTop: 10, height: 5, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                      <LinearGradient
                        colors={['#52CC64', '#3DAA50']}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                        style={{ height: '100%', borderRadius: 3, width: `${tasks.length > 0 ? (done.length / tasks.length) * 100 : 0}%` }}
                      />
                    </View>
                  </View>
                </View>
              </LinearGradient>

              {/* Lista de tareas */}
              <LinearGradient
                colors={['#0C1A0D', '#080E09']}
                style={{ borderRadius: 20, borderWidth: 1, borderColor: '#1C3020', overflow: 'hidden' }}
              >
                {pending.map((task, i) => {
                  const plant      = plants.find(p => p.id === task.plantId)
                  const isFlora    = !!plant?.floraStartDate
                  const phaseDay   = isFlora && plant?.floraStartDate
                    ? differenceInDays(today, plant.floraStartDate) + 1
                    : plant ? differenceInDays(today, plant.startDate) + 1 : 0
                  const weekNum    = Math.ceil(phaseDay / 7)
                  const typeColor  = TYPE_COLOR[task.type] ?? '#52CC64'
                  // Left accent refleja fase, no tipo de tarea — consistente con tasks.tsx
                  const phaseColor = isFlora ? '#F59E0B' : '#52CC64'

                  return (
                    <View key={task.id} style={{ borderTopWidth: i > 0 ? 1 : 0, borderTopColor: '#142016' }}>
                      <View style={{ flexDirection: 'row' }}>
                        {/* Left accent — color de fase */}
                        <View style={{ width: 4, backgroundColor: phaseColor, opacity: 0.8 }} />

                        <View style={{ flex: 1, paddingHorizontal: 16, paddingVertical: 16 }}>
                          {/* Plant name — PROMINENTE */}
                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                            <TouchableOpacity onPress={() => router.push(`/plants/${task.plantId}`)} style={{ flex: 1 }}>
                              <Text style={{ color: '#E8F5EA', fontSize: 18, fontWeight: '900', letterSpacing: -0.3 }}>
                                {plant?.name ?? '—'}
                              </Text>
                            </TouchableOpacity>
                            {/* Accion rapida */}
                            <TouchableOpacity onPress={() => openSheet(task)} activeOpacity={0.8} style={{ borderRadius: 12, overflow: 'hidden', marginLeft: 12 }}>
                              <LinearGradient colors={['#1A4A20', '#0D2810']} style={{ paddingHorizontal: 18, paddingVertical: 9, borderWidth: 1, borderColor: '#2A6A30' }}>
                                <Text style={{ color: '#52CC64', fontWeight: '900', fontSize: 15 }}>✓ Hecho</Text>
                              </LinearGradient>
                            </TouchableOpacity>
                          </View>

                          {/* Tipo + fase */}
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                            <TaskTypeIcon type={task.type} size={18} />
                            <Text style={{ color: typeColor, fontSize: 15, fontWeight: '700' }}>{TYPE_LABEL[task.type]}</Text>
                            <View style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#2D4A30' }} />
                            <Text style={{ color: '#4A7A50', fontSize: 13 }}>
                              {isFlora ? 'Flora' : 'Vege'} S{weekNum} · D{phaseDay}
                            </Text>
                          </View>

                          {/* EC / pH chips */}
                          {(task.ecMin != null || task.phMin != null) && (
                            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                              {task.ecMin != null && (
                                <View style={{ backgroundColor: 'rgba(82,204,100,0.1)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(82,204,100,0.2)' }}>
                                  <Text style={{ color: '#52CC64', fontSize: 13, fontWeight: '800' }}>
                                    EC {task.ecMin}{task.ecMax && task.ecMax !== task.ecMin ? `-${task.ecMax}` : ''}
                                  </Text>
                                </View>
                              )}
                              {task.phMin != null && (
                                <View style={{ backgroundColor: 'rgba(96,165,250,0.1)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(96,165,250,0.2)' }}>
                                  <Text style={{ color: '#60A5FA', fontSize: 13, fontWeight: '800' }}>
                                    pH {task.phMin}{task.phMax && task.phMax !== task.phMin ? `-${task.phMax}` : ''}
                                  </Text>
                                </View>
                              )}
                            </View>
                          )}

                          {/* Productos */}
                          {task.products && task.products.length > 0 && (
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>
                              {task.products.slice(0, 3).map((prod: { name: string; unit?: string; minDose?: number; maxDose?: number }, pi: number) => (
                                <View key={pi} style={{ backgroundColor: '#0D1A0F', borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4, borderWidth: 1, borderColor: '#1A3020' }}>
                                  <Text style={{ color: '#6DAA78', fontSize: 12, fontWeight: '600' }}>
                                    {prod.name}{prod.minDose != null ? ` ${prod.minDose}${prod.maxDose && prod.maxDose !== prod.minDose ? `-${prod.maxDose}` : ''}${prod.unit ?? 'ml'}/L` : ''}
                                  </Text>
                                </View>
                              ))}
                              {task.products.length > 3 && (
                                <View style={{ backgroundColor: '#0D1A0F', borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4 }}>
                                  <Text style={{ color: '#3D6642', fontSize: 12 }}>+{task.products.length - 3}</Text>
                                </View>
                              )}
                            </View>
                          )}
                        </View>
                      </View>
                    </View>
                  )
                })}

                {/* Completadas del dia (colapsadas) */}
                {done.length > 0 && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#0F1A10', backgroundColor: 'rgba(0,0,0,0.2)' }}>
                    <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(82,204,100,0.15)', alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ color: '#52CC64', fontSize: 12, fontWeight: '900' }}>✓</Text>
                    </View>
                    <Text style={{ color: '#2D5A35', fontSize: 13, fontWeight: '600' }}>
                      {done.length} completada{done.length > 1 ? 's' : ''} hoy
                    </Text>
                  </View>
                )}
              </LinearGradient>
            </View>
          )}

          {/* ══ MIS PLANTAS — strip horizontal ══════════════════════ */}
          {plants.length > 0 && (
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <Text style={{ color: '#728C74', fontSize: 13, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' }}>
                  Mis plantas
                </Text>
                <TouchableOpacity onPress={() => router.push('/(tabs)/plants')}>
                  <Text style={{ color: '#3D6642', fontSize: 13, fontWeight: '700' }}>Ver todas →</Text>
                </TouchableOpacity>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -4 }}>
                <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 4 }}>
                  {plants.map((plant: Plant) => {
                    const isFlora  = !!plant.floraStartDate
                    const phaseDay = isFlora && plant.floraStartDate
                      ? differenceInDays(today, plant.floraStartDate) + 1
                      : differenceInDays(today, plant.startDate) + 1
                    const weekNum  = Math.ceil(phaseDay / 7)
                    const plantPending = pending.filter(t => t.plantId === plant.id).length
                    const accent = isFlora ? '#F59E0B' : '#52CC64'

                    return (
                      <TouchableOpacity key={plant.id} onPress={() => router.push(`/plants/${plant.id}`)} activeOpacity={0.8}>
                        <LinearGradient
                          colors={isFlora ? ['#1A0E00', '#0E0800'] : ['#0D1A0F', '#070D08']}
                          style={{ borderRadius: 18, borderWidth: 1, borderColor: isFlora ? '#3D2000' : '#162A18', padding: 14, minWidth: 130 }}
                        >
                          {/* Phase badge */}
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                            <Text style={{ fontSize: 20 }}>{isFlora ? '🌸' : '🌿'}</Text>
                            <View style={{ flex: 1 }}>
                              <Text style={{ color: accent, fontSize: 12, fontWeight: '800', letterSpacing: 0.5 }}>
                                {isFlora ? 'FLORA' : 'VEGE'}
                              </Text>
                              <Text style={{ color: isFlora ? '#C08040' : '#4A9A54', fontSize: 12, fontWeight: '600' }}>
                                S{weekNum} · D{phaseDay}
                              </Text>
                            </View>
                          </View>
                          <Text style={{ color: '#E8F5EA', fontSize: 15, fontWeight: '900' }} numberOfLines={1}>{plant.name}</Text>
                          <Text style={{ color: isFlora ? '#7A5020' : '#3D6642', fontSize: 12, marginTop: 3 }} numberOfLines={1}>{plant.genetics}</Text>
                          {plantPending > 0 && (
                            <View style={{ marginTop: 8, backgroundColor: isFlora ? 'rgba(245,158,11,0.12)' : 'rgba(82,204,100,0.12)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'flex-start', borderWidth: 1, borderColor: isFlora ? 'rgba(245,158,11,0.25)' : 'rgba(82,204,100,0.2)' }}>
                              <Text style={{ color: accent, fontSize: 11, fontWeight: '800' }}>⚡ {plantPending} hoy</Text>
                            </View>
                          )}
                        </LinearGradient>
                      </TouchableOpacity>
                    )
                  })}

                  {/* Boton nueva planta */}
                  <TouchableOpacity onPress={() => router.push('/(tabs)/plants')} activeOpacity={0.8}>
                    <View style={{ borderRadius: 18, borderWidth: 1.5, borderColor: '#1C3020', borderStyle: 'dashed', padding: 14, minWidth: 100, alignItems: 'center', justifyContent: 'center', minHeight: 110 }}>
                      <Text style={{ color: '#2D5040', fontSize: 28, fontWeight: '300' }}>+</Text>
                      <Text style={{ color: '#2D5040', fontSize: 12, fontWeight: '700', marginTop: 4 }}>Nueva</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          )}

          {/* ══ PROXIMOS 7 DIAS ══════════════════════════════════════ */}
          {plants.length > 0 && (
            <View>
              <Text style={{ color: '#728C74', fontSize: 13, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 12 }}>
                Proxima semana
              </Text>
              <View style={{ flexDirection: 'row', gap: 5 }}>
                {upcomingDays.map((day, i) => {
                  const hasTask = day.count > 0
                  const isWeekend = day.date.getDay() === 0 || day.date.getDay() === 6
                  return (
                    <TouchableOpacity key={i} onPress={() => router.push('/(tabs)/tasks')} style={{ flex: 1 }} activeOpacity={0.8}>
                      {hasTask ? (
                        <LinearGradient
                          colors={['#112016', '#090F0A']}
                          style={{ borderRadius: 14, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: '#1E3A22' }}
                        >
                          <Text style={{ color: '#4A7A50', fontSize: 11, fontWeight: '800', textTransform: 'uppercase' }}>
                            {format(day.date, 'EEE', { locale: es }).slice(0, 2)}
                          </Text>
                          <Text style={{ color: '#E8F5EA', fontSize: 16, fontWeight: '900', marginTop: 3 }}>{format(day.date, 'd')}</Text>
                          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#52CC64', marginTop: 5 }} />
                          <Text style={{ color: '#52CC64', fontSize: 11, fontWeight: '800', marginTop: 2 }}>{day.count}</Text>
                        </LinearGradient>
                      ) : (
                        <View style={{ borderRadius: 14, paddingVertical: 10, alignItems: 'center', backgroundColor: '#0A1009', borderWidth: 1, borderColor: '#0F1A10' }}>
                          <Text style={{ color: isWeekend ? '#2A4A30' : '#1E2A20', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }}>
                            {format(day.date, 'EEE', { locale: es }).slice(0, 2)}
                          </Text>
                          <Text style={{ color: '#1E2A20', fontSize: 16, fontWeight: '900', marginTop: 3 }}>{format(day.date, 'd')}</Text>
                          <View style={{ height: 6, marginTop: 5 }} />
                          <View style={{ height: 13, marginTop: 2 }} />
                        </View>
                      )}
                    </TouchableOpacity>
                  )
                })}
              </View>
            </View>
          )}

        </View>
      </ScrollView>

      <CompleteTaskSheet visible={!!sheetTask} task={sheetTask} onClose={() => setSheetTask(null)} onComplete={handleComplete} />
    </SafeAreaView>
  )
}

// ─── Helper ───────────────────────────────────────────────────────────────────
function rowToTask(row: Record<string, unknown>): ScheduledTask {
  return {
    id:             row.id as string,
    plantId:        row.plant_id as string,
    type:           row.type as ScheduledTask['type'],
    scheduledDate:  new Date(row.scheduled_date as string),
    cycle:          row.cycle as 'vege' | 'flora',
    week:           row.week as number,
    stage:          row.stage as never,
    products:       (row.products as ScheduledTask['products']) ?? [],
    ecMin:          (row.ec_min as number | null) ?? undefined,
    ecMax:          (row.ec_max as number | null) ?? undefined,
    phMin:          (row.ph_min as number | null) ?? undefined,
    phMax:          (row.ph_max as number | null) ?? undefined,
    completed:      row.completed as boolean,
    completedAt:    row.completed_at ? new Date(row.completed_at as string) : undefined,
    completionNotes: row.completion_notes as string | undefined,
  }
}
