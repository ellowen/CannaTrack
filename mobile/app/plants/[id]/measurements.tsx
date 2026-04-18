import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

export default function MeasurementsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { user } = useAuth()
  const [ecMin, setEcMin] = useState('')
  const [ecMax, setEcMax] = useState('')
  const [phMin, setPhMin] = useState('')
  const [phMax, setPhMax] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!id || !user) return
    setSaving(true)
    try {
      const task = {
        ec_min: ecMin ? parseFloat(ecMin) : undefined,
        ec_max: ecMax ? parseFloat(ecMax) : undefined,
        ph_min: phMin ? parseFloat(phMin) : undefined,
        ph_max: phMax ? parseFloat(phMax) : undefined,
      }
      await supabase.from('scheduled_tasks').insert({
        plant_id: id,
        user_id: user.id,
        type: 'observation',
        scheduled_date: new Date().toISOString().split('T')[0],
        cycle: 'vege',
        week: 1,
        stage: 'medición',
        ...task,
      })
      Alert.alert('Éxito', 'Medida registrada')
      router.back()
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Error')
    } finally {
      setSaving(false)
    }
  }

  const inputStyle = { backgroundColor: '#131D14', borderWidth: 1, borderColor: '#1C2E1E', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, color: '#E4F2E7', fontSize: 14, marginBottom: 12 }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0C1410' }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={{ color: '#52CC64', fontSize: 28 }}>←</Text>
          </TouchableOpacity>
          <Text style={{ color: '#E4F2E7', fontSize: 20, fontWeight: '900', marginLeft: 12 }}>Registrar medida</Text>
        </View>

        <View style={{ backgroundColor: '#1A3D1E', borderRadius: 16, borderWidth: 1, borderColor: '#2A5A2E', padding: 12, marginBottom: 20, alignItems: 'center' }}>
          <Text style={{ color: '#52CC64', fontSize: 14, fontWeight: '700' }}>📊 EC - Conductividad eléctrica</Text>
        </View>

        <Text style={{ color: '#728C74', fontSize: 11, fontWeight: '700', marginBottom: 4 }}>EC MÍNIMO</Text>
        <TextInput
          value={ecMin}
          onChangeText={setEcMin}
          keyboardType="decimal-pad"
          placeholder="Ej: 0.6"
          placeholderTextColor="#3A5040"
          style={inputStyle}
        />

        <Text style={{ color: '#728C74', fontSize: 11, fontWeight: '700', marginBottom: 4 }}>EC MÁXIMO</Text>
        <TextInput
          value={ecMax}
          onChangeText={setEcMax}
          keyboardType="decimal-pad"
          placeholder="Ej: 1.2"
          placeholderTextColor="#3A5040"
          style={inputStyle}
        />

        <View style={{ backgroundColor: '#1A3D1E', borderRadius: 16, borderWidth: 1, borderColor: '#2A5A2E', padding: 12, marginBottom: 20, alignItems: 'center', marginTop: 16 }}>
          <Text style={{ color: '#52CC64', fontSize: 14, fontWeight: '700' }}>🧪 PH - Potencial de hidrógeno</Text>
        </View>

        <Text style={{ color: '#728C74', fontSize: 11, fontWeight: '700', marginBottom: 4 }}>PH MÍNIMO</Text>
        <TextInput
          value={phMin}
          onChangeText={setPhMin}
          keyboardType="decimal-pad"
          placeholder="Ej: 5.5"
          placeholderTextColor="#3A5040"
          style={inputStyle}
        />

        <Text style={{ color: '#728C74', fontSize: 11, fontWeight: '700', marginBottom: 4 }}>PH MÁXIMO</Text>
        <TextInput
          value={phMax}
          onChangeText={setPhMax}
          keyboardType="decimal-pad"
          placeholder="Ej: 6.5"
          placeholderTextColor="#3A5040"
          style={inputStyle}
        />

        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          style={{
            backgroundColor: '#52CC64',
            borderRadius: 12,
            paddingVertical: 16,
            alignItems: 'center',
            opacity: saving ? 0.4 : 1,
          }}
        >
          {saving
            ? <ActivityIndicator color="white" size="small" />
            : <Text style={{ color: 'white', fontWeight: '800', fontSize: 16 }}>Registrar medida</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}