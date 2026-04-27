import '../global.css'
import { useEffect, useState } from 'react'
import { Platform, View, ActivityIndicator } from 'react-native'
import { Stack, router } from 'expo-router'

// Suprimir warnings conocidos de librerias de terceros en web
if (Platform.OS === 'web' && typeof console !== 'undefined') {
  const _warn = console.warn.bind(console)
  console.warn = (...args: unknown[]) => {
    const msg = typeof args[0] === 'string' ? args[0] : ''
    if (msg.includes('"shadow*" style props are deprecated')) return
    if (msg.includes('props.pointerEvents is deprecated')) return
    if (msg.includes('Listening to push token changes is not yet fully supported on web')) return
    _warn(...args)
  }
}
import { StatusBar } from 'expo-status-bar'
import { supabase } from '@/lib/supabase'
import { saveSessionForBiometric, clearSavedSession } from '@/lib/biometric'
import { registerForPushNotifications, scheduleDailyReminder } from '@/lib/notifications'
import { useInitSync } from '@/hooks/useInitSync'
import { ThemeProvider } from '@/context/ThemeContext'
import { useUserStore } from '@/store/userStore'
import type { Session } from '@supabase/supabase-js'

async function resolvePostLoginRoute(userId: string): Promise<'/onboarding' | '/(tabs)'> {
  const [{ data: profile }, { count: plantCount }] = await Promise.all([
    supabase.from('profiles').select('onboarding_completed').eq('id', userId).maybeSingle(),
    supabase.from('plants').select('*', { count: 'exact', head: true }).eq('user_id', userId),
  ])

  // Si ya tiene plantas, siempre ir a tabs aunque onboarding_completed sea false
  if (plantCount && plantCount > 0) {
    // Corregir el flag si estaba mal
    if (!profile?.onboarding_completed) {
      void supabase.from('profiles').update({ onboarding_completed: true }).eq('id', userId)
    }
    return '/(tabs)'
  }

  return profile?.onboarding_completed ? '/(tabs)' : '/onboarding'
}

export default function RootLayout() {
  // undefined = todavia cargando, null = sin sesion, Session = logueado
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const setUser = useUserStore(s => s.setUser)

  useInitSync()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, s) => {
      setSession(s)

      if (event === 'SIGNED_OUT') {
        await clearSavedSession()
        router.replace('/auth')
        return
      }

      if (event !== 'SIGNED_IN' && event !== 'INITIAL_SESSION') return

      if (!s) {
        router.replace('/auth')
        return
      }

      if (event === 'SIGNED_IN') {
        await saveSessionForBiometric(s)
        void registerForPushNotifications()
      }

      setUser(s.user.id, s.user.email ?? '', s.user.email?.split('@')[0] ?? '')

      const { data: prof } = await supabase
        .from('profiles')
        .select('notifications_enabled')
        .eq('id', s.user.id)
        .maybeSingle()
      if (prof?.notifications_enabled) {
        void scheduleDailyReminder(9, 0)
      }

      const dest = await resolvePostLoginRoute(s.user.id)
      router.replace(dest)
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <ThemeProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="auth" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="plants/new" options={{ presentation: 'modal' }} />
        <Stack.Screen name="plants/[id]" />
        <Stack.Screen name="plants/[id]/edit" options={{ presentation: 'modal' }} />
        <Stack.Screen name="plants/[id]/diary" />
        <Stack.Screen name="plants/[id]/diagnosis" />
        <Stack.Screen name="plants/[id]/measurements" />
        <Stack.Screen name="plants/[id]/timeline" />
        <Stack.Screen name="tables/new" options={{ presentation: 'modal' }} />
        <Stack.Screen name="settings" options={{ presentation: 'modal' }} />
        <Stack.Screen name="achievements" />
      </Stack>
      <StatusBar style="light" />
      {/* Overlay mientras resuelve la sesion inicial - tapa el flash de pantalla */}
      {session === undefined && (
        <View style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: '#0C1410',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <ActivityIndicator color="#52CC64" size="large" />
        </View>
      )}
    </ThemeProvider>
  )
}
