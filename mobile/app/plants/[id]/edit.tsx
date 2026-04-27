import { useState, useEffect } from 'react'
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useNutritionTables } from '@/hooks/useNutritionTables'

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
  const [selectedTableId, setSelectedTableId]   = useState('')
  const [availableProducts, setAvailableProducts] = useState<string[] | null>(null)

  const { tables, loading: tablesLoading } = useNutritionTables()

  useEffect(() => {
    async function load() {
      if (!id || !user) return
      const { data } = await supabase
        .from('plants')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .maybeSingle()
      if (data) {
        setName(data.name)
        setGenetics(data.genetics)
        setGeneticType((data.genetic_type as GeneticType) ?? 'feminized')
        setSex((data.sex as PlantSex) ?? 'unknown')
        setAutoFlowerTotalDays(String(data.auto_flower_total_days ?? 77))
        setStartDate(data.start_date ?? '')
        setSelectedTableId(data.nutrition_table_id || '')
        setAvailableProducts(data.available_products ? [...data.available_products] : null)
        setLocation(data.location ?? 'indoor')
        setPotCount(String(data.pot_count ?? 1))
        setPotVolumeLiters(String(data.pot_volume_liters ?? 11))
        setNotes(data.notes ?? '')
      }
      setLoading(false)
    }
    load()
  }, [id, user])

  useEffect(() => {
    if (tables.length > 0 && !selectedTableId) {
      setSelectedTableId(tables[0].id)
    }
  }, [tables, selectedTableId])

  async function handleDelete() {
    Alert.alert(
      'Eliminar planta',
      '¿Seguro? Esta accion no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            if (!id || !user) return
            await supabase.from('scheduled_tasks').delete().eq('plant_id', id)
            await supabase.from('plants').delete().eq('id', id).eq('user_id', user.id)
            router.replace('/(tabs)/plants')
          },
        },
      ]
    )
  }

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
          nutrition_table_id:   selectedTableId,
          available_products:   availableProducts,
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

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
          <View style={{ flex: 1 }}>
            <Text style={lbl}>CANTIDAD</Text>
            <StepperField
              value={parseInt(potCount) || 1}
              min={1} max={20} step={1}
              onChange={v => setPotCount(String(v))}
              unit=""
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={lbl}>LITROS / MACETA</Text>
            <StepperField
              value={parseInt(potVolumeLiters) || 11}
              min={1} max={200} step={1}
              onChange={v => setPotVolumeLiters(String(v))}
              unit="L"
            />
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

        {/* Tabla nutricional */}
        <Text style={[lbl, { marginTop: 20 }]}>Tabla nutricional</Text>
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
          <View style={{ marginBottom: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={lbl}>Productos (opcional)</Text>
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

        {/* Aviso regeneracion — si cambia tabla o fecha */}
        {selectedTableId && (
          <View style={{
            marginBottom: 20, backgroundColor: '#2A2200', borderRadius: 12,
            borderWidth: 1, borderColor: '#5C4400', padding: 12,
          }}>
            <Text style={{ color: '#FFD166', fontSize: 13 }}>
              ⚠️ Cambiar tabla o fecha regenera el calendario
            </Text>
          </View>
        )}

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

        <TouchableOpacity
          onPress={handleDelete}
          style={{ marginTop: 16, paddingVertical: 16, alignItems: 'center' }}
        >
          <Text style={{ color: '#EF4444', fontWeight: '700', fontSize: 15 }}>🗑 Eliminar planta</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

function StepperField({ value, min, max, step, onChange, unit }: { value: number; min: number; max: number; step: number; onChange: (v: number) => void; unit: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#131D14', borderWidth: 1, borderColor: '#1C2E1E', borderRadius: 16, overflow: 'hidden' }}>
      <TouchableOpacity
        onPress={() => onChange(Math.max(min, value - step))}
        style={{ width: 44, height: 48, alignItems: 'center', justifyContent: 'center', borderRightWidth: 1, borderRightColor: '#1C2E1E' }}
      >
        <Text style={{ color: value <= min ? '#2D4A30' : '#52CC64', fontSize: 22, fontWeight: '700', lineHeight: 24 }}>−</Text>
      </TouchableOpacity>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', height: 48 }}>
        <Text style={{ color: '#E4F2E7', fontSize: 16, fontWeight: '900' }}>{value}{unit}</Text>
      </View>
      <TouchableOpacity
        onPress={() => onChange(Math.min(max, value + step))}
        style={{ width: 44, height: 48, alignItems: 'center', justifyContent: 'center', borderLeftWidth: 1, borderLeftColor: '#1C2E1E' }}
      >
        <Text style={{ color: value >= max ? '#2D4A30' : '#52CC64', fontSize: 22, fontWeight: '700', lineHeight: 24 }}>+</Text>
      </TouchableOpacity>
    </View>
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
