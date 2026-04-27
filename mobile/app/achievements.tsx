import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { getAchievements } from '@shared/lib/gamification'
import type { AchievementData } from '@shared/lib/gamification'

export default function AchievementsScreen() {
  const { user, loading: authLoading } = useAuth()
  const [achievementData, setAchievementData] = useState<AchievementData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading || !user) { setLoading(false); return }
    async function load() {
      const [
        { data: p },
        { data: activePlants },
        { data: harvestedPlants },
        { count: totalTasks },
        { count: measurements },
        { count: photos },
      ] = await Promise.all([
        supabase.from('profiles').select('xp, streak_days').eq('id', user.id).maybeSingle(),
        supabase.from('plants').select('id').eq('user_id', user.id).eq('status', 'active'),
        supabase.from('plants').select('id').eq('user_id', user.id).eq('status', 'harvested'),
        supabase.from('scheduled_tasks').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('completed', true),
        supabase.from('measurements').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('week_logs').select('*', { count: 'exact', head: true }).eq('user_id', user.id).not('photo_url', 'is', null),
      ])
      setAchievementData({
        streak:               p?.streak_days ?? 0,
        bestStreak:           0,
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

  if (loading || !achievementData) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#080E09', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#52CC64" size="large" />
      </SafeAreaView>
    )
  }

  const { unlocked, locked } = getAchievements(achievementData)

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#080E09' }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>

        {/* Header */}
        <LinearGradient
          colors={['#150D28', '#0D0820', '#080E09']}
          style={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 24, borderBottomWidth: 1, borderBottomColor: 'rgba(139,92,246,0.15)' }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ color: '#A78BFA', fontSize: 20, fontWeight: '700' }}>←</Text>
            </TouchableOpacity>
            <Text style={{ color: '#E4F2E7', fontSize: 22, fontWeight: '900' }}>Logros</Text>
          </View>

          {/* Summary pills */}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <LinearGradient
              colors={['rgba(139,92,246,0.2)', 'rgba(139,92,246,0.06)']}
              style={{ flex: 1, borderRadius: 16, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(139,92,246,0.25)' }}
            >
              <Text style={{ color: '#A78BFA', fontSize: 26, fontWeight: '900' }}>{unlocked.length}</Text>
              <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, marginTop: 2, fontWeight: '600' }}>Desbloqueados</Text>
            </LinearGradient>
            <LinearGradient
              colors={['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)']}
              style={{ flex: 1, borderRadius: 16, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' }}
            >
              <Text style={{ color: '#728C74', fontSize: 26, fontWeight: '900' }}>{locked.length}</Text>
              <Text style={{ color: 'rgba(255,255,255,0.22)', fontSize: 10, marginTop: 2, fontWeight: '600' }}>Bloqueados</Text>
            </LinearGradient>
            <LinearGradient
              colors={['rgba(82,204,100,0.12)', 'rgba(82,204,100,0.04)']}
              style={{ flex: 1, borderRadius: 16, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(82,204,100,0.18)' }}
            >
              <Text style={{ color: '#52CC64', fontSize: 26, fontWeight: '900' }}>
                {unlocked.length + locked.length > 0
                  ? Math.round((unlocked.length / (unlocked.length + locked.length)) * 100)
                  : 0}%
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.28)', fontSize: 10, marginTop: 2, fontWeight: '600' }}>Completado</Text>
            </LinearGradient>
          </View>
        </LinearGradient>

        <View style={{ padding: 16, gap: 24 }}>

          {/* Unlocked */}
          {unlocked.length > 0 ? (
            <View>
              <Text style={sectionLabel}>Desbloqueados</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {unlocked.map(a => (
                  <LinearGradient
                    key={a.id}
                    colors={['#1A1030', '#100A20']}
                    style={{
                      width: '47%', borderRadius: 18,
                      borderWidth: 1, borderColor: 'rgba(139,92,246,0.3)',
                      padding: 16,
                    }}
                  >
                    <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(139,92,246,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                      <Text style={{ fontSize: 26 }}>{a.emoji}</Text>
                    </View>
                    <Text style={{ color: '#E4F2E7', fontSize: 12, fontWeight: '800', lineHeight: 15 }}>{a.name}</Text>
                    <Text style={{ color: '#4A3070', fontSize: 10, marginTop: 4, lineHeight: 13 }}>{a.description}</Text>
                  </LinearGradient>
                ))}
              </View>
            </View>
          ) : (
            <LinearGradient
              colors={['#131A10', '#0C1009']}
              style={{ borderRadius: 20, borderWidth: 1, borderColor: '#1C2E1E', padding: 40, alignItems: 'center' }}
            >
              <Text style={{ fontSize: 40, marginBottom: 12 }}>🌱</Text>
              <Text style={{ color: '#728C74', fontSize: 14, textAlign: 'center', lineHeight: 20 }}>
                Completa tareas y registra mediciones para desbloquear tus primeros logros
              </Text>
            </LinearGradient>
          )}

          {/* Locked */}
          {locked.length > 0 && (
            <View>
              <Text style={sectionLabel}>Por desbloquear</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {locked.map(a => (
                  <View
                    key={a.id}
                    style={{
                      width: '47%', backgroundColor: '#0E1210', borderRadius: 18,
                      borderWidth: 1, borderColor: '#1C2E1E',
                      padding: 16, opacity: 0.4,
                    }}
                  >
                    <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.04)', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                      <Text style={{ fontSize: 26 }}>{a.emoji}</Text>
                    </View>
                    <Text style={{ color: '#E4F2E7', fontSize: 12, fontWeight: '800', lineHeight: 15 }}>{a.name}</Text>
                    <Text style={{ color: '#3A5040', fontSize: 10, marginTop: 4, lineHeight: 13 }}>{a.description}</Text>
                  </View>
                ))}
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
  fontSize: 11,
  fontWeight: '700' as const,
  letterSpacing: 1.5,
  textTransform: 'uppercase' as const,
  marginBottom: 12,
}
