import { useEffect, useRef, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import { differenceInDays, format, addDays, startOfWeek } from 'date-fns'
import { es } from 'date-fns/locale'
import { supabase } from '@/lib/supabase'
import type { Plant, ScheduledTask } from '@shared/types/plant'

// ─── helpers ────────────────────────────────────────────────────────────────

function rowToPlant(row: Record<string, unknown>): Plant {
  return {
    id:               row.id as string,
    name:             row.name as string,
    genetics:         row.genetics as string,
    geneticType:      row.genetic_type as Plant['geneticType'],
    sex:              (row.sex as Plant['sex']) ?? 'unknown',
    startDate:        new Date(row.start_date as string),
    floraStartDate:   row.flora_start_date ? new Date(row.flora_start_date as string) : undefined,
    autoFlowerTotalDays: (row.auto_flower_total_days as number) ?? undefined,
    location:         (row.location as Plant['location']) ?? 'indoor',
    potCount:         (row.pot_count as number) ?? 1,
    potVolumeLiters:  (row.pot_volume_liters as number) ?? 11,
    nutritionTableId: (row.nutrition_table_id as string) ?? 'revegetar',
    availableProducts: (row.available_products as string[]) ?? [],
    status:           (row.status as Plant['status']) ?? 'active',
    notes:            (row.notes as string) ?? '',
  }
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
    ecMin:         row.ec_min as number | undefined,
    ecMax:         row.ec_max as number | undefined,
    phMin:         row.ph_min as number | undefined,
    phMax:         row.ph_max as number | undefined,
    completed:     (row.completed as boolean) ?? false,
  }
}

// Task type dot colors
const TASK_DOT: Record<string, string> = {
  nutrition:   '#22C55E',
  irrigation:  '#3B82F6',
  foliar:      '#A855F7',
  observation: '#F59E0B',
  harvest:     '#EF4444',
}

interface WeekEntry {
  key: string          // e.g. "vege-1", "flora-3"
  cycle: 'vege' | 'flora'
  week: number
  weekStart: Date      // Monday of that calendar week
  weekEnd: Date        // Sunday
  isCurrent: boolean
  isPast: boolean
}

// ─── main component ──────────────────────────────────────────────────────────

export default function TimelineScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [plant, setPlant]   = useState<Plant | null>(null)
  const [tasks, setTasks]   = useState<ScheduledTask[]>([])
  const [loading, setLoading] = useState(true)
  const scrollRef = useRef<ScrollView>(null)

  useEffect(() => {
    async function load() {
      const [{ data: p }, { data: t }] = await Promise.all([
        supabase.from('plants').select('*').eq('id', id).maybeSingle(),
        supabase.from('scheduled_tasks').select('*').eq('plant_id', id).order('scheduled_date'),
      ])
      if (p) setPlant(rowToPlant(p))
      setTasks((t ?? []).map(rowToTask))
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0C1410', alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color="#52CC64" size="large" />
    </SafeAreaView>
  )

  if (!plant) return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0C1410', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#728C74' }}>Planta no encontrada</Text>
    </SafeAreaView>
  )

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const isFlora = !!plant.floraStartDate

  // ── build task map: weekKey -> task types present ─────────────────────────
  const taskMap = new Map<string, Set<string>>()
  for (const t of tasks) {
    const key = `${t.cycle}-${t.week}`
    if (!taskMap.has(key)) taskMap.set(key, new Set())
    taskMap.get(key)!.add(t.type)
  }

  // ── determine vege week count ─────────────────────────────────────────────
  const vegeWeeks = plant.floraStartDate
    ? Math.max(1, Math.ceil(differenceInDays(plant.floraStartDate, plant.startDate) / 7))
    : Math.max(1, Math.ceil(differenceInDays(today, plant.startDate) / 7) + 1)

  // flora week count: from floraStartDate tasks or default 8
  let floraWeeks = 0
  if (plant.floraStartDate) {
    const floraTaskWeeks = tasks
      .filter(t => t.cycle === 'flora')
      .map(t => t.week)
    floraWeeks = floraTaskWeeks.length > 0 ? Math.max(...floraTaskWeeks) : 8
  }

  // ── current week detection ────────────────────────────────────────────────
  let currentCycle: 'vege' | 'flora' = 'vege'
  let currentWeekNum = 1

  if (plant.floraStartDate && today >= plant.floraStartDate) {
    currentCycle = 'flora'
    currentWeekNum = Math.ceil(differenceInDays(today, plant.floraStartDate) / 7) + 1
  } else {
    currentCycle = 'vege'
    currentWeekNum = Math.ceil(differenceInDays(today, plant.startDate) / 7) + 1
  }

  // ── build week entries ────────────────────────────────────────────────────
  const entries: WeekEntry[] = []

  for (let w = 1; w <= vegeWeeks; w++) {
    // weekStart = Monday of the calendar week that starts at startDate + (w-1)*7
    const weekAnchor = addDays(plant.startDate, (w - 1) * 7)
    const weekStart  = startOfWeek(weekAnchor, { weekStartsOn: 1 })
    const weekEnd    = addDays(weekStart, 6)
    const isCurrent  = currentCycle === 'vege' && currentWeekNum === w
    const isPast     = weekEnd < today && !isCurrent
    entries.push({ key: `vege-${w}`, cycle: 'vege', week: w, weekStart, weekEnd, isCurrent, isPast })
  }

  if (plant.floraStartDate) {
    for (let w = 1; w <= floraWeeks; w++) {
      const weekAnchor = addDays(plant.floraStartDate, (w - 1) * 7)
      const weekStart  = startOfWeek(weekAnchor, { weekStartsOn: 1 })
      const weekEnd    = addDays(weekStart, 6)
      const isCurrent  = currentCycle === 'flora' && currentWeekNum === w
      const isPast     = weekEnd < today && !isCurrent
      entries.push({ key: `flora-${w}`, cycle: 'flora', week: w, weekStart, weekEnd, isCurrent, isPast })
    }
  }

  // ── scroll to current week after mount ───────────────────────────────────
  const currentIndex = entries.findIndex(e => e.isCurrent)
  // Each card is width 72 + gap 10 = 82px; scroll to center it
  const scrollToX = currentIndex > 0 ? Math.max(0, currentIndex * 82 - 80) : 0

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0C1410' }}>

      {/* Header */}
      <View style={{ backgroundColor: '#1A3D1E', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={{ color: '#52CC64', fontSize: 28 }}>←</Text>
          </TouchableOpacity>
          <View style={{
            backgroundColor: isFlora ? '#2D1547' : '#0D2010',
            borderRadius: 10,
            paddingHorizontal: 10,
            paddingVertical: 4,
          }}>
            <Text style={{ color: isFlora ? '#A855F7' : '#52CC64', fontSize: 11, fontWeight: '800' }}>
              {isFlora ? 'FLORA' : 'VEGE'}
            </Text>
          </View>
        </View>
        <Text style={{ color: '#E4F2E7', fontSize: 22, fontWeight: '900' }}>Linea de tiempo</Text>
        <Text style={{ color: '#6DC278', fontSize: 13, marginTop: 2 }}>{plant.name}</Text>
      </View>

      {/* Phase labels bar */}
      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 14 }}>
        <View style={{
          backgroundColor: !isFlora ? '#1A3D1E' : '#131D14',
          borderRadius: 20,
          paddingHorizontal: 14,
          paddingVertical: 7,
          borderWidth: 1,
          borderColor: !isFlora ? '#52CC64' : '#1C2E1E',
        }}>
          <Text style={{ color: !isFlora ? '#52CC64' : '#728C74', fontSize: 12, fontWeight: '700' }}>
            VEGETACION  {vegeWeeks}sem
          </Text>
        </View>
        {plant.floraStartDate && (
          <View style={{
            backgroundColor: isFlora ? '#2D1547' : '#131D14',
            borderRadius: 20,
            paddingHorizontal: 14,
            paddingVertical: 7,
            borderWidth: 1,
            borderColor: isFlora ? '#A855F7' : '#1C2E1E',
          }}>
            <Text style={{ color: isFlora ? '#A855F7' : '#728C74', fontSize: 12, fontWeight: '700' }}>
              FLORACION  {floraWeeks}sem
            </Text>
          </View>
        )}
      </View>

      {/* Horizontal timeline */}
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, gap: 10, flexDirection: 'row', alignItems: 'center' }}
        onLayout={() => {
          if (scrollToX > 0) scrollRef.current?.scrollTo({ x: scrollToX, animated: false })
        }}
      >
        {entries.map(entry => {
          const types = taskMap.get(entry.key)
          const dots = types ? Array.from(types) : []
          const label = entry.cycle === 'vege' ? `V${entry.week}` : `F${entry.week}`

          return (
            <View
              key={entry.key}
              style={{
                width: 72,
                height: entry.isCurrent ? 192 : 180,
                borderRadius: 12,
                backgroundColor: '#131D14',
                borderWidth: entry.isCurrent ? 2 : 1,
                borderColor: entry.isCurrent
                  ? '#52CC64'
                  : entry.cycle === 'flora' ? '#2D1547' : '#1C2E1E',
                opacity: entry.isPast ? 0.5 : 1,
                padding: 10,
                alignItems: 'center',
                justifyContent: 'space-between',
                // green glow shadow for current week
                ...(entry.isCurrent ? {
                  shadowColor: '#52CC64',
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.45,
                  shadowRadius: 8,
                  elevation: 8,
                } : {}),
              }}
            >
              {/* Week label */}
              <View style={{ alignItems: 'center' }}>
                <Text style={{
                  color: entry.isCurrent
                    ? '#52CC64'
                    : entry.cycle === 'flora' ? '#A855F7' : '#E4F2E7',
                  fontSize: entry.isCurrent ? 16 : 14,
                  fontWeight: '900',
                  letterSpacing: 0.5,
                }}>
                  {label}
                </Text>

                {/* Date range */}
                <Text style={{ color: '#728C74', fontSize: 9, marginTop: 4, textAlign: 'center' }}>
                  {format(entry.weekStart, 'd MMM', { locale: es })}
                </Text>
                <Text style={{ color: '#3A5040', fontSize: 9 }}>
                  {format(entry.weekEnd, 'd MMM', { locale: es })}
                </Text>
              </View>

              {/* Divider */}
              <View style={{ width: '80%', height: 1, backgroundColor: '#1C2E1E' }} />

              {/* Task dots */}
              <View style={{ flexWrap: 'wrap', flexDirection: 'row', justifyContent: 'center', gap: 5, minHeight: 40 }}>
                {dots.length === 0 ? (
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#1C2E1E' }} />
                ) : (
                  dots.map(type => (
                    <View
                      key={type}
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 5,
                        backgroundColor: TASK_DOT[type] ?? '#728C74',
                      }}
                    />
                  ))
                )}
              </View>

              {/* Current indicator */}
              {entry.isCurrent && (
                <View style={{
                  backgroundColor: '#52CC64',
                  borderRadius: 6,
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                }}>
                  <Text style={{ color: '#0C1410', fontSize: 8, fontWeight: '900' }}>HOY</Text>
                </View>
              )}
            </View>
          )
        })}
      </ScrollView>

      {/* Dot legend */}
      <View style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 16,
      }}>
        {Object.entries(TASK_DOT).map(([type, color]) => (
          <View key={type} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
            <Text style={{ color: '#728C74', fontSize: 11, textTransform: 'capitalize' }}>{type}</Text>
          </View>
        ))}
      </View>

    </SafeAreaView>
  )
}
