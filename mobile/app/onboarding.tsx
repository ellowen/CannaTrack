import { useState, useEffect } from 'react'
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { track } from '@/lib/analytics'
import { useAuth } from '@/hooks/useAuth'
import { useNutritionTables } from '@/hooks/useNutritionTables'
import DateTimePicker from '@react-native-community/datetimepicker'
import { format, subDays, startOfDay } from 'date-fns'
import { useDateLocale } from '@/lib/dateLocale'
import { generatePlantSchedule, startFloraPhase } from '@shared/lib/nutrition-engine'
import type { Plant } from '@shared/types/plant'
import { useTranslation } from '@/i18n'

type GeneticType = 'feminized' | 'autoflower' | 'regular'
type Location    = 'indoor' | 'outdoor'

const TOTAL_STEPS = 6

function getGeneticOptions(t: (key: string) => string): { value: GeneticType; emoji: string; label: string; desc: string }[] {
  return [
    { value: 'feminized',  emoji: '♀️',  label: t('onboarding.genetic_feminized_label'),  desc: t('onboarding.genetic_feminized_desc') },
    { value: 'autoflower', emoji: '⚡',  label: t('onboarding.genetic_autoflower_label'), desc: t('onboarding.genetic_autoflower_desc') },
    { value: 'regular',    emoji: '🌿', label: t('onboarding.genetic_regular_label'),     desc: t('onboarding.genetic_regular_desc') },
  ]
}

function getLocationOptions(t: (key: string) => string): { value: Location; emoji: string; label: string; desc: string }[] {
  return [
    { value: 'indoor',  emoji: '🏠', label: t('onboarding.location_indoor_label'),  desc: t('onboarding.location_indoor_desc') },
    { value: 'outdoor', emoji: '☀️', label: t('onboarding.location_outdoor_label'), desc: t('onboarding.location_outdoor_desc') },
  ]
}

const sectionLabel = {
  color: '#728C74', fontSize: 13, fontWeight: '700' as const,
  letterSpacing: 1.5, textTransform: 'uppercase' as const,
}

export default function OnboardingScreen() {
  const { t } = useTranslation()
  const dateLocale = useDateLocale()
  const { user } = useAuth()
  const { tables } = useNutritionTables()
  const GENETIC_OPTIONS = getGeneticOptions(t)
  const LOCATION_OPTIONS = getLocationOptions(t)
  const [step, setStep]               = useState(0)
  const [plantName, setPlantName]     = useState('')
  const [genetics, setGenetics]       = useState('')
  const [geneticType, setGeneticType] = useState<GeneticType>('feminized')
  const [location, setLocation]       = useState<Location>('indoor')
  const [loading, setLoading]         = useState(false)
  const [autoFlowerTotalDays, setAutoFlowerTotalDays] = useState('77')
  const [sex, setSex] = useState<'female' | 'male' | 'unknown'>('unknown')
  const [selectedTableId, setSelectedTableId] = useState('')
  const [availableProducts, setAvailableProducts] = useState<string[] | null>(null)
  const [potCount, setPotCount] = useState(1)
  const [potVolume, setPotVolume] = useState(11)
  const [startDate, setStartDate]         = useState<Date>(startOfDay(new Date()))
  const [showStartPicker, setShowStartPicker] = useState(false)
  const [floraAlreadyStarted, setFloraAlreadyStarted] = useState(false)
  const [floraStartDate, setFloraStartDate] = useState<Date>(startOfDay(new Date()))
  const [showFloraPicker, setShowFloraPicker]   = useState(false)

  useEffect(() => {
    if (tables.length > 0 && !selectedTableId) {
      setSelectedTableId(tables[0].id)
    }
  }, [tables, selectedTableId])

  function canAdvance() {
    if (step === 1) return plantName.trim().length > 0
    if (step === 2) return genetics.trim().length > 0
    return true
  }

  async function handleFinish() {
    if (!user) return
    setLoading(true)
    try {
      // Flora para feminizada/regular mid-cycle
      const useFloraDate = floraAlreadyStarted && geneticType !== 'autoflower'
        ? floraStartDate
        : undefined

      const { data: plantRow, error: plantErr } = await supabase
        .from('plants')
        .insert({
          user_id:            user.id,
          name:               plantName.trim(),
          genetics:           genetics.trim(),
          genetic_type:       geneticType,
          start_date:         startDate.toISOString().split('T')[0],
          flora_start_date:   useFloraDate ? useFloraDate.toISOString().split('T')[0] : null,
          location,
          pot_count:          potCount,
          pot_volume_liters:  potVolume,
          nutrition_table_id: selectedTableId,
          auto_flower_total_days: geneticType === 'autoflower' ? parseInt(autoFlowerTotalDays) || 77 : null,
          sex: geneticType === 'regular' ? sex : null,
          available_products: availableProducts ?? [],
        })
        .select()
        .maybeSingle()

      if (plantErr || !plantRow) throw plantErr ?? new Error(t('onboarding.plant_create_error'))

      const plant: Plant = {
        id:               plantRow.id,
        name:             plantRow.name,
        genetics:         plantRow.genetics,
        geneticType,
        sex:              geneticType === 'regular' ? sex : 'unknown',
        autoFlowerTotalDays: geneticType === 'autoflower' ? parseInt(autoFlowerTotalDays) || 77 : undefined,
        startDate,
        floraStartDate:   useFloraDate,
        location,
        potCount,
        potVolumeLiters:  potVolume,
        nutritionTableId: selectedTableId,
        availableProducts: availableProducts ?? undefined,
        status:           'active',
      }

      const table = tables.find(tb => tb.id === selectedTableId)
      if (!table) throw new Error(t('onboarding.nutrition_table_not_found'))
      // Si ya inicio flora, generar cronograma completo con VEGE + FLORA
      const tasks = useFloraDate
        ? startFloraPhase(plant, useFloraDate, table)
        : generatePlantSchedule(plant, table)

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

      track('onboarding_completed', { genetic_type: geneticType, location })
      track('plant_created', { genetic_type: geneticType, location, tasks_count: tasks.length })

      router.replace(`/plants/${plantRow.id}`)
    } catch (e) {
      Alert.alert(t('onboarding.error_title'), e instanceof Error ? e.message : t('onboarding.finish_generic_error'))
    } finally {
      setLoading(false)
    }
  }

  function handleNext() {
    if (step < TOTAL_STEPS - 1) setStep(step + 1)
    else handleFinish()
  }

  const progressPct = `${((step + 1) / TOTAL_STEPS) * 100}%` as `${number}%`

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#080E09' }}>
      {/* Barra de progreso */}
      <View style={{ height: 3, backgroundColor: '#1C2E1E', marginHorizontal: 20, marginTop: 16, borderRadius: 2 }}>
        <LinearGradient
          colors={['#52CC64', '#3DAA50']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={{ height: '100%', width: progressPct, borderRadius: 2 }}
        />
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
              <LinearGradient
                colors={['#1A3D1E', '#0F2412']}
                style={{ width: 120, height: 120, borderRadius: 60, alignItems: 'center', justifyContent: 'center', marginBottom: 28 }}
              >
                <Text style={{ fontSize: 56 }}>🌱</Text>
              </LinearGradient>
              <Text style={{ color: '#E4F2E7', fontSize: 28, fontWeight: '900', textAlign: 'center', marginBottom: 12 }}>
                {t('onboarding.welcome_title')}
              </Text>
              <Text style={{ color: '#728C74', fontSize: 16, textAlign: 'center', lineHeight: 24 }}>
                {t('onboarding.welcome_desc')}
              </Text>
              <View style={{ flexDirection: 'row', gap: 20, marginTop: 36 }}>
                {[t('onboarding.feature_calendar'), t('onboarding.feature_nutrition'), t('onboarding.feature_ai')].map(item => (
                  <LinearGradient
                    key={item}
                    colors={['#1A3D1E', '#0F2412']}
                    style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#2A5A2E' }}
                  >
                    <Text style={{ color: '#52CC64', fontSize: 12, fontWeight: '700' }}>{item}</Text>
                  </LinearGradient>
                ))}
              </View>
            </View>
          )}

          {/* PASO 1: Nombre */}
          {step === 1 && (
            <View>
              <Text style={[sectionLabel, { marginBottom: 20 }]}>
                {t('onboarding.step_label', { step: 1, total: TOTAL_STEPS - 1 })}
              </Text>
              <Text style={{ color: '#E4F2E7', fontSize: 24, fontWeight: '900', marginBottom: 8 }}>
                {t('onboarding.plant_name_title')}
              </Text>
              <Text style={{ color: '#728C74', fontSize: 14, marginBottom: 28 }}>
                {t('onboarding.plant_name_desc')}
              </Text>
              <LinearGradient
                colors={plantName ? ['#1A3D1E', '#0F2412'] : ['#111A12', '#080E09']}
                style={{ borderRadius: 16, padding: 1 }}
              >
                <View style={{ borderRadius: 15, borderWidth: 1, borderColor: plantName ? '#52CC64' : '#1C2E1E', overflow: 'hidden' }}>
                  <TextInput
                    value={plantName}
                    onChangeText={setPlantName}
                    placeholder={t('onboarding.plant_name_placeholder')}
                    placeholderTextColor="#3A5040"
                    autoFocus
                    style={{
                      backgroundColor: 'transparent',
                      paddingHorizontal: 16, paddingVertical: 16,
                      color: '#E4F2E7', fontSize: 18, fontWeight: '700',
                    }}
                  />
                </View>
              </LinearGradient>
            </View>
          )}

          {/* PASO 2: Genetica */}
          {step === 2 && (
            <View>
              <Text style={[sectionLabel, { marginBottom: 20 }]}>
                {t('onboarding.step_label', { step: 2, total: TOTAL_STEPS - 1 })}
              </Text>
              <Text style={{ color: '#E4F2E7', fontSize: 24, fontWeight: '900', marginBottom: 8 }}>
                {t('onboarding.genetics_title')}
              </Text>
              <Text style={{ color: '#728C74', fontSize: 14, marginBottom: 28 }}>
                {t('onboarding.genetics_desc')}
              </Text>
              <LinearGradient
                colors={genetics ? ['#1A3D1E', '#0F2412'] : ['#111A12', '#080E09']}
                style={{ borderRadius: 16, padding: 1 }}
              >
                <View style={{ borderRadius: 15, borderWidth: 1, borderColor: genetics ? '#52CC64' : '#1C2E1E', overflow: 'hidden' }}>
                  <TextInput
                    value={genetics}
                    onChangeText={setGenetics}
                    placeholder={t('onboarding.genetics_placeholder')}
                    placeholderTextColor="#3A5040"
                    autoFocus
                    style={{
                      backgroundColor: 'transparent',
                      paddingHorizontal: 16, paddingVertical: 16,
                      color: '#E4F2E7', fontSize: 18, fontWeight: '700',
                    }}
                  />
                </View>
              </LinearGradient>
            </View>
          )}

          {/* PASO 3: Tipo de genetica */}
          {step === 3 && (
            <View>
              <Text style={[sectionLabel, { marginBottom: 20 }]}>
                {t('onboarding.step_label', { step: 3, total: TOTAL_STEPS - 1 })}
              </Text>
              <Text style={{ color: '#E4F2E7', fontSize: 24, fontWeight: '900', marginBottom: 8 }}>
                {t('onboarding.genetic_type_title')}
              </Text>
              <Text style={{ color: '#728C74', fontSize: 14, marginBottom: 24 }}>
                {t('onboarding.genetic_type_desc')}
              </Text>
              <View style={{ gap: 10 }}>
                {GENETIC_OPTIONS.map(opt => {
                  const active = geneticType === opt.value
                  return (
                    <TouchableOpacity key={opt.value} onPress={() => setGeneticType(opt.value)} activeOpacity={0.8}>
                      <LinearGradient
                        colors={active ? ['#1A3D1E', '#0F2412'] : ['#111A12', '#0A120B']}
                        style={{ borderRadius: 16, borderWidth: 1, borderColor: active ? '#52CC64' : '#1C2E1E', padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 }}
                      >
                        <View style={{
                          width: 44, height: 44, borderRadius: 22,
                          backgroundColor: active ? '#0D2410' : '#0F1A10',
                          borderWidth: 1, borderColor: active ? '#52CC64' : '#1C2E1E',
                          alignItems: 'center', justifyContent: 'center',
                        }}>
                          <Text style={{ fontSize: 20 }}>{opt.emoji}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: active ? '#52CC64' : '#E4F2E7', fontWeight: '800', fontSize: 15 }}>
                            {opt.label}
                          </Text>
                          <Text style={{ color: '#728C74', fontSize: 12, marginTop: 2 }}>{opt.desc}</Text>
                        </View>
                        {active && (
                          <LinearGradient
                            colors={['#52CC64', '#3DAA50']}
                            style={{ width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' }}
                          >
                            <Text style={{ color: '#080E09', fontSize: 12, fontWeight: '900' }}>✓</Text>
                          </LinearGradient>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>
                  )
                })}
              </View>

              {/* Dias totales para autofloreciente */}
              {geneticType === 'autoflower' && (
                <View style={{ marginTop: 16 }}>
                  <Text style={[sectionLabel, { marginBottom: 8 }]}>
                    {t('onboarding.autoflower_days_label')}
                  </Text>
                  <LinearGradient
                    colors={['#111A12', '#080E09']}
                    style={{ borderRadius: 12, borderWidth: 1, borderColor: '#1C2E1E' }}
                  >
                    <TextInput
                      value={autoFlowerTotalDays}
                      onChangeText={setAutoFlowerTotalDays}
                      keyboardType="number-pad"
                      placeholder="77"
                      placeholderTextColor="#3A5040"
                      style={{
                        paddingHorizontal: 14, paddingVertical: 12,
                        color: '#E4F2E7', fontSize: 15,
                      }}
                    />
                  </LinearGradient>
                  <Text style={{ color: '#3A5040', fontSize: 12, marginTop: 4 }}>
                    {t('onboarding.autoflower_days_hint')}
                  </Text>
                </View>
              )}

              {/* Sexo para regular */}
              {geneticType === 'regular' && (
                <View style={{ marginTop: 16 }}>
                  <Text style={[sectionLabel, { marginBottom: 8 }]}>
                    {t('onboarding.sex_label')}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {([
                      { value: 'female',  label: t('onboarding.sex_female'),  color: '#52CC64' },
                      { value: 'male',    label: t('onboarding.sex_male'),    color: '#3B82F6' },
                      { value: 'unknown', label: t('onboarding.sex_unknown'), color: '#728C74' },
                    ] as const).map(opt => (
                      <TouchableOpacity
                        key={opt.value}
                        onPress={() => setSex(opt.value)}
                        activeOpacity={0.8}
                        style={{ flex: 1 }}
                      >
                        <LinearGradient
                          colors={sex === opt.value ? ['#1A3D1E', '#0F2412'] : ['#111A12', '#0A120B']}
                          style={{ borderRadius: 10, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: sex === opt.value ? opt.color : '#1C2E1E' }}
                        >
                          <Text style={{ color: sex === opt.value ? opt.color : '#728C74', fontWeight: '800', fontSize: 13 }}>
                            {opt.label}
                          </Text>
                        </LinearGradient>
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
              <Text style={[sectionLabel, { marginBottom: 20 }]}>
                {t('onboarding.step_label', { step: 4, total: TOTAL_STEPS - 1 })}
              </Text>
              <Text style={{ color: '#E4F2E7', fontSize: 24, fontWeight: '900', marginBottom: 8 }}>
                {t('onboarding.location_title')}
              </Text>
              <Text style={{ color: '#728C74', fontSize: 14, marginBottom: 24 }}>
                {t('onboarding.location_desc')}
              </Text>
              <View style={{ gap: 10 }}>
                {LOCATION_OPTIONS.map(opt => {
                  const active = location === opt.value
                  return (
                    <TouchableOpacity key={opt.value} onPress={() => setLocation(opt.value)} activeOpacity={0.8}>
                      <LinearGradient
                        colors={active ? ['#1A3D1E', '#0F2412'] : ['#111A12', '#0A120B']}
                        style={{ borderRadius: 16, borderWidth: 1, borderColor: active ? '#52CC64' : '#1C2E1E', padding: 20, flexDirection: 'row', alignItems: 'center', gap: 16 }}
                      >
                        <View style={{
                          width: 52, height: 52, borderRadius: 26,
                          backgroundColor: active ? '#0D2410' : '#0F1A10',
                          borderWidth: 1, borderColor: active ? '#52CC64' : '#1C2E1E',
                          alignItems: 'center', justifyContent: 'center',
                        }}>
                          <Text style={{ fontSize: 24 }}>{opt.emoji}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: active ? '#52CC64' : '#E4F2E7', fontWeight: '800', fontSize: 17 }}>
                            {opt.label}
                          </Text>
                          <Text style={{ color: '#728C74', fontSize: 12, marginTop: 3 }}>{opt.desc}</Text>
                        </View>
                        {active && (
                          <LinearGradient
                            colors={['#52CC64', '#3DAA50']}
                            style={{ width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}
                          >
                            <Text style={{ color: '#080E09', fontSize: 13, fontWeight: '900' }}>✓</Text>
                          </LinearGradient>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>
                  )
                })}
              </View>

              {/* Macetas */}
              <View style={{ marginTop: 24, gap: 16 }}>
                <Text style={[sectionLabel, { marginBottom: 0 }]}>{t('onboarding.pots_label')}</Text>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#3A5040', fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 }}>{t('onboarding.pots_count_label')}</Text>
                    <LinearGradient colors={['#111A12', '#080E09']} style={{ borderRadius: 12, borderWidth: 1, borderColor: '#1C2E1E', flexDirection: 'row', overflow: 'hidden' }}>
                      <TouchableOpacity onPress={() => setPotCount(c => Math.max(1, c - 1))} style={{ width: 40, alignItems: 'center', justifyContent: 'center', borderRightWidth: 1, borderRightColor: '#1C2E1E' }}>
                        <Text style={{ color: potCount <= 1 ? '#2D4A30' : '#52CC64', fontSize: 20, fontWeight: '700' }}>-</Text>
                      </TouchableOpacity>
                      <View style={{ flex: 1, alignItems: 'center', paddingVertical: 12 }}>
                        <Text style={{ color: '#E4F2E7', fontSize: 16, fontWeight: '900' }}>{potCount}</Text>
                      </View>
                      <TouchableOpacity onPress={() => setPotCount(c => Math.min(20, c + 1))} style={{ width: 40, alignItems: 'center', justifyContent: 'center', borderLeftWidth: 1, borderLeftColor: '#1C2E1E' }}>
                        <Text style={{ color: '#52CC64', fontSize: 20, fontWeight: '700' }}>+</Text>
                      </TouchableOpacity>
                    </LinearGradient>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#3A5040', fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 }}>{t('onboarding.pots_volume_label')}</Text>
                    <LinearGradient colors={['#111A12', '#080E09']} style={{ borderRadius: 12, borderWidth: 1, borderColor: '#1C2E1E', flexDirection: 'row', overflow: 'hidden' }}>
                      <TouchableOpacity onPress={() => setPotVolume(v => Math.max(1, v - 1))} style={{ width: 40, alignItems: 'center', justifyContent: 'center', borderRightWidth: 1, borderRightColor: '#1C2E1E' }}>
                        <Text style={{ color: potVolume <= 1 ? '#2D4A30' : '#52CC64', fontSize: 20, fontWeight: '700' }}>-</Text>
                      </TouchableOpacity>
                      <View style={{ flex: 1, alignItems: 'center', paddingVertical: 12 }}>
                        <Text style={{ color: '#E4F2E7', fontSize: 16, fontWeight: '900' }}>{potVolume}L</Text>
                      </View>
                      <TouchableOpacity onPress={() => setPotVolume(v => Math.min(200, v + 1))} style={{ width: 40, alignItems: 'center', justifyContent: 'center', borderLeftWidth: 1, borderLeftColor: '#1C2E1E' }}>
                        <Text style={{ color: '#52CC64', fontSize: 20, fontWeight: '700' }}>+</Text>
                      </TouchableOpacity>
                    </LinearGradient>
                  </View>
                </View>

                {/* Inicio del cultivo */}
                <Text style={[sectionLabel, { marginBottom: 0, marginTop: 4 }]}>{t('onboarding.grow_start_label')}</Text>

                {/* Chips rapidos */}
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {[
                    { label: t('onboarding.date_today'),     date: startOfDay(new Date()) },
                    { label: t('onboarding.date_yesterday'), date: subDays(startOfDay(new Date()), 1) },
                    { label: t('onboarding.date_3days'),     date: subDays(startOfDay(new Date()), 3) },
                    { label: t('onboarding.date_1week'),     date: subDays(startOfDay(new Date()), 7) },
                  ].map(opt => {
                    const active = startDate.toISOString().split('T')[0] === opt.date.toISOString().split('T')[0]
                    return (
                      <TouchableOpacity key={opt.label} onPress={() => setStartDate(opt.date)} activeOpacity={0.8} style={{ flex: 1 }}>
                        {active ? (
                          <LinearGradient colors={['#1A3D1E', '#0F2412']} style={{ borderRadius: 10, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: '#52CC64' }}>
                            <Text style={{ color: '#52CC64', fontSize: 11, fontWeight: '800' }}>{opt.label}</Text>
                          </LinearGradient>
                        ) : (
                          <View style={{ borderRadius: 10, paddingVertical: 10, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: '#1C2E1E' }}>
                            <Text style={{ color: '#3A5040', fontSize: 11, fontWeight: '700' }}>{opt.label}</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    )
                  })}
                </View>

                {/* Fecha exacta */}
                <TouchableOpacity
                  onPress={() => setShowStartPicker(true)}
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: '#1C2E1E' }}
                >
                  <Text style={{ color: '#6D8C74', fontSize: 13 }}>{t('onboarding.exact_date_label')}</Text>
                  <Text style={{ color: '#52CC64', fontSize: 13, fontWeight: '700' }}>
                    {format(startDate, "d 'de' MMMM, yyyy", { locale: dateLocale })}
                  </Text>
                </TouchableOpacity>
                {showStartPicker && (
                  <DateTimePicker
                    value={startDate}
                    mode="date"
                    maximumDate={new Date()}
                    onChange={(_, date) => { setShowStartPicker(false); if (date) setStartDate(startOfDay(date)) }}
                  />
                )}

                {/* Toggle flora ya iniciada (solo para feminizada/regular) */}
                {geneticType !== 'autoflower' && (
                  <View style={{ gap: 10 }}>
                    <TouchableOpacity
                      onPress={() => setFloraAlreadyStarted(f => !f)}
                      style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, backgroundColor: floraAlreadyStarted ? 'rgba(245,158,11,0.08)' : 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: floraAlreadyStarted ? 'rgba(245,158,11,0.4)' : '#1C2E1E' }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={{ fontSize: 16 }}>🌸</Text>
                        <Text style={{ color: floraAlreadyStarted ? '#F59E0B' : '#6D8C74', fontSize: 13, fontWeight: '600' }}>
                          {t('onboarding.flora_started_toggle')}
                        </Text>
                      </View>
                      <View style={{ width: 36, height: 20, borderRadius: 10, backgroundColor: floraAlreadyStarted ? '#F59E0B' : '#1C2E1E', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2 }}>
                        <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: '#E4F2E7', transform: [{ translateX: floraAlreadyStarted ? 8 : -8 }] }} />
                      </View>
                    </TouchableOpacity>

                    {floraAlreadyStarted && (
                      <>
                        <TouchableOpacity
                          onPress={() => setShowFloraPicker(true)}
                          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, backgroundColor: 'rgba(245,158,11,0.06)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)' }}
                        >
                          <Text style={{ color: '#A06820', fontSize: 13 }}>{t('onboarding.flora_start_label')}</Text>
                          <Text style={{ color: '#F59E0B', fontSize: 13, fontWeight: '700' }}>
                            {format(floraStartDate, "d 'de' MMMM, yyyy", { locale: dateLocale })}
                          </Text>
                        </TouchableOpacity>
                        {showFloraPicker && (
                          <DateTimePicker
                            value={floraStartDate}
                            mode="date"
                            minimumDate={startDate}
                            maximumDate={new Date()}
                            onChange={(_, date) => { setShowFloraPicker(false); if (date) setFloraStartDate(startOfDay(date)) }}
                          />
                        )}
                      </>
                    )}
                  </View>
                )}
              </View>
            </View>
          )}

          {/* PASO 5: Tabla nutricional */}
          {step === 5 && (
            <View>
              <Text style={[sectionLabel, { marginBottom: 20 }]}>
                {t('onboarding.step_label', { step: 5, total: TOTAL_STEPS - 1 })}
              </Text>
              <Text style={{ color: '#E4F2E7', fontSize: 24, fontWeight: '900', marginBottom: 8 }}>
                {t('onboarding.nutrition_table_title')}
              </Text>
              <Text style={{ color: '#728C74', fontSize: 14, marginBottom: 24 }}>
                {t('onboarding.nutrition_table_desc')}
              </Text>
              <View style={{ gap: 10 }}>
                {tables.map(table => {
                  const active = selectedTableId === table.id
                  return (
                    <TouchableOpacity key={table.id} onPress={() => setSelectedTableId(table.id)} activeOpacity={0.8}>
                      <LinearGradient
                        colors={active ? ['#1A3D1E', '#0F2412'] : ['#111A12', '#0A120B']}
                        style={{ borderRadius: 16, borderWidth: 1, borderColor: active ? '#52CC64' : '#1C2E1E', padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: active ? '#52CC64' : '#E4F2E7', fontWeight: '800', fontSize: 15 }}>
                            {table.name}
                          </Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                            <View style={{
                              paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8,
                              backgroundColor: table.accessTier === 'pro' ? '#1A1440' : '#0F2412',
                              borderWidth: 1, borderColor: table.accessTier === 'pro' ? '#A78BFA' : '#2A5A2E',
                            }}>
                              <Text style={{ fontSize: 11, fontWeight: '700', color: table.accessTier === 'pro' ? '#A78BFA' : '#52CC64' }}>
                                {table.accessTier === 'pro' ? t('onboarding.tier_pro') : t('onboarding.tier_free')}
                              </Text>
                            </View>
                            <Text style={{ color: '#3A5040', fontSize: 12 }}>
                              {t('onboarding.weeks_count', { count: table.vegeWeeks.length + table.floraWeeks.length })}
                            </Text>
                          </View>
                        </View>
                        {active && (
                          <LinearGradient
                            colors={['#52CC64', '#3DAA50']}
                            style={{ width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginLeft: 12 }}
                          >
                            <Text style={{ color: '#080E09', fontSize: 13, fontWeight: '900' }}>✓</Text>
                          </LinearGradient>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>
                  )
                })}
              </View>
            </View>
          )}

        </View>

        {/* Botones */}
        <View style={{ gap: 10, paddingBottom: 8 }}>
          <TouchableOpacity
            onPress={handleNext}
            disabled={!canAdvance() || loading}
            activeOpacity={0.85}
            style={{ opacity: (!canAdvance() || loading) ? 0.4 : 1 }}
          >
            <LinearGradient
              colors={['#52CC64', '#3DAA50']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={{ borderRadius: 18, paddingVertical: 18, alignItems: 'center' }}
            >
              {loading
                ? <ActivityIndicator color="#080E09" />
                : <Text style={{ color: '#080E09', fontWeight: '900', fontSize: 16 }}>
                    {step === TOTAL_STEPS - 1 ? t('onboarding.finish_button') : t('onboarding.next_button')}
                  </Text>
              }
            </LinearGradient>
          </TouchableOpacity>
          {step > 0 && !loading && (
            <TouchableOpacity
              onPress={() => setStep(step - 1)}
              style={{ paddingVertical: 14, alignItems: 'center' }}
            >
              <Text style={{ color: '#728C74', fontSize: 14, fontWeight: '600' }}>{t('onboarding.back_button')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
