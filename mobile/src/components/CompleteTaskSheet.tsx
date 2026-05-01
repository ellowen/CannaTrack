import { useState, useEffect, useRef } from 'react'
import { View, Text, TextInput, TouchableOpacity, Modal, KeyboardAvoidingView, Platform, Animated, PanResponder, Dimensions, Alert, ScrollView } from 'react-native'
import * as Haptics from 'expo-haptics'
import { track } from '@/lib/analytics'

const TYPE_LABEL: Record<string, string> = {
  nutrition:   'Nutricion',
  irrigation:  'Riego',
  foliar:      'Foliar',
  observation: 'Observacion',
  harvest:     'Cosecha',
}
const TYPE_ICON: Record<string, string> = {
  nutrition:   '🍃',
  irrigation:  '💧',
  foliar:      '🌫️',
  observation: '🔍',
  harvest:     '✂️',
}

// Lineas de REVEGETAR y TOPCROP → colores
const LINE_COLOR: Record<string, { bg: string; text: string }> = {
  BIO:   { bg: '#14532D', text: '#4ADE80' },
  ECO:   { bg: '#451A03', text: '#FB923C' },
  LIFE:  { bg: '#1E3A5F', text: '#60A5FA' },
  FUEL:  { bg: '#3B0764', text: '#C084FC' },
  PRO:   { bg: '#431407', text: '#FB923C' },
  MID:   { bg: '#4a0d2e', text: '#F472B6' },
  BASIC: { bg: '#4c0519', text: '#FDA4AF' },
}
const DEFAULT_LINE_COLOR = { bg: '#1C2E1E', text: '#728C74' }

const MEASUREMENT_TYPES = new Set(['nutrition', 'irrigation'])
const RECIPE_TYPES      = new Set(['nutrition', 'foliar'])

function fmt(n: number) {
  return parseFloat(n.toFixed(1)).toString()
}

export interface SheetTask {
  id:               string
  type:             string
  week:             number
  cycle:            string
  products?:        Array<{ name: string; minDose: number; maxDose: number; unit: string; line?: string }>
  ecMin?:           number
  ecMax?:           number
  phMin?:           number
  phMax?:           number
  potCount?:        number
  potVolumeLiters?: number
}

interface Props {
  visible:    boolean
  task:       SheetTask | null
  onClose:    () => void
  onComplete: (taskId: string, notes?: string, ec?: number, ph?: number) => void
}

export function CompleteTaskSheet({ visible, task, onClose, onComplete }: Props) {
  const [ec, setEc]               = useState('')
  const [ph, setPh]               = useState('')
  const [notes, setNotes]         = useState('')
  const [recipeOpen, setRecipeOpen] = useState(false)
  const [xpReward, setXpReward]   = useState<{ xp: number } | null>(null)
  const [scrollEnabled, setScrollEnabled] = useState(true)

  const panY = useRef(new Animated.Value(0)).current
  const opacityAnim = useRef(new Animated.Value(1)).current
  const handleOpacityAnim = useRef(new Animated.Value(0.5)).current

  const SWIPE_THRESHOLD = 100
  const VELOCITY_THRESHOLD = 0.5

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !xpReward && scrollEnabled,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        const isVerticalSwipe = Math.abs(gestureState.dy) > 10 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx)
        return isVerticalSwipe && !xpReward && scrollEnabled && gestureState.dy > 0
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          panY.setValue(gestureState.dy)
          // Animate opacity and handle based on drag progress
          const progress = Math.min(gestureState.dy / SWIPE_THRESHOLD, 1)
          opacityAnim.setValue(1 - progress * 0.2)
          handleOpacityAnim.setValue(0.5 + progress * 0.3)
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        const isFastSwipe = gestureState.vy > VELOCITY_THRESHOLD
        const passesThreshold = gestureState.dy > SWIPE_THRESHOLD

        if ((passesThreshold || isFastSwipe) && gestureState.dy > 0) {
          // Trigger haptics and dismiss
          try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
          } catch {
            // Haptics not available on all platforms
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
          // Bounce back
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
    if (visible) {
      setEc(''); setPh(''); setNotes(''); setRecipeOpen(false); setXpReward(null)
      setScrollEnabled(true)
      panY.setValue(0)
      opacityAnim.setValue(1)
      handleOpacityAnim.setValue(0.5)
    }
  }, [visible, task?.id])

  if (!task) return null

  const t           = task  // narrowed non-null ref for closures
  const showMeasure = MEASUREMENT_TYPES.has(t.type)
  const showRecipe  = RECIPE_TYPES.has(t.type) && (t.products?.length ?? 0) > 0
  const liters      = (t.potCount ?? 1) * (t.potVolumeLiters ?? 10)
  const ecNum       = parseFloat(ec)
  const phNum       = parseFloat(ph)
  const hasMeasure  = !isNaN(ecNum) && ecNum > 0 && !isNaN(phNum) && phNum > 0
  const weekLabel   = t.cycle === 'vege' ? `V${t.week}` : `F${t.week}`
  const icon        = TYPE_ICON[t.type] ?? '📌'
  const label       = TYPE_LABEL[t.type] ?? t.type

  // Status en tiempo real de EC y pH
  function ecStatus(): 'ok' | 'warn' | 'bad' | null {
    if (!ec || isNaN(ecNum) || !t.ecMin) return null
    if (ecNum >= t.ecMin && ecNum <= (t.ecMax ?? 99))  return 'ok'
    if (Math.abs(ecNum - (ecNum < t.ecMin ? t.ecMin : t.ecMax ?? t.ecMin)) < 0.3) return 'warn'
    return 'bad'
  }
  function phStatus(): 'ok' | 'warn' | 'bad' | null {
    if (!ph || isNaN(phNum) || !t.phMin) return null
    if (phNum >= t.phMin && phNum <= (t.phMax ?? 99))  return 'ok'
    if (Math.abs(phNum - (phNum < t.phMin ? t.phMin : t.phMax ?? t.phMin)) < 0.3) return 'warn'
    return 'bad'
  }

  const STATUS_COLOR = { ok: '#52CC64', warn: '#F59E0B', bad: '#EF4444' }
  const STATUS_ICON  = { ok: '✓', warn: '~', bad: '✕' }
  const STATUS_LABEL = { ok: 'Ideal', warn: 'Cerca', bad: 'Fuera' }

  const ec_st = ecStatus()
  const ph_st = phStatus()

  function confirmLabel() {
    if (hasMeasure)        return 'Guardar EC/pH ✓'
    if (notes.trim())      return 'Guardar nota ✓'
    return 'Confirmar ✓'
  }

  function handleSkip() {
    track('task_completed', { task_type: task!.type, cycle: task!.cycle, week: task!.week, with_notes: false, with_measures: false })
    onComplete(task!.id)
    onClose()
  }

  function handleConfirm() {
    const xp = hasMeasure ? 25 : 15
    setXpReward({ xp })
    track('task_completed', { task_type: task!.type, cycle: task!.cycle, week: task!.week, with_notes: !!notes.trim(), with_measures: hasMeasure })
    onComplete(
      task!.id,
      notes.trim() || undefined,
      ec ? ecNum : undefined,
      ph ? phNum : undefined,
    )
    setTimeout(() => {
      setXpReward(null)
      onClose()
    }, 1400)
  }

  function handleDismiss() {
    if (notes.trim() || ec.trim() || ph.trim()) {
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
            padding: 20, paddingBottom: 40,
            overflow: 'hidden',
            transform: [{ translateY: panY }],
            opacity: opacityAnim,
          }}
          {...panResponder.panHandlers}
        >

          {/* XP Reward overlay */}
          {xpReward && (
            <View style={{
              position: 'absolute', inset: 0, top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: '#131D14',
              borderTopLeftRadius: 24, borderTopRightRadius: 24,
              alignItems: 'center', justifyContent: 'center',
              paddingVertical: 48,
              zIndex: 10,
            }}>
              <Text style={{ fontSize: 52, marginBottom: 12 }}>✅</Text>
              <Text style={{ color: '#E4F2E7', fontSize: 22, fontWeight: '900', marginBottom: 8 }}>
                Tarea completada
              </Text>
              <Text style={{ color: '#52CC64', fontSize: 36, fontWeight: '900' }}>
                +{xpReward.xp} XP
              </Text>
            </View>
          )}

          {/* Handle */}
          <Animated.View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: '#1C2E1E', alignSelf: 'center', marginBottom: 16, opacity: handleOpacityAnim }} />

          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 18 }}>
            <Text style={{ fontSize: 22, marginTop: 1 }}>{icon}</Text>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Text style={{ color: '#E4F2E7', fontSize: 17, fontWeight: '900' }}>
                  {label} completada ✓
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={{
                  backgroundColor: t.cycle === 'flora' ? '#2D1A4A' : '#0D2010',
                  borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2,
                }}>
                  <Text style={{
                    color: t.cycle === 'flora' ? '#C084FC' : '#52CC64',
                    fontSize: 10, fontWeight: '800',
                  }}>{weekLabel}</Text>
                </View>
                {t.ecMin != null && (
                  <Text style={{ color: '#3A5040', fontSize: 10 }}>
                    Objetivo: EC {t.ecMin}–{t.ecMax} · pH {t.phMin}–{t.phMax}
                  </Text>
                )}
              </View>
            </View>
          </View>

          {/* Receta colapsable — nutricion y foliar */}
          {showRecipe && (
            <View style={{ marginBottom: 14 }}>
              <TouchableOpacity
                onPress={() => setRecipeOpen(v => !v)}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 }}
                activeOpacity={0.7}
              >
                <Text style={{ color: '#728C74', fontSize: 10, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' }}>
                  🧪 Receta · {t.products!.length} producto{t.products!.length > 1 ? 's' : ''}
                </Text>
                <Text style={{ color: '#3A5040', fontSize: 12 }}>{recipeOpen ? '▲' : '▼'}</Text>
              </TouchableOpacity>

              {recipeOpen && (
                <View style={{
                  backgroundColor: '#0C1410', borderRadius: 14,
                  borderWidth: 1, borderColor: '#1C2E1E', overflow: 'hidden',
                }}>
                  <Text style={{ color: '#3A5040', fontSize: 10, fontWeight: '600', paddingHorizontal: 12, paddingTop: 10, paddingBottom: 4 }}>
                    Para {fmt(liters)}L ({t.potCount ?? 1} maceta{(t.potCount ?? 1) > 1 ? 's' : ''} × {t.potVolumeLiters ?? 10}L)
                  </Text>
                  {t.products!.map((p, i) => {
                    const minVol = fmt(p.minDose * liters)
                    const maxVol = fmt(p.maxDose * liters)
                    const lineCol = LINE_COLOR[p.line ?? ''] ?? DEFAULT_LINE_COLOR
                    return (
                      <View key={i} style={{
                        flexDirection: 'row', alignItems: 'center', gap: 8,
                        paddingHorizontal: 12, paddingVertical: 10,
                        borderTopWidth: i > 0 ? 1 : 0, borderTopColor: '#1C2E1E',
                      }}>
                        {p.line && (
                          <View style={{ backgroundColor: lineCol.bg, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 }}>
                            <Text style={{ color: lineCol.text, fontSize: 9, fontWeight: '800' }}>{p.line}</Text>
                          </View>
                        )}
                        <Text style={{ color: '#B8D4BC', fontSize: 12, fontWeight: '600', flex: 1 }}>{p.name}</Text>
                        <Text style={{ color: '#E4F2E7', fontSize: 12, fontWeight: '800' }}>
                          {minVol === maxVol ? minVol : `${minVol}–${maxVol}`} {p.unit}
                        </Text>
                      </View>
                    )
                  })}
                </View>
              )}
            </View>
          )}

          {/* EC / pH con feedback en tiempo real */}
          {showMeasure && (
            <View style={{ marginBottom: 14 }}>
              <Text style={lbl}>💧 Medicion (opcional)</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <Text style={lbl}>EC</Text>
                    {ec_st && (
                      <Text style={{ color: STATUS_COLOR[ec_st], fontSize: 10, fontWeight: '800' }}>
                        {STATUS_ICON[ec_st]} {STATUS_LABEL[ec_st]}
                      </Text>
                    )}
                  </View>
                  <TextInput
                    value={ec}
                    onChangeText={setEc}
                    keyboardType="decimal-pad"
                    placeholder="1.2"
                    placeholderTextColor="#3A5040"
                    style={[
                      inp,
                      ec_st === 'ok'   && { borderColor: '#52CC64' },
                      ec_st === 'warn' && { borderColor: '#F59E0B' },
                      ec_st === 'bad'  && { borderColor: '#EF4444' },
                    ]}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <Text style={lbl}>pH</Text>
                    {ph_st && (
                      <Text style={{ color: STATUS_COLOR[ph_st], fontSize: 10, fontWeight: '800' }}>
                        {STATUS_ICON[ph_st]} {STATUS_LABEL[ph_st]}
                      </Text>
                    )}
                  </View>
                  <TextInput
                    value={ph}
                    onChangeText={setPh}
                    keyboardType="decimal-pad"
                    placeholder="6.2"
                    placeholderTextColor="#3A5040"
                    style={[
                      inp,
                      ph_st === 'ok'   && { borderColor: '#52CC64' },
                      ph_st === 'warn' && { borderColor: '#F59E0B' },
                      ph_st === 'bad'  && { borderColor: '#EF4444' },
                    ]}
                  />
                </View>
              </View>
            </View>
          )}

          {/* Notas */}
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder={showMeasure ? 'Observaciones adicionales... (opcional)' : 'Observaciones, estado de la planta... (opcional)'}
            placeholderTextColor="#3A5040"
            multiline
            style={[inp, { minHeight: 60, textAlignVertical: 'top', marginBottom: 18 }]}
          />

          {/* Botones */}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity
              onPress={handleSkip}
              style={{
                flex: 1, backgroundColor: '#0C1410', borderRadius: 14,
                borderWidth: 1, borderColor: '#1C2E1E',
                paddingVertical: 14, alignItems: 'center',
              }}
            >
              <Text style={{ color: '#728C74', fontWeight: '700', fontSize: 13 }}>Saltar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleConfirm}
              style={{
                flex: 2, backgroundColor: '#52CC64', borderRadius: 14,
                paddingVertical: 14, alignItems: 'center',
              }}
            >
              <Text style={{ color: '#0C1410', fontWeight: '900', fontSize: 14 }}>{confirmLabel()}</Text>
            </TouchableOpacity>
          </View>

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

const inp: object = {
  backgroundColor: '#0C1410',
  borderWidth: 1,
  borderColor: '#1C2E1E',
  borderRadius: 12,
  paddingHorizontal: 14,
  paddingVertical: 11,
  color: '#E4F2E7',
  fontSize: 15,
}
