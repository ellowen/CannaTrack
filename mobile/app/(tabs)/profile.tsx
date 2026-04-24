import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { format, differenceInDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { getLevelInfo, getAchievements, LEVELS } from '@shared/lib/gamification'
import type { AchievementData } from '@shared/lib/gamification'

type HarvestedPlant = { id: string; name: string; genetics: string; startDate: Date; completionRate: number }

export default function ProfileScreen() {
  const { user } = useAuth()
  const [profile, setProfile]         = useState<{ xp: number; streak: number; bestStreak: number; username: string } | null>(null)
  const [loading, setLoading]         = useState(true)
  const [completedToday, setCompletedToday] = useState(0)
  const [achievementData, setAchievementData] = useState<AchievementData | null>(null)
  const [harvestedList, setHarvestedList] = useState<HarvestedPlant[]>([])

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
        supabase.from('plants').select('id, name, genetics, start_date').eq('user_id', user.id).eq('status', 'harvested'),
        supabase.from('scheduled_tasks').select('id').eq('user_id', user.id).eq('completed', true)
          .gte('completed_at', today0.toISOString()),
        supabase.from('scheduled_tasks').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('completed', true),
        supabase.from('measurements').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('week_logs').select('*', { count: 'exact', head: true }).eq('user_id', user.id).not('photo_url', 'is', null),
      ])

      if (p) setProfile({ xp: p.xp ?? 0, streak: p.streak_days ?? 0, bestStreak: p.best_streak ?? 0, username: p.username ?? user.email?.split('@')[0] ?? 'Cultivador' })
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

      // Wall of fame: completion rates por planta cosechada
      if (harvestedPlants && harvestedPlants.length > 0) {
        const ids = harvestedPlants.map(h => h.id)
        const { data: allTasks } = await supabase
          .from('scheduled_tasks')
          .select('plant_id, completed')
          .in('plant_id', ids)

        const list: HarvestedPlant[] = harvestedPlants.map(h => {
          const plantTasks = allTasks?.filter(t => t.plant_id === h.id) ?? []
          const done       = plantTasks.filter(t => t.completed).length
          const rate       = plantTasks.length > 0 ? Math.round((done / plantTasks.length) * 100) : 0
          return {
            id:             h.id as string,
            name:           h.name as string,
            genetics:       h.genetics as string,
            startDate:      new Date(h.start_date as string),
            completionRate: rate,
          }
        })
        setHarvestedList(list)
      }

      setLoading(false)
    }
    load()
  }, [user])

  async function handleSignOut() {
    Alert.alert('Cerrar sesion', '¿Estas seguro?', [
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
  const ad = achievementData

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0C1410' }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>

        {/* Header con gradiente */}
        <View style={{ backgroundColor: '#0D0A1A', paddingHorizontal: 16, paddingTop: 20, paddingBottom: 24 }}>
          {/* Fondo radial simulado */}
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 120, backgroundColor: '#1A0D35', opacity: 0.6 }} />

          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 14, position: 'relative' }}>
            {/* Avatar nivel */}
            <View style={{ width: 64, height: 64, borderRadius: 16, backgroundColor: '#6D28D9', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 30 }}>{lvl.emoji}</Text>
            </View>

            {/* Info */}
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#fff', fontSize: 20, fontWeight: '900', lineHeight: 22 }}>{profile.username}</Text>
              <Text style={{ color: '#A78BFA', fontSize: 13, fontWeight: '600', marginTop: 2 }}>
                Nivel {lvl.level} — {lvl.name}
              </Text>
              {/* XP bar */}
              <View style={{ marginTop: 10 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: '700' }}>{profile.xp} XP</Text>
                  {nextLvl && <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10 }}>{nextLvl.xpRequired} XP</Text>}
                </View>
                <View style={{ height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                  <View style={{ height: '100%', borderRadius: 3, backgroundColor: '#8B5CF6', width: `${Math.round(progressToNext * 100)}%` }} />
                </View>
                {nextLvl && (
                  <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, marginTop: 3 }}>
                    {nextLvl.xpRequired - profile.xp} XP para {nextLvl.name}
                  </Text>
                )}
              </View>
            </View>

            {/* Settings */}
            <TouchableOpacity
              onPress={() => router.push('/settings')}
              style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ fontSize: 16 }}>⚙️</Text>
            </TouchableOpacity>
          </View>

          {/* Stats rapidos: racha, mejor racha, cumplimiento */}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 20 }}>
            {[
              { value: profile.streak, label: profile.streak === 1 ? 'Dia racha' : 'Dias racha', icon: '🔥', hot: profile.streak >= 7 },
              { value: profile.bestStreak, label: 'Mejor racha', icon: '⚡', hot: false },
              { value: completedToday, label: 'Completadas hoy', icon: '✅', hot: false },
            ].map(s => (
              <View key={s.label} style={{
                flex: 1, borderRadius: 16, padding: 10, alignItems: 'center',
                backgroundColor: s.hot ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.08)',
                borderWidth: 1, borderColor: s.hot ? 'rgba(245,158,11,0.3)' : 'rgba(255,255,255,0.1)',
              }}>
                <Text style={{ fontSize: 14 }}>{s.icon}</Text>
                <Text style={{ color: s.hot ? '#F59E0B' : '#fff', fontSize: 20, fontWeight: '900', marginTop: 2 }}>{s.value}</Text>
                <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: '600', marginTop: 1, textAlign: 'center' }}>{s.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={{ padding: 16, gap: 24 }}>

          {/* Camino del cultivador */}
          <View>
            <Text style={sectionLabel}>Camino del cultivador</Text>
            <View style={{ backgroundColor: '#131D14', borderRadius: 16, borderWidth: 1, borderColor: '#1C2E1E', padding: 14 }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 0 }}>
                  {LEVELS.map((level, i) => {
                    const isCurrent = level.level === lvl.level
                    const isPassed  = profile.xp >= level.xpRequired
                    return (
                      <View key={level.level} style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={{
                          width: 36, height: 36, borderRadius: 10,
                          alignItems: 'center', justifyContent: 'center',
                          backgroundColor: isCurrent ? 'rgba(139,92,246,0.2)' : '#0C1410',
                          borderWidth: isCurrent ? 2 : 1,
                          borderColor: isCurrent ? '#8B5CF6' : '#1C2E1E',
                          opacity: isPassed ? 1 : 0.35,
                        }}>
                          <Text style={{ fontSize: 16 }}>{level.emoji}</Text>
                        </View>
                        {i < LEVELS.length - 1 && (
                          <View style={{ width: 12, height: 2, backgroundColor: isPassed && level.level < lvl.level ? '#8B5CF6' : '#1C2E1E' }} />
                        )}
                      </View>
                    )
                  })}
                </View>
              </ScrollView>
              <Text style={{ color: '#728C74', fontSize: 11 }}>
                {nextLvl
                  ? `${nextLvl.xpRequired - profile.xp} XP para llegar a ${nextLvl.name} ${nextLvl.emoji}`
                  : 'Nivel maximo alcanzado ⚡'}
              </Text>
            </View>
          </View>

          {/* Stats detalladas 2x3 */}
          {ad && (
            <View>
              <Text style={sectionLabel}>Estadisticas</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {[
                  { icon: '✅', value: ad.totalTasksCompleted, label: 'Tareas completadas' },
                  { icon: '🧪', value: ad.tasksWithMeasurement, label: 'Mediciones EC/pH' },
                  { icon: '📸', value: ad.totalPhotos,          label: 'Fotos en el diario' },
                  { icon: '🌿', value: ad.activePlants,         label: 'Plantas activas' },
                  { icon: '✂️', value: ad.harvestedPlants,      label: 'Cosechas' },
                  { icon: '💎', value: ad.totalXP,              label: 'XP total' },
                ].map(s => (
                  <View key={s.label} style={{
                    width: '47%', backgroundColor: '#131D14', borderRadius: 14,
                    borderWidth: 1, borderColor: '#1C2E1E', padding: 14,
                    flexDirection: 'row', alignItems: 'center', gap: 10,
                  }}>
                    <Text style={{ fontSize: 22 }}>{s.icon}</Text>
                    <View>
                      <Text style={{ color: '#E4F2E7', fontSize: 20, fontWeight: '900', lineHeight: 22 }}>{s.value}</Text>
                      <Text style={{ color: '#728C74', fontSize: 10, marginTop: 2 }}>{s.label}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Logros desbloqueados */}
          <View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={sectionLabel}>🏅 Logros desbloqueados</Text>
              <TouchableOpacity onPress={() => router.push('/achievements')}>
                <Text style={{ color: '#8B5CF6', fontSize: 11, fontWeight: '700' }}>
                  {unlocked.length}/{unlocked.length + locked.length} Ver todos →
                </Text>
              </TouchableOpacity>
            </View>
            {unlocked.length === 0 ? (
              <View style={{ backgroundColor: '#131D14', borderRadius: 16, borderWidth: 1, borderColor: '#1C2E1E', padding: 24, alignItems: 'center' }}>
                <Text style={{ fontSize: 28, marginBottom: 8 }}>🔒</Text>
                <Text style={{ color: '#728C74', fontSize: 13, textAlign: 'center' }}>
                  Completa tu primera tarea para desbloquear logros
                </Text>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {unlocked.map(a => (
                  <View key={a.id} style={{
                    width: '47%', backgroundColor: '#131D14', borderRadius: 14,
                    borderWidth: 1, borderColor: 'rgba(139,92,246,0.25)',
                    padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10,
                  }}>
                    <Text style={{ fontSize: 24 }}>{a.emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#E4F2E7', fontSize: 11, fontWeight: '800', lineHeight: 14 }}>{a.name}</Text>
                      <Text style={{ color: '#3A5040', fontSize: 9, marginTop: 2, lineHeight: 12 }}>{a.description}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Por desbloquear */}
          {locked.length > 0 && (
            <View>
              <Text style={sectionLabel}>🔒 Por desbloquear</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {locked.slice(0, 4).map(a => (
                  <View key={a.id} style={{
                    width: '47%', backgroundColor: '#131D14', borderRadius: 14,
                    borderWidth: 1, borderColor: '#1C2E1E',
                    padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10,
                    opacity: 0.4,
                  }}>
                    <Text style={{ fontSize: 24 }}>{a.emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#E4F2E7', fontSize: 11, fontWeight: '800', lineHeight: 14 }}>{a.name}</Text>
                      <Text style={{ color: '#3A5040', fontSize: 9, marginTop: 2, lineHeight: 12 }}>{a.description}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Wall of Fame */}
          {harvestedList.length > 0 && (
            <View>
              <Text style={sectionLabel}>🏆 Wall of Fame</Text>
              <View style={{ gap: 10 }}>
                {harvestedList.map(plant => (
                  <TouchableOpacity
                    key={plant.id}
                    onPress={() => router.push(`/plants/${plant.id}`)}
                    style={{ backgroundColor: '#131D14', borderRadius: 16, borderWidth: 1, borderColor: '#1C2E1E', padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}
                    activeOpacity={0.8}
                  >
                    <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: '#0C1410', borderWidth: 1, borderColor: '#1C2E1E', alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 22 }}>✂️</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#E4F2E7', fontSize: 14, fontWeight: '700' }}>{plant.name}</Text>
                      <Text style={{ color: '#728C74', fontSize: 11, marginTop: 1 }}>{plant.genetics}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                        <Text style={{ color: '#52CC64', fontSize: 10, fontWeight: '700' }}>
                          {plant.completionRate}% cumplimiento
                        </Text>
                        <Text style={{ color: '#3A5040', fontSize: 10 }}>
                          · {differenceInDays(new Date(), plant.startDate)}d
                          · {format(plant.startDate, "d MMM yyyy", { locale: es })}
                        </Text>
                      </View>
                    </View>
                    <Text style={{ color: '#3A5040', fontSize: 16 }}>›</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Cuenta */}
          <View style={{ backgroundColor: '#131D14', borderRadius: 16, borderWidth: 1, borderColor: '#1C2E1E', overflow: 'hidden' }}>
            <View style={{ padding: 14, borderBottomWidth: 1, borderBottomColor: '#1C2E1E' }}>
              <Text style={{ color: '#728C74', fontSize: 10, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 3 }}>Correo</Text>
              <Text style={{ color: '#E4F2E7', fontSize: 13 }}>{user?.email}</Text>
            </View>
            <View style={{ padding: 14, borderBottomWidth: 1, borderBottomColor: '#1C2E1E' }}>
              <Text style={{ color: '#728C74', fontSize: 10, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 3 }}>Plan</Text>
              <Text style={{ color: '#52CC64', fontSize: 13, fontWeight: '800' }}>Free</Text>
            </View>
            <TouchableOpacity onPress={handleSignOut} style={{ padding: 14 }}>
              <Text style={{ color: '#EF4444', fontSize: 14, fontWeight: '700', textAlign: 'center' }}>Cerrar sesion</Text>
            </TouchableOpacity>
          </View>

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
