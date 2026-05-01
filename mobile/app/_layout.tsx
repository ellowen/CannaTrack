import '../global.css'
import { initSentry, Sentry } from '@/lib/sentry'
import { initPurchases, identifyUser, resetUser } from '@/lib/purchases'
import { initAnalytics, identifyAnalytics, resetAnalytics, track } from '@/lib/analytics'
import { useEffect, useState } from 'react'

initSentry()
initPurchases()
initAnalytics()
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
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { supabase } from '@/lib/supabase'
import { saveSessionForBiometric, clearSavedSession } from '@/lib/biometric'
import { registerForPushNotifications, scheduleDailyReminder, scheduleAllTaskNotifications } from '@/lib/notifications'
import * as Notifications from 'expo-notifications'
import { useInitSync } from '@/hooks/useInitSync'
import { useRealtimeSync } from '@/hooks/useRealtimeSync'
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

function RootLayout() {
  // undefined = todavia cargando, null = sin sesion, Session = logueado
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const setUser = useUserStore(s => s.setUser)

  useInitSync()
  useRealtimeSync()

  // Deep linking desde notificaciones — navega a la planta correcta al tapear
  useEffect(() => {
    // Notificacion que abre la app desde estado cerrado
    Notifications.getLastNotificationResponseAsync().then(response => {
      if (!response) return
      const data = response.notification.request.content.data
      if (data?.type === 'task_reminder' && data.plantId) {
        router.push(`/plants/${data.plantId}` as never)
      }
    })

    // Notificacion mientras la app esta en foreground/background
    const sub = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data
      if (data?.type === 'task_reminder' && data.plantId) {
        router.push(`/plants/${data.plantId}` as never)
      }
      // daily_reminder → va a tabs (comportamiento default)
    })

    return () => sub.remove()
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, s) => {
      setSession(s)

      if (event === 'SIGNED_OUT') {
        await clearSavedSession()
        void resetUser()
        resetAnalytics()
        track('sign_out')
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
        void identifyUser(s.user.id)
        identifyAnalytics(s.user.id, { email: s.user.email ?? null })
        track('sign_in')
      }

      // Garantizar que el profile existe (por si el trigger de DB no fireo)
      await supabase
        .from('profiles')
        .upsert(
          { id: s.user.id, username: s.user.email?.split('@')[0] ?? 'user' },
          { onConflict: 'id', ignoreDuplicates: true }
        )

      setUser(s.user.id, s.user.email ?? '', s.user.email?.split('@')[0] ?? '')

      const { data: prof } = await supabase
        .from('profiles')
        .select('notifications_enabled')
        .eq('id', s.user.id)
        .maybeSingle()
      if (prof?.notifications_enabled) {
        void scheduleDailyReminder(9, 0)

        // Re-agendar notificaciones por planta con el horizonte completo (14 dias)
        const [{ data: plants }, { data: tasks }] = await Promise.all([
          supabase.from('plants').select('*').eq('user_id', s.user.id).eq('status', 'active'),
          supabase.from('scheduled_tasks').select('*').eq('user_id', s.user.id).eq('completed', false),
        ])
        if (plants && tasks) {
          const mappedPlants = plants.map((p: Record<string, unknown>) => ({
            id: p.id as string, name: p.name as string,
            genetics: p.genetics as string, geneticType: (p.genetic_type as string) as never,
            sex: (p.sex ?? 'unknown') as never, startDate: new Date(p.start_date as string),
            location: (p.location ?? 'indoor') as never, potCount: (p.pot_count as number) ?? 1,
            nutritionTableId: (p.nutrition_table_id as string) ?? '', status: (p.status as string) as never,
          }))
          const mappedTasks = tasks.map((t: Record<string, unknown>) => ({
            id: t.id as string, plantId: t.plant_id as string, type: t.type as never,
            scheduledDate: new Date(t.scheduled_date as string), completed: false,
            cycle: t.cycle as never, week: t.week as number, stage: t.stage as never,
            products: (t.products as never[]) ?? [],
          }))
          void scheduleAllTaskNotifications(mappedPlants, mappedTasks, 9, 0)
        }
      }

      const dest = await resolvePostLoginRoute(s.user.id)
      router.replace(dest)
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
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
        <Stack.Screen name="tables/index" />
        <Stack.Screen name="tables/[id]" />
        <Stack.Screen name="tables/compare" />
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
    </GestureHandlerRootView>
  )
}

export default Sentry.wrap(RootLayout)
