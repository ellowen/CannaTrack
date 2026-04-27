import { useState, useEffect } from 'react'
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

interface Measurement {
  id: string
  ec: number | null
  ph: number | null
  tempCelsius: number | null   // maps to water_temp in DB
  notes: string
  measuredAt: Date
}

type RangeStatus = 'ok' | 'warn' | 'bad'

function getRangeStatus(value: number, min: number, max: number): RangeStatus {
  if (value >= min && value <= max) return 'ok'
  const slack = (max - min) * 0.3
  return Math.abs(value < min ? min - value : value - max) <= slack ? 'warn' : 'bad'
}

const EC_MIN  = 0.4
const EC_MAX  = 1.8
const PH_MIN  = 5.5
const PH_MAX  = 7.0

const statusBg: Record<RangeStatus, string>   = { ok: '#0D2E12', warn: '#2D1F00', bad: '#2D0808' }
const statusBorder: Record<RangeStatus, string> = { ok: '#1C5E24', warn: '#7A4A00', bad: '#7A1010' }
const statusText: Record<RangeStatus, string>  = { ok: '#52CC64', warn: '#F59E0B', bad: '#EF4444' }
const statusDot: Record<RangeStatus, string>   = { ok: '#52CC64', warn: '#F59E0B', bad: '#EF4444' }
const statusIcon: Record<RangeStatus, string>  = { ok: '✓', warn: '~', bad: '✕' }

function StatusBadge({ label, value, status, decimals }: {
  label: string
  value: number
  status: RangeStatus | null
  decimals: number
}) {
  const bg     = status ? statusBg[status]     : '#1A3D1E'
  const border = status ? statusBorder[status] : '#1C2E1E'
  const text   = status ? statusText[status]   : '#52CC64'
  const dot    = status ? statusDot[status]    : '#728C74'
  const icon   = status ? statusIcon[status]   : null

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: bg, borderWidth: 1, borderColor: border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 }}>
      {icon && (
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: dot }} />
      )}
      <Text style={{ color: '#728C74', fontSize: 10, fontWeight: '700' }}>{label}</Text>
      <Text style={{ color: text, fontSize: 14, fontWeight: '800' }}>{value.toFixed(decimals)}</Text>
      {icon && (
        <Text style={{ color: dot, fontSize: 10, fontWeight: '700' }}>{icon}</Text>
      )}
    </View>
  )
}

function Sparkline({ values, color, label }: { values: number[]; color: string; label: string }) {
  const last10 = values.slice(-10)
  const min = Math.min(...last10)
  const max = Math.max(...last10)
  const range = max - min || 1
  const lastVal = last10[last10.length - 1]
  return (
    <View style={{ flex: 1, padding: 14 }}>
      <Text style={{ color: '#728C74', fontSize: 10, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 2 }}>{label}</Text>
      <Text style={{ color: color, fontSize: 22, fontWeight: '900', marginBottom: 8 }}>{lastVal.toFixed(label === 'EC' ? 2 : 1)}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 44 }}>
        {last10.map((v, i) => (
          <View key={i} style={{ width: 8, borderRadius: 4, backgroundColor: color, height: ((v - min) / range) * 40 + 4 }} />
        ))}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
        <Text style={{ color: '#3A5040', fontSize: 9 }}>{min.toFixed(1)}</Text>
        <Text style={{ color: '#3A5040', fontSize: 9 }}>{max.toFixed(1)}</Text>
      </View>
    </View>
  )
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

  useEffect(() => {
    load()
  }, [id, user])

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
        plant_id:     id,
        user_id:      user.id,
        ec:           ec   ? parseFloat(ec)   : null,
        ph:           ph   ? parseFloat(ph)   : null,
        water_temp:   temp ? parseFloat(temp) : null,
        notes:        notes.trim() || null,
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
    Alert.alert(
      'Eliminar medicion',
      'Esta accion no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase
              .from('measurements')
              .delete()
              .eq('id', measurementId)
            if (error) {
              Alert.alert('Error', error.message)
            } else {
              setHistory(prev => prev.filter(m => m.id !== measurementId))
            }
          },
        },
      ]
    )
  }

  const visibleHistory = showAll ? history : history.slice(0, 5)
  const hiddenCount = history.length - 5

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0C1410' }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>

        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={{ color: '#52CC64', fontSize: 28 }}>←</Text>
          </TouchableOpacity>
          <View style={{ marginLeft: 12 }}>
            <Text style={{ color: '#E4F2E7', fontSize: 20, fontWeight: '900' }}>Mediciones</Text>
            {plantName ? <Text style={{ color: '#728C74', fontSize: 12 }}>{plantName}</Text> : null}
          </View>
        </View>

        {/* Formulario */}
        <View style={{ backgroundColor: '#131D14', borderRadius: 20, borderWidth: 1, borderColor: '#1C2E1E', padding: 16, marginBottom: 20 }}>
          <Text style={labelStyle}>EC (mS/cm)</Text>
          <TextInput value={ec} onChangeText={setEc} keyboardType="decimal-pad" placeholder="Ej: 1.2" placeholderTextColor="#3A5040" style={inputStyle} />

          <Text style={labelStyle}>pH</Text>
          <TextInput value={ph} onChangeText={setPh} keyboardType="decimal-pad" placeholder="Ej: 6.2" placeholderTextColor="#3A5040" style={inputStyle} />

          <Text style={labelStyle}>Temp. agua (°C)</Text>
          <TextInput value={temp} onChangeText={setTemp} keyboardType="decimal-pad" placeholder="Ej: 22" placeholderTextColor="#3A5040" style={inputStyle} />

          <Text style={labelStyle}>Notas</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Observaciones opcionales..."
            placeholderTextColor="#3A5040"
            style={[inputStyle, { minHeight: 72, textAlignVertical: 'top' }]}
            multiline
          />

          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            style={{ backgroundColor: '#52CC64', borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 4, opacity: saving ? 0.4 : 1 }}
          >
            {saving
              ? <ActivityIndicator color="white" size="small" />
              : <Text style={{ color: '#0C1410', fontWeight: '900', fontSize: 15 }}>Registrar →</Text>
            }
          </TouchableOpacity>
        </View>

        {/* Sparklines */}
        {(() => {
          const ecValues   = history.map(m => m.ec).filter((v): v is number => v != null).reverse()
          const phValues   = history.map(m => m.ph).filter((v): v is number => v != null).reverse()
          const tempValues = history.map(m => m.tempCelsius).filter((v): v is number => v != null).reverse()
          const showEc   = ecValues.length >= 2
          const showPh   = phValues.length >= 2
          const showTemp = tempValues.length >= 2
          if (!showEc && !showPh && !showTemp) return null

          const cols = [showEc, showPh, showTemp].filter(Boolean).length
          const dividers: boolean[] = []
          if (showEc && (showPh || showTemp)) dividers.push(true)
          if (showPh && showTemp) dividers.push(true)

          return (
            <View style={{ backgroundColor: '#131D14', borderRadius: 20, borderWidth: 1, borderColor: '#1C2E1E', flexDirection: 'row', marginBottom: 20 }}>
              {showEc && <Sparkline values={ecValues} color="#52CC64" label="EC" />}
              {showEc && (showPh || showTemp) && <View style={{ width: 1, backgroundColor: '#1C2E1E', marginVertical: 14 }} />}
              {showPh && <Sparkline values={phValues} color="#3B82F6" label="pH" />}
              {showPh && showTemp && <View style={{ width: 1, backgroundColor: '#1C2E1E', marginVertical: 14 }} />}
              {showTemp && <Sparkline values={tempValues} color="#60A5FA" label="TEMP" />}
            </View>
          )
        })()}

        {/* Historial */}
        <Text style={{ color: '#728C74', fontSize: 11, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 }}>
          HISTORIAL
        </Text>

        {loading ? (
          <ActivityIndicator color="#52CC64" style={{ marginTop: 20 }} />
        ) : history.length === 0 ? (
          <Text style={{ color: '#3A5040', textAlign: 'center', paddingVertical: 20, fontSize: 14 }}>
            Sin mediciones registradas
          </Text>
        ) : (
          <>
            <View style={{ backgroundColor: '#131D14', borderRadius: 20, borderWidth: 1, borderColor: '#1C2E1E', overflow: 'hidden' }}>
              {visibleHistory.map((m, i) => {
                const ecStatus  = m.ec != null  ? getRangeStatus(m.ec,  EC_MIN, EC_MAX) : null
                const phStatus  = m.ph != null  ? getRangeStatus(m.ph,  PH_MIN, PH_MAX) : null

                return (
                  <View key={m.id} style={{
                    padding: 14,
                    borderTopWidth: i > 0 ? 1 : 0,
                    borderTopColor: '#1C2E1E',
                  }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <View>
                        <Text style={{ color: '#728C74', fontSize: 11 }}>
                          {format(m.measuredAt, "d MMM · HH:mm", { locale: es })}
                        </Text>
                        {m.tempCelsius != null && (
                          <Text style={{ color: '#60A5FA', fontSize: 11, marginTop: 2 }}>
                            {'\uD83C\uDF21\uFE0F'} {m.tempCelsius}°C
                          </Text>
                        )}
                      </View>
                      <TouchableOpacity
                        onPress={() => handleDelete(m.id)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        style={{ backgroundColor: '#1C2E1E', borderRadius: 8, width: 30, height: 30, alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Text style={{ fontSize: 14 }}>🗑️</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
                      {m.ec != null && (
                        <StatusBadge label="EC" value={m.ec} status={ecStatus} decimals={2} />
                      )}
                      {m.ph != null && (
                        <StatusBadge label="pH" value={m.ph} status={phStatus} decimals={1} />
                      )}
                    </View>
                    {m.notes ? <Text style={{ color: '#728C74', fontSize: 12, marginTop: 6 }}>{m.notes}</Text> : null}
                  </View>
                )
              })}
            </View>

            {history.length > 5 && (
              <TouchableOpacity
                onPress={() => setShowAll(!showAll)}
                style={{ paddingVertical: 14, alignItems: 'center', marginTop: 4 }}
              >
                <Text style={{ color: '#52CC64', fontSize: 13, fontWeight: '700' }}>
                  {showAll ? 'Ver menos' : `Ver mas (${hiddenCount})`}
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const labelStyle = {
  color: '#728C74' as const,
  fontSize: 11,
  fontWeight: '700' as const,
  letterSpacing: 1.5,
  textTransform: 'uppercase' as const,
  marginBottom: 6,
  marginTop: 12,
}

const inputStyle = {
  backgroundColor: '#0C1410',
  borderWidth: 1,
  borderColor: '#1C2E1E',
  borderRadius: 12,
  paddingHorizontal: 14,
  paddingVertical: 12,
  color: '#E4F2E7',
  fontSize: 15,
}

const chipStyle = {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  gap: 4,
  backgroundColor: '#1A3D1E',
  borderRadius: 8,
  paddingHorizontal: 10,
  paddingVertical: 5,
}

const chipLabelStyle = { color: '#728C74', fontSize: 10, fontWeight: '700' as const }
const chipValueStyle = { color: '#52CC64', fontSize: 14, fontWeight: '800' as const }
