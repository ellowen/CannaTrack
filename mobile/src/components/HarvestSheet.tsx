import { useState, useEffect, useRef } from 'react'
import { View, Text, TextInput, TouchableOpacity, Modal, KeyboardAvoidingView, Platform, Animated, PanResponder, Dimensions, Alert } from 'react-native'
import format from 'date-fns/format'
import differenceInDays from 'date-fns/differenceInDays'
import { es } from 'date-fns/locale'
import * as Haptics from 'expo-haptics'
import { supabase } from '@/lib/supabase'
import type { Plant } from '@shared/types/plant'

interface Props {
  visible:   boolean
  plant:     Plant | null
  onClose:   () => void
  onHarvest: (grams?: number) => void
  onDiscard: () => void
}

export function HarvestSheet({ visible, plant, onClose, onHarvest, onDiscard }: Props) {
  const [tab, setTab]           = useState<'harvest' | 'discard'>('harvest')
  const [grams, setGrams]       = useState('')
  const [stats, setStats]       = useState<{ growDays: number; pct: number; avgEc: string | null; avgPh: string | null } | null>(null)

  const panY = useRef(new Animated.Value(0)).current
  const opacityAnim = useRef(new Animated.Value(1)).current
  const handleOpacityAnim = useRef(new Animated.Value(0.5)).current

  const SWIPE_THRESHOLD = 100
  const VELOCITY_THRESHOLD = 0.5

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        const isVerticalSwipe = Math.abs(gestureState.dy) > 10 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx)
        return isVerticalSwipe && gestureState.dy > 0
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          panY.setValue(gestureState.dy)
          const progress = Math.min(gestureState.dy / SWIPE_THRESHOLD, 1)
          opacityAnim.setValue(1 - progress * 0.2)
          handleOpacityAnim.setValue(0.5 + progress * 0.3)
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        const isFastSwipe = gestureState.vy > VELOCITY_THRESHOLD
        const passesThreshold = gestureState.dy > SWIPE_THRESHOLD

        if ((passesThreshold || isFastSwipe) && gestureState.dy > 0) {
          try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
          } catch {
            // Haptics not available
          }

          Animated.timing(panY, {
            toValue: Dimensions.get('window').height,
            duration: 300,
            useNativeDriver: false,
          }).start()

          setTimeout(() => {
            onClose()
            panY.setValue(0)
            opacityAnim.setValue(1)
            handleOpacityAnim.setValue(0.5)
          }, 300)
        } else {
          Animated.spring(panY, {
            toValue: 0,
            useNativeDriver: false,
            bounciness: 8,
          }).start()
          Animated.spring(opacityAnim, {
            toValue: 1,
            useNativeDriver: false,
            bounciness: 8,
          }).start()
          Animated.spring(handleOpacityAnim, {
            toValue: 0.5,
            useNativeDriver: false,
            bounciness: 8,
          }).start()
        }
      },
    })
  ).current

  useEffect(() => {
    if (!visible || !plant) return
    setTab('harvest'); setGrams('')
    panY.setValue(0)
    opacityAnim.setValue(1)
    handleOpacityAnim.setValue(0.5)

    async function loadStats() {
      const today = new Date()
      const growDays = differenceInDays(today, plant!.startDate)

      const [{ data: tasks }, { data: measures }] = await Promise.all([
        supabase.from('scheduled_tasks').select('completed').eq('plant_id', plant!.id),
        supabase.from('measurements').select('ec, ph').eq('plant_id', plant!.id),
      ])

      const total     = tasks?.length ?? 0
      const completed = tasks?.filter(t => t.completed).length ?? 0
      const pct       = total > 0 ? Math.round((completed / total) * 100) : 0

      const validMeasures = (measures ?? []).filter(m => m.ec != null && m.ph != null)
      const avgEc = validMeasures.length > 0
        ? (validMeasures.reduce((s, m) => s + m.ec, 0) / validMeasures.length).toFixed(2)
        : null
      const avgPh = validMeasures.length > 0
        ? (validMeasures.reduce((s, m) => s + m.ph, 0) / validMeasures.length).toFixed(2)
        : null

      setStats({ growDays, pct, avgEc, avgPh })
    }

    loadStats()
  }, [visible, plant?.id])

  if (!plant) return null

  const today = new Date()

  function handleDismiss() {
    if (grams.trim()) {
      Alert.alert(
        'Descartar cambios',
        'Tienes datos sin guardar. ¿Estás seguro?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Descartar', style: 'destructive', onPress: () => {
            onClose()
            panY.setValue(0)
            opacityAnim.setValue(1)
            handleOpacityAnim.setValue(0.5)
          }},
        ]
      )
    } else {
      onClose()
    }
  }

  function handleConfirm() {
    if (tab === 'harvest') {
      const g = parseFloat(grams)
      onHarvest(!isNaN(g) && g > 0 ? g : undefined)
    } else {
      onDiscard()
    }
    onClose()
  }

  const statsItems = stats ? [
    { value: `${stats.growDays}d`, label: 'Grow total' },
    { value: `${stats.pct}%`,      label: 'Tareas ✓' },
    { value: stats.avgEc ?? '--',  label: 'EC media' },
    { value: stats.avgPh ?? '--',  label: 'pH medio' },
  ] : null

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleDismiss}>
      <Animated.View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }}>
        <TouchableOpacity
          style={{ flex: 1 }}
          activeOpacity={1}
          onPress={handleDismiss}
        />
      </Animated.View>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}
      >
        <Animated.View
          style={{
            backgroundColor: '#131D14',
            borderTopLeftRadius: 24, borderTopRightRadius: 24,
            borderTopWidth: 1, borderTopColor: '#1C2E1E',
            padding: 20, paddingBottom: 44,
            transform: [{ translateY: panY }],
            opacity: opacityAnim,
          }}
          {...panResponder.panHandlers}
        >
          {/* Handle */}
          <Animated.View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: '#1C2E1E', alignSelf: 'center', marginBottom: 16, opacity: handleOpacityAnim }} />

          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }}>
            <View>
              <Text style={{ color: '#E4F2E7', fontSize: 18, fontWeight: '900' }}>{plant.name}</Text>
              <Text style={{ color: '#728C74', fontSize: 12, marginTop: 2 }}>{plant.genetics}</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={{ backgroundColor: '#0C1410', borderRadius: 10, padding: 6, borderWidth: 1, borderColor: '#1C2E1E' }}
            >
              <Text style={{ color: '#728C74', fontSize: 14, lineHeight: 14 }}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Stats grid */}
          {statsItems && (
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
              {statsItems.map(s => (
                <View key={s.label} style={{
                  flex: 1, backgroundColor: '#0C1410', borderRadius: 14,
                  borderWidth: 1, borderColor: '#1C2E1E', padding: 10, alignItems: 'center',
                }}>
                  <Text style={{ color: '#E4F2E7', fontSize: 17, fontWeight: '900', lineHeight: 20 }}>{s.value}</Text>
                  <Text style={{ color: '#3A5040', fontSize: 9, fontWeight: '700', marginTop: 3, textAlign: 'center' }}>{s.label}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Timeline */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 18 }}>
            <Text style={{ color: '#728C74', fontSize: 11 }}>
              📅 {format(plant.startDate, "d MMM yyyy", { locale: es })}
            </Text>
            <View style={{ flex: 1, height: 1, backgroundColor: '#1C2E1E' }} />
            <Text style={{ color: '#728C74', fontSize: 11 }}>
              🌸 {format(today, "d MMM yyyy", { locale: es })}
            </Text>
          </View>

          {/* Tabs */}
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
            <TouchableOpacity
              onPress={() => setTab('harvest')}
              style={{
                flex: 1, paddingVertical: 12, borderRadius: 14, alignItems: 'center',
                backgroundColor: tab === 'harvest' ? '#52CC64' : '#0C1410',
                borderWidth: 1,
                borderColor: tab === 'harvest' ? '#52CC64' : '#1C2E1E',
              }}
            >
              <Text style={{
                fontWeight: '800', fontSize: 13,
                color: tab === 'harvest' ? '#0C1410' : '#728C74',
              }}>✂️ Cosechar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setTab('discard')}
              style={{
                flex: 1, paddingVertical: 12, borderRadius: 14, alignItems: 'center',
                backgroundColor: tab === 'discard' ? '#4B1515' : '#0C1410',
                borderWidth: 1,
                borderColor: tab === 'discard' ? '#EF4444' : '#1C2E1E',
              }}
            >
              <Text style={{
                fontWeight: '800', fontSize: 13,
                color: tab === 'discard' ? '#EF4444' : '#728C74',
              }}>🗑️ Descartar</Text>
            </TouchableOpacity>
          </View>

          {/* Grams input — solo en harvest */}
          {tab === 'harvest' && (
            <View style={{ marginBottom: 14 }}>
              <Text style={lbl}>Gramos cosechados (opcional)</Text>
              <TextInput
                value={grams}
                onChangeText={setGrams}
                placeholder="ej: 45.5"
                placeholderTextColor="#3A5040"
                keyboardType="decimal-pad"
                style={{
                  backgroundColor: '#0C1410', borderRadius: 12,
                  borderWidth: 1, borderColor: '#1C2E1E',
                  color: '#E4F2E7', fontSize: 16, padding: 13,
                }}
              />
            </View>
          )}

          {/* Descripcion */}
          <Text style={{ color: '#728C74', fontSize: 12, lineHeight: 18, marginBottom: 16 }}>
            {tab === 'harvest'
              ? '🎉 Excelente trabajo! La planta pasara al historial de cosechas.'
              : '⚠️ La planta se marcara como descartada. No se puede deshacer.'}
          </Text>

          {/* Confirmar */}
          <TouchableOpacity
            onPress={handleConfirm}
            style={{
              borderRadius: 16, paddingVertical: 16, alignItems: 'center',
              backgroundColor: tab === 'harvest' ? '#52CC64' : '#4B1515',
            }}
          >
            <Text style={{
              fontWeight: '900', fontSize: 15,
              color: tab === 'harvest' ? '#0C1410' : '#EF4444',
            }}>
              {tab === 'harvest' ? '✂️ Confirmar cosecha  +100 XP' : '🗑️ Confirmar descarte'}
            </Text>
          </TouchableOpacity>

        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const lbl = {
  color: '#728C74' as const,
  fontSize: 10,
  fontWeight: '700' as const,
  letterSpacing: 1.2,
  textTransform: 'uppercase' as const,
  marginBottom: 6,
}
