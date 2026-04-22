import { useState, useEffect, useRef } from 'react'
import { View, Text, TouchableOpacity, ScrollView, Switch, Alert, ActivityIndicator, TextInput } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { scheduleDailyReminder } from '@/lib/notifications'
import * as Notifications from 'expo-notifications'

export default function SettingsScreen() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState(true)
  const [loading, setLoading] = useState(true)

  const [loadedUsername, setLoadedUsername] = useState('')
  const [username, setUsername] = useState('')
  const [usernameError, setUsernameError] = useState('')
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    async function load() {
      if (!user) return
      const { data } = await supabase
        .from('profiles')
        .select('notifications_enabled, username')
        .eq('id', user.id)
        .single()
      if (data) {
        setNotifications(data.notifications_enabled ?? false)
        const name = data.username ?? ''
        setLoadedUsername(name)
        setUsername(name)
      }
      setLoading(false)
    }
    load()
  }, [user])

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    }
  }, [])

  function handleUsernameChange(value: string) {
    setUsername(value)
    setUsernameError('')
  }

  async function handleSaveUsername() {
    const trimmed = username.trim()
    if (!trimmed) {
      setUsernameError('El nombre no puede estar vacio')
      return
    }
    if (trimmed.length > 30) {
      setUsernameError('Maximo 30 caracteres')
      return
    }
    if (!user) return

    setSaveState('saving')
    const { error } = await supabase
      .from('profiles')
      .update({ username: trimmed })
      .eq('id', user.id)

    if (error) {
      setSaveState('idle')
      setUsernameError('Error al guardar')
      return
    }

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
      await scheduleDailyReminder(9, 0)
    } else {
      await Notifications.cancelAllScheduledNotificationsAsync()
    }
  }

  async function handleSignOut() {
    Alert.alert('Cerrar sesion', '\u00bfEstas seguro?', [
      { text: 'Cancelar' },
      {
        text: 'Cerrar',
        onPress: async () => {
          await supabase.auth.signOut()
          router.replace('/auth')
        },
      },
    ])
  }

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0C1410', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#52CC64" size="large" />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0C1410' }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 28 }}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={{ color: '#52CC64', fontSize: 28 }}>←</Text>
          </TouchableOpacity>
          <Text style={{ color: '#E4F2E7', fontSize: 22, fontWeight: '900', marginLeft: 12 }}>Configuracion</Text>
        </View>

        {/* Username section */}
        <View style={{ backgroundColor: '#131D14', borderRadius: 16, borderWidth: 1, borderColor: '#1C2E1E', padding: 16, marginBottom: 16 }}>
          <Text style={{ color: '#728C74', fontSize: 11, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8 }}>
            Nombre de usuario
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TextInput
              value={username}
              onChangeText={handleUsernameChange}
              maxLength={30}
              autoCorrect={false}
              autoCapitalize="none"
              style={{
                flex: 1,
                backgroundColor: '#0C1410',
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
              style={{
                backgroundColor: saveDisabled ? '#1C2E1E' : '#52CC64',
                borderRadius: 10,
                paddingHorizontal: 16,
                paddingVertical: 10,
              }}
            >
              <Text style={{ color: saveDisabled ? '#3A5040' : '#0C1410', fontWeight: '700', fontSize: 14 }}>
                {saveState === 'saved' ? '✓ Guardado' : 'Guardar'}
              </Text>
            </TouchableOpacity>
          </View>
          {usernameError ? (
            <Text style={{ color: '#EF4444', fontSize: 11, marginTop: 4 }}>{usernameError}</Text>
          ) : null}
        </View>

        <View style={{ backgroundColor: '#131D14', borderRadius: 16, borderWidth: 1, borderColor: '#1C2E1E', overflow: 'hidden' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#1C2E1E' }}>
            <View>
              <Text style={{ color: '#E4F2E7', fontSize: 14, fontWeight: '700' }}>Notificaciones</Text>
              <Text style={{ color: '#728C74', fontSize: 12, marginTop: 2 }}>Recordatorio diario a las 9:00</Text>
            </View>
            <Switch
              value={notifications}
              onValueChange={handleToggleNotifications}
              trackColor={{ false: '#1C2E1E', true: '#52CC64' }}
              thumbColor={notifications ? '#1A3D1E' : '#728C74'}
            />
          </View>
          <TouchableOpacity style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: '#1C2E1E' }}>
            <Text style={{ color: '#E4F2E7', fontSize: 14, fontWeight: '700' }}>Acerca de</Text>
            <Text style={{ color: '#728C74', fontSize: 12, marginTop: 4 }}>CannaTrack v1.0.0</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSignOut} style={{ padding: 16 }}>
            <Text style={{ color: '#EF4444', fontSize: 14, fontWeight: '700', textAlign: 'center' }}>Cerrar sesion</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
