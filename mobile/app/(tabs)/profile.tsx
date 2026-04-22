import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { getLevelInfo, getAchievements } from '@shared/lib/gamification'
import type { AchievementData } from '@shared/lib/gamification'

export default function ProfileScreen() {
  const { user } = useAuth()
  const [profile, setProfile]             = useState<{ xp: number; streak: number; bestStreak: number; username: string } | null>(null)
  const [loading, setLoading]             = useState(true)
  const [plantCount, setPlantCount]       = useState(0)
  const [completedToday, setCompletedToday] = useState(0)
  const [achievementData, setAchievementData] = useState<AchievementData | null>(null)

  useEffect(() => {
    async function load() {
      if (!user) return
      const today0 = new Date(); today0.setHours(0, 0, 0, 0)

      const [
        { data: p },
        { data: activePlants },
        { data: harvestedPlants },
        { data: tasksToday },
        { count: totalTasks },
        { count: measurements },
        { count: photos },
      ] = await Promise.all([
        supabase.from('profiles').select('xp, streak_days, best_streak, username').eq('id', user.id).single(),
        supabase.from('plants').select('id').eq('user_id', user.id).eq('status', 'active'),
        supabase.from('plants').select('id').eq('user_id', user.id).eq('status', 'harvested'),
        supabase.from('scheduled_tasks').select('id').eq('user_id', user.id).eq('completed', true)
          .gte('completed_at', today0.toISOString()),
        supabase.from('scheduled_tasks').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('completed', true),
        supabase.from('measurements').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('week_logs').select('*', { count: 'exact', head: true }).eq('user_id', user.id).not('photo_url', 'is', null),
      ])

      if (p) setProfile({ xp: p.xp ?? 0, streak: p.streak_days ?? 0, bestStreak: p.best_streak ?? 0, username: p.username ?? user.email?.split('@')[0] ?? 'Cultivador' })
      setPlantCount(activePlants?.length ?? 0)
      setCompletedToday(tasksToday?.length ?? 0)

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
  }, [user])

  async function handleSignOut() {
    Alert.alert('Cerrar sesion', '\u00bfEstas seguro?', [
      { text: 'Cancelar' },
      { text: 'Cerrar', style: 'destructive', onPress: async () => { await supabase.auth.signOut(); router.replace('/auth') } },
    ])
  }

  if (loading || !profile) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0C1410', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#52CC64" size="large" />
      </SafeAreaView>
    )
  }

  const { current: lvl, next: nextLvl, progressToNext } = getLevelInfo(profile.xp)
  const { unlocked, locked } = achievementData ? getAchievements(achievementData) : { unlocked: [], locked: [] }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0C1410' }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>

        {/* Avatar + nivel */}
        <View style={{ alignItems: 'center', marginBottom: 24 }}>
          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#1A3D1E', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
            <Text style={{ fontSize: 40 }}>{lvl.emoji}</Text>
          </View>
          <Text style={{ color: '#E4F2E7', fontSize: 18, fontWeight: '900' }}>{profile.username}</Text>
          <Text style={{ color: '#52CC64', fontSize: 13, fontWeight: '700', marginTop: 4 }}>
            {lvl.name} · Nivel {lvl.level}
          </Text>
        </View>

        {/* Barra XP */}
        <View style={{ backgroundColor: '#131D14', borderRadius: 16, borderWidth: 1, borderColor: '#1C2E1E', padding: 16, marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={{ color: '#728C74', fontSize: 12, fontWeight: '700' }}>{profile.xp} XP</Text>
            <Text style={{ color: '#52CC64', fontSize: 12, fontWeight: '700' }}>
              {nextLvl ? `→ ${nextLvl.name} (${nextLvl.xpRequired} XP)` : '🏆 Nivel maximo'}
            </Text>
          </View>
          <View style={{ height: 8, backgroundColor: '#1C2E1E', borderRadius: 4, overflow: 'hidden' }}>
            <View style={{ height: '100%', backgroundColor: '#52CC64', borderRadius: 4, width: `${Math.round(progressToNext * 100)}%` }} />
          </View>
        </View>

        {/* Stats */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
          {[
            { label: 'Plantas',   value: plantCount,                   emoji: '🌱' },
            { label: 'Hoy',       value: completedToday,               emoji: '✅' },
            { label: 'Racha',     value: profile.streak,               emoji: '🔥' },
            { label: 'Record',    value: profile.bestStreak,           emoji: '⚡' },
          ].map(s => (
            <View key={s.label} style={{ flex: 1, backgroundColor: '#131D14', borderRadius: 16, borderWidth: 1, borderColor: '#1C2E1E', padding: 12, alignItems: 'center' }}>
              <Text style={{ fontSize: 18 }}>{s.emoji}</Text>
              <Text style={{ color: '#E4F2E7', fontSize: 18, fontWeight: '900', marginTop: 2 }}>{s.value}</Text>
              <Text style={{ color: '#3A5040', fontSize: 10, fontWeight: '600', marginTop: 1 }}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Logros */}
        {unlocked.length > 0 && (
          <View style={{ marginBottom: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={sectionLabel}>🏅 LOGROS · {unlocked.length} / {unlocked.length + locked.length}</Text>
              <TouchableOpacity onPress={() => router.push('/achievements')}>
                <Text style={{ color: '#52CC64', fontSize: 12, fontWeight: '700' }}>Ver todos →</Text>
              </TouchableOpacity>
            </View>
            {/* show first 6 unlocked as emoji row */}
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              {unlocked.slice(0, 6).map(a => (
                <View key={a.id} style={{ backgroundColor: '#131D14', borderRadius: 12, borderWidth: 1, borderColor: '#2A5A2E', width: 52, height: 52, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 24 }}>{a.emoji}</Text>
                </View>
              ))}
              {locked.length > 0 && (
                <View style={{ backgroundColor: '#0C1410', borderRadius: 12, borderWidth: 1, borderColor: '#1C2E1E', width: 52, height: 52, alignItems: 'center', justifyContent: 'center', opacity: 0.4 }}>
                  <Text style={{ color: '#728C74', fontSize: 11, fontWeight: '700', textAlign: 'center' }}>+{locked.length}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Config + cuenta */}
        <TouchableOpacity
          onPress={() => router.push('/settings')}
          style={{ backgroundColor: '#1A3D1E', borderRadius: 16, borderWidth: 1, borderColor: '#2A5A2E', padding: 14, marginBottom: 12, alignItems: 'center' }}
        >
          <Text style={{ color: '#52CC64', fontSize: 13, fontWeight: '700' }}>⚙️ Configuracion</Text>
        </TouchableOpacity>

        <View style={{ backgroundColor: '#131D14', borderRadius: 16, borderWidth: 1, borderColor: '#1C2E1E', overflow: 'hidden' }}>
          <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: '#1C2E1E' }}>
            <Text style={{ color: '#728C74', fontSize: 11, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 }}>Correo</Text>
            <Text style={{ color: '#E4F2E7', fontSize: 13 }}>{user?.email}</Text>
          </View>
          <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: '#1C2E1E' }}>
            <Text style={{ color: '#728C74', fontSize: 11, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 }}>Plan</Text>
            <Text style={{ color: '#52CC64', fontSize: 13, fontWeight: '800' }}>Free</Text>
          </View>
          <TouchableOpacity onPress={handleSignOut} style={{ padding: 16 }}>
            <Text style={{ color: '#EF4444', fontSize: 14, fontWeight: '700', textAlign: 'center' }}>Cerrar sesion</Text>
          </TouchableOpacity>
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
