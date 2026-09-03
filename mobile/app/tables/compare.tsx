/**
 * Comparativa de tablas nutricionales.
 * Muestra EC y pH por etapa del ciclo en una grilla comparativa.
 * Util para que el cultivador elija tabla y para el pitch B2B a marcas.
 */
import { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { BackIcon } from '@/components/icons/AppIcons'
import { useNutritionTables } from '@/hooks/useNutritionTables'
import { usePlan } from '@/hooks/usePlan'
import { useTranslation } from '@/i18n'
import type { NutritionTable } from '@shared/types/plant'

// Etapas canonicas en orden del ciclo completo (el texto se traduce via tablesCompare.stage_<key>)
const STAGES = [
  { key: 'rooting',   cycle: 'vege' as const, emoji: '🌱' },
  { key: 'growth',    cycle: 'vege' as const, emoji: '🌿' },
  { key: 'preflower', cycle: 'vege' as const, emoji: '🌼' },
  { key: 'stretch',   cycle: 'flora' as const, emoji: '📏' },
  { key: 'bulking',   cycle: 'flora' as const, emoji: '💪' },
  { key: 'ripening',  cycle: 'flora' as const, emoji: '🍊' },
  { key: 'flushing',  cycle: 'flora' as const, emoji: '💧' },
]

// Colores por tabla (primero libre, resto segun indice)
const TABLE_COLORS = ['#52CC64', '#A78BFA', '#F59E0B', '#3B82F6', '#EF4444']

interface StageRange { ecMin: number; ecMax: number; phMin: number; phMax: number }

function getStageRange(table: NutritionTable, stageKey: string): StageRange | null {
  const weeks = [...table.vegeWeeks, ...table.floraWeeks]
  const match = weeks.find(w => w.stage === stageKey)
  if (!match) return null
  return { ecMin: match.ecMin ?? 0, ecMax: match.ecMax ?? 0, phMin: match.phMin ?? 0, phMax: match.phMax ?? 0 }
}

function RangeCell({
  range,
  color,
  isFirst,
}: {
  range:   StageRange | null
  color:   string
  isFirst: boolean
}) {
  if (!range) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderLeftWidth: isFirst ? 0 : 1, borderLeftColor: 'rgba(255,255,255,0.05)' }}>
        <Text style={{ color: '#2C3E2E', fontSize: 11 }}>—</Text>
      </View>
    )
  }
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 10, gap: 3, borderLeftWidth: isFirst ? 0 : 1, borderLeftColor: 'rgba(255,255,255,0.05)' }}>
      <Text style={{ color, fontSize: 11, fontWeight: '800' }}>
        {range.ecMin}–{range.ecMax}
      </Text>
      <Text style={{ color: '#3B82F6', fontSize: 10, fontWeight: '700' }}>
        {range.phMin}–{range.phMax}
      </Text>
    </View>
  )
}

export default function TablesCompareScreen() {
  const { t }        = useTranslation()
  const { tables }  = useNutritionTables()
  const { isPro }   = usePlan()
  const [cycle, setCycle] = useState<'vege' | 'flora' | 'all'>('all')

  // Incluir tablas accesibles (free siempre, pro solo si isPro)
  const accessible = tables.filter(tbl => tbl.accessTier === 'free' || isPro)
  const filtered   = STAGES.filter(s => cycle === 'all' || s.cycle === cycle)

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0C1410' }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12, gap: 12 }}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <BackIcon size={22} color='#52CC64' />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#E4F2E7', fontSize: 20, fontWeight: '900', letterSpacing: -0.5 }}>
            {t('tablesCompare.title')}
          </Text>
          <Text style={{ color: '#6D8C74', fontSize: 12, marginTop: 1 }}>
            {t('tablesCompare.subtitle')}
          </Text>
        </View>
      </View>

      {/* Filtro de ciclo */}
      <View style={{ flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 12 }}>
        {(['all', 'vege', 'flora'] as const).map(c => (
          <TouchableOpacity
            key={c}
            onPress={() => setCycle(c)}
            style={{
              paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
              backgroundColor: cycle === c ? 'rgba(82,204,100,0.15)' : 'transparent',
              borderWidth: 1,
              borderColor: cycle === c ? 'rgba(82,204,100,0.4)' : 'rgba(255,255,255,0.08)',
            }}
          >
            <Text style={{ color: cycle === c ? '#52CC64' : '#3A5C3E', fontSize: 13, fontWeight: '700' }}>
              {c === 'all' ? t('tablesCompare.filter_all') : c === 'vege' ? t('tablesCompare.filter_vege') : t('tablesCompare.filter_flora')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* Leyenda de tablas */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8, marginBottom: 14 }}>
          {accessible.map((tbl, i) => (
            <View key={tbl.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: TABLE_COLORS[i % TABLE_COLORS.length] }} />
              <Text style={{ color: '#A3C4A8', fontSize: 12, fontWeight: '600' }} numberOfLines={1}>{tbl.name.split(' —')[0]}</Text>
              {tbl.accessTier === 'pro' && (
                <Text style={{ color: '#7C5FB5', fontSize: 10, fontWeight: '700' }}>PRO</Text>
              )}
            </View>
          ))}
        </ScrollView>

        {/* Grilla comparativa */}
        <View style={{ marginHorizontal: 16, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' }}>

          {/* Header de columnas */}
          <LinearGradient colors={['#1A2E1C', '#0F1E10']} style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' }}>
            <View style={{ width: 110, paddingVertical: 10, paddingHorizontal: 10 }}>
              <Text style={{ color: '#3A5C3E', fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 }}>{t('tablesCompare.column_stage')}</Text>
            </View>
            {accessible.map((tbl, i) => (
              <View key={tbl.id} style={{ flex: 1, alignItems: 'center', paddingVertical: 10, borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.05)' }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: TABLE_COLORS[i % TABLE_COLORS.length], marginBottom: 2 }} />
                <Text style={{ color: TABLE_COLORS[i % TABLE_COLORS.length], fontSize: 10, fontWeight: '800' }} numberOfLines={1}>
                  {tbl.name.split(' —')[0].split(' ')[0]}
                </Text>
              </View>
            ))}
          </LinearGradient>

          {/* Filas por etapa */}
          {filtered.map((stage, rowIdx) => (
            <View
              key={stage.key}
              style={{
                flexDirection: 'row',
                backgroundColor: rowIdx % 2 === 0 ? 'rgba(255,255,255,0.015)' : 'transparent',
                borderTopWidth: rowIdx === 0 ? 0 : 1,
                borderTopColor: 'rgba(255,255,255,0.04)',
              }}
            >
              {/* Etapa label */}
              <View style={{ width: 110, paddingVertical: 10, paddingHorizontal: 10, justifyContent: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text style={{ fontSize: 13 }}>{stage.emoji}</Text>
                  <Text style={{ color: '#6D8C74', fontSize: 11, fontWeight: '600', flexShrink: 1 }} numberOfLines={2}>
                    {t(`tablesCompare.stage_${stage.key}`)}
                  </Text>
                </View>
                <Text style={{ color: '#2C3E2E', fontSize: 10, marginTop: 2, marginLeft: 18 }}>
                  {stage.cycle === 'vege' ? t('tablesCompare.cycle_badge_vege') : t('tablesCompare.cycle_badge_flora')}
                </Text>
              </View>

              {/* Celdas de datos por tabla */}
              {accessible.map((tbl, i) => (
                <RangeCell
                  key={tbl.id}
                  range={getStageRange(tbl, stage.key)}
                  color={TABLE_COLORS[i % TABLE_COLORS.length]}
                  isFirst={i === 0}
                />
              ))}
            </View>
          ))}
        </View>

        {/* Leyenda EC / pH */}
        <View style={{ marginHorizontal: 16, marginTop: 14, flexDirection: 'row', gap: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: '#52CC64' }} />
            <Text style={{ color: '#3A5C3E', fontSize: 12 }}>{t('tablesCompare.legend_ec')}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: '#3B82F6' }} />
            <Text style={{ color: '#3A5C3E', fontSize: 12 }}>{t('tablesCompare.legend_ph')}</Text>
          </View>
        </View>

        {/* Nota para tablas Pro bloqueadas */}
        {!isPro && tables.some(tbl => tbl.accessTier === 'pro') && (
          <TouchableOpacity
            onPress={() => router.push('/tables/index' as never)}
            style={{ marginHorizontal: 16, marginTop: 14 }}
          >
            <LinearGradient
              colors={['#2D1B69', '#1A1040']}
              style={{ borderRadius: 12, padding: 14, borderWidth: 1, borderColor: 'rgba(167,139,250,0.25)', flexDirection: 'row', alignItems: 'center', gap: 10 }}
            >
              <Text style={{ fontSize: 18 }}>👑</Text>
              <Text style={{ color: '#A78BFA', fontSize: 13, fontWeight: '700', flex: 1 }}>
                {t('tablesCompare.pro_cta')}
              </Text>
              <Text style={{ color: '#6B46C1', fontSize: 13 }}>›</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

      </ScrollView>
    </SafeAreaView>
  )
}
