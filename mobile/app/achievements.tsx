import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { BackIcon } from '@/components/icons/AppIcons'
import { router } from 'expo-router'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { getAchievements, getLevelInfo } from '@shared/lib/gamification'
import type { AchievementData, Achievement } from '@shared/lib/gamification'

// Progreso calculado por id de logro
function getProgress(a: Achievement, d: AchievementData): { current: number; target: number } | null {
  switch (a.id) {
    case 'streak_3':   return { current: d.bestStreak,           target: 3 }
    case 'streak_7':   return { current: d.bestStreak,           target: 7 }
    case 'streak_30':  return { current: d.bestStreak,           target: 30 }
    case 'streak_90':  return { current: d.bestStreak,           target: 90 }
    case 'first_task': return { current: d.totalTasksCompleted,  target: 1 }
    case 'tasks_50':   return { current: d.totalTasksCompleted,  target: 50 }
    case 'tasks_100':  return { current: d.totalTasksCompleted,  target: 100 }
    case 'harvest_1':  return { current: d.harvestedPlants,      target: 1 }
    case 'harvest_3':  return { current: d.harvestedPlants,      target: 3 }
    case 'multi_plant':return { current: d.activePlants,         target: 3 }
    case 'photos_10':  return { current: d.totalPhotos,          target: 10 }
    case 'photos_50':  return { current: d.totalPhotos,          target: 50 }
    case 'measure_1':  return { current: d.tasksWithMeasurement, target: 1 }
    case 'measure_20': return { current: d.tasksWithMeasurement, target: 20 }
    case 'measure_50': return { current: d.tasksWithMeasurement, target: 50 }
    case 'xp_1000':    return { current: d.totalXP,              target: 1000 }
    default: return null
  }
}

const CATEGORY_META: Record<string, { label: string; color: string; bg: string; border: string }> = {
  consistencia: { label: 'Consistencia', color: '#F59E0B', bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.2)' },
  cultivo:      { label: 'Cultivo',      color: '#52CC64', bg: 'rgba(82,204,100,0.1)',  border: 'rgba(82,204,100,0.2)' },
  conocimiento: { label: 'Conocimiento', color: '#A78BFA', bg: 'rgba(167,139,250,0.1)', border: 'rgba(167,139,250,0.2)' },
}

export default function AchievementsScreen() {
  const { user, loading: authLoading } = useAuth()
  const [data, setData] = useState<AchievementData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading || !user) { setLoading(false); return }
    const uid = user.id
    async function load() {
      const [
        { data: p },
        { data: activePlants },
        { data: harvestedPlants },
        { count: totalTasks },
        { count: measurements },
        { count: photos },
      ] = await Promise.all([
        supabase.from('profiles').select('xp, streak_days').eq('id', uid).maybeSingle(),
        supabase.from('plants').select('id').eq('user_id', uid).eq('status', 'active'),
        supabase.from('plants').select('id').eq('user_id', uid).eq('status', 'harvested'),
        supabase.from('scheduled_tasks').select('*', { count: 'exact', head: true }).eq('user_id', uid).eq('completed', true),
        supabase.from('measurements').select('*', { count: 'exact', head: true }).eq('user_id', uid),
        supabase.from('week_logs').select('*', { count: 'exact', head: true }).eq('user_id', uid).not('photo_url', 'is', null),
      ])
      setData({
        streak:               p?.streak_days ?? 0,
        bestStreak:           p?.streak_days ?? 0,
        totalXP:              p?.xp ?? 0,
        totalTasksCompleted:  totalTasks ?? 0,
        tasksWithMeasurement: measurements ?? 0,
        harvestedPlants:      harvestedPlants?.length ?? 0,
        activePlants:         activePlants?.length ?? 0,
        totalPhotos:          photos ?? 0,
      })
      setLoading(false)
    }
    load()
  }, [user, authLoading])

  if (loading || !data) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#080E09', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#A78BFA" size="large" />
      </SafeAreaView>
    )
  }

  const { unlocked, locked } = getAchievements(data)
  const levelInfo = getLevelInfo(data.totalXP)
  const total = unlocked.length + locked.length
  const pct = total > 0 ? Math.round((unlocked.length / total) * 100) : 0

  // Agrupar unlocked por categoria
  const categories = ['consistencia', 'cultivo', 'conocimiento'] as const
  const unlockedByCategory = categories.map(cat => ({
    cat,
    items: unlocked.filter(a => a.category === cat),
  })).filter(g => g.items.length > 0)

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#080E09' }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <LinearGradient
          colors={['#150D28', '#0D0820', '#080E09']}
          style={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 24, borderBottomWidth: 1, borderBottomColor: 'rgba(139,92,246,0.15)' }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' }}
            >
              <BackIcon size={20} color="#A78BFA" />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#E4F2E7', fontSize: 22, fontWeight: '900' }}>Logros</Text>
              <Text style={{ color: '#6D4FB0', fontSize: 13, marginTop: 1 }}>
                {levelInfo.current.emoji} {levelInfo.current.name} · {data.totalXP} XP
              </Text>
            </View>
          </View>

          {/* Stats pills */}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <LinearGradient
              colors={['rgba(139,92,246,0.2)', 'rgba(139,92,246,0.06)']}
              style={{ flex: 1, borderRadius: 16, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(139,92,246,0.25)' }}
            >
              <Text style={{ color: '#A78BFA', fontSize: 26, fontWeight: '900' }}>{unlocked.length}</Text>
              <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, marginTop: 2, fontWeight: '600' }}>Logrados</Text>
            </LinearGradient>
            <LinearGradient
              colors={['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)']}
              style={{ flex: 1, borderRadius: 16, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' }}
            >
              <Text style={{ color: '#728C74', fontSize: 26, fontWeight: '900' }}>{locked.length}</Text>
              <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, marginTop: 2, fontWeight: '600' }}>Restantes</Text>
            </LinearGradient>
            <LinearGradient
              colors={['rgba(82,204,100,0.12)', 'rgba(82,204,100,0.04)']}
              style={{ flex: 1, borderRadius: 16, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(82,204,100,0.18)' }}
            >
              <Text style={{ color: '#52CC64', fontSize: 26, fontWeight: '900' }}>{pct}%</Text>
              <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, marginTop: 2, fontWeight: '600' }}>Completado</Text>
            </LinearGradient>
          </View>

          {/* Barra global */}
          <View style={{ marginTop: 16, height: 6, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
            <LinearGradient
              colors={['#7C3AED', '#A855F7', '#C084FC']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={{ height: '100%', borderRadius: 3, width: `${pct}%` }}
            />
          </View>
        </LinearGradient>

        <View style={{ padding: 16, gap: 28 }}>

          {/* Desbloqueados - agrupados por categoria */}
          {unlocked.length > 0 ? (
            <View style={{ gap: 20 }}>
              <Text style={sectionLabel}>Desbloqueados</Text>
              {unlockedByCategory.map(({ cat, items }) => {
                const meta = CATEGORY_META[cat]
                return (
                  <View key={cat}>
                    {/* Category label */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <View style={{ backgroundColor: meta.bg, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: meta.border }}>
                        <Text style={{ color: meta.color, fontSize: 12, fontWeight: '800', letterSpacing: 0.5 }}>
                          {meta.label.toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1, height: 1, backgroundColor: meta.border }} />
                    </View>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                      {items.map(a => (
                        <LinearGradient
                          key={a.id}
                          colors={['#1A1030', '#100A20']}
                          style={{ width: '47%', borderRadius: 18, borderWidth: 1, borderColor: 'rgba(139,92,246,0.3)', padding: 16 }}
                        >
                          <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: 'rgba(139,92,246,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 10, borderWidth: 1, borderColor: 'rgba(139,92,246,0.2)' }}>
                            <Text style={{ fontSize: 26 }}>{a.emoji}</Text>
                          </View>
                          <Text style={{ color: '#E4F2E7', fontSize: 14, fontWeight: '800', lineHeight: 18 }}>{a.name}</Text>
                          <Text style={{ color: '#6D4FB0', fontSize: 12, marginTop: 4, lineHeight: 16 }}>{a.description}</Text>
                        </LinearGradient>
                      ))}
                    </View>
                  </View>
                )
              })}
            </View>
          ) : (
            <LinearGradient
              colors={['#131A10', '#0C1009']}
              style={{ borderRadius: 20, borderWidth: 1, borderColor: '#1C2E1E', padding: 40, alignItems: 'center' }}
            >
              <Text style={{ fontSize: 40, marginBottom: 12 }}>🌱</Text>
              <Text style={{ color: '#728C74', fontSize: 15, fontWeight: '700', textAlign: 'center' }}>Sin logros todavia</Text>
              <Text style={{ color: '#3A5040', fontSize: 13, marginTop: 6, textAlign: 'center', lineHeight: 20 }}>
                Completa tareas y registra{'\n'}mediciones para desbloquear logros
              </Text>
            </LinearGradient>
          )}

          {/* Por desbloquear con barra de progreso */}
          {locked.length > 0 && (
            <View>
              <Text style={sectionLabel}>Por desbloquear</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {locked.map(a => {
                  const prog = getProgress(a, data)
                  const progPct = prog ? Math.min(1, prog.current / prog.target) : 0
                  const hasProgress = prog && prog.current > 0

                  return (
                    <View
                      key={a.id}
                      style={{ width: '47%', backgroundColor: '#0E1210', borderRadius: 18, borderWidth: 1, borderColor: '#1C2E1E', padding: 16 }}
                    >
                      <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.04)', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                        <Text style={{ fontSize: 26, opacity: 0.4 }}>{a.emoji}</Text>
                      </View>
                      <Text style={{ color: '#728C74', fontSize: 14, fontWeight: '800', lineHeight: 18 }}>{a.name}</Text>
                      <Text style={{ color: '#2D4A30', fontSize: 12, marginTop: 4, lineHeight: 16 }}>{a.description}</Text>
                      {prog && (
                        <View style={{ marginTop: 10 }}>
                          <View style={{ height: 4, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                            <View style={{ height: '100%', borderRadius: 2, width: `${progPct * 100}%`, backgroundColor: hasProgress ? '#52CC64' : '#1C2E1E' }} />
                          </View>
                          <Text style={{ color: hasProgress ? '#3D6642' : '#1C2E1E', fontSize: 11, fontWeight: '700', marginTop: 4 }}>
                            {prog.current} / {prog.target}
                          </Text>
                        </View>
                      )}
                    </View>
                  )
                })}
              </View>
            </View>
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
