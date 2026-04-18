import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, ScrollView, Alert, Switch, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'

export default function ProfileScreen() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<{ xp: number; notificationsEnabled: boolean } | null>(null)
  const [loading, setLoading] = useState(true)
  const [plantCount, setPlantCount] = useState(0)
  const [completedToday, setCompletedToday] = useState(0)

  useEffect(() => {
    async function load() {
      if (!user) return
      const [{ data: p }, { data: plants }, { data: tasks }] = await Promise.all([
        supabase.from('profiles').select('xp, notifications_enabled').eq('id', user.id).single(),
        supabase.from('plants').select('*').eq('user_id', user.id),
        supabase.from('scheduled_tasks')
          .select('*')
          .eq('user_id', user.id)
          .eq('completed', true)
          .gte('completed_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
      ])
      if (p) setProfile({ xp: p.xp ?? 0, notificationsEnabled: p.notifications_enabled ?? true })
      setPlantCount(plants?.length ?? 0)
      setCompletedToday(tasks?.length ?? 0)
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
    Alert.alert('Cerrar sesión', '¿Estás seguro?', [
      { text: 'Cancelar', onPress: () => {} },
      {
        text: 'Cerrar sesión',
        onPress: async () => {
          await supabase.auth.signOut()
          router.replace('/auth')
        },
      },
    ])
  }

  if (loading || !profile) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0C1410', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#52CC64" size="large" />
      </SafeAreaView>
    )
  }

  const level = Math.floor(profile.xp / 100) + 1
  const xpProgress = (profile.xp % 100) / 100

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0C1410' }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        <View style={{ alignItems: 'center', marginBottom: 24 }}>
          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#1A3D1E', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
            <Text style={{ fontSize: 40 }}>🌿</Text>
          </View>
          <Text style={{ color: '#E4F2E7', fontSize: 18, fontWeight: '900' }}>
            {user?.email?.split('@')[0] ?? 'Cultivador'}
          </Text>
          <Text style={{ color: '#728C74', fontSize: 12, marginTop: 2 }}>Nivel {level}</Text>
        </View>

        <View style={{ backgroundColor: '#131D14', borderRadius: 16, borderWidth: 1, borderColor: '#1C2E1E', padding: 16, marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={{ color: '#728C74', fontSize: 12, fontWeight: '700' }}>XP</Text>
            <Text style={{ color: '#52CC64', fontSize: 12, fontWeight: '700' }}>{profile.xp % 100}/100</Text>
          </View>
          <View style={{ height: 8, backgroundColor: '#1C2E1E', borderRadius: 4, overflow: 'hidden' }}>
            <View style={{ height: '100%', backgroundColor: '#52CC64', width: `${xpProgress * 100}%` }} />
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
          {[
            { label: 'Plantas', value: plantCount, emoji: '🌱' },
            { label: 'Hoy', value: completedToday, emoji: '✅' },
            { label: 'Racha', value: 7, emoji: '🔥' },
          ].map(s => (
            <View key={s.label} style={{ flex: 1, backgroundColor: '#131D14', borderRadius: 16, borderWidth: 1, borderColor: '#1C2E1E', padding: 12, alignItems: 'center' }}>
              <Text style={{ fontSize: 20 }}>{s.emoji}</Text>
              <Text style={{ color: '#E4F2E7', fontSize: 18, fontWeight: '900', marginTop: 4 }}>{s.value}</Text>
              <Text style={{ color: '#3A5040', fontSize: 10, fontWeight: '600', marginTop: 2 }}>{s.label}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          onPress={() => router.push('/settings')}
          style={{ backgroundColor: '#1A3D1E', borderRadius: 16, borderWidth: 1, borderColor: '#2A5A2E', padding: 12, marginBottom: 20, alignItems: 'center' }}
        >
          <Text style={{ color: '#52CC64', fontSize: 13, fontWeight: '700' }}>⚙️ Configuración</Text>
        </TouchableOpacity>

        <View style={{ backgroundColor: '#1A3D1E', borderRadius: 16, borderWidth: 1, borderColor: '#2A5A2E', padding: 12, marginBottom: 20, alignItems: 'center' }}>
          <Text style={{ color: '#52CC64', fontSize: 11, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase' }}>Plan Free</Text>
        </View>

        <View style={{ backgroundColor: '#131D14', borderRadius: 16, borderWidth: 1, borderColor: '#1C2E1E', overflow: 'hidden' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#1C2E1E' }}>
            <Text style={{ color: '#E4F2E7', fontSize: 14, fontWeight: '700' }}>Notificaciones</Text>
            <Switch
              value={profile.notificationsEnabled}
              onValueChange={toggleNotifications}
              trackColor={{ false: '#1C2E1E', true: '#52CC64' }}
              thumbColor={profile.notificationsEnabled ? '#1A3D1E' : '#728C74'}
            />
          </View>
          <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: '#1C2E1E' }}>
            <Text style={{ color: '#728C74', fontSize: 11, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 }}>Correo</Text>
            <Text style={{ color: '#E4F2E7', fontSize: 14 }}>{user?.email}</Text>
          </View>
          <TouchableOpacity onPress={handleSignOut} style={{ padding: 16 }}>
            <Text style={{ color: '#EF4444', fontSize: 14, fontWeight: '700', textAlign: 'center' }}>Cerrar sesión</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
