import '../global.css'
import { useEffect, useState } from 'react'
import { Stack, router } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { supabase } from '@/lib/supabase'
import { saveSessionForBiometric, clearSavedSession } from '@/lib/biometric'
import { registerForPushNotifications, scheduleDailyReminder } from '@/lib/notifications'
import { useInitSync } from '@/hooks/useInitSync'
import { ThemeProvider } from '@/context/ThemeContext'
import { useUserStore } from '@/store/userStore'
import type { Session } from '@supabase/supabase-js'

async function resolvePostLoginRoute(userId: string): Promise<'/onboarding' | '/(tabs)'> {
  const { data } = await supabase
    .from('profiles')
    .select('onboarding_completed')
    .eq('id', userId)
    .single()
  return data?.onboarding_completed ? '/(tabs)' : '/onboarding'
}

export default function RootLayout() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const setUser = useUserStore(s => s.setUser)

  // Initialize sync once at app start (instead of in each screen)
  // Expected: 2-4 fewer requests compared to calling from multiple screens
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

      // Re-schedule notificacion diaria si el usuario la tiene activada
      const { data: prof } = await supabase
        .from('profiles')
        .select('notifications_enabled')
        .eq('id', s.user.id)
        .single()
      if (prof?.notifications_enabled) {
        void scheduleDailyReminder(9, 0)
      }

      const dest = await resolvePostLoginRoute(s.user.id)
      router.replace(dest)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (session === undefined) return null

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
    </ThemeProvider>
  )
}
