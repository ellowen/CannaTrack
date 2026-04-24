import { useState, useEffect, useRef, useMemo } from 'react'
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Animated, RefreshControl, PanResponder, Dimensions } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { awardXP, recordDailyActivity, XP_VALUES } from '@/lib/xp'
import { startOfDay, endOfDay, format, getDaysInMonth, startOfMonth } from 'date-fns'
import { es } from 'date-fns/locale'
import type { ScheduledTask } from '@shared/types/plant'

const { width } = Dimensions.get('window')

const TYPE_COLOR: Record<string, string> = {
  nutrition: '#22C55E', irrigation: '#3B82F6',
  observation: '#F59E0B', foliar: '#A855F7', harvest: '#EF4444',
}

export default function CalendarScreen() {
  const { user } = useAuth()
  const [selected, setSelected] = useState(() => { const d = new Date(); d.setHours(0,0,0,0); return d })
  const [displayMonth, setDisplayMonth] = useState(() => { const d = new Date(); d.setHours(0,0,0,0); return d })
  const [tasks, setTasks] = useState<ScheduledTask[]>([])
  const [plantNames, setPlantNames] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Animation state
  const slideAnim = useRef(new Animated.Value(0)).current
  const fadeAnim = useRef(new Animated.Value(1)).current
  const headerScaleAnim = useRef(new Animated.Value(1)).current
  const swipeAnimRef = useRef<Record<string, Animated.Value>>({})

  function getSwipeAnim(taskId: string): Animated.Value {
    if (!swipeAnimRef.current[taskId]) {
      swipeAnimRef.current[taskId] = new Animated.Value(0)
    }
    return swipeAnimRef.current[taskId]
  }

  function handleSwipeComplete(taskId: string) {
    completeTask(taskId)
    const anim = getSwipeAnim(taskId)
    Animated.timing(anim, {
      toValue: width,
      duration: 200,
      useNativeDriver: false,
    }).start()
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const start = startOfMonth(displayMonth)
  const daysInMonth = getDaysInMonth(displayMonth)
  const firstDayOfWeek = start.getDay()
  const days = useMemo(() =>
    Array.from({ length: daysInMonth }, (_, i) =>
      new Date(displayMonth.getFullYear(), displayMonth.getMonth(), i + 1)
    ),
    [daysInMonth, displayMonth]
  )

  function animateMonthChange(direction: 'next' | 'prev') {
    const startValue = direction === 'next' ? 1 : -1
    slideAnim.setValue(startValue * 500)
    fadeAnim.setValue(0)
    headerScaleAnim.setValue(0.95)

    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.timing(headerScaleAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
    ]).start()
  }

  function prevMonth() {
    animateMonthChange('prev')
    setDisplayMonth(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))
  }

  function nextMonth() {
    animateMonthChange('next')
    setDisplayMonth(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))
  }

  function goToday() {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    if (d.getMonth() !== displayMonth.getMonth() || d.getFullYear() !== displayMonth.getFullYear()) {
      animateMonthChange('next')
    }
    setDisplayMonth(d)
    setSelected(d)
  }

  async function load() {
    if (!user) return
    const monthStart = startOfDay(start)
    const monthEnd = endOfDay(new Date(displayMonth.getFullYear(), displayMonth.getMonth() + 1, 0))
    const [{ data: taskData }, { data: plantData }] = await Promise.all([
      supabase
        .from('scheduled_tasks')
        .select('*')
        .eq('user_id', user.id)
        .gte('scheduled_date', monthStart.toISOString())
        .lte('scheduled_date', monthEnd.toISOString()),
      supabase.from('plants').select('id, name').eq('user_id', user.id),
    ])
    setTasks((taskData ?? []).map(rowToTask))
    const nameMap: Record<string, string> = {}
    for (const p of (plantData ?? [])) nameMap[p.id] = p.name
    setPlantNames(nameMap)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [displayMonth, user])

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
      // Mark as overdue if task is in the past and not completed
      if (new Date(t.scheduledDate) < today && !t.completed) {
        tasksByDate[key].overdue = true
      }
    }
  }

  function getTaskIndicatorColor(dayKey: string): string {
    const dayData = tasksByDate[dayKey]
    if (!dayData) return 'transparent'
    if (dayData.overdue) return '#EF4444' // red for overdue
    if (new Date(dayKey) <= today) return '#F59E0B' // amber for today/past incomplete
    return '#10B981' // emerald for future tasks
  }

  const selectedTasks = tasks.filter(t => {
    const d = new Date(t.scheduledDate)
    d.setHours(0, 0, 0, 0)
    return d.getTime() === selected.getTime()
  })

  async function completeTask(taskId: string) {
    await supabase
      .from('scheduled_tasks')
      .update({ completed: true, completed_at: new Date().toISOString() })
      .eq('id', taskId)
    setTasks(ts => ts.map(t => t.id === taskId ? { ...t, completed: true } : t))
    if (user) {
      void awardXP(user.id, XP_VALUES.COMPLETE_TASK)
      void recordDailyActivity(user.id)
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0C1410' }}>
      <View style={{ flex: 1, flexDirection: 'column' }}>
        <View style={{ backgroundColor: '#1A3D1E', padding: 16, borderBottomWidth: 1, borderBottomColor: '#1C2E1E' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <TouchableOpacity onPress={prevMonth} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={{ color: '#52CC64', fontSize: 18, fontWeight: '700' }}>{'<'}</Text>
            </TouchableOpacity>
            <Animated.Text style={{
              color: '#728C74',
              fontSize: 11,
              fontWeight: '700',
              letterSpacing: 1.5,
              textTransform: 'uppercase',
              transform: [{ scale: headerScaleAnim }],
              opacity: fadeAnim,
            }}>
              {format(displayMonth, 'MMMM yyyy', { locale: es })}
            </Animated.Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <TouchableOpacity onPress={nextMonth} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={{ color: '#52CC64', fontSize: 18, fontWeight: '700' }}>{'>'}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={goToday} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={{ color: '#52CC64', fontSize: 12, fontWeight: '700' }}>Hoy</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={{ flexDirection: 'row', marginBottom: 8, justifyContent: 'space-between' }}>
            {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => (
              <Text key={d} style={{ color: '#728C74', fontSize: 11, fontWeight: '700', width: '14.28%', textAlign: 'center' }}>
                {d}
              </Text>
            ))}
          </View>
          <Animated.View style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            opacity: fadeAnim,
            transform: [{ translateX: slideAnim }],
          }}>
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <View key={`empty-${i}`} style={{ width: '14.28%', height: 62 }} />
            ))}
            {days.map(day => {
              const isSelected = selected.getTime() === day.getTime()
              const isToday = today.getTime() === day.getTime()
              const dayKey = format(day, 'yyyy-MM-dd')
              const dayData = tasksByDate[dayKey]
              const taskCount = dayData?.count ?? 0
              const indicatorColor = getTaskIndicatorColor(dayKey)

              return (
                <TouchableOpacity
                  key={day.getTime()}
                  onPress={() => {
                    setSelected(day)
                    if (day.getMonth() !== displayMonth.getMonth() || day.getFullYear() !== displayMonth.getFullYear()) {
                      setDisplayMonth(new Date(day.getFullYear(), day.getMonth(), 1))
                    }
                  }}
                  style={{
                    width: '14.28%', height: 62, alignItems: 'center', justifyContent: 'center',
                    backgroundColor: isSelected ? '#52CC64' : isToday ? '#1C2E1E' : 'transparent',
                    borderRadius: 8, marginBottom: 4, borderWidth: isToday && !isSelected ? 2 : 0, borderColor: '#52CC64',
                  }}
                >
                  <Text style={{ color: isSelected ? '#0C1410' : '#E4F2E7', fontSize: 12, fontWeight: '600' }}>
                    {day.getDate()}
                  </Text>
                  {taskCount > 0 && (
                    <View style={{ marginTop: 4, alignItems: 'center' }}>
                      {taskCount > 3 ? (
                        <Text style={{ color: indicatorColor, fontSize: 10, fontWeight: '700' }}>
                          {taskCount}
                        </Text>
                      ) : (
                        <View style={{ flexDirection: 'row', gap: 2 }}>
                          {[...Array(taskCount)].map((_, i) => (
                            <View key={i} style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: indicatorColor }} />
                          ))}
                        </View>
                      )}
                    </View>
                  )}
                </TouchableOpacity>
              )
            })}
          </Animated.View>
        </View>

        {loading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color="#52CC64" size="large" />
          </View>
        ) : (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 100 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#52CC64" />}>
            <Text style={{ color: '#728C74', fontSize: 11, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 }}>
              {format(selected, 'd MMMM', { locale: es })}
            </Text>
            {selectedTasks.length === 0 ? (
              <Text style={{ color: '#728C74', textAlign: 'center', paddingVertical: 20 }}>Sin tareas</Text>
            ) : (
              <View style={{ backgroundColor: '#131D14', borderRadius: 20, borderWidth: 1, borderColor: '#1C2E1E', overflow: 'hidden' }}>
                {selectedTasks.map((task, i) => {
                  const swipeAnim = getSwipeAnim(task.id)
                  const translateX = swipeAnim.interpolate({
                    inputRange: [0, width],
                    outputRange: [0, width],
                    extrapolate: 'clamp',
                  })
                  return (
                    <View key={task.id} style={{
                      flexDirection: 'row', alignItems: 'center',
                      borderTopWidth: i > 0 ? 1 : 0, borderTopColor: '#1C2E1E',
                      overflow: 'hidden',
                    }}>
                      {/* Swipe background (complete action) */}
                      <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: '#0D2010', justifyContent: 'center', alignItems: 'flex-end', paddingRight: 14 }}>
                        <Text style={{ color: '#52CC64', fontWeight: '700', fontSize: 12 }}>✓ Hecho</Text>
                      </View>

                      {/* Swipeable task item */}
                      <Animated.View style={{ transform: [{ translateX }], flex: 1 }}>
                        <TouchableOpacity
                          onLongPress={() => handleSwipeComplete(task.id)}
                          style={{
                            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                            paddingHorizontal: 14, paddingVertical: 12,
                            backgroundColor: '#131D14',
                            opacity: task.completed ? 0.4 : 1,
                          }}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: TYPE_COLOR[task.type] }} />
                            <View>
                              <Text style={{ color: '#E4F2E7', fontWeight: '700', fontSize: 14 }}>
                                {task.type === 'nutrition' ? 'Nutricion' : task.type === 'irrigation' ? 'Riego' : task.type === 'foliar' ? 'Foliar' : task.type === 'harvest' ? 'Cosecha' : 'Observacion'}
                              </Text>
                              <Text style={{ color: '#728C74', fontSize: 11, marginTop: 1 }}>
                                {task.cycle === 'vege' ? `V${task.week}` : `F${task.week}`} · {plantNames[task.plantId] ?? '...'}
                              </Text>
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
                        </TouchableOpacity>
                      </Animated.View>
                    </View>
                  )
                })}
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
