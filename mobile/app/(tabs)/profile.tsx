import { useState, useEffect, useCallback } from 'react'
import { View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { router, useFocusEffect } from 'expo-router'
import { format, differenceInDays } from 'date-fns'
import { useDateLocale } from '@/lib/dateLocale'
import { useAuth } from '@/hooks/useAuth'
import { usePlan } from '@/hooks/usePlan'
import { supabase } from '@/lib/supabase'
import { getLevelInfo, getAchievements, LEVELS } from '@shared/lib/gamification'
import type { AchievementData } from '@shared/lib/gamification'
import PaywallModal from '@/components/PaywallModal'
import { useTranslation } from '@/i18n'

type HarvestedPlant = { id: string; name: string; genetics: string; startDate: Date; completionRate: number }

export default function ProfileScreen() {
  const { t } = useTranslation()
  const dateLocale = useDateLocale()
  const { user, loading: authLoading } = useAuth()
  const { isPro } = usePlan()
  const [showPaywall, setShowPaywall] = useState(false)
  const [profile, setProfile]         = useState<{ xp: number; streak: number; bestStreak: number; username: string } | null>(null)
  const [loading, setLoading]         = useState(true)
  const [completedToday, setCompletedToday] = useState(0)
  const [achievementData, setAchievementData] = useState<AchievementData | null>(null)
  const [harvestedList, setHarvestedList] = useState<HarvestedPlant[]>([])

  useFocusEffect(useCallback(() => {
    if (authLoading) return
    if (!user) { setLoading(false); return }
    const uid = user.id
    const email = user.email
    async function load() {
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
        supabase.from('profiles').select('xp, streak_days, username').eq('id', uid).maybeSingle(),
        supabase.from('plants').select('id').eq('user_id', uid).eq('status', 'active'),
        supabase.from('plants').select('id, name, genetics, start_date').eq('user_id', uid).eq('status', 'harvested'),
        supabase.from('scheduled_tasks').select('id').eq('user_id', uid).eq('completed', true)
          .gte('completed_at', today0.toISOString()),
        supabase.from('scheduled_tasks').select('*', { count: 'exact', head: true }).eq('user_id', uid).eq('completed', true),
        supabase.from('measurements').select('*', { count: 'exact', head: true }).eq('user_id', uid),
        supabase.from('week_logs').select('*', { count: 'exact', head: true }).eq('user_id', uid).not('photo_url', 'is', null),
      ])

      setProfile({ xp: p?.xp ?? 0, streak: p?.streak_days ?? 0, bestStreak: 0, username: p?.username ?? email?.split('@')[0] ?? t('profileTab.default_username') })
      setCompletedToday(tasksToday?.length ?? 0)
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
  }, [user?.id, authLoading]))

  async function handleSignOut() {
    Alert.alert(t('settings.sign_out_title'), t('settings.sign_out_confirm'), [
      { text: t('common.cancel') },
      { text: t('profileTab.sign_out_action'), style: 'destructive', onPress: async () => { await supabase.auth.signOut(); router.replace('/auth') } },
    ])
  }

  if (loading || !profile) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#080E09', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#52CC64" size="large" />
        <TouchableOpacity
          onPress={handleSignOut}
          style={{ marginTop: 32, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12, borderWidth: 1, borderColor: '#EF4444' }}
        >
          <Text style={{ color: '#EF4444', fontWeight: '700' }}>{t('settings.sign_out')}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    )
  }

  const { current: lvl, next: nextLvl, progressToNext } = getLevelInfo(profile.xp)
  const { unlocked, locked } = achievementData ? getAchievements(achievementData) : { unlocked: [], locked: [] }
  const ad = achievementData

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#080E09' }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>

        {/* Hero header */}
        <LinearGradient
          colors={['#150D28', '#0D0820', '#080E09']}
          start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
          style={{ paddingHorizontal: 16, paddingTop: 24, paddingBottom: 28 }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 14 }}>
            {/* Avatar */}
            <LinearGradient
              colors={['#7C3AED', '#5B21B6']}
              style={{ width: 68, height: 68, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(167,139,250,0.3)' }}
            >
              <Text style={{ fontSize: 32 }}>{lvl.emoji}</Text>
            </LinearGradient>

            <View style={{ flex: 1 }}>
              <Text style={{ color: '#E4F2E7', fontSize: 22, fontWeight: '900', lineHeight: 24 }}>{profile.username}</Text>
              <Text style={{ color: '#A78BFA', fontSize: 13, fontWeight: '600', marginTop: 3 }}>
                {t('profileTab.level_label', { level: lvl.level, name: lvl.name })}
              </Text>
              {/* XP bar */}
              <View style={{ marginTop: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                  <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, fontWeight: '700' }}>{t('profileTab.xp_value', { xp: profile.xp })}</Text>
                  {nextLvl && <Text style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12 }}>{t('profileTab.xp_value', { xp: nextLvl.xpRequired })}</Text>}
                </View>
                <View style={{ height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                  <LinearGradient
                    colors={['#7C3AED', '#A855F7', '#C084FC']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={{ height: '100%', borderRadius: 3, width: `${Math.round(progressToNext * 100)}%` }}
                  />
                </View>
                {nextLvl && (
                  <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, marginTop: 4 }}>
                    {t('profileTab.xp_needed', { amount: nextLvl.xpRequired - profile.xp, name: nextLvl.name, emoji: nextLvl.emoji })}
                  </Text>
                )}
              </View>
            </View>

            <TouchableOpacity
              onPress={() => router.push('/settings')}
              style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ fontSize: 16 }}>⚙️</Text>
            </TouchableOpacity>
          </View>

          {/* Quick stats */}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 20 }}>
            {[
              { value: profile.streak, label: t('profileTab.stat_streak_days'), icon: '🔥', hot: profile.streak >= 7, color: '#F59E0B' },
              { value: profile.bestStreak, label: t('profileTab.stat_best_streak'), icon: '⚡', hot: false, color: '#A78BFA' },
              { value: completedToday, label: t('profileTab.stat_today'), icon: '✅', hot: completedToday > 0, color: '#52CC64' },
            ].map(s => (
              <LinearGradient
                key={s.label}
                colors={s.hot
                  ? (s.icon === '🔥' ? ['rgba(245,158,11,0.18)', 'rgba(245,158,11,0.06)'] : ['rgba(82,204,100,0.18)', 'rgba(82,204,100,0.06)'])
                  : ['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.02)']}
                style={{
                  flex: 1, borderRadius: 16, padding: 12, alignItems: 'center',
                  borderWidth: 1, borderColor: s.hot ? `${s.color}33` : 'rgba(255,255,255,0.08)',
                }}
              >
                <Text style={{ fontSize: 16 }}>{s.icon}</Text>
                <Text style={{ color: s.hot ? s.color : '#E4F2E7', fontSize: 22, fontWeight: '900', marginTop: 3 }}>{s.value}</Text>
                <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, fontWeight: '600', marginTop: 2, textAlign: 'center' }}>{s.label}</Text>
              </LinearGradient>
            ))}
          </View>
        </LinearGradient>

        <View style={{ padding: 16, gap: 24 }}>

          {/* Camino del cultivador */}
          <View>
            <Text style={sectionLabel}>{t('profileTab.section_path')}</Text>
            <LinearGradient colors={['#130E22', '#0C0A18']} style={{ borderRadius: 18, borderWidth: 1, borderColor: 'rgba(139,92,246,0.15)', padding: 16 }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 0 }}>
                  {LEVELS.map((level, i) => {
                    const isCurrent = level.level === lvl.level
                    const isPassed  = profile.xp >= level.xpRequired
                    return (
                      <View key={level.level} style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={{
                          width: 38, height: 38, borderRadius: 11,
                          alignItems: 'center', justifyContent: 'center',
                          backgroundColor: isCurrent ? 'rgba(124,58,237,0.25)' : 'rgba(0,0,0,0.3)',
                          borderWidth: isCurrent ? 2 : 1,
                          borderColor: isCurrent ? '#8B5CF6' : 'rgba(255,255,255,0.08)',
                          opacity: isPassed ? 1 : 0.3,
                        }}>
                          <Text style={{ fontSize: 18 }}>{level.emoji}</Text>
                        </View>
                        {i < LEVELS.length - 1 && (
                          <View style={{ width: 14, height: 2, backgroundColor: isPassed && level.level < lvl.level ? '#8B5CF6' : 'rgba(255,255,255,0.06)' }} />
                        )}
                      </View>
                    )
                  })}
                </View>
              </ScrollView>
              <Text style={{ color: '#728C74', fontSize: 13 }}>
                {nextLvl
                  ? t('profileTab.xp_needed', { amount: nextLvl.xpRequired - profile.xp, name: nextLvl.name, emoji: nextLvl.emoji })
                  : t('profileTab.max_level_reached')}
              </Text>
            </LinearGradient>
          </View>

          {/* Stats grid */}
          {ad && (
            <View>
              <Text style={sectionLabel}>{t('profileTab.section_stats')}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {[
                  { icon: '✅', value: ad.totalTasksCompleted, label: t('profileTab.stat_tasks_completed'), color: '#52CC64' },
                  { icon: '🧪', value: ad.tasksWithMeasurement, label: t('profileTab.stat_measurements'), color: '#3B82F6' },
                  { icon: '📸', value: ad.totalPhotos,          label: t('profileTab.stat_photos'), color: '#F59E0B' },
                  { icon: '🌿', value: ad.activePlants,         label: t('profileTab.stat_active_plants'), color: '#22C55E' },
                  { icon: '✂️', value: ad.harvestedPlants,      label: t('profileTab.stat_harvests'), color: '#A855F7' },
                  { icon: '💎', value: ad.totalXP,              label: t('profileTab.stat_total_xp'), color: '#C084FC' },
                ].map(s => (
                  <LinearGradient
                    key={s.label}
                    colors={['#131A10', '#0C1009']}
                    style={{
                      width: '47%', borderRadius: 16,
                      borderWidth: 1, borderColor: `${s.color}22`,
                      padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12,
                    }}
                  >
                    <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: `${s.color}15`, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 20 }}>{s.icon}</Text>
                    </View>
                    <View>
                      <Text style={{ color: '#E4F2E7', fontSize: 22, fontWeight: '900', lineHeight: 24 }}>{s.value}</Text>
                      <Text style={{ color: '#728C74', fontSize: 12, marginTop: 2 }}>{s.label}</Text>
                    </View>
                  </LinearGradient>
                ))}
              </View>
            </View>
          )}

          {/* Logros desbloqueados */}
          <View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={sectionLabel}>{t('profileTab.section_achievements_unlocked')}</Text>
              <TouchableOpacity onPress={() => router.push('/achievements')}>
                <Text style={{ color: '#8B5CF6', fontSize: 13, fontWeight: '700' }}>
                  {t('profileTab.view_all', { unlocked: unlocked.length, total: unlocked.length + locked.length })}
                </Text>
              </TouchableOpacity>
            </View>
            {unlocked.length === 0 ? (
              <LinearGradient colors={['#131A10', '#0C1009']} style={{ borderRadius: 18, borderWidth: 1, borderColor: '#1C2E1E', padding: 28, alignItems: 'center' }}>
                <Text style={{ fontSize: 30, marginBottom: 10 }}>🔒</Text>
                <Text style={{ color: '#728C74', fontSize: 13, textAlign: 'center' }}>
                  {t('profileTab.no_achievements')}
                </Text>
              </LinearGradient>
            ) : (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {unlocked.map(a => (
                  <LinearGradient
                    key={a.id}
                    colors={['#1A1030', '#100A20']}
                    style={{
                      width: '47%', borderRadius: 16,
                      borderWidth: 1, borderColor: 'rgba(139,92,246,0.3)',
                      padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10,
                    }}
                  >
                    <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(139,92,246,0.15)', alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 22 }}>{a.emoji}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#E4F2E7', fontSize: 13, fontWeight: '800', lineHeight: 16 }}>{a.name}</Text>
                      <Text style={{ color: '#6A5090', fontSize: 11, marginTop: 3, lineHeight: 14 }}>{a.description}</Text>
                    </View>
                  </LinearGradient>
                ))}
              </View>
            )}
          </View>

          {/* Por desbloquear */}
          {locked.length > 0 && (
            <View>
              <Text style={sectionLabel}>{t('profileTab.section_locked')}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {locked.slice(0, 4).map(a => (
                  <View
                    key={a.id}
                    style={{
                      width: '47%', backgroundColor: '#0E1210', borderRadius: 16,
                      borderWidth: 1, borderColor: '#1C2E1E',
                      padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10,
                      opacity: 0.4,
                    }}
                  >
                    <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.04)', alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 22 }}>{a.emoji}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#E4F2E7', fontSize: 13, fontWeight: '800', lineHeight: 16 }}>{a.name}</Text>
                      <Text style={{ color: '#3A5040', fontSize: 11, marginTop: 3, lineHeight: 14 }}>{a.description}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Wall of Fame */}
          {harvestedList.length > 0 && (
            <View>
              <Text style={sectionLabel}>{t('profileTab.section_wall_of_fame')}</Text>
              <View style={{ gap: 10 }}>
                {harvestedList.map(plant => (
                  <TouchableOpacity
                    key={plant.id}
                    onPress={() => router.push(`/plants/${plant.id}`)}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={['#1A1000', '#0E0900']}
                      style={{ borderRadius: 18, borderWidth: 1, borderColor: 'rgba(245,158,11,0.15)', padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}
                    >
                      <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: 'rgba(245,158,11,0.1)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.2)', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontSize: 24 }}>✂️</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: '#E4F2E7', fontSize: 14, fontWeight: '800' }}>{plant.name}</Text>
                        <Text style={{ color: '#728C74', fontSize: 13, marginTop: 1 }}>{plant.genetics}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 5 }}>
                          <View style={{ backgroundColor: 'rgba(82,204,100,0.12)', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 }}>
                            <Text style={{ color: '#52CC64', fontSize: 10, fontWeight: '700' }}>
                              {t('profileTab.completion_rate', { rate: plant.completionRate })}
                            </Text>
                          </View>
                          <Text style={{ color: '#3A5040', fontSize: 10 }}>
                            {t('profileTab.days_since', { days: differenceInDays(new Date(), plant.startDate), date: format(plant.startDate, "d MMM yyyy", { locale: dateLocale }) })}
                          </Text>
                        </View>
                      </View>
                      <Text style={{ color: '#728C74', fontSize: 18 }}>›</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Banner Pro / upgrade */}
          {!isPro ? (
            <TouchableOpacity onPress={() => setShowPaywall(true)} activeOpacity={0.88}>
              <LinearGradient
                colors={['#1A1040', '#100A28', '#0D0820']}
                style={{ borderRadius: 20, borderWidth: 1, borderColor: 'rgba(167,139,250,0.35)', padding: 20 }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                  <LinearGradient
                    colors={['#7C3AED', '#5B21B6']}
                    style={{ width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Text style={{ fontSize: 26 }}>👑</Text>
                  </LinearGradient>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                      <Text style={{ color: '#E4F2E7', fontSize: 16, fontWeight: '900' }}>{t('profileTab.pro_activate_title')}</Text>
                      <View style={{ backgroundColor: 'rgba(167,139,250,0.15)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1, borderColor: 'rgba(167,139,250,0.3)' }}>
                        <Text style={{ color: '#A78BFA', fontSize: 10, fontWeight: '900', letterSpacing: 0.8 }}>{t('profileTab.pro_price_badge')}</Text>
                      </View>
                    </View>
                    <Text style={{ color: '#6D4FB0', fontSize: 13, lineHeight: 18 }}>
                      {t('profileTab.pro_desc')}
                    </Text>
                  </View>
                  <Text style={{ color: '#7C3AED', fontSize: 20 }}>›</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <LinearGradient
              colors={['#1A1040', '#100A28']}
              style={{ borderRadius: 20, borderWidth: 1, borderColor: 'rgba(167,139,250,0.25)', padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}
            >
              <LinearGradient
                colors={['#7C3AED', '#5B21B6']}
                style={{ width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}
              >
                <Text style={{ fontSize: 22 }}>👑</Text>
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#A78BFA', fontSize: 15, fontWeight: '900' }}>{t('profileTab.pro_active_title')}</Text>
                <Text style={{ color: '#6D4FB0', fontSize: 12, marginTop: 2 }}>{t('profileTab.pro_active_desc')}</Text>
              </View>
              <View style={{ backgroundColor: 'rgba(167,139,250,0.2)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 }}>
                <Text style={{ color: '#A78BFA', fontSize: 11, fontWeight: '900', letterSpacing: 0.8 }}>{t('profileTab.pro_badge')}</Text>
              </View>
            </LinearGradient>
          )}

          {/* Cuenta */}
          <LinearGradient colors={['#131A10', '#0C1009']} style={{ borderRadius: 18, borderWidth: 1, borderColor: '#1C2E1E', overflow: 'hidden' }}>
            <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: '#1C2E1E' }}>
              <Text style={{ color: '#728C74', fontSize: 13, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 }}>{t('profileTab.account_email_label')}</Text>
              <Text style={{ color: '#B8D4BC', fontSize: 15 }}>{user?.email}</Text>
            </View>
            <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: '#1C2E1E' }}>
              <Text style={{ color: '#728C74', fontSize: 13, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 }}>{t('profileTab.account_plan_label')}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {isPro ? (
                  <>
                    <Text style={{ color: '#A78BFA', fontSize: 13, fontWeight: '900' }}>{t('profileTab.plan_pro')}</Text>
                    <View style={{ backgroundColor: 'rgba(167,139,250,0.15)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1, borderColor: 'rgba(167,139,250,0.25)' }}>
                      <Text style={{ color: '#A78BFA', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 }}>{t('profileTab.plan_active_badge')}</Text>
                    </View>
                  </>
                ) : (
                  <>
                    <Text style={{ color: '#52CC64', fontSize: 13, fontWeight: '800' }}>{t('profileTab.plan_free')}</Text>
                    <TouchableOpacity onPress={() => setShowPaywall(true)}>
                      <View style={{ backgroundColor: 'rgba(167,139,250,0.1)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1, borderColor: 'rgba(167,139,250,0.2)' }}>
                        <Text style={{ color: '#A78BFA', fontSize: 10, fontWeight: '800' }}>{t('profileTab.upgrade_badge')}</Text>
                      </View>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
            <TouchableOpacity onPress={handleSignOut} style={{ padding: 16 }}>
              <Text style={{ color: '#EF4444', fontSize: 14, fontWeight: '700', textAlign: 'center' }}>{t('settings.sign_out')}</Text>
            </TouchableOpacity>
          </LinearGradient>

          <PaywallModal visible={showPaywall} onClose={() => setShowPaywall(false)} />

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
