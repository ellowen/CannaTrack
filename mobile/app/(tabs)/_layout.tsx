// SDK 57: `Tabs` en 'expo-router' quedo deprecado en favor de 'expo-router/js-tabs'
import { Tabs } from 'expo-router/js-tabs'
import { FloatingTabBar } from '@/components/FloatingTabBar'

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={props => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index"    options={{ title: 'Inicio' }} />
      <Tabs.Screen name="plants"   options={{ title: 'Plantas' }} />
      <Tabs.Screen name="tasks"    options={{ title: 'Agenda' }} />
      <Tabs.Screen name="diagnose" options={{ title: 'Camara' }} />
      <Tabs.Screen name="profile"  options={{ title: 'Perfil' }} />
    </Tabs>
  )
}
