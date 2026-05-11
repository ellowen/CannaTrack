import { useState, useEffect } from 'react'
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { BackIcon } from '@/components/icons/AppIcons'
import { router, useLocalSearchParams } from 'expo-router'
import { usePlantStore } from '@/store/plantStore'
import DateTimePicker from '@react-native-community/datetimepicker'
import { format, startOfDay } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useNutritionTables } from '@/hooks/useNutritionTables'
import { generatePlantSchedule, startFloraPhase } from '@shared/lib/nutrition-engine'
import type { Plant } from '@shared/types/plant'

type GeneticType = 'feminized' | 'autoflower' | 'regular'
type PlantSex = 'female' | 'male' | 'unknown'
type CustomProduct = {
  name: string
  unit: 'ml' | 'gr'
  phases: 'vege' | 'flora' | 'both'
  vegeMin: number; vegeMax: number
  floraMin: number; floraMax: number
}
const EMPTY_NEW: CustomProduct = { name: '', unit: 'ml', phases: 'both', vegeMin: 1, vegeMax: 2, floraMin: 1, floraMax: 2 }
const CUSTOM_TABLE_ID = 'custom'

function migrateProduct(p: Record<string, unknown>): CustomProduct {
  const legacy = (p.minDose as number) ?? 1
  const legacyMax = (p.maxDose as number) ?? legacy
  return {
    name: p.name as string,
    unit: (p.unit as 'ml' | 'gr') ?? 'ml',
    phases: (p.phases as CustomProduct['phases']) ?? 'both',
    vegeMin: (p.vegeMin as number) ?? legacy,
    vegeMax: (p.vegeMax as number) ?? legacyMax,
    floraMin: (p.floraMin as number) ?? legacy,
    floraMax: (p.floraMax as number) ?? legacyMax,
  }
}

const LINE_COLOR: Record<string, { bg: string; text: string }> = {
  BIO:   { bg: 'rgba(20,83,45,0.7)',  text: '#4ADE80' },
  ECO:   { bg: 'rgba(69,26,3,0.7)',   text: '#FB923C' },
  LIFE:  { bg: 'rgba(30,58,95,0.7)',  text: '#60A5FA' },
  FUEL:  { bg: 'rgba(59,7,100,0.7)',  text: '#C084FC' },
  PRO:   { bg: 'rgba(67,20,7,0.7)',   text: '#FB923C' },
  MID:   { bg: 'rgba(74,13,46,0.7)',  text: '#F472B6' },
  BASIC: { bg: 'rgba(76,5,25,0.7)',   text: '#FDA4AF' },
}

export default function EditPlantScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { user } = useAuth()
  const updateStoreP = usePlantStore(s => s.updatePlant)
  const removePlant  = usePlantStore(s => s.removePlant)
  const [name, setName]                         = useState('')
  const [genetics, setGenetics]                 = useState('')
  const [geneticType, setGeneticType]           = useState<GeneticType>('feminized')
  const [sex, setSex]                           = useState<PlantSex>('unknown')
  const [autoFlowerTotalDays, setAutoFlowerTotalDays] = useState(77)
  const [startDate, setStartDate]               = useState('')
  const [location, setLocation]                 = useState<'indoor' | 'outdoor'>('indoor')
  const [potCount, setPotCount]                 = useState(1)
  const [potVolumeLiters, setPotVolumeLiters]   = useState(11)
  const [notes, setNotes]                       = useState('')
  const [floraStartDate, setFloraStartDate]     = useState<string | null>(null)
  const [loading, setLoading]                   = useState(true)
  const [saving, setSaving]                     = useState(false)
  const [selectedTableId, setSelectedTableId]   = useState('')
  // Valores originales para detectar cambios que requieren regenerar calendario
  const [origStartDate, setOrigStartDate]       = useState('')
  const [origGeneticType, setOrigGeneticType]   = useState<GeneticType>('feminized')
  const [origTableId, setOrigTableId]           = useState('')
  const [origAutoFlowerDays, setOrigAutoFlowerDays] = useState(77)
  const [availableProducts, setAvailableProducts] = useState<string[] | null>(null)
  const [customProducts, setCustomProducts]     = useState<CustomProduct[]>([])
  const [showAddForm, setShowAddForm]           = useState(false)
  const [newProduct, setNewProduct]             = useState<CustomProduct>(EMPTY_NEW)
  const [showStartPicker, setShowStartPicker]   = useState(false)
  const [showFloraPicker, setShowFloraPicker]   = useState(false)

  const { tables } = useNutritionTables()

  // Convierte 'YYYY-MM-DD' a Date para el picker; fallback a hoy
  const startDateObj   = startDate   ? startOfDay(new Date(startDate + 'T00:00:00'))   : startOfDay(new Date())
  const floraDateObj   = floraStartDate ? startOfDay(new Date(floraStartDate + 'T00:00:00')) : startOfDay(new Date())

  useEffect(() => {
    async function load() {
      if (!id || !user) return
      const { data } = await supabase.from('plants').select('*').eq('id', id).eq('user_id', user.id).maybeSingle()
      if (data) {
        const gt = (data.genetic_type as GeneticType) ?? 'feminized'
        const sd = data.start_date ?? ''
        const tid = data.nutrition_table_id || ''
        const afd = data.auto_flower_total_days ?? 77
        setName(data.name)
        setGenetics(data.genetics)
        setGeneticType(gt)
        setSex((data.sex as PlantSex) ?? 'unknown')
        setAutoFlowerTotalDays(afd)
        setStartDate(sd)
        setSelectedTableId(tid)
        setFloraStartDate(data.flora_start_date ?? null)
        setAvailableProducts(data.available_products ? [...data.available_products] : null)
        setLocation(data.location ?? 'indoor')
        setPotCount(data.pot_count ?? 1)
        setPotVolumeLiters(data.pot_volume_liters ?? 11)
        setNotes(data.notes ?? '')
        setCustomProducts(Array.isArray(data.custom_products) ? data.custom_products.map(migrateProduct) : [])
        // Guardar originales para detectar cambios
        setOrigStartDate(sd)
        setOrigGeneticType(gt)
        setOrigTableId(tid)
        setOrigAutoFlowerDays(afd)
      }
      setLoading(false)
    }
    load()
  }, [id, user])

  useEffect(() => {
    if (tables.length > 0 && !selectedTableId) setSelectedTableId(tables[0].id)
  }, [tables, selectedTableId])

  async function handleDelete() {
    Alert.alert('Eliminar planta', '¿Seguro? Esta accion no se puede deshacer.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => {
        if (!id || !user) return
        await supabase.from('scheduled_tasks').delete().eq('plant_id', id)
        await supabase.from('plants').delete().eq('id', id).eq('user_id', user.id)
        removePlant(id) // actualiza store inmediatamente
        router.replace('/(tabs)/plants')
      }},
    ])
  }

  async function handleSave() {
    if (!id || !user || !name.trim() || !genetics.trim()) return

    const scheduleChanged =
      startDate !== origStartDate ||
      geneticType !== origGeneticType ||
      selectedTableId !== origTableId ||
      (geneticType === 'autoflower' && autoFlowerTotalDays !== origAutoFlowerDays)

    // Siempre regenerar si algo del calendario cambio — sin preguntar
    await doSave(scheduleChanged && !!selectedTableId && selectedTableId !== CUSTOM_TABLE_ID)
  }

  async function doSave(regenerate: boolean) {
    if (!id || !user) return
    setSaving(true)
    try {
      await supabase.from('plants').update({
        name:                   name.trim(),
        genetics:               genetics.trim(),
        genetic_type:           geneticType,
        sex:                    geneticType === 'regular' ? sex : null,
        auto_flower_total_days: geneticType === 'autoflower' ? autoFlowerTotalDays : null,
        start_date:             startDate || null,
        nutrition_table_id:     selectedTableId,
        available_products:     availableProducts,
        location,
        pot_count:              potCount,
        pot_volume_liters:      potVolumeLiters,
        notes:                  notes.trim() || null,
        custom_products:        customProducts,
      }).eq('id', id).eq('user_id', user.id)

      if (regenerate && startDate && selectedTableId && selectedTableId !== CUSTOM_TABLE_ID) {
        const table = tables.find(t => t.id === selectedTableId)
        if (table) {
          const plant: Plant = {
            id,
            name:                name.trim(),
            genetics:            genetics.trim(),
            geneticType,
            sex:                 geneticType === 'regular' ? sex : 'unknown',
            startDate:           new Date(startDate),
            floraStartDate:      floraStartDate ? new Date(floraStartDate) : undefined,
            autoFlowerTotalDays: geneticType === 'autoflower' ? autoFlowerTotalDays : undefined,
            location,
            potCount,
            potVolumeLiters,
            nutritionTableId:    selectedTableId,
            availableProducts:   availableProducts ?? undefined,
            status:              'active',
          }

          let newTasks
          if (plant.floraStartDate) {
            // En floracion: regenerar ambas fases
            newTasks = startFloraPhase(plant, plant.floraStartDate, table)
          } else {
            newTasks = generatePlantSchedule(plant, table)
          }

          // Borrar solo tareas pendientes (preservar historial de completadas)
          await supabase.from('scheduled_tasks')
            .delete()
            .eq('plant_id', id)
            .eq('completed', false)

          if (newTasks.length > 0) {
            await supabase.from('scheduled_tasks').insert(
              newTasks.map(t => ({
                user_id:        user.id,
                plant_id:       id,
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
        }
      }

      // Actualizar store inmediatamente con los nuevos datos
      updateStoreP(id, {
        name:                name.trim(),
        genetics:            genetics.trim(),
        geneticType,
        location,
        potCount,
        potVolumeLiters,
        nutritionTableId:    selectedTableId ?? undefined,
        notes:               notes.trim() || undefined,
      })
      router.back()
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#080E09', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#52CC64" size="large" />
      </SafeAreaView>
    )
  }

  const canSave = name.trim().length > 0 && genetics.trim().length > 0 && !saving

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#080E09' }}>

      {/* Header fijo */}
      <LinearGradient colors={['#0F1F10', '#080E09']}
        style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 18, borderBottomWidth: 1, borderBottomColor: '#1A2E1A' }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' }}
            >
              <BackIcon size={20} color="#52CC64" />
            </TouchableOpacity>
            <View>
              <Text style={{ color: '#E4F2E7', fontSize: 20, fontWeight: '900' }}>Editar planta</Text>
              <Text style={{ color: '#3A5040', fontSize: 11, marginTop: 1 }}>Los cambios se guardan al tocar Guardar</Text>
            </View>
          </View>
          <TouchableOpacity onPress={handleSave} disabled={!canSave} activeOpacity={0.85}>
            <LinearGradient
              colors={canSave ? ['#52CC64', '#3DAA50'] : ['#1C2E1E', '#182018']}
              style={{ borderRadius: 12, paddingHorizontal: 18, paddingVertical: 10 }}
            >
              {saving
                ? <ActivityIndicator color="#080E09" size="small" />
                : <Text style={{ color: canSave ? '#080E09' : '#3A5040', fontWeight: '900', fontSize: 13 }}>Guardar</Text>
              }
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>

        {/* Seccion: Identidad */}
        <Section label="Identidad" icon="🌿">
          <Field label="Nombre">
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Ej: Planta #1"
              placeholderTextColor="#2D4A30"
              style={inp}
            />
          </Field>
          <Field label="Genetica">
            <TextInput
              value={genetics}
              onChangeText={setGenetics}
              placeholder="Ej: Blue Dream, OG Kush..."
              placeholderTextColor="#2D4A30"
              style={inp}
            />
          </Field>
          <Field label="Tipo">
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {([
                ['feminized', '♀', 'Fem'],
                ['autoflower', '⏱', 'Auto'],
                ['regular', '⚥', 'Reg'],
              ] as const).map(([t, icon, label]) => (
                <TouchableOpacity
                  key={t}
                  onPress={() => setGeneticType(t)}
                  activeOpacity={0.8}
                  style={{ flex: 1 }}
                >
                  {geneticType === t ? (
                    <LinearGradient colors={['#52CC64', '#3DAA50']} style={{ borderRadius: 12, paddingVertical: 11, alignItems: 'center', gap: 3 }}>
                      <Text style={{ fontSize: 16 }}>{icon}</Text>
                      <Text style={{ color: '#080E09', fontWeight: '800', fontSize: 11 }}>{label}</Text>
                    </LinearGradient>
                  ) : (
                    <View style={{ borderRadius: 12, paddingVertical: 11, alignItems: 'center', gap: 3, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: '#1C2E1E' }}>
                      <Text style={{ fontSize: 16 }}>{icon}</Text>
                      <Text style={{ color: '#4A7A50', fontWeight: '700', fontSize: 11 }}>{label}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </Field>

          {geneticType === 'autoflower' && (
            <Field label="Dias totales de cultivo">
              <Stepper value={autoFlowerTotalDays} min={50} max={120} step={1} unit="d" onChange={setAutoFlowerTotalDays} />
              <Text style={{ color: '#2D4A30', fontSize: 11, marginTop: 6 }}>Tipico: 70-80 dias desde germinacion</Text>
            </Field>
          )}

          {geneticType === 'regular' && (
            <Field label="Sexo">
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {([
                  ['female', '♀', '#52CC64', 'Hembra'],
                  ['male',   '♂', '#3B82F6', 'Macho'],
                  ['unknown','?', '#728C74', 'N/D'],
                ] as const).map(([s, icon, color, label]) => (
                  <TouchableOpacity
                    key={s}
                    onPress={() => setSex(s)}
                    activeOpacity={0.8}
                    style={{
                      flex: 1, paddingVertical: 11, borderRadius: 12, alignItems: 'center', gap: 2,
                      backgroundColor: sex === s ? `${color}18` : 'rgba(255,255,255,0.04)',
                      borderWidth: 1, borderColor: sex === s ? `${color}55` : '#1C2E1E',
                    }}
                  >
                    <Text style={{ color: sex === s ? color : '#3A5040', fontSize: 18, fontWeight: '700' }}>{icon}</Text>
                    <Text style={{ color: sex === s ? color : '#3A5040', fontWeight: '700', fontSize: 10 }}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Field>
          )}
        </Section>

        {/* Seccion: Ciclo */}
        <Section label="Ciclo de cultivo" icon="📅">
          {/* Fecha de inicio */}
          <Field label="Fecha de inicio">
            <TouchableOpacity
              onPress={() => setShowStartPicker(true)}
              activeOpacity={0.8}
              style={[inp, { justifyContent: 'center' }]}
            >
              <Text style={{ color: startDate ? '#E4F2E7' : '#2D4A30', fontSize: 15 }}>
                {startDate ? format(startDateObj, 'dd/MM/yyyy') : 'Seleccionar fecha'}
              </Text>
            </TouchableOpacity>
            {showStartPicker && (
              <DateTimePicker
                value={startDateObj}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                maximumDate={new Date()}
                onChange={(_, date) => {
                  setShowStartPicker(Platform.OS === 'ios')
                  if (date) setStartDate(format(date, 'yyyy-MM-dd'))
                }}
              />
            )}
          </Field>

          {/* Fecha de inicio de flora (solo feminizada/regular que ya florecio) */}
          {geneticType !== 'autoflower' && (
            <Field label="Inicio de floracion (opcional)">
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <TouchableOpacity
                  onPress={() => setShowFloraPicker(true)}
                  activeOpacity={0.8}
                  style={[inp, { flex: 1, justifyContent: 'center' }]}
                >
                  <Text style={{ color: floraStartDate ? '#F59E0B' : '#2D4A30', fontSize: 15 }}>
                    {floraStartDate ? format(floraDateObj, 'dd/MM/yyyy') : 'No iniciada aun'}
                  </Text>
                </TouchableOpacity>
                {floraStartDate && (
                  <TouchableOpacity
                    onPress={() => setFloraStartDate(null)}
                    activeOpacity={0.7}
                    style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(239,68,68,0.1)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)' }}
                  >
                    <Text style={{ color: '#EF4444', fontSize: 16 }}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
              {showFloraPicker && (
                <DateTimePicker
                  value={floraDateObj}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  maximumDate={new Date()}
                  minimumDate={startDate ? startDateObj : undefined}
                  onChange={(_, date) => {
                    setShowFloraPicker(Platform.OS === 'ios')
                    if (date) setFloraStartDate(format(date, 'yyyy-MM-dd'))
                  }}
                />
              )}
            </Field>
          )}

          <LinearGradient
            colors={['rgba(245,158,11,0.08)', 'rgba(245,158,11,0.03)']}
            style={{ borderRadius: 12, borderWidth: 1, borderColor: 'rgba(245,158,11,0.2)', padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}
          >
            <Text style={{ fontSize: 16 }}>⚠️</Text>
            <Text style={{ color: '#F59E0B', fontSize: 12, flex: 1, lineHeight: 17 }}>
              Al guardar con fecha o tipo modificado, se te ofrecera regenerar las tareas pendientes automaticamente
            </Text>
          </LinearGradient>
        </Section>

        {/* Seccion: Cultivo */}
        <Section label="Configuracion" icon="🪴">
          <Field label="Ubicacion">
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {([['indoor', '🏠', 'Indoor'], ['outdoor', '☀️', 'Outdoor']] as const).map(([l, icon, label]) => (
                <TouchableOpacity key={l} onPress={() => setLocation(l)} activeOpacity={0.8} style={{ flex: 1 }}>
                  {location === l ? (
                    <LinearGradient colors={['#52CC64', '#3DAA50']} style={{ borderRadius: 12, paddingVertical: 13, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
                      <Text style={{ fontSize: 16 }}>{icon}</Text>
                      <Text style={{ color: '#080E09', fontWeight: '800', fontSize: 13 }}>{label}</Text>
                    </LinearGradient>
                  ) : (
                    <View style={{ borderRadius: 12, paddingVertical: 13, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: '#1C2E1E' }}>
                      <Text style={{ fontSize: 16 }}>{icon}</Text>
                      <Text style={{ color: '#4A7A50', fontWeight: '600', fontSize: 13 }}>{label}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </Field>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Field label="Cantidad de macetas">
                <Stepper value={potCount} min={1} max={20} step={1} unit="" onChange={setPotCount} />
              </Field>
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Litros por maceta">
                <Stepper value={potVolumeLiters} min={1} max={200} step={1} unit="L" onChange={setPotVolumeLiters} />
              </Field>
            </View>
          </View>
        </Section>

        {/* Seccion: Notas */}
        <Section label="Notas" icon="📝">
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Observaciones, recordatorios, caracteristicas de esta planta..."
            placeholderTextColor="#2D4A30"
            multiline
            numberOfLines={3}
            style={[inp, { minHeight: 88, textAlignVertical: 'top' }]}
          />
        </Section>

        {/* Seccion: Tabla nutricional */}
        <Section label="Tabla nutricional" icon="🧪">
            {/* Selector de tabla - deduplicado por nombre normalizado + Custom */}
          {(() => {
            const seen = new Set<string>()
            const deduped = tables.filter(t => {
              const key = t.name.toLowerCase().replace(/\s+/g, '')
              if (seen.has(key)) return false
              seen.add(key)
              return true
            })
            const allOptions = [...deduped, { id: CUSTOM_TABLE_ID, name: 'Custom' }]
            return (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                {allOptions.map(opt => {
                  const isSelected = selectedTableId === opt.id
                  return (
                    <TouchableOpacity
                      key={opt.id}
                      onPress={() => { setSelectedTableId(opt.id); setAvailableProducts(null) }}
                      activeOpacity={0.8}
                    >
                      {isSelected ? (
                        <LinearGradient
                          colors={opt.id === CUSTOM_TABLE_ID ? ['#7C3AED', '#5B21B6'] : ['#52CC64', '#3DAA50']}
                          style={{ borderRadius: 12, paddingHorizontal: 18, paddingVertical: 11 }}
                        >
                          <Text style={{ color: '#fff', fontWeight: '900', fontSize: 14 }}>{opt.name}</Text>
                        </LinearGradient>
                      ) : (
                        <View style={{ borderRadius: 12, paddingHorizontal: 18, paddingVertical: 11, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: '#1C2E1E' }}>
                          <Text style={{ color: '#728C74', fontWeight: '700', fontSize: 14 }}>{opt.name}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  )
                })}
              </View>
            )
          })()}

          {/* Filtro de productos - solo si tabla oficial seleccionada */}
          {selectedTableId && selectedTableId !== CUSTOM_TABLE_ID && (() => {
            const table = tables.find(t => t.id === selectedTableId)
            if (!table) return null
            return (
              <View style={{ gap: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ color: '#728C74', fontSize: 13, fontWeight: '700', letterSpacing: 1.0, textTransform: 'uppercase' }}>
                    Filtrar productos
                  </Text>
                  <TouchableOpacity
                    onPress={() => setAvailableProducts(null)}
                    style={{ backgroundColor: availableProducts === null ? 'rgba(82,204,100,0.12)' : 'rgba(255,255,255,0.05)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: availableProducts === null ? 'rgba(82,204,100,0.25)' : '#1C2E1E' }}
                  >
                    <Text style={{ color: availableProducts === null ? '#52CC64' : '#728C74', fontSize: 12, fontWeight: '700' }}>
                      {availableProducts === null ? '✓ Todos' : `${availableProducts.length} sel.`}
                    </Text>
                  </TouchableOpacity>
                </View>
                {table.lines.map(line => {
                  const lineProducts = new Set<string>()
                  ;[...table.vegeWeeks, ...table.floraWeeks].forEach(week => {
                    week.products.forEach(p => { if (p.line === line.id) lineProducts.add(p.name) })
                  })
                  if (lineProducts.size === 0) return null
                  const lc = LINE_COLOR[line.id] ?? { bg: 'rgba(28,46,30,0.6)', text: '#728C74' }
                  return (
                    <View key={line.id}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <View style={{ backgroundColor: lc.bg, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                          <Text style={{ color: lc.text, fontSize: 11, fontWeight: '800' }}>{line.id}</Text>
                        </View>
                        <Text style={{ color: '#4A6A50', fontSize: 13, fontWeight: '600' }}>{line.name}</Text>
                      </View>
                      <View style={{ gap: 6 }}>
                        {Array.from(lineProducts).map(productName => {
                          const checked = availableProducts === null || availableProducts.includes(productName)
                          return (
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
                              activeOpacity={0.8}
                              style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 11, borderRadius: 12, backgroundColor: checked ? 'rgba(82,204,100,0.06)' : 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: checked ? 'rgba(82,204,100,0.2)' : '#1A2A1A' }}
                            >
                              <View style={{ width: 20, height: 20, borderRadius: 6, borderWidth: 2, borderColor: checked ? '#52CC64' : '#2D4A30', backgroundColor: checked ? '#52CC64' : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                                {checked && <Text style={{ color: '#080E09', fontSize: 12, fontWeight: '900', lineHeight: 14 }}>✓</Text>}
                              </View>
                              <Text style={{ color: checked ? '#E4F2E7' : '#4A6A50', fontSize: 14, fontWeight: '600', flex: 1 }}>
                                {productName}
                              </Text>
                            </TouchableOpacity>
                          )
                        })}
                      </View>
                    </View>
                  )
                })}
              </View>
            )
          })()}

          {/* Custom: aviso */}
          {selectedTableId === CUSTOM_TABLE_ID && (
            <LinearGradient
              colors={['rgba(124,58,237,0.1)', 'rgba(91,33,182,0.05)']}
              style={{ borderRadius: 14, borderWidth: 1, borderColor: 'rgba(139,92,246,0.25)', padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}
            >
              <Text style={{ fontSize: 20 }}>✨</Text>
              <Text style={{ color: '#A78BFA', fontSize: 13, flex: 1, lineHeight: 19 }}>
                Agrega tus propios productos con dosis separadas para{' '}
                <Text style={{ fontWeight: '800' }}>VEGE</Text> y{' '}
                <Text style={{ fontWeight: '800' }}>FLORA</Text> en la seccion de abajo.
              </Text>
            </LinearGradient>
          )}
        </Section>

        {/* Seccion: Productos propios */}
        <Section label="Productos propios" icon="✏️">
          <Text style={{ color: '#3A5040', fontSize: 13, lineHeight: 19, marginBottom: 6 }}>
            {selectedTableId === CUSTOM_TABLE_ID
              ? 'Carga tus productos con dosis por etapa. Se aplican segun la fase actual de la planta.'
              : 'Suplementos de otras marcas. Se muestran junto a la tabla seleccionada.'}
          </Text>

          {customProducts.length > 0 && (
            <View style={{ gap: 8, marginBottom: 4 }}>
              {customProducts.map((p, i) => (
                <View key={i} style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: '#1C2E1E', borderRadius: 16, overflow: 'hidden' }}>
                  {/* Header row */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, gap: 10 }}>
                    {/* Phase badge */}
                    {p.phases === 'vege' && (
                      <View style={{ backgroundColor: 'rgba(82,204,100,0.15)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: 'rgba(82,204,100,0.25)' }}>
                        <Text style={{ color: '#52CC64', fontSize: 10, fontWeight: '900' }}>🌿 VEGE</Text>
                      </View>
                    )}
                    {p.phases === 'flora' && (
                      <View style={{ backgroundColor: 'rgba(245,158,11,0.15)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: 'rgba(245,158,11,0.25)' }}>
                        <Text style={{ color: '#F59E0B', fontSize: 10, fontWeight: '900' }}>🌸 FLORA</Text>
                      </View>
                    )}
                    {p.phases === 'both' && (
                      <View style={{ backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                        <Text style={{ color: '#728C74', fontSize: 10, fontWeight: '800' }}>{p.unit.toUpperCase()}</Text>
                      </View>
                    )}
                    <Text style={{ color: '#E4F2E7', fontSize: 14, fontWeight: '700', flex: 1 }}>{p.name}</Text>
                    <TouchableOpacity
                      onPress={() => setCustomProducts(prev => prev.filter((_, idx) => idx !== i))}
                      style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Text style={{ color: '#EF4444', fontSize: 14, lineHeight: 16 }}>✕</Text>
                    </TouchableOpacity>
                  </View>
                  {/* Doses row */}
                  <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#1C2E1E' }}>
                    {(p.phases === 'vege' || p.phases === 'both') && (
                      <View style={{ flex: 1, alignItems: 'center', paddingVertical: 8, gap: 2 }}>
                        <Text style={{ color: '#52CC64', fontSize: 10, fontWeight: '800', letterSpacing: 0.8 }}>VEGE</Text>
                        <Text style={{ color: '#B8D4BC', fontSize: 13, fontWeight: '700' }}>
                          {p.vegeMin === p.vegeMax ? p.vegeMax : `${p.vegeMin}–${p.vegeMax}`} {p.unit}/L
                        </Text>
                      </View>
                    )}
                    {p.phases === 'both' && <View style={{ width: 1, backgroundColor: '#1C2E1E' }} />}
                    {(p.phases === 'flora' || p.phases === 'both') && (
                      <View style={{ flex: 1, alignItems: 'center', paddingVertical: 8, gap: 2 }}>
                        <Text style={{ color: '#F59E0B', fontSize: 10, fontWeight: '800', letterSpacing: 0.8 }}>FLORA</Text>
                        <Text style={{ color: '#B8D4BC', fontSize: 13, fontWeight: '700' }}>
                          {p.floraMin === p.floraMax ? p.floraMax : `${p.floraMin}–${p.floraMax}`} {p.unit}/L
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}

          {showAddForm ? (
            <LinearGradient
              colors={['#0D1A10', '#090E09']}
              style={{ borderRadius: 16, borderWidth: 1, borderColor: 'rgba(82,204,100,0.2)', padding: 16, gap: 16 }}
            >
              <Text style={{ color: '#52CC64', fontSize: 13, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase' }}>Nuevo producto</Text>

              <TextInput
                value={newProduct.name}
                onChangeText={v => setNewProduct(p => ({ ...p, name: v }))}
                placeholder="Nombre del producto..."
                placeholderTextColor="#2D4A30"
                autoFocus
                style={inp}
              />

              {/* Unidad */}
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {(['ml', 'gr'] as const).map(u => (
                  <TouchableOpacity key={u} onPress={() => setNewProduct(p => ({ ...p, unit: u }))} activeOpacity={0.8} style={{ flex: 1 }}>
                    {newProduct.unit === u ? (
                      <LinearGradient colors={['#52CC64', '#3DAA50']} style={{ borderRadius: 10, paddingVertical: 12, alignItems: 'center' }}>
                        <Text style={{ color: '#080E09', fontWeight: '900', fontSize: 15 }}>{u}</Text>
                      </LinearGradient>
                    ) : (
                      <View style={{ borderRadius: 10, paddingVertical: 12, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: '#1C2E1E' }}>
                        <Text style={{ color: '#4A7A50', fontWeight: '700', fontSize: 15 }}>{u}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              {/* Fase */}
              <View>
                <Text style={{ color: '#728C74', fontSize: 13, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>Usar en</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {([
                    ['vege',  '🌿', 'Solo VEGE',  '#52CC64', 'rgba(82,204,100,0.15)',  'rgba(82,204,100,0.3)' ],
                    ['flora', '🌸', 'Solo FLORA', '#F59E0B', 'rgba(245,158,11,0.15)', 'rgba(245,158,11,0.3)' ],
                    ['both',  '✨', 'Ambas',      '#A78BFA', 'rgba(167,139,250,0.15)','rgba(167,139,250,0.3)'],
                  ] as const).map(([phase, icon, label, color, bg, border]) => (
                    <TouchableOpacity
                      key={phase}
                      onPress={() => setNewProduct(p => ({ ...p, phases: phase }))}
                      activeOpacity={0.8}
                      style={{ flex: 1, paddingVertical: 11, borderRadius: 12, alignItems: 'center', gap: 3, backgroundColor: newProduct.phases === phase ? bg : 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: newProduct.phases === phase ? border : '#1C2E1E' }}
                    >
                      <Text style={{ fontSize: 16 }}>{icon}</Text>
                      <Text style={{ color: newProduct.phases === phase ? color : '#4A6A50', fontSize: 11, fontWeight: '800' }}>{label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* VEGE doses */}
              {(newProduct.phases === 'vege' || newProduct.phases === 'both') && (
                <View style={{ backgroundColor: 'rgba(82,204,100,0.05)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(82,204,100,0.15)', padding: 12, gap: 10 }}>
                  <Text style={{ color: '#52CC64', fontSize: 11, fontWeight: '800', letterSpacing: 1.2 }}>🌿 VEGETACION (dosis/L)</Text>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#2D5030', fontSize: 11, fontWeight: '700', marginBottom: 6 }}>Min</Text>
                      <Stepper value={newProduct.vegeMin} min={0} max={500} step={1} unit={newProduct.unit}
                        onChange={v => setNewProduct(p => ({ ...p, vegeMin: v, vegeMax: Math.max(v, p.vegeMax) }))} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#2D5030', fontSize: 11, fontWeight: '700', marginBottom: 6 }}>Max</Text>
                      <Stepper value={newProduct.vegeMax} min={newProduct.vegeMin} max={500} step={1} unit={newProduct.unit}
                        onChange={v => setNewProduct(p => ({ ...p, vegeMax: v }))} />
                    </View>
                  </View>
                </View>
              )}

              {/* FLORA doses */}
              {(newProduct.phases === 'flora' || newProduct.phases === 'both') && (
                <View style={{ backgroundColor: 'rgba(245,158,11,0.05)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(245,158,11,0.15)', padding: 12, gap: 10 }}>
                  <Text style={{ color: '#F59E0B', fontSize: 11, fontWeight: '800', letterSpacing: 1.2 }}>🌸 FLORACION (dosis/L)</Text>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#5A3800', fontSize: 11, fontWeight: '700', marginBottom: 6 }}>Min</Text>
                      <Stepper value={newProduct.floraMin} min={0} max={500} step={1} unit={newProduct.unit}
                        onChange={v => setNewProduct(p => ({ ...p, floraMin: v, floraMax: Math.max(v, p.floraMax) }))} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#5A3800', fontSize: 11, fontWeight: '700', marginBottom: 6 }}>Max</Text>
                      <Stepper value={newProduct.floraMax} min={newProduct.floraMin} max={500} step={1} unit={newProduct.unit}
                        onChange={v => setNewProduct(p => ({ ...p, floraMax: v }))} />
                    </View>
                  </View>
                </View>
              )}

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity
                  onPress={() => { setShowAddForm(false); setNewProduct(EMPTY_NEW) }}
                  style={{ flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: '#1C2E1E' }}
                >
                  <Text style={{ color: '#728C74', fontWeight: '600', fontSize: 14 }}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    if (!newProduct.name.trim()) return
                    setCustomProducts(prev => [...prev, { ...newProduct, name: newProduct.name.trim() }])
                    setNewProduct(EMPTY_NEW)
                    setShowAddForm(false)
                  }}
                  disabled={!newProduct.name.trim()}
                  activeOpacity={0.85}
                  style={{ flex: 2 }}
                >
                  <LinearGradient
                    colors={newProduct.name.trim() ? ['#52CC64', '#3DAA50'] : ['#1C2E1E', '#182018']}
                    style={{ borderRadius: 12, paddingVertical: 13, alignItems: 'center' }}
                  >
                    <Text style={{ color: newProduct.name.trim() ? '#080E09' : '#3A5040', fontWeight: '900', fontSize: 14 }}>
                      Agregar producto
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          ) : (
            <TouchableOpacity
              onPress={() => setShowAddForm(true)}
              activeOpacity={0.8}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(82,204,100,0.2)', borderStyle: 'dashed', backgroundColor: 'rgba(82,204,100,0.04)' }}
            >
              <Text style={{ color: '#52CC64', fontSize: 22, lineHeight: 24, fontWeight: '300' }}>+</Text>
              <Text style={{ color: '#52CC64', fontWeight: '700', fontSize: 14 }}>Agregar producto</Text>
            </TouchableOpacity>
          )}
        </Section>

        {/* Zona de peligro */}
        <View style={{ borderRadius: 18, borderWidth: 1, borderColor: 'rgba(239,68,68,0.15)', overflow: 'hidden' }}>
          <LinearGradient colors={['#150505', '#0E0303']} style={{ padding: 16 }}>
            <Text style={{ color: '#3A3A3A', fontSize: 13, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 14 }}>
              Zona de peligro
            </Text>
            <TouchableOpacity
              onPress={handleDelete}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)', backgroundColor: 'rgba(239,68,68,0.06)' }}
            >
              <Text style={{ fontSize: 16 }}>🗑️</Text>
              <Text style={{ color: '#EF4444', fontWeight: '700', fontSize: 14 }}>Eliminar planta permanentemente</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>

      </ScrollView>
    </SafeAreaView>
  )
}

// ─── Componentes locales ─────────────────────────────────────────────────────

function Section({ label, icon, children }: { label: string; icon: string; children: React.ReactNode }) {
  return (
    <LinearGradient colors={['#131A10', '#0C1009']} style={{ borderRadius: 20, borderWidth: 1, borderColor: '#1C2E1E', overflow: 'hidden' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#1A2A1A' }}>
        <Text style={{ fontSize: 16 }}>{icon}</Text>
        <Text style={{ color: '#728C74', fontSize: 13, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' }}>{label}</Text>
      </View>
      <View style={{ padding: 16, gap: 14 }}>
        {children}
      </View>
    </LinearGradient>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 7 }}>
      <Text style={{ color: '#4A6A50', fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' }}>{label}</Text>
      {children}
    </View>
  )
}

function Stepper({ value, min, max, step, unit, onChange }: { value: number; min: number; max: number; step: number; unit: string; onChange: (v: number) => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)', borderWidth: 1, borderColor: '#1C2E1E', borderRadius: 14, overflow: 'hidden' }}>
      <TouchableOpacity
        onPress={() => onChange(Math.max(min, value - step))}
        style={{ width: 44, height: 48, alignItems: 'center', justifyContent: 'center', borderRightWidth: 1, borderRightColor: '#1C2E1E' }}
      >
        <Text style={{ color: value <= min ? '#2D4A30' : '#52CC64', fontSize: 22, fontWeight: '600', lineHeight: 24 }}>−</Text>
      </TouchableOpacity>
      <View style={{ flex: 1, alignItems: 'center' }}>
        <Text style={{ color: '#E4F2E7', fontSize: 17, fontWeight: '900' }}>{value}{unit}</Text>
      </View>
      <TouchableOpacity
        onPress={() => onChange(Math.min(max, value + step))}
        style={{ width: 44, height: 48, alignItems: 'center', justifyContent: 'center', borderLeftWidth: 1, borderLeftColor: '#1C2E1E' }}
      >
        <Text style={{ color: value >= max ? '#2D4A30' : '#52CC64', fontSize: 22, fontWeight: '600', lineHeight: 24 }}>+</Text>
      </TouchableOpacity>
    </View>
  )
}

const inp = {
  backgroundColor: 'rgba(0,0,0,0.35)',
  borderWidth: 1,
  borderColor: '#1C2E1E',
  borderRadius: 14,
  paddingHorizontal: 14,
  paddingVertical: 13,
  color: '#E4F2E7',
  fontSize: 15,
}
