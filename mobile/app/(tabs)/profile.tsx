import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, ScrollView, Alert, Switch, ActivityIndicator, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { getLevelInfo, getAchievements, computeStreak } from '@shared/lib/gamification'
import { colors, spacing, radius } from '@/constants/theme'
import type { AchievementData } from '@shared/lib/gamification'

export default function ProfileScreen() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<{
    xp: number
    streak: number
    bestStreak: number
    notificationsEnabled: boolean
    lastActivityDate: string | null
  } | null>(null)
  const [stats, setStats] = useState({ plantCount: 0, completedToday: 0, totalCompleted: 0, harvestedPlants: 0, totalPhotos: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      if (!user) return
      const [{ data: p }, { data: plants }, { data: todayTasks }, { data: allTasks }] = await Promise.all([
        supabase.from('profiles').select('xp, streak, best_streak, notifications_enabled, last_activity_date').eq('id', user.id).single(),
        supabase.from('plants').select('status').eq('user_id', user.id),
        supabase.from('scheduled_tasks').select('id').eq('user_id', user.id).eq('completed', true)
          .gte('completed_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
        supabase.from('scheduled_tasks').select('id').eq('user_id', user.id).eq('completed', true),
      ])
      if (p) {
        setProfile({
          xp: p.xp ?? 0,
          streak: p.streak ?? 0,
          bestStreak: p.best_streak ?? 0,
          notificationsEnabled: p.notifications_enabled ?? true,
          lastActivityDate: p.last_activity_date ?? null,
        })
      }
      setStats({
        plantCount: plants?.length ?? 0,
        completedToday: todayTasks?.length ?? 0,
        totalCompleted: allTasks?.length ?? 0,
        harvestedPlants: plants?.filter(p => p.status === 'harvested').length ?? 0,
        totalPhotos: 0,
      })
      setLoading(false)
    }
    load()
  }, [user])

  async function toggleNotifications(enabled: boolean) {
    if (!user) return
    await supabase.from('profiles').update({ notifications_enabled: enabled }).eq('id', user.id)
    if (profile) setProfile({ ...profile, notificationsEnabled: enabled })
  }

  async function handleSignOut() {
    Alert.alert('Cerrar sesion', 'Estas seguro?', [
      { text: 'Cancelar' },
      { text: 'Cerrar sesion', style: 'destructive', onPress: () => supabase.auth.signOut() },
    ])
  }

  if (loading || !profile) {
    return (
      <SafeAreaView style={s.center}>
        <ActivityIndicator color={colors.brand.green} size="large" />
      </SafeAreaView>
    )
  }

  const { current: lvl, next: nextLvl, progressToNext } = getLevelInfo(profile.xp)

  const achievementData: AchievementData = {
    streak:               profile.streak,
    bestStreak:           profile.bestStreak,
    totalXP:              profile.xp,
    totalTasksCompleted:  stats.totalCompleted,
    tasksWithMeasurement: 0,
    harvestedPlants:      stats.harvestedPlants,
    activePlants:         stats.plantCount,
    totalPhotos:          stats.totalPhotos,
  }
  const { unlocked } = getAchievements(achievementData)

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg.primary }}>
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 100 }}>

        {/* Avatar + nombre */}
        <View style={s.avatarSection}>
          <View style={s.avatar}>
            <Text style={{ fontSize: 40 }}>{lvl.emoji}</Text>
          </View>
          <Text style={s.username}>{user?.email?.split('@')[0] ?? 'Cultivador'}</Text>
          <Text style={{ color: colors.text.secondary, fontSize: 13, marginTop: 2 }}>
            {lvl.name} · Nivel {lvl.level}
          </Text>
        </View>

        {/* Barra de XP */}
        <View style={[s.card, { marginBottom: spacing.md }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={{ color: colors.text.secondary, fontSize: 12, fontWeight: '700' }}>
              {lvl.emoji} {lvl.name}
            </Text>
            {nextLvl && (
              <Text style={{ color: colors.brand.green, fontSize: 12, fontWeight: '700' }}>
                {profile.xp} / {nextLvl.xpRequired} XP
              </Text>
            )}
          </View>
          <View style={s.xpTrack}>
            <View style={[s.xpFill, { width: `${progressToNext * 100}%` }]} />
          </View>
          {nextLvl && (
            <Text style={{ color: colors.text.muted, fontSize: 11, marginTop: 6, textAlign: 'right' }}>
              Siguiente: {nextLvl.emoji} {nextLvl.name}
            </Text>
          )}
        </View>

        {/* Stats */}
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: spacing.md }}>
          {[
            { label: 'Plantas', value: stats.plantCount,    emoji: '🌱' },
            { label: 'Hoy',     value: stats.completedToday, emoji: '✅' },
            { label: 'Racha',   value: profile.streak,       emoji: '🔥' },
          ].map(stat => (
            <View key={stat.label} style={s.statCard}>
              <Text style={{ fontSize: 20 }}>{stat.emoji}</Text>
              <Text style={s.statValue}>{stat.value}</Text>
              <Text style={s.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Logros desbloqueados */}
        {unlocked.length > 0 && (
          <View style={{ marginBottom: spacing.md }}>
            <Text style={s.sectionLabel}>LOGROS ({unlocked.length})</Text>
            <View style={s.card}>
              {unlocked.slice(0, 5).map((a, i) => (
                <View key={a.id} style={[s.row, { borderTopWidth: i > 0 ? 1 : 0, borderTopColor: colors.border.default }]}>
                  <Text style={{ fontSize: 20 }}>{a.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text.primary, fontWeight: '700', fontSize: 13 }}>{a.name}</Text>
                    <Text style={{ color: colors.text.secondary, fontSize: 11 }}>{a.description}</Text>
                  </View>
                </View>
              ))}
              {unlocked.length > 5 && (
                <View style={[s.row, { borderTopWidth: 1, borderTopColor: colors.border.default }]}>
                  <Text style={{ color: colors.text.secondary, fontSize: 12, flex: 1, textAlign: 'center' }}>
                    +{unlocked.length - 5} logros mas
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Plan */}
        <View style={[s.card, { marginBottom: spacing.md, backgroundColor: colors.bg.elevated, borderColor: colors.border.accent }]}>
          <Text style={{ color: colors.brand.green, fontSize: 11, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase', textAlign: 'center' }}>
            Plan Free
          </Text>
        </View>

        {/* Ajustes */}
        <View style={[s.card, { marginBottom: spacing.md }]}>
          <View style={[s.row, { borderBottomWidth: 1, borderBottomColor: colors.border.default }]}>
            <Text style={{ color: colors.text.primary, fontSize: 14, fontWeight: '700', flex: 1 }}>Notificaciones</Text>
            <Switch
              value={profile.notificationsEnabled}
              onValueChange={toggleNotifications}
              trackColor={{ false: colors.border.default, true: colors.brand.green }}
              thumbColor={profile.notificationsEnabled ? colors.bg.header : colors.text.secondary}
            />
          </View>
          <View style={[s.row, { borderBottomWidth: 1, borderBottomColor: colors.border.default }]}>
            <View>
              <Text style={{ color: colors.text.secondary, fontSize: 11, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 }}>Correo</Text>
              <Text style={{ color: colors.text.primary, fontSize: 14 }}>{user?.email}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={handleSignOut} style={s.row}>
            <Text style={{ color: colors.status.error, fontSize: 14, fontWeight: '700', flex: 1, textAlign: 'center' }}>
              Cerrar sesion
            </Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  center:        { flex: 1, backgroundColor: colors.bg.primary, alignItems: 'center', justifyContent: 'center' },
  avatarSection: { alignItems: 'center', marginBottom: spacing.lg },
  avatar:        { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.bg.header, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  username:      { color: colors.text.primary, fontSize: 18, fontWeight: '900' },
  card:          { backgroundColor: colors.bg.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border.default, padding: spacing.md, overflow: 'hidden' },
  xpTrack:       { height: 8, backgroundColor: colors.border.default, borderRadius: 4, overflow: 'hidden' },
  xpFill:        { height: '100%', backgroundColor: colors.brand.green },
  statCard:      { flex: 1, backgroundColor: colors.bg.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border.default, padding: 12, alignItems: 'center' },
  statValue:     { color: colors.text.primary, fontSize: 18, fontWeight: '900', marginTop: 4 },
  statLabel:     { color: colors.text.muted, fontSize: 10, fontWeight: '600', marginTop: 2 },
  sectionLabel:  { color: colors.text.secondary, fontSize: 11, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 },
  row:           { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md },
})
