import { useState, useEffect, useRef, useCallback } from 'react'
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Animated, RefreshControl, PanResponder } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import * as Haptics from 'expo-haptics'
import { router, useFocusEffect } from 'expo-router'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { awardXP, recordDailyActivity, XP_VALUES } from '@/lib/xp'
import { startOfDay, endOfDay, format, getDaysInMonth, startOfMonth } from 'date-fns'
import { es } from 'date-fns/locale'
import type { ScheduledTask } from '@shared/types/plant'

const TYPE_COLOR: Record<string, string> = {
  nutrition: '#22C55E', irrigation: '#3B82F6',
  observation: '#F59E0B', foliar: '#A855F7', harvest: '#EF4444',
}
const TYPE_LABEL: Record<string, string> = {
  nutrition: 'Nutricion', irrigation: 'Riego',
  observation: 'Observacion', foliar: 'Foliar', harvest: 'Cosecha',
}
const TYPE_ICON: Record<string, string> = {
  nutrition: '🧪', irrigation: '💧', observation: '👁', foliar: '🌿', harvest: '✂️',
}

type PlantMeta = { name: string; floraStartDate: Date | null }

export default function CalendarScreen() {
  const { user, loading: authLoading } = useAuth()
  const [selected, setSelected] = useState(() => { const d = new Date(); d.setHours(0,0,0,0); return d })
  const [displayMonth, setDisplayMonth] = useState(() => { const d = new Date(); d.setHours(0,0,0,0); return d })
  const [tasks, setTasks] = useState<ScheduledTask[]>([])
  const [plantMeta, setPlantMeta] = useState<Record<string, PlantMeta>>({})
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const slideAnim = useRef(new Animated.Value(0)).current
  const fadeAnim = useRef(new Animated.Value(1)).current
  const headerScaleAnim = useRef(new Animated.Value(1)).current
  const celebrationAnim = useRef(new Animated.Value(0)).current

  const today = new Date(); today.setHours(0,0,0,0)
  const start = startOfMonth(displayMonth)
  const daysInMonth = getDaysInMonth(displayMonth)
  const firstDayOfWeek = start.getDay()
  const mondayOffset = (firstDayOfWeek + 6) % 7
  const days = Array.from({ length: daysInMonth }, (_, i) =>
    new Date(displayMonth.getFullYear(), displayMonth.getMonth(), i + 1)
  )

  function animateMonthChange(direction: 'next' | 'prev') {
    slideAnim.setValue(direction === 'next' ? 400 : -400)
    fadeAnim.setValue(0)
    headerScaleAnim.setValue(0.95)
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 10, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.spring(headerScaleAnim, { toValue: 1, tension: 80, friction: 10, useNativeDriver: true }),
    ]).start()
  }

  function prevMonth() {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    animateMonthChange('prev')
    setDisplayMonth(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))
  }
  function nextMonth() {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    animateMonthChange('next')
    setDisplayMonth(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))
  }
  function goToday() {
    const d = new Date(); d.setHours(0,0,0,0)
    animateMonthChange('next')
    setDisplayMonth(d)
    setSelected(d)
  }

  const panResponder = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dx) > 20 && Math.abs(gs.dx) > Math.abs(gs.dy),
    onPanResponderRelease: (_, gs) => {
      if (gs.dx < -50) nextMonth()
      else if (gs.dx > 50) prevMonth()
    },
  })).current

  async function load() {
    if (!user) return
    const monthStart = startOfDay(start)
    const monthEnd = endOfDay(new Date(displayMonth.getFullYear(), displayMonth.getMonth() + 1, 0))
    const [{ data: taskData }, { data: plantData }] = await Promise.all([
      supabase.from('scheduled_tasks').select('*').eq('user_id', user.id)
        .gte('scheduled_date', monthStart.toISOString())
        .lte('scheduled_date', monthEnd.toISOString()),
      supabase.from('plants').select('id, name, flora_start_date').eq('user_id', user.id).eq('status', 'active'),
    ])
    const activePlantIds = new Set((plantData ?? []).map(p => p.id))
    setTasks((taskData ?? []).map(rowToTask).filter(t => activePlantIds.has(t.plantId)))
    const meta: Record<string, PlantMeta> = {}
    for (const p of (plantData ?? [])) {
      meta[p.id] = {
        name: p.name,
        floraStartDate: p.flora_start_date ? new Date(p.flora_start_date) : null,
      }
    }
    setPlantMeta(meta)
    setLoading(false)
  }

  // Recargar cuando cambia el mes seleccionado
  useEffect(() => {
    if (!authLoading && user) load()
  }, [displayMonth])

  // Recargar cuando el tab toma foco (tarea completada en otra pantalla, etc.)
  useFocusEffect(useCallback(() => {
    if (!authLoading && user) load()
  }, [user?.id, authLoading]))

  async function onRefresh() { setRefreshing(true); await load(); setRefreshing(false) }

  // Solo mostrar tareas del ciclo activo de cada planta
  const activeCycleTasks = tasks.filter(t => {
    const meta = plantMeta[t.plantId]
    if (!meta) return true
    const plantIsFlora = !!meta.floraStartDate
    return t.cycle === (plantIsFlora ? 'flora' : 'vege')
  })

  // Build per-day task summaries
  const tasksByDate: Record<string, { types: Set<string>; pending: number; done: number; overdue: boolean }> = {}
  for (const t of activeCycleTasks) {
    const key = format(t.scheduledDate, 'yyyy-MM-dd')
    if (!tasksByDate[key]) tasksByDate[key] = { types: new Set(), pending: 0, done: 0, overdue: false }
    if (t.completed) {
      tasksByDate[key].done += 1
    } else {
      tasksByDate[key].types.add(t.type)
      tasksByDate[key].pending += 1
      const d = new Date(t.scheduledDate); d.setHours(0,0,0,0)
      if (d < today) tasksByDate[key].overdue = true
    }
  }

  function getDayAccent(dayKey: string): string {
    const d = tasksByDate[dayKey]
    if (!d || (d.pending === 0 && d.done === 0)) return 'transparent'
    if (d.pending === 0) return '#52CC64'   // all done
    if (d.overdue) return '#EF4444'         // overdue
    const dDate = new Date(dayKey); dDate.setHours(0,0,0,0)
    if (dDate.getTime() === today.getTime()) return '#F59E0B' // today with pending
    return '#3B82F6'                        // future
  }

  const selectedTasks = activeCycleTasks.filter(t => {
    const d = new Date(t.scheduledDate); d.setHours(0,0,0,0)
    return d.getTime() === selected.getTime()
  })
  const pendingSelected = selectedTasks.filter(t => !t.completed)
  const doneSelected = selectedTasks.filter(t => t.completed)
  const allDone = selectedTasks.length > 0 && pendingSelected.length === 0

  function triggerCelebration() {
    celebrationAnim.setValue(0)
    Animated.sequence([
      Animated.spring(celebrationAnim, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
      Animated.timing(celebrationAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start()
  }

  async function completeTask(taskId: string) {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    await supabase.from('scheduled_tasks')
      .update({ completed: true, completed_at: new Date().toISOString() })
      .eq('id', taskId)
    setTasks(prev => {
      const updated = prev.map(t => t.id === taskId ? { ...t, completed: true } : t)
      const dayTasks = updated.filter(t => {
        const d = new Date(t.scheduledDate); d.setHours(0,0,0,0)
        if (d.getTime() !== selected.getTime()) return false
        // Respetar ciclo activo de la planta
        const meta = plantMeta[t.plantId]
        const plantIsFlora = !!meta?.floraStartDate
        return t.cycle === (plantIsFlora ? 'flora' : 'vege')
      })
      if (dayTasks.length > 0 && dayTasks.every(t => t.completed)) triggerCelebration()
      return updated
    })
    if (user) {
      void awardXP(user.id, XP_VALUES.COMPLETE_TASK)
      void recordDailyActivity(user.id)
    }
  }

  const celebrationScale = celebrationAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.025, 1] })
  const isSelectedToday = selected.getTime() === today.getTime()

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#080E09' }}>
      <View style={{ flex: 1 }}>

        {/* ── Calendar ─────────────────────────────────────── */}
        <Animated.View style={{ transform: [{ scale: celebrationScale }] }} {...panResponder.panHandlers}>
          <LinearGradient
            colors={['#0F1F10', '#080E09']}
            style={{ paddingHorizontal: 16, paddingTop: 18, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#1A2E1A' }}
          >
            {/* Month nav */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <TouchableOpacity
                onPress={prevMonth}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' }}
              >
                <Text style={{ color: '#52CC64', fontSize: 16, fontWeight: '700' }}>{'‹'}</Text>
              </TouchableOpacity>

              <Animated.Text style={{
                color: '#E8F5EA', fontSize: 17, fontWeight: '800', letterSpacing: 0.5, textTransform: 'capitalize',
                transform: [{ scale: headerScaleAnim }], opacity: fadeAnim,
              }}>
                {format(displayMonth, 'MMMM yyyy', { locale: es })}
              </Animated.Text>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {!(isSelectedToday && displayMonth.getMonth() === today.getMonth()) && (
                  <TouchableOpacity
                    onPress={goToday}
                    hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
                    style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 9, backgroundColor: 'rgba(82,204,100,0.12)', borderWidth: 1, borderColor: 'rgba(82,204,100,0.25)' }}
                  >
                    <Text style={{ color: '#52CC64', fontSize: 12, fontWeight: '800' }}>Hoy</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={nextMonth}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Text style={{ color: '#52CC64', fontSize: 16, fontWeight: '700' }}>{'›'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Day-of-week labels */}
            <View style={{ flexDirection: 'row', marginBottom: 4 }}>
              {['LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB', 'DOM'].map(d => (
                <Text key={d} style={{ color: '#2D4A30', fontSize: 11, fontWeight: '800', width: '14.28%', textAlign: 'center', letterSpacing: 0.5 }}>
                  {d}
                </Text>
              ))}
            </View>

            {/* Day grid */}
            <Animated.View style={{ flexDirection: 'row', flexWrap: 'wrap', opacity: fadeAnim, transform: [{ translateX: slideAnim }] }}>
              {Array.from({ length: mondayOffset }).map((_, i) => (
                <View key={`e-${i}`} style={{ width: '14.28%', height: 54 }} />
              ))}
              {days.map(day => {
                const isSelected = selected.getTime() === day.getTime()
                const isToday = today.getTime() === day.getTime()
                const dayKey = format(day, 'yyyy-MM-dd')
                const dayData = tasksByDate[dayKey]
                const accentColor = getDayAccent(dayKey)
                const hasTasks = dayData && (dayData.pending + dayData.done) > 0
                const allComplete = hasTasks && dayData!.pending === 0

                return (
                  <TouchableOpacity
                    key={day.getTime()}
                    onPress={() => {
                      void Haptics.selectionAsync()
                      setSelected(day)
                    }}
                    style={{ width: '14.28%', height: 54, alignItems: 'center', paddingTop: 6 }}
                  >
                    {isSelected ? (
                      <LinearGradient
                        colors={isToday ? ['#52CC64', '#3DAA50'] : ['#1A3D20', '#0F2214']}
                        style={{ width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: isToday ? 0 : 1, borderColor: '#52CC64' }}
                      >
                        <Text style={{ color: isToday ? '#080E09' : '#52CC64', fontSize: 15, fontWeight: '900' }}>{day.getDate()}</Text>
                      </LinearGradient>
                    ) : (
                      <View style={{
                        width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
                        borderWidth: isToday ? 1.5 : 0, borderColor: '#52CC64',
                        backgroundColor: isToday ? 'rgba(82,204,100,0.08)' : 'transparent',
                      }}>
                        <Text style={{ color: isToday ? '#52CC64' : day < today ? '#3A5040' : '#B8D4BC', fontSize: 15, fontWeight: isToday ? '800' : '400' }}>
                          {day.getDate()}
                        </Text>
                      </View>
                    )}
                    {/* Dot indicator */}
                    {hasTasks && (
                      <View style={{ marginTop: 2 }}>
                        {allComplete ? (
                          <Text style={{ fontSize: 7, lineHeight: 8 }}>✓</Text>
                        ) : (
                          <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: accentColor }} />
                        )}
                      </View>
                    )}
                  </TouchableOpacity>
                )
              })}
            </Animated.View>
          </LinearGradient>
        </Animated.View>

        {/* ── Task list ────────────────────────────────────── */}
        {loading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color="#52CC64" size="large" />
          </View>
        ) : (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 16, paddingBottom: 110 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#52CC64" />}
          >
            {/* Selected day header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <View>
                <Text style={{ color: '#E8F5EA', fontSize: 20, fontWeight: '900', textTransform: 'capitalize' }}>
                  {format(selected, "EEEE", { locale: es })}
                </Text>
                <Text style={{ color: '#3A5040', fontSize: 13, fontWeight: '600', marginTop: 1 }}>
                  {format(selected, "d 'de' MMMM, yyyy", { locale: es })}
                </Text>
              </View>
              {selectedTasks.length > 0 && (
                allDone ? (
                  <LinearGradient
                    colors={['rgba(82,204,100,0.18)', 'rgba(82,204,100,0.06)']}
                    style={{ borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1, borderColor: 'rgba(82,204,100,0.3)', flexDirection: 'row', alignItems: 'center', gap: 6 }}
                  >
                    <Text style={{ fontSize: 14 }}>🎉</Text>
                    <Text style={{ color: '#52CC64', fontSize: 13, fontWeight: '800' }}>Todo listo</Text>
                  </LinearGradient>
                ) : (
                  <View style={{ backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: '#1C2E1E', alignItems: 'center' }}>
                    <Text style={{ color: '#E4F2E7', fontSize: 18, fontWeight: '900', lineHeight: 20 }}>{pendingSelected.length}</Text>
                    <Text style={{ color: '#3A5040', fontSize: 11, fontWeight: '700' }}>pendiente{pendingSelected.length !== 1 ? 's' : ''}</Text>
                  </View>
                )
              )}
            </View>

            {selectedTasks.length === 0 ? (
              <LinearGradient
                colors={['#0D1A10', '#080E09']}
                style={{ borderRadius: 22, borderWidth: 1, borderColor: '#1A2E1A', paddingVertical: 52, alignItems: 'center', gap: 10 }}
              >
                <Text style={{ fontSize: 40 }}>🌤️</Text>
                <Text style={{ color: '#4A7A50', fontSize: 16, fontWeight: '700' }}>Dia libre</Text>
                <Text style={{ color: '#2D4A30', fontSize: 13, textAlign: 'center', lineHeight: 19 }}>
                  Sin tareas programadas{'\n'}para este dia
                </Text>
              </LinearGradient>
            ) : (
              <View style={{ gap: 8 }}>
                {/* Pending tasks */}
                {pendingSelected.length > 0 && (
                  <View style={{ backgroundColor: '#0E1510', borderRadius: 20, borderWidth: 1, borderColor: '#1C2E1E', overflow: 'hidden' }}>
                    {pendingSelected.map((task, i) => {
                      const meta = plantMeta[task.plantId]
                      const isFlora = !!(meta?.floraStartDate)
                      const accentColor = TYPE_COLOR[task.type] ?? '#728C74'
                      const phaseColor = isFlora ? '#F59E0B' : '#52CC64'
                      return (
                        <View key={task.id} style={{ flexDirection: 'row', alignItems: 'stretch', borderTopWidth: i > 0 ? 1 : 0, borderTopColor: '#182018' }}>
                          {/* Left accent */}
                          <View style={{ width: 3, backgroundColor: accentColor }} />
                          <View style={{ flex: 1, paddingVertical: 14, paddingHorizontal: 14, paddingLeft: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                            {/* Icon */}
                            <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: `${accentColor}18`, borderWidth: 1, borderColor: `${accentColor}30`, alignItems: 'center', justifyContent: 'center' }}>
                              <Text style={{ fontSize: 20 }}>{TYPE_ICON[task.type] ?? '📋'}</Text>
                            </View>
                            {/* Text */}
                            <View style={{ flex: 1, gap: 3 }}>
                              <Text style={{ color: '#E4F2E7', fontSize: 16, fontWeight: '800', lineHeight: 18 }}>
                                {TYPE_LABEL[task.type] ?? task.type}
                              </Text>
                              <TouchableOpacity onPress={() => router.push(`/plants/${task.plantId}`)} activeOpacity={0.7}>
                                <Text style={{ color: phaseColor, fontSize: 14, fontWeight: '700' }} numberOfLines={1}>
                                  {meta?.name ?? '...'}
                                </Text>
                              </TouchableOpacity>
                              <Text style={{ color: '#3A5040', fontSize: 12 }}>
                                {task.cycle === 'vege' ? `V${task.week}` : `F${task.week}`}
                                {task.stage ? ` · ${task.stage}` : ''}
                              </Text>
                            </View>
                            {/* CTA */}
                            <TouchableOpacity onPress={() => completeTask(task.id)} activeOpacity={0.85}>
                              <LinearGradient
                                colors={['rgba(82,204,100,0.18)', 'rgba(82,204,100,0.08)']}
                                style={{ borderRadius: 12, paddingHorizontal: 16, paddingVertical: 9, borderWidth: 1, borderColor: 'rgba(82,204,100,0.3)', alignItems: 'center' }}
                              >
                                <Text style={{ color: '#52CC64', fontWeight: '900', fontSize: 13 }}>Hecho ✓</Text>
                              </LinearGradient>
                            </TouchableOpacity>
                          </View>
                        </View>
                      )
                    })}
                  </View>
                )}

                {/* Completed tasks */}
                {doneSelected.length > 0 && (
                  <View style={{ backgroundColor: '#0A0F0A', borderRadius: 18, borderWidth: 1, borderColor: '#141E14', overflow: 'hidden' }}>
                    <View style={{ paddingHorizontal: 14, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#141E14', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View style={{ width: 3, height: 12, borderRadius: 1.5, backgroundColor: '#52CC64', opacity: 0.4 }} />
                      <Text style={{ color: '#2D5030', fontSize: 13, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' }}>
                        Completadas ({doneSelected.length})
                      </Text>
                    </View>
                    {doneSelected.map((task, i) => {
                      const meta = plantMeta[task.plantId]
                      return (
                        <View key={task.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 11, borderTopWidth: i > 0 ? 1 : 0, borderTopColor: '#141E14', opacity: 0.4 }}>
                          <Text style={{ fontSize: 18 }}>{TYPE_ICON[task.type] ?? '📋'}</Text>
                          <View style={{ flex: 1 }}>
                            <Text style={{ color: '#4A6A50', fontSize: 14, fontWeight: '700', textDecorationLine: 'line-through' }}>
                              {TYPE_LABEL[task.type] ?? task.type}
                            </Text>
                            <Text style={{ color: '#2D4A30', fontSize: 12, marginTop: 1 }}>{meta?.name ?? '...'}</Text>
                          </View>
                          <Text style={{ color: '#2A5030', fontSize: 18 }}>✓</Text>
                        </View>
                      )
                    })}
                  </View>
                )}
              </View>
            )}
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  )
}

function rowToTask(row: Record<string, unknown>): ScheduledTask {
  return {
    id: row.id as string,
    plantId: row.plant_id as string,
    type: row.type as ScheduledTask['type'],
    scheduledDate: new Date(row.scheduled_date as string),
    cycle: row.cycle as ScheduledTask['cycle'],
    week: row.week as number,
    stage: (row.stage as ScheduledTask['stage']) ?? 'rooting',
    products: [],
    ecMin: undefined, ecMax: undefined, phMin: undefined, phMax: undefined,
    completed: (row.completed as boolean) ?? false,
  }
}
