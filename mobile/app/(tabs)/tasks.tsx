import { useState, useEffect, useRef } from 'react'
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Animated, RefreshControl, PanResponder } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import * as Haptics from 'expo-haptics'
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

export default function CalendarScreen() {
  const { user, loading: authLoading } = useAuth()
  const [selected, setSelected] = useState(() => { const d = new Date(); d.setHours(0,0,0,0); return d })
  const [displayMonth, setDisplayMonth] = useState(() => { const d = new Date(); d.setHours(0,0,0,0); return d })
  const [tasks, setTasks] = useState<ScheduledTask[]>([])
  const [plantNames, setPlantNames] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const slideAnim = useRef(new Animated.Value(0)).current
  const fadeAnim = useRef(new Animated.Value(1)).current
  const headerScaleAnim = useRef(new Animated.Value(1)).current
  const celebrationAnim = useRef(new Animated.Value(0)).current

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const start = startOfMonth(displayMonth)
  const daysInMonth = getDaysInMonth(displayMonth)
  const firstDayOfWeek = start.getDay()
  const days = Array.from({ length: daysInMonth }, (_, i) => new Date(displayMonth.getFullYear(), displayMonth.getMonth(), i + 1))

  function animateMonthChange(direction: 'next' | 'prev') {
    const startValue = direction === 'next' ? 1 : -1
    slideAnim.setValue(startValue * 500)
    fadeAnim.setValue(0)
    headerScaleAnim.setValue(0.95)
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 0, duration: 350, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.timing(headerScaleAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
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
    const d = new Date(); d.setHours(0, 0, 0, 0)
    if (d.getMonth() !== displayMonth.getMonth() || d.getFullYear() !== displayMonth.getFullYear()) {
      animateMonthChange('next')
    }
    setDisplayMonth(d)
    setSelected(d)
  }

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) =>
        Math.abs(gs.dx) > 20 && Math.abs(gs.dx) > Math.abs(gs.dy),
      onPanResponderRelease: (_, gs) => {
        if (gs.dx < -50) nextMonth()
        else if (gs.dx > 50) prevMonth()
      },
    })
  ).current

  async function load() {
    if (!user) return
    const monthStart = startOfDay(start)
    const monthEnd = endOfDay(new Date(displayMonth.getFullYear(), displayMonth.getMonth() + 1, 0))
    const [{ data: taskData }, { data: plantData }] = await Promise.all([
      supabase.from('scheduled_tasks').select('*').eq('user_id', user.id)
        .gte('scheduled_date', monthStart.toISOString())
        .lte('scheduled_date', monthEnd.toISOString()),
      supabase.from('plants').select('id, name').eq('user_id', user.id).eq('status', 'active'),
    ])
    const activePlantIds = new Set((plantData ?? []).map(p => p.id))
    setTasks((taskData ?? []).map(rowToTask).filter(t => activePlantIds.has(t.plantId)))
    const nameMap: Record<string, string> = {}
    for (const p of (plantData ?? [])) nameMap[p.id] = p.name
    setPlantNames(nameMap)
    setLoading(false)
  }

  useEffect(() => {
    if (!authLoading && user) load()
  }, [displayMonth, user, authLoading])

  async function onRefresh() {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  const tasksByDate: Record<string, { types: Set<string>; count: number; overdue: boolean }> = {}
  for (const t of tasks) {
    const key = format(t.scheduledDate, 'yyyy-MM-dd')
    if (!tasksByDate[key]) tasksByDate[key] = { types: new Set(), count: 0, overdue: false }
    if (!t.completed) {
      tasksByDate[key].types.add(t.type)
      tasksByDate[key].count += 1
      if (new Date(t.scheduledDate) < today) tasksByDate[key].overdue = true
    }
  }

  function getIndicatorColor(dayKey: string): string {
    const dayData = tasksByDate[dayKey]
    if (!dayData) return 'transparent'
    if (dayData.overdue) return '#EF4444'
    if (new Date(dayKey) <= today) return '#F59E0B'
    return '#10B981'
  }

  const selectedTasks = tasks.filter(t => {
    const d = new Date(t.scheduledDate); d.setHours(0, 0, 0, 0)
    return d.getTime() === selected.getTime()
  })

  function triggerCelebration() {
    celebrationAnim.setValue(0)
    Animated.sequence([
      Animated.timing(celebrationAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(celebrationAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start()
  }

  async function completeTask(taskId: string) {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    await supabase.from('scheduled_tasks').update({ completed: true, completed_at: new Date().toISOString() }).eq('id', taskId)
    setTasks(prev => {
      const updated = prev.map(t => t.id === taskId ? { ...t, completed: true } : t)
      const dayTasks = updated.filter(t => {
        const d = new Date(t.scheduledDate); d.setHours(0,0,0,0)
        return d.getTime() === selected.getTime()
      })
      if (dayTasks.length > 0 && dayTasks.every(t => t.completed)) triggerCelebration()
      return updated
    })
    if (user) {
      void awardXP(user.id, XP_VALUES.COMPLETE_TASK)
      void recordDailyActivity(user.id)
    }
  }

  const celebrationScale = celebrationAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.03, 1] })

  // Day-of-week offset (Sunday=0 -> Monday=0 mapping)
  const mondayOffset = (firstDayOfWeek + 6) % 7

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#080E09' }}>
      <View style={{ flex: 1 }}>

        {/* Calendar header */}
        <Animated.View
          style={{ transform: [{ scale: celebrationScale }] }}
          {...panResponder.panHandlers}
        >
          <LinearGradient
            colors={['#0F1F10', '#080E09']}
            style={{ padding: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#1C2E1E' }}
          >
            {/* Month nav */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <TouchableOpacity
                onPress={prevMonth}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={{ width: 32, height: 32, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' }}
              >
                <Text style={{ color: '#52CC64', fontSize: 16, fontWeight: '700' }}>{'<'}</Text>
              </TouchableOpacity>

              <Animated.Text style={{
                color: '#B8D4BC',
                fontSize: 13,
                fontWeight: '700',
                letterSpacing: 2,
                textTransform: 'uppercase',
                transform: [{ scale: headerScaleAnim }],
                opacity: fadeAnim,
              }}>
                {format(displayMonth, 'MMMM yyyy', { locale: es })}
              </Animated.Text>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TouchableOpacity
                  onPress={goToday}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: 'rgba(82,204,100,0.1)', borderWidth: 1, borderColor: 'rgba(82,204,100,0.2)' }}
                >
                  <Text style={{ color: '#52CC64', fontSize: 11, fontWeight: '700' }}>Hoy</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={nextMonth}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  style={{ width: 32, height: 32, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Text style={{ color: '#52CC64', fontSize: 16, fontWeight: '700' }}>{'>'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Day labels */}
            <View style={{ flexDirection: 'row', marginBottom: 6, justifyContent: 'space-between' }}>
              {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => (
                <Text key={d} style={{ color: '#3A5040', fontSize: 11, fontWeight: '700', width: '14.28%', textAlign: 'center' }}>
                  {d}
                </Text>
              ))}
            </View>

            {/* Day grid */}
            <Animated.View style={{ flexDirection: 'row', flexWrap: 'wrap', opacity: fadeAnim, transform: [{ translateX: slideAnim }] }}>
              {Array.from({ length: mondayOffset }).map((_, i) => (
                <View key={`e-${i}`} style={{ width: '14.28%', height: 60 }} />
              ))}
              {days.map(day => {
                const isSelected = selected.getTime() === day.getTime()
                const isToday = today.getTime() === day.getTime()
                const dayKey = format(day, 'yyyy-MM-dd')
                const dayData = tasksByDate[dayKey]
                const taskCount = dayData?.count ?? 0
                const indicatorColor = getIndicatorColor(dayKey)

                return (
                  <TouchableOpacity
                    key={day.getTime()}
                    onPress={() => {
                      void Haptics.selectionAsync()
                      setSelected(day)
                      if (day.getMonth() !== displayMonth.getMonth() || day.getFullYear() !== displayMonth.getFullYear()) {
                        setDisplayMonth(new Date(day.getFullYear(), day.getMonth(), 1))
                      }
                    }}
                    style={{
                      width: '14.28%', height: 60, alignItems: 'center', justifyContent: 'center',
                      borderRadius: 10, marginBottom: 2,
                    }}
                  >
                    {isSelected ? (
                      <LinearGradient
                        colors={['#3DAA50', '#52CC64']}
                        style={{ width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Text style={{ color: '#080E09', fontSize: 13, fontWeight: '900' }}>{day.getDate()}</Text>
                      </LinearGradient>
                    ) : (
                      <View style={{
                        width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
                        borderWidth: isToday ? 1.5 : 0, borderColor: '#52CC64',
                        backgroundColor: isToday ? 'rgba(82,204,100,0.08)' : 'transparent',
                      }}>
                        <Text style={{ color: isToday ? '#52CC64' : '#B8D4BC', fontSize: 13, fontWeight: isToday ? '700' : '400' }}>
                          {day.getDate()}
                        </Text>
                      </View>
                    )}
                    {taskCount > 0 && (
                      <View style={{ marginTop: 1, alignItems: 'center' }}>
                        {taskCount > 3 ? (
                          <Text style={{ color: indicatorColor, fontSize: 9, fontWeight: '800', lineHeight: 10 }}>{taskCount}</Text>
                        ) : (
                          <View style={{ flexDirection: 'row', gap: 2 }}>
                            {[...Array(taskCount)].map((_, i) => (
                              <View key={i} style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: indicatorColor }} />
                            ))}
                          </View>
                        )}
                      </View>
                    )}
                  </TouchableOpacity>
                )
              })}
            </Animated.View>
          </LinearGradient>
        </Animated.View>

        {/* Task list */}
        {loading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color="#52CC64" size="large" />
          </View>
        ) : (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#52CC64" />}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <Text style={{ color: '#B8D4BC', fontSize: 14, fontWeight: '700', textTransform: 'capitalize' }}>
                {format(selected, "EEEE d 'de' MMMM", { locale: es })}
              </Text>
              {selectedTasks.length > 0 && selectedTasks.every(t => t.completed) && (
                <LinearGradient
                  colors={['rgba(82,204,100,0.15)', 'rgba(82,204,100,0.05)']}
                  style={{ borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(82,204,100,0.2)' }}
                >
                  <Text style={{ color: '#52CC64', fontSize: 11, fontWeight: '700' }}>Todo listo ✓</Text>
                </LinearGradient>
              )}
            </View>

            {selectedTasks.length === 0 ? (
              <LinearGradient
                colors={['#131A10', '#0C1009']}
                style={{ borderRadius: 20, borderWidth: 1, borderColor: '#1C2E1E', paddingVertical: 48, alignItems: 'center' }}
              >
                <Text style={{ fontSize: 36, marginBottom: 10 }}>🌤️</Text>
                <Text style={{ color: '#728C74', fontSize: 14 }}>Sin tareas este dia</Text>
              </LinearGradient>
            ) : (
              <View style={{ backgroundColor: '#0E1510', borderRadius: 20, borderWidth: 1, borderColor: '#1C2E1E', overflow: 'hidden' }}>
                {selectedTasks.map((task, i) => (
                  <View key={task.id} style={{
                    flexDirection: 'row', alignItems: 'center',
                    borderTopWidth: i > 0 ? 1 : 0, borderTopColor: '#182018',
                    opacity: task.completed ? 0.35 : 1,
                  }}>
                    {/* Left accent bar */}
                    <View style={{ width: 3, alignSelf: 'stretch', backgroundColor: TYPE_COLOR[task.type] }} />
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 13, paddingHorizontal: 14 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: '#E4F2E7', fontWeight: '700', fontSize: 14 }}>
                          {TYPE_LABEL[task.type] ?? task.type}
                        </Text>
                        <Text style={{ color: '#728C74', fontSize: 11, marginTop: 2 }}>
                          {task.cycle === 'vege' ? `V${task.week}` : `F${task.week}`} · {plantNames[task.plantId] ?? '...'}
                        </Text>
                      </View>
                      {!task.completed && (
                        <TouchableOpacity
                          onPress={() => completeTask(task.id)}
                          style={{ backgroundColor: 'rgba(82,204,100,0.1)', borderWidth: 1, borderColor: 'rgba(82,204,100,0.2)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 7, marginLeft: 10 }}
                        >
                          <Text style={{ color: '#52CC64', fontWeight: '700', fontSize: 12 }}>Hecho</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                ))}
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
    ecMin: undefined,
    ecMax: undefined,
    phMin: undefined,
    phMax: undefined,
    completed: (row.completed as boolean) ?? false,
  }
}
