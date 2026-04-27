import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

type ProductRow = { name: string; line: string; unit: 'ml' | 'gr'; minDose: string; maxDose: string }
type WeekRow = { cycle: 'vege' | 'flora'; week: number; label: string; products: ProductRow[] }

const VEGE_WEEKS: WeekRow[] = [
  { cycle: 'vege', week: 0, label: 'Semana 0 — Enraizado', products: [] },
  { cycle: 'vege', week: 1, label: 'Semana 1 — Enraizado', products: [] },
  { cycle: 'vege', week: 2, label: 'Semana 2 — Crecimiento', products: [] },
  { cycle: 'vege', week: 3, label: 'Semana 3 — Crecimiento', products: [] },
  { cycle: 'vege', week: 4, label: 'Semana 4 — Prefloración', products: [] },
  { cycle: 'vege', week: 5, label: 'Semana 5 — Prefloración', products: [] },
]
const FLORA_WEEKS: WeekRow[] = [
  { cycle: 'flora', week: 1, label: 'F1 — Estiramiento', products: [] },
  { cycle: 'flora', week: 2, label: 'F2 — Estiramiento', products: [] },
  { cycle: 'flora', week: 3, label: 'F3 — Engorde', products: [] },
  { cycle: 'flora', week: 4, label: 'F4 — Engorde', products: [] },
  { cycle: 'flora', week: 5, label: 'F5 — Maduración', products: [] },
  { cycle: 'flora', week: 6, label: 'F6 — Maduración', products: [] },
  { cycle: 'flora', week: 7, label: 'F7 — Limpieza', products: [] },
  { cycle: 'flora', week: 8, label: 'F8 — Limpieza', products: [] },
]

const DAY_MAP: Record<string, [number, number]> = {
  'vege-0': [0,7], 'vege-1': [7,14], 'vege-2': [14,21], 'vege-3': [21,28], 'vege-4': [28,35], 'vege-5': [35,42],
  'flora-1': [0,7], 'flora-2': [7,14], 'flora-3': [14,21], 'flora-4': [21,28], 'flora-5': [28,35], 'flora-6': [35,42], 'flora-7': [42,49], 'flora-8': [49,56],
}

export default function NewTableScreen() {
  const { user } = useAuth()
  const [tableName, setTableName] = useState('')
  const [weeks, setWeeks] = useState<WeekRow[]>([...VEGE_WEEKS, ...FLORA_WEEKS])
  const [expandedKey, setExpandedKey] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function weekKey(w: WeekRow) { return `${w.cycle}-${w.week}` }

  function addProduct(wk: WeekRow) {
    setWeeks(prev => prev.map(w =>
      weekKey(w) === weekKey(wk)
        ? { ...w, products: [...w.products, { name: '', line: 'BIO', unit: 'ml', minDose: '', maxDose: '' }] }
        : w
    ))
  }

  function removeProduct(wk: WeekRow, idx: number) {
    setWeeks(prev => prev.map(w =>
      weekKey(w) === weekKey(wk)
        ? { ...w, products: w.products.filter((_, i) => i !== idx) }
        : w
    ))
  }

  function updateProduct(wk: WeekRow, idx: number, field: keyof ProductRow, value: string) {
    setWeeks(prev => prev.map(w =>
      weekKey(w) === weekKey(wk)
        ? { ...w, products: w.products.map((p, i) => i === idx ? { ...p, [field]: value } : p) }
        : w
    ))
  }

  async function handleSave() {
    if (!tableName.trim()) { Alert.alert('Error', 'Ingresá un nombre para la tabla'); return }
    if (!user) { Alert.alert('Error', 'No hay usuario autenticado'); return }

    const totalProducts = weeks.reduce((sum, w) => sum + w.products.length, 0)
    if (totalProducts === 0) {
      Alert.alert('Error', 'Agregá al menos un producto en alguna semana')
      return
    }

    setLoading(true)
    try {
      const tableId = `custom-${user.id.slice(0,8)}-${Date.now()}`

      // Crear tabla
      const { error: tErr } = await supabase.from('nutrition_tables').insert({
        id: tableId,
        name: tableName.trim(),
        brand_id: null,
        is_official: false,
        access_tier: 'free',
        creator_id: user.id,
        notes: 'Tabla personalizada',
      })
      if (tErr) throw tErr

      // Líneas detectadas de los productos
      const usedLines = [...new Set(weeks.flatMap(w => w.products.map(p => p.line)))]
      if (usedLines.length > 0) {
        await supabase.from('nutrition_lines').insert(
          usedLines.map(l => ({ table_id: tableId, line_code: l, line_name: l, color_class: '' }))
        )
      }

      // Semanas + productos
      for (const wk of weeks) {
        const validProducts = wk.products.filter(p => p.name.trim() && p.minDose && p.maxDose)
        const [dayStart, dayEnd] = DAY_MAP[weekKey(wk)] ?? [0, 7]

        const { data: weekRow, error: wErr } = await supabase
          .from('nutrition_weeks')
          .insert({
            table_id: tableId,
            cycle: wk.cycle,
            week: wk.week,
            stage: wk.label.split('—')[1]?.trim() ?? wk.label,
            ec_min: 0, ec_max: 0, ph_min: 5.5, ph_max: 6.5,
            day_start: dayStart,
            day_end: dayEnd,
          })
          .select('id')
          .maybeSingle()

        if (wErr || !weekRow) continue

        if (validProducts.length > 0) {
          await supabase.from('nutrition_products').insert(
            validProducts.map(p => ({
              week_id: weekRow.id,
              product_name: p.name.trim(),
              line_code: p.line,
              unit: p.unit,
              min_dose: parseFloat(p.minDose) || 0,
              max_dose: parseFloat(p.maxDose) || 0,
            }))
          )
        }
      }

      Alert.alert('Listo', 'Tabla guardada correctamente', [
        { text: 'OK', onPress: () => router.back() },
      ])
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo guardar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0C1410' }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 80 }}>

        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 28 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
            <Text style={{ color: '#52CC64', fontSize: 28 }}>←</Text>
          </TouchableOpacity>
          <View>
            <Text style={{ color: '#E4F2E7', fontSize: 22, fontWeight: '900' }}>Nueva tabla</Text>
            <Text style={{ color: '#728C74', fontSize: 13 }}>Cargá los productos semana a semana</Text>
          </View>
        </View>

        {/* Nombre */}
        <Text style={label}>NOMBRE DE LA TABLA</Text>
        <TextInput
          value={tableName}
          onChangeText={setTableName}
          placeholder="Ej: Mi mezcla casera"
          placeholderTextColor="#3A5040"
          style={input}
          editable={!loading}
        />

        {/* Semanas */}
        {weeks.map(wk => {
          const key = weekKey(wk)
          const open = expandedKey === key
          const hasProducts = wk.products.length > 0
          return (
            <View key={key} style={{ marginTop: 12, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: hasProducts ? '#52CC64' : '#1C2E1E' }}>
              <TouchableOpacity
                onPress={() => setExpandedKey(open ? null : key)}
                style={{ backgroundColor: '#131D14', padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <Text style={{ color: hasProducts ? '#52CC64' : '#728C74', fontWeight: '700', fontSize: 13 }}>
                  {wk.cycle === 'vege' ? '🌿 ' : '🌸 '}{wk.label}
                </Text>
                <Text style={{ color: '#728C74', fontSize: 12 }}>
                  {wk.products.length > 0 ? `${wk.products.length} prod.` : ''} {open ? '▲' : '▼'}
                </Text>
              </TouchableOpacity>

              {open && (
                <View style={{ backgroundColor: '#0F1A10', padding: 14 }}>
                  {wk.products.map((p, idx) => (
                    <View key={idx} style={{ marginBottom: 14, borderLeftWidth: 2, borderLeftColor: '#1C2E1E', paddingLeft: 12 }}>
                      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 6 }}>
                        <TextInput
                          value={p.name}
                          onChangeText={v => updateProduct(wk, idx, 'name', v)}
                          placeholder="Producto"
                          placeholderTextColor="#3A5040"
                          style={[input, { flex: 1, paddingVertical: 10 }]}
                        />
                        <TouchableOpacity
                          onPress={() => removeProduct(wk, idx)}
                          style={{ justifyContent: 'center', paddingHorizontal: 10 }}
                        >
                          <Text style={{ color: '#FF6B6B', fontSize: 18 }}>×</Text>
                        </TouchableOpacity>
                      </View>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        {/* Línea */}
                        <View style={{ flexDirection: 'row', gap: 4 }}>
                          {(['BIO','FUEL','LIFE','ECO'] as const).map(l => (
                            <TouchableOpacity
                              key={l}
                              onPress={() => updateProduct(wk, idx, 'line', l)}
                              style={{ paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8, backgroundColor: p.line === l ? '#1A3D1E' : '#131D14', borderWidth: 1, borderColor: p.line === l ? '#52CC64' : '#1C2E1E' }}
                            >
                              <Text style={{ color: p.line === l ? '#52CC64' : '#728C74', fontSize: 11, fontWeight: '700' }}>{l}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                        {/* Unidad */}
                        {(['ml','gr'] as const).map(u => (
                          <TouchableOpacity
                            key={u}
                            onPress={() => updateProduct(wk, idx, 'unit', u)}
                            style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: p.unit === u ? '#1A3D1E' : '#131D14', borderWidth: 1, borderColor: p.unit === u ? '#52CC64' : '#1C2E1E' }}
                          >
                            <Text style={{ color: p.unit === u ? '#52CC64' : '#728C74', fontSize: 11, fontWeight: '700' }}>{u}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                      <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                        <TextInput
                          value={p.minDose}
                          onChangeText={v => updateProduct(wk, idx, 'minDose', v)}
                          placeholder="Dosis min"
                          placeholderTextColor="#3A5040"
                          keyboardType="decimal-pad"
                          style={[input, { flex: 1, paddingVertical: 10 }]}
                        />
                        <TextInput
                          value={p.maxDose}
                          onChangeText={v => updateProduct(wk, idx, 'maxDose', v)}
                          placeholder="Dosis max"
                          placeholderTextColor="#3A5040"
                          keyboardType="decimal-pad"
                          style={[input, { flex: 1, paddingVertical: 10 }]}
                        />
                      </View>
                    </View>
                  ))}
                  <TouchableOpacity
                    onPress={() => addProduct(wk)}
                    style={{ borderWidth: 1, borderColor: '#1C2E1E', borderStyle: 'dashed', borderRadius: 10, padding: 10, alignItems: 'center' }}
                  >
                    <Text style={{ color: '#52CC64', fontSize: 13, fontWeight: '700' }}>+ Agregar producto</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )
        })}

        {/* Guardar */}
        <TouchableOpacity
          onPress={handleSave}
          disabled={loading || !tableName.trim()}
          style={{ marginTop: 32, backgroundColor: '#52CC64', borderRadius: 18, paddingVertical: 18, alignItems: 'center', opacity: (loading || !tableName.trim()) ? 0.5 : 1 }}
        >
          {loading ? <ActivityIndicator color="white" /> : <Text style={{ color: 'white', fontWeight: '800', fontSize: 16 }}>Guardar tabla →</Text>}
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  )
}

const label = { color: '#728C74' as const, fontSize: 11, fontWeight: '700' as const, letterSpacing: 1.5, textTransform: 'uppercase' as const, marginBottom: 8 }
const input = { backgroundColor: '#131D14', borderWidth: 1, borderColor: '#1C2E1E', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13, color: '#E4F2E7' as const, fontSize: 14 }
