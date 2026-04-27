import { useState, useEffect } from 'react'
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { ACHIEVEMENTS, getAchievements } from '@shared/lib/gamification'
import type { AchievementData, Achievement } from '@shared/lib/gamification'

const CATEGORY_LABELS: Record<Achievement['category'], string> = {
  consistencia: '🔥 Consistencia',
  cultivo:      '🌱 Cultivo',
  conocimiento: '🧪 Conocimiento',
}

const CATEGORY_ORDER: Achievement['category'][] = ['consistencia', 'cultivo', 'conocimiento']

function getProgressHint(a: Achievement, data: AchievementData): string | null {
  if (a.id.startsWith('streak_')) {
    if (data.bestStreak > 0) return `Racha actual: ${data.bestStreak} dias`
    return null
  }
  if (a.id.startsWith('tasks_') || a.id === 'first_task') {
    return `Tareas completadas: ${data.totalTasksCompleted}`
  }
  if (a.id.startsWith('harvest_')) {
    return `Cosechas: ${data.harvestedPlants}`
  }
  return null
}

export default function AchievementsScreen() {
  const { user, loading: authLoading } = useAuth()
  const [achievementData, setAchievementData] = useState<AchievementData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return
    if (!user) { setLoading(false); return }
    async function load() {

      const [
        { data: p },
        { data: activePlants },
        { data: harvestedPlants },
        { count: totalTasks },
        { count: measurements },
        { count: photos },
      ] = await Promise.all([
        supabase.from('profiles').select('xp, streak_days, best_streak').eq('id', user.id).single(),
        supabase.from('plants').select('id').eq('user_id', user.id).eq('status', 'active'),
        supabase.from('plants').select('id').eq('user_id', user.id).eq('status', 'harvested'),
        supabase.from('scheduled_tasks').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('completed', true),
        supabase.from('measurements').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('week_logs').select('*', { count: 'exact', head: true }).eq('user_id', user.id).not('photo_url', 'is', null),
      ])

      setAchievementData({
        streak:               p?.streak_days ?? 0,
        bestStreak:           p?.best_streak ?? 0,
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
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0C1410', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#52CC64" size="large" />
      </SafeAreaView>
    )
  }

  const { unlocked, locked } = getAchievements(achievementData)
  const total = unlocked.length + locked.length
  const progress = total > 0 ? unlocked.length / total : 0

  // Group all achievements by category preserving unlocked/locked state
  const byCategory = CATEGORY_ORDER.map((cat) => {
    const unlockedInCat = unlocked.filter((a) => a.category === cat)
    const lockedInCat   = locked.filter((a) => a.category === cat)
    return { cat, achievements: [...unlockedInCat, ...lockedInCat] }
  })

  const unlockedIds = new Set(unlocked.map((a) => a.id))

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0C1410' }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12, padding: 4 }}>
          <Text style={{ color: '#52CC64', fontSize: 20 }}>←</Text>
        </TouchableOpacity>
        <View>
          <Text style={{ color: '#E4F2E7', fontSize: 20, fontWeight: '900' }}>Logros</Text>
          <Text style={{ color: '#52CC64', fontSize: 12, fontWeight: '700', marginTop: 1 }}>
            {unlocked.length} / {total} desbloqueados
          </Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={{ paddingHorizontal: 16, marginBottom: 20 }}>
        <View style={{ height: 8, backgroundColor: '#1C2E1E', borderRadius: 4, overflow: 'hidden' }}>
          <View style={{ height: '100%', backgroundColor: '#52CC64', borderRadius: 4, width: `${Math.round(progress * 100)}%` }} />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}>
        {byCategory.map(({ cat, achievements }) => (
          <View key={cat} style={{ marginBottom: 28 }}>
            <Text style={sectionLabel}>{CATEGORY_LABELS[cat]}</Text>
            {achievements.map((a) => {
              const isUnlocked = unlockedIds.has(a.id)
              const hint = isUnlocked ? null : getProgressHint(a, achievementData)
              return (
                <View
                  key={a.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: isUnlocked ? '#131D14' : '#0C1410',
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: isUnlocked ? '#2A5A2E' : '#1C2E1E',
                    borderLeftWidth: isUnlocked ? 3 : 1,
                    borderLeftColor: isUnlocked ? '#52CC64' : '#1C2E1E',
                    padding: 14,
                    marginBottom: 8,
                    opacity: isUnlocked ? 1 : 0.45,
                  }}
                >
                  <Text style={{ fontSize: 32, marginRight: 14 }}>{isUnlocked ? a.emoji : '🔒'}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#E4F2E7', fontSize: 14, fontWeight: '800' }}>{a.name}</Text>
                    <Text style={{ color: '#728C74', fontSize: 12, marginTop: 2 }}>{a.description}</Text>
                    {hint !== null && (
                      <Text style={{ color: '#3A7040', fontSize: 11, fontWeight: '700', marginTop: 4 }}>{hint}</Text>
                    )}
                  </View>
                </View>
              )
            })}
          </View>
        ))}
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
  marginBottom: 10,
}
