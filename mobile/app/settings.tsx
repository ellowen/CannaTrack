import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, ScrollView, Switch, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { scheduleDailyReminder, cancelAllReminders } from '@/lib/notifications'

export default function SettingsScreen() {
  const { user } = useAuth()
  const [darkMode, setDarkMode] = useState(true)
  const [notifications, setNotifications] = useState(true)

  useEffect(() => {
    async function loadPrefs() {
      if (!user) return
      const { data } = await supabase.from('profiles').select('notifications_enabled').eq('id', user.id).single()
      if (data) setNotifications(data.notifications_enabled ?? true)
    }
    loadPrefs()
  }, [user])

  async function handleNotificationsToggle(enabled: boolean) {
    setNotifications(enabled)
    if (user) await supabase.from('profiles').update({ notifications_enabled: enabled }).eq('id', user.id)
    await scheduleDailyReminder(enabled)
  }

  async function handleSignOut() {
    Alert.alert('Cerrar sesión', '¿Estás seguro?', [
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0C1410' }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 28 }}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={{ color: '#52CC64', fontSize: 28 }}>←</Text>
          </TouchableOpacity>
          <Text style={{ color: '#E4F2E7', fontSize: 22, fontWeight: '900', marginLeft: 12 }}>Configuración</Text>
        </View>

        <View style={{ backgroundColor: '#131D14', borderRadius: 16, borderWidth: 1, borderColor: '#1C2E1E', overflow: 'hidden' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#1C2E1E' }}>
            <Text style={{ color: '#E4F2E7', fontSize: 14, fontWeight: '700' }}>Tema oscuro</Text>
            <Switch value={darkMode} onValueChange={setDarkMode} trackColor={{ false: '#1C2E1E', true: '#52CC64' }} thumbColor={darkMode ? '#1A3D1E' : '#728C74'} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#1C2E1E' }}>
            <View>
              <Text style={{ color: '#E4F2E7', fontSize: 14, fontWeight: '700' }}>Notificaciones</Text>
              <Text style={{ color: '#728C74', fontSize: 11, marginTop: 2 }}>Recordatorio diario a las 9 AM</Text>
            </View>
            <Switch value={notifications} onValueChange={handleNotificationsToggle} trackColor={{ false: '#1C2E1E', true: '#52CC64' }} thumbColor={notifications ? '#1A3D1E' : '#728C74'} />
          </View>
          <TouchableOpacity style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: '#1C2E1E' }}>
            <Text style={{ color: '#E4F2E7', fontSize: 14, fontWeight: '700' }}>Acerca de</Text>
            <Text style={{ color: '#728C74', fontSize: 12, marginTop: 4 }}>CannaTrack v1.0.0</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSignOut} style={{ padding: 16 }}>
            <Text style={{ color: '#EF4444', fontSize: 14, fontWeight: '700', textAlign: 'center' }}>Cerrar sesión</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}