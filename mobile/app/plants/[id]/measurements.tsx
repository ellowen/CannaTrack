import { useState, useEffect } from 'react'
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
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

const EC_MIN = 0.4
const EC_MAX = 1.8
const PH_MIN = 5.5
const PH_MAX = 7.0

const STATUS_COLOR: Record<RangeStatus, string> = { ok: '#52CC64', warn: '#F59E0B', bad: '#EF4444' }
const STATUS_BG: Record<RangeStatus, string>    = { ok: 'rgba(82,204,100,0.1)', warn: 'rgba(245,158,11,0.1)', bad: 'rgba(239,68,68,0.1)' }
const STATUS_BORDER: Record<RangeStatus, string> = { ok: 'rgba(82,204,100,0.25)', warn: 'rgba(245,158,11,0.25)', bad: 'rgba(239,68,68,0.25)' }
const STATUS_ICON: Record<RangeStatus, string>  = { ok: '✓', warn: '~', bad: '!' }

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

function Sparkline({ values, color, label, unit }: { values: number[]; color: string; label: string; unit: string }) {
  const last10 = values.slice(-10)
  const minV = Math.min(...last10)
  const maxV = Math.max(...last10)
  const range = maxV - minV || 0.01
  const lastVal = last10[last10.length - 1]
  const trend = last10.length >= 2 ? lastVal - last10[last10.length - 2] : 0
  const trendIcon = trend > 0.05 ? '↑' : trend < -0.05 ? '↓' : '→'
  const trendColor = trend > 0.05 ? '#EF4444' : trend < -0.05 ? '#52CC64' : '#728C74'

  return (
    <View style={{ flex: 1, paddingHorizontal: 14, paddingVertical: 14 }}>
      <Text style={{ color: '#728C74', fontSize: 9, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 4 }}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, marginBottom: 10 }}>
        <Text style={{ color, fontSize: 24, fontWeight: '900', lineHeight: 28 }}>{lastVal.toFixed(label === 'EC' ? 2 : 1)}</Text>
        <Text style={{ color: '#728C74', fontSize: 11, fontWeight: '600', marginBottom: 2 }}>{unit}</Text>
        <Text style={{ color: trendColor, fontSize: 13, fontWeight: '800', marginBottom: 1 }}>{trendIcon}</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2.5, height: 36 }}>
        {last10.map((v, i) => {
          const h = ((v - minV) / range) * 32 + 4
          const isLast = i === last10.length - 1
          return (
            <View
              key={i}
              style={{ flex: 1, borderRadius: 3, backgroundColor: isLast ? color : `${color}50`, height: h }}
            />
          )
        })}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 }}>
        <Text style={{ color: '#2D4030', fontSize: 9 }}>{minV.toFixed(1)}</Text>
        <Text style={{ color: '#2D4030', fontSize: 9 }}>{maxV.toFixed(1)}</Text>
      </View>
    </View>
  )
}

function overallStatus(m: Measurement): RangeStatus | null {
  const statuses: RangeStatus[] = []
  if (m.ec != null) statuses.push(getRangeStatus(m.ec, EC_MIN, EC_MAX))
  if (m.ph != null) statuses.push(getRangeStatus(m.ph, PH_MIN, PH_MAX))
  if (statuses.length === 0) return null
  if (statuses.some(s => s === 'bad'))  return 'bad'
  if (statuses.some(s => s === 'warn')) return 'warn'
  return 'ok'
}

export default function MeasurementsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { user } = useAuth()
  const [plantName, setPlantName] = useState('')
  const [history, setHistory]     = useState<Measurement[]>([])
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [showAll, setShowAll]     = useState(false)
  const [ec, setEc]               = useState('')
  const [ph, setPh]               = useState('')
  const [temp, setTemp]           = useState('')
  const [notes, setNotes]         = useState('')

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
    if (!ec && !ph && !temp) {
      Alert.alert('Atencion', 'Ingresa al menos un valor')
      return
    }
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

  const ecValues   = history.map(m => m.ec).filter((v): v is number => v != null).reverse()
  const phValues   = history.map(m => m.ph).filter((v): v is number => v != null).reverse()
  const tempValues = history.map(m => m.tempCelsius).filter((v): v is number => v != null).reverse()
  const showSparklines = ecValues.length >= 2 || phValues.length >= 2 || tempValues.length >= 2

  const canSave = !saving && (!!ec || !!ph || !!temp)

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
              <Text style={{ color: '#52CC64', fontSize: 11, fontWeight: '800', letterSpacing: 1 }}>EC · pH · TEMP</Text>
            </View>
          </View>

          <Text style={{ color: '#E4F2E7', fontSize: 28, fontWeight: '900', letterSpacing: -0.5 }}>Mediciones</Text>
          {plantName ? (
            <Text style={{ color: '#3DAA50', fontSize: 13, marginTop: 3, opacity: 0.9 }}>{plantName}</Text>
          ) : null}

          {/* Stats */}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
            {[
              { label: 'registros', value: history.length },
              { label: 'con EC', value: history.filter(m => m.ec != null).length },
              { label: 'con pH', value: history.filter(m => m.ph != null).length },
            ].map(s => (
              <View key={s.label} style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, borderWidth: 1, borderColor: '#1C2E1E', padding: 12, alignItems: 'center' }}>
                <Text style={{ color: '#E4F2E7', fontSize: 20, fontWeight: '900' }}>{s.value}</Text>
                <Text style={{ color: '#3A5040', fontSize: 9, fontWeight: '600', marginTop: 1, textTransform: 'uppercase', letterSpacing: 0.8 }}>{s.label}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        <View style={{ paddingHorizontal: 16, paddingTop: 8, gap: 20 }}>

          {/* Sparklines */}
          {showSparklines && (
            <LinearGradient
              colors={['#131A10', '#0C1009']}
              style={{ borderRadius: 20, borderWidth: 1, borderColor: '#1C2E1E', flexDirection: 'row', overflow: 'hidden' }}
            >
              {ecValues.length >= 2 && <Sparkline values={ecValues} color="#52CC64" label="EC" unit="mS/cm" />}
              {ecValues.length >= 2 && phValues.length >= 2 && <View style={{ width: 1, backgroundColor: '#1A2A1A', marginVertical: 14 }} />}
              {phValues.length >= 2 && <Sparkline values={phValues} color="#3B82F6" label="pH" unit="" />}
              {phValues.length >= 2 && tempValues.length >= 2 && <View style={{ width: 1, backgroundColor: '#1A2A1A', marginVertical: 14 }} />}
              {tempValues.length >= 2 && <Sparkline values={tempValues} color="#60A5FA" label="Temp" unit="°C" />}
            </LinearGradient>
          )}

          {/* Formulario */}
          <LinearGradient colors={['#131A10', '#0C1009']} style={{ borderRadius: 20, borderWidth: 1, borderColor: '#1C2E1E', overflow: 'hidden' }}>
            {/* Section header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#1A2A1A' }}>
              <Text style={{ fontSize: 16 }}>🧪</Text>
              <Text style={{ color: '#728C74', fontSize: 11, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' }}>Nueva medicion</Text>
            </View>

            <View style={{ padding: 16, gap: 12 }}>

              {/* EC + pH row */}
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={fieldLabel}>EC (mS/cm)</Text>
                  <TextInput
                    value={ec}
                    onChangeText={setEc}
                    keyboardType="decimal-pad"
                    placeholder="1.2"
                    placeholderTextColor="#2D4030"
                    style={inputStyle}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={fieldLabel}>pH</Text>
                  <TextInput
                    value={ph}
                    onChangeText={setPh}
                    keyboardType="decimal-pad"
                    placeholder="6.2"
                    placeholderTextColor="#2D4030"
                    style={inputStyle}
                  />
                </View>
              </View>

              {/* Temp */}
              <View>
                <Text style={fieldLabel}>Temp. agua (°C)</Text>
                <TextInput
                  value={temp}
                  onChangeText={setTemp}
                  keyboardType="decimal-pad"
                  placeholder="22"
                  placeholderTextColor="#2D4030"
                  style={inputStyle}
                />
              </View>

              {/* Notes */}
              <View>
                <Text style={fieldLabel}>Notas (opcional)</Text>
                <TextInput
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Observaciones..."
                  placeholderTextColor="#2D4030"
                  style={[inputStyle, { minHeight: 72, textAlignVertical: 'top' }]}
                  multiline
                />
              </View>

              {/* Save button */}
              <TouchableOpacity onPress={handleSave} disabled={!canSave} activeOpacity={0.85} style={{ borderRadius: 14, overflow: 'hidden' }}>
                <LinearGradient
                  colors={['#52CC64', '#3DAA50']}
                  style={{ paddingVertical: 15, alignItems: 'center', opacity: canSave ? 1 : 0.35 }}
                >
                  {saving
                    ? <ActivityIndicator color="#0C1410" size="small" />
                    : <Text style={{ color: '#0C1410', fontWeight: '900', fontSize: 15 }}>Registrar medicion</Text>
                  }
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </LinearGradient>

          {/* Historial */}
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <View style={{ width: 4, height: 14, borderRadius: 2, backgroundColor: '#728C74' }} />
              <Text style={{ color: '#728C74', fontSize: 11, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' }}>
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
                        {/* Left accent */}
                        <View style={{ width: 3, backgroundColor: accentColor, opacity: 0.7 }} />

                        <View style={{ flex: 1, paddingHorizontal: 14, paddingVertical: 13 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                            <View>
                              <Text style={{ color: '#8AAF8E', fontSize: 12, fontWeight: '600' }}>
                                {format(m.measuredAt, "d MMM · HH:mm", { locale: es })}
                              </Text>
                              {m.tempCelsius != null && (
                                <Text style={{ color: '#60A5FA', fontSize: 11, marginTop: 2 }}>
                                  🌡️ {m.tempCelsius}°C
                                </Text>
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

                          {m.notes ? (
                            <Text style={{ color: '#728C74', fontSize: 12, marginTop: 7, lineHeight: 17 }}>{m.notes}</Text>
                          ) : null}
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
  fontSize: 10,
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
