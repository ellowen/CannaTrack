import { useState, useEffect, useRef } from 'react'
import { View, Text, TouchableOpacity, ScrollView, Switch, Alert, ActivityIndicator, TextInput } from 'react-native'
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

export default function SettingsScreen() {
  const { user } = useAuth()
  const { isDark, toggleTheme } = useTheme()
  const [notifications, setNotifications] = useState(true)
  const [loading, setLoading] = useState(true)

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
    if (!trimmed) { setUsernameError('El nombre no puede estar vacio'); return }
    if (trimmed.length > 30) { setUsernameError('Maximo 30 caracteres'); return }
    if (!user) return
    setSaveState('saving')
    const { error } = await supabase.from('profiles').update({ username: trimmed }).eq('id', user.id)
    if (error) { setSaveState('idle'); setUsernameError('Error al guardar'); return }
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
    Alert.alert('Cerrar sesion', '¿Estas seguro?', [
      { text: 'Cancelar' },
      { text: 'Cerrar', style: 'destructive', onPress: async () => { await supabase.auth.signOut(); router.replace('/auth') } },
    ])
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
              onPress={() => router.back()}
              style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' }}
            >
              <BackIcon size={20} color="#52CC64" />
            </TouchableOpacity>
            <Text style={{ color: '#E4F2E7', fontSize: 22, fontWeight: '900' }}>Configuracion</Text>
          </View>
        </LinearGradient>

        <View style={{ padding: 16, gap: 16 }}>

          {/* Username */}
          <View>
            <Text style={sectionLabel}>Nombre de usuario</Text>
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
                      {saveState === 'saved' ? '✓' : 'Guardar'}
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
            <Text style={sectionLabel}>Preferencias</Text>
            <LinearGradient colors={['#131A10', '#0C1009']} style={{ borderRadius: 18, borderWidth: 1, borderColor: '#1C2E1E', overflow: 'hidden' }}>

              {/* Dark mode */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#1C2E1E' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 18 }}>{isDark ? '🌙' : '☀️'}</Text>
                  </View>
                  <View>
                    <Text style={{ color: '#E4F2E7', fontSize: 14, fontWeight: '700' }}>Modo oscuro</Text>
                    <Text style={{ color: '#728C74', fontSize: 12, marginTop: 1 }}>Tema {isDark ? 'oscuro' : 'claro'}</Text>
                  </View>
                </View>
                <Switch
                  value={isDark}
                  onValueChange={toggleTheme}
                  trackColor={{ false: '#1C2E1E', true: '#52CC64' }}
                  thumbColor={isDark ? '#1A3D1E' : '#728C74'}
                />
              </View>

              {/* Notifications */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: notifications ? 1 : 0, borderBottomColor: '#1C2E1E' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: notifications ? 'rgba(82,204,100,0.1)' : 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 18 }}>🔔</Text>
                  </View>
                  <View>
                    <Text style={{ color: '#E4F2E7', fontSize: 14, fontWeight: '700' }}>Notificaciones</Text>
                    <Text style={{ color: '#728C74', fontSize: 12, marginTop: 1 }}>
                      Recordatorio a las {String(notificationHour).padStart(2, '0')}:{String(notificationMinute).padStart(2, '0')}
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
                    Hora del recordatorio
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
                    <Text style={{ color: '#52CC64', fontSize: 12, fontWeight: '700', textAlign: 'center', marginTop: 12 }}>✓ Guardado</Text>
                  )}
                </View>
              )}
            </LinearGradient>
          </View>

          {/* About + Sign out */}
          <LinearGradient colors={['#131A10', '#0C1009']} style={{ borderRadius: 18, borderWidth: 1, borderColor: '#1C2E1E', overflow: 'hidden' }}>
            <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: '#1C2E1E' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 18 }}>🌿</Text>
                </View>
                <View>
                  <Text style={{ color: '#E4F2E7', fontSize: 14, fontWeight: '700' }}>Acerca de</Text>
                  <Text style={{ color: '#728C74', fontSize: 12, marginTop: 1 }}>CannaTrack v1.0.0</Text>
                </View>
              </View>
            </View>
            <TouchableOpacity onPress={handleSignOut} style={{ padding: 16 }}>
              <Text style={{ color: '#EF4444', fontSize: 14, fontWeight: '700', textAlign: 'center' }}>Cerrar sesion</Text>
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
