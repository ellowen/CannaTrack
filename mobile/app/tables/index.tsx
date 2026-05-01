/**
 * Marketplace de tablas nutricionales.
 * Muestra todas las tablas disponibles con info de marca y estado de acceso.
 * Las tablas Pro muestran un candado y CTA de upgrade para usuarios Free.
 */
import { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Linking } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { BackIcon } from '@/components/icons/AppIcons'
import { useNutritionTables } from '@/hooks/useNutritionTables'
import { usePlan } from '@/hooks/usePlan'
import PaywallModal from '@/components/PaywallModal'
import { track } from '@/lib/analytics'
import type { NutritionTable } from '@shared/types/plant'

// Metadata de marca para mostrar en la tarjeta
const BRAND_META: Record<string, { emoji: string; website: string; origin: string; description: string }> = {
  'revegetar': {
    emoji:       '🌿',
    website:     'https://revegetar.com.ar',
    origin:      'Argentina',
    description: 'Linea organica-mineral con 4 gammas (BIO, ECO, LIFE, FUEL). Tabla oficial incluida en el plan Free.',
  },
  'topcrop': {
    emoji:       '🏆',
    website:     'https://topcropfert.com',
    origin:      'Espana',
    description: 'Linea profesional europea con gamas Pro, Medio y Basica. Productos premium de alta concentracion.',
  },
}

const BRAND_COLORS: Record<string, [string, string]> = {
  'revegetar': ['#14532d', '#052e16'],
  'topcrop':   ['#7c2d12', '#431407'],
}

function TableCard({
  table,
  isPro,
  onUpgrade,
}: {
  table:     NutritionTable
  isPro:     boolean
  onUpgrade: () => void
}) {
  const meta    = BRAND_META[table.brandId ?? '']
  const colors  = BRAND_COLORS[table.brandId ?? ''] ?? ['#1a2e1c', '#0c1a10']
  const locked  = table.accessTier === 'pro' && !isPro
  const vege    = table.vegeWeeks?.length ?? 0
  const flora   = table.floraWeeks?.length ?? 0

  function handleOpen() {
    if (locked) {
      onUpgrade()
      return
    }
    track('nutrition_table_viewed', { table_id: table.id, brand_id: table.brandId ?? '' })
    router.push(`/tables/${table.id}` as never)
  }

  function handleWebsite() {
    if (!meta?.website) return
    void Linking.openURL(meta.website)
  }

  return (
    <TouchableOpacity onPress={handleOpen} activeOpacity={0.85}>
      <LinearGradient
        colors={[colors[0] + '99', colors[1] + 'cc']}
        style={{
          borderRadius: 20,
          borderWidth: 1,
          borderColor: locked ? 'rgba(107,114,128,0.2)' : 'rgba(82,204,100,0.2)',
          overflow: 'hidden',
          marginBottom: 16,
          opacity: locked ? 0.85 : 1,
        }}
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', padding: 18, paddingBottom: 12, gap: 12 }}>
          <View style={{
            width: 52, height: 52, borderRadius: 14,
            backgroundColor: 'rgba(255,255,255,0.08)',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Text style={{ fontSize: 28 }}>{meta?.emoji ?? '🌱'}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ color: '#E4F2E7', fontSize: 17, fontWeight: '800' }}>{table.name}</Text>
            </View>
            <Text style={{ color: '#6D8C74', fontSize: 12, marginTop: 2 }}>
              {meta?.origin ?? ''} {table.isOfficial ? '· Oficial' : '· Personalizada'}
            </Text>
          </View>
          {/* Badge tier */}
          {table.accessTier === 'pro' ? (
            <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: locked ? 'rgba(107,114,128,0.15)' : 'rgba(124,58,237,0.2)', borderWidth: 1, borderColor: locked ? 'rgba(107,114,128,0.3)' : 'rgba(167,139,250,0.4)' }}>
              <Text style={{ color: locked ? '#6B7280' : '#C4B5FD', fontSize: 11, fontWeight: '700' }}>
                {locked ? '🔒 PRO' : '✦ PRO'}
              </Text>
            </View>
          ) : (
            <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: 'rgba(82,204,100,0.1)', borderWidth: 1, borderColor: 'rgba(82,204,100,0.25)' }}>
              <Text style={{ color: '#52CC64', fontSize: 11, fontWeight: '700' }}>FREE</Text>
            </View>
          )}
        </View>

        {/* Description */}
        {meta?.description && (
          <View style={{ paddingHorizontal: 18, paddingBottom: 12 }}>
            <Text style={{ color: '#6D8C74', fontSize: 13, lineHeight: 18 }}>{meta.description}</Text>
          </View>
        )}

        {/* Stats */}
        <View style={{ flexDirection: 'row', paddingHorizontal: 18, paddingBottom: 14, gap: 16 }}>
          {table.lines && table.lines.length > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={{ color: '#6D8C74', fontSize: 12 }}>💊</Text>
              <Text style={{ color: '#6D8C74', fontSize: 12 }}>{table.lines.length} lineas</Text>
            </View>
          )}
          {vege > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={{ color: '#6D8C74', fontSize: 12 }}>🌱</Text>
              <Text style={{ color: '#6D8C74', fontSize: 12 }}>{vege} sem. vege</Text>
            </View>
          )}
          {flora > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={{ color: '#6D8C74', fontSize: 12 }}>🌸</Text>
              <Text style={{ color: '#6D8C74', fontSize: 12 }}>{flora} sem. flora</Text>
            </View>
          )}
        </View>

        {/* Footer */}
        <View style={{
          flexDirection: 'row', alignItems: 'center',
          borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)',
          paddingHorizontal: 18, paddingVertical: 12, gap: 10,
        }}>
          {meta?.website && (
            <TouchableOpacity onPress={handleWebsite} activeOpacity={0.7}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={{ color: '#3A5C3E', fontSize: 12 }}>🔗</Text>
              <Text style={{ color: '#3A5C3E', fontSize: 12 }}>Sitio oficial</Text>
            </TouchableOpacity>
          )}
          <View style={{ flex: 1 }} />
          {locked ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={{ color: '#A78BFA', fontSize: 13, fontWeight: '700' }}>Activar Pro →</Text>
            </View>
          ) : (
            <Text style={{ color: '#52CC64', fontSize: 13, fontWeight: '700' }}>Ver tabla →</Text>
          )}
        </View>
      </LinearGradient>
    </TouchableOpacity>
  )
}

export default function TablesMarketplaceScreen() {
  const { tables, loading } = useNutritionTables()
  const { isPro }           = usePlan()
  const [paywallVisible, setPaywallVisible] = useState(false)

  // Ordenar: free primero, pro al final
  const sorted = [...tables].sort((a, b) => {
    if (a.accessTier === b.accessTier) return 0
    return a.accessTier === 'free' ? -1 : 1
  })

  const proCount  = tables.filter(t => t.accessTier === 'pro').length
  const freeCount = tables.filter(t => t.accessTier === 'free').length

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0C1410' }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16, gap: 12 }}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <BackIcon size={22} color='#52CC64' />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#E4F2E7', fontSize: 22, fontWeight: '900', letterSpacing: -0.5 }}>
            Tablas Nutricionales
          </Text>
          <Text style={{ color: '#6D8C74', fontSize: 13, marginTop: 2 }}>
            {freeCount} gratuita{freeCount !== 1 ? 's' : ''} · {proCount} Pro
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push('/tables/compare' as never)}
          style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: 'rgba(82,204,100,0.08)', borderWidth: 1, borderColor: 'rgba(82,204,100,0.2)' }}
        >
          <Text style={{ color: '#52CC64', fontSize: 12, fontWeight: '700' }}>Comparar</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Banner Pro si no tiene plan */}
        {!isPro && proCount > 0 && (
          <TouchableOpacity onPress={() => setPaywallVisible(true)} activeOpacity={0.85} style={{ marginBottom: 20 }}>
            <LinearGradient
              colors={['#2D1B69', '#1A1040']}
              style={{
                borderRadius: 16, padding: 16,
                borderWidth: 1, borderColor: 'rgba(167,139,250,0.3)',
                flexDirection: 'row', alignItems: 'center', gap: 12,
              }}
            >
              <Text style={{ fontSize: 28 }}>👑</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#C4B5FD', fontSize: 14, fontWeight: '800' }}>
                  Accede a todas las tablas con Pro
                </Text>
                <Text style={{ color: '#7C5FB5', fontSize: 12, marginTop: 2 }}>
                  {proCount} tabla{proCount !== 1 ? 's' : ''} adicional{proCount !== 1 ? 'es' : ''} · USD 5/mes
                </Text>
              </View>
              <Text style={{ color: '#A78BFA', fontSize: 13, fontWeight: '700' }}>Ver →</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {loading ? (
          <View style={{ paddingTop: 40, alignItems: 'center' }}>
            <Text style={{ color: '#6D8C74', fontSize: 14 }}>Cargando tablas...</Text>
          </View>
        ) : (
          sorted.map(table => (
            <TableCard
              key={table.id}
              table={table}
              isPro={isPro}
              onUpgrade={() => setPaywallVisible(true)}
            />
          ))
        )}

        {/* Footer informativo */}
        <View style={{ marginTop: 8, paddingHorizontal: 4 }}>
          <Text style={{ color: '#2C3E2E', fontSize: 12, textAlign: 'center', lineHeight: 18 }}>
            Cada tabla fue adaptada al modelo CannaTrack (vege variable + flora 8 semanas).{'\n'}
            Las marcas certificadas muestran su logo y enlace oficial.
          </Text>
        </View>
      </ScrollView>

      <PaywallModal
        visible={paywallVisible}
        onClose={() => setPaywallVisible(false)}
        feature='tables_marketplace'
      />
    </SafeAreaView>
  )
}
