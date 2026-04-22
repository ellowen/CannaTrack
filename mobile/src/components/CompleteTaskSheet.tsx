import { useState, useEffect } from 'react'
import { View, Text, TextInput, TouchableOpacity, Modal, KeyboardAvoidingView, Platform } from 'react-native'

interface SheetTask {
  id: string
  type: string
  week: number
  cycle: string
}

interface Props {
  visible: boolean
  task: SheetTask | null
  onClose: () => void
  onComplete: (taskId: string, notes?: string, ec?: number, ph?: number) => void
}

const TYPE_LABEL: Record<string, string> = {
  nutrition: 'Nutricion', irrigation: 'Riego',
  foliar: 'Foliar', observation: 'Observacion', harvest: 'Cosecha',
}

export function CompleteTaskSheet({ visible, task, onClose, onComplete }: Props) {
  const [ec, setEc]       = useState('')
  const [ph, setPh]       = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (!visible) { setEc(''); setPh(''); setNotes('') }
  }, [visible])

  if (!task) return null

  const showMeasurements = task.type === 'nutrition' || task.type === 'irrigation'
  const hasMeasurement   = ec.trim() !== '' || ph.trim() !== ''
  const weekLabel        = `${task.cycle === 'vege' ? 'V' : 'F'}${task.week}`

  function handleComplete() {
    onComplete(
      task!.id,
      notes.trim() || undefined,
      ec ? parseFloat(ec) : undefined,
      ph ? parseFloat(ph) : undefined,
    )
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }}
        activeOpacity={1}
        onPress={onClose}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}
      >
        <View style={{
          backgroundColor: '#131D14',
          borderTopLeftRadius: 24, borderTopRightRadius: 24,
          borderTopWidth: 1, borderTopColor: '#1C2E1E',
          padding: 20, paddingBottom: 36,
        }}>
          {/* Handle */}
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: '#1C2E1E', alignSelf: 'center', marginBottom: 16 }} />

          {/* Task info */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <Text style={{ color: '#E4F2E7', fontSize: 18, fontWeight: '900' }}>
              {TYPE_LABEL[task.type] ?? task.type}
            </Text>
            <View style={{ backgroundColor: '#0D2010', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
              <Text style={{ color: '#52CC64', fontSize: 11, fontWeight: '800' }}>{weekLabel}</Text>
            </View>
          </View>

          {/* EC + pH — solo para nutricion/riego */}
          {showMeasurements && (
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
              <View style={{ flex: 1 }}>
                <Text style={lbl}>EC (mS/cm)</Text>
                <TextInput
                  value={ec}
                  onChangeText={setEc}
                  keyboardType="decimal-pad"
                  placeholder="1.2"
                  placeholderTextColor="#3A5040"
                  style={inp}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={lbl}>pH</Text>
                <TextInput
                  value={ph}
                  onChangeText={setPh}
                  keyboardType="decimal-pad"
                  placeholder="6.2"
                  placeholderTextColor="#3A5040"
                  style={inp}
                />
              </View>
            </View>
          )}

          {/* Notas */}
          <Text style={lbl}>NOTAS</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Observaciones opcionales..."
            placeholderTextColor="#3A5040"
            multiline
            style={[inp, { minHeight: 64, textAlignVertical: 'top', marginBottom: 20 }]}
          />

          {/* Bonus XP hint */}
          {showMeasurements && hasMeasurement && (
            <Text style={{ color: '#52CC64', fontSize: 11, fontWeight: '700', textAlign: 'center', marginBottom: 12 }}>
              +25 XP por registrar medicion 🧪
            </Text>
          )}

          {/* Botones */}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity
              onPress={onClose}
              style={{ flex: 1, backgroundColor: '#0C1410', borderRadius: 14, borderWidth: 1, borderColor: '#1C2E1E', paddingVertical: 14, alignItems: 'center' }}
            >
              <Text style={{ color: '#728C74', fontWeight: '700', fontSize: 14 }}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleComplete}
              style={{ flex: 2, backgroundColor: '#52CC64', borderRadius: 14, paddingVertical: 14, alignItems: 'center' }}
            >
              <Text style={{ color: '#0C1410', fontWeight: '900', fontSize: 14 }}>
                {hasMeasurement ? 'Completar con medicion →' : 'Completar →'}
              </Text>
            </TouchableOpacity>
          </View>

        </View>
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

const inp = {
  backgroundColor: '#0C1410',
  borderWidth: 1,
  borderColor: '#1C2E1E',
  borderRadius: 12,
  paddingHorizontal: 14,
  paddingVertical: 11,
  color: '#E4F2E7',
  fontSize: 15,
}
