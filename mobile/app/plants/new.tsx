import { useState, useEffect } from 'react'
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import DateTimePicker from '@react-native-community/datetimepicker'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useNutritionTables } from '@/hooks/useNutritionTables'
import { generatePlantSchedule } from '@shared/lib/nutrition-engine'
import type { Plant } from '@shared/types/plant'

type GeneticType = 'feminized' | 'autoflower' | 'regular'

export default function NewPlantScreen() {
  const { user } = useAuth()
  const { tables } = useNutritionTables()

  const [name, setName] = useState('')
  const [geneticType, setGeneticType] = useState<GeneticType>('feminized')
  const [startDate, setStartDate] = useState(new Date())
  const [showDatePicker, setShowDatePicker] = useState(false)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const [isPro, setIsPro] = useState(false)
  const [activePlantCount, setActivePlantCount] = useState<number | null>(null)

  useEffect(() => {
    if (!user) return
    checkProStatus()
  }, [user])

  async function checkProStatus() {
    if (!user) return
    try {
      const [{ data: prof }, { count }] = await Promise.all([
        supabase.from('profiles').select('is_pro').eq('id', user.id).single(),
        supabase.from('plants').select('*', { count: 'exact', head: true })
          .eq('user_id', user.id).eq('status', 'active'),
      ])
      setIsPro(prof?.is_pro ?? false)
      setActivePlantCount(count ?? 0)
    } catch (e) {
      console.error('Error checking pro status:', e)
      setActivePlantCount(0)
    }
  }

  function validateForm(): boolean {
    const errors: Record<string, string> = {}

    // Validar nombre
    if (!name.trim()) {
      errors.name = 'El nombre es requerido'
    } else if (name.trim().length < 2) {
      errors.name = 'El nombre debe tener al menos 2 caracteres'
    } else if (name.trim().length > 50) {
      errors.name = 'El nombre no puede superar 50 caracteres'
    }

    // Validar tipo de genética
    if (!geneticType) {
      errors.geneticType = 'Selecciona un tipo de genética'
    }

    // Validar fecha
    if (!startDate) {
      errors.startDate = 'Selecciona una fecha de inicio'
    } else {
      const now = new Date()
      const oneYearAgo = new Date()
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)

      if (startDate > now) {
        errors.startDate = 'La fecha no puede ser en el futuro'
      } else if (startDate < oneYearAgo) {
        errors.startDate = 'La fecha no puede ser hace más de 1 año'
      }
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  function handleDateChange(event: any, selectedDate?: Date) {
    setShowDatePicker(false)
    if (selectedDate) {
      setStartDate(selectedDate)
    }
  }

  async function handleCreate() {
    if (!validateForm()) {
      const errorMessages = Object.values(fieldErrors).join('\n')
      Alert.alert('Validación requerida', errorMessages)
      return
    }

    if (!user) {
      Alert.alert('Error', 'No hay usuario autenticado')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Crear planta en BD
      const { data: plantRow, error: plantErr } = await supabase
        .from('plants')
        .insert({
          user_id: user.id,
          name: name.trim(),
          genetics: name.trim(),
          genetic_type: geneticType,
          sex: null,
          auto_flower_total_days: geneticType === 'autoflower' ? 77 : null,
          start_date: startDate.toISOString().split('T')[0],
          nutrition_table_id: tables[0]?.id || 'revegetar',
          location: 'indoor',
          pot_count: 1,
          pot_volume_liters: 11,
          status: 'active',
        })
        .select()
        .single()

      if (plantErr || !plantRow) throw plantErr || new Error('No se pudo crear la planta')

      // Generar tareas del calendario
      const table = tables.find(t => t.id === plantRow.nutrition_table_id) || tables[0]
      if (table) {
        const plant: Plant = {
          id: plantRow.id,
          name: plantRow.name,
          genetics: plantRow.genetics,
          geneticType,
          sex: 'unknown',
          startDate,
          location: 'indoor',
          potCount: 1,
          potVolumeLiters: 11,
          nutritionTableId: table.id,
          status: 'active',
        }

        const tasks = generatePlantSchedule(plant, table)
        if (tasks.length > 0) {
          await supabase.from('scheduled_tasks').insert(
            tasks.map(t => ({
              user_id: user.id,
              plant_id: plantRow.id,
              type: t.type,
              scheduled_date: t.scheduledDate.toISOString().split('T')[0],
              cycle: t.cycle,
              week: t.week,
              stage: t.stage,
              products: t.products,
              ec_min: t.ecMin,
              ec_max: t.ecMax,
              ph_min: t.phMin,
              ph_max: t.phMax,
            }))
          )
        }
      }

      // Exito
      setSuccess(true)
      setTimeout(() => {
        router.replace('/(tabs)/plants')
      }, 1500)

    } catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : 'Error al crear la planta'
      setError(errorMsg)
      Alert.alert('Error', errorMsg, [{ text: 'Reintentar' }])
    } finally {
      setLoading(false)
    }
  }

  // Pantalla de carga
  if (activePlantCount === null) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0C1410', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#52CC64" />
      </SafeAreaView>
    )
  }

  // Pantalla de limite de plantas
  if (activePlantCount >= 1 && !isPro) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0C1410', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
        <Text style={{ fontSize: 48, marginBottom: 16 }}>🌿</Text>
        <Text style={{ color: '#E4F2E7', fontSize: 20, fontWeight: '900', textAlign: 'center', marginBottom: 12 }}>
          Plan gratuito
        </Text>
        <Text style={{ color: '#728C74', fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 32 }}>
          Con el plan gratuito podes tener 1 planta activa. Upgradea a Pro para cultivos ilimitados.
        </Text>
        <View style={{ backgroundColor: '#131D14', borderRadius: 16, borderWidth: 1, borderColor: '#52CC64', padding: 20, width: '100%', alignItems: 'center', marginBottom: 24 }}>
          <Text style={{ color: '#52CC64', fontSize: 16, fontWeight: '900', marginBottom: 4 }}>Pro - USD 5/mes</Text>
          <Text style={{ color: '#728C74', fontSize: 12, textAlign: 'center' }}>Plantas ilimitadas · Todas las tablas · IA</Text>
        </View>
        <TouchableOpacity onPress={() => router.back()} style={{ paddingVertical: 14, alignItems: 'center' }}>
          <Text style={{ color: '#728C74', fontSize: 14 }}>← Volver</Text>
        </TouchableOpacity>
      </SafeAreaView>
    )
  }

  // Pantalla de exito
  if (success) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0C1410', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
        <Text style={{ fontSize: 60, marginBottom: 16 }}>🌱</Text>
        <Text style={{ color: '#52CC64', fontSize: 24, fontWeight: '900', textAlign: 'center', marginBottom: 8 }}>
          Planta creada
        </Text>
        <Text style={{ color: '#728C74', fontSize: 14, textAlign: 'center', lineHeight: 22 }}>
          Tu calendario se genera automaticamente. Redirigiéndote...
        </Text>
      </SafeAreaView>
    )
  }

  // Formulario principal
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0C1410' }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>

        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 28 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
            <Text style={{ color: '#52CC64', fontSize: 28 }}>←</Text>
          </TouchableOpacity>
          <View>
            <Text style={{ color: '#E4F2E7', fontSize: 22, fontWeight: '900' }}>Nueva planta</Text>
            <Text style={{ color: '#728C74', fontSize: 13 }}>El calendario se genera automáticamente</Text>
          </View>
        </View>

        {/* Error Message */}
        {error && (
          <View style={{ backgroundColor: '#3D1C1C', borderRadius: 12, padding: 12, marginBottom: 16, borderLeftWidth: 4, borderLeftColor: '#FF6B6B' }}>
            <Text style={{ color: '#FF8787', fontSize: 13, fontWeight: '600' }}>
              {error}
            </Text>
          </View>
        )}

        {/* NOMBRE */}
        <Text style={labelStyle}>NOMBRE *</Text>
        <TextInput
          value={name}
          onChangeText={(text) => {
            setName(text)
            // Limpiar error cuando empieza a escribir
            if (text.trim().length >= 2) {
              setFieldErrors((prev) => {
                const newErrors = { ...prev }
                delete newErrors.name
                return newErrors
              })
            }
          }}
          placeholder="Ej: White Widow #1"
          placeholderTextColor="#3A5040"
          style={[inputStyle, fieldErrors.name && { borderColor: '#FF6B6B', borderWidth: 1.5 }]}
          editable={!loading}
          maxLength={50}
        />
        {fieldErrors.name && (
          <Text style={{ color: '#FF8787', fontSize: 12, marginTop: 6 }}>
            {fieldErrors.name}
          </Text>
        )}

        {/* TIPO DE GENETICA */}
        <Text style={[labelStyle, { marginTop: 24 }]}>TIPO DE GENÉTICA *</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: fieldErrors.geneticType ? 0 : 0 }}>
          {(['feminized', 'autoflower', 'regular'] as GeneticType[]).map(type => (
            <TouchableOpacity
              key={type}
              onPress={() => {
                setGeneticType(type)
                // Limpiar error cuando selecciona
                setFieldErrors((prev) => {
                  const newErrors = { ...prev }
                  delete newErrors.geneticType
                  return newErrors
                })
              }}
              disabled={loading}
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: 14,
                alignItems: 'center',
                backgroundColor: geneticType === type ? '#1A3D1E' : '#131D14',
                borderWidth: fieldErrors.geneticType && geneticType === type ? 1.5 : 1,
                borderColor: fieldErrors.geneticType && geneticType === type ? '#FF6B6B' : geneticType === type ? '#52CC64' : '#1C2E1E',
                opacity: loading ? 0.5 : 1,
              }}
            >
              <Text style={{
                color: geneticType === type ? '#52CC64' : '#728C74',
                fontWeight: '700',
                fontSize: 13,
              }}>
                {type === 'feminized' ? 'Feminizada' : type === 'autoflower' ? 'Autofloreciente' : 'Regular'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {fieldErrors.geneticType && (
          <Text style={{ color: '#FF8787', fontSize: 12, marginTop: 6 }}>
            {fieldErrors.geneticType}
          </Text>
        )}

        {/* FECHA DE INICIO */}
        <Text style={[labelStyle, { marginTop: 24 }]}>FECHA DE INICIO *</Text>
        <TouchableOpacity
          onPress={() => setShowDatePicker(true)}
          disabled={loading}
          style={{
            ...inputStyle,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            borderColor: fieldErrors.startDate ? '#FF6B6B' : '#1C2E1E',
            borderWidth: fieldErrors.startDate ? 1.5 : 1,
            opacity: loading ? 0.5 : 1,
          } as any}
        >
          <Text style={{ color: '#E4F2E7', fontSize: 15 }}>
            {startDate.toLocaleDateString('es-AR')}
          </Text>
          <Text style={{ color: '#728C74', fontSize: 16 }}>📅</Text>
        </TouchableOpacity>
        {fieldErrors.startDate && (
          <Text style={{ color: '#FF8787', fontSize: 12, marginTop: 6 }}>
            {fieldErrors.startDate}
          </Text>
        )}

        {showDatePicker && (
          <DateTimePicker
            value={startDate}
            mode="date"
            display={process.env.EXPO_OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, selectedDate) => {
              handleDateChange(event, selectedDate)
              // Limpiar error cuando selecciona fecha
              if (selectedDate) {
                setFieldErrors((prev) => {
                  const newErrors = { ...prev }
                  delete newErrors.startDate
                  return newErrors
                })
              }
            }}
            maximumDate={new Date()}
          />
        )}

        {/* Boton crear */}
        <TouchableOpacity
          onPress={handleCreate}
          disabled={!name.trim() || !geneticType || loading}
          style={{
            marginTop: 40,
            backgroundColor: '#52CC64',
            borderRadius: 18,
            paddingVertical: 18,
            alignItems: 'center',
            opacity: (!name.trim() || !geneticType || loading) ? 0.5 : 1,
          }}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={{ color: 'white', fontWeight: '800', fontSize: 16 }}>
              Crear planta →
            </Text>
          )}
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
