import { Tabs } from 'expo-router'
import { Text } from 'react-native'

function Icon({ label }: { label: string }) {
  return <Text style={{ fontSize: 20 }}>{label}</Text>
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0C1410',
          borderTopColor: '#1C2E1E',
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          elevation: 0,
        },
        tabBarActiveTintColor:   '#52CC64',
        tabBarInactiveTintColor: '#3A5040',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ focused }) => <Icon label={focused ? '🌿' : '🪴'} />,
        }}
      />
      <Tabs.Screen
        name="plants"
        options={{
          title: 'Plantas',
          tabBarIcon: ({ focused }) => <Icon label={focused ? '🍃' : '🌱'} />,
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: 'Calendario',
          tabBarIcon: ({ focused }) => <Icon label={focused ? '📅' : '🗓️'} />,
        }}
      />
      <Tabs.Screen
        name="diagnose"
        options={{
          title: 'Diagnose',
          tabBarIcon: ({ focused }) => <Icon label={focused ? '📷' : '📸'} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ focused }) => <Icon label={focused ? '⚡' : '👤'} />,
        }}
      />
    </Tabs>
  )
}
