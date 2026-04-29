import { useState, useEffect } from 'react'
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import DateTimePicker from '@react-native-community/datetimepicker'
import { supabase } from '@/lib/supabase'
import { usePlan } from '@/hooks/usePlan'
import { useNutritionTables } from '@/hooks/useNutritionTables'
import { generatePlantSchedule } from '@shared/lib/nutrition-engine'
import { BackIcon } from '@/components/icons/AppIcons'
import PaywallModal from '@/components/PaywallModal'
import type { Plant } from '@shared/types/plant'

type GeneticType = 'feminized' | 'autoflower' | 'regular'

const GENETIC_OPTIONS: { value: GeneticType; label: string; emoji: string; desc: string }[] = [
  { value: 'feminized',  label: 'Feminizada',      emoji: '🌸', desc: 'Ciclo de flora manual' },
  { value: 'autoflower', label: 'Autofloreciente',  emoji: '⚡', desc: '77 dias en total' },
  { value: 'regular',    label: 'Regular',          emoji: '🌿', desc: 'Macho o hembra' },
]

export default function NewPlantScreen() {
  const { tables } = useNutritionTables()
  const { isPro, loading: planLoading, canCreatePlant, refetch: refetchPlan } = usePlan()

  const [name, setName]             = useState('')
  const [geneticType, setGeneticType] = useState<GeneticType>('feminized')
  const [startDate, setStartDate]   = useState(new Date())
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [selectedTableId, setSelectedTableId] = useState<string>('revegetar-v1')
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [success, setSuccess]       = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [showPaywall, setShowPaywall] = useState(false)

  useEffect(() => {
    if (tables.length > 0 && !selectedTableId) setSelectedTableId(tables[0].id)
  }, [tables, selectedTableId])

  // Show paywall once plan loads and user can't create
  useEffect(() => {
    if (!planLoading && !canCreatePlant) setShowPaywall(true)
  }, [planLoading, canCreatePlant])

  function validateForm(): boolean {
    const errors: Record<string, string> = {}
    if (!name.trim()) errors.name = 'El nombre es requerido'
    else if (name.trim().length < 2) errors.name = 'Minimo 2 caracteres'
    else if (name.trim().length > 50) errors.name = 'Maximo 50 caracteres'
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleCreate() {
    if (!validateForm()) return
    const { data: { session } } = await supabase.auth.getSession()
    const currentUser = session?.user ?? null
    if (!currentUser) { Alert.alert('Sin sesion', 'Cerra y volve a iniciar sesion'); return }

    setLoading(true); setError(null)
    try {
      const { data: plantRow, error: plantErr } = await supabase
        .from('plants')
        .insert({
          user_id:              currentUser.id,
          name:                 name.trim(),
          genetics:             name.trim(),
          genetic_type:         geneticType,
          sex:                  null,
          auto_flower_total_days: geneticType === 'autoflower' ? 77 : null,
          start_date:           startDate.toISOString().split('T')[0],
          nutrition_table_id:   selectedTableId || tables[0]?.id || 'revegetar-v1',
          location:             'indoor',
          pot_count:            1,
          pot_volume_liters:    11,
          status:               'active',
        })
        .select()
        .maybeSingle()
      if (plantErr || !plantRow) throw plantErr || new Error('No se pudo crear la planta')

      const table = tables.find(t => t.id === plantRow.nutrition_table_id) || tables[0]
      if (table) {
        const plant: Plant = {
          id: plantRow.id, name: plantRow.name, genetics: plantRow.genetics,
          geneticType, sex: 'unknown', startDate, location: 'indoor',
          potCount: 1, potVolumeLiters: 11, nutritionTableId: table.id, status: 'active',
        }
        const tasks = generatePlantSchedule(plant, table)
        if (tasks.length > 0) {
          await supabase.from('scheduled_tasks').insert(tasks.map(t => ({
            user_id: currentUser.id, plant_id: plantRow.id,
            type: t.type, scheduled_date: t.scheduledDate.toISOString().split('T')[0],
            cycle: t.cycle, week: t.week, stage: t.stage, products: t.products,
            ec_min: t.ecMin, ec_max: t.ecMax, ph_min: t.phMin, ph_max: t.phMax,
          })))
        }
      }
      refetchPlan()
      setSuccess(true)
      setTimeout(() => router.replace('/(tabs)/plants'), 1500)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error al crear la planta'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  // Loading plan
  if (planLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#080E09', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#52CC64" size="large" />
      </SafeAreaView>
    )
  }

  // Exito
  if (success) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#080E09', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
        <LinearGradient colors={['#0F2010', '#080E09']} style={{ borderRadius: 28, borderWidth: 1, borderColor: '#1A4A20', padding: 40, alignItems: 'center', width: '100%' }}>
          <Text style={{ fontSize: 64, marginBottom: 18 }}>🌱</Text>
          <Text style={{ color: '#52CC64', fontSize: 24, fontWeight: '900', textAlign: 'center', marginBottom: 8 }}>Planta creada</Text>
          <Text style={{ color: '#3D6642', fontSize: 14, textAlign: 'center', lineHeight: 22 }}>
            Tu calendario nutricional{'\n'}se genero automaticamente
          </Text>
        </LinearGradient>
      </SafeAreaView>
    )
  }

  // Formulario
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#080E09' }}>
      <PaywallModal
        visible={showPaywall}
        onClose={() => { setShowPaywall(false); router.canGoBack() ? router.back() : router.replace('/(tabs)') }}
        feature="Plantas ilimitadas"
      />
      <ScrollView contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <LinearGradient
          colors={['#0F1F10', '#080E09']}
          style={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 24, borderBottomWidth: 1, borderBottomColor: '#1C2E1E' }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <TouchableOpacity
              onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
              style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' }}
            >
              <BackIcon size={20} color="#52CC64" />
            </TouchableOpacity>
            <View>
              <Text style={{ color: '#E4F2E7', fontSize: 22, fontWeight: '900' }}>Nueva planta</Text>
              <Text style={{ color: '#3D6642', fontSize: 13, marginTop: 1 }}>El calendario se genera automaticamente</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={{ padding: 16, gap: 16 }}>

          {/* Error */}
          {error && (
            <LinearGradient
              colors={['#2A0808', '#1A0404']}
              style={{ borderRadius: 14, borderWidth: 1, borderColor: '#4A1515', padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 }}
            >
              <Text style={{ fontSize: 18 }}>⚠️</Text>
              <Text style={{ color: '#EF4444', fontSize: 13, fontWeight: '600', flex: 1 }}>{error}</Text>
            </LinearGradient>
          )}

          {/* Nombre */}
          <View>
            <Text style={sectionLabel}>Nombre</Text>
            <LinearGradient colors={['#131A10', '#0C1009']} style={{ borderRadius: 18, borderWidth: 1, borderColor: fieldErrors.name ? '#EF4444' : '#1C2E1E', overflow: 'hidden' }}>
              <TextInput
                value={name}
                onChangeText={text => {
                  setName(text)
                  if (text.trim().length >= 2) setFieldErrors(p => { const n = { ...p }; delete n.name; return n })
                }}
                placeholder="Ej: White Widow #1"
                placeholderTextColor="#2D4A30"
                style={{ color: '#E4F2E7', fontSize: 16, padding: 18 }}
                editable={!loading}
                maxLength={50}
              />
            </LinearGradient>
            {fieldErrors.name && <Text style={{ color: '#EF4444', fontSize: 12, marginTop: 6, marginLeft: 4 }}>{fieldErrors.name}</Text>}
          </View>

          {/* Tipo de genetica */}
          <View>
            <Text style={sectionLabel}>Tipo de genetica</Text>
            <View style={{ gap: 8 }}>
              {GENETIC_OPTIONS.map(opt => {
                const isSelected = geneticType === opt.value
                return (
                  <TouchableOpacity key={opt.value} onPress={() => setGeneticType(opt.value)} disabled={loading} activeOpacity={0.8}>
                    {isSelected ? (
                      <LinearGradient
                        colors={['#1A3D1E', '#0F2410']}
                        style={{ borderRadius: 16, borderWidth: 1.5, borderColor: '#52CC64', paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 14 }}
                      >
                        <Text style={{ fontSize: 24 }}>{opt.emoji}</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: '#52CC64', fontSize: 15, fontWeight: '900' }}>{opt.label}</Text>
                          <Text style={{ color: '#3D6642', fontSize: 12, marginTop: 2 }}>{opt.desc}</Text>
                        </View>
                        <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#52CC64', alignItems: 'center', justifyContent: 'center' }}>
                          <Text style={{ color: '#080E09', fontSize: 12, fontWeight: '900' }}>✓</Text>
                        </View>
                      </LinearGradient>
                    ) : (
                      <LinearGradient
                        colors={['#131A10', '#0C1009']}
                        style={{ borderRadius: 16, borderWidth: 1, borderColor: '#1C2E1E', paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 14 }}
                      >
                        <Text style={{ fontSize: 24, opacity: 0.5 }}>{opt.emoji}</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: '#728C74', fontSize: 15, fontWeight: '700' }}>{opt.label}</Text>
                          <Text style={{ color: '#2D4A30', fontSize: 12, marginTop: 2 }}>{opt.desc}</Text>
                        </View>
                      </LinearGradient>
                    )}
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>

          {/* Fecha de inicio */}
          <View>
            <Text style={sectionLabel}>Fecha de inicio</Text>
            <TouchableOpacity onPress={() => setShowDatePicker(true)} disabled={loading} activeOpacity={0.8}>
              <LinearGradient
                colors={['#131A10', '#0C1009']}
                style={{ borderRadius: 18, borderWidth: 1, borderColor: '#1C2E1E', paddingHorizontal: 18, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
              >
                <Text style={{ color: '#E4F2E7', fontSize: 16, fontWeight: '600' }}>
                  {startDate.toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}
                </Text>
                <Text style={{ fontSize: 20 }}>📅</Text>
              </LinearGradient>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={startDate}
                mode="date"
                display={process.env.EXPO_OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_event: unknown, d?: Date) => { setShowDatePicker(false); if (d) setStartDate(d) }}
                maximumDate={new Date()}
              />
            )}
          </View>

          {/* Tabla nutricional */}
          <View>
            <Text style={sectionLabel}>Tabla nutricional</Text>
            <View style={{ gap: 8 }}>
              {(tables.length > 0 ? tables : [{ id: 'revegetar-v1', name: 'REVEGETAR' }]).map(t => {
                const isSelected = selectedTableId === t.id
                return (
                  <TouchableOpacity key={t.id} onPress={() => setSelectedTableId(t.id)} disabled={loading} activeOpacity={0.8}>
                    {isSelected ? (
                      <LinearGradient
                        colors={['#1A3D1E', '#0F2410']}
                        style={{ borderRadius: 16, borderWidth: 1.5, borderColor: '#52CC64', paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                      >
                        <Text style={{ color: '#52CC64', fontSize: 15, fontWeight: '800' }}>{t.name}</Text>
                        <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#52CC64', alignItems: 'center', justifyContent: 'center' }}>
                          <Text style={{ color: '#080E09', fontSize: 12, fontWeight: '900' }}>✓</Text>
                        </View>
                      </LinearGradient>
                    ) : (
                      <LinearGradient
                        colors={['#131A10', '#0C1009']}
                        style={{ borderRadius: 16, borderWidth: 1, borderColor: '#1C2E1E', paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                      >
                        <Text style={{ color: '#728C74', fontSize: 15, fontWeight: '700' }}>{t.name}</Text>
                      </LinearGradient>
                    )}
                  </TouchableOpacity>
                )
              })}

              {/* Crear tabla custom */}
              <TouchableOpacity onPress={() => router.push('/tables/new')} disabled={loading} activeOpacity={0.8}>
                <LinearGradient
                  colors={['#0F0A1E', '#090613']}
                  style={{ borderRadius: 16, borderWidth: 1, borderColor: 'rgba(167,139,250,0.2)', borderStyle: 'dashed', paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 10 }}
                >
                  <Text style={{ color: '#A78BFA', fontSize: 18 }}>+</Text>
                  <Text style={{ color: '#A78BFA', fontSize: 14, fontWeight: '700' }}>Crear tabla personalizada</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>

          {/* CTA */}
          <TouchableOpacity onPress={handleCreate} disabled={loading} activeOpacity={0.85} style={{ marginTop: 8 }}>
            <LinearGradient
              colors={loading ? ['#1C2E1E', '#1C2E1E'] : ['#52CC64', '#3DAA50']}
              style={{ borderRadius: 20, paddingVertical: 20, alignItems: 'center', opacity: loading ? 0.6 : 1 }}
            >
              {loading
                ? <ActivityIndicator color="#52CC64" />
                : <Text style={{ color: '#080E09', fontWeight: '900', fontSize: 17, letterSpacing: 0.3 }}>Crear planta →</Text>
              }
            </LinearGradient>
          </TouchableOpacity>

        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const sectionLabel = {
  color: '#728C74' as const,
  fontSize: 13,
  fontWeight: '700' as const,
  letterSpacing: 1.5,
  textTransform: 'uppercase' as const,
  marginBottom: 10,
}
