import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { BackIcon } from '@/components/icons/AppIcons'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

type ProductRow = { name: string; line: string; unit: 'ml' | 'gr'; minDose: string; maxDose: string }
type WeekRow    = { cycle: 'vege' | 'flora'; week: number; label: string; products: ProductRow[] }

const VEGE_WEEKS: WeekRow[] = [
  { cycle: 'vege', week: 0, label: 'Semana 0 — Enraizado',    products: [] },
  { cycle: 'vege', week: 1, label: 'Semana 1 — Enraizado',    products: [] },
  { cycle: 'vege', week: 2, label: 'Semana 2 — Crecimiento',  products: [] },
  { cycle: 'vege', week: 3, label: 'Semana 3 — Crecimiento',  products: [] },
  { cycle: 'vege', week: 4, label: 'Semana 4 — Prefloracion', products: [] },
  { cycle: 'vege', week: 5, label: 'Semana 5 — Prefloracion', products: [] },
]
const FLORA_WEEKS: WeekRow[] = [
  { cycle: 'flora', week: 1, label: 'F1 — Estiramiento', products: [] },
  { cycle: 'flora', week: 2, label: 'F2 — Estiramiento', products: [] },
  { cycle: 'flora', week: 3, label: 'F3 — Engorde',      products: [] },
  { cycle: 'flora', week: 4, label: 'F4 — Engorde',      products: [] },
  { cycle: 'flora', week: 5, label: 'F5 — Maduracion',   products: [] },
  { cycle: 'flora', week: 6, label: 'F6 — Maduracion',   products: [] },
  { cycle: 'flora', week: 7, label: 'F7 — Limpieza',     products: [] },
  { cycle: 'flora', week: 8, label: 'F8 — Limpieza',     products: [] },
]
const DAY_MAP: Record<string, [number, number]> = {
  'vege-0': [0,7],  'vege-1': [7,14],  'vege-2': [14,21], 'vege-3': [21,28], 'vege-4': [28,35], 'vege-5': [35,42],
  'flora-1': [0,7], 'flora-2': [7,14], 'flora-3': [14,21],'flora-4': [21,28],'flora-5': [28,35],'flora-6': [35,42],'flora-7': [42,49],'flora-8': [49,56],
}

function weekKey(w: WeekRow) { return `${w.cycle}-${w.week}` }

export default function NewTableScreen() {
  const { user } = useAuth()
  const [tableName, setTableName]     = useState('')
  const [weeks, setWeeks]             = useState<WeekRow[]>([...VEGE_WEEKS, ...FLORA_WEEKS])
  const [expandedKey, setExpandedKey] = useState<string | null>(null)
  const [loading, setLoading]         = useState(false)

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
    if (!tableName.trim()) { Alert.alert('Error', 'Ingresa un nombre para la tabla'); return }
    if (!user) { Alert.alert('Error', 'No hay usuario autenticado'); return }
    const totalProducts = weeks.reduce((sum, w) => sum + w.products.length, 0)
    if (totalProducts === 0) { Alert.alert('Error', 'Agrega al menos un producto en alguna semana'); return }

    setLoading(true)
    try {
      const tableId = `custom-${user.id.slice(0,8)}-${Date.now()}`

      const { error: tErr } = await supabase.from('nutrition_tables').insert({
        id: tableId, name: tableName.trim(), brand_id: null,
        is_official: false, access_tier: 'free', creator_id: user.id, notes: 'Tabla personalizada',
      })
      if (tErr) throw tErr

      const usedLines = [...new Set(weeks.flatMap(w => w.products.map(p => p.line)))]
      if (usedLines.length > 0) {
        await supabase.from('nutrition_lines').insert(
          usedLines.map(l => ({ table_id: tableId, line_code: l, line_name: l, color_class: '' }))
        )
      }

      for (const wk of weeks) {
        const validProducts = wk.products.filter(p => p.name.trim() && p.minDose && p.maxDose)
        const [dayStart, dayEnd] = DAY_MAP[weekKey(wk)] ?? [0, 7]
        const { data: weekRow, error: wErr } = await supabase
          .from('nutrition_weeks')
          .insert({
            table_id: tableId, cycle: wk.cycle, week: wk.week,
            stage: wk.label.split('—')[1]?.trim() ?? wk.label,
            ec_min: 0, ec_max: 0, ph_min: 5.5, ph_max: 6.5,
            day_start: dayStart, day_end: dayEnd,
          })
          .select('id').maybeSingle()
        if (wErr || !weekRow) continue
        if (validProducts.length > 0) {
          await supabase.from('nutrition_products').insert(
            validProducts.map(p => ({
              week_id: weekRow.id, product_name: p.name.trim(), line_code: p.line,
              unit: p.unit, min_dose: parseFloat(p.minDose) || 0, max_dose: parseFloat(p.maxDose) || 0,
            }))
          )
        }
      }

      Alert.alert('Listo', 'Tabla guardada correctamente', [{ text: 'OK', onPress: () => router.back() }])
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo guardar')
    } finally {
      setLoading(false)
    }
  }

  const vegeWeeks  = weeks.filter(w => w.cycle === 'vege')
  const floraWeeks = weeks.filter(w => w.cycle === 'flora')
  const totalProducts = weeks.reduce((sum, w) => sum + w.products.length, 0)
  const canSave = !loading && !!tableName.trim()

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#080E09' }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 80 }} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <LinearGradient
          colors={['#0F1F10', '#080E09']}
          style={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 24, borderBottomWidth: 1, borderBottomColor: '#1C2E1E' }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' }}
            >
              <BackIcon size={20} color="#52CC64" />
            </TouchableOpacity>
            <View>
              <Text style={{ color: '#E4F2E7', fontSize: 22, fontWeight: '900' }}>Nueva tabla</Text>
              <Text style={{ color: '#3D6642', fontSize: 13, marginTop: 1 }}>Carga los productos semana a semana</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={{ padding: 16, gap: 20 }}>

          {/* Nombre */}
          <View>
            <Text style={sectionLabel}>Nombre de la tabla</Text>
            <LinearGradient colors={['#131A10', '#0C1009']} style={{ borderRadius: 18, borderWidth: 1, borderColor: '#1C2E1E', overflow: 'hidden' }}>
              <TextInput
                value={tableName}
                onChangeText={setTableName}
                placeholder="Ej: Mi mezcla casera"
                placeholderTextColor="#2D4A30"
                style={{ color: '#E4F2E7', fontSize: 16, padding: 18 }}
                editable={!loading}
              />
            </LinearGradient>
          </View>

          {/* Bloque VEGE */}
          <WeekSection
            title="VEGETACION"
            emoji="🌿"
            color="#52CC64"
            bg="rgba(82,204,100,0.08)"
            border="rgba(82,204,100,0.2)"
            weeks={vegeWeeks}
            expandedKey={expandedKey}
            onToggle={k => setExpandedKey(expandedKey === k ? null : k)}
            onAddProduct={addProduct}
            onRemoveProduct={removeProduct}
            onUpdateProduct={updateProduct}
            loading={loading}
          />

          {/* Bloque FLORA */}
          <WeekSection
            title="FLORACION"
            emoji="🌸"
            color="#F59E0B"
            bg="rgba(245,158,11,0.08)"
            border="rgba(245,158,11,0.2)"
            weeks={floraWeeks}
            expandedKey={expandedKey}
            onToggle={k => setExpandedKey(expandedKey === k ? null : k)}
            onAddProduct={addProduct}
            onRemoveProduct={removeProduct}
            onUpdateProduct={updateProduct}
            loading={loading}
          />

          {/* Resumen */}
          {totalProducts > 0 && (
            <LinearGradient
              colors={['#131A10', '#0C1009']}
              style={{ borderRadius: 16, borderWidth: 1, borderColor: 'rgba(82,204,100,0.2)', paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}
            >
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#52CC64' }} />
              <Text style={{ color: '#52CC64', fontSize: 13, fontWeight: '700' }}>
                {totalProducts} producto{totalProducts > 1 ? 's' : ''} cargado{totalProducts > 1 ? 's' : ''}
              </Text>
            </LinearGradient>
          )}

          {/* CTA */}
          <TouchableOpacity onPress={handleSave} disabled={!canSave} activeOpacity={0.85}>
            <LinearGradient
              colors={canSave ? ['#52CC64', '#3DAA50'] : ['#1C2E1E', '#1C2E1E']}
              style={{ borderRadius: 20, paddingVertical: 20, alignItems: 'center', opacity: canSave ? 1 : 0.5 }}
            >
              {loading
                ? <ActivityIndicator color="#52CC64" />
                : <Text style={{ color: canSave ? '#080E09' : '#3A5040', fontWeight: '900', fontSize: 17 }}>Guardar tabla →</Text>
              }
            </LinearGradient>
          </TouchableOpacity>

        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

// ─── WeekSection ──────────────────────────────────────────────────────────────
interface WeekSectionProps {
  title: string; emoji: string; color: string; bg: string; border: string
  weeks: WeekRow[]; expandedKey: string | null
  onToggle: (k: string) => void
  onAddProduct: (w: WeekRow) => void
  onRemoveProduct: (w: WeekRow, idx: number) => void
  onUpdateProduct: (w: WeekRow, idx: number, field: keyof ProductRow, v: string) => void
  loading: boolean
}

function WeekSection({ title, emoji, color, bg, border, weeks, expandedKey, onToggle, onAddProduct, onRemoveProduct, onUpdateProduct, loading }: WeekSectionProps) {
  const isFlora = title === 'FLORACION'

  return (
    <View>
      {/* Section header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <View style={{ backgroundColor: bg, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: border }}>
          <Text style={{ color, fontSize: 12, fontWeight: '800', letterSpacing: 0.5 }}>{title}</Text>
        </View>
        <View style={{ flex: 1, height: 1, backgroundColor: border }} />
      </View>

      <View style={{ gap: 8 }}>
        {weeks.map(wk => {
          const key      = weekKey(wk)
          const open     = expandedKey === key
          const hasProds = wk.products.length > 0

          return (
            <View key={key} style={{ borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: hasProds ? border : '#1C2E1E' }}>
              <TouchableOpacity
                onPress={() => onToggle(key)}
                activeOpacity={0.8}
                disabled={loading}
              >
                <LinearGradient
                  colors={hasProds
                    ? (isFlora ? ['#1A1200', '#0E0900'] : ['#0F2010', '#0A1809'])
                    : ['#131A10', '#0C1009']
                  }
                  style={{ paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Text style={{ fontSize: 16 }}>{emoji}</Text>
                    <Text style={{ color: hasProds ? color : '#728C74', fontWeight: '700', fontSize: 14 }}>
                      {wk.label}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {hasProds && (
                      <View style={{ backgroundColor: bg, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: border }}>
                        <Text style={{ color, fontSize: 11, fontWeight: '800' }}>{wk.products.length}</Text>
                      </View>
                    )}
                    <Text style={{ color: '#3A5040', fontSize: 14, fontWeight: '700' }}>{open ? '▲' : '▼'}</Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>

              {open && (
                <LinearGradient
                  colors={['#0C1409', '#080E06']}
                  style={{ padding: 14, borderTopWidth: 1, borderTopColor: '#1A2A1A' }}
                >
                  {wk.products.map((p, idx) => (
                    <View key={idx} style={{ marginBottom: 14 }}>
                      {/* Nombre + eliminar */}
                      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                        <LinearGradient
                          colors={['#0F1A10', '#0A1009']}
                          style={{ flex: 1, borderRadius: 12, borderWidth: 1, borderColor: '#1C2E1E', overflow: 'hidden' }}
                        >
                          <TextInput
                            value={p.name}
                            onChangeText={v => onUpdateProduct(wk, idx, 'name', v)}
                            placeholder="Nombre del producto"
                            placeholderTextColor="#2D4A30"
                            style={{ color: '#E4F2E7', fontSize: 14, paddingHorizontal: 14, paddingVertical: 11 }}
                          />
                        </LinearGradient>
                        <TouchableOpacity
                          onPress={() => onRemoveProduct(wk, idx)}
                          style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: 'rgba(239,68,68,0.08)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <Text style={{ color: '#EF4444', fontSize: 18, lineHeight: 20 }}>×</Text>
                        </TouchableOpacity>
                      </View>

                      {/* Linea + Unidad */}
                      <View style={{ flexDirection: 'row', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                        {(['BIO','FUEL','LIFE','ECO'] as const).map(l => (
                          <TouchableOpacity
                            key={l}
                            onPress={() => onUpdateProduct(wk, idx, 'line', l)}
                            style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: p.line === l ? (isFlora ? 'rgba(245,158,11,0.15)' : 'rgba(82,204,100,0.12)') : 'rgba(0,0,0,0.2)', borderWidth: 1, borderColor: p.line === l ? (isFlora ? 'rgba(245,158,11,0.35)' : 'rgba(82,204,100,0.3)') : '#1C2E1E' }}
                          >
                            <Text style={{ color: p.line === l ? color : '#3A5040', fontSize: 12, fontWeight: '800' }}>{l}</Text>
                          </TouchableOpacity>
                        ))}
                        <View style={{ width: 1, backgroundColor: '#1C2E1E', marginHorizontal: 2 }} />
                        {(['ml','gr'] as const).map(u => (
                          <TouchableOpacity
                            key={u}
                            onPress={() => onUpdateProduct(wk, idx, 'unit', u)}
                            style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: p.unit === u ? (isFlora ? 'rgba(245,158,11,0.15)' : 'rgba(82,204,100,0.12)') : 'rgba(0,0,0,0.2)', borderWidth: 1, borderColor: p.unit === u ? (isFlora ? 'rgba(245,158,11,0.35)' : 'rgba(82,204,100,0.3)') : '#1C2E1E' }}
                          >
                            <Text style={{ color: p.unit === u ? color : '#3A5040', fontSize: 12, fontWeight: '800' }}>{u}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>

                      {/* Dosis */}
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        {[
                          { field: 'minDose' as const, val: p.minDose, placeholder: 'Dosis min' },
                          { field: 'maxDose' as const, val: p.maxDose, placeholder: 'Dosis max' },
                        ].map(({ field, val, placeholder }) => (
                          <LinearGradient key={field} colors={['#0F1A10', '#0A1009']} style={{ flex: 1, borderRadius: 12, borderWidth: 1, borderColor: '#1C2E1E', overflow: 'hidden' }}>
                            <TextInput
                              value={val}
                              onChangeText={v => onUpdateProduct(wk, idx, field, v)}
                              placeholder={placeholder}
                              placeholderTextColor="#2D4A30"
                              keyboardType="decimal-pad"
                              style={{ color: '#E4F2E7', fontSize: 14, paddingHorizontal: 14, paddingVertical: 11 }}
                            />
                          </LinearGradient>
                        ))}
                        <View style={{ justifyContent: 'center', paddingHorizontal: 4 }}>
                          <Text style={{ color: '#2D4A30', fontSize: 12, fontWeight: '600' }}>{p.unit}/L</Text>
                        </View>
                      </View>
                    </View>
                  ))}

                  {/* Agregar producto */}
                  <TouchableOpacity
                    onPress={() => onAddProduct(wk)}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={isFlora ? ['#1A1200', '#0E0900'] : ['#0F2010', '#0A1809']}
                      style={{ borderRadius: 12, borderWidth: 1, borderColor: border, borderStyle: 'dashed', paddingVertical: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
                    >
                      <Text style={{ color, fontSize: 18, lineHeight: 20 }}>+</Text>
                      <Text style={{ color, fontSize: 13, fontWeight: '700' }}>Agregar producto</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </LinearGradient>
              )}
            </View>
          )
        })}
      </View>
    </View>
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
