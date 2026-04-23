import { useState, useEffect } from 'react'
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useNutritionTables } from '@/hooks/useNutritionTables'
import { generatePlantSchedule } from '@shared/lib/nutrition-engine'
import type { Plant } from '@shared/types/plant'

type GeneticType = 'feminized' | 'autoflower' | 'regular'
type PlantSex = 'female' | 'male' | 'unknown'

export default function NewPlantScreen() {
  const { user } = useAuth()
  const [name, setName]                         = useState('')
  const [genetics, setGenetics]                 = useState('')
  const [geneticType, setGeneticType]           = useState<GeneticType>('feminized')
  const [sex, setSex]                           = useState<PlantSex>('unknown')
  const [autoFlowerTotalDays, setAutoFlowerTotalDays] = useState('77')
  const [location, setLocation]                 = useState<'indoor' | 'outdoor'>('indoor')
  const [potCount, setPotCount]                 = useState('1')
  const [potVolume, setPotVolume]               = useState('11')
  const [loading, setLoading]                   = useState(false)
  const [selectedTableId, setSelectedTableId]   = useState('')
  const [availableProducts, setAvailableProducts] = useState<string[] | null>(null)

  const [isPro, setIsPro] = useState(false)
  const [activePlantCount, setActivePlantCount] = useState<number | null>(null)

  const { tables, loading: tablesLoading } = useNutritionTables()

  useEffect(() => {
    async function checkPro() {
      if (!user) return
      const [{ data: prof }, { count }] = await Promise.all([
        supabase.from('profiles').select('is_pro').eq('id', user.id).single(),
        supabase.from('plants').select('*', { count: 'exact', head: true })
          .eq('user_id', user.id).eq('status', 'active'),
      ])
      setIsPro(prof?.is_pro ?? false)
      setActivePlantCount(count ?? 0)
    }
    checkPro()
  }, [user])

  useEffect(() => {
    if (tables.length > 0 && !selectedTableId) {
      setSelectedTableId(tables[0].id)
    }
  }, [tables, selectedTableId])

  async function handleCreate() {
    if (!name.trim() || !genetics.trim() || !user) return
    setLoading(true)
    try {
      const startDate = new Date()

      const { data: plantRow, error: plantErr } = await supabase
        .from('plants')
        .insert({
          user_id:              user.id,
          name:                 name.trim(),
          genetics:             genetics.trim(),
          genetic_type:         geneticType,
          sex:                  geneticType === 'regular' ? sex : null,
          auto_flower_total_days: geneticType === 'autoflower' ? parseInt(autoFlowerTotalDays) || 77 : null,
          start_date:           startDate.toISOString().split('T')[0],
          nutrition_table_id:   selectedTableId,
          available_products:   availableProducts,
          location,
          pot_count:            parseInt(potCount),
          pot_volume_liters:    parseFloat(potVolume),
        })
        .select()
        .single()

      if (plantErr || !plantRow) throw plantErr

      const plant: Plant = {
        id:                  plantRow.id,
        name:                plantRow.name,
        genetics:            plantRow.genetics,
        geneticType,
        sex:                 geneticType === 'regular' ? sex : 'unknown',
        autoFlowerTotalDays: geneticType === 'autoflower' ? parseInt(autoFlowerTotalDays) || 77 : undefined,
        startDate,
        location,
        potCount:            parseInt(potCount),
        potVolumeLiters:     parseFloat(potVolume),
        nutritionTableId:    selectedTableId,
        availableProducts:   availableProducts ?? undefined,
        status:              'active',
      }

      const table = tables.find(t => t.id === selectedTableId)
      if (!table) throw new Error('Tabla nutricional no encontrada')
      const tasks = generatePlantSchedule(plant, table)

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

  if (activePlantCount === null) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0C1410', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#52CC64" />
      </SafeAreaView>
    )
  }

  if (activePlantCount >= 1 && !isPro) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0C1410', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <Text style={{ fontSize: 48, marginBottom: 16 }}>🌿</Text>
        <Text style={{ color: '#E4F2E7', fontSize: 20, fontWeight: '900', textAlign: 'center', marginBottom: 12 }}>
          Plan gratuito
        </Text>
        <Text style={{ color: '#728C74', fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 32 }}>
          Con el plan gratuito podes tener 1 planta activa.{'\n'}Upgradea a Pro para cultivos ilimitados.
        </Text>
        <View style={{ backgroundColor: '#131D14', borderRadius: 16, borderWidth: 1, borderColor: '#52CC64', padding: 20, width: '100%', alignItems: 'center', marginBottom: 16 }}>
          <Text style={{ color: '#52CC64', fontSize: 16, fontWeight: '900', marginBottom: 4 }}>Pro - USD 5/mes</Text>
          <Text style={{ color: '#728C74', fontSize: 12, textAlign: 'center' }}>Plantas ilimitadas · Todas las tablas · IA</Text>
        </View>
        <TouchableOpacity onPress={() => router.back()} style={{ paddingVertical: 14, alignItems: 'center' }}>
          <Text style={{ color: '#728C74', fontSize: 14 }}>← Volver</Text>
        </TouchableOpacity>
      </SafeAreaView>
    )
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

        {/* Dias totales — solo autoflower */}
        {geneticType === 'autoflower' && (
          <View style={{ marginTop: 16 }}>
            <Text style={labelStyle}>DIAS TOTALES DE CULTIVO</Text>
            <TextInput
              value={autoFlowerTotalDays}
              onChangeText={setAutoFlowerTotalDays}
              keyboardType="number-pad"
              placeholderTextColor="#3A5040"
              style={inputStyle}
            />
            <Text style={{ color: '#3A5040', fontSize: 12, marginTop: 6 }}>Tipico: 70-80 dias desde germinacion</Text>
          </View>
        )}

        {/* Sexo — solo regular */}
        {geneticType === 'regular' && (
          <View style={{ marginTop: 16 }}>
            <Text style={labelStyle}>SEXO</Text>
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

        {/* Tabla nutricional */}
        <Text style={labelStyle}>Tabla nutricional</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12, gap: 8 }}>
          {tables.map(table => (
            <TouchableOpacity
              key={table.id}
              onPress={() => {
                setSelectedTableId(table.id)
                setAvailableProducts(null)
              }}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 10,
                borderRadius: 12,
                backgroundColor: selectedTableId === table.id ? '#1A3D1E' : '#0C1410',
                borderWidth: 1,
                borderColor: selectedTableId === table.id ? '#52CC64' : '#1C2E1E',
                marginRight: 8,
              }}
            >
              <Text style={{ color: selectedTableId === table.id ? '#52CC64' : '#E4F2E7', fontWeight: '700' }}>
                {table.name.split(' ')[0]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Productos */}
        {selectedTableId && tables.find(t => t.id === selectedTableId) && (
          <View style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={labelStyle}>Productos (opcional)</Text>
              <TouchableOpacity
                onPress={() => setAvailableProducts(null)}
                style={{ padding: 4 }}
              >
                <Text style={{ color: '#52CC64', fontSize: 12, fontWeight: '700' }}>
                  {availableProducts === null ? 'Todos' : `${availableProducts.length} seleccionados`}
                </Text>
              </TouchableOpacity>
            </View>

            {(() => {
              const table = tables.find(t => t.id === selectedTableId)
              if (!table) return null

              return (
                <View>
                  {table.lines.map(line => {
                    // Buscar productos de esta línea en cualquier semana
                    const lineProducts = new Set<string>()
                    ;[...table.vegeWeeks, ...table.floraWeeks].forEach(week => {
                      week.products.forEach(p => {
                        if (p.line === line.id) lineProducts.add(p.name)
                      })
                    })

                    return (
                      <View key={line.id} style={{ marginBottom: 12 }}>
                        <Text style={{ color: '#728C74', fontSize: 11, fontWeight: '700', marginBottom: 6 }}>
                          {line.name}
                        </Text>
                        <View style={{ gap: 6 }}>
                          {Array.from(lineProducts).map(productName => (
                            <TouchableOpacity
                              key={productName}
                              onPress={() => {
                                if (availableProducts === null) {
                                  setAvailableProducts([productName])
                                } else if (availableProducts.includes(productName)) {
                                  setAvailableProducts(availableProducts.filter(p => p !== productName))
                                } else {
                                  setAvailableProducts([...availableProducts, productName])
                                }
                              }}
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                paddingHorizontal: 10,
                                paddingVertical: 8,
                                borderRadius: 8,
                                backgroundColor: availableProducts === null || availableProducts.includes(productName) ? '#1A3D1E' : '#0C1410',
                                borderWidth: 1,
                                borderColor: '#1C2E1E',
                              }}
                            >
                              <View
                                style={{
                                  width: 16,
                                  height: 16,
                                  borderRadius: 4,
                                  borderWidth: 2,
                                  borderColor: '#52CC64',
                                  backgroundColor: availableProducts === null || availableProducts.includes(productName) ? '#52CC64' : 'transparent',
                                  marginRight: 8,
                                }}
                              />
                              <Text style={{ color: '#E4F2E7', fontSize: 13, fontWeight: '600', flex: 1 }}>
                                {productName}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    )
                  })}
                </View>
              )
            })()}
          </View>
        )}

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
