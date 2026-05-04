import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Image } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { BackIcon } from '@/components/icons/AppIcons'
import { router, useLocalSearchParams } from 'expo-router'
import { format, differenceInDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

// ─── Types ───────────────────────────────────────────────────────────────────

type EventKind = 'task' | 'measurement' | 'diary' | 'phase' | 'start'

interface TLEvent {
  id: string
  kind: EventKind
  date: Date
  taskType?: string
  taskWeek?: number
  taskCycle?: 'vege' | 'flora'
  taskStage?: string
  ec?: number | null
  ph?: number | null
  measureNotes?: string | null
  diaryNotes?: string | null
  photoUrl?: string | null
  weekLabel?: string
}

const TASK_ICON: Record<string, string> = {
  nutrition: '🧪', irrigation: '💧', observation: '👁', foliar: '🌿', harvest: '✂️',
}
const TASK_LABEL: Record<string, string> = {
  nutrition: 'Nutricion', irrigation: 'Riego', observation: 'Observacion', foliar: 'Foliar', harvest: 'Cosecha',
}
const TASK_COLOR: Record<string, string> = {
  nutrition: '#22C55E', irrigation: '#3B82F6', observation: '#F59E0B', foliar: '#A855F7', harvest: '#EF4444',
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function TimelineScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { user } = useAuth()

  const [events, setEvents]               = useState<TLEvent[]>([])
  const [plantName, setPlantName]         = useState('')
  const [plantStart, setPlantStart]       = useState<Date | null>(null)
  const [floraStart, setFloraStart]       = useState<Date | null>(null)
  const [loading, setLoading]             = useState(true)
  const [filter, setFilter]               = useState<EventKind | 'all'>('all')

  useEffect(() => {
    if (!id || !user) return
    async function load() {
      const [
        { data: plant },
        { data: doneTasks },
        { data: measures },
        { data: logs },
      ] = await Promise.all([
        supabase.from('plants').select('name, start_date, flora_start_date').eq('id', id).maybeSingle(),
        supabase.from('scheduled_tasks').select('*').eq('plant_id', id).eq('completed', true).not('completed_at', 'is', null),
        supabase.from('measurements').select('*').eq('plant_id', id).order('created_at', { ascending: false }),
        supabase.from('week_logs').select('*').eq('plant_id', id).order('log_date', { ascending: false }),
      ])

      const pStart = plant?.start_date ? new Date(plant.start_date as string) : null
      const fStart = plant?.flora_start_date ? new Date(plant.flora_start_date as string) : null
      setPlantName((plant?.name as string) ?? '')
      setPlantStart(pStart)
      setFloraStart(fStart)

      const all: TLEvent[] = []

      if (pStart) all.push({ id: 'start', kind: 'start', date: pStart })
      if (fStart) all.push({ id: 'flora', kind: 'phase', date: fStart })

      for (const t of doneTasks ?? []) {
        all.push({
          id: `t-${t.id}`, kind: 'task',
          date: new Date(t.completed_at as string),
          taskType: t.type as string,
          taskWeek: t.week as number,
          taskCycle: t.cycle as 'vege' | 'flora',
          taskStage: t.stage as string,
        })
      }

      for (const m of measures ?? []) {
        all.push({
          id: `m-${m.id}`, kind: 'measurement',
          date: new Date(m.created_at as string),
          ec: m.ec as number | null,
          ph: m.ph as number | null,
          measureNotes: m.notes as string | null,
        })
      }

      for (const d of logs ?? []) {
        all.push({
          id: `d-${d.id}`, kind: 'diary',
          date: new Date((d.log_date ?? d.created_at) as string),
          diaryNotes: d.notes as string | null,
          photoUrl: d.photo_url as string | null,
          weekLabel: d.week_label as string,
        })
      }

      all.sort((a, b) => b.date.getTime() - a.date.getTime())
      setEvents(all)
      setLoading(false)
    }
    load()
  }, [id, user])

  function weekCtx(date: Date): string {
    if (!plantStart) return ''
    if (floraStart && date >= floraStart) {
      const d = differenceInDays(date, floraStart)
      return `F${Math.max(1, Math.ceil((d + 1) / 7))}`
    }
    const d = differenceInDays(date, plantStart)
    return `V${Math.max(1, Math.ceil((d + 1) / 7))}`
  }

  const filtered = filter === 'all' ? events : events.filter(e => e.kind === filter)

  // Group by date label
  const grouped: { label: string; items: TLEvent[] }[] = []
  for (const e of filtered) {
    const lbl = format(e.date, "EEEE d 'de' MMMM", { locale: es })
    const last = grouped[grouped.length - 1]
    if (last && last.label === lbl) last.items.push(e)
    else grouped.push({ label: lbl, items: [e] })
  }

  const FILTERS: { key: EventKind | 'all'; label: string; icon: string }[] = [
    { key: 'all',         label: 'Todo',     icon: '⚡' },
    { key: 'task',        label: 'Tareas',   icon: '✅' },
    { key: 'measurement', label: 'Medidas',  icon: '🧪' },
    { key: 'diary',       label: 'Diario',   icon: '📸' },
    { key: 'phase',       label: 'Fases',    icon: '🌸' },
  ]

  const totalDays = plantStart ? differenceInDays(new Date(), plantStart) : 0

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#080E09' }}>

      {/* Header */}
      <LinearGradient
        colors={['#0F1F10', '#080E09']}
        style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#1A2E1A' }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <TouchableOpacity
            onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
            style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' }}
          >
            <BackIcon size={20} color="#52CC64" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#E4F2E7', fontSize: 20, fontWeight: '900' }}>Timeline</Text>
            <Text style={{ color: '#3A5040', fontSize: 13, marginTop: 1 }} numberOfLines={1}>{plantName}</Text>
          </View>
          <View style={{ backgroundColor: 'rgba(82,204,100,0.1)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: 'rgba(82,204,100,0.2)', alignItems: 'center' }}>
            <Text style={{ color: '#52CC64', fontSize: 16, fontWeight: '900', lineHeight: 18 }}>{totalDays}</Text>
            <Text style={{ color: '#2D5030', fontSize: 11, fontWeight: '700' }}>dias</Text>
          </View>
        </View>

        {/* Filter chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {FILTERS.map(f => {
              const active = filter === f.key
              return (
                <TouchableOpacity key={f.key} onPress={() => setFilter(f.key)} activeOpacity={0.8}>
                  {active ? (
                    <LinearGradient colors={['#52CC64', '#3DAA50']} style={{ borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                      <Text style={{ fontSize: 13 }}>{f.icon}</Text>
                      <Text style={{ color: '#080E09', fontWeight: '900', fontSize: 13 }}>{f.label}</Text>
                    </LinearGradient>
                  ) : (
                    <View style={{ borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: '#1C2E1E', flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                      <Text style={{ fontSize: 13 }}>{f.icon}</Text>
                      <Text style={{ color: '#728C74', fontWeight: '600', fontSize: 13 }}>{f.label}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              )
            })}
          </View>
        </ScrollView>
      </LinearGradient>

      {/* Body */}
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#52CC64" size="large" />
        </View>
      ) : filtered.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <Text style={{ fontSize: 40 }}>📭</Text>
          <Text style={{ color: '#4A7A50', fontSize: 16, fontWeight: '700' }}>Sin registros</Text>
          <Text style={{ color: '#2D4A30', fontSize: 13 }}>No hay eventos de este tipo aun</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 110 }}>
          {grouped.map((group, gi) => (
            <View key={gi} style={{ marginBottom: 28 }}>
              {/* Date divider */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <Text style={{ color: '#3A5040', fontSize: 13, fontWeight: '700', textTransform: 'capitalize' }}>
                  {group.label}
                </Text>
                <View style={{ flex: 1, height: 1, backgroundColor: '#1A2E1A' }} />
              </View>

              {/* Vertical timeline line + cards */}
              <View style={{ paddingLeft: 20 }}>
                {group.items.map((evt, ei) => (
                  <View key={evt.id} style={{ flexDirection: 'row', gap: 12, marginBottom: ei < group.items.length - 1 ? 10 : 0 }}>
                    {/* Timeline dot + line */}
                    <View style={{ alignItems: 'center', width: 14, marginTop: 14 }}>
                      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: dotColor(evt), borderWidth: 2, borderColor: '#080E09' }} />
                      {ei < group.items.length - 1 && (
                        <View style={{ width: 2, flex: 1, backgroundColor: '#1A2E1A', marginTop: 3 }} />
                      )}
                    </View>
                    {/* Card */}
                    <View style={{ flex: 1 }}>
                      <EventCard evt={evt} wk={weekCtx(evt.date)} />
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

function dotColor(evt: TLEvent): string {
  if (evt.kind === 'start') return '#52CC64'
  if (evt.kind === 'phase') return '#F59E0B'
  if (evt.kind === 'measurement') return '#3B82F6'
  if (evt.kind === 'diary') return '#A78BFA'
  return TASK_COLOR[evt.taskType ?? ''] ?? '#728C74'
}

// ─── Event Card ───────────────────────────────────────────────────────────────

function EventCard({ evt, wk }: { evt: TLEvent; wk: string }) {
  const time = format(evt.date, 'HH:mm')

  if (evt.kind === 'start') {
    return (
      <LinearGradient colors={['#0A1A0C', '#080E09']} style={{ borderRadius: 14, borderWidth: 1, borderColor: '#1A3A1E', padding: 13, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Text style={{ fontSize: 20 }}>🌱</Text>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#52CC64', fontSize: 15, fontWeight: '900' }}>Inicio del cultivo</Text>
          <Text style={{ color: '#2D5030', fontSize: 12, marginTop: 1 }}>Primera semana de crecimiento</Text>
        </View>
        <Text style={{ color: '#2A4030', fontSize: 11 }}>{time}</Text>
      </LinearGradient>
    )
  }

  if (evt.kind === 'phase') {
    return (
      <LinearGradient colors={['#1A0E00', '#0E0800']} style={{ borderRadius: 14, borderWidth: 1, borderColor: '#3D2200', padding: 13, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Text style={{ fontSize: 20 }}>🌸</Text>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#F59E0B', fontSize: 15, fontWeight: '900' }}>Inicio de floracion</Text>
          <Text style={{ color: '#5A3800', fontSize: 12, marginTop: 1 }}>El calendario se recalculo desde hoy</Text>
        </View>
        <View style={{ backgroundColor: 'rgba(245,158,11,0.12)', borderRadius: 7, paddingHorizontal: 8, paddingVertical: 3 }}>
          <Text style={{ color: '#F59E0B', fontSize: 11, fontWeight: '900' }}>F1</Text>
        </View>
      </LinearGradient>
    )
  }

  if (evt.kind === 'task') {
    const color = TASK_COLOR[evt.taskType ?? ''] ?? '#728C74'
    const icon = TASK_ICON[evt.taskType ?? ''] ?? '📋'
    const label = TASK_LABEL[evt.taskType ?? ''] ?? evt.taskType
    const cyc = evt.taskCycle === 'flora' ? 'F' : 'V'
    return (
      <View style={{ backgroundColor: '#0E1510', borderRadius: 14, borderWidth: 1, borderColor: '#182018', overflow: 'hidden', flexDirection: 'row' }}>
        <View style={{ width: 3, backgroundColor: color, opacity: 0.7 }} />
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 }}>
          <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: `${color}18`, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 17 }}>{icon}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#E4F2E7', fontSize: 15, fontWeight: '800' }}>{label}</Text>
            <Text style={{ color: '#3A5040', fontSize: 12, marginTop: 1 }}>{cyc}{evt.taskWeek} · {evt.taskStage}</Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 3 }}>
            <View style={{ backgroundColor: `${color}15`, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 }}>
              <Text style={{ color, fontSize: 11, fontWeight: '800' }}>{wk}</Text>
            </View>
            <Text style={{ color: '#2A4030', fontSize: 11 }}>{time}</Text>
          </View>
        </View>
      </View>
    )
  }

  if (evt.kind === 'measurement') {
    const hasEC = evt.ec != null
    const hasPH = evt.ph != null
    const ecOk = hasEC && evt.ec! >= 0.4 && evt.ec! <= 2.0
    const phOk = hasPH && evt.ph! >= 5.5 && evt.ph! <= 6.8
    const ecColor = !hasEC ? '#728C74' : ecOk ? '#52CC64' : '#EF4444'
    const phColor = !hasPH ? '#728C74' : phOk ? '#52CC64' : '#EF4444'
    return (
      <LinearGradient colors={['#0A1220', '#080E09']} style={{ borderRadius: 14, borderWidth: 1, borderColor: '#1A2840', padding: 13 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
          <Text style={{ fontSize: 17, marginRight: 8 }}>🧪</Text>
          <Text style={{ color: '#60A5FA', fontSize: 15, fontWeight: '800', flex: 1 }}>Medicion</Text>
          <View style={{ backgroundColor: 'rgba(96,165,250,0.1)', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, marginRight: 6 }}>
            <Text style={{ color: '#60A5FA', fontSize: 11, fontWeight: '800' }}>{wk}</Text>
          </View>
          <Text style={{ color: '#2A3050', fontSize: 11 }}>{time}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {hasEC && (
            <View style={{ flex: 1, backgroundColor: `${ecColor}10`, borderRadius: 10, borderWidth: 1, borderColor: `${ecColor}25`, paddingVertical: 10, alignItems: 'center' }}>
              <Text style={{ color: ecColor, fontSize: 20, fontWeight: '900', lineHeight: 22 }}>{evt.ec}</Text>
              <Text style={{ color: `${ecColor}80`, fontSize: 11, fontWeight: '700', marginTop: 2 }}>EC</Text>
            </View>
          )}
          {hasPH && (
            <View style={{ flex: 1, backgroundColor: `${phColor}10`, borderRadius: 10, borderWidth: 1, borderColor: `${phColor}25`, paddingVertical: 10, alignItems: 'center' }}>
              <Text style={{ color: phColor, fontSize: 20, fontWeight: '900', lineHeight: 22 }}>{evt.ph}</Text>
              <Text style={{ color: `${phColor}80`, fontSize: 11, fontWeight: '700', marginTop: 2 }}>pH</Text>
            </View>
          )}
        </View>
        {evt.measureNotes ? (
          <Text style={{ color: '#3A5060', fontSize: 12, marginTop: 8, lineHeight: 17 }}>{evt.measureNotes}</Text>
        ) : null}
      </LinearGradient>
    )
  }

  if (evt.kind === 'diary') {
    const isFlora = evt.weekLabel?.startsWith('F') ?? false
    const accent = isFlora ? '#F59E0B' : '#52CC64'
    return (
      <LinearGradient
        colors={isFlora ? ['#130C00', '#080E09'] : ['#0A1A0C', '#080E09']}
        style={{ borderRadius: 14, borderWidth: 1, borderColor: isFlora ? '#2A1800' : '#142214', overflow: 'hidden' }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12 }}>
          <Text style={{ fontSize: 17 }}>📸</Text>
          <Text style={{ color: accent, fontSize: 15, fontWeight: '800', flex: 1 }}>Entrada de diario</Text>
          <View style={{ backgroundColor: isFlora ? 'rgba(245,158,11,0.12)' : 'rgba(82,204,100,0.1)', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, borderWidth: 1, borderColor: isFlora ? 'rgba(245,158,11,0.2)' : 'rgba(82,204,100,0.2)' }}>
            <Text style={{ color: accent, fontSize: 11, fontWeight: '900' }}>{evt.weekLabel ?? wk}</Text>
          </View>
          <Text style={{ color: '#2A4030', fontSize: 11, marginLeft: 4 }}>{time}</Text>
        </View>
        {evt.photoUrl ? (
          <Image source={{ uri: evt.photoUrl }} style={{ width: '100%', height: 160, resizeMode: 'cover' }} />
        ) : null}
        {evt.diaryNotes ? (
          <Text style={{ color: '#728C74', fontSize: 13, lineHeight: 19, paddingHorizontal: 12, paddingBottom: 12, paddingTop: evt.photoUrl ? 10 : 0 }}>
            {evt.diaryNotes}
          </Text>
        ) : null}
      </LinearGradient>
    )
  }

  return null
}
