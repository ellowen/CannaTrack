import { useState, useEffect } from 'react'
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

type GeneticType = 'feminized' | 'autoflower' | 'regular'
type PlantSex = 'female' | 'male' | 'unknown'

export default function EditPlantScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { user } = useAuth()
  const [name, setName]                         = useState('')
  const [genetics, setGenetics]                 = useState('')
  const [geneticType, setGeneticType]           = useState<GeneticType>('feminized')
  const [sex, setSex]                           = useState<PlantSex>('unknown')
  const [autoFlowerTotalDays, setAutoFlowerTotalDays] = useState('77')
  const [startDate, setStartDate]               = useState('')
  const [location, setLocation]                 = useState<'indoor' | 'outdoor'>('indoor')
  const [potCount, setPotCount]                 = useState('1')
  const [potVolumeLiters, setPotVolumeLiters]   = useState('11')
  const [notes, setNotes]                       = useState('')
  const [loading, setLoading]                   = useState(true)
  const [saving, setSaving]                     = useState(false)

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
        setGeneticType((data.genetic_type as GeneticType) ?? 'feminized')
        setSex((data.sex as PlantSex) ?? 'unknown')
        setAutoFlowerTotalDays(String(data.auto_flower_total_days ?? 77))
        setStartDate(data.start_date ?? '')
        setLocation(data.location ?? 'indoor')
        setPotCount(String(data.pot_count ?? 1))
        setPotVolumeLiters(String(data.pot_volume_liters ?? 11))
        setNotes(data.notes ?? '')
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
          name:                 name.trim(),
          genetics:             genetics.trim(),
          genetic_type:         geneticType,
          sex:                  geneticType === 'regular' ? sex : null,
          auto_flower_total_days: geneticType === 'autoflower' ? parseInt(autoFlowerTotalDays) || 77 : null,
          start_date:           startDate || null,
          location,
          pot_count:            parseInt(potCount) || 1,
          pot_volume_liters:    parseFloat(potVolumeLiters) || 11,
          notes:                notes.trim() || null,
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0C1410' }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 28 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
            <Text style={{ color: '#52CC64', fontSize: 28 }}>←</Text>
          </TouchableOpacity>
          <Text style={{ color: '#E4F2E7', fontSize: 22, fontWeight: '900' }}>Editar planta</Text>
        </View>

        <Text style={lbl}>NOMBRE</Text>
        <TextInput value={name} onChangeText={setName} placeholderTextColor="#3A5040" style={inp} />

        <Text style={[lbl, { marginTop: 16 }]}>GENETICA</Text>
        <TextInput value={genetics} onChangeText={setGenetics} placeholderTextColor="#3A5040" style={inp} />

        {/* Tipo de genetica */}
        <Text style={[lbl, { marginTop: 16 }]}>TIPO</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {(['feminized', 'autoflower', 'regular'] as GeneticType[]).map(t => (
            <TouchableOpacity
              key={t}
              onPress={() => setGeneticType(t)}
              style={{
                flex: 1, paddingVertical: 12, borderRadius: 14, alignItems: 'center',
                backgroundColor: geneticType === t ? '#1A3D1E' : '#131D14',
                borderWidth: 1, borderColor: geneticType === t ? '#52CC64' : '#1C2E1E',
              }}
            >
              <Text style={{ color: geneticType === t ? '#52CC64' : '#728C74', fontWeight: '700', fontSize: 13 }}>
                {t === 'feminized' ? 'Feminizada' : t === 'autoflower' ? 'Auto' : 'Regular'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Dias totales — solo autoflower */}
        {geneticType === 'autoflower' && (
          <View style={{ marginTop: 16 }}>
            <Text style={lbl}>DIAS TOTALES DE CULTIVO</Text>
            <TextInput
              value={autoFlowerTotalDays}
              onChangeText={setAutoFlowerTotalDays}
              keyboardType="number-pad"
              placeholderTextColor="#3A5040"
              style={inp}
            />
            <Text style={{ color: '#3A5040', fontSize: 12, marginTop: 6 }}>Tipico: 70-80 dias desde germinacion</Text>
          </View>
        )}

        {/* Sexo — solo regular */}
        {geneticType === 'regular' && (
          <View style={{ marginTop: 16 }}>
            <Text style={lbl}>SEXO</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                onPress={() => setSex('female')}
                style={{
                  flex: 1, paddingVertical: 12, borderRadius: 14, alignItems: 'center',
                  backgroundColor: sex === 'female' ? '#1A3D1E' : '#131D14',
                  borderWidth: 1, borderColor: sex === 'female' ? '#52CC64' : '#1C2E1E',
                }}
              >
                <Text style={{ color: sex === 'female' ? '#52CC64' : '#728C74', fontWeight: '700', fontSize: 13 }}>
                  Hembra
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setSex('male')}
                style={{
                  flex: 1, paddingVertical: 12, borderRadius: 14, alignItems: 'center',
                  backgroundColor: sex === 'male' ? '#1A2B3D' : '#131D14',
                  borderWidth: 1, borderColor: sex === 'male' ? '#4A90D9' : '#1C2E1E',
                }}
              >
                <Text style={{ color: sex === 'male' ? '#4A90D9' : '#728C74', fontWeight: '700', fontSize: 13 }}>
                  Macho
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setSex('unknown')}
                style={{
                  flex: 1, paddingVertical: 12, borderRadius: 14, alignItems: 'center',
                  backgroundColor: sex === 'unknown' ? '#1E1E1E' : '#131D14',
                  borderWidth: 1, borderColor: sex === 'unknown' ? '#555555' : '#1C2E1E',
                }}
              >
                <Text style={{ color: sex === 'unknown' ? '#AAAAAA' : '#728C74', fontWeight: '700', fontSize: 13 }}>
                  Desconocido
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Fecha de inicio */}
        <Text style={[lbl, { marginTop: 16 }]}>FECHA DE INICIO</Text>
        <TextInput
          value={startDate}
          onChangeText={setStartDate}
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#3A5040"
          style={inp}
        />

        {/* Aviso regeneracion — aparece cuando cambia geneticType o startDate */}
        <View style={{
          marginTop: 10, backgroundColor: '#2A2200', borderRadius: 12,
          borderWidth: 1, borderColor: '#5C4400', padding: 12,
        }}>
          <Text style={{ color: '#FFD166', fontSize: 13 }}>
            ⚠️ Cambiar esto regenera el calendario de nutricion
          </Text>
        </View>

        <Text style={[lbl, { marginTop: 16 }]}>UBICACION</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {(['indoor', 'outdoor'] as const).map(l => (
            <TouchableOpacity
              key={l}
              onPress={() => setLocation(l)}
              style={{
                flex: 1, paddingVertical: 12, borderRadius: 14, alignItems: 'center',
                backgroundColor: location === l ? '#1A3D1E' : '#131D14',
                borderWidth: 1, borderColor: location === l ? '#52CC64' : '#1C2E1E',
              }}
            >
              <Text style={{ color: location === l ? '#52CC64' : '#728C74', fontWeight: '700', fontSize: 13 }}>
                {l === 'indoor' ? '🏠 Indoor' : '☀️ Outdoor'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
          <View style={{ flex: 1 }}>
            <Text style={lbl}>CANTIDAD</Text>
            <TextInput value={potCount} onChangeText={setPotCount} keyboardType="number-pad" placeholderTextColor="#3A5040" style={inp} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={lbl}>LITROS</Text>
            <TextInput value={potVolumeLiters} onChangeText={setPotVolumeLiters} keyboardType="decimal-pad" placeholderTextColor="#3A5040" style={inp} />
          </View>
        </View>

        <Text style={[lbl, { marginTop: 16 }]}>NOTAS</Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="Observaciones sobre esta planta..."
          placeholderTextColor="#3A5040"
          multiline
          style={[inp, { minHeight: 80, textAlignVertical: 'top' }]}
        />

        <TouchableOpacity
          onPress={handleSave}
          disabled={!name.trim() || !genetics.trim() || saving}
          style={{
            marginTop: 28, backgroundColor: '#52CC64', borderRadius: 18,
            paddingVertical: 18, alignItems: 'center',
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

const lbl = {
  color: '#728C74' as const,
  fontSize: 11,
  fontWeight: '700' as const,
  letterSpacing: 1.5,
  textTransform: 'uppercase' as const,
  marginBottom: 8,
}

const inp = {
  backgroundColor: '#131D14',
  borderWidth: 1,
  borderColor: '#1C2E1E',
  borderRadius: 16,
  paddingHorizontal: 16,
  paddingVertical: 14,
  color: '#E4F2E7',
  fontSize: 15,
}
