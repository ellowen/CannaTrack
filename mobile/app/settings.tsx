import { useState, useEffect, useRef } from 'react'
import { View, Text, TouchableOpacity, ScrollView, Switch, Alert, ActivityIndicator, TextInput, Linking } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { BackIcon } from '@/components/icons/AppIcons'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/context/ThemeContext'
import { scheduleDailyReminder, schedulePlantTaskNotification } from '@/lib/notifications'
import * as Notifications from 'expo-notifications'
import { loadTasksFromSupabase, loadPlantsFromSupabase } from '@/lib/sync'
import { track } from '@/lib/analytics'
import { useTranslation, LANGUAGES } from '@/i18n'
import { useUserStore } from '@/store/userStore'

export default function SettingsScreen() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { isDark, toggleTheme } = useTheme()
  const { language, setLanguage } = useUserStore()
  const [notifications, setNotifications] = useState(true)
  const [loading, setLoading] = useState(true)
  const [deletingAccount, setDeletingAccount] = useState(false)

  const [loadedUsername, setLoadedUsername] = useState('')
  const [username, setUsername] = useState('')
  const [usernameError, setUsernameError] = useState('')
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [notificationHour, setNotificationHour] = useState(9)
  const [notificationMinute, setNotificationMinute] = useState(0)
  const [timeChangeState, setTimeChangeState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const timeChangeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    async function load() {
      if (!user) return
      const { data } = await supabase
        .from('profiles')
        .select('notifications_enabled, username, notification_time')
        .eq('id', user.id)
        .maybeSingle()
      if (data) {
        setNotifications(data.notifications_enabled ?? false)
        const name = data.username ?? ''
        setLoadedUsername(name)
        setUsername(name)
        const hour = parseInt(data.notification_time?.split(':')[0] ?? '09')
        const minute = parseInt(data.notification_time?.split(':')[1] ?? '00')
        setNotificationHour(hour)
        setNotificationMinute(minute)
      }
      setLoading(false)
    }
    load()
  }, [user])

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
      if (timeChangeTimeoutRef.current) clearTimeout(timeChangeTimeoutRef.current)
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current)
    }
  }, [])

  async function handleNotificationTimeChange() {
    if (!user) return
    setTimeChangeState('saving')
    const timeString = `${String(notificationHour).padStart(2, '0')}:${String(notificationMinute).padStart(2, '0')}`
    const { error } = await supabase.from('profiles').update({ notification_time: timeString }).eq('id', user.id)
    if (error) { setTimeChangeState('idle'); return }
    if (notifications) await scheduleDailyReminder(notificationHour, notificationMinute)
    setTimeChangeState('saved')
    timeChangeTimeoutRef.current = setTimeout(() => setTimeChangeState('idle'), 2000)
  }

  useEffect(() => {
    if (!notifications) return
    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current)
    debounceTimeoutRef.current = setTimeout(() => { handleNotificationTimeChange() }, 500)
    return () => { if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current) }
  }, [notificationHour, notificationMinute, notifications])

  function handleUsernameChange(value: string) {
    setUsername(value)
    setUsernameError('')
  }

  async function handleSaveUsername() {
    const trimmed = username.trim()
    if (!trimmed) { setUsernameError(t('settings.username_empty_error')); return }
    if (trimmed.length > 30) { setUsernameError(t('settings.username_max_error')); return }
    if (!user) return
    setSaveState('saving')
    const { error } = await supabase.from('profiles').update({ username: trimmed }).eq('id', user.id)
    if (error) { setSaveState('idle'); setUsernameError(t('settings.username_save_error')); return }
    setLoadedUsername(trimmed)
    setUsername(trimmed)
    setSaveState('saved')
    saveTimeoutRef.current = setTimeout(() => setSaveState('idle'), 2000)
  }

  const usernameChanged = username !== loadedUsername
  const saveDisabled = !usernameChanged || saveState === 'saving'

  async function handleToggleNotifications(value: boolean) {
    setNotifications(value)
    if (!user) return
    await supabase.from('profiles').update({ notifications_enabled: value }).eq('id', user.id)
    if (value) {
      await scheduleDailyReminder(notificationHour, notificationMinute)
      // Re-programar tareas pendientes de los proximos 7 dias
      const [plants, tasks] = await Promise.all([
        loadPlantsFromSupabase(user.id),
        loadTasksFromSupabase(user.id),
      ])
      const plantMap = new Map(plants.map(p => [p.id, p]))
      const now = new Date()
      const horizon = new Date(now)
      horizon.setDate(horizon.getDate() + 7)
      for (const task of tasks) {
        if (task.completed) continue
        const d = task.scheduledDate instanceof Date ? task.scheduledDate : new Date(task.scheduledDate)
        if (d <= now || d > horizon) continue
        const plant = plantMap.get(task.plantId)
        if (!plant) continue
        void schedulePlantTaskNotification(task.plantId, plant.name, task.type, d)
      }
    } else {
      await Notifications.cancelAllScheduledNotificationsAsync()
    }
  }

  async function handleSignOut() {
    Alert.alert(t('settings.sign_out_title'), t('settings.sign_out_confirm'), [
      { text: t('common.cancel') },
      { text: t('settings.sign_out'), style: 'destructive', onPress: async () => { await supabase.auth.signOut(); router.replace('/auth') } },
    ])
  }

  async function handleDeleteAccount() {
    Alert.alert(
      t('settings.delete_account_confirm_title'),
      t('settings.delete_account_confirm_desc'),
      [
        { text: t('common.cancel') },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            setDeletingAccount(true)
            try {
              const { error } = await supabase.functions.invoke('delete-account')
              if (error) throw new Error(error.message)
              track('account_deleted')
              await supabase.auth.signOut()
              router.replace('/auth')
            } catch (e) {
              Alert.alert(
                t('settings.delete_account_error_title'),
                e instanceof Error ? e.message : t('settings.delete_account_error_desc')
              )
              setDeletingAccount(false)
            }
          },
        },
      ]
    )
  }

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#080E09', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#52CC64" size="large" />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#080E09' }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>

        {/* Header */}
        <LinearGradient
          colors={['#0F1F10', '#080E09']}
          style={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 24, borderBottomWidth: 1, borderBottomColor: '#1C2E1E' }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <TouchableOpacity
              onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
              style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' }}
            >
              <BackIcon size={20} color="#52CC64" />
            </TouchableOpacity>
            <Text style={{ color: '#E4F2E7', fontSize: 22, fontWeight: '900' }}>{t('settings.title')}</Text>
          </View>
        </LinearGradient>

        <View style={{ padding: 16, gap: 16 }}>

          {/* Username */}
          <View>
            <Text style={sectionLabel}>{t('settings.username_label')}</Text>
            <LinearGradient colors={['#131A10', '#0C1009']} style={{ borderRadius: 18, borderWidth: 1, borderColor: '#1C2E1E', padding: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <TextInput
                  value={username}
                  onChangeText={handleUsernameChange}
                  maxLength={30}
                  autoCorrect={false}
                  autoCapitalize="none"
                  style={{
                    flex: 1,
                    backgroundColor: 'rgba(0,0,0,0.3)',
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: usernameError ? '#EF4444' : '#1C2E1E',
                    color: '#E4F2E7',
                    fontSize: 15,
                    padding: 12,
                  }}
                />
                <TouchableOpacity
                  onPress={handleSaveUsername}
                  disabled={saveDisabled}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={saveDisabled ? ['#1C2E1E', '#182018'] : ['#52CC64', '#3DAA50']}
                    style={{ borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12 }}
                  >
                    <Text style={{ color: saveDisabled ? '#3A5040' : '#080E09', fontWeight: '700', fontSize: 13 }}>
                      {saveState === 'saved' ? '✓' : t('common.save')}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
              {usernameError ? (
                <Text style={{ color: '#EF4444', fontSize: 11, marginTop: 6 }}>{usernameError}</Text>
              ) : null}
            </LinearGradient>
          </View>

          {/* Settings toggles */}
          <View>
            <Text style={sectionLabel}>{t('settings.preferences')}</Text>
            <LinearGradient colors={['#131A10', '#0C1009']} style={{ borderRadius: 18, borderWidth: 1, borderColor: '#1C2E1E', overflow: 'hidden' }}>

              {/* Dark mode */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#1C2E1E' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 18 }}>{isDark ? '🌙' : '☀️'}</Text>
                  </View>
                  <View>
                    <Text style={{ color: '#E4F2E7', fontSize: 14, fontWeight: '700' }}>{t('settings.dark_mode')}</Text>
                    <Text style={{ color: '#728C74', fontSize: 12, marginTop: 1 }}>{isDark ? t('settings.theme_dark') : t('settings.theme_light')}</Text>
                  </View>
                </View>
                <Switch
                  value={isDark}
                  onValueChange={toggleTheme}
                  trackColor={{ false: '#1C2E1E', true: '#52CC64' }}
                  thumbColor={isDark ? '#1A3D1E' : '#728C74'}
                />
              </View>

              {/* Idioma */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#1C2E1E' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 18 }}>🌐</Text>
                  </View>
                  <Text style={{ color: '#E4F2E7', fontSize: 14, fontWeight: '700' }}>{t('settings.language')}</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {LANGUAGES.map(l => {
                    const isSelected = language === l.code
                    return (
                      <TouchableOpacity
                        key={l.code}
                        onPress={() => setLanguage(l.code)}
                        activeOpacity={0.8}
                        style={{
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                          borderRadius: 10,
                          borderWidth: isSelected ? 1.5 : 1,
                          borderColor: isSelected ? '#52CC64' : '#1C2E1E',
                          backgroundColor: isSelected ? 'rgba(82,204,100,0.12)' : 'transparent',
                        }}
                      >
                        <Text style={{ fontSize: 13 }}>{l.flag} {l.code.toUpperCase()}</Text>
                      </TouchableOpacity>
                    )
                  })}
                </View>
              </View>

              {/* Notifications */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: notifications ? 1 : 0, borderBottomColor: '#1C2E1E' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: notifications ? 'rgba(82,204,100,0.1)' : 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 18 }}>🔔</Text>
                  </View>
                  <View>
                    <Text style={{ color: '#E4F2E7', fontSize: 14, fontWeight: '700' }}>{t('settings.notifications')}</Text>
                    <Text style={{ color: '#728C74', fontSize: 12, marginTop: 1 }}>
                      {t('settings.notifications_reminder_at', { time: `${String(notificationHour).padStart(2, '0')}:${String(notificationMinute).padStart(2, '0')}` })}
                    </Text>
                  </View>
                </View>
                <Switch
                  value={notifications}
                  onValueChange={handleToggleNotifications}
                  trackColor={{ false: '#1C2E1E', true: '#52CC64' }}
                  thumbColor={notifications ? '#1A3D1E' : '#728C74'}
                />
              </View>

              {/* Time picker */}
              {notifications && (
                <View style={{ padding: 16 }}>
                  <Text style={{ color: '#728C74', fontSize: 13, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 16 }}>
                    {t('settings.reminder_time')}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
                    {/* Hours */}
                    <View style={{ alignItems: 'center', gap: 4 }}>
                      <TouchableOpacity
                        onPress={() => setNotificationHour(h => h === 23 ? 0 : h + 1)}
                        style={{ width: 40, height: 36, borderRadius: 10, backgroundColor: 'rgba(82,204,100,0.1)', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Text style={{ color: '#52CC64', fontSize: 16, fontWeight: '700' }}>▲</Text>
                      </TouchableOpacity>
                      <Text style={{ color: '#E4F2E7', fontSize: 36, fontWeight: '900', minWidth: 64, textAlign: 'center' }}>
                        {String(notificationHour).padStart(2, '0')}
                      </Text>
                      <TouchableOpacity
                        onPress={() => setNotificationHour(h => h === 0 ? 23 : h - 1)}
                        style={{ width: 40, height: 36, borderRadius: 10, backgroundColor: 'rgba(82,204,100,0.1)', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Text style={{ color: '#52CC64', fontSize: 16, fontWeight: '700' }}>▼</Text>
                      </TouchableOpacity>
                    </View>

                    <Text style={{ color: '#52CC64', fontSize: 36, fontWeight: '900', marginBottom: 4 }}>:</Text>

                    {/* Minutes */}
                    <View style={{ alignItems: 'center', gap: 4 }}>
                      <TouchableOpacity
                        onPress={() => setNotificationMinute(m => m === 55 ? 0 : m + 5)}
                        style={{ width: 40, height: 36, borderRadius: 10, backgroundColor: 'rgba(82,204,100,0.1)', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Text style={{ color: '#52CC64', fontSize: 16, fontWeight: '700' }}>▲</Text>
                      </TouchableOpacity>
                      <Text style={{ color: '#E4F2E7', fontSize: 36, fontWeight: '900', minWidth: 64, textAlign: 'center' }}>
                        {String(notificationMinute).padStart(2, '0')}
                      </Text>
                      <TouchableOpacity
                        onPress={() => setNotificationMinute(m => m === 0 ? 55 : m - 5)}
                        style={{ width: 40, height: 36, borderRadius: 10, backgroundColor: 'rgba(82,204,100,0.1)', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Text style={{ color: '#52CC64', fontSize: 16, fontWeight: '700' }}>▼</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  {timeChangeState === 'saved' && (
                    <Text style={{ color: '#52CC64', fontSize: 12, fontWeight: '700', textAlign: 'center', marginTop: 12 }}>✓ {t('common.saved')}</Text>
                  )}
                </View>
              )}
            </LinearGradient>
          </View>

          {/* Tablas nutricionales */}
          <LinearGradient colors={['#131A10', '#0C1009']} style={{ borderRadius: 18, borderWidth: 1, borderColor: '#1C2E1E', overflow: 'hidden', marginBottom: 16 }}>
            <TouchableOpacity
              onPress={() => { track('nutrition_table_viewed', { source: 'settings' }); router.push('/tables/index' as never) }}
              style={{ padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(82,204,100,0.08)', borderWidth: 1, borderColor: 'rgba(82,204,100,0.15)', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 18 }}>📊</Text>
                </View>
                <View>
                  <Text style={{ color: '#E4F2E7', fontSize: 14, fontWeight: '700' }}>{t('settings.nutrition_tables')}</Text>
                  <Text style={{ color: '#728C74', fontSize: 12, marginTop: 1 }}>{t('settings.nutrition_tables_desc')}</Text>
                </View>
              </View>
              <Text style={{ color: '#3A5C3E', fontSize: 18 }}>›</Text>
            </TouchableOpacity>
          </LinearGradient>

          {/* Legal + About + Sign out */}
          <LinearGradient colors={['#131A10', '#0C1009']} style={{ borderRadius: 18, borderWidth: 1, borderColor: '#1C2E1E', overflow: 'hidden' }}>
            <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: '#1C2E1E' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 18 }}>🌿</Text>
                </View>
                <View>
                  <Text style={{ color: '#E4F2E7', fontSize: 14, fontWeight: '700' }}>{t('settings.about')}</Text>
                  <Text style={{ color: '#728C74', fontSize: 12, marginTop: 1 }}>Cultitrack v1.0.0</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => Linking.openURL('https://ellowen.github.io/CannaTrack/privacy')}
              style={{ padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#1C2E1E' }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.04)', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 16 }}>🔒</Text>
                </View>
                <Text style={{ color: '#B8D4BC', fontSize: 14, fontWeight: '600' }}>{t('settings.privacy_policy')}</Text>
              </View>
              <Text style={{ color: '#3A5040', fontSize: 16 }}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => Linking.openURL('https://ellowen.github.io/CannaTrack/terms')}
              style={{ padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#1C2E1E' }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.04)', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 16 }}>📄</Text>
                </View>
                <Text style={{ color: '#B8D4BC', fontSize: 14, fontWeight: '600' }}>{t('settings.terms_of_service')}</Text>
              </View>
              <Text style={{ color: '#3A5040', fontSize: 16 }}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleSignOut} style={{ padding: 16 }}>
              <Text style={{ color: '#EF4444', fontSize: 14, fontWeight: '700', textAlign: 'center' }}>{t('settings.sign_out')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleDeleteAccount}
              disabled={deletingAccount}
              style={{ padding: 16, borderTopWidth: 1, borderTopColor: '#1C2E1E', opacity: deletingAccount ? 0.5 : 1 }}
            >
              {deletingAccount ? (
                <ActivityIndicator color="#EF4444" />
              ) : (
                <Text style={{ color: '#EF4444', fontSize: 13, fontWeight: '600', textAlign: 'center', opacity: 0.7 }}>
                  {t('settings.delete_account')}
                </Text>
              )}
            </TouchableOpacity>
          </LinearGradient>

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
  marginBottom: 10,
}
