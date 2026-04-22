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
  waterTemp: number | null
  notes: string
  measuredAt: Date
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
  const [history, setHistory]   = useState<Measurement[]>([])
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [ec, setEc]             = useState('')
  const [ph, setPh]             = useState('')
  const [temp, setTemp]         = useState('')
  const [notes, setNotes]       = useState('')

  useEffect(() => {
    load()
  }, [id, user])

  async function load() {
    if (!id || !user) return
    const { data } = await supabase
      .from('measurements')
      .select('*')
      .eq('plant_id', id)
      .order('measured_at', { ascending: false })
      .limit(20)
    setHistory((data ?? []).map(r => ({
      id:         r.id,
      ec:         r.ec,
      ph:         r.ph,
      waterTemp:  r.water_temp,
      notes:      r.notes ?? '',
      measuredAt: new Date(r.measured_at),
    })))
    setLoading(false)
  }

  async function handleSave() {
    if (!id || !user) return
    if (!ec && !ph && !temp) {
      Alert.alert('Atención', 'Ingresá al menos un valor')
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0C1410' }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>

        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={{ color: '#52CC64', fontSize: 28 }}>←</Text>
          </TouchableOpacity>
          <Text style={{ color: '#E4F2E7', fontSize: 20, fontWeight: '900', marginLeft: 12 }}>Mediciones</Text>
        </View>

        {/* Formulario */}
        <View style={{ backgroundColor: '#131D14', borderRadius: 20, borderWidth: 1, borderColor: '#1C2E1E', padding: 16, marginBottom: 20 }}>
          <Text style={label}>EC (mS/cm)</Text>
          <TextInput value={ec} onChangeText={setEc} keyboardType="decimal-pad" placeholder="Ej: 1.2" placeholderTextColor="#3A5040" style={input} />

          <Text style={label}>pH</Text>
          <TextInput value={ph} onChangeText={setPh} keyboardType="decimal-pad" placeholder="Ej: 6.2" placeholderTextColor="#3A5040" style={input} />

          <Text style={label}>Temp. agua (°C)</Text>
          <TextInput value={temp} onChangeText={setTemp} keyboardType="decimal-pad" placeholder="Ej: 22" placeholderTextColor="#3A5040" style={input} />

          <Text style={label}>Notas</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Observaciones opcionales..."
            placeholderTextColor="#3A5040"
            style={[input, { minHeight: 72, textAlignVertical: 'top' }]}
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
          const ecValues = history.map(m => m.ec).filter((v): v is number => v != null).reverse()
          const phValues = history.map(m => m.ph).filter((v): v is number => v != null).reverse()
          const showEc = ecValues.length >= 2
          const showPh = phValues.length >= 2
          if (!showEc && !showPh) return null
          return (
            <View style={{ backgroundColor: '#131D14', borderRadius: 20, borderWidth: 1, borderColor: '#1C2E1E', flexDirection: 'row', marginBottom: 20 }}>
              {showEc && <Sparkline values={ecValues} color="#52CC64" label="EC" />}
              {showEc && showPh && <View style={{ width: 1, backgroundColor: '#1C2E1E', marginVertical: 14 }} />}
              {showPh && <Sparkline values={phValues} color="#3B82F6" label="pH" />}
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
          <View style={{ backgroundColor: '#131D14', borderRadius: 20, borderWidth: 1, borderColor: '#1C2E1E', overflow: 'hidden' }}>
            {history.map((m, i) => (
              <View key={m.id} style={{
                padding: 14,
                borderTopWidth: i > 0 ? 1 : 0,
                borderTopColor: '#1C2E1E',
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ color: '#728C74', fontSize: 11 }}>
                    {format(m.measuredAt, "d MMM · HH:mm", { locale: es })}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
                  {m.ec != null && (
                    <View style={chip}>
                      <Text style={chipLabel}>EC</Text>
                      <Text style={chipValue}>{m.ec.toFixed(2)}</Text>
                    </View>
                  )}
                  {m.ph != null && (
                    <View style={chip}>
                      <Text style={chipLabel}>pH</Text>
                      <Text style={chipValue}>{m.ph.toFixed(1)}</Text>
                    </View>
                  )}
                  {m.waterTemp != null && (
                    <View style={chip}>
                      <Text style={chipLabel}>°C</Text>
                      <Text style={chipValue}>{m.waterTemp}</Text>
                    </View>
                  )}
                </View>
                {m.notes ? <Text style={{ color: '#728C74', fontSize: 12, marginTop: 6 }}>{m.notes}</Text> : null}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const label = {
  color: '#728C74' as const,
  fontSize: 11,
  fontWeight: '700' as const,
  letterSpacing: 1.5,
  textTransform: 'uppercase' as const,
  marginBottom: 6,
  marginTop: 12,
}

const input = {
  backgroundColor: '#0C1410',
  borderWidth: 1,
  borderColor: '#1C2E1E',
  borderRadius: 12,
  paddingHorizontal: 14,
  paddingVertical: 12,
  color: '#E4F2E7',
  fontSize: 15,
}

const chip = {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  gap: 4,
  backgroundColor: '#1A3D1E',
  borderRadius: 8,
  paddingHorizontal: 10,
  paddingVertical: 5,
}

const chipLabel = { color: '#728C74', fontSize: 10, fontWeight: '700' as const }
const chipValue = { color: '#52CC64', fontSize: 14, fontWeight: '800' as const }
