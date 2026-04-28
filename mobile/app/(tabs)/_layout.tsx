import { Tabs } from 'expo-router'
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
