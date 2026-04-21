import { useEffect, useState } from 'react'
import { Stack, useRouter, useSegments } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { supabase } from '@/lib/supabase'
import { registerForPushNotifications, scheduleDailyReminder } from '@/lib/notifications'
import { saveSessionForBiometric, clearSavedSession } from '@/lib/biometric'
import type { Session } from '@supabase/supabase-js'

export default function RootLayout() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const segments = useSegments()
  const router   = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, s) => {
      setSession(s)

      if (event === 'SIGNED_IN' && s) {
        await saveSessionForBiometric(s)
        const token = await registerForPushNotifications()
        if (token) {
          await supabase.from('profiles').update({ push_token: token }).eq('id', s.user.id)
          await scheduleDailyReminder(9, 0)
        }
      }

      if (event === 'SIGNED_OUT') {
        await clearSavedSession()
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (session === undefined) return
    const inAuth = segments[0] === 'auth'
    if (!session && !inAuth) router.replace('/auth')
    else if (session && inAuth) router.replace('/(tabs)')
  }, [session, segments])

  if (session === undefined) return null

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="auth" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="plants/new" options={{ presentation: 'modal' }} />
        <Stack.Screen name="plants/[id]" />
        <Stack.Screen name="plants/[id]/edit" options={{ presentation: 'modal' }} />
      </Stack>
      <StatusBar style="light" />
    </>
  )
}
