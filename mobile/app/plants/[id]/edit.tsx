import { useState, useEffect } from 'react'
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

export default function EditPlantScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { user } = useAuth()
  const [name, setName] = useState('')
  const [genetics, setGenetics] = useState('')
  const [location, setLocation] = useState<'indoor' | 'outdoor'>('indoor')
  const [potsCount, setPotsCount] = useState('1')
  const [potLiters, setPotLiters] = useState('11')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      if (!id || !user) return
      const { data } = await supabase
        .from('plants')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single()
      if (data) {
        setName(data.name)
        setGenetics(data.genetics)
        setLocation(data.location ?? 'indoor')
        setPotsCount(String(data.pot_count ?? 1))
        setPotLiters(String(data.pot_volume_liters ?? 11))
      }
      setLoading(false)
    }
    load()
  }, [id, user])

  async function handleSave() {
    if (!id || !user || !name.trim() || !genetics.trim()) return
    setSaving(true)
    try {
      await supabase
        .from('plants')
        .update({
          name: name.trim(),
          genetics: genetics.trim(),
          location,
          pot_count: parseInt(potsCount),
          pot_volume_liters: parseInt(potLiters),
        })
        .eq('id', id)
        .eq('user_id', user.id)
      router.back()
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0C1410', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#52CC64" size="large" />
      </SafeAreaView>
    )
  }

  const inputStyle = { backgroundColor: '#131D14', borderWidth: 1, borderColor: '#1C2E1E', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, color: '#E4F2E7', fontSize: 15, marginBottom: 16 }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0C1410' }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 28 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
            <Text style={{ color: '#52CC64', fontSize: 28 }}>←</Text>
          </TouchableOpacity>
          <Text style={{ color: '#E4F2E7', fontSize: 22, fontWeight: '900' }}>Editar planta</Text>
        </View>

        <Text style={{ color: '#728C74', fontSize: 11, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 }}>Nombre</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholderTextColor="#3A5040"
          style={inputStyle}
        />

        <Text style={{ color: '#728C74', fontSize: 11, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 }}>Genetica</Text>
        <TextInput
          value={genetics}
          onChangeText={setGenetics}
          placeholderTextColor="#3A5040"
          style={inputStyle}
        />

        <Text style={{ color: '#728C74', fontSize: 11, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 }}>Ubicacion</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
          {(['indoor', 'outdoor'] as const).map(l => (
            <TouchableOpacity
              key={l}
              onPress={() => setLocation(l)}
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: 14,
                alignItems: 'center',
                backgroundColor: location === l ? '#1A3D1E' : '#131D14',
                borderWidth: 1,
                borderColor: location === l ? '#52CC64' : '#1C2E1E',
              }}
            >
              <Text style={{ color: location === l ? '#52CC64' : '#728C74', fontWeight: '700', fontSize: 13 }}>
                {l === 'indoor' ? '🏠 Indoor' : '☀️ Outdoor'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#728C74', fontSize: 11, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 }}>Cantidad</Text>
            <TextInput
              value={potsCount}
              onChangeText={setPotsCount}
              keyboardType="number-pad"
              placeholderTextColor="#3A5040"
              style={inputStyle}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#728C74', fontSize: 11, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 }}>Litros</Text>
            <TextInput
              value={potLiters}
              onChangeText={setPotLiters}
              keyboardType="number-pad"
              placeholderTextColor="#3A5040"
              style={inputStyle}
            />
          </View>
        </View>

        <TouchableOpacity
          onPress={handleSave}
          disabled={!name.trim() || !genetics.trim() || saving}
          style={{
            backgroundColor: '#52CC64',
            borderRadius: 18,
            paddingVertical: 18,
            alignItems: 'center',
            opacity: (!name.trim() || !genetics.trim() || saving) ? 0.4 : 1,
          }}
        >
          {saving
            ? <ActivityIndicator color="white" />
            : <Text style={{ color: 'white', fontWeight: '800', fontSize: 16 }}>Guardar →</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}
