import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, ScrollView, Image, ActivityIndicator, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { BackIcon } from '@/components/icons/AppIcons'
import { router, useLocalSearchParams } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { supabase } from '@/lib/supabase'
import { track } from '@/lib/analytics'
import { usePlan } from '@/hooks/usePlan'
import { useDiagnosisQuota } from '@/hooks/useDiagnosisQuota'
import PaywallModal from '@/components/PaywallModal'

interface DiagnosisResult {
  summary: string
  issues: { name: string; severity: 'alta' | 'media' | 'baja'; description: string; solution: string }[]
  healthScore: number
  recommendations: string[]
}

const SEVERITY_COLOR  = { alta: '#EF4444', media: '#F59E0B', baja: '#52CC64' }
const SEVERITY_BG     = { alta: 'rgba(239,68,68,0.1)', media: 'rgba(245,158,11,0.1)', baja: 'rgba(82,204,100,0.1)' }
const SEVERITY_BORDER = { alta: 'rgba(239,68,68,0.25)', media: 'rgba(245,158,11,0.25)', baja: 'rgba(82,204,100,0.25)' }

const TIPS = [
  'Foto con buena iluminacion, sin sombras',
  'Enfoca las hojas con posibles problemas',
  'Incluye la hoja entera, no solo el problema',
  'Foto nitida, sin movimiento ni desenfoque',
]

export default function DiagnosisScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { isPro, loading: planLoading } = usePlan()
  const quota = useDiagnosisQuota()
  const [imageUri, setImageUri]   = useState<string | null>(null)
  const [loading, setLoading]     = useState(false)
  const [result, setResult]       = useState<DiagnosisResult | null>(null)
  const [showPaywall, setShowPaywall] = useState(false)

  useEffect(() => {
    if (!planLoading && !isPro) setShowPaywall(true)
  }, [planLoading, isPro])

  async function pickImage(fromCamera: boolean) {
    if (!isPro) { setShowPaywall(true); return }
    if (quota.isAtLimit) {
      Alert.alert(
        'Limite mensual alcanzado',
        `Usaste ${quota.used}/${quota.limit} diagnosticos este mes. El contador se reinicia el 1 del proximo mes.`,
        [{ text: 'Entendido' }]
      )
      return
    }
    const picker = fromCamera ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync
    const res = await picker({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
      base64: true,
    })
    if (!res.canceled && res.assets[0]) {
      setImageUri(res.assets[0].uri)
      setResult(null)
      if (res.assets[0].base64) await analyze(res.assets[0].base64)
    }
  }

  async function analyze(base64: string) {
    track('diagnosis_started', { plant_id: id })
    setLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('diagnose-plant', {
        body: { image: base64, plantId: id },
      })
      // El Edge Function devuelve limitReached si se supero el cupo
      if (data?.limitReached) {
        track('diagnosis_error', { plant_id: id, error: 'limit_reached' })
        Alert.alert('Limite alcanzado', data.error ?? 'Limite mensual de diagnosticos alcanzado.', [{ text: 'OK' }])
        void quota.refetch()
        return
      }
      if (error) throw new Error(error.message)
      const res = data as DiagnosisResult & { _usage?: { used: number; limit: number } }
      setResult(res)
      // Refrescar quota local con el valor que devuelve el servidor
      void quota.refetch()
      track('diagnosis_completed', { plant_id: id, health_score: res.healthScore, issues_count: res.issues.length, usage_after: res._usage?.used ?? null })
    } catch (e) {
      track('diagnosis_error', { plant_id: id, error: e instanceof Error ? e.message : 'unknown' })
      Alert.alert('Error en diagnostico', e instanceof Error ? e.message : 'No se pudo conectar al servicio', [{ text: 'OK' }])
    } finally {
      setLoading(false)
    }
  }

  const healthColor = result
    ? result.healthScore >= 75 ? '#52CC64' : result.healthScore >= 45 ? '#F59E0B' : '#EF4444'
    : '#52CC64'

  if (planLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#080E09', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#A78BFA" size="large" />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#080E09' }}>
      <PaywallModal
        visible={showPaywall}
        onClose={() => { setShowPaywall(false); router.canGoBack() ? router.back() : router.replace('/(tabs)') }}
        feature="Diagnostico IA"
      />
      <ScrollView contentContainerStyle={{ paddingBottom: 80 }} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <LinearGradient
          colors={['#150D28', '#0D0820', '#080E09']}
          style={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 24, borderBottomWidth: 1, borderBottomColor: 'rgba(139,92,246,0.12)' }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 }}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' }}
            >
              <BackIcon size={20} color="#A78BFA" />
            </TouchableOpacity>
            <View>
              <Text style={{ color: '#E4F2E7', fontSize: 22, fontWeight: '900' }}>Diagnostico IA</Text>
              <Text style={{ color: '#6D4FB0', fontSize: 13, marginTop: 1 }}>Analisis visual por Claude</Text>
            </View>
          </View>

          {/* Badge + quota */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ backgroundColor: 'rgba(167,139,250,0.12)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(167,139,250,0.25)' }}>
              <Text style={{ color: '#A78BFA', fontSize: 13, fontWeight: '800', letterSpacing: 0.5 }}>BETA</Text>
            </View>
            <Text style={{ color: '#4A3070', fontSize: 13, flex: 1 }}>Detecta plagas, deficiencias y hongos</Text>
            {!quota.loading && isPro && (
              <View style={{
                paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
                backgroundColor: quota.isAtLimit ? 'rgba(239,68,68,0.1)' : 'rgba(167,139,250,0.1)',
                borderWidth: 1,
                borderColor: quota.isAtLimit ? 'rgba(239,68,68,0.25)' : 'rgba(167,139,250,0.2)',
              }}>
                <Text style={{
                  fontSize: 11, fontWeight: '700',
                  color: quota.isAtLimit ? '#EF4444' : '#A78BFA',
                }}>
                  {quota.used}/{quota.limit}
                </Text>
              </View>
            )}
          </View>
        </LinearGradient>

        <View style={{ padding: 16, gap: 16 }}>

          {/* Foto seleccionada */}
          {imageUri ? (
            <View>
              <Image
                source={{ uri: imageUri }}
                style={{ width: '100%', height: 240, borderRadius: 20, marginBottom: 10 }}
                resizeMode="cover"
              />
              {!loading && (
                <TouchableOpacity
                  onPress={() => { setImageUri(null); setResult(null) }}
                  style={{ alignItems: 'center', paddingVertical: 8 }}
                >
                  <Text style={{ color: '#728C74', fontSize: 13, fontWeight: '600' }}>Cambiar foto</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            /* Selector de foto */
            <View style={{ gap: 10 }}>
              <TouchableOpacity onPress={() => pickImage(true)} activeOpacity={0.85}>
                <LinearGradient
                  colors={['#1A1030', '#100A22']}
                  style={{ borderRadius: 20, borderWidth: 1.5, borderColor: 'rgba(167,139,250,0.35)', borderStyle: 'dashed', padding: 36, alignItems: 'center', gap: 10 }}
                >
                  <View style={{ width: 64, height: 64, borderRadius: 18, backgroundColor: 'rgba(167,139,250,0.12)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(167,139,250,0.2)' }}>
                    <Text style={{ fontSize: 32 }}>📷</Text>
                  </View>
                  <Text style={{ color: '#E4F2E7', fontWeight: '900', fontSize: 17 }}>Tomar foto</Text>
                  <Text style={{ color: '#6D4FB0', fontSize: 13, textAlign: 'center' }}>
                    Foto clara de hojas o planta completa
                  </Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => pickImage(false)} activeOpacity={0.85}>
                <LinearGradient
                  colors={['#131A10', '#0C1009']}
                  style={{ borderRadius: 16, borderWidth: 1, borderColor: '#1C2E1E', paddingVertical: 16, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }}
                >
                  <Text style={{ fontSize: 20 }}>🖼️</Text>
                  <Text style={{ color: '#728C74', fontWeight: '700', fontSize: 15 }}>Elegir de galeria</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}

          {/* Loading */}
          {loading && (
            <LinearGradient
              colors={['#1A1030', '#100A22']}
              style={{ borderRadius: 20, borderWidth: 1, borderColor: 'rgba(167,139,250,0.2)', padding: 36, alignItems: 'center', gap: 14 }}
            >
              <ActivityIndicator color="#A78BFA" size="large" />
              <Text style={{ color: '#E4F2E7', fontWeight: '900', fontSize: 17 }}>Analizando...</Text>
              <Text style={{ color: '#6D4FB0', fontSize: 13, textAlign: 'center', lineHeight: 20 }}>
                Claude esta revisando tu planta{'\n'}en busca de problemas
              </Text>
            </LinearGradient>
          )}

          {/* Resultado */}
          {result && !loading && (
            <View style={{ gap: 14 }}>

              {/* Health score */}
              <LinearGradient
                colors={['#131A10', '#0C1009']}
                style={{ borderRadius: 20, borderWidth: 1, borderColor: '#1C2E1E', padding: 20 }}
              >
                <Text style={sectionLabel}>Salud detectada</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                  <View style={{
                    width: 72, height: 72, borderRadius: 36,
                    backgroundColor: result.healthScore >= 75 ? 'rgba(82,204,100,0.1)' : result.healthScore >= 45 ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)',
                    borderWidth: 3, borderColor: healthColor,
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Text style={{ color: healthColor, fontSize: 20, fontWeight: '900', lineHeight: 24 }}>
                      {result.healthScore}%
                    </Text>
                  </View>
                  <Text style={{ color: '#E4F2E7', fontSize: 14, flex: 1, lineHeight: 22 }}>{result.summary}</Text>
                </View>
              </LinearGradient>

              {/* Problemas */}
              {result.issues.length > 0 && (
                <LinearGradient
                  colors={['#131A10', '#0C1009']}
                  style={{ borderRadius: 20, borderWidth: 1, borderColor: '#1C2E1E', overflow: 'hidden' }}
                >
                  <View style={{ paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#1A2A1A' }}>
                    <Text style={sectionLabel}>Problemas detectados · {result.issues.length}</Text>
                  </View>
                  {result.issues.map((issue, i) => (
                    <View key={i} style={{ padding: 16, borderTopWidth: i > 0 ? 1 : 0, borderTopColor: '#1A2A1A' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                        <Text style={{ color: '#E4F2E7', fontWeight: '800', fontSize: 15, flex: 1 }}>{issue.name}</Text>
                        <View style={{ backgroundColor: SEVERITY_BG[issue.severity], borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: SEVERITY_BORDER[issue.severity] }}>
                          <Text style={{ color: SEVERITY_COLOR[issue.severity], fontSize: 11, fontWeight: '800', textTransform: 'uppercase' }}>
                            {issue.severity}
                          </Text>
                        </View>
                      </View>
                      <Text style={{ color: '#728C74', fontSize: 13, lineHeight: 20, marginBottom: 10 }}>{issue.description}</Text>
                      <LinearGradient
                        colors={['#0F2010', '#0A1809']}
                        style={{ borderRadius: 12, padding: 12, borderWidth: 1, borderColor: 'rgba(82,204,100,0.15)' }}
                      >
                        <Text style={{ color: '#52CC64', fontSize: 12, fontWeight: '800', letterSpacing: 0.5, marginBottom: 4 }}>SOLUCION</Text>
                        <Text style={{ color: '#B0D4B8', fontSize: 13, lineHeight: 20 }}>{issue.solution}</Text>
                      </LinearGradient>
                    </View>
                  ))}
                </LinearGradient>
              )}

              {/* Recomendaciones */}
              {result.recommendations.length > 0 && (
                <LinearGradient
                  colors={['#131A10', '#0C1009']}
                  style={{ borderRadius: 20, borderWidth: 1, borderColor: '#1C2E1E', padding: 18 }}
                >
                  <Text style={sectionLabel}>Recomendaciones</Text>
                  <View style={{ gap: 10 }}>
                    {result.recommendations.map((r, i) => (
                      <View key={i} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                        <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(82,204,100,0.12)', borderWidth: 1, borderColor: 'rgba(82,204,100,0.2)', alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
                          <Text style={{ color: '#52CC64', fontSize: 10, fontWeight: '900' }}>{i + 1}</Text>
                        </View>
                        <Text style={{ color: '#8AAF8E', fontSize: 13, lineHeight: 20, flex: 1 }}>{r}</Text>
                      </View>
                    ))}
                  </View>
                </LinearGradient>
              )}

            </View>
          )}

          {/* Tips iniciales */}
          {!imageUri && !loading && (
            <LinearGradient
              colors={['#0F0A1E', '#090613']}
              style={{ borderRadius: 20, borderWidth: 1, borderColor: 'rgba(139,92,246,0.2)', padding: 18 }}
            >
              <Text style={sectionLabel}>Consejos para mejor diagnostico</Text>
              <View style={{ gap: 10 }}>
                {TIPS.map((tip, i) => (
                  <View key={i} style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#7C3AED' }} />
                    <Text style={{ color: '#6D4FB0', fontSize: 13, flex: 1, lineHeight: 18 }}>{tip}</Text>
                  </View>
                ))}
              </View>
            </LinearGradient>
          )}

        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const sectionLabel = {
  color: '#728C74' as const,
  fontSize: 13,
  fontWeight: '700' as const,
  letterSpacing: 1.5,
  textTransform: 'uppercase' as const,
  marginBottom: 12,
}
