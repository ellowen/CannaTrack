/**
 * Detalle de tabla nutricional.
 * Muestra el cronograma completo semana a semana con productos y EC/pH.
 */
import { View, Text, ScrollView, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { router, useLocalSearchParams } from 'expo-router'
import { BackIcon } from '@/components/icons/AppIcons'
import { useNutritionTables } from '@/hooks/useNutritionTables'
import type { NutritionWeek } from '@shared/types/plant'

const STAGE_LABEL: Record<string, string> = {
  rooting:   'Enraizamiento',
  growth:    'Crecimiento',
  preflower: 'Pre-floracion',
  stretch:   'Estiramiento',
  bulking:   'Engorde',
  ripening:  'Maduracion',
  flushing:  'Limpieza',
  harvested: 'Cosecha',
}

const STAGE_COLOR: Record<string, string> = {
  rooting:   '#6D8C74',
  growth:    '#22C55E',
  preflower: '#84CC16',
  stretch:   '#F59E0B',
  bulking:   '#EF4444',
  ripening:  '#DC2626',
  flushing:  '#3B82F6',
  harvested: '#8B5CF6',
}

function WeekRow({ week, lines }: { week: NutritionWeek; lines: { id: string; name: string }[] }) {
  const stageColor = STAGE_COLOR[week.stage] ?? '#6D8C74'
  const isFlushing = week.stage === 'flushing'

  return (
    <View style={{
      marginBottom: 10, borderRadius: 14,
      backgroundColor: 'rgba(255,255,255,0.03)',
      borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
      overflow: 'hidden',
    }}>
      {/* Semana header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, gap: 10 }}>
        <View style={{
          width: 32, height: 32, borderRadius: 8,
          backgroundColor: stageColor + '20',
          borderWidth: 1, borderColor: stageColor + '40',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Text style={{ color: stageColor, fontSize: 12, fontWeight: '800' }}>
            {week.cycle === 'vege' ? 'V' : 'F'}{week.week}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#E4F2E7', fontSize: 14, fontWeight: '700' }}>
            Semana {week.week} — {STAGE_LABEL[week.stage] ?? week.stage}
          </Text>
          <Text style={{ color: '#6D8C74', fontSize: 11, marginTop: 1 }}>
            Dia {week.dayStart}–{week.dayEnd}
          </Text>
        </View>
        {/* EC / PH */}
        <View style={{ alignItems: 'flex-end', gap: 2 }}>
          {(week.ecMin != null && week.ecMax != null) && (
            <Text style={{ color: '#52CC64', fontSize: 11, fontWeight: '700' }}>
              EC {week.ecMin}–{week.ecMax}
            </Text>
          )}
          {(week.phMin != null && week.phMax != null) && (
            <Text style={{ color: '#3B82F6', fontSize: 11, fontWeight: '700' }}>
              pH {week.phMin}–{week.phMax}
            </Text>
          )}
        </View>
      </View>

      {/* Productos */}
      {!isFlushing && week.products && week.products.length > 0 && (
        <View style={{ paddingHorizontal: 14, paddingBottom: 10, gap: 4 }}>
          {week.products.map((p, i) => {
            const line = lines.find(l => l.id === p.line)
            return (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#52CC64' }} />
                <Text style={{ color: '#A3C4A8', fontSize: 12, flex: 1 }}>
                  {p.name}
                </Text>
                <Text style={{ color: '#6D8C74', fontSize: 12 }}>
                  {p.minDose === p.maxDose
                    ? `${p.minDose} ${p.unit}/L`
                    : `${p.minDose}–${p.maxDose} ${p.unit}/L`
                  }
                </Text>
                {line && (
                  <Text style={{ color: '#3A5C3E', fontSize: 10, fontWeight: '700' }}>
                    {line.name}
                  </Text>
                )}
              </View>
            )
          })}
        </View>
      )}
      {isFlushing && (
        <View style={{ paddingHorizontal: 14, paddingBottom: 10 }}>
          <Text style={{ color: '#3B82F6', fontSize: 12 }}>Solo agua — limpieza de sales</Text>
        </View>
      )}
    </View>
  )
}

export default function TableDetailScreen() {
  const { id }               = useLocalSearchParams<{ id: string }>()
  const { getTableById }     = useNutritionTables()
  const table                = getTableById(id)

  if (!table) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0C1410', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#6D8C74' }}>Tabla no encontrada</Text>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0C1410' }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16, gap: 12 }}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <BackIcon size={22} color='#52CC64' />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#E4F2E7', fontSize: 18, fontWeight: '900', letterSpacing: -0.5 }} numberOfLines={1}>
            {table.name}
          </Text>
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 2 }}>
            {table.lines.map(l => (
              <Text key={l.id} style={{ color: '#3A5C3E', fontSize: 11, fontWeight: '700' }}>
                {l.name}
              </Text>
            ))}
          </View>
        </View>
        <View style={{
          paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
          backgroundColor: table.accessTier === 'pro' ? 'rgba(124,58,237,0.2)' : 'rgba(82,204,100,0.1)',
          borderWidth: 1, borderColor: table.accessTier === 'pro' ? 'rgba(167,139,250,0.4)' : 'rgba(82,204,100,0.25)',
        }}>
          <Text style={{ color: table.accessTier === 'pro' ? '#C4B5FD' : '#52CC64', fontSize: 11, fontWeight: '700' }}>
            {table.accessTier === 'pro' ? '✦ PRO' : 'FREE'}
          </Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Ciclo Vegetativo */}
        {table.vegeWeeks.length > 0 && (
          <View style={{ marginBottom: 24 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <View style={{ width: 3, height: 16, borderRadius: 2, backgroundColor: '#22C55E' }} />
              <Text style={{ color: '#22C55E', fontSize: 13, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' }}>
                Ciclo Vegetativo
              </Text>
              <Text style={{ color: '#3A5C3E', fontSize: 12 }}>— {table.vegeWeeks.length} semanas</Text>
            </View>
            {table.vegeWeeks.map((w, i) => (
              <WeekRow key={i} week={w} lines={table.lines} />
            ))}
          </View>
        )}

        {/* Ciclo de Floracion */}
        {table.floraWeeks.length > 0 && (
          <View style={{ marginBottom: 24 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <View style={{ width: 3, height: 16, borderRadius: 2, backgroundColor: '#F59E0B' }} />
              <Text style={{ color: '#F59E0B', fontSize: 13, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' }}>
                Ciclo de Floracion
              </Text>
              <Text style={{ color: '#3A5C3E', fontSize: 12 }}>— {table.floraWeeks.length} semanas</Text>
            </View>
            {table.floraWeeks.map((w, i) => (
              <WeekRow key={i} week={w} lines={table.lines} />
            ))}
          </View>
        )}

        {/* Notas de la tabla */}
        {table.notes && (
          <View style={{
            backgroundColor: 'rgba(82,204,100,0.05)',
            borderWidth: 1, borderColor: 'rgba(82,204,100,0.1)',
            borderRadius: 12, padding: 14,
          }}>
            <Text style={{ color: '#52CC64', fontSize: 11, fontWeight: '700', marginBottom: 6 }}>NOTA</Text>
            <Text style={{ color: '#6D8C74', fontSize: 12, lineHeight: 18 }}>{table.notes}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
