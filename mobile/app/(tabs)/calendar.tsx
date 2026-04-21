import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { startOfDay, endOfDay, format, getDaysInMonth, startOfMonth } from 'date-fns'
import { es } from 'date-fns/locale'
import type { ScheduledTask } from '@shared/types/plant'

const TYPE_COLOR: Record<string, string> = {
  nutrition: '#22C55E', irrigation: '#3B82F6',
  observation: '#F59E0B', foliar: '#A855F7', harvest: '#EF4444',
}

export default function CalendarScreen() {
  const { user } = useAuth()
  const [selected, setSelected] = useState(() => { const d = new Date(); d.setHours(0,0,0,0); return d })
  const [tasks, setTasks] = useState<ScheduledTask[]>([])
  const [loading, setLoading] = useState(true)

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const start = startOfMonth(selected)
  const daysInMonth = getDaysInMonth(selected)
  const firstDayOfWeek = start.getDay()
  const days = Array.from({ length: daysInMonth }, (_, i) => new Date(selected.getFullYear(), selected.getMonth(), i + 1))

  useEffect(() => {
    async function load() {
      if (!user) return
      const monthStart = startOfDay(start)
      const monthEnd = endOfDay(new Date(selected.getFullYear(), selected.getMonth() + 1, 0))
      const { data } = await supabase
        .from('scheduled_tasks')
        .select('*')
        .eq('user_id', user.id)
        .gte('scheduled_date', monthStart.toISOString())
        .lte('scheduled_date', monthEnd.toISOString())
      setTasks((data ?? []).map(rowToTask))
      setLoading(false)
    }
    load()
  }, [selected, user])

  const selectedTasks = tasks.filter(t => {
    const d = new Date(t.scheduledDate)
    d.setHours(0, 0, 0, 0)
    return d.getTime() === selected.getTime()
  })

  const getTasksForDay = (day: Date) => tasks.filter(t => {
    const d = new Date(t.scheduledDate)
    d.setHours(0, 0, 0, 0)
    return d.getTime() === day.getTime()
  })

  async function completeTask(taskId: string) {
    await supabase
      .from('scheduled_tasks')
      .update({ completed: true, completed_at: new Date().toISOString() })
      .eq('id', taskId)
    setTasks(ts => ts.map(t => t.id === taskId ? { ...t, completed: true } : t))
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0C1410' }}>
      <View style={{ flex: 1, flexDirection: 'column' }}>
        <View style={{ backgroundColor: '#1A3D1E', padding: 16, borderBottomWidth: 1, borderBottomColor: '#1C2E1E' }}>
          <Text style={{ color: '#728C74', fontSize: 11, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12 }}>
            {format(selected, 'MMMM yyyy', { locale: es })}
          </Text>
          <View style={{ flexDirection: 'row', marginBottom: 8, justifyContent: 'space-between' }}>
            {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => (
              <Text key={d} style={{ color: '#728C74', fontSize: 11, fontWeight: '700', width: '14.28%', textAlign: 'center' }}>
                {d}
              </Text>
            ))}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <View key={`empty-${i}`} style={{ width: '14.28%', height: 50 }} />
            ))}
            {days.map(day => {
              const dayTasks = getTasksForDay(day)
              const isSelected = selected.getTime() === day.getTime()
              const isToday = today.getTime() === day.getTime()
              return (
                <TouchableOpacity
                  key={day.getTime()}
                  onPress={() => setSelected(day)}
                  style={{
                    width: '14.28%', height: 50, alignItems: 'center', justifyContent: 'center',
                    backgroundColor: isSelected ? '#52CC64' : isToday ? '#1C2E1E' : 'transparent',
                    borderRadius: 8, marginBottom: 4,
                  }}
                >
                  <Text style={{ color: isSelected ? '#0C1410' : '#E4F2E7', fontSize: 12, fontWeight: '600' }}>
                    {day.getDate()}
                  </Text>
                  {dayTasks.length > 0 && (
                    <View style={{ flexDirection: 'row', gap: 2, marginTop: 2 }}>
                      {dayTasks.slice(0, 3).map(t => (
                        <View key={t.id} style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: TYPE_COLOR[t.type] }} />
                      ))}
                    </View>
                  )}
                </TouchableOpacity>
              )
            })}
          </View>
        </View>

        {loading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color="#52CC64" size="large" />
          </View>
        ) : (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
            <Text style={{ color: '#728C74', fontSize: 11, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 }}>
              {format(selected, 'd MMMM', { locale: es })}
            </Text>
            {selectedTasks.length === 0 ? (
              <Text style={{ color: '#728C74', textAlign: 'center', paddingVertical: 20 }}>Sin tareas</Text>
            ) : (
              <View style={{ backgroundColor: '#131D14', borderRadius: 20, borderWidth: 1, borderColor: '#1C2E1E', overflow: 'hidden' }}>
                {selectedTasks.map((task, i) => (
                  <View key={task.id} style={{
                    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                    paddingHorizontal: 14, paddingVertical: 12,
                    borderTopWidth: i > 0 ? 1 : 0, borderTopColor: '#1C2E1E',
                    opacity: task.completed ? 0.4 : 1,
                  }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: TYPE_COLOR[task.type] }} />
                      <View>
                        <Text style={{ color: '#E4F2E7', fontWeight: '700', fontSize: 14 }}>
                          {task.type === 'nutrition' ? 'Nutrición' : task.type === 'irrigation' ? 'Riego' : 'Tarea'}
                        </Text>
                        <Text style={{ color: '#728C74', fontSize: 11, marginTop: 1 }}>
                          V{task.week} · {task.stage}
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
