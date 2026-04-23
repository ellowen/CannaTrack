import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { generatePlantSchedule } from '@shared/lib/nutrition-engine'
import { REVEGETAR_TABLE } from '@shared/data/revegetar-table'
import { TOPCROP_TABLE } from '@shared/data/topcrop-table'
import type { Plant } from '@shared/types/plant'

type GeneticType = 'feminized' | 'autoflower' | 'regular'
type Location    = 'indoor' | 'outdoor'

const TOTAL_STEPS = 6

export default function OnboardingScreen() {
  const { user } = useAuth()
  const [step, setStep]               = useState(0)
  const [plantName, setPlantName]     = useState('')
  const [genetics, setGenetics]       = useState('')
  const [geneticType, setGeneticType] = useState<GeneticType>('feminized')
  const [location, setLocation]       = useState<Location>('indoor')
  const [loading, setLoading]         = useState(false)
  const [autoFlowerTotalDays, setAutoFlowerTotalDays] = useState('77')
  const [sex, setSex] = useState<'female' | 'male' | 'unknown'>('unknown')
  const [nutritionTableId, setNutritionTableId] = useState<'revegetar' | 'topcrop-v1'>('revegetar')

  function canAdvance() {
    if (step === 1) return plantName.trim().length > 0
    if (step === 2) return genetics.trim().length > 0
    return true
  }

  async function handleFinish() {
    if (!user) return
    setLoading(true)
    try {
      const startDate = new Date()

      const { data: plantRow, error: plantErr } = await supabase
        .from('plants')
        .insert({
          user_id:            user.id,
          name:               plantName.trim(),
          genetics:           genetics.trim(),
          genetic_type:       geneticType,
          start_date:         startDate.toISOString().split('T')[0],
          location,
          pot_count:          1,
          pot_volume_liters:  11,
          nutrition_table_id: nutritionTableId,
          auto_flower_total_days: geneticType === 'autoflower' ? parseInt(autoFlowerTotalDays) || 77 : null,
          sex: geneticType === 'regular' ? sex : null,
          available_products: [],
        })
        .select()
        .single()

      if (plantErr || !plantRow) throw plantErr ?? new Error('Error al crear la planta')

      const plant: Plant = {
        id:               plantRow.id,
        name:             plantRow.name,
        genetics:         plantRow.genetics,
        geneticType,
        sex:              geneticType === 'regular' ? sex : 'unknown',
        autoFlowerTotalDays: geneticType === 'autoflower' ? parseInt(autoFlowerTotalDays) || 77 : undefined,
        startDate,
        location,
        potCount:         1,
        potVolumeLiters:  11,
        nutritionTableId,
        availableProducts: [],
        status:           'active',
      }

      const table = nutritionTableId === 'topcrop-v1' ? TOPCROP_TABLE : REVEGETAR_TABLE
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
            ec_min:         t.ecMin ?? null,
            ec_max:         t.ecMax ?? null,
            ph_min:         t.phMin ?? null,
            ph_max:         t.phMax ?? null,
          }))
        )
      }

      await supabase
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('id', user.id)

      router.replace(`/plants/${plantRow.id}`)
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo crear la planta')
    } finally {
      setLoading(false)
    }
  }

  function handleNext() {
    if (step < TOTAL_STEPS - 1) setStep(step + 1)
    else handleFinish()
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0C1410' }}>
      {/* Barra de progreso */}
      <View style={{ height: 3, backgroundColor: '#1C2E1E', marginHorizontal: 20, marginTop: 16, borderRadius: 2 }}>
        <View style={{ height: '100%', backgroundColor: '#52CC64', width: `${((step + 1) / TOTAL_STEPS) * 100}%`, borderRadius: 2 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ flex: 1, padding: 24, justifyContent: 'space-between' }}
        scrollEnabled={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ flex: 1, justifyContent: 'center' }}>

          {/* PASO 0: Bienvenida */}
          {step === 0 && (
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 80, marginBottom: 24 }}>🌱</Text>
              <Text style={{ color: '#E4F2E7', fontSize: 28, fontWeight: '900', textAlign: 'center', marginBottom: 12 }}>
                Bienvenido a CannaTrack
              </Text>
              <Text style={{ color: '#728C74', fontSize: 16, textAlign: 'center', lineHeight: 24 }}>
                Vamos a configurar tu primera planta.{'\n'}Te lleva menos de un minuto.
              </Text>
            </View>
          )}

          {/* PASO 1: Nombre de la planta */}
          {step === 1 && (
            <View>
              <Text style={{ color: '#728C74', fontSize: 11, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 20 }}>
                PASO 1 DE {TOTAL_STEPS - 1}
              </Text>
              <Text style={{ color: '#E4F2E7', fontSize: 24, fontWeight: '900', marginBottom: 8 }}>
                Como se llama tu planta?
              </Text>
              <Text style={{ color: '#728C74', fontSize: 14, marginBottom: 28 }}>
                Puede ser un apodo o nombre descriptivo
              </Text>
              <TextInput
                value={plantName}
                onChangeText={setPlantName}
                placeholder="Ej: White Widow #1"
                placeholderTextColor="#3A5040"
                autoFocus
                style={{
                  backgroundColor: '#131D14', borderWidth: 1,
                  borderColor: plantName ? '#52CC64' : '#1C2E1E',
                  borderRadius: 16, paddingHorizontal: 16, paddingVertical: 16,
                  color: '#E4F2E7', fontSize: 18, fontWeight: '700',
                }}
              />
            </View>
          )}

          {/* PASO 2: Genetica */}
          {step === 2 && (
            <View>
              <Text style={{ color: '#728C74', fontSize: 11, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 20 }}>
                PASO 2 DE {TOTAL_STEPS - 1}
              </Text>
              <Text style={{ color: '#E4F2E7', fontSize: 24, fontWeight: '900', marginBottom: 8 }}>
                Que genetica es?
              </Text>
              <Text style={{ color: '#728C74', fontSize: 14, marginBottom: 28 }}>
                La variedad o cruce de la planta
              </Text>
              <TextInput
                value={genetics}
                onChangeText={setGenetics}
                placeholder="Ej: White Widow, OG Kush..."
                placeholderTextColor="#3A5040"
                autoFocus
                style={{
                  backgroundColor: '#131D14', borderWidth: 1,
                  borderColor: genetics ? '#52CC64' : '#1C2E1E',
                  borderRadius: 16, paddingHorizontal: 16, paddingVertical: 16,
                  color: '#E4F2E7', fontSize: 18, fontWeight: '700',
                }}
              />
            </View>
          )}

          {/* PASO 3: Tipo de genetica */}
          {step === 3 && (
            <View>
              <Text style={{ color: '#728C74', fontSize: 11, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 20 }}>
                PASO 3 DE {TOTAL_STEPS - 1}
              </Text>
              <Text style={{ color: '#E4F2E7', fontSize: 24, fontWeight: '900', marginBottom: 8 }}>
                Tipo de planta
              </Text>
              <Text style={{ color: '#728C74', fontSize: 14, marginBottom: 28 }}>
                Esto define como se genera el calendario
              </Text>
              <View style={{ gap: 10 }}>
                {([
                  { value: 'feminized', label: 'Feminizada', desc: 'Floración manual - vos decides cuando' },
                  { value: 'autoflower', label: 'Autofloreciente', desc: 'Florece sola a las 5 semanas' },
                  { value: 'regular', label: 'Regular', desc: 'Puede ser macho o hembra' },
                ] as { value: GeneticType; label: string; desc: string }[]).map(opt => (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => setGeneticType(opt.value)}
                    style={{
                      borderRadius: 16, padding: 16,
                      backgroundColor: geneticType === opt.value ? '#1A3D1E' : '#131D14',
                      borderWidth: 1,
                      borderColor: geneticType === opt.value ? '#52CC64' : '#1C2E1E',
                    }}
                  >
                    <Text style={{ color: geneticType === opt.value ? '#52CC64' : '#E4F2E7', fontWeight: '800', fontSize: 15 }}>
                      {opt.label}
                    </Text>
                    <Text style={{ color: '#728C74', fontSize: 12, marginTop: 3 }}>{opt.desc}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Dias totales para autofloreciente */}
              {geneticType === 'autoflower' && (
                <View style={{ marginTop: 16 }}>
                  <Text style={{ color: '#728C74', fontSize: 11, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8 }}>
                    Dias totales del ciclo
                  </Text>
                  <TextInput
                    value={autoFlowerTotalDays}
                    onChangeText={setAutoFlowerTotalDays}
                    keyboardType="number-pad"
                    placeholder="77"
                    placeholderTextColor="#3A5040"
                    style={{
                      backgroundColor: '#131D14', borderWidth: 1, borderColor: '#1C2E1E',
                      borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
                      color: '#E4F2E7', fontSize: 15,
                    }}
                  />
                  <Text style={{ color: '#3A5040', fontSize: 11, marginTop: 4 }}>
                    Tipico: 70-84 dias desde germinacion
                  </Text>
                </View>
              )}

              {/* Sexo para regular */}
              {geneticType === 'regular' && (
                <View style={{ marginTop: 16 }}>
                  <Text style={{ color: '#728C74', fontSize: 11, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8 }}>
                    Sexo (opcional)
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {([
                      { value: 'female', label: 'Hembra', color: '#52CC64' },
                      { value: 'male',   label: 'Macho',  color: '#3B82F6' },
                      { value: 'unknown', label: 'No se',  color: '#728C74' },
                    ] as const).map(opt => (
                      <TouchableOpacity
                        key={opt.value}
                        onPress={() => setSex(opt.value)}
                        style={{
                          flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center',
                          backgroundColor: sex === opt.value ? '#1A3D1E' : '#131D14',
                          borderWidth: 1,
                          borderColor: sex === opt.value ? opt.color : '#1C2E1E',
                        }}
                      >
                        <Text style={{ color: sex === opt.value ? opt.color : '#728C74', fontWeight: '800', fontSize: 13 }}>
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </View>
          )}

          {/* PASO 4: Ubicacion */}
          {step === 4 && (
            <View>
              <Text style={{ color: '#728C74', fontSize: 11, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 20 }}>
                PASO 4 DE {TOTAL_STEPS - 1}
              </Text>
              <Text style={{ color: '#E4F2E7', fontSize: 24, fontWeight: '900', marginBottom: 8 }}>
                Donde esta tu planta?
              </Text>
              <Text style={{ color: '#728C74', fontSize: 14, marginBottom: 28 }}>
                Esto afecta las condiciones recomendadas
              </Text>
              <View style={{ gap: 10 }}>
                {([
                  { value: 'indoor', label: '🏠 Indoor', desc: 'Ambiente controlado - luz artificial' },
                  { value: 'outdoor', label: '☀️ Outdoor', desc: 'Luz natural - ciclos del sol' },
                ] as { value: Location; label: string; desc: string }[]).map(opt => (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => setLocation(opt.value)}
                    style={{
                      borderRadius: 16, padding: 20,
                      backgroundColor: location === opt.value ? '#1A3D1E' : '#131D14',
                      borderWidth: 1,
                      borderColor: location === opt.value ? '#52CC64' : '#1C2E1E',
                    }}
                  >
                    <Text style={{ color: location === opt.value ? '#52CC64' : '#E4F2E7', fontWeight: '800', fontSize: 16 }}>
                      {opt.label}
                    </Text>
                    <Text style={{ color: '#728C74', fontSize: 12, marginTop: 4 }}>{opt.desc}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* PASO 5: Tabla nutricional */}
          {step === 5 && (
            <View>
              <Text style={{ color: '#728C74', fontSize: 11, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 20 }}>
                PASO 5 DE {TOTAL_STEPS - 1}
              </Text>
              <Text style={{ color: '#E4F2E7', fontSize: 24, fontWeight: '900', marginBottom: 8 }}>
                Que tabla usas?
              </Text>
              <Text style={{ color: '#728C74', fontSize: 14, marginBottom: 28 }}>
                Selecciona los fertilizantes que vas a usar
              </Text>
              <View style={{ gap: 10 }}>
                {([
                  { id: 'revegetar',  label: 'REVEGETAR', sub: 'BIO · ECO · LIFE · FUEL', desc: 'Tabla de cultivo REVEGETAR' },
                  { id: 'topcrop-v1', label: 'Top Crop',  sub: 'PRO · MID · BASIC',       desc: 'Tabla de cultivo Top Crop' },
                ] as const).map(opt => (
                  <TouchableOpacity
                    key={opt.id}
                    onPress={() => setNutritionTableId(opt.id)}
                    style={{
                      borderRadius: 16, padding: 16,
                      backgroundColor: nutritionTableId === opt.id ? '#1A3D1E' : '#131D14',
                      borderWidth: 1,
                      borderColor: nutritionTableId === opt.id ? '#52CC64' : '#1C2E1E',
                      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                    }}
                  >
                    <View>
                      <Text style={{ color: nutritionTableId === opt.id ? '#52CC64' : '#E4F2E7', fontWeight: '800', fontSize: 15 }}>
                        {opt.label}
                      </Text>
                      <Text style={{ color: '#728C74', fontSize: 12, marginTop: 3 }}>{opt.sub}</Text>
                    </View>
                    {nutritionTableId === opt.id && <Text style={{ color: '#52CC64', fontSize: 18 }}>✓</Text>}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

        </View>

        {/* Botones */}
        <View style={{ gap: 10, paddingBottom: 8 }}>
          <TouchableOpacity
            onPress={handleNext}
            disabled={!canAdvance() || loading}
            style={{
              backgroundColor: '#52CC64', borderRadius: 18,
              paddingVertical: 18, alignItems: 'center',
              opacity: (!canAdvance() || loading) ? 0.4 : 1,
            }}
          >
            {loading
              ? <ActivityIndicator color="white" />
              : <Text style={{ color: '#0C1410', fontWeight: '900', fontSize: 16 }}>
                  {step === TOTAL_STEPS - 1 ? 'Crear mi planta →' : 'Siguiente →'}
                </Text>
            }
          </TouchableOpacity>
          {step > 0 && !loading && (
            <TouchableOpacity
              onPress={() => setStep(step - 1)}
              style={{ paddingVertical: 14, alignItems: 'center' }}
            >
              <Text style={{ color: '#728C74', fontSize: 14 }}>← Atras</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
