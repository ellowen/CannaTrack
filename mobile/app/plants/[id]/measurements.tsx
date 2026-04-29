import { useState, useEffect } from 'react'
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, useWindowDimensions } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import Svg, { Path, Rect, Circle, Line, Text as SvgText } from 'react-native-svg'
import { BackIcon } from '@/components/icons/AppIcons'
import { router, useLocalSearchParams } from 'expo-router'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

interface Measurement {
  id: string
  ec: number | null
  ph: number | null
  tempCelsius: number | null
  notes: string
  measuredAt: Date
}

type RangeStatus = 'ok' | 'warn' | 'bad'

function getRangeStatus(value: number, min: number, max: number): RangeStatus {
  if (value >= min && value <= max) return 'ok'
  const slack = (max - min) * 0.3
  return Math.abs(value < min ? min - value : value - max) <= slack ? 'warn' : 'bad'
}

const EC_MIN = 0.4, EC_MAX = 2.0
const PH_MIN = 5.5, PH_MAX = 7.0

const STATUS_COLOR: Record<RangeStatus, string>  = { ok: '#52CC64', warn: '#F59E0B', bad: '#EF4444' }
const STATUS_BG: Record<RangeStatus, string>     = { ok: 'rgba(82,204,100,0.1)', warn: 'rgba(245,158,11,0.1)', bad: 'rgba(239,68,68,0.1)' }
const STATUS_BORDER: Record<RangeStatus, string> = { ok: 'rgba(82,204,100,0.25)', warn: 'rgba(245,158,11,0.25)', bad: 'rgba(239,68,68,0.25)' }
const STATUS_ICON: Record<RangeStatus, string>   = { ok: '✓', warn: '~', bad: '!' }

// ─── StatusBadge ─────────────────────────────────────────────────────────────

function StatusBadge({ label, value, status, decimals }: {
  label: string; value: number; status: RangeStatus | null; decimals: number
}) {
  const color  = status ? STATUS_COLOR[status]  : '#52CC64'
  const bg     = status ? STATUS_BG[status]     : 'rgba(82,204,100,0.08)'
  const border = status ? STATUS_BORDER[status] : 'rgba(82,204,100,0.2)'
  const icon   = status ? STATUS_ICON[status]   : null
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: bg, borderWidth: 1, borderColor: border, borderRadius: 10, paddingHorizontal: 11, paddingVertical: 6 }}>
      {icon && <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: color }} />}
      <Text style={{ color: '#728C74', fontSize: 10, fontWeight: '700' }}>{label}</Text>
      <Text style={{ color, fontSize: 15, fontWeight: '900' }}>{value.toFixed(decimals)}</Text>
      {icon && <Text style={{ color, fontSize: 10, fontWeight: '800' }}>{icon}</Text>}
    </View>
  )
}

// ─── LineChart ────────────────────────────────────────────────────────────────

interface DataPoint { value: number; date: Date }

function LineChart({
  points, color, safeMin, safeMax, yMin, yMax, label, unit, chartWidth,
}: {
  points: DataPoint[]; color: string
  safeMin: number; safeMax: number; yMin: number; yMax: number
  label: string; unit: string; chartWidth: number
}) {
  const last = points.slice(-20)
  if (last.length < 2) return null

  const PAD_L = 32, PAD_R = 10, PAD_T = 8, PAD_B = 22
  const plotW = chartWidth - PAD_L - PAD_R
  const plotH = 90 - PAD_T - PAD_B
  const totalH = 90

  const scaleY = (v: number) => PAD_T + plotH - ((v - yMin) / (yMax - yMin)) * plotH
  const scaleX = (i: number) => PAD_L + (i / (last.length - 1)) * plotW

  const safeTop    = scaleY(safeMax)
  const safeBottom = scaleY(safeMin)
  const floor      = PAD_T + plotH

  // Line path
  const linePath = last.map((pt, i) =>
    `${i === 0 ? 'M' : 'L'}${scaleX(i).toFixed(1)},${scaleY(pt.value).toFixed(1)}`
  ).join(' ')

  // Area fill path (under the line)
  const areaPath = [
    ...last.map((pt, i) => `${i === 0 ? 'M' : 'L'}${scaleX(i).toFixed(1)},${scaleY(pt.value).toFixed(1)}`),
    `L${scaleX(last.length - 1).toFixed(1)},${floor.toFixed(1)}`,
    `L${PAD_L.toFixed(1)},${floor.toFixed(1)}`,
    'Z',
  ].join(' ')

  const lastVal = last[last.length - 1].value
  const lastStatus = getRangeStatus(lastVal, safeMin, safeMax)
  const lastColor  = STATUS_COLOR[lastStatus]

  // Pick X-axis label indices
  const xLabelIdxs = last.length <= 4
    ? last.map((_, i) => i)
    : [0, Math.floor((last.length - 1) / 2), last.length - 1]

  return (
    <View style={{ paddingTop: 12, paddingBottom: 4 }}>
      {/* Header row */}
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: 4, marginBottom: 6 }}>
        <Text style={{ color: '#728C74', fontSize: 13, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' }}>{label}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 3 }}>
          <Text style={{ color: lastColor, fontSize: 26, fontWeight: '900', lineHeight: 28 }}>
            {lastVal.toFixed(label === 'EC' ? 2 : 1)}
          </Text>
          {unit ? <Text style={{ color: '#728C74', fontSize: 12, fontWeight: '600' }}>{unit}</Text> : null}
          <View style={{ backgroundColor: STATUS_BG[lastStatus], borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, marginLeft: 4, borderWidth: 1, borderColor: STATUS_BORDER[lastStatus] }}>
            <Text style={{ color: lastColor, fontSize: 11, fontWeight: '800' }}>
              {lastStatus === 'ok' ? 'OPTIMO' : lastStatus === 'warn' ? 'LIMITE' : 'FUERA'}
            </Text>
          </View>
        </View>
      </View>

      {/* Chart */}
      <Svg width={chartWidth} height={totalH}>
        {/* Safe zone background */}
        <Rect
          x={PAD_L} y={safeTop}
          width={plotW} height={safeBottom - safeTop}
          fill="rgba(82,204,100,0.07)"
        />
        {/* Safe zone border lines */}
        <Line x1={PAD_L} y1={safeTop}    x2={PAD_L + plotW} y2={safeTop}    stroke="rgba(82,204,100,0.25)" strokeWidth={1} strokeDasharray="4,3" />
        <Line x1={PAD_L} y1={safeBottom} x2={PAD_L + plotW} y2={safeBottom} stroke="rgba(82,204,100,0.25)" strokeWidth={1} strokeDasharray="4,3" />
        {/* Y-axis labels */}
        <SvgText x={PAD_L - 4} y={safeTop + 4}    fill="rgba(82,204,100,0.5)" fontSize={8} textAnchor="end">{safeMax}</SvgText>
        <SvgText x={PAD_L - 4} y={safeBottom - 1} fill="rgba(82,204,100,0.5)" fontSize={8} textAnchor="end">{safeMin}</SvgText>
        {/* Area fill */}
        <Path d={areaPath} fill={`${color}12`} />
        {/* Line */}
        <Path d={linePath} stroke={color} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        {/* Data points */}
        {last.map((pt, i) => {
          const s = getRangeStatus(pt.value, safeMin, safeMax)
          const c = STATUS_COLOR[s]
          const isLast = i === last.length - 1
          return (
            <Circle
              key={i}
              cx={scaleX(i)} cy={scaleY(pt.value)}
              r={isLast ? 5 : 3}
              fill={isLast ? c : '#080E09'}
              stroke={c}
              strokeWidth={isLast ? 0 : 1.5}
            />
          )
        })}
        {/* X-axis date labels */}
        {xLabelIdxs.map(i => (
          <SvgText key={i} x={scaleX(i)} y={totalH - 4} fill="#3A5040" fontSize={9} textAnchor="middle">
            {format(last[i].date, 'd/M')}
          </SvgText>
        ))}
      </Svg>

      {/* Range legend */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 4, marginTop: 2 }}>
        <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: 'rgba(82,204,100,0.3)' }} />
        <Text style={{ color: '#2D4030', fontSize: 10 }}>
          Optimo: {safeMin} – {safeMax} {unit}  ·  {last.length} registros
        </Text>
      </View>
    </View>
  )
}

// ─── TempSparkline ────────────────────────────────────────────────────────────

function TempSparkline({ values }: { values: number[] }) {
  const last8 = values.slice(-8)
  const minV = Math.min(...last8)
  const maxV = Math.max(...last8)
  const range = maxV - minV || 0.1
  const lastVal = last8[last8.length - 1]
  const trend = last8.length >= 2 ? lastVal - last8[last8.length - 2] : 0
  const tempOk = lastVal >= 18 && lastVal <= 26
  const tempColor = tempOk ? '#60A5FA' : '#F59E0B'

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingTop: 12 }}>
      <View>
        <Text style={{ color: '#728C74', fontSize: 13, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' }}>Temp agua</Text>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 3, marginTop: 4 }}>
          <Text style={{ color: tempColor, fontSize: 22, fontWeight: '900' }}>{lastVal.toFixed(1)}</Text>
          <Text style={{ color: '#728C74', fontSize: 12 }}>°C</Text>
          <Text style={{ color: trend > 0.3 ? '#EF4444' : trend < -0.3 ? '#60A5FA' : '#728C74', fontSize: 13, fontWeight: '800', marginLeft: 2 }}>
            {trend > 0.3 ? '↑' : trend < -0.3 ? '↓' : '→'}
          </Text>
        </View>
        <Text style={{ color: '#2D4030', fontSize: 10, marginTop: 2 }}>Optimo: 18–26°C</Text>
      </View>
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 32 }}>
        {last8.map((v, i) => {
          const h = ((v - minV) / range) * 26 + 6
          const ok = v >= 18 && v <= 26
          const isLast = i === last8.length - 1
          return (
            <View key={i} style={{ flex: 1, borderRadius: 3, height: h, backgroundColor: isLast ? (ok ? '#60A5FA' : '#F59E0B') : 'rgba(96,165,250,0.3)' }} />
          )
        })}
      </View>
    </View>
  )
}

// ─── overallStatus ────────────────────────────────────────────────────────────

function overallStatus(m: Measurement): RangeStatus | null {
  const statuses: RangeStatus[] = []
  if (m.ec != null) statuses.push(getRangeStatus(m.ec, EC_MIN, EC_MAX))
  if (m.ph != null) statuses.push(getRangeStatus(m.ph, PH_MIN, PH_MAX))
  if (statuses.length === 0) return null
  if (statuses.some(s => s === 'bad'))  return 'bad'
  if (statuses.some(s => s === 'warn')) return 'warn'
  return 'ok'
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function MeasurementsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { user } = useAuth()
  const { width: screenWidth } = useWindowDimensions()
  const [plantName, setPlantName] = useState('')
  const [history, setHistory]     = useState<Measurement[]>([])
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [showAll, setShowAll]     = useState(false)
  const [ec, setEc]               = useState('')
  const [ph, setPh]               = useState('')
  const [temp, setTemp]           = useState('')
  const [notes, setNotes]         = useState('')

  // chartWidth = screen - outer h-padding (32) - card h-padding (28)
  const chartWidth = screenWidth - 32 - 28

  useEffect(() => { load() }, [id, user])

  async function load() {
    if (!id || !user) return
    supabase.from('plants').select('name').eq('id', id).maybeSingle()
      .then(({ data }) => { if (data) setPlantName(data.name) })
    const { data } = await supabase
      .from('measurements')
      .select('id, ec, ph, water_temp, notes, measured_at')
      .eq('plant_id', id)
      .order('measured_at', { ascending: false })
      .limit(50)
    setHistory((data ?? []).map(r => ({
      id:          r.id,
      ec:          r.ec,
      ph:          r.ph,
      tempCelsius: r.water_temp ?? null,
      notes:       r.notes ?? '',
      measuredAt:  new Date(r.measured_at),
    })))
    setLoading(false)
  }

  async function handleSave() {
    if (!id || !user) return
    if (!ec && !ph && !temp) { Alert.alert('Atencion', 'Ingresa al menos un valor'); return }
    setSaving(true)
    try {
      await supabase.from('measurements').insert({
        plant_id:   id,
        user_id:    user.id,
        ec:         ec   ? parseFloat(ec)   : null,
        ph:         ph   ? parseFloat(ph)   : null,
        water_temp: temp ? parseFloat(temp) : null,
        notes:      notes.trim() || null,
      })
      setEc(''); setPh(''); setTemp(''); setNotes('')
      await load()
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  function handleDelete(measurementId: string) {
    Alert.alert('Eliminar medicion', 'Esta accion no se puede deshacer.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('measurements').delete().eq('id', measurementId)
          if (error) Alert.alert('Error', error.message)
          else setHistory(prev => prev.filter(m => m.id !== measurementId))
        },
      },
    ])
  }

  const visibleHistory = showAll ? history : history.slice(0, 5)
  const hiddenCount = history.length - 5

  // Build chart data (chronological order)
  const ecPoints   = history.filter(m => m.ec  != null).reverse().map(m => ({ value: m.ec!,          date: m.measuredAt }))
  const phPoints   = history.filter(m => m.ph  != null).reverse().map(m => ({ value: m.ph!,          date: m.measuredAt }))
  const tempValues = history.filter(m => m.tempCelsius != null).reverse().map(m => m.tempCelsius!)

  const showCharts = ecPoints.length >= 2 || phPoints.length >= 2
  const canSave    = !saving && (!!ec || !!ph || !!temp)

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#080E09' }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <LinearGradient
          colors={['#0A1A0B', '#060E07', '#080E09']}
          style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' }}
            >
              <BackIcon size={20} color="#52CC64" />
            </TouchableOpacity>
            <View style={{ backgroundColor: 'rgba(82,204,100,0.1)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(82,204,100,0.2)' }}>
              <Text style={{ color: '#52CC64', fontSize: 13, fontWeight: '800', letterSpacing: 1 }}>EC · pH · TEMP</Text>
            </View>
          </View>

          <Text style={{ color: '#E4F2E7', fontSize: 28, fontWeight: '900', letterSpacing: -0.5 }}>Mediciones</Text>
          {plantName ? <Text style={{ color: '#3DAA50', fontSize: 13, marginTop: 3, opacity: 0.9 }}>{plantName}</Text> : null}

          {/* Stats */}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
            {[
              { label: 'registros',  value: history.length },
              { label: 'con EC',     value: ecPoints.length },
              { label: 'con pH',     value: phPoints.length },
            ].map(s => (
              <View key={s.label} style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, borderWidth: 1, borderColor: '#1C2E1E', padding: 12, alignItems: 'center' }}>
                <Text style={{ color: '#E4F2E7', fontSize: 20, fontWeight: '900' }}>{s.value}</Text>
                <Text style={{ color: '#3A5040', fontSize: 11, fontWeight: '600', marginTop: 1, textTransform: 'uppercase', letterSpacing: 0.8 }}>{s.label}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        <View style={{ paddingHorizontal: 16, paddingTop: 8, gap: 20 }}>

          {/* ─── Graficos ───────────────────────────────────────────── */}
          {showCharts && (
            <LinearGradient
              colors={['#131A10', '#0C1009']}
              style={{ borderRadius: 20, borderWidth: 1, borderColor: '#1C2E1E', paddingHorizontal: 14, paddingBottom: 14 }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 14, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: '#1A2A1A', marginBottom: 2 }}>
                <Text style={{ fontSize: 14 }}>📈</Text>
                <Text style={{ color: '#728C74', fontSize: 13, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' }}>Graficos</Text>
                <View style={{ marginLeft: 'auto' }}>
                  <Text style={{ color: '#2D4030', fontSize: 11 }}>ultimos 20 registros</Text>
                </View>
              </View>

              {ecPoints.length >= 2 && (
                <LineChart
                  points={ecPoints}
                  color="#52CC64"
                  safeMin={EC_MIN} safeMax={EC_MAX}
                  yMin={0} yMax={3.0}
                  label="EC" unit="mS/cm"
                  chartWidth={chartWidth}
                />
              )}

              {ecPoints.length >= 2 && phPoints.length >= 2 && (
                <View style={{ height: 1, backgroundColor: '#1A2A1A', marginTop: 4, marginBottom: 0 }} />
              )}

              {phPoints.length >= 2 && (
                <LineChart
                  points={phPoints}
                  color="#3B82F6"
                  safeMin={PH_MIN} safeMax={PH_MAX}
                  yMin={4.0} yMax={9.0}
                  label="pH" unit=""
                  chartWidth={chartWidth}
                />
              )}

              {tempValues.length >= 2 && (
                <>
                  <View style={{ height: 1, backgroundColor: '#1A2A1A', marginTop: 8 }} />
                  <TempSparkline values={tempValues} />
                </>
              )}
            </LinearGradient>
          )}

          {/* ─── Formulario nueva medicion ──────────────────────────── */}
          <LinearGradient colors={['#131A10', '#0C1009']} style={{ borderRadius: 20, borderWidth: 1, borderColor: '#1C2E1E', overflow: 'hidden' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#1A2A1A' }}>
              <Text style={{ fontSize: 16 }}>🧪</Text>
              <Text style={{ color: '#728C74', fontSize: 13, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' }}>Nueva medicion</Text>
            </View>

            <View style={{ padding: 16, gap: 12 }}>
              {/* EC + pH */}
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={fieldLabel}>EC (mS/cm)</Text>
                  <TextInput value={ec} onChangeText={setEc} keyboardType="decimal-pad" placeholder="1.2" placeholderTextColor="#2D4030" style={inputStyle} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={fieldLabel}>pH</Text>
                  <TextInput value={ph} onChangeText={setPh} keyboardType="decimal-pad" placeholder="6.2" placeholderTextColor="#2D4030" style={inputStyle} />
                </View>
              </View>
              {/* Temp */}
              <View>
                <Text style={fieldLabel}>Temp. agua (°C)</Text>
                <TextInput value={temp} onChangeText={setTemp} keyboardType="decimal-pad" placeholder="22" placeholderTextColor="#2D4030" style={inputStyle} />
              </View>
              {/* Notes */}
              <View>
                <Text style={fieldLabel}>Notas (opcional)</Text>
                <TextInput value={notes} onChangeText={setNotes} placeholder="Observaciones..." placeholderTextColor="#2D4030" style={[inputStyle, { minHeight: 72, textAlignVertical: 'top' }]} multiline />
              </View>
              {/* Save */}
              <TouchableOpacity onPress={handleSave} disabled={!canSave} activeOpacity={0.85} style={{ borderRadius: 14, overflow: 'hidden', opacity: canSave ? 1 : 0.35 }}>
                <LinearGradient colors={['#52CC64', '#3DAA50']} style={{ paddingVertical: 15, alignItems: 'center' }}>
                  {saving
                    ? <ActivityIndicator color="#0C1410" size="small" />
                    : <Text style={{ color: '#0C1410', fontWeight: '900', fontSize: 15 }}>Registrar medicion</Text>
                  }
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </LinearGradient>

          {/* ─── Historial ──────────────────────────────────────────── */}
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <View style={{ width: 4, height: 14, borderRadius: 2, backgroundColor: '#728C74' }} />
              <Text style={{ color: '#728C74', fontSize: 13, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' }}>
                Historial ({history.length})
              </Text>
            </View>

            {loading ? (
              <ActivityIndicator color="#52CC64" style={{ marginTop: 20 }} />
            ) : history.length === 0 ? (
              <LinearGradient
                colors={['#0D1A0F', '#080E09']}
                style={{ borderRadius: 20, borderWidth: 1, borderColor: '#1C2E1E', padding: 40, alignItems: 'center' }}
              >
                <Text style={{ fontSize: 40, marginBottom: 12 }}>🧪</Text>
                <Text style={{ color: '#728C74', fontSize: 13, textAlign: 'center', lineHeight: 20 }}>
                  Sin mediciones registradas{'\n'}Agrega tu primera arriba
                </Text>
              </LinearGradient>
            ) : (
              <>
                <LinearGradient colors={['#131A10', '#0C1009']} style={{ borderRadius: 20, borderWidth: 1, borderColor: '#1C2E1E', overflow: 'hidden' }}>
                  {visibleHistory.map((m, i) => {
                    const ecStatus  = m.ec != null ? getRangeStatus(m.ec, EC_MIN, EC_MAX) : null
                    const phStatus  = m.ph != null ? getRangeStatus(m.ph, PH_MIN, PH_MAX) : null
                    const rowStatus = overallStatus(m)
                    const accentColor = rowStatus ? STATUS_COLOR[rowStatus] : '#728C74'
                    return (
                      <View key={m.id} style={{ flexDirection: 'row', alignItems: 'stretch', borderTopWidth: i > 0 ? 1 : 0, borderTopColor: '#1A2A1A' }}>
                        <View style={{ width: 3, backgroundColor: accentColor, opacity: 0.7 }} />
                        <View style={{ flex: 1, paddingHorizontal: 14, paddingVertical: 13 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                            <View>
                              <Text style={{ color: '#8AAF8E', fontSize: 12, fontWeight: '600' }}>
                                {format(m.measuredAt, "d MMM · HH:mm", { locale: es })}
                              </Text>
                              {m.tempCelsius != null && (
                                <Text style={{ color: '#60A5FA', fontSize: 11, marginTop: 2 }}>🌡️ {m.tempCelsius}°C</Text>
                              )}
                            </View>
                            <TouchableOpacity
                              onPress={() => handleDelete(m.id)}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                              style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: 'rgba(239,68,68,0.08)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.15)', alignItems: 'center', justifyContent: 'center' }}
                            >
                              <Text style={{ fontSize: 13 }}>🗑️</Text>
                            </TouchableOpacity>
                          </View>
                          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                            {m.ec != null && <StatusBadge label="EC" value={m.ec} status={ecStatus} decimals={2} />}
                            {m.ph != null && <StatusBadge label="pH" value={m.ph} status={phStatus} decimals={1} />}
                          </View>
                          {m.notes ? <Text style={{ color: '#728C74', fontSize: 12, marginTop: 7, lineHeight: 17 }}>{m.notes}</Text> : null}
                        </View>
                      </View>
                    )
                  })}
                </LinearGradient>

                {history.length > 5 && (
                  <TouchableOpacity onPress={() => setShowAll(!showAll)} style={{ paddingVertical: 14, alignItems: 'center' }}>
                    <Text style={{ color: '#52CC64', fontSize: 13, fontWeight: '700' }}>
                      {showAll ? 'Ver menos' : `Ver ${hiddenCount} mas`}
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>

        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const fieldLabel = {
  color: '#728C74' as const,
  fontSize: 12,
  fontWeight: '700' as const,
  letterSpacing: 1.2,
  textTransform: 'uppercase' as const,
  marginBottom: 6,
}

const inputStyle = {
  backgroundColor: 'rgba(0,0,0,0.3)',
  borderWidth: 1,
  borderColor: '#1C2E1E',
  borderRadius: 12,
  paddingHorizontal: 14,
  paddingVertical: 12,
  color: '#E4F2E7' as const,
  fontSize: 15,
}
