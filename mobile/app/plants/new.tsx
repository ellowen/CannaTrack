import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { generatePlantSchedule } from '@shared/lib/nutrition-engine'
import { REVEGETAR_TABLE } from '@shared/data/revegetar-table'
import type { Plant } from '@shared/types/plant'

type GeneticType = 'feminized' | 'autoflower' | 'regular'

export default function NewPlantScreen() {
  const { user } = useAuth()
  const [name, setName]               = useState('')
  const [genetics, setGenetics]       = useState('')
  const [geneticType, setGeneticType] = useState<GeneticType>('feminized')
  const [location, setLocation]       = useState<'indoor' | 'outdoor'>('indoor')
  const [potCount, setPotCount]       = useState('1')
  const [potVolume, setPotVolume]     = useState('11')
  const [loading, setLoading]         = useState(false)

  async function handleCreate() {
    if (!name.trim() || !genetics.trim() || !user) return
    setLoading(true)
    try {
      const startDate = new Date()

      // Insertar planta
      const { data: plantRow, error: plantErr } = await supabase
        .from('plants')
        .insert({
          user_id:           user.id,
          name:              name.trim(),
          genetics:          genetics.trim(),
          genetic_type:      geneticType,
          start_date:        startDate.toISOString().split('T')[0],
          nutrition_table_id: 'revegetar',
          available_products: [],
          location,
          pot_count:         parseInt(potCount),
          pot_volume_liters: parseFloat(potVolume),
        })
        .select()
        .single()

      if (plantErr || !plantRow) throw plantErr

      // Generar calendario con el motor (el mismo de la web)
      const plant: Plant = {
        id:               plantRow.id,
        name:             plantRow.name,
        genetics:         plantRow.genetics,
        geneticType,
        sex:              'unknown',
        startDate,
        location,
        potCount:         parseInt(potCount),
        potVolumeLiters:  parseFloat(potVolume),
        nutritionTableId: 'revegetar',
        availableProducts: [],
        status:           'active',
      }

      const tasks = generatePlantSchedule(plant, REVEGETAR_TABLE)

      // Insertar tareas generadas en batch
      if (tasks.length > 0) {
        await supabase.from('scheduled_tasks').insert(
          tasks.map(t => ({
            user_id:        user.id,
            plant_id:       plantRow.id,
            type:           t.type,
            scheduled_date: t.scheduledDate.toISOString().split('T')[0],
            cycle:          t.cycle,
            week:           t.week,
            stage:          t.stage,
            products:       t.products,
            ec_min:         t.ecMin,
            ec_max:         t.ecMax,
            ph_min:         t.phMin,
            ph_max:         t.phMax,
          }))
        )
      }

      router.replace(`/plants/${plantRow.id}`)
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Error al crear la planta')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0C1410' }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>

        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 28 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
            <Text style={{ color: '#52CC64', fontSize: 28, lineHeight: 32 }}>←</Text>
          </TouchableOpacity>
          <View>
            <Text style={{ color: '#E4F2E7', fontSize: 22, fontWeight: '900' }}>Nueva planta</Text>
            <Text style={{ color: '#728C74', fontSize: 13 }}>El calendario se genera automaticamente</Text>
          </View>
        </View>

        {/* Nombre */}
        <Text style={labelStyle}>NOMBRE *</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Ej: White Widow #1"
          placeholderTextColor="#3A5040"
          style={inputStyle}
        />

        {/* Genetica */}
        <Text style={[labelStyle, { marginTop: 16 }]}>GENETICA *</Text>
        <TextInput
          value={genetics}
          onChangeText={setGenetics}
          placeholder="Ej: White Widow"
          placeholderTextColor="#3A5040"
          style={inputStyle}
        />

        {/* Tipo */}
        <Text style={[labelStyle, { marginTop: 16 }]}>TIPO</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {(['feminized', 'autoflower', 'regular'] as GeneticType[]).map(t => (
            <TouchableOpacity
              key={t}
              onPress={() => setGeneticType(t)}
              style={{
                flex: 1, paddingVertical: 12, borderRadius: 14, alignItems: 'center',
                backgroundColor: geneticType === t ? '#1A3D1E' : '#131D14',
                borderWidth: 1,
                borderColor: geneticType === t ? '#52CC64' : '#1C2E1E',
              }}
            >
              <Text style={{ color: geneticType === t ? '#52CC64' : '#728C74', fontWeight: '700', fontSize: 13 }}>
                {t === 'feminized' ? 'Feminizada' : t === 'autoflower' ? 'Auto' : 'Regular'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Ubicacion */}
        <Text style={[labelStyle, { marginTop: 16 }]}>UBICACION</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 0 }}>
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

        {/* Cantidad y volumen de macetas */}
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
          <View style={{ flex: 1 }}>
            <Text style={labelStyle}>CANTIDAD DE MACETAS</Text>
            <TextInput
              value={potCount}
              onChangeText={setPotCount}
              keyboardType="number-pad"
              placeholderTextColor="#3A5040"
              style={inputStyle}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={labelStyle}>VOLUMEN (LITROS)</Text>
            <TextInput
              value={potVolume}
              onChangeText={setPotVolume}
              keyboardType="decimal-pad"
              placeholderTextColor="#3A5040"
              style={inputStyle}
            />
          </View>
        </View>

        {/* Boton */}
        <TouchableOpacity
          onPress={handleCreate}
          disabled={!name.trim() || !genetics.trim() || loading}
          style={{
            marginTop: 36, backgroundColor: '#52CC64', borderRadius: 18,
            paddingVertical: 18, alignItems: 'center',
            opacity: (!name.trim() || !genetics.trim() || loading) ? 0.4 : 1,
          }}
        >
          {loading
            ? <ActivityIndicator color="white" />
            : <Text style={{ color: 'white', fontWeight: '800', fontSize: 16 }}>Crear planta →</Text>
          }
        </TouchableOpacity>
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
  marginBottom: 8,
}

const inputStyle = {
  backgroundColor: '#131D14',
  borderWidth: 1,
  borderColor: '#1C2E1E',
  borderRadius: 16,
  paddingHorizontal: 16,
  paddingVertical: 14,
  color: '#E4F2E7',
  fontSize: 15,
}
